/**
 * Multi-Timeframe Analysis Interfaces
 *
 * Defines contracts for multi-timeframe chart generation and cascade analysis.
 *
 * Supports two modes:
 * 1. **Fixed Role Mode** (Legacy): HTF → ETF → LTF cascade (3 timeframes max)
 * 2. **Flexible Mode** (New): Any number of timeframes, sorted by interval
 *
 * The AI model determines which timeframes to use based on the user's trading plan.
 */

import { ChartConfig } from '../../chart/interfaces/chart.interface';

/**
 * Timeframe role in multi-timeframe analysis (Legacy)
 * - htf: Higher Timeframe (trend bias, e.g., 1D, 4H)
 * - etf: Execution Timeframe (entry triggers, e.g., 1H, 15m)
 * - ltf: Lower Timeframe (refinement, e.g., 5m, 1m)
 *
 * Note: For flexible analysis, role is optional. Charts are sorted by interval instead.
 */
export type TimeframeRole = 'htf' | 'etf' | 'ltf';

/**
 * Configuration for a single timeframe in multi-timeframe analysis
 */
export interface TimeframeConfig {
  role?: TimeframeRole; // Optional in flexible mode
  interval: string; // '1D', '4h', '15m', etc.
  indicators: string[]; // ['RSI', 'EMA 20', 'MACD']
  indicatorInputs?: Record<string, unknown>; // Custom indicator parameters
}

/**
 * Complete chart information for a generated chart
 */
export interface ChartInfo {
  id: string; // UUID
  role?: TimeframeRole; // Optional in flexible mode
  symbol: string; // e.g., 'BINANCE:BTCUSDT'
  interval: string; // e.g., '4h'
  imageUrl: string; // chart-img.com URL (expires in 7 days)
  s3Url?: string; // Permanent S3 URL
  indicators: string[]; // Indicators used on this chart
  config: ChartConfig; // Full chart configuration
  generatedAt: Date;
}

/**
 * Chart registry interface for managing multiple charts
 */
export interface ChartRegistry {
  readonly requestId: string;
  readonly symbol: string;

  addChart(chart: ChartInfo): void;
  getByTimeframe(interval: string): ChartInfo | undefined;
  getByRole(role: TimeframeRole): ChartInfo | undefined;
  getAllCharts(): ChartInfo[];
}

/**
 * Request for multi-timeframe chart generation
 */
export interface MultiTimeframeRequest {
  symbol: string; // e.g., 'BINANCE:BTCUSDT' or 'BTC'
  exchange?: string; // e.g., 'BINANCE', 'NASDAQ'
  timeframes?: TimeframeConfig[]; // Optional if naturalLanguage is provided
  theme?: 'light' | 'dark';
  naturalLanguage?: string; // Alternative: parse everything from natural language
}

/**
 * Result of multi-timeframe chart generation
 */
export interface MultiTimeframeChartResult {
  success: boolean;
  requestId: string;
  charts: ChartInfo[];
  timing: {
    total: number; // Total ms
    perChart: number[]; // Per-chart timing
  };
  errors?: string[];
}

/**
 * HTF (Higher Timeframe) analysis result
 * Determines overall trend direction and key levels
 */
export interface HTFAnalysis {
  interval: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  trendStrength: 'strong' | 'moderate' | 'weak';
  keyLevels: {
    support: number[];
    resistance: number[];
  };
  bias: 'LONG' | 'SHORT' | 'NEUTRAL';
  reasoning: string;
}

/**
 * ETF (Execution Timeframe) analysis result
 * Identifies entry opportunities aligned with HTF trend
 */
export interface ETFAnalysis {
  interval: string;
  alignsWithHTF: boolean;
  entryZone: {
    low: number;
    high: number;
  };
  triggers: string[]; // e.g., ['RSI bouncing from 40', 'MACD bullish cross']
  signalStrength: number; // 0-1
  reasoning: string;
}

/**
 * LTF (Lower Timeframe) analysis result
 * Provides precise entry, stop loss, and take profit levels
 */
export interface LTFAnalysis {
  interval: string;
  preciseEntry: number;
  stopLoss: number;
  takeProfit: number[]; // Multiple TP levels (TP1, TP2, TP3)
  riskReward: number; // Risk/reward ratio
  reasoning: string;
}

