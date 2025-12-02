/**
 * Conversation Module
 *
 * Exports all conversation-related services, interfaces, and domain models
 * for AI-powered chat with Claude Opus 4.5
 */

// Interfaces
export * from './interfaces/conversation.interface';

// Domain models
export * from './domain/message';
export * from './domain/conversation';

// Repositories
export { ConversationRepository } from './repositories/conversation.repository';

// Services
export { ConversationService } from './services/conversation.service';
export type { ConversationServiceConfig } from './services/conversation.service';
export { ContextManagerService } from './services/context-manager.service';
