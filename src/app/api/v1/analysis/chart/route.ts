/**
 * Chart Analysis Endpoint
 *
 * POST /api/v1/analysis/chart
 *
 * Analyzes trading charts using AI vision capabilities
 */

import { NextRequest } from 'next/server';
import {
  withErrorHandler,
  withCors,
  withOptionalAuth,
  withRateLimit,
  pipe,
} from '../../../../../api/middleware';
import {
  createSuccessResponse,
  jsonResponse,
  HttpStatus,
} from '../../../../../api/utils/response.util';
import { Errors } from '../../../../../api/utils/error.util';
import {
  AnalyzeChartRequestSchema,
  type AnalyzeChartResponse,
} from '../../../../../api/dto/analysis.dto';
import { analyzeChartHandler } from '../../../../../api/controllers/analysis.controller';

/**
 * POST /api/v1/analysis/chart
 *
 * Analyzes a trading chart and returns structured insights including:
 * - Trend analysis (bullish/bearish/neutral)
 * - Trading signals (entry/stop/target)
 * - Market sentiment
 * - Risk assessment
 */
async function handler(req: NextRequest) {
  // Parse and validate request body
  const body = await req.json().catch(() => {
    throw Errors.badRequest('Invalid JSON in request body');
  });

  const validation = AnalyzeChartRequestSchema.safeParse(body);
  if (!validation.success) {
    throw Errors.validationError(
      'Request validation failed',
      validation.error.errors
    );
  }

  // Analyze chart using controller
  const result = await analyzeChartHandler(req);

  // Return the result (controller already formats the response)
  return result;
}

// Apply middleware: CORS → Rate Limit (moderate) → Optional Auth → Error Handler
// Rate limit: 10 requests burst, 2/sec refill (analysis is computationally expensive)
export const POST = pipe(
  withCors,
  withRateLimit({ capacity: 10, refillRate: 2 }),
  withOptionalAuth,
  withErrorHandler
)(handler);
