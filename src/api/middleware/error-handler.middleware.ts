/**
 * Error Handler Middleware
 *
 * Catches and transforms errors into standardized API responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { transformError } from '../utils/error.util';
import { jsonResponse } from '../utils/response.util';

/**
 * Wraps a route handler with error handling
 */
export function withErrorHandler<T>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
): (req: NextRequest, context?: any) => Promise<NextResponse> {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error('[API Error]', error);

      const { response, statusCode } = transformError(error, {
        path: req.nextUrl.pathname,
        method: req.method,
      });

      return jsonResponse(response, statusCode);
    }
  };
}

/**
 * Async handler wrapper that catches errors
 */
export function asyncHandler<T>(
  fn: (req: NextRequest, context?: any) => Promise<T>
): (req: NextRequest, context?: any) => Promise<T> {
  return async (req: NextRequest, context?: any): Promise<T> => {
    try {
      return await fn(req, context);
    } catch (error) {
      throw error; // Re-throw to be caught by withErrorHandler
    }
  };
}
