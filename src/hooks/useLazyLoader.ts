"use client";

import React from 'react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useDeviceCapabilities, useShouldLoadFeature } from './useDeviceCapabilities';
import { prefetchOnIntent, prefetchOnIntersection } from '@/utils/lazyModules';
import { 
  LazyComponentType, 
  getLazyComponentConfig, 
  createPrefetchOptions, 
  createErrorState,
  COMPONENT_IMPORTERS
} from '@/utils/lazyLoadingConfig';

/**
 * Return type for the useLazyLoader hook
 */
export interface UseLazyLoaderResult {
  // Dynamically loaded React component
  LazyComponent: React.ComponentType<any> | null;
  // Loading state
  isLoading: boolean;
  // Error state with details
  error: {
    title: string;
    message: string;
    showRetry: boolean;
  } | null;
  // Whether the component should be loaded based on capabilities
  shouldLoad: boolean;
  // Reason why component should/shouldn't load
  reason: string;
  // Function to retry loading if failed
  retry: () => void;
  // Function to trigger prefetch manually
  prefetch: () => Promise<void>;
}

/**
 * Options for configuring the lazy loader behavior
 */
export interface UseLazyLoaderOptions {
  // Override prefetch strategy
  prefetchStrategy?: 'intent' | 'intersection' | 'immediate' | 'none';
  // Custom prefetch options
  prefetchOptions?: {
    respectDataSaver?: boolean;
    connectionThreshold?: 'slow' | 'fast';
  };
  // Custom error handler
  onError?: (error: Error) => void;
  // Custom loading handler
  onLoad?: () => void;
  // Disable automatic prefetching
  disablePrefetch?: boolean;
}

/**
 * Unified lazy loading hook for all dynamic components
 * Provides consistent loading, error handling, and prefetching
 */
export const useLazyLoader = (
  type: LazyComponentType,
  options: UseLazyLoaderOptions = {}
): UseLazyLoaderResult => {
  // Get configuration for this component type
  const config = useMemo(() => getLazyComponentConfig(type), [type]);
  
  // Device capabilities and feature loading logic
  const deviceCapabilities = useDeviceCapabilities();
  const featureCheck = useShouldLoadFeature(config.featureType);
  
  // Component loading state
  const [lazyComponent, setLazyComponent] = useState<React.ComponentType<any> | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [isLoadingComponent, setIsLoadingComponent] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs for tracking component state
  const modulePromiseRef = useRef<Promise<any> | null>(null);
  const isMountedRef = useRef(true);
  
  // Ensure cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Determine overall loading state
  const isLoading = deviceCapabilities.isLoading || isLoadingComponent;
  const shouldLoad = featureCheck.shouldLoad && !deviceCapabilities.isLoading;
  const reason = featureCheck.reason;

  // Create dynamic component using Next.js dynamic import
  const createDynamicComponent = useCallback(() => {
    if (lazyComponent) return lazyComponent;

    // Create loading fallback component
    const LoadingFallback = () => {
      const animationClass = config.fallback.animation === 'spin' ? 'animate-spin' : 
                             config.fallback.animation === 'bounce' ? 'animate-bounce' : 'animate-pulse';
      
      return React.createElement('div', {
        className: `w-full h-full bg-gradient-to-br ${config.fallback.gradient} rounded-lg flex items-center justify-center backdrop-blur-sm ${config.fallback.borderColor ? config.fallback.borderColor : ''}`
      }, 
        React.createElement('div', { className: 'text-center' }, [
          React.createElement('div', { key: 'icon', className: animationClass }, config.fallback.icon),
          React.createElement('p', { key: 'primary', className: 'text-white/70 text-sm' }, config.fallback.primaryText),
          config.fallback.secondaryText ? React.createElement('p', { key: 'secondary', className: 'text-white/50 text-xs mt-1' }, config.fallback.secondaryText) : null
        ].filter(Boolean))
      );
    };

    // Create the dynamic component using static importers
    const DynamicComponent = dynamic(
      COMPONENT_IMPORTERS[type],
      {
        ssr: config.ssr,
        loading: LoadingFallback,
      }
    );

    return DynamicComponent;
  }, [type, config, lazyComponent]);

  // Prefetch function
  const prefetch = useCallback(async (): Promise<void> => {
    if (!shouldLoad || modulePromiseRef.current) return;

    try {
      setLoadError(null);
      
      // Use the configured loader function
      const modulePromise = config.loader();
      modulePromiseRef.current = modulePromise;
      
      await modulePromise;
      
      if (isMountedRef.current) {
        options.onLoad?.();
      }
    } catch (error) {
      if (isMountedRef.current) {
        const errorInstance = error instanceof Error ? error : new Error(String(error));
        setLoadError(errorInstance);
        options.onError?.(errorInstance);
      }
    }
  }, [shouldLoad, config.loader, options]);

  // Retry function
  const retry = useCallback(() => {
    setLoadError(null);
    setRetryCount(prev => prev + 1);
    modulePromiseRef.current = null;
    prefetch();
  }, [prefetch]);

  // Setup prefetching based on strategy
  const setupPrefetching = useCallback((element: HTMLElement) => {
    if (options.disablePrefetch || !shouldLoad) return;

    const strategy = options.prefetchStrategy || config.prefetchOptions.prefetchStrategy;
    const prefetchOpts = createPrefetchOptions(type, {
      respectDataSaver: options.prefetchOptions?.respectDataSaver ?? 
                       (deviceCapabilities.shouldRespectDataSaver || config.prefetchOptions.respectDataSaver),
      connectionThreshold: options.prefetchOptions?.connectionThreshold ?? 
                          (deviceCapabilities.hasSlowConnection ? 'slow' : config.prefetchOptions.connectionThreshold),
    });

    let cleanup: (() => void) | undefined;

    switch (strategy) {
      case 'intent':
        cleanup = prefetchOnIntent(element, prefetch, prefetchOpts);
        break;
      case 'intersection':
        cleanup = prefetchOnIntersection(element, prefetch, prefetchOpts);
        break;
      case 'immediate':
        prefetch();
        break;
      case 'none':
      default:
        break;
    }

    return cleanup;
  }, [
    options.disablePrefetch, 
    options.prefetchStrategy, 
    options.prefetchOptions,
    shouldLoad, 
    config.prefetchOptions, 
    type, 
    deviceCapabilities.shouldRespectDataSaver,
    deviceCapabilities.hasSlowConnection,
    prefetch
  ]);

  // Expose prefetch setup function for components to use
  const attachPrefetchListeners = useCallback((element: HTMLElement): (() => void) | undefined => {
    return setupPrefetching(element);
  }, [setupPrefetching]);

  // Create error state if needed
  const error = useMemo(() => {
    if (!shouldLoad) {
      return createErrorState(type, reason);
    }
    
    if (loadError) {
      return {
        title: `${config.errorConfig.title} - Error`,
        message: loadError.message || config.errorConfig.fallbackMessage,
        showRetry: config.errorConfig.showRetry,
      };
    }
    
    return null;
  }, [shouldLoad, loadError, type, reason, config.errorConfig]);

  // Get the lazy component
  const component = useMemo(() => {
    if (!shouldLoad || error) return null;
    return createDynamicComponent();
  }, [shouldLoad, error, createDynamicComponent]);

  // Expose prefetch setup function as a property of the hook result
  const result: UseLazyLoaderResult & { attachPrefetchListeners: typeof attachPrefetchListeners } = {
    LazyComponent: component,
    isLoading,
    error,
    shouldLoad,
    reason,
    retry,
    prefetch,
    attachPrefetchListeners,
  };

  return result;
};

