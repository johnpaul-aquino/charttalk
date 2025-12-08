/**
 * Multi-Timeframe Analysis Service
 *
 * Performs cascade analysis across multiple timeframes:
 * HTF (trend bias) → ETF (entries) → LTF (refinement)
 *
 * Each timeframe analysis builds on the context from previous timeframes.
 */

import { randomUUID } from 'crypto';
import type { ClaudeProvider } from '../providers/claude.provider';
import type { SignalGenerationService } from './signal-generation.service';
import type {
  IMultiTimeframeAnalysisService,
  IFlexibleMultiTimeframeAnalysisService,
  ChartInfo,
  HTFAnalysis,
  ETFAnalysis,
  LTFAnalysis,
  MultiTimeframeAnalysis,
  MultiTimeframeSynthesis,
  MultiTimeframeAnalysisOptions,
  TimeframeRole,
  TimeframeAnalysis,
  FlexibleMultiTimeframeAnalysis,
  HigherTimeframeContext,
} from '../interfaces/multi-timeframe.interface';
import { sortByIntervalDescending } from '../../../shared/utils/interval.utils';

/**
 * Prompts for each timeframe analysis
 */
const ANALYSIS_PROMPTS = {
  htf: (symbol: string, interval: string, tradingRules?: string) => `
You are an expert technical analyst analyzing a ${symbol} chart on the ${interval} timeframe.
This is the HIGHER TIMEFRAME (HTF) analysis for establishing the primary trend bias.

Analyze the chart and determine:
1. **Trend Direction**: Is the market bullish, bearish, or neutral/ranging?
2. **Trend Strength**: Is the trend strong, moderate, or weak?
3. **Key Levels**: Identify the major support and resistance levels (specific price values)
4. **Trade Bias**: Based on the trend, should we look for LONG, SHORT, or stay NEUTRAL?

${tradingRules ? `\nTrading Rules to follow:\n${tradingRules}` : ''}

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "trend": "bullish" | "bearish" | "neutral",
  "trendStrength": "strong" | "moderate" | "weak",
  "support": [price1, price2],
  "resistance": [price1, price2],
  "bias": "LONG" | "SHORT" | "NEUTRAL",
  "reasoning": "Brief explanation of your analysis"
}
`,

  etf: (
    symbol: string,
    interval: string,
    htfContext: HTFAnalysis,
    tradingRules?: string
  ) => `
You are an expert technical analyst analyzing a ${symbol} chart on the ${interval} timeframe.
This is the EXECUTION TIMEFRAME (ETF) analysis for identifying entry opportunities.

**Higher Timeframe Context (${htfContext.interval}):**
- Trend: ${htfContext.trend} (${htfContext.trendStrength})
- Trade Bias: ${htfContext.bias}
- Key Support Levels: ${htfContext.keyLevels.support.join(', ')}
- Key Resistance Levels: ${htfContext.keyLevels.resistance.join(', ')}

Your task:
1. **Alignment Check**: Does the ETF trend align with the HTF bias?
2. **Entry Zone**: Identify the optimal entry price range (e.g., pullback to support for LONG)
3. **Entry Triggers**: What specific signals would trigger an entry? (e.g., RSI bounce, MACD cross)
4. **Signal Strength**: How strong is the current setup? (0.0 to 1.0)

CRITICAL RULE: Only look for ${htfContext.bias} setups. Ignore counter-trend signals.

${tradingRules ? `\nTrading Rules to follow:\n${tradingRules}` : ''}

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "alignsWithHTF": true | false,
  "entryZone": { "low": price, "high": price },
  "triggers": ["trigger1", "trigger2"],
  "signalStrength": 0.0 to 1.0,
  "reasoning": "Brief explanation"
}
`,

  ltf: (
    symbol: string,
    interval: string,
    htfContext: HTFAnalysis,
    etfContext: ETFAnalysis,
    tradingRules?: string
  ) => `
You are an expert technical analyst analyzing a ${symbol} chart on the ${interval} timeframe.
This is the LOWER TIMEFRAME (LTF) analysis for precise entry, stop loss, and take profit levels.

**Higher Timeframe Context (${htfContext.interval}):**
- Trend: ${htfContext.trend}, Bias: ${htfContext.bias}
- Support: ${htfContext.keyLevels.support.join(', ')}
- Resistance: ${htfContext.keyLevels.resistance.join(', ')}

**Execution Timeframe Context (${etfContext.interval}):**
- Entry Zone: ${etfContext.entryZone.low} - ${etfContext.entryZone.high}
- Signal Strength: ${etfContext.signalStrength}
- Triggers: ${etfContext.triggers.join(', ')}

Your task:
1. **Precise Entry**: Find the exact entry price within the ETF entry zone
2. **Stop Loss**: Calculate stop loss (below recent swing low for LONG, above for SHORT)
3. **Take Profit Levels**: Set multiple TP levels based on HTF resistance/support
4. **Risk/Reward Ratio**: Calculate the R:R ratio

${tradingRules ? `\nTrading Rules to follow:\n${tradingRules}` : ''}

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "preciseEntry": price,
  "stopLoss": price,
  "takeProfit": [tp1, tp2, tp3],
  "riskReward": ratio (number),
  "reasoning": "Brief explanation"
}
`,
};

