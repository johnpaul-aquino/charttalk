/**
 * Analysis Module Interfaces
 *
 * Defines contracts for AI chart analysis and signal generation
 */

export interface AnalysisRequest {
  chartUrl?: string;
  chartPath?: string;
  symbol: string;
  interval: string;
  prompt?: string;
  options?: AnalysisOptions;
}

export interface AnalysisOptions {
  includeRiskManagement?: boolean;
  tradingStyle?: 'day_trading' | 'swing_trading' | 'scalping';
  confidenceThreshold?: number;
  /** Image detail level for AI analysis. 'auto' lets the model decide, 'low' saves tokens, 'high' for detailed analysis */
  detail?: 'high' | 'low' | 'auto';
}

export interface AnalysisResult {
  success: boolean;
  analysis?: {
    trend: 'bullish' | 'bearish' | 'neutral';
    signals: string[];
    recommendation: 'LONG' | 'SHORT' | 'NEUTRAL';
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
    confidence: number;
    riskRewardRatio?: number;
    analysisText: string;
    keyLevels?: {
      support: number[];
      resistance: number[];
    };
  };
  metadata?: {
    model: string;
    tokensUsed: number;
    processingTime: number;
  };
  error?: string;
}

export interface TradingSignal {
  type: 'LONG' | 'SHORT' | 'NEUTRAL';
  symbol: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  reasoning: string;
  timestamp: string;
}

// Service Interfaces

export interface IAIAnalysisService {
  /**
   * Analyze chart and generate trading insights
   */
  analyzeChart(request: AnalysisRequest): Promise<AnalysisResult>;

  /**
   * Generate structured trading signal from analysis
   */
  generateSignal(analysis: AnalysisResult): Promise<TradingSignal | null>;
}

export interface ISignalGenerationService {
  /**
   * Parse AI response text into structured signal
   */
  parseAnalysisResponse(text: string): TradingSignal | null;

  /**
   * Calculate risk/reward ratio
   */
  calculateRiskReward(entry: number, stopLoss: number, takeProfit: number): number;

  /**
   * Validate signal parameters
   */
  validateSignal(signal: TradingSignal): boolean;
}
