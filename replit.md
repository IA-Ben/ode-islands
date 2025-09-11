# Overview

The Ode Islands is a mixed reality storytelling experience built as a Next.js web application. The project presents an immersive, chapter-based narrative with video content, text overlays, and interactive elements. The application features a card-based interface where users can navigate through different chapters of the story, each containing multiple cards with video backgrounds, animated text, and thematic styling.

The project includes a separate video transcoding system that converts video files into HLS (HTTP Live Streaming) format for optimized web delivery, with support for uploading processed content to Google Cloud Storage.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The application uses Next.js 15 with the App Router pattern, implementing a client-side rendered experience for optimal performance with video content. The main architectural components include:

**Component Structure**: A modular component system with specialized components for video playback (Player), text animations (AnimateText), card displays (Card/ClientCard), and navigation (Footer). The ClientCard component uses dynamic imports to ensure client-side only rendering, preventing hydration issues with video content.

**Routing Strategy**: Dynamic routing with `[id]` parameter for chapter navigation, with automatic redirection from the root to chapter-1. The routing system supports URL-based chapter access while maintaining state management for card progression within chapters.

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