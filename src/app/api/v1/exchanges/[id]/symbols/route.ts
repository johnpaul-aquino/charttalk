/**
 * Exchange Symbols Endpoint
 *
 * GET /api/v1/exchanges/:id/symbols
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  withCors,
  withOptionalAuth,
  withRateLimit,
  pipe,
} from '../../../../../../api/middleware';
import {
  createSuccessResponse,
  jsonResponse,
  HttpStatus,
} from '../../../../../../api/utils/response.util';
import {
  SearchQuerySchema,
  PaginationQuerySchema,
} from '../../../../../../api/dto/common.dto';
import { chartController } from '../../../../../../api/controllers/chart.controller';

/**
 * GET /api/v1/exchanges/:id/symbols
 */
async function handler(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const exchange = context.params.id;

  // Parse query parameters
  const searchParams = req.nextUrl.searchParams;
  const searchQuery = SearchQuerySchema.parse({
    search: searchParams.get('search'),
    forceRefresh: searchParams.get('forceRefresh'),
  });
  const pagination = PaginationQuerySchema.parse({
    limit: searchParams.get('limit'),
  });

  // Get symbols using controller
  const symbols = await chartController.getSymbols(
    exchange,
    searchQuery.search,
    pagination.limit,
    searchQuery.forceRefresh
  );

  return jsonResponse(
    createSuccessResponse(symbols, {
      total: symbols.length,
      exchange,
    }),
    HttpStatus.OK
  );
}

// Apply middleware: CORS → Rate Limit → Optional Auth → Error Handler
export const GET = pipe(
  withCors,
  withRateLimit({ capacity: 20, refillRate: 10 }),
  withOptionalAuth,
  withErrorHandler
)(handler);

// Handle CORS preflight requests
export { OPTIONS } from '../../../../../../api/middleware/cors.middleware';
