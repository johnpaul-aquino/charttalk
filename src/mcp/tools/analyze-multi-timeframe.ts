/**
 * Analyze Multi-Timeframe Tool
 *
 * MCP tool for performing cascade analysis across multiple timeframes.
 *
 * Supports two modes:
 * 1. **Fixed Role Mode** (Legacy): Uses htf/etf/ltf roles (3 timeframes max)
 * 2. **Flexible Mode** (New): Any number of timeframes, sorted by interval
 *
 * The AI model determines which timeframes to request and how to interpret them.
 */

import { z } from 'zod';
import {
  container,
  MULTI_TIMEFRAME_ANALYSIS_SERVICE,
  CHART_REGISTRY_SERVICE,
} from '../../core/di';
import type { MultiTimeframeAnalysisService } from '../../modules/analysis/services/multi-timeframe-analysis.service';
import type { ChartRegistryService } from '../../modules/chart/services/chart-registry.service';
import type {
  MultiTimeframeAnalysis,
  FlexibleMultiTimeframeAnalysis,
  ChartInfo,
} from '../../modules/analysis/interfaces/multi-timeframe.interface';
import { sortByIntervalDescending } from '../../shared/utils/interval.utils';

// Input schema - role is now optional for flexible mode
export const AnalyzeMultiTimeframeInputSchema = z.object({
  requestId: z.string().optional().describe('Request ID from generate_multi_timeframe_charts'),
  charts: z.array(z.object({
    role: z.enum(['htf', 'etf', 'ltf']).optional(), // Optional for flexible mode
    imageUrl: z.string(),
    symbol: z.string(),
    interval: z.string(),
    indicators: z.array(z.string()).optional(),
  })).optional().describe('Direct chart inputs (alternative to requestId)'),
  symbol: z.string().describe('Trading symbol for analysis'),
  tradingStyle: z.string().optional().describe('Trading style (e.g., "day_trading", "swing_trading", "scalping")'),
  tradingRules: z.string().optional().describe('Custom trading rules to apply'),
  flexibleMode: z.boolean().optional().default(true).describe('Use flexible analysis (any number of timeframes)'),
});

export type AnalyzeMultiTimeframeInput = z.infer<typeof AnalyzeMultiTimeframeInputSchema>;

// Output can be either legacy format or flexible format
export interface AnalyzeMultiTimeframeOutput {
  success: boolean;
  error?: string;
  // Legacy fields (for backwards compatibility)
  requestId: string;
  symbol: string;
  htf?: MultiTimeframeAnalysis['htf'];
  etf?: MultiTimeframeAnalysis['etf'];
  ltf?: MultiTimeframeAnalysis['ltf'];
  synthesis?: MultiTimeframeAnalysis['synthesis'];
  analyzedAt: Date;
  // Flexible mode fields
  timeframeAnalyses?: FlexibleMultiTimeframeAnalysis['timeframeAnalyses'];
  flexibleMode?: boolean;
}

/**
 * Analyze multi-timeframe tool handler
 *
 * Supports both:
 * - Flexible mode (default): Any number of timeframes, sorted by interval
 * - Legacy mode: Fixed htf/etf/ltf roles
 */
