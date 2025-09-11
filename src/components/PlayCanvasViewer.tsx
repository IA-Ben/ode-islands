"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { CardData } from '@/@typings';

interface PlayCanvasViewerProps {
  playcanvas: NonNullable<CardData['playcanvas']>;
  active?: boolean;
  className?: string;
  onSceneReady?: () => void;
  onUserInteraction?: (event: any) => void;
  onError?: (error: Error) => void;
}

interface PlayCanvasMessage {
  type: string;
  action?: string;
  data?: any;
  target?: string;
  trigger?: string;
}

// Allowed origins for postMessage validation - computed at runtime to avoid SSR issues
const getAllowedOrigins = () => {
  if (typeof window === 'undefined') return [];
  return [
    'https://playcanv.as',
    'https://launch.playcanvas.com',
    window.location.origin // Allow messages from same origin for self-hosted
  ];
};

// Asset loading function for PlayCanvas engine scenes
const loadSceneAssets = async (app: any, pc: any, assets: any[]) => {
  const loadedAssets = new Map<string, any>();
  
  for (const assetConfig of assets) {
    try {
      switch (assetConfig.type) {
        case 'model':
        case 'glb':
          await loadModel(app, pc, assetConfig, loadedAssets);
          break;
        case 'texture':
          await loadTexture(app, pc, assetConfig, loadedAssets);
          break;
        case 'material':
          await loadMaterial(app, pc, assetConfig, loadedAssets);
          break;
        case 'audio':
          await loadAudio(app, pc, assetConfig, loadedAssets);
          break;
        case 'script':
          await loadScript(app, pc, assetConfig, loadedAssets);
          break;
        default:
          console.warn(`Unknown asset type: ${assetConfig.type}`);
      }
    } catch (error) {
      console.error(`Failed to load asset ${assetConfig.name}:`, error);
    }
  }
  
  return loadedAssets;
};

// Load GLB/model assets
const loadModel = async (app: any, pc: any, assetConfig: any, loadedAssets: Map<string, any>) => {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(assetConfig.name, 'model', {
      url: assetConfig.url
    });
    
    asset.ready(() => {
      const entity = new pc.Entity(assetConfig.name);
      entity.addComponent('model', {
        asset: asset
      });
      
      // Apply transforms if specified
      if (assetConfig.position) {
        entity.setPosition(...assetConfig.position);
      }
      if (assetConfig.rotation) {
        entity.setEulerAngles(...assetConfig.rotation);
      }
      if (assetConfig.scale) {
        entity.setLocalScale(...assetConfig.scale);
      }
      
      // Add to scene
      app.root.addChild(entity);
      loadedAssets.set(assetConfig.name, { asset, entity });
      
      resolve(entity);
    });
    
    asset.on('error', (err: any) => {
      reject(new Error(`Failed to load model ${assetConfig.name}: ${err}`));
    });
    
    app.assets.add(asset);
    app.assets.load(asset);
  });
};

// Load texture assets
const loadTexture = async (app: any, pc: any, assetConfig: any, loadedAssets: Map<string, any>) => {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(assetConfig.name, 'texture', {
      url: assetConfig.url
    });
    
    asset.ready(() => {
      loadedAssets.set(assetConfig.name, asset);
      resolve(asset);
    });
    
    asset.on('error', (err: any) => {
      reject(new Error(`Failed to load texture ${assetConfig.name}: ${err}`));
    });
    
    app.assets.add(asset);
    app.assets.load(asset);
  });
};

// Load material assets
const loadMaterial = async (app: any, pc: any, assetConfig: any, loadedAssets: Map<string, any>) => {
  const material = new pc.StandardMaterial();
  
  if (assetConfig.diffuseColor) {
    material.diffuse.set(...assetConfig.diffuseColor);
  }
  
  if (assetConfig.specularColor) {
    material.specular.set(...assetConfig.specularColor);
  }
  
  if (assetConfig.emissiveColor) {
    material.emissive.set(...assetConfig.emissiveColor);
  }
  
  if (assetConfig.shininess !== undefined) {
    material.shininess = assetConfig.shininess;
  }
  
  if (assetConfig.opacity !== undefined) {
    material.opacity = assetConfig.opacity;
  }
  
  // Load texture maps if specified
  if (assetConfig.diffuseMap && loadedAssets.has(assetConfig.diffuseMap)) {
    material.diffuseMap = loadedAssets.get(assetConfig.diffuseMap).resource;
  }
  
  material.update();
  loadedAssets.set(assetConfig.name, material);
  
  return material;
};

