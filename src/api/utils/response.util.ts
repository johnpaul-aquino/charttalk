/**
 * Response Utilities
 *
 * Standardized response formatting for all API endpoints.
 */

import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    stack?: string;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    [key: string]: any;
  };
}

export type ApiResponse<T = any> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  meta?: Record<string, any>
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  code: string,
  message: string,
  details?: any,
  meta?: Record<string, any>
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      // Only include stack trace in development
      ...(process.env.NODE_ENV === 'development' && details?.stack
        ? { stack: details.stack }
        : {}),
    },
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  };
}

/**
 * HTTP Status Codes
 */
export const HttpStatus = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

/**
 * Standard Error Codes
 */
export const ErrorCode = {
  // Client errors (4xx)
  BAD_REQUEST: 'BAD_REQUEST',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',

  // Business logic errors
  SYMBOL_NOT_FOUND: 'SYMBOL_NOT_FOUND',
  EXCHANGE_NOT_FOUND: 'EXCHANGE_NOT_FOUND',
  INVALID_CONFIG: 'INVALID_CONFIG',
  CHART_GENERATION_FAILED: 'CHART_GENERATION_FAILED',
} as const;

/**
 * Helper to send JSON response with Next.js
 */
export function jsonResponse<T>(
  data: ApiResponse<T>,
  status: number = HttpStatus.OK
): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Create a paginated success response
 */
export function createPaginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  meta?: Record<string, any>
): ApiSuccessResponse<T[]> {
  const totalPages = Math.ceil(total / limit);
  return {
    success: true,
    data: items,
    meta: {
      timestamp: new Date().toISOString(),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      },
      ...meta,
    },
  };
}
