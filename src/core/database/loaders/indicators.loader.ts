/**
 * Indicators Loader Utility
 *
 * Centralized utility for loading, parsing, and searching the indicators database.
 * Single source of truth for all indicator operations across the MCP server.
 */

import * as fs from 'fs';
import * as path from 'path';
import type {
  Indicator,
  IndicatorsDatabase,
  IndicatorSearchResult,
  IndicatorInput,
} from '../../../modules/chart/domain/indicators';

/**
 * Lazy-loaded indicators database
 */
let cachedDatabase: IndicatorsDatabase | null = null;
let loadError: Error | null = null;

/**
 * Load the indicators database from JSON file
 * Uses caching to avoid repeated file reads
 */
export function loadIndicatorsDatabase(): IndicatorsDatabase {
  if (cachedDatabase) {
    return cachedDatabase;
  }

  if (loadError) {
    throw loadError;
  }

  try {
    // Get database file path - use process.cwd() for Next.js compatibility
    const dbPath = path.join(process.cwd(), 'src/core/database/indicators.json');
    const rawData = fs.readFileSync(dbPath, 'utf-8');
    cachedDatabase = JSON.parse(rawData) as IndicatorsDatabase;
    return cachedDatabase;
  } catch (error) {
    loadError = error as Error;
    throw new Error(
      `Failed to load indicators database at: ${path.join(process.cwd(), 'src/core/database/indicators.json')} - ${(error as Error).message}`
    );
  }
}

/**
 * Get all indicators
 */
export function getAllIndicators(): Indicator[] {
  const db = loadIndicatorsDatabase();
  return db.indicators;
}

/**
 * Find indicator by exact ID
 */
export function findIndicatorById(id: string): Indicator | undefined {
  const db = loadIndicatorsDatabase();
  return db.indicators.find((ind) => ind.id === id);
}

/**
 * Find indicator by name (case-insensitive)
 */
export function findIndicatorByName(name: string): Indicator | undefined {
  const db = loadIndicatorsDatabase();
  const normalized = name.toLowerCase();

  return db.indicators.find(
    (ind) =>
      ind.name.toLowerCase() === normalized ||
      ind.id.toLowerCase() === normalized
  );
}

/**
 * Search indicators by keyword with confidence scoring
 * Returns results sorted by relevance
 */
export function searchIndicatorsByKeyword(
  keyword: string
): IndicatorSearchResult[] {
  const db = loadIndicatorsDatabase();
  const searchTerm = keyword.toLowerCase();
  const results: IndicatorSearchResult[] = [];

  for (const indicator of db.indicators) {
    let confidence = 0;
    let matchType: IndicatorSearchResult['matchType'] = 'keyword';

    // Exact ID match (highest priority)
    if (indicator.id === searchTerm) {
      confidence = 1.0;
      matchType = 'id';
    }
    // Exact name match
    else if (indicator.name.toLowerCase() === searchTerm) {
      confidence = 0.95;
      matchType = 'name';
    }
    // ID contains search term
    else if (indicator.id.includes(searchTerm)) {
      confidence = 0.9;
      matchType = 'id';
    }
    // Name contains search term
    else if (indicator.name.toLowerCase().includes(searchTerm)) {
      confidence = 0.85;
      matchType = 'name';
    }
    // Keyword match (exact)
    else if (indicator.keywords.some((kw) => kw === searchTerm)) {
      confidence = 0.8;
      matchType = 'keyword';
    }
    // Keyword match (partial)
    else if (indicator.keywords.some((kw) => kw.includes(searchTerm))) {
      confidence = 0.7;
      matchType = 'keyword';
    }
    // Category match
    else if (indicator.category.toLowerCase().includes(searchTerm)) {
      confidence = 0.5;
      matchType = 'category';
    }

    if (confidence > 0) {
      results.push({
        indicator,
        matchType,
        confidence,
      });
    }
  }

  // Sort by confidence (highest first), then by tested flag, then by name
  return results.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return b.confidence - a.confidence;
    }
    if (a.indicator.tested !== b.indicator.tested) {
      return a.indicator.tested ? -1 : 1;
    }
    return a.indicator.name.localeCompare(b.indicator.name);
  });
}

