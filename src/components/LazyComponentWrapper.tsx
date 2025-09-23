"use client";

import React, { useRef, useEffect } from 'react';
import { useLazyLoader, UseLazyLoaderOptions } from '@/hooks/useLazyLoader';
import { LazyComponentType, getLazyComponentConfig } from '@/utils/lazyLoadingConfig';

/**
 * Props for the LazyComponentWrapper component
 */
export interface LazyComponentWrapperProps {
  // Type of component to lazy load
  type: LazyComponentType;
  // Children to render when component is ready
  children?: React.ReactNode;
  // Props to pass to the lazy component
  componentProps?: Record<string, any>;
  // Custom loading fallback (overrides default)
  fallback?: React.ReactNode;
  // Custom error handler
  onError?: (error: Error) => void;
  // Custom loading handler
  onLoad?: () => void;
  // Custom retry handler (called when retry button is clicked)
  onRetry?: () => void;
  // Wrapper container className
  className?: string;
  // Container element type
  as?: keyof JSX.IntrinsicElements;
  // Lazy loader options
  loaderOptions?: UseLazyLoaderOptions;
  // Whether to show default error UI or handle it externally
  showDefaultErrorUI?: boolean;
  // Whether to show default loading UI or handle it externally
  showDefaultLoadingUI?: boolean;
  // Custom error component
  errorComponent?: React.ComponentType<{
    error: {
      title: string;
      message: string;
      showRetry: boolean;
    };
    onRetry: () => void;
    onClose?: () => void;
  }>;
  // Custom loading component
  loadingComponent?: React.ComponentType<{
    type: LazyComponentType;
    reason: string;
  }>;
}

/**
 * Default loading component with consistent styling
 */
const DefaultLoadingComponent: React.FC<{
  type: LazyComponentType;
  reason: string;
}> = ({ type, reason }) => {
  const config = getLazyComponentConfig(type);
  
  return (
    <div className={`w-full h-full bg-gradient-to-br ${config.fallback.gradient} rounded-lg flex items-center justify-center backdrop-blur-sm ${config.fallback.borderColor ? config.fallback.borderColor : ''}`}>
      <div className="text-center">
        <div className={
          config.fallback.animation === 'spin' ? 'animate-spin' : 
          config.fallback.animation === 'bounce' ? 'animate-bounce' : 'animate-pulse'
        }>
          {config.fallback.icon}
        </div>
        <p className="text-white/70 text-sm">{config.fallback.primaryText}</p>
        {config.fallback.secondaryText && (
          <p className="text-white/50 text-xs mt-1">{config.fallback.secondaryText}</p>
        )}
        {reason && (
          <p className="text-white/40 text-xs mt-2">Status: {reason}</p>
        )}
      </div>
    </div>
  );
};

/**
 * Default error component with consistent styling
 */
const DefaultErrorComponent: React.FC<{
  error: {
    title: string;
    message: string;
    showRetry: boolean;
  };
  onRetry: () => void;
  onClose?: () => void;
}> = ({ error, onRetry, onClose }) => {
  return (
    <div className="w-full h-full bg-gradient-to-br from-red-900/20 to-orange-900/20 rounded-lg flex items-center justify-center backdrop-blur-sm border border-red-500/20">
      <div className="text-center p-6 max-w-sm">
        <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-white/90 font-semibold mb-2">{error.title}</h3>
        <p className="text-white/60 text-sm mb-4">{error.message}</p>
        <div className="flex space-x-2 justify-center">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 rounded-lg transition-colors text-sm"
            >
              Close
            </button>
          )}
          {error.showRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors text-sm"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Universal lazy component wrapper
 * Provides declarative interface for lazy loading with consistent loading/error states
 */
export const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
  type,
  children,
  componentProps = {},
  fallback,
  onError,
  onLoad,
  onRetry,
  className = '',
  as: ContainerElement = 'div',
  loaderOptions = {},
  showDefaultErrorUI = true,
  showDefaultLoadingUI = true,
  errorComponent: CustomErrorComponent,
  loadingComponent: CustomLoadingComponent,
}) => {
  const containerRef = useRef<HTMLElement>(null);
  
  // Use the unified lazy loader hook
  const {
    LazyComponent,
    isLoading,
    error,
    shouldLoad,
    reason,
    retry,
    prefetch,
    attachPrefetchListeners,
  } = useLazyLoader(type, {
    onError,
    onLoad,
    ...loaderOptions,
  });

  // Setup prefetch listeners when container is available
  useEffect(() => {
    if (!containerRef.current || !attachPrefetchListeners) return;

    const cleanup = attachPrefetchListeners(containerRef.current);
    return cleanup;
  }, [attachPrefetchListeners]);

  // Handle retry with custom handler if provided
  const handleRetry = () => {
    onRetry?.();
    retry();
  };

  // Render loading state
  if (isLoading && showDefaultLoadingUI) {
    const LoadingComponent = CustomLoadingComponent || DefaultLoadingComponent;
    
    return (
      <ContainerElement 
        ref={containerRef as any} 
        className={`w-full h-full ${className}`}
      >
        {fallback || <LoadingComponent type={type} reason={reason} />}
      </ContainerElement>
    );
  }

  // Render error state
  if (error && showDefaultErrorUI) {
    const ErrorComponent = CustomErrorComponent || DefaultErrorComponent;
    
    return (
      <ContainerElement 
        ref={containerRef as any} 
        className={`w-full h-full ${className}`}
      >
        <ErrorComponent 
          error={error} 
          onRetry={handleRetry}
          onClose={onRetry}
        />
      </ContainerElement>
    );
  }

  // Render component when ready
  if (shouldLoad && LazyComponent) {
    return (
      <ContainerElement 
        ref={containerRef as any} 
        className={className}
      >
        <LazyComponent {...componentProps}>
          {children}
        </LazyComponent>
      </ContainerElement>
    );
  }

  // Fallback for edge cases - should not normally happen
  return (
    <ContainerElement 
      ref={containerRef as any} 
      className={`w-full h-full ${className}`}
    >
      {showDefaultLoadingUI && (
        fallback || <DefaultLoadingComponent type={type} reason={reason} />
      )}
    </ContainerElement>
  );
};

