#!/bin/bash

# Complete GCP Infrastructure Setup Script
# Sets up everything from scratch: project, buckets, service account, Cloud Run

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
PROJECT_ID=${GCP_PROJECT_ID:-""}
REGION=${GCP_REGION:-"us-central1"}
INPUT_BUCKET="ode-islands-video-input"
CDN_BUCKET="ode-islands-video-cdn"
SERVICE_NAME="video-transcoder"
SERVICE_ACCOUNT_NAME="video-transcoder-sa"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Video Pipeline - Complete Setup Script      ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}\n"

# Check gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}ERROR:${NC} gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Login check
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
    echo -e "${YELLOW}Please login to Google Cloud...${NC}"
    gcloud auth login
fi

# Get project ID
if [ -z "$PROJECT_ID" ]; then
    CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
    if [ -z "$CURRENT_PROJECT" ]; then
        read -p "Enter your GCP project ID: " PROJECT_ID
    else
        echo -e "${GREEN}Using current project:${NC} $CURRENT_PROJECT"
        PROJECT_ID=$CURRENT_PROJECT
    fi
fi

echo -e "\n${BLUE}==>${NC} Project: ${GREEN}$PROJECT_ID${NC}"
echo -e "${BLUE}==>${NC} Region: ${GREEN}$REGION${NC}\n"

# Set project
gcloud config set project "$PROJECT_ID"

# 1. Enable APIs
echo -e "${BLUE}[1/7]${NC} Enabling required APIs..."
gcloud services enable \
    run.googleapis.com \
    storage.googleapis.com \
    pubsub.googleapis.com \
    cloudbuild.googleapis.com \
    --project="$PROJECT_ID" \
    --quiet
echo -e "${GREEN}✓${NC} APIs enabled\n"

# 2. Create service account
echo -e "${BLUE}[2/7]${NC} Setting up service account..."
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT_EMAIL" --project="$PROJECT_ID" &> /dev/null; then
    gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
        --display-name="Video Transcoder Service Account" \
        --project="$PROJECT_ID"
    echo -e "${GREEN}✓${NC} Service account created"
else
    echo -e "${YELLOW}!${NC} Service account already exists"
fi

# Grant permissions
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/storage.admin" \
    --quiet &> /dev/null

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
    --role="roles/pubsub.publisher" \
    --quiet &> /dev/null

echo -e "${GREEN}✓${NC} Permissions granted\n"

# 3. Create credentials
echo -e "${BLUE}[3/7]${NC} Creating service account credentials..."
CREDS_FILE="../../gcp-credentials.json"

if [ -f "$CREDS_FILE" ]; then
    echo -e "${YELLOW}!${NC} Credentials file already exists"
else
    gcloud iam service-accounts keys create "$CREDS_FILE" \
        --iam-account="$SERVICE_ACCOUNT_EMAIL" \
        --project="$PROJECT_ID"
    echo -e "${GREEN}✓${NC} Credentials saved to gcp-credentials.json"
fi
echo ""

# 4. Create GCS buckets
echo -e "${BLUE}[4/7]${NC} Creating GCS buckets..."

# Input bucket
if gsutil ls -p "$PROJECT_ID" "gs://$INPUT_BUCKET" &> /dev/null; then
    echo -e "${YELLOW}!${NC} Input bucket already exists"
else
    gsutil mb -l "$REGION" -p "$PROJECT_ID" "gs://$INPUT_BUCKET"
    echo -e "${GREEN}✓${NC} Created gs://$INPUT_BUCKET"
fi

# Create folders
for folder in pending processing completed failed; do
    echo "" | gsutil cp - "gs://$INPUT_BUCKET/$folder/.keep" 2>/dev/null || true
done

# CDN bucket
if gsutil ls -p "$PROJECT_ID" "gs://$CDN_BUCKET" &> /dev/null; then
    echo -e "${YELLOW}!${NC} CDN bucket already exists"
else
    gsutil mb -l "$REGION" -p "$PROJECT_ID" "gs://$CDN_BUCKET"
    echo -e "${GREEN}✓${NC} Created gs://$CDN_BUCKET"
fi

# Make CDN public
gsutil iam ch allUsers:objectViewer "gs://$CDN_BUCKET" &> /dev/null

