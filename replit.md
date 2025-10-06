# Overview

The Ode Islands is an event companion app built with Next.js, designed to enhance live events across three phases: Before, Event, and After. It features pre-event immersive storytelling with AR cards and videos, real-time AR and interactive features during events, and post-event content for memories and community engagement. The application includes a unified phase navigation system, comprehensive CMS, theme editor, and a video transcoding system for HLS delivery via Google Cloud Storage, aiming to provide a rich, interactive experience throughout the event lifecycle.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses Next.js 15 with the App Router, implementing a three-phase event companion system with client-side rendering. It features a two-tier navigation architecture (TopNav for global navigation and Section Sub-Navigation for phase-specific content). The UI includes an Event Hub with a lane system for exploring event experiences through Info, Interact, and Rewards lanes, supported by a Global HUD for persistent access to wallet, points, and a quick QR scanner. A modular Card Architecture supports 12+ card types with memory earning and point allocation. A Featured Card Selection Engine dynamically selects cards based on priority rules and user context. Styling is managed with Tailwind CSS 4, custom CSS variables, and a theming system.

## Video Streaming Architecture
HLS.js is used for cross-browser HLS video streaming, with a fallback to native HLS for Safari. Videos are served from Google Cloud Storage in HLS format via a configurable CDN URL. A custom Player component handles auto-play, muted playback, and event handling for chapter progression, supporting both background and immersive video modes.

## Data Architecture
PostgreSQL (Neon) is used for production data storage with Drizzle ORM for type-safe operations. The database includes entities for Chapters & Story Cards (with versioning and media references), a Media Library for asset management, and Content Versioning with audit trails. Advanced search capabilities are provided by PostgreSQL full-text search with GIN indexes.

## Unified Cards Architecture
A comprehensive card management system that unifies Story and Event cards into a single database-driven architecture. The system includes a `cards` table with scope (story/event), type, and flexible JSONB content, `card_assignments` for polymorphic parent relationships (chapters, event_lanes, featured_slots), `event_lanes` for organizing Event Hub cards (info, interact, rewards), `card_variants` for layout/theme overrides, and `card_tags` for faceted discovery. The Card Library UI provides full CRUD operations with filters (scope, type, status, lane), search, create/edit modals, and publish workflow controls. All endpoints are secured with RBAC (cards:view, cards:create, cards:edit, cards:delete, cards:publish). Currently manages 12 Event cards across 3 lanes with CMS integration.

## Media Library System
An enterprise-grade media asset management system provides 10 storage methods, a `media_assets` table with `media_usage` tracking, and a RESTful API with 7 endpoints. The CMS UI includes a MediaLibrary component with drag-and-drop upload, advanced filtering, pagination, and bulk operations. It integrates with editors via a MediaSelectorModal and features delete protection for in-use assets and soft delete functionality.

## CMS Enterprise Features
The CMS includes production-ready features for security and workflow:
### Authentication & Authorization
Replit Auth (OpenID Connect) provides secure session management with a 6-Tier RBAC System (Owner, Admin, Producer, Operator, Analyst, Support) offering granular permission checks. The RBAC system supports wildcard permissions (e.g., story:*, events:*) with role-to-permission mappings covering all admin operations.
### Unified Admin Navigation
A top-level navigation system provides access to 10 admin sections: Dashboard, Story Builder, Events, Cards, Rewards, Wallet, Users, Orders, Analytics, and Settings. Role-based visibility filters navigation items based on user permissions. The navigation includes loading states, access control, and mobile responsiveness.
### Audit Logging
Comprehensive tracking of all CMS operations (create, update, delete, publish) is stored in a 14-field `audit_logs` table with performance indexes.
### Publishing Workflow
A 4-State Workflow (Draft → In Review → Published → Archived) supports a review process and scheduled publishing.
### Visual Card Editor
A drag-and-drop visual card builder offers real-time preview and editing of 6 element types (Text, Image, Video, Button, Divider, Spacer). It supports dual-mode editing (Visual/Traditional JSON), element management, property editors, and Media Library integration. The visual editor includes direct video upload capability with real-time progress tracking and transcoding status updates.
### Database-Driven Card Editor
A modal-based `StoryCardModal` allows creating and editing cards directly within the CMS, with real-time database sync.
### Traditional Mode - Complete Feature Restoration
A full-featured form-based editor provides structured editing for text content, call to action, media management, theme & styling, AR configuration, and PlayCanvas integration, with an option for raw JSON editing.
### Video Transcoding & Adaptive Streaming Integration
An automated transcoding pipeline processes uploaded videos into adaptive HLS format with 11 quality profiles and a dual-orientation system (landscape and portrait versions for 16:9 videos). This includes an intelligent Player with device orientation detection.
### Security & Data Integrity
All mutation endpoints require CSRF token validation. Sensitive routes are protected by `isAdmin` and `isAdminWithCSRF` middleware. Server-side validation is enforced for all user input, and Drizzle ORM's parameterized queries prevent SQL injection.

## Memory Wallet & Gamification System
A comprehensive reward and collection system enables users to collect memories through QR codes, location-based triggers, and story interactions with gamification features.
### Database Architecture
Includes `memory_templates` for reusable memory configurations, `user_memory_wallet` for tracking earned memories, `reward_rules` for defining how memories are awarded, and `qr_nonces` to prevent QR code replay attacks.
### CMS Management
Provides a **Memory Templates Manager** for full CRUD operations on memory templates and a **Reward Rules Builder** to configure reward triggers with type-specific UI.
### Referential Integrity
Memory templates use dual-protection deletion logic, checking references in both `user_memory_wallet` and `reward_rules`.

# External Dependencies

## Core Framework Dependencies
- Next.js 15.4.4
- React 19.1.0 & React DOM
- TypeScript 5

## Media and Styling
- HLS.js 1.6.7
- Tailwind CSS 4
- Manrope Font

## Development Tools
- ESLint 9
- PostCSS

## Video Processing System
- FFmpeg (fluent-ffmpeg)
- Node.js
- TypeScript & TSX

## Cloud Services
- Google Cloud Storage

## Content Delivery
- Next.js Image Optimization
- HLS Video Streaming