/**
 * Common DTOs
 *
 * Shared data transfer objects used across multiple endpoints.
 */

import { z } from 'zod';

/**
 * Pagination Query Parameters
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * Pagination Metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Search Query Parameters
 */
export const SearchQuerySchema = z.object({
  search: z.string().optional(),
  forceRefresh: z.coerce.boolean().default(false),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

/**
 * Plan Level
 */
export const PlanLevelSchema = z.enum([
  'BASIC',
  'PRO',
  'MEGA',
  'ULTRA',
  'ENTERPRISE',
]);

export type PlanLevel = z.infer<typeof PlanLevelSchema>;

/**
 * Health Check Response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  timestamp: string;
  uptime: number;
  services: {
    api: 'up' | 'down';
    chartImgApi: 'up' | 'down' | 'degraded';
  };
}

/**
 * Exchange Response
 */
export interface Exchange {
  id: string;
  name: string;
  type: 'crypto' | 'stock' | 'forex' | 'futures';
  description?: string;
}

/**
 * Symbol Response
 */
export interface Symbol {
  symbol: string;
  fullSymbol: string;
  description: string;
  type: 'crypto' | 'stock' | 'forex' | 'futures';
}
