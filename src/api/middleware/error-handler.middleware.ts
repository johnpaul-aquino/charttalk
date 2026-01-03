/**
 * Error Handler Middleware
 *
 * Catches and transforms errors into standardized API responses.
 * Captures 5xx errors to Sentry in production.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { transformError, ApiError } from '../utils/error.util';
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

      // Capture 5xx errors to Sentry in production
      if (error instanceof Error) {
        const statusCode = error instanceof ApiError ? error.statusCode : 500;
        if (statusCode >= 500) {
          Sentry.withScope((scope) => {
            scope.setTag('api.path', req.nextUrl.pathname);
            scope.setTag('api.method', req.method);
            if (error instanceof ApiError) {
              scope.setTag('error.code', error.code);
            }
            Sentry.captureException(error);
          });
        }
      }

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
