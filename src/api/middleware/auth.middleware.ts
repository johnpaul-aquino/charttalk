/**
 * Auth Middleware
 *
 * Validates JWT tokens for authenticated endpoints.
 * Designed to work with Laravel User Service JWT tokens.
 *
 * @see .docs/jwt-authentication.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { Errors } from '../utils/error.util';
import { transformError } from '../utils/error.util';
import { jsonResponse } from '../utils/response.util';
import { JWTService, PlanType, SubscriptionStatus } from '../../modules/user';

// Singleton JWT service instance
let jwtService: JWTService | null = null;

function getJWTService(): JWTService {
  if (!jwtService) {
    jwtService = new JWTService();
  }
  return jwtService;
}

/**
 * Auth context attached to requests
 * Contains user info extracted from JWT
 */
export interface AuthContext {
  userId: string;
  email?: string;
  name?: string | null;
  plan?: PlanType;
  subscriptionStatus?: SubscriptionStatus;
}

// Re-export types for convenience
export type { PlanType, SubscriptionStatus };

/**
 * Extract Bearer token from request headers
 */
function extractToken(req: NextRequest): string | null {
  // Check Authorization header (Bearer token) - preferred for JWT
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Fallback: Check X-API-Key header (for backward compatibility)
  const apiKeyHeader = req.headers.get('x-api-key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}

/**
 * Token validation result
 */
interface TokenValidationResult {
  valid: boolean;
  userId?: string;
  email?: string;
  name?: string | null;
  plan?: PlanType;
  subscriptionStatus?: SubscriptionStatus;
  error?: string;
}

/**
 * Validate token (JWT or legacy API key)
 */
function validateToken(token: string): TokenValidationResult {
  const jwt = getJWTService();

  // Try JWT validation first
  const jwtResult = jwt.verify(token);
  if (jwtResult.valid) {
    return {
      valid: true,
      userId: jwtResult.user.userId,
      email: jwtResult.user.email,
      name: jwtResult.user.name,
      plan: jwtResult.user.plan,
      subscriptionStatus: jwtResult.user.subscriptionStatus,
    };
  }

  // Development bypass mode (for testing without JWT)
  // Note: dev bypass is handled in JWTService.verify() so this is for edge cases
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.AUTH_DEV_BYPASS === 'true' &&
    token.length > 0
  ) {
    return {
      valid: true,
      userId: 'dev-user',
      email: 'dev@example.com',
      name: 'Dev User',
      plan: 'pro',
      subscriptionStatus: 'active',
    };
  }

  // Legacy API key validation (for backward compatibility)
  const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
  if (validKeys.length > 0 && validKeys.includes(token)) {
    return {
      valid: true,
      userId: token.substring(0, 8),
      email: undefined,
      name: undefined,
      plan: null,
      subscriptionStatus: null,
    };
  }

  return {
    valid: false,
    error: jwtResult.error || 'Invalid token',
  };
}

/**
 * Auth middleware wrapper - requires valid authentication
 */
export function withAuth(
  handler: (
    req: NextRequest,
    context?: any & { auth?: AuthContext }
  ) => Promise<NextResponse>
): (req: NextRequest, context?: any) => Promise<NextResponse> {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const token = extractToken(req);

    if (!token) {
      const error = Errors.unauthorized(
        'Authentication required. Provide JWT via Authorization: Bearer <token>'
      );
      const { response, statusCode } = transformError(error);
      return jsonResponse(response, statusCode);
    }

    const validation = validateToken(token);

    if (!validation.valid) {
      const error = Errors.unauthorized(validation.error || 'Invalid token');
      const { response, statusCode } = transformError(error);
      return jsonResponse(response, statusCode);
    }

    // Attach auth context to request with full user info from JWT
    const authContext = {
      ...context,
      auth: {
        userId: validation.userId!,
        email: validation.email,
        name: validation.name,
        plan: validation.plan,
        subscriptionStatus: validation.subscriptionStatus,
      } as AuthContext,
    };

    return handler(req, authContext);
  };
}

/**
 * Optional auth middleware - doesn't require auth but attaches context if present
 */
export function withOptionalAuth(
  handler: (
    req: NextRequest,
    context?: any & { auth?: AuthContext }
  ) => Promise<NextResponse>
): (req: NextRequest, context?: any) => Promise<NextResponse> {
  return async (req: NextRequest, context?: any): Promise<NextResponse> => {
    const token = extractToken(req);

    if (token) {
      const validation = validateToken(token);
      if (validation.valid) {
        const authContext = {
          ...context,
          auth: {
            userId: validation.userId!,
            email: validation.email,
            name: validation.name,
            plan: validation.plan,
            subscriptionStatus: validation.subscriptionStatus,
          } as AuthContext,
        };
        return handler(req, authContext);
      }
    }

    // No auth or invalid auth - proceed without auth context
    return handler(req, context);
  };
}

/**
 * Plan-based access control middleware
 *
 * Requires authentication + specific subscription plan with active status.
 * Must be used AFTER withAuth in the middleware chain.
 *
 * @example
 * export const POST = pipe(
 *   withCors,
 *   withRateLimit({ capacity: 10, refillRate: 2 }),
 *   withAuth,
 *   withPlan(['pro', 'max']),  // Requires pro or max plan
 *   withErrorHandler
 * )(handler);
 */
export function withPlan(allowedPlans: PlanType[]) {
  return (
    handler: (req: NextRequest, context?: any) => Promise<NextResponse>
  ): ((req: NextRequest, context?: any) => Promise<NextResponse>) => {
    return async (req: NextRequest, context?: any): Promise<NextResponse> => {
      const auth = getAuthContext(context);

      // Should not happen if withAuth is used first, but check anyway
      if (!auth) {
        const error = Errors.unauthorized('Authentication required');
        const { response, statusCode } = transformError(error);
        return jsonResponse(response, statusCode);
      }

      // Check plan
      if (!auth.plan || !allowedPlans.includes(auth.plan)) {
        const error = Errors.forbidden(
          `This feature requires one of the following plans: ${allowedPlans.filter(p => p !== null).join(', ')}. Current plan: ${auth.plan || 'none'}`
        );
        const { response, statusCode } = transformError(error);
        return jsonResponse(response, statusCode);
      }

      // Check subscription status (allow active or trialing)
      const validStatuses: SubscriptionStatus[] = ['active', 'trialing'];
      if (!auth.subscriptionStatus || !validStatuses.includes(auth.subscriptionStatus)) {
        const error = Errors.forbidden(
          `Active subscription required. Current status: ${auth.subscriptionStatus || 'none'}`
        );
        const { response, statusCode } = transformError(error);
        return jsonResponse(response, statusCode);
      }

      return handler(req, context);
    };
  };
}

/**
 * Get auth context from request (utility for handlers)
 */
export function getAuthContext(context: any): AuthContext | null {
  return context?.auth || null;
}

/**
 * Require specific user ownership (utility for handlers)
 */
export function requireOwnership(
  context: any,
  ownerId: string
): { authorized: boolean; error?: NextResponse } {
  const auth = getAuthContext(context);

  if (!auth) {
    const error = Errors.unauthorized('Authentication required');
    const { response, statusCode } = transformError(error);
    return {
      authorized: false,
      error: jsonResponse(response, statusCode),
    };
  }

  if (auth.userId !== ownerId) {
    const error = Errors.forbidden('Access denied');
    const { response, statusCode } = transformError(error);
    return {
      authorized: false,
      error: jsonResponse(response, statusCode),
    };
  }

  return { authorized: true };
}
