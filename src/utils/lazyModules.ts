/**
 * Central lazy loading system for heavy libraries
 * Provides singleton loaders with caching and capability detection
 */

// Cache for loaded modules to prevent duplicate imports
const moduleCache = new Map<string, Promise<any>>();

// Capability detection
export interface DeviceCapabilities {
  hasWebGL: boolean;
  hasWebGL2: boolean;
  hasWebXR: boolean;
  hasCamera: boolean;
  hasGeolocation: boolean;
  supportsQuickLook: boolean;
  supportsSceneViewer: boolean;
  isOnline: boolean;
  connectionType: 'slow' | 'fast' | 'unknown';
  respectsDataSaver: boolean;
}

// Detect device capabilities
export const detectCapabilities = (): DeviceCapabilities => {
  if (typeof window === 'undefined') {
    return {
      hasWebGL: false,
      hasWebGL2: false,
      hasWebXR: false,
      hasCamera: false,
      hasGeolocation: false,
      supportsQuickLook: false,
      supportsSceneViewer: false,
      isOnline: false,
      connectionType: 'unknown',
      respectsDataSaver: false,
    };
  }

  // WebGL detection
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  const gl2 = canvas.getContext('webgl2');
  
  // WebXR detection
  const hasWebXR = 'xr' in navigator && navigator.xr && 'isSessionSupported' in navigator.xr;
  
  // Camera/Geolocation detection
  const hasCamera = 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices;
  const hasGeolocation = 'geolocation' in navigator;
  
  // AR Quick Look (iOS) and Scene Viewer (Android) detection
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const supportsQuickLook = isIOS;
  const supportsSceneViewer = isAndroid;
  
  // Connection quality detection
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  let connectionType: 'slow' | 'fast' | 'unknown' = 'unknown';
  
  if (connection) {
    const effectiveType = connection.effectiveType;
    connectionType = effectiveType === 'slow-2g' || effectiveType === '2g' ? 'slow' : 'fast';
  }
  
  const respectsDataSaver = Boolean(connection?.saveData);

  return {
    hasWebGL: !!gl,
    hasWebGL2: !!gl2,
    hasWebXR,
    hasCamera,
    hasGeolocation,
    supportsQuickLook,
    supportsSceneViewer,
    isOnline: navigator.onLine,
    connectionType,
    respectsDataSaver,
  };
};

// Generic module loader with caching
const loadModule = <T>(moduleKey: string, importer: () => Promise<T>): Promise<T> => {
  if (moduleCache.has(moduleKey)) {
    return moduleCache.get(moduleKey) as Promise<T>;
  }
  
  const modulePromise = importer();
  moduleCache.set(moduleKey, modulePromise);
  
  return modulePromise;
};

// PlayCanvas loader
export const loadPlayCanvas = () => {
  return loadModule('playcanvas', async () => {
    const capabilities = detectCapabilities();
    
    if (!capabilities.hasWebGL) {
      throw new Error('WebGL not supported - PlayCanvas requires WebGL');
    }
    
    // Dynamic import PlayCanvas
    const playcanvas = await import('playcanvas');
    
    console.log('PlayCanvas loaded dynamically');
    return playcanvas;
  });
};

// A-Frame and AR.js loader for AR features
export const loadARLibraries = () => {
  return loadModule('ar-libraries', async () => {
    const capabilities = detectCapabilities();
    
    if (!capabilities.hasCamera && !capabilities.supportsQuickLook && !capabilities.supportsSceneViewer) {
      throw new Error('No AR capabilities detected');
    }
    
    // Load A-Frame and AR.js dynamically via script injection
    await Promise.all([
      loadScript('https://aframe.io/releases/1.4.0/aframe.min.js'),
      loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/aframe/build/aframe-ar.min.js'),
      loadScript('https://cdn.jsdelivr.net/gh/AR-js-org/AR.js@3.4.5/three.js/build/ar.min.js')
    ]);
    
    // Wait for global objects to be available
    await waitForGlobal('AFRAME');
    
    console.log('AR libraries loaded dynamically');
    return { AFRAME: window.AFRAME };
  });
};

// HLS.js loader for video streaming
export const loadHLS = () => {
  return loadModule('hls', async () => {
    const hls = await import('hls.js');
    
    console.log('HLS.js loaded dynamically');
    return hls.default;
  });
};

