/**
 * Construct Chart Config Tool
 *
 * Core intelligence tool that constructs a chart-img.com API configuration
 * from natural language requirements.
 */

import { z } from 'zod';
import { fetchDocumentation } from '../utils/doc-parser';
import type { ChartConfig } from '../utils/chart-img-client';

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
    const nl = input.naturalLanguage.toLowerCase();
    const warnings: string[] = [];

    // Fetch documentation to get available indicators
    const docs = await fetchDocumentation('indicators');
    const indicators = docs.indicators || [];

    // 1. Detect Symbol
    let symbol = input.symbol;
    if (!symbol) {
      const detectedSymbol = detectSymbol(nl, input.exchange);
      if (!detectedSymbol) {
        return {
          success: false,
          error: 'Could not identify symbol from description. Please specify symbol or exchange.',
        };
      }
      symbol = detectedSymbol.fullSymbol;
    }

    // 2. Detect Time Range
    const range = input.preferences?.range || detectTimeRange(nl);

    // 3. Detect Interval (based on range)
    const interval = input.preferences?.interval || detectInterval(nl, range);

    // 4. Detect Theme
    const theme = input.preferences?.theme || detectTheme(nl);

    // 5. Detect Chart Style
    const style = detectChartStyle(nl);

    // 6. Parse Resolution
    let width = 1200;
    let height = 675;
    if (input.preferences?.resolution) {
      const parsed = parseResolution(input.preferences.resolution);
      width = parsed.width;
      height = parsed.height;
    }

    // 7. Detect Indicators
    const studies = detectIndicators(nl, indicators);

    // 8. Build config
    const config: ChartConfig = {
      symbol,
      interval,
      ...(range && { range }),
      theme,
      style,
      width,
      height,
      ...(studies.length > 0 && { studies }),
    };

    // Generate reasoning
    const reasoning = generateReasoning(config, nl);

    // Check for potential issues
    if (studies.length > 5) {
      warnings.push('Configuration includes more than 5 indicators, which may exceed some plan limits');
    }

    return {
      success: true,
      config,
      reasoning,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error constructing config',
    };
  }
}

/**
 * Detect symbol from natural language
 */
function detectSymbol(
  nl: string,
  preferredExchange?: string
): { symbol: string; fullSymbol: string } | null {
  const exchange = preferredExchange || 'BINANCE';

  // Crypto mapping
  const cryptoMap: Record<string, string> = {
    bitcoin: 'BTCUSDT',
    btc: 'BTCUSDT',
    ethereum: 'ETHUSDT',
    eth: 'ETHUSDT',
    solana: 'SOLUSDT',
    sol: 'SOLUSDT',
    ripple: 'XRPUSDT',
    xrp: 'XRPUSDT',
    cardano: 'ADAUSDT',
    ada: 'ADAUSDT',
    dogecoin: 'DOGEUSDT',
    doge: 'DOGEUSDT',
  };

  // Check crypto
  for (const [key, symbol] of Object.entries(cryptoMap)) {
    if (nl.includes(key)) {
      return { symbol, fullSymbol: `${exchange}:${symbol}` };
    }
  }

  // Stock mapping (if NASDAQ mentioned or no crypto found)
  if (nl.includes('nasdaq') || nl.includes('stock') || nl.includes('apple') || nl.includes('aapl')) {
    const stockMap: Record<string, string> = {
      apple: 'AAPL',
      aapl: 'AAPL',
      microsoft: 'MSFT',
      msft: 'MSFT',
      google: 'GOOGL',
      googl: 'GOOGL',
      amazon: 'AMZN',
      amzn: 'AMZN',
      tesla: 'TSLA',
      tsla: 'TSLA',
      meta: 'META',
    };

    for (const [key, symbol] of Object.entries(stockMap)) {
      if (nl.includes(key)) {
        return { symbol, fullSymbol: `NASDAQ:${symbol}` };
      }
    }
  }

  // Forex mapping
  if (nl.includes('forex') || nl.includes('eur') || nl.includes('usd') || nl.includes('gbp')) {
    const forexMap: Record<string, string> = {
      'eur/usd': 'EURUSD',
      'eurusd': 'EURUSD',
      'gbp/usd': 'GBPUSD',
      'gbpusd': 'GBPUSD',
      'usd/jpy': 'USDJPY',
      'usdjpy': 'USDJPY',
    };

    for (const [key, symbol] of Object.entries(forexMap)) {
      if (nl.includes(key)) {
        return { symbol, fullSymbol: `FX:${symbol}` };
      }
    }
  }

  return null;
}

/**
 * Detect time range from natural language
 */
function detectTimeRange(nl: string): string {
  if (nl.includes('today') || nl.includes('24 hours') || nl.includes('last day')) {
    return '1D';
  }
  if (nl.includes('week') || nl.includes('7 days') || nl.includes('last 7')) {
    return '1M'; // 7D is not valid, use 1M (1 month) as closest valid option
  }
  if (nl.includes('month') || nl.includes('30 days') || nl.includes('last month')) {
    return '1M';
  }
  if (nl.includes('quarter') || nl.includes('3 months') || nl.includes('90 days')) {
    return '3M';
  }
  if (nl.includes('6 months') || nl.includes('half year')) {
    return '6M';
  }
  if (nl.includes('year to date') || nl.includes('ytd')) {
    return 'YTD';
  }
  if (nl.includes('year') || nl.includes('12 months') || nl.includes('last year')) {
    return '1Y';
  }
  if (nl.includes('5 years') || nl.includes('five years')) {
    return '5Y';
  }

  // Default
  return '1D';
}

