/**
 * CORS Middleware
 *
 * Handles Cross-Origin Resource Sharing (CORS) headers.
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS configuration
 */
const CORS_CONFIG = {
  allowedOrigins:
    process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
  ],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
};

/**
 * Add CORS headers to a response
 */
export function addCorsHeaders(
  response: NextResponse,
  origin?: string
): NextResponse {
  // Allow all origins in development, specific origins in production
  const allowedOrigin =
    process.env.NODE_ENV === 'development'
      ? origin || '*'
      : CORS_CONFIG.allowedOrigins.includes(origin || '')
      ? origin
      : CORS_CONFIG.allowedOrigins[0];

  response.headers.set('Access-Control-Allow-Origin', allowedOrigin || '*');
  response.headers.set(
    'Access-Control-Allow-Methods',
    CORS_CONFIG.allowedMethods.join(', ')
  );
  response.headers.set(
    'Access-Control-Allow-Headers',
    CORS_CONFIG.allowedHeaders.join(', ')
  );
  response.headers.set(
    'Access-Control-Expose-Headers',
    CORS_CONFIG.exposedHeaders.join(', ')
  );
  response.headers.set(
    'Access-Control-Max-Age',
    CORS_CONFIG.maxAge.toString()
  );

  return response;
}

/**
 * Handle OPTIONS (preflight) requests
 */
export function handleCorsPreFlight(req: NextRequest): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, req.headers.get('origin') || undefined);
}

/**
 * CORS middleware wrapper
 */
export function withCors(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
): (req: NextRequest, context?: any) => Promise<NextResponse> {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const origin = req.headers.get('origin') || undefined;

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return handleCorsPreFlight(req);
    }

    // Execute handler and add CORS headers to response
    const response = await handler(req, context);
    return addCorsHeaders(response, origin);
  };
}

/**
 * OPTIONS handler for Next.js App Router
 * Export this from route files: export { OPTIONS } from '...cors.middleware'
 */
export async function OPTIONS(req: NextRequest): Promise<NextResponse> {
  return handleCorsPreFlight(req);
}