/**
 * Get indicators by category
 */
export function getIndicatorsByCategory(category: string): Indicator[] {
  const db = loadIndicatorsDatabase();
  const normalized = category.toLowerCase();

  return db.indicators.filter(
    (ind) => ind.category.toLowerCase() === normalized
  );
}

/**
 * Build study object for chart config from indicator
 * Converts indicator definition to chart-img API format
 */
export function buildStudyFromIndicator(
  indicator: Indicator,
  customInputs?: Record<string, any>
): {
  name: string;
  inputs?: Record<string, any>;
} {
  const inputs: Record<string, any> = {};

  // Build inputs from indicator definition
  for (const inputDef of indicator.inputs) {
    const paramName = inputDef.param;

    // Use custom input if provided, otherwise use default
    if (customInputs && customInputs[inputDef.name] !== undefined) {
      inputs[paramName] = customInputs[inputDef.name];
    } else if (customInputs && customInputs[paramName] !== undefined) {
      inputs[paramName] = customInputs[paramName];
    } else {
      inputs[paramName] = inputDef.default;
    }
  }

  return {
    name: `${indicator.name}@tv-basicstudies`,
    ...(Object.keys(inputs).length > 0 && { inputs }),
  };
}

/**
 * Smart indicator detection from natural language
 * Searches text for indicator keywords and returns matching indicators
 * Prioritizes tested indicators and higher confidence matches
 */
export function detectIndicatorsFromText(
  text: string,
  options?: {
    testedOnly?: boolean;
    limit?: number;
  }
): IndicatorSearchResult[] {
  const searchText = text.toLowerCase();
  const allResults: IndicatorSearchResult[] = [];
  const db = loadIndicatorsDatabase();
  const seenIds = new Set<string>();

  // Search for each indicator's keywords in the text
  for (const indicator of db.indicators) {
    // Skip untested indicators if requested
    if (options?.testedOnly && !indicator.tested) {
      continue;
    }

    // Skip if we've already added this indicator
    if (seenIds.has(indicator.id)) {
      continue;
    }

    let confidence = 0;
    let matchType: IndicatorSearchResult['matchType'] = 'keyword';

    // Check exact name match first (highest priority)
    if (searchText.includes(indicator.name.toLowerCase())) {
      confidence = 0.95;
      matchType = 'name';
    }
    // Check keywords
    else {
      for (const keyword of indicator.keywords) {
        if (searchText.includes(keyword)) {
          confidence = 0.8;
          matchType = 'keyword';
          break;
        }
      }
    }

    // If we found a match, add it
    if (confidence > 0) {
      allResults.push({
        indicator,
        matchType,
        confidence,
      });
      seenIds.add(indicator.id);
    }
  }

  // Sort by confidence
  allResults.sort((a, b) => {
    if (a.confidence !== b.confidence) {
      return b.confidence - a.confidence;
    }
    if (a.indicator.tested !== b.indicator.tested) {
      return a.indicator.tested ? -1 : 1;
    }
    return a.indicator.name.localeCompare(b.indicator.name);
  });

  // Apply limit if specified
  if (options?.limit) {
    return allResults.slice(0, options.limit);
  }

  return allResults;
}

/**
 * Get database statistics
 */
export function getIndicatorsStats(): {
  total: number;
  added: number;
  remaining: number;
  categories: Record<string, number>;
  testedCount: number;
  untestedCount: number;
} {
  const db = loadIndicatorsDatabase();

  const categories: Record<string, number> = {};
  let testedCount = 0;
  let untestedCount = 0;

  for (const indicator of db.indicators) {
    categories[indicator.category] =
      (categories[indicator.category] ?? 0) + 1;

    if (indicator.tested) {
      testedCount++;
    } else {
      untestedCount++;
    }
  }

  return {
    total: db.totalCount,
    added: db.addedCount,
    remaining: db.progress.remaining,
    categories,
    testedCount,
    untestedCount,
  };
}

