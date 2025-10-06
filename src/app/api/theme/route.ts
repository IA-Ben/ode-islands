import { NextRequest, NextResponse } from 'next/server';
import { withAuth, validateCSRFToken } from '../../../../server/auth';
import { promises as fs } from 'fs';
import path from 'path';

const THEME_FILE_PATH = path.join(process.cwd(), 'data', 'theme.json');

// Default theme tokens
const DEFAULT_THEME = {
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

// Validate theme tokens
function validateTheme(theme: any): Record<string, string> {
  if (!theme || typeof theme !== 'object') {
    throw new Error('Theme must be an object');
  }

  const validTokens = Object.keys(DEFAULT_THEME);
  const validatedTheme: Record<string, string> = {};

  for (const token of validTokens) {
    if (theme[token]) {
      // Validate HSL format: "H S% L%" where H is 0-360, S and L are 0-100
      const hslRegex = /^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/;
      if (!hslRegex.test(theme[token])) {
        throw new Error(`Invalid HSL format for ${token}: ${theme[token]}`);
      }
      
      // Parse and validate ranges
      const [h, s, l] = theme[token].split(' ').map((val: string, i: number) => {
        return i === 0 ? parseInt(val) : parseInt(val.replace('%', ''));
      });
      
      if (h < 0 || h > 360) {
        throw new Error(`Hue out of range (0-360) for ${token}: ${h}`);
      }
      if (s < 0 || s > 100) {
        throw new Error(`Saturation out of range (0-100) for ${token}: ${s}%`);
      }
      if (l < 0 || l > 100) {
        throw new Error(`Lightness out of range (0-100) for ${token}: ${l}%`);
      }
      
      validatedTheme[token] = theme[token];
    } else {
      // Use default if not provided
      validatedTheme[token] = DEFAULT_THEME[token as keyof typeof DEFAULT_THEME];
    }
  }

  return validatedTheme;
}

// GET /api/theme - Get current theme configuration
export async function GET() {
  try {
    let themeData;
    
    try {
      const fileContent = await fs.readFile(THEME_FILE_PATH, 'utf-8');
      themeData = JSON.parse(fileContent);
    } catch (error) {
      // If file doesn't exist or is invalid, return default theme
      themeData = DEFAULT_THEME;
    }

    return NextResponse.json({
      theme: themeData,
      isDefault: await fs.access(THEME_FILE_PATH).then(() => false).catch(() => true)
    });
  } catch (error) {
    console.error('Error retrieving theme:', error);
    return NextResponse.json(
      { message: 'Failed to retrieve theme' },
      { status: 500 }
    );
  }
}

// PUT /api/theme - Update theme configuration (admin only)
async function handlePUT(request: NextRequest) {
  try {
    // Get session from withAuth middleware
    const session = (request as any).session;

    // Verify CSRF token
    const csrfToken = request.headers.get('X-CSRF-Token');
    if (!csrfToken) {
      return NextResponse.json(
        { message: 'CSRF token required' },
        { status: 400 }
      );
    }

    if (!session.sessionId) {
      return NextResponse.json(
        { message: 'Invalid session' },
        { status: 401 }
      );
    }

    const isValidCSRF = await validateCSRFToken(csrfToken, session.sessionId);
    if (!isValidCSRF) {
      return NextResponse.json(
        { message: 'Invalid CSRF token' },
        { status: 400 }
      );
    }

    // Parse and validate theme data
    const body = await request.json();
    const { theme } = body;

    if (!theme) {
      return NextResponse.json(
        { message: 'Theme data required' },
        { status: 400 }
      );
    }

    const validatedTheme = validateTheme(theme);

    // Ensure data directory exists
    await fs.mkdir(path.dirname(THEME_FILE_PATH), { recursive: true });

    // Save theme to file
    await fs.writeFile(THEME_FILE_PATH, JSON.stringify(validatedTheme, null, 2));

    return NextResponse.json({
      message: 'Theme updated successfully',
      theme: validatedTheme
    });

  } catch (error) {
    console.error('Error updating theme:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: 'Failed to update theme' },
      { status: 500 }
    );
  }
}

// Wrap PUT with JWT auth middleware (admin only)
export const PUT = withAuth(handlePUT, { requireAdmin: true });
