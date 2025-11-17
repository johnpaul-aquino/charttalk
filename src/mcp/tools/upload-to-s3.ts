/**
 * Upload to S3 Tool
 *
 * MCP tool for uploading chart images to AWS S3 for permanent storage.
 */

import { z } from 'zod';
import { container, S3_STORAGE_SERVICE } from '../../core/di';
import type {
  ICloudStorageService,
  S3UploadResult,
  ChartMetadata,
} from '../../modules/storage';

// Input schema
export const UploadToS3InputSchema = z.object({
  imageUrl: z
    .string()
    .url()
    .optional()
    .describe('Chart image URL from chart-img.com'),
  imageData: z
    .string()
    .optional()
    .describe('Base64-encoded image data (alternative to URL)'),
  metadata: z
    .object({
      symbol: z.string().optional(),
      interval: z.string().optional(),
      indicators: z.array(z.string()).optional(),
      generatedAt: z.string().optional(),
      source: z.string().optional(),
    })
    .optional()
    .describe('Trading chart metadata (symbol, interval, indicators, etc.)'),
});

export type UploadToS3Input = z.infer<typeof UploadToS3InputSchema>;

// Output matches S3UploadResult
export type UploadToS3Output = S3UploadResult;

/**
 * Upload to S3 tool handler
 */
export async function uploadToS3Tool(
  input: UploadToS3Input
): Promise<UploadToS3Output> {
  try {
    // Validate input: must have either imageUrl or imageData
    if (!input.imageUrl && !input.imageData) {
      return {
        success: false,
        error: 'Either imageUrl or imageData must be provided',
      };
    }

    // Resolve service from DI container
    const s3Service = container.resolve<ICloudStorageService>(S3_STORAGE_SERVICE);
    const metadata: ChartMetadata = input.metadata || {};

    // Add source if not specified
    if (!metadata.source && input.imageUrl) {
      metadata.source = 'chart-img.com';
    }

    // Upload from URL or base64
    let result: S3UploadResult;
    if (input.imageUrl) {
      result = await s3Service.uploadFromUrl(input.imageUrl, metadata);
    } else {
      result = await s3Service.uploadBase64(input.imageData!, metadata);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload to S3 failed',
    };
  }
}

/**
 * Tool definition for MCP server
 */
export const uploadToS3ToolDefinition = {
  name: 'upload_chart_to_s3',
  description: `Upload chart image to AWS S3 for permanent storage.

**Purpose**: Store generated charts permanently in S3 (never expires, unlike chart-img.com 7-day URLs).

**Use Cases**:
- Permanent chart archival
- Long-term analysis and backtesting
- Building chart history databases
- Sharing charts with persistent URLs

**Input Options**:
- **imageUrl**: Chart URL from chart-img.com (expires in 7 days)
- **imageData**: Base64-encoded image data

**Metadata**: Optional trading info (symbol, interval, indicators) for organization.

**Returns**:
- Permanent S3 URL (https://bucket.s3.region.amazonaws.com/charts/...)
- Or CloudFront CDN URL if configured
- Bucket, key, size, upload timestamp`,
  inputSchema: {
    type: 'object',
    properties: {
      imageUrl: {
        type: 'string',
        description: 'Chart image URL from chart-img.com (must be a valid HTTP(S) URL). Either imageUrl or imageData must be provided.',
      },
      imageData: {
        type: 'string',
        description: 'Base64-encoded image data (alternative to imageUrl). Either imageUrl or imageData must be provided.',
      },
      metadata: {
        type: 'object',
        description: 'Trading chart metadata for organization',
        properties: {
          symbol: {
            type: 'string',
            description: 'Trading symbol (e.g., BINANCE:BTCUSDT)',
          },
          interval: {
            type: 'string',
            description: 'Chart timeframe (e.g., 4h, 1D)',
          },
          indicators: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of indicators used (e.g., ["RSI", "MACD"])',
          },
          generatedAt: {
            type: 'string',
            description: 'ISO timestamp when chart was generated',
          },
          source: {
            type: 'string',
            description: 'Chart source (default: "chart-img.com")',
          },
        },
      },
    },
  },
  annotations: {
    title: 'Upload Chart to S3',
    readOnlyHint: false,  // Modifies S3 state
    destructiveHint: false,  // Not destructive (creates new object)
    idempotentHint: false,  // Generates new key each time
  },
};
