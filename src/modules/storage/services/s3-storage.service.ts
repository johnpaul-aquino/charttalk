/**
 * S3 Storage Service
 *
 * High-level service for storing charts in AWS S3.
 * Implements ICloudStorageService interface.
 */

import { S3ClientService } from './s3-client.service';
import type {
  ICloudStorageService,
  ChartMetadata,
  S3UploadResult,
} from '../interfaces/storage.interface';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { fetchWithTimeout, DEFAULT_TIMEOUTS } from '@/shared/utils';

export class S3StorageService implements ICloudStorageService {
  constructor(private s3Client: S3ClientService) {}

  /**
   * Upload chart from URL to S3
   */
  async uploadFromUrl(
    chartUrl: string,
    metadata?: ChartMetadata
  ): Promise<S3UploadResult> {
    try {
      // Download chart from URL with timeout protection
      const response = await fetchWithTimeout(chartUrl, {
        timeout: DEFAULT_TIMEOUTS.DOWNLOAD,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to download chart: ${response.statusText}`,
        };
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get('content-type') || 'image/png';

      // Generate S3 key
      const key = this.generateKey(metadata);

      // Upload to S3
      const uploadResult = await this.s3Client.upload({
        key,
        body: buffer,
        contentType,
        metadata: this.serializeMetadata(metadata),
      });

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        };
      }

      return {
        success: true,
        url: uploadResult.location,
        bucket: uploadResult.bucket,
        key: uploadResult.key,
        size: buffer.length,
        uploadedAt: new Date().toISOString(),
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload from URL failed',
      };
    }
  }

  /**
   * Upload base64-encoded chart to S3
   */
  async uploadBase64(
    imageData: string,
    metadata?: ChartMetadata
  ): Promise<S3UploadResult> {
    try {
      // Remove data URI prefix if present
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');

      // Detect content type from data URI or default to PNG
      let contentType = 'image/png';
      const match = imageData.match(/^data:(image\/\w+);base64,/);
      if (match) {
        contentType = match[1];
      }

      // Generate S3 key
      const key = this.generateKey(metadata);

      // Upload to S3
      const uploadResult = await this.s3Client.upload({
        key,
        body: buffer,
        contentType,
        metadata: this.serializeMetadata(metadata),
      });

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        };
      }

      return {
        success: true,
        url: uploadResult.location,
        bucket: uploadResult.bucket,
        key: uploadResult.key,
        size: buffer.length,
        uploadedAt: new Date().toISOString(),
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload from base64 failed',
      };
    }
  }

  /**
   * Upload local file to S3
   */
  async uploadFile(
    filePath: string,
    metadata?: ChartMetadata
  ): Promise<S3UploadResult> {
    try {
      // Read file from disk
      const buffer = await fs.readFile(filePath);

      // Detect content type from file extension
      const contentType = this.getContentTypeFromPath(filePath);

      // Generate S3 key
      const key = this.generateKey(metadata);

      // Upload to S3
      const uploadResult = await this.s3Client.upload({
        key,
        body: buffer,
        contentType,
        metadata: this.serializeMetadata(metadata),
      });

      if (!uploadResult.success) {
        return {
          success: false,
          error: uploadResult.error,
        };
      }

      return {
        success: true,
        url: uploadResult.location,
        bucket: uploadResult.bucket,
        key: uploadResult.key,
        size: buffer.length,
        uploadedAt: new Date().toISOString(),
        metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload from file failed',
      };
    }
  }

  /**
   * Generate presigned URL for temporary access
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return this.s3Client.getPresignedUrl(key, expiresIn);
  }

  /**
   * Delete chart from S3
   */
  async deleteChart(key: string): Promise<void> {
    const result = await this.s3Client.delete(key);
    if (!result.success) {
      throw new Error(result.error || 'Failed to delete chart');
    }
  }

  /**
   * List charts with optional prefix filter
   */
  async listCharts(prefix?: string): Promise<string[]> {
    const result = await this.s3Client.listObjects(prefix);
    if (result.error) {
      throw new Error(result.error);
    }
    return result.keys;
  }

  /**
   * Generate S3 object key with structure: charts/{year}/{month}/{filename}
   */
  private generateKey(metadata?: ChartMetadata): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Generate filename from metadata
    const parts: string[] = [];

    if (metadata?.symbol) {
      // Extract symbol without exchange prefix (e.g., BINANCE:BTCUSDT -> BTCUSDT)
      const symbol = metadata.symbol.includes(':')
        ? metadata.symbol.split(':')[1]
        : metadata.symbol;
      parts.push(symbol);
    }

    if (metadata?.interval) {
      parts.push(metadata.interval);
    }

    // Add timestamp
    const timestamp = now.toISOString().replace(/[:.]/g, '-').replace('Z', '');
    parts.push(timestamp);

    // Add short hash for uniqueness
    const hash = createHash('md5')
      .update(JSON.stringify(metadata) + Date.now())
      .digest('hex')
      .substring(0, 8);
    parts.push(hash);

    const filename = parts.join('-') + '.png';

    return `charts/${year}/${month}/${filename}`;
  }

  /**
   * Serialize metadata for S3 tags (only string values allowed)
   */
  private serializeMetadata(metadata?: ChartMetadata): Record<string, string> | undefined {
    if (!metadata) return undefined;

    const serialized: Record<string, string> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (Array.isArray(value)) {
        serialized[key] = value.join(',');
      } else if (typeof value === 'string') {
        serialized[key] = value;
      } else if (value !== null && value !== undefined) {
        serialized[key] = String(value);
      }
    }

    return Object.keys(serialized).length > 0 ? serialized : undefined;
  }

  /**
   * Get content type from file path
   */
  private getContentTypeFromPath(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
    };
    return contentTypes[ext || ''] || 'image/png';
  }
}
