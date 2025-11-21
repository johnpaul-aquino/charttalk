/**
 * Analyze Chart Tool
 *
 * MCP tool for analyzing trading charts using AI vision capabilities.
 * Provides technical analysis, trading signals, and risk assessment.
 */

import { z } from 'zod';
import { container, AI_ANALYSIS_SERVICE } from '../../core/di';
import type {
  IAIAnalysisService,
  AnalysisResult,
  TradingSignal,
} from '../../modules/analysis';

// Input schema
export const AnalyzeChartInputSchema = z.object({
  // Image input (one required)
  chartUrl: z
    .string()
    .url()
    .optional()
    .describe('URL of the chart image to analyze'),
  chartPath: z
    .string()
    .optional()
    .describe('Local file path to the chart image'),
  imageData: z
    .string()
    .optional()
    .describe('Base64-encoded chart image data'),

  // Chart metadata
  symbol: z
    .string()
    .min(1)
    .describe('Trading symbol (e.g., BINANCE:BTCUSDT, NASDAQ:AAPL)'),
  interval: z
    .string()
    .min(1)
    .describe('Chart timeframe (e.g., 15m, 1h, 4h, 1D)'),

  // Analysis configuration
  customPrompt: z
    .string()
    .optional()
    .describe('Custom analysis prompt (overrides default prompts)'),

  tradingStyle: z
    .enum(['day_trading', 'swing_trading', 'scalping'])
    .optional()
    .default('swing_trading')
    .describe('Trading style context for analysis'),

  includeRiskManagement: z
    .boolean()
    .optional()
    .default(true)
    .describe('Include risk management recommendations in analysis'),

  confidenceThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe('Minimum confidence threshold for signal generation (0-1)'),

  generateSignal: z
    .boolean()
    .optional()
    .default(true)
    .describe('Generate actionable trading signal if setup is valid'),
});

export type AnalyzeChartInput = z.infer<typeof AnalyzeChartInputSchema>;

// Output type
export interface AnalyzeChartOutput {
  success: boolean;

  // Analysis results
  analysis?: {
    trend: 'bullish' | 'bearish' | 'neutral';
    signals: string[];
    recommendation: 'LONG' | 'SHORT' | 'NEUTRAL';
    confidence: number;
    analysisText: string;

    // Price levels
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    riskRewardRatio?: number;

    // Key levels
    keyLevels?: {
      support: number[];
      resistance: number[];
    };
  };

  // Trading signal (if requested and valid)
  tradingSignal?: TradingSignal;

  // Metadata
  metadata?: {
    model: string;
    tokensUsed: number;
    processingTime: number;
  };

  // Error
  error?: string;
}

/**
 * Analyze chart tool handler
 *
 * Uses AI vision capabilities to analyze trading charts and provide:
 * - Technical analysis (trend, indicators, patterns)
 * - Trading signals (entry, stop loss, take profit)
 * - Market sentiment
 * - Risk assessment
 *
 * @param input - Chart analysis input
 * @returns Structured analysis result
 */
export async function analyzeChartTool(
  input: AnalyzeChartInput
): Promise<AnalyzeChartOutput> {
  try {
    // Validate input - at least one image source required
    if (!input.chartUrl && !input.chartPath && !input.imageData) {
      return {
        success: false,
        error:
          'At least one of chartUrl, chartPath, or imageData must be provided',
      };
    }

    // Resolve AI Analysis Service from DI container
    const analysisService =
      container.resolve<IAIAnalysisService>(AI_ANALYSIS_SERVICE);

    // Build analysis request
    const analysisRequest = {
      chartUrl: input.chartUrl,
      chartPath: input.chartPath,
      symbol: input.symbol,
      interval: input.interval,
      prompt: input.customPrompt,
      options: {
        tradingStyle: input.tradingStyle,
        includeRiskManagement: input.includeRiskManagement,
        confidenceThreshold: input.confidenceThreshold,
      },
    };

    // Perform analysis
    const analysisResult: AnalysisResult = await analysisService.analyzeChart(
      analysisRequest
    );

    // Check if analysis failed
    if (!analysisResult.success) {
      return {
        success: false,
        error: analysisResult.error || 'Chart analysis failed',
        metadata: analysisResult.metadata,
      };
    }

    // Generate trading signal if requested
    let tradingSignal: TradingSignal | null = null;
    if (input.generateSignal) {
      tradingSignal = await analysisService.generateSignal(analysisResult);
    }

    // Format output
    return {
      success: true,
      analysis: {
        trend: analysisResult.analysis!.trend,
        signals: analysisResult.analysis!.signals,
        recommendation: analysisResult.analysis!.recommendation,
        confidence: analysisResult.analysis!.confidence,
        analysisText: analysisResult.analysis!.analysisText,
        entryPrice: analysisResult.analysis!.entryPrice,
        stopLoss: analysisResult.analysis!.stopLoss,
        takeProfit: analysisResult.analysis!.takeProfit,
        riskRewardRatio: analysisResult.analysis!.riskRewardRatio,
        keyLevels: analysisResult.analysis!.keyLevels,
      },
      tradingSignal: tradingSignal || undefined,
      metadata: analysisResult.metadata,
    };
  } catch (error) {
    console.error('Error in analyzeChartTool:', error);

    // Handle specific error types
    let errorMessage = 'An unexpected error occurred during chart analysis';

    if (error instanceof Error) {
      if (error.message.includes('OPENAI_API_KEY')) {
        errorMessage =
          'OpenAI API key not configured. Please set OPENAI_API_KEY in .env file.';
      } else if (error.message.includes('rate limit')) {
        errorMessage =
          'OpenAI API rate limit exceeded. Please try again later.';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Tool definition for MCP server registration
 */
export const analyzeChartToolDefinition = {
  name: 'analyze_chart',
  description:
    'Analyzes trading charts using AI vision capabilities. Provides comprehensive technical analysis including trend identification, trading signals with entry/stop/target levels, market sentiment assessment, and risk management recommendations. Supports day trading, swing trading, and scalping strategies across multiple timeframes.',
  inputSchema: {
    type: 'object',
    properties: {
      chartUrl: {
        type: 'string',
        description: 'URL of the chart image to analyze',
      },
      chartPath: {
        type: 'string',
        description: 'Local file path to the chart image',
      },
      imageData: {
        type: 'string',
        description: 'Base64-encoded chart image data',
      },
      symbol: {
        type: 'string',
        description: 'Trading symbol (e.g., BINANCE:BTCUSDT, NASDAQ:AAPL)',
      },
      interval: {
        type: 'string',
        description: 'Chart timeframe (e.g., 15m, 1h, 4h, 1D)',
      },
      customPrompt: {
        type: 'string',
        description: 'Custom analysis prompt (overrides default prompts)',
      },
      tradingStyle: {
        type: 'string',
        enum: ['day_trading', 'swing_trading', 'scalping'],
        description: 'Trading style context for analysis',
        default: 'swing_trading',
      },
      includeRiskManagement: {
        type: 'boolean',
        description: 'Include risk management recommendations',
        default: true,
      },
      confidenceThreshold: {
        type: 'number',
        description: 'Minimum confidence threshold for signal generation (0-1)',
        default: 0.5,
      },
      generateSignal: {
        type: 'boolean',
        description: 'Generate actionable trading signal if setup is valid',
        default: true,
      },
    },
    required: ['symbol', 'interval'],
  },
  annotations: {
    readOnlyHint: false,
    idempotentHint: true,
    destructiveHint: false,
  },
};
