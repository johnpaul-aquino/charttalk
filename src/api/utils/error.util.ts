/**
 * Error Utilities
 *
 * Error handling and transformation for API endpoints.
 */

import {
  createErrorResponse,
  ErrorCode,
  HttpStatus,
  type ApiErrorResponse,
} from './response.util';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Transform any error into an ApiErrorResponse
 */
export function transformError(
  error: unknown,
  meta?: Record<string, any>
): { response: ApiErrorResponse; statusCode: number } {
  // Handle ApiError
  if (error instanceof ApiError) {
    return {
      response: createErrorResponse(
        error.code,
        error.message,
        error.details,
        meta
      ),
      statusCode: error.statusCode,
    };
  }

  // Handle standard Error
  if (error instanceof Error) {
    return {
      response: createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        error.message,
        process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined,
        meta
      ),
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    };
  }

  // Handle unknown errors
  return {
    response: createErrorResponse(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred',
      process.env.NODE_ENV === 'development' ? { error } : undefined,
      meta
    ),
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
  };
}

/**
 * Predefined error factories
 */
export const Errors = {
  badRequest: (message: string, details?: any) =>
    new ApiError(ErrorCode.BAD_REQUEST, message, HttpStatus.BAD_REQUEST, details),

  unauthorized: (message: string = 'Unauthorized') =>
    new ApiError(ErrorCode.UNAUTHORIZED, message, HttpStatus.UNAUTHORIZED),

  forbidden: (message: string = 'Forbidden') =>
    new ApiError(ErrorCode.FORBIDDEN, message, HttpStatus.FORBIDDEN),

  notFound: (resource: string) =>
    new ApiError(
      ErrorCode.NOT_FOUND,
      `${resource} not found`,
      HttpStatus.NOT_FOUND
    ),

  validationError: (message: string, details?: any) =>
    new ApiError(
      ErrorCode.VALIDATION_ERROR,
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      details
    ),

  rateLimitExceeded: (message: string = 'Rate limit exceeded') =>
    new ApiError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      message,
      HttpStatus.TOO_MANY_REQUESTS
    ),

  internalError: (message: string = 'Internal server error', details?: any) =>
    new ApiError(
      ErrorCode.INTERNAL_ERROR,
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      details
    ),

  externalApiError: (service: string, message?: string) =>
    new ApiError(
      ErrorCode.EXTERNAL_API_ERROR,
      message || `External API error: ${service}`,
      HttpStatus.SERVICE_UNAVAILABLE
    ),

  symbolNotFound: (symbol: string) =>
    new ApiError(
      ErrorCode.SYMBOL_NOT_FOUND,
      `Symbol not found: ${symbol}`,
      HttpStatus.NOT_FOUND
    ),

  exchangeNotFound: (exchange: string) =>
    new ApiError(
      ErrorCode.EXCHANGE_NOT_FOUND,
      `Exchange not found: ${exchange}`,
      HttpStatus.NOT_FOUND
    ),

  invalidConfig: (message: string, details?: any) =>
    new ApiError(
      ErrorCode.INVALID_CONFIG,
      message,
      HttpStatus.UNPROCESSABLE_ENTITY,
      details
    ),

  chartGenerationFailed: (message: string, details?: any) =>
    new ApiError(
      ErrorCode.CHART_GENERATION_FAILED,
      message,
      HttpStatus.INTERNAL_SERVER_ERROR,
      details
    ),
};

/**
 * Async error handler wrapper for route handlers
 */
export function asyncHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      throw error; // Let the middleware handle it
    }
  };
}