# Configure CORS
cat > /tmp/cors.json << 'EOF'
[{
  "origin": ["*"],
  "method": ["GET", "HEAD"],
  "responseHeader": ["Content-Type", "Range"],
  "maxAgeSeconds": 3600
}]
EOF
gsutil cors set /tmp/cors.json "gs://$CDN_BUCKET" &> /dev/null
rm /tmp/cors.json

echo -e "${GREEN}✓${NC} Buckets configured\n"

# 5. Build Docker image
echo -e "${BLUE}[5/7]${NC} Building Docker image..."
gcloud builds submit \
    --tag "gcr.io/$PROJECT_ID/$SERVICE_NAME" \
    --project="$PROJECT_ID" \
    --timeout=900s \
    --quiet

echo -e "${GREEN}✓${NC} Image built\n"

# 6. Deploy to Cloud Run
echo -e "${BLUE}[6/7]${NC} Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
    --image "gcr.io/$PROJECT_ID/$SERVICE_NAME" \
    --platform managed \
    --region "$REGION" \
    --cpu 4 \
    --memory 16Gi \
    --timeout 900 \
    --max-instances 10 \
    --service-account "$SERVICE_ACCOUNT_EMAIL" \
    --set-env-vars "GCS_INPUT_BUCKET=$INPUT_BUCKET,GCS_OUTPUT_BUCKET=$CDN_BUCKET" \
    --allow-unauthenticated \
    --project="$PROJECT_ID" \
    --quiet

CLOUD_RUN_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region "$REGION" \
    --project="$PROJECT_ID" \
    --format="value(status.url)")

echo -e "${GREEN}✓${NC} Cloud Run deployed\n"

# 7. Test deployment
echo -e "${BLUE}[7/7]${NC} Testing deployment..."
sleep 3
HEALTH=$(curl -s "$CLOUD_RUN_URL/health" || echo "failed")

if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✓${NC} Health check passed\n"
else
    echo -e "${RED}✗${NC} Health check failed\n"
fi

# Generate environment variables
echo -e "${BLUE}==>${NC} Generating environment configuration...\n"

cat > ../../.env.gcp << EOF
# GCP Configuration - Generated $(date)

GOOGLE_APPLICATION_CREDENTIALS=./gcp-credentials.json
CLOUD_RUN_TRANSCODER_URL=$CLOUD_RUN_URL
GCS_INPUT_BUCKET=$INPUT_BUCKET
GCS_CDN_BUCKET=$CDN_BUCKET
NEXT_PUBLIC_CDN_URL=https://storage.googleapis.com/$CDN_BUCKET
GCP_PROJECT_ID=$PROJECT_ID
GCP_REGION=$REGION
EOF

echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Setup Complete! 🎉                    ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}\n"

echo -e "${BLUE}Summary:${NC}"
echo -e "  Project: ${GREEN}$PROJECT_ID${NC}"
echo -e "  Region: ${GREEN}$REGION${NC}"
echo -e "  Cloud Run: ${GREEN}$CLOUD_RUN_URL${NC}"
echo -e "  Input Bucket: ${GREEN}gs://$INPUT_BUCKET${NC}"
echo -e "  CDN Bucket: ${GREEN}gs://$CDN_BUCKET${NC}\n"

echo -e "${YELLOW}Next Steps:${NC}"
echo -e "  1. Add these to Replit Secrets (from .env.gcp):"
echo -e "     ${BLUE}→${NC} GOOGLE_APPLICATION_CREDENTIALS"
echo -e "     ${BLUE}→${NC} CLOUD_RUN_TRANSCODER_URL"
echo -e "     ${BLUE}→${NC} GCS_INPUT_BUCKET"
echo -e "     ${BLUE}→${NC} GCS_CDN_BUCKET"
echo -e "     ${BLUE}→${NC} NEXT_PUBLIC_CDN_URL"
echo -e "\n  2. Upload gcp-credentials.json to Replit project root"
echo -e "\n  3. Restart your Replit server"
echo -e "\n  4. Test at: ${GREEN}http://localhost:3000/cms/media-uploader${NC}\n"

echo -e "${BLUE}Optional:${NC} Set up Pub/Sub for better scalability:"
echo -e "  ./pubsub-setup.sh\n"

echo -e "${GREEN}Your video pipeline is ready! 🚀${NC}\n"
