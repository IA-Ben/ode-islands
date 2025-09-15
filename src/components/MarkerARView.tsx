import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CardData } from '../@typings';

// Proper TypeScript interfaces for THREE.js and MindAR
interface ThreeRenderer {
  setSize(width: number, height: number): void;
  setClearColor(color: number, alpha: number): void;
  render(scene: ThreeScene, camera: ThreeCamera): void;
  dispose(): void;
}

interface ThreeScene {
  add(object: ThreeObject): void;
}

interface ThreeCamera {
  aspect: number;
  updateProjectionMatrix(): void;
}

interface ThreeObject {
  scale: { set(x: number, y: number, z: number): void; multiplyScalar(scalar: number): void };
  position: { set(x: number, y: number, z: number): void };
  rotation: { set(x: number, y: number, z: number): void };
}

interface ThreeGroup extends ThreeObject {
  add(object: ThreeObject): void;
}

interface GLTFResult {
  scene: ThreeObject;
}

interface GLTFLoader {
  load(
    url: string,
    onLoad: (gltf: GLTFResult) => void,
    onProgress?: (progress: ProgressEvent) => void,
    onError?: (error: ErrorEvent) => void
  ): void;
  setDRACOLoader(dracoLoader: DRACOLoader): void;
}

interface DRACOLoader {
  setDecoderPath(path: string): void;
}

interface MindARAnchor {
  group: ThreeGroup;
  onTargetFound?: () => void;
  onTargetLost?: () => void;
}

interface MindAREngine {
  renderer: ThreeRenderer;
  scene: ThreeScene;
  camera: ThreeCamera;
  addAnchor(index: number): MindARAnchor;
  start(): Promise<void>;
  stop(): void;
}

interface MindARImageConstructor {
  new(options: {
    container: HTMLElement;
    imageTargetSrc: string[];
    maxTrack: number;
    warmupTolerance: number;
    missTolerance: number;
    uiLoading: string;
    uiScanning: string;
    uiError: string;
  }): MindAREngine;
}

interface MindARTypes {
  IMAGE: {
    MindARThree: MindARImageConstructor;
  };
}

interface ThreeTypes {
  GLTFLoader: new() => GLTFLoader;
  DRACOLoader: new() => DRACOLoader;
}

declare global {
  interface Window {
    THREE: ThreeTypes;
    MINDAR: MindARTypes;
  }
}

interface MarkerARViewProps {
  ar: NonNullable<CardData['ar']>;
  onClose: () => void;
  onError: (error: string) => void;
}

