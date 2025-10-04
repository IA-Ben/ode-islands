#!/bin/bash

# Quick deployment verification script

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Video Pipeline - Deployment Verification  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}\n"

# Check environment variables
echo -e "${BLUE}[1/5]${NC} Checking environment variables..."

check_var() {
    if [ -z "${!1}" ]; then
        echo -e "${RED}✗${NC} $1 not set"
        return 1
    else
        echo -e "${GREEN}✓${NC} $1 is set"
        return 0
    fi
}

ALL_VARS_SET=true
check_var "CLOUD_RUN_TRANSCODER_URL" || ALL_VARS_SET=false
check_var "GCS_INPUT_BUCKET" || ALL_VARS_SET=false
check_var "GCS_CDN_BUCKET" || ALL_VARS_SET=false

if [ "$ALL_VARS_SET" = false ]; then
    echo -e "\n${RED}ERROR:${NC} Missing environment variables"
    echo -e "Add them to Replit Secrets from .env.gcp file\n"
    exit 1
fi

echo ""

# Check Cloud Run health
echo -e "${BLUE}[2/5]${NC} Testing Cloud Run health endpoint..."

if command -v curl &> /dev/null; then
    HEALTH=$(curl -s "$CLOUD_RUN_TRANSCODER_URL/health" 2>/dev/null || echo "failed")
    
    if echo "$HEALTH" | grep -q "healthy"; then
        echo -e "${GREEN}✓${NC} Cloud Run is healthy"
        echo "$HEALTH" | jq -r '.memory.status' 2>/dev/null | sed 's/^/  /'
    else
        echo -e "${RED}✗${NC} Cloud Run health check failed"
        echo "$HEALTH"
    fi
else
    echo -e "${YELLOW}!${NC} curl not available, skipping health check"
fi

echo ""

# Check GCS buckets
echo -e "${BLUE}[3/5]${NC} Verifying GCS buckets..."

if command -v gsutil &> /dev/null; then
    if gsutil ls "gs://$GCS_INPUT_BUCKET" &> /dev/null; then
        echo -e "${GREEN}✓${NC} Input bucket accessible: gs://$GCS_INPUT_BUCKET"
    else
        echo -e "${RED}✗${NC} Cannot access input bucket"
    fi
    
    if gsutil ls "gs://$GCS_CDN_BUCKET" &> /dev/null; then
        echo -e "${GREEN}✓${NC} CDN bucket accessible: gs://$GCS_CDN_BUCKET"
    else
        echo -e "${RED}✗${NC} Cannot access CDN bucket"
    fi
else
    echo -e "${YELLOW}!${NC} gsutil not available, skipping bucket check"
fi

echo ""

# Check API endpoint
echo -e "${BLUE}[4/5]${NC} Testing upload API endpoint..."

if command -v curl &> /dev/null; then
    API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/cms/media/upload" 2>/dev/null || echo "000")
    
    if [ "$API_STATUS" = "401" ] || [ "$API_STATUS" = "405" ]; then
        echo -e "${GREEN}✓${NC} Upload API responding (HTTP $API_STATUS)"
    elif [ "$API_STATUS" = "000" ]; then
        echo -e "${YELLOW}!${NC} Server not running (start with: npm run dev)"
    else
        echo -e "${YELLOW}!${NC} API returned HTTP $API_STATUS"
    fi
else
    echo -e "${YELLOW}!${NC} curl not available, skipping API check"
fi

echo ""

# Summary
echo -e "${BLUE}[5/5]${NC} Deployment Summary\n"

echo -e "${GREEN}Cloud Run:${NC}"
echo -e "  URL: $CLOUD_RUN_TRANSCODER_URL"
echo -e "  Specs: 4 vCPU, 16GiB RAM"

echo -e "\n${GREEN}Storage:${NC}"
echo -e "  Input: gs://$GCS_INPUT_BUCKET"
echo -e "  CDN: gs://$GCS_CDN_BUCKET"
echo -e "  Public URL: https://storage.googleapis.com/$GCS_CDN_BUCKET"

echo -e "\n${YELLOW}Next Steps:${NC}"
echo -e "  1. Ensure server is running: ${BLUE}npm run dev${NC}"
echo -e "  2. Login as admin user"
echo -e "  3. Navigate to: ${BLUE}http://localhost:3000/cms/media-uploader${NC}"
echo -e "  4. Upload test video: ${BLUE}attached_assets/OdeNew1-1_1759621845199.mp4${NC}"

echo -e "\n${GREEN}Ready to test! 🚀${NC}\n"
