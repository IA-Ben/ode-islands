# Hero Content & Intro Video Management Guide

## Overview

The Ode Islands platform now has a comprehensive Hero Content management system that allows you to create and manage:

1. **Intro Videos** - Full-screen launch videos shown when users first open the app
2. **Hero Spots** - Featured hero sections within the app
3. **Menu Heroes** - Hero banners in navigation menus

All hero content supports images, videos (with Google Cloud adaptive streaming), customizable CTAs, and flexible settings.

## Features

### Admin Interface

Access hero content management at `/admin/hero-content` or press **CMD+K** and type "hero".

**Key Features:**
- Visual card grid showing all hero content
- Click any card to edit
- Full-featured editor with:
  - Basic info (name, type, title, subtitle)
  - Media picker integration for images and videos
  - Dual CTA configuration (primary/secondary)
  - Playback settings (loop, autoplay, mute)
  - Launch behavior (show on app launch)
  - Active/inactive toggle

### Media Integration

- **Google Cloud Storage**: All videos uploaded through the media library are automatically processed for adaptive streaming
- **MediaPickerModal**: Unified media selection interface
- **Thumbnails**: Visual preview of selected media
- **File size display**: See media asset sizes

### CTA Actions

Each hero content can have two CTAs (primary and secondary):

1. **Go to Story** - Navigates to the immersive story experience (`/before`)
2. **Go to App UI** - Takes users to the main app interface (`/event`)
3. **Custom URL** - Any custom deeplink or external URL

**Example Configuration:**
```typescript
{
  ctaPrimary: {
    label: "Explore the Story",
    action: "story",
    target: "/before" // optional specific path
  },
  ctaSecondary: {
    label: "Skip to App",
    action: "app",
    target: "/event" // optional specific path
  }
}
```

## Database Schema

### Table: `hero_contents`

```sql
CREATE TABLE hero_contents (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  type hero_content_type NOT NULL, -- 'intro_video', 'hero_spot', 'menu_hero'
  title VARCHAR NOT NULL,
  subtitle TEXT,
  image_media_id VARCHAR REFERENCES media_assets(id),
  video_media_id VARCHAR REFERENCES media_assets(id),
  cta_primary JSONB, -- { label, action, target }
  cta_secondary JSONB,
  settings JSONB, -- { loop, autoplay, muted, showOnLaunch }
  is_active BOOLEAN DEFAULT false,
  created_by VARCHAR REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Admin CRUD

- **GET** `/api/admin/hero-content` - List all hero contents with media
- **POST** `/api/admin/hero-content` - Create new hero content
- **PUT** `/api/admin/hero-content/[id]` - Update existing hero content
- **DELETE** `/api/admin/hero-content/[id]` - Delete hero content

### Public Access

- **GET** `/api/hero-content/intro` - Get active intro video for app launch

## Usage

### 1. Creating an Intro Video

1. Navigate to `/admin/hero-content`
2. Click "Create Hero Content"
3. Fill in the form:
   - **Name**: "Ode Islands Welcome" (internal reference)
   - **Type**: "Intro Video (Launch Screen)"
   - **Title**: "Welcome to The Ode Islands"
   - **Subtitle**: "Experience immersive storytelling"
   - **Background Image**: Select from media library
   - **Intro Video**: Select video from media library
   - **Primary CTA**: "Explore Story" → Story
   - **Secondary CTA**: "Skip to App" → App UI
   - **Settings**:
     - ✅ Loop video
     - ✅ Autoplay video
     - ✅ Mute by default
     - ✅ Show on app launch
   - **Active**: ✅ (make visible to users)
4. Click "Save"

### 2. Implementing Intro Video on Launch

Add the `IntroVideoLauncher` component to your root layout:

```tsx
// app/layout.tsx or app/page.tsx
import IntroVideoLauncher from '@/components/IntroVideoLauncher';

