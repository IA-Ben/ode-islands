'use client';

import { TextElement } from '@/../../shared/cardTypes';

interface TextElementRendererProps {
  element: TextElement;
}

export function TextElementRenderer({ element }: TextElementRendererProps) {
  const { content, variant, alignment, color, fontSize, fontWeight } = element.properties;
  
  const variantStyles = {
    heading1: 'text-4xl font-bold',
    heading2: 'text-3xl font-bold',
    heading3: 'text-2xl font-semibold',
    paragraph: 'text-base',
    caption: 'text-sm text-gray-600',
  };
  
  const alignmentStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };
  
  const className = `${variantStyles[variant]} ${alignmentStyles[alignment]}`;
  const style = {
    color: color || undefined,
    fontSize: fontSize ? `${fontSize}px` : undefined,
    fontWeight: fontWeight || undefined,
  };
  
  const Tag = variant.startsWith('heading') ? 
    (variant === 'heading1' ? 'h1' : variant === 'heading2' ? 'h2' : 'h3') : 
    (variant === 'caption' ? 'p' : 'p');
  
  return (
    <Tag className={className} style={style}>
      {content || 'Enter text here...'}
    </Tag>
  );
}