/**
 * Helper hook for component-specific lazy loading with built-in container ref
 * Automatically handles prefetch listener setup
 */
export const useLazyLoaderWithRef = <T extends HTMLElement = HTMLDivElement>(
  type: LazyComponentType,
  options: UseLazyLoaderOptions = {}
) => {
  const lazyLoader = useLazyLoader(type, options);
  const containerRef = useRef<T>(null);

  // Setup prefetch listeners when ref is available
  useEffect(() => {
    if (!containerRef.current || !lazyLoader.attachPrefetchListeners) return;

    const cleanup = lazyLoader.attachPrefetchListeners(containerRef.current as HTMLElement);
    return cleanup;
  }, [lazyLoader.attachPrefetchListeners]);

  return {
    ...lazyLoader,
    containerRef,
  };
};

/**
 * Specialized hooks for common use cases
 */

// Charts hook with intersection-based prefetching
export const useLazyCharts = (options?: UseLazyLoaderOptions) => 
  useLazyLoaderWithRef('charts', { 
    prefetchStrategy: 'intersection', 
    ...options 
  });

// QR Scanner hook with intent-based prefetching
export const useLazyQRScanner = (options?: UseLazyLoaderOptions) => 
  useLazyLoaderWithRef('qr-scanner', { 
    prefetchStrategy: 'intent', 
    ...options 
  });

// PlayCanvas hook with intersection and intent prefetching
export const useLazyPlayCanvas = (options?: UseLazyLoaderOptions) => 
  useLazyLoaderWithRef('playcanvas', { 
    prefetchStrategy: 'intersection', 
    ...options 
  });

// Uploader hook with intent-based prefetching
export const useLazyUploader = (options?: UseLazyLoaderOptions) => 
  useLazyLoaderWithRef('uploader', { 
    prefetchStrategy: 'intent', 
    ...options 
  });

// AR Orchestrator hook with immediate prefetching when opened
export const useLazyAROrchestrator = (options?: UseLazyLoaderOptions) => 
  useLazyLoaderWithRef('ar-orchestrator', { 
    prefetchStrategy: 'immediate', 
    ...options 
  });

// Player hook with intersection-based prefetching
export const useLazyPlayer = (options?: UseLazyLoaderOptions) => 
  useLazyLoaderWithRef('player', { 
    prefetchStrategy: 'intersection', 
    ...options 
  });

// Client Card hook (no prefetching needed)
export const useLazyClientCard = (options?: UseLazyLoaderOptions) => 
  useLazyLoaderWithRef('client-card', { 
    prefetchStrategy: 'none', 
    disablePrefetch: true,
    ...options 
  });