// Load audio assets
const loadAudio = async (app: any, pc: any, assetConfig: any, loadedAssets: Map<string, any>) => {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(assetConfig.name, 'audio', {
      url: assetConfig.url
    });
    
    asset.ready(() => {
      const entity = new pc.Entity(assetConfig.name + '_audio');
      entity.addComponent('sound', {
        assets: [asset.id],
        volume: assetConfig.volume || 1.0,
        loop: assetConfig.loop || false,
        autoPlay: assetConfig.autoPlay || false
      });
      
      if (assetConfig.position) {
        entity.setPosition(...assetConfig.position);
      }
      
      app.root.addChild(entity);
      loadedAssets.set(assetConfig.name, { asset, entity });
      
      resolve(entity);
    });
    
    asset.on('error', (err: any) => {
      reject(new Error(`Failed to load audio ${assetConfig.name}: ${err}`));
    });
    
    app.assets.add(asset);
    app.assets.load(asset);
  });
};

// Load script assets
const loadScript = async (app: any, pc: any, assetConfig: any, loadedAssets: Map<string, any>) => {
  return new Promise((resolve, reject) => {
    const asset = new pc.Asset(assetConfig.name, 'script', {
      url: assetConfig.url
    });
    
    asset.ready(() => {
      loadedAssets.set(assetConfig.name, asset);
      resolve(asset);
    });
    
    asset.on('error', (err: any) => {
      reject(new Error(`Failed to load script ${assetConfig.name}: ${err}`));
    });
    
    app.assets.add(asset);
    app.assets.load(asset);
  });
};