/**
 * Synthesis of multi-timeframe analysis
 * Combines HTF, ETF, and LTF insights into actionable trade plan
 */
export interface MultiTimeframeSynthesis {
  recommendation: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number; // 0-1
  alignment: 'full' | 'partial' | 'none';
  reasoning: string;
  tradePlan?: {
    entry: number;
    stopLoss: number;
    takeProfit: number[];
    riskPercentage: number; // Suggested risk per trade (0.5, 1.0, 1.5%)
    positionSize?: string; // Human-readable position size hint
  };
}

/**
 * Complete multi-timeframe analysis result
 */
export interface MultiTimeframeAnalysis {
  requestId: string;
  symbol: string;
  htf: HTFAnalysis;
  etf: ETFAnalysis;
  ltf?: LTFAnalysis; // Optional (2-timeframe analysis is valid)
  synthesis: MultiTimeframeSynthesis;
  analyzedAt: Date;
}

/**
 * Options for multi-timeframe analysis
 */
export interface MultiTimeframeAnalysisOptions {
  symbol: string;
  tradingStyle?: 'day_trading' | 'swing_trading' | 'scalping';
  tradingRules?: string; // Custom trading rules from user
  riskPerTrade?: number; // Risk percentage (default: 1%)
  includePositionSize?: boolean;
}

/**
 * Service interface for multi-timeframe chart generation
 */
export interface IMultiTimeframeChartService {
  /**
   * Generate multiple charts in parallel for multi-timeframe analysis
   */
  generateMultiTimeframeCharts(
    request: MultiTimeframeRequest
  ): Promise<MultiTimeframeChartResult>;

  /**
   * Parse indicators from natural language text
   */
  parseIndicatorsFromNaturalLanguage(text: string): string[];

  /**
   * Parse timeframe configurations from natural language
   */
  parseTimeframesFromNaturalLanguage(
    text: string
  ): TimeframeConfig[];
}

/**
 * Service interface for multi-timeframe analysis
 */
export interface IMultiTimeframeAnalysisService {
  /**
   * Perform cascade analysis: HTF → ETF → LTF
   */
  analyzeMultiTimeframe(
    charts: ChartInfo[],
    options: MultiTimeframeAnalysisOptions
  ): Promise<MultiTimeframeAnalysis>;

  /**
   * Analyze HTF chart for trend and key levels
   */
  analyzeHTF(
    chart: ChartInfo,
    options: { tradingRules?: string }
  ): Promise<HTFAnalysis>;

  /**
   * Analyze ETF chart with HTF context
   */
  analyzeETF(
    chart: ChartInfo,
    htfContext: HTFAnalysis,
    options: { tradingRules?: string }
  ): Promise<ETFAnalysis>;

  /**
   * Analyze LTF chart with HTF and ETF context
   */
  analyzeLTF(
    chart: ChartInfo,
    htfContext: HTFAnalysis,
    etfContext: ETFAnalysis,
    options: { tradingRules?: string }
  ): Promise<LTFAnalysis>;
}

/**
 * Repository interface for chart persistence
 */
export interface IChartRepository {
  /**
   * Create a new chart record
   */
  createChart(input: CreateChartInput): Promise<ChartRecord>;

  /**
   * Get charts by message ID
   */
  getChartsByMessageId(messageId: string): Promise<ChartRecord[]>;

  /**
   * Get charts by request ID
   */
  getChartsByRequestId(requestId: string): Promise<ChartRecord[]>;

  /**
   * Delete charts by message ID
   */
  deleteChartsByMessageId(messageId: string): Promise<void>;
}

/**
 * Input for creating a chart record
 */
export interface CreateChartInput {
  messageId: string;
  requestId: string;
  symbol: string;
  interval: string;
  role?: TimeframeRole;
  imageUrl: string;
  s3Url?: string;
  indicators?: string[];
  config?: ChartConfig;
}

/**
 * Chart record from database
 */
export interface ChartRecord {
  id: string;
  messageId: string;
  requestId: string;
  symbol: string;
  interval: string;
  role?: TimeframeRole;
  imageUrl: string;
  s3Url?: string;
  indicators?: string[];
  config?: ChartConfig;
  generatedAt: Date;
}

