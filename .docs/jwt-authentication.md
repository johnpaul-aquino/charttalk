# JWT Authentication for Microservices

This document explains how to use JWT tokens issued by the User Service for authentication across microservices.

---

## Important: Sanctum vs JWT

**This application uses TWO authentication methods:**

| Token Type | Endpoint | Use Case | Validation |
|------------|----------|----------|------------|
| **Sanctum** | `POST /api/v1/auth/login` | Frontend → User Service API | Database lookup |
| **JWT** | `POST /api/v1/auth/token/jwt` | Frontend → SaaS App (microservices) | Public key (no HTTP call) |

### When to use which?

- **Sanctum tokens**: For calling the User Service API (subscriptions, profile, invoices, etc.)
- **JWT tokens**: For calling other microservices (SaaS App) that need to verify the user

### Why both?

- **Sanctum** is revocable (stored in database) - good for your main API
- **JWT** is stateless (validated with public key) - good for microservices (faster, no HTTP call needed)

---

## Overview

The User Service issues JWT tokens that can be validated locally by other services without making HTTP requests. This improves performance and reduces latency.

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Frontend   │     │  User Service   │     │   SaaS App      │
│  (Web/App)  │     │   (Laravel)     │     │  (Node.js)      │
└──────┬──────┘     └────────┬────────┘     └────────┬────────┘
       │                     │                       │
       │ 1. Login (Sanctum)  │                       │
       │────────────────────>│                       │
       │ <───────────────────│                       │
       │   (Sanctum token)   │                       │
       │                     │                       │
       │ 2. Get JWT token    │                       │
       │────────────────────>│                       │
       │ <───────────────────│                       │
       │   (JWT token)       │                       │
       │                     │                       │
       │ 3. Use Sanctum for User Service             │
       │────────────────────>│                       │
       │ <───────────────────│                       │
       │                     │                       │
       │ 4. Use JWT for SaaS App                     │
       │────────────────────────────────────────────>│
       │                     │                       │
       │                     │  5. Validate JWT      │
       │                     │     (using public key)│
       │                     │     NO HTTP CALL!     │
       │                     │                       │
       │ <───────────────────────────────────────────│
       │   (Response)        │                       │
