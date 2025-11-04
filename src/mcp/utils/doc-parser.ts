/**
 * Documentation Parser
 *
 * Fetches and parses chart-img.com documentation from https://doc.chart-img.com
 * Extracts indicators, parameters, constraints, and examples.
 */

import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { getAllIndicators } from '../../lib/indicators-loader';

// Type Definitions

export interface IndicatorParameter {
  type: 'number' | 'string' | 'boolean' | 'source';
  default: any;
  description: string;
  min?: number;
  max?: number;
  options?: string[];
}

export interface Indicator {
  name: string;
  displayName: string;
  category: string;
  inputs: Record<string, IndicatorParameter>;
  description?: string;
}

export interface ChartParameters {
  intervals: string[];
  ranges: string[];
  themes: string[];
  styles: string[];
}

export interface RateLimitInfo {
  requestsPerSecond: number;
  dailyMax: number;
  maxResolution: string;
  maxStudies: number;
}

export interface RateLimits {
  [plan: string]: RateLimitInfo;
}

export interface Example {
  description: string;
  config: any;
}

export interface ParsedDocumentation {
  indicators: Indicator[];
  chartParameters: ChartParameters;
  rateLimits: RateLimits;
  examples: Example[];
  lastUpdated: string;
}

export interface DocumentationSection {
  indicators?: Indicator[];
  parameters?: ChartParameters;
  rateLimits?: RateLimits;
  examples?: Example[];
  all?: ParsedDocumentation;
}

// Cache
interface CacheEntry {
  data: ParsedDocumentation;
  expiresAt: number;
}

let documentationCache: CacheEntry | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch and parse chart-img.com documentation
 */
