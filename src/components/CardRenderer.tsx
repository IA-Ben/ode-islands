'use client';

import { VisualCardLayout, CardElement } from '@/../../shared/cardTypes';
import {
  TextElementRenderer,
  ImageElementRenderer,
  VideoElementRenderer,
  ButtonElementRenderer,
  DividerElementRenderer,
  SpacerElementRenderer,
} from './card-elements';

interface CardRendererProps {
  layout: VisualCardLayout;
  className?: string;
}

export function CardRenderer({ layout, className = '' }: CardRendererProps) {
  const { backgroundColor, backgroundImage, padding, elements } = layout;
  
  const sortedElements = [...elements].sort((a, b) => a.order - b.order);
  
  const containerStyle = {
    backgroundColor: backgroundColor || '#ffffff',
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
    padding: padding ? 
      `${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px` : 
      '16px',
  };
  
  return (
    <div className={`card-renderer ${className}`} style={containerStyle}>
      {sortedElements.map((element) => (
        <div key={element.id} className="card-element mb-4">
          {renderElement(element)}
        </div>
      ))}
    </div>
  );
}

function renderElement(element: CardElement) {
  switch (element.type) {
    case 'text':
      return <TextElementRenderer element={element} />;
    case 'image':
      return <ImageElementRenderer element={element} />;
    case 'video':
      return <VideoElementRenderer element={element} />;
    case 'button':
      return <ButtonElementRenderer element={element} />;
    case 'divider':
      return <DividerElementRenderer element={element} />;
    case 'spacer':
      return <SpacerElementRenderer element={element} />;
    default:
      return null;
  }
}
