# At the top with other imports
from enhanced_statistics import EnhancedTennisStatistics

# After getting court_keypoints
enhanced_stats = EnhancedTennisStatistics(court_keypoints)

# Inside your main loop - track positions
enhanced_stats.update_frame_stats(frame_num, player_dict, ball_dict, player_mini, ball_mini)

# When analyzing shots
enhanced_stats.analyze_shot(frame_num, player_shot_ball, ball_position, ...)

# Before saving video
enhanced_stats.calculate_distances_in_meters()
enhanced_stats.calculate_speed_stats(fps=24)
enhanced_stats.print_summary()
enhanced_stats.export_to_json('tennis_statistics.json')