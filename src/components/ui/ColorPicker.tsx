'use client'

import React, { useState } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import type { ColorPickerProps } from '@/@typings'

export function ColorPicker({ 
  value, 
  onChange, 
  label, 
  className = '', 
  showSavedColors = true 
}: ColorPickerProps) {
  const { theme, addSavedColor, removeSavedColor } = useTheme()
  const [showPalette, setShowPalette] = useState(false)

  const handleColorChange = (color: string) => {
    onChange(color)
    setShowPalette(false)
  }

  const handleSaveColor = () => {
    if (value && !theme.colors.savedColors.includes(value)) {
      addSavedColor(value)
    }
  }

  const isColorSaved = value && theme.colors.savedColors.includes(value)

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium mb-2 text-gray-200">
          {label}
        </label>
      )}
      
      <div className="flex items-center gap-2">
        {/* Main color input */}
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-10 bg-gray-700 border border-gray-600 rounded cursor-pointer"
        />
        
        {/* Saved colors toggle */}
        {showSavedColors && (
          <button
            type="button"
            onClick={() => setShowPalette(!showPalette)}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 transition-colors text-sm text-gray-200"
            title="Show saved colors"
          >
            🎨
          </button>
        )}
        
        {/* Save current color button */}
        {showSavedColors && !isColorSaved && value && (
          <button
            type="button"
            onClick={handleSaveColor}
            className="px-3 py-2 bg-gray-700 border border-gray-600 rounded hover:bg-gray-600 transition-colors text-sm text-gray-200"
            title="Save this color"
          >
            📌
          </button>
        )}
      </div>

      {/* Saved colors palette */}
      {showSavedColors && showPalette && (
        <div className="absolute top-full left-0 right-0 mt-2 p-4 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-medium text-gray-200">Saved Colors</h4>
            <button
              type="button"
              onClick={() => setShowPalette(false)}
              className="text-gray-400 hover:text-gray-200 text-lg leading-none"
            >
              ✕
            </button>
          </div>
          
          {theme.colors.savedColors.length > 0 ? (
            <div className="grid grid-cols-5 gap-2">
              {theme.colors.savedColors.map((color, index) => (
                <div key={index} className="relative group">
                  <button
                    type="button"
                    onClick={() => handleColorChange(color)}
                    className="w-10 h-10 rounded border-2 border-gray-600 hover:border-gray-400 transition-colors cursor-pointer"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                  
                  {/* Remove color button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeSavedColor(color)
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    title="Remove color"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No saved colors yet. Use the 📌 button to save colors.</p>
          )}
          
          {/* Quick color presets */}
          <div className="mt-4 pt-4 border-t border-gray-600">
            <h5 className="text-xs font-medium text-gray-300 mb-2">Quick Presets</h5>
            <div className="grid grid-cols-8 gap-1">
              {[
                '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
                '#ffa500', '#800080', '#ffc0cb', '#a52a2a', '#808080', '#90ee90', '#add8e6', '#f0e68c'
              ].map((color, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleColorChange(color)}
                  className="w-6 h-6 rounded border border-gray-600 hover:border-gray-400 transition-colors cursor-pointer"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}