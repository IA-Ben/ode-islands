'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'
import { ColorPicker } from '@/components/ui/ColorPicker'
import type { AppTheme } from '@/@typings'

export default function ThemeEditorPage() {
  const { theme, updateTheme, resetTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<'colors' | 'typography' | 'spacing' | 'visual'>('colors')

  const handleColorUpdate = (path: string, value: string) => {
    const updatedColors = { ...theme.colors }
    
    // Handle direct color property updates
    if (path === 'primary') updatedColors.primary = value
    else if (path === 'primaryLight') updatedColors.primaryLight = value
    else if (path === 'primaryDark') updatedColors.primaryDark = value
    else if (path === 'secondary') updatedColors.secondary = value
    else if (path === 'secondaryLight') updatedColors.secondaryLight = value
    else if (path === 'secondaryDark') updatedColors.secondaryDark = value
    else if (path === 'background') updatedColors.background = value
    else if (path === 'backgroundLight') updatedColors.backgroundLight = value
    else if (path === 'backgroundDark') updatedColors.backgroundDark = value
    else if (path === 'surface') updatedColors.surface = value
    else if (path === 'textPrimary') updatedColors.textPrimary = value
    else if (path === 'textSecondary') updatedColors.textSecondary = value
    else if (path === 'textMuted') updatedColors.textMuted = value
    else if (path === 'textInverse') updatedColors.textInverse = value
    else if (path === 'accent') updatedColors.accent = value
    else if (path === 'accentLight') updatedColors.accentLight = value
    else if (path === 'accentDark') updatedColors.accentDark = value
    else if (path === 'success') updatedColors.success = value
    else if (path === 'warning') updatedColors.warning = value
    else if (path === 'error') updatedColors.error = value
    else if (path === 'info') updatedColors.info = value
    
    updateTheme({
      colors: updatedColors
    })
  }

  const handleTypographyUpdate = (path: string, value: string | number) => {
    const keys = path.split('.')
    const updatedTypography = { ...theme.typography }
    
    if (keys.length === 1) {
      if (keys[0] === 'fontPrimary') updatedTypography.fontPrimary = value as string
      else if (keys[0] === 'fontSecondary') updatedTypography.fontSecondary = value as string
    } else if (keys.length === 2) {
      const category = keys[0]
      const property = keys[1]
      
      if (category === 'fontWeight') {
        updatedTypography.fontWeight = {
          ...updatedTypography.fontWeight,
          [property]: value as number
        }
      } else if (category === 'fontSize') {
        updatedTypography.fontSize = {
          ...updatedTypography.fontSize,
          [property]: value as string
        }
      } else if (category === 'lineHeight') {
        updatedTypography.lineHeight = {
          ...updatedTypography.lineHeight,
          [property]: value as number
        }
      } else if (category === 'letterSpacing') {
        updatedTypography.letterSpacing = {
          ...updatedTypography.letterSpacing,
          [property]: value as string
        }
      }
    }
    
    updateTheme({
      typography: updatedTypography
    })
  }

  const handleSpacingUpdate = (path: string, value: string | number) => {
    const updatedSpacing = { ...theme.spacing }
    
    if (path === 'base') updatedSpacing.base = value as number
    else if (path === 'xs') updatedSpacing.xs = value as string
    else if (path === 'sm') updatedSpacing.sm = value as string
    else if (path === 'md') updatedSpacing.md = value as string
    else if (path === 'lg') updatedSpacing.lg = value as string
    else if (path === 'xl') updatedSpacing.xl = value as string
    else if (path === '2xl') updatedSpacing['2xl'] = value as string
    else if (path === '3xl') updatedSpacing['3xl'] = value as string
    else if (path === '4xl') updatedSpacing['4xl'] = value as string
    else if (path === '5xl') updatedSpacing['5xl'] = value as string
    else if (path === '6xl') updatedSpacing['6xl'] = value as string
    
    updateTheme({
      spacing: updatedSpacing
    })
  }

  const handleVisualUpdate = (path: string, value: string | number) => {
    const keys = path.split('.')
    const updatedVisual = { ...theme.visual }
    
    if (keys.length === 2) {
      const category = keys[0]
      const property = keys[1]
      
      if (category === 'borderRadius') {
        updatedVisual.borderRadius = {
          ...updatedVisual.borderRadius,
          [property]: value as string
        }
      } else if (category === 'shadows') {
        updatedVisual.shadows = {
          ...updatedVisual.shadows,
          [property]: value as string
        }
      } else if (category === 'opacity') {
        updatedVisual.opacity = {
          ...updatedVisual.opacity,
          [property]: value as number
        }
      }
    }
    
    updateTheme({
      visual: updatedVisual
    })
  }

  const tabs = [
    { id: 'colors', label: '🎨 Colors', icon: '🎨' },
    { id: 'typography', label: '📝 Typography', icon: '📝' },
    { id: 'spacing', label: '📐 Spacing', icon: '📐' },
    { id: 'visual', label: '✨ Visual', icon: '✨' }
  ] as const

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Theme Editor</h1>
              <p className="text-gray-400 mt-2">Customize your app's design system and saved colours</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={resetTheme}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Reset Theme
              </button>
              <Link
                href="/admin/cms"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Back to CMS
              </Link>
            </div>
          </div>

          {/* Theme Info */}
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-sm text-gray-300">
              <strong>Theme:</strong> {theme.name} • <strong>Version:</strong> {theme.version} • 
              <strong>Last Updated:</strong> {new Date(theme.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded-lg p-6">
          {/* Colors Tab */}
          {activeTab === 'colors' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold mb-6">Color Configuration</h2>
              
              {/* Primary Colors */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-blue-400">Primary Brand Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ColorPicker
                    label="Primary"
                    value={theme.colors.primary}
                    onChange={(color) => handleColorUpdate('primary', color)}
                  />
                  <ColorPicker
                    label="Primary Light"
                    value={theme.colors.primaryLight}
                    onChange={(color) => handleColorUpdate('primaryLight', color)}
                  />
                  <ColorPicker
                    label="Primary Dark"
                    value={theme.colors.primaryDark}
                    onChange={(color) => handleColorUpdate('primaryDark', color)}
                  />
                </div>
              </div>

              {/* Secondary Colors */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-green-400">Secondary Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ColorPicker
                    label="Secondary"
                    value={theme.colors.secondary}
                    onChange={(color) => handleColorUpdate('secondary', color)}
                  />
                  <ColorPicker
                    label="Secondary Light"
                    value={theme.colors.secondaryLight}
                    onChange={(color) => handleColorUpdate('secondaryLight', color)}
                  />
                  <ColorPicker
                    label="Secondary Dark"
                    value={theme.colors.secondaryDark}
                    onChange={(color) => handleColorUpdate('secondaryDark', color)}
                  />
                </div>
              </div>

              {/* Background Colors */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-purple-400">Background Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ColorPicker
                    label="Background"
                    value={theme.colors.background}
                    onChange={(color) => handleColorUpdate('background', color)}
                  />
                  <ColorPicker
                    label="Background Light"
                    value={theme.colors.backgroundLight}
                    onChange={(color) => handleColorUpdate('backgroundLight', color)}
                  />
                  <ColorPicker
                    label="Background Dark"
                    value={theme.colors.backgroundDark}
                    onChange={(color) => handleColorUpdate('backgroundDark', color)}
                  />
                  <ColorPicker
                    label="Surface"
                    value={theme.colors.surface}
                    onChange={(color) => handleColorUpdate('surface', color)}
                  />
                </div>
              </div>

              {/* Text Colors */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-yellow-400">Text Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ColorPicker
                    label="Text Primary"
                    value={theme.colors.textPrimary}
                    onChange={(color) => handleColorUpdate('textPrimary', color)}
                  />
                  <ColorPicker
                    label="Text Secondary"
                    value={theme.colors.textSecondary}
                    onChange={(color) => handleColorUpdate('textSecondary', color)}
                  />
                  <ColorPicker
                    label="Text Muted"
                    value={theme.colors.textMuted}
                    onChange={(color) => handleColorUpdate('textMuted', color)}
                  />
                  <ColorPicker
                    label="Text Inverse"
                    value={theme.colors.textInverse}
                    onChange={(color) => handleColorUpdate('textInverse', color)}
                  />
                </div>
              </div>

              {/* Status Colors */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-red-400">Status Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ColorPicker
                    label="Success"
                    value={theme.colors.success}
                    onChange={(color) => handleColorUpdate('success', color)}
                  />
                  <ColorPicker
                    label="Warning"
                    value={theme.colors.warning}
                    onChange={(color) => handleColorUpdate('warning', color)}
                  />
                  <ColorPicker
                    label="Error"
                    value={theme.colors.error}
                    onChange={(color) => handleColorUpdate('error', color)}
                  />
                  <ColorPicker
                    label="Info"
                    value={theme.colors.info}
                    onChange={(color) => handleColorUpdate('info', color)}
                  />
                </div>
              </div>

              {/* Saved Colors Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-cyan-400">Saved Colors Palette</h3>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <p className="text-gray-300 mb-3">
                    You have <strong>{theme.colors.savedColors.length}</strong> saved colors. 
                    These will appear in all color pickers throughout the CMS.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {theme.colors.savedColors.map((color, index) => (
                      <div
                        key={index}
                        className="w-8 h-8 rounded border border-gray-500"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Typography Tab */}
          {activeTab === 'typography' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold mb-6">Typography Configuration</h2>
              
              {/* Font Families */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-blue-400">Font Families</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Primary Font</label>
                    <input
                      type="text"
                      value={theme.typography.fontPrimary}
                      onChange={(e) => handleTypographyUpdate('fontPrimary', e.target.value)}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded"
                      placeholder="e.g., Inter, sans-serif"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Secondary Font</label>
                    <input
                      type="text"
                      value={theme.typography.fontSecondary}
                      onChange={(e) => handleTypographyUpdate('fontSecondary', e.target.value)}
                      className="w-full p-3 bg-gray-700 border border-gray-600 rounded"
                      placeholder="e.g., system-ui, sans-serif"
                    />
                  </div>
                </div>
              </div>

              {/* Font Weights */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-green-400">Font Weights</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(theme.typography.fontWeight).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-2 capitalize">{key}</label>
                      <input
                        type="number"
                        min="100"
                        max="900"
                        step="100"
                        value={value}
                        onChange={(e) => handleTypographyUpdate(`fontWeight.${key}`, parseInt(e.target.value))}
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Spacing Tab */}
          {activeTab === 'spacing' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold mb-6">Spacing Configuration</h2>
              
              {/* Base Unit */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-blue-400">Base Unit</h3>
                <div className="max-w-xs">
                  <label className="block text-sm font-medium mb-2">Base Spacing Unit (px)</label>
                  <input
                    type="number"
                    min="1"
                    max="16"
                    value={theme.spacing.base}
                    onChange={(e) => handleSpacingUpdate('base', parseInt(e.target.value))}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded"
                  />
                </div>
              </div>

              {/* Spacing Scale */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-green-400">Spacing Scale</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(theme.spacing).filter(([key]) => key !== 'base').map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-2">{key}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleSpacingUpdate(key, e.target.value)}
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded"
                        placeholder="e.g., 1rem"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Visual Tab */}
          {activeTab === 'visual' && (
            <div className="space-y-8">
              <h2 className="text-2xl font-semibold mb-6">Visual Configuration</h2>
              
              {/* Border Radius */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-blue-400">Border Radius</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(theme.visual.borderRadius).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-2 capitalize">{key}</label>
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleVisualUpdate(`borderRadius.${key}`, e.target.value)}
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded"
                        placeholder="e.g., 0.375rem"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Opacity Levels */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-green-400">Opacity Levels</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {Object.entries(theme.visual.opacity).map(([key, value]) => (
                    <div key={key}>
                      <label className="block text-sm font-medium mb-2 capitalize">{key}</label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={value}
                        onChange={(e) => handleVisualUpdate(`opacity.${key}`, parseFloat(e.target.value))}
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}