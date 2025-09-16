'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

interface ThemeConfig {
  brand: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts: {
    primary: string;
    secondary: string;
  };
  colors: {
    background: string;
    foreground: string;
    text: string;
    muted: string;
  };
}

const defaultTheme: ThemeConfig = {
  brand: {
    primary: '#1e293b',
    secondary: '#334155',
    accent: '#3b82f6'
  },
  fonts: {
    primary: 'Manrope',
    secondary: 'Inter'
  },
  colors: {
    background: '#000000',
    foreground: '#ffffff',
    text: '#e2e8f0',
    muted: '#64748b'
  }
};

export default function AdminThemePage() {
  const { user, isLoading, isAdmin } = useAuth();
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(defaultTheme);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [csrfToken, setCsrfToken] = useState<string>('');

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      window.location.href = '/';
    }
  }, [isLoading, isAdmin]);

  useEffect(() => {
    loadTheme();
    // Fetch CSRF token on page load
    fetch('/api/csrf-token', { credentials: 'same-origin' })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.csrfToken) {
          setCsrfToken(data.csrfToken);
        } else {
          console.error('Invalid CSRF token response:', data);
        }
      })
      .catch(console.error);
  }, []);

  const loadTheme = async () => {
    try {
      const response = await fetch('/api/admin/theme');
      if (response.ok) {
        const theme = await response.json();
        setThemeConfig(theme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const saveTheme = async () => {
    setSaving(true);
    setSaveStatus('saving');
    
    try {
      const response = await fetch('/api/admin/theme', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify(themeConfig),
      });

      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else if (response.status === 403) {
        console.error('CSRF token validation failed. Please refresh the page.');
        setSaveStatus('error');
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Failed to save theme:', error);
      setSaveStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = () => {
    setThemeConfig(defaultTheme);
  };

  const updateThemeValue = (section: keyof ThemeConfig, key: string, value: string) => {
    setThemeConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading Theme Editor...</h2>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-400 mb-6">Admin privileges required to access theme editor.</p>
          <Button onClick={() => window.location.href = '/'}>Return to Homepage</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Theme Editor</h1>
              <p className="text-gray-400 mt-1">Customize brand colors and fonts for The Ode Islands</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="text-gray-300 border-gray-600 hover:bg-gray-800"
              >
                ← Back to Homepage
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Configuration */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Brand Colors */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Brand Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeConfig.brand.primary}
                    onChange={(e) => updateThemeValue('brand', 'primary', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-600"
                  />
                  <input
                    type="text"
                    value={themeConfig.brand.primary}
                    onChange={(e) => updateThemeValue('brand', 'primary', e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Secondary Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeConfig.brand.secondary}
                    onChange={(e) => updateThemeValue('brand', 'secondary', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-600"
                  />
                  <input
                    type="text"
                    value={themeConfig.brand.secondary}
                    onChange={(e) => updateThemeValue('brand', 'secondary', e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeConfig.brand.accent}
                    onChange={(e) => updateThemeValue('brand', 'accent', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-600"
                  />
                  <input
                    type="text"
                    value={themeConfig.brand.accent}
                    onChange={(e) => updateThemeValue('brand', 'accent', e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Typography */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Typography</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Primary Font</label>
                <select
                  value={themeConfig.fonts.primary}
                  onChange={(e) => updateThemeValue('fonts', 'primary', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="Manrope">Manrope</option>
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Secondary Font</label>
                <select
                  value={themeConfig.fonts.secondary}
                  onChange={(e) => updateThemeValue('fonts', 'secondary', e.target.value)}
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                >
                  <option value="Inter">Inter</option>
                  <option value="Manrope">Manrope</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Source Code Pro">Source Code Pro</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Colors */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Interface Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Background</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeConfig.colors.background}
                    onChange={(e) => updateThemeValue('colors', 'background', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-600"
                  />
                  <input
                    type="text"
                    value={themeConfig.colors.background}
                    onChange={(e) => updateThemeValue('colors', 'background', e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Foreground</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={themeConfig.colors.foreground}
                    onChange={(e) => updateThemeValue('colors', 'foreground', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-600"
                  />
                  <input
                    type="text"
                    value={themeConfig.colors.foreground}
                    onChange={(e) => updateThemeValue('colors', 'foreground', e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Theme Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="p-6 rounded-lg border"
                style={{ 
                  backgroundColor: themeConfig.colors.background,
                  borderColor: themeConfig.brand.secondary,
                  color: themeConfig.colors.foreground
                }}
              >
                <h3 
                  className="text-2xl font-bold mb-2"
                  style={{ 
                    fontFamily: themeConfig.fonts.primary,
                    color: themeConfig.brand.primary
                  }}
                >
                  The Ode Islands
                </h3>
                <p 
                  className="mb-4"
                  style={{ 
                    fontFamily: themeConfig.fonts.secondary,
                    color: themeConfig.colors.text
                  }}
                >
                  A preview of your theme configuration.
                </p>
                <button 
                  className="px-4 py-2 rounded font-medium"
                  style={{ 
                    backgroundColor: themeConfig.brand.accent,
                    color: themeConfig.colors.foreground
                  }}
                >
                  Sample Button
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={resetToDefault}
            className="text-gray-300 border-gray-600 hover:bg-gray-800"
          >
            Reset to Default
          </Button>
          
          <div className="flex items-center gap-4">
            {saveStatus === 'saved' && (
              <span className="text-green-400 text-sm">✓ Theme saved successfully</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-red-400 text-sm">✗ Failed to save theme. Please try refreshing the page.</span>
            )}
            <Button
              onClick={saveTheme}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? 'Saving...' : 'Save Theme'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}