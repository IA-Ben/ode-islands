# Overview

The Ode Islands is an event companion app built with Next.js, designed to enhance live events across three phases: Before, Event, and After. It features pre-event immersive storytelling with AR cards and videos, real-time AR and interactive features during events, and post-event content for memories and community engagement. The application includes a unified phase navigation system, comprehensive CMS, theme editor, and a video transcoding system for HLS delivery via Google Cloud Storage, aiming to provide a rich, interactive experience throughout the event lifecycle.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses Next.js 15 with the App Router, implementing a three-phase event companion system with client-side rendering. It features a two-tier navigation architecture (TopNav for global navigation and Section Sub-Navigation for phase-specific content). The UI includes an Event Hub with a lane system for exploring event experiences through Info, Interact, and Rewards lanes, supported by a Global HUD for persistent access to wallet, points, and a quick QR scanner. A modular Card Architecture supports 12+ card types with memory earning and point allocation. A Featured Card Selection Engine dynamically selects cards based on priority rules and user context. Styling is managed with Tailwind CSS 4, custom CSS variables, and a theming system.

## Unified Navigation System
A production-ready unified TopNav component serves both App and Admin modes with server-side authentication:
### App Mode Features
- Three-phase navigation tabs (Before/Event/After)
- Wallet button with notification badge
- Tier display (Bronze/Silver/Gold) with points
- QR Scan button for memory collection
- Mode switch to Admin (RBAC-gated)
### Admin Mode Features
- 10 admin section tabs (Dashboard, Story Builder, Events, Cards, Rewards, Wallet, Users, Orders, Analytics, Settings)
- RBAC filtering (tabs visible based on user permissions)
- Desktop horizontal navigation with icons + labels
- Mobile dropdown menu
- Mode switch back to App
### Server-Side Authentication Architecture
All routes (Admin, Event, After, Before, Memory Wallet) implement async server components that fetch user data via `getServerUser()` on the server, passing pre-loaded user objects to client wrappers. This eliminates client-side fetch race conditions and ensures RBAC data is available on first render. The `getServerUser()` function validates JWT cookies, checks server sessions, confirms user records, and enriches with RBAC permissions for trusted data delivery.
### Design System
Unified dark glass aesthetic: `bg-white/85 dark:bg-slate-900/85 backdrop-blur`, rounded pill tabs with fuchsia accent (`bg-fuchsia-600`), focus rings (`focus-visible:ring-2 focus-visible:ring-fuchsia-400`), sticky positioning (`sticky top-0 z-50`).

## Video Streaming Architecture
HLS.js is used for cross-browser HLS video streaming, with a fallback to native HLS for Safari. Videos are served from Google Cloud Storage in HLS format via a configurable CDN URL. A custom Player component handles auto-play, muted playback, and event handling for chapter progression, supporting both background and immersive video modes.

## Data Architecture
PostgreSQL (Neon) is used for production data storage with Drizzle ORM for type-safe operations. The database includes entities for Chapters & Story Cards (with versioning and media references), a Media Library for asset management, and Content Versioning with audit trails. Advanced search capabilities are provided by PostgreSQL full-text search with GIN indexes.

## Unified Cards Architecture
A comprehensive card management system that unifies Story and Event cards into a single database-driven architecture. The system includes a `cards` table with scope (story/event), type, and flexible JSONB content, `card_assignments` for polymorphic parent relationships (chapters, event_lanes, featured_slots), `event_lanes` for organizing Event Hub cards (info, interact, rewards), `card_variants` for layout/theme overrides, and `card_tags` for faceted discovery. The Card Library UI provides full CRUD operations with filters (scope, type, status, lane), search, create/edit modals, and publish workflow controls. All endpoints are secured with RBAC (cards:view, cards:create, cards:edit, cards:delete, cards:publish). Currently manages 12 Event cards across 3 lanes with CMS integration.

