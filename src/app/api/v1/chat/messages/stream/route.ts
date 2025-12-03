/**
 * Chat Messages Stream API Route
 *
 * POST /api/v1/chat/messages/stream - Send a message and get AI response (SSE streaming)
 * Requires pro or max plan with active subscription
 */

import { NextRequest, NextResponse } from 'next/server';
import { ChatController } from '../../../../../../api/controllers/chat.controller';
import {
  createSSEResponse,
  formatSSEEvent,
  SSE_HEADERS,
} from '../../../../../../api/middleware/sse.middleware';
import { getChatController } from '../../../../../../core/di';
import { JWTService, PlanType, SubscriptionStatus } from '../../../../../../modules/user';

/**
 * CORS headers for SSE responses
 */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

// Singleton JWT service
let jwtService: JWTService | null = null;
function getJWTService(): JWTService {
  if (!jwtService) {
    jwtService = new JWTService();
  }
  return jwtService;
}

// Allowed plans for this premium endpoint
const ALLOWED_PLANS: PlanType[] = ['pro', 'max'];
const VALID_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['active', 'trialing'];

/**
 * Auth validation result
 */
type AuthResult =
  | { valid: true; userId: string }
  | { valid: false; code: string; message: string };

/**
 * Validate auth and plan for SSE endpoint
 */
function validateAuthAndPlan(req: NextRequest): AuthResult {
  // Extract token from Authorization header
  const authHeader = req.headers.get('authorization');
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    // Fallback: Check X-API-Key header
    token = req.headers.get('x-api-key');
  }

  // Development bypass mode - allow requests without token
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.AUTH_DEV_BYPASS === 'true' &&
    !token
  ) {
    return { valid: true, userId: 'dev-user' };
  }

  if (!token) {
    return { valid: false, code: 'UNAUTHORIZED', message: 'Authentication required. Provide JWT via Authorization: Bearer <token>' };
  }

  const jwt = getJWTService();
  const result = jwt.verify(token);

  if (!result.valid) {
    return { valid: false, code: 'UNAUTHORIZED', message: result.error };
  }

  // Check plan
  if (!result.user.plan || !ALLOWED_PLANS.includes(result.user.plan)) {
    return {
      valid: false,
      code: 'FORBIDDEN',
      message: `This feature requires one of the following plans: ${ALLOWED_PLANS.filter(p => p !== null).join(', ')}. Current plan: ${result.user.plan || 'none'}`
    };
  }

  // Check subscription status
  if (!result.user.subscriptionStatus || !VALID_SUBSCRIPTION_STATUSES.includes(result.user.subscriptionStatus)) {
    return {
      valid: false,
      code: 'FORBIDDEN',
      message: `Active subscription required. Current status: ${result.user.subscriptionStatus || 'none'}`
    };
  }

  return { valid: true, userId: result.user.userId };
}

/**
 * POST /api/v1/chat/messages/stream
 *
 * Send a message and get AI response via Server-Sent Events
 * Requires pro or max plan with active subscription
 *
 * Note: SSE routes don't use the standard middleware pipe because they
 * return Response (native) instead of NextResponse (Next.js wrapper).
 */
export async function POST(req: NextRequest): Promise<Response> {
  // Validate auth and plan first
  const authResult = validateAuthAndPlan(req);
  if (!authResult.valid) {
    const errorStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const errorEvent = formatSSEEvent('error', {
          code: authResult.code,
          message: authResult.message,
        });
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      },
    });

    return new Response(errorStream, {
      headers: { ...SSE_HEADERS, ...CORS_HEADERS },
    });
  }

  // Parse request
  const parseResult = await ChatController.parseRequest(req);

  if (!parseResult.success) {
    // Return error as SSE event then close stream
    const errorStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const errorEvent = formatSSEEvent('error', {
          code: 'BAD_REQUEST',
          message: parseResult.error,
          details: parseResult.details,
        });
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      },
    });

    return new Response(errorStream, {
      headers: { ...SSE_HEADERS, ...CORS_HEADERS },
    });
  }

  try {
    // Get controller from DI container
    const chatController = getChatController();

    // Create streaming response with userId from JWT
    const stream = await chatController.sendMessageStream({
      ...parseResult.data,
      userId: authResult.userId,
    });

    return new Response(stream, {
      headers: { ...SSE_HEADERS, ...CORS_HEADERS },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Return error as SSE event
    const errorStream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const errorEvent = formatSSEEvent('error', {
          code: 'STREAM_ERROR',
          message: errorMessage,
        });
        controller.enqueue(encoder.encode(errorEvent));
        controller.close();
      },
    });

    return new Response(errorStream, {
      headers: { ...SSE_HEADERS, ...CORS_HEADERS },
    });
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Max-Age': '86400',
    },
  });
}
