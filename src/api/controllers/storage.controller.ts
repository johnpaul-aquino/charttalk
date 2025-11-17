/**
 * Storage Controller
 *
 * HTTP request handlers for storage-related endpoints (S3).
 * Uses DI container to resolve services.
 */

import { container } from '../../core/di';
import { S3_STORAGE_SERVICE } from '../../core/di/tokens';
import type { ICloudStorageService } from '../../modules/storage/interfaces/storage.interface';
import type {
  UploadToS3Request,
  UploadToS3Response,
  GetPresignedUrlRequest,
  GetPresignedUrlResponse,
  DeleteChartRequest,
  DeleteChartResponse,
  ListChartsRequest,
  ListChartsResponse,
} from '../dto/storage.dto';

/**
 * Storage Controller Class
 */
export class StorageController {
  private s3Service: ICloudStorageService;

  constructor() {
    // Resolve S3 service from DI container
    this.s3Service = container.resolve<ICloudStorageService>(S3_STORAGE_SERVICE);
  }

  /**
   * Upload chart to S3
   */
  async uploadToS3(request: UploadToS3Request): Promise<UploadToS3Response> {
    try {
      // Upload from URL or base64
      let result;
      if (request.imageUrl) {
        result = await this.s3Service.uploadFromUrl(request.imageUrl, request.metadata);
      } else if (request.imageData) {
        result = await this.s3Service.uploadBase64(request.imageData, request.metadata);
      } else {
        return {
          success: false,
          error: 'Either imageUrl or imageData must be provided',
        };
      }

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return {
        success: true,
        data: {
          url: result.url!,
          bucket: result.bucket!,
          key: result.key!,
          size: result.size!,
          uploadedAt: result.uploadedAt!,
          metadata: result.metadata,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload to S3 failed',
      };
    }
  }

  /**
   * Generate presigned URL for temporary access
   */
  async getPresignedUrl(request: GetPresignedUrlRequest): Promise<GetPresignedUrlResponse> {
    try {
      const url = await this.s3Service.getPresignedUrl(request.key, request.expiresIn);

      // Calculate expiration timestamp
      const expiresAt = new Date(Date.now() + (request.expiresIn || 3600) * 1000).toISOString();

      return {
        success: true,
        data: {
          url,
          expiresAt,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate presigned URL',
      };
    }
  }

  /**
   * Delete chart from S3
   */
  async deleteChart(request: DeleteChartRequest): Promise<DeleteChartResponse> {
    try {
      await this.s3Service.deleteChart(request.key);

      return {
        success: true,
        data: {
          key: request.key,
          deletedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete chart',
      };
    }
  }

  /**
   * List charts with optional prefix filter
   */
  async listCharts(request: ListChartsRequest): Promise<ListChartsResponse> {
    try {
      const keys = await this.s3Service.listCharts(request.prefix);

      // Apply limit
      const limitedKeys = keys.slice(0, request.limit || 100);

      return {
        success: true,
        data: {
          keys: limitedKeys,
          count: limitedKeys.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list charts',
      };
    }
  }
}

// Export singleton instance
export const storageController = new StorageController();