## Featured Rules System
A production-ready dynamic content selection engine that determines which cards appear as featured content across different contexts in the application. The system includes database schema (`featured_rules`, `featured_rule_conditions`, `featured_rule_assignments`) for storing rules with priority, pinned status, popularity boosts, and time windows. Rules support multiple contexts (event_hub, story_chapter, before, after, rewards) with extensible condition types (tier, zone, time_window, custom) stored as JSONB. The CMS provides a full management interface at `/admin/featured` with visual condition builder, rule preview/simulation, and CRUD operations. CTA metadata (ctaLabel, ctaAction, ctaTarget) is stored in the database and mapped to frontend handlers, enabling featured cards to trigger lane navigation, open URLs, or execute custom actions without hardcoded logic. The condition evaluation engine properly handles tier requirements (any/Bronze/Silver/Gold), zone targeting (universal 'any' vs. specific zones), time windows, and extensible custom conditions with AND logic. Event Hub integration fetches featured cards based on user tier from fan score API and evaluates all conditions server-side for security and consistency.

## Media Library System
An enterprise-grade media asset management system provides 10 storage methods, a `media_assets` table with `media_usage` tracking, and a RESTful API with 7 endpoints. The CMS UI includes a MediaLibrary component with drag-and-drop upload, advanced filtering, pagination, and bulk operations. It integrates with editors via a MediaSelectorModal and features delete protection for in-use assets and soft delete functionality.

## CMS Enterprise Features
The CMS includes production-ready features for security and workflow:
### Authentication & Authorization
The application implements a simplified PKCE OAuth authentication flow with RS256 JWT session cookies for maximum security and reliability. A 6-Tier RBAC System (Owner, Admin, Producer, Operator, Analyst, Support) provides granular permission checks with wildcard permissions (e.g., story:*, events:*) across all admin operations.

### Authentication Architecture (Replit Auth with Passport)
**Implementation**: Official Replit Auth integration using passport with openid-client v5.7.1

**Key Components**:
- **server/replitAuth.ts**: Passport-based OpenID Connect authentication with Replit
- **server/auth.ts**: Authentication middleware for API route protection
- **src/app/api/auth/user/route.ts**: User data endpoint returning authenticated user info
- **src/hooks/useAuth.ts**: React hook fetching from /api/auth/user endpoint

**Authentication Flow**:
1. User clicks "Sign In" → `/api/login` → redirects to Replit OAuth
2. OAuth flow with OpenID Connect → redirects to Replit authentication page
3. OAuth callback at `/api/callback` processes authentication response
4. User upserted in database, session created in PostgreSQL `sessions` table
5. Session cookie 'connect.sid' set (httpOnly, secure in production, sameSite: lax, 7-day TTL)
6. Redirect to home page or originally requested page

**Security Features**:
- OpenID Connect protocol with discovery metadata
- PostgreSQL session storage with connect-pg-simple
- Token refresh capability for expired access tokens
- Per-domain strategy registration for multi-domain support
- Session serialization/deserialization with passport

**Session Management**: PostgreSQL `sessions` table with automatic TTL and cleanup
**User Claims**: Access to sub, email, first_name, last_name, profile_image_url from ID token
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
### Admin UI Redesign & Design Token System
A comprehensive UI redesign implementing a dark glass aesthetic with fuchsia accents across all admin sections. The redesign features a centralized design token system (`src/lib/admin/designTokens.ts`) providing comprehensive token coverage including surfaces (darkGlass, subtleGlass, overlayGlass), borders (glassBorder, accentBorder, radius), typography (h1-h4, body, labels), components (buttons, inputs, cards, badges), pills navigation, focus rings, interactive states, status colors, gradients (primary, dark, darker), modal overlays, error/warning/success colors, and icon colors. All tokens are consistently applied across both CMS admin pages and frontend components to ensure unified visual language. Completed components: AdminLayout with dark glass top bar, SectionSubNav (sticky pills navigation), card view primitives (CardTile/CardTable/CardViewToggle), CardEditorDrawer (6-tab drawer editor with state management), fully refactored /admin/cards page with grid/table toggle, and completely redesigned Memory Wallet views (both CMS admin at /admin/wallet and frontend MemoryWalletModern component). All components exclusively use design tokens with zero hardcoded Tailwind color/glass/gradient classes, ensuring centralized control and consistency. State management ensures proper form hydration on drawer open/close cycles. Components located in `src/components/admin/` for reusability across admin sections.

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