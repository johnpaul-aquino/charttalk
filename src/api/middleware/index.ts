/**
 * Middleware Index
 *
 * Exports all middleware and composition utilities.
 */

import { NextRequest, NextResponse } from 'next/server';

export * from './auth.middleware';
export * from './cors.middleware';
export * from './error-handler.middleware';
export * from './rate-limiter.middleware';

/**
 * Compose multiple middleware functions
 */
export function pipe(
  ...middlewares: Array<
    (
      handler: (req: NextRequest, context?: any) => Promise<NextResponse>
    ) => (req: NextRequest, context?: any) => Promise<NextResponse>
  >
): (
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) => (req: NextRequest, context?: any) => Promise<NextResponse> {
  return (handler) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}
