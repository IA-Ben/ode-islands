import os
import json
import requests
from google.cloud import storage

TRANSCODER_URL = os.environ.get('TRANSCODER_SERVICE_URL')

def process_video_upload(event, context):
    """
    Cloud Function triggered by GCS upload to ode-islands-video-input/pending/
    """
    file_name = event['name']
    bucket_name = event['bucket']
    
    if not file_name.startswith('pending/'):
        print(f"Ignoring file not in pending/: {file_name}")
        return
    
    video_id = os.path.splitext(os.path.basename(file_name))[0]
    input_uri = f"gs://{bucket_name}/{file_name}"
    
    print(f"Processing video: {video_id} from {input_uri}")
    
    payload = {
        'input_uri': input_uri,
        'video_id': video_id
    }
    
    response = requests.post(
        f"{TRANSCODER_URL}/process",
        json=payload,
        timeout=3600
    )
    
    if response.status_code == 200:
        print(f"Successfully processed video: {video_id}")
        print(response.json())
    else:
        print(f"Error processing video: {response.text}")
        raise Exception(f"Transcoding failed for {video_id}")
