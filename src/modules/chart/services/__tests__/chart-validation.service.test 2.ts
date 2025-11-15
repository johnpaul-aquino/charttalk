/**
 * ChartValidationService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChartValidationService } from '../chart-validation.service';
import type { ChartConfig } from '../../interfaces/chart.interface';

// Mock fetchDocumentation
vi.mock('../../../../mcp/utils/doc-parser', () => ({
  fetchDocumentation: vi.fn().mockResolvedValue({
    all: {
      rateLimits: {
        BASIC: {
          maxResolution: '800x600',
          maxStudies: 3,
          maxDrawings: 3,
        },
        PRO: {
          maxResolution: '1920x1080',
          maxStudies: 5,
          maxDrawings: 5,
        },
      },
      chartParameters: {
        intervals: ['1m', '5m', '15m', '1h', '4h', '1D', '1W'],
        ranges: ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'],
        themes: ['light', 'dark'],
        styles: ['candle', 'line', 'bar', 'area'],
      },
    },
  }),
}));

// Mock drawings loader
vi.mock('../../../../core/database/loaders/drawings.loader', () => ({
  findDrawingByName: vi.fn().mockReturnValue({
    name: 'Horizontal Line',
    inputs: [],
  }),
  validateDrawingInput: vi.fn().mockReturnValue([]),
}));

describe('ChartValidationService', () => {
  let service: ChartValidationService;

  beforeEach(() => {
    service = new ChartValidationService();
  });

  describe('validate - Required fields', () => {
    it('should fail when symbol is missing', async () => {
      const config = {
        interval: '1h',
      } as ChartConfig;

      const result = await service.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('symbol');
      expect(result.errors[0].message).toContain('required');
    });

    it('should fail when symbol format is invalid', async () => {
      const config = {
        symbol: 'BTCUSDT',
        interval: '1h',
      } as ChartConfig;

      const result = await service.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'symbol' && e.message.includes('EXCHANGE:SYMBOL'))).toBe(true);
    });
  });

  describe('validate - Interval and Range', () => {
    it('should validate valid interval', async () => {
      const config: ChartConfig = {
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        range: '1M',
      };

      const result = await service.validate(config);

      expect(result.valid).toBe(true);
    });

    it('should fail on invalid interval', async () => {
      const config: ChartConfig = {
        symbol: 'BINANCE:BTCUSDT',
        interval: '2h', // Invalid
        range: '1M',
      };

      const result = await service.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'interval')).toBe(true);
    });

    it('should fail on invalid range', async () => {
      const config: ChartConfig = {
        symbol: 'BINANCE:BTCUSDT',
        interval: '1h',
        range: '7D', // Invalid
      };

      const result = await service.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'range')).toBe(true);
    });
  });

  describe('validate - Resolution limits', () => {
    it('should pass for BASIC plan with 800x600', async () => {
      const config: ChartConfig = {
        symbol: 'BINANCE:BTCUSDT',
        interval: '1h',
        width: 800,
        height: 600,
      };

      const result = await service.validate(config, 'BASIC');

      expect(result.valid).toBe(true);
      expect(result.rateLimitCheck.checks.resolution?.pass).toBe(true);
    });

    it('should fail for BASIC plan with 1920x1080', async () => {
      const config: ChartConfig = {
        symbol: 'BINANCE:BTCUSDT',
        interval: '1h',
        width: 1920,
        height: 1080,
      };

      const result = await service.validate(config, 'BASIC');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'resolution')).toBe(true);
    });

    it('should pass for PRO plan with 1920x1080', async () => {
      const config: ChartConfig = {
        symbol: 'BINANCE:BTCUSDT',
        interval: '1h',
        width: 1920,
        height: 1080,
      };

      const result = await service.validate(config, 'PRO');

      expect(result.valid).toBe(true);
    });
  });

  describe('validate - Study count limits', () => {
    it('should pass for BASIC plan with 3 studies', async () => {
      const config: ChartConfig = {
        symbol: 'BINANCE:BTCUSDT',
        interval: '1h',
        studies: [
          { name: 'RSI' },
          { name: 'MACD' },
          { name: 'Bollinger Bands' },
        ],
      };

      const result = await service.validate(config, 'BASIC');

      expect(result.valid).toBe(true);
      expect(result.rateLimitCheck.checks.studyCount?.pass).toBe(true);
    });

    it('should fail for BASIC plan with 5 studies', async () => {
      const config: ChartConfig = {
        symbol: 'BINANCE:BTCUSDT',
        interval: '1h',
        studies: [
          { name: 'RSI' },
          { name: 'MACD' },
          { name: 'Bollinger Bands' },
          { name: 'Volume' },
          { name: 'EMA' },
        ],
      };

      const result = await service.validate(config, 'BASIC');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'studies')).toBe(true);
    });

    it('should pass for PRO plan with 5 studies', async () => {
      const config: ChartConfig = {
        symbol: 'BINANCE:BTCUSDT',
        interval: '1h',
        studies: [
          { name: 'RSI' },
          { name: 'MACD' },
          { name: 'Bollinger Bands' },
          { name: 'Volume' },
          { name: 'EMA' },
        ],
      };

      const result = await service.validate(config, 'PRO');

      expect(result.valid).toBe(true);
    });
  });

  describe('validate - Complete valid configs', () => {
    it('should validate complete PRO config', async () => {
      const config: ChartConfig = {
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        range: '1M',
        theme: 'dark',
        style: 'candle',
        width: 1200,
        height: 675,
        studies: [
          { name: 'RSI', input: { period: 14 } },
          { name: 'Bollinger Bands', input: { period: 20, stddev: 2 } },
        ],
      };

      const result = await service.validate(config, 'PRO');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.rateLimitCheck.withinLimits).toBe(true);
    });
  });
});