/**
 * Specialized wrapper components for common use cases
 */

// Charts wrapper with intersection-based prefetching
export const LazyChartsWrapper: React.FC<Omit<LazyComponentWrapperProps, 'type'>> = (props) => (
  <LazyComponentWrapper 
    type="charts" 
    loaderOptions={{ prefetchStrategy: 'intersection' }}
    {...props} 
  />
);

// QR Scanner wrapper with intent-based prefetching
export const LazyQRScannerWrapper: React.FC<Omit<LazyComponentWrapperProps, 'type'>> = (props) => (
  <LazyComponentWrapper 
    type="qr-scanner" 
    loaderOptions={{ prefetchStrategy: 'intent' }}
    {...props} 
  />
);

// PlayCanvas wrapper with intersection and intent prefetching
export const LazyPlayCanvasWrapper: React.FC<Omit<LazyComponentWrapperProps, 'type'>> = (props) => (
  <LazyComponentWrapper 
    type="playcanvas" 
    loaderOptions={{ prefetchStrategy: 'intersection' }}
    {...props} 
  />
);

// Uploader wrapper with intent-based prefetching
export const LazyUploaderWrapper: React.FC<Omit<LazyComponentWrapperProps, 'type'>> = (props) => (
  <LazyComponentWrapper 
    type="uploader" 
    loaderOptions={{ prefetchStrategy: 'intent' }}
    {...props} 
  />
);

// AR Orchestrator wrapper with immediate prefetching
export const LazyARWrapper: React.FC<Omit<LazyComponentWrapperProps, 'type'>> = (props) => (
  <LazyComponentWrapper 
    type="ar-orchestrator" 
    loaderOptions={{ prefetchStrategy: 'immediate' }}
    {...props} 
  />
);

// Player wrapper with intersection-based prefetching
export const LazyPlayerWrapper: React.FC<Omit<LazyComponentWrapperProps, 'type'>> = (props) => (
  <LazyComponentWrapper 
    type="player" 
    loaderOptions={{ prefetchStrategy: 'intersection' }}
    {...props} 
  />
);

// Client Card wrapper (no prefetching needed)
export const LazyClientCardWrapper: React.FC<Omit<LazyComponentWrapperProps, 'type'>> = (props) => (
  <LazyComponentWrapper 
    type="client-card" 
    loaderOptions={{ prefetchStrategy: 'none', disablePrefetch: true }}
    {...props} 
  />
);

/**
 * Higher-order component version for class components or advanced use cases
 */
export const withLazyLoader = <P extends object>(
  Component: React.ComponentType<P>,
  type: LazyComponentType,
  options: UseLazyLoaderOptions = {}
) => {
  const WrappedComponent = React.forwardRef<any, P & LazyComponentWrapperProps>((props, ref) => (
    <LazyComponentWrapper 
      type={type} 
      loaderOptions={options}
      {...props}
    >
      <Component {...props as P} ref={ref} />
    </LazyComponentWrapper>
  ));
  
  WrappedComponent.displayName = `withLazyLoader(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};