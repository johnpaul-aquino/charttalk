/**
 * Chart Controller
 *
 * HTTP request handlers for chart-related endpoints.
 * Uses DI container to resolve services.
 */

import { container } from '../../core/di';
import {
  CHART_CONFIG_SERVICE,
  CHART_VALIDATION_SERVICE,
  CHART_GENERATION_SERVICE,
  CHART_STORAGE_SERVICE,
  CHART_IMG_CLIENT,
} from '../../core/di/tokens';
import type {
  IChartConfigService,
  IChartValidationService,
  IChartGenerationService,
} from '../../modules/chart/interfaces/chart.interface';
import type { IChartStorageService } from '../../modules/storage/interfaces/storage.interface';
import type { ChartImgClient } from '../../mcp/utils/chart-img-client';
import {
  type ConstructChartConfigRequest,
  type ConstructChartConfigResponse,
  type ValidateChartConfigRequest,
  type ValidateChartConfigResponse,
  type GenerateChartImageRequest,
  type GenerateChartImageResponse,
  type SaveChartImageRequest,
  type SaveChartImageResponse,
} from '../dto/chart.dto';
import { Errors } from '../utils/error.util';

/**
 * Chart Controller Class
 */
export class ChartController {
  private configService: IChartConfigService;
  private validationService: IChartValidationService;
  private generationService: IChartGenerationService;
  private storageService: IChartStorageService;
  private chartImgClient: ChartImgClient;

  constructor() {
    // Resolve services from DI container
    this.configService = container.resolve<IChartConfigService>(CHART_CONFIG_SERVICE);
    this.validationService = container.resolve<IChartValidationService>(CHART_VALIDATION_SERVICE);
    this.generationService = container.resolve<IChartGenerationService>(CHART_GENERATION_SERVICE);
    this.storageService = container.resolve<IChartStorageService>(CHART_STORAGE_SERVICE);
    this.chartImgClient = container.resolve<ChartImgClient>(CHART_IMG_CLIENT);
  }

  /**
   * Construct chart configuration from natural language
   */
  async constructChartConfig(
    request: ConstructChartConfigRequest
  ): Promise<ConstructChartConfigResponse> {
    const result = await this.configService.constructFromNaturalLanguage(
      request.naturalLanguage,
      {
        symbol: request.symbol,
        exchange: request.exchange,
        theme: request.preferences?.theme,
        interval: request.preferences?.interval,
        range: request.preferences?.range,
        resolution: request.preferences?.resolution,
      }
    );

    if (!result.success || !result.config) {
      throw Errors.invalidConfig(
        result.warnings?.[0] || 'Failed to construct chart configuration',
        { warnings: result.warnings }
      );
    }

    return {
      config: result.config,
      reasoning: result.reasoning || 'Configuration constructed successfully',
      warnings: result.warnings,
    };
  }

  /**
   * Validate chart configuration
   */
  async validateChartConfig(
    request: ValidateChartConfigRequest
  ): Promise<ValidateChartConfigResponse> {
    const result = await this.validationService.validate(
      request.config,
      request.planLevel
    );

    return {
      valid: result.valid,
      errors: result.errors,
      suggestions: result.suggestions,
      rateLimitCheck: result.rateLimitCheck,
    };
  }

  /**
   * Generate chart image
   */
  async generateChartImage(
    request: GenerateChartImageRequest
  ): Promise<GenerateChartImageResponse> {
    // First validate the config
    const validation = await this.validationService.validate(request.config);
    if (!validation.valid) {
      throw Errors.invalidConfig(
        'Chart configuration validation failed',
        { errors: validation.errors, suggestions: validation.suggestions }
      );
    }

    // Generate the chart
    const result = await this.generationService.generateChart(
      request.config,
      request.storage,
      request.format
    );

    if (!result.success) {
      throw Errors.chartGenerationFailed(
        result.error || 'Chart generation failed',
        { apiResponse: result.apiResponse }
      );
    }

    return {
      imageUrl: result.imageUrl,
      imageData: result.imageData,
      localPath: result.localPath,
      metadata: {
        format: request.format,
        width: request.config.width || 1200,
        height: request.config.height || 675,
        generatedAt: new Date().toISOString(),
      },
      apiResponse: {
        statusCode: result.apiResponse?.statusCode || 200,
        rateLimitRemaining: result.apiResponse?.rateLimitRemaining,
        rateLimitReset: result.apiResponse?.rateLimitReset,
      },
    };
  }

  /**
   * Save chart image from base64 data
   */
  async saveChartImage(
    request: SaveChartImageRequest
  ): Promise<SaveChartImageResponse> {
    const result = await this.storageService.saveBase64Image(
      request.imageData,
      request.filename,
      request.directory
    );

    if (!result.success) {
      throw Errors.internalError('Failed to save chart image', {
        error: result.error,
      });
    }

    // Extract filename from path
    const filename = result.path!.split('/').pop() || 'unknown';

    return {
      path: result.path!,
      filename,
      size: result.metadata!.size,
      savedAt: result.metadata!.savedAt,
    };
  }

  /**
   * Get available exchanges
   */
  async getExchanges(forceRefresh: boolean = false) {
    const result = await this.chartImgClient.getExchanges(forceRefresh);

    if (!result.success) {
      throw Errors.externalApiError(
        'chart-img.com',
        result.error || 'Failed to fetch exchanges'
      );
    }

    return result.exchanges || [];
  }

  /**
   * Get symbols for an exchange
   */
  async getSymbols(
    exchange: string,
    search?: string,
    limit: number = 50,
    forceRefresh: boolean = false
  ) {
    const result = await this.chartImgClient.getSymbols(
      exchange,
      search,
      limit,
      forceRefresh
    );

    if (!result.success) {
      if (result.error?.includes('not found')) {
        throw Errors.exchangeNotFound(exchange);
      }
      throw Errors.externalApiError(
        'chart-img.com',
        result.error || 'Failed to fetch symbols'
      );
    }

    return result.symbols || [];
  }
}

/**
 * Singleton instance
 */
export const chartController = new ChartController();
