#!/bin/bash

# Cloud Run Deployment Script for Video Transcoder
# Deploys with optimized resource allocation for parallel transcoding

set -e

PROJECT_ID=${GCP_PROJECT_ID:-"ode-islands"}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME="video-transcoder"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

echo "🚀 Deploying Video Transcoder to Cloud Run"
echo "   Project: ${PROJECT_ID}"
echo "   Region: ${REGION}"
echo ""

# Build the container image
echo "📦 Building container image..."
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_IMAGE_NAME=${IMAGE_NAME} \
  --project ${PROJECT_ID}

echo ""
echo "☁️  Deploying to Cloud Run with optimized configuration..."

# Deploy to Cloud Run with performance optimizations
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --memory 16Gi \
  --cpu 4 \
  --timeout 3600 \
  --max-instances 10 \
  --min-instances 0 \
  --concurrency 10 \
  --cpu-boost \
  --execution-environment gen2 \
  --service-account video-transcoder-sa@${PROJECT_ID}.iam.gserviceaccount.com \
  --set-env-vars INPUT_BUCKET=ode-islands-video-input \
  --set-env-vars OUTPUT_BUCKET=ode-islands-video-cdn \
  --set-env-vars MAX_PARALLEL_JOBS=4 \
  --set-env-vars MEMORY_THRESHOLD_MB=14000 \
  --allow-unauthenticated=false \
  --ingress=internal-and-cloud-load-balancing

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Service URL:"
gcloud run services describe ${SERVICE_NAME} \
  --region ${REGION} \
  --project ${PROJECT_ID} \
  --format 'value(status.url)'
