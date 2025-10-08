# Complete Vercel Deployment Guide - The Ode Islands

## Overview

This guide walks you through deploying The Ode Islands immersive event platform to Vercel with full production configuration.

## Prerequisites

- [Vercel Account](https://vercel.com/signup) (free tier works)
- [Neon Database Account](https://neon.tech) (PostgreSQL hosting)
- [Google Cloud Project](https://console.cloud.google.com) (for media storage)
- GitHub repository connected

## Step 1: Database Setup (Neon PostgreSQL)

### 1.1 Create Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Click "Create Project"
3. Project name: `ode-islands-prod`
4. Region: Choose closest to your users
5. PostgreSQL version: 15 or later
6. Click "Create Project"

### 1.2 Get Connection String

1. In Neon dashboard, go to "Connection Details"
2. Copy the connection string (looks like):
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
3. Save this for Vercel environment variables

### 1.3 Run Database Migrations

**Option A: Using provided SQL migration**

```bash
# From your local machine with DATABASE_URL set
psql "postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require" < drizzle/hero_content_migration.sql
```

**Option B: Using Drizzle Kit**

```bash
# Set DATABASE_URL temporarily
export DATABASE_URL="postgresql://user:password@..."

# Push schema to database
npm run db:push
```

This will create all tables including:
- users, sessions (auth)
- liveEvents, eventLanes, cardAssignments
- chapters, cards, mediaAssets
- heroContents (intro videos)
- polls, pollResponses
- And ~40 more tables for complete platform

## Step 2: Google Cloud Storage Setup

### 2.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: `ode-islands-media`
3. Enable "Cloud Storage API"

### 2.2 Create Storage Bucket

```bash
# Install gcloud CLI if needed
# Create bucket (replace with your bucket name)
gsutil mb -c STANDARD -l us-east1 gs://odeislands-prod

# Set CORS for web access
cat > cors.json << 'EOF'
[
  {
    "origin": ["*"],
    "method": ["GET", "HEAD", "PUT", "POST"],
    "responseHeader": ["Content-Type", "Access-Control-Allow-Origin"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://odeislands-prod

# Make bucket publicly readable (for media assets)
gsutil iam ch allUsers:objectViewer gs://odeislands-prod
```

### 2.3 Create Service Account

1. In Google Cloud Console → IAM & Admin → Service Accounts
2. Click "Create Service Account"
3. Name: `ode-islands-uploader`
4. Grant role: "Storage Object Admin"
5. Click "Create Key" → JSON
6. Download the JSON key file
7. **Important**: Keep this file secure, never commit to git

### 2.4 Prepare for Vercel

The service account JSON needs to be base64 encoded for Vercel:

```bash
# Encode the service account key
base64 -i service-account-key.json -o gcp-key-base64.txt

# Copy the contents of gcp-key-base64.txt for Vercel env var
cat gcp-key-base64.txt
```

## Step 3: Vercel Project Setup

### 3.1 Install Vercel CLI (Optional)

```bash
npm install -g vercel
vercel login
```

### 3.2 Create Vercel Project via Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository: `hubd/theodeislands4`
4. Configure project:
   - **Project Name**: `ode-islands-live`
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave as root)
   - **Build Command**: `npm run build` (or `npm run build:fast` for faster builds)
   - **Output Directory**: `.next` (auto-detected)

5. Click "Deploy" (will fail initially - need env vars)

## Step 4: Environment Variables

### 4.1 Required Environment Variables

In Vercel Dashboard → Project → Settings → Environment Variables, add:

#### Database
```bash
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

#### Authentication & Security
```bash
JWT_SECRET=<generate-with-openssl-rand-base64-32>
SESSION_SECRET=<generate-with-openssl-rand-base64-32>
CSRF_SECRET=<generate-with-openssl-rand-base64-32>
QR_SECRET=<generate-with-openssl-rand-base64-32>
```

**Generate secrets:**
```bash
# Generate random secrets
openssl rand -base64 32  # Use for JWT_SECRET
openssl rand -base64 32  # Use for SESSION_SECRET
openssl rand -base64 32  # Use for CSRF_SECRET
openssl rand -base64 32  # Use for QR_SECRET
```

#### Google Cloud Storage
```bash
STORAGE_PROVIDER=google-cloud
STORAGE_HOSTNAME=storage.googleapis.com
STORAGE_BUCKET=odeislands-prod
GOOGLE_APPLICATION_CREDENTIALS_BASE64=<paste-base64-encoded-service-account-key>
```

#### Application URLs
```bash
BASE_URL=https://ode-islands-live.vercel.app
CDN_URL=https://storage.googleapis.com/odeislands-prod
NODE_ENV=production
```

#### Feature Flags (Optional - all enabled by default)
```bash
ENABLE_AR=true
ENABLE_REALTIME=true
ENABLE_ANALYTICS=true
ENABLE_LIVE_EVENTS=true
ENABLE_MEDIA_OPTIMIZATION=true
ENABLE_ADAPTIVE_STREAMING=true
```

### 4.2 Set Environment Variables in Vercel

For each variable above:
1. Click "Add New"
2. Key: `DATABASE_URL`
3. Value: `<your-value>`
4. Environment: Check "Production", "Preview", and "Development"
5. Click "Save"

**Repeat for all variables above**

## Step 5: Decode GCP Credentials at Runtime

The app needs to decode the base64 GCP credentials. Update your upload handling:

**Create**: `src/lib/storage.ts`

```typescript
import { Storage } from '@google-cloud/storage';

let storage: Storage | null = null;

export function getStorage(): Storage {
  if (storage) return storage;

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
    // Decode base64 credentials for Vercel deployment
    const credentials = JSON.parse(
      Buffer.from(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64,
        'base64'
      ).toString('utf-8')
    );

    storage = new Storage({
      projectId: credentials.project_id,
      credentials,
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Use file path for local development
    storage = new Storage({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  } else {
    throw new Error('Missing Google Cloud credentials');
  }

  return storage;
}

export function getBucket(bucketName: string = process.env.STORAGE_BUCKET!) {
  const storage = getStorage();
  return storage.bucket(bucketName);
}
```

Update any file uploads to use:
```typescript
import { getBucket } from '@/lib/storage';

const bucket = getBucket();
const file = bucket.file(`uploads/${filename}`);
await file.save(buffer);
```

## Step 6: Build Settings

### 6.1 Vercel Project Settings

In Vercel Dashboard → Project → Settings → General:

- **Node.js Version**: 18.x or 20.x
- **Install Command**: `npm install`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 6.2 Optimize Build Performance

In `next.config.ts`, ensure you have:

```typescript
export default {
  typescript: {
    ignoreBuildErrors: false, // Set to true if you need faster builds
  },
  eslint: {
    ignoreDuringBuilds: false, // Set to true to skip linting during build
  },
  // ... other config
};
```

For faster builds during development:
```bash
npm run build:fast  # Skips linting
```

## Step 7: Deploy

### 7.1 Initial Deployment

1. In Vercel Dashboard → Deployments
2. Click "Redeploy" (now that env vars are set)
3. Wait for build to complete (~3-5 minutes)
4. Visit your production URL: `https://ode-islands-live.vercel.app`

### 7.2 Verify Deployment

**Check these URLs work:**
- `/` - Home page
- `/admin` - Admin dashboard (requires login)
- `/admin/hero-content` - Hero content management
- `/admin/events` - Events management
- `/admin/story-builder` - Story builder
- `/event` - User-facing event view

## Step 8: Post-Deployment Setup

### 8.1 Create Admin User

You need to create an admin user in the database:

```sql
-- Connect to your Neon database
psql "postgresql://user:password@..."

-- Create admin user (use your email)
INSERT INTO users (email, first_name, last_name, is_admin, email_verified)
VALUES ('your@email.com', 'Admin', 'User', true, true);

-- Get the user ID
SELECT id FROM users WHERE email = 'your@email.com';
```

### 8.2 Test Media Upload

1. Go to `/admin/hero-content`
2. Click "Create Hero Content"
3. Try uploading an image
4. Verify it appears in Google Cloud Storage bucket
5. Verify the image loads in the preview

### 8.3 Test Live Event Flow

1. Create test event in `/admin/events`
2. Configure lanes (Info, Interact, Rewards)
3. Assign test cards to lanes
4. Click "Go Live"
5. Publish a card
6. Open `/event` in another tab and verify card appears

## Step 9: Custom Domain (Optional)

### 9.1 Add Custom Domain

1. In Vercel Dashboard → Project → Settings → Domains
2. Add your domain: `odeislands.com`
3. Add DNS records as instructed by Vercel:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

4. Wait for DNS propagation (5-60 minutes)

### 9.2 Update Environment Variables

Update these to use your custom domain:
```bash
BASE_URL=https://odeislands.com
```

Redeploy for changes to take effect.

## Step 10: Monitoring & Performance

### 10.1 Enable Vercel Analytics

1. In Vercel Dashboard → Project → Analytics
2. Enable Web Analytics (included in free tier)
3. Monitor page views, performance metrics

### 10.2 Set Up Error Tracking (Optional)

Add Sentry for error tracking:

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Add to environment variables:
```bash
SENTRY_DSN=<your-sentry-dsn>
NEXT_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
```

### 10.3 Database Connection Pooling

For production, use Neon's connection pooling:

1. In Neon dashboard, get the "Pooled connection" string
2. Update `DATABASE_URL` to use pooled connection
3. This prevents "too many connections" errors under load

## Troubleshooting

### Build Fails with "Missing DATABASE_URL"

**Solution**: Ensure `DATABASE_URL` is set in Vercel environment variables for all environments.

### Images Don't Load

**Check**:
1. GCP bucket is public: `gsutil iam ch allUsers:objectViewer gs://your-bucket`
2. CORS is configured: `gsutil cors get gs://your-bucket`
3. `STORAGE_BUCKET` env var matches actual bucket name
4. `GOOGLE_APPLICATION_CREDENTIALS_BASE64` is correctly encoded

### "Permission Denied" on Media Upload

**Check**:
1. Service account has "Storage Object Admin" role
2. Base64 encoding is correct (no line breaks)
3. Credentials JSON is valid

### Database Connection Errors

**Check**:
1. DATABASE_URL includes `?sslmode=require`
2. Neon database is not sleeping (wake it by visiting Neon dashboard)
3. Connection string has correct username/password
4. Use pooled connection for production

### Slow Builds

**Solutions**:
- Use `npm run build:fast` (skips linting)
- Enable TypeScript `ignoreBuildErrors` in next.config.ts
- Use Vercel's build cache (automatic)
- Reduce dependencies if possible

### Event Not Going Live

**Check**:
1. Event `isActive = true` in database
2. Event start/end times are correct
3. Lanes are created and saved
4. Cards are assigned to lanes with `status='active'`

## Production Checklist

Before announcing to users:

- [ ] Database migrations applied
- [ ] Admin user created and can log in
- [ ] Media upload tested and working
- [ ] Test event created with all three lanes
- [ ] Cards assigned and published successfully
- [ ] Intro video configured and displays on launch
- [ ] Story builder accessible and functional
- [ ] Custom domain configured (if applicable)
- [ ] Analytics enabled
- [ ] Error tracking set up
- [ ] Database backups configured (Neon automatic)
- [ ] Monitoring dashboards set up

## Ongoing Maintenance

### Database Backups

Neon provides automatic backups:
- Point-in-time restore up to 7 days (free tier)
- Up to 30 days (paid plans)

### Scaling

Vercel scales automatically:
- Free tier: Unlimited bandwidth
- Hobby tier: Good for thousands of users
- Pro tier: For production apps with SLA

### Updates

To deploy updates:
```bash
git add .
git commit -m "Update feature"
git push origin main
```

Vercel automatically deploys on push to main.

## Cost Estimates

### Free Tier (Good for Development/Testing)

- **Vercel**: Free (100GB bandwidth, unlimited requests)
- **Neon**: Free (0.5GB storage, 1 compute hour/day)
- **Google Cloud**: Free tier (5GB storage, 5000 ops/month)

**Total**: $0/month

### Production Tier (Recommended)

- **Vercel Pro**: $20/month (1TB bandwidth, analytics, support)
- **Neon Scale**: $19/month (10GB storage, always-on compute)
- **Google Cloud Storage**: ~$5/month (50GB storage, 50k ops)

**Total**: ~$44/month

### High Traffic Tier

- **Vercel Enterprise**: Custom pricing
- **Neon Business**: Custom pricing
- **Google Cloud**: Pay as you go

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Neon Docs**: https://neon.tech/docs
- **Google Cloud Storage**: https://cloud.google.com/storage/docs
- **Next.js Docs**: https://nextjs.org/docs

## Summary

Your Ode Islands platform is now deployed to Vercel with:

✅ Production database (Neon PostgreSQL)
✅ Media storage (Google Cloud Storage)
✅ Serverless functions (Vercel Edge)
✅ Automatic scaling
✅ HTTPS with custom domain support
✅ Global CDN for media assets
✅ Automatic deployments from Git

**Your platform is live and ready for events!** 🎉
