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
