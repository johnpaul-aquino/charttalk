/**
 * Chart Validation Service
 *
 * Service for validating chart configurations before API submission.
 * Checks plan limits, field requirements, and parameter validity.
 */

import type {
  IChartValidationService,
  ChartConfig,
  ChartValidationResult,
  ValidationError,
  RateLimitCheck,
} from '../interfaces/chart.interface';
import { fetchDocumentation } from '../../../mcp/utils/doc-parser';
import { validateDrawingInput, findDrawingByName } from '../../../core/database/loaders/drawings.loader';

export class ChartValidationService implements IChartValidationService {
  /**
   * Validate chart configuration
   */
  async validate(
    config: ChartConfig,
    planLevel: string = 'PRO'
  ): Promise<ChartValidationResult> {
    const errors: ValidationError[] = [];
    const suggestions: string[] = [];

    // Fetch documentation for validation
    const docs = await fetchDocumentation('all');
    const rateLimits = docs.all?.rateLimits || {};
    const chartParams = docs.all?.chartParameters;
    const planLimits = rateLimits[planLevel];

    // 1. Validate required fields
    if (!config.symbol) {
      errors.push({
        field: 'symbol',
        message: 'Symbol is required',
        severity: 'error',
      });
    }

    // 2. Validate symbol format
    if (config.symbol && !config.symbol.includes(':')) {
      errors.push({
        field: 'symbol',
        message: 'Symbol must be in EXCHANGE:SYMBOL format (e.g., "BINANCE:BTCUSDT")',
        severity: 'error',
      });
    }

    // 3. Validate interval
    if (config.interval && chartParams?.intervals) {
      const validIntervals = chartParams.intervals;
      if (!validIntervals.includes(config.interval)) {
        errors.push({
          field: 'interval',
          message: `Invalid interval "${config.interval}". Valid values: ${validIntervals.join(', ')}`,
          severity: 'error',
        });
      }
    }

    // 4. Validate range
    if (config.range && chartParams?.ranges) {
      const validRanges = chartParams.ranges;
      if (!validRanges.includes(config.range)) {
        errors.push({
          field: 'range',
          message: `Invalid range "${config.range}". Valid values: ${validRanges.join(', ')}`,
          severity: 'warning',
        });
      }
    }

    // 5. Validate resolution against plan limits
    const resolutionError = this.validateResolution(
      config.width || 1200,
      config.height || 675,
      planLevel
    );
    if (resolutionError) {
      errors.push(resolutionError);
    }

    // 6. Validate study count against plan limits
    const studyCount = config.studies?.length || 0;
    const studyError = this.validateStudyCount(studyCount, planLevel);
    if (studyError) {
      errors.push(studyError);
      suggestions.push(
        `Consider removing ${studyCount - (planLimits?.maxStudies || 5)} studies to fit within ${planLevel} plan limits.`
      );
    }

    // 7. Validate drawing count against plan limits
    const drawingCount = config.drawings?.length || 0;
    const drawingError = this.validateDrawingCount(drawingCount, planLevel);
    if (drawingError) {
      errors.push(drawingError);
    }

    // 8. Validate drawings configuration
    if (config.drawings) {
      for (const drawing of config.drawings) {
        // Find the drawing definition
        const drawingDef = findDrawingByName(drawing.name);

        if (!drawingDef) {
          errors.push({
            field: `drawings.${drawing.name}`,
            message: `Unknown drawing: ${drawing.name}`,
            severity: 'error',
          });
          continue;
        }

        // Validate drawing input
        const validationErrors = validateDrawingInput(drawingDef, drawing.input);
        if (validationErrors.length > 0) {
          errors.push({
            field: `drawings.${drawing.name}`,
            message: `Invalid drawing configuration: ${validationErrors.join(', ')}`,
            severity: 'error',
          });
        }
      }
    }

    // Build rate limit check
    const rateLimitCheck = this.buildRateLimitCheck(
      config,
      planLevel,
      planLimits
    );

    return {
      valid: errors.filter((e) => e.severity === 'error').length === 0,
      errors,
      suggestions,
      rateLimitCheck,
    };
  }

