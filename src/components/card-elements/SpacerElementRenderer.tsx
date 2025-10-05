'use client';

import { SpacerElement } from '@/../../shared/cardTypes';

interface SpacerElementRendererProps {
  element: SpacerElement;
}

export function SpacerElementRenderer({ element }: SpacerElementRendererProps) {
  const { height } = element.properties;
  
  return <div style={{ height: `${height}px` }} />;
}
