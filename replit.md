# Overview

The Ode Islands is an event companion app built with Next.js, designed to enhance live events across three phases: Before, Event, and After. It features pre-event immersive storytelling with AR cards and videos, real-time AR and interactive features during events, and post-event content for memories and community engagement. The application includes a unified phase navigation system, comprehensive CMS, theme editor, and a video transcoding system for HLS delivery via Google Cloud Storage, aiming to provide a rich, interactive experience throughout the event lifecycle.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses Next.js 15 with the App Router, implementing a three-phase event companion system with client-side rendering. It features a **two-tier navigation architecture**:

### Navigation System
**TopNav (Global)**: Persistent across all phases with brand logo, centered timeline tabs (Before/Event/After), wallet access with badge notifications, tier/points display (Bronze/Silver/Gold), quick QR scanner, role-gated admin access, and profile menu.

**Section Sub-Navigation**: Phase-specific sticky headers using reusable components:
- `SectionSubNav`: Base component with rounded pills, dark glass background (bg-slate-900/70), focus rings, horizontal scroll support
- `EventHeader`: Info | Interact | Rewards lanes + Map/Scan action buttons
- `AfterHeader`: Recap | Create | Offers lanes + Share action button
- `SectionScaffold`: Consistent content layout wrapper (max-w-6xl, responsive padding)

Visual consistency maintained across all sub-navs: same pill buttons, motion (200ms transitions), focus states (fuchsia-400), and mobile-responsive design.

The UI includes a modular component structure (Player, AnimateText, Card/ClientCard), and a three-tier routing strategy with legacy support. State management uses local React hooks, and styling is managed with Tailwind CSS 4, custom CSS variables, and a theming system. A custom hook (`useViewportHeight`) addresses iOS Safari's dynamic viewport behavior, and scroll-based navigation is optimized for mobile touch interactions.

## Video Streaming Architecture
HLS.js is used for cross-browser HLS video streaming, with a fallback to native HLS for Safari. Videos are served from Google Cloud Storage in HLS format via a configurable CDN URL. A custom Player component handles auto-play, muted playback, and event handling for chapter progression, supporting both background and immersive video modes.

## Data Architecture
PostgreSQL (Neon) is used for production data storage with Drizzle ORM for type-safe operations. The database includes entities for Chapters & Story Cards (with versioning and media references), a Media Library for asset management (with usage tracking and soft delete), and Content Versioning with audit trails. Advanced search capabilities are provided by PostgreSQL full-text search with GIN indexes.

## Media Library System
An enterprise-grade media asset management system provides 10 storage methods, a `media_assets` table with `media_usage` tracking, and a RESTful API with 7 endpoints. The CMS UI includes a MediaLibrary component with drag-and-drop upload, advanced filtering, pagination, and bulk operations. It integrates with editors via a MediaSelectorModal and features delete protection for in-use assets and soft delete functionality.

## CMS Enterprise Features
The CMS includes production-ready features for security and workflow:

### Authentication & Authorization
Replit Auth (OpenID Connect) provides secure session management with a 4-Tier RBAC System (Super Admin, Content Admin, Content Editor, Content Viewer) offering granular permission checks. Role management is handled via an admin UI, with RBAC middleware protecting all server-side routes and PostgreSQL-backed sessions.

### Audit Logging
Comprehensive tracking of all CMS operations (create, update, delete, publish) is stored in a 14-field `audit_logs` table with performance indexes. It captures before/after snapshots, automatically categorizes entities, and records user context (IP, user agent, user ID). This non-blocking design ensures audit failures do not interrupt primary operations.

### Publishing Workflow
A 4-State Workflow (Draft → In Review → Published → Archived) supports a review process (submit, approve, reject) and scheduled publishing. Publishing fields (`publishStatus`, `publishedAt`, `reviewedBy`, etc.) control content visibility, and state transitions are enforced and audited. Both chapters and story cards support this workflow, with CSRF protection on all state-changing operations.

### Visual Card Editor
A drag-and-drop visual card builder offers real-time preview and editing of 6 element types (Text, Image, Video, Button, Divider, Spacer). It supports dual-mode editing (Visual/Traditional JSON), element management (add, delete, reorder), property editors, and Media Library integration. Card settings include background color/image and padding. The layout is stored as JSONB in the `storyCards` table and rendered by a `CardRenderer` component.

**Video Upload Integration**: The visual editor includes direct video upload capability using a reusable `videoUpload.ts` utility. Users can upload videos (MP4/MOV/AVI/WebM, 2GB max) directly from the video element editor with real-time progress tracking and transcoding status updates. The system validates files, uploads via XHR with progress callbacks, polls the transcoding service for status, and automatically sets both the HLS playback URL and mediaAssetId when complete. Upload states (uploading, processing, completed, error) are tracked per-element with visual feedback (progress bar, status messages).

### Database-Driven Card Editor
A modal-based `StoryCardModal` allows creating and editing cards directly within the CMS, with real-time database sync. It supports smart data hydration, handles both create and edit operations via `/api/story-cards` endpoints, and optimizes chapter-specific refreshes. The legacy file-based editor is deprecated.

### Traditional Mode - Complete Feature Restoration
A full-featured form-based editor provides structured editing for text content, call to action, media management (video, image, audio, background image), theme & styling (ColorPicker, mix blend mode, text shadow), AR configuration (mode selector with conditional panels), and PlayCanvas integration. It includes components like `ColorPicker`, `ObjectUploader`, `CardEditorButtons`, and `CMSCardPreview`, with an option for advanced users to switch to raw JSON editing.

