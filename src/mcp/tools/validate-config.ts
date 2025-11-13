/**
 * Validate Config Tool
 *
 * MCP tool for validating chart configurations before submission.
 */

import { z } from 'zod';
import { fetchDocumentation } from '../utils/doc-parser.js';
import type { ChartConfig } from '../utils/chart-img-client.js';
import { getAllDrawings, validateDrawingInput } from '../../lib/drawings-loader';

// Input schema
export const ValidateConfigInputSchema = z.object({
  config: z.any().describe('Chart configuration object to validate'),
  planLevel: z
    .enum(['BASIC', 'PRO', 'MEGA', 'ULTRA', 'ENTERPRISE'])
    .optional()
    .default('PRO')
    .describe('Plan level for rate limit validation'),
});

export type ValidateConfigInput = z.infer<typeof ValidateConfigInputSchema>;

// Output
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidateConfigOutput {
  valid: boolean;
  errors: ValidationError[];
  suggestions: string[];
  rateLimitCheck: {
    withinLimits: boolean;
    studyCount: number;
    maxStudies: number;
    resolution: string;
    maxResolution: string;
  };
}

/**
 * Validate config tool handler
 */
export async function validateConfigTool(
  input: ValidateConfigInput
): Promise<ValidateConfigOutput> {
  const config = input.config as ChartConfig;
  const errors: ValidationError[] = [];
  const suggestions: string[] = [];

  // Fetch documentation for validation
  const docs = await fetchDocumentation('all');
  const rateLimits = docs.all?.rateLimits || {};
  const chartParams = docs.all?.chartParameters;

  const planLimits = rateLimits[input.planLevel];

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
    if (!chartParams.intervals.includes(config.interval)) {
      errors.push({
        field: 'interval',
        message: `Invalid interval "${config.interval}". Valid values: ${chartParams.intervals.join(', ')}`,
        severity: 'error',
      });
    }
  }

  // 4. Validate range
  if (config.range && chartParams?.ranges) {
    if (!chartParams.ranges.includes(config.range)) {
      errors.push({
        field: 'range',
        message: `Invalid range "${config.range}". Valid values: ${chartParams.ranges.join(', ')}`,
        severity: 'error',
      });
    }
  }

  // 5. Validate theme
  if (config.theme && chartParams?.themes) {
    if (!chartParams.themes.includes(config.theme)) {
      errors.push({
        field: 'theme',
        message: `Invalid theme "${config.theme}". Valid values: ${chartParams.themes.join(', ')}`,
        severity: 'error',
      });
    }
  }

  // 6. Validate style
  if (config.style && chartParams?.styles) {
    if (!chartParams.styles.includes(config.style)) {
      errors.push({
        field: 'style',
        message: `Invalid style "${config.style}". Valid values: ${chartParams.styles.join(', ')}`,
        severity: 'error',
      });
    }
  }

  // 7. Validate resolution against plan limits
  const width = config.width || 1200;
  const height = config.height || 675;
  const resolution = `${width}x${height}`;

  if (planLimits) {
    const maxRes = parseResolution(planLimits.maxResolution);

    if (width > maxRes.width || height > maxRes.height) {
      errors.push({
        field: 'resolution',
        message: `Resolution ${resolution} exceeds ${input.planLevel} plan limit of ${planLimits.maxResolution}`,
        severity: 'error',
      });

      suggestions.push(
        `Reduce resolution to ${planLimits.maxResolution} or upgrade plan`
      );
    }
  }

  // 8. Validate studies count
  const studyCount = config.studies?.length || 0;
  const maxStudies = planLimits?.maxStudies || 5;

  if (studyCount > maxStudies) {
    errors.push({
      field: 'studies',
      message: `Study count (${studyCount}) exceeds ${input.planLevel} plan limit (${maxStudies})`,
      severity: 'error',
    });

    suggestions.push(
      `Remove ${studyCount - maxStudies} indicator(s) or upgrade plan`
    );
  }

  // 9. Validate drawings count and parameters
  const drawingCount = config.drawings?.length || 0;
  if (drawingCount > maxStudies) {
    errors.push({
      field: 'drawings',
      message: `Drawing count (${drawingCount}) may exceed plan limits (max: ${maxStudies})`,
      severity: 'warning',
    });
  }

  // Validate individual drawing parameters
  if (config.drawings && config.drawings.length > 0) {
    const allDrawings = getAllDrawings();
    for (let i = 0; i < config.drawings.length; i++) {
      const drawing = config.drawings[i];
      const drawingDef = allDrawings.find(d => d.name === drawing.name);

      if (drawingDef) {
        // Validate input parameters
        const inputErrors = validateDrawingInput(drawingDef, drawing.input);
        for (const error of inputErrors) {
          errors.push({
            field: `drawings[${i}]`,
            message: error,
            severity: 'error',
          });
        }
      } else {
        errors.push({
          field: `drawings[${i}]`,
          message: `Unknown drawing type: ${drawing.name}`,
          severity: 'warning',
        });
      }

      // Validate color format in overrides
      if (drawing.override?.lineColor) {
        const colorValue = drawing.override.lineColor;
        if (!isValidColorFormat(colorValue)) {
          errors.push({
            field: `drawings[${i}].override.lineColor`,
            message: `Invalid color format: "${colorValue}". Use RGB (e.g., "rgb(255,0,0)") or RGBA (e.g., "rgba(255,0,0,0.5)")`,
            severity: 'error',
          });
        }
      }
    }
  }

  // 10. Validate indicator names (if available)
  if (config.studies && docs.all?.indicators) {
    for (const study of config.studies) {
      const indicator = docs.all.indicators.find(ind => ind.name === study.name);
      if (!indicator) {
        errors.push({
          field: 'studies',
          message: `Unknown indicator: ${study.name}`,
          severity: 'warning',
        });
      }
    }
  }

  // Generate suggestions for warnings
  if (errors.some(e => e.severity === 'warning') && errors.length === 1) {
    suggestions.push('Configuration is valid but has warnings. Consider reviewing them.');
  }

  // Check if valid
  const hasErrors = errors.some(e => e.severity === 'error');

  return {
    valid: !hasErrors,
    errors,
    suggestions,
    rateLimitCheck: {
      withinLimits: studyCount <= maxStudies && (width <= parseResolution(planLimits?.maxResolution || '1920x1080').width),
      studyCount,
      maxStudies,
      resolution,
      maxResolution: planLimits?.maxResolution || '1920x1080',
    },
  };
}

