/**
 * Construct Chart Config Endpoint
 *
 * POST /api/v1/charts/construct
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
  ConstructChartConfigRequestSchema,
  type ConstructChartConfigResponse,
} from '../../../../../api/dto/chart.dto';
import { chartController } from '../../../../../api/controllers/chart.controller';

/**
 * POST /api/v1/charts/construct
 */
async function handler(req: NextRequest) {
  // Parse and validate request body
  const body = await req.json().catch(() => {
    throw Errors.badRequest('Invalid JSON in request body');
  });

  const validation = ConstructChartConfigRequestSchema.safeParse(body);
  if (!validation.success) {
    throw Errors.validationError('Request validation failed', validation.error.errors);
  }

  // Construct chart config using controller
  const result: ConstructChartConfigResponse = await chartController.constructChartConfig(
    validation.data
  );

  return jsonResponse(createSuccessResponse(result), HttpStatus.OK);
}

// Apply middleware: CORS → Rate Limit → Optional Auth → Error Handler
export const POST = pipe(
  withCors,
  withRateLimit({ capacity: 20, refillRate: 10 }),
  withOptionalAuth,
  withErrorHandler
)(handler);
