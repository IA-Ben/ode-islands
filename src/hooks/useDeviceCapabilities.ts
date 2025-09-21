"use client";

import { useState, useEffect } from 'react';
import { DeviceCapabilities, detectCapabilities } from '@/utils/lazyModules';

/**
 * Hook for detecting device capabilities and feature support
 * Used to determine whether to load heavy libraries
 */
export const useDeviceCapabilities = () => {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    const detected = detectCapabilities();
    setCapabilities(detected);
    setIsLoading(false);

    // Listen for online/offline changes
    const handleOnline = () => {
      setCapabilities(prev => prev ? { ...prev, isOnline: true } : detected);
    };

    const handleOffline = () => {
      setCapabilities(prev => prev ? { ...prev, isOnline: false } : detected);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Helper methods for common capability checks
  const canUse3D = capabilities?.hasWebGL || false;
  const canUseAdvanced3D = capabilities?.hasWebGL2 || false;
  const canUseAR = capabilities?.hasCamera && (capabilities?.hasWebXR || capabilities?.supportsQuickLook || capabilities?.supportsSceneViewer) || false;
  const canUseCamera = capabilities?.hasCamera || false;
  const canUseLocation = capabilities?.hasGeolocation || false;
  const shouldRespectDataSaver = capabilities?.respectsDataSaver || false;
  const hasSlowConnection = capabilities?.connectionType === 'slow';

  return {
    capabilities,
    isLoading,
    // Convenience flags
    canUse3D,
    canUseAdvanced3D,
    canUseAR,
    canUseCamera,
    canUseLocation,
    shouldRespectDataSaver,
    hasSlowConnection,
  };
};

/**
 * Hook for checking if a specific feature should be loaded
 */
export const useShouldLoadFeature = (featureType: 'playcanvas' | 'ar' | 'hls' | 'charts' | 'qr' | 'uppy' | 'share') => {
  const { capabilities, isLoading } = useDeviceCapabilities();

  if (isLoading || !capabilities) {
    return { shouldLoad: false, reason: 'Detecting capabilities...' };
  }

  switch (featureType) {
    case 'playcanvas':
      if (!capabilities.hasWebGL) {
        return { shouldLoad: false, reason: 'WebGL not supported' };
      }
      if (capabilities.respectsDataSaver) {
        return { shouldLoad: false, reason: 'Data saver mode enabled' };
      }
      return { shouldLoad: true, reason: 'WebGL supported' };

    case 'ar':
      if (!capabilities.hasCamera) {
        return { shouldLoad: false, reason: 'Camera not available' };
      }
      if (!capabilities.hasWebXR && !capabilities.supportsQuickLook && !capabilities.supportsSceneViewer) {
        return { shouldLoad: false, reason: 'No AR support detected' };
      }
      return { shouldLoad: true, reason: 'AR capabilities detected' };

    case 'hls':
      // HLS can always be loaded as it's used for video streaming
      return { shouldLoad: true, reason: 'Video streaming supported' };

    case 'charts':
      if (capabilities.respectsDataSaver && capabilities.connectionType === 'slow') {
        return { shouldLoad: false, reason: 'Slow connection with data saver' };
      }
      return { shouldLoad: true, reason: 'Charts supported' };

    case 'qr':
      if (!capabilities.hasCamera) {
        return { shouldLoad: false, reason: 'Camera not available' };
      }
      return { shouldLoad: true, reason: 'Camera available for QR scanning' };

    case 'uppy':
      // File uploads can always be loaded
      return { shouldLoad: true, reason: 'File uploads supported' };

    case 'share':
      // Share features can always be loaded
      return { shouldLoad: true, reason: 'Share features supported' };

    default:
      return { shouldLoad: false, reason: 'Unknown feature type' };
  }
};