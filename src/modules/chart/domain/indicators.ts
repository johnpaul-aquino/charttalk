/**
 * Indicator Type Definitions
 *
 * Defines TypeScript types for all indicator-related data structures
 */

export type IndicatorInputType = 'number' | 'source' | 'boolean' | 'string';
export type IndicatorCategory = 'Trend' | 'Momentum' | 'Volatility' | 'Volume' | 'Support/Resistance' | 'Advanced';

/**
 * Input parameter for an indicator
 */
export interface IndicatorInput {
  /** Parameter name in API (e.g., "in_0", "in_1") */
  param: string;

  /** Human-readable parameter name (e.g., "length", "stdDev") */
  name: string;

  /** Data type of the parameter */
  type: IndicatorInputType;

  /** Default value for this parameter */
  default: number | string | boolean;

  /** Minimum allowed value (for number type) */
  min?: number;

  /** Maximum allowed value (for number type) */
  max?: number;

  /** Available options (for string/source type) */
  options?: string[];

  /** Description of what this parameter does */
  description: string;
}

/**
 * Complete indicator definition
 */
export interface Indicator {
  /** Unique identifier for the indicator (kebab-case) */
  id: string;

  /** Display name of the indicator */
  name: string;

  /** Category this indicator belongs to */
  category: IndicatorCategory;

  /** Input parameters for this indicator */
  inputs: IndicatorInput[];

  /** Keywords for searching/matching the indicator */
  keywords: string[];

  /** Whether this indicator has been tested with the API */
  tested: boolean;

  /** Additional notes about usage or parameters */
  notes?: string;
}

/**
 * Progress tracking for batch additions
 */
export interface ProgressBatch {
  /** Batch number (1, 2, 3, etc.) */
  batchNumber: number;

  /** Number of indicators in this batch */
  count: number;

  /** Range of indicators in this batch */
  range: string;

  /** Whether this batch is completed */
  completed: boolean;

  /** Date this batch was added */
  dateAdded: string;
}

/**
 * Progress tracking information
 */
export interface IndicatorsProgress {
  /** Total number of indicators to be added eventually */
  total: number;

  /** Number of indicators already added */
  added: number;

  /** Number of indicators still to be added */
  remaining: number;

  /** List of completed batches */
  batches: ProgressBatch[];
}

/**
 * Complete indicators database
 */
export interface IndicatorsDatabase {
  /** Database version */
  version: string;

  /** Last update date */
  lastUpdated: string;

  /** Total number of indicators available in the system */
  totalCount: number;

  /** Number of indicators currently in the database */
  addedCount: number;

  /** Array of all indicators */
  indicators: Indicator[];

  /** Progress tracking */
  progress: IndicatorsProgress;
}

/**
 * Helper type for indicator search results
 */
export interface IndicatorSearchResult {
  indicator: Indicator;
  matchType: 'name' | 'keyword' | 'category' | 'id';
  confidence: number; // 0-1 score
}
