/**
 * Interval Utilities
 *
 * Functions for parsing, comparing, and sorting trading chart intervals.
 * Supports flexible multi-timeframe analysis by enabling interval-based
 * chart ordering from highest to lowest timeframe.
 */

/**
 * Map of interval strings to their duration in minutes.
 * Used for comparing and sorting intervals.
 */
export const INTERVAL_MINUTES: Record<string, number> = {
  // Monthly
  '1M': 43200, // ~30 days
  '3M': 129600, // ~90 days

  // Weekly
  '1W': 10080, // 7 days

  // Daily
  '1D': 1440, // 24 hours
  'D': 1440, // alias

  // Hours
  '12h': 720,
  '8h': 480,
  '6h': 360,
  '4h': 240,
  '2h': 120,
  '1h': 60,

  // Minutes
  '45m': 45,
  '30m': 30,
  '15m': 15,
  '10m': 10,
  '5m': 5,
  '3m': 3,
  '1m': 1,
};

/**
 * Normalizes an interval string to a consistent format.
 * Handles case variations (1D vs 1d) and common aliases.
 *
 * @param interval - The interval string to normalize (e.g., '1d', '4H', 'D')
 * @returns Normalized interval string
 *
 * @example
 * normalizeInterval('1d') // returns '1D'
 * normalizeInterval('4H') // returns '4h'
 * normalizeInterval('D')  // returns '1D'
 */
export function normalizeInterval(interval: string): string {
  // Handle common aliases
  if (interval === 'D' || interval === 'd') return '1D';
  if (interval === 'W' || interval === 'w') return '1W';
  if (interval === 'M' || interval === 'm') return '1M';

  // Normalize format: number + unit
  const match = interval.match(/^(\d+)([mhdwMW])$/i);
  if (!match) return interval;

  const [, num, unit] = match;
  const lowerUnit = unit.toLowerCase();

  // Days, Weeks, Months stay uppercase
  if (lowerUnit === 'd') return `${num}D`;
  if (lowerUnit === 'w') return `${num}W`;
  if (lowerUnit === 'm' && parseInt(num) > 60) return `${num}M`; // Month if > 60

  // Hours and minutes stay lowercase
  return `${num}${lowerUnit}`;
}

/**
 * Gets the duration of an interval in minutes.
 *
 * @param interval - The interval string (e.g., '1D', '4h', '15m')
 * @returns Duration in minutes, or 0 if unknown
 *
 * @example
 * getIntervalMinutes('1D')  // returns 1440
 * getIntervalMinutes('4h')  // returns 240
 * getIntervalMinutes('15m') // returns 15
 */
export function getIntervalMinutes(interval: string): number {
  const normalized = normalizeInterval(interval);
  return INTERVAL_MINUTES[normalized] || 0;
}

/**
 * Compares two intervals and returns their relative order.
 *
 * @param a - First interval
 * @param b - Second interval
 * @returns Negative if a < b, positive if a > b, 0 if equal
 *
 * @example
 * compareIntervals('1D', '4h') // returns positive (1D > 4h)
 * compareIntervals('15m', '1h') // returns negative (15m < 1h)
 */
export function compareIntervals(a: string, b: string): number {
  return getIntervalMinutes(a) - getIntervalMinutes(b);
}

/**
 * Sorts items with an interval property from highest to lowest timeframe.
 * Creates a new array (doesn't mutate input).
 *
 * @param items - Array of objects with an interval property
 * @returns New sorted array (highest interval first)
 *
 * @example
 * const charts = [
 *   { interval: '15m', url: '...' },
 *   { interval: '1D', url: '...' },
 *   { interval: '4h', url: '...' },
 * ];
 * sortByIntervalDescending(charts);
 * // Returns: [{ interval: '1D', ... }, { interval: '4h', ... }, { interval: '15m', ... }]
 */
export function sortByIntervalDescending<T extends { interval: string }>(
  items: T[]
): T[] {
  return [...items].sort(
    (a, b) => getIntervalMinutes(b.interval) - getIntervalMinutes(a.interval)
  );
}

/**
 * Sorts items with an interval property from lowest to highest timeframe.
 * Creates a new array (doesn't mutate input).
 *
 * @param items - Array of objects with an interval property
 * @returns New sorted array (lowest interval first)
 */
export function sortByIntervalAscending<T extends { interval: string }>(
  items: T[]
): T[] {
  return [...items].sort(
    (a, b) => getIntervalMinutes(a.interval) - getIntervalMinutes(b.interval)
  );
}

/**
 * Gets the position of an interval in a sorted list.
 * Position 0 is the highest timeframe.
 *
 * @param interval - The interval to find
 * @param allIntervals - Array of all intervals to consider
 * @returns Position index (0 = highest), or -1 if not found
 *
 * @example
 * getTimeframePosition('4h', ['1D', '4h', '1h', '15m']) // returns 1
 * getTimeframePosition('1D', ['1D', '4h', '1h', '15m']) // returns 0
 */
export function getTimeframePosition(
  interval: string,
  allIntervals: string[]
): number {
  const sorted = sortByIntervalDescending(
    allIntervals.map((i) => ({ interval: i }))
  );
  const normalizedTarget = normalizeInterval(interval);
  return sorted.findIndex(
    (s) => normalizeInterval(s.interval) === normalizedTarget
  );
}

/**
 * Checks if an interval is higher (longer timeframe) than another.
 *
 * @param a - First interval
 * @param b - Second interval
 * @returns true if a is higher than b
 *
 * @example
 * isHigherTimeframe('1D', '4h') // returns true
 * isHigherTimeframe('15m', '1h') // returns false
 */
export function isHigherTimeframe(a: string, b: string): boolean {
  return getIntervalMinutes(a) > getIntervalMinutes(b);
}

/**
 * Gets the highest timeframe from an array of intervals.
 *
 * @param intervals - Array of interval strings
 * @returns The highest interval, or undefined if empty
 */
export function getHighestTimeframe(intervals: string[]): string | undefined {
  if (intervals.length === 0) return undefined;
  return intervals.reduce((highest, current) =>
    isHigherTimeframe(current, highest) ? current : highest
  );
}

/**
 * Gets the lowest timeframe from an array of intervals.
 *
 * @param intervals - Array of interval strings
 * @returns The lowest interval, or undefined if empty
 */
export function getLowestTimeframe(intervals: string[]): string | undefined {
  if (intervals.length === 0) return undefined;
  return intervals.reduce((lowest, current) =>
    isHigherTimeframe(lowest, current) ? current : lowest
  );
}

/**
 * Groups intervals into categories (high, medium, low timeframe).
 * Useful for understanding the timeframe distribution.
 *
 * @param intervals - Array of interval strings
 * @returns Object with high, medium, low arrays
 */
export function categorizeTimeframes(intervals: string[]): {
  high: string[]; // >= 1D
  medium: string[]; // 1h - 12h
  low: string[]; // < 1h
} {
  const high: string[] = [];
  const medium: string[] = [];
  const low: string[] = [];

  for (const interval of intervals) {
    const minutes = getIntervalMinutes(interval);
    if (minutes >= 1440) {
      high.push(interval);
    } else if (minutes >= 60) {
      medium.push(interval);
    } else {
      low.push(interval);
    }
  }

  return { high, medium, low };
}