```

---

## Endpoints

### Generate JWT Token (Email/Password Users Only)

```
POST /api/v1/auth/token/jwt
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "userpassword"
}
```

**Response:**
```json
{
  "success": true,
  "message": "JWT token generated successfully.",
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "expires_at": "2025-11-27T12:00:00+00:00"
  }
}
```

### Exchange Sanctum Token for JWT (Recommended - All Users)

This endpoint works for ALL authentication methods (Google OAuth, OTP, email/password).
Simply exchange your valid Sanctum token for a JWT token.

```
POST /api/v1/auth/token/jwt/exchange
Authorization: Bearer {sanctum_token}
```

No request body required - just include the Sanctum token in the Authorization header.

**Response:**
```json
{
  "success": true,
  "message": "JWT token generated successfully.",
  "data": {
    "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "expires_at": "2025-11-28T12:00:00+00:00"
  }
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| 401 | `{"message": "Unauthenticated."}` - Missing/invalid Sanctum token |
| 403 | `{"success": false, "message": "Your account has been suspended."}` - User inactive |

### Get Public Key

```
GET /api/v1/auth/jwt/public-key
```

**Response:**
```json
{
  "success": true,
  "data": {
    "public_key": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBg...\n-----END PUBLIC KEY-----",
    "algorithm": "RS256"
  }
}
```

---

## JWT Payload Structure

```json
{
  "sub": "1",
  "email": "user@example.com",
  "name": "John Doe",
  "plan": "pro",
  "plan_name": "Pro",
  "subscription_status": "active",
  "iat": 1732708800,
  "exp": 1732712400,
  "iss": "laravel-user-service"
}
```

| Claim | Type | Description |
|-------|------|-------------|
| `sub` | string | User ID |
| `email` | string | User's email address |
| `name` | string\|null | User's name |
| `plan` | string\|null | Plan key: `free`, `pro`, `max`, or `null` |
| `plan_name` | string\|null | Human-readable plan name |
| `subscription_status` | string\|null | `active`, `trialing`, `past_due`, `canceled`, or `null` |
| `iat` | number | Issued at (Unix timestamp) |
| `exp` | number | Expiration (Unix timestamp) |
| `iss` | string | Issuer identifier |

---

## Frontend Integration (TypeScript/JavaScript)

### 1. Complete Auth Flow - Get Both Tokens

```typescript
// Types
interface SanctumLoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;  // Sanctum token
  };
}

interface JwtTokenResponse {
  success: boolean;
  message: string;
  data: {
    token: string;  // JWT token
    token_type: string;
    expires_in: number;
    expires_at: string;
  };
}

// Auth Service
class AuthService {
  private sanctumToken: string | null = null;
  private jwtToken: string | null = null;
  private jwtExpiresAt: string | null = null;

  // Step 1: Login with Sanctum (for User Service API)
  async login(email: string, password: string): Promise<User> {
    const response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data: SanctumLoginResponse = await response.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    this.sanctumToken = data.data.token;
    localStorage.setItem('sanctum_token', this.sanctumToken);

    // Step 2: Also get JWT token (for SaaS App)
    await this.fetchJwtToken(email, password);

    return data.data.user;
  }

  // Get JWT token for microservices
  private async fetchJwtToken(email: string, password: string): Promise<void> {
    const response = await fetch('/api/v1/auth/token/jwt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data: JwtTokenResponse = await response.json();

    if (data.success) {
      this.jwtToken = data.data.token;
      this.jwtExpiresAt = data.data.expires_at;
      localStorage.setItem('jwt_token', this.jwtToken);
      localStorage.setItem('jwt_expires_at', this.jwtExpiresAt);
    }
  }

  // Get Sanctum token for User Service calls
  getSanctumToken(): string | null {
    return this.sanctumToken || localStorage.getItem('sanctum_token');
  }

  // Get JWT token for SaaS App calls
  getJwtToken(): string | null {
    return this.jwtToken || localStorage.getItem('jwt_token');
  }
}

const authService = new AuthService();
```

### 2. Using Both Tokens

```typescript
// API client for User Service (uses Sanctum)
async function callUserServiceApi(endpoint: string, options: RequestInit = {}) {
  const token = authService.getSanctumToken();

  return fetch(`https://user-service.example.com/api/v1${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// API client for SaaS App (uses JWT)
async function callSaasApi(endpoint: string, options: RequestInit = {}) {
  const token = authService.getJwtToken();

  return fetch(`https://saas-app.example.com/api${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

// Usage examples
async function example() {
  // Login - gets both tokens
  await authService.login('user@example.com', 'password');

  // Call User Service (Sanctum token)
  const subscription = await callUserServiceApi('/subscriptions');
  const profile = await callUserServiceApi('/user/profile');

  // Call SaaS App (JWT token)
  const charts = await callSaasApi('/charts');
  const reports = await callSaasApi('/reports');
}
```

### 3. JWT Token Refresh Strategy

```typescript
function isJwtExpired(): boolean {
  const expiresAt = localStorage.getItem('jwt_expires_at');
  if (!expiresAt) return true;

  // Refresh 5 minutes before expiry
  const bufferMs = 5 * 60 * 1000;
  return new Date(expiresAt).getTime() - bufferMs < Date.now();
}

async function ensureValidJwtToken(email: string, password: string): Promise<string> {
  if (isJwtExpired()) {
    // Re-fetch JWT token
    await authService.fetchJwtToken(email, password);
  }
  return authService.getJwtToken()!;
}
```

---

## SaaS App Integration (Node.js)

### 1. Install Dependencies

```bash
npm install jsonwebtoken
# or
yarn add jsonwebtoken
```

### 2. Fetch and Cache Public Key

```typescript
import jwt from 'jsonwebtoken';

let cachedPublicKey: string | null = null;
let cachedAlgorithm: string = 'RS256';

async function getPublicKey(): Promise<string> {
  if (cachedPublicKey) {
    return cachedPublicKey;
  }

  const response = await fetch('https://user-service.example.com/api/v1/auth/jwt/public-key');
  const data = await response.json();

  if (!data.success) {
    throw new Error('Failed to fetch public key');
  }

  cachedPublicKey = data.data.public_key;
  cachedAlgorithm = data.data.algorithm;

  return cachedPublicKey;
}
```

### 3. Validate JWT Token

```typescript
interface JwtPayload {
  sub: string;
  email: string;
  name: string | null;
  plan: 'free' | 'pro' | 'max' | null;
  plan_name: string | null;
  subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled' | null;
  iat: number;
  exp: number;
  iss: string;
}

async function validateToken(token: string): Promise<JwtPayload> {
  const publicKey = await getPublicKey();

  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: [cachedAlgorithm as jwt.Algorithm],
      issuer: 'laravel-user-service',
    }) as JwtPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}
```

### 4. Express Middleware Example

```typescript
import { Request, Response, NextFunction } from 'express';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.substring(7);

  try {
    const payload = await validateToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: (error as Error).message });
  }
}

// Usage
app.get('/api/protected', authMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({
    message: 'Hello!',
    user: req.user,
  });
});
```

### 5. Check Subscription Access

```typescript
function requirePlan(allowedPlans: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userPlan = req.user?.plan;

    if (!userPlan || !allowedPlans.includes(userPlan)) {
      return res.status(403).json({
        error: 'Upgrade required',
        required_plans: allowedPlans,
        current_plan: userPlan || 'none',
      });
    }

    next();
  };
}

// Usage - require Pro or Max plan
app.get('/api/premium-feature',
  authMiddleware,
  requirePlan(['pro', 'max']),
  (req, res) => {
    res.json({ data: 'Premium content' });
  }
);
```

---

## Python Integration

```python
import jwt
import requests
from functools import lru_cache

@lru_cache(maxsize=1)
def get_public_key():
    response = requests.get('https://user-service.example.com/api/v1/auth/jwt/public-key')
    data = response.json()
    return data['data']['public_key'], data['data']['algorithm']

def validate_token(token: str) -> dict:
    public_key, algorithm = get_public_key()

    try:
        payload = jwt.decode(
            token,
            public_key,
            algorithms=[algorithm],
            issuer='laravel-user-service'
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise Exception('Token has expired')
    except jwt.InvalidTokenError:
        raise Exception('Invalid token')

# Flask example
from flask import request, g

@app.before_request
def authenticate():
    auth_header = request.headers.get('Authorization', '')

    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        try:
            g.user = validate_token(token)
        except Exception as e:
            return {'error': str(e)}, 401
```

---

## Security Best Practices

1. **Cache the public key** - Fetch once at startup or cache for a reasonable duration
2. **Always verify the issuer** - Check `iss` claim matches `laravel-user-service`
3. **Check expiration** - The library handles this, but be aware of clock skew
4. **Use HTTPS** - Always use HTTPS in production
5. **Don't store sensitive data** - JWT payload is readable (not encrypted)
6. **Handle token refresh** - Implement refresh logic before expiration

---

## Token Lifetime

- **Default TTL:** 3600 seconds (1 hour)
- **Configurable via:** `JWT_TTL` environment variable on User Service

---

## Error Handling

| HTTP Status | Meaning |
|-------------|---------|
| 401 | Invalid credentials or unverified email |
| 403 | Account suspended |
| 422 | Validation error (missing email/password) |
| 429 | Rate limited (5 requests/minute) |

---

## Testing

You can test JWT validation with this curl command:

```bash
# Get a JWT token
curl -X POST https://user-service.example.com/api/v1/auth/token/jwt \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'

# Decode JWT (for debugging - don't do this in production)
# Use https://jwt.io to inspect the token
```

---

## Quick Reference

### Token Summary

| | Sanctum | JWT |
|---|---------|-----|
| **Endpoint** | `POST /api/v1/auth/login` | `POST /api/v1/auth/token/jwt/exchange` |
| **Use for** | User Service API | SaaS App / Microservices |
| **Validation** | Database lookup | Public key (no HTTP) |
| **Revocable** | Yes | No (expires naturally) |
| **Contains user data** | No (just token ID) | Yes (user, plan, email) |
| **Default TTL** | No expiry | 1 hour |

### Frontend Checklist

1. Login (OAuth, OTP, or email/password) → Get Sanctum token
2. Call `/api/v1/auth/token/jwt/exchange` → Get JWT token (uses Sanctum token in header)
3. Store both tokens (Zustand store with localStorage persistence)
4. Use Sanctum token for User Service API calls
5. Use JWT token for ChartTalk REST API calls
6. Refresh JWT before it expires (5 minutes buffer)

### SaaS App Checklist

1. Fetch public key from `/api/v1/auth/jwt/public-key` (cache it)
2. Validate incoming JWT with public key
3. Check `iss` claim equals `laravel-user-service`
4. Extract user info from JWT payload (`sub`, `email`, `plan`)
5. Use `plan` claim to check feature access

---

**Last Updated:** November 28, 2025