/**
 * Parse resolution string
 */
function parseResolution(resolution: string): { width: number; height: number } {
  const match = resolution.match(/(\d+)x(\d+)/);
  if (match) {
    return {
      width: parseInt(match[1]),
      height: parseInt(match[2]),
    };
  }
  return { width: 1920, height: 1080 };
}

/**
 * Validate RGB/RGBA color format
 */
function isValidColorFormat(color: string): boolean {
  // Match RGB: rgb(r,g,b) where r,g,b are 0-255
  const rgbRegex = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/;
  // Match RGBA: rgba(r,g,b,a) where r,g,b are 0-255 and a is 0-1
  const rgbaRegex = /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0?\.\d+|1\.0|1)\s*\)$/;

  const rgbMatch = color.match(rgbRegex);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    return r <= 255 && g <= 255 && b <= 255;
  }

  const rgbaMatch = color.match(rgbaRegex);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1]);
    const g = parseInt(rgbaMatch[2]);
    const b = parseInt(rgbaMatch[3]);
    const a = parseFloat(rgbaMatch[4]);
    return r <= 255 && g <= 255 && b <= 255 && a >= 0 && a <= 1;
  }

  return false;
}

// Tool definition for MCP server
export const validateConfigToolDefinition = {
  name: 'validate_chart_config',
  description: `Validates a chart configuration against chart-img.com API constraints and plan limits before submission.

This tool performs comprehensive pre-flight validation:

**Required Field Checks:**
- Symbol presence and format (EXCHANGE:SYMBOL)
- Valid interval values
- Valid range values

**Plan Limit Validation:**
- Resolution limits (e.g., BASIC: 800×600, PRO: 1920×1080)
- Study/indicator count limits
- Drawing count limits

**Parameter Validation:**
- Theme (light/dark)
- Style (candle, line, bar, etc.)
- Indicator names
- Input parameters

**Returns:**
- \`valid\`: Boolean indicating if config passes validation
- \`errors\`: Array of validation errors with field, message, and severity
- \`suggestions\`: Actionable recommendations to fix issues
- \`rateLimitCheck\`: Detailed breakdown of limit compliance

Use this tool:
- After construct_chart_config, before generate_chart_image
- When debugging failed chart generation
- To check if config fits within plan limits
- For pre-submission quality assurance

Example errors:
- "Resolution 1920x1080 exceeds BASIC plan limit of 800x600"
- "Study count (6) exceeds PRO plan limit (5)"
- "Invalid interval '2h'. Valid values: 1m, 5m, 15m, 1h, 4h, 1D, 1W"`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      config: {
        type: 'object' as const,
        description: 'Chart configuration to validate',
      },
      planLevel: {
        type: 'string' as const,
        enum: ['BASIC', 'PRO', 'MEGA', 'ULTRA', 'ENTERPRISE'] as const,
        description: 'Plan level for rate limit validation',
        default: 'PRO',
      },
    },
    required: ['config'] as const,
  } as const,
};
