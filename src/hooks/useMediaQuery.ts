"use client";

import { useState, useEffect } from 'react';

/**
 * Hook to detect screen size and media queries
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Use the newer addEventListener if available, fallback to addListener
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } else {
      // Fallback for older browsers
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [query]);

  return matches;
}

/**
 * Common media query hooks
 */
export const useIsMobile = () => useMediaQuery('(max-width: 768px)');
export const useIsTablet = () => useMediaQuery('(max-width: 1024px)');
export const useIsDesktop = () => useMediaQuery('(min-width: 1025px)');
export const useIsTouchDevice = () => useMediaQuery('(pointer: coarse)');
export const useIsLandscape = () => useMediaQuery('(orientation: landscape)');

/**
 * Hook to detect data-saver preference
 */
export function useDataSaver(): boolean {
  const [dataSaverEnabled, setDataSaverEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for Data Saver API
    if ('connection' in navigator && 'saveData' in (navigator as any).connection) {
      setDataSaverEnabled((navigator as any).connection.saveData);
    }

    // Also check for reduced motion preference as a proxy for data saving
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setDataSaverEnabled(true);
    }

    // Check localStorage for user preference
    const userPreference = localStorage.getItem('dataSaverMode');
    if (userPreference === 'true') {
      setDataSaverEnabled(true);
    }
  }, []);

  return dataSaverEnabled;
}

export default useMediaQuery;