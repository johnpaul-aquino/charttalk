/**
 * Chart Storage Service
 *
 * Service for saving and managing chart image files on local disk
 */

import fs from 'fs/promises';
import path from 'path';
import type { IChartStorageService, SaveImageResult } from '../interfaces/storage.interface';
import type { IDownloadService } from '../interfaces/storage.interface';

export class ChartStorageService implements IChartStorageService {
  constructor(private downloadService: IDownloadService) {}

  /**
   * Save base64-encoded image data to local disk
   */
  async saveBase64Image(
    imageData: string,
    filename?: string,
    directory: string = '/tmp'
  ): Promise<SaveImageResult> {
    try {
      // Generate filename if not provided
      const finalFilename = filename || `chart-${Date.now()}.png`;
      const filePath = path.join(directory, finalFilename);

      // Ensure directory exists
      await fs.mkdir(directory, { recursive: true });

      // Convert base64 to buffer
      const buffer = Buffer.from(imageData, 'base64');

      // Write to file
      await fs.writeFile(filePath, buffer);

      // Get file stats
      const stats = await fs.stat(filePath);

      return {
        success: true,
        path: filePath,
        metadata: {
          size: stats.size,
          savedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Save chart from URL to local disk
   */
  async saveFromUrl(
    url: string,
    filename?: string,
    directory: string = '/tmp'
  ): Promise<SaveImageResult> {
    try {
      // Generate filename if not provided
      const finalFilename = filename || `chart-${Date.now()}.png`;
      const filePath = path.join(directory, finalFilename);

      // Download file
      const result = await this.downloadService.downloadFile(url, filePath);

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      // Get file stats
      const stats = await fs.stat(filePath);

      return {
        success: true,
        path: filePath,
        metadata: {
          size: stats.size,
          savedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete chart file from disk
   */
  async deleteChart(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }
  }
}
