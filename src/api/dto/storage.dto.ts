/**
 * Storage API DTOs
 *
 * Request and response validation schemas for storage endpoints.
 */

import { z } from 'zod';

// ============================================================
// Upload to S3 DTOs
// ============================================================

/**
 * Request to upload chart to S3
 */
export const UploadToS3RequestSchema = z.object({
  imageUrl: z
    .string()
    .url()
    .optional()
    .describe('Chart image URL from chart-img.com'),
  imageData: z
    .string()
    .optional()
    .describe('Base64-encoded image data'),
  metadata: z
    .object({
      symbol: z.string().optional(),
      interval: z.string().optional(),
      indicators: z.array(z.string()).optional(),
      generatedAt: z.string().optional(),
      source: z.string().optional(),
    })
    .optional()
    .describe('Chart metadata'),
}).refine(
  (data) => data.imageUrl || data.imageData,
  {
    message: 'Either imageUrl or imageData must be provided',
  }
);

export type UploadToS3Request = z.infer<typeof UploadToS3RequestSchema>;

/**
 * Response from S3 upload
 */
export const UploadToS3ResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      url: z.string().describe('Permanent S3 URL'),
      bucket: z.string(),
      key: z.string(),
      size: z.number(),
      uploadedAt: z.string(),
      metadata: z.record(z.any()).optional(),
    })
    .optional(),
  error: z.string().optional(),
});

export type UploadToS3Response = z.infer<typeof UploadToS3ResponseSchema>;

// ============================================================
// Get Presigned URL DTOs
// ============================================================

/**
 * Request to generate presigned URL
 */
export const GetPresignedUrlRequestSchema = z.object({
  key: z.string().describe('S3 object key'),
  expiresIn: z
    .number()
    .int()
    .positive()
    .max(604800) // 7 days max
    .optional()
    .default(3600)
    .describe('Expiration time in seconds (default: 3600 = 1 hour, max: 604800 = 7 days)'),
});

export type GetPresignedUrlRequest = z.infer<typeof GetPresignedUrlRequestSchema>;

/**
 * Response with presigned URL
 */
export const GetPresignedUrlResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      url: z.string().describe('Presigned URL for temporary access'),
      expiresAt: z.string().describe('ISO timestamp when URL expires'),
    })
    .optional(),
  error: z.string().optional(),
});

export type GetPresignedUrlResponse = z.infer<typeof GetPresignedUrlResponseSchema>;

// ============================================================
// Delete Chart DTOs
// ============================================================

/**
 * Request to delete chart from S3
 */
export const DeleteChartRequestSchema = z.object({
  key: z.string().describe('S3 object key to delete'),
});

export type DeleteChartRequest = z.infer<typeof DeleteChartRequestSchema>;

/**
 * Response from delete operation
 */
export const DeleteChartResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      key: z.string(),
      deletedAt: z.string(),
    })
    .optional(),
  error: z.string().optional(),
});

export type DeleteChartResponse = z.infer<typeof DeleteChartResponseSchema>;

// ============================================================
// List Charts DTOs
// ============================================================

/**
 * Request to list charts with optional prefix
 */
export const ListChartsRequestSchema = z.object({
  prefix: z
    .string()
    .optional()
    .describe('S3 key prefix filter (e.g., "charts/2025/11/")'),
  limit: z
    .number()
    .int()
    .positive()
    .max(1000)
    .optional()
    .default(100)
    .describe('Maximum number of results (default: 100, max: 1000)'),
});

export type ListChartsRequest = z.infer<typeof ListChartsRequestSchema>;

/**
 * Response with list of chart keys
 */
export const ListChartsResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      keys: z.array(z.string()),
      count: z.number(),
    })
    .optional(),
  error: z.string().optional(),
});

export type ListChartsResponse = z.infer<typeof ListChartsResponseSchema>;
