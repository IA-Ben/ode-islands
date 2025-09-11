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
      params?: any
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
