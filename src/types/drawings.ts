/**
 * TradingView Chart Drawings Type Definitions
 * Mirrors the structure of indicators.ts for consistency
 */

/**
 * Drawing parameter definition
 */
export interface DrawingParameter {
  param: string;
  name: string;
  type: 'number' | 'string' | 'object';
  required?: boolean;
  default?: any;
  min?: number;
  max?: number;
  description: string;
  unit?: 'price' | 'index' | 'time' | string;
}

/**
 * Drawing override (styling) definition
 */
export interface DrawingOverride {
  param: string;
  name: string;
  type: 'number' | 'string' | 'boolean';
  default?: any;
  min?: number;
  max?: number;
  description: string;
}

/**
 * Drawing example payload
 */
export interface DrawingExample {
  name: string;
  input: Record<string, any>;
  override?: Record<string, any>;
}

/**
 * Complete drawing type definition
 */
export interface Drawing {
  id: string;
  name: string;
  type: string;
  category: 'Lines' | 'Orders' | 'Positions' | 'Shapes' | 'Advanced';
  description: string;
  inputs: DrawingParameter[];
  overrides: DrawingOverride[];
  keywords: string[];
  tested: boolean;
  notes?: string;
  example?: DrawingExample;
}

/**
 * Drawing configuration for API request
 */
export interface DrawingConfig {
  name: string;
  input: Record<string, any>;
  override?: Record<string, any>;
  zOrder?: number;
}

/**
 * Parsed drawing from natural language
 */
export interface ParsedDrawing {
  drawing: Drawing;
  confidence: number;
  matchedKeywords: string[];
}

/**
 * Batch progress tracking
 */
export interface DrawingBatch {
  batchNumber: number;
  count: number;
  range: string;
  completed: boolean;
  dateAdded: string;
}

/**
 * Progress tracking
 */
export interface DrawingProgress {
  total: number;
  added: number;
  remaining: number;
  batches: DrawingBatch[];
}

/**
 * Complete drawings database
 */
export interface DrawingsDatabase {
  version: string;
  lastUpdated: string;
  totalCount: number;
  addedCount: number;
  drawings: Drawing[];
  progress: DrawingProgress;
}
