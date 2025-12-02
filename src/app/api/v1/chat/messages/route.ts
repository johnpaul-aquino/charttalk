/**
 * Chat Messages API Route
 *
 * POST /api/v1/chat/messages - Send a message and get AI response (non-streaming)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pipe, withCors, withAuth, withPlan, withErrorHandler, withRateLimit, getAuthContext, AuthContext } from '../../../../../api/middleware';
import { ChatController } from '../../../../../api/controllers/chat.controller';
import { createSuccessResponse, createErrorResponse } from '../../../../../api/utils/response.util';
import { getChatController } from '../../../../../core/di';

/**
 * POST /api/v1/chat/messages
 *
 * Send a message and get AI response (non-streaming)
 */
async function handler(req: NextRequest, context?: { auth?: AuthContext }): Promise<NextResponse> {
  // Get userId from auth context (set by withAuth middleware)
  const auth = getAuthContext(context);
  if (!auth) {
    return NextResponse.json(
      createErrorResponse('UNAUTHORIZED', 'Authentication required'),
      { status: 401 }
    );
  }

  // Parse request
  const parseResult = await ChatController.parseRequest(req);

  if (!parseResult.success) {
    return NextResponse.json(
      createErrorResponse(
        'BAD_REQUEST',
        parseResult.error,
        parseResult.details
      ),
      { status: 400 }
    );
  }

  try {
    // Get controller from DI container
    const controller = getChatController();

    // Send message with userId from JWT
    const response = await controller.sendMessage({
      ...parseResult.data,
      userId: auth.userId,
    });

    if (!response.success) {
      return NextResponse.json(
        createErrorResponse('CONVERSATION_ERROR', response.error || 'Failed to process message'),
        { status: 500 }
      );
    }

    return NextResponse.json(createSuccessResponse(response), { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', errorMessage),
      { status: 500 }
    );
  }
}

// Apply middleware - requires pro or max plan with active subscription
export const POST = pipe(
  withCors,
  withRateLimit({ capacity: 10, refillRate: 2 }), // Stricter rate limit for AI endpoints
  withAuth,
  withPlan(['pro', 'max']),
  withErrorHandler
)(handler);

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
      'Access-Control-Max-Age': '86400',
    },
  });
}
