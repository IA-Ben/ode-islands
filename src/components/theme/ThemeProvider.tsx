'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  applyTheme: (vars: Record<string, string>) => void;
  currentTheme: Record<string, string> | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export interface ThemeProviderProps {
  children: React.ReactNode;
  initial?: Record<string, string>;
}

export function ThemeProvider({ children, initial }: ThemeProviderProps) {
  const [currentTheme, setCurrentTheme] = useState<Record<string, string> | null>(initial || null);

  const applyTheme = (vars: Record<string, string>) => {
    // Apply CSS variables to document root
    const root = document.documentElement;
    
    // Clear existing theme variables
    const existingVars = [
      '--bg', '--fg', '--surface', '--muted', '--border', 
      '--accent', '--accent-foreground', '--success', '--warn', '--error'
    ];
    
    existingVars.forEach(varName => {
      if (vars[varName]) {
        root.style.setProperty(varName, vars[varName]);
      }
    });
    
    setCurrentTheme(vars);
  };

  // Apply initial theme on mount
  useEffect(() => {
    if (initial) {
      applyTheme(initial);
    }
  }, [initial]);

  // SSR style injection to prevent FOUC
  useEffect(() => {
    if (typeof window !== 'undefined' && initial) {
      // Inject styles immediately to prevent flash
      const styleId = 'theme-ssr-styles';
      let styleElement = document.getElementById(styleId) as HTMLStyleElement;
      
      if (!styleElement) {
        styleElement = document.createElement('style');
        styleElement.id = styleId;
        document.head.appendChild(styleElement);
      }
      
      // Build CSS with initial theme values
      const cssVars = Object.entries(initial)
        .map(([key, value]) => `  ${key}: ${value};`)
        .join('\n');
      
      styleElement.textContent = `:root {\n${cssVars}\n}`;
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ applyTheme, currentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Server-side style injection for SSR
export function getThemeSSRStyles(theme: Record<string, string>) {
  const cssVars = Object.entries(theme)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join('\n');
  
  return `:root {\n${cssVars}\n}`;
}