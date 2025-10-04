#!/usr/bin/env python3

import os
import json
import subprocess
import tempfile
import shutil
import concurrent.futures
from threading import Semaphore
from pathlib import Path
from google.cloud import storage
from flask import Flask, request, jsonify
from config import QUALITY_PROFILES, GCS_INPUT_BUCKET, GCS_OUTPUT_BUCKET
from memory_monitor import memory_manager

app = Flask(__name__)
storage_client = storage.Client()

# Resource management to prevent OOM
MAX_PARALLEL_JOBS = int(os.environ.get('MAX_PARALLEL_JOBS', 4))
memory_semaphore = Semaphore(MAX_PARALLEL_JOBS)

# Start memory monitoring
memory_manager.start()


def get_video_dimensions(input_file):
    cmd = [
        'ffprobe',
        '-v', 'error',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,duration,r_frame_rate,codec_name',
        '-of', 'json',
        input_file
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        if result.returncode != 0:
            raise Exception(f"FFprobe failed: {result.stderr}")
        
        data = json.loads(result.stdout)
        
        if 'streams' not in data or len(data['streams']) == 0:
            raise Exception("No video stream found (audio-only file?)")
        
        stream = data['streams'][0]
        width = int(stream.get('width', 0))
        height = int(stream.get('height', 0))
        duration = float(stream.get('duration', 0))
        codec = stream.get('codec_name', 'unknown')
        
        if width == 0 or height == 0:
            raise Exception(f"Invalid dimensions: {width}x{height}")
        
        if duration == 0:
            raise Exception("Zero-duration video")
        
        aspect_ratio = width / height
        if aspect_ratio > 10 or aspect_ratio < 0.1:
            raise Exception(f"Extreme aspect ratio: {aspect_ratio:.2f}:1 - unsupported")
        
        fps_str = stream.get('r_frame_rate', '0/0')
        try:
            num, den = map(int, fps_str.split('/'))
            if den == 0:
                print("⚠️ Warning: Variable frame rate detected, forcing CFR")
        except:
            print(f"⚠️ Warning: Could not parse frame rate: {fps_str}")
        
        supported_codecs = ['h264', 'hevc', 'vp8', 'vp9', 'mpeg4', 'mjpeg']
        if codec not in supported_codecs:
            print(f"⚠️ Warning: Uncommon codec detected: {codec}, transcoding may take longer")
        
        print(f"✓ Video validated: {width}x{height}, {duration:.1f}s, {codec}")
        
        return width, height
        
    except json.JSONDecodeError as e:
        raise Exception(f"Corrupted video file: {e}")
    except subprocess.TimeoutExpired:
        raise Exception("Video analysis timeout (file too large or corrupted)")
    except Exception as e:
        raise Exception(f"Video validation failed: {str(e)}")


def generate_variant_with_resource_management(input_file, output_dir, profile):
    """Wrapper to manage resources during parallel transcoding"""
    with memory_semaphore:  # Acquire semaphore before processing
        return generate_variant(input_file, output_dir, profile)


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


def update_processing_status(video_id, completed, total):
    """Update real-time processing status in GCS metadata"""
    try:
        bucket = storage_client.bucket(GCS_OUTPUT_BUCKET)
        status_blob = bucket.blob(f"videos/{video_id}/status.json")
        
        metadata = {
            "status": "processing",
            "progress": f"{completed}/{total}",
            "percentage": round((completed / total) * 100, 1),
            "completed_variants": completed,
            "total_variants": total
        }
        
        status_blob.upload_from_string(
            json.dumps(metadata),
            content_type='application/json'
        )
        print(f"Status updated: {completed}/{total} variants complete")
    except Exception as e:
        print(f"Failed to update status: {e}")


def update_processing_status_failed(video_id, error_message):
    """Update status to failed state"""
    try:
        bucket = storage_client.bucket(GCS_OUTPUT_BUCKET)
        status_blob = bucket.blob(f"videos/{video_id}/status.json")
        
        metadata = {
            "status": "failed",
            "error": error_message,
            "percentage": 0
        }
        
        status_blob.upload_from_string(
            json.dumps(metadata),
            content_type='application/json'
        )
        print(f"Status updated to failed: {error_message}")
    except Exception as e:
        print(f"Failed to update failure status: {e}")


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
        
        # Group profiles by priority for smarter processing
        critical_profiles = [p for p in applicable_profiles if p['height'] <= 480]  # 144p-480p
        standard_profiles = [p for p in applicable_profiles if 480 < p['height'] <= 1080]  # 540p-1080p
        premium_profiles = [p for p in applicable_profiles if p['height'] > 1080]  # 1440p-4K
        
        print(f"Generating {len(applicable_profiles)} quality variants in parallel...")
        print(f"  Critical: {len(critical_profiles)}, Standard: {len(standard_profiles)}, Premium: {len(premium_profiles)}")
        
        # Track successful profiles for downstream processing
        successful_profiles = []
        failed_count = 0
        
        # Process in strict priority order with controlled parallelism
        with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_PARALLEL_JOBS) as executor:
            
            # Process critical profiles first (COMPLETE before moving on)
            if critical_profiles:
                # Check memory before starting (critical profiles always run unless emergency)
                mem_status = memory_manager.get_status()
                if mem_status.get('emergency_mode'):
                    print("⚠️ WARNING: Emergency memory mode - only processing critical profiles")
                
                print("Processing critical profiles...")
                critical_futures = {
                    executor.submit(generate_variant_with_resource_management, input_file, output_dir, p): p
                    for p in critical_profiles
                }
                
                for future in concurrent.futures.as_completed(critical_futures):
                    profile = critical_futures[future]
                    try:
                        if future.result(timeout=600):
                            successful_profiles.append(profile)
                        else:
                            failed_count += 1
                    except Exception as e:
                        print(f"Failed to generate {profile['name']}: {e}")
                        failed_count += 1
                    
                    update_processing_status(video_id, len(successful_profiles), len(applicable_profiles))
            
            # Only process standard profiles after critical ones complete
            if standard_profiles and not memory_manager.should_skip_variant('standard'):
                print("Processing standard profiles...")
                standard_futures = {
                    executor.submit(generate_variant_with_resource_management, input_file, output_dir, p): p
                    for p in standard_profiles
                }
                
                for future in concurrent.futures.as_completed(standard_futures):
                    profile = standard_futures[future]
                    try:
                        if future.result(timeout=600):
                            successful_profiles.append(profile)
                        else:
                            failed_count += 1
                    except Exception as e:
                        print(f"Failed to generate {profile['name']}: {e}")
                        failed_count += 1
                    
                    update_processing_status(video_id, len(successful_profiles), len(applicable_profiles))
            
            # Finally process premium profiles (skip if memory pressure)
            if premium_profiles and not memory_manager.should_skip_variant('premium'):
                print("Processing premium profiles...")
                premium_futures = {
                    executor.submit(generate_variant_with_resource_management, input_file, output_dir, p): p
                    for p in premium_profiles
                }
                
                for future in concurrent.futures.as_completed(premium_futures):
                    profile = premium_futures[future]
                    try:
                        if future.result(timeout=600):
                            successful_profiles.append(profile)
                        else:
                            failed_count += 1
                    except Exception as e:
                        print(f"Failed to generate {profile['name']}: {e}")
                        failed_count += 1
                    
                    update_processing_status(video_id, len(successful_profiles), len(applicable_profiles))
            elif premium_profiles:
                print("⚠️ Skipping premium profiles due to memory pressure")
        
        print(f"✅ Generated {len(successful_profiles)}/{len(applicable_profiles)} variants ({failed_count} failed)")
        
        if len(successful_profiles) == 0:
            # Update status to failed
            update_processing_status_failed(video_id, "All transcoding variants failed")
            raise Exception("All transcoding variants failed")
        
        # Only verify and use successful profiles
        if not verify_segments(output_dir, successful_profiles):
            update_processing_status_failed(video_id, "Segment verification failed")
            raise Exception("Segment verification failed")
        
        generate_master_playlist(output_dir, successful_profiles)
        
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


