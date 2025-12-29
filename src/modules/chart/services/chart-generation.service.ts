/**
 * Chart Generation Service
 *
 * Service for generating chart images by calling the chart-img.com API.
 * Handles validation, API calls, response transformation, and per-user rate limiting.
 */

import type {
  IChartGenerationService,
  ChartConfig,
  ChartGenerationResult,
  ChartUserContext,
} from '../interfaces/chart.interface';
import { ChartImgClient } from '../../../mcp/utils/chart-img-client';
import type { UserRateLimitService } from '../../user/services/user-rate-limit.service';

export class ChartGenerationService implements IChartGenerationService {
  private rateLimitService?: UserRateLimitService;

  constructor(private client: ChartImgClient) {}

  /**
   * Set the rate limit service (optional - for per-user rate limiting)
   */
  setRateLimitService(service: UserRateLimitService): void {
    this.rateLimitService = service;
  }

  /**
   * Generate a chart image
   *
   * @param config - Chart configuration
   * @param storage - Whether to use storage endpoint (returns URL)
   * @param format - Image format (png or jpeg)
   * @param userContext - Optional user context for rate limiting
   */
  async generateChart(
    config: ChartConfig,
    storage: boolean = true,
    format: 'png' | 'jpeg' = 'png',
    userContext?: ChartUserContext
  ): Promise<ChartGenerationResult> {
    try {
      // Check per-user rate limit if user context is provided
      let rateLimitInfo: ChartGenerationResult['rateLimit'] | undefined;

      if (userContext && this.rateLimitService) {
        const rateLimitResult = await this.rateLimitService.checkAndIncrement(
          userContext.userId,
          userContext.plan
        );

        rateLimitInfo = {
          remaining: rateLimitResult.remaining,
          limit: rateLimitResult.limit,
          resetsAt: rateLimitResult.resetsAt.toISOString(),
        };

        if (!rateLimitResult.allowed) {
          return {
            success: false,
            error: rateLimitResult.error || 'Rate limit exceeded',
            metadata: {
              format: '',
              resolution: '',
              generatedAt: new Date().toISOString(),
            },
            apiResponse: {
              statusCode: 429,
            },
            rateLimit: rateLimitInfo,
          };
        }
      }

      // Call the API client
      const response = await this.client.generateChart(config, storage, format);

      // If API call failed and we incremented the counter, roll it back
      if (!response.success && userContext && this.rateLimitService) {
        await this.rateLimitService.decrementCount(userContext.userId);
        // Update remaining count after rollback
        if (rateLimitInfo) {
          rateLimitInfo.remaining += 1;
        }
      }

      // Transform to ChartGenerationResult (structures are the same)
      return {
        success: response.success,
        imageUrl: response.imageUrl,
        imageData: response.imageData,
        localPath: response.localPath,
        metadata: response.metadata,
        apiResponse: response.apiResponse,
        error: response.error,
        rateLimit: rateLimitInfo,
      };
    } catch (error) {
      // Rollback rate limit counter on error
      if (userContext && this.rateLimitService) {
        await this.rateLimitService.decrementCount(userContext.userId);
      }

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
   *
   * @param config - Chart configuration
   * @param filePath - Path to save the file
   * @param format - Image format (png or jpeg)
   * @param userContext - Optional user context for rate limiting
   */
  async generateChartToFile(
    config: ChartConfig,
    filePath: string,
    format: 'png' | 'jpeg' = 'png',
    userContext?: ChartUserContext
  ): Promise<ChartGenerationResult> {
    try {
      // Check per-user rate limit if user context is provided
      let rateLimitInfo: ChartGenerationResult['rateLimit'] | undefined;

      if (userContext && this.rateLimitService) {
        const rateLimitResult = await this.rateLimitService.checkAndIncrement(
          userContext.userId,
          userContext.plan
        );

        rateLimitInfo = {
          remaining: rateLimitResult.remaining,
          limit: rateLimitResult.limit,
          resetsAt: rateLimitResult.resetsAt.toISOString(),
        };

        if (!rateLimitResult.allowed) {
          return {
            success: false,
            error: rateLimitResult.error || 'Rate limit exceeded',
            metadata: {
              format: '',
              resolution: '',
              generatedAt: new Date().toISOString(),
            },
            apiResponse: {
              statusCode: 429,
            },
            rateLimit: rateLimitInfo,
          };
        }
      }

      // Call the API client
      const response = await this.client.generateChartToFile(config, filePath, format);

      // If API call failed and we incremented the counter, roll it back
      if (!response.success && userContext && this.rateLimitService) {
        await this.rateLimitService.decrementCount(userContext.userId);
        if (rateLimitInfo) {
          rateLimitInfo.remaining += 1;
        }
      }

      // Transform to ChartGenerationResult
      return {
        success: response.success,
        localPath: filePath,
        metadata: response.metadata,
        apiResponse: response.apiResponse,
        error: response.error,
        rateLimit: rateLimitInfo,
      };
    } catch (error) {
      // Rollback rate limit counter on error
      if (userContext && this.rateLimitService) {
        await this.rateLimitService.decrementCount(userContext.userId);
      }

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
