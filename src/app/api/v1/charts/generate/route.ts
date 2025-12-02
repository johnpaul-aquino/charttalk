/**
 * Generate Chart Image Endpoint
 *
 * POST /api/v1/charts/generate
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
  GenerateChartImageRequestSchema,
  type GenerateChartImageResponse,
} from '../../../../../api/dto/chart.dto';
import { chartController } from '../../../../../api/controllers/chart.controller';

/**
 * POST /api/v1/charts/generate
 */
async function handler(req: NextRequest) {
  // Parse and validate request body
  const body = await req.json().catch(() => {
    throw Errors.badRequest('Invalid JSON in request body');
  });

  const validation = GenerateChartImageRequestSchema.safeParse(body);
  if (!validation.success) {
    throw Errors.validationError('Request validation failed', validation.error.errors);
  }

  // Generate chart image using controller
  const result: GenerateChartImageResponse = await chartController.generateChartImage(
    validation.data
  );

  return jsonResponse(createSuccessResponse(result), HttpStatus.OK);
}

// Apply middleware: CORS → Rate Limit (stricter) → Optional Auth → Error Handler
export const POST = pipe(
  withCors,
  withRateLimit({ capacity: 10, refillRate: 2 }), // Stricter limit for generation
  withOptionalAuth,
  withErrorHandler
)(handler);

// Handle CORS preflight requests
export { OPTIONS } from '../../../../../api/middleware/cors.middleware';
