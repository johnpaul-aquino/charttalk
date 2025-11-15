/**
 * Auth Middleware
 *
 * Validates API keys for authenticated endpoints.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Errors } from '../utils/error.util';
import { transformError } from '../utils/error.util';
import { jsonResponse } from '../utils/response.util';

/**
 * Extract API key from request headers
 */
function extractApiKey(req: NextRequest): string | null {
  // Check X-API-Key header
  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check Authorization header (Bearer token)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Validate API key
 *
 * For now, this is a simple validation. In production, you would:
 * - Check against a database of valid API keys
 * - Verify key expiration
 * - Check key permissions and plan level
 * - Track usage for billing
 */
function validateApiKey(apiKey: string): {
  valid: boolean;
  userId?: string;
  planLevel?: string;
} {
  // For development: accept any non-empty key
  if (process.env.NODE_ENV === 'development' && apiKey.length > 0) {
    return {
      valid: true,
      userId: 'dev-user',
      planLevel: 'PRO',
    };
  }

  // For production: validate against environment variable or database
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
  if (validKeys.includes(apiKey)) {
    return {
      valid: true,
      userId: apiKey.substring(0, 8), // Use first 8 chars as userId
      planLevel: process.env.CHART_IMG_PLAN || 'PRO',
    };
  }

  return { valid: false };
}

/**
 * Auth middleware wrapper
 */
export function withAuth(
  handler: (
    req: NextRequest,
    context?: any & { auth?: { userId: string; planLevel: string } }
  ) => Promise<NextResponse>
): (req: NextRequest, context?: any) => Promise<NextResponse> {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const apiKey = extractApiKey(req);

    if (!apiKey) {
      const error = Errors.unauthorized('API key is required. Provide it via X-API-Key header or Authorization: Bearer <key>');
      const { response, statusCode } = transformError(error);
      return jsonResponse(response, statusCode);
    }

    const validation = validateApiKey(apiKey);

    if (!validation.valid) {
      const error = Errors.unauthorized('Invalid API key');
      const { response, statusCode } = transformError(error);
      return jsonResponse(response, statusCode);
    }

    // Attach auth context to request
    const authContext = {
      ...context,
      auth: {
        userId: validation.userId!,
        planLevel: validation.planLevel!,
      },
    };

    return handler(req, authContext);
  };
}

/**
 * Optional auth middleware (doesn't require API key but attaches auth if present)
 */
export function withOptionalAuth(
  handler: (
    req: NextRequest,
    context?: any & { auth?: { userId: string; planLevel: string } }
  ) => Promise<NextResponse>
): (req: NextRequest, context?: any) => Promise<NextResponse> {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const apiKey = extractApiKey(req);

    if (apiKey) {
      const validation = validateApiKey(apiKey);
      if (validation.valid) {
        const authContext = {
          ...context,
          auth: {
            userId: validation.userId!,
            planLevel: validation.planLevel!,
          },
        };
        return handler(req, authContext);
      }
    }

    // No auth or invalid auth - proceed without auth context
    return handler(req, context);
  };
}
