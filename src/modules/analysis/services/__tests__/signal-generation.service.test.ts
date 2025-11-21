/**
 * Signal Generation Service Tests
 *
 * Unit tests for trading signal parsing and validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SignalGenerationService } from '../signal-generation.service';
import type { TradingSignal } from '../../interfaces/analysis.interface';

describe('SignalGenerationService', () => {
  let service: SignalGenerationService;

  beforeEach(() => {
    service = new SignalGenerationService();
  });

  describe('parseAnalysisResponse', () => {
    it('should parse a complete LONG signal from AI response', () => {
      const analysisText = `
        Based on the chart analysis, I recommend a LONG position.
        Entry: $94,100
        Stop Loss: $93,500
        Take Profit: $97,500
        Confidence: 78%
        Symbol: BINANCE:BTCUSDT

        Reasoning: Strong support at $94K level with bullish RSI divergence.
      `;

      const signal = service.parseAnalysisResponse(analysisText);

      expect(signal).not.toBeNull();
      expect(signal!.type).toBe('LONG');
      expect(signal!.entryPrice).toBe(94100);
      expect(signal!.stopLoss).toBe(93500);
      expect(signal!.takeProfit).toBe(97500);
      expect(signal!.confidence).toBe(0.78);
      expect(signal!.symbol).toBe('BINANCE:BTCUSDT');
      expect(signal!.reasoning).toContain('support');
    });

    it('should parse a SHORT signal', () => {
      const analysisText = `
        Signal Type: SHORT
        Entry price: $50,000
        Stop: $51,000
        Target: $47,000
        Confidence: 65%
      `;

      const signal = service.parseAnalysisResponse(analysisText);

      expect(signal).not.toBeNull();
      expect(signal!.type).toBe('SHORT');
      expect(signal!.entryPrice).toBe(50000);
      expect(signal!.stopLoss).toBe(51000);
      expect(signal!.takeProfit).toBe(47000);
      expect(signal!.confidence).toBe(0.65);
    });

    it('should parse BUY as LONG', () => {
      const analysisText = `
        BUY signal
        Entry: 100
        Stop Loss: 95
        Take Profit: 110
      `;

      const signal = service.parseAnalysisResponse(analysisText);

      expect(signal).not.toBeNull();
      expect(signal!.type).toBe('LONG');
    });

    it('should parse SELL as SHORT', () => {
      const analysisText = `
        SELL recommendation
        Enter: 100
        SL: 105
        TP: 90
      `;

      const signal = service.parseAnalysisResponse(analysisText);

      expect(signal).not.toBeNull();
      expect(signal!.type).toBe('SHORT');
    });

    it('should default to NEUTRAL when no clear signal type', () => {
      const analysisText = `
        The market is consolidating.
        Entry: 100
        Stop: 95
        Target: 110
      `;

      const signal = service.parseAnalysisResponse(analysisText);

      expect(signal).not.toBeNull();
      expect(signal!.type).toBe('NEUTRAL');
    });

    it('should handle confidence as percentage', () => {
      const analysisText = `
        LONG signal
        Entry: 100
        Stop: 95
        Take Profit: 110
        Confidence: 85%
      `;

      const signal = service.parseAnalysisResponse(analysisText);

      expect(signal!.confidence).toBe(0.85);
    });

    it('should handle confidence as decimal', () => {
      const analysisText = `
        LONG signal
        Entry: 100
        Stop: 95
        Take Profit: 110
        Confidence: 0.72
      `;

      const signal = service.parseAnalysisResponse(analysisText);

      expect(signal!.confidence).toBe(0.72);
    });

    it('should default confidence to 0.5 when not found', () => {
      const analysisText = `
        LONG signal
        Entry: 100
        Stop: 95
        Take Profit: 110
      `;

      const signal = service.parseAnalysisResponse(analysisText);

      expect(signal!.confidence).toBe(0.5);
    });

    it('should return null for incomplete signal (missing entry)', () => {
      const analysisText = `
        LONG signal
        Stop: 95
        Take Profit: 110
      `;

      const signal = service.parseAnalysisResponse(analysisText);

      expect(signal).toBeNull();
    });

    it('should return null for incomplete signal (missing stop loss)', () => {
      const analysisText = `
        LONG signal
        Entry: 100
        Take Profit: 110
      `;

      const signal = service.parseAnalysisResponse(analysisText);

      expect(signal).toBeNull();
    });

    it('should return null for incomplete signal (missing take profit)', () => {
      const analysisText = `
        LONG signal
        Entry: 100
        Stop: 95
      `;

      const signal = service.parseAnalysisResponse(analysisText);

      expect(signal).toBeNull();
    });

    it('should handle prices with commas', () => {
      const analysisText = `
        LONG signal
        Entry: $1,234.56
        Stop Loss: $1,200.00
        Take Profit: $1,350.00
      `;

      const signal = service.parseAnalysisResponse(analysisText);

      expect(signal!.entryPrice).toBe(1234.56);
      expect(signal!.stopLoss).toBe(1200);
      expect(signal!.takeProfit).toBe(1350);
    });

    it('should extract symbol from various formats', () => {
      const tests = [
        { text: 'BTCUSDT signal', expected: 'BTCUSDT' },
        { text: 'Symbol: BINANCE:BTCUSDT', expected: 'BINANCE:BTCUSDT' },
        { text: 'ETHUSDT long position', expected: 'ETHUSDT' },
      ];

      tests.forEach(({ text, expected }) => {
        const fullText = `${text}\nEntry: 100\nStop: 95\nTake Profit: 110`;
        const signal = service.parseAnalysisResponse(fullText);
        expect(signal!.symbol).toBe(expected);
      });
    });
  });

  describe('calculateRiskReward', () => {
    it('should calculate R:R for LONG position', () => {
      const rr = service.calculateRiskReward(100, 95, 110);
      expect(rr).toBe(2.0); // Risk: 5, Reward: 10, R:R = 10/5 = 2.0
    });

    it('should calculate R:R for SHORT position', () => {
      const rr = service.calculateRiskReward(100, 105, 90);
      expect(rr).toBe(2.0); // Risk: 5, Reward: 10, R:R = 10/5 = 2.0
    });

    it('should calculate R:R with decimal precision', () => {
      const rr = service.calculateRiskReward(94100, 93500, 97500);
      expect(rr).toBe(5.67); // Risk: 600, Reward: 3400, R:R = 5.67
    });

    it('should return 0 when risk is 0', () => {
      const rr = service.calculateRiskReward(100, 100, 110);
      expect(rr).toBe(0);
    });

    it('should handle very small R:R ratios', () => {
      const rr = service.calculateRiskReward(100, 95, 101);
      expect(rr).toBe(0.2); // Risk: 5, Reward: 1, R:R = 0.2
    });
  });

  describe('validateSignal', () => {
    const validLongSignal: TradingSignal = {
      type: 'LONG',
      symbol: 'BINANCE:BTCUSDT',
      entryPrice: 100,
      stopLoss: 95,
      takeProfit: 110,
      confidence: 0.75,
      reasoning: 'Test signal',
      timestamp: new Date().toISOString(),
    };

    const validShortSignal: TradingSignal = {
      type: 'SHORT',
      symbol: 'BINANCE:BTCUSDT',
      entryPrice: 100,
      stopLoss: 105,
      takeProfit: 90,
      confidence: 0.75,
      reasoning: 'Test signal',
      timestamp: new Date().toISOString(),
    };

    it('should validate a correct LONG signal', () => {
      expect(service.validateSignal(validLongSignal)).toBe(true);
    });

    it('should validate a correct SHORT signal', () => {
      expect(service.validateSignal(validShortSignal)).toBe(true);
    });

    it('should reject signal with missing type', () => {
      const signal = { ...validLongSignal, type: undefined as any };
      expect(service.validateSignal(signal)).toBe(false);
    });

    it('should reject signal with missing entry price', () => {
      const signal = { ...validLongSignal, entryPrice: undefined as any };
      expect(service.validateSignal(signal)).toBe(false);
    });

    it('should reject signal with negative prices', () => {
      const signal = { ...validLongSignal, entryPrice: -100 };
      expect(service.validateSignal(signal)).toBe(false);
    });

    it('should reject signal with zero prices', () => {
      const signal = { ...validLongSignal, stopLoss: 0 };
      expect(service.validateSignal(signal)).toBe(false);
    });

    it('should reject signal with invalid confidence (<0)', () => {
      const signal = { ...validLongSignal, confidence: -0.1 };
      expect(service.validateSignal(signal)).toBe(false);
    });

    it('should reject signal with invalid confidence (>1)', () => {
      const signal = { ...validLongSignal, confidence: 1.5 };
      expect(service.validateSignal(signal)).toBe(false);
    });

    it('should reject LONG signal with stop loss above entry', () => {
      const signal = { ...validLongSignal, stopLoss: 105 };
      expect(service.validateSignal(signal)).toBe(false);
    });

    it('should reject LONG signal with take profit below entry', () => {
      const signal = { ...validLongSignal, takeProfit: 95 };
      expect(service.validateSignal(signal)).toBe(false);
    });

    it('should reject SHORT signal with stop loss below entry', () => {
      const signal = { ...validShortSignal, stopLoss: 95 };
      expect(service.validateSignal(signal)).toBe(false);
    });

    it('should reject SHORT signal with take profit above entry', () => {
      const signal = { ...validShortSignal, takeProfit: 105 };
      expect(service.validateSignal(signal)).toBe(false);
    });

    it('should reject signal with poor R:R ratio (<0.5)', () => {
      const signal: TradingSignal = {
        type: 'LONG',
        symbol: 'BINANCE:BTCUSDT',
        entryPrice: 100,
        stopLoss: 95,
        takeProfit: 101, // Risk: 5, Reward: 1, R:R = 0.2
        confidence: 0.75,
        reasoning: 'Poor R:R',
        timestamp: new Date().toISOString(),
      };

      expect(service.validateSignal(signal)).toBe(false);
    });

    it('should accept signal with minimum valid R:R ratio (0.5)', () => {
      const signal: TradingSignal = {
        type: 'LONG',
        symbol: 'BINANCE:BTCUSDT',
        entryPrice: 100,
        stopLoss: 95,
        takeProfit: 102.5, // Risk: 5, Reward: 2.5, R:R = 0.5
        confidence: 0.75,
        reasoning: 'Minimum R:R',
        timestamp: new Date().toISOString(),
      };

      expect(service.validateSignal(signal)).toBe(true);
    });

    it('should validate NEUTRAL signals', () => {
      const signal: TradingSignal = {
        type: 'NEUTRAL',
        symbol: 'BINANCE:BTCUSDT',
        entryPrice: 100,
        stopLoss: 95,
        takeProfit: 110,
        confidence: 0.5,
        reasoning: 'No clear direction',
        timestamp: new Date().toISOString(),
      };

      expect(service.validateSignal(signal)).toBe(true);
    });
  });
});
