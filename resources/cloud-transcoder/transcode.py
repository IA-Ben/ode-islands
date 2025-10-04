#!/usr/bin/env python3

import os
import json
import subprocess
import tempfile
import shutil
from pathlib import Path
from google.cloud import storage
from flask import Flask, request, jsonify
from config import QUALITY_PROFILES, GCS_INPUT_BUCKET, GCS_OUTPUT_BUCKET

app = Flask(__name__)
storage_client = storage.Client()


def get_video_dimensions(input_file):
    cmd = [
        'ffprobe',
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height',
        '-of', 'json',
        input_file
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    data = json.loads(result.stdout)
    
    stream = data['streams'][0]
    return int(stream['width']), int(stream['height'])


def generate_variant(input_file, output_dir, profile):
    quality_dir = os.path.join(output_dir, profile['name'])
    os.makedirs(quality_dir, exist_ok=True)
    
    playlist_path = os.path.join(quality_dir, 'playlist.m3u8')
    segment_pattern = os.path.join(quality_dir, 'segment_%03d.ts')
    
    cmd = [
        'ffmpeg',
        '-i', input_file,
        '-c:v', 'libx264',
        '-profile:v', profile['profile'],
        '-level', profile['level'],
        '-preset', 'fast',
        '-b:v', profile['video_bitrate'],
        '-maxrate', profile['maxrate'],
        '-bufsize', profile['bufsize'],
        '-vf', f"scale={profile['width']}:{profile['height']}:force_original_aspect_ratio=decrease,pad={profile['width']}:{profile['height']}",
        '-c:a', 'aac',
        '-b:a', profile['audio_bitrate'],
        '-ar', '48000',
        '-ac', '2',
        '-hls_time', '6',
        '-hls_playlist_type', 'vod',
        '-hls_segment_filename', segment_pattern,
        '-hls_flags', 'independent_segments',
        '-g', '48',
        '-keyint_min', '48',
        '-hls_list_size', '0',
        playlist_path
    ]
    
    if 'fps' in profile:
        cmd.extend(['-r', str(profile['fps'])])
    
    print(f"Generating {profile['name']}...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    
    if result.returncode != 0:
        print(f"Error generating {profile['name']}: {result.stderr}")
        return False
    
    print(f"✓ {profile['name']} generated successfully")
    return True


def verify_segments(output_dir, applicable_profiles):
    for profile in applicable_profiles:
        quality_dir = os.path.join(output_dir, profile['name'])
        playlist_path = os.path.join(quality_dir, 'playlist.m3u8')
        
        with open(playlist_path, 'r') as f:
            playlist_content = f.read()
        
        import re
        segments = re.findall(r'segment_\d+\.ts', playlist_content)
        
        for segment in segments:
            segment_path = os.path.join(quality_dir, segment)
            if not os.path.exists(segment_path):
                print(f"❌ Missing segment: {segment_path}")
                return False
        
        print(f"✓ Verified {len(segments)} segments for {profile['name']}")
    
    return True


def generate_master_playlist(output_dir, applicable_profiles):
    manifest_dir = os.path.join(output_dir, 'manifest')
    os.makedirs(manifest_dir, exist_ok=True)
    
    master_path = os.path.join(manifest_dir, 'master.m3u8')
    
    content = '#EXTM3U\n#EXT-X-VERSION:6\n\n'
    
    for profile in applicable_profiles:
        video_bps = int(profile['video_bitrate'].replace('k', '')) * 1000
        audio_bps = int(profile['audio_bitrate'].replace('k', '')) * 1000
        bandwidth = video_bps + audio_bps
        
        content += f"#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION={profile['width']}x{profile['height']}\n"
        content += f"../{profile['name']}/playlist.m3u8\n\n"
    
    with open(master_path, 'w') as f:
        f.write(content)
    
    print('✓ Master playlist generated')


def generate_thumbnails(input_file, output_dir):
    thumbnails_dir = os.path.join(output_dir, 'thumbnails')
    os.makedirs(thumbnails_dir, exist_ok=True)
    
    poster_path = os.path.join(thumbnails_dir, 'poster.jpg')
    
    cmd = [
        'ffmpeg',
        '-i', input_file,
        '-ss', '00:00:01',
        '-vframes', '1',
        '-q:v', '2',
        poster_path
    ]
    
    subprocess.run(cmd, capture_output=True)
    print('✓ Poster thumbnail generated')


def upload_to_gcs(local_dir, video_id):
    bucket = storage_client.bucket(GCS_OUTPUT_BUCKET)
    
    for root, dirs, files in os.walk(local_dir):
        for file in files:
            local_path = os.path.join(root, file)
            relative_path = os.path.relpath(local_path, local_dir)
            blob_path = f"videos/{video_id}/{relative_path}"
            
            blob = bucket.blob(blob_path)
            blob.upload_from_filename(local_path)
            print(f"Uploaded: {blob_path}")
    
    print(f'✓ All files uploaded to gs://{GCS_OUTPUT_BUCKET}/videos/{video_id}/')


def process_video(input_uri, video_id):
    bucket_name = input_uri.replace('gs://', '').split('/')[0]
    blob_path = '/'.join(input_uri.replace('gs://', '').split('/')[1:])
    
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    
    with tempfile.TemporaryDirectory() as temp_dir:
        input_file = os.path.join(temp_dir, 'input_video')
        output_dir = os.path.join(temp_dir, 'output')
        os.makedirs(output_dir)
        
        print(f"Downloading {input_uri}...")
        blob.download_to_filename(input_file)
        
        width, height = get_video_dimensions(input_file)
        print(f"Video dimensions: {width}x{height}")
        
        applicable_profiles = [
            p for p in QUALITY_PROFILES
            if p['width'] <= width and p['height'] <= height
        ]
        
        print(f"Generating {len(applicable_profiles)} quality variants...")
        
        for profile in applicable_profiles:
            success = generate_variant(input_file, output_dir, profile)
            if not success:
                raise Exception(f"Failed to generate {profile['name']}")
        
        if not verify_segments(output_dir, applicable_profiles):
            raise Exception("Segment verification failed")
        
        generate_master_playlist(output_dir, applicable_profiles)
        
        generate_thumbnails(input_file, output_dir)
        
        upload_to_gcs(output_dir, video_id)
        
        move_input_to_completed(bucket_name, blob_path)
    
    return True


def move_input_to_completed(bucket_name, blob_path):
    bucket = storage_client.bucket(bucket_name)
    source_blob = bucket.blob(blob_path)
    
    new_path = blob_path.replace('pending/', 'completed/')
    bucket.copy_blob(source_blob, bucket, new_path)
    source_blob.delete()
    
    print(f"Moved input file to completed: {new_path}")


@app.route('/process', methods=['POST'])
def process():
    data = request.get_json()
    
    input_uri = data.get('input_uri')
    video_id = data.get('video_id')
    
    if not input_uri or not video_id:
        return jsonify({'error': 'Missing input_uri or video_id'}), 400
    
    try:
        process_video(input_uri, video_id)
        return jsonify({
            'status': 'success',
            'video_id': video_id,
            'output_uri': f'gs://{GCS_OUTPUT_BUCKET}/videos/{video_id}/'
        })
    except Exception as e:
        print(f"Error processing video: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy'})


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
