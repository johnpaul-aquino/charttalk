/**
 * Upload Chart to S3 Endpoint
 *
 * POST /api/v1/storage/s3
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
  UploadToS3RequestSchema,
  type UploadToS3Response,
} from '../../../../../api/dto/storage.dto';
import { storageController } from '../../../../../api/controllers/storage.controller';

/**
 * POST /api/v1/storage/s3
 * Upload chart image to AWS S3 for permanent storage
 */
async function handler(req: NextRequest) {
  // Parse and validate request body
  const body = await req.json().catch(() => {
    throw Errors.badRequest('Invalid JSON in request body');
  });

  const validation = UploadToS3RequestSchema.safeParse(body);
  if (!validation.success) {
    throw Errors.validationError('Request validation failed', validation.error.errors);
  }

  // Upload to S3 using controller
  const result: UploadToS3Response = await storageController.uploadToS3(validation.data);

  // Check if upload was successful
  if (!result.success) {
    throw Errors.internalError(result.error || 'Upload to S3 failed');
  }

  return jsonResponse(createSuccessResponse(result.data), HttpStatus.OK);
}

// Apply middleware: CORS → Rate Limit → Optional Auth → Error Handler
export const POST = pipe(
  withCors,
  withRateLimit({ capacity: 10, refillRate: 5 }), // 10 burst, 5/sec refill
  withOptionalAuth,
  withErrorHandler
)(handler);
