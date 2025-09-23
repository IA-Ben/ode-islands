import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// FORMATTING UTILITIES - Consolidate all formatting functions
// ============================================================================

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';
  
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format time to HH:MM format
 */
export function formatTime(date: Date | string | number): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '--:--';
  
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Format duration in minutes to human readable format
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Format numbers for display (with thousands separators)
 */
export function formatNumber(num: number): string {
  if (isNaN(num)) return '0';
  return num.toLocaleString();
}

/**
 * Create a display name from user data
 */
export function getDisplayName(user: { firstName?: string | null; lastName?: string | null; email?: string; }): string {
  const firstName = user.firstName?.trim();
  const lastName = user.lastName?.trim();
  
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  
  if (firstName) {
    return firstName;
  }
  
  if (lastName) {
    return lastName;
  }
  
  if (user.email) {
    return user.email.split('@')[0];
  }
  
  return 'Anonymous User';
}

/**
 * Calculate distance between two geographical coordinates
 */
export function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

/**
 * Escape XML/HTML special characters
 */
export function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// ============================================================================
// VALIDATION UTILITIES - Consolidate all validation functions
// ============================================================================

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (!password) {
    return { valid: false, message: 'Password is required' };
  }
  
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  return { valid: true };
}

/**
 * Validate required field
 */
export function isRequired(value: string | null | undefined, fieldName: string): { valid: boolean; message?: string } {
  if (!value || !value.trim()) {
    return { valid: false, message: `${fieldName} is required` };
  }
  
  return { valid: true };
}

/**
 * Validate latitude value
 */
export function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

/**
 * Validate longitude value
 */
export function isValidLongitude(lon: number): boolean {
  return lon >= -180 && lon <= 180;
}

// ============================================================================
// ERROR HANDLING UTILITIES - Consolidate all error handling
// ============================================================================

/**
 * Enhanced console logging with context
 */
export const logger = {
  error: (message: string, error?: any, context?: string) => {
    const prefix = context ? `[${context}]` : '';
    console.error(`${prefix} ${message}`, error || '');
  },
  
  warn: (message: string, context?: string) => {
    const prefix = context ? `[${context}]` : '';
    console.warn(`${prefix} ${message}`);
  },
  
  info: (message: string, context?: string) => {
    const prefix = context ? `[${context}]` : '';
    console.log(`${prefix} ${message}`);
  },
  
  debug: (message: string, data?: any, context?: string) => {
    if (process.env.NODE_ENV === 'development') {
      const prefix = context ? `[${context}]` : '';
      console.log(`${prefix} DEBUG: ${message}`, data || '');
    }
  }
};

/**
 * Safe async function wrapper with error handling
 */
export async function safeAsync<T>(
  fn: () => Promise<T>, 
  errorMessage: string,
  context?: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    logger.error(errorMessage, error, context);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error: any): string {
  if (error instanceof Error) {
    // Map common errors to user-friendly messages
    if (error.message.includes('fetch')) {
      return 'Unable to connect to the server. Please check your internet connection.';
    }
    if (error.message.includes('404')) {
      return 'The requested resource was not found.';
    }
    if (error.message.includes('401') || error.message.includes('unauthorized')) {
      return 'You need to sign in to access this feature.';
    }
    if (error.message.includes('403') || error.message.includes('forbidden')) {
      return 'You do not have permission to access this resource.';
    }
    if (error.message.includes('500')) {
      return 'Server error. Please try again later.';
    }
    
    return error.message;
  }
  
  return 'Something went wrong. Please try again.';
}

// ============================================================================
// BROWSER UTILITIES - Consolidate browser API helpers
// ============================================================================

/**
 * Check if we're running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if browser supports a specific feature
 */
export function browserSupports(feature: 'notifications' | 'geolocation' | 'webrtc' | 'websockets'): boolean {
  if (!isBrowser()) return false;
  
  switch (feature) {
    case 'notifications':
      return 'Notification' in window;
    case 'geolocation':
      return 'geolocation' in navigator;
    case 'webrtc':
      return 'RTCPeerConnection' in window;
    case 'websockets':
      return 'WebSocket' in window;
    default:
      return false;
  }
}

/**
 * Safe localStorage access
 */
export const storage = {
  get: (key: string): string | null => {
    if (!isBrowser()) return null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  
  set: (key: string, value: string): boolean => {
    if (!isBrowser()) return false;
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },
  
  remove: (key: string): boolean => {
    if (!isBrowser()) return false;
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};