/**
 * Clear the cached database (useful for testing)
 */
export function clearCache(): void {
  cachedDatabase = null;
  loadError = null;
}

// ============================================================================
// Natural Language Indicator Detection with Parameter Parsing
// ============================================================================

/**
 * Result of finding an indicator in text, includes position for parameter extraction
 */
export interface IndicatorMatchResult {
  indicator: Indicator;
  matchStart: number;
  matchEnd: number;
  matchedKeyword: string;
}

/**
 * ChartStudy interface for return type (matches chart.interface.ts)
 */
export interface ChartStudy {
  name: string;
  input?: Record<string, any>;
  override?: Record<string, any>;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Find indicator match position in text
 * Tries exact name match first, then keywords (sorted by length for best match)
 * Uses word boundary matching to avoid false positives
 */
export function findIndicatorInText(
  text: string,
  indicator: Indicator
): IndicatorMatchResult | null {
  const searchText = text.toLowerCase();

  // Try exact name match first (highest priority)
  const nameLower = indicator.name.toLowerCase();
  const nameIndex = searchText.indexOf(nameLower);
  if (nameIndex !== -1) {
    return {
      indicator,
      matchStart: nameIndex,
      matchEnd: nameIndex + indicator.name.length,
      matchedKeyword: nameLower,
    };
  }

  // Try keywords (sorted by length desc for best/longest match first)
  const sortedKeywords = [...indicator.keywords].sort((a, b) => b.length - a.length);
  for (const keyword of sortedKeywords) {
    // Use word boundary matching to avoid false positives (e.g., "ma" in "format")
    const pattern = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
    const match = pattern.exec(searchText);
    if (match) {
      return {
        indicator,
        matchStart: match.index,
        matchEnd: match.index + match[0].length,
        matchedKeyword: keyword,
      };
    }
  }

  return null;
}

/**
 * Extract parameter values from text following indicator keyword
 *
 * Strategy:
 * 1. Look for numbers immediately following the matched keyword
 * 2. Numbers can be separated by comma, space, or both
 * 3. Map numbers to inputs in order defined in indicator.inputs
 * 4. Stop at sentence boundary or common word boundaries
 * 5. Validate against min/max constraints from database
 */
export function extractIndicatorParams(
  text: string,
  matchEnd: number,
  indicator: Indicator
): Record<string, any> {
  const params: Record<string, any> = {};

  // No inputs defined - return empty
  if (!indicator.inputs || indicator.inputs.length === 0) {
    return params;
  }

  // Extract text after the match (limited window to avoid grabbing unrelated numbers)
  const windowSize = 50; // Look ahead max 50 chars
  const afterMatch = text.substring(matchEnd, matchEnd + windowSize);

  // Find numbers in the window (stop at common boundaries)
  // Note: Only match period followed by space or end (not decimal points like 2.5)
  const boundaryPattern = /(?:\.\s|[!?\n])|(?:\s+(?:with|and|for|the|on|in)\s+)/i;
  const boundaryMatch = boundaryPattern.exec(afterMatch);
  const searchWindow = boundaryMatch
    ? afterMatch.substring(0, boundaryMatch.index)
    : afterMatch;

  // Extract numbers (integers and decimals)
  const numberPattern = /(\d+(?:\.\d+)?)/g;
  const numbers: number[] = [];
  let match;

  while ((match = numberPattern.exec(searchWindow)) !== null) {
    numbers.push(parseFloat(match[1]));
  }

  // Map numbers to inputs in order
  for (let i = 0; i < Math.min(numbers.length, indicator.inputs.length); i++) {
    const inputDef = indicator.inputs[i];
    const value = numbers[i];

    // Validate against min/max if defined
    if (inputDef.type === 'number') {
      if (inputDef.min !== undefined && value < inputDef.min) continue;
      if (inputDef.max !== undefined && value > inputDef.max) continue;
    }

    // Use human-readable name (e.g., "length", "stdDev") as key
    // The chart-img.com API expects these names, not "in_0", "in_1"
    params[inputDef.name] = value;
  }

  return params;
}

/**
 * Check if two ranges overlap
 */
function rangesOverlap(
  start1: number,
  end1: number,
  start2: number,
  end2: number
): boolean {
  return start1 < end2 && start2 < end1;
}

/**
 * Check if a match overlaps with any consumed region
 */
function overlapsConsumedRegion(
  matchStart: number,
  matchEnd: number,
  consumedRegions: Array<{ start: number; end: number }>
): boolean {
  return consumedRegions.some((region) =>
    rangesOverlap(matchStart, matchEnd, region.start, region.end)
  );
}

/**
 * Parse indicators with their parameters from natural language text
 *
 * This is the main function for database-driven indicator detection.
 * It combines detection and parameter extraction into a single pass.
 *
 * Strategy to prevent over-detection:
 * 1. Find ALL potential matches with their positions and keyword lengths
 * 2. Sort by keyword length (longest first) so "ma cross" is prioritized over "ma"
 * 3. Track consumed text regions
 * 4. Only add indicators whose match doesn't overlap with consumed regions
 *
 * @param text - Natural language text to parse
 * @returns Array of ChartStudy objects with extracted parameters
 *
 * @example
 * parseIndicatorsWithParams("show RSI 21 and BB 30, 2.5")
 * // Returns:
 * // [
 * //   { name: "Relative Strength Index", input: { in_0: 21 } },
 * //   { name: "Bollinger Bands", input: { in_0: 30, in_2: 2.5 } }
 * // ]
 */
export function parseIndicatorsWithParams(text: string): ChartStudy[] {
  const searchText = text.toLowerCase();
  const studies: ChartStudy[] = [];
  const addedIndicators = new Map<string, boolean>();
  const consumedRegions: Array<{ start: number; end: number }> = [];

  const db = loadIndicatorsDatabase();

  // Step 1: Find ALL potential matches with their positions
  const allMatches: Array<{
    indicator: Indicator;
    matchResult: IndicatorMatchResult;
  }> = [];

  for (const indicator of db.indicators) {
    const matchResult = findIndicatorInText(searchText, indicator);
    if (matchResult) {
      allMatches.push({ indicator, matchResult });
    }
  }

  // Step 2: Sort by matched keyword length (longest first), then by tested flag
  // This ensures "ma cross" is processed before "ma"
  // And "Relative Strength Index" (tested=true) is preferred over "Connors RSI" (tested=false)
  allMatches.sort((a, b) => {
    const lenA = a.matchResult.matchedKeyword.length;
    const lenB = b.matchResult.matchedKeyword.length;
    if (lenA !== lenB) {
      return lenB - lenA;
    }
    // Secondary: prefer tested indicators
    if (a.indicator.tested !== b.indicator.tested) {
      return a.indicator.tested ? -1 : 1;
    }
    // Tertiary: prefer shorter names (more likely to be "base" indicator)
    return a.indicator.name.length - b.indicator.name.length;
  });

  // Step 3: Process matches, tracking consumed regions
  for (const { indicator, matchResult } of allMatches) {
    // Skip if already added (handle multiple keywords matching same indicator)
    if (addedIndicators.has(indicator.id)) continue;

    // Skip if this match overlaps with an already-consumed region
    if (
      overlapsConsumedRegion(
        matchResult.matchStart,
        matchResult.matchEnd,
        consumedRegions
      )
    ) {
      continue;
    }

    // Extract parameters from text after the match
    const params = extractIndicatorParams(
      searchText,
      matchResult.matchEnd,
      indicator
    );

    // Build study object
    studies.push({
      name: indicator.name,
      input: Object.keys(params).length > 0 ? params : undefined,
    });

    // Mark this indicator as added and consume the text region
    addedIndicators.set(indicator.id, true);
    consumedRegions.push({
      start: matchResult.matchStart,
      end: matchResult.matchEnd,
    });
  }

  return studies;
}
