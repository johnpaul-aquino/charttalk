/**
 * ChartRegistryService Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChartRegistryService } from '../chart-registry.service';
import type { ChartInfo, TimeframeRole } from '../../../analysis/interfaces/multi-timeframe.interface';

describe('ChartRegistryService', () => {
  let service: ChartRegistryService;

  beforeEach(() => {
    service = new ChartRegistryService();
  });

  describe('createRegistry', () => {
    it('should create a new registry with generated requestId', () => {
      const registry = service.createRegistry('BINANCE:BTCUSDT');

      expect(registry).toBeDefined();
      expect(registry.symbol).toBe('BINANCE:BTCUSDT');
      expect(registry.requestId).toBeDefined();
      expect(registry.requestId.length).toBeGreaterThan(0);
    });

    it('should create a registry with provided requestId', () => {
      const registry = service.createRegistry('BINANCE:BTCUSDT', 'custom-id-123');

      expect(registry.requestId).toBe('custom-id-123');
      expect(registry.symbol).toBe('BINANCE:BTCUSDT');
    });

    it('should store the registry for later retrieval', () => {
      const registry = service.createRegistry('BINANCE:BTCUSDT', 'test-id');

      const retrieved = service.getRegistry('test-id');
      expect(retrieved).toBe(registry);
    });
  });

  describe('getRegistry', () => {
    it('should return undefined for non-existent registry', () => {
      const registry = service.getRegistry('non-existent');
      expect(registry).toBeUndefined();
    });

    it('should return the correct registry', () => {
      service.createRegistry('BTC', 'btc-registry');
      service.createRegistry('ETH', 'eth-registry');

      const btcRegistry = service.getRegistry('btc-registry');
      const ethRegistry = service.getRegistry('eth-registry');

      expect(btcRegistry?.symbol).toBe('BTC');
      expect(ethRegistry?.symbol).toBe('ETH');
    });
  });

  describe('hasRegistry', () => {
    it('should return false for non-existent registry', () => {
      expect(service.hasRegistry('non-existent')).toBe(false);
    });

    it('should return true for existing registry', () => {
      service.createRegistry('BTC', 'existing');
      expect(service.hasRegistry('existing')).toBe(true);
    });
  });

  describe('deleteRegistry', () => {
    it('should delete an existing registry', () => {
      service.createRegistry('BTC', 'to-delete');
      expect(service.hasRegistry('to-delete')).toBe(true);

      const result = service.deleteRegistry('to-delete');

      expect(result).toBe(true);
      expect(service.hasRegistry('to-delete')).toBe(false);
    });

    it('should return false when deleting non-existent registry', () => {
      const result = service.deleteRegistry('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getActiveRegistryIds', () => {
    it('should return empty array when no registries', () => {
      const ids = service.getActiveRegistryIds();
      expect(ids).toEqual([]);
    });

    it('should return all active registry IDs', () => {
      service.createRegistry('BTC', 'reg1');
      service.createRegistry('ETH', 'reg2');
      service.createRegistry('SOL', 'reg3');

      const ids = service.getActiveRegistryIds();

      expect(ids).toContain('reg1');
      expect(ids).toContain('reg2');
      expect(ids).toContain('reg3');
      expect(ids.length).toBe(3);
    });
  });

  describe('getMostRecentRegistry', () => {
    it('should return undefined when no registries exist', () => {
      const registry = service.getMostRecentRegistry();
      expect(registry).toBeUndefined();
    });

    it('should return the most recently created registry', () => {
      service.createRegistry('BTC', 'first');
      service.createRegistry('ETH', 'second');
      service.createRegistry('SOL', 'third');

      const registry = service.getMostRecentRegistry();

      expect(registry?.requestId).toBe('third');
      expect(registry?.symbol).toBe('SOL');
    });
  });

  describe('findRegistryBySymbol', () => {
    it('should return undefined when symbol not found', () => {
      service.createRegistry('BTC', 'btc-reg');

      const registry = service.findRegistryBySymbol('ETH');
      expect(registry).toBeUndefined();
    });

    it('should find registry by symbol', () => {
      service.createRegistry('BINANCE:BTCUSDT', 'btc-reg');
      service.createRegistry('BINANCE:ETHUSDT', 'eth-reg');

      const registry = service.findRegistryBySymbol('BINANCE:ETHUSDT');

      expect(registry?.requestId).toBe('eth-reg');
    });
  });

  describe('getStats', () => {
    it('should return correct stats for empty service', () => {
      const stats = service.getStats();

      expect(stats.totalRegistries).toBe(0);
      expect(stats.totalCharts).toBe(0);
      expect(stats.symbols).toEqual([]);
    });

    it('should return correct stats with registries and charts', () => {
      const reg1 = service.createRegistry('BINANCE:BTCUSDT', 'reg1');
      const reg2 = service.createRegistry('BINANCE:ETHUSDT', 'reg2');

      // Add charts to registries
      const mockChart: ChartInfo = {
        id: 'chart-1',
        role: 'htf' as TimeframeRole,
        symbol: 'BINANCE:BTCUSDT',
        interval: '1D',
        imageUrl: 'https://example.com/chart1.png',
        indicators: ['RSI'],
        config: { symbol: 'BINANCE:BTCUSDT', interval: '1D' },
        generatedAt: new Date(),
      };

      reg1.addChart(mockChart);
      reg1.addChart({ ...mockChart, id: 'chart-2', interval: '4h', role: 'etf' as TimeframeRole });
      reg2.addChart({ ...mockChart, id: 'chart-3', symbol: 'BINANCE:ETHUSDT' });

      const stats = service.getStats();

      expect(stats.totalRegistries).toBe(2);
      expect(stats.totalCharts).toBe(3);
      expect(stats.symbols).toContain('BINANCE:BTCUSDT');
      expect(stats.symbols).toContain('BINANCE:ETHUSDT');
    });
  });

  describe('ChartRegistry (internal)', () => {
    it('should add and retrieve charts by timeframe', () => {
      const registry = service.createRegistry('BINANCE:BTCUSDT', 'test');

      const htfChart: ChartInfo = {
        id: 'htf-chart',
        role: 'htf' as TimeframeRole,
        symbol: 'BINANCE:BTCUSDT',
        interval: '1D',
        imageUrl: 'https://example.com/htf.png',
        indicators: ['EMA 20', 'EMA 50'],
        config: { symbol: 'BINANCE:BTCUSDT', interval: '1D' },
        generatedAt: new Date(),
      };

      registry.addChart(htfChart);

      const retrieved = registry.getByTimeframe('1D');
      expect(retrieved).toEqual(htfChart);
    });

    it('should retrieve charts by role', () => {
      const registry = service.createRegistry('BINANCE:BTCUSDT', 'test');

      const htfChart: ChartInfo = {
        id: 'htf',
        role: 'htf' as TimeframeRole,
        symbol: 'BINANCE:BTCUSDT',
        interval: '1D',
        imageUrl: 'https://example.com/htf.png',
        indicators: [],
        config: { symbol: 'BINANCE:BTCUSDT', interval: '1D' },
        generatedAt: new Date(),
      };

      const etfChart: ChartInfo = {
        id: 'etf',
        role: 'etf' as TimeframeRole,
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        imageUrl: 'https://example.com/etf.png',
        indicators: [],
        config: { symbol: 'BINANCE:BTCUSDT', interval: '4h' },
        generatedAt: new Date(),
      };

      registry.addChart(htfChart);
      registry.addChart(etfChart);

      expect(registry.getByRole('htf')?.id).toBe('htf');
      expect(registry.getByRole('etf')?.id).toBe('etf');
      expect(registry.getByRole('ltf')).toBeUndefined();
    });

    it('should return all charts', () => {
      const registry = service.createRegistry('BINANCE:BTCUSDT', 'test');

      const chart1: ChartInfo = {
        id: 'chart-1',
        role: 'htf' as TimeframeRole,
        symbol: 'BINANCE:BTCUSDT',
        interval: '1D',
        imageUrl: 'https://example.com/1.png',
        indicators: [],
        config: { symbol: 'BINANCE:BTCUSDT', interval: '1D' },
        generatedAt: new Date(),
      };

      const chart2: ChartInfo = {
        id: 'chart-2',
        role: 'etf' as TimeframeRole,
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        imageUrl: 'https://example.com/2.png',
        indicators: [],
        config: { symbol: 'BINANCE:BTCUSDT', interval: '4h' },
        generatedAt: new Date(),
      };

      registry.addChart(chart1);
      registry.addChart(chart2);

      const allCharts = registry.getAllCharts();
      expect(allCharts.length).toBe(2);
    });

    it('should check if role exists with hasRole', () => {
      const registry = service.createRegistry('BINANCE:BTCUSDT', 'test');

      expect(registry.hasRole('htf')).toBe(false);

      registry.addChart({
        id: 'htf',
        role: 'htf' as TimeframeRole,
        symbol: 'BINANCE:BTCUSDT',
        interval: '1D',
        imageUrl: 'https://example.com/htf.png',
        indicators: [],
        config: { symbol: 'BINANCE:BTCUSDT', interval: '1D' },
        generatedAt: new Date(),
      });

      expect(registry.hasRole('htf')).toBe(true);
      expect(registry.hasRole('etf')).toBe(false);
    });

    it('should return correct size', () => {
      const registry = service.createRegistry('BINANCE:BTCUSDT', 'test');

      expect(registry.size()).toBe(0);

      registry.addChart({
        id: '1',
        role: 'htf' as TimeframeRole,
        symbol: 'BINANCE:BTCUSDT',
        interval: '1D',
        imageUrl: 'url',
        indicators: [],
        config: { symbol: 'BINANCE:BTCUSDT', interval: '1D' },
        generatedAt: new Date(),
      });

      expect(registry.size()).toBe(1);
    });

    it('should clear all charts', () => {
      const registry = service.createRegistry('BINANCE:BTCUSDT', 'test');

      registry.addChart({
        id: '1',
        role: 'htf' as TimeframeRole,
        symbol: 'BINANCE:BTCUSDT',
        interval: '1D',
        imageUrl: 'url',
        indicators: [],
        config: { symbol: 'BINANCE:BTCUSDT', interval: '1D' },
        generatedAt: new Date(),
      });

      expect(registry.size()).toBe(1);

      registry.clear();

      expect(registry.size()).toBe(0);
      expect(registry.getAllCharts()).toEqual([]);
    });
  });
});
