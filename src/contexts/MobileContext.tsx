"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useIsMobile, useDataSaver, useIsLandscape } from '@/hooks/useMediaQuery';
import { getConfig } from '@/lib/config';

interface MobileContextValue {
  isMobile: boolean;
  isDataSaverEnabled: boolean;
  isLandscape: boolean;
  navigationCollapsed: boolean;
  setNavigationCollapsed: (collapsed: boolean) => void;
  enableDataSaver: () => void;
  disableDataSaver: () => void;
  toggleDataSaver: () => void;
  getVideoQuality: () => string;
  shouldReduceAnimations: boolean;
}

const MobileContext = createContext<MobileContextValue | undefined>(undefined);

export function useMobile() {
  const context = useContext(MobileContext);
  if (!context) {
    throw new Error('useMobile must be used within a MobileProvider');
  }
  return context;
}

interface MobileProviderProps {
  children: React.ReactNode;
}

export function MobileProvider({ children }: MobileProviderProps) {
  const isMobile = useIsMobile();
  const systemDataSaver = useDataSaver();
  const isLandscape = useIsLandscape();
  const config = getConfig();
  
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const [userDataSaverPreference, setUserDataSaverPreference] = useState<boolean | null>(null);

  // Initialize navigation state based on mobile status
  useEffect(() => {
    if (isMobile) {
      setNavigationCollapsed(true); // Start collapsed on mobile
    } else {
      setNavigationCollapsed(false); // Always expanded on desktop
    }
  }, [isMobile]);

  // Load user data saver preference from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPreference = localStorage.getItem('dataSaverMode');
      if (savedPreference !== null) {
        setUserDataSaverPreference(savedPreference === 'true');
      }
    }
  }, []);

  // Determine if data saver is enabled (system detection OR user preference)
  const isDataSaverEnabled = userDataSaverPreference !== null ? userDataSaverPreference : systemDataSaver;

  const enableDataSaver = () => {
    setUserDataSaverPreference(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dataSaverMode', 'true');
    }
  };

  const disableDataSaver = () => {
    setUserDataSaverPreference(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dataSaverMode', 'false');
    }
  };

  const toggleDataSaver = () => {
    if (isDataSaverEnabled) {
      disableDataSaver();
    } else {
      enableDataSaver();
    }
  };

  const getVideoQuality = () => {
    if (isDataSaverEnabled || isMobile) {
      return '480p'; // Lower quality for data saving or mobile
    }
    return config.media.maxVideoQuality; // Full quality for desktop
  };

  const shouldReduceAnimations = isDataSaverEnabled || (typeof window !== 'undefined' && 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const value: MobileContextValue = {
    isMobile,
    isDataSaverEnabled,
    isLandscape,
    navigationCollapsed,
    setNavigationCollapsed,
    enableDataSaver,
    disableDataSaver,
    toggleDataSaver,
    getVideoQuality,
    shouldReduceAnimations,
  };

  return (
    <MobileContext.Provider value={value}>
      {children}
    </MobileContext.Provider>
  );
}

export default MobileProvider;