export async function analyzeMultiTimeframeTool(
  input: AnalyzeMultiTimeframeInput
): Promise<AnalyzeMultiTimeframeOutput> {
  try {
    // Resolve services from DI container
    const analysisService = container.resolve<MultiTimeframeAnalysisService>(
      MULTI_TIMEFRAME_ANALYSIS_SERVICE
    );
    const registryService = container.resolve<ChartRegistryService>(
      CHART_REGISTRY_SERVICE
    );

    // Get charts either from registry or direct input
    let charts: ChartInfo[];

    if (input.requestId) {
      // Retrieve charts from registry
      const registry = registryService.getRegistry(input.requestId);
      if (!registry) {
        return {
          success: false,
          error: `No chart registry found for requestId: ${input.requestId}`,
          requestId: input.requestId,
          symbol: input.symbol,
          analyzedAt: new Date(),
        };
      }
      charts = registry.getAllCharts();
    } else if (input.charts && input.charts.length > 0) {
      // Use direct chart inputs (role is now optional)
      charts = input.charts.map((c) => ({
        id: crypto.randomUUID(),
        role: c.role, // May be undefined in flexible mode
        imageUrl: c.imageUrl,
        symbol: c.symbol,
        interval: c.interval,
        indicators: c.indicators || [],
        config: { symbol: c.symbol, interval: c.interval },
        generatedAt: new Date(),
      }));
    } else {
      return {
        success: false,
        error: 'Either requestId or charts array is required',
        requestId: '',
        symbol: input.symbol,
        analyzedAt: new Date(),
      };
    }

    // Validate minimum chart count (at least 2 for meaningful MTF analysis)
    if (charts.length < 2) {
      return {
        success: false,
        error: 'At least 2 charts are required for multi-timeframe analysis',
        requestId: input.requestId || '',
        symbol: input.symbol,
        analyzedAt: new Date(),
      };
    }

    // Sort charts by interval (highest to lowest) for flexible analysis
    const sortedCharts = sortByIntervalDescending(charts);

    // Check if we should use legacy mode (all charts have htf/etf/ltf roles)
    const hasAllRoles = charts.every((c) => c.role);
    const useLegacyMode = input.flexibleMode === false || (hasAllRoles && charts.length <= 3);

    if (useLegacyMode) {
      // Legacy mode: require HTF and ETF
      const hasHTF = charts.some((c) => c.role === 'htf');
      const hasETF = charts.some((c) => c.role === 'etf');

      if (!hasHTF || !hasETF) {
        return {
          success: false,
          error: 'Legacy mode requires both HTF and ETF charts. Set flexibleMode: true for any-timeframe analysis.',
          requestId: input.requestId || '',
          symbol: input.symbol,
          analyzedAt: new Date(),
        };
      }

      // Perform legacy cascade analysis
      const analysis = await analysisService.analyzeMultiTimeframe(charts, {
        symbol: input.symbol,
        tradingStyle: input.tradingStyle as 'day_trading' | 'swing_trading' | 'scalping' | undefined,
        tradingRules: input.tradingRules,
      });

      return {
        success: true,
        flexibleMode: false,
        ...analysis,
      };
    }

    // Flexible mode: use interval-based sorting and cascade analysis
    const flexibleAnalysis = await analysisService.analyzeFlexibleMultiTimeframe(sortedCharts, {
      symbol: input.symbol,
      tradingStyle: input.tradingStyle as 'day_trading' | 'swing_trading' | 'scalping' | undefined,
      tradingRules: input.tradingRules,
    });

    return {
      success: true,
      flexibleMode: true,
      requestId: flexibleAnalysis.requestId,
      symbol: flexibleAnalysis.symbol,
      timeframeAnalyses: flexibleAnalysis.timeframeAnalyses,
      synthesis: flexibleAnalysis.synthesis,
      analyzedAt: flexibleAnalysis.analyzedAt,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during analysis',
      requestId: input.requestId || '',
      symbol: input.symbol,
      analyzedAt: new Date(),
    };
  }
}

