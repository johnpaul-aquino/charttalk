/**
 * S3 Client Service
 *
 * Low-level wrapper around AWS SDK for S3 operations.
 * Handles upload, download, delete, and presigned URL generation.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  StorageClass,
  type PutObjectCommandInput,
  type GetObjectCommandInput,
  type DeleteObjectCommandInput,
  type ListObjectsV2CommandInput,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getConfig } from '../../../shared/config/environment.config';
import { Readable } from 'stream';

export interface UploadOptions {
  key: string;
  body: Buffer | Readable | string;
  contentType?: string;
  metadata?: Record<string, string>;
  storageClass?: string;
}

export interface UploadResponse {
  success: boolean;
  location?: string;
  bucket?: string;
  key?: string;
  error?: string;
}

export class S3ClientService {
  private client: S3Client;
  private bucket: string;
  private region: string;
  private cloudFrontDomain?: string;

  constructor() {
    const config = getConfig();

    // Initialize S3 client with credentials from config
    this.client = new S3Client({
      region: config.aws.region,
      credentials: config.aws.accessKeyId && config.aws.secretAccessKey
        ? {
            accessKeyId: config.aws.accessKeyId,
            secretAccessKey: config.aws.secretAccessKey,
          }
        : undefined, // Use default credential provider chain if not specified
    });

    this.bucket = config.aws.s3.bucket;
    this.region = config.aws.s3.bucketRegion;
    this.cloudFrontDomain = config.aws.s3.cloudFrontDomain;
  }

  /**
   * Upload file to S3
   */
  async upload(options: UploadOptions): Promise<UploadResponse> {
    try {
      const config = getConfig();

      const params: PutObjectCommandInput = {
        Bucket: this.bucket,
        Key: options.key,
        Body: options.body,
        ContentType: options.contentType || 'image/png',
        StorageClass: (options.storageClass || config.aws.s3.storageClass) as StorageClass,
        Metadata: options.metadata,
      };

      // Use multipart upload for large files
      if (Buffer.isBuffer(options.body) && options.body.length > 5 * 1024 * 1024) {
        const upload = new Upload({
          client: this.client,
          params,
        });

        await upload.done();
      } else {
        const command = new PutObjectCommand(params);
        await this.client.send(command);
      }

      // Generate URL (CloudFront if available, otherwise S3)
      const url = this.getPublicUrl(options.key);

      return {
        success: true,
        location: url,
        bucket: this.bucket,
        key: options.key,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Download file from S3
   */
  async download(key: string): Promise<{ success: boolean; data?: Buffer; error?: string }> {
    try {
      const params: GetObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
      };

      const command = new GetObjectCommand(params);
      const response = await this.client.send(command);

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      const stream = response.Body as Readable;

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      return {
        success: true,
        data: buffer,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Delete file from S3
   */
  async delete(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      const params: DeleteObjectCommandInput = {
        Bucket: this.bucket,
        Key: key,
      };

      const command = new DeleteObjectCommand(params);
      await this.client.send(command);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delete failed',
      };
    }
  }

  /**
   * Generate presigned URL for temporary access
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * List objects with optional prefix
   */
  async listObjects(prefix?: string): Promise<{ keys: string[]; error?: string }> {
    try {
      const params: ListObjectsV2CommandInput = {
        Bucket: this.bucket,
        Prefix: prefix,
      };

      const command = new ListObjectsV2Command(params);
      const response = await this.client.send(command);

      const keys = response.Contents?.map((obj) => obj.Key).filter((key): key is string => !!key) || [];

      return { keys };
    } catch (error) {
      return {
        keys: [],
        error: error instanceof Error ? error.message : 'List failed',
      };
    }
  }

  /**
   * Check if object exists
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get public URL for object
   */
  private getPublicUrl(key: string): string {
    if (this.cloudFrontDomain) {
      return `https://${this.cloudFrontDomain}/${key}`;
    }
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Get bucket name
   */
  getBucket(): string {
    return this.bucket;
  }

  /**
   * Get region
   */
  getRegion(): string {
    return this.region;
  }
}
