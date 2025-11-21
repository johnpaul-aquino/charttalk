/**
 * AI Analysis Service
 *
 * Main service for analyzing trading charts using LLM vision capabilities.
 * Supports technical analysis, sentiment analysis, trading signals, and risk assessment.
 *
 * @module analysis/services
 */

import {
  IAIAnalysisService,
  ISignalGenerationService,
  AnalysisRequest,
  AnalysisResult,
  TradingSignal,
} from '../interfaces/analysis.interface';
import { ILLMProvider, ImageInput } from '../providers/llm-provider.interface';

/**
 * Default prompts for different analysis types
 */
const DEFAULT_PROMPTS = {
  technical: `Analyze this trading chart and provide detailed technical analysis including:
1. **Overall Trend**: Identify the primary trend (bullish, bearish, or neutral)
2. **Key Levels**: Identify important support and resistance levels
3. **Technical Indicators**: Analyze visible indicators (RSI, MACD, Moving Averages, etc.)
4. **Chart Patterns**: Identify any chart patterns (triangles, head and shoulders, flags, etc.)
5. **Volume Analysis**: Comment on volume patterns if visible
6. **Price Action**: Analyze recent price movements and candlestick patterns

Format your response clearly with sections for each analysis point.`,

  sentiment: `Analyze the sentiment of this trading chart and provide:
1. **Market Sentiment**: Is the market sentiment bullish, bearish, or neutral?
2. **Confidence Level**: On a scale of 0-100%, how confident are you in this sentiment?
3. **Key Factors**: What factors from the chart support this sentiment?
4. **Momentum**: Is momentum increasing, decreasing, or stable?
5. **Sentiment Shift**: Are there signs of potential sentiment reversal?

Be specific and reference visible chart elements.`,

  signals: `Analyze this trading chart and generate actionable trading signals:
1. **Signal Type**: LONG, SHORT, or NEUTRAL
2. **Entry Price**: Specific entry price recommendation
3. **Stop Loss**: Where to place stop loss
4. **Take Profit**: Target price (or multiple targets)
5. **Risk/Reward Ratio**: Calculate the R:R ratio
6. **Reasoning**: Brief explanation of why this setup is valid
7. **Confidence**: How confident (0-100%) are you in this signal?

Provide concrete price levels, not ranges. If no clear signal, state NEUTRAL.`,

  risk: `Analyze the risk factors of this trading chart:
1. **Risk Level**: High, Medium, or Low
2. **Risk Factors**: List specific risk factors visible on the chart
3. **Position Size Recommendation**: Suggest position size as % of capital (1-5%)
4. **Risk/Reward Assessment**: Evaluate potential R:R for any setup
5. **Stop Loss Placement**: Optimal stop loss strategy for this chart
6. **Market Conditions**: Are current conditions favorable for trading?
7. **Risk Mitigation**: Suggestions for managing risk

Be conservative and prioritize capital preservation.`,

  complete: `Provide a comprehensive analysis of this trading chart including:

## 1. Technical Analysis
- Overall trend (bullish/bearish/neutral)
- Key support and resistance levels
- Technical indicators analysis
- Chart patterns

## 2. Market Sentiment
- Current sentiment (bullish/bearish/neutral)
- Confidence level (0-100%)
- Momentum assessment

## 3. Trading Signal (if applicable)
- Signal Type: LONG/SHORT/NEUTRAL
- Entry Price: $XX,XXX
- Stop Loss: $XX,XXX
- Take Profit: $XX,XXX
- Risk/Reward Ratio: X:1
- Confidence: XX%
- Reasoning: Brief explanation

## 4. Risk Assessment
- Risk Level: High/Medium/Low
- Position Size Recommendation: X%
- Risk Factors: List key risks
- Risk Mitigation: Specific suggestions

Be specific with price levels and percentages. Base all analysis on visible chart elements.`,
};

/**
 * AI Analysis Service Implementation
 *
 * Uses LLM vision capabilities to analyze trading charts and generate
 * structured analysis results with trading insights.
 */
export class AIAnalysisService implements IAIAnalysisService {
  constructor(
    private llmProvider: ILLMProvider,
    private signalGenerator: ISignalGenerationService
  ) {}

