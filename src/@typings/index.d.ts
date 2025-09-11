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
