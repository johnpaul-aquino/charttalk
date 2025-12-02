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
import { fetchDocumentation } from '../../../mcp/utils/doc-parser';

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

      // Fetch documentation for indicators
      const docs = await fetchDocumentation('indicators');
      const indicators = docs.indicators || [];

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

      // 6. Parse Resolution
      let width = 1200;
      let height = 675;
      if (preferences?.resolution) {
        const parsed = this.parseResolution(preferences.resolution);
        width = parsed.width;
        height = parsed.height;
      }

      // 7. Detect Indicators
      const studies = this.detectIndicators(nl, indicators);

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
   * Detect symbol from natural language text
   */
  detectSymbol(
    text: string,
    preferredExchange?: string
  ): { symbol: string; exchange: string; fullSymbol: string } | null {
    const nl = text.toLowerCase();

    // Common crypto mappings
    const cryptoMappings: Record<string, { symbol: string; exchange: string }> = {
      bitcoin: { symbol: 'BTCUSDT', exchange: 'BINANCE' },
      btc: { symbol: 'BTCUSDT', exchange: 'BINANCE' },
      ethereum: { symbol: 'ETHUSDT', exchange: 'BINANCE' },
      eth: { symbol: 'ETHUSDT', exchange: 'BINANCE' },
      solana: { symbol: 'SOLUSDT', exchange: 'BINANCE' },
      sol: { symbol: 'SOLUSDT', exchange: 'BINANCE' },
      cardano: { symbol: 'ADAUSDT', exchange: 'BINANCE' },
      ada: { symbol: 'ADAUSDT', exchange: 'BINANCE' },
      ripple: { symbol: 'XRPUSDT', exchange: 'BINANCE' },
      xrp: { symbol: 'XRPUSDT', exchange: 'BINANCE' },
      dogecoin: { symbol: 'DOGEUSDT', exchange: 'BINANCE' },
      doge: { symbol: 'DOGEUSDT', exchange: 'BINANCE' },
      polkadot: { symbol: 'DOTUSDT', exchange: 'BINANCE' },
      dot: { symbol: 'DOTUSDT', exchange: 'BINANCE' },
      avalanche: { symbol: 'AVAXUSDT', exchange: 'BINANCE' },
      avax: { symbol: 'AVAXUSDT', exchange: 'BINANCE' },
      polygon: { symbol: 'MATICUSDT', exchange: 'BINANCE' },
      matic: { symbol: 'MATICUSDT', exchange: 'BINANCE' },
      chainlink: { symbol: 'LINKUSDT', exchange: 'BINANCE' },
      link: { symbol: 'LINKUSDT', exchange: 'BINANCE' },
    };

    // Common stock mappings
    const stockMappings: Record<string, { symbol: string; exchange: string }> = {
      apple: { symbol: 'AAPL', exchange: 'NASDAQ' },
      aapl: { symbol: 'AAPL', exchange: 'NASDAQ' },
      tesla: { symbol: 'TSLA', exchange: 'NASDAQ' },
      tsla: { symbol: 'TSLA', exchange: 'NASDAQ' },
      microsoft: { symbol: 'MSFT', exchange: 'NASDAQ' },
      msft: { symbol: 'MSFT', exchange: 'NASDAQ' },
      amazon: { symbol: 'AMZN', exchange: 'NASDAQ' },
      amzn: { symbol: 'AMZN', exchange: 'NASDAQ' },
      google: { symbol: 'GOOGL', exchange: 'NASDAQ' },
      googl: { symbol: 'GOOGL', exchange: 'NASDAQ' },
      nvidia: { symbol: 'NVDA', exchange: 'NASDAQ' },
      nvda: { symbol: 'NVDA', exchange: 'NASDAQ' },
      meta: { symbol: 'META', exchange: 'NASDAQ' },
      facebook: { symbol: 'META', exchange: 'NASDAQ' },
    };

    // Forex mappings
    const forexMappings: Record<string, { symbol: string; exchange: string }> = {
      'eur/usd': { symbol: 'EURUSD', exchange: 'FX' },
      'eurusd': { symbol: 'EURUSD', exchange: 'FX' },
      'gbp/usd': { symbol: 'GBPUSD', exchange: 'FX' },
      'gbpusd': { symbol: 'GBPUSD', exchange: 'FX' },
      'usd/jpy': { symbol: 'USDJPY', exchange: 'FX' },
      'usdjpy': { symbol: 'USDJPY', exchange: 'FX' },
    };

    // Check crypto
    for (const [key, value] of Object.entries(cryptoMappings)) {
      if (nl.includes(key)) {
        return {
          symbol: value.symbol,
          exchange: preferredExchange || value.exchange,
          fullSymbol: `${preferredExchange || value.exchange}:${value.symbol}`,
        };
      }
    }

    // Check stocks
    for (const [key, value] of Object.entries(stockMappings)) {
      if (nl.includes(key)) {
        return {
          symbol: value.symbol,
          exchange: preferredExchange || value.exchange,
          fullSymbol: `${preferredExchange || value.exchange}:${value.symbol}`,
        };
      }
    }

    // Check forex
    for (const [key, value] of Object.entries(forexMappings)) {
      if (nl.includes(key)) {
        return {
          symbol: value.symbol,
          exchange: preferredExchange || value.exchange,
          fullSymbol: `${preferredExchange || value.exchange}:${value.symbol}`,
        };
      }
    }

    return null;
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
   * Uses chart-img.com API format: full indicator names (not TradingView shorthand)
   */
  detectIndicators(text: string, availableIndicators: any[]): ChartStudy[] {
    const nl = text.toLowerCase();
    const studies: ChartStudy[] = [];

    // Common indicator keywords mapped to chart-img.com API indicator names
    // The name must match exactly what chart-img.com expects (full name, not shorthand)
    const indicatorKeywords: Record<string, string> = {
      'bollinger bands': 'Bollinger Bands',
      'bollinger': 'Bollinger Bands',
      'bb': 'Bollinger Bands',
      'rsi': 'Relative Strength Index',
      'relative strength': 'Relative Strength Index',
      'macd': 'MACD',
      'moving average convergence': 'MACD',
      'moving average': 'Moving Average',
      'ma ': 'Moving Average', // Space to avoid matching "macd"
      'ema': 'Moving Average Exponential',
      'exponential moving average': 'Moving Average Exponential',
      'sma': 'Moving Average',
      'simple moving average': 'Moving Average',
      'volume': 'Volume',
      'stochastic': 'Stochastic',
      'stoch': 'Stochastic',
      'atr': 'Average True Range',
      'average true range': 'Average True Range',
      'adx': 'Average Directional Index',
      'ichimoku': 'Ichimoku Cloud',
      'vwap': 'VWAP',
      'pivot': 'Pivot Points Standard',
    };

    // Find indicators directly from keywords
    const addedStudies = new Set<string>();

    for (const [keyword, indicatorName] of Object.entries(indicatorKeywords)) {
      if (nl.includes(keyword) && !addedStudies.has(indicatorName)) {
        studies.push({
          name: indicatorName,
          input: undefined, // Use default inputs
        });
        addedStudies.add(indicatorName);
        console.log(`[ChartConfigService] Detected indicator: ${keyword} -> ${indicatorName}`);
      }
    }

    return studies;
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