// JSQr loader for QR code scanning
export const loadQRScanner = () => {
  return loadModule('jsqr', async () => {
    const capabilities = detectCapabilities();
    
    if (!capabilities.hasCamera) {
      throw new Error('Camera not available - QR scanning requires camera access');
    }
    
    const jsQR = await import('jsqr');
    
    console.log('JSQr loaded dynamically');
    return jsQR.default;
  });
};

// Recharts loader for analytics
export const loadCharts = () => {
  return loadModule('recharts', async () => {
    const recharts = await import('recharts');
    
    console.log('Recharts loaded dynamically');
    return recharts;
  });
};

// Uppy loader for file uploads
export const loadUppy = () => {
  return loadModule('uppy', async () => {
    const [core, dashboard, awsS3] = await Promise.all([
      import('@uppy/core'),
      import('@uppy/dashboard'),
      import('@uppy/aws-s3')
    ]);
    
    console.log('Uppy loaded dynamically');
    return { Core: core.default, Dashboard: dashboard.default, AwsS3: awsS3.default };
  });
};

// HTML-to-image loader for share features
export const loadHtmlToImage = () => {
  return loadModule('html-to-image', async () => {
    const htmlToImage = await import('html-to-image');
    
    console.log('html-to-image loaded dynamically');
    return htmlToImage;
  });
};

// Script loader utility
const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    
    if (existing) {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = src;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    
    document.head.appendChild(script);
  });
};

// Wait for global variable utility
const waitForGlobal = (globalName: string, timeout = 10000): Promise<any> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      if ((window as any)[globalName]) {
        resolve((window as any)[globalName]);
        return;
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for global: ${globalName}`));
        return;
      }
      
      setTimeout(check, 100);
    };
    
    check();
  });
};

// Intent-based prefetching utilities
export interface PrefetchOptions {
  respectDataSaver?: boolean;
  connectionThreshold?: 'slow' | 'fast';
  idleTimeout?: number;
}

// Prefetch on hover/focus
export const prefetchOnIntent = (
  element: HTMLElement,
  loader: () => Promise<any>,
  options: PrefetchOptions = {}
) => {
  const capabilities = detectCapabilities();
  
  // Respect user preferences
  if (options.respectDataSaver && capabilities.respectsDataSaver) {
    return;
  }
  
  if (options.connectionThreshold === 'fast' && capabilities.connectionType === 'slow') {
    return;
  }
  
  let prefetched = false;
  
  const prefetch = () => {
    if (!prefetched) {
      prefetched = true;
      loader().catch(console.warn);
    }
  };
  
  element.addEventListener('mouseenter', prefetch, { once: true });
  element.addEventListener('focus', prefetch, { once: true });
  
  return () => {
    element.removeEventListener('mouseenter', prefetch);
    element.removeEventListener('focus', prefetch);
  };
};

// Prefetch when element enters viewport
export const prefetchOnIntersection = (
  element: HTMLElement,
  loader: () => Promise<any>,
  options: PrefetchOptions = {}
) => {
  const capabilities = detectCapabilities();
  
  if (options.respectDataSaver && capabilities.respectsDataSaver) {
    return;
  }
  
  if (options.connectionThreshold === 'fast' && capabilities.connectionType === 'slow') {
    return;
  }
  
  let prefetched = false;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !prefetched) {
        prefetched = true;
        loader().catch(console.warn);
        observer.unobserve(element);
      }
    });
  }, { threshold: 0.1 });
  
  observer.observe(element);
  
  return () => observer.unobserve(element);
};

// Prefetch during idle time
export const prefetchOnIdle = (
  loader: () => Promise<any>,
  options: PrefetchOptions = {}
) => {
  const capabilities = detectCapabilities();
  
  if (options.respectDataSaver && capabilities.respectsDataSaver) {
    return;
  }
  
  if (options.connectionThreshold === 'fast' && capabilities.connectionType === 'slow') {
    return;
  }
  
  if ('requestIdleCallback' in window) {
    const id = requestIdleCallback(() => {
      loader().catch(console.warn);
    }, { timeout: options.idleTimeout || 5000 });
    
    return () => cancelIdleCallback(id);
  } else {
    // Fallback for browsers without requestIdleCallback
    const id = setTimeout(() => {
      loader().catch(console.warn);
    }, options.idleTimeout || 5000);
    
    return () => clearTimeout(id);
  }
};