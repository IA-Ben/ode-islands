import { NextResponse } from 'next/server';

// Standardized API response types
export interface ApiSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    etag?: string;
    timestamp?: string;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: any;
  timestamp?: string;
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

// Standard HTTP status codes for common scenarios
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  NOT_MODIFIED: 304,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// Standardized success response helper
export function respondOk<T = any>(
  data?: T,
  options: {
    message?: string;
    status?: number;
    meta?: ApiSuccessResponse<T>['meta'];
    headers?: Record<string, string>;
  } = {}
): NextResponse {
  const {
    message,
    status = HTTP_STATUS.OK,
    meta,
    headers = {},
  } = options;

  const response: ApiSuccessResponse<T> = {
    success: true,
    ...(data !== undefined && { data }),
    ...(message && { message }),
    ...(meta && { meta: { ...meta, timestamp: new Date().toISOString() } }),
  };

  // Add standard security headers
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    ...headers,
  };

  return NextResponse.json(response, { status, headers: defaultHeaders });
}

// Standardized error response helper
export function respondError(
  error: string | Error,
  options: {
    message?: string;
    status?: number;
    code?: string;
    details?: any;
    headers?: Record<string, string>;
  } = {}
): NextResponse {
  const {
    message,
    status = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code,
    details,
    headers = {},
  } = options;

  // Extract error message if Error object provided
  const errorMessage = error instanceof Error ? error.message : error;
  const finalMessage = message || getDefaultErrorMessage(status);

  const response: ApiErrorResponse = {
    success: false,
    error: errorMessage,
    message: finalMessage,
    ...(code && { code }),
    ...(details && { details }),
    timestamp: new Date().toISOString(),
  };

  // Add standard security headers
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    ...headers,
  };

  // Log errors for monitoring (exclude client errors)
  if (status >= 500) {
    console.error(`API Error [${status}]: ${errorMessage}`, {
      error: error instanceof Error ? error.stack : error,
      details,
      timestamp: response.timestamp,
    });
  }

  return NextResponse.json(response, { status, headers: defaultHeaders });
}

// Helper to get default error messages based on status codes
function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case HTTP_STATUS.BAD_REQUEST:
      return 'The request was invalid or cannot be processed';
    case HTTP_STATUS.UNAUTHORIZED:
      return 'Authentication is required to access this resource';
    case HTTP_STATUS.FORBIDDEN:
      return 'You do not have permission to access this resource';
    case HTTP_STATUS.NOT_FOUND:
      return 'The requested resource was not found';
    case HTTP_STATUS.METHOD_NOT_ALLOWED:
      return 'The HTTP method is not allowed for this resource';
    case HTTP_STATUS.CONFLICT:
      return 'The request conflicts with the current state of the resource';
    case HTTP_STATUS.UNPROCESSABLE_ENTITY:
      return 'The request was well-formed but contains semantic errors';
    case HTTP_STATUS.TOO_MANY_REQUESTS:
      return 'Too many requests. Please try again later';
    case HTTP_STATUS.INTERNAL_SERVER_ERROR:
      return 'An internal server error occurred';
    case HTTP_STATUS.BAD_GATEWAY:
      return 'Bad gateway or upstream server error';
    case HTTP_STATUS.SERVICE_UNAVAILABLE:
      return 'The service is temporarily unavailable';
    case HTTP_STATUS.GATEWAY_TIMEOUT:
      return 'Gateway timeout waiting for upstream server';
    default:
      return 'An error occurred while processing your request';
  }
}

// Specialized helpers for common scenarios

export function respondCreated<T>(
  data: T,
  message: string = 'Resource created successfully'
): NextResponse {
  return respondOk(data, { message, status: HTTP_STATUS.CREATED });
}

// Backward compatibility helper for routes with existing key structure
export function respondOkCompat<T = any>(
  data: T,
  options: {
    legacyKey?: string;
    message?: string;
    status?: number;
    meta?: ApiSuccessResponse<T>['meta'];
    headers?: Record<string, string>;
  } = {}
): NextResponse {
  const {
    legacyKey,
    message,
    status = HTTP_STATUS.OK,
    meta,
    headers = {},
  } = options;

  const response: any = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta: { ...meta, timestamp: new Date().toISOString() } }),
  };

  // Add legacy key for backward compatibility (temporary)
  if (legacyKey && data !== undefined) {
    response[legacyKey] = data;
  }

  // Add standard security headers
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    ...headers,
  };

  return NextResponse.json(response, { status, headers: defaultHeaders });
}

export function respondNotFound(
  resource: string = 'Resource',
  message?: string
): NextResponse {
  return respondError(
    `${resource} not found`,
    {
      message: message || `The requested ${resource.toLowerCase()} was not found`,
      status: HTTP_STATUS.NOT_FOUND,
      code: 'NOT_FOUND',
    }
  );
}

export function respondUnauthorized(
  message: string = 'Authentication required'
): NextResponse {
  return respondError(
    'Unauthorized access',
    {
      message,
      status: HTTP_STATUS.UNAUTHORIZED,
      code: 'UNAUTHORIZED',
    }
  );
}

export function respondForbidden(
  message: string = 'Insufficient permissions'
): NextResponse {
  return respondError(
    'Access forbidden',
    {
      message,
      status: HTTP_STATUS.FORBIDDEN,
      code: 'FORBIDDEN',
    }
  );
}

export function respondBadRequest(
  error: string,
  options: {
    message?: string;
    code?: string;
    details?: any;
  } = {}
): NextResponse {
  return respondError(error, {
    ...options,
    status: HTTP_STATUS.BAD_REQUEST,
  });
}

export function respondConflict(
  error: string,
  message: string = 'The request conflicts with existing data'
): NextResponse {
  return respondError(error, {
    message,
    status: HTTP_STATUS.CONFLICT,
    code: 'CONFLICT',
  });
}

export function respondValidationError(
  validationErrors: Record<string, string[]> | string,
  message: string = 'Validation failed'
): NextResponse {
  return respondError(
    typeof validationErrors === 'string' ? validationErrors : 'Validation failed',
    {
      message,
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
      code: 'VALIDATION_ERROR',
      details: typeof validationErrors === 'object' ? validationErrors : undefined,
    }
  );
}

// Cache helpers for responses with ETags
export function respondWithCache<T>(
  data: T,
  options: {
    etag?: string;
    maxAge?: number;
    message?: string;
    requestHeaders?: Headers;
  } = {}
): NextResponse {
  const { etag, maxAge = 300, message, requestHeaders } = options;

  // Check if client has cached version
  if (etag && requestHeaders) {
    const clientETag = requestHeaders.get('if-none-match');
    if (clientETag === etag) {
      return new NextResponse(null, { status: HTTP_STATUS.NOT_MODIFIED });
    }
  }

  const headers: Record<string, string> = {
    'Cache-Control': `public, max-age=${maxAge}`,
  };

  if (etag) {
    headers['ETag'] = etag;
  }

  return respondOk(data, {
    message,
    headers,
    meta: etag ? { etag } : undefined,
  });
}

// Rate limiting helper
export function respondRateLimit(
  retryAfter: number = 60,
  message: string = 'Rate limit exceeded'
): NextResponse {
  return respondError(
    'Too many requests',
    {
      message,
      status: HTTP_STATUS.TOO_MANY_REQUESTS,
      code: 'RATE_LIMIT_EXCEEDED',
      headers: {
        'Retry-After': retryAfter.toString(),
      },
    }
  );
}