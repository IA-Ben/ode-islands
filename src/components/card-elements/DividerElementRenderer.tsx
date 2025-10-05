'use client';

import { DividerElement } from '@/../../shared/cardTypes';

interface DividerElementRendererProps {
  element: DividerElement;
}

export function DividerElementRenderer({ element }: DividerElementRendererProps) {
  const { style, color, thickness, margin } = element.properties;
  
  return (
    <hr
      style={{
        borderStyle: style,
        borderColor: color || '#e5e7eb',
        borderWidth: `${thickness || 1}px 0 0 0`,
        margin: `${margin || 16}px 0`,
      }}
    />
  );
}