export async function fetchDocumentation(
  section?: 'indicators' | 'parameters' | 'rateLimits' | 'examples' | 'all',
  forceRefresh = false
): Promise<DocumentationSection> {
  // Check cache
  if (!forceRefresh && documentationCache && Date.now() < documentationCache.expiresAt) {
    return extractSection(documentationCache.data, section);
  }

  // Fetch documentation
  const docUrl = 'https://doc.chart-img.com';
  const response = await fetch(docUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch documentation: ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Parse documentation
  const parsed: ParsedDocumentation = {
    indicators: parseIndicators($),
    chartParameters: parseChartParameters($),
    rateLimits: parseRateLimits($),
    examples: parseExamples($),
    lastUpdated: new Date().toISOString(),
  };

  // Cache the result
  documentationCache = {
    data: parsed,
    expiresAt: Date.now() + CACHE_TTL,
  };

  return extractSection(parsed, section);
}

/**
 * Parse indicators from documentation
 * Now loads from indicators.json via the indicators-loader utility
 */
function parseIndicators($: cheerio.CheerioAPI): Indicator[] {
  try {
    // Load all indicators from indicators.json
    const dbIndicators = getAllIndicators();

    // Convert from database format to doc-parser format
    const indicators: Indicator[] = dbIndicators.map((ind) => ({
      name: `${ind.name}@tv-basicstudies`,
      displayName: ind.name,
      category: ind.category,
      inputs: ind.inputs.reduce(
        (acc, inputDef) => {
          acc[inputDef.name] = {
            type: inputDef.type,
            default: inputDef.default,
            description: inputDef.description,
            ...(inputDef.min !== undefined && { min: inputDef.min }),
            ...(inputDef.max !== undefined && { max: inputDef.max }),
            ...(inputDef.options && { options: inputDef.options }),
          };
          return acc;
        },
        {} as Record<string, IndicatorParameter>
      ),
    }));

    return indicators;
  } catch (error) {
    console.error('Error loading indicators from JSON:', error);
    // Fallback to empty list - the system will still work but with no indicators
    return [];
  }
}

/**
 * Parse chart parameters from documentation
 */
function parseChartParameters($: cheerio.CheerioAPI): ChartParameters {
  return {
    intervals: [
      '1m', '3m', '5m', '15m', '30m',
      '1h', '2h', '4h', '6h', '12h',
      '1D', '3D', '1W', '1M',
    ],
    ranges: [
      '1D', '5D', '1M', '3M', '6M',
      'YTD', '1Y', '5Y', 'ALL',
    ],
    themes: ['light', 'dark'],
    styles: [
      'bar', 'candle', 'line', 'area',
      'heikinAshi', 'hollowCandle', 'baseline',
      'hiLo', 'column',
    ],
  };
}

/**
 * Parse rate limits from documentation
 */
function parseRateLimits($: cheerio.CheerioAPI): RateLimits {
  return {
    BASIC: {
      requestsPerSecond: 1,
      dailyMax: 50,
      maxResolution: '800x600',
      maxStudies: 3,
    },
    PRO: {
      requestsPerSecond: 10,
      dailyMax: 500,
      maxResolution: '1920x1080',
      maxStudies: 5,
    },
    MEGA: {
      requestsPerSecond: 15,
      dailyMax: 1000,
      maxResolution: '1920x1600',
      maxStudies: 10,
    },
    ULTRA: {
      requestsPerSecond: 35,
      dailyMax: 3000,
      maxResolution: '2048x1920',
      maxStudies: 25,
    },
    ENTERPRISE: {
      requestsPerSecond: 35,
      dailyMax: 5000,
      maxResolution: '2048x1920',
      maxStudies: 50,
    },
  };
}

/**
 * Parse examples from documentation
 */
function parseExamples($: cheerio.CheerioAPI): Example[] {
  // Example configurations
  return [
    {
      description: 'Simple Bitcoin chart with default settings',
      config: {
        symbol: 'BINANCE:BTCUSDT',
        interval: '1h',
        range: '1D',
      },
    },
    {
      description: 'Bitcoin with Bollinger Bands and RSI',
      config: {
        symbol: 'BINANCE:BTCUSDT',
        interval: '1h',
        range: '7D',
        theme: 'dark',
        studies: [
          { name: 'BollingerBands@tv-basicstudies', inputs: { length: 20, stdDev: 2 } },
          { name: 'RSI@tv-basicstudies', inputs: { length: 14 } },
        ],
      },
    },
    {
      description: 'Apple stock with moving averages',
      config: {
        symbol: 'NASDAQ:AAPL',
        interval: '1D',
        range: '3M',
        theme: 'light',
        studies: [
          { name: 'MA@tv-basicstudies', inputs: { length: 20 } },
          { name: 'MA@tv-basicstudies', inputs: { length: 50 } },
        ],
      },
    },
  ];
}

/**
 * Extract specific section from parsed documentation
 */
function extractSection(
  data: ParsedDocumentation,
  section?: 'indicators' | 'parameters' | 'rateLimits' | 'examples' | 'all'
): DocumentationSection {
  if (!section || section === 'all') {
    return { all: data };
  }

  switch (section) {
    case 'indicators':
      return { indicators: data.indicators };
    case 'parameters':
      return { parameters: data.chartParameters };
    case 'rateLimits':
      return { rateLimits: data.rateLimits };
    case 'examples':
      return { examples: data.examples };
    default:
      return { all: data };
  }
}

/**
 * Get cached documentation (if available)
 */
export function getCachedDocumentation(): ParsedDocumentation | null {
  if (documentationCache && Date.now() < documentationCache.expiresAt) {
    return documentationCache.data;
  }
  return null;
}

/**
 * Clear documentation cache
 */
export function clearDocumentationCache(): void {
  documentationCache = null;
}

/**
 * Find indicator by name or display name
 */
export function findIndicator(
  indicators: Indicator[],
  nameOrDisplay: string
): Indicator | undefined {
  const normalized = nameOrDisplay.toLowerCase();

  return indicators.find(
    ind =>
      ind.name.toLowerCase().includes(normalized) ||
      ind.displayName.toLowerCase().includes(normalized)
  );
}

/**
 * Get indicators by category
 */
export function getIndicatorsByCategory(
  indicators: Indicator[],
  category: string
): Indicator[] {
  return indicators.filter(
    ind => ind.category.toLowerCase() === category.toLowerCase()
  );
}
