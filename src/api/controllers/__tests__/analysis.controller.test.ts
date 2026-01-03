/**
 * Analysis Controller Tests
 *
 * Unit tests for the chart analysis REST API endpoint
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';

// Create mock functions at module scope first
const mockAnalyzeChart = vi.fn();
const mockGenerateSignal = vi.fn();

// Mock the DI container before any imports
vi.mock('../../../core/di', () => {
  return {
    container: {
      resolve: () => ({
        analyzeChart: mockAnalyzeChart,
        generateSignal: mockGenerateSignal,
      }),
    },
    AI_ANALYSIS_SERVICE: 'AI_ANALYSIS_SERVICE',
  };
});

// Import after mock setup
import { analyzeChartHandler } from '../analysis.controller';

describe('analyzeChartHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper to create mock NextRequest
  function createMockRequest(body: object): NextRequest {
    return {
      json: vi.fn().mockResolvedValue(body),
    } as unknown as NextRequest;
  }

  describe('Successful Analysis', () => {
    it('should return analysis for valid request with image URL', async () => {
      mockAnalyzeChart.mockResolvedValue({
        success: true,
        analysis: {
          trend: 'bullish',
          signals: ['RSI oversold bounce'],
          recommendation: 'LONG',
          confidence: 0.75,
          analysisText: 'Strong bullish setup',
          entryPrice: 95000,
          stopLoss: 93500,
          takeProfit: 98000,
          riskRewardRatio: 2.0,
          keyLevels: {
            support: [92000, 90000],
            resistance: [100000, 105000],
          },
        },
        metadata: {
          model: 'gpt-4o',
          tokensUsed: 500,
          processingTime: 1500,
        },
      });

      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.trend).toBe('bullish');
      expect(data.data.recommendation).toBe('LONG');
      expect(data.data.confidence).toBe(0.75);
      expect(data.data.entryPrice).toBe(95000);
      expect(data.meta.model).toBe('gpt-4o');
    });

    it('should include trading signal when signals analysis is requested', async () => {
      const mockSignal = {
        type: 'LONG',
        symbol: 'BINANCE:BTCUSDT',
        entryPrice: 95000,
        stopLoss: 93500,
        takeProfit: 98000,
        confidence: 0.75,
        reasoning: 'Strong bullish setup',
        timestamp: new Date().toISOString(),
      };

      mockAnalyzeChart.mockResolvedValue({
        success: true,
        analysis: {
          trend: 'bullish',
          signals: ['RSI bounce'],
          recommendation: 'LONG',
          confidence: 0.75,
          analysisText: 'Strong setup',
        },
        metadata: {
          model: 'gpt-4o',
          tokensUsed: 500,
          processingTime: 1500,
        },
      });

      mockGenerateSignal.mockResolvedValue(mockSignal);

      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        analysisTypes: ['signals'],
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.tradingSignal).toEqual(mockSignal);
      expect(mockGenerateSignal).toHaveBeenCalled();
    });

    it('should pass trading style to analysis service', async () => {
      mockAnalyzeChart.mockResolvedValue({
        success: true,
        analysis: {
          trend: 'bullish',
          signals: [],
          recommendation: 'LONG',
          confidence: 0.7,
          analysisText: 'Day trading setup',
        },
        metadata: {
          model: 'gpt-4o',
          tokensUsed: 400,
          processingTime: 1200,
        },
      });

      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '15m',
        tradingStyle: 'day_trading',
      });

      await analyzeChartHandler(request);

      expect(mockAnalyzeChart).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            tradingStyle: 'day_trading',
          }),
        })
      );
    });

    it('should support local file path analysis', async () => {
      mockAnalyzeChart.mockResolvedValue({
        success: true,
        analysis: {
          trend: 'neutral',
          signals: [],
          recommendation: 'NEUTRAL',
          confidence: 0.5,
          analysisText: 'Consolidating',
        },
        metadata: {
          model: 'gpt-4o',
          tokensUsed: 300,
          processingTime: 1000,
        },
      });

      const request = createMockRequest({
        localPath: '/tmp/chart.png',
        symbol: 'NASDAQ:AAPL',
        interval: '1D',
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockAnalyzeChart).toHaveBeenCalledWith(
        expect.objectContaining({
          chartPath: '/tmp/chart.png',
        })
      );
    });

    it('should pass custom prompt when provided', async () => {
      mockAnalyzeChart.mockResolvedValue({
        success: true,
        analysis: {
          trend: 'bullish',
          signals: [],
          recommendation: 'LONG',
          confidence: 0.6,
          analysisText: 'Custom analysis',
        },
        metadata: {
          model: 'gpt-4o',
          tokensUsed: 450,
          processingTime: 1300,
        },
      });

      const customPrompt = 'Focus on Fibonacci retracements';

      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        customPrompt,
      });

      await analyzeChartHandler(request);

      expect(mockAnalyzeChart).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: customPrompt,
        })
      );
    });
  });

  describe('Validation Errors', () => {
    it('should return validation error for missing symbol', async () => {
      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        interval: '4h',
        // symbol missing
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for missing interval', async () => {
      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        // interval missing
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });

    it('should return validation error for missing image input', async () => {
      const request = createMockRequest({
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        // no imageUrl, imageData, or localPath
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });

    it('should return validation error for invalid URL', async () => {
      const request = createMockRequest({
        imageUrl: 'not-a-valid-url',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });

    it('should return validation error for invalid trading style', async () => {
      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        tradingStyle: 'invalid_style',
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });

    it('should return validation error for invalid confidence threshold', async () => {
      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        confidenceThreshold: 1.5, // Invalid: > 1
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.success).toBe(false);
    });
  });

  describe('Analysis Failures', () => {
    it('should return error when analysis fails', async () => {
      mockAnalyzeChart.mockResolvedValue({
        success: false,
        error: 'Failed to analyze chart',
      });

      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('ANALYSIS_FAILED');
    });

    it('should handle configuration error for missing API key', async () => {
      mockAnalyzeChart.mockRejectedValue(new Error('OPENAI_API_KEY not set'));

      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.error.code).toBe('CONFIGURATION_ERROR');
    });

    it('should handle rate limit errors', async () => {
      mockAnalyzeChart.mockRejectedValue(new Error('rate limit exceeded'));

      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should handle unexpected errors gracefully', async () => {
      mockAnalyzeChart.mockRejectedValue(new Error('Unexpected database error'));

      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Response Format', () => {
    it('should include all required fields in successful response', async () => {
      mockAnalyzeChart.mockResolvedValue({
        success: true,
        analysis: {
          trend: 'bearish',
          signals: ['MACD divergence', 'RSI overbought'],
          recommendation: 'SHORT',
          confidence: 0.8,
          analysisText: 'Clear bearish setup',
          entryPrice: 100000,
          stopLoss: 102000,
          takeProfit: 95000,
          riskRewardRatio: 2.5,
          keyLevels: {
            support: [95000, 92000],
            resistance: [100000, 105000],
          },
        },
        metadata: {
          model: 'gpt-4o-mini',
          tokensUsed: 350,
          processingTime: 800,
        },
      });

      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      // Verify response structure
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.meta).toBeDefined();

      // Verify data fields
      expect(data.data.trend).toBeDefined();
      expect(data.data.signals).toBeInstanceOf(Array);
      expect(data.data.recommendation).toBeDefined();
      expect(data.data.confidence).toBeDefined();
      expect(data.data.analysisText).toBeDefined();

      // Verify price levels
      expect(data.data.entryPrice).toBe(100000);
      expect(data.data.stopLoss).toBe(102000);
      expect(data.data.takeProfit).toBe(95000);
      expect(data.data.riskRewardRatio).toBe(2.5);

      // Verify key levels
      expect(data.data.keyLevels).toBeDefined();
      expect(data.data.keyLevels.support).toContain(95000);
      expect(data.data.keyLevels.resistance).toContain(100000);

      // Verify meta fields (from createSuccessResponse)
      expect(data.meta.model).toBe('gpt-4o-mini');
      expect(data.meta.tokensUsed).toBe(350);
      expect(data.meta.processingTime).toBe(800);
    });

    it('should handle neutral analysis', async () => {
      mockAnalyzeChart.mockResolvedValue({
        success: true,
        analysis: {
          trend: 'neutral',
          signals: ['Consolidation pattern'],
          recommendation: 'NEUTRAL',
          confidence: 0.6,
          analysisText: 'Market is ranging',
        },
        metadata: {
          model: 'gpt-4o',
          tokensUsed: 200,
          processingTime: 600,
        },
      });

      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
      });

      const response = await analyzeChartHandler(request);
      const data = await response.json();

      expect(data.data.trend).toBe('neutral');
      expect(data.data.recommendation).toBe('NEUTRAL');
    });
  });

  describe('Options and Configuration', () => {
    it('should pass includeRiskManagement option', async () => {
      mockAnalyzeChart.mockResolvedValue({
        success: true,
        analysis: {
          trend: 'bullish',
          signals: [],
          recommendation: 'LONG',
          confidence: 0.7,
          analysisText: 'With risk management',
        },
        metadata: {
          model: 'gpt-4o',
          tokensUsed: 400,
          processingTime: 1200,
        },
      });

      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        includeRiskManagement: true,
      });

      await analyzeChartHandler(request);

      expect(mockAnalyzeChart).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            includeRiskManagement: true,
          }),
        })
      );
    });

    it('should pass confidenceThreshold option', async () => {
      mockAnalyzeChart.mockResolvedValue({
        success: true,
        analysis: {
          trend: 'bullish',
          signals: [],
          recommendation: 'LONG',
          confidence: 0.9,
          analysisText: 'High confidence',
        },
        metadata: {
          model: 'gpt-4o',
          tokensUsed: 400,
          processingTime: 1200,
        },
      });

      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        confidenceThreshold: 0.8,
      });

      await analyzeChartHandler(request);

      expect(mockAnalyzeChart).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            confidenceThreshold: 0.8,
          }),
        })
      );
    });

    it('should use default options when not provided', async () => {
      mockAnalyzeChart.mockResolvedValue({
        success: true,
        analysis: {
          trend: 'bullish',
          signals: [],
          recommendation: 'LONG',
          confidence: 0.7,
          analysisText: 'Default options',
        },
        metadata: {
          model: 'gpt-4o',
          tokensUsed: 400,
          processingTime: 1200,
        },
      });

      const request = createMockRequest({
        imageUrl: 'https://example.com/chart.png',
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        // No options provided - Zod schema applies defaults
      });

      await analyzeChartHandler(request);

      // Zod schema defaults: swing_trading, includeRiskManagement: true, confidenceThreshold: 0.5
      expect(mockAnalyzeChart).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            tradingStyle: 'swing_trading',
            includeRiskManagement: true,
            confidenceThreshold: 0.5,
          }),
        })
      );
    });
  });
});
