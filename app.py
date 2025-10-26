from flask import Flask, request, jsonify, send_file, send_from_directory, Response
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import subprocess
import json
from pathlib import Path
import threading
import time
import warnings


app = Flask(__name__)
CORS(app)



warnings.filterwarnings("ignore", message="The parameter 'pretrained' is deprecated")

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

        # Update status
def process_video_async(video_id, input_path):
    """Process video in background thread"""
    try:
        processing_status[video_id] = {
            'status': 'processing',
            'progress': 0,
            'message': 'Starting analysis...'
        }
        
        # Update status
        processing_status[video_id]['message'] = 'Running tennis analysis...'
        processing_status[video_id]['progress'] = 20
        
        # Run your main.py script with the uploaded video
        # Fixed: Use utf-8 encoding and handle errors
        result = subprocess.run(
            ['python', 'main.py', '--input', input_path, '--video-id', video_id],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore',  # Ignore encoding errors
            timeout=600  # 10 minute timeout
        )
        
        if result.returncode == 0:
            processing_status[video_id] = {
                'status': 'completed',
                'progress': 100,
                'message': 'Analysis complete!',
                'output_video': f'output_{video_id}.avi',
                'json_file': f'statistics_{video_id}.json',
                'excel_file': f'statistics_{video_id}.xlsx'
            }
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type. Allowed: mp4, avi, mov, mkv'}), 400
    
    # Generate unique ID for this video
    video_id = f"{int(time.time())}_{secure_filename(file.filename).split('.')[0]}"
    
    # Save uploaded file
    filename = f"{video_id}.{file.filename.rsplit('.', 1)[1].lower()}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    # Start processing in background
    thread = threading.Thread(target=process_video_async, args=(video_id, filepath))
    thread.start()
    
    return jsonify({
        'video_id': video_id,
        'message': 'Video uploaded successfully. Processing started.',
        'status': 'processing'
    }), 200

@app.route('/api/status/<video_id>', methods=['GET'])
def get_status(video_id):
    """Get processing status"""
    if video_id not in processing_status:
        return jsonify({'error': 'Video ID not found'}), 404
    
    return jsonify(processing_status[video_id])

@app.route('/api/results/<video_id>/json', methods=['GET'])
def get_json_results(video_id):
    """Get JSON statistics"""
    json_path = os.path.join(app.config['OUTPUT_FOLDER'], f'statistics_{video_id}.json')
    
    if not os.path.exists(json_path):
        return jsonify({'error': 'Results not found'}), 404
    
  
    
    # Determine MIME type
    if video_path.endswith('.mp4'):
        mimetype = 'video/mp4'
    else:
        mimetype = 'video/x-msvideo'
    
    return send_file(
        video_path,
        mimetype=mimetype,
        as_attachment=False,
        download_name=f'tennis_analysis_{video_id}.{"mp4" if video_path.endswith(".mp4") else "avi"}'
    )

    def generate():
        with open(video_path, 'rb') as f:
            while True:
                chunk = f.read(1024 * 1024)  # Read 1MB at a time
                if not chunk:
                    break
                yield chunk
    
    file_size = os.path.getsize(video_path)
    
    return Response(
        generate(),
        mimetype='video/x-msvideo',
        headers={
            'Content-Length': str(file_size),
            'Accept-Ranges': 'bytes',
            'Content-Disposition': 'inline'
        }
    )

@app.route('/api/results/<video_id>/video/download', methods=['GET'])
def download_video_results(video_id):
    """Download video file"""
    video_path = os.path.join(app.config['OUTPUT_FOLDER'], f'output_{video_id}.avi')
    
    if not os.path.exists(video_path):
        return jsonify({'error': 'Video not found'}), 404
    
    return send_file(video_path, as_attachment=True, download_name=f'tennis_analysis_{video_id}.avi')

@app.route('/api/results/<video_id>/excel', methods=['GET'])
def get_excel_results(video_id):
    """Download Excel file"""
    excel_path = os.path.join(app.config['OUTPUT_FOLDER'], f'statistics_{video_id}.xlsx')
    
    if not os.path.exists(excel_path):
        return jsonify({'error': 'Excel file not found'}), 404
    
    return send_file(excel_path, as_attachment=True, download_name=f'tennis_statistics_{video_id}.xlsx')

@app.route('/api/videos', methods=['GET'])
def list_videos():
    """List all processed videos"""
    videos = []
    
    for video_id, status in processing_status.items():
        videos.append({
            'video_id': video_id,
            'status': status.get('status'),
            'message': status.get('message')
        })
    
    return jsonify({'videos': videos})

@app.route('/api/results/<video_id>', methods=['DELETE'])
def delete_results(video_id):
    """Delete video and results"""
    try:
        # Delete files
        for f in Path(app.config['OUTPUT_FOLDER']).glob(f'*{video_id}*'):
            f.unlink()
        
        for f in Path(app.config['UPLOAD_FOLDER']).glob(f'*{video_id}*'):
            f.unlink()
        
        # Remove from status
        if video_id in processing_status:
            del processing_status[video_id]
        
        return jsonify({'message': 'Results deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Tennis Analysis API Server...")
    print("Server running at http://localhost:5001")
    app.run(debug=True, host='0.0.0.0', port=5001, threaded=True)