export default function MarkerARView({ ar, onClose, onError }: MarkerARViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [detectedMarkers, setDetectedMarkers] = useState<Set<string>>(new Set());
  const [engine, setEngine] = useState<MindAREngine | null>(null);
  const [scene, setScene] = useState<ThreeScene | null>(null);
  const [camera, setCamera] = useState<ThreeCamera | null>(null);
  const [renderer, setRenderer] = useState<ThreeRenderer | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (engine) {
      try {
        engine.stop();
      } catch (e) {
        console.warn('Error stopping MindAR engine:', e);
      }
    }
    
    if (renderer) {
      try {
        renderer.dispose();
      } catch (e) {
        console.warn('Error disposing renderer:', e);
      }
    }

    // Note: MindAR manages its own camera stream internally
    // Calling engine.stop() should handle camera cleanup
  }, [engine, renderer]);

  // Initialize MindAR tracking
  useEffect(() => {
    if (!ar.markers || ar.markers.length === 0) {
      onError('No markers defined for tracking');
      return;
    }

    // Enhanced safety checks for required global libraries
    if (typeof window === 'undefined') {
      onError('Window object not available (SSR context)');
      return;
    }

    if (!window.THREE) {
      onError('THREE.js library not loaded. Please ensure THREE.js is included in your page.');
      return;
    }

    if (!window.MINDAR) {
      onError('MindAR library not loaded. Please ensure MindAR is included in your page.');
      return;
    }

    // Validate required THREE.js components
    if (!window.THREE.GLTFLoader) {
      onError('GLTFLoader not available. Please ensure THREE.js GLTFLoader is loaded.');
      return;
    }

    // Validate MindAR components
    if (!window.MINDAR.IMAGE || !window.MINDAR.IMAGE.MindARThree) {
      onError('MindAR IMAGE component not available. Please ensure MindAR Image Tracking is loaded.');
      return;
    }

    const initializeAR = async () => {
      try {
        const container = containerRef.current;
        if (!container) return;

        // Create target sources array for MindAR - prefer .mind files, fallback to raw images
        const targetSources: string[] = [];
        const hasInvalidMarkers: string[] = [];
        
        for (const marker of ar.markers!) {
          if (marker.mindFileUrl) {
            // Use precompiled .mind file (recommended)
            targetSources.push(marker.mindFileUrl);
          } else if (marker.imageUrl) {
            // Use raw image for runtime compilation (less efficient)
            targetSources.push(marker.imageUrl);
            console.warn(`Marker ${marker.id} using raw image. Consider precompiling to .mind file for better performance.`);
          } else {
            hasInvalidMarkers.push(marker.id);
          }
        }
        
        if (hasInvalidMarkers.length > 0) {
          onError(`Invalid markers found: ${hasInvalidMarkers.join(', ')}. Each marker must have either mindFileUrl or imageUrl.`);
          return;
        }

        // Initialize MindAR engine with enhanced error handling
        let mindarThree;
        try {
          mindarThree = new window.MINDAR.IMAGE.MindARThree({
          container,
          imageTargetSrc: targetSources,
          maxTrack: Math.min(ar.markers!.length, 3), // Limit to 3 simultaneous tracking for performance
          warmupTolerance: 5,
          missTolerance: 5,
          uiLoading: 'no',
          uiScanning: 'no',
          uiError: 'no'
        });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
          onError(`Failed to initialize MindAR: ${errorMessage}`);
          return;
        }

        if (!mindarThree) {
          onError('MindAR engine initialization failed');
          return;
        }

        const { renderer: newRenderer, scene: newScene, camera: newCamera } = mindarThree;
        
        setRenderer(newRenderer);
        setScene(newScene);
        setCamera(newCamera);
        setEngine(mindarThree);

        // Configure renderer
        newRenderer.setSize(container.clientWidth, container.clientHeight);
        newRenderer.setClearColor(0x000000, 0); // Transparent background

        // Setup GLTF loader with enhanced safety checks
        let loader;
        try {
          loader = new window.THREE.GLTFLoader();
        } catch (error) {
          onError('Failed to create GLTFLoader');
          return;
        }
        
        // Set up DRACO loader if available (for compressed models)
        if (window.THREE.DRACOLoader) {
          try {
            const dracoLoader = new window.THREE.DRACOLoader();
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
            loader.setDRACOLoader(dracoLoader);
          } catch (error) {
            console.warn('Failed to setup DRACO loader, continuing without DRACO support:', error);
          }
        }
        
        for (let i = 0; i < ar.markers!.length; i++) {
          const marker = ar.markers![i];
          const anchor = mindarThree.addAnchor(i);

          try {
            // Load GLB model
            const gltf = await new Promise<GLTFResult>((resolve, reject) => {
              loader.load(
                marker.model.glbUrl,
                resolve,
                undefined,
                reject
              );
            });

            const model = gltf.scene;
            
            // Apply scale
            if (marker.model.scale) {
              const scale = typeof marker.model.scale === 'string' 
                ? marker.model.scale.split(' ').map(Number)
                : [1, 1, 1];
              model.scale.set(scale[0] || 1, scale[1] || 1, scale[2] || 1);
            }

            // Apply position offset
            if (marker.model.offset) {
              model.position.set(
                marker.model.offset.x || 0,
                marker.model.offset.y || 0,
                marker.model.offset.z || 0
              );
            }

            // Apply rotation
            if (marker.model.rotation) {
              model.rotation.set(
                (marker.model.rotation.x || 0) * Math.PI / 180,
                (marker.model.rotation.y || 0) * Math.PI / 180,
                (marker.model.rotation.z || 0) * Math.PI / 180
              );
            }

            // Apply physical width calibration
            const markerSize = marker.physicalWidthM || 0.1; // Default to 10cm
            const calibrationScale = markerSize / 0.1; // MindAR default reference size
            model.scale.multiplyScalar(calibrationScale);

            anchor.group.add(model);

            // Track marker detection
            anchor.onTargetFound = () => {
              setDetectedMarkers(prev => new Set(prev).add(marker.id));
              setIsTracking(true);
            };

            anchor.onTargetLost = () => {
              setDetectedMarkers(prev => {
                const newSet = new Set(prev);
                newSet.delete(marker.id);
                return newSet;
              });
            };

          } catch (error) {
            console.error(`Failed to load model for marker ${marker.id}:`, error);
            onError(`Failed to load 3D model for marker ${marker.id}. Please check the model URL and format.`);
            return; // Stop initialization if model loading fails
          }
        }

        // Start the AR engine
        await mindarThree.start();
        setIsInitialized(true);

      } catch (error) {
        console.error('Failed to initialize marker AR:', error);
        onError('Failed to initialize AR tracking. Please try again.');
      }
    };

    initializeAR();

    return cleanup;
  }, [ar.markers, onError, cleanup]);

  // Update tracking state based on detected markers
  useEffect(() => {
    setIsTracking(detectedMarkers.size > 0);
  }, [detectedMarkers]);

  // Note: MindAR handles its own render loop internally
  // No need for manual render loop - removing to prevent conflicts

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      if (!container || !renderer || !camera) return;

      const width = container.clientWidth;
      const height = container.clientHeight;

      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderer, camera]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* AR container */}
      <div 
        ref={containerRef} 
        className="w-full h-full relative"
        style={{ background: 'transparent' }}
      />

      {/* Close button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Close AR"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Instructions overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
        <div className="text-center">
          {!isInitialized ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-lg">Initializing AR tracking...</span>
            </div>
          ) : !isTracking ? (
            <>
              <p className="text-lg mb-2">Point your camera at the marker to see AR content</p>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-300">
                <span>📷 Keep marker in view</span>
                <span>💡 Ensure good lighting</span>
                <span>📏 Keep steady distance</span>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg mb-2">AR content is now tracking!</p>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-300">
                <span>✅ {detectedMarkers.size} marker{detectedMarkers.size !== 1 ? 's' : ''} detected</span>
                <span>📱 Move around to explore</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 left-4 text-white text-sm bg-black/50 p-2 rounded">
          <div>Markers: {ar.markers?.length || 0}</div>
          <div>Tracking: {isTracking ? 'Yes' : 'No'}</div>
          <div>Detected: {Array.from(detectedMarkers).join(', ')}</div>
        </div>
      )}
    </div>
  );
}