/**
 * Prompts for flexible multi-timeframe analysis
 */
const FLEXIBLE_ANALYSIS_PROMPTS = {
  /**
   * Generic timeframe analysis prompt - works for any position in the cascade
   */
  timeframe: (
    symbol: string,
    interval: string,
    position: number,
    totalTimeframes: number,
    higherTFContext: HigherTimeframeContext | null,
    tradingRules?: string
  ) => {
    const isHighest = position === 0;
    const isLowest = position === totalTimeframes - 1;

    let contextSection = '';
    if (higherTFContext) {
      contextSection = `
**Higher Timeframe Context (${higherTFContext.timeframeCount} timeframes analyzed):**
- Overall Bias: ${higherTFContext.bias}
- Summary: ${higherTFContext.summary}
- Key Support Levels: ${higherTFContext.support.join(', ') || 'None identified'}
- Key Resistance Levels: ${higherTFContext.resistance.join(', ') || 'None identified'}
- All Higher TFs Aligned: ${higherTFContext.allAligned ? 'YES' : 'NO'}

CRITICAL: ${higherTFContext.bias !== 'NEUTRAL' ? `Only look for ${higherTFContext.bias} setups aligned with higher timeframes.` : 'Higher timeframes show no clear bias - be cautious.'}
`;
    }

    let taskSection = '';
    if (isHighest) {
      taskSection = `
Your task (HIGHEST TIMEFRAME - Position ${position + 1}/${totalTimeframes}):
1. **Trend Direction**: Is the market bullish, bearish, or neutral/ranging?
2. **Trend Strength**: Is the trend strong, moderate, or weak?
3. **Key Levels**: Identify major support and resistance levels (specific prices)
4. **Trade Bias**: Based on trend, should we look for LONG, SHORT, or NEUTRAL?
5. **Signals**: What technical signals are present? (e.g., "RSI overbought", "MACD bullish cross")
`;
    } else if (isLowest) {
      taskSection = `
Your task (LOWEST TIMEFRAME - Position ${position + 1}/${totalTimeframes}):
1. **Alignment Check**: Does this timeframe confirm the higher timeframe bias?
2. **Precise Entry Zone**: Identify the optimal entry price range
3. **Signals**: What entry triggers are present?
4. **Entry Refinement**: For ${higherTFContext?.bias || 'the'} setup, find precise entry level
5. **Stop Loss & Take Profit**: Suggest SL and TP levels based on all timeframe context
`;
    } else {
      taskSection = `
Your task (MIDDLE TIMEFRAME - Position ${position + 1}/${totalTimeframes}):
1. **Alignment Check**: Does this timeframe confirm the higher timeframe bias?
2. **Trend Confirmation**: Is the trend direction consistent?
3. **Entry Zone Refinement**: Narrow down the entry zone from higher TF context
4. **Signals**: What confirming or conflicting signals are present?
5. **Key Levels**: Identify support/resistance relevant to this timeframe
`;
    }

    return `
You are an expert technical analyst analyzing a ${symbol} chart on the ${interval} timeframe.
This is timeframe ${position + 1} of ${totalTimeframes} in a cascade analysis.
${contextSection}
${taskSection}

${tradingRules ? `\nTrading Rules to follow:\n${tradingRules}` : ''}

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "trend": "bullish" | "bearish" | "neutral",
  "trendStrength": "strong" | "moderate" | "weak",
  "support": [price1, price2],
  "resistance": [price1, price2],
  "signals": ["signal1", "signal2"],
  "alignsWithHigherTF": true | false,
  "bias": "LONG" | "SHORT" | "NEUTRAL",
  ${!isHighest ? '"entryZone": { "low": price, "high": price },' : ''}
  "reasoning": "Brief explanation of your analysis"
}
`;
  },
};

