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
export const S3_CLIENT_SERVICE = Symbol('S3_CLIENT_SERVICE');
export const S3_STORAGE_SERVICE = Symbol('S3_STORAGE_SERVICE');

// Analysis Module Services
export const AI_ANALYSIS_SERVICE = Symbol('AI_ANALYSIS_SERVICE');
export const SIGNAL_GENERATION_SERVICE = Symbol('SIGNAL_GENERATION_SERVICE');

// Analysis Module Providers
export const OPENAI_VISION_PROVIDER = Symbol('OPENAI_VISION_PROVIDER');
export const CLAUDE_PROVIDER = Symbol('CLAUDE_PROVIDER');

// Conversation Module Services
export const CONVERSATION_SERVICE = Symbol('CONVERSATION_SERVICE');
export const CONTEXT_MANAGER_SERVICE = Symbol('CONTEXT_MANAGER_SERVICE');
export const CHAT_CONTROLLER = Symbol('CHAT_CONTROLLER');
export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

// User Module Services
export const JWT_SERVICE = Symbol('JWT_SERVICE');

// Database
export const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');

// Core Services
export const CHART_IMG_CLIENT = Symbol('CHART_IMG_CLIENT');
