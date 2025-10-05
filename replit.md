# Overview

The Ode Islands is an event companion app built with Next.js, designed to enhance live events across three phases: Before, Event, and After. It features pre-event immersive storytelling with AR cards and videos, real-time AR and interactive features during events, and post-event content for memories and community engagement. The application includes a unified phase navigation system, comprehensive CMS, theme editor, and a video transcoding system for HLS delivery via Google Cloud Storage, aiming to provide a rich, interactive experience throughout the event lifecycle.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses Next.js 15 with the App Router, implementing a three-phase event companion system with client-side rendering. It features a Phase Navigation System, a modular component structure (Player, AnimateText, Card/ClientCard), and a three-tier routing strategy with legacy support. State management uses local React hooks, and styling is managed with Tailwind CSS 4, custom CSS variables, and a theming system. A custom hook (`useViewportHeight`) addresses iOS Safari's dynamic viewport behavior, and scroll-based navigation is optimized for mobile touch interactions.

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

### Database-Driven Card Editor
A modal-based `StoryCardModal` allows creating and editing cards directly within the CMS, with real-time database sync. It supports smart data hydration, handles both create and edit operations via `/api/story-cards` endpoints, and optimizes chapter-specific refreshes. The legacy file-based editor is deprecated.

### Traditional Mode - Complete Feature Restoration
A full-featured form-based editor provides structured editing for text content, call to action, media management (video, image, audio, background image), theme & styling (ColorPicker, mix blend mode, text shadow), AR configuration (mode selector with conditional panels), and PlayCanvas integration. It includes components like `ColorPicker`, `ObjectUploader`, `CardEditorButtons`, and `CMSCardPreview`, with an option for advanced users to switch to raw JSON editing.

### Video Transcoding & Adaptive Streaming Integration
An automated transcoding pipeline processes uploaded videos into adaptive HLS format with 11 quality profiles (144p-4K) using a Cloud Run transcoder. It now includes dual-orientation generation for 16:9 videos (landscape and portrait versions) with aspect ratio detection, FFmpeg cropping, and separate directory structures for manifests. A smart player detects device orientation to serve the appropriate manifest. A smart upload handler uses `/api/cms/media/upload` to trigger the transcoding service, with real-time status polling. HLS manifests store only `videoId`, and the Player component constructs full HLS URLs. The UI provides comprehensive user feedback, and client-side validation checks file size and type. GCS serves as the storage backend, with a Cloud Function triggering the Cloud Run transcoder.

### Visual Mode - 100% Feature Complete
All 6 element types (Text, Image, Video, Button, Divider, Spacer) are fully functional with comprehensive property editors (e.g., content, variant, alignment, colors for text; media library selection, alt text, dimensions for images; autoplay/loop/muted for videos). Card settings include background color/image (via media library) and individual padding controls. Safe rendering with nullish coalescing defaults and data preservation during updates ensure robustness.

### Security & Data Integrity
All mutation endpoints require CSRF token validation. Sensitive routes are protected by `isAdmin` and `isAdminWithCSRF` middleware. Server-side validation is enforced for all user input, and Drizzle ORM's parameterized queries prevent SQL injection. Sensitive data is not exposed to clients, and foreign key constraints ensure referential integrity.

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