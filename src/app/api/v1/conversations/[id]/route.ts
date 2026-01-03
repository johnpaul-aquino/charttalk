/**
 * Single Conversation Endpoint
 *
 * GET /api/v1/conversations/:id - Get conversation with messages
 * PATCH /api/v1/conversations/:id - Update conversation
 * DELETE /api/v1/conversations/:id - Delete conversation
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  withErrorHandler,
  withCors,
  withAuth,
  withPlan,
  withRateLimit,
  pipe,
  getAuthContext,
  AuthContext,
} from '../../../../../api/middleware';
import {
  createSuccessResponse,
  jsonResponse,
  HttpStatus,
} from '../../../../../api/utils/response.util';
import { Errors } from '../../../../../api/utils/error.util';
import { ConversationRepository, IConversationRepository } from '../../../../../modules/conversation';
import { prisma } from '../../../../../core/database/prisma.client';

// Request validation schemas
const UpdateConversationSchema = z.object({
  title: z.string().max(500).optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
});

// Lazy-initialized repository
let repository: IConversationRepository | null = null;

function getRepository(): IConversationRepository {
  if (!repository) {
    repository = new ConversationRepository(prisma);
  }
  return repository;
}

interface RouteContext {
  params: Promise<{ id: string }>;
  auth?: AuthContext;
}

/**
 * GET /api/v1/conversations/:id
 * Get conversation with messages
 */
async function getHandler(req: NextRequest, context: RouteContext) {
  const auth = getAuthContext(context);
  if (!auth) {
    throw Errors.unauthorized('Authentication required');
  }

  const { id } = await context.params;
  const repo = getRepository();
  const conversation = await repo.getConversationWithMessages(id);

  if (!conversation) {
    throw Errors.notFound('Conversation not found');
  }

  // Check ownership
  if (conversation.userId !== auth.userId) {
    throw Errors.forbidden('Access denied');
  }

  return jsonResponse(createSuccessResponse(conversation), HttpStatus.OK);
}

/**
 * PATCH /api/v1/conversations/:id
 * Update conversation
 */
async function updateHandler(req: NextRequest, context: RouteContext) {
  const auth = getAuthContext(context);
  if (!auth) {
    throw Errors.unauthorized('Authentication required');
  }

  const { id } = await context.params;
  const repo = getRepository();

  // Check existence and ownership
  const existing = await repo.getConversationById(id);
  if (!existing) {
    throw Errors.notFound('Conversation not found');
  }
  if (existing.userId !== auth.userId) {
    throw Errors.forbidden('Access denied');
  }

  // Parse request body
  const body = await req.json();
  const data = UpdateConversationSchema.parse(body);

  const conversation = await repo.updateConversation(id, data);

  return jsonResponse(createSuccessResponse(conversation), HttpStatus.OK);
}

/**
 * DELETE /api/v1/conversations/:id
 * Delete conversation
 */
async function deleteHandler(req: NextRequest, context: RouteContext) {
  const auth = getAuthContext(context);
  if (!auth) {
    throw Errors.unauthorized('Authentication required');
  }

  const { id } = await context.params;
  const repo = getRepository();

  // Check existence and ownership
  const existing = await repo.getConversationById(id);
  if (!existing) {
    throw Errors.notFound('Conversation not found');
  }
  if (existing.userId !== auth.userId) {
    throw Errors.forbidden('Access denied');
  }

  await repo.deleteConversation(id);

  return jsonResponse(
    createSuccessResponse({ deleted: true }),
    HttpStatus.OK
  );
}

// Apply middleware - requires pro or max plan with active subscription
export const GET = pipe(
  withCors,
  withRateLimit({ capacity: 30, refillRate: 15 }),
  withAuth,
  withPlan(['free', 'pro', 'max']),
  withErrorHandler
)(getHandler);

export const PATCH = pipe(
  withCors,
  withRateLimit({ capacity: 20, refillRate: 10 }),
  withAuth,
  withPlan(['free', 'pro', 'max']),
  withErrorHandler
)(updateHandler);

export const DELETE = pipe(
  withCors,
  withRateLimit({ capacity: 10, refillRate: 5 }),
  withAuth,
  withPlan(['free', 'pro', 'max']),
  withErrorHandler
)(deleteHandler);

// Handle CORS preflight requests
export { OPTIONS } from '../../../../../api/middleware/cors.middleware';
