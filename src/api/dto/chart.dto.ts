/**
 * Chart DTOs
 *
 * Data transfer objects for chart-related endpoints.
 */

import { z } from 'zod';
import { PlanLevelSchema } from './common.dto';

/**
 * Chart Configuration
 */
export const ChartConfigSchema = z.object({
  symbol: z.string().regex(/^[A-Z_]+:[A-Z0-9]+$/, 'Symbol must be in EXCHANGE:SYMBOL format'),
  interval: z.string(),
  range: z.string().optional(),
  theme: z.enum(['light', 'dark']).optional(),
  style: z.enum(['candle', 'line', 'bar', 'area', 'heikinAshi', 'hollowCandle', 'baseline', 'hiLo', 'column']).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  studies: z
    .array(
      z.object({
        name: z.string(),
        input: z.record(z.any()).optional(),
      })
    )
    .optional(),
  drawings: z
    .array(
      z.object({
        name: z.string(),
        input: z.record(z.any()),
      })
    )
    .optional(),
});

export type ChartConfigDto = z.infer<typeof ChartConfigSchema>;

/**
 * Construct Chart Config Request
 */
export const ConstructChartConfigRequestSchema = z.object({
  naturalLanguage: z.string().min(1, 'Natural language description is required'),
  exchange: z.string().optional(),
  symbol: z.string().optional(),
  preferences: z
    .object({
      interval: z.string().optional(),
      range: z.string().optional(),
      theme: z.enum(['light', 'dark']).optional(),
      resolution: z.string().optional(),
    })
    .optional(),
});

export type ConstructChartConfigRequest = z.infer<typeof ConstructChartConfigRequestSchema>;

/**
 * Construct Chart Config Response
 */
export interface ConstructChartConfigResponse {
  config: ChartConfigDto;
  reasoning: string;
  warnings?: string[];
}

/**
 * Validate Chart Config Request
 */
export const ValidateChartConfigRequestSchema = z.object({
  config: ChartConfigSchema,
  planLevel: PlanLevelSchema.default('PRO'),
});

export type ValidateChartConfigRequest = z.infer<typeof ValidateChartConfigRequestSchema>;

/**
 * Validation Error
 */
export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Rate Limit Check
 */
export interface RateLimitCheck {
  withinLimits: boolean;
  checks: {
    resolution?: {
      pass: boolean;
      message: string;
    };
    studyCount?: {
      pass: boolean;
      message: string;
    };
    drawingCount?: {
      pass: boolean;
      message: string;
    };
  };
}

/**
 * Validate Chart Config Response
 */
export interface ValidateChartConfigResponse {
  valid: boolean;
  errors: ValidationError[];
  suggestions: string[];
  rateLimitCheck: RateLimitCheck;
}

/**
 * Generate Chart Image Request
 */
export const GenerateChartImageRequestSchema = z.object({
  config: ChartConfigSchema,
  format: z.enum(['png', 'jpeg']).default('png'),
  storage: z.boolean().default(true),
  saveToFile: z.boolean().default(false),
  filename: z.string().optional(),
});

export type GenerateChartImageRequest = z.infer<typeof GenerateChartImageRequestSchema>;

/**
 * Generate Chart Image Response
 */
export interface GenerateChartImageResponse {
  imageUrl?: string;
  imageData?: string;
  localPath?: string;
  metadata: {
    format: string;
    width: number;
    height: number;
    generatedAt: string;
  };
  apiResponse: {
    statusCode: number;
    rateLimitRemaining?: number;
    rateLimitReset?: number;
  };
}

/**
 * Save Chart Image Request
 */
export const SaveChartImageRequestSchema = z.object({
  imageData: z.string().min(1, 'Image data is required'),
  filename: z.string().optional(),
  directory: z.string().optional(),
});

export type SaveChartImageRequest = z.infer<typeof SaveChartImageRequestSchema>;

/**
 * Save Chart Image Response
 */
export interface SaveChartImageResponse {
  path: string;
  filename: string;
  size: number;
  savedAt: string;
}
