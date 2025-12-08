/**
 * Multi-Timeframe Chart Service
 *
 * Orchestrates parallel generation of multiple charts for multi-timeframe analysis.
 * Supports HTF (Higher Timeframe), ETF (Execution Timeframe), LTF (Lower Timeframe).
 */

import { randomUUID } from 'crypto';
import type { ChartConfigService } from './chart-config.service';
import type { ChartGenerationService } from './chart-generation.service';
import type { ChartRegistryService } from './chart-registry.service';
import type { S3StorageService } from '../../storage/services/s3-storage.service';
import type { ChartConfig } from '../interfaces/chart.interface';
import type {
  IMultiTimeframeChartService,
  MultiTimeframeRequest,
  MultiTimeframeChartResult,
  TimeframeConfig,
  ChartInfo,
  ChartRegistry,
} from '../../analysis/interfaces/multi-timeframe.interface';

/**
 * Default timeframe configurations for common trading styles
 */
const DEFAULT_TIMEFRAMES: Record<string, TimeframeConfig[]> = {
  day_trading: [
    { role: 'htf', interval: '4h', indicators: ['EMA 20', 'EMA 50'] },
    { role: 'etf', interval: '1h', indicators: ['RSI', 'MACD'] },
    { role: 'ltf', interval: '15m', indicators: ['RSI'] },
  ],
  swing_trading: [
    { role: 'htf', interval: '1D', indicators: ['EMA 20', 'EMA 50', 'SMA 200'] },
    { role: 'etf', interval: '4h', indicators: ['RSI', 'MACD'] },
    { role: 'ltf', interval: '1h', indicators: ['RSI'] },
  ],
  scalping: [
    { role: 'htf', interval: '1h', indicators: ['EMA 20'] },
    { role: 'etf', interval: '15m', indicators: ['RSI', 'MACD'] },
    { role: 'ltf', interval: '5m', indicators: ['RSI'] },
  ],
};

/**
 * Multi-Timeframe Chart Service Implementation
 */
export class MultiTimeframeChartService implements IMultiTimeframeChartService {
  constructor(
    private chartConfigService: ChartConfigService,
    private chartGenerationService: ChartGenerationService,
    private chartRegistryService: ChartRegistryService,
    private s3StorageService?: S3StorageService
  ) {}

