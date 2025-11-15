/**
 * Save Chart Image Endpoint
 *
 * POST /api/v1/storage/save
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
  SaveChartImageRequestSchema,
  type SaveChartImageResponse,
} from '../../../../../api/dto/chart.dto';
import { chartController } from '../../../../../api/controllers/chart.controller';

/**
 * POST /api/v1/storage/save
 */
async function handler(req: NextRequest) {
  // Parse and validate request body
  const body = await req.json().catch(() => {
    throw Errors.badRequest('Invalid JSON in request body');
  });

  const validation = SaveChartImageRequestSchema.safeParse(body);
  if (!validation.success) {
    throw Errors.validationError('Request validation failed', validation.error.errors);
  }

  // Save chart image using controller
  const result: SaveChartImageResponse = await chartController.saveChartImage(
    validation.data
  );

  return jsonResponse(createSuccessResponse(result), HttpStatus.OK);
}

// Apply middleware: CORS → Rate Limit → Optional Auth → Error Handler
export const POST = pipe(
  withCors,
  withRateLimit({ capacity: 10, refillRate: 5 }),
  withOptionalAuth,
  withErrorHandler
)(handler);
