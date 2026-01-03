/**
 * Chart Configuration Service
 *
 * Service for constructing chart configurations from natural language.
 * Contains intelligence logic for symbol detection, indicator parsing, etc.
 */

import type {
  IChartConfigService,
  ChartConfig,
  ChartConfigConstructionResult,
  ChartStudy,
  ChartDrawing,
} from '../interfaces/chart.interface';
import type { IndicatorsRepository } from '../repositories/indicators.repository';
import type { DrawingsRepository } from '../repositories/drawings.repository';
import { detectDrawingsFromText, buildDrawingConfig } from '../../../core/database/loaders/drawings.loader';
import { parseIndicatorsWithParams } from '../../../core/database/loaders/indicators.loader';
import {
  validateSymbol,
  isValidExchange,
  getSuggestedExchanges,
} from '../../../core/database/loaders/exchanges.loader';

export class ChartConfigService implements IChartConfigService {
  constructor(
    private indicatorsRepo: IndicatorsRepository,
    private drawingsRepo: DrawingsRepository
  ) {}

  /**
   * Construct chart configuration from natural language
   */
  async constructFromNaturalLanguage(
    naturalLanguage: string,
    preferences?: {
      symbol?: string;
      exchange?: string;
      interval?: string;
      range?: string;
      theme?: 'light' | 'dark';
      resolution?: string;
    }
  ): Promise<ChartConfigConstructionResult> {
    try {
      const nl = naturalLanguage.toLowerCase();
      const warnings: string[] = [];

      // 1. Detect Symbol
      let symbol = preferences?.symbol;
      if (!symbol) {
        const detectedSymbol = this.detectSymbol(nl, preferences?.exchange);
        if (!detectedSymbol) {
          return {
            success: false,
            config: {} as ChartConfig,
            reasoning: 'Failed to detect symbol',
            warnings: ['Could not identify symbol from description. Please specify symbol or exchange.'],
          };
        }
        symbol = detectedSymbol.fullSymbol;
      }

      // 2. Detect Time Range
      const range = preferences?.range || this.detectTimeRange(nl);

      // 3. Detect Interval (based on range)
      const interval = preferences?.interval || this.detectInterval(nl, range);

      // 4. Detect Theme
      const theme = preferences?.theme || this.detectTheme(nl);

      // 5. Detect Chart Style
      const style = this.detectChartStyle(nl);

      // 6. Parse Resolution (optimized for token-efficient AI analysis)
      let width = 800;
      let height = 450;
      if (preferences?.resolution) {
        const parsed = this.parseResolution(preferences.resolution);
        width = parsed.width;
        height = parsed.height;
      }

      // 7. Detect Indicators (database-driven with parameter parsing)
      const studies = this.detectIndicators(nl);

      // 8. Detect Drawings
      const drawings = await this.detectDrawings(nl);

      // Build config
      const config: ChartConfig = {
        symbol,
        interval,
        range,
        theme,
        style,
        width,
        height,
        studies: studies.length > 0 ? studies : undefined,
        drawings: drawings.length > 0 ? drawings : undefined,
      };

      // Generate reasoning
      const reasoning = this.generateReasoning(config, nl);

      return {
        success: true,
        config,
        reasoning,
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        config: {} as ChartConfig,
        reasoning: 'Error constructing configuration',
        warnings: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Detect and validate symbol from text
   *
   * Strategy:
   * 1. Check for explicit EXCHANGE:SYMBOL format first (validate exchange)
   * 2. Fall back to common symbol shortcuts for user convenience
   * 3. The LLM should provide explicit symbols - this is just a fallback
   *
   * @param text - Natural language text or explicit symbol
   * @param preferredExchange - Optional preferred exchange override
   * @returns Validated symbol object or null
   */
  detectSymbol(
    text: string,
    preferredExchange?: string
  ): { symbol: string; exchange: string; fullSymbol: string } | null {
    const nl = text.toLowerCase();

    // 1. Check for explicit EXCHANGE:SYMBOL format (e.g., "BINANCE:BTCUSDT", "FX:XAUUSD")
    // This regex matches common TradingView symbol formats including:
    // - Standard: BINANCE:BTCUSDT, NASDAQ:AAPL
    // - Perpetual: BYBIT:BTCUSDT.P
    // - Futures: CME:ES1!, COMEX:GC1!
    // - Special: PANCAKESWAP:XRPCUSD_4314AC
    const explicitSymbolMatch = text.match(/\b([A-Z0-9_]+):([A-Z0-9_.!\/]+)\b/i);
    if (explicitSymbolMatch) {
      const exchange = (preferredExchange || explicitSymbolMatch[1]).toUpperCase();
      const symbol = explicitSymbolMatch[2].toUpperCase();

      // Validate exchange exists in our database
      const validation = validateSymbol(`${exchange}:${symbol}`);
      if (!validation.valid) {
        console.warn(`[ChartConfigService] Invalid exchange: ${exchange}. ${validation.error}`);
        // Still return the symbol - let the API return the error
        // This allows the LLM to learn from the error
      }

      console.log(`[ChartConfigService] Detected explicit symbol: ${exchange}:${symbol}`);
      return {
        symbol,
        exchange,
        fullSymbol: `${exchange}:${symbol}`,
      };
    }

    // 2. Fallback: Common symbol shortcuts (for user convenience)
    // These use word boundaries to avoid false positives
    const commonSymbols = this.getCommonSymbolMappings();

    for (const [pattern, mapping] of commonSymbols) {
      if (pattern.test(nl)) {
        const exchange = preferredExchange || mapping.exchange;
        // Validate exchange
        if (!isValidExchange(exchange)) {
          console.warn(`[ChartConfigService] Preferred exchange ${exchange} not valid, using ${mapping.exchange}`);
        }
        const finalExchange = isValidExchange(exchange) ? exchange : mapping.exchange;

        return {
          symbol: mapping.symbol,
          exchange: finalExchange,
          fullSymbol: `${finalExchange}:${mapping.symbol}`,
        };
      }
    }

    return null;
  }

  /**
   * Get common symbol mappings with word boundary patterns
   * Uses RegExp for proper word boundary matching
   */
  private getCommonSymbolMappings(): Array<[RegExp, { symbol: string; exchange: string }]> {
    return [
      // Crypto (most popular)
      [/\bbitcoin\b/i, { symbol: 'BTCUSDT', exchange: 'BINANCE' }],
      [/\bbtc\b/i, { symbol: 'BTCUSDT', exchange: 'BINANCE' }],
      [/\bethereum\b/i, { symbol: 'ETHUSDT', exchange: 'BINANCE' }],
      [/\beth\b/i, { symbol: 'ETHUSDT', exchange: 'BINANCE' }],
      [/\bsolana\b/i, { symbol: 'SOLUSDT', exchange: 'BINANCE' }],
      [/\bsol\b/i, { symbol: 'SOLUSDT', exchange: 'BINANCE' }],
      [/\bxrp\b/i, { symbol: 'XRPUSDT', exchange: 'BINANCE' }],
      [/\bdogecoin\b/i, { symbol: 'DOGEUSDT', exchange: 'BINANCE' }],
      [/\bdoge\b/i, { symbol: 'DOGEUSDT', exchange: 'BINANCE' }],

      // Stocks (most popular)
      [/\bapple\b/i, { symbol: 'AAPL', exchange: 'NASDAQ' }],
      [/\baapl\b/i, { symbol: 'AAPL', exchange: 'NASDAQ' }],
      [/\btesla\b/i, { symbol: 'TSLA', exchange: 'NASDAQ' }],
      [/\btsla\b/i, { symbol: 'TSLA', exchange: 'NASDAQ' }],
      [/\bnvidia\b/i, { symbol: 'NVDA', exchange: 'NASDAQ' }],
      [/\bnvda\b/i, { symbol: 'NVDA', exchange: 'NASDAQ' }],
      [/\bmicrosoft\b/i, { symbol: 'MSFT', exchange: 'NASDAQ' }],
      [/\bmsft\b/i, { symbol: 'MSFT', exchange: 'NASDAQ' }],

      // Indices
      [/\bs&?p\s*500\b/i, { symbol: 'SPX', exchange: 'SP' }],
      [/\bspx\b/i, { symbol: 'SPX', exchange: 'SP' }],
      [/\bdow\s*jones\b/i, { symbol: 'DJI', exchange: 'DJ' }],
      [/\bdji\b/i, { symbol: 'DJI', exchange: 'DJ' }],
      [/\bvix\b/i, { symbol: 'VIX', exchange: 'CBOE' }],
      [/\bdxy\b/i, { symbol: 'DXY', exchange: 'TVC' }],
      [/\bdollar\s*index\b/i, { symbol: 'DXY', exchange: 'TVC' }],

      // Forex
      [/\beur\/?usd\b/i, { symbol: 'EURUSD', exchange: 'FX' }],
      [/\bgbp\/?usd\b/i, { symbol: 'GBPUSD', exchange: 'FX' }],
      [/\busd\/?jpy\b/i, { symbol: 'USDJPY', exchange: 'FX' }],

      // Commodities
      [/\bgold\b/i, { symbol: 'XAUUSD', exchange: 'FX' }],
      [/\bxau\/?usd\b/i, { symbol: 'XAUUSD', exchange: 'FX' }],
      [/\bsilver\b/i, { symbol: 'XAGUSD', exchange: 'FX' }],
      [/\bxag\/?usd\b/i, { symbol: 'XAGUSD', exchange: 'FX' }],
      [/\bcrude\s*oil\b/i, { symbol: 'CL1!', exchange: 'NYMEX' }],
      [/\boil\s*futures?\b/i, { symbol: 'CL1!', exchange: 'NYMEX' }],
      [/\bgold\s*futures?\b/i, { symbol: 'GC1!', exchange: 'COMEX' }],
    ];
  }

  /**
   * Detect time range from natural language
   * Valid ranges: 1D, 5D, 1M, 3M, 6M, YTD, 1Y, 5Y, ALL
   */
  detectTimeRange(text: string): string {
    const nl = text.toLowerCase();

    // Time range patterns
    if (nl.match(/last\s+(\d+)\s+day/i) || nl.match(/past\s+(\d+)\s+day/i)) {
      const days = parseInt(nl.match(/(\d+)\s+day/i)?.[1] || '7');
      if (days <= 1) return '1D';
      if (days <= 5) return '5D';
      if (days <= 30) return '1M';
      if (days <= 90) return '3M';
      if (days <= 180) return '6M';
      return '1Y';
    }

    if (nl.includes('24 hours') || nl.includes('1 day') || nl.includes('today')) return '1D';
    if (nl.includes('5 days')) return '5D';
    if (nl.includes('week') || nl.includes('7 days')) return '1M'; // No 1W range, use 1M
    if (nl.includes('month') || nl.includes('30 days')) return '1M';
    if (nl.includes('quarter') || nl.includes('3 months')) return '3M';
    if (nl.includes('6 months') || nl.includes('half year')) return '6M';
    if (nl.includes('year') || nl.includes('12 months')) return '1Y';
    if (nl.includes('5 year')) return '5Y';
    if (nl.includes('all time') || nl.includes('all data')) return 'ALL';

    // Default
    return '1M';
  }

  /**
   * Detect interval based on context and range
   */
  detectInterval(text: string, range: string): string {
    const nl = text.toLowerCase();

    // Explicit interval mentions
    if (nl.includes('1 minute') || nl.includes('1m')) return '1m';
    if (nl.includes('5 minute') || nl.includes('5m')) return '5m';
    if (nl.includes('15 minute') || nl.includes('15m')) return '15m';
    if (nl.includes('hourly') || nl.includes('1 hour') || nl.includes('1h')) return '1h';
    if (nl.includes('4 hour') || nl.includes('4h')) return '4h';
    if (nl.includes('daily') || nl.includes('1 day') || nl.includes('1d')) return '1D';
    if (nl.includes('weekly') || nl.includes('1 week') || nl.includes('1w')) return '1W';

    // Infer from range
    switch (range) {
      case '1D':
        return nl.includes('scalp') ? '1m' : '15m';
      case '1M':
        return nl.includes('day trading') ? '15m' : '4h';
      case '3M':
        return '1D';
      case '1Y':
        return '1W';
      default:
        return '1h';
    }
  }

  /**
   * Detect theme from natural language
   */
  detectTheme(text: string): 'light' | 'dark' {
    const nl = text.toLowerCase();
    if (nl.includes('light theme') || nl.includes('light mode')) return 'light';
    return 'dark'; // Default
  }

  /**
   * Detect chart style from natural language
   */
  detectChartStyle(text: string): ChartConfig['style'] {
    const nl = text.toLowerCase();

    if (nl.includes('bar chart') || nl.includes('bars')) return 'bar';
    if (nl.includes('line chart') || nl.includes('line graph')) return 'line';
    if (nl.includes('area chart')) return 'area';
    if (nl.includes('heikin ashi')) return 'heikinAshi';
    if (nl.includes('hollow candle')) return 'hollowCandle';

    return 'candle'; // Default
  }

  /**
   * Parse resolution string (e.g., "1920x1080")
   */
  parseResolution(resolution: string): { width: number; height: number } {
    const match = resolution.match(/(\d+)x(\d+)/i);
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
   * Uses database-driven detection with parameter parsing (90+ indicators)
   */
  detectIndicators(text: string): ChartStudy[] {
    const nl = text.toLowerCase();

    // Use database-driven parser for all indicators
    const studies = parseIndicatorsWithParams(nl);

    // Handle multiple MAs with different periods (MA 20, MA 50, MA 200)
    this.handleMovingAverageMultiples(nl, studies);

    return studies;
  }

  /**
   * Handle multiple moving averages with different periods
   * e.g., "MA 20, MA 50, MA 200" should create 3 separate MAs
   * This is special handling because the main parser only adds one per indicator type
   */
  private handleMovingAverageMultiples(text: string, studies: ChartStudy[]): void {
    // Collect existing periods from already detected studies
    const existingMaPeriods = new Set<number>();
    const existingEmaPeriods = new Set<number>();

    for (const study of studies) {
      if (study.name === 'Moving Average' && study.input?.length) {
        existingMaPeriods.add(study.input.length);
      }
      if (study.name === 'Moving Average Exponential' && study.input?.length) {
        existingEmaPeriods.add(study.input.length);
      }
    }

    // Patterns for multiple MAs: "MA 20", "MA 50", "MA 200"
    const maPattern = /\b(?:ma|sma)\s*(\d+)/gi;
    const emaPattern = /\bema\s*(\d+)/gi;

    // Extract additional MA periods
    let match;
    while ((match = maPattern.exec(text)) !== null) {
      const period = parseInt(match[1]);
      if (period > 0 && period <= 500 && !existingMaPeriods.has(period)) {
        studies.push({
          name: 'Moving Average',
          input: { length: period },
        });
        existingMaPeriods.add(period);
      }
    }

    // Extract additional EMA periods
    while ((match = emaPattern.exec(text)) !== null) {
      const period = parseInt(match[1]);
      if (period > 0 && period <= 500 && !existingEmaPeriods.has(period)) {
        studies.push({
          name: 'Moving Average Exponential',
          input: { length: period },
        });
        existingEmaPeriods.add(period);
      }
    }
  }

  /**
   * Detect drawings from natural language
   */
  async detectDrawings(text: string): Promise<ChartDrawing[]> {
    const detected = detectDrawingsFromText(text);
    const drawings: ChartDrawing[] = [];

    for (const parsed of detected) {
      const config = buildDrawingConfig(parsed.drawing);
      if (config) {
        drawings.push(config);
      }
    }

    return drawings;
  }

  /**
   * Extract default inputs from indicator definition
   */
  private extractDefaultInputs(indicator: any): Record<string, any> {
    const inputs: Record<string, any> = {};

    if (indicator.inputs && Array.isArray(indicator.inputs)) {
      for (const input of indicator.inputs) {
        if (input.def !== undefined) {
          inputs[input.id] = input.def;
        }
      }
    }

    return inputs;
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(config: ChartConfig, originalText: string): string {
    const parts: string[] = [];

    parts.push(`Symbol: ${config.symbol}`);
    parts.push(`Time range: ${config.range}`);
    parts.push(`Interval: ${config.interval}`);

    if (config.studies && config.studies.length > 0) {
      parts.push(`Indicators: ${config.studies.map((s) => s.name).join(', ')}`);
    }

    if (config.drawings && config.drawings.length > 0) {
      parts.push(`Drawings: ${config.drawings.map((d) => d.name).join(', ')}`);
    }

    parts.push(`Chart style: ${config.style}`);
    parts.push(`Theme: ${config.theme}`);
    parts.push(`Resolution: ${config.width}x${config.height}`);

    return parts.join(' | ');
  }
}
