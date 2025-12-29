/**
 * User Module
 *
 * Handles user authentication and JWT validation.
 * Designed to integrate with Laravel User Service microservice.
 *
 * @see .docs/jwt-authentication.md for JWT payload documentation
 */

// Services
export { JWTService } from './services/jwt.service';
export { UserRateLimitService } from './services/user-rate-limit.service';

// Types - JWT payload and verification result
export type {
  JWTPayload,
  JWTVerifyResult,
  JWTUserContext,
  PlanType,
  SubscriptionStatus,
} from './services/jwt.service';

// Types - Rate limiting
export type {
  RateLimitResult,
  RateLimitInfo,
} from './services/user-rate-limit.service';

// Future exports (to be added when implementing full user management)
// export * from './interfaces/user.interface';
// export * from './services/quota.service';
// export * from './domain/user';