@app.route('/process-pubsub', methods=['POST'])
def process_pubsub():
    """Process transcoding request from Pub/Sub push subscription"""
    envelope = request.get_json()
    
    if not envelope:
        return jsonify({'error': 'No Pub/Sub message received'}), 400
    
    # Decode Pub/Sub message
    import base64
    
    try:
        pubsub_message = envelope.get('message', {})
        message_data = pubsub_message.get('data', '')
        
        # Decode base64 message
        decoded_data = base64.b64decode(message_data).decode('utf-8')
        data = json.loads(decoded_data)
        
        input_uri = data.get('input_uri') or data.get('inputUri')
        video_id = data.get('video_id') or data.get('videoId')
        
        if not input_uri or not video_id:
            return jsonify({'error': 'Missing input_uri or video_id in message'}), 400
        
        print(f"📨 Received Pub/Sub transcoding request for video: {video_id}")
        
        # Process video asynchronously (return 200 immediately to ack message)
        import threading
        thread = threading.Thread(
            target=process_video_with_error_handling,
            args=(input_uri, video_id)
        )
        thread.start()
        
        return jsonify({'status': 'processing', 'video_id': video_id}), 200
        
    except Exception as e:
        print(f"Error processing Pub/Sub message: {str(e)}")
        return jsonify({'error': str(e)}), 400


def process_video_with_error_handling(input_uri, video_id):
    """Wrapper to handle errors in async processing"""
    try:
        process_video(input_uri, video_id)
    except Exception as e:
        print(f"Error in async video processing: {str(e)}")
        # Status already updated by process_video error handling


@app.route('/health', methods=['GET'])
def health():
    mem_status = memory_manager.get_status()
    return jsonify({
        'status': 'healthy',
        'memory': mem_status
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    app.run(host='0.0.0.0', port=port)