/**
 * Multi-Timeframe Analysis Service Implementation
 *
 * Supports both:
 * - Legacy mode: Fixed HTF → ETF → LTF cascade (3 timeframes max)
 * - Flexible mode: Any number of timeframes, sorted by interval
 */
export class MultiTimeframeAnalysisService
  implements IMultiTimeframeAnalysisService, IFlexibleMultiTimeframeAnalysisService
{
  constructor(
    private claudeProvider: ClaudeProvider,
    private signalService: SignalGenerationService
  ) {}

  /**
   * Perform cascade analysis: HTF → ETF → LTF
   */
  async analyzeMultiTimeframe(
    charts: ChartInfo[],
    options: MultiTimeframeAnalysisOptions
  ): Promise<MultiTimeframeAnalysis> {
    const requestId = randomUUID();
    const startTime = Date.now();

    console.log(
      `[MultiTimeframeAnalysisService] Starting cascade analysis for ${options.symbol}, request ${requestId}`
    );

    // Sort charts by role
    const sortedCharts = this.sortByRole(charts);

    // Step 1: Analyze HTF
    const htfChart = sortedCharts.find((c) => c.role === 'htf');
    if (!htfChart) {
      throw new Error('HTF chart is required for multi-timeframe analysis');
    }

    console.log(`[MultiTimeframeAnalysisService] Analyzing HTF (${htfChart.interval})`);
    const htfAnalysis = await this.analyzeHTF(htfChart, {
      tradingRules: options.tradingRules,
    });

    // Step 2: Analyze ETF with HTF context
    const etfChart = sortedCharts.find((c) => c.role === 'etf');
    if (!etfChart) {
      throw new Error('ETF chart is required for multi-timeframe analysis');
    }

    console.log(`[MultiTimeframeAnalysisService] Analyzing ETF (${etfChart.interval})`);
    const etfAnalysis = await this.analyzeETF(etfChart, htfAnalysis, {
      tradingRules: options.tradingRules,
    });

    // Step 3: Analyze LTF with HTF + ETF context (optional)
    const ltfChart = sortedCharts.find((c) => c.role === 'ltf');
    let ltfAnalysis: LTFAnalysis | undefined;

    if (ltfChart) {
      console.log(`[MultiTimeframeAnalysisService] Analyzing LTF (${ltfChart.interval})`);
      ltfAnalysis = await this.analyzeLTF(ltfChart, htfAnalysis, etfAnalysis, {
        tradingRules: options.tradingRules,
      });
    }

    // Step 4: Synthesize all analyses
    const synthesis = this.synthesize(htfAnalysis, etfAnalysis, ltfAnalysis, options);

    const totalTime = Date.now() - startTime;
    console.log(
      `[MultiTimeframeAnalysisService] Cascade analysis complete in ${totalTime}ms`
    );

    return {
      requestId,
      symbol: options.symbol,
      htf: htfAnalysis,
      etf: etfAnalysis,
      ltf: ltfAnalysis,
      synthesis,
      analyzedAt: new Date(),
    };
  }

  /**
   * Analyze HTF chart for trend and key levels
   */
  async analyzeHTF(
    chart: ChartInfo,
    options: { tradingRules?: string }
  ): Promise<HTFAnalysis> {
    const prompt = ANALYSIS_PROMPTS.htf(
      chart.symbol,
      chart.interval,
      options.tradingRules
    );

    const response = await this.claudeProvider.analyzeImage(
      { url: chart.imageUrl },
      prompt,
      {
        systemPrompt:
          'You are an expert technical analyst. Always respond with valid JSON only.',
        temperature: 0.3, // Lower temperature for more consistent analysis
      }
    );

    return this.parseHTFResponse(response, chart.interval);
  }

  /**
   * Analyze ETF chart with HTF context
   */
  async analyzeETF(
    chart: ChartInfo,
    htfContext: HTFAnalysis,
    options: { tradingRules?: string }
  ): Promise<ETFAnalysis> {
    const prompt = ANALYSIS_PROMPTS.etf(
      chart.symbol,
      chart.interval,
      htfContext,
      options.tradingRules
    );

    const response = await this.claudeProvider.analyzeImage(
      { url: chart.imageUrl },
      prompt,
      {
        systemPrompt:
          'You are an expert technical analyst. Always respond with valid JSON only.',
        temperature: 0.3,
      }
    );

    return this.parseETFResponse(response, chart.interval);
  }

  /**
   * Analyze LTF chart with HTF and ETF context
   */
  async analyzeLTF(
    chart: ChartInfo,
    htfContext: HTFAnalysis,
    etfContext: ETFAnalysis,
    options: { tradingRules?: string }
  ): Promise<LTFAnalysis> {
    const prompt = ANALYSIS_PROMPTS.ltf(
      chart.symbol,
      chart.interval,
      htfContext,
      etfContext,
      options.tradingRules
    );

    const response = await this.claudeProvider.analyzeImage(
      { url: chart.imageUrl },
      prompt,
      {
        systemPrompt:
          'You are an expert technical analyst. Always respond with valid JSON only.',
        temperature: 0.3,
      }
    );

    return this.parseLTFResponse(response, chart.interval);
  }

  /**
   * Sort charts by role: HTF first, then ETF, then LTF
   * For charts without roles, fall back to interval-based sorting
   */
  private sortByRole(charts: ChartInfo[]): ChartInfo[] {
    const roleOrder: Record<TimeframeRole, number> = {
      htf: 0,
      etf: 1,
      ltf: 2,
    };

    return [...charts].sort((a, b) => {
      // If both have roles, sort by role
      if (a.role && b.role) {
        return roleOrder[a.role] - roleOrder[b.role];
      }
      // If only one has a role, prioritize the one with a role
      if (a.role && !b.role) return -1;
      if (!a.role && b.role) return 1;
      // If neither has a role, fall back to interval sorting (handled elsewhere)
      return 0;
    });
  }

  /**
   * Parse HTF analysis response
   */
  private parseHTFResponse(response: string, interval: string): HTFAnalysis {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const data = JSON.parse(jsonMatch[0]);

      return {
        interval,
        trend: this.validateTrend(data.trend),
        trendStrength: this.validateTrendStrength(data.trendStrength),
        keyLevels: {
          support: this.parseNumberArray(data.support),
          resistance: this.parseNumberArray(data.resistance),
        },
        bias: this.validateBias(data.bias),
        reasoning: data.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      console.error('[MultiTimeframeAnalysisService] Failed to parse HTF response:', error);
      // Return default/neutral analysis on parse failure
      return {
        interval,
        trend: 'neutral',
        trendStrength: 'weak',
        keyLevels: { support: [], resistance: [] },
        bias: 'NEUTRAL',
        reasoning: `Failed to parse analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Parse ETF analysis response
   */
  private parseETFResponse(response: string, interval: string): ETFAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const data = JSON.parse(jsonMatch[0]);

      return {
        interval,
        alignsWithHTF: Boolean(data.alignsWithHTF),
        entryZone: {
          low: parseFloat(data.entryZone?.low) || 0,
          high: parseFloat(data.entryZone?.high) || 0,
        },
        triggers: Array.isArray(data.triggers) ? data.triggers : [],
        signalStrength: Math.min(1, Math.max(0, parseFloat(data.signalStrength) || 0)),
        reasoning: data.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      console.error('[MultiTimeframeAnalysisService] Failed to parse ETF response:', error);
      return {
        interval,
        alignsWithHTF: false,
        entryZone: { low: 0, high: 0 },
        triggers: [],
        signalStrength: 0,
        reasoning: `Failed to parse analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Parse LTF analysis response
   */
  private parseLTFResponse(response: string, interval: string): LTFAnalysis {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const data = JSON.parse(jsonMatch[0]);

      return {
        interval,
        preciseEntry: parseFloat(data.preciseEntry) || 0,
        stopLoss: parseFloat(data.stopLoss) || 0,
        takeProfit: this.parseNumberArray(data.takeProfit),
        riskReward: parseFloat(data.riskReward) || 0,
        reasoning: data.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      console.error('[MultiTimeframeAnalysisService] Failed to parse LTF response:', error);
      return {
        interval,
        preciseEntry: 0,
        stopLoss: 0,
        takeProfit: [],
        riskReward: 0,
        reasoning: `Failed to parse analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Synthesize analyses into final recommendation
   */
  private synthesize(
    htf: HTFAnalysis,
    etf: ETFAnalysis,
    ltf: LTFAnalysis | undefined,
    options: MultiTimeframeAnalysisOptions
  ): MultiTimeframeSynthesis {
    // Determine alignment
    const htfEtfAligned = etf.alignsWithHTF && htf.bias !== 'NEUTRAL';
    const hasLTF = !!ltf;
    const alignment: 'full' | 'partial' | 'none' =
      htfEtfAligned && hasLTF ? 'full' : htfEtfAligned ? 'partial' : 'none';

    // Calculate confidence
    let confidence = 0;
    if (htfEtfAligned) {
      // Base confidence from ETF signal strength
      confidence = etf.signalStrength * 0.6;

      // Add HTF trend strength bonus
      if (htf.trendStrength === 'strong') confidence += 0.2;
      else if (htf.trendStrength === 'moderate') confidence += 0.1;

      // Add LTF R:R bonus
      if (hasLTF && ltf!.riskReward >= 2) confidence += 0.15;
      else if (hasLTF && ltf!.riskReward >= 1.5) confidence += 0.1;
    }

    // Cap confidence at 1
    confidence = Math.min(confidence, 1);

    // Determine recommendation
    let recommendation: 'LONG' | 'SHORT' | 'NEUTRAL';
    if (alignment === 'none' || confidence < 0.3) {
      recommendation = 'NEUTRAL';
    } else {
      recommendation = htf.bias;
    }

    // Build trade plan if we have LTF data and alignment
    let tradePlan: MultiTimeframeSynthesis['tradePlan'];
    if (alignment !== 'none' && ltf && recommendation !== 'NEUTRAL') {
      // Determine risk percentage based on confidence
      let riskPercentage = options.riskPerTrade || 1.0;
      if (confidence >= 0.7) {
        riskPercentage = 1.5;
      } else if (confidence >= 0.5) {
        riskPercentage = 1.0;
      } else {
        riskPercentage = 0.5;
      }

      tradePlan = {
        entry: ltf.preciseEntry,
        stopLoss: ltf.stopLoss,
        takeProfit: ltf.takeProfit,
        riskPercentage,
      };

      // Add position size hint if requested
      if (options.includePositionSize && tradePlan.entry && tradePlan.stopLoss) {
        const riskAmount = Math.abs(tradePlan.entry - tradePlan.stopLoss);
        const riskPercent = (riskAmount / tradePlan.entry) * 100;
        tradePlan.positionSize = `Risk ${riskPercentage}% per trade. Entry-SL distance: ${riskPercent.toFixed(2)}%`;
      }
    }

    // Build reasoning
    const reasoning = this.buildSynthesisReasoning(htf, etf, ltf, alignment, confidence);

    return {
      recommendation,
      confidence,
      alignment,
      reasoning,
      tradePlan,
    };
  }

  /**
   * Build synthesis reasoning text
   */
  private buildSynthesisReasoning(
    htf: HTFAnalysis,
    etf: ETFAnalysis,
    ltf: LTFAnalysis | undefined,
    alignment: 'full' | 'partial' | 'none',
    confidence: number
  ): string {
    const parts: string[] = [];

    // HTF summary
    parts.push(
      `HTF (${htf.interval}): ${htf.trend.toUpperCase()} trend (${htf.trendStrength}), bias ${htf.bias}`
    );

    // ETF summary
    const etfAlignment = etf.alignsWithHTF ? 'confirms' : 'contradicts';
    parts.push(
      `ETF (${etf.interval}): ${etfAlignment} HTF bias, signal strength ${(etf.signalStrength * 100).toFixed(0)}%`
    );

    // LTF summary if available
    if (ltf) {
      parts.push(
        `LTF (${ltf.interval}): Entry ${ltf.preciseEntry}, SL ${ltf.stopLoss}, R:R ${ltf.riskReward.toFixed(1)}:1`
      );
    }

    // Alignment and confidence
    parts.push(
      `Alignment: ${alignment.toUpperCase()}, Confidence: ${(confidence * 100).toFixed(0)}%`
    );

    return parts.join(' | ');
  }

  /**
   * Helper: Validate trend value
   */
  private validateTrend(trend: unknown): 'bullish' | 'bearish' | 'neutral' {
    const t = String(trend).toLowerCase();
    if (t === 'bullish' || t.includes('bull') || t.includes('up')) return 'bullish';
    if (t === 'bearish' || t.includes('bear') || t.includes('down')) return 'bearish';
    return 'neutral';
  }

  /**
   * Helper: Validate trend strength
   */
  private validateTrendStrength(strength: unknown): 'strong' | 'moderate' | 'weak' {
    const s = String(strength).toLowerCase();
    if (s === 'strong' || s.includes('strong')) return 'strong';
    if (s === 'moderate' || s.includes('moderate') || s.includes('medium')) return 'moderate';
    return 'weak';
  }

  /**
   * Helper: Validate bias value
   */
  private validateBias(bias: unknown): 'LONG' | 'SHORT' | 'NEUTRAL' {
    const b = String(bias).toUpperCase();
    if (b === 'LONG' || b.includes('LONG') || b.includes('BUY')) return 'LONG';
    if (b === 'SHORT' || b.includes('SHORT') || b.includes('SELL')) return 'SHORT';
    return 'NEUTRAL';
  }

  /**
   * Helper: Parse array of numbers
   */
  private parseNumberArray(arr: unknown): number[] {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((v) => parseFloat(String(v)))
      .filter((n) => !isNaN(n) && isFinite(n));
  }

  // ============================================================================
  // FLEXIBLE MULTI-TIMEFRAME ANALYSIS (Sprint 4.1)
  // ============================================================================

  /**
   * Perform flexible cascade analysis with any number of timeframes.
   * Charts are sorted by interval and analyzed from highest to lowest.
   */
  async analyzeFlexibleMultiTimeframe(
    charts: ChartInfo[],
    options: MultiTimeframeAnalysisOptions
  ): Promise<FlexibleMultiTimeframeAnalysis> {
    const requestId = randomUUID();
    const startTime = Date.now();

    console.log(
      `[MultiTimeframeAnalysisService] Starting FLEXIBLE cascade analysis for ${options.symbol}, request ${requestId}`
    );
    console.log(
      `[MultiTimeframeAnalysisService] Timeframes: ${charts.map((c) => c.interval).join(' → ')}`
    );

    // Sort charts from highest to lowest interval
    const sortedCharts = sortByIntervalDescending(charts);
    const totalTimeframes = sortedCharts.length;

    // Analyze each timeframe with accumulated context from higher timeframes
    const analyses: TimeframeAnalysis[] = [];
    let accumulatedContext: HigherTimeframeContext | null = null;

    for (let position = 0; position < sortedCharts.length; position++) {
      const chart = sortedCharts[position];
      console.log(
        `[MultiTimeframeAnalysisService] Analyzing position ${position + 1}/${totalTimeframes}: ${chart.interval}`
      );

      const analysis = await this.analyzeTimeframe(chart, position, accumulatedContext, {
        tradingRules: options.tradingRules,
        totalTimeframes,
      });

      analyses.push(analysis);

      // Build context for next lower timeframe
      accumulatedContext = this.buildHigherTimeframeContext(analyses);
    }

    // Synthesize all analyses into final recommendation
    const synthesis = this.synthesizeAnalyses(analyses, options);

    const totalTime = Date.now() - startTime;
    console.log(
      `[MultiTimeframeAnalysisService] Flexible cascade analysis complete in ${totalTime}ms`
    );

    return {
      requestId,
      symbol: options.symbol,
      timeframeAnalyses: analyses,
      synthesis,
      analyzedAt: new Date(),
    };
  }

  /**
   * Analyze a single timeframe with context from higher timeframes.
   */
  async analyzeTimeframe(
    chart: ChartInfo,
    position: number,
    higherTFContext: HigherTimeframeContext | null,
    options: { tradingRules?: string; totalTimeframes: number }
  ): Promise<TimeframeAnalysis> {
    const prompt = FLEXIBLE_ANALYSIS_PROMPTS.timeframe(
      chart.symbol,
      chart.interval,
      position,
      options.totalTimeframes,
      higherTFContext,
      options.tradingRules
    );

    const response = await this.claudeProvider.analyzeImage(
      { url: chart.imageUrl },
      prompt,
      {
        systemPrompt:
          'You are an expert technical analyst. Always respond with valid JSON only.',
        temperature: 0.3,
      }
    );

    return this.parseTimeframeResponse(response, chart.interval, position, higherTFContext);
  }

  /**
   * Build context summary from completed analyses for the next lower timeframe.
   */
  buildHigherTimeframeContext(analyses: TimeframeAnalysis[]): HigherTimeframeContext {
    if (analyses.length === 0) {
      return {
        summary: '',
        bias: 'NEUTRAL',
        support: [],
        resistance: [],
        allAligned: true,
        timeframeCount: 0,
      };
    }

    // Get the primary bias from the highest timeframe (position 0)
    const primaryBias = analyses[0].bias;

    // Check if all timeframes are aligned
    const allAligned = analyses.every(
      (a) => a.bias === primaryBias || a.bias === 'NEUTRAL'
    );

    // Combine support and resistance levels (unique, sorted)
    const allSupport = [
      ...new Set(analyses.flatMap((a) => a.keyLevels.support)),
    ].sort((a, b) => b - a);
    const allResistance = [
      ...new Set(analyses.flatMap((a) => a.keyLevels.resistance)),
    ].sort((a, b) => a - b);

    // Build summary text
    const summaryParts = analyses.map(
      (a) =>
        `${a.interval}: ${a.trend} (${a.trendStrength}), bias ${a.bias}${
          a.position > 0 ? `, aligns: ${a.alignsWithHigherTF ? 'YES' : 'NO'}` : ''
        }`
    );

    return {
      summary: summaryParts.join(' | '),
      bias: primaryBias,
      support: allSupport.slice(0, 5), // Top 5 levels
      resistance: allResistance.slice(0, 5),
      allAligned,
      timeframeCount: analyses.length,
    };
  }

  /**
   * Synthesize all timeframe analyses into a final recommendation.
   */
  synthesizeAnalyses(
    analyses: TimeframeAnalysis[],
    options: MultiTimeframeAnalysisOptions
  ): MultiTimeframeSynthesis {
    if (analyses.length === 0) {
      return {
        recommendation: 'NEUTRAL',
        confidence: 0,
        alignment: 'none',
        reasoning: 'No analyses to synthesize',
      };
    }

    // Check alignment across all timeframes
    const primaryBias = analyses[0].bias;
    const alignedCount = analyses.filter(
      (a) => a.bias === primaryBias || a.bias === 'NEUTRAL'
    ).length;
    const alignmentRatio = alignedCount / analyses.length;

    let alignment: 'full' | 'partial' | 'none';
    if (alignmentRatio === 1) {
      alignment = 'full';
    } else if (alignmentRatio >= 0.5) {
      alignment = 'partial';
    } else {
      alignment = 'none';
    }

    // Calculate confidence based on multiple factors
    let confidence = 0;

    // Base confidence from alignment
    confidence += alignmentRatio * 0.4;

    // Trend strength bonus (from highest TF)
    const htfStrength = analyses[0].trendStrength;
    if (htfStrength === 'strong') confidence += 0.2;
    else if (htfStrength === 'moderate') confidence += 0.1;

    // Signal count bonus (more signals = more confidence)
    const totalSignals = analyses.reduce((sum, a) => sum + a.signals.length, 0);
    confidence += Math.min(0.2, totalSignals * 0.03);

    // Multiple timeframe confirmation bonus
    if (analyses.length >= 4 && alignment === 'full') {
      confidence += 0.15;
    } else if (analyses.length >= 3 && alignment !== 'none') {
      confidence += 0.1;
    }

    // Cap confidence
    confidence = Math.min(1, confidence);

    // Determine recommendation
    let recommendation: 'LONG' | 'SHORT' | 'NEUTRAL';
    if (alignment === 'none' || confidence < 0.3) {
      recommendation = 'NEUTRAL';
    } else {
      recommendation = primaryBias;
    }

    // Build trade plan from lowest timeframe if available and aligned
    let tradePlan: MultiTimeframeSynthesis['tradePlan'];
    const lowestTF = analyses[analyses.length - 1];
    if (
      alignment !== 'none' &&
      lowestTF.entryZone &&
      recommendation !== 'NEUTRAL'
    ) {
      // Calculate entry from lowest TF entry zone
      const entry =
        recommendation === 'LONG'
          ? lowestTF.entryZone.low
          : lowestTF.entryZone.high;

      // Get SL from support/resistance levels
      const allSupport = analyses.flatMap((a) => a.keyLevels.support);
      const allResistance = analyses.flatMap((a) => a.keyLevels.resistance);

      let stopLoss: number;
      let takeProfit: number[];

      if (recommendation === 'LONG') {
        // SL below support, TP at resistance levels
        stopLoss =
          allSupport.filter((s) => s < entry).sort((a, b) => b - a)[0] || entry * 0.98;
        takeProfit = allResistance
          .filter((r) => r > entry)
          .sort((a, b) => a - b)
          .slice(0, 3);
      } else {
        // SL above resistance, TP at support levels
        stopLoss =
          allResistance.filter((r) => r > entry).sort((a, b) => a - b)[0] ||
          entry * 1.02;
        takeProfit = allSupport
          .filter((s) => s < entry)
          .sort((a, b) => b - a)
          .slice(0, 3);
      }

      // Determine risk percentage based on confidence
      let riskPercentage = options.riskPerTrade || 1.0;
      if (confidence >= 0.7) {
        riskPercentage = 1.5;
      } else if (confidence >= 0.5) {
        riskPercentage = 1.0;
      } else {
        riskPercentage = 0.5;
      }

      tradePlan = {
        entry,
        stopLoss,
        takeProfit: takeProfit.length > 0 ? takeProfit : [entry * (recommendation === 'LONG' ? 1.05 : 0.95)],
        riskPercentage,
      };
    }

    // Build reasoning
    const reasoning = this.buildFlexibleSynthesisReasoning(
      analyses,
      alignment,
      confidence
    );

    return {
      recommendation,
      confidence,
      alignment,
      reasoning,
      tradePlan,
    };
  }

  /**
   * Parse flexible timeframe analysis response
   */
  private parseTimeframeResponse(
    response: string,
    interval: string,
    position: number,
    higherTFContext: HigherTimeframeContext | null
  ): TimeframeAnalysis {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const data = JSON.parse(jsonMatch[0]);

      return {
        interval,
        position,
        trend: this.validateTrend(data.trend),
        trendStrength: this.validateTrendStrength(data.trendStrength),
        keyLevels: {
          support: this.parseNumberArray(data.support),
          resistance: this.parseNumberArray(data.resistance),
        },
        signals: Array.isArray(data.signals) ? data.signals : [],
        alignsWithHigherTF: position === 0 ? true : Boolean(data.alignsWithHigherTF),
        entryZone: data.entryZone
          ? {
              low: parseFloat(data.entryZone.low) || 0,
              high: parseFloat(data.entryZone.high) || 0,
            }
          : undefined,
        bias: this.validateBias(data.bias),
        reasoning: data.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      console.error(
        `[MultiTimeframeAnalysisService] Failed to parse timeframe response for ${interval}:`,
        error
      );
      // Return neutral analysis on parse failure
      return {
        interval,
        position,
        trend: 'neutral',
        trendStrength: 'weak',
        keyLevels: { support: [], resistance: [] },
        signals: [],
        alignsWithHigherTF: position === 0,
        bias: higherTFContext?.bias || 'NEUTRAL',
        reasoning: `Failed to parse analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Build synthesis reasoning for flexible analysis
   */
  private buildFlexibleSynthesisReasoning(
    analyses: TimeframeAnalysis[],
    alignment: 'full' | 'partial' | 'none',
    confidence: number
  ): string {
    const parts: string[] = [];

    // Summarize each timeframe
    for (const analysis of analyses) {
      const positionLabel =
        analysis.position === 0
          ? 'HIGHEST'
          : analysis.position === analyses.length - 1
            ? 'LOWEST'
            : `POS-${analysis.position + 1}`;

      parts.push(
        `${analysis.interval} (${positionLabel}): ${analysis.trend} ${analysis.bias}${
          analysis.position > 0 ? `, aligns: ${analysis.alignsWithHigherTF ? '✓' : '✗'}` : ''
        }`
      );
    }

    // Add summary
    parts.push(
      `| SUMMARY: ${analyses.length}TF cascade, alignment: ${alignment.toUpperCase()}, confidence: ${(confidence * 100).toFixed(0)}%`
    );

    return parts.join(' | ');
  }
}