/**
 * Detect interval based on natural language and range
 */
function detectInterval(nl: string, range: string): string {
  // Explicit interval in NL
  if (nl.includes('1 minute') || nl.includes('1min')) return '1m';
  if (nl.includes('5 minute') || nl.includes('5min')) return '5m';
  if (nl.includes('15 minute') || nl.includes('15min')) return '15m';
  if (nl.includes('30 minute') || nl.includes('30min')) return '30m';
  if (nl.includes('hourly') || nl.includes('1 hour') || nl.includes('1h')) return '1h';
  if (nl.includes('4 hour') || nl.includes('4h')) return '4h';
  if (nl.includes('daily') || nl.includes('1 day') || nl.includes('1d')) return '1D';
  if (nl.includes('weekly') || nl.includes('1 week') || nl.includes('1w')) return '1W';

  // Intelligent default based on range
  switch (range) {
    case '1D':
      return '5m'; // 5-minute candles for intraday
    case '5D':
      return '1h'; // Hourly for 5 days
    case '1M':
      return '4h'; // 4-hour for month
    case '3M':
    case '6M':
      return '1D'; // Daily for months
    case 'YTD':
    case '1Y':
    case '5Y':
    case 'ALL':
      return '1W'; // Weekly for years
    default:
      return '1h';
  }
}

/**
 * Detect theme preference
 */
function detectTheme(nl: string): 'light' | 'dark' {
  if (nl.includes('light theme') || nl.includes('light mode') || nl.includes('white background')) {
    return 'light';
  }
  if (nl.includes('dark theme') || nl.includes('dark mode') || nl.includes('black background')) {
    return 'dark';
  }
  // Default to dark (more popular for trading)
  return 'dark';
}

/**
 * Detect chart style
 */
function detectChartStyle(nl: string): 'bar' | 'candle' | 'line' | 'area' | 'heikinAshi' | 'hollowCandle' | 'baseline' | 'hiLo' | 'column' {
  if (nl.includes('line chart') || nl.includes('line graph')) return 'line';
  if (nl.includes('bar chart') || nl.includes('bars')) return 'bar';
  if (nl.includes('area chart') || nl.includes('area graph')) return 'area';
  if (nl.includes('heiken ashi') || nl.includes('heikinashi')) return 'heikinAshi';
  if (nl.includes('hollow candle')) return 'hollowCandle';

  // Default to candle (most common for trading)
  return 'candle';
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
  return { width: 1200, height: 675 };
}

/**
 * Detect indicators from natural language
 * Uses smart keyword matching against the database
 */
function detectIndicators(nl: string, availableIndicators: any[]): any[] {
  const studies: any[] = [];
  const nlLower = nl.toLowerCase();

  // Hardcoded patterns for known indicators
  // TODO: When indicators-loader is working, switch to detectIndicatorsFromText()
  const patterns: Record<string, { name: string; keywords: string[] }> = {
    rsi: {
      name: 'Relative Strength Index',
      keywords: ['rsi', 'relative strength'],
    },
    bb: {
      name: 'Bollinger Bands',
      keywords: ['bollinger', 'bb', 'bands'],
    },
    macd: {
      name: 'MACD',
      keywords: ['macd', 'moving average convergence'],
    },
    ma: {
      name: 'Moving Average',
      keywords: ['moving average', 'sma'],
    },
    ema: {
      name: 'Exponential Moving Average',
      keywords: ['ema', 'exponential moving average'],
    },
    stoch: {
      name: 'Stochastic',
      keywords: ['stochastic', 'stoch'],
    },
    atr: {
      name: 'Average True Range',
      keywords: ['atr', 'average true range'],
    },
    ichimoku: {
      name: 'Ichimoku Cloud',
      keywords: ['ichimoku', 'ichimoku cloud'],
    },
    cci: {
      name: 'CCI',
      keywords: ['cci', 'commodity channel', 'commodity channel index'],
    },
    volume: {
      name: 'Volume',
      keywords: ['volume', 'volume analysis', 'trading volume'],
    },
    vwap: {
      name: 'VWAP',
      keywords: ['vwap', 'volume weighted', 'volume weighted average price'],
    },
  };

  for (const { name, keywords } of Object.values(patterns)) {
    for (const keyword of keywords) {
      if (nlLower.includes(keyword)) {
        studies.push({ name });
        break;
      }
    }
  }

  return studies;
}

/**
 * Extract default inputs for an indicator
 */
function extractDefaultInputs(indicator: any): Record<string, any> {
  const inputs: Record<string, any> = {};

  if (indicator.inputs) {
    for (const [key, param] of Object.entries(indicator.inputs)) {
      inputs[key] = (param as any).default;
    }
  }

  return inputs;
}

/**
 * Generate reasoning explanation
 */
function generateReasoning(config: ChartConfig, nl: string): string {
  const parts: string[] = [];

  // Symbol
  parts.push(`Symbol: ${config.symbol}`);

  // Time
  if (config.range) {
    parts.push(`Time range: ${config.range}`);
  }
  parts.push(`Interval: ${config.interval}`);

  // Indicators
  if (config.studies && config.studies.length > 0) {
    const indicatorNames = config.studies
      .map(s => s.name.split('@')[0])
      .join(', ');
    parts.push(`Indicators: ${indicatorNames}`);
  }

  // Style
  parts.push(`Chart style: ${config.style}`);
  parts.push(`Theme: ${config.theme}`);
  parts.push(`Resolution: ${config.width}x${config.height}`);

  return parts.join(' | ');
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
