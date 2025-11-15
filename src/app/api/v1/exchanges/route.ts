/**
 * Exchanges Endpoint
 *
 * GET /api/v1/exchanges
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  withCors,
  withOptionalAuth,
  withRateLimit,
  pipe,
} from '../../../../api/middleware';
import {
  createSuccessResponse,
  jsonResponse,
  HttpStatus,
} from '../../../../api/utils/response.util';
import { SearchQuerySchema } from '../../../../api/dto/common.dto';
import { chartController } from '../../../../api/controllers/chart.controller';

/**
 * GET /api/v1/exchanges
 */
async function handler(req: NextRequest) {
  // Parse query parameters
  const searchParams = req.nextUrl.searchParams;
  const query = SearchQuerySchema.parse({
    forceRefresh: searchParams.get('forceRefresh'),
  });

  // Get exchanges using controller
  const exchanges = await chartController.getExchanges(query.forceRefresh);

  return jsonResponse(
    createSuccessResponse(exchanges, {
      total: exchanges.length,
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
