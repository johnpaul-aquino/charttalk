/**
 * Generate Multi-Timeframe Charts Tool
 *
 * MCP tool for generating multiple charts in parallel for multi-timeframe analysis.
 * Supports HTF (Higher Timeframe), ETF (Execution Timeframe), LTF (Lower Timeframe).
 */

import { z } from 'zod';
import {
  container,
  MULTI_TIMEFRAME_CHART_SERVICE,
} from '../../core/di';
import type { MultiTimeframeChartService } from '../../modules/chart/services/multi-timeframe-chart.service';
import type {
  MultiTimeframeRequest,
  MultiTimeframeChartResult,
  TimeframeConfig,
} from '../../modules/analysis/interfaces/multi-timeframe.interface';

// Timeframe config schema
const TimeframeConfigSchema = z.object({
  role: z.enum(['htf', 'etf', 'ltf']).describe('Timeframe role: htf (Higher), etf (Execution), ltf (Lower)'),
  interval: z.string().describe('Chart interval (e.g., "1D", "4h", "15m")'),
  indicators: z.array(z.string()).describe('Indicators to display (e.g., ["RSI", "MACD", "EMA 20"])'),
});

// Input schema
export const GenerateMultiTimeframeChartsInputSchema = z.object({
  symbol: z.string().describe('Trading symbol (e.g., "BINANCE:BTCUSDT", "NASDAQ:AAPL")'),
  exchange: z.string().optional().describe('Preferred exchange (e.g., "BINANCE", "NASDAQ")'),
  timeframes: z.array(TimeframeConfigSchema).optional().describe('Explicit timeframe configurations'),
  naturalLanguage: z.string().optional().describe('Alternative: describe analysis in natural language'),
  theme: z.enum(['light', 'dark']).optional().default('dark').describe('Chart theme'),
});

export type GenerateMultiTimeframeChartsInput = z.infer<typeof GenerateMultiTimeframeChartsInputSchema>;

export type GenerateMultiTimeframeChartsOutput = MultiTimeframeChartResult;

/**
 * Generate multi-timeframe charts tool handler
 */
export async function generateMultiTimeframeChartsTool(
  input: GenerateMultiTimeframeChartsInput
): Promise<GenerateMultiTimeframeChartsOutput> {
  try {
    // Resolve service from DI container
    const mtfChartService = container.resolve<MultiTimeframeChartService>(
      MULTI_TIMEFRAME_CHART_SERVICE
    );

    // Build request
    const request: MultiTimeframeRequest = {
      symbol: input.symbol,
      exchange: input.exchange,
      timeframes: input.timeframes as TimeframeConfig[] | undefined,
      naturalLanguage: input.naturalLanguage,
      theme: input.theme,
    };

    // Generate charts in parallel
    const result = await mtfChartService.generateMultiTimeframeCharts(request);

    return result;
  } catch (error) {
    return {
      success: false,
      requestId: '',
      charts: [],
      timing: { total: 0, perChart: [] },
      errors: [error instanceof Error ? error.message : 'Unknown error generating multi-timeframe charts'],
    };
  }
}

// Tool definition for MCP server
export const generateMultiTimeframeChartsToolDefinition = {
  name: 'generate_multi_timeframe_charts',
  description: `Generates multiple charts in parallel for multi-timeframe trading analysis.

**Purpose:**
Professional traders analyze markets using multiple timeframes:
- **HTF (Higher Timeframe)**: Trend direction and major S/R levels (e.g., Daily)
- **ETF (Execution Timeframe)**: Entry zone identification (e.g., 4H)
- **LTF (Lower Timeframe)**: Precise entry timing (e.g., 15m)

This tool generates all required charts in a single call using parallel execution.

**Input Options:**

**Option 1: Explicit Timeframes**
\`\`\`json
{
  "symbol": "BINANCE:BTCUSDT",
  "timeframes": [
    { "role": "htf", "interval": "1D", "indicators": ["EMA 20", "EMA 50", "SMA 200"] },
    { "role": "etf", "interval": "4h", "indicators": ["RSI", "MACD"] },
    { "role": "ltf", "interval": "15m", "indicators": ["RSI"] }
  ]
}
\`\`\`

**Option 2: Natural Language**
\`\`\`json
{
  "symbol": "BINANCE:BTCUSDT",
  "naturalLanguage": "Analyze BTC with HTF: 1D, ETF: 4H, LTF: 15m. Use EMA 20/50, RSI 14, MACD"
}
\`\`\`

**Trading Style Presets (auto-detected from natural language):**
- **Day Trading**: HTF=4h, ETF=1h, LTF=15m
- **Swing Trading**: HTF=1D, ETF=4h, LTF=1h
- **Scalping**: HTF=1h, ETF=15m, LTF=5m

**Returns:**
- \`success\`: Boolean indicating all charts generated
- \`requestId\`: Unique ID for this chart set (use for analysis)
- \`charts\`: Array of chart info objects with:
  - \`id\`: Chart UUID
  - \`role\`: htf, etf, or ltf
  - \`imageUrl\`: Chart URL (expires in 7 days)
  - \`s3Url\`: Permanent S3 URL (if S3 configured)
  - \`indicators\`: Applied indicators
  - \`interval\`: Chart interval
- \`timing\`: Performance metrics
  - \`total\`: Total generation time (ms)
  - \`perChart\`: Time per chart (ms)
- \`errors\`: Any errors encountered

**Workflow:**
1. **generate_multi_timeframe_charts** ← You are here
2. analyze_multi_timeframe (cascade analysis using requestId)

**Note:** Charts are stored in an in-memory registry by requestId. Use the requestId with analyze_multi_timeframe for HTF-first cascade analysis.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      symbol: {
        type: 'string' as const,
        description: 'Trading symbol (e.g., "BINANCE:BTCUSDT", "NASDAQ:AAPL")',
      },
      exchange: {
        type: 'string' as const,
        description: 'Preferred exchange (e.g., "BINANCE", "NASDAQ")',
      },
      timeframes: {
        type: 'array' as const,
        description: 'Explicit timeframe configurations',
        items: {
          type: 'object' as const,
          properties: {
            role: {
              type: 'string' as const,
              enum: ['htf', 'etf', 'ltf'] as const,
              description: 'Timeframe role',
            },
            interval: {
              type: 'string' as const,
              description: 'Chart interval (e.g., "1D", "4h", "15m")',
            },
            indicators: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Indicators to display',
            },
          },
          required: ['role', 'interval', 'indicators'],
        },
      },
      naturalLanguage: {
        type: 'string' as const,
        description: 'Natural language description of analysis requirements',
      },
      theme: {
        type: 'string' as const,
        enum: ['light', 'dark'] as const,
        description: 'Chart theme. Default: dark',
        default: 'dark',
      },
    },
    required: ['symbol'],
  },
  annotations: {
    title: 'Generate Multi-Timeframe Charts',
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
  },
};
