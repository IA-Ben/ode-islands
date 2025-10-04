#!/bin/bash

# Pub/Sub Setup for Video Transcoding Pipeline
# Creates topics, subscriptions, and configures Cloud Run push subscriptions

set -e

PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project)}
REGION=${REGION:-us-central1}
TOPIC_NAME="video-transcode-requests"
SUBSCRIPTION_NAME="video-transcode-sub"
CLOUD_RUN_SERVICE="video-transcoder"

echo "🚀 Setting up Pub/Sub for video transcoding pipeline"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Topic: $TOPIC_NAME"
echo ""

# Create Pub/Sub topic
echo "📢 Creating Pub/Sub topic..."
gcloud pubsub topics create $TOPIC_NAME \
  --project=$PROJECT_ID \
  --message-retention-duration=1h \
  || echo "   Topic already exists"

# Get Cloud Run service URL
echo "🔗 Getting Cloud Run service URL..."
SERVICE_URL=$(gcloud run services describe $CLOUD_RUN_SERVICE \
  --region=$REGION \
  --project=$PROJECT_ID \
  --format='value(status.url)')

if [ -z "$SERVICE_URL" ]; then
  echo "❌ Cloud Run service not found: $CLOUD_RUN_SERVICE"
  echo "   Deploy the service first with: ./deploy.sh"
  exit 1
fi

echo "   Service URL: $SERVICE_URL"

# Create push subscription to Cloud Run
echo "📨 Creating push subscription..."
gcloud pubsub subscriptions create $SUBSCRIPTION_NAME \
  --topic=$TOPIC_NAME \
  --push-endpoint="${SERVICE_URL}/process-pubsub" \
  --ack-deadline=600 \
  --message-retention-duration=10m \
  --min-retry-delay=10s \
  --max-retry-delay=600s \
  --project=$PROJECT_ID \
  || echo "   Subscription already exists"

# Grant Pub/Sub permission to invoke Cloud Run
echo "🔐 Granting Pub/Sub invoker permissions..."
SERVICE_ACCOUNT="service-${PROJECT_ID}@gcp-sa-pubsub.iam.gserviceaccount.com"

gcloud run services add-iam-policy-binding $CLOUD_RUN_SERVICE \
  --region=$REGION \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/run.invoker" \
  --project=$PROJECT_ID

echo ""
echo "✅ Pub/Sub setup complete!"
echo ""
echo "📋 Configuration Summary:"
echo "   Topic: projects/$PROJECT_ID/topics/$TOPIC_NAME"
echo "   Subscription: projects/$PROJECT_ID/subscriptions/$SUBSCRIPTION_NAME"
echo "   Push endpoint: ${SERVICE_URL}/process-pubsub"
echo ""
echo "🔧 Next steps:"
echo "   1. Update API to publish to Pub/Sub topic instead of direct HTTP"
echo "   2. Deploy updated Cloud Run service with /process-pubsub endpoint"
echo "   3. Test with: gcloud pubsub topics publish $TOPIC_NAME --message='{\"videoId\":\"test\",\"inputUri\":\"gs://bucket/file.mp4\"}'"
echo ""
