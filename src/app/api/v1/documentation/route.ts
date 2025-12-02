/**
 * Documentation Endpoint
 *
 * GET /api/v1/documentation
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
import { Errors } from '../../../../api/utils/error.util';
import { fetchDocumentation } from '../../../../mcp/utils/doc-parser';

/**
 * GET /api/v1/documentation
 */
async function handler(req: NextRequest) {
  // Parse query parameters
  const searchParams = req.nextUrl.searchParams;
  const section = searchParams.get('section') || 'all';
  const forceRefresh = searchParams.get('forceRefresh') === 'true';

  // Fetch documentation
  const docs = await fetchDocumentation(
    section as 'indicators' | 'parameters' | 'rateLimits' | 'examples' | 'all',
    forceRefresh
  );

  if (!docs) {
    throw Errors.externalApiError(
      'chart-img.com',
      'Failed to fetch documentation'
    );
  }

  return jsonResponse(createSuccessResponse(docs), HttpStatus.OK);
}

// Apply middleware: CORS → Rate Limit → Optional Auth → Error Handler
export const GET = pipe(
  withCors,
  withRateLimit({ capacity: 10, refillRate: 5 }),
  withOptionalAuth,
  withErrorHandler
)(handler);

// Handle CORS preflight requests
export { OPTIONS } from '../../../../api/middleware/cors.middleware';
