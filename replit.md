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
Content, including chapter and card data, is stored in static JSON files, providing simple content management. TypeScript definitions ensure type safety for the CardData structure.

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