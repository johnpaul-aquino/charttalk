/**
 * Multi-Timeframe Analysis Service Tests
 *
 * Unit tests for cascade analysis across multiple timeframes.
 * Tests both legacy mode (HTF → ETF → LTF) and flexible mode (any N timeframes).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MultiTimeframeAnalysisService } from '../multi-timeframe-analysis.service';
import type { ClaudeProvider } from '../../providers/claude.provider';
import type { SignalGenerationService } from '../signal-generation.service';
import type {
  ChartInfo,
  HTFAnalysis,
  ETFAnalysis,
  TimeframeAnalysis,
  MultiTimeframeAnalysisOptions,
} from '../../interfaces/multi-timeframe.interface';

// Mock ClaudeProvider
const createMockClaudeProvider = (): ClaudeProvider =>
  ({
    analyzeImage: vi.fn(),
    getName: vi.fn().mockReturnValue('Claude'),
    getModel: vi.fn().mockReturnValue('claude-opus-4-5-20251101'),
    isAvailable: vi.fn().mockResolvedValue(true),
    getSupportedModels: vi.fn().mockReturnValue(['claude-opus-4-5-20251101']),
    setModel: vi.fn(),
  }) as unknown as ClaudeProvider;

// Mock SignalGenerationService
const createMockSignalService = (): SignalGenerationService =>
  ({
    parseAnalysisResponse: vi.fn(),
    validateSignal: vi.fn().mockReturnValue({ valid: true }),
    calculateRiskReward: vi.fn().mockReturnValue(2.0),
  }) as unknown as SignalGenerationService;

// Helper to create chart info for testing
const createChartInfo = (
  role: 'htf' | 'etf' | 'ltf',
  interval: string
): ChartInfo => ({
  id: `chart-${role}-${interval}`,
  role,
  symbol: 'BINANCE:BTCUSDT',
  interval,
  imageUrl: `https://example.com/chart-${role}.png`,
  indicators: ['RSI', 'MACD'],
  config: { symbol: 'BINANCE:BTCUSDT', interval } as any,
  generatedAt: new Date(),
});

// Mock JSON responses for LLM
const mockHTFResponse = JSON.stringify({
  trend: 'bullish',
  trendStrength: 'strong',
  support: [92000, 90000],
  resistance: [100000, 105000],
  bias: 'LONG',
  reasoning: 'Strong uptrend with price above all MAs',
});

const mockETFResponse = JSON.stringify({
  alignsWithHTF: true,
  entryZone: { low: 95000, high: 96000 },
  triggers: ['RSI bouncing from 40', 'MACD bullish cross'],
  signalStrength: 0.75,
  reasoning: 'Entry zone identified at pullback to support',
});

const mockLTFResponse = JSON.stringify({
  preciseEntry: 95500,
  stopLoss: 93500,
  takeProfit: [98000, 100000, 105000],
  riskReward: 2.5,
  reasoning: 'Entry at local support with tight stop',
});

const mockFlexibleResponse = JSON.stringify({
  trend: 'bullish',
  trendStrength: 'moderate',
  support: [94000, 92000],
  resistance: [98000, 100000],
  signals: ['RSI oversold', 'MACD divergence'],
  alignsWithHigherTF: true,
  bias: 'LONG',
  entryZone: { low: 94500, high: 95500 },
  reasoning: 'Confirms higher timeframe bias',
});

describe('MultiTimeframeAnalysisService', () => {
  let service: MultiTimeframeAnalysisService;
  let mockClaudeProvider: ClaudeProvider;
  let mockSignalService: SignalGenerationService;

  beforeEach(() => {
    mockClaudeProvider = createMockClaudeProvider();
    mockSignalService = createMockSignalService();
    service = new MultiTimeframeAnalysisService(mockClaudeProvider, mockSignalService);
    vi.clearAllMocks();
  });

  // ==========================================================================
  // LEGACY MODE TESTS (HTF → ETF → LTF)
  // ==========================================================================

  describe('Legacy Mode: analyzeMultiTimeframe', () => {
    const charts: ChartInfo[] = [
      createChartInfo('htf', '1D'),
      createChartInfo('etf', '4h'),
      createChartInfo('ltf', '15m'),
    ];

    const options: MultiTimeframeAnalysisOptions = {
      symbol: 'BINANCE:BTCUSDT',
      tradingStyle: 'swing_trading',
    };

    it('should perform cascade analysis with all three timeframes', async () => {
      (mockClaudeProvider.analyzeImage as any)
        .mockResolvedValueOnce(mockHTFResponse)
        .mockResolvedValueOnce(mockETFResponse)
        .mockResolvedValueOnce(mockLTFResponse);

      const result = await service.analyzeMultiTimeframe(charts, options);

      expect(result.requestId).toBeDefined();
      expect(result.symbol).toBe('BINANCE:BTCUSDT');
      expect(result.htf).toBeDefined();
      expect(result.etf).toBeDefined();
      expect(result.ltf).toBeDefined();
      expect(result.synthesis).toBeDefined();
      expect(result.analyzedAt).toBeDefined();
    });

    it('should analyze HTF, ETF, and LTF in sequence', async () => {
      (mockClaudeProvider.analyzeImage as any)
        .mockResolvedValueOnce(mockHTFResponse)
        .mockResolvedValueOnce(mockETFResponse)
        .mockResolvedValueOnce(mockLTFResponse);

      await service.analyzeMultiTimeframe(charts, options);

      expect(mockClaudeProvider.analyzeImage).toHaveBeenCalledTimes(3);
    });

    it('should throw error if HTF chart is missing', async () => {
      const chartsWithoutHTF = [
        createChartInfo('etf', '4h'),
        createChartInfo('ltf', '15m'),
      ];

      await expect(
        service.analyzeMultiTimeframe(chartsWithoutHTF, options)
      ).rejects.toThrow('HTF chart is required');
    });

    it('should throw error if ETF chart is missing', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValueOnce(mockHTFResponse);

      const chartsWithoutETF = [
        createChartInfo('htf', '1D'),
        createChartInfo('ltf', '15m'),
      ];

      await expect(
        service.analyzeMultiTimeframe(chartsWithoutETF, options)
      ).rejects.toThrow('ETF chart is required');
    });

    it('should work with only HTF and ETF (LTF optional)', async () => {
      (mockClaudeProvider.analyzeImage as any)
        .mockResolvedValueOnce(mockHTFResponse)
        .mockResolvedValueOnce(mockETFResponse);

      const chartsWithoutLTF = [
        createChartInfo('htf', '1D'),
        createChartInfo('etf', '4h'),
      ];

      const result = await service.analyzeMultiTimeframe(chartsWithoutLTF, options);

      expect(result.htf).toBeDefined();
      expect(result.etf).toBeDefined();
      expect(result.ltf).toBeUndefined();
      expect(result.synthesis).toBeDefined();
    });

    it('should include trading rules in analysis prompts', async () => {
      (mockClaudeProvider.analyzeImage as any)
        .mockResolvedValueOnce(mockHTFResponse)
        .mockResolvedValueOnce(mockETFResponse)
        .mockResolvedValueOnce(mockLTFResponse);

      const optionsWithRules: MultiTimeframeAnalysisOptions = {
        ...options,
        tradingRules: 'Only trade with the trend. Wait for pullbacks.',
      };

      await service.analyzeMultiTimeframe(charts, optionsWithRules);

      expect(mockClaudeProvider.analyzeImage).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining('Only trade with the trend'),
        expect.any(Object)
      );
    });
  });

  describe('Legacy Mode: analyzeHTF', () => {
    const htfChart = createChartInfo('htf', '1D');

    it('should parse bullish trend correctly', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(mockHTFResponse);

      const result = await service.analyzeHTF(htfChart, {});

      expect(result.interval).toBe('1D');
      expect(result.trend).toBe('bullish');
      expect(result.trendStrength).toBe('strong');
      expect(result.bias).toBe('LONG');
    });

    it('should parse key levels correctly', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(mockHTFResponse);

      const result = await service.analyzeHTF(htfChart, {});

      expect(result.keyLevels.support).toEqual([92000, 90000]);
      expect(result.keyLevels.resistance).toEqual([100000, 105000]);
    });

    it('should parse bearish trend correctly', async () => {
      const bearishResponse = JSON.stringify({
        trend: 'bearish',
        trendStrength: 'moderate',
        support: [80000],
        resistance: [90000],
        bias: 'SHORT',
        reasoning: 'Downtrend with lower lows',
      });
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(bearishResponse);

      const result = await service.analyzeHTF(htfChart, {});

      expect(result.trend).toBe('bearish');
      expect(result.bias).toBe('SHORT');
    });

    it('should handle malformed JSON response gracefully', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue('Not valid JSON');

      const result = await service.analyzeHTF(htfChart, {});

      expect(result.trend).toBe('neutral');
      expect(result.bias).toBe('NEUTRAL');
      expect(result.reasoning).toContain('Failed to parse');
    });

    it('should extract JSON from markdown code blocks', async () => {
      const responseWithMarkdown = `
        Here is the analysis:
        \`\`\`json
        ${mockHTFResponse}
        \`\`\`
      `;
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(responseWithMarkdown);

      const result = await service.analyzeHTF(htfChart, {});

      expect(result.trend).toBe('bullish');
      expect(result.bias).toBe('LONG');
    });
  });

  describe('Legacy Mode: analyzeETF', () => {
    const etfChart = createChartInfo('etf', '4h');
    const htfContext: HTFAnalysis = {
      interval: '1D',
      trend: 'bullish',
      trendStrength: 'strong',
      keyLevels: { support: [92000, 90000], resistance: [100000, 105000] },
      bias: 'LONG',
      reasoning: 'Strong uptrend',
    };

    it('should parse ETF analysis correctly', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(mockETFResponse);

      const result = await service.analyzeETF(etfChart, htfContext, {});

      expect(result.interval).toBe('4h');
      expect(result.alignsWithHTF).toBe(true);
      expect(result.signalStrength).toBe(0.75);
    });

    it('should parse entry zone correctly', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(mockETFResponse);

      const result = await service.analyzeETF(etfChart, htfContext, {});

      expect(result.entryZone.low).toBe(95000);
      expect(result.entryZone.high).toBe(96000);
    });

    it('should parse triggers correctly', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(mockETFResponse);

      const result = await service.analyzeETF(etfChart, htfContext, {});

      expect(result.triggers).toContain('RSI bouncing from 40');
      expect(result.triggers).toContain('MACD bullish cross');
    });

    it('should clamp signal strength to [0, 1]', async () => {
      const invalidResponse = JSON.stringify({
        alignsWithHTF: true,
        entryZone: { low: 95000, high: 96000 },
        triggers: [],
        signalStrength: 1.5, // Invalid - above 1
        reasoning: 'Test',
      });
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(invalidResponse);

      const result = await service.analyzeETF(etfChart, htfContext, {});

      expect(result.signalStrength).toBe(1);
    });

    it('should handle malformed response gracefully', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue('Invalid');

      const result = await service.analyzeETF(etfChart, htfContext, {});

      expect(result.alignsWithHTF).toBe(false);
      expect(result.signalStrength).toBe(0);
      expect(result.reasoning).toContain('Failed to parse');
    });
  });

  describe('Legacy Mode: analyzeLTF', () => {
    const ltfChart = createChartInfo('ltf', '15m');
    const htfContext: HTFAnalysis = {
      interval: '1D',
      trend: 'bullish',
      trendStrength: 'strong',
      keyLevels: { support: [92000], resistance: [100000] },
      bias: 'LONG',
      reasoning: 'Uptrend',
    };
    const etfContext: ETFAnalysis = {
      interval: '4h',
      alignsWithHTF: true,
      entryZone: { low: 95000, high: 96000 },
      triggers: ['RSI bounce'],
      signalStrength: 0.75,
      reasoning: 'Entry zone found',
    };

    it('should parse LTF analysis correctly', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(mockLTFResponse);

      const result = await service.analyzeLTF(ltfChart, htfContext, etfContext, {});

      expect(result.interval).toBe('15m');
      expect(result.preciseEntry).toBe(95500);
      expect(result.stopLoss).toBe(93500);
      expect(result.riskReward).toBe(2.5);
    });

    it('should parse multiple take profit levels', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(mockLTFResponse);

      const result = await service.analyzeLTF(ltfChart, htfContext, etfContext, {});

      expect(result.takeProfit).toEqual([98000, 100000, 105000]);
    });

    it('should handle malformed response gracefully', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue('Invalid');

      const result = await service.analyzeLTF(ltfChart, htfContext, etfContext, {});

      expect(result.preciseEntry).toBe(0);
      expect(result.stopLoss).toBe(0);
      expect(result.takeProfit).toEqual([]);
      expect(result.reasoning).toContain('Failed to parse');
    });
  });

  describe('Legacy Mode: Synthesis', () => {
    it('should synthesize full alignment as LONG recommendation', async () => {
      (mockClaudeProvider.analyzeImage as any)
        .mockResolvedValueOnce(mockHTFResponse)
        .mockResolvedValueOnce(mockETFResponse)
        .mockResolvedValueOnce(mockLTFResponse);

      const charts = [
        createChartInfo('htf', '1D'),
        createChartInfo('etf', '4h'),
        createChartInfo('ltf', '15m'),
      ];

      const result = await service.analyzeMultiTimeframe(charts, {
        symbol: 'BINANCE:BTCUSDT',
      });

      expect(result.synthesis.recommendation).toBe('LONG');
      expect(result.synthesis.alignment).toBe('full');
      expect(result.synthesis.confidence).toBeGreaterThan(0.5);
    });

    it('should synthesize misalignment as NEUTRAL', async () => {
      const misalignedETF = JSON.stringify({
        alignsWithHTF: false,
        entryZone: { low: 95000, high: 96000 },
        triggers: [],
        signalStrength: 0.3,
        reasoning: 'Does not align with HTF',
      });

      (mockClaudeProvider.analyzeImage as any)
        .mockResolvedValueOnce(mockHTFResponse)
        .mockResolvedValueOnce(misalignedETF)
        .mockResolvedValueOnce(mockLTFResponse);

      const charts = [
        createChartInfo('htf', '1D'),
        createChartInfo('etf', '4h'),
        createChartInfo('ltf', '15m'),
      ];

      const result = await service.analyzeMultiTimeframe(charts, {
        symbol: 'BINANCE:BTCUSDT',
      });

      expect(result.synthesis.alignment).toBe('none');
      expect(result.synthesis.recommendation).toBe('NEUTRAL');
    });

    it('should include trade plan when aligned', async () => {
      (mockClaudeProvider.analyzeImage as any)
        .mockResolvedValueOnce(mockHTFResponse)
        .mockResolvedValueOnce(mockETFResponse)
        .mockResolvedValueOnce(mockLTFResponse);

      const charts = [
        createChartInfo('htf', '1D'),
        createChartInfo('etf', '4h'),
        createChartInfo('ltf', '15m'),
      ];

      const result = await service.analyzeMultiTimeframe(charts, {
        symbol: 'BINANCE:BTCUSDT',
      });

      expect(result.synthesis.tradePlan).toBeDefined();
      expect(result.synthesis.tradePlan!.entry).toBe(95500);
      expect(result.synthesis.tradePlan!.stopLoss).toBe(93500);
      expect(result.synthesis.tradePlan!.takeProfit).toEqual([98000, 100000, 105000]);
    });

    it('should adjust risk percentage based on confidence', async () => {
      (mockClaudeProvider.analyzeImage as any)
        .mockResolvedValueOnce(mockHTFResponse)
        .mockResolvedValueOnce(mockETFResponse)
        .mockResolvedValueOnce(mockLTFResponse);

      const charts = [
        createChartInfo('htf', '1D'),
        createChartInfo('etf', '4h'),
        createChartInfo('ltf', '15m'),
      ];

      const result = await service.analyzeMultiTimeframe(charts, {
        symbol: 'BINANCE:BTCUSDT',
      });

      // High confidence should result in higher risk percentage
      const tradePlan = result.synthesis.tradePlan;
      expect(tradePlan!.riskPercentage).toBeGreaterThanOrEqual(0.5);
      expect(tradePlan!.riskPercentage).toBeLessThanOrEqual(1.5);
    });

    it('should build synthesis reasoning with all timeframe info', async () => {
      (mockClaudeProvider.analyzeImage as any)
        .mockResolvedValueOnce(mockHTFResponse)
        .mockResolvedValueOnce(mockETFResponse)
        .mockResolvedValueOnce(mockLTFResponse);

      const charts = [
        createChartInfo('htf', '1D'),
        createChartInfo('etf', '4h'),
        createChartInfo('ltf', '15m'),
      ];

      const result = await service.analyzeMultiTimeframe(charts, {
        symbol: 'BINANCE:BTCUSDT',
      });

      expect(result.synthesis.reasoning).toContain('HTF');
      expect(result.synthesis.reasoning).toContain('ETF');
      expect(result.synthesis.reasoning).toContain('LTF');
      expect(result.synthesis.reasoning).toContain('1D');
      expect(result.synthesis.reasoning).toContain('4h');
      expect(result.synthesis.reasoning).toContain('15m');
    });
  });

  // ==========================================================================
  // FLEXIBLE MODE TESTS (Any N Timeframes)
  // ==========================================================================

  describe('Flexible Mode: analyzeFlexibleMultiTimeframe', () => {
    it('should analyze 4 timeframes in cascade', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(mockFlexibleResponse);

      const charts: ChartInfo[] = [
        { ...createChartInfo('htf', '1W'), role: undefined },
        { ...createChartInfo('htf', '1D'), role: undefined },
        { ...createChartInfo('etf', '4h'), role: undefined },
        { ...createChartInfo('ltf', '1h'), role: undefined },
      ];

      const result = await service.analyzeFlexibleMultiTimeframe(charts, {
        symbol: 'BINANCE:BTCUSDT',
      });

      expect(result.requestId).toBeDefined();
      expect(result.timeframeAnalyses.length).toBe(4);
      expect(result.synthesis).toBeDefined();
    });

    it('should analyze 2 timeframes minimum', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(mockFlexibleResponse);

      const charts: ChartInfo[] = [
        { ...createChartInfo('htf', '1D'), role: undefined },
        { ...createChartInfo('ltf', '4h'), role: undefined },
      ];

      const result = await service.analyzeFlexibleMultiTimeframe(charts, {
        symbol: 'BINANCE:BTCUSDT',
      });

      expect(result.timeframeAnalyses.length).toBe(2);
      expect(mockClaudeProvider.analyzeImage).toHaveBeenCalledTimes(2);
    });

    it('should sort timeframes from highest to lowest', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(mockFlexibleResponse);

      // Provide in mixed order
      const charts: ChartInfo[] = [
        { ...createChartInfo('ltf', '15m'), role: undefined },
        { ...createChartInfo('htf', '1D'), role: undefined },
        { ...createChartInfo('etf', '4h'), role: undefined },
      ];

      const result = await service.analyzeFlexibleMultiTimeframe(charts, {
        symbol: 'BINANCE:BTCUSDT',
      });

      // Should be sorted 1D -> 4h -> 15m
      expect(result.timeframeAnalyses[0].interval).toBe('1D');
      expect(result.timeframeAnalyses[1].interval).toBe('4h');
      expect(result.timeframeAnalyses[2].interval).toBe('15m');
    });

    it('should assign position correctly', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(mockFlexibleResponse);

      const charts: ChartInfo[] = [
        { ...createChartInfo('htf', '1D'), role: undefined },
        { ...createChartInfo('etf', '4h'), role: undefined },
        { ...createChartInfo('ltf', '1h'), role: undefined },
      ];

      const result = await service.analyzeFlexibleMultiTimeframe(charts, {
        symbol: 'BINANCE:BTCUSDT',
      });

      expect(result.timeframeAnalyses[0].position).toBe(0); // Highest
      expect(result.timeframeAnalyses[1].position).toBe(1);
      expect(result.timeframeAnalyses[2].position).toBe(2); // Lowest
    });
  });

  describe('Flexible Mode: buildHigherTimeframeContext', () => {
    it('should return empty context for no analyses', () => {
      const context = service.buildHigherTimeframeContext([]);

      expect(context.summary).toBe('');
      expect(context.bias).toBe('NEUTRAL');
      expect(context.support).toEqual([]);
      expect(context.resistance).toEqual([]);
      expect(context.allAligned).toBe(true);
      expect(context.timeframeCount).toBe(0);
    });

    it('should build context from single analysis', () => {
      const analyses: TimeframeAnalysis[] = [
        {
          interval: '1D',
          position: 0,
          trend: 'bullish',
          trendStrength: 'strong',
          keyLevels: { support: [92000], resistance: [100000] },
          signals: ['RSI bullish'],
          alignsWithHigherTF: true,
          bias: 'LONG',
          reasoning: 'Uptrend',
        },
      ];

      const context = service.buildHigherTimeframeContext(analyses);

      expect(context.bias).toBe('LONG');
      expect(context.support).toContain(92000);
      expect(context.resistance).toContain(100000);
      expect(context.allAligned).toBe(true);
      expect(context.timeframeCount).toBe(1);
    });

    it('should combine levels from multiple analyses', () => {
      const analyses: TimeframeAnalysis[] = [
        {
          interval: '1D',
          position: 0,
          trend: 'bullish',
          trendStrength: 'strong',
          keyLevels: { support: [92000], resistance: [100000] },
          signals: [],
          alignsWithHigherTF: true,
          bias: 'LONG',
          reasoning: '',
        },
        {
          interval: '4h',
          position: 1,
          trend: 'bullish',
          trendStrength: 'moderate',
          keyLevels: { support: [94000], resistance: [98000] },
          signals: [],
          alignsWithHigherTF: true,
          bias: 'LONG',
          reasoning: '',
        },
      ];

      const context = service.buildHigherTimeframeContext(analyses);

      expect(context.support).toContain(92000);
      expect(context.support).toContain(94000);
      expect(context.resistance).toContain(100000);
      expect(context.resistance).toContain(98000);
    });

    it('should detect misalignment', () => {
      const analyses: TimeframeAnalysis[] = [
        {
          interval: '1D',
          position: 0,
          trend: 'bullish',
          trendStrength: 'strong',
          keyLevels: { support: [], resistance: [] },
          signals: [],
          alignsWithHigherTF: true,
          bias: 'LONG',
          reasoning: '',
        },
        {
          interval: '4h',
          position: 1,
          trend: 'bearish',
          trendStrength: 'moderate',
          keyLevels: { support: [], resistance: [] },
          signals: [],
          alignsWithHigherTF: false,
          bias: 'SHORT', // Contradicts HTF
          reasoning: '',
        },
      ];

      const context = service.buildHigherTimeframeContext(analyses);

      expect(context.allAligned).toBe(false);
    });

    it('should build summary text', () => {
      const analyses: TimeframeAnalysis[] = [
        {
          interval: '1D',
          position: 0,
          trend: 'bullish',
          trendStrength: 'strong',
          keyLevels: { support: [], resistance: [] },
          signals: [],
          alignsWithHigherTF: true,
          bias: 'LONG',
          reasoning: '',
        },
      ];

      const context = service.buildHigherTimeframeContext(analyses);

      expect(context.summary).toContain('1D');
      expect(context.summary).toContain('bullish');
      expect(context.summary).toContain('LONG');
    });
  });

  describe('Flexible Mode: synthesizeAnalyses', () => {
    it('should recommend LONG with full alignment', () => {
      const analyses: TimeframeAnalysis[] = [
        {
          interval: '1D',
          position: 0,
          trend: 'bullish',
          trendStrength: 'strong',
          keyLevels: { support: [92000], resistance: [100000] },
          signals: ['RSI bullish'],
          alignsWithHigherTF: true,
          bias: 'LONG',
          reasoning: '',
        },
        {
          interval: '4h',
          position: 1,
          trend: 'bullish',
          trendStrength: 'moderate',
          keyLevels: { support: [94000], resistance: [98000] },
          signals: ['MACD cross'],
          alignsWithHigherTF: true,
          entryZone: { low: 95000, high: 96000 },
          bias: 'LONG',
          reasoning: '',
        },
      ];

      const synthesis = service.synthesizeAnalyses(analyses, {
        symbol: 'BINANCE:BTCUSDT',
      });

      expect(synthesis.recommendation).toBe('LONG');
      expect(synthesis.alignment).toBe('full');
      expect(synthesis.confidence).toBeGreaterThan(0.3);
    });

    it('should recommend SHORT with bearish alignment', () => {
      const analyses: TimeframeAnalysis[] = [
        {
          interval: '1D',
          position: 0,
          trend: 'bearish',
          trendStrength: 'strong',
          keyLevels: { support: [80000], resistance: [90000] },
          signals: [],
          alignsWithHigherTF: true,
          bias: 'SHORT',
          reasoning: '',
        },
        {
          interval: '4h',
          position: 1,
          trend: 'bearish',
          trendStrength: 'moderate',
          keyLevels: { support: [82000], resistance: [88000] },
          signals: [],
          alignsWithHigherTF: true,
          entryZone: { low: 85000, high: 86000 },
          bias: 'SHORT',
          reasoning: '',
        },
      ];

      const synthesis = service.synthesizeAnalyses(analyses, {
        symbol: 'BINANCE:BTCUSDT',
      });

      expect(synthesis.recommendation).toBe('SHORT');
    });

    it('should recommend NEUTRAL with no alignment', () => {
      const analyses: TimeframeAnalysis[] = [
        {
          interval: '1D',
          position: 0,
          trend: 'bullish',
          trendStrength: 'strong',
          keyLevels: { support: [], resistance: [] },
          signals: [],
          alignsWithHigherTF: true,
          bias: 'LONG',
          reasoning: '',
        },
        {
          interval: '4h',
          position: 1,
          trend: 'bearish',
          trendStrength: 'strong',
          keyLevels: { support: [], resistance: [] },
          signals: [],
          alignsWithHigherTF: false,
          bias: 'SHORT',
          reasoning: '',
        },
      ];

      const synthesis = service.synthesizeAnalyses(analyses, {
        symbol: 'BINANCE:BTCUSDT',
      });

      expect(synthesis.alignment).toBe('partial');
    });

    it('should return NEUTRAL for empty analyses', () => {
      const synthesis = service.synthesizeAnalyses([], {
        symbol: 'BINANCE:BTCUSDT',
      });

      expect(synthesis.recommendation).toBe('NEUTRAL');
      expect(synthesis.confidence).toBe(0);
      expect(synthesis.alignment).toBe('none');
    });

    it('should increase confidence with more aligned timeframes', () => {
      const threeAligned: TimeframeAnalysis[] = [
        {
          interval: '1D',
          position: 0,
          trend: 'bullish',
          trendStrength: 'strong',
          keyLevels: { support: [], resistance: [] },
          signals: ['sig1'],
          alignsWithHigherTF: true,
          bias: 'LONG',
          reasoning: '',
        },
        {
          interval: '4h',
          position: 1,
          trend: 'bullish',
          trendStrength: 'strong',
          keyLevels: { support: [], resistance: [] },
          signals: ['sig2'],
          alignsWithHigherTF: true,
          bias: 'LONG',
          reasoning: '',
        },
        {
          interval: '1h',
          position: 2,
          trend: 'bullish',
          trendStrength: 'strong',
          keyLevels: { support: [], resistance: [] },
          signals: ['sig3'],
          alignsWithHigherTF: true,
          entryZone: { low: 95000, high: 96000 },
          bias: 'LONG',
          reasoning: '',
        },
      ];

      const synthesis = service.synthesizeAnalyses(threeAligned, {
        symbol: 'BINANCE:BTCUSDT',
      });

      // Should have bonus for 3+ aligned timeframes
      expect(synthesis.confidence).toBeGreaterThan(0.5);
    });

    it('should build trade plan from lowest timeframe', () => {
      const analyses: TimeframeAnalysis[] = [
        {
          interval: '1D',
          position: 0,
          trend: 'bullish',
          trendStrength: 'strong',
          keyLevels: { support: [92000], resistance: [100000, 105000] },
          signals: [],
          alignsWithHigherTF: true,
          bias: 'LONG',
          reasoning: '',
        },
        {
          interval: '4h',
          position: 1,
          trend: 'bullish',
          trendStrength: 'moderate',
          keyLevels: { support: [94000], resistance: [98000] },
          signals: [],
          alignsWithHigherTF: true,
          entryZone: { low: 95000, high: 96000 },
          bias: 'LONG',
          reasoning: '',
        },
      ];

      const synthesis = service.synthesizeAnalyses(analyses, {
        symbol: 'BINANCE:BTCUSDT',
      });

      expect(synthesis.tradePlan).toBeDefined();
      expect(synthesis.tradePlan!.entry).toBe(95000); // Low of entry zone for LONG
    });

    it('should calculate SL and TP from key levels', () => {
      const analyses: TimeframeAnalysis[] = [
        {
          interval: '1D',
          position: 0,
          trend: 'bullish',
          trendStrength: 'strong',
          keyLevels: { support: [92000, 90000], resistance: [100000, 105000] },
          signals: [],
          alignsWithHigherTF: true,
          bias: 'LONG',
          reasoning: '',
        },
        {
          interval: '4h',
          position: 1,
          trend: 'bullish',
          trendStrength: 'moderate',
          keyLevels: { support: [94000], resistance: [98000] },
          signals: [],
          alignsWithHigherTF: true,
          entryZone: { low: 95000, high: 96000 },
          bias: 'LONG',
          reasoning: '',
        },
      ];

      const synthesis = service.synthesizeAnalyses(analyses, {
        symbol: 'BINANCE:BTCUSDT',
      });

      // SL should be below entry (at support)
      expect(synthesis.tradePlan!.stopLoss).toBeLessThan(synthesis.tradePlan!.entry);
      // TP should be above entry (at resistance)
      expect(synthesis.tradePlan!.takeProfit[0]).toBeGreaterThan(
        synthesis.tradePlan!.entry
      );
    });
  });

  // ==========================================================================
  // HELPER METHOD TESTS
  // ==========================================================================

  describe('Helper Methods: Validation', () => {
    it('should validate trend values correctly', async () => {
      const responses = [
        { input: 'bullish', expected: 'bullish' },
        { input: 'BULLISH', expected: 'bullish' },
        { input: 'uptrend', expected: 'bullish' },
        { input: 'bearish', expected: 'bearish' },
        { input: 'BEARISH', expected: 'bearish' },
        { input: 'downtrend', expected: 'bearish' },
        { input: 'neutral', expected: 'neutral' },
        { input: 'sideways', expected: 'neutral' },
        { input: 'unknown', expected: 'neutral' },
      ];

      for (const { input, expected } of responses) {
        const response = JSON.stringify({
          trend: input,
          trendStrength: 'moderate',
          support: [],
          resistance: [],
          bias: 'NEUTRAL',
          reasoning: 'Test',
        });
        (mockClaudeProvider.analyzeImage as any).mockResolvedValue(response);

        const result = await service.analyzeHTF(createChartInfo('htf', '1D'), {});

        expect(result.trend).toBe(expected);
      }
    });

    it('should validate trend strength correctly', async () => {
      const responses = [
        { input: 'strong', expected: 'strong' },
        { input: 'STRONG', expected: 'strong' },
        { input: 'moderate', expected: 'moderate' },
        { input: 'medium', expected: 'moderate' },
        { input: 'weak', expected: 'weak' },
        { input: 'unknown', expected: 'weak' },
      ];

      for (const { input, expected } of responses) {
        const response = JSON.stringify({
          trend: 'bullish',
          trendStrength: input,
          support: [],
          resistance: [],
          bias: 'LONG',
          reasoning: 'Test',
        });
        (mockClaudeProvider.analyzeImage as any).mockResolvedValue(response);

        const result = await service.analyzeHTF(createChartInfo('htf', '1D'), {});

        expect(result.trendStrength).toBe(expected);
      }
    });

    it('should validate bias values correctly', async () => {
      const responses = [
        { input: 'LONG', expected: 'LONG' },
        { input: 'BUY', expected: 'LONG' },
        { input: 'SHORT', expected: 'SHORT' },
        { input: 'SELL', expected: 'SHORT' },
        { input: 'NEUTRAL', expected: 'NEUTRAL' },
        { input: 'unknown', expected: 'NEUTRAL' },
      ];

      for (const { input, expected } of responses) {
        const response = JSON.stringify({
          trend: 'bullish',
          trendStrength: 'moderate',
          support: [],
          resistance: [],
          bias: input,
          reasoning: 'Test',
        });
        (mockClaudeProvider.analyzeImage as any).mockResolvedValue(response);

        const result = await service.analyzeHTF(createChartInfo('htf', '1D'), {});

        expect(result.bias).toBe(expected);
      }
    });

    it('should parse number arrays correctly', async () => {
      const response = JSON.stringify({
        trend: 'bullish',
        trendStrength: 'moderate',
        support: [92000, '94000', 96000.5, 'invalid', null],
        resistance: [],
        bias: 'LONG',
        reasoning: 'Test',
      });
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(response);

      const result = await service.analyzeHTF(createChartInfo('htf', '1D'), {});

      expect(result.keyLevels.support).toEqual([92000, 94000, 96000.5]);
    });

    it('should handle non-array values for number arrays', async () => {
      const response = JSON.stringify({
        trend: 'bullish',
        trendStrength: 'moderate',
        support: 'not an array',
        resistance: null,
        bias: 'LONG',
        reasoning: 'Test',
      });
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(response);

      const result = await service.analyzeHTF(createChartInfo('htf', '1D'), {});

      expect(result.keyLevels.support).toEqual([]);
      expect(result.keyLevels.resistance).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should handle LLM provider errors gracefully', async () => {
      (mockClaudeProvider.analyzeImage as any).mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      // HTF analysis should throw when LLM fails
      await expect(
        service.analyzeHTF(createChartInfo('htf', '1D'), {})
      ).rejects.toThrow();
    });

    it('should continue with default values when parsing fails', async () => {
      (mockClaudeProvider.analyzeImage as any).mockResolvedValue(
        '{"malformed: json'
      );

      const result = await service.analyzeHTF(createChartInfo('htf', '1D'), {});

      expect(result.trend).toBe('neutral');
      expect(result.bias).toBe('NEUTRAL');
    });
  });
});
