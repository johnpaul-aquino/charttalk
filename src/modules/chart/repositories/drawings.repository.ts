/**
 * Drawings Repository
 *
 * Repository pattern wrapper for drawings database operations
 * Provides clean interface for drawing CRUD operations
 */

import {
  loadDrawingsDatabase,
  searchDrawingsByKeyword,
  detectDrawingsFromText,
  findDrawingByName,
} from '../../../core/database/loaders/drawings.loader';
import type {
  Drawing,
  DrawingsDatabase,
  DrawingConfig,
  ParsedDrawing,
} from '../domain/drawings';

export class DrawingsRepository {
  /**
   * Get all drawings from database
   */
  async findAll(): Promise<DrawingsDatabase> {
    return loadDrawingsDatabase();
  }

  /**
   * Find drawing by exact name
   */
  async findByName(name: string): Promise<Drawing | null> {
    return findDrawingByName(name) || null;
  }

  /**
   * Search drawings with fuzzy matching
   */
  async search(query: string, limit?: number): Promise<ParsedDrawing[]> {
    const results = searchDrawingsByKeyword(query);
    return limit ? results.slice(0, limit) : results;
  }

  /**
   * Detect drawings mentioned in natural language text
   */
  async detectInText(text: string): Promise<ParsedDrawing[]> {
    return detectDrawingsFromText(text);
  }

  /**
   * Get all available drawing types
   */
  async getTypes(): Promise<string[]> {
    const db = await this.findAll();
    return db.drawings.map((drawing) => drawing.name);
  }

  /**
   * Get commonly used drawings
   */
  async getCommon(): Promise<Drawing[]> {
    const db = await this.findAll();
    // Return commonly used drawing types
    const commonNames = [
      'Horizontal Line',
      'Trend Line',
      'Vertical Line',
      'Long Position',
      'Short Position',
      'Order Line',
    ];

    return db.drawings.filter((drawing) => commonNames.includes(drawing.name));
  }

  /**
   * Validate drawing configuration
   */
  validateConfig(drawing: DrawingConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!drawing.name) {
      errors.push('Drawing name is required');
    }

    if (!drawing.input || Object.keys(drawing.input).length === 0) {
      errors.push('Drawing input is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const drawingsRepository = new DrawingsRepository();
