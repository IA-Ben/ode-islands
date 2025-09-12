export type CardData = {
  text?: {
    title?: string
    subtitle?: string
    description?: string
  }
  cta?: {
    title: string
    url: string
  }
  ctaStart?: string
  image?: {
    url: string
    width: number
    height: number
  }
  video?: {
    type?: 'background' | 'immersive'
    url: string
    width: number
    height: number
    audio?: boolean
    audioMuted?: boolean
  }
  playcanvas?: {
    type: 'iframe' | 'engine' | 'self-hosted'
    projectId?: string        // For iframe type
    buildPath?: string        // For self-hosted type
    width?: number
    height?: number
    fillMode?: 'FILL_WINDOW' | 'KEEP_ASPECT'
    transparency?: boolean
    autoPlay?: boolean
    
    // Scene configuration for engine type
    sceneConfig?: {
      assets?: Array<{
        name: string
        type: 'model' | 'texture' | 'audio' | 'script'
        url: string
      }>
      camera?: {
        position: [number, number, number]
        target: [number, number, number]
        fov?: number
      }
      lighting?: {
        ambientColor: [number, number, number]
        directionalLight?: {
          color: [number, number, number]
          direction: [number, number, number]
        }
      }
    }
    
    // Interactive features
    interactions?: Array<{
      trigger: 'click' | 'hover' | 'timer' | 'message'
      target: string
      action: string
      params?: Record<string, unknown>
    }>
    
    // Communication with parent page
    messaging?: {
      enableApi?: boolean
      exposedMethods?: string[]
      eventHandlers?: Array<{
        event: string
        handler: string
      }>
    }
  }
  ar?: {
    // Object placement AR (existing - iOS Quick Look / Android Scene Viewer)
    glbUrl?: string        // 3D model for Android Scene Viewer
    usdzUrl?: string       // 3D model for iOS Quick Look
    title?: string         // AR experience title
    poster?: string        // Preview image before AR
    scale?: string         // Initial scale (e.g., "0.5 0.5 0.5")
    placement?: 'floor' | 'wall'  // AR placement mode
    cameraControls?: boolean      // Enable camera controls
    autoRotate?: boolean         // Auto-rotate when not in AR
    
    // AR mode selection
    mode?: 'auto' | 'object' | 'marker' | 'location'
    
    // Marker-based AR configuration
    markers?: Array<{
      id: string
      // MindAR target file - use EITHER mindFileUrl (precompiled) OR imageUrl (runtime compilation)
      mindFileUrl?: string   // Precompiled .mind target file (recommended for production)
      imageUrl?: string      // Raw marker image for runtime compilation (dev/testing only)
      previewImageUrl?: string // Optional preview image for UI
      physicalWidthM: number // Physical width in meters for scale calibration
      model: {
        glbUrl: string
        scale?: string
        offset?: { x: number; y: number; z: number } // Position offset from marker center
        rotation?: { x: number; y: number; z: number } // Rotation in degrees
      }
    }>
    
    // Location-based AR configuration
    locations?: Array<{
      id: string
      lat: number
      lng: number
      altitude?: number
      radiusM: number        // Detection radius in meters
      headingOffset?: number // Compass heading offset in degrees
      model: {
        glbUrl: string
        scale?: string
        rotation?: { x: number; y: number; z: number }
      }
      title?: string
      description?: string
    }>
    
    // WebAR performance settings
    performanceProfile?: 'low' | 'high'
    maxFPS?: number
    enableLighting?: boolean
    enableOcclusion?: boolean
  }
  customButtons?: Array<{
    id: string                    // Unique identifier
    text: string                  // Button text
    position: {
      x: number                   // X position (percentage or pixels)
      y: number                   // Y position (percentage or pixels)
      unit: 'percent' | 'px'      // Position unit
    }
    timing: {
      visibleFrom: number         // Show after X seconds
      animationDelay?: number     // Optional animation delay after visible
    }
    animation?: {
      type: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'bounce' | 'scale'
      duration?: number           // Animation duration in seconds
      easing?: string             // CSS easing function
    }
    link: {
      type: 'iframe' | 'external' | 'chapter' | 'subchapter'
      url?: string                // For iframe/external
      target?: string             // For chapter/subchapter (e.g., "chapter-1", "chapter-2-sub-1")
      iframeConfig?: {            // For iframe type
        width?: number
        height?: number
        allowFullscreen?: boolean
      }
    }
    styling?: {
      backgroundColor?: string
      textColor?: string
      borderColor?: string
      borderRadius?: string
      fontSize?: string
      padding?: string
      opacity?: number
    }
  }>
  theme?: {
    mix?: CSSProperties['mixBlendMode']
    shadow?: boolean
    background?: string
    overlay?: string
    invert?: boolean
    title?: string
    subtitle?: string
    description?: string
    cta?: string
    ctaStart?: string
  }
}
