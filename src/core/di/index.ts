/**
 * Dependency Injection Module
 *
 * Main entry point for DI container initialization and exports
 */

import { DIContainer } from './container';
import { registerProviders } from './providers';
import * as tokens from './tokens';

// Import types for convenience functions
import type { ChatController } from '../../api/controllers/chat.controller';
import type { ConversationService } from '../../modules/conversation/services/conversation.service';
import type { ClaudeProvider } from '../../modules/analysis/providers/claude.provider';

// Export tokens for external use
export * from './tokens';

// Export container class
export { DIContainer } from './container';

// Create and initialize global container instance
const container = new DIContainer();
registerProviders(container);

// Export initialized container
export { container };

/**
 * Get service from container (convenience function)
 */
export function getService<T>(token: symbol): T {
  return container.resolve<T>(token);
}

// ============================================================
// Convenience functions for commonly used services
// ============================================================

/**
 * Get ChatController instance
 */
export function getChatController(): ChatController {
  return container.resolve<ChatController>(tokens.CHAT_CONTROLLER);
}

/**
 * Get ConversationService instance
 */
export function getConversationService(): ConversationService {
  return container.resolve<ConversationService>(tokens.CONVERSATION_SERVICE);
}

/**
 * Get ClaudeProvider instance
 */
export function getClaudeProvider(): ClaudeProvider {
  return container.resolve<ClaudeProvider>(tokens.CLAUDE_PROVIDER);
}
