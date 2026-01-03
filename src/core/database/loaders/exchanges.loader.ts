/**
 * Exchanges Loader Utility
 *
 * Centralized utility for loading and validating exchanges from the database.
 * Provides exchange validation for symbol format (EXCHANGE:SYMBOL).
 *
 * The LLM knows thousands of trading symbols - we only need to validate
 * that the exchange is supported by chart-img.com API.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Exchange definition from database
 */
export interface Exchange {
  id: string;
  name: string;
  example: string;
  country?: string;
}

/**
 * Exchanges database structure
 */
export interface ExchangesDatabase {
  version: string;
  lastUpdated: string;
  source: string;
  totalExchanges: number;
  exchanges: {
    crypto: Exchange[];
    forex: Exchange[];
    stocks: {
      northAmerica: Exchange[];
      europe: Exchange[];
      asia: Exchange[];
      middleEast: Exchange[];
      southAmerica: Exchange[];
    };
    indices: Exchange[];
    futures: Exchange[];
    bonds: Exchange[];
  };
  allExchangeIds: string[];
}

/**
 * Symbol validation result
 */
export interface SymbolValidationResult {
  valid: boolean;
  exchange: string;
  symbol: string;
  fullSymbol: string;
  category?: string;
  error?: string;
}

/**
 * Lazy-loaded exchanges database
 */
let cachedDatabase: ExchangesDatabase | null = null;
let cachedExchangeIds: Set<string> | null = null;
let loadError: Error | null = null;

/**
 * Load the exchanges database from JSON file
 * Uses caching to avoid repeated file reads
 */
export function loadExchangesDatabase(): ExchangesDatabase {
  if (cachedDatabase) {
    return cachedDatabase;
  }

  if (loadError) {
    throw loadError;
  }

  try {
    const dbPath = path.join(process.cwd(), 'src/core/database/exchanges.json');
    const rawData = fs.readFileSync(dbPath, 'utf-8');
    cachedDatabase = JSON.parse(rawData) as ExchangesDatabase;

    // Build and cache exchange IDs set for fast lookup
    buildExchangeIdsCache();

    return cachedDatabase;
  } catch (error) {
    loadError = error as Error;
    throw new Error(
      `Failed to load exchanges database: ${(error as Error).message}`
    );
  }
}

/**
 * Build a Set of all exchange IDs for fast validation
 */
function buildExchangeIdsCache(): void {
  if (!cachedDatabase) return;

  const ids = new Set<string>();
  const { exchanges } = cachedDatabase;

  // Crypto
  exchanges.crypto.forEach((e) => ids.add(e.id));

  // Forex
  exchanges.forex.forEach((e) => ids.add(e.id));

  // Stocks (all regions)
  Object.values(exchanges.stocks).forEach((region) => {
    region.forEach((e) => ids.add(e.id));
  });

  // Indices
  exchanges.indices.forEach((e) => ids.add(e.id));

  // Futures
  exchanges.futures.forEach((e) => ids.add(e.id));

  // Bonds
  exchanges.bonds.forEach((e) => ids.add(e.id));

  cachedExchangeIds = ids;

  // Update the database with all IDs for reference
  cachedDatabase.allExchangeIds = Array.from(ids).sort();
  cachedDatabase.totalExchanges = ids.size;
}

/**
 * Get all valid exchange IDs as a Set (fast lookup)
 */
export function getValidExchangeIds(): Set<string> {
  if (cachedExchangeIds) {
    return cachedExchangeIds;
  }

  loadExchangesDatabase();
  return cachedExchangeIds!;
}

/**
 * Check if an exchange ID is valid
 */
export function isValidExchange(exchangeId: string): boolean {
  const ids = getValidExchangeIds();
  return ids.has(exchangeId.toUpperCase());
}

/**
 * Validate a full symbol in EXCHANGE:SYMBOL format
 *
 * @param fullSymbol - Symbol in format "EXCHANGE:SYMBOL" (e.g., "BINANCE:BTCUSDT")
 * @returns Validation result with parsed components
 */
export function validateSymbol(fullSymbol: string): SymbolValidationResult {
  // Check format
  if (!fullSymbol || typeof fullSymbol !== 'string') {
    return {
      valid: false,
      exchange: '',
      symbol: '',
      fullSymbol: fullSymbol || '',
      error: 'Symbol is required',
    };
  }

  // Check for EXCHANGE:SYMBOL format
  const parts = fullSymbol.split(':');
  if (parts.length !== 2) {
    return {
      valid: false,
      exchange: '',
      symbol: fullSymbol,
      fullSymbol,
      error: `Invalid format. Expected EXCHANGE:SYMBOL (e.g., BINANCE:BTCUSDT), got: ${fullSymbol}`,
    };
  }

  const [exchange, symbol] = parts;
  const exchangeUpper = exchange.toUpperCase();
  const symbolUpper = symbol.toUpperCase();

  // Validate exchange exists
  if (!isValidExchange(exchangeUpper)) {
    return {
      valid: false,
      exchange: exchangeUpper,
      symbol: symbolUpper,
      fullSymbol: `${exchangeUpper}:${symbolUpper}`,
      error: `Unknown exchange: ${exchangeUpper}. Use get_exchanges tool to see valid exchanges.`,
    };
  }

  // Get category for the exchange
  const category = getExchangeCategory(exchangeUpper);

  return {
    valid: true,
    exchange: exchangeUpper,
    symbol: symbolUpper,
    fullSymbol: `${exchangeUpper}:${symbolUpper}`,
    category,
  };
}

