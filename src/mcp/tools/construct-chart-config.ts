/**
 * Construct Chart Config Tool
 *
 * Core intelligence tool that constructs a chart-img.com API configuration
 * from natural language requirements.
 */

import { z } from 'zod';
import { container, CHART_CONFIG_SERVICE } from '../../core/di';
import type { IChartConfigService, ChartConfig } from '../../modules/chart';

// Input schema
export const ConstructChartConfigInputSchema = z.object({
  naturalLanguage: z
    .string()
    .min(1)
    .describe('Natural language description of the chart requirements'),
  symbol: z
    .string()
    .optional()
    .describe('Override symbol detection (e.g., "BINANCE:BTCUSDT")'),
  exchange: z
    .string()
    .optional()
    .describe('Preferred exchange (e.g., "BINANCE", "NASDAQ")'),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark']).optional(),
      resolution: z.string().optional(),
      interval: z.string().optional(),
      range: z.string().optional(),
    })
    .optional()
    .describe('User preferences to override defaults'),
});

export type ConstructChartConfigInput = z.infer<typeof ConstructChartConfigInputSchema>;

// Output
export interface ConstructChartConfigOutput {
  success: boolean;
  config?: ChartConfig;
  reasoning?: string;
  warnings?: string[];
  error?: string;
}

/**
 * Construct chart config tool handler
 */
export async function constructChartConfigTool(
  input: ConstructChartConfigInput
): Promise<ConstructChartConfigOutput> {
  try {
    // Resolve service from DI container
    const configService = container.resolve<IChartConfigService>(CHART_CONFIG_SERVICE);

    // Call service method
    const result = await configService.constructFromNaturalLanguage(
      input.naturalLanguage,
      {
        symbol: input.symbol,
        exchange: input.exchange,
        ...input.preferences,
      }
    );

    // Transform service result to tool output
    return {
      success: result.success,
      config: result.config,
      reasoning: result.reasoning,
      warnings: result.warnings,
      error: result.success ? undefined : result.reasoning,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error constructing config',
    };
  }
}

// Tool definition for MCP server
export const constructChartConfigToolDefinition = {
  name: 'construct_chart_config',
  description: `**Core intelligence tool** that constructs a complete chart-img.com API v2 JSON configuration from natural language requirements.

This tool is the bridge between human intent and API format. It:
1. **Parses natural language** to extract chart requirements
2. **Detects symbols** from common names (Bitcoin → BINANCE:BTCUSDT)
3. **Infers time ranges** ("last 7 days" → range: "1M")
4. **Selects optimal intervals** based on range (1M → 4h interval)
5. **Identifies indicators** (Bollinger Bands, RSI, MACD, etc.)
6. **Applies sensible defaults** for missing parameters

**Symbol Detection:**
- Crypto: "Bitcoin" / "BTC" → BINANCE:BTCUSDT
- Stocks: "Apple" / "AAPL" → NASDAQ:AAPL
- Forex: "EUR/USD" → FX:EURUSD

**Time Range Detection:**
- "last 7 days" / "past week" → "1M"
- "last month" → "1M"
- "last year" → "1Y"

**Indicator Detection:**
- "Bollinger Bands" → Bollinger Bands (with default inputs: period=20, stddev=2)
- "RSI" → Relative Strength Index (with default inputs: period=14)
- "MACD" → MACD (with default inputs: fast=12, slow=26, signal=9)
- "Moving Average" → Moving Average (with default inputs: period=9)

Use this tool:
- When user provides natural language chart description
- After fetching documentation (for indicator validation)
- Before validate_chart_config and generate_chart_image

Returns:
- Complete chart configuration JSON
- Reasoning explanation
- Warnings (if any)`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      naturalLanguage: {
        type: 'string' as const,
        description: 'Natural language description of chart requirements',
      },
      symbol: {
        type: 'string' as const,
        description: 'Optional: Override symbol detection (e.g., "BINANCE:BTCUSDT")',
      },
      exchange: {
        type: 'string' as const,
        description: 'Optional: Preferred exchange (e.g., "BINANCE", "NASDAQ")',
      },
      preferences: {
        type: 'object' as const,
        properties: {
          theme: {
            type: 'string' as const,
            enum: ['light', 'dark'] as const,
            description: 'Theme preference',
          },
          resolution: {
            type: 'string' as const,
            description: 'Resolution (e.g., "1920x1080")',
          },
          interval: {
            type: 'string' as const,
            description: 'Override interval detection',
          },
          range: {
            type: 'string' as const,
            description: 'Override range detection',
          },
        },
        description: 'User preferences to override defaults',
      },
    },
    required: ['naturalLanguage'] as const,
  } as const,
};
