import { promises as fs } from 'fs';
import path from 'path';

const THEME_FILE_PATH = path.join(process.cwd(), 'data', 'theme.json');

// Default theme tokens
export const DEFAULT_THEME = {
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

/**
 * Load saved theme from disk server-side
 * Returns default theme if no saved theme exists
 */
export async function loadServerTheme(): Promise<Record<string, string>> {
  try {
    const fileContent = await fs.readFile(THEME_FILE_PATH, 'utf-8');
    const savedTheme = JSON.parse(fileContent);
    
    // Merge with defaults to ensure all tokens are present
    return { ...DEFAULT_THEME, ...savedTheme };
  } catch (error) {
    // File doesn't exist or is invalid, return default theme
    return DEFAULT_THEME;
  }
}

/**
 * Generate CSS custom properties from theme tokens for SSR injection
 * Prevents FOUC by applying theme before React hydration
 */
export function generateThemeCSS(theme: Record<string, string>): string {
  const cssVariables = Object.entries(theme)
    .map(([token, value]) => `  ${token}: ${value};`)
    .join('\n');

  return `:root {\n${cssVariables}\n}`;
}

/**
 * Generate complete SSR style tag with theme CSS
 * This should be injected into the document head
 */
export function getThemeSSRStyles(theme: Record<string, string>): string {
  const css = generateThemeCSS(theme);
  return `<style id="theme-ssr-styles">${css}</style>`;
}