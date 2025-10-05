# Overview

The Ode Islands is an event companion app built with Next.js, designed to enhance live events across three phases: Before, Event, and After. It features pre-event immersive storytelling with AR cards and videos, real-time AR and interactive features during events, and post-event content for memories and community engagement. The application includes a unified phase navigation system, comprehensive CMS, theme editor, and a video transcoding system for HLS delivery via Google Cloud Storage.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses Next.js 15 with the App Router pattern, implementing a three-phase event companion system with client-side rendered experiences. Key components include a Phase Navigation System for seamless transitions, a modular component structure (Player, AnimateText, Card/ClientCard), and a three-tier routing strategy (`/before/[id]`, `/event`, `/after`) with legacy support and a default root path. State management relies on local React hooks, and styling is managed with Tailwind CSS 4, custom CSS variables, and a theming system.

## Video Streaming Architecture
HLS.js is used for cross-browser HLS video streaming, with a fallback to native HLS for Safari. Videos are served from Google Cloud Storage in HLS format. A configurable CDN URL supports both full URLs and identifier-based video references. A custom Player component handles auto-play, muted playback, and event handling for chapter progression, supporting both background and immersive video modes.

## Data Architecture
The platform uses PostgreSQL (Neon) for production data storage, with Drizzle ORM for type-safe database operations. The database includes:
- **Chapters & Story Cards**: Content entities with versioning, parent-child hierarchy, and media references
- **Media Library**: Centralized asset management with usage tracking, soft delete, and referential integrity
- **Content Versioning**: Full audit trail with diff tracking and rollback capabilities
- **Advanced Search**: PostgreSQL full-text search with GIN indexes for cross-table content discovery

## Media Library System
Enterprise-grade media asset management with:
- **Storage Backend**: 10 storage methods (upload, list, search, get, update, delete, bulk operations, usage tracking)
- **Database Schema**: media_assets table (21 columns: storage_key, checksum, metadata, tags JSONB) and media_usage tracking with foreign key constraints
- **RESTful API**: 7 endpoints with admin authentication and CSRF protection
- **CMS UI**: MediaLibrary component with drag-and-drop upload, grid/list views, advanced filtering (type/tags/uploader/date), pagination, and bulk operations
- **Editor Integration**: MediaSelectorModal for browsing/searching assets, integrated into chapter/card editors with automatic usage tracking
- **Delete Protection**: Prevents deletion of in-use assets with conflict resolution
- **Soft Delete**: Deleted_at timestamps for recovery and audit compliance

## CMS Enterprise Features
Production-ready content management system with enterprise-grade security and workflow controls:

### Authentication & Authorization (Enhancement 6)
- **Replit Auth (OpenID Connect)**: Production authentication with secure session management
- **4-Tier RBAC System**: Hierarchical role-based access control (Super Admin, Content Admin, Content Editor, Content Viewer)
- **Permission Levels**: Granular permission checks (levels 1-10) prevent privilege escalation
- **Role Management**: Admin UI for assigning roles; automatic role seeding on server startup
- **Backward Compatible**: Legacy admin flag support maintained for existing users
- **RBAC Middleware**: Server-side permission checks on all protected routes
- **Session Storage**: PostgreSQL-backed sessions with connect-pg-simple

### Audit Logging (Enhancement 7)
- **Comprehensive Tracking**: All CMS operations logged (create, update, delete, publish, etc.)
- **Audit Schema**: 14-field audit_logs table with 6 performance indexes
- **Before/After Snapshots**: Full change tracking with JSON diff for rollback capability
- **Automatic Categorization**: Entity types mapped to semantic categories
- **User Context**: IP address, user agent, and user ID captured for all actions
- **Non-Blocking Design**: Audit failures never break primary operations (try/catch wrapped)
- **Admin API**: Endpoints for viewing audit trails with comprehensive filtering
- **Entity History**: Track full lifecycle of chapters, cards, and media assets

### Publishing Workflow (Enhancement 8)
- **4-State Workflow**: Draft → In Review → Published → Archived
- **Review Process**: Submit for review, approve with notes, reject back to draft
- **Scheduled Publishing**: Schedule content to auto-publish at future dates
- **Publishing Fields**: publishStatus (default 'draft'), publishedAt, publishedBy, reviewedBy, reviewedAt, reviewNotes, scheduledPublishAt
- **Visibility Control**: Public pages show only 'published' content; CMS shows all states
- **State Transitions**: Proper workflow enforcement with audit logging
- **Dual Entity Support**: Full workflow for both chapters and story cards
- **CSRF Protection**: All state-changing operations protected against CSRF attacks
- **Performance Indexed**: publishStatus indexed for fast filtering queries

### Visual Card Editor (Enhancement 9)
- **Drag-and-Drop Interface**: Visual card builder with real-time preview and intuitive element management
- **6 Element Types**: Text (5 variants: heading1-3, paragraph, caption), Image, Video, Button (3 variants), Divider, Spacer
- **Dual-Mode Editing**: Toggle between Visual mode (drag-and-drop) and Traditional mode (JSON textarea) for flexibility
- **Element Management**: Add, delete, reorder (move up/down) elements with automatic order reindexing
- **Property Editors**: Inline editors for text content, variants, alignment, colors, images, videos, and buttons
- **Media Library Integration**: MediaSelectorModal integrated for selecting images and videos from the media library
- **Card Settings**: Background color, background image, and padding customization
- **JSONB Storage**: visualLayout field in storyCards table for flexible, versioned layout persistence
- **CardRenderer Component**: Dynamic rendering engine that sorts elements by order and applies all styling
- **Backward Compatible**: visualLayout is nullable; existing story cards continue working without modification
- **Type-Safe**: Comprehensive TypeScript types with discriminated union for all element types
- **Deterministic Rendering**: Sequential order values (0, 1, 2...) ensure consistent layout rendering

### Security & Data Integrity
- **CSRF Protection**: All mutation endpoints require CSRF token validation
- **Admin Authentication**: isAdmin and isAdminWithCSRF middleware on sensitive routes
- **Server-Side Validation**: All user input validated before database operations
- **SQL Injection Prevention**: Drizzle ORM parameterized queries throughout
- **Sensitive Data Protection**: No secrets or user credentials exposed to clients
- **Foreign Key Constraints**: Referential integrity enforced at database level

## Mobile Optimization
A custom hook (useViewportHeight) addresses iOS Safari's dynamic viewport behavior, and scroll-based navigation is optimized for mobile touch interactions.

# External Dependencies

## Core Framework Dependencies
- **Next.js 15.4.4**: React framework with App Router.
- **React 19.1.0 & React DOM**: Core React libraries.
- **TypeScript 5**: Type safety.

## Media and Styling
- **HLS.js 1.6.7**: HTTP Live Streaming support.
- **Tailwind CSS 4**: Utility-first CSS framework.
- **Manrope Font**: Google Fonts integration.

## Development Tools
- **ESLint 9**: Code linting.
- **PostCSS**: CSS processing.

## Video Processing System
- **FFmpeg (fluent-ffmpeg)**: Video transcoding to HLS.
- **Node.js**: Runtime for transcoding service.
- **TypeScript & TSX**: Development environment for transcoder.

## Cloud Services
- **Google Cloud Storage**: CDN and storage for processed video content and assets.
- **gsutil**: Command-line tool for uploading content to Google Cloud Storage.

## Content Delivery
- **Remote Image Support**: Next.js image optimization for Google Cloud Storage images.
- **HLS Video Streaming**: Adaptive bitrate streaming.