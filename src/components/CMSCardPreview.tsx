'use client';

import React from 'react';
import { CardData } from '@/@typings';

interface CMSCardPreviewProps {
  data: CardData;
  className?: string;
}

/**
 * CMS-specific card preview with high contrast, readable styling
 * This is separate from the immersive card experience to ensure
 * administrative interfaces remain readable and professional
 */
export const CMSCardPreview: React.FC<CMSCardPreviewProps> = ({ 
  data, 
  className = '' 
}) => {
  return (
    <div className={`
      relative bg-white border-2 border-gray-300 rounded-lg overflow-hidden shadow-lg
      ${className}
    `}>
      {/* Background Preview (simplified) */}
      {data.theme?.background && (
        <div 
          className="absolute inset-0 opacity-20"
          style={{ 
            background: data.theme.background.includes('gradient') 
              ? data.theme.background 
              : data.theme.background 
          }}
        />
      )}
      
      {/* Video Preview Indicator */}
      {data.video?.url && (
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">
          📺 Video: {data.video.url}
        </div>
      )}
      
      {/* Image Preview Indicator */}
      {data.image?.url && (
        <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">
          🖼️ Image: {data.image.url}
        </div>
      )}
      
      {/* Content Container */}
      <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
        
        {/* Title */}
        {data.text?.title && (
          <h1 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
            {data.text.title}
          </h1>
        )}
        
        {/* Subtitle */}
        {data.text?.subtitle && (
          <h2 className="text-lg font-semibold text-gray-700 mb-3">
            {data.text.subtitle}
          </h2>
        )}
        
        {/* Description */}
        {data.text?.description && (
          <p className="text-sm text-gray-600 mb-6 max-w-md leading-relaxed">
            {data.text.description}
          </p>
        )}
        
        {/* Buttons Preview */}
        {data.customButtons && data.customButtons.length > 0 && (
          <div className="space-y-2 w-full max-w-xs">
            <div className="text-xs font-medium text-gray-500 mb-2">
              Buttons ({data.customButtons.length}):
            </div>
            {data.customButtons.map((button, index) => (
              <div 
                key={index}
                className="bg-gray-100 border border-gray-300 rounded px-3 py-2 text-sm"
                style={{
                  left: `${button.position?.x || 50}%`,
                  top: `${button.position?.y || 80}%`,
                }}
              >
                <div className="font-medium text-gray-800">
                  {button.label || button.text || `Button ${index + 1}`}
                </div>
                <div className="text-xs text-gray-500">
                  {button.action?.type || 'No action'} • 
                  Position: {button.position?.x || 50}%, {button.position?.y || 80}%
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* AR Indicator */}
        {data.ar?.locations && data.ar.locations.length > 0 && (
          <div className="absolute bottom-2 left-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium">
            🌐 AR: {data.ar.locations.length} location(s)
          </div>
        )}
        
        {/* PlayCanvas Indicator */}
        {data.playcanvas?.projectId && (
          <div className="absolute bottom-2 right-2 bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium">
            🎮 3D Scene
          </div>
        )}
        
        {/* Theme Color Indicators */}
        <div className="absolute top-2 left-2 flex gap-1">
          {data.theme?.title && (
            <div 
              className="w-4 h-4 rounded border border-gray-400" 
              style={{ backgroundColor: data.theme.title }}
              title={`Title: ${data.theme.title}`}
            />
          )}
          {data.theme?.subtitle && (
            <div 
              className="w-4 h-4 rounded border border-gray-400" 
              style={{ backgroundColor: data.theme.subtitle }}
              title={`Subtitle: ${data.theme.subtitle}`}
            />
          )}
          {data.theme?.description && (
            <div 
              className="w-4 h-4 rounded border border-gray-400" 
              style={{ backgroundColor: data.theme.description }}
              title={`Description: ${data.theme.description}`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CMSCardPreview;