### Video Transcoding & Adaptive Streaming Integration
An automated transcoding pipeline processes uploaded videos into adaptive HLS format with 11 quality profiles (144p-4K) using a Cloud Run transcoder. It includes complete dual-orientation generation:

**Dual-Orientation System (16:9 Videos)**:
- Automatic aspect ratio detection (ratio between 1.7-1.8 triggers dual-orientation)
- Landscape version: Full 4K quality with all 11 profiles
- Portrait version: Center-cropped 9:16 at 1080p (1080x1920) using FFmpeg `crop=out_w:out_h:x:y` filter
- Separate directory structure: `videos/{id}/landscape/manifest/` and `videos/{id}/portrait/manifest/`
- Intelligent Player with device orientation detection (window.innerWidth vs innerHeight)
- `/api/video-status/[videoId]` endpoint returns `has_portrait` flag for client-side detection
- Backward compatibility: Legacy videos (non-16:9) use root manifest path `videos/{id}/manifest/`

**Integration Flow**:
Smart upload handler uses `/api/cms/media/upload` to trigger the transcoding service with real-time status polling. HLS manifests store only `videoId`, and the Player component constructs full HLS URLs. The UI provides comprehensive user feedback, and client-side validation checks file size and type. GCS serves as the storage backend, with a Cloud Function triggering the Cloud Run transcoder.

### Visual Mode - 100% Feature Complete
All 6 element types (Text, Image, Video, Button, Divider, Spacer) are fully functional with comprehensive property editors (e.g., content, variant, alignment, colors for text; media library selection, alt text, dimensions for images; autoplay/loop/muted for videos). Card settings include background color/image (via media library) and individual padding controls. Safe rendering with nullish coalescing defaults and data preservation during updates ensure robustness.

### Security & Data Integrity
All mutation endpoints require CSRF token validation. Sensitive routes are protected by `isAdmin` and `isAdminWithCSRF` middleware. Server-side validation is enforced for all user input, and Drizzle ORM's parameterized queries prevent SQL injection. Sensitive data is not exposed to clients, and foreign key constraints ensure referential integrity.

## Memory Wallet & Gamification System
A comprehensive reward and collection system enables users to collect memories through QR codes, location-based triggers, and story interactions with gamification features.

### Database Architecture
**Memory Templates (`memory_templates`)**: Reusable memory configurations with title, description, media assets (image/video/3D model), gamification data (points, rarity: common/rare/epic/legendary), set collections (setId, setName, setIndex, setTotal), metadata schema (JSONB), and OG share settings for social media.

**User Memory Wallet (`user_memory_wallet`)**: Extended with 11 nullable fields for backwards compatibility including mediaType (image/video/model_3d), source tracking (sourceType, cardId, subchapterId, ruleId, qrCode, geoLocation), set collection data (setId, setName, setIndex, setTotal), and metadata (JSONB). Original fields (id, userId, templateId, earnedAt, title, image) remain unchanged.

**Reward Rules (`reward_rules`)**: Trigger configurations defining how memories are awarded with type (qr_code/location/action), memoryTemplateId reference, eventId, match configuration (JSONB: QR payload patterns, geofence coords/radius, action types), constraints (JSONB: time windows, user limits, prerequisites), anti-abuse settings (JSONB: rate limits, cooldowns, duplicate prevention), and validity period (validFrom/validTo).

**QR Nonces (`qr_nonces`)**: Prevents QR code replay attacks by tracking used nonce values with eventId, nonce (unique), usedAt timestamp, and optional userId for attribution.

### CMS Management
**Memory Templates Manager** (`/admin/cms/memory-templates`): Full CRUD interface with template listing (filterable by event, rarity, set, active status), creation/editing form (all fields including media library integration), referential integrity protection (templates cannot be deleted if referenced by user memories or reward rules with detailed error messages showing counts), and admin-only access with CSRF protection.

**Reward Rules Builder** (`/admin/cms/reward-rules`): Configure reward triggers with type-specific UI (QR Code/Location/Action selector), memory template selection (dropdown of available templates), JSON editors for match configuration (QR patterns, geofence data, action triggers), constraints (time windows, limits, prerequisites), and anti-abuse settings (rate limits, cooldowns). Includes filtering by event/type/template/status and admin-only access.

### Referential Integrity
Memory templates use dual-protection deletion logic: checks both `user_memory_wallet.templateId` references (awarded memories) and `reward_rules.memoryTemplateId` references (active rules). The API returns comprehensive error messages like "This template is referenced by 5 user memories and 3 reward rules and cannot be deleted" with proper 409 Conflict status.

# External Dependencies

## Core Framework Dependencies
- **Next.js 15.4.4**: React framework.
- **React 19.1.0 & React DOM**: Core UI libraries.
- **TypeScript 5**: Type safety.

## Media and Styling
- **HLS.js 1.6.7**: HTTP Live Streaming client.
- **Tailwind CSS 4**: Utility-first CSS framework.
- **Manrope Font**: Typography.

## Development Tools
- **ESLint 9**: Code linting.
- **PostCSS**: CSS processing.

## Video Processing System
- **FFmpeg (fluent-ffmpeg)**: Video transcoding.
- **Node.js**: Runtime for transcoding service.
- **TypeScript & TSX**: Transcoder development.

## Cloud Services
- **Google Cloud Storage**: Cloud storage and CDN for media assets and processed videos.
- **gsutil**: CLI tool for GCS interaction.

## Content Delivery
- **Next.js Image Optimization**: For Google Cloud Storage images.
- **HLS Video Streaming**: Adaptive bitrate video delivery.