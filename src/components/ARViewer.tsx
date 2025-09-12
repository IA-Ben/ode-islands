import React, { useEffect, useRef, useState, useCallback, forwardRef } from 'react';
import { CardData } from '../@typings';

// Type-safe ModelViewer wrapper component
type ModelViewerProps = React.HTMLAttributes<HTMLElement> & {
  src?: string;
  'ios-src'?: string;
  poster?: string;
  alt?: string;
  ar?: boolean | '';
  'ar-modes'?: string;
  'ar-scale'?: 'auto' | 'fixed';
  'ar-placement'?: 'floor' | 'wall';
  scale?: string;
  'camera-controls'?: boolean | '';
  'auto-rotate'?: boolean | '';
  'auto-rotate-delay'?: string;
  'shadow-intensity'?: string;
  'shadow-softness'?: string;
  exposure?: string;
  loading?: 'auto' | 'lazy' | 'eager';
  reveal?: 'auto' | 'interaction' | 'manual';
  onLoad?: () => void;
  onError?: () => void;
};

const ModelViewer = forwardRef<HTMLElement, ModelViewerProps>(function ModelViewer({ onLoad, onError, ...rest }, ref) {
  const innerRef = useRef<HTMLElement | null>(null);
  
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (onLoad) el.addEventListener('load', onLoad as EventListener);
    if (onError) el.addEventListener('error', onError as EventListener);
    return () => {
      if (onLoad) el.removeEventListener('load', onLoad as EventListener);
      if (onError) el.removeEventListener('error', onError as EventListener);
    };
  }, [onLoad, onError]);

  const setRef = useCallback((node: HTMLElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref && 'current' in ref) (ref as React.MutableRefObject<HTMLElement | null>).current = node;
  }, [ref]);

  return React.createElement('model-viewer', { ...rest, ref: setRef });
});

interface ARViewerProps {
  ar: NonNullable<CardData['ar']>;
  isOpen: boolean;
  onClose: () => void;
}


const ARViewer: React.FC<ARViewerProps> = ({ ar, isOpen, onClose }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isARSupported, setIsARSupported] = useState<boolean | null>(null);
  const modelViewerRef = useRef<HTMLElement>(null);

  // Handle model loading events
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(false);
  }, []);

  // Check AR support
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check for iOS Quick Look support
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      // Check for Android Scene Viewer support (Android Chrome 67+)
      const isAndroid = /Android/.test(navigator.userAgent);
      const chromeVersion = navigator.userAgent.match(/Chrome\/(\d+)/);
      const hasSceneViewer = isAndroid && chromeVersion && parseInt(chromeVersion[1]) >= 67;
      
      setIsARSupported(isIOS || hasSceneViewer);
    }
  }, []);

  // Load model-viewer script dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if model-viewer is already loaded
    if (window.customElements && window.customElements.get('model-viewer')) {
      return;
    }

    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js';
    script.onload = () => {
      console.log('Model Viewer loaded successfully');
    };
    script.onerror = () => {
      console.error('Failed to load Model Viewer');
      setHasError(true);
    };
    
    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount as it might be used by other components
    };
  }, []);


  // Validate and sanitize input values to prevent XSS
  const sanitizedAr = {
    glbUrl: ar.glbUrl?.trim().replace(/[<>"']/g, '') || '',
    usdzUrl: ar.usdzUrl?.trim().replace(/[<>"']/g, '') || '',
    poster: ar.poster?.trim().replace(/[<>"']/g, '') || '',
    title: ar.title?.replace(/[<>"']/g, '') || 'AR Model',
    scale: ar.scale?.replace(/[^0-9.,\s-]/g, '') || '',
    placement: ar.placement === 'wall' ? 'wall' : 'floor',
    cameraControls: ar.cameraControls !== false,
    autoRotate: ar.autoRotate !== false
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
      <div className="relative w-full h-full max-w-4xl max-h-screen p-4">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
          <div className="flex items-center justify-between text-white">
            <h2 className="text-lg font-semibold">
              {ar.title || 'View in AR'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Close AR viewer"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* AR Not Supported - Show overlay initially */}
        {isARSupported === false && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-center p-8 bg-black/60 backdrop-blur-sm z-20">
            <div>
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">AR Not Available</h3>
              <p className="text-gray-300 mb-4">
                AR viewing requires iOS 12+ (Safari) or Android Chrome 67+<br/>
                <span className="text-sm text-gray-400">You can still view and interact with the 3D model</span>
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={() => setIsARSupported(null)} // Allow 3D viewing
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  View 3D Model
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {!isLoaded && !hasError && isARSupported !== false && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Loading 3D model...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-center p-8">
            <div>
              <div className="mb-4">
                <svg className="w-16 h-16 mx-auto text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Failed to Load</h3>
              <p className="text-gray-300 mb-4">
                Unable to load the 3D model. Please try again.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Model Viewer */}
        <ModelViewer
          ref={modelViewerRef}
          src={sanitizedAr.glbUrl}
          ios-src={sanitizedAr.usdzUrl || undefined}
          poster={sanitizedAr.poster || undefined}
          alt={sanitizedAr.title}
          ar={isARSupported !== false ? '' : undefined}
          ar-modes={isARSupported !== false ? 'scene-viewer quick-look' : undefined}
          ar-scale="fixed"
          ar-placement={sanitizedAr.placement as 'floor' | 'wall'}
          scale={sanitizedAr.scale || undefined}
          camera-controls={sanitizedAr.cameraControls ? '' : undefined}
          auto-rotate={sanitizedAr.autoRotate ? '' : undefined}
          auto-rotate-delay="3000"
          shadow-intensity="1"
          shadow-softness="0.75"
          exposure="1"
          loading="eager"
          reveal="auto"
          onLoad={handleLoad}
          onError={handleError}
          className="w-full h-full bg-transparent"
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
            display: isARSupported === false ? 'none' : 'block'
          }}
        />

        {/* Instructions */}
        {isLoaded && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
            <div className="text-white text-center">
              {isARSupported ? (
                <>
                  <p className="text-sm mb-2">
                    Tap the AR button to place this object in your space
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-300">
                    <span>📱 Move your device to explore</span>
                    <span>✋ Pinch to resize</span>
                    <span>🔄 Drag to rotate</span>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm mb-2">
                    Explore the 3D model
                  </p>
                  <div className="flex items-center justify-center space-x-4 text-xs text-gray-300">
                    <span>🖱️ Drag to rotate</span>
                    <span>🔍 Scroll to zoom</span>
                    <span>⌨️ Use controls to explore</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ARViewer;