// Tool definition for MCP server
export const analyzeMultiTimeframeToolDefinition = {
  name: 'analyze_multi_timeframe',
  description: `Performs cascade analysis across multiple timeframes for trading decisions.

**Two Modes:**

1. **Flexible Mode (Default)** - Accepts ANY number of timeframes (2, 3, 4, 5, or more)
   - Charts are automatically sorted by interval (highest to lowest)
   - Each lower timeframe receives context from ALL higher timeframes
   - Great for custom trading setups with multiple timeframes

2. **Legacy Mode** - Uses fixed HTF/ETF/LTF roles (3 timeframes max)
   - Set \`flexibleMode: false\` to use this mode
   - Requires charts to have role: "htf", "etf", or "ltf"

**Example: Flexible Mode (4 timeframes)**
\`\`\`json
{
  "charts": [
    { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "1W" },
    { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "1D" },
    { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "4h" },
    { "imageUrl": "...", "symbol": "BINANCE:BTCUSDT", "interval": "1h" }
  ],
  "symbol": "BINANCE:BTCUSDT"
}
\`\`\`

**Example: Using requestId**
\`\`\`json
{
  "requestId": "uuid-from-generate",
  "symbol": "BINANCE:BTCUSDT",
  "tradingRules": "Only trade with trend. Wait for pullback entry."
}
\`\`\`

**Cascade Analysis Flow:**
\`\`\`
1W (position 0) → Trend: bullish, Bias: LONG, Key levels
     ↓ context passed
1D (position 1) → Confirms trend? Entry zone identified
     ↓ context passed
4H (position 2) → Refines entry zone, signals
     ↓ context passed
1H (position 3) → Precise entry, SL, TP levels
     ↓
SYNTHESIS → Recommendation, confidence, trade plan
\`\`\`

**Trading Styles:**
- \`day_trading\`: Intraday trades (4h → 1h → 15m typical)
- \`swing_trading\`: Multi-day trades (1W → 1D → 4h typical)
- \`scalping\`: Quick trades (1h → 15m → 5m typical)

**Returns (Flexible Mode):**
- \`timeframeAnalyses\`: Array of analysis for each timeframe (ordered highest to lowest)
  - \`interval\`: The timeframe (e.g., "1W", "1D")
  - \`position\`: 0 = highest, 1 = second highest, etc.
  - \`trend\`: bullish/bearish/neutral
  - \`trendStrength\`: strong/moderate/weak
  - \`keyLevels\`: { support: [], resistance: [] }
  - \`alignsWithHigherTF\`: Does this TF confirm higher TFs?
  - \`signals\`: ["RSI oversold", "MACD cross", ...]
  - \`entryZone\`: { low, high } (for lower TFs)
  - \`reasoning\`: AI explanation

- \`synthesis\`: Final recommendation
  - \`recommendation\`: LONG/SHORT/NEUTRAL
  - \`confidence\`: 0.0-1.0
  - \`alignment\`: full/partial/none
  - \`tradePlan\`: { entry, stopLoss, takeProfit[], riskPercentage }

**Key Principle:**
The AI model (you) decides which timeframes to use based on the user's trading style.
The system generates and sorts charts; you interpret the analysis.`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      requestId: {
        type: 'string' as const,
        description: 'Request ID from generate_multi_timeframe_charts',
      },
      charts: {
        type: 'array' as const,
        description: 'Direct chart inputs (alternative to requestId). At least 2 charts required.',
        items: {
          type: 'object' as const,
          properties: {
            role: {
              type: 'string' as const,
              enum: ['htf', 'etf', 'ltf'] as const,
              description: 'Timeframe role (optional in flexible mode)',
            },
            imageUrl: {
              type: 'string' as const,
              description: 'Chart image URL',
            },
            symbol: {
              type: 'string' as const,
              description: 'Trading symbol',
            },
            interval: {
              type: 'string' as const,
              description: 'Chart interval (e.g., "1W", "1D", "4h", "15m")',
            },
            indicators: {
              type: 'array' as const,
              items: { type: 'string' as const },
              description: 'Indicators on the chart',
            },
          },
          required: ['imageUrl', 'symbol', 'interval'], // role is now optional
        },
      },
      symbol: {
        type: 'string' as const,
        description: 'Trading symbol for analysis',
      },
      tradingStyle: {
        type: 'string' as const,
        description: 'Trading style (day_trading, swing_trading, scalping)',
      },
      tradingRules: {
        type: 'string' as const,
        description: 'Custom trading rules to apply during analysis',
      },
      flexibleMode: {
        type: 'boolean' as const,
        description: 'Use flexible analysis (default: true). Set to false for legacy HTF/ETF/LTF mode.',
      },
    },
    required: ['symbol'],
  },
  annotations: {
    title: 'Analyze Multi-Timeframe Charts',
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
  },
};
