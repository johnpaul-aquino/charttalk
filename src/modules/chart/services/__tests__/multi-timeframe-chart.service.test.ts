/**
 * MultiTimeframeChartService Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MultiTimeframeChartService } from '../multi-timeframe-chart.service';
import { ChartRegistryService } from '../chart-registry.service';

// Mock dependencies - we only test parsing functions here
// Full integration tests would require mocking ChartConfigService and ChartGenerationService

describe('MultiTimeframeChartService', () => {
  let service: MultiTimeframeChartService;
  let registryService: ChartRegistryService;

  beforeEach(() => {
    registryService = new ChartRegistryService();
    // Create service with minimal mocks for parsing tests
    service = new MultiTimeframeChartService(
      {} as any, // chartConfigService - not needed for parsing tests
      {} as any, // chartGenerationService - not needed for parsing tests
      registryService
    );
  });

  describe('parseIndicatorsFromNaturalLanguage', () => {
    it('should parse EMA indicators', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('Use EMA 20 and EMA 50');
      expect(indicators).toContain('EMA 20');
      expect(indicators).toContain('EMA 50');
    });

    it('should parse SMA indicators', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('Add SMA 200 for trend');
      expect(indicators).toContain('SMA 200');
    });

    it('should parse RSI with period', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('Show RSI 14');
      expect(indicators).toContain('RSI 14');
    });

    it('should parse RSI without period', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('Add RSI indicator');
      expect(indicators).toContain('RSI');
    });

    it('should parse MACD', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('Include MACD for momentum');
      expect(indicators).toContain('MACD');
    });

    it('should parse ATR with period', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('Use ATR 14 for volatility');
      expect(indicators).toContain('ATR 14');
    });

    it('should parse ATR without period', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('Add ATR');
      expect(indicators).toContain('ATR');
    });

    it('should parse Bollinger Bands', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('Show Bollinger Bands');
      expect(indicators).toContain('Bollinger Bands');
    });

    it('should parse BB shorthand', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('Add BB indicator');
      expect(indicators).toContain('Bollinger Bands');
    });

    it('should parse Stochastic', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('Include Stochastic oscillator');
      expect(indicators).toContain('Stochastic');
    });

    it('should parse stoch shorthand', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('Add stoch');
      expect(indicators).toContain('Stochastic');
    });

    it('should parse Volume', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('Show volume');
      expect(indicators).toContain('Volume');
    });

    it('should parse multiple indicators', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage(
        'Use EMA 20, EMA 50, SMA 200, RSI 14, MACD, ATR 14'
      );
      expect(indicators.length).toBeGreaterThanOrEqual(6);
      expect(indicators).toContain('EMA 20');
      expect(indicators).toContain('EMA 50');
      expect(indicators).toContain('SMA 200');
      expect(indicators).toContain('MACD');
    });

    it('should deduplicate indicators', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('RSI and RSI 14 and rsi');
      const rsiCount = indicators.filter(i => i.toLowerCase().includes('rsi')).length;
      expect(rsiCount).toBeLessThanOrEqual(2); // RSI and RSI 14 are different
    });

    it('should handle case-insensitive parsing', () => {
      const indicators = service.parseIndicatorsFromNaturalLanguage('MACD and macd');
      expect(indicators).toContain('MACD');
    });
  });

  describe('parseTimeframesFromNaturalLanguage', () => {
    it('should parse explicit HTF timeframe', () => {
      const timeframes = service.parseTimeframesFromNaturalLanguage(
        'HTF: 1D with EMA 20, ETF: 4h with RSI'
      );
      expect(timeframes.some(tf => tf.role === 'htf' && tf.interval === '1D')).toBe(true);
    });

    it('should parse explicit ETF timeframe', () => {
      const timeframes = service.parseTimeframesFromNaturalLanguage(
        'HTF: 1D, ETF: 4h with MACD'
      );
      expect(timeframes.some(tf => tf.role === 'etf' && tf.interval === '4h')).toBe(true);
    });

    it('should parse explicit LTF timeframe', () => {
      const timeframes = service.parseTimeframesFromNaturalLanguage(
        'HTF: 1D, ETF: 4h, LTF: 15m'
      );
      expect(timeframes.some(tf => tf.role === 'ltf' && tf.interval === '15m')).toBe(true);
    });

    it('should use day trading defaults for day trading style', () => {
      const timeframes = service.parseTimeframesFromNaturalLanguage(
        'Analyze for day trading'
      );
      expect(timeframes.some(tf => tf.role === 'htf')).toBe(true);
      expect(timeframes.some(tf => tf.role === 'etf')).toBe(true);
    });

    it('should use swing trading defaults for swing style', () => {
      const timeframes = service.parseTimeframesFromNaturalLanguage(
        'Swing trading analysis'
      );
      expect(timeframes.some(tf => tf.role === 'htf')).toBe(true);
      expect(timeframes.some(tf => tf.role === 'etf')).toBe(true);
    });

    it('should use scalping defaults for scalp style', () => {
      const timeframes = service.parseTimeframesFromNaturalLanguage(
        'Scalping setup'
      );
      expect(timeframes.some(tf => tf.role === 'htf')).toBe(true);
      expect(timeframes.some(tf => tf.role === 'etf')).toBe(true);
    });

    it('should default to swing trading when no style specified', () => {
      const timeframes = service.parseTimeframesFromNaturalLanguage(
        'Analyze BTC'
      );
      // Should have at least 2 timeframes (HTF and ETF)
      expect(timeframes.length).toBeGreaterThanOrEqual(2);
    });

    it('should parse higher timeframe pattern', () => {
      const timeframes = service.parseTimeframesFromNaturalLanguage(
        'Higher timeframe: daily, Entry: 4 hour'
      );
      expect(timeframes.some(tf => tf.role === 'htf')).toBe(true);
    });

    it('should parse trend bias pattern', () => {
      const timeframes = service.parseTimeframesFromNaturalLanguage(
        'Trend bias: 1D, entry: 4h'
      );
      expect(timeframes.some(tf => tf.role === 'htf')).toBe(true);
    });

    it('should parse execution timeframe pattern', () => {
      const timeframes = service.parseTimeframesFromNaturalLanguage(
        'HTF: 1D, execution timeframe: 4h'
      );
      expect(timeframes.some(tf => tf.role === 'etf')).toBe(true);
    });

    it('should parse lower timeframe pattern', () => {
      const timeframes = service.parseTimeframesFromNaturalLanguage(
        'HTF: 1D, ETF: 4h, lower timeframe: 15m'
      );
      expect(timeframes.some(tf => tf.role === 'ltf')).toBe(true);
    });

    it('should parse refinement pattern', () => {
      const timeframes = service.parseTimeframesFromNaturalLanguage(
        'HTF: 1D, ETF: 4h, refinement: 15m'
      );
      expect(timeframes.some(tf => tf.role === 'ltf')).toBe(true);
    });
  });

  describe('getDefaultTimeframes', () => {
    it('should return day trading timeframes', () => {
      const timeframes = service.getDefaultTimeframes('day_trading');
      expect(timeframes.some(tf => tf.role === 'htf' && tf.interval === '4h')).toBe(true);
      expect(timeframes.some(tf => tf.role === 'etf' && tf.interval === '1h')).toBe(true);
      expect(timeframes.some(tf => tf.role === 'ltf' && tf.interval === '15m')).toBe(true);
    });

    it('should return swing trading timeframes', () => {
      const timeframes = service.getDefaultTimeframes('swing_trading');
      expect(timeframes.some(tf => tf.role === 'htf' && tf.interval === '1D')).toBe(true);
      expect(timeframes.some(tf => tf.role === 'etf' && tf.interval === '4h')).toBe(true);
      expect(timeframes.some(tf => tf.role === 'ltf' && tf.interval === '1h')).toBe(true);
    });

    it('should return scalping timeframes', () => {
      const timeframes = service.getDefaultTimeframes('scalping');
      expect(timeframes.some(tf => tf.role === 'htf' && tf.interval === '1h')).toBe(true);
      expect(timeframes.some(tf => tf.role === 'etf' && tf.interval === '15m')).toBe(true);
      expect(timeframes.some(tf => tf.role === 'ltf' && tf.interval === '5m')).toBe(true);
    });
  });

  describe('getRegistry', () => {
    it('should delegate to registry service', () => {
      const registry = registryService.createRegistry('BTC', 'test-id');

      const retrieved = service.getRegistry('test-id');

      expect(retrieved).toBe(registry);
    });

    it('should return undefined for non-existent registry', () => {
      const retrieved = service.getRegistry('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });
});
