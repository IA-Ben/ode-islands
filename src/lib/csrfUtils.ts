// ============================================================================
// ENHANCED HTTP CLIENT - Consolidate all API patterns
// ============================================================================

import { logger, getUserFriendlyError } from './utils';

// CSRF token utility functions
export const getCsrfToken = (): string => {
  if (typeof window === 'undefined') return '';
  
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return decodeURIComponent(value);
    }
  }
  return '';
};

export const fetchCsrfToken = async (): Promise<string> => {
  try {
    const response = await fetch('/api/csrf-token', {
      method: 'GET',
      credentials: 'include',
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to fetch CSRF token');
    }
    
    return data.csrfToken;
  } catch (error) {
    logger.error('Error fetching CSRF token', error, 'CSRF');
    throw error;
  }
};

// Enhanced API response interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// HTTP client configuration
interface HttpClientConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

// Enhanced HTTP client class
export class HttpClient {
  private config: HttpClientConfig;
  
  constructor(config: HttpClientConfig = {}) {
    this.config = {
      baseUrl: '',
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      ...config
    };
  }

  private async withRetry<T>(
    fn: () => Promise<T>, 
    retries: number = this.config.retries || 3
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === retries || !this.shouldRetry(error)) {
          throw error;
        }
        
        // Exponential backoff with jitter
        const baseDelay = this.config.retryDelay || 1000;
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
        const delay = exponentialDelay + jitter;
        
        logger.warn(`Request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${Math.round(delay)}ms...`, 'HttpClient');
        await this.delay(delay);
      }
    }
    
    throw lastError;
  }

  private shouldRetry(error: any): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      // Don't retry on client errors (4xx)
      if (message.includes('400') || message.includes('401') || 
          message.includes('403') || message.includes('404') || 
          message.includes('422') || message.includes('409')) {
        return false;
      }
      
      // Don't retry on rate limiting (429) - should be handled separately
      if (message.includes('429')) {
        return false;
      }
      
      // Retry on network errors, timeouts, and server errors (5xx)
      return message.includes('timeout') || 
             message.includes('network') ||
             message.includes('fetch') ||
             message.includes('500') ||
             message.includes('502') ||
             message.includes('503') ||
             message.includes('504');
    }
    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async makeRequest<T>(
    url: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${this.config.baseUrl}${url}`;
    const method = (options.method || 'GET').toUpperCase();
    
    // Add CSRF token for mutating operations
    const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (needsCSRF) {
      try {
        const csrfToken = getCsrfToken() || await fetchCsrfToken();
        (headers as Record<string, string>)['x-csrf-token'] = csrfToken;
      } catch (error) {
        logger.error('Failed to get CSRF token', error, 'HttpClient');
      }
    }

    const requestOptions: RequestInit = {
      credentials: 'include',
      ...options,
      headers,
    };

    // Only retry idempotent methods by default
    const shouldUseRetry = ['GET', 'HEAD', 'OPTIONS'].includes(method);
    
    const makeRequestOnce = async (): Promise<ApiResponse<T>> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const response = await fetch(fullUrl, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Parse JSON response
        let responseData: any;
        try {
          responseData = await response.json();
        } catch {
          responseData = {};
        }

        // Normalize to ApiResponse format
        if (response.ok) {
          // If response already has success field, use it; otherwise assume success
          if (typeof responseData.success === 'boolean') {
            return responseData as ApiResponse<T>;
          } else {
            return {
              success: true,
              data: responseData as T
            };
          }
        } else {
          return {
            success: false,
            error: responseData.error || responseData.message || `HTTP ${response.status}: ${response.statusText}`
          };
        }
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    if (shouldUseRetry) {
      return this.withRetry(makeRequestOnce);
    } else {
      return makeRequestOnce();
    }
  }

  // GET request
  async get<T>(url: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    let fullUrl = url;
    if (params) {
      const searchParams = new URLSearchParams(params);
      fullUrl += `?${searchParams.toString()}`;
    }

    try {
      return await this.makeRequest<T>(fullUrl, { method: 'GET' });
    } catch (error) {
      logger.error(`GET ${fullUrl} failed`, error, 'HttpClient');
      return {
        success: false,
        error: getUserFriendlyError(error)
      };
    }
  }

  // POST request
  async post<T>(url: string, body?: any): Promise<ApiResponse<T>> {
    try {
      return await this.makeRequest<T>(url, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      logger.error(`POST ${url} failed`, error, 'HttpClient');
      return {
        success: false,
        error: getUserFriendlyError(error)
      };
    }
  }

  // PUT request
  async put<T>(url: string, body?: any): Promise<ApiResponse<T>> {
    try {
      return await this.makeRequest<T>(url, {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      logger.error(`PUT ${url} failed`, error, 'HttpClient');
      return {
        success: false,
        error: getUserFriendlyError(error)
      };
    }
  }

  // PATCH request
  async patch<T>(url: string, body?: any): Promise<ApiResponse<T>> {
    try {
      return await this.makeRequest<T>(url, {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (error) {
      logger.error(`PATCH ${url} failed`, error, 'HttpClient');
      return {
        success: false,
        error: getUserFriendlyError(error)
      };
    }
  }

  // DELETE request
  async delete<T>(url: string): Promise<ApiResponse<T>> {
    try {
      return await this.makeRequest<T>(url, { method: 'DELETE' });
    } catch (error) {
      logger.error(`DELETE ${url} failed`, error, 'HttpClient');
      return {
        success: false,
        error: getUserFriendlyError(error)
      };
    }
  }
}

// Default HTTP client instance
export const httpClient = new HttpClient();

// Legacy API call wrapper with CSRF protection (for backward compatibility)
export const apiCallWithCSRF = async (url: string, options: RequestInit = {}) => {
  const csrfToken = getCsrfToken() || await fetchCsrfToken();
  
  const headers = {
    'Content-Type': 'application/json',
    'x-csrf-token': csrfToken,
    ...options.headers,
  };

  return fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });
};

// ============================================================================
// SIMPLIFIED API FUNCTIONS - Easy-to-use wrappers
// ============================================================================

/**
 * Simplified GET request
 */
export async function apiGet<T>(url: string, params?: Record<string, string>): Promise<T | null> {
  const response = await httpClient.get<T>(url, params);
  return response.success ? response.data || null : null;
}

/**
 * Simplified POST request
 */
export async function apiPost<T>(url: string, body?: any): Promise<T | null> {
  const response = await httpClient.post<T>(url, body);
  return response.success ? response.data || null : null;
}

/**
 * Simplified PUT request
 */
export async function apiPut<T>(url: string, body?: any): Promise<T | null> {
  const response = await httpClient.put<T>(url, body);
  return response.success ? response.data || null : null;
}

/**
 * Simplified DELETE request
 */
export async function apiDelete<T>(url: string): Promise<T | null> {
  const response = await httpClient.delete<T>(url);
  return response.success ? response.data || null : null;
}

// ============================================================================
// STRICT API FUNCTIONS - Preserve full error details for forms
// ============================================================================

/**
 * Strict GET request - Returns full ApiResponse<T> with error details
 */
export async function apiGetStrict<T>(url: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
  return httpClient.get<T>(url, params);
}

/**
 * Strict POST request - Returns full ApiResponse<T> with error details
 */
export async function apiPostStrict<T>(url: string, body?: any): Promise<ApiResponse<T>> {
  return httpClient.post<T>(url, body);
}

/**
 * Strict PUT request - Returns full ApiResponse<T> with error details
 */
export async function apiPutStrict<T>(url: string, body?: any): Promise<ApiResponse<T>> {
  return httpClient.put<T>(url, body);
}

/**
 * Strict DELETE request - Returns full ApiResponse<T> with error details
 */
export async function apiDeleteStrict<T>(url: string): Promise<ApiResponse<T>> {
  return httpClient.delete<T>(url);
}