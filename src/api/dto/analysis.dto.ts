/**
 * Analysis API DTOs
 *
 * Request/response types and Zod validation schemas for chart analysis endpoints
 *
 * @module api/dto
 */

import { z } from 'zod';

/**
 * Chart Analysis Request Schema
 *
 * Validates incoming requests for chart analysis.
 * Supports both image URL and base64 image data.
 */
export const AnalyzeChartRequestSchema = z.object({
  // Image input (one of url, imageData, or localPath required)
  imageUrl: z.string().url().optional(),
  imageData: z.string().optional(),
  localPath: z.string().optional(),

  // Chart metadata
  symbol: z.string().min(1, 'Symbol is required'),
  interval: z.string().min(1, 'Interval is required'),

  // Analysis configuration
  model: z
    .enum(['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'])
    .optional()
    .describe('LLM model to use for analysis'),

  analysisTypes: z
    .array(
      z.enum(['technical', 'sentiment', 'signals', 'risk'])
    )
    .optional()
    .default(['technical', 'sentiment', 'signals', 'risk'])
    .describe('Types of analysis to perform'),

  customPrompt: z
    .string()
    .optional()
    .describe('Custom analysis prompt (overrides default)'),

  // Analysis options
  tradingStyle: z
    .enum(['day_trading', 'swing_trading', 'scalping'])
    .optional()
    .default('swing_trading')
    .describe('Trading style context for analysis'),

  includeRiskManagement: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include risk management recommendations'),

  confidenceThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe('Minimum confidence for signal generation'),
}).refine(
  (data) => data.imageUrl || data.imageData || data.localPath,
  {
    message: 'At least one of imageUrl, imageData, or localPath must be provided',
  }
);

export type AnalyzeChartRequest = z.infer<typeof AnalyzeChartRequestSchema>;

/**
 * Chart Analysis Response Schema
 *
 * Defines the structure of the analysis response
 */
export const AnalyzeChartResponseSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      // Analysis results
      trend: z.enum(['bullish', 'bearish', 'neutral']),
      signals: z.array(z.string()),
      recommendation: z.enum(['LONG', 'SHORT', 'NEUTRAL']),
      confidence: z.number().min(0).max(1),
      analysisText: z.string(),

      // Price levels (optional)
      entryPrice: z.number().optional(),
      stopLoss: z.number().optional(),
      takeProfit: z.number().optional(),
      riskRewardRatio: z.number().optional(),

      // Key levels (optional)
      keyLevels: z
        .object({
          support: z.array(z.number()),
          resistance: z.array(z.number()),
        })
        .optional(),

      // Trading signal (if generated)
      tradingSignal: z
        .object({
          type: z.enum(['LONG', 'SHORT', 'NEUTRAL']),
          symbol: z.string(),
          entryPrice: z.number(),
          stopLoss: z.number(),
          takeProfit: z.number(),
          confidence: z.number(),
          reasoning: z.string(),
          timestamp: z.string(),
        })
        .optional(),
    })
    .optional(),

  // Metadata
  metadata: z
    .object({
      model: z.string(),
      tokensUsed: z.number(),
      processingTime: z.number(),
    })
    .optional(),

  // Error (if failed)
  error: z.string().optional(),
});

export type AnalyzeChartResponse = z.infer<typeof AnalyzeChartResponseSchema>;

/**
 * Error response schema
 */
export const AnalysisErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }),
  meta: z.object({
    timestamp: z.string(),
    path: z.string().optional(),
    method: z.string().optional(),
  }),
});

export type AnalysisErrorResponse = z.infer<typeof AnalysisErrorResponseSchema>;
