/**
 * Dependency Injection Tokens
 *
 * Symbol-based tokens for service identification in the DI container
 */

// Chart Module Services
export const CHART_CONFIG_SERVICE = Symbol('CHART_CONFIG_SERVICE');
export const CHART_VALIDATION_SERVICE = Symbol('CHART_VALIDATION_SERVICE');
export const CHART_GENERATION_SERVICE = Symbol('CHART_GENERATION_SERVICE');

// Chart Module Repositories
export const INDICATORS_REPOSITORY = Symbol('INDICATORS_REPOSITORY');
export const DRAWINGS_REPOSITORY = Symbol('DRAWINGS_REPOSITORY');

// Storage Module Services
export const CHART_STORAGE_SERVICE = Symbol('CHART_STORAGE_SERVICE');
export const DOWNLOAD_SERVICE = Symbol('DOWNLOAD_SERVICE');

// Core Services
export const CHART_IMG_CLIENT = Symbol('CHART_IMG_CLIENT');
