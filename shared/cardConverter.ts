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
  const timestamp = Date.now();

  // Add video element if present
  if (legacyCard.video?.url) {
    elements.push({
      id: `element-${timestamp}-video-${order}`,
      type: 'video',
      order: order++,
      properties: {
        src: legacyCard.video.url,
        autoplay: true,
        loop: true,
        muted: !legacyCard.video.audio,
        controls: false,
      },
    });
  }

  // Add image element if present
  if (legacyCard.image?.url) {
    elements.push({
      id: `element-${timestamp}-image-${order}`,
      type: 'image',
      order: order++,
      properties: {
        src: legacyCard.image.url,
        alt: '',
        objectFit: 'cover',
      },
    });
  }

  // Add title text if present
  if (legacyCard.text?.title) {
    elements.push({
      id: `element-${timestamp}-title-${order}`,
      type: 'text',
      order: order++,
      properties: {
        content: legacyCard.text.title,
        variant: 'heading1',
        alignment: 'center',
        color: legacyCard.theme?.title || '#ffffff',
        fontWeight: 'bold',
      },
    });
  }

  // Add subtitle text if present
  if (legacyCard.text?.subtitle) {
    elements.push({
      id: `element-${timestamp}-subtitle-${order}`,
      type: 'text',
      order: order++,
      properties: {
        content: legacyCard.text.subtitle,
        variant: 'heading2',
        alignment: 'center',
        color: legacyCard.theme?.subtitle || '#ffffff',
        fontWeight: 'bold',
      },
    });
  }

  // Add description text if present
  if (legacyCard.text?.description) {
    elements.push({
      id: `element-${timestamp}-desc-${order}`,
      type: 'text',
      order: order++,
      properties: {
        content: legacyCard.text.description,
        variant: 'paragraph',
        alignment: 'center',
        color: legacyCard.theme?.description || '#ffffff',
        fontWeight: 'normal',
      },
    });
  }

  // Add CTA button if present
  if (legacyCard.ctaStart) {
    elements.push({
      id: `element-${timestamp}-cta-${order}`,
      type: 'button',
      order: order++,
      properties: {
        label: legacyCard.ctaStart,
        variant: 'primary',
        size: 'medium',
        action: 'next',
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
