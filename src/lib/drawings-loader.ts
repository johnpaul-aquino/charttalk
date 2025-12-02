/**
 * Drawings Database Loader
 * Provides utilities for loading and searching the drawings database
 * Mirrors the indicators-loader pattern for consistency
 */

import fs from 'fs';
import path from 'path';
import type {
  Drawing,
  DrawingsDatabase,
  DrawingConfig,
  ParsedDrawing,
} from '../types/drawings';

let drawingsCache: DrawingsDatabase | null = null;

/**
 * Load the drawings database from JSON file
 * Cached after first load
 */
export function loadDrawingsDatabase(): DrawingsDatabase {
  if (drawingsCache) {
    return drawingsCache;
  }

  try {
    // Resolve path relative to project root - use process.cwd() for Next.js compatibility
    const projectRoot = process.cwd();
    const dbPath = path.join(projectRoot, 'src/data/drawings.json');

    if (!fs.existsSync(dbPath)) {
      console.warn(`[drawings-loader] Database not found at ${dbPath}`);
      return getEmptyDatabase();
    }

    const content = fs.readFileSync(dbPath, 'utf-8');
    drawingsCache = JSON.parse(content) as DrawingsDatabase;

    console.log(
      `[drawings-loader] Loaded ${drawingsCache.drawings.length} drawings from database`
    );
    return drawingsCache;
  } catch (error) {
    console.error('[drawings-loader] Error loading drawings database:', error);
    return getEmptyDatabase();
  }
}

/**
 * Get all drawings
 */
export function getAllDrawings(): Drawing[] {
  const db = loadDrawingsDatabase();
  return db.drawings;
}

/**
 * Find drawing by ID
 */
export function findDrawingById(id: string): Drawing | undefined {
  const db = loadDrawingsDatabase();
  return db.drawings.find((d) => d.id === id);
}

/**
 * Find drawing by name (case-insensitive)
 */
export function findDrawingByName(name: string): Drawing | undefined {
  const db = loadDrawingsDatabase();
  const lowerName = name.toLowerCase();
  return db.drawings.find((d) => d.name.toLowerCase() === lowerName);
}

/**
 * Search drawings by keyword with confidence scoring
 * Returns results sorted by match confidence
 */
