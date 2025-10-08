# Ode Islands - Admin & CMS Guide

## 🎯 Overview

Ode Islands is an immersive event platform that combines interactive storytelling, live events, AR experiences, and collectible memories. This guide will help you use the admin CMS to create and manage your events.

## 🚀 Quick Start

### Accessing the Admin

1. Navigate to `/admin` in your browser
2. Login with your admin credentials
3. You'll see the admin dashboard with real-time statistics

### Creating Your First Event

1. **Go to Events** (`/admin/events`)
2. **Click "Create Event"**
3. **Fill in the details**:
   - Event title and description
   - Start and end dates
   - Venue information
   - Enable features (polls, Q&A, chat)
4. **Click "Create Event"**

That's it! Your event is created and ready to be configured.

---

## 📋 Admin Sections

### 1. Dashboard (`/admin`)

**What it shows:**
- Total users and growth metrics
- Active events count
- Published content statistics
- Draft content waiting for review
- Recent activity across the platform

**Quick Actions:**
- Jump to Content Management
- View Analytics
- Manage Users

### 2. Events (`/admin/events`)

**Purpose**: Create and manage live events

**Features:**
- Create new events with wizard
- Edit existing events
- Activate/deactivate events
- View event status (Live, Upcoming, Ended)
- Search and filter events

**Workflow:**
```
Create Event → Configure Details → Set Venue → Enable Features → Activate
```

### 3. CMS (`/admin/cms`)

**Purpose**: Unified content management system

**Sections:**
- **Hero Settings** - Configure hero image/video
- **Lane Management** - Plan, Discover, Community, BTS lanes
- **BTS Video Series** - Create video playlists
- **Concept Art Galleries** - Manage art collections
- **Featured Rules** - Dynamic content selection
- **Media Library** - Upload and manage assets
- **Advanced Search** - Find content quickly

**Best for**: Managing the "Before" experience

### 4. Story Builder (`/admin/story`)

**Purpose**: Create interactive narratives

**Features:**
- Chapter management
- Card creation
- Branching narratives
- Interactive choices

**Workflow:**
```
Create Chapter → Add Cards → Add Choices → Link Branches → Preview → Publish
```

### 5. Cards (`/admin/cards`)

**Purpose**: Manage all card content

**Types of Cards:**
- Story cards (narrative content)
- Event cards (live event features)
- Info cards (static information)
- AR cards (augmented reality)

**Features:**
- Create from templates
- Bulk operations
- Media integration
- Custom buttons & actions

### 6. Rewards (`/admin/rewards`)

**Purpose**: Configure collectibles and rewards

**Features:**
- Memory templates (what users can collect)
- Reward rules (how users earn them)
- QR code generation
- Location-based triggers

**Example Use Case:**
```
Create Memory Template → Upload Media → Generate QR Code →
Place QR at Venue → Users Scan → Memory Added to Wallet
```

### 7. Users (`/admin/users`)

**Purpose**: Manage user accounts

**Features:**
- View all users
- Search by name/email
- Check verification status
- View activity
- Grant admin access

### 8. Analytics (`/admin/analytics`)

**Purpose**: Track performance metrics

**Metrics:**
- User engagement
- Content performance
- Event attendance
- Popular features

*Note: Advanced analytics coming soon*

### 9. Settings (`/admin/settings`)

**Purpose**: System configuration

**Options:**
- Theme customization
- Feature flags
- Permissions
- General settings

---

## 🎨 Content Creation Workflows

### Creating a Complete Event Experience

#### Step 1: Create the Event
```
/admin/events → Create Event → Fill Details → Save
```

#### Step 2: Build Pre-Event Story
```
/admin/story → New Chapter → Add Cards →
Configure Interactions → Publish
```

#### Step 3: Set Up Collectibles
```
/admin/rewards → Create Memory Template →
Set Rarity & Points → Generate QR Codes
```

#### Step 4: Configure Live Features
```
/admin/events → Edit Event → Enable Polls/Q&A → Save
```

#### Step 5: Test & Activate
```
Preview Experience → Fix Issues → Activate Event
```

### Creating Interactive Story with Branches

#### 1. Plan Your Story
- Draw out your story flow
- Identify decision points
- Plan different endings

#### 2. Create Main Chapter
```
/admin/story → Create Chapter → Add Title & Summary
```

#### 3. Add Story Cards
```
Select Chapter → Add Card →
Choose Type (Text/Image/Video/AR) →
Add Content → Save
```

#### 4. Add Choice Points
```
Add Card → Type: "Interactive Choice" →
Define Options → Link to Next Chapters →
Set Unlock Conditions (optional)
```

#### 5. Create Branch Chapters
```
Create New Chapter → Reference from Choice →
Continue Story for That Path
```

#### 6. Preview Flow
```
Use Preview Mode → Test All Paths →
Verify Logic → Publish
```

### Uploading and Managing Media

#### Quick Upload
```
/admin/cms → Media Library →
Drag & Drop Files → Auto-Tag → Use in Content
```