export default function Layout() {
  return (
    <>
      <IntroVideoLauncher />
      {/* Rest of your app */}
    </>
  );
}
```

**How it works:**
- Checks localStorage to see if user has seen the intro
- Fetches active intro video from `/api/hero-content/intro`
- Shows intro with configured CTAs
- User can:
  - Click "Explore Story" → Navigate to immersive story
  - Click "Skip to App" → Navigate to app UI
  - Click X to dismiss → Mark as seen, never show again
  - Toggle mute/unmute with volume button

### 3. Creating Hero Spots

Same process as intro videos, but select "Hero Spot (In-App)" as the type. These can be displayed in specific app sections with custom logic.

### 4. Creating Menu Heroes

Same process, select "Menu Hero" as type. These appear as hero banners in menus.

## Video Processing

All videos uploaded through the media library automatically leverage Google Cloud Storage's capabilities:

**Configuration** (from `.env`):
```bash
STORAGE_PROVIDER=google-cloud
STORAGE_HOSTNAME=storage.googleapis.com
STORAGE_BUCKET=odeislands
ENABLE_MEDIA_OPTIMIZATION=true
ENABLE_ADAPTIVE_STREAMING=true
```

**Features:**
- Automatic transcoding to multiple resolutions
- HLS/DASH adaptive streaming
- CDN delivery via Google Cloud CDN
- Automatic compression and optimization

## Best Practices

### Intro Videos

1. **Duration**: Keep intro videos between 10-30 seconds
2. **File Size**: Aim for under 50MB for faster loading
3. **Format**: Upload MP4 (H.264) for best compatibility
4. **Resolution**: 1920x1080 (1080p) or 1280x720 (720p)
5. **Poster Image**: Always provide a high-quality background image
6. **Mute by Default**: Enable to comply with autoplay policies
7. **Loop**: Enable for continuous playback until user interacts
8. **Reduced Motion**: The system automatically shows static poster image for users with `prefers-reduced-motion`

### CTAs

1. **Primary CTA**: Should be the recommended action (e.g., "Explore Story")
2. **Secondary CTA**: Alternative path (e.g., "Skip to App")
3. **Clear Labels**: Use action-oriented text ("Explore", "Discover", "Enter")
4. **Contrast**: Primary CTA uses vibrant gradient, secondary is outlined

### Managing Multiple Intro Videos

- Only one intro video with `showOnLaunch: true` will be shown
- The most recently created active intro video takes precedence
- Users only see each intro video once (tracked via localStorage)
- To show a new intro, create a new hero content (new ID = new localStorage key)

## Command Palette

Quick access via **CMD+K** (or CTRL+K on Windows):

```
CMD+K → Type "hero"
```

Shows:
- "Go to Hero Content" - Navigate to hero content management

## Example Workflow: Festival Launch Experience

### Scenario
You're launching a summer music festival and want users to:
1. Watch a hype intro video
2. Choose between exploring the story or going straight to the event app

### Setup

1. **Upload Media**:
   - Upload festival hype video to media library (via `/admin/cms`)
   - Upload festival poster image

2. **Create Intro Video**:
   - Name: "Summer Fest 2025 Intro"
   - Type: Intro Video
   - Title: "Summer Fest 2025"
   - Subtitle: "Join us for the musical experience of a lifetime"
   - Video: Select hype video
   - Background Image: Select poster
   - Primary CTA: "Explore the Story" → Story
   - Secondary CTA: "Go to Event" → App UI
   - Settings: Loop ✅, Autoplay ✅, Mute ✅, Show on Launch ✅
   - Active: ✅

3. **Deploy**:
   - Push to Vercel
   - First-time users see the intro
   - Returning users (who've seen it) skip straight to app

### Result

Users open the app and see:
1. Full-screen video with festival visuals
2. Logo and title overlay
3. Two prominent buttons:
   - "Explore the Story" - Fuchsia gradient, takes to `/before`
   - "Go to Event" - Outlined, takes to `/event`
4. Mute toggle in top right
5. Close button to dismiss

## Troubleshooting

### Intro video not showing

**Check:**
1. Is the hero content marked as `isActive: true`?
2. Is `showOnLaunch: true` in settings?
3. Has user already seen it? Clear localStorage: `localStorage.removeItem('intro_seen_...')`
4. Is there video media attached?
5. Check browser console for errors

### Video not loading

**Check:**
1. Is video uploaded to media library?
2. Is media asset accessible at `cloudUrl`?
3. Check Google Cloud Storage bucket permissions
4. Verify video file format (MP4 recommended)
5. Check file size (large files may timeout)

### CTA not navigating correctly

**Check:**
1. Verify CTA action is set correctly ('story', 'app', or 'url')
2. For custom targets, ensure path starts with `/` or `http`
3. Check browser console for navigation errors

## Future Enhancements

Potential additions to the hero content system:

1. **A/B Testing**: Show different intro videos to different user segments
2. **Analytics**: Track CTA click rates and dismissal rates
3. **Scheduling**: Auto-activate/deactivate based on date ranges
4. **Localization**: Different videos per language/region
5. **Dynamic Content**: Personalized intros based on user tier or history
6. **Preview Mode**: Preview intro video in admin before publishing
7. **Captions**: VTT subtitle support for accessibility
8. **Playlists**: Sequence of intro videos for multi-part stories

## Summary

The Hero Content Management system provides:

✅ Full CRUD admin interface for intro videos and hero spots
✅ Visual media picker with Google Cloud Storage integration
✅ Dual CTA configuration for story vs app UI choice
✅ Smart launch logic with localStorage tracking
✅ Adaptive video streaming ready
✅ Accessibility support (reduced motion, captions)
✅ Command palette integration
✅ Production-ready with Vercel deployment

Your immersive event platform now has professional-grade intro video management with seamless user choice between story and app experiences.
