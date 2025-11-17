/**
 * Storage Module Interfaces
 *
 * Defines contracts for file storage and download operations
 */

export interface SaveImageResult {
  success: boolean;
  path?: string;
  metadata?: {
    size: number;
    savedAt: string;
  };
  error?: string;
}

export interface DownloadResult {
  success: boolean;
  filePath?: string;
  size?: number;
  error?: string;
}

// Service Interfaces

export interface IChartStorageService {
  /**
   * Save base64-encoded image data to local disk
   */
  saveBase64Image(
    imageData: string,
    filename?: string,
    directory?: string
  ): Promise<SaveImageResult>;

  /**
   * Save chart from URL to local disk
   */
  saveFromUrl(
    url: string,
    filename?: string,
    directory?: string
  ): Promise<SaveImageResult>;

  /**
   * Delete chart file
   */
  deleteChart(filePath: string): Promise<void>;
}

export interface IDownloadService {
  /**
   * Download file from URL
   */
  downloadFile(url: string, destPath: string): Promise<DownloadResult>;

  /**
   * Download chart and return file path
   */
  downloadChart(chartUrl: string): Promise<string>;
}

// Cloud Storage Interfaces

export interface ChartMetadata {
  symbol?: string;
  interval?: string;
  indicators?: string[];
  generatedAt?: string;
  source?: string;
  [key: string]: any;
}

export interface S3UploadResult {
  success: boolean;
  url?: string;           // S3 URL or CloudFront URL
  bucket?: string;
  key?: string;
  size?: number;
  uploadedAt?: string;
  metadata?: ChartMetadata;
  error?: string;
}

export interface ICloudStorageService {
  /**
   * Upload chart from URL to S3
   */
  uploadFromUrl(
    chartUrl: string,
    metadata?: ChartMetadata
  ): Promise<S3UploadResult>;

  /**
   * Upload base64-encoded chart to S3
   */
  uploadBase64(
    imageData: string,
    metadata?: ChartMetadata
  ): Promise<S3UploadResult>;

  /**
   * Upload local file to S3
   */
  uploadFile(
    filePath: string,
    metadata?: ChartMetadata
  ): Promise<S3UploadResult>;

  /**
   * Generate presigned URL for temporary access
   */
  getPresignedUrl(key: string, expiresIn?: number): Promise<string>;

  /**
   * Delete chart from S3
   */
  deleteChart(key: string): Promise<void>;

  /**
   * List charts with optional prefix filter
   */
  listCharts(prefix?: string): Promise<string[]>;
}