  /**
   * Generate multiple charts in parallel for multi-timeframe analysis
   */
  async generateMultiTimeframeCharts(
    request: MultiTimeframeRequest
  ): Promise<MultiTimeframeChartResult> {
    const requestId = randomUUID();
    const startTime = Date.now();
    const timings: number[] = [];
    const errors: string[] = [];

    console.log(
      `[MultiTimeframeChartService] Starting multi-TF generation for ${request.symbol}, request ${requestId}`
    );

    // Create registry for this request
    const registry = this.chartRegistryService.createRegistry(
      request.symbol,
      requestId
    );

    // Parse timeframes if natural language provided
    let timeframes = request.timeframes;
    if (request.naturalLanguage && (!timeframes || timeframes.length === 0)) {
      timeframes = this.parseTimeframesFromNaturalLanguage(request.naturalLanguage);
    }

    // Validate we have at least 2 timeframes
    if (!timeframes || timeframes.length < 2) {
      return {
        success: false,
        requestId,
        charts: [],
        timing: { total: Date.now() - startTime, perChart: [] },
        errors: ['At least 2 timeframes (HTF and ETF) are required for multi-timeframe analysis'],
      };
    }

    // Generate all charts in parallel
    const chartPromises = timeframes.map(async (tf): Promise<ChartInfo | null> => {
      const tfStart = Date.now();

      try {
        // Build natural language query for this timeframe
        const indicatorsText = tf.indicators.join(', ');
        const query = `${request.symbol} ${tf.interval} with ${indicatorsText}`;

        console.log(`[MultiTimeframeChartService] Generating ${tf.role} chart: ${query}`);

        // Build config
        const configResult = await this.chartConfigService.constructFromNaturalLanguage(
          query,
          {
            symbol: request.symbol,
            exchange: request.exchange,
            interval: tf.interval,
            theme: request.theme,
          }
        );

        if (!configResult.success || !configResult.config.symbol) {
          errors.push(`Failed to build config for ${tf.role}: ${configResult.reasoning}`);
          return null;
        }

        // Generate chart
        const genResult = await this.chartGenerationService.generateChart(
          configResult.config,
          true, // storage = true
          'png'
        );

        if (!genResult.success || !genResult.imageUrl) {
          errors.push(`Failed to generate ${tf.role} chart: ${genResult.error}`);
          return null;
        }

        // Optional S3 upload for permanent storage
        let s3Url: string | undefined;
        if (this.s3StorageService && genResult.imageUrl) {
          try {
            const s3Result = await this.s3StorageService.uploadFromUrl(genResult.imageUrl, {
              symbol: request.symbol,
              interval: tf.interval,
              indicators: tf.indicators,
            });
            s3Url = s3Result.url;
          } catch (s3Error) {
            console.warn(
              `[MultiTimeframeChartService] S3 upload failed for ${tf.role}:`,
              s3Error
            );
            // Non-fatal - continue without S3 URL
          }
        }

        // Build chart info
        const chartInfo: ChartInfo = {
          id: randomUUID(),
          role: tf.role,
          symbol: request.symbol,
          interval: tf.interval,
          imageUrl: genResult.imageUrl,
          s3Url,
          indicators: tf.indicators,
          config: configResult.config,
          generatedAt: new Date(),
        };

        // Add to registry
        registry.addChart(chartInfo);

        const elapsed = Date.now() - tfStart;
        timings.push(elapsed);

        console.log(
          `[MultiTimeframeChartService] Generated ${tf.role} chart in ${elapsed}ms`
        );

        return chartInfo;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Error generating ${tf.role} chart: ${errorMsg}`);
        console.error(
          `[MultiTimeframeChartService] Failed to generate ${tf.role} chart:`,
          error
        );
        return null;
      }
    });

    // Wait for all charts
    const results = await Promise.all(chartPromises);
    const charts = results.filter((c): c is ChartInfo => c !== null);

    const totalTime = Date.now() - startTime;

    console.log(
      `[MultiTimeframeChartService] Completed ${charts.length}/${timeframes.length} charts in ${totalTime}ms`
    );

    // Check if we have minimum required charts (HTF and ETF)
    const hasHTF = charts.some((c) => c.role === 'htf');
    const hasETF = charts.some((c) => c.role === 'etf');

    if (!hasHTF || !hasETF) {
      return {
        success: false,
        requestId,
        charts,
        timing: { total: totalTime, perChart: timings },
        errors: [
          ...errors,
          'Failed to generate required charts. HTF and ETF are mandatory.',
        ],
      };
    }

    return {
      success: true,
      requestId,
      charts,
      timing: {
        total: totalTime,
        perChart: timings,
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Parse indicators from natural language text
   */
  parseIndicatorsFromNaturalLanguage(text: string): string[] {
    const indicators: string[] = [];
    const nl = text.toLowerCase();

    // EMA patterns
    const emaMatches = nl.matchAll(/ema\s*(\d+)/gi);
    for (const match of emaMatches) {
      indicators.push(`EMA ${match[1]}`);
    }

    // SMA patterns
    const smaMatches = nl.matchAll(/sma\s*(\d+)/gi);
    for (const match of smaMatches) {
      indicators.push(`SMA ${match[1]}`);
    }

    // RSI patterns
    const rsiMatches = nl.matchAll(/rsi\s*(\d+)?/gi);
    for (const match of rsiMatches) {
      indicators.push(match[1] ? `RSI ${match[1]}` : 'RSI');
    }

    // MACD
    if (nl.includes('macd')) {
      indicators.push('MACD');
    }

    // ATR patterns
    const atrMatches = nl.matchAll(/atr\s*(\d+)?/gi);
    for (const match of atrMatches) {
      indicators.push(match[1] ? `ATR ${match[1]}` : 'ATR');
    }

    // Bollinger Bands
    if (nl.includes('bollinger') || nl.includes('bb')) {
      indicators.push('Bollinger Bands');
    }

    // Stochastic
    if (nl.includes('stochastic') || nl.includes('stoch')) {
      indicators.push('Stochastic');
    }

    // Volume
    if (nl.includes('volume')) {
      indicators.push('Volume');
    }

    // Moving Average (generic)
    const maMatches = nl.matchAll(/(?<!e|s)ma\s*(\d+)/gi);
    for (const match of maMatches) {
      // Check if not already captured as EMA/SMA
      const maIndicator = `MA ${match[1]}`;
      if (!indicators.includes(maIndicator)) {
        indicators.push(maIndicator);
      }
    }

    // Dedupe
    return [...new Set(indicators)];
  }

  /**
   * Parse timeframe configurations from natural language
   */
  parseTimeframesFromNaturalLanguage(text: string): TimeframeConfig[] {
    const nl = text.toLowerCase();
    const timeframes: TimeframeConfig[] = [];

    // Common interval patterns
    const intervalPatterns: Record<string, string> = {
      '1d': '1D',
      '1 day': '1D',
      'daily': '1D',
      '4h': '4h',
      '4 hour': '4h',
      '1h': '1h',
      '1 hour': '1h',
      'hourly': '1h',
      '15m': '15m',
      '15 min': '15m',
      '5m': '5m',
      '5 min': '5m',
      '1m': '1m',
      '1 min': '1m',
      'weekly': '1W',
      '1w': '1W',
    };

    // Check for HTF mentions
    const htfPatterns = [
      /htf[:\s]+([^\s,]+)/i,
      /higher\s*timeframe[:\s]+([^\s,]+)/i,
      /trend\s*bias[:\s]+([^\s,]+)/i,
    ];

    for (const pattern of htfPatterns) {
      const match = nl.match(pattern);
      if (match) {
        const interval = this.normalizeInterval(match[1], intervalPatterns);
        if (interval) {
          timeframes.push({
            role: 'htf',
            interval,
            indicators: this.parseIndicatorsFromNaturalLanguage(text),
          });
          break;
        }
      }
    }

    // Check for ETF mentions
    const etfPatterns = [
      /etf[:\s]+([^\s,]+)/i,
      /execution\s*timeframe[:\s]+([^\s,]+)/i,
      /entry[:\s]+([^\s,]+)/i,
    ];

    for (const pattern of etfPatterns) {
      const match = nl.match(pattern);
      if (match) {
        const interval = this.normalizeInterval(match[1], intervalPatterns);
        if (interval) {
          timeframes.push({
            role: 'etf',
            interval,
            indicators: this.parseIndicatorsFromNaturalLanguage(text),
          });
          break;
        }
      }
    }

    // Check for LTF mentions
    const ltfPatterns = [
      /ltf[:\s]+([^\s,]+)/i,
      /lower\s*timeframe[:\s]+([^\s,]+)/i,
      /refinement[:\s]+([^\s,]+)/i,
    ];

    for (const pattern of ltfPatterns) {
      const match = nl.match(pattern);
      if (match) {
        const interval = this.normalizeInterval(match[1], intervalPatterns);
        if (interval) {
          timeframes.push({
            role: 'ltf',
            interval,
            indicators: this.parseIndicatorsFromNaturalLanguage(text),
          });
          break;
        }
      }
    }

    // If no specific timeframes found, try to detect trading style and use defaults
    if (timeframes.length < 2) {
      if (nl.includes('day trad') || nl.includes('intraday')) {
        return DEFAULT_TIMEFRAMES.day_trading;
      }
      if (nl.includes('swing') || nl.includes('position')) {
        return DEFAULT_TIMEFRAMES.swing_trading;
      }
      if (nl.includes('scalp')) {
        return DEFAULT_TIMEFRAMES.scalping;
      }

      // Default to swing trading style
      return DEFAULT_TIMEFRAMES.swing_trading.map((tf) => ({
        ...tf,
        indicators: this.parseIndicatorsFromNaturalLanguage(text),
      }));
    }

    return timeframes;
  }

  /**
   * Normalize interval string to API format
   */
  private normalizeInterval(
    input: string,
    patterns: Record<string, string>
  ): string | null {
    const normalized = input.toLowerCase().trim();

    // Direct match
    if (patterns[normalized]) {
      return patterns[normalized];
    }

    // Try partial match
    for (const [pattern, value] of Object.entries(patterns)) {
      if (normalized.includes(pattern)) {
        return value;
      }
    }

    // Return as-is if it looks like a valid interval
    if (/^\d+[mhdwMHDW]$/.test(input)) {
      return input;
    }

    return null;
  }

  /**
   * Get default timeframes for a trading style
   */
  getDefaultTimeframes(
    tradingStyle: 'day_trading' | 'swing_trading' | 'scalping'
  ): TimeframeConfig[] {
    return DEFAULT_TIMEFRAMES[tradingStyle] || DEFAULT_TIMEFRAMES.swing_trading;
  }

  /**
   * Get the chart registry for a request
   */
  getRegistry(requestId: string): ChartRegistry | undefined {
    return this.chartRegistryService.getRegistry(requestId);
  }
}
