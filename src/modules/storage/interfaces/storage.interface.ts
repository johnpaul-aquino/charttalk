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
