/**
 * Dependency Injection Container
 *
 * Simple DI container for managing service dependencies
 */

type Factory<T> = (container: DIContainer) => T;

interface ServiceRegistration<T> {
  factory: Factory<T>;
  singleton: boolean;
  instance?: T;
}

export class DIContainer {
  private services = new Map<symbol, ServiceRegistration<any>>();

  /**
   * Register a service with the container
   */
  register<T>(token: symbol, factory: Factory<T>, singleton: boolean = false): void {
    this.services.set(token, {
      factory,
      singleton,
    });
  }

  /**
   * Register a singleton service (only one instance will be created)
   */
  registerSingleton<T>(token: symbol, factory: Factory<T>): void {
    this.register(token, factory, true);
  }

  /**
   * Register a transient service (new instance created on each resolve)
   */
  registerTransient<T>(token: symbol, factory: Factory<T>): void {
    this.register(token, factory, false);
  }

  /**
   * Resolve a service from the container
   */
  resolve<T>(token: symbol): T {
    const registration = this.services.get(token);

    if (!registration) {
      throw new Error(`Service not registered: ${token.toString()}`);
    }

    // Return existing singleton instance if available
    if (registration.singleton && registration.instance) {
      return registration.instance;
    }

    // Create new instance
    const instance = registration.factory(this);

    // Cache singleton instance
    if (registration.singleton) {
      registration.instance = instance;
    }

    return instance;
  }

  /**
   * Check if a service is registered
   */
  has(token: symbol): boolean {
    return this.services.has(token);
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.services.clear();
  }

  /**
   * Get all registered service tokens
   */
  getRegisteredTokens(): symbol[] {
    return Array.from(this.services.keys());
  }
}
