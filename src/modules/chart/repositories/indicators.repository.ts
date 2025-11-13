/**
 * Indicators Repository
 *
 * Repository pattern wrapper for indicators database operations
 * Provides clean interface for indicator CRUD operations
 */

import {
  loadIndicatorsDatabase,
  searchIndicatorsByKeyword,
  detectIndicatorsFromText,
  findIndicatorByName,
} from '../../../core/database/loaders/indicators.loader';
import type {
  Indicator,
  IndicatorsDatabase,
  IndicatorSearchResult,
  IndicatorInput,
} from '../domain/indicators';

export class IndicatorsRepository {
  /**
   * Get all indicators from database
   */
  async findAll(): Promise<IndicatorsDatabase> {
    return loadIndicatorsDatabase();
  }

  /**
   * Find indicator by exact name
   */
  async findByName(name: string): Promise<Indicator | undefined> {
    const indicator = findIndicatorByName(name);
    return indicator || undefined;
  }

  /**
   * Search indicators with fuzzy matching
   */
  async search(query: string, limit?: number): Promise<IndicatorSearchResult[]> {
    const results = searchIndicatorsByKeyword(query);
    return limit ? results.slice(0, limit) : results;
  }

  /**
   * Detect indicators mentioned in natural language text
   */
  async detectInText(text: string): Promise<IndicatorSearchResult[]> {
    return detectIndicatorsFromText(text);
  }

  /**
   * Get indicator by category
   */
  async findByCategory(category: string): Promise<Indicator[]> {
    const db = await this.findAll();
    return db.indicators.filter((ind) => ind.category === category);
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    const db = await this.findAll();
    const categories = new Set(db.indicators.map((ind) => ind.category));
    return Array.from(categories);
  }

  /**
   * Get popular/commonly used indicators
   */
  async getPopular(limit = 10): Promise<Indicator[]> {
    const db = await this.findAll();
    // Return first N indicators (assuming they're ordered by popularity)
    return db.indicators.slice(0, limit);
  }
}

// Export singleton instance
export const indicatorsRepository = new IndicatorsRepository();
