# Deploying Ode Islands to Vercel

## Pre-Deployment Checklist

### 1. Database Setup (Neon Postgres)

1. Create a Neon Postgres database at [neon.tech](https://neon.tech)
2. Copy the connection string (should look like `postgresql://user:pass@host.neon.tech/dbname`)
3. Save it for environment variables

### 2. Google Cloud Storage Setup

1. Create a Google Cloud Storage bucket
2. Enable public access for media files
3. Create a service account with Storage Admin permissions
4. Download the JSON key file
5. Base64 encode the key: `cat service-account.json | base64`

### 3. Configure Environment Variables in Vercel

Go to your Vercel project → Settings → Environment Variables and add:

```bash
# Database
DATABASE_URL=postgresql://...@...neon.tech/...

# Authentication
NEXTAUTH_SECRET=<generate-with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain.vercel.app

# Google Cloud Storage
GOOGLE_CLOUD_BUCKET=your-bucket-name
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_CREDENTIALS=<base64-encoded-service-account-json>

# Session
SESSION_SECRET=<generate-with: openssl rand -base64 32>

# Optional: Replit Auth (if using)
REPLIT_CLIENT_ID=your-client-id
REPLIT_CLIENT_SECRET=your-client-secret
```

## Deployment Steps

### Option 1: Deploy from GitHub (Recommended)

1. Push your code to GitHub:
   ```bash
   git push origin main
   ```

2. Go to [vercel.com/new](https://vercel.com/new)

3. Import your GitHub repository

4. Configure project:
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `.next`

5. Add environment variables (see above)

6. Click **Deploy**

### Option 2: Deploy with Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. For production:
   ```bash
   vercel --prod
   ```

## Post-Deployment Tasks

### 1. Initialize Database Schema

Run Drizzle migrations:

```bash
# From your local machine with DATABASE_URL set
npm run db:push
```

Or use Vercel's terminal in the project dashboard.

### 2. Create Admin User

You'll need to manually insert an admin user into the database:

```sql
INSERT INTO users (id, email, first_name, last_name, is_admin, email_verified)
VALUES (
  gen_random_uuid(),
  'admin@yourdomain.com',
  'Admin',
  'User',
  true,
  true
);
```

### 3. Configure Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as shown

### 4. Test the Deployment

1. Visit your deployment URL
2. Navigate to `/admin` and verify admin access
3. Create a test event
4. Upload a test media file
5. Verify all features work

## Performance Optimizations

### Already Configured

✅ Server Components for static content
✅ Dynamic imports for heavy components
✅ Image optimization with Next.js Image
✅ API route edge runtime where applicable
✅ Incremental Static Regeneration

### Additional Recommendations

1. **Enable Vercel Analytics**
   - Go to Project → Analytics → Enable

2. **Configure CDN Caching**
   - Media files cached via Google Cloud Storage
   - API routes set to no-cache (already configured)

3. **Monitor Performance**
   - Use Vercel Speed Insights
   - Monitor database connection pool

## Troubleshooting

### Build Fails

**Issue**: TypeScript errors during build

**Solution**:
```bash
# Fix locally first
npm run build

# If types are the issue
npm run lint
```

### Database Connection Issues

**Issue**: Can't connect to database

**Solutions**:
- Verify `DATABASE_URL` is correct
- Check Neon dashboard for connection limits
- Ensure IP whitelist includes Vercel IPs (usually not needed)

### Media Upload Fails

**Issue**: Can't upload images/videos

**Solutions**:
- Verify `GOOGLE_CLOUD_CREDENTIALS` is base64 encoded
- Check bucket permissions (public write access)
- Verify bucket name matches environment variable

### Session/Auth Issues

**Issue**: Can't login or session doesn't persist

**Solutions**:
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your domain
- Clear cookies and try again

## Scaling Considerations

### Database

- **Neon Postgres**
  - Use connection pooling (already configured)
  - Monitor query performance
  - Consider read replicas for high traffic

### Media Storage

- **Google Cloud Storage**
  - Already using CDN
  - Consider CloudFlare in front for additional caching
  - Implement lazy loading (already done)

### Serverless Functions

- **Vercel Functions**
  - 30-second timeout (configured in `vercel.json`)
  - Monitor execution time
  - Use Edge runtime where possible

## Security Checklist

✅ Environment variables not committed to git
✅ HTTPS enforced (automatic with Vercel)
✅ Security headers configured (see `vercel.json`)
✅ SQL injection prevention (using Drizzle ORM)
✅ CSRF protection on sensitive endpoints
✅ Rate limiting on API routes
✅ Input validation
✅ XSS protection

## Monitoring & Maintenance

### Set Up Alerts

1. **Vercel**
   - Deployment notifications
   - Error tracking
   - Performance alerts

2. **Database (Neon)**
   - Connection limit alerts
   - Storage alerts

3. **Google Cloud**
   - Bucket size monitoring
   - Egress bandwidth alerts

### Regular Maintenance

- [ ] Weekly: Check error logs
- [ ] Monthly: Review database performance
- [ ] Monthly: Audit media storage usage
- [ ] Quarterly: Update dependencies
- [ ] Quarterly: Security audit

## Cost Estimates

### Vercel
- **Hobby**: Free (good for development/small projects)
- **Pro**: $20/month (recommended for production)

### Neon Postgres
- **Free Tier**: 0.5GB storage, 10GB bandwidth
- **Pro**: $19/month for 10GB storage

### Google Cloud Storage
- **Storage**: ~$0.020/GB/month
- **Egress**: ~$0.12/GB (first 1TB free per month)

**Estimated Monthly Cost for Small-Medium Event**:
- Vercel Pro: $20
- Neon Pro: $19
- GCS (100GB storage + traffic): ~$5
- **Total**: ~$44/month

## Support & Resources

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Neon Docs**: https://neon.tech/docs
- **Drizzle ORM**: https://orm.drizzle.team
- **This Project**: Check `/CMS_REDESIGN_PLAN.md` for architecture

## Quick Reference Commands

```bash
# Local development
npm run dev

# Build locally
npm run build

# Run production locally
npm run start

# Database operations
npm run db:push          # Push schema changes
npm run db:studio        # Open Drizzle Studio

# Deploy
vercel                   # Deploy preview
vercel --prod           # Deploy to production

# Logs
vercel logs [deployment-url]
```

## Emergency Rollback

If deployment breaks:

1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click **⋯** → **Promote to Production**
4. Fix issues locally
5. Redeploy when ready

---

**Ready to deploy!** Follow the steps above and your Ode Islands platform will be live on Vercel.
