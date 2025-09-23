/**
 * Contrast calculation utilities for WCAG AA compliance
 * Ensures text meets 4.5:1 contrast ratio against backgrounds
 */

// Convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h /= 360;
  s /= 100;
  l /= 100;
  
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 1/6) {
    r = c; g = x; b = 0;
  } else if (1/6 <= h && h < 2/6) {
    r = x; g = c; b = 0;
  } else if (2/6 <= h && h < 3/6) {
    r = 0; g = c; b = x;
  } else if (3/6 <= h && h < 4/6) {
    r = 0; g = x; b = c;
  } else if (4/6 <= h && h < 5/6) {
    r = x; g = 0; b = c;
  } else if (5/6 <= h && h < 1) {
    r = c; g = 0; b = x;
  }
  
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ];
}

// Convert RGB to luminance (for contrast calculation)
function rgbToLuminance(r: number, g: number, b: number): number {
  // Convert to sRGB
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  // Calculate luminance using ITU-R BT.709 coefficients
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

// Calculate contrast ratio between two colors
function getContrastRatio(luminance1: number, luminance2: number): number {
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Parse HSL string (e.g., "330 75% 68%" or "330deg 75% 68%")
function parseHSL(hslString: string): [number, number, number] {
  const cleaned = hslString.replace(/deg/g, '').trim();
  const parts = cleaned.split(/\s+/);
  
  if (parts.length !== 3) {
    throw new Error(`Invalid HSL format: ${hslString}. Expected format: "H S% L%"`);
  }
  
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1].replace('%', ''));
  const l = parseFloat(parts[2].replace('%', ''));
  
  if (isNaN(h) || isNaN(s) || isNaN(l)) {
    throw new Error(`Invalid HSL values: ${hslString}`);
  }
  
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) {
    throw new Error(`HSL values out of range: ${hslString}`);
  }
  
  return [h, s, l];
}

/**
 * Determines the optimal foreground color (light or dark) for a given background
 * to meet WCAG AA contrast ratio requirements (4.5:1)
 * 
 * @param bgH Background hue (0-360)
 * @param bgS Background saturation (0-100)
 * @param bgL Background lightness (0-100)
 * @returns HSL string for optimal foreground color
 */
export function getReadableFg(bgH: number, bgS: number, bgL: number): string {
  // Convert background to luminance
  const [r, g, b] = hslToRgb(bgH, bgS, bgL);
  const bgLuminance = rgbToLuminance(r, g, b);
  
  // Define our light and dark options
  const lightFg = { h: 0, s: 0, l: 100 }; // White
  const darkFg = { h: 222, s: 47, l: 11 }; // Very dark blue-gray
  
  // Calculate luminance for both options
  const [lightR, lightG, lightB] = hslToRgb(lightFg.h, lightFg.s, lightFg.l);
  const lightLuminance = rgbToLuminance(lightR, lightG, lightB);
  
  const [darkR, darkG, darkB] = hslToRgb(darkFg.h, darkFg.s, darkFg.l);
  const darkLuminance = rgbToLuminance(darkR, darkG, darkB);
  
  // Calculate contrast ratios
  const lightContrast = getContrastRatio(bgLuminance, lightLuminance);
  const darkContrast = getContrastRatio(bgLuminance, darkLuminance);
  
  // Choose the option with better contrast, preferring the one that meets AA standard
  const aaThreshold = 4.5;
  
  if (lightContrast >= aaThreshold && darkContrast >= aaThreshold) {
    // Both meet AA, choose the one with higher contrast
    return lightContrast > darkContrast 
      ? `${lightFg.h} ${lightFg.s}% ${lightFg.l}%`
      : `${darkFg.h} ${darkFg.s}% ${darkFg.l}%`;
  } else if (lightContrast >= aaThreshold) {
    return `${lightFg.h} ${lightFg.s}% ${lightFg.l}%`;
  } else if (darkContrast >= aaThreshold) {
    return `${darkFg.h} ${darkFg.s}% ${darkFg.l}%`;
  } else {
    // Neither meets AA, choose the better one
    return lightContrast > darkContrast 
      ? `${lightFg.h} ${lightFg.s}% ${lightFg.l}%`
      : `${darkFg.h} ${darkFg.s}% ${darkFg.l}%`;
  }
}

/**
 * Convenience function that accepts HSL string format
 * 
 * @param hslString HSL string in format "H S% L%" (e.g., "330 75% 68%")
 * @returns HSL string for optimal foreground color
 */
export function getReadableFgFromHSL(hslString: string): string {
  const [h, s, l] = parseHSL(hslString);
  return getReadableFg(h, s, l);
}

/**
 * Check if a color combination meets WCAG contrast requirements
 * 
 * @param bgHSL Background color HSL string
 * @param fgHSL Foreground color HSL string
 * @param level 'AA' (4.5:1) or 'AAA' (7:1)
 * @returns Object with contrast ratio and compliance status
 */
export function checkContrast(
  bgHSL: string, 
  fgHSL: string, 
  level: 'AA' | 'AAA' = 'AA'
): { ratio: number; passes: boolean; level: string } {
  const [bgH, bgS, bgL] = parseHSL(bgHSL);
  const [fgH, fgS, fgL] = parseHSL(fgHSL);
  
  const [bgR, bgG, bgB] = hslToRgb(bgH, bgS, bgL);
  const [fgR, fgG, fgB] = hslToRgb(fgH, fgS, fgL);
  
  const bgLuminance = rgbToLuminance(bgR, bgG, bgB);
  const fgLuminance = rgbToLuminance(fgR, fgG, fgB);
  
  const ratio = getContrastRatio(bgLuminance, fgLuminance);
  const threshold = level === 'AAA' ? 7 : 4.5;
  
  return {
    ratio: Math.round(ratio * 100) / 100,
    passes: ratio >= threshold,
    level
  };
}

/**
 * Generate an accessible theme by automatically computing accent-foreground
 * 
 * @param theme Partial theme object with accent color
 * @returns Complete theme with computed accent-foreground
 */
export function generateAccessibleTheme(theme: Record<string, string>): Record<string, string> {
  const result = { ...theme };
  
  // Auto-compute accent-foreground if accent is provided
  if (theme['--accent']) {
    result['--accent-foreground'] = getReadableFgFromHSL(theme['--accent']);
  }
  
  return result;
}