/**
 * Download Service
 *
 * Service for downloading files from URLs with timeout protection
 */

import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';
import type { IDownloadService, DownloadResult } from '../interfaces/storage.interface';
import { fetchWithTimeout, DEFAULT_TIMEOUTS } from '@/shared/utils';

export class DownloadService implements IDownloadService {
  /**
   * Download file from URL to destination path with timeout protection
   */
  async downloadFile(url: string, destPath: string): Promise<DownloadResult> {
    try {
      const response = await fetchWithTimeout(url, {
        timeout: DEFAULT_TIMEOUTS.DOWNLOAD,
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to download: HTTP ${response.status}`,
        };
      }

      if (!response.body) {
        return {
          success: false,
          error: 'Response body is null',
        };
      }

      // Ensure destination directory exists
      const dir = path.dirname(destPath);
      await fs.mkdir(dir, { recursive: true });

      // Stream response to file
      await pipeline(response.body as any, createWriteStream(destPath));

      // Get file size
      const stats = await fs.stat(destPath);

      return {
        success: true,
        filePath: destPath,
        size: stats.size,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Download chart from URL and return file path
   * Saves to /tmp by default with timestamp-based filename
   */
  async downloadChart(chartUrl: string): Promise<string> {
    const timestamp = Date.now();
    const filename = `chart-${timestamp}.png`;
    const destPath = path.join('/tmp', filename);

    const result = await this.downloadFile(chartUrl, destPath);

    if (!result.success) {
      throw new Error(`Failed to download chart: ${result.error}`);
    }

    return result.filePath!;
  }
}