const PlayCanvasViewer: React.FC<PlayCanvasViewerProps> = ({
  playcanvas,
  active = true,
  className = "",
  onSceneReady,
  onUserInteraction,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const engineAppRef = useRef<any>(null);
  const apiRef = useRef<Record<string, Function> | null>(null);
  const cleanupRef = useRef<Array<() => void>>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engineInitialized, setEngineInitialized] = useState(false);
  
  // Instance-scoped API to prevent global pollution
  const apiInstanceRef = useRef<Record<string, Function> | null>(null);

  // Handle messaging from iframe with enhanced security validation
  const handleMessage = useCallback((event: MessageEvent) => {
    // Enhanced security: validate both origin and source
    const allowedOrigins = getAllowedOrigins();
    const isOriginAllowed = allowedOrigins.some(origin => 
      event.origin === origin || 
      (playcanvas.type === 'self-hosted' && event.origin === (typeof window !== 'undefined' ? window.location.origin : ''))
    );
    
    // Validate that the message comes from our iframe
    const isSourceValid = iframeRef.current?.contentWindow === event.source;
    
    if (!isOriginAllowed || !isSourceValid) {
      console.warn('Ignored message from unauthorized origin or source:', event.origin);
      return;
    }

    try {
      const message: PlayCanvasMessage = event.data;
      
      // Handle registered event handlers
      if (playcanvas.messaging?.eventHandlers) {
        playcanvas.messaging.eventHandlers.forEach(handler => {
          if (message.type === handler.event) {
            // Use instance-scoped API instead of global window access
            if (apiInstanceRef.current && typeof apiInstanceRef.current[handler.handler] === 'function') {
              apiInstanceRef.current[handler.handler](message);
            }
            onUserInteraction?.(message);
          }
        });
      }

      // Handle common events
      switch (message.type) {
        case 'playcanvas:ready':
          setLoading(false);
          onSceneReady?.();
          break;
        case 'playcanvas:error':
          setError(message.data?.message || 'PlayCanvas error');
          onError?.(new Error(message.data?.message || 'PlayCanvas error'));
          break;
        case 'playcanvas:interaction':
          onUserInteraction?.(message.data);
          break;
        case 'api:response':
          // Handle API method responses
          if (message.data?.callId && apiRef.current) {
            const callback = apiRef.current[`callback_${message.data.callId}`];
            if (callback) {
              callback(message.data.result, message.data.error);
              delete apiRef.current[`callback_${message.data.callId}`];
            }
          }
          break;
        default:
          // Handle custom message types
          if (message.type.startsWith('custom:')) {
            onUserInteraction?.(message);
          }
      }
    } catch (err) {
      console.error('Error handling PlayCanvas message:', err);
    }
  }, [playcanvas.messaging, playcanvas.type, onSceneReady, onUserInteraction, onError]);

  // Send message to iframe with computed target origin for enhanced security
  const sendMessage = useCallback((message: PlayCanvasMessage) => {
    if (iframeRef.current?.contentWindow && typeof window !== 'undefined') {
      let targetOrigin: string;
      
      if (playcanvas.type === 'self-hosted') {
        targetOrigin = window.location.origin;
      } else if (playcanvas.type === 'iframe') {
        // Compute target origin from iframe src for better security
        try {
          const iframeSrc = iframeRef.current.src;
          const url = new URL(iframeSrc);
          targetOrigin = url.origin;
        } catch {
          targetOrigin = 'https://playcanv.as'; // fallback
        }
      } else {
        targetOrigin = 'https://playcanv.as';
      }
      
      iframeRef.current.contentWindow.postMessage(message, targetOrigin);
    }
  }, [playcanvas.type]);

  // Initialize PlayCanvas Engine (FIXED: moved to top-level useEffect)
  useEffect(() => {
    if (playcanvas.type !== 'engine' || !active || engineInitialized || !playcanvas.sceneConfig) {
      return;
    }

    let app: any = null;
    let canvas: HTMLCanvasElement | null = null;

    const initializeEngine = async () => {
      try {
        if (!containerRef.current) return;

        // Clear any existing content
        containerRef.current.innerHTML = '';
        
        // Dynamic import to avoid SSR issues
        const pc = await import('playcanvas');
        
        canvas = document.createElement('canvas');
        containerRef.current.appendChild(canvas);

        app = new (pc as any).Application(canvas, {
          mouse: new (pc as any).Mouse(canvas),
          touch: new (pc as any).TouchDevice(canvas),
          keyboard: new (pc as any).Keyboard(window),
          graphicsDeviceOptions: {
            alpha: playcanvas.transparency || false
          }
        });

        // Configure canvas
        app.setCanvasFillMode(
          playcanvas.fillMode === 'KEEP_ASPECT' 
            ? (pc as any).FILLMODE_KEEP_ASPECT 
            : (pc as any).FILLMODE_FILL_WINDOW
        );
        app.setCanvasResolution((pc as any).RESOLUTION_AUTO);

        // Setup camera
        if (playcanvas.sceneConfig?.camera) {
          const camera = new (pc as any).Entity('camera');
          camera.addComponent('camera', {
            clearColor: new (pc as any).Color(0.1, 0.1, 0.1),
            fov: playcanvas.sceneConfig.camera.fov || 45
          });
          camera.setPosition(...playcanvas.sceneConfig.camera.position);
          if (playcanvas.sceneConfig.camera.target) {
            camera.lookAt(...playcanvas.sceneConfig.camera.target);
          }
          app.root.addChild(camera);
        }

        // Setup lighting
        if (playcanvas.sceneConfig?.lighting) {
          const lighting = playcanvas.sceneConfig.lighting;
          
          if (lighting.ambientColor) {
            app.scene.ambientLight.set(...lighting.ambientColor);
          }

          if (lighting.directionalLight) {
            const light = new (pc as any).Entity('directionalLight');
            light.addComponent('light', {
              type: 'directional',
              color: new (pc as any).Color(...lighting.directionalLight.color),
              intensity: 1
            });
            if (lighting.directionalLight.direction) {
              light.lookAt(...lighting.directionalLight.direction);
            }
            app.root.addChild(light);
          }
        }

        // Load assets and create entities
        if (playcanvas.sceneConfig?.assets && playcanvas.sceneConfig.assets.length > 0) {
          await loadSceneAssets(app, pc, playcanvas.sceneConfig.assets);
        }

        engineAppRef.current = app;
        app.start();
        
        setEngineInitialized(true);
        setLoading(false);
        onSceneReady?.();

      } catch (err) {
        console.error('Error initializing PlayCanvas engine:', err);
        setError('Failed to initialize PlayCanvas engine');
        onError?.(err as Error);
      }
    };

    initializeEngine();

    // Cleanup function
    return () => {
      if (app) {
        app.destroy();
        engineAppRef.current = null;
      }
      if (canvas && containerRef.current) {
        containerRef.current.removeChild(canvas);
      }
      setEngineInitialized(false);
    };
  }, [playcanvas.type, playcanvas.sceneConfig, playcanvas.fillMode, playcanvas.transparency, active, engineInitialized, onSceneReady, onError]);

  // Expose API methods with proper cleanup and promise support
  useEffect(() => {
    if (playcanvas.messaging?.exposedMethods) {
      const api: Record<string, Function> = {};
      let callIdCounter = 0;
      
      playcanvas.messaging.exposedMethods.forEach(method => {
        api[method] = (...args: any[]) => {
          return new Promise((resolve, reject) => {
            const callId = ++callIdCounter;
            const timeoutId = setTimeout(() => {
              reject(new Error(`Method ${method} timed out`));
              if (apiRef.current) {
                delete apiRef.current[`callback_${callId}`];
              }
            }, 10000); // 10 second timeout
            
            if (!apiRef.current) apiRef.current = {};
            apiRef.current[`callback_${callId}`] = (result: any, error: any) => {
              clearTimeout(timeoutId);
              if (error) {
                reject(new Error(error));
              } else {
                resolve(result);
              }
            };
            
            sendMessage({
              type: 'api:call',
              action: method,
              data: { args, callId }
            });
          });
        };
      });

      // Store API reference for cleanup
      apiRef.current = api;
      apiInstanceRef.current = api;
      
      // No longer expose global API to prevent pollution
      // API is now instance-scoped and accessed via ref
    }

    return () => {
      // Clean up instance API and pending callbacks
      apiRef.current = null;
      apiInstanceRef.current = null;
    };
  }, [playcanvas.messaging, sendMessage]);

  // Setup message listener with SSR guard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Handle interactions with proper cleanup
  useEffect(() => {
    if (!playcanvas.interactions || !active) return;

    cleanupRef.current = [];

    playcanvas.interactions.forEach(interaction => {
      switch (interaction.trigger) {
        case 'timer':
          const delay = interaction.params?.delay || 1000;
          const timer = setTimeout(() => {
            sendMessage({
              type: 'interaction',
              action: interaction.action,
              target: interaction.target,
              data: interaction.params
            });
          }, delay);
          cleanupRef.current.push(() => clearTimeout(timer));
          break;
          
        case 'message':
          // Send message interaction immediately when active
          sendMessage({
            type: 'interaction',
            action: interaction.action,
            target: interaction.target,
            data: interaction.params
          });
          break;
          
        case 'click':
        case 'hover':
          // These will be handled by the PlayCanvas scene itself
          // Just register them for later use
          sendMessage({
            type: 'register:interaction',
            action: interaction.action,
            target: interaction.target,
            trigger: interaction.trigger,
            data: interaction.params
          });
          break;
      }
    });

    return () => {
      cleanupRef.current.forEach(cleanup => cleanup());
      cleanupRef.current = [];
    };
  }, [playcanvas.interactions, active, sendMessage]);

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center w-full h-full bg-gray-900 text-white ${className}`}>
        <div className="text-center">
          <div className="text-red-400 mb-2">⚠ PlayCanvas Error</div>
          <div className="text-sm opacity-70">{error}</div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading && playcanvas.type !== 'engine') {
    return (
      <div className={`flex items-center justify-center w-full h-full bg-gray-900 text-white ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
          <div className="text-sm opacity-70">Loading PlayCanvas Scene...</div>
        </div>
      </div>
    );
  }

  // Render based on integration type
  switch (playcanvas.type) {
    case 'iframe': {
      // Use useEffect for validation to prevent render loops
      const [hasValidationError, setHasValidationError] = useState<string | null>(null);
      
      useEffect(() => {
        if (!playcanvas.projectId) {
          setHasValidationError('Project ID is required for iframe integration');
        } else {
          setHasValidationError(null);
        }
      }, [playcanvas.projectId]);
      
      if (hasValidationError) {
        return (
          <div className={`flex items-center justify-center w-full h-full bg-gray-900 text-white ${className}`}>
            <div className="text-center">
              <div className="text-red-400 mb-2">⚠ Configuration Error</div>
              <div className="text-sm opacity-70">{hasValidationError}</div>
            </div>
          </div>
        );
      }

      const params = new URLSearchParams();
      if (playcanvas.autoPlay === false) params.append('autoplay', 'false');
      if (playcanvas.transparency) params.append('transparent', 'true');
      
      const src = `https://playcanv.as/e/p/${playcanvas.projectId}/${params.toString() ? '?' + params.toString() : ''}`;

      return (
        <iframe
          ref={iframeRef}
          src={src}
          className={`w-full h-full border-none ${className}`}
          style={{
            width: playcanvas.width || '100%',
            height: playcanvas.height || '100%',
            backgroundColor: playcanvas.transparency ? 'transparent' : undefined
          }}
          onLoad={() => {
            setLoading(false);
            onSceneReady?.();
          }}
          onError={() => {
            setError('Failed to load PlayCanvas scene');
            onError?.(new Error('Failed to load PlayCanvas scene'));
          }}
          allow="camera; microphone; display-capture"
          title="PlayCanvas Scene"
        />
      );
    }

    case 'engine':
      return (
        <div 
          ref={containerRef}
          className={`w-full h-full ${className}`}
          style={{
            width: playcanvas.width || '100%',
            height: playcanvas.height || '100%'
          }}
        />
      );

    case 'self-hosted': {
      // Use useEffect for validation to prevent render loops
      const [hasValidationError, setHasValidationError] = useState<string | null>(null);
      
      useEffect(() => {
        if (!playcanvas.buildPath) {
          setHasValidationError('Build path is required for self-hosted integration');
        } else {
          setHasValidationError(null);
        }
      }, [playcanvas.buildPath]);
      
      if (hasValidationError) {
        return (
          <div className={`flex items-center justify-center w-full h-full bg-gray-900 text-white ${className}`}>
            <div className="text-center">
              <div className="text-red-400 mb-2">⚠ Configuration Error</div>
              <div className="text-sm opacity-70">{hasValidationError}</div>
            </div>
          </div>
        );
      }

      return (
        <iframe
          ref={iframeRef}
          src={playcanvas.buildPath}
          className={`w-full h-full border-none ${className}`}
          style={{
            width: playcanvas.width || '100%',
            height: playcanvas.height || '100%',
            backgroundColor: playcanvas.transparency ? 'transparent' : undefined
          }}
          onLoad={() => {
            setLoading(false);
            onSceneReady?.();
          }}
          onError={() => {
            setError('Failed to load self-hosted PlayCanvas build');
            onError?.(new Error('Failed to load self-hosted PlayCanvas build'));
          }}
          allow="camera; microphone; display-capture"
          title="PlayCanvas Scene"
        />
      );
    }

    default: {
      // Use useEffect for validation to prevent render loops
      useEffect(() => {
        setError(`Unknown PlayCanvas integration type: ${playcanvas.type}`);
      }, [playcanvas.type]);
      
      return null;
    }
  }
};

export default PlayCanvasViewer;