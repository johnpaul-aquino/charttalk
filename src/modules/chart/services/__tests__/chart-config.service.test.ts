/**
 * ChartConfigService Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChartConfigService } from '../chart-config.service';
import { IndicatorsRepository } from '../../repositories/indicators.repository';
import { DrawingsRepository } from '../../repositories/drawings.repository';

// Mock dependencies
vi.mock('../../repositories/indicators.repository');
vi.mock('../../repositories/drawings.repository');
vi.mock('../../../../mcp/utils/doc-parser', () => ({
  fetchDocumentation: vi.fn().mockResolvedValue({
    indicators: [],
  }),
}));

describe('ChartConfigService', () => {
  let service: ChartConfigService;
  let indicatorsRepo: IndicatorsRepository;
  let drawingsRepo: DrawingsRepository;

  beforeEach(() => {
    indicatorsRepo = new IndicatorsRepository();
    drawingsRepo = new DrawingsRepository();
    service = new ChartConfigService(indicatorsRepo, drawingsRepo);
  });

  describe('detectSymbol', () => {
    it('should detect Bitcoin symbol', () => {
      const result = service.detectSymbol('show me bitcoin chart', 'BINANCE');
      expect(result).toBeDefined();
      expect(result?.fullSymbol).toBe('BINANCE:BTCUSDT');
      expect(result?.symbol).toBe('BTCUSDT');
    });

    it('should detect Ethereum symbol', () => {
      const result = service.detectSymbol('ethereum price', 'BINANCE');
      expect(result).toBeDefined();
      expect(result?.fullSymbol).toBe('BINANCE:ETHUSDT');
    });

    it('should detect stock symbols', () => {
      const result = service.detectSymbol('apple stock chart');
      expect(result).toBeDefined();
      expect(result?.fullSymbol).toBe('NASDAQ:AAPL');
    });

    it('should detect forex pairs', () => {
      const result = service.detectSymbol('eurusd forex chart');
      expect(result).toBeDefined();
      expect(result?.fullSymbol).toBe('FX:EURUSD');
    });

    it('should return null for unknown symbols', () => {
      const result = service.detectSymbol('random unknown asset');
      expect(result).toBeNull();
    });
  });

  describe('detectTimeRange', () => {
    it('should detect 1 day range', () => {
      const result = service.detectTimeRange('last 24 hours');
      expect(result).toBe('1D');
    });

    it('should detect 1 month range', () => {
      const result = service.detectTimeRange('past week');
      expect(result).toBe('1M');
    });

    it('should detect 1 year range', () => {
      const result = service.detectTimeRange('last year');
      expect(result).toBe('1Y');
    });

    it('should default to 1M', () => {
      const result = service.detectTimeRange('some random text');
      expect(result).toBe('1M');
    });
  });

  describe('detectInterval', () => {
    it('should detect explicit interval mentions', () => {
      expect(service.detectInterval('4 hour chart', '1M')).toBe('4h');
      expect(service.detectInterval('daily candles', '1Y')).toBe('1D');
      expect(service.detectInterval('hourly timeframe', '1D')).toBe('1h');
    });

    it('should infer interval from range', () => {
      expect(service.detectInterval('show me chart', '1D')).toBe('15m');
      expect(service.detectInterval('show me chart', '1M')).toBe('4h');
      expect(service.detectInterval('show me chart', '1Y')).toBe('1W');
    });
  });

  describe('detectTheme', () => {
    it('should detect light theme', () => {
      expect(service.detectTheme('light theme')).toBe('light');
      expect(service.detectTheme('light mode')).toBe('light');
    });

    it('should detect dark theme', () => {
      expect(service.detectTheme('dark mode')).toBe('dark');
    });

    it('should default to dark', () => {
      expect(service.detectTheme('random text')).toBe('dark');
    });
  });

  describe('detectChartStyle', () => {
    it('should detect line style', () => {
      expect(service.detectChartStyle('line chart')).toBe('line');
    });

    it('should detect bar style', () => {
      expect(service.detectChartStyle('bar chart')).toBe('bar');
    });

    it('should detect area style', () => {
      expect(service.detectChartStyle('area chart')).toBe('area');
    });

    it('should default to candle', () => {
      expect(service.detectChartStyle('random text')).toBe('candle');
    });
  });

  describe('parseResolution', () => {
    it('should parse valid resolution', () => {
      const result = service.parseResolution('1920x1080');
      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    it('should parse different resolutions', () => {
      const result = service.parseResolution('800x600');
      expect(result).toEqual({ width: 800, height: 600 });
    });

    it('should default to 1200x675', () => {
      const result = service.parseResolution('invalid');
      expect(result).toEqual({ width: 1200, height: 675 });
    });
  });

  describe('detectIndicators', () => {
    it('should detect RSI indicator', () => {
      const result = service.detectIndicators('add rsi 14');
      const rsiStudy = result.find((s) => s.name === 'Relative Strength Index');

      expect(rsiStudy).toBeDefined();
      expect(rsiStudy?.input?.length).toBe(14);
    });

    it('should detect multiple indicators', () => {
      const result = service.detectIndicators('add rsi and macd and bollinger bands');

      expect(result.length).toBeGreaterThanOrEqual(3);
      expect(result.some((s) => s.name === 'Relative Strength Index')).toBe(true);
      expect(result.some((s) => s.name === 'MACD')).toBe(true);
      expect(result.some((s) => s.name === 'Bollinger Bands')).toBe(true);
    });

    it('should detect MA with period', () => {
      const result = service.detectIndicators('add ma 20');
      const maStudy = result.find((s) => s.name === 'Moving Average');

      expect(maStudy).toBeDefined();
      expect(maStudy?.input?.length).toBe(20);
    });

    it('should detect multiple MAs with different periods', () => {
      const result = service.detectIndicators('add ma 20, ma 50, ma 200');
      const maStudies = result.filter((s) => s.name === 'Moving Average');

      expect(maStudies.length).toBe(3);
      expect(maStudies.some((s) => s.input?.length === 20)).toBe(true);
      expect(maStudies.some((s) => s.input?.length === 50)).toBe(true);
      expect(maStudies.some((s) => s.input?.length === 200)).toBe(true);
    });

    it('should detect EMA with period', () => {
      const result = service.detectIndicators('add ema 9');
      const emaStudy = result.find((s) => s.name === 'Moving Average Exponential');

      expect(emaStudy).toBeDefined();
      expect(emaStudy?.input?.length).toBe(9);
    });

    it('should detect multiple EMAs with different periods', () => {
      const result = service.detectIndicators('add ema 9 ema 21 ema 55');
      const emaStudies = result.filter((s) => s.name === 'Moving Average Exponential');

      expect(emaStudies.length).toBe(3);
    });

    it('should not duplicate indicators with same name', () => {
      const result = service.detectIndicators('rsi and relative strength index');
      const rsiCount = result.filter((s) => s.name === 'Relative Strength Index').length;

      expect(rsiCount).toBe(1);
    });

    it('should be case insensitive', () => {
      const result = service.detectIndicators('Add RSI and MACD');

      expect(result.some((s) => s.name === 'Relative Strength Index')).toBe(true);
      expect(result.some((s) => s.name === 'MACD')).toBe(true);
    });

    it('should detect MACD with all parameters', () => {
      const result = service.detectIndicators('macd 12 26 9');
      const macdStudy = result.find((s) => s.name === 'MACD');

      expect(macdStudy).toBeDefined();
      expect(macdStudy?.input?.fastLength).toBe(12);
      expect(macdStudy?.input?.slowLength).toBe(26);
      expect(macdStudy?.input?.signalLength).toBe(9);
    });

    it('should return empty array when no indicators detected', () => {
      const result = service.detectIndicators('just show the chart');

      expect(result).toEqual([]);
    });
  });

  describe('constructFromNaturalLanguage', () => {
    it('should construct config from natural language', async () => {
      const result = await service.constructFromNaturalLanguage(
        'Show me Bitcoin with RSI for the last 7 days'
      );

      expect(result.success).toBe(true);
      expect(result.config).toBeDefined();
      expect(result.config?.symbol).toBe('BINANCE:BTCUSDT');
      expect(result.config?.range).toBe('1M');
      expect(result.config?.theme).toBe('dark');
    });

    it('should respect user preferences', async () => {
      const result = await service.constructFromNaturalLanguage(
        'Show me a chart',
        {
          symbol: 'BINANCE:ETHUSDT',
          theme: 'light',
          resolution: '800x600',
        }
      );

      expect(result.success).toBe(true);
      expect(result.config?.symbol).toBe('BINANCE:ETHUSDT');
      expect(result.config?.theme).toBe('light');
      expect(result.config?.width).toBe(800);
      expect(result.config?.height).toBe(600);
    });

    it('should fail when symbol cannot be detected', async () => {
      const result = await service.constructFromNaturalLanguage(
        'Show me a random chart'
      );

      expect(result.success).toBe(false);
      expect(result.warnings).toContain(
        'Could not identify symbol from description. Please specify symbol or exchange.'
      );
    });
  });
});