#### Organized Upload
```
Media Library → Create Folder →
Upload Batch → Add Tags →
Set Descriptions → Organize
```

#### Using Media in Content
```
Edit Card → Click Image/Video Picker →
Search Media Library → Select → Insert
```

---

## 🔑 Key Features

### Content Status Management

All content has workflow states:
- **Draft** - Work in progress, not visible
- **In Review** - Ready for approval
- **Published** - Live and visible to users
- **Archived** - Hidden but preserved

**Change status**: Edit any content → Publishing Workflow panel → Select status

### Scheduled Publishing

Publish content at a specific time:
```
Edit Content → Publishing Workflow →
Schedule Publication → Set Date/Time → Save
```

### Bulk Operations

Manage multiple items at once:
```
Select Multiple Items (checkboxes) →
Bulk Actions Bar Appears →
Choose Action (Publish/Delete/Archive) →
Confirm
```

### Audit Logging

Every change is tracked:
- Who made the change
- What was changed
- When it happened
- Before/after values

**View audit logs**: Any edit page → Activity History panel

### Media Library Features

- **Drag-drop upload**
- **Auto-transcoding** for videos
- **Cloud storage** (Google Cloud)
- **Usage tracking** (see where media is used)
- **Bulk operations**
- **Search & filter**

---

## 💡 Best Practices

### Event Planning
1. Create event at least 1 week before
2. Build "Before" experience 2-3 weeks early
3. Test all features in staging
4. Schedule content to go live progressively
5. Monitor analytics during event

### Story Creation
1. Start with simple linear stories
2. Add branching as you get comfortable
3. Test all paths before publishing
4. Use drafts liberally
5. Preview on mobile devices

### Media Management
1. Organize files in folders
2. Use consistent naming conventions
3. Tag everything for easy search
4. Optimize images before upload (< 2MB)
5. Use appropriate formats (WebP for images, MP4 for video)

### Content Workflow
1. Draft → Review → Publish
2. Use scheduled publishing for coordinated launches
3. Keep audit trail for compliance
4. Archive old content instead of deleting

### Performance
1. Limit card count per chapter (< 20 cards)
2. Compress media files
3. Use lazy loading (automatic)
4. Monitor dashboard stats

---

## 🐛 Troubleshooting

### Media Won't Upload
- Check file size (< 100MB)
- Verify internet connection
- Try different browser
- Check Google Cloud Storage status

### Content Not Showing
- Verify status is "Published"
- Check scheduled publish date
- Clear browser cache
- Verify parent is also published

### Changes Not Saving
- Check for validation errors
- Ensure required fields filled
- Try refreshing page
- Check audit logs for conflicts

### Event Not Appearing
- Confirm `isActive` is checked
- Verify date range includes today
- Check event list filters
- Clear search query

---

## 🔐 Security

### Admin Access
- Only admins can access `/admin/*`
- Regular users redirected
- Session-based authentication
- Audit logging for all actions

### Content Security
- XSS protection on user inputs
- SQL injection prevention (Drizzle ORM)
- CSRF tokens on forms
- Secure media uploads

### Best Practices
1. Use strong passwords
2. Log out when done
3. Don't share admin credentials
4. Review audit logs regularly
5. Keep admin list minimal

---

## 📊 Understanding Analytics

### Dashboard Metrics

**User Growth**
- Total users registered
- New users last 30 days
- Growth percentage

**Content Status**
- Published vs Draft
- Publish rate
- Weekly activity

**Event Status**
- Active events count
- Total events
- Upcoming events

### Performance Indicators

- **High Engagement**: Users viewing multiple chapters
- **Low Bounce**: Users completing stories
- **Active Collection**: Users scanning QR codes

---

## 🆘 Getting Help

### Quick Reference
- **Deployment**: See `/VERCEL_DEPLOYMENT.md`
- **Architecture**: See `/CMS_REDESIGN_PLAN.md`
- **Codebase**: See main `/README.md`

### Support Resources
- Check audit logs for error details
- Review browser console for client errors
- Check Vercel logs for server issues
- Database logs in Neon dashboard

---

## 🎯 Pro Tips

1. **Use Templates**: Duplicate existing events/stories to save time
2. **Preview Often**: Check mobile view frequently
3. **Start Simple**: Get comfortable with basics before branching
4. **Tag Everything**: Makes search incredibly useful later
5. **Schedule Wisely**: Use scheduled publishing for coordinated launches
6. **Monitor Analytics**: Adjust content based on user behavior
7. **Bulk Operations**: Save time with multi-select actions
8. **Audit Logs**: Great for debugging "what changed?"
9. **Media Library**: Upload everything there first, then use in content
10. **Status Workflow**: Draft → Review → Publish keeps quality high

---

**You're ready to create amazing immersive experiences!** 🚀

Start with the Dashboard, create your first event, and build from there. The CMS is designed to be intuitive - if you get stuck, most features have inline help and tooltips.
