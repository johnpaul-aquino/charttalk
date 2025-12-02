/**
 * Conversations Endpoint
 *
 * GET /api/v1/conversations - List user's conversations
 * POST /api/v1/conversations - Create a new conversation
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
} from '../../../../api/middleware';
import {
  createSuccessResponse,
  createPaginatedResponse,
  jsonResponse,
  HttpStatus,
} from '../../../../api/utils/response.util';
import { Errors } from '../../../../api/utils/error.util';
import { ConversationRepository, IConversationRepository } from '../../../../modules/conversation';
import { prisma } from '../../../../core/database/prisma.client';

// Request validation schemas
const ListConversationsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  isPinned: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  isArchived: z.enum(['true', 'false']).optional().transform(v => v === 'true'),
  search: z.string().optional(),
});

const CreateConversationSchema = z.object({
  title: z.string().max(500).optional(),
});

// Lazy-initialized repository
let repository: IConversationRepository | null = null;

function getRepository(): IConversationRepository {
  if (!repository) {
    repository = new ConversationRepository(prisma);
  }
  return repository;
}

/**
 * GET /api/v1/conversations
 * List user's conversations
 */
async function listHandler(req: NextRequest, context?: { auth?: AuthContext }) {
  const auth = getAuthContext(context);
  if (!auth) {
    throw Errors.unauthorized('Authentication required');
  }

  // Parse query params
  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const query = ListConversationsQuerySchema.parse(searchParams);

  const repo = getRepository();
  const result = await repo.listConversations(
    {
      userId: auth.userId,
      isPinned: query.isPinned,
      isArchived: query.isArchived,
      search: query.search,
    },
    {
      page: query.page,
      limit: query.limit,
    }
  );

  return jsonResponse(
    createPaginatedResponse(
      result.items,
      result.total,
      result.page,
      result.limit
    ),
    HttpStatus.OK
  );
}

/**
 * POST /api/v1/conversations
 * Create a new conversation
 */
async function createHandler(req: NextRequest, context?: { auth?: AuthContext }) {
  const auth = getAuthContext(context);
  if (!auth) {
    throw Errors.unauthorized('Authentication required');
  }

  // Parse request body
  const body = await req.json();
  const data = CreateConversationSchema.parse(body);

  const repo = getRepository();
  const conversation = await repo.createConversation({
    userId: auth.userId,
    title: data.title,
  });

  return jsonResponse(createSuccessResponse(conversation), HttpStatus.CREATED);
}

// Apply middleware - requires pro or max plan with active subscription
export const GET = pipe(
  withCors,
  withRateLimit({ capacity: 30, refillRate: 15 }),
  withAuth,
  withPlan(['pro', 'max']),
  withErrorHandler
)(listHandler);

export const POST = pipe(
  withCors,
  withRateLimit({ capacity: 20, refillRate: 10 }),
  withAuth,
  withPlan(['pro', 'max']),
  withErrorHandler
)(createHandler);

// Handle CORS preflight requests
export { OPTIONS } from '../../../../api/middleware/cors.middleware';
