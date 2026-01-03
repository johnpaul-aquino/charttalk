/**
 * Tests for Indicators Loader
 *
 * Tests the database-driven indicator detection and parameter parsing functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseIndicatorsWithParams,
  findIndicatorInText,
  extractIndicatorParams,
  loadIndicatorsDatabase,
  clearCache,
} from '../indicators.loader';

describe('Indicators Loader', () => {
  beforeEach(() => {
    // Clear cache before each test to ensure fresh database load
    clearCache();
  });

  describe('parseIndicatorsWithParams', () => {
    it('should detect RSI with custom period', () => {
      const result = parseIndicatorsWithParams('show me rsi 21');
      const rsiStudy = result.find((s) => s.name === 'Relative Strength Index');

      expect(rsiStudy).toBeDefined();
      expect(rsiStudy?.input).toEqual({ length: 21 });
    });

    it('should detect Bollinger Bands with length and stddev', () => {
      const result = parseIndicatorsWithParams('add bollinger bands 30, 2.5');
      const bbStudy = result.find((s) => s.name === 'Bollinger Bands');

      expect(bbStudy).toBeDefined();
      expect(bbStudy?.input?.length).toBe(30);
      expect(bbStudy?.input?.stdDev).toBe(2.5);
    });

    it('should detect MACD with all three parameters', () => {
      const result = parseIndicatorsWithParams('macd 8, 21, 5');
      const macdStudy = result.find((s) => s.name === 'MACD');

      expect(macdStudy).toBeDefined();
      expect(macdStudy?.input?.fastLength).toBe(8);
      expect(macdStudy?.input?.slowLength).toBe(21);
      expect(macdStudy?.input?.signalLength).toBe(5);
    });

    it('should use defaults when no parameters provided', () => {
      const result = parseIndicatorsWithParams('add rsi indicator');
      const rsiStudy = result.find((s) => s.name === 'Relative Strength Index');

      expect(rsiStudy).toBeDefined();
      expect(rsiStudy?.input).toBeUndefined();
    });

    it('should handle multiple indicators in one request', () => {
      const result = parseIndicatorsWithParams('show rsi 14 and macd with bollinger bands');

      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.some((s) => s.name === 'Relative Strength Index')).toBe(true);
      expect(result.some((s) => s.name === 'MACD')).toBe(true);
      expect(result.some((s) => s.name === 'Bollinger Bands')).toBe(true);
    });

    it('should detect indicators by keyword aliases', () => {
      const result = parseIndicatorsWithParams('add bb and atr');

      expect(result.some((s) => s.name === 'Bollinger Bands')).toBe(true);
      expect(result.some((s) => s.name === 'Average True Range')).toBe(true);
    });

    it('should be case insensitive', () => {
      const result = parseIndicatorsWithParams('Add RSI and MACD');

      expect(result.some((s) => s.name === 'Relative Strength Index')).toBe(true);
      expect(result.some((s) => s.name === 'MACD')).toBe(true);
    });

    it('should not duplicate indicators', () => {
      const result = parseIndicatorsWithParams('rsi and relative strength index');
      const rsiCount = result.filter((s) => s.name === 'Relative Strength Index').length;

      expect(rsiCount).toBe(1);
    });

    it('should detect On Balance Volume indicator', () => {
      const result = parseIndicatorsWithParams('add on balance volume');
      const obvStudy = result.find((s) => s.name === 'On Balance Volume');

      expect(obvStudy).toBeDefined();
    });

    it('should detect Stochastic indicator', () => {
      const result = parseIndicatorsWithParams('add stochastic 14, 3, 3');
      const stochStudy = result.find((s) => s.name === 'Stochastic');

      expect(stochStudy).toBeDefined();
    });

    it('should detect VWAP indicator', () => {
      const result = parseIndicatorsWithParams('add vwap');
      const vwapStudy = result.find((s) => s.name === 'VWAP');

      expect(vwapStudy).toBeDefined();
    });

    it('should detect Ichimoku Cloud indicator', () => {
      const result = parseIndicatorsWithParams('add ichimoku cloud');
      const ichimokuStudy = result.find((s) => s.name === 'Ichimoku Cloud');

      expect(ichimokuStudy).toBeDefined();
    });

    it('should detect ADX indicator', () => {
      const result = parseIndicatorsWithParams('add adx 14');
      const adxStudy = result.find((s) => s.name === 'Average Directional Index');

      expect(adxStudy).toBeDefined();
    });

    it('should stop parameter extraction at sentence boundaries', () => {
      const result = parseIndicatorsWithParams('add rsi. then show macd 12, 26, 9');
      const rsiStudy = result.find((s) => s.name === 'Relative Strength Index');
      const macdStudy = result.find((s) => s.name === 'MACD');

      // RSI should have no params (sentence ended before numbers)
      expect(rsiStudy?.input).toBeUndefined();
      // MACD should have its params
      expect(macdStudy?.input?.fastLength).toBe(12);
    });

    it('should detect Moving Average with period', () => {
      const result = parseIndicatorsWithParams('add moving average 50');
      const maStudy = result.find((s) => s.name === 'Moving Average');

      expect(maStudy).toBeDefined();
      expect(maStudy?.input?.length).toBe(50);
    });

    it('should detect Moving Average Exponential with period', () => {
      // Official name is "Moving Average Exponential" from chart-img.com docs
      const result = parseIndicatorsWithParams('add ema 20');
      const emaStudy = result.find((s) => s.name === 'Moving Average Exponential');

      expect(emaStudy).toBeDefined();
      expect(emaStudy?.input?.length).toBe(20);
    });
  });

  describe('findIndicatorInText', () => {
    it('should find indicator by exact name', () => {
      const db = loadIndicatorsDatabase();
      const rsi = db.indicators.find((i) => i.id === 'relative-strength-index');

      if (rsi) {
        const result = findIndicatorInText('show relative strength index', rsi);

        expect(result).not.toBeNull();
        expect(result?.matchedKeyword).toBe('relative strength index');
      }
    });

    it('should find indicator by keyword', () => {
      const db = loadIndicatorsDatabase();
      const rsi = db.indicators.find((i) => i.id === 'relative-strength-index');

      if (rsi) {
        const result = findIndicatorInText('show rsi 14', rsi);

        expect(result).not.toBeNull();
        expect(result?.matchedKeyword).toBe('rsi');
      }
    });

    it('should return null when indicator not found', () => {
      const db = loadIndicatorsDatabase();
      const rsi = db.indicators.find((i) => i.id === 'relative-strength-index');

      if (rsi) {
        const result = findIndicatorInText('show macd', rsi);

        expect(result).toBeNull();
      }
    });

    it('should use word boundaries to avoid false positives', () => {
      const db = loadIndicatorsDatabase();
      const ma = db.indicators.find((i) => i.id === 'moving-average');

      if (ma) {
        // "format" contains "ma" but should not match
        const result = findIndicatorInText('format the chart', ma);

        expect(result).toBeNull();
      }
    });
  });

  describe('extractIndicatorParams', () => {
    it('should extract single parameter', () => {
      const db = loadIndicatorsDatabase();
      const rsi = db.indicators.find((i) => i.id === 'relative-strength-index');

      if (rsi) {
        const params = extractIndicatorParams('rsi 21 and more', 3, rsi);

        expect(params.length).toBe(21);
      }
    });

    it('should extract multiple parameters', () => {
      const db = loadIndicatorsDatabase();
      const bb = db.indicators.find((i) => i.id === 'bollinger-bands');

      if (bb) {
        const params = extractIndicatorParams('bb 30, 2.5 for chart', 2, bb);

        expect(params.length).toBe(30);
        expect(params.stdDev).toBe(2.5);
      }
    });

    it('should return empty object when no params provided', () => {
      const db = loadIndicatorsDatabase();
      const rsi = db.indicators.find((i) => i.id === 'relative-strength-index');

      if (rsi) {
        const params = extractIndicatorParams('rsi for analysis', 3, rsi);

        expect(Object.keys(params).length).toBe(0);
      }
    });

    it('should stop at word boundaries', () => {
      const db = loadIndicatorsDatabase();
      const rsi = db.indicators.find((i) => i.id === 'relative-strength-index');

      if (rsi) {
        const params = extractIndicatorParams('rsi with the 50 level', 3, rsi);

        // Should stop at "with" boundary
        expect(Object.keys(params).length).toBe(0);
      }
    });

    it('should validate against min/max constraints', () => {
      const db = loadIndicatorsDatabase();
      const rsi = db.indicators.find((i) => i.id === 'relative-strength-index');

      if (rsi) {
        // 0 is below min for RSI period (typically 1)
        const params = extractIndicatorParams('rsi 0', 3, rsi);

        // Should not include invalid value
        expect(params.length).toBeUndefined();
      }
    });
  });

  describe('Database Loading', () => {
    it('should load indicators database', () => {
      const db = loadIndicatorsDatabase();

      expect(db).toBeDefined();
      expect(db.indicators).toBeDefined();
      expect(db.indicators.length).toBeGreaterThan(0);
    });

    it('should have indicators with required fields', () => {
      const db = loadIndicatorsDatabase();
      const firstIndicator = db.indicators[0];

      expect(firstIndicator.id).toBeDefined();
      expect(firstIndicator.name).toBeDefined();
      expect(firstIndicator.category).toBeDefined();
      expect(firstIndicator.keywords).toBeDefined();
      expect(Array.isArray(firstIndicator.keywords)).toBe(true);
    });

    it('should have common indicators', () => {
      const db = loadIndicatorsDatabase();
      const indicatorNames = db.indicators.map((i) => i.name);

      expect(indicatorNames).toContain('Relative Strength Index');
      expect(indicatorNames).toContain('MACD');
      expect(indicatorNames).toContain('Bollinger Bands');
      expect(indicatorNames).toContain('Moving Average');
      expect(indicatorNames).toContain('On Balance Volume');
    });
  });
});
