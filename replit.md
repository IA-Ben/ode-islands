# Overview

The Ode Islands is a comprehensive event companion app built as a Next.js web application, designed to accompany live events through three distinct phases:

**Before Phase**: Pre-event content delivery featuring an immersive, chapter-based storytelling experience with AR cards, video content, text overlays, and interactive elements. Users navigate through different chapters using a card-based interface with video backgrounds, animated text, and thematic styling.

**Event Phase**: Live event supplementation providing real-time AR experiences, live polling, synchronized content delivery, and interactive features during the actual event.

**After Phase**: Post-event content including event memories, sharing tools, continued engagement opportunities, and community connection features.

The application features a unified phase navigation system that allows seamless transitions between the three phases, with comprehensive CMS management, theme editor capabilities, and custom button systems. The project includes a separate video transcoding system that converts video files into HLS (HTTP Live Streaming) format for optimized web delivery, with support for uploading processed content to Google Cloud Storage.

# Recent Changes

**December 2024 - Complete CMS Integration for After Experience**
Successfully implemented comprehensive Content Management System capabilities for the entire After experience, enabling content managers to control all aspects of the post-event journey without code changes:

**CMS Infrastructure Completed:**
- **Database Schema**: Added 10+ specialized tables (after_config, after_tabs, hero_recap_config, community_settings, merch_collections, message_templates, feature_flags)
- **API Layer**: Created `/api/cms/after-config/[eventId]` with 30-day server-side caching and ETag support
- **Admin Interface**: Built comprehensive `/cms/after-experience` dashboard with live preview capabilities
- **Security**: Fixed XSS vulnerability in share-image API with proper sanitization and security headers

**Content Manager Controls:**
- **Hero Recap**: Customizable titles, subtitle, share text, metrics visibility, and accent colors
- **Tab Management**: Control tab visibility, display order, titles, and individual theming
- **Community Settings**: Newsletter signup configuration and Discord integration with custom invite URLs
- **Merchandise**: Stripe-integrated product management with collections, pricing, and promotional badges
- **Message Templates**: Configurable video generation parameters with whitelisted customization options
- **Feature Flags**: Gradual rollout controls for new functionality

**Technical Excellence:**
- **Performance**: 30-day caching strategy with automatic invalidation and ETag support
- **Reliability**: Graceful fallbacks to sensible defaults when CMS services are unavailable
- **Authentication**: Unified session.user.id pattern across all CMS endpoints
- **Validation**: Comprehensive form validation and error handling in admin interface

**December 2024 - Comprehensive Design Enhancement Project Completed**
Successfully completed a comprehensive visual transformation of all major interface areas using Lumus.de as design inspiration. All 8 primary components enhanced with clean, professional aesthetics while preserving complete functionality:

1. **Test Fan Score Page** - Enhanced glassmorphic styling and professional component organization
2. **Progress Dashboard** - Clean design with professional navigation and critical bug fixes
3. **After Page** - Professional 6-tab organization with SVG icons and muted themes
4. **CMS Main Page** - Modern admin interface with full functionality and glass morphism
5. **Analytics Dashboard** - Professional data visualization with working animations and chart enhancements
6. **Event Dashboard** - Complete live event interface transformation with real-time functionality
7. **Scheduling Manager** - Professional content scheduling interface with clean forms and workflows
8. **Notification Center** - Clean notification system with professional modal design and interactions

**Key Design Improvements Applied:**
- Professional glassmorphic design with backdrop blur effects throughout
- Consistent color palettes using muted gradients (slate, blue, emerald, amber themes)
- Enhanced typography with bold headings and clear visual hierarchy
- SVG icons replacing decorative emojis across all components
- Improved spacing, alignment, and responsive design patterns
- Clean, minimal layouts inspired by Lumus design principles

**Technical Excellence Maintained:**
- All existing functionality preserved (Fan Score system, Memory Wallet, live events, CMS, analytics)
- TypeScript compatibility maintained across all components
- Real-time features working (WebSockets, live polling, notifications)
- Server compilation successful with comprehensive testing

**September 2024 - Systematic Code Consolidation and Stability Project**
Successfully completed comprehensive duplicate function cleanup and code consolidation to eliminate critical client-side exceptions and achieve a stable, maintainable codebase:

**Architecture Consolidations Completed:**
- **Unified Notification System**: Consolidated 5 scattered notification components (NotificationService, NotificationCenter, NotificationSoundService, useNotifications, WebSocket patterns) into a centralized NotificationProvider with backward compatibility
- **DynamicX Component Unification**: Replaced 6 separate DynamicX files (DynamicCharts, DynamicQRScanner, DynamicPlayCanvasViewer, DynamicUploader, DynamicAROrchestrator, ClientCard) with unified lazy loading system featuring useLazyLoader hook and LazyComponentWrapper
- **API Response Standardization**: Created comprehensive API helper system with unified response formats, security headers, and proper HTTP status codes across high-traffic routes
- **WebSocket Pattern Consolidation**: Unified scattered WebSocket implementations into centralized service with channel-based routing and enhanced resilience