/**
 * Get the category of an exchange
 */
export function getExchangeCategory(exchangeId: string): string | undefined {
  const db = loadExchangesDatabase();
  const id = exchangeId.toUpperCase();

  if (db.exchanges.crypto.some((e) => e.id === id)) return 'crypto';
  if (db.exchanges.forex.some((e) => e.id === id)) return 'forex';
  if (db.exchanges.indices.some((e) => e.id === id)) return 'indices';
  if (db.exchanges.futures.some((e) => e.id === id)) return 'futures';
  if (db.exchanges.bonds.some((e) => e.id === id)) return 'bonds';

  // Check stocks (all regions)
  for (const [region, exchanges] of Object.entries(db.exchanges.stocks)) {
    if (exchanges.some((e) => e.id === id)) {
      return `stocks-${region}`;
    }
  }

  return undefined;
}

/**
 * Get exchange by ID
 */
export function getExchangeById(exchangeId: string): Exchange | undefined {
  const db = loadExchangesDatabase();
  const id = exchangeId.toUpperCase();

  // Search all categories
  const allExchanges = [
    ...db.exchanges.crypto,
    ...db.exchanges.forex,
    ...db.exchanges.indices,
    ...db.exchanges.futures,
    ...db.exchanges.bonds,
    ...Object.values(db.exchanges.stocks).flat(),
  ];

  return allExchanges.find((e) => e.id === id);
}

/**
 * Get exchanges by category
 */
export function getExchangesByCategory(category: string): Exchange[] {
  const db = loadExchangesDatabase();

  switch (category.toLowerCase()) {
    case 'crypto':
      return db.exchanges.crypto;
    case 'forex':
      return db.exchanges.forex;
    case 'indices':
      return db.exchanges.indices;
    case 'futures':
      return db.exchanges.futures;
    case 'bonds':
      return db.exchanges.bonds;
    case 'stocks':
      return Object.values(db.exchanges.stocks).flat();
    default:
      // Check for specific stock region
      if (category.startsWith('stocks-')) {
        const region = category.replace('stocks-', '') as keyof typeof db.exchanges.stocks;
        return db.exchanges.stocks[region] || [];
      }
      return [];
  }
}

/**
 * Get all exchanges as a flat array
 */
export function getAllExchanges(): Exchange[] {
  const db = loadExchangesDatabase();

  return [
    ...db.exchanges.crypto,
    ...db.exchanges.forex,
    ...db.exchanges.indices,
    ...db.exchanges.futures,
    ...db.exchanges.bonds,
    ...Object.values(db.exchanges.stocks).flat(),
  ];
}

/**
 * Get database statistics
 */
export function getExchangesStats(): {
  total: number;
  byCategory: Record<string, number>;
} {
  const db = loadExchangesDatabase();

  return {
    total: db.totalExchanges,
    byCategory: {
      crypto: db.exchanges.crypto.length,
      forex: db.exchanges.forex.length,
      indices: db.exchanges.indices.length,
      futures: db.exchanges.futures.length,
      bonds: db.exchanges.bonds.length,
      stocks: Object.values(db.exchanges.stocks).flat().length,
    },
  };
}

/**
 * Clear the cached database (useful for testing)
 */
export function clearExchangesCache(): void {
  cachedDatabase = null;
  cachedExchangeIds = null;
  loadError = null;
}

/**
 * Get suggested exchanges for a given asset type
 * Helps LLM choose the right exchange
 */
export function getSuggestedExchanges(assetType: string): string[] {
  const type = assetType.toLowerCase();

  // Common/popular exchanges by asset type
  const suggestions: Record<string, string[]> = {
    crypto: ['BINANCE', 'COINBASE', 'BYBIT', 'OKX', 'KRAKEN'],
    bitcoin: ['BINANCE', 'COINBASE', 'BYBIT'],
    ethereum: ['BINANCE', 'COINBASE', 'KRAKEN'],
    forex: ['FX', 'OANDA', 'PEPPERSTONE', 'CAPITALCOM'],
    stocks: ['NASDAQ', 'NYSE', 'AMEX'],
    'us stocks': ['NASDAQ', 'NYSE', 'AMEX'],
    indices: ['SP', 'DJ', 'TVC', 'NASDAQ'],
    futures: ['CME', 'CME_MINI', 'COMEX', 'NYMEX'],
    gold: ['COMEX', 'FX'],
    oil: ['NYMEX', 'CME'],
    bonds: ['TVC'],
  };

  return suggestions[type] || [];
}
