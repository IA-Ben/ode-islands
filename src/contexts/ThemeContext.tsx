'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import type { AppTheme } from '@/@typings'

interface ThemeContextType {
  theme: AppTheme
  updateTheme: (updates: Partial<AppTheme>) => void
  resetTheme: () => void
  addSavedColor: (color: string) => void
  removeSavedColor: (color: string) => void
  applyThemeToCSS: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const DEFAULT_THEME: AppTheme = {
  colors: {
    // Primary brand colors
    primary: '#ffffff',
    primaryLight: '#f8f9fa',
    primaryDark: '#e9ecef',
    
    // Secondary colors
    secondary: '#6c757d',
    secondaryLight: '#adb5bd',
    secondaryDark: '#495057',
    
    // Background colors
    background: '#000000',
    backgroundLight: '#212529',
    backgroundDark: '#0a0a0a',
    surface: '#1a1a1a',
    
    // Text colors
    textPrimary: '#ffffff',
    textSecondary: '#e9ecef',
    textMuted: '#adb5bd',
    textInverse: '#000000',
    
    // Accent colors
    accent: '#007bff',
    accentLight: '#66b3ff',
    accentDark: '#0056b3',
    
    // Status colors
    success: '#28a745',
    warning: '#ffc107',
    error: '#dc3545',
    info: '#17a2b8',
    
    // Saved colors palette (user customizable)
    savedColors: [
      '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
      '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
    ]
  },
  
  typography: {
    // Font families
    fontPrimary: 'var(--font-manrope), sans-serif',
    fontSecondary: 'system-ui, sans-serif',
    
    // Font sizes
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem', 
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '3.75rem',
      '7xl': '4.5rem'
    },
    
    // Font weights
    fontWeight: {
      light: 300,
      normal: 500,
      medium: 500,
      semibold: 800,
      bold: 800,
      extrabold: 900
    },
    
    // Line heights
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2
    },
    
    // Letter spacing
    letterSpacing: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em'
    }
  },
  
  spacing: {
    // Base unit 
    base: 4,
    
    // Spacing scale
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2.5rem',
    '3xl': '3rem',
    '4xl': '4rem',
    '5xl': '5rem',
    '6xl': '6rem'
  },
  
  visual: {
    // Border radius scale
    borderRadius: {
      none: '0',
      sm: '0.125rem',
      md: '0.375rem',
      lg: '0.5rem',
      xl: '1rem',
      full: '9999px'
    },
    
    // Shadow definitions
    shadows: {
      none: 'none',
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)'
    },
    
    // Opacity levels
    opacity: {
      disabled: 0.5,
      hover: 0.8,
      focus: 0.9
    }
  },
  
  // Theme metadata
  name: 'Default Theme',
  version: '1.0.0',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

const THEME_STORAGE_KEY = 'ode-islands-theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(DEFAULT_THEME)

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY)
        if (savedTheme) {
          const parsedTheme = JSON.parse(savedTheme)
          setTheme({ ...DEFAULT_THEME, ...parsedTheme })
        }
      } catch (error) {
        console.warn('Failed to load saved theme:', error)
      }
    }
  }, [])

  // Apply theme to CSS variables whenever theme changes
  useEffect(() => {
    applyThemeToCSS()
  }, [theme])

  const applyThemeToCSS = () => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement
    
    // Apply color variables
    root.style.setProperty('--color-primary', theme.colors.primary)
    root.style.setProperty('--color-primary-light', theme.colors.primaryLight)
    root.style.setProperty('--color-primary-dark', theme.colors.primaryDark)
    
    root.style.setProperty('--color-secondary', theme.colors.secondary)
    root.style.setProperty('--color-secondary-light', theme.colors.secondaryLight)
    root.style.setProperty('--color-secondary-dark', theme.colors.secondaryDark)
    
    root.style.setProperty('--background', theme.colors.background)
    root.style.setProperty('--color-background', theme.colors.background)
    root.style.setProperty('--color-background-light', theme.colors.backgroundLight)
    root.style.setProperty('--color-background-dark', theme.colors.backgroundDark)
    root.style.setProperty('--color-surface', theme.colors.surface)
    
    root.style.setProperty('--foreground', theme.colors.textPrimary)
    root.style.setProperty('--color-foreground', theme.colors.textPrimary)
    root.style.setProperty('--color-text-primary', theme.colors.textPrimary)
    root.style.setProperty('--color-text-secondary', theme.colors.textSecondary)
    root.style.setProperty('--color-text-muted', theme.colors.textMuted)
    root.style.setProperty('--color-text-inverse', theme.colors.textInverse)
    
    root.style.setProperty('--color-accent', theme.colors.accent)
    root.style.setProperty('--color-accent-light', theme.colors.accentLight)
    root.style.setProperty('--color-accent-dark', theme.colors.accentDark)
    
    root.style.setProperty('--color-success', theme.colors.success)
    root.style.setProperty('--color-warning', theme.colors.warning)
    root.style.setProperty('--color-error', theme.colors.error)
    root.style.setProperty('--color-info', theme.colors.info)
    
    // Apply typography variables
    root.style.setProperty('--font-primary', theme.typography.fontPrimary)
    root.style.setProperty('--font-secondary', theme.typography.fontSecondary)
    
    // Apply spacing base unit
    root.style.setProperty('--spacing-base', `${theme.spacing.base}px`)
  }

  const updateTheme = (updates: Partial<AppTheme>) => {
    const newTheme = {
      ...theme,
      ...updates,
      updatedAt: new Date().toISOString()
    }
    setTheme(newTheme)
    
    // Save to localStorage
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(newTheme))
      } catch (error) {
        console.warn('Failed to save theme:', error)
      }
    }
  }

  const resetTheme = () => {
    const newTheme = {
      ...DEFAULT_THEME,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    setTheme(newTheme)
    
    // Clear from localStorage
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(THEME_STORAGE_KEY)
      } catch (error) {
        console.warn('Failed to clear saved theme:', error)
      }
    }
  }

  const addSavedColor = (color: string) => {
    if (!theme.colors.savedColors.includes(color)) {
      updateTheme({
        colors: {
          ...theme.colors,
          savedColors: [...theme.colors.savedColors, color]
        }
      })
    }
  }

  const removeSavedColor = (color: string) => {
    updateTheme({
      colors: {
        ...theme.colors,
        savedColors: theme.colors.savedColors.filter(c => c !== color)
      }
    })
  }

  const value: ThemeContextType = {
    theme,
    updateTheme,
    resetTheme,
    addSavedColor,
    removeSavedColor,
    applyThemeToCSS
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}