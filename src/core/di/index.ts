/**
 * Dependency Injection Module
 *
 * Main entry point for DI container initialization and exports
 */

import { DIContainer } from './container';
import { registerProviders } from './providers';

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
