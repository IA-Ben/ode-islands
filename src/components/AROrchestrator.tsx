import React, { useState, useEffect, useCallback } from 'react';
import { CardData } from '../@typings';
import MarkerARView from './MarkerARView';
import LocationARView from './LocationARView';

// AR mode capabilities and state
type ARMode = 'object' | 'marker' | 'location' | 'disabled';

interface ARCapabilities {
  hasCamera: boolean;
  hasGeolocation: boolean;
  supportsWebXR: boolean;
  supportsQuickLook: boolean;
  supportsSceneViewer: boolean;
}

interface AROrchestratorProps {
  ar: NonNullable<CardData['ar']>;
  isOpen: boolean;
  onClose: () => void;
  onVideoStateChange: (playing: boolean) => void;
}

// Production-ready script loading with integrity checks
interface ScriptConfig {
  src: string;
  integrity?: string;
  crossorigin?: string;
}

const loadScript = (config: ScriptConfig | string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const scriptConfig = typeof config === 'string' ? { src: config } : config;
    const existingScript = document.querySelector(`script[src="${scriptConfig.src}"]`);
    
    if (existingScript) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = scriptConfig.src;
    
    // Add integrity and crossorigin for production security
    if (scriptConfig.integrity) {
      script.integrity = scriptConfig.integrity;
      script.crossOrigin = scriptConfig.crossorigin || 'anonymous';
    }
    
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${scriptConfig.src}`));
    document.head.appendChild(script);
  });
};

// AR mode detection logic
const detectARMode = (ar: NonNullable<CardData['ar']>, capabilities: ARCapabilities): ARMode => {
  // Explicit mode override
  if (ar.mode && ar.mode !== 'auto') {
    return ar.mode as ARMode;
  }
  
  // Auto-detect based on content and capabilities
  if (ar.markers && ar.markers.length > 0 && capabilities.hasCamera) {
    return 'marker';
  }
  
  if (ar.locations && ar.locations.length > 0 && capabilities.hasGeolocation && capabilities.hasCamera) {
    return 'location';
  }
  
  if (ar.glbUrl && (capabilities.supportsQuickLook || capabilities.supportsSceneViewer)) {
    return 'object';
  }
  
  return 'disabled';
};

export default function AROrchestrator({ ar, isOpen: _isOpen, onClose, onVideoStateChange }: AROrchestratorProps) {
  // _isOpen is intentionally unused - AR state is managed internally
  void _isOpen; // Mark as used to suppress warnings
  const [capabilities, setCapabilities] = useState<ARCapabilities>({
    hasCamera: false,
    hasGeolocation: false,
    supportsWebXR: false,
    supportsQuickLook: false,
    supportsSceneViewer: false
  });
  const [selectedMode, setSelectedMode] = useState<ARMode>('disabled');
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const [permissionState, setPermissionState] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Detect device capabilities
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detectCapabilities = async () => {
      try {
        // Camera detection
        const hasCamera = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
        
        // Geolocation detection
        const hasGeolocation = !!navigator.geolocation;
        
        // WebXR detection
        const supportsWebXR = !!(navigator.xr && 'xr' in navigator);
        
        // iOS Quick Look detection
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const supportsQuickLook = isIOS;
        
        // Android Scene Viewer detection
        const isAndroid = /Android/.test(navigator.userAgent);
        const chromeVersion = navigator.userAgent.match(/Chrome\/(\d+)/);
        const supportsSceneViewer = !!(isAndroid && chromeVersion && parseInt(chromeVersion[1]) >= 67);
        
        setCapabilities({
          hasCamera,
          hasGeolocation,
          supportsWebXR,
          supportsQuickLook,
          supportsSceneViewer
        });
        
        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to detect AR capabilities:', error);
        setIsInitializing(false);
      }
    };

    detectCapabilities();
  }, []);

  // Determine AR mode based on capabilities and content
  useEffect(() => {
    if (isInitializing) return;
    
    const mode = detectARMode(ar, capabilities);
    setSelectedMode(mode);
  }, [ar, capabilities, isInitializing]);

  // Load required libraries based on selected mode
  useEffect(() => {
    if (selectedMode === 'disabled' || selectedMode === 'object') {
      setLibrariesLoaded(true);
      return;
    }

    const loadLibraries = async () => {
      try {
        setError(null);
        
        if (selectedMode === 'marker') {
          // Load MindAR.js and Three.js for marker tracking with pinned versions
          // TODO: Add real SRI integrity hashes for production security
          await Promise.all([
            loadScript({
              src: 'https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js',
              crossorigin: 'anonymous'
            }),
            loadScript({
              src: 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/js/loaders/GLTFLoader.js',
              crossorigin: 'anonymous'
            }),
            loadScript({
              src: 'https://cdn.jsdelivr.net/npm/three@0.158.0/examples/js/loaders/DRACOLoader.js',
              crossorigin: 'anonymous'
            }),
            loadScript({
              src: 'https://cdn.jsdelivr.net/npm/mindar-image-three@1.7.0/dist/mindar-image-three.prod.js',
              crossorigin: 'anonymous'
            })
          ]);
        }
        
        if (selectedMode === 'location') {
          // Load A-Frame and AR.js for location-based AR with pinned versions
          // TODO: Add real SRI integrity hashes for production security
          await Promise.all([
            loadScript({
              src: 'https://cdn.jsdelivr.net/npm/aframe@1.4.0/dist/aframe-master.min.js',
              crossorigin: 'anonymous'
            }),
            loadScript({
              src: 'https://cdn.jsdelivr.net/npm/ar.js@2.2.2/aframe/build/aframe-ar.min.js',
              crossorigin: 'anonymous'
            })
          ]);
          
          // Allow components to register after library load
          await new Promise<void>((resolve) => {
            // Give A-Frame components time to register
            setTimeout(() => {
              resolve();
            }, 500);
          });
        }
        
        setLibrariesLoaded(true);
      } catch (error) {
        console.error('Failed to load AR libraries:', error);
        setError('Failed to load AR libraries. Please try again.');
        setLibrariesLoaded(false);
      }
    };

    loadLibraries();
  }, [selectedMode]);

  // Request permissions based on AR mode
  const requestPermissions = useCallback(async () => {
    try {
      setError(null);
      
      const permissions: MediaStreamConstraints = {};
      
      if (selectedMode === 'marker' || selectedMode === 'location') {
        // Request camera permission
        if (capabilities.hasCamera) {
          permissions.video = {
            facingMode: 'environment' // Use back camera for AR
          };
        }
      }
      
      if (selectedMode === 'location') {
        // Request geolocation permission
        if (capabilities.hasGeolocation) {
          await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 10000,
              enableHighAccuracy: true,
              maximumAge: 60000
            });
          });
        }
      }
      
      // Request camera if needed
      if (permissions.video) {
        const stream = await navigator.mediaDevices.getUserMedia(permissions);
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop());
      }
      
      setPermissionState('granted');
      onVideoStateChange(false); // Pause video when AR starts
    } catch (error) {
      console.error('Permission denied:', error);
      setPermissionState('denied');
      setError('Camera or location permission is required for this AR experience.');
    }
  }, [selectedMode, capabilities, onVideoStateChange]);

  // Handle AR experience close
  const handleClose = useCallback(() => {
    setPermissionState('pending');
    setError(null);
    onVideoStateChange(true); // Resume video when AR closes
    onClose();
  }, [onClose, onVideoStateChange]);

  // Render permission request UI
  if (permissionState === 'pending' && (selectedMode === 'marker' || selectedMode === 'location')) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <div className="text-center">
            <div className="mb-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                {selectedMode === 'marker' ? (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {selectedMode === 'marker' ? 'Camera Permission Required' : 'Camera & Location Permission Required'}
              </h3>
              <p className="text-gray-600 mb-4">
                {selectedMode === 'marker' 
                  ? 'To detect AR markers and place 3D content, we need access to your camera.'
                  : 'To show location-based AR content, we need access to your camera and current location.'
                }
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={requestPermissions}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Allow Access
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.732-.833-2.502 0L5.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AR Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isInitializing || !librariesLoaded) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg">Preparing AR Experience...</p>
        </div>
      </div>
    );
  }

  // Render appropriate AR view based on selected mode
  if (selectedMode === 'marker' && permissionState === 'granted') {
    return (
      <MarkerARView
        ar={ar}
        onClose={handleClose}
        onError={setError}
      />
    );
  }

  if (selectedMode === 'location' && permissionState === 'granted') {
    return (
      <LocationARView
        ar={ar}
        onClose={handleClose}
        onError={setError}
      />
    );
  }

  if (selectedMode === 'object') {
    // Delegate to the legacy model-viewer implementation
    // This will be handled by the parent ARViewer component
    return null;
  }

  // Default loading/error/permission UI is handled above
  return null;
}