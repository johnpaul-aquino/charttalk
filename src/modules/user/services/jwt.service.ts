/**
 * JWT Service
 *
 * Validates JWT tokens using RSA public key.
 * Designed to work with Laravel User Service JWT tokens signed with RSA.
 *
 * JWT Payload from Laravel includes:
 * - sub: User ID
 * - email: User's email
 * - name: User's display name
 * - plan: Subscription plan (free, pro, max)
 * - subscription_status: Subscription state (active, trialing, past_due, canceled)
 */

import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

/**
 * Plan types from Laravel JWT
 */
export type PlanType = 'free' | 'pro' | 'max' | null;

/**
 * Subscription status from Laravel JWT
 */
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | null;

/**
 * JWT payload structure from Laravel User Service
 * @see .docs/jwt-authentication.md
 */
export interface JWTPayload {
  sub: string | number;           // User ID (Laravel may send as int or string)
  email: string;                  // User's email
  name: string | null;            // User's display name
  plan: PlanType;                 // Subscription plan key
  plan_name: string | null;       // Human-readable plan name
  subscription_status: SubscriptionStatus; // Subscription state
  iat: number;                    // Issued at (Unix timestamp)
  exp: number;                    // Expiration (Unix timestamp)
  iss: string;                    // Issuer (laravel-user-service)
}

/**
 * User context extracted from JWT for use in application
 */
export interface JWTUserContext {
  userId: string;
  email: string;
  name: string | null;
  plan: PlanType;
  subscriptionStatus: SubscriptionStatus;
}

/**
 * JWT verification result
 */
export type JWTVerifyResult =
  | { valid: true; user: JWTUserContext; payload: JWTPayload }
  | { valid: false; error: string };

/**
 * JWT Service for validating tokens
 */
export class JWTService {
  private publicKey: string | null = null;
  private algorithm: jwt.Algorithm;
  private issuer?: string;
  private initialized = false;

  constructor() {
    this.algorithm = (process.env.JWT_ALGORITHM as jwt.Algorithm) || 'RS256';
    this.issuer = process.env.JWT_ISSUER;
  }

  /**
   * Initialize the service (lazy load public key)
   */
  private initialize(): void {
    if (this.initialized) return;

    try {
      this.publicKey = this.loadPublicKey();
      this.initialized = true;
    } catch (error) {
      // Allow service to work without key in development
      if (process.env.NODE_ENV === 'development') {
        console.warn('[JWTService] Public key not configured - JWT validation disabled in development');
        this.initialized = true;
      } else {
        throw error;
      }
    }
  }

  /**
   * Load RSA public key from file or environment
   */
  private loadPublicKey(): string {
    // Try file path first
    const keyPath = process.env.JWT_PUBLIC_KEY_PATH;
    if (keyPath) {
      const absolutePath = path.isAbsolute(keyPath)
        ? keyPath
        : path.join(process.cwd(), keyPath);

      if (fs.existsSync(absolutePath)) {
        console.log('[JWTService] Loading public key from:', absolutePath);
        return fs.readFileSync(absolutePath, 'utf-8');
      }
    }

    // Try inline key from environment
    const inlineKey = process.env.JWT_PUBLIC_KEY;
    if (inlineKey) {
      console.log('[JWTService] Loading public key from environment variable');
      // Handle escaped newlines in env var
      return inlineKey.replace(/\\n/g, '\n');
    }

    throw new Error(
      'JWT public key not configured. Set JWT_PUBLIC_KEY_PATH or JWT_PUBLIC_KEY environment variable.'
    );
  }

  /**
   * Verify a JWT token and extract user context
   */
  verify(token: string): JWTVerifyResult {
    this.initialize();

    // Development bypass mode - returns realistic test user
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.AUTH_DEV_BYPASS === 'true'
    ) {
      const devPayload: JWTPayload = {
        sub: 'dev-user-1',
        email: 'dev@example.com',
        name: 'Dev User',
        plan: 'pro',
        plan_name: 'Pro',
        subscription_status: 'active',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        iss: 'laravel-user-service',
      };

      return {
        valid: true,
        user: {
          userId: String(devPayload.sub),
          email: devPayload.email,
          name: devPayload.name,
          plan: devPayload.plan,
          subscriptionStatus: devPayload.subscription_status,
        },
        payload: devPayload,
      };
    }

    // Check if key is available
    if (!this.publicKey) {
      return { valid: false, error: 'JWT public key not configured' };
    }

    try {
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: [this.algorithm],
      };

      // Add issuer verification if configured
      if (this.issuer) {
        verifyOptions.issuer = this.issuer;
      }

      const decoded = jwt.verify(
        token,
        this.publicKey,
        verifyOptions
      ) as JWTPayload;

      // Validate required claims
      if (!decoded.sub) {
        return { valid: false, error: 'Token missing subject (sub) claim' };
      }

      // Extract user context from payload
      // Note: Laravel may send `sub` as integer, convert to string for consistency
      const user: JWTUserContext = {
        userId: String(decoded.sub),
        email: decoded.email,
        name: decoded.name ?? null,
        plan: decoded.plan ?? null,
        subscriptionStatus: decoded.subscription_status ?? null,
      };

      return {
        valid: true,
        user,
        payload: decoded,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token expired' };
      }
      if (error instanceof jwt.NotBeforeError) {
        return { valid: false, error: 'Token not yet valid' };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: `Invalid token: ${error.message}` };
      }
      return { valid: false, error: 'Token verification failed' };
    }
  }

  /**
   * Decode a token without verifying (for debugging)
   */
  decode(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token) as JWTPayload | null;
      return decoded;
    } catch {
      return null;
    }
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    this.initialize();
    return this.publicKey !== null;
  }
}
