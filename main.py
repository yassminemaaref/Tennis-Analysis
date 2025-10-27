from utils import (read_video, 
                   save_video,
                   measure_distance,
                   draw_player_stats,
                   convert_pixel_distance_to_meters
                   )
import constants
from trackers import PlayerTracker, BallTracker
from court_line_detector import CourtLineDetector
from mini_court import MiniCourt
from enhanced_statistics import EnhancedTennisStatistics
import cv2
import pandas as pd
from copy import deepcopy
import argparse
import os
import json
import warnings
from flask import Flask, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 

@app.route('/outputs/<path:filename>')
def serve_output_file(filename):
    return send_from_directory('output_videos', filename)

warnings.filterwarnings('ignore')

def main(input_video_path=None, video_id=None):
    try:
        # Default paths or use command line arguments
        if input_video_path is None:
            input_video_path = "input_videos/input_video.mp4"
        
        if video_id is None:
            video_id = "default"
        
        output_video_path = f"output_videos/output_{video_id}.mp4"
        json_path = f"output_videos/statistics_{video_id}.json"
        excel_path = f"output_videos/statistics_{video_id}.xlsx"
        csv_path = f"output_videos/statistics_{video_id}.csv"
        
        print(f"Processing video: {input_video_path}")
        print(f"Output will be saved with ID: {video_id}")
        
        # Read Video
        print("Reading video...")
        video_frames = read_video(input_video_path)
        print(f"Total frames: {len(video_frames)}")

        # Detect Players and Ball
        print("Initializing trackers...")
        player_tracker = PlayerTracker(model_path='yolov8x')
        ball_tracker = BallTracker(model_path='models/yolo5_last.pt')

        print("Detecting players...")
        player_detections = player_tracker.detect_frames(video_frames,
                                                         read_from_stub=True,
                                                         stub_path="tracker_stubs/player_detections.pkl"
                                                         )
        print("Detecting ball...")
        ball_detections = ball_tracker.detect_frames(video_frames,
                                                         read_from_stub=True,
                                                         stub_path="tracker_stubs/ball_detections.pkl"
                                                         )
        print("Interpolating ball positions...")
        ball_detections = ball_tracker.interpolate_ball_positions(ball_detections)
        
        # Court Line Detector model
        print("Detecting court lines...")
        court_model_path = "models/keypoints_model.pth"
        court_line_detector = CourtLineDetector(court_model_path)
        court_keypoints = court_line_detector.predict(video_frames[0])

        # Choose players
        print("Filtering players...")
        player_detections = player_tracker.choose_and_filter_players(court_keypoints, player_detections)

        # MiniCourt
        print("Initializing mini court...")
        mini_court = MiniCourt(video_frames[0]) 

        # Detect ball shots
        print("Detecting ball shots...")
        ball_shot_frames = ball_tracker.get_ball_shot_frames(ball_detections)
        print(f"Total shots detected: {len(ball_shot_frames)}")

        # Convert positions to mini court positions
        print("Converting to mini court coordinates...")
        player_mini_court_detections, ball_mini_court_detections = mini_court.convert_bounding_boxes_to_mini_court_coordinates(
            player_detections, 
            ball_detections,
            court_keypoints
        )

        # Initialize Enhanced Statistics Tracker
        print("Initializing enhanced statistics...")
        enhanced_stats = EnhancedTennisStatistics(court_keypoints)
        print("Enhanced Statistics Module Initialized")

        player_stats_data = [{
            'frame_num': 0,
            'player_1_number_of_shots': 0,
            'player_1_total_shot_speed': 0,
            'player_1_last_shot_speed': 0,
            'player_1_total_player_speed': 0,
            'player_1_last_player_speed': 0,

            'player_2_number_of_shots': 0,
            'player_2_total_shot_speed': 0,
            'player_2_last_shot_speed': 0,
            'player_2_total_player_speed': 0,
            'player_2_last_player_speed': 0,
        }]
        
        # Track frame-by-frame positions
        print("Analyzing frame-by-frame positions...")
        for frame_num in range(len(video_frames)):
            if frame_num % 100 == 0:
                print(f"  Processing frame {frame_num}/{len(video_frames)}")
                
            player_dict = player_detections[frame_num] if frame_num < len(player_detections) else {}
            ball_dict = ball_detections[frame_num] if frame_num < len(ball_detections) else {}
            player_mini = player_mini_court_detections[frame_num] if frame_num < len(player_mini_court_detections) else {}
            ball_mini = ball_mini_court_detections[frame_num].get(1) if frame_num < len(ball_mini_court_detections) else None
            
            if ball_mini:
                enhanced_stats.update_frame_stats(
                    frame_num,
                    player_dict,
                    ball_dict,
                    player_mini,
                    ball_mini
                )
        
        # Analyze shots and rallies
        print("Analyzing shots and rallies...")
        current_rally_active = False
        last_shot_frame = 0

        for ball_shot_ind in range(len(ball_shot_frames)-1):
            start_frame = ball_shot_frames[ball_shot_ind]
            end_frame = ball_shot_frames[ball_shot_ind+1]
            ball_shot_time_in_seconds = (end_frame-start_frame)/24

            # Check if we have valid data for these frames
            if (start_frame >= len(ball_mini_court_detections) or 
                end_frame >= len(ball_mini_court_detections) or
                1 not in ball_mini_court_detections[start_frame] or
                1 not in ball_mini_court_detections[end_frame]):
                continue

            distance_covered_by_ball_pixels = measure_distance(
                ball_mini_court_detections[start_frame][1],
                ball_mini_court_detections[end_frame][1]
            )
            distance_covered_by_ball_meters = convert_pixel_distance_to_meters(
                distance_covered_by_ball_pixels,
                constants.DOUBLE_LINE_WIDTH,
                mini_court.get_width_of_mini_court()
            ) 

            speed_of_ball_shot = distance_covered_by_ball_meters/ball_shot_time_in_seconds * 3.6

            player_positions = player_mini_court_detections[start_frame]
            
            # Make sure we have players detected
            if not player_positions:
                continue
                
            player_shot_ball = min(
                player_positions.keys(), 
                key=lambda player_id: measure_distance(
                    player_positions[player_id],
                    ball_mini_court_detections[start_frame][1]
                )
            )

            opponent_player_id = 1 if player_shot_ball == 2 else 2
            
            # Make sure opponent exists
            if opponent_player_id not in player_positions:
                continue
            
            # Rally management
            if not current_rally_active:
                enhanced_stats.start_new_rally(serving_player=player_shot_ball)
                current_rally_active = True
                print(f"Started rally {len(enhanced_stats.rallies) + 1} at frame {start_frame}")
            
            # Add shot to current rally
            if player_shot_ball in player_positions:
                enhanced_stats.add_shot_to_rally(
                    frame_num=start_frame,
                    player_id=player_shot_ball,
                    player_position=player_positions[player_shot_ball],
                    ball_position=ball_mini_court_detections[start_frame][1],
                    shot_speed=speed_of_ball_shot
                )
            
            # Check if rally should end (gap between shots > 2 seconds = 48 frames at 24fps)
            gap_to_next = ball_shot_frames[ball_shot_ind + 1] - end_frame if ball_shot_ind < len(ball_shot_frames) - 1 else 999
            
            if gap_to_next > 48:
                # Rally ended - winner is the player who hit the last shot
                winner = player_shot_ball
                enhanced_stats.end_rally(winner_id=winner, rally_end_frame=end_frame)
                current_rally_active = False
                print(f"Ended rally {len(enhanced_stats.rallies)} - Winner: Player {winner}, Total shots: {len(enhanced_stats.rallies[-1]['shots'])}")
            
            # Enhanced statistics: analyze each shot
            if player_shot_ball in player_positions and opponent_player_id in player_positions:
                enhanced_stats.analyze_shot(
                    frame_num=start_frame,
                    player_shot_ball=player_shot_ball,
                    ball_position=ball_mini_court_detections[start_frame][1],
                    player_position=player_positions[player_shot_ball],
                    opponent_position=player_positions[opponent_player_id],
                    ball_speed=speed_of_ball_shot
                )

            # Calculate opponent movement - with bounds checking
            if (end_frame < len(player_mini_court_detections) and
                opponent_player_id in player_mini_court_detections[start_frame] and
                opponent_player_id in player_mini_court_detections[end_frame]):
                
                distance_covered_by_opponent_pixels = measure_distance(
                    player_mini_court_detections[start_frame][opponent_player_id],
                    player_mini_court_detections[end_frame][opponent_player_id]
                )
                distance_covered_by_opponent_meters = convert_pixel_distance_to_meters(
                    distance_covered_by_opponent_pixels,
                    constants.DOUBLE_LINE_WIDTH,
                    mini_court.get_width_of_mini_court()
                ) 

                speed_of_opponent = distance_covered_by_opponent_meters/ball_shot_time_in_seconds * 3.6
            else:
                speed_of_opponent = 0

            # Update player stats dataframe
            current_player_stats = deepcopy(player_stats_data[-1])
            current_player_stats['frame_num'] = start_frame
            current_player_stats[f'player_{player_shot_ball}_number_of_shots'] += 1
            current_player_stats[f'player_{player_shot_ball}_total_shot_speed'] += speed_of_ball_shot
            current_player_stats[f'player_{player_shot_ball}_last_shot_speed'] = speed_of_ball_shot
            current_player_stats[f'player_{opponent_player_id}_total_player_speed'] += speed_of_opponent
            current_player_stats[f'player_{opponent_player_id}_last_player_speed'] = speed_of_opponent
            player_stats_data.append(current_player_stats)

        # End final rally if still active
        if current_rally_active:
            enhanced_stats.end_rally(winner_id=player_shot_ball, rally_end_frame=len(video_frames)-1)
            print(f"Ended final rally")
        
        # Finalize enhanced statistics
        print("Calculating final statistics...")
        enhanced_stats.calculate_distances_in_meters()
        enhanced_stats.calculate_speed_stats(fps=24)
        
        enhanced_stats.print_summary()
        
        # Create output directories if they don't exist
        os.makedirs('output_videos', exist_ok=True)
        
        enhanced_stats.export_to_json(json_path)
        enhanced_stats.export_to_excel_with_charts(excel_path)
        enhanced_stats.export_detailed_csv(csv_path)
        
        # Export rally data
        rally_summary = enhanced_stats.get_rally_summary()
        rally_path = f'output_videos/rallies_{video_id}.json'
        with open(rally_path, 'w') as f:
            json.dump(rally_summary, f, indent=4, default=str)
        print(f"   - {rally_path}")

        # Finalize dataframe stats
        print("Finalizing statistics dataframe...")
        player_stats_data_df = pd.DataFrame(player_stats_data)
        frames_df = pd.DataFrame({'frame_num': list(range(len(video_frames)))})
        player_stats_data_df = pd.merge(frames_df, player_stats_data_df, on='frame_num', how='left')
        player_stats_data_df = player_stats_data_df.ffill()

        # Avoid division by zero
        player_stats_data_df['player_1_average_shot_speed'] = player_stats_data_df.apply(
            lambda row: row['player_1_total_shot_speed']/row['player_1_number_of_shots'] 
            if row['player_1_number_of_shots'] > 0 else 0, axis=1
        )
        player_stats_data_df['player_2_average_shot_speed'] = player_stats_data_df.apply(
            lambda row: row['player_2_total_shot_speed']/row['player_2_number_of_shots'] 
            if row['player_2_number_of_shots'] > 0 else 0, axis=1
        )
        player_stats_data_df['player_1_average_player_speed'] = player_stats_data_df.apply(
            lambda row: row['player_1_total_player_speed']/row['player_2_number_of_shots'] 
            if row['player_2_number_of_shots'] > 0 else 0, axis=1
        )
        player_stats_data_df['player_2_average_player_speed'] = player_stats_data_df.apply(
            lambda row: row['player_2_total_player_speed']/row['player_1_number_of_shots'] 
            if row['player_1_number_of_shots'] > 0 else 0, axis=1
        )

        # Draw output
        print("Drawing output video...")
        output_video_frames = player_tracker.draw_bboxes(video_frames, player_detections)
        output_video_frames = ball_tracker.draw_bboxes(output_video_frames, ball_detections)
        output_video_frames = court_line_detector.draw_keypoints_on_video(output_video_frames, court_keypoints)
        output_video_frames = mini_court.draw_mini_court(output_video_frames)
        output_video_frames = mini_court.draw_points_on_mini_court(output_video_frames, player_mini_court_detections)
        output_video_frames = mini_court.draw_points_on_mini_court(output_video_frames, ball_mini_court_detections, color=(0,255,255))

        # Draw enhanced statistics overlay with real-time updates
        print("Adding enhanced statistics overlay (frame-by-frame)...")
        for i in range(len(output_video_frames)):
            if i % 100 == 0:
                print(f"  Drawing frame {i}/{len(output_video_frames)}")
            output_video_frames[i] = enhanced_stats.draw_enhanced_overlay(output_video_frames[i], player_id=1, frame_num=i)
            output_video_frames[i] = enhanced_stats.draw_enhanced_overlay(output_video_frames[i], player_id=2, frame_num=i)

        for i in range(len(output_video_frames)):
            cv2.putText(output_video_frames[i], f"Frame: {i}", (10,30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        print("Saving output video...")
        save_video(output_video_frames, output_video_path)
        
        print("\n" + "="*60)
        print("Analysis Complete!")
        print("="*60)
        print("Output files created:")
        print(f"   - {output_video_path}")
        print(f"   - {json_path}")
        print(f"   - {excel_path}")
        print(f"   - {csv_path}")
        print(f"   - {rally_path}")
        print("="*60)
        
    except Exception as e:
        print(f"\n{'='*60}")
        print("ERROR OCCURRED!")
        print(f"{'='*60}")
        print(f"Error message: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        print("\nFull traceback:")
        traceback.print_exc()
        print(f"{'='*60}")
        raise


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Tennis Video Analysis')
    parser.add_argument('--input', type=str, help='Input video path')
    parser.add_argument('--video-id', type=str, help='Unique video ID for output files')
    
    args = parser.parse_args()
    
    main(input_video_path=args.input, video_id=args.video_id)
