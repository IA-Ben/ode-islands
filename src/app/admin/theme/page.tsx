'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/theme/ThemeProvider';
import { getReadableFgFromHSL, checkContrast, generateAccessibleTheme } from '@/lib/theme/contrast';

// HSL Theme Token interface matching our new system
interface ThemeTokens {
  '--bg': string;
  '--fg': string;
  '--surface': string;
  '--muted': string;
  '--border': string;
  '--accent': string;
  '--accent-foreground': string;
  '--success': string;
  '--warn': string;
  '--error': string;
}

const defaultTokens: ThemeTokens = {
  '--bg': '95 40% 96%',
  '--fg': '222 84% 5%',
  '--surface': '0 0% 100%',
  '--muted': '210 40% 94%',
  '--border': '214 32% 91%',
  '--accent': '330 75% 68%',
  '--accent-foreground': '0 0% 100%',
  '--success': '142 76% 36%',
  '--warn': '38 92% 50%',
  '--error': '0 84% 60%'
};

// Convert HSL string to hex for color picker
function hslToHex(hslString: string): string {
  const [h, s, l] = hslString.split(' ').map((val, i) => {
    return i === 0 ? parseInt(val) : parseInt(val.replace('%', ''));
  });
  
  const hue = h / 360;
  const saturation = s / 100;
  const lightness = l / 100;
  
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs((hue * 6) % 2 - 1));
  const m = lightness - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= hue && hue < 1/6) {
    r = c; g = x; b = 0;
  } else if (1/6 <= hue && hue < 2/6) {
    r = x; g = c; b = 0;
  } else if (2/6 <= hue && hue < 3/6) {
    r = 0; g = c; b = x;
  } else if (3/6 <= hue && hue < 4/6) {
    r = 0; g = x; b = c;
  } else if (4/6 <= hue && hue < 5/6) {
    r = x; g = 0; b = c;
  } else if (5/6 <= hue && hue < 1) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Convert hex to HSL string
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }
    h /= 6;
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export default function AdminThemePage() {
  const { user, isLoading, isAdmin } = useAuth();
  const { applyTheme } = useTheme();
  const [tokens, setTokens] = useState<ThemeTokens>(defaultTokens);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [previewMode, setPreviewMode] = useState(false);

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
      const response = await fetch('/api/theme');
      if (response.ok) {
        const data = await response.json();
        setTokens(data.theme);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  };

  const saveTheme = async () => {
    setSaving(true);
    setSaveStatus('saving');
    
    try {
      // Auto-generate accessible accent-foreground
      const accessibleTokens = generateAccessibleTheme(tokens);
      
      const response = await fetch('/api/theme', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({ theme: accessibleTokens }),
      });

      if (response.ok) {
        setSaveStatus('saved');
        setTokens(accessibleTokens);
        // Apply to the current page immediately
        applyTheme(accessibleTokens);
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
    setTokens(defaultTokens);
    if (previewMode) {
      applyTheme(defaultTokens);
    }
  };

  const updateToken = (token: keyof ThemeTokens, value: string) => {
    const newTokens = {
      ...tokens,
      [token]: value
    };
    
    // Auto-compute accent-foreground when accent changes
    if (token === '--accent') {
      newTokens['--accent-foreground'] = getReadableFgFromHSL(value);
    }
    
    setTokens(newTokens);
    
    // Live preview if enabled
    if (previewMode) {
      applyTheme(newTokens);
    }
  };

  const togglePreview = () => {
    const newPreviewMode = !previewMode;
    setPreviewMode(newPreviewMode);
    
    if (newPreviewMode) {
      applyTheme(tokens);
    } else {
      // Reset to saved theme
      loadTheme().then(() => {
        fetch('/api/theme')
          .then(res => res.json())
          .then(data => applyTheme(data.theme))
          .catch(console.error);
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold">Loading Theme Editor...</h2>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">Admin privileges required to access theme editor.</p>
          <Button onClick={() => window.location.href = '/'}>Return to Homepage</Button>
        </div>
      </div>
    );
  }

  // Calculate contrast ratios for current accent color
  const accentContrast = checkContrast(tokens['--accent'], tokens['--accent-foreground']);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Theme Editor</h1>
              <p className="text-muted-foreground mt-1">Customize design tokens with WCAG AA accessibility compliance</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant={previewMode ? "default" : "outline"}
                onClick={togglePreview}
                className="text-sm"
              >
                {previewMode ? '👁️ Live Preview ON' : '👁️ Live Preview OFF'}
              </Button>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/admin/cms'}
              >
                ← Back to CMS
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Theme Configuration */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Core Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Core Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(['--bg', '--fg', '--surface', '--muted', '--border'] as const).map((token) => (
                <div key={token} className="space-y-2">
                  <label className="text-sm text-muted-foreground capitalize">
                    {token.replace('--', '').replace('-', ' ')}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={hslToHex(tokens[token])}
                      onChange={(e) => updateToken(token, hexToHsl(e.target.value))}
                      className="w-12 h-10 rounded border border-border bg-surface"
                    />
                    <input
                      type="text"
                      value={tokens[token]}
                      onChange={(e) => updateToken(token, e.target.value)}
                      placeholder="H S% L%"
                      className="flex-1 bg-surface border border-border rounded px-3 py-2"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Accent & Status Colors */}
          <Card>
            <CardHeader>
              <CardTitle>Accent & Status Colors</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(['--accent', '--success', '--warn', '--error'] as const).map((token) => (
                <div key={token} className="space-y-2">
                  <label className="text-sm text-muted-foreground capitalize">
                    {token.replace('--', '').replace('-', ' ')}
                    {token === '--accent' && (
                      <span className={`ml-2 text-xs px-2 py-1 rounded ${
                        accentContrast.passes ? 'bg-success/20 text-success' : 'bg-error/20 text-error'
                      }`}>
                        {accentContrast.ratio}:1 {accentContrast.passes ? '✓' : '✗'}
                      </span>
                    )}
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={hslToHex(tokens[token])}
                      onChange={(e) => updateToken(token, hexToHsl(e.target.value))}
                      className="w-12 h-10 rounded border border-border bg-surface"
                    />
                    <input
                      type="text"
                      value={tokens[token]}
                      onChange={(e) => updateToken(token, e.target.value)}
                      placeholder="H S% L%"
                      className="flex-1 bg-surface border border-border rounded px-3 py-2"
                    />
                  </div>
                  {token === '--accent' && (
                    <div className="text-xs text-muted-foreground">
                      Auto-computed foreground: {tokens['--accent-foreground']}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Token Preview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Token Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Object.entries(tokens).map(([token, value]) => (
                  <div key={token} className="p-3 rounded border border-border bg-surface">
                    <div
                      className="w-full h-12 rounded mb-2 border border-border"
                      style={{ backgroundColor: `hsl(${value})` }}
                    ></div>
                    <div className="text-xs font-mono">
                      <div className="font-semibold">{token}</div>
                      <div className="text-muted-foreground">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Component Preview */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Component Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 p-6 rounded-lg border border-border bg-surface">
                <h3 className="text-2xl font-bold">Design System Preview</h3>
                <p className="text-muted-foreground">
                  This preview shows how your theme tokens look in real components.
                </p>
                <div className="flex gap-3 flex-wrap">
                  <Button>Primary Button</Button>
                  <Button variant="outline">Outline Button</Button>
                  <Button variant="secondary">Secondary Button</Button>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-sm bg-success/20 text-success">Success</span>
                  <span className="px-3 py-1 rounded-full text-sm bg-warn/20 text-warn">Warning</span>
                  <span className="px-3 py-1 rounded-full text-sm bg-error/20 text-error">Error</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={resetToDefault}
          >
            Reset to Default
          </Button>
          
          <div className="flex items-center gap-4">
            {saveStatus === 'saved' && (
              <span className="text-success text-sm">✓ Theme saved successfully</span>
            )}
            {saveStatus === 'error' && (
              <span className="text-error text-sm">✗ Failed to save theme. Please try refreshing the page.</span>
            )}
            <Button
              onClick={saveTheme}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Theme'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}