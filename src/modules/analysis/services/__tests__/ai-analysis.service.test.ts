/**
 * AI Analysis Service Tests
 *
 * Unit tests for AI-powered chart analysis with mocked dependencies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AIAnalysisService } from '../ai-analysis.service';
import { SignalGenerationService } from '../signal-generation.service';
import type { ILLMProvider } from '../../providers/llm-provider.interface';
import type { AnalysisRequest, AnalysisResult, TradingSignal } from '../../interfaces/analysis.interface';

// Mock LLM Provider
const createMockLLMProvider = (): ILLMProvider => ({
  analyzeImage: vi.fn(),
  getName: vi.fn().mockReturnValue('MockLLM'),
  getModel: vi.fn().mockReturnValue('mock-model'),
  isAvailable: vi.fn().mockResolvedValue(true),
  getSupportedModels: vi.fn().mockReturnValue(['mock-model']),
  setModel: vi.fn(),
});

describe('AIAnalysisService', () => {
  let service: AIAnalysisService;
  let mockLLMProvider: ILLMProvider;
  let signalGenerator: SignalGenerationService;

  beforeEach(() => {
    mockLLMProvider = createMockLLMProvider();
    signalGenerator = new SignalGenerationService();
    service = new AIAnalysisService(mockLLMProvider, signalGenerator);
  });

  describe('analyzeChart', () => {
    const validRequest: AnalysisRequest = {
      chartUrl: 'https://example.com/chart.png',
      symbol: 'BINANCE:BTCUSDT',
      interval: '4h',
    };

    it('should successfully analyze a chart from URL', async () => {
      const mockAnalysisText = `
        **Overall Trend**: Bullish

        The chart shows a strong bullish trend with price trading above all major moving averages.

        **Key Levels**:
        - Support: $94,000
        - Resistance: $100,000

        **Signal**: LONG
        Entry: $95,000
        Stop Loss: $93,500
        Take Profit: $98,000
        Confidence: 75%
      `;

      (mockLLMProvider.analyzeImage as any).mockResolvedValue(mockAnalysisText);

      const result = await service.analyzeChart(validRequest);

      expect(result.success).toBe(true);
      expect(result.analysis).toBeDefined();
      expect(result.analysis!.trend).toBe('bullish');
      expect(result.analysis!.recommendation).toBe('LONG');
      expect(result.analysis!.analysisText).toBe(mockAnalysisText);
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.model).toBe('mock-model');
      expect(result.metadata!.processingTime).toBeGreaterThanOrEqual(0);
      expect(typeof result.metadata!.processingTime).toBe('number');
    });

    it('should handle chart from local path', async () => {
      const mockAnalysisText = 'Bearish trend detected...';
      (mockLLMProvider.analyzeImage as any).mockResolvedValue(mockAnalysisText);

      const request: AnalysisRequest = {
        chartPath: '/tmp/chart.png',
        symbol: 'NASDAQ:AAPL',
        interval: '1D',
      };

      const result = await service.analyzeChart(request);

      expect(result.success).toBe(true);
      expect(mockLLMProvider.analyzeImage).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '/tmp/chart.png',
        }),
        expect.any(String),
        expect.any(Object)
      );
    });

    it('should return error when neither chartUrl nor chartPath provided', async () => {
      const request: AnalysisRequest = {
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
      };

      const result = await service.analyzeChart(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('chartUrl or chartPath must be provided');
    });

    it('should extract trend from analysis text', async () => {
      const tests = [
        { text: 'The market is bullish', expected: 'bullish' },
        { text: 'Bearish trend continues', expected: 'bearish' },
        { text: 'Price is consolidating in a neutral pattern', expected: 'neutral' },
      ];

      for (const { text, expected } of tests) {
        (mockLLMProvider.analyzeImage as any).mockResolvedValue(text);

        const result = await service.analyzeChart(validRequest);

        expect(result.analysis!.trend).toBe(expected);
      }
    });

    it('should extract key support and resistance levels', async () => {
      const mockAnalysisText = `
        Analysis shows multiple key levels:

        Support: $92,000
        Support: $90,000
        Resistance: $98,000
        Resistance: $100,000
      `;

      (mockLLMProvider.analyzeImage as any).mockResolvedValue(mockAnalysisText);

      const result = await service.analyzeChart(validRequest);

      expect(result.analysis!.keyLevels).toBeDefined();
      expect(result.analysis!.keyLevels!.support).toEqual([92000, 90000]);
      expect(result.analysis!.keyLevels!.resistance).toEqual([98000, 100000]);
    });

    it('should extract entry, stop loss, and take profit levels', async () => {
      const mockAnalysisText = `
        LONG signal
        Entry: $95,000
        Stop: $93,500
        Take Profit: $98,000
      `;

      (mockLLMProvider.analyzeImage as any).mockResolvedValue(mockAnalysisText);

      const result = await service.analyzeChart(validRequest);

      expect(result.analysis!.entryPrice).toBe(95000);
      expect(result.analysis!.stopLoss).toBe(93500);
      expect(result.analysis!.takeProfit).toBe(98000);
      expect(result.analysis!.riskRewardRatio).toBe(2.0); // Risk: 1500, Reward: 3000, R:R = 2.0
    });

    it('should use custom prompt when provided', async () => {
      (mockLLMProvider.analyzeImage as any).mockResolvedValue('Custom analysis');

      const customPrompt = 'Analyze this chart focusing on volume patterns';
      const request: AnalysisRequest = {
        ...validRequest,
        prompt: customPrompt,
      };

      await service.analyzeChart(request);

      expect(mockLLMProvider.analyzeImage).toHaveBeenCalledWith(
        expect.any(Object),
        customPrompt,
        expect.any(Object)
      );
    });

    it('should build prompt based on trading style', async () => {
      (mockLLMProvider.analyzeImage as any).mockResolvedValue('Analysis');

      const request: AnalysisRequest = {
        ...validRequest,
        options: {
          tradingStyle: 'day_trading',
        },
      };

      await service.analyzeChart(request);

      expect(mockLLMProvider.analyzeImage).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining('intraday'),
        expect.any(Object)
      );
    });

    it('should include risk management in prompt when requested', async () => {
      (mockLLMProvider.analyzeImage as any).mockResolvedValue('Analysis');

      const request: AnalysisRequest = {
        ...validRequest,
        options: {
          includeRiskManagement: true,
        },
      };

      await service.analyzeChart(request);

      expect(mockLLMProvider.analyzeImage).toHaveBeenCalledWith(
        expect.any(Object),
        expect.stringContaining('risk management'),
        expect.any(Object)
      );
    });

    it('should pass symbol and interval to system prompt', async () => {
      (mockLLMProvider.analyzeImage as any).mockResolvedValue('Analysis');

      await service.analyzeChart(validRequest);

      expect(mockLLMProvider.analyzeImage).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({
          systemPrompt: expect.stringContaining('BINANCE:BTCUSDT'),
        })
      );

      expect(mockLLMProvider.analyzeImage).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.objectContaining({
          systemPrompt: expect.stringContaining('4h'),
        })
      );
    });

    it('should handle LLM provider errors gracefully', async () => {
      (mockLLMProvider.analyzeImage as any).mockRejectedValue(
        new Error('API rate limit exceeded')
      );

      const result = await service.analyzeChart(validRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('rate limit');
      expect(result.metadata).toBeDefined();
      expect(result.metadata!.tokensUsed).toBe(0);
    });

    it('should estimate token usage', async () => {
      const longText = 'a'.repeat(1000); // ~250 tokens
      (mockLLMProvider.analyzeImage as any).mockResolvedValue(longText);

      const result = await service.analyzeChart(validRequest);

      expect(result.metadata!.tokensUsed).toBeGreaterThan(200);
      expect(result.metadata!.tokensUsed).toBeLessThan(300);
    });

    it('should extract confidence level from analysis', async () => {
      const mockAnalysisText = 'LONG signal with Confidence: 82%';
      (mockLLMProvider.analyzeImage as any).mockResolvedValue(mockAnalysisText);

      const result = await service.analyzeChart(validRequest);

      expect(result.analysis!.confidence).toBe(0.82);
    });

    it('should default to 0.5 confidence when not found', async () => {
      const mockAnalysisText = 'LONG signal without confidence';
      (mockLLMProvider.analyzeImage as any).mockResolvedValue(mockAnalysisText);

      const result = await service.analyzeChart(validRequest);

      expect(result.analysis!.confidence).toBe(0.5);
    });
  });

  describe('generateSignal', () => {
    it('should generate trading signal from successful analysis', async () => {
      const mockAnalysisResult: AnalysisResult = {
        success: true,
        analysis: {
          trend: 'bullish',
          signals: [],
          recommendation: 'LONG',
          entryPrice: 95000,
          stopLoss: 93500,
          takeProfit: 98000,
          confidence: 0.75,
          riskRewardRatio: 1.67,
          analysisText: `
            LONG signal
            Symbol: BINANCE:BTCUSDT
            Entry: $95,000
            Stop Loss: $93,500
            Take Profit: $98,000
            Confidence: 75%
          `,
        },
        metadata: {
          model: 'mock-model',
          tokensUsed: 100,
          processingTime: 1000,
        },
      };

      const signal = await service.generateSignal(mockAnalysisResult);

      expect(signal).not.toBeNull();
      expect(signal!.type).toBe('LONG');
      expect(signal!.symbol).toBe('BINANCE:BTCUSDT');
      expect(signal!.entryPrice).toBe(95000);
      expect(signal!.stopLoss).toBe(93500);
      expect(signal!.takeProfit).toBe(98000);
      expect(signal!.confidence).toBe(0.75);
    });

    it('should return null for failed analysis', async () => {
      const mockAnalysisResult: AnalysisResult = {
        success: false,
        error: 'Analysis failed',
      };

      const signal = await service.generateSignal(mockAnalysisResult);

      expect(signal).toBeNull();
    });

    it('should return null for incomplete signal data', async () => {
      const mockAnalysisResult: AnalysisResult = {
        success: true,
        analysis: {
          trend: 'bullish',
          signals: [],
          recommendation: 'LONG',
          confidence: 0.75,
          analysisText: 'Incomplete signal data',
        },
      };

      const signal = await service.generateSignal(mockAnalysisResult);

      expect(signal).toBeNull();
    });

    it('should return null for invalid signal (poor R:R)', async () => {
      const mockAnalysisResult: AnalysisResult = {
        success: true,
        analysis: {
          trend: 'bullish',
          signals: [],
          recommendation: 'LONG',
          entryPrice: 100,
          stopLoss: 95,
          takeProfit: 101, // R:R = 0.2 (poor)
          confidence: 0.75,
          riskRewardRatio: 0.2,
          analysisText: `
            LONG signal
            Entry: $100
            Stop: $95
            Take Profit: $101
          `,
        },
      };

      const signal = await service.generateSignal(mockAnalysisResult);

      expect(signal).toBeNull();
    });
  });
});
