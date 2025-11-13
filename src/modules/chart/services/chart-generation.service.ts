/**
 * Chart Generation Service
 *
 * Service for generating chart images by calling the chart-img.com API.
 * Handles validation, API calls, and response transformation.
 */

import type {
  IChartGenerationService,
  ChartConfig,
  ChartGenerationResult,
} from '../interfaces/chart.interface';
import { ChartImgClient } from '../../../mcp/utils/chart-img-client';

export class ChartGenerationService implements IChartGenerationService {
  constructor(private client: ChartImgClient) {}

  /**
   * Generate a chart image
   */
  async generateChart(
    config: ChartConfig,
    storage: boolean = true,
    format: 'png' | 'jpeg' = 'png'
  ): Promise<ChartGenerationResult> {
    try {
      // Call the API client
      const response = await this.client.generateChart(config, storage, format);

      // Transform to ChartGenerationResult (structures are the same)
      return {
        success: response.success,
        imageUrl: response.imageUrl,
        imageData: response.imageData,
        localPath: response.localPath,
        metadata: response.metadata,
        apiResponse: response.apiResponse,
        error: response.error,
      };
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          format: '',
          resolution: '',
          generatedAt: new Date().toISOString(),
        },
        apiResponse: {
          statusCode: 500,
        },
      };
    }
  }

  /**
   * Generate a chart and save directly to file
   */
  async generateChartToFile(
    config: ChartConfig,
    filePath: string,
    format: 'png' | 'jpeg' = 'png'
  ): Promise<ChartGenerationResult> {
    try {
      // Call the API client
      const response = await this.client.generateChartToFile(config, filePath, format);

      // Transform to ChartGenerationResult
      return {
        success: response.success,
        localPath: filePath,
        metadata: response.metadata,
        apiResponse: response.apiResponse,
        error: response.error,
      };
    } catch (error) {
      // Handle unexpected errors
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          format: '',
          resolution: '',
          generatedAt: new Date().toISOString(),
        },
        apiResponse: {
          statusCode: 500,
        },
      };
    }
  }
}