**Technical Infrastructure Created:**
- **Unified Lazy Loading**: Central configuration (lazyLoadingConfig.ts), hook-based API (useLazyLoader.ts), and universal wrapper (LazyComponentWrapper.tsx) with static import mapping for optimal code-splitting
- **Centralized Providers**: NotificationProvider and UnifiedWebSocketContext providing consistent state management and backward compatibility
- **API Helpers**: Standardized response utilities (respondOk/respondError) with security headers and proper error handling patterns
- **Professional Error Handling**: Graceful fallbacks, loading states, and user experience considerations across all consolidated systems

**Stability Achievements:**
- Eliminated critical "Application error: a client-side exception has occurred" exceptions
- Fixed authentication endpoint mismatches and runtime reference errors
- Achieved consistent compilation without syntax errors or dynamic import warnings
- Maintained complete backward compatibility during all consolidations
- Established maintainable, professional architecture patterns throughout the codebase

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses Next.js 15 with the App Router pattern, implementing a three-phase event companion system with client-side rendered experiences for optimal performance with video content. The main architectural components include:

**Phase Navigation System**: A comprehensive navigation component that provides seamless transitions between Before, Event, and After phases. The PhaseNavigation component integrates with the theme system and provides contextual descriptions for each phase.

**Component Structure**: A modular component system with specialized components for video playback (Player), text animations (AnimateText), card displays (Card/ClientCard), and navigation (Footer). The ClientCard component uses dynamic imports to ensure client-side only rendering, preventing hydration issues with video content.

**Routing Strategy**: Three-tier routing system:
- **Before Phase**: Dynamic routing `/before/[id]` for chapter-based storytelling content (chapter-1, chapter-2, etc.)
- **Event Phase**: Static route `/event` for live event supplementation features
- **After Phase**: Static route `/after` for post-event content and community features
- **Legacy Support**: Automatic redirects from old single-segment routes to the Before phase
- Root path redirects to `/before/chapter-1` as the default entry point

**State Management**: Local React state using hooks for managing user interaction state, current card index, and video playback status. The application tracks user progression through cards and chapters without external state management libraries.

**Styling System**: Tailwind CSS 4 with custom CSS variables and animations for text and button transitions. The theming system supports per-card customization including background colors, text colors, overlays, and blend modes.

## Video Streaming Architecture
**HLS Implementation**: Uses HLS.js for cross-browser video streaming support, with fallback to native HLS for Safari. Videos are served from Google Cloud Storage in HLS format with master playlists and segmented files.

**CDN Integration**: Configurable CDN URL through environment variables, defaulting to Google Cloud Storage. The system supports both full URLs and identifier-based video references.

**Player Component**: Custom video player with auto-play, muted playback, and event handling for chapter progression. Supports both background and immersive video modes.

## Data Architecture
**JSON-based Content**: Chapter and card data stored in static JSON files, eliminating the need for a database while maintaining easy content management. The data structure supports rich media cards with text, video, images, and theming options.

**TypeScript Definitions**: Comprehensive type definitions for CardData structure ensuring type safety across components and data handling.

## Mobile Optimization
**Viewport Handling**: Custom hook (useViewportHeight) for handling mobile viewport height changes, particularly addressing iOS Safari's dynamic viewport behavior.

**Touch Interactions**: Scroll-based navigation optimized for mobile devices with smooth scrolling between cards.

# External Dependencies

## Core Framework Dependencies
- **Next.js 15.4.4**: React framework with App Router for server-side rendering and routing
- **React 19.1.0 & React DOM**: Core React libraries for component rendering
- **TypeScript 5**: Type safety and development tooling

## Media and Styling
- **HLS.js 1.6.7**: HTTP Live Streaming support for cross-browser video playback
- **Tailwind CSS 4**: Utility-first CSS framework with PostCSS integration
- **Manrope Font**: Google Fonts integration for typography

## Development Tools
- **ESLint 9**: Code linting with Next.js configuration
- **PostCSS**: CSS processing for Tailwind CSS

## Video Processing System
- **FFmpeg (fluent-ffmpeg)**: Video transcoding to HLS format with configurable quality settings
- **Node.js**: Runtime for the transcoding service
- **TypeScript & TSX**: Development environment for the transcoder

## Cloud Services
- **Google Cloud Storage**: CDN and storage for processed video content and assets
- **gsutil**: Command-line tool for uploading content to Google Cloud Storage buckets

## Content Delivery
- **Remote Image Support**: Next.js image optimization with support for Google Cloud Storage hosted images
- **HLS Video Streaming**: Adaptive bitrate streaming for optimal video delivery across different network conditions

The architecture prioritizes performance and user experience for media-rich content while maintaining simple deployment and content management workflows.