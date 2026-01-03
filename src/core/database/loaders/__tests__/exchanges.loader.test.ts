/**
 * Tests for Exchanges Loader
 *
 * Tests the exchange database loading and validation functions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadExchangesDatabase,
  getValidExchangeIds,
  isValidExchange,
  validateSymbol,
  getExchangeCategory,
  getExchangeById,
  getExchangesByCategory,
  getAllExchanges,
  getExchangesStats,
  getSuggestedExchanges,
  clearExchangesCache,
} from '../exchanges.loader';

describe('Exchanges Loader', () => {
  beforeEach(() => {
    clearExchangesCache();
  });

  describe('loadExchangesDatabase', () => {
    it('should load the exchanges database', () => {
      const db = loadExchangesDatabase();

      expect(db).toBeDefined();
      expect(db.version).toBeDefined();
      expect(db.exchanges).toBeDefined();
    });

    it('should have crypto exchanges', () => {
      const db = loadExchangesDatabase();

      expect(db.exchanges.crypto).toBeDefined();
      expect(db.exchanges.crypto.length).toBeGreaterThan(0);
    });

    it('should have forex exchanges', () => {
      const db = loadExchangesDatabase();

      expect(db.exchanges.forex).toBeDefined();
      expect(db.exchanges.forex.length).toBeGreaterThan(0);
    });

    it('should cache the database', () => {
      const db1 = loadExchangesDatabase();
      const db2 = loadExchangesDatabase();

      expect(db1).toBe(db2); // Same reference
    });
  });

  describe('getValidExchangeIds', () => {
    it('should return a Set of exchange IDs', () => {
      const ids = getValidExchangeIds();

      expect(ids).toBeInstanceOf(Set);
      expect(ids.size).toBeGreaterThan(100); // We have 156+ exchanges
    });

    it('should include common crypto exchanges', () => {
      const ids = getValidExchangeIds();

      expect(ids.has('BINANCE')).toBe(true);
      expect(ids.has('COINBASE')).toBe(true);
      expect(ids.has('BYBIT')).toBe(true);
      expect(ids.has('KRAKEN')).toBe(true);
    });

    it('should include common stock exchanges', () => {
      const ids = getValidExchangeIds();

      expect(ids.has('NASDAQ')).toBe(true);
      expect(ids.has('NYSE')).toBe(true);
      expect(ids.has('AMEX')).toBe(true);
    });

    it('should include forex exchanges', () => {
      const ids = getValidExchangeIds();

      expect(ids.has('FX')).toBe(true);
      expect(ids.has('OANDA')).toBe(true);
    });

    it('should include indices exchanges', () => {
      const ids = getValidExchangeIds();

      expect(ids.has('SP')).toBe(true);
      expect(ids.has('DJ')).toBe(true);
      expect(ids.has('TVC')).toBe(true);
    });

    it('should include futures exchanges', () => {
      const ids = getValidExchangeIds();

      expect(ids.has('CME')).toBe(true);
      expect(ids.has('COMEX')).toBe(true);
      expect(ids.has('NYMEX')).toBe(true);
    });
  });

  describe('isValidExchange', () => {
    it('should return true for valid exchanges', () => {
      expect(isValidExchange('BINANCE')).toBe(true);
      expect(isValidExchange('NASDAQ')).toBe(true);
      expect(isValidExchange('FX')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(isValidExchange('binance')).toBe(true);
      expect(isValidExchange('Binance')).toBe(true);
      expect(isValidExchange('BINANCE')).toBe(true);
    });

    it('should return false for invalid exchanges', () => {
      expect(isValidExchange('INVALID')).toBe(false);
      expect(isValidExchange('FAKE')).toBe(false);
      expect(isValidExchange('')).toBe(false);
    });
  });

  describe('validateSymbol', () => {
    it('should validate correct symbol format', () => {
      const result = validateSymbol('BINANCE:BTCUSDT');

      expect(result.valid).toBe(true);
      expect(result.exchange).toBe('BINANCE');
      expect(result.symbol).toBe('BTCUSDT');
      expect(result.fullSymbol).toBe('BINANCE:BTCUSDT');
    });

    it('should uppercase the result', () => {
      const result = validateSymbol('binance:btcusdt');

      expect(result.valid).toBe(true);
      expect(result.exchange).toBe('BINANCE');
      expect(result.symbol).toBe('BTCUSDT');
    });

    it('should return error for invalid format (no colon)', () => {
      const result = validateSymbol('BTCUSDT');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid format');
    });

    it('should return error for invalid exchange', () => {
      const result = validateSymbol('INVALID:BTCUSDT');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown exchange');
    });

    it('should return error for empty symbol', () => {
      const result = validateSymbol('');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should validate futures symbols', () => {
      const result = validateSymbol('CME:ES1!');

      expect(result.valid).toBe(true);
      expect(result.symbol).toBe('ES1!');
    });

    it('should validate perpetual symbols', () => {
      const result = validateSymbol('BYBIT:BTCUSDT.P');

      expect(result.valid).toBe(true);
      expect(result.symbol).toBe('BTCUSDT.P');
    });

    it('should include category in result', () => {
      const result = validateSymbol('BINANCE:BTCUSDT');

      expect(result.category).toBe('crypto');
    });
  });

  describe('getExchangeCategory', () => {
    it('should return crypto for crypto exchanges', () => {
      expect(getExchangeCategory('BINANCE')).toBe('crypto');
      expect(getExchangeCategory('COINBASE')).toBe('crypto');
    });

    it('should return forex for forex exchanges', () => {
      expect(getExchangeCategory('FX')).toBe('forex');
      expect(getExchangeCategory('OANDA')).toBe('forex');
    });

    it('should return indices for index exchanges', () => {
      expect(getExchangeCategory('SP')).toBe('indices');
      expect(getExchangeCategory('DJ')).toBe('indices');
    });

    it('should return futures for futures exchanges', () => {
      expect(getExchangeCategory('CME')).toBe('futures');
      expect(getExchangeCategory('COMEX')).toBe('futures');
    });

    it('should return stocks-* for stock exchanges', () => {
      expect(getExchangeCategory('NASDAQ')).toContain('stocks');
      expect(getExchangeCategory('NYSE')).toContain('stocks');
    });
  });

  describe('getExchangeById', () => {
    it('should return exchange by ID', () => {
      const exchange = getExchangeById('BINANCE');

      expect(exchange).toBeDefined();
      expect(exchange?.id).toBe('BINANCE');
      expect(exchange?.name).toBe('Binance');
    });

    it('should be case insensitive', () => {
      const exchange = getExchangeById('binance');

      expect(exchange).toBeDefined();
      expect(exchange?.id).toBe('BINANCE');
    });

    it('should return undefined for invalid ID', () => {
      const exchange = getExchangeById('INVALID');

      expect(exchange).toBeUndefined();
    });
  });

  describe('getExchangesByCategory', () => {
    it('should return crypto exchanges', () => {
      const exchanges = getExchangesByCategory('crypto');

      expect(exchanges.length).toBeGreaterThan(0);
      expect(exchanges.some((e) => e.id === 'BINANCE')).toBe(true);
    });

    it('should return forex exchanges', () => {
      const exchanges = getExchangesByCategory('forex');

      expect(exchanges.length).toBeGreaterThan(0);
      expect(exchanges.some((e) => e.id === 'FX')).toBe(true);
    });

    it('should return all stocks for "stocks" category', () => {
      const exchanges = getExchangesByCategory('stocks');

      expect(exchanges.length).toBeGreaterThan(0);
      expect(exchanges.some((e) => e.id === 'NASDAQ')).toBe(true);
    });

    it('should return empty array for invalid category', () => {
      const exchanges = getExchangesByCategory('invalid');

      expect(exchanges).toEqual([]);
    });
  });

  describe('getAllExchanges', () => {
    it('should return all exchanges', () => {
      const exchanges = getAllExchanges();

      expect(exchanges.length).toBeGreaterThan(100);
    });
  });

  describe('getExchangesStats', () => {
    it('should return stats', () => {
      const stats = getExchangesStats();

      expect(stats.total).toBeGreaterThan(100);
      expect(stats.byCategory.crypto).toBeGreaterThan(0);
      expect(stats.byCategory.forex).toBeGreaterThan(0);
      expect(stats.byCategory.stocks).toBeGreaterThan(0);
    });
  });

  describe('getSuggestedExchanges', () => {
    it('should return suggestions for crypto', () => {
      const suggestions = getSuggestedExchanges('crypto');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('BINANCE');
    });

    it('should return suggestions for forex', () => {
      const suggestions = getSuggestedExchanges('forex');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('FX');
    });

    it('should return suggestions for stocks', () => {
      const suggestions = getSuggestedExchanges('stocks');

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions).toContain('NASDAQ');
    });

    it('should return empty for unknown type', () => {
      const suggestions = getSuggestedExchanges('unknown');

      expect(suggestions).toEqual([]);
    });
  });
});