// ============================================================================
// FLEXIBLE MULTI-TIMEFRAME ANALYSIS TYPES (Sprint 4.1)
// ============================================================================

/**
 * Generic timeframe analysis result
 *
 * Unlike HTFAnalysis/ETFAnalysis/LTFAnalysis, this type works with any number
 * of timeframes. Position indicates the timeframe's place in the hierarchy
 * (0 = highest/longest timeframe).
 */
export interface TimeframeAnalysis {
  /** The interval being analyzed (e.g., '1D', '4h', '15m') */
  interval: string;

  /**
   * Position in the sorted timeframe hierarchy.
   * 0 = highest timeframe, 1 = second highest, etc.
   */
  position: number;

  /** Trend direction identified on this timeframe */
  trend: 'bullish' | 'bearish' | 'neutral';

  /** Strength of the trend */
  trendStrength: 'strong' | 'moderate' | 'weak';

  /** Key price levels identified */
  keyLevels: {
    support: number[];
    resistance: number[];
  };

  /** Signals detected on this timeframe (e.g., "RSI oversold", "MACD cross") */
  signals: string[];

  /**
   * Whether this timeframe confirms the higher timeframe(s) trend.
   * Always true for the highest timeframe (position 0).
   */
  alignsWithHigherTF: boolean;

  /**
   * Entry zone for this timeframe.
   * Typically only set for lower timeframes after higher TF analysis.
   */
  entryZone?: {
    low: number;
    high: number;
  };

  /**
   * Trade bias derived from this timeframe.
   * For highest TF, this becomes the overall bias.
   */
  bias: 'LONG' | 'SHORT' | 'NEUTRAL';

  /** AI reasoning for this analysis */
  reasoning: string;
}

/**
 * Flexible multi-timeframe analysis result
 *
 * Works with any number of timeframes (2, 3, 4, 5, or more).
 * Timeframes are sorted from highest to lowest interval.
 */
export interface FlexibleMultiTimeframeAnalysis {
  /** Unique request identifier */
  requestId: string;

  /** Trading symbol analyzed */
  symbol: string;

  /**
   * Analysis results for each timeframe.
   * Ordered from highest to lowest interval (position 0 = highest).
   */
  timeframeAnalyses: TimeframeAnalysis[];

  /** Synthesis combining all timeframe analyses */
  synthesis: MultiTimeframeSynthesis;

  /** Timestamp of analysis */
  analyzedAt: Date;
}

/**
 * Context passed to lower timeframe analysis
 *
 * Accumulates insights from all higher timeframes to inform
 * lower timeframe analysis decisions.
 */
export interface HigherTimeframeContext {
  /** Summary of all higher timeframe analyses */
  summary: string;

  /** Overall bias from higher timeframes */
  bias: 'LONG' | 'SHORT' | 'NEUTRAL';

  /** Combined support levels from all higher timeframes */
  support: number[];

  /** Combined resistance levels from all higher timeframes */
  resistance: number[];

  /** Whether all higher timeframes are aligned */
  allAligned: boolean;

  /** Number of higher timeframes analyzed */
  timeframeCount: number;
}

/**
 * Service interface for flexible multi-timeframe analysis
 */
export interface IFlexibleMultiTimeframeAnalysisService {
  /**
   * Perform flexible cascade analysis with any number of timeframes.
   * Charts are sorted by interval and analyzed from highest to lowest.
   */
  analyzeFlexibleMultiTimeframe(
    charts: ChartInfo[],
    options: MultiTimeframeAnalysisOptions
  ): Promise<FlexibleMultiTimeframeAnalysis>;

  /**
   * Analyze a single timeframe with context from higher timeframes.
   */
  analyzeTimeframe(
    chart: ChartInfo,
    position: number,
    higherTFContext: HigherTimeframeContext | null,
    options: { tradingRules?: string }
  ): Promise<TimeframeAnalysis>;

  /**
   * Build context summary from completed analyses for the next lower timeframe.
   */
  buildHigherTimeframeContext(
    analyses: TimeframeAnalysis[]
  ): HigherTimeframeContext;

  /**
   * Synthesize all timeframe analyses into a final recommendation.
   */
  synthesizeAnalyses(
    analyses: TimeframeAnalysis[],
    options: MultiTimeframeAnalysisOptions
  ): MultiTimeframeSynthesis;
}
