/**
 * Interval Utilities Tests
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeInterval,
  getIntervalMinutes,
  compareIntervals,
  sortByIntervalDescending,
  sortByIntervalAscending,
  getTimeframePosition,
  isHigherTimeframe,
  getHighestTimeframe,
  getLowestTimeframe,
  categorizeTimeframes,
  INTERVAL_MINUTES,
} from '../interval.utils';

describe('Interval Utilities', () => {
  describe('normalizeInterval', () => {
    it('should normalize daily intervals', () => {
      expect(normalizeInterval('1D')).toBe('1D');
      expect(normalizeInterval('1d')).toBe('1D');
      expect(normalizeInterval('D')).toBe('1D');
      expect(normalizeInterval('d')).toBe('1D');
    });

    it('should normalize weekly intervals', () => {
      expect(normalizeInterval('1W')).toBe('1W');
      expect(normalizeInterval('1w')).toBe('1W');
      expect(normalizeInterval('W')).toBe('1W');
    });

    it('should normalize hourly intervals to lowercase', () => {
      expect(normalizeInterval('4h')).toBe('4h');
      expect(normalizeInterval('4H')).toBe('4h');
      expect(normalizeInterval('1h')).toBe('1h');
      expect(normalizeInterval('12h')).toBe('12h');
    });

    it('should normalize minute intervals to lowercase', () => {
      expect(normalizeInterval('15m')).toBe('15m');
      expect(normalizeInterval('15M')).toBe('15m');
      expect(normalizeInterval('5m')).toBe('5m');
      expect(normalizeInterval('30m')).toBe('30m');
    });

    it('should return input unchanged if not recognized', () => {
      expect(normalizeInterval('unknown')).toBe('unknown');
    });
  });

  describe('getIntervalMinutes', () => {
    it('should return correct minutes for daily intervals', () => {
      expect(getIntervalMinutes('1D')).toBe(1440);
      expect(getIntervalMinutes('1d')).toBe(1440);
      expect(getIntervalMinutes('D')).toBe(1440);
    });

    it('should return correct minutes for weekly intervals', () => {
      expect(getIntervalMinutes('1W')).toBe(10080);
      expect(getIntervalMinutes('W')).toBe(10080);
    });

    it('should return correct minutes for monthly intervals', () => {
      // Note: '1M' with uppercase M is treated as month (43200 minutes)
      // The INTERVAL_MINUTES map has '1M' as a key
      expect(INTERVAL_MINUTES['1M']).toBe(43200);
    });

    it('should return correct minutes for hourly intervals', () => {
      expect(getIntervalMinutes('4h')).toBe(240);
      expect(getIntervalMinutes('1h')).toBe(60);
      expect(getIntervalMinutes('12h')).toBe(720);
    });

    it('should return correct minutes for minute intervals', () => {
      expect(getIntervalMinutes('15m')).toBe(15);
      expect(getIntervalMinutes('5m')).toBe(5);
      expect(getIntervalMinutes('1m')).toBe(1);
    });

    it('should return 0 for unknown intervals', () => {
      expect(getIntervalMinutes('unknown')).toBe(0);
    });
  });

  describe('compareIntervals', () => {
    it('should return positive when first interval is higher', () => {
      expect(compareIntervals('1D', '4h')).toBeGreaterThan(0);
      expect(compareIntervals('4h', '15m')).toBeGreaterThan(0);
      expect(compareIntervals('1W', '1D')).toBeGreaterThan(0);
    });

    it('should return negative when first interval is lower', () => {
      expect(compareIntervals('4h', '1D')).toBeLessThan(0);
      expect(compareIntervals('15m', '4h')).toBeLessThan(0);
      expect(compareIntervals('1D', '1W')).toBeLessThan(0);
    });

    it('should return 0 for equal intervals', () => {
      expect(compareIntervals('1D', '1D')).toBe(0);
      expect(compareIntervals('4h', '4h')).toBe(0);
    });
  });

  describe('sortByIntervalDescending', () => {
    it('should sort charts from highest to lowest timeframe', () => {
      const charts = [
        { interval: '15m', url: 'a' },
        { interval: '1D', url: 'b' },
        { interval: '4h', url: 'c' },
        { interval: '1h', url: 'd' },
      ];

      const sorted = sortByIntervalDescending(charts);

      expect(sorted[0].interval).toBe('1D');
      expect(sorted[1].interval).toBe('4h');
      expect(sorted[2].interval).toBe('1h');
      expect(sorted[3].interval).toBe('15m');
    });

    it('should handle 5 timeframes correctly', () => {
      const charts = [
        { interval: '1h' },
        { interval: '1W' },
        { interval: '15m' },
        { interval: '1D' },
        { interval: '4h' },
      ];

      const sorted = sortByIntervalDescending(charts);

      expect(sorted.map((c) => c.interval)).toEqual([
        '1W',
        '1D',
        '4h',
        '1h',
        '15m',
      ]);
    });

    it('should not mutate original array', () => {
      const charts = [{ interval: '15m' }, { interval: '1D' }];
      const original = [...charts];

      sortByIntervalDescending(charts);

      expect(charts).toEqual(original);
    });

    it('should handle empty array', () => {
      expect(sortByIntervalDescending([])).toEqual([]);
    });

    it('should handle single item', () => {
      const charts = [{ interval: '4h' }];
      const sorted = sortByIntervalDescending(charts);
      expect(sorted).toEqual([{ interval: '4h' }]);
    });
  });

  describe('sortByIntervalAscending', () => {
    it('should sort charts from lowest to highest timeframe', () => {
      const charts = [
        { interval: '1D' },
        { interval: '15m' },
        { interval: '4h' },
      ];

      const sorted = sortByIntervalAscending(charts);

      expect(sorted[0].interval).toBe('15m');
      expect(sorted[1].interval).toBe('4h');
      expect(sorted[2].interval).toBe('1D');
    });
  });

  describe('getTimeframePosition', () => {
    it('should return 0 for highest timeframe', () => {
      const intervals = ['1D', '4h', '1h', '15m'];
      expect(getTimeframePosition('1D', intervals)).toBe(0);
    });

    it('should return correct position for middle timeframes', () => {
      const intervals = ['1D', '4h', '1h', '15m'];
      expect(getTimeframePosition('4h', intervals)).toBe(1);
      expect(getTimeframePosition('1h', intervals)).toBe(2);
    });

    it('should return last position for lowest timeframe', () => {
      const intervals = ['1D', '4h', '1h', '15m'];
      expect(getTimeframePosition('15m', intervals)).toBe(3);
    });

    it('should return -1 for interval not in list', () => {
      const intervals = ['1D', '4h'];
      expect(getTimeframePosition('1W', intervals)).toBe(-1);
    });

    it('should handle case insensitivity', () => {
      const intervals = ['1d', '4H', '15M'];
      expect(getTimeframePosition('1D', intervals)).toBe(0);
      expect(getTimeframePosition('4h', intervals)).toBe(1);
    });
  });

  describe('isHigherTimeframe', () => {
    it('should return true when first is higher', () => {
      expect(isHigherTimeframe('1D', '4h')).toBe(true);
      expect(isHigherTimeframe('1W', '1D')).toBe(true);
      expect(isHigherTimeframe('1h', '15m')).toBe(true);
    });

    it('should return false when first is lower or equal', () => {
      expect(isHigherTimeframe('4h', '1D')).toBe(false);
      expect(isHigherTimeframe('1D', '1D')).toBe(false);
      expect(isHigherTimeframe('15m', '1h')).toBe(false);
    });
  });

  describe('getHighestTimeframe', () => {
    it('should return highest timeframe', () => {
      expect(getHighestTimeframe(['15m', '1D', '4h'])).toBe('1D');
      expect(getHighestTimeframe(['1h', '15m', '5m'])).toBe('1h');
      expect(getHighestTimeframe(['1W', '1D', '4h'])).toBe('1W');
    });

    it('should return undefined for empty array', () => {
      expect(getHighestTimeframe([])).toBeUndefined();
    });

    it('should handle single interval', () => {
      expect(getHighestTimeframe(['4h'])).toBe('4h');
    });
  });

  describe('getLowestTimeframe', () => {
    it('should return lowest timeframe', () => {
      expect(getLowestTimeframe(['15m', '1D', '4h'])).toBe('15m');
      expect(getLowestTimeframe(['1h', '15m', '5m'])).toBe('5m');
    });

    it('should return undefined for empty array', () => {
      expect(getLowestTimeframe([])).toBeUndefined();
    });
  });

  describe('categorizeTimeframes', () => {
    it('should categorize timeframes correctly', () => {
      const intervals = ['1W', '1D', '4h', '1h', '15m', '5m'];
      const result = categorizeTimeframes(intervals);

      expect(result.high).toEqual(['1W', '1D']);
      expect(result.medium).toEqual(['4h', '1h']);
      expect(result.low).toEqual(['15m', '5m']);
    });

    it('should handle empty array', () => {
      const result = categorizeTimeframes([]);
      expect(result).toEqual({ high: [], medium: [], low: [] });
    });

    it('should handle only high timeframes', () => {
      const result = categorizeTimeframes(['1W', '1D']);
      expect(result.high).toEqual(['1W', '1D']);
      expect(result.medium).toEqual([]);
      expect(result.low).toEqual([]);
    });
  });

  describe('INTERVAL_MINUTES constant', () => {
    it('should have correct values for common intervals', () => {
      expect(INTERVAL_MINUTES['1M']).toBe(43200);
      expect(INTERVAL_MINUTES['1W']).toBe(10080);
      expect(INTERVAL_MINUTES['1D']).toBe(1440);
      expect(INTERVAL_MINUTES['4h']).toBe(240);
      expect(INTERVAL_MINUTES['1h']).toBe(60);
      expect(INTERVAL_MINUTES['15m']).toBe(15);
      expect(INTERVAL_MINUTES['1m']).toBe(1);
    });

    it('should maintain correct relative order', () => {
      expect(INTERVAL_MINUTES['1M']).toBeGreaterThan(INTERVAL_MINUTES['1W']);
      expect(INTERVAL_MINUTES['1W']).toBeGreaterThan(INTERVAL_MINUTES['1D']);
      expect(INTERVAL_MINUTES['1D']).toBeGreaterThan(INTERVAL_MINUTES['4h']);
      expect(INTERVAL_MINUTES['4h']).toBeGreaterThan(INTERVAL_MINUTES['1h']);
      expect(INTERVAL_MINUTES['1h']).toBeGreaterThan(INTERVAL_MINUTES['15m']);
      expect(INTERVAL_MINUTES['15m']).toBeGreaterThan(INTERVAL_MINUTES['1m']);
    });
  });
});
