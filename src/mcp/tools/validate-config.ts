/**
 * Validate Config Tool
 *
 * MCP tool for validating chart configurations before submission.
 */

import { z } from 'zod';
import { container, CHART_VALIDATION_SERVICE } from '../../core/di';
import type {
  IChartValidationService,
  ChartConfig,
  ChartValidationResult,
  ValidationError
} from '../../modules/chart';

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

// Output type (same as service return type)
export type ValidateConfigOutput = ChartValidationResult;

// Re-export ValidationError
export type { ValidationError };

/**
 * Validate config tool handler
 */
export async function validateConfigTool(
  input: ValidateConfigInput
): Promise<ValidateConfigOutput> {
  try {
    const config = input.config as ChartConfig;

    // Resolve service from DI container
    const validationService = container.resolve<IChartValidationService>(CHART_VALIDATION_SERVICE);

    // Call service method
    const result = await validationService.validate(config, input.planLevel);

    return result;
  } catch (error) {
    return {
      valid: false,
      errors: [{
        field: 'general',
        message: error instanceof Error ? error.message : 'Unknown validation error',
        severity: 'error',
      }],
      suggestions: [],
      rateLimitCheck: {
        withinLimits: false,
        checks: {},
      },
    };
  }
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
  annotations: {
    title: 'Validate Chart Config',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};
