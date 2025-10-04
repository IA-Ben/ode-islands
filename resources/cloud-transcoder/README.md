# Ode Islands Cloud Video Transcoder

Cloud-based video processing pipeline for converting source videos to adaptive HLS format with 11 quality profiles (144p-4K).

## Architecture

```
User Upload → GCS Input Bucket → Cloud Function → Cloud Run → GCS Output Bucket → CDN
```

## Setup Instructions

### 1. Create GCS Buckets

```bash
# Create input bucket
gsutil mb -l us-central1 gs://ode-islands-video-input

# Create output/CDN bucket
gsutil mb -l us-central1 gs://ode-islands-video-cdn

# Create bucket folders
gsutil -m cp /dev/null gs://ode-islands-video-input/pending/.keep
gsutil -m cp /dev/null gs://ode-islands-video-input/processing/.keep
gsutil -m cp /dev/null gs://ode-islands-video-input/completed/.keep
gsutil -m cp /dev/null gs://ode-islands-video-input/failed/.keep
```

### 2. Deploy Cloud Run Service

```bash
# Set project ID
export PROJECT_ID=your-gcp-project-id

# Build and deploy using Cloud Build
gcloud builds submit --config cloudbuild.yaml

# Or manually:
docker build -t gcr.io/$PROJECT_ID/ode-islands-transcoder .
docker push gcr.io/$PROJECT_ID/ode-islands-transcoder
gcloud run deploy ode-islands-transcoder \
  --image gcr.io/$PROJECT_ID/ode-islands-transcoder \
  --region us-central1 \
  --platform managed \
  --memory 4Gi \
  --cpu 2 \
  --timeout 3600 \
  --max-instances 10 \
  --allow-unauthenticated
```

### 3. Deploy Cloud Function Trigger

```bash
# Get Cloud Run service URL
export TRANSCODER_URL=$(gcloud run services describe ode-islands-transcoder \
  --region us-central1 \
  --format 'value(status.url)')

# Deploy Cloud Function
gcloud functions deploy process-video-upload \
  --runtime python39 \
  --trigger-resource ode-islands-video-input \
  --trigger-event google.storage.object.finalize \
  --entry-point process_video_upload \
  --set-env-vars TRANSCODER_SERVICE_URL=$TRANSCODER_URL \
  --source . \
  --region us-central1 \
  --memory 256MB \
  --timeout 540s
```

### 4. Configure CORS for Output Bucket

```bash
# Create cors.json
cat > cors.json <<EOF
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Range"],
    "maxAgeSeconds": 3600
  }
]
EOF

# Apply CORS
gsutil cors set cors.json gs://ode-islands-video-cdn
```

## Usage

### Upload Video for Processing

```bash
# Upload to pending folder
gsutil cp my-video.mp4 gs://ode-islands-video-input/pending/my-video-id.mp4

# The Cloud Function will automatically trigger transcoding
# Output will be available at: gs://ode-islands-video-cdn/videos/my-video-id/
```

### Output Structure

```
gs://ode-islands-video-cdn/videos/[video-id]/
├── manifest/
│   └── master.m3u8
├── thumbnails/
│   └── poster.jpg
├── 144p/
│   ├── playlist.m3u8
│   └── segment_*.ts
├── 240p/
├── 360p/
├── 480p/
├── 540p/
├── 720p/
├── 720p60/
├── 1080p/
├── 1080p60/
├── 1440p/
└── 2160p/
```

## Quality Profiles

| Profile | Resolution | Video Bitrate | Codec Profile | Use Case |
|---------|-----------|---------------|---------------|----------|
| 144p | 256x144 | 100 kbps | Baseline 3.0 | Ultra-low bandwidth |
| 240p | 426x240 | 300 kbps | Baseline 3.0 | Low bandwidth |
| 360p | 640x360 | 600 kbps | Baseline 3.1 | Mobile 3G |
| 480p | 854x480 | 1000 kbps | Main 3.1 | Mobile 4G |
| 540p | 960x540 | 1500 kbps | Main 4.0 | Tablet |
| 720p | 1280x720 | 2500 kbps | Main 4.0 | HD Standard |
| 720p60 | 1280x720 | 3500 kbps | Main 4.0 | HD High FPS |
| 1080p | 1920x1080 | 5000 kbps | High 4.0 | Full HD |
| 1080p60 | 1920x1080 | 7500 kbps | High 4.2 | Full HD High FPS |
| 1440p | 2560x1440 | 10000 kbps | High 5.0 | 2K |
| 2160p | 3840x2160 | 20000 kbps | High 5.1 | 4K |

## API Endpoints

### Health Check
```bash
curl https://[CLOUD_RUN_URL]/health
```

### Manual Processing
```bash
curl -X POST https://[CLOUD_RUN_URL]/process \
  -H "Content-Type: application/json" \
  -d '{
    "input_uri": "gs://ode-islands-video-input/pending/video.mp4",
    "video_id": "unique-video-id"
  }'
```

## Monitoring

View logs:
```bash
# Cloud Run logs
gcloud run services logs read ode-islands-transcoder --region us-central1

# Cloud Function logs
gcloud functions logs read process-video-upload --region us-central1
```

## Cost Optimization

- Cloud Run scales to zero when not processing
- Max 10 instances prevent runaway costs
- 4GB RAM / 2 CPU optimized for 1080p transcoding
- Consider Preemptible VMs for batch processing large libraries