  /**
   * Analyze chart and generate trading insights
   *
   * @param request - Analysis request with chart URL/path, symbol, and options
   * @returns Structured analysis result
   */
  async analyzeChart(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now();

    try {
      // Validate request
      if (!request.chartUrl && !request.chartPath) {
        return {
          success: false,
          error: 'Either chartUrl or chartPath must be provided',
        };
      }

      // Prepare image input
      const imageInput: ImageInput = {};
      if (request.chartUrl) {
        imageInput.url = request.chartUrl;
      } else if (request.chartPath) {
        imageInput.filePath = request.chartPath;
      }

      // Build analysis prompt
      const prompt = this.buildPrompt(request);

      // System prompt for context
      const systemPrompt = `You are an expert technical analyst with 15+ years of experience in trading ${request.symbol} on ${request.interval} timeframe. You provide accurate, actionable analysis based on chart patterns, technical indicators, and price action. Always include specific price levels in your analysis.`;

      // Call LLM provider
      const analysisText = await this.llmProvider.analyzeImage(
        imageInput,
        prompt,
        {
          systemPrompt,
          detail: 'high', // Use high detail for accurate chart reading
          maxTokens: 2000,
          temperature: 0.7,
        }
      );

      // Parse the analysis text
      const analysis = this.parseAnalysisText(analysisText, request);

      // Calculate processing time
      const processingTime = Date.now() - startTime;

      // Return structured result
      return {
        success: true,
        analysis: {
          ...analysis,
          analysisText,
        },
        metadata: {
          model: this.llmProvider.getModel(),
          tokensUsed: this.estimateTokens(analysisText),
          processingTime,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error during analysis',
        metadata: {
          model: this.llmProvider.getModel(),
          tokensUsed: 0,
          processingTime,
        },
      };
    }
  }

  /**
   * Generate structured trading signal from analysis
   *
   * @param analysis - Analysis result
   * @returns Trading signal or null if no signal found
   */
  async generateSignal(analysis: AnalysisResult): Promise<TradingSignal | null> {
    if (!analysis.success || !analysis.analysis) {
      return null;
    }

    const { analysisText } = analysis.analysis;

    // Parse signal from analysis text
    const signal = this.signalGenerator.parseAnalysisResponse(analysisText);

    if (!signal) {
      return null;
    }

    // Validate signal
    const isValid = this.signalGenerator.validateSignal(signal);

    if (!isValid) {
      return null;
    }

    return signal;
  }

  /**
   * Build analysis prompt based on request options
   *
   * @param request - Analysis request
   * @returns Complete prompt for LLM
   */
  private buildPrompt(request: AnalysisRequest): string {
    // If custom prompt provided, use it
    if (request.prompt) {
      return request.prompt;
    }

    // Otherwise, build prompt based on options
    const tradingStyle = request.options?.tradingStyle || 'swing_trading';
    const includeRiskManagement =
      request.options?.includeRiskManagement ?? true;

    // Start with complete analysis
    let prompt = DEFAULT_PROMPTS.complete;

    // Add trading style context
    const styleContext = {
      day_trading:
        '\n\nFocus on intraday setups with tight risk management. Look for scalping opportunities.',
      swing_trading:
        '\n\nFocus on multi-day setups with key levels. Prioritize high-probability swing trades.',
      scalping:
        '\n\nFocus on very short-term setups with precise entry/exit. Look for quick profit opportunities.',
    };

    prompt += styleContext[tradingStyle];

    // Add risk management emphasis if requested
    if (includeRiskManagement) {
      prompt +=
        '\n\nEmphasize risk management and capital preservation. Be conservative with recommendations.';
    }

    // Add symbol and interval context
    prompt += `\n\nChart Details:\n- Symbol: ${request.symbol}\n- Timeframe: ${request.interval}`;

    return prompt;
  }

  /**
   * Parse LLM analysis text into structured format
   *
   * @param text - Raw analysis text from LLM
   * @param request - Original request
   * @returns Structured analysis object
   */
  private parseAnalysisText(
    text: string,
    request: AnalysisRequest
  ): Omit<NonNullable<AnalysisResult['analysis']>, 'analysisText'> {
    // Extract trend
    const trend = this.extractTrend(text);

    // Extract signals (key points)
    const signals = this.extractSignals(text);

    // Extract recommendation
    const recommendation = this.extractRecommendation(text);

    // Extract price levels
    const { entryPrice, stopLoss, takeProfit } =
      this.extractPriceLevels(text);

    // Extract confidence
    const confidence = this.extractConfidence(text);

    // Calculate risk/reward if we have levels
    let riskRewardRatio: number | undefined;
    if (entryPrice && stopLoss && takeProfit) {
      riskRewardRatio = this.signalGenerator.calculateRiskReward(
        entryPrice,
        stopLoss,
        takeProfit
      );
    }

    // Extract key levels
    const keyLevels = this.extractKeyLevels(text);

    return {
      trend,
      signals,
      recommendation,
      entryPrice,
      stopLoss,
      takeProfit,
      confidence,
      riskRewardRatio,
      keyLevels,
    };
  }

  /**
   * Extract trend from analysis text
   */
  private extractTrend(
    text: string
  ): 'bullish' | 'bearish' | 'neutral' {
    const bullishTerms = [
      /\bbullish\b/i,
      /\buptrend\b/i,
      /\bup trend\b/i,
      /\bpositive\b/i,
    ];
    const bearishTerms = [
      /\bbearish\b/i,
      /\bdowntrend\b/i,
      /\bdown trend\b/i,
      /\bnegative\b/i,
    ];

    const bullishCount = bullishTerms.filter((term) => term.test(text)).length;
    const bearishCount = bearishTerms.filter((term) => term.test(text)).length;

    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'neutral';
  }

  /**
   * Extract key signals/points from analysis
   */
  private extractSignals(text: string): string[] {
    const signals: string[] = [];

    // Look for bullet points or numbered lists
    const bulletPoints = text.match(/[-•*]\s+(.+)/g);
    if (bulletPoints) {
      signals.push(...bulletPoints.map((point) => point.replace(/^[-•*]\s+/, '').trim()));
    }

    // Look for numbered points
    const numberedPoints = text.match(/\d+\.\s+(.+)/g);
    if (numberedPoints) {
      signals.push(
        ...numberedPoints.map((point) => point.replace(/^\d+\.\s+/, '').trim())
      );
    }

    // If no structured points, extract sentences with keywords
    if (signals.length === 0) {
      const sentences = text.split(/[.!?]+/);
      const keywordSentences = sentences.filter(
        (s) =>
          /support|resistance|indicator|pattern|volume|momentum/i.test(s) &&
          s.length > 20
      );
      signals.push(...keywordSentences.map((s) => s.trim()).slice(0, 5));
    }

    return signals.filter((s) => s.length > 0).slice(0, 10);
  }

  /**
   * Extract recommendation from analysis
   */
  private extractRecommendation(
    text: string
  ): 'LONG' | 'SHORT' | 'NEUTRAL' {
    const longPatterns = [/\bLONG\b/, /\bBUY\b/i];
    const shortPatterns = [/\bSHORT\b/, /\bSELL\b/i];

    if (longPatterns.some((p) => p.test(text))) return 'LONG';
    if (shortPatterns.some((p) => p.test(text))) return 'SHORT';
    return 'NEUTRAL';
  }

  /**
   * Extract price levels from analysis
   */
  private extractPriceLevels(text: string): {
    entryPrice?: number;
    stopLoss?: number;
    takeProfit?: number;
  } {
    const result: {
      entryPrice?: number;
      stopLoss?: number;
      takeProfit?: number;
    } = {};

    // Entry price
    const entryMatch = text.match(/entry[:\s]+\$?([0-9,]+\.?[0-9]*)/i);
    if (entryMatch) {
      result.entryPrice = parseFloat(entryMatch[1].replace(/,/g, ''));
    }

    // Stop loss
    const stopMatch = text.match(/stop[:\s]+\$?([0-9,]+\.?[0-9]*)/i);
    if (stopMatch) {
      result.stopLoss = parseFloat(stopMatch[1].replace(/,/g, ''));
    }

    // Take profit
    const tpMatch = text.match(/take profit[:\s]+\$?([0-9,]+\.?[0-9]*)/i);
    if (tpMatch) {
      result.takeProfit = parseFloat(tpMatch[1].replace(/,/g, ''));
    }

    return result;
  }

  /**
   * Extract confidence from analysis
   */
  private extractConfidence(text: string): number {
    const confidenceMatch = text.match(/confidence[:\s]+([0-9]+)%/i);
    if (confidenceMatch) {
      const conf = parseInt(confidenceMatch[1], 10);
      return Math.min(Math.max(conf / 100, 0), 1);
    }
    return 0.5; // Default medium confidence
  }

  /**
   * Extract key support and resistance levels
   */
  private extractKeyLevels(text: string): {
    support: number[];
    resistance: number[];
  } | undefined {
    const support: number[] = [];
    const resistance: number[] = [];

    // Look for support levels
    const supportMatches = text.matchAll(
      /support[:\s]+\$?([0-9,]+\.?[0-9]*)/gi
    );
    for (const match of supportMatches) {
      support.push(parseFloat(match[1].replace(/,/g, '')));
    }

    // Look for resistance levels
    const resistanceMatches = text.matchAll(
      /resistance[:\s]+\$?([0-9,]+\.?[0-9]*)/gi
    );
    for (const match of resistanceMatches) {
      resistance.push(parseFloat(match[1].replace(/,/g, '')));
    }

    if (support.length === 0 && resistance.length === 0) {
      return undefined;
    }

    return { support, resistance };
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