  /**
   * Validate resolution against plan limits
   */
  validateResolution(
    width: number,
    height: number,
    planLevel: string
  ): ValidationError | null {
    const planResolutions: Record<string, { maxWidth: number; maxHeight: number }> = {
      BASIC: { maxWidth: 800, maxHeight: 600 },
      PRO: { maxWidth: 1920, maxHeight: 1080 },
      MEGA: { maxWidth: 1920, maxHeight: 1600 },
      ULTRA: { maxWidth: 2048, maxHeight: 1920 },
      ENTERPRISE: { maxWidth: 2048, maxHeight: 1920 },
    };

    const limits = planResolutions[planLevel] || planResolutions.PRO;

    if (width > limits.maxWidth || height > limits.maxHeight) {
      return {
        field: 'resolution',
        message: `Resolution ${width}x${height} exceeds ${planLevel} plan limit of ${limits.maxWidth}x${limits.maxHeight}`,
        severity: 'error',
      };
    }

    return null;
  }

  /**
   * Validate study count against plan limits
   */
  validateStudyCount(studyCount: number, planLevel: string): ValidationError | null {
    const planStudyLimits: Record<string, number> = {
      BASIC: 3,
      PRO: 5,
      MEGA: 10,
      ULTRA: 25,
      ENTERPRISE: 50,
    };

    const maxStudies = planStudyLimits[planLevel] || 5;

    if (studyCount > maxStudies) {
      return {
        field: 'studies',
        message: `Study count (${studyCount}) exceeds ${planLevel} plan limit (${maxStudies})`,
        severity: 'error',
      };
    }

    return null;
  }

  /**
   * Validate drawing count against plan limits
   */
  validateDrawingCount(drawingCount: number, planLevel: string): ValidationError | null {
    const planDrawingLimits: Record<string, number> = {
      BASIC: 5,
      PRO: 10,
      MEGA: 20,
      ULTRA: 50,
      ENTERPRISE: 100,
    };

    const maxDrawings = planDrawingLimits[planLevel] || 10;

    if (drawingCount > maxDrawings) {
      return {
        field: 'drawings',
        message: `Drawing count (${drawingCount}) exceeds ${planLevel} plan limit (${maxDrawings})`,
        severity: 'error',
      };
    }

    return null;
  }

  /**
   * Build rate limit check result
   */
  private buildRateLimitCheck(
    config: ChartConfig,
    planLevel: string,
    planLimits: any
  ): RateLimitCheck {
    const checks: RateLimitCheck['checks'] = {};

    // Resolution check
    const resolutionError = this.validateResolution(
      config.width || 1200,
      config.height || 675,
      planLevel
    );
    checks.resolution = {
      pass: !resolutionError,
      message: resolutionError
        ? resolutionError.message
        : `Resolution within ${planLevel} limits`,
    };

    // Study count check
    const studyCount = config.studies?.length || 0;
    const studyError = this.validateStudyCount(studyCount, planLevel);
    checks.studyCount = {
      pass: !studyError,
      message: studyError
        ? studyError.message
        : `Study count (${studyCount}) within ${planLevel} limits`,
    };

    // Drawing count check
    const drawingCount = config.drawings?.length || 0;
    const drawingError = this.validateDrawingCount(drawingCount, planLevel);
    checks.drawingCount = {
      pass: !drawingError,
      message: drawingError
        ? drawingError.message
        : `Drawing count (${drawingCount}) within ${planLevel} limits`,
    };

    const withinLimits =
      checks.resolution.pass && checks.studyCount.pass && checks.drawingCount.pass;

    return {
      withinLimits,
      checks,
    };
  }
}
