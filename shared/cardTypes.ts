export type CardElementType = 'text' | 'image' | 'video' | 'button' | 'divider' | 'spacer';

export interface BaseCardElement {
  id: string;
  type: CardElementType;
  order: number;
}

export interface TextElement extends BaseCardElement {
  type: 'text';
  properties: {
    content: string;
    variant: 'heading1' | 'heading2' | 'heading3' | 'paragraph' | 'caption';
    alignment: 'left' | 'center' | 'right';
    color?: string;
    fontSize?: number;
    fontWeight?: 'normal' | 'bold';
  };
}

export interface ImageElement extends BaseCardElement {
  type: 'image';
  properties: {
    mediaAssetId?: string;
    src?: string;
    alt: string;
    width?: string;
    height?: string;
    objectFit: 'cover' | 'contain' | 'fill';
    borderRadius?: number;
  };
}

export interface VideoElement extends BaseCardElement {
  type: 'video';
  properties: {
    mediaAssetId?: string;
    src?: string;
    poster?: string;
    autoplay: boolean;
    loop: boolean;
    muted: boolean;
    controls: boolean;
  };
}

export interface ButtonElement extends BaseCardElement {
  type: 'button';
  properties: {
    text: string;
    action: 'link' | 'navigate' | 'custom';
    url?: string;
    navigationTarget?: string;
    variant: 'primary' | 'secondary' | 'outline';
    size: 'small' | 'medium' | 'large';
    fullWidth: boolean;
  };
}

export interface DividerElement extends BaseCardElement {
  type: 'divider';
  properties: {
    style: 'solid' | 'dashed' | 'dotted';
    color?: string;
    thickness?: number;
    margin?: number;
  };
}

export interface SpacerElement extends BaseCardElement {
  type: 'spacer';
  properties: {
    height: number;
  };
}

export type CardElement = 
  | TextElement 
  | ImageElement 
  | VideoElement 
  | ButtonElement 
  | DividerElement 
  | SpacerElement;

export interface VisualCardLayout {
  version: string;
  backgroundColor?: string;
  backgroundImage?: string;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  elements: CardElement[];
}

export function createDefaultElement(type: CardElementType, order: number): CardElement {
  const id = `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  switch (type) {
    case 'text':
      return {
        id,
        type: 'text',
        order,
        properties: {
          content: 'Enter text here...',
          variant: 'paragraph',
          alignment: 'left',
        },
      };
    
    case 'image':
      return {
        id,
        type: 'image',
        order,
        properties: {
          alt: 'Image',
          objectFit: 'cover',
        },
      };
    
    case 'video':
      return {
        id,
        type: 'video',
        order,
        properties: {
          autoplay: false,
          loop: false,
          muted: false,
          controls: true,
        },
      };
    
    case 'button':
      return {
        id,
        type: 'button',
        order,
        properties: {
          text: 'Click me',
          action: 'link',
          variant: 'primary',
          size: 'medium',
          fullWidth: false,
        },
      };
    
    case 'divider':
      return {
        id,
        type: 'divider',
        order,
        properties: {
          style: 'solid',
          thickness: 1,
          margin: 16,
        },
      };
    
    case 'spacer':
      return {
        id,
        type: 'spacer',
        order,
        properties: {
          height: 32,
        },
      };
    
    default:
      throw new Error(`Unknown element type: ${type}`);
  }
}

export function createEmptyLayout(): VisualCardLayout {
  return {
    version: '1.0',
    elements: [],
  };
}
