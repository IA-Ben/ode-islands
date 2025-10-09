import { VisualCardLayout, CardElement, CardElementType } from './cardTypes';

/**
 * Old card format from ode-islands.json
 */
interface LegacyCardData {
  text?: {
    title?: string;
    subtitle?: string;
    description?: string;
  };
  video?: {
    url: string;
    width?: number;
    height?: number;
    audio?: boolean;
  };
  image?: {
    url: string;
    width?: number;
    height?: number;
  };
  audio?: {
    url: string;
  };
  theme?: {
    mix?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    shadow?: boolean;
    overlay?: string;
  };
  ctaStart?: string;
  ar?: any;
}

/**
 * Convert legacy card format to VisualCardLayout
 */
export function convertLegacyCardToVisualLayout(legacyCard: LegacyCardData): VisualCardLayout {
  const elements: CardElement[] = [];
  let order = 0;

  // Add video element if present
  if (legacyCard.video?.url) {
    const videoId = `element-video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    elements.push({
      id: videoId,
      type: 'video' as CardElementType,
      order: order++,
      content: {
        url: legacyCard.video.url,
      },
      position: { x: 0, y: 0 },
      size: {
        width: legacyCard.video.width || 1920,
        height: legacyCard.video.height || 1080
      },
      style: {
        objectFit: 'cover',
      },
    });
  }

  // Add image element if present
  if (legacyCard.image?.url) {
    const imageId = `element-image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    elements.push({
      id: imageId,
      type: 'image' as CardElementType,
      order: order++,
      content: {
        url: legacyCard.image.url,
        alt: '',
      },
      position: { x: 0, y: 0 },
      size: {
        width: legacyCard.image.width || 1920,
        height: legacyCard.image.height || 1080
      },
      style: {
        objectFit: 'cover',
      },
    });
  }

  // Add title text if present
  if (legacyCard.text?.title) {
    const titleId = `element-title-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    elements.push({
      id: titleId,
      type: 'text' as CardElementType,
      order: order++,
      content: {
        text: legacyCard.text.title,
      },
      position: { x: 50, y: 20 },
      size: { width: 80, height: 10 },
      style: {
        fontSize: '48px',
        fontWeight: 'bold',
        color: legacyCard.theme?.title || '#ffffff',
        textAlign: 'center',
        textShadow: legacyCard.theme?.shadow ? '2px 2px 4px rgba(0,0,0,0.8)' : undefined,
      },
    });
  }

  // Add subtitle text if present
  if (legacyCard.text?.subtitle) {
    const subtitleId = `element-subtitle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    elements.push({
      id: subtitleId,
      type: 'text' as CardElementType,
      order: order++,
      content: {
        text: legacyCard.text.subtitle,
      },
      position: { x: 50, y: 35 },
      size: { width: 80, height: 8 },
      style: {
        fontSize: '32px',
        fontWeight: '600',
        color: legacyCard.theme?.subtitle || '#ffffff',
        textAlign: 'center',
        textShadow: legacyCard.theme?.shadow ? '2px 2px 4px rgba(0,0,0,0.8)' : undefined,
      },
    });
  }

  // Add description text if present
  if (legacyCard.text?.description) {
    const descId = `element-desc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    elements.push({
      id: descId,
      type: 'text' as CardElementType,
      order: order++,
      content: {
        text: legacyCard.text.description,
      },
      position: { x: 50, y: 50 },
      size: { width: 80, height: 30 },
      style: {
        fontSize: '20px',
        fontWeight: 'normal',
        color: legacyCard.theme?.description || '#ffffff',
        textAlign: 'center',
        textShadow: legacyCard.theme?.shadow ? '1px 1px 2px rgba(0,0,0,0.8)' : undefined,
      },
    });
  }

  // Add CTA button if present
  if (legacyCard.ctaStart) {
    const ctaId = `element-cta-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    elements.push({
      id: ctaId,
      type: 'button' as CardElementType,
      order: order++,
      content: {
        text: legacyCard.ctaStart,
        action: 'next',
      },
      position: { x: 50, y: 85 },
      size: { width: 30, height: 8 },
      style: {
        backgroundColor: '#37ffce',
        color: '#000000',
        fontSize: '18px',
        fontWeight: 'bold',
        borderRadius: '8px',
        padding: '12px 24px',
      },
    });
  }

  return {
    version: '1.0',
    backgroundColor: legacyCard.theme?.overlay || 'transparent',
    padding: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20,
    },
    elements,
  };
}

/**
 * Check if card data is in legacy format
 */
export function isLegacyCardFormat(data: any): data is LegacyCardData {
  return data && (
    data.text !== undefined ||
    data.video !== undefined ||
    data.image !== undefined ||
    data.theme !== undefined ||
    data.ctaStart !== undefined
  );
}