export function searchDrawingsByKeyword(
  keyword: string,
  threshold: number = 0.5
): ParsedDrawing[] {
  const db = loadDrawingsDatabase();
  const lowerKeyword = keyword.toLowerCase();
  const results: ParsedDrawing[] = [];

  for (const drawing of db.drawings) {
    const matchedKeywords: string[] = [];
    let matchScore = 0;

    // Check name match
    if (drawing.name.toLowerCase().includes(lowerKeyword)) {
      matchScore += 2;
      matchedKeywords.push(drawing.name);
    }

    // Check keywords
    for (const kw of drawing.keywords) {
      if (kw.toLowerCase().includes(lowerKeyword)) {
        matchScore += 1;
        matchedKeywords.push(kw);
      }
    }

    // Calculate confidence (0-1)
    const confidence = Math.min(matchScore / 3, 1);

    if (confidence >= threshold && matchedKeywords.length > 0) {
      results.push({
        drawing,
        confidence,
        matchedKeywords,
      });
    }
  }

  // Sort by confidence descending
  return results.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Detect drawings from natural language text
 * Uses keyword matching with confidence scoring
 */
export function detectDrawingsFromText(text: string): ParsedDrawing[] {
  const lowerText = text.toLowerCase();
  const detectedDrawings: ParsedDrawing[] = [];
  const db = loadDrawingsDatabase();

  for (const drawing of db.drawings) {
    const matchedKeywords: string[] = [];
    let matchScore = 0;

    // Check exact keyword matches in text
    for (const keyword of drawing.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        matchScore += 1;
        matchedKeywords.push(keyword);
      }
    }

    // Calculate confidence
    const confidence = Math.min(matchScore / drawing.keywords.length, 1);

    if (matchScore > 0) {
      detectedDrawings.push({
        drawing,
        confidence,
        matchedKeywords,
      });
    }
  }

  // Sort by confidence descending
  return detectedDrawings.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get drawings by category
 */
export function getDrawingsByCategory(
  category: 'Lines' | 'Orders' | 'Shapes' | 'Advanced'
): Drawing[] {
  const db = loadDrawingsDatabase();
  return db.drawings.filter((d) => d.category === category);
}

/**
 * Get only tested drawings
 */
export function getTestedDrawings(): Drawing[] {
  const db = loadDrawingsDatabase();
  return db.drawings.filter((d) => d.tested);
}

/**
 * Get only untested drawings
 */
export function getUntestedDrawings(): Drawing[] {
  const db = loadDrawingsDatabase();
  return db.drawings.filter((d) => !d.tested);
}

/**
 * Build a drawing configuration from a Drawing object
 * Converts database format to API format
 */
export function buildDrawingConfig(
  drawing: Drawing,
  customInput?: Record<string, any>,
  customOverrides?: Record<string, any>
): DrawingConfig {
  // Start with example if available
  let inputConfig = drawing.example?.input || {};
  let overrideConfig = drawing.example?.override || {};

  // Apply custom input
  if (customInput) {
    inputConfig = { ...inputConfig, ...customInput };
  }

  // Apply custom overrides
  if (customOverrides) {
    overrideConfig = { ...overrideConfig, ...customOverrides };
  }

  const config: DrawingConfig = {
    name: drawing.name,
    input: inputConfig,
  };

  if (Object.keys(overrideConfig).length > 0) {
    config.override = overrideConfig;
  }

  return config;
}

/**
 * Validate drawing input parameters
 * Returns array of validation errors (empty if valid)
 */
export function validateDrawingInput(
  drawing: Drawing,
  input: Record<string, any>
): string[] {
  const errors: string[] = [];

  for (const param of drawing.inputs) {
    if (param.required && !(param.param in input)) {
      errors.push(
        `Missing required parameter: ${param.param} (${param.name})`
      );
    }

    if (param.param in input) {
      const value = input[param.param];
      const expectedType = param.type;

      // Type checking
      if (
        expectedType === 'number' &&
        typeof value !== 'number'
      ) {
        errors.push(
          `Parameter ${param.param} must be a number, got ${typeof value}`
        );
      }
      if (
        expectedType === 'string' &&
        typeof value !== 'string'
      ) {
        errors.push(
          `Parameter ${param.param} must be a string, got ${typeof value}`
        );
      }

      // Range checking for numbers
      if (expectedType === 'number' && typeof value === 'number') {
        if (param.min !== undefined && value < param.min) {
          errors.push(
            `Parameter ${param.param} must be >= ${param.min}, got ${value}`
          );
        }
        if (param.max !== undefined && value > param.max) {
          errors.push(
            `Parameter ${param.param} must be <= ${param.max}, got ${value}`
          );
        }
      }
    }
  }

  return errors;
}

/**
 * Get database statistics
 */
export function getDrawingsStats() {
  const db = loadDrawingsDatabase();
  const categories = new Map<string, number>();

  for (const drawing of db.drawings) {
    const count = categories.get(drawing.category) || 0;
    categories.set(drawing.category, count + 1);
  }

  return {
    totalDrawings: db.drawings.length,
    testedDrawings: db.drawings.filter((d) => d.tested).length,
    untestedDrawings: db.drawings.filter((d) => !d.tested).length,
    byCategory: Object.fromEntries(categories),
    lastUpdated: db.lastUpdated,
    version: db.version,
  };
}

/**
 * Get empty database (fallback)
 */
function getEmptyDatabase(): DrawingsDatabase {
  return {
    version: '1.0.0',
    lastUpdated: new Date().toISOString().split('T')[0],
    totalCount: 0,
    addedCount: 0,
    drawings: [],
    progress: {
      total: 0,
      added: 0,
      remaining: 0,
      batches: [],
    },
  };
}

/**
 * Clear cache (useful for testing)
 */
export function clearCache(): void {
  drawingsCache = null;
}
