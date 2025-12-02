# ChartTalk.ai Chat API Architecture

## Overview

This document outlines the REST API architecture for ChartTalk.ai's **Chart Service** - a microservice responsible for conversational chart generation and analysis. The API supports real-time chat interactions, chart generation from natural language, and AI-powered analysis.

---

## Claude Opus 4.5 Integration (NEW)

The chat API is now powered by **Claude Opus 4.5** (`claude-opus-4-5-20251101`), Anthropic's most capable model. Claude acts as the AI "brain" that interprets natural language, orchestrates tool calls, and generates conversational responses - similar to how MCP works with Claude Desktop/Code.

### Key Components

| Component | Location | Description |
|-----------|----------|-------------|
| **Claude Provider** | `src/modules/analysis/providers/claude.provider.ts` | Anthropic SDK integration with streaming support |
| **Conversation Service** | `src/modules/conversation/services/conversation.service.ts` | Main orchestration - message handling, tool execution |
| **Context Manager** | `src/modules/conversation/services/context-manager.service.ts` | System prompts, history management, token limits |
| **SSE Middleware** | `src/api/middleware/sse.middleware.ts` | Server-Sent Events for real-time streaming |
| **Chat Controller** | `src/api/controllers/chat.controller.ts` | HTTP request handling |
| **Chat DTOs** | `src/api/dto/chat.dto.ts` | Request/response validation with Zod |

### API Endpoints

```
POST /api/v1/chat/messages          # Non-streaming response
POST /api/v1/chat/messages/stream   # SSE streaming response
```

### Request Format

```json
{
  "message": "Show me Bitcoin with RSI for the last 7 days",
  "userId": "user-uuid",
  "conversationId": "optional-conversation-uuid",
  "conversationHistory": [
    { "role": "user", "content": "previous message" },
    { "role": "assistant", "content": "previous response" }
  ]
}
```

### Response Format (Non-streaming)

```json
{
  "success": true,
  "data": {
    "message": {
      "id": "msg-uuid",
      "role": "assistant",
      "content": "I'll generate a Bitcoin chart with RSI...",
      "chartId": "chart-uuid",
      "createdAt": "2025-11-27T10:00:00.000Z"
    },
    "conversationId": "conv-uuid",
    "chart": {
      "imageUrl": "https://...",
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "s3Url": "https://s3..."
    },
    "analysis": null
  }
}
```

### SSE Event Types

```
event: start
data: {"messageId": "msg-uuid"}

event: chunk
data: {"text": "I'll generate a Bitcoin chart..."}

event: tool_use
data: {"tool": "generate_chart", "input": {...}}

event: chart_complete
data: {"imageUrl": "...", "symbol": "BINANCE:BTCUSDT"}

event: analysis_complete
data: {"trend": "bullish", "recommendation": "LONG", "confidence": 0.78}

event: complete
data: {"message": {...}, "chart": {...}, "analysis": {...}}

event: error
data: {"code": "CONVERSATION_ERROR", "message": "..."}
```

### Claude Tool Definitions

Claude has access to two internal tools:

**1. `generate_chart`**
```typescript
{
  name: "generate_chart",
  description: "Generate a TradingView chart with technical indicators",
  input_schema: {
    symbol: string,      // e.g., "BINANCE:BTCUSDT"
    interval: string,    // e.g., "4h", "1D"
    range: string,       // e.g., "1M", "3M"
    indicators: string[], // e.g., ["RSI", "MACD"]
    theme: "light" | "dark"
  }
}
```

**2. `analyze_chart`**
```typescript
{
  name: "analyze_chart",
  description: "Perform AI analysis on a chart",
  input_schema: {
    chartId: string,
    tradingStyle: "day_trading" | "swing_trading" | "scalping"
  }
}
```

### Environment Configuration

```bash
# Required for chat functionality
ANTHROPIC_API_KEY=your-anthropic-api-key

# Optional
CLAUDE_MODEL=claude-opus-4-5-20251101  # Default
CLAUDE_MAX_TOKENS=4096                  # Default
CLAUDE_TEMPERATURE=0.7                  # Default
CLAUDE_TIMEOUT=60000                    # 60 seconds
```

### Architecture Flow

```
User Request
    ↓
ChatController.parseRequest() → Validate with Zod
    ↓
ConversationService.sendMessage()
    ↓
ContextManagerService.buildConversationHistory()
    ↓
ClaudeProvider.sendMessage() → Claude Opus 4.5
    ↓
Claude returns tool_use (generate_chart)
    ↓
ConversationService.executeToolCall()
    ↓
ChartConfigService.constructFromNaturalLanguage()
    ↓
ChartGenerationService.generateChart()
    ↓
Claude.continueWithToolResult() → Final response
    ↓
Response to client (JSON or SSE stream)
```

### Cost Considerations

- **Input**: $5 per 1M tokens
- **Output**: $25 per 1M tokens
- **Typical chat**: ~2,000 input + ~1,000 output tokens = ~$0.04/conversation turn

### Rate Limiting

Chat endpoints have stricter rate limits:
- **Capacity**: 10 requests burst
- **Refill**: 2 requests per second

---

## Microservices Architecture

ChartTalk.ai uses a microservices architecture with clear separation of concerns:

### Services

1. **User Service** (Separate Microservice - Not in this project)
   - Authentication (OTP, Google OAuth)
   - User profiles and settings
   - Subscription management
   - Quota tracking and enforcement
   - **Provides:** `user_id` via JWT token

2. **Chart Service** (This Project)
   - Chat session management
   - Chart generation from natural language
   - AI-powered chart analysis
   - Message history and streaming
   - **Consumes:** `user_id` from JWT token

### Communication Flow

```
Client → User Service → JWT Token (with user_id)
   ↓
Client → Chart Service (with JWT Token)
   ↓
Chart Service extracts user_id from token
   ↓
Chart Service stores chats/messages linked to user_id
```

## Architecture Principles

### 1. **Conversational Flow**
- Each chat session contains multiple messages
- Messages alternate between user and assistant roles
- Charts are embedded within assistant messages
- Analysis results are stored and linked to charts

### 2. **Real-time Responses**
- Server-Sent Events (SSE) for streaming AI responses
- Progressive chart generation updates
- Live typing indicators

### 3. **Resource Hierarchy**
```
User (managed by User Service)
  └── Chat (managed by Chart Service)
       └── Message
            └── Chart
                 └── Analysis
```

### 4. **Security & Authorization**
- JWT-based authentication (tokens issued by User Service)
- User-scoped resources (users can only access their own chats)
- Rate limiting per user and plan tier
- Quota validation via User Service API

---

## Database Schema

### Tables

**Note:** User data is managed by the User Service. This service only stores `user_id` as a UUID reference.

#### 1. `chats`
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Reference to User Service (no FK constraint)
  title VARCHAR(500) NOT NULL, -- Auto-generated from first message
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW(),
  message_count INT DEFAULT 0
);

CREATE INDEX idx_user_chats ON chats(user_id, last_message_at DESC);
CREATE INDEX idx_user_pinned ON chats(user_id, is_pinned, last_message_at DESC);
```

#### 2. `messages`
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' | 'assistant'
  content TEXT NOT NULL, -- User query or AI response text
  chart_id UUID REFERENCES charts(id) ON DELETE SET NULL, -- If message contains chart
  analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL, -- If message contains analysis
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_chat_messages (chat_id, created_at ASC)
);
```

#### 3. `charts`
```sql
CREATE TABLE charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Reference to User Service (no FK constraint)

  -- Chart configuration
  symbol VARCHAR(50) NOT NULL, -- e.g., BINANCE:BTCUSDT
  interval VARCHAR(10) NOT NULL, -- e.g., 4h, 1D
  range VARCHAR(10) NOT NULL, -- e.g., 7D, 1M
  indicators JSONB, -- Array of indicator configs
  drawings JSONB, -- Array of drawing configs

  -- Generated outputs
  image_url TEXT, -- Temporary chart-img.com URL (7 days)
  s3_url TEXT, -- Permanent S3 URL
  s3_key TEXT, -- S3 object key

  -- Metadata
  config JSONB NOT NULL, -- Full chart config from construct_chart_config
  metadata JSONB, -- Resolution, format, generation time

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_charts ON charts(user_id, created_at DESC);
CREATE INDEX idx_symbol_charts ON charts(symbol, created_at DESC);
```

#### 4. `analyses`
```sql
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Reference to User Service (no FK constraint)

  -- Analysis results
  trend VARCHAR(20), -- bullish, bearish, neutral
  recommendation VARCHAR(20), -- LONG, SHORT, NEUTRAL
  confidence DECIMAL(3,2), -- 0.00 to 1.00

  -- Price levels
  entry_price DECIMAL(20,8),
  stop_loss DECIMAL(20,8),
  take_profit DECIMAL(20,8),
  risk_reward_ratio DECIMAL(10,2),

  -- Analysis content
  analysis_text TEXT NOT NULL,
  signals JSONB, -- Array of detected signals
  key_levels JSONB, -- Support/resistance levels

  -- Trading signal
  trading_signal JSONB, -- Complete signal object

  -- AI metadata
  model VARCHAR(50), -- e.g., gpt-4o-mini
  tokens_used INT,
  processing_time INT, -- milliseconds

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chart_analyses ON analyses(chart_id, created_at DESC);
CREATE INDEX idx_user_analyses ON analyses(user_id, created_at DESC);
```

#### 5. `shared_charts`
```sql
CREATE TABLE shared_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Reference to User Service (no FK constraint)
  share_token VARCHAR(50) UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_share_token ON shared_charts(share_token);
```

**Tables Managed by User Service** (Not in this database):
- `users` - User profiles, email, plan
- `user_quotas` - Daily chart/analysis limits
- `otp_codes` - OTP authentication codes
- `sessions` - JWT session management

---

## REST API Endpoints

### Base URL
```
Development: http://localhost:3010/api/v1
Production: https://api.charttalk.ai/v1
```

### Authentication Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**JWT Token Structure** (issued by User Service):
```json
{
  "userId": "uuid-here",
  "email": "user@example.com",
  "plan": "PRO",
  "iat": 1700000000,
  "exp": 1700086400
}
```

---

## 1. User Service Integration

**Note:** Authentication endpoints (`/auth/send-otp`, `/auth/google/redirect`, etc.) are handled by the **User Service** (separate microservice). This Chart Service receives the JWT token from the client and validates it.

### 1.1 JWT Token Validation

Every request to the Chart Service must include a valid JWT token in the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The Chart Service will:
1. Verify JWT signature using shared secret (or public key if using RSA)
2. Extract `userId` from token payload
3. Use `userId` for all database operations

### 1.2 User Service API (External Calls)

The Chart Service will call the User Service API for:

#### Get User Details
```http
GET https://user-service.charttalk.ai/api/v1/users/:userId
Authorization: Bearer <service_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "plan": "PRO"
  }
}
```

#### Check Quota
```http
POST https://user-service.charttalk.ai/api/v1/quotas/check
Authorization: Bearer <service_token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "action": "chart" // or "analysis"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "quota": {
      "limit": 500,
      "used": 47,
      "remaining": 453,
      "resetsAt": "2025-11-24T00:00:00.000Z"
    }
  }
}
```

**If quota exceeded:**
```json
{
  "success": false,
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Daily chart limit reached",
    "quota": {
      "limit": 500,
      "used": 500,
      "remaining": 0,
      "resetsAt": "2025-11-24T00:00:00.000Z"
    }
  }
}
```

#### Increment Quota Usage
```http
POST https://user-service.charttalk.ai/api/v1/quotas/increment
Authorization: Bearer <service_token>
Content-Type: application/json

{
  "userId": "user-uuid",
  "action": "chart", // or "analysis"
  "amount": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "used": 48,
    "remaining": 452
  }
}
```

---

## 2. Chart Service Endpoints

**Note:** All authentication endpoints (OTP, Google OAuth, logout, etc.) are handled by the **User Service**. The Chart Service only validates JWT tokens issued by the User Service.

### Authentication Endpoints (User Service)
These endpoints are NOT implemented in this Chart Service:
- `POST /api/v1/auth/send-otp` - Send OTP to email
- `POST /api/v1/auth/verify-otp` - Verify OTP and get JWT token
- `GET /api/v1/auth/google/redirect` - Google OAuth flow
- `POST /api/v1/auth/google/callback` - Google OAuth callback
- `POST /api/v1/auth/logout` - Logout current session
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/me` - Update user profile

**For authentication documentation, refer to the User Service API documentation.**

---

## 3. Chat Endpoints (`/api/v1/chats`)

### 3.1 List Chats (with Pagination)
```http
GET /api/v1/chats?limit=20&offset=0&archived=false
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `limit` (optional, default: 20, max: 100) - Number of chats to return
- `offset` (optional, default: 0) - Pagination offset
- `archived` (optional, default: false) - Include archived chats

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "chat-uuid-1",
      "title": "Bitcoin RSI Analysis",
      "messageCount": 8,
      "lastMessageAt": "2025-11-23T09:30:00.000Z",
      "isPinned": false,
      "isArchived": false,
      "createdAt": "2025-11-23T08:00:00.000Z",
      "preview": {
        "lastMessage": "I'll generate a Bitcoin chart with RSI indicator...",
        "lastChart": {
          "symbol": "BINANCE:BTCUSDT",
          "interval": "4h",
          "thumbnailUrl": "https://..."
        }
      }
    },
    {
      "id": "chat-uuid-2",
      "title": "Ethereum MACD Setup",
      "messageCount": 5,
      "lastMessageAt": "2025-11-23T05:15:00.000Z",
      "isPinned": true,
      "isArchived": false,
      "createdAt": "2025-11-22T14:00:00.000Z",
      "preview": {
        "lastMessage": "Can you show ETH with MACD indicator?",
        "lastChart": null
      }
    }
  ],
  "meta": {
    "total": 47,
    "limit": 20,
    "offset": 0,
    "hasMore": true,
    "timestamp": "2025-11-23T10:00:00.000Z"
  }
}
```

**Business Logic:**
1. Extract user_id from JWT token
2. Query `chats` table filtered by user_id
3. Order by `is_pinned DESC, last_message_at DESC`
4. Apply pagination (limit, offset)
5. For each chat, fetch:
   - Message count
   - Last message preview (first 100 chars)
   - Last chart thumbnail (if exists)
6. Group by date ranges (TODAY, YESTERDAY, LAST 7 DAYS) on client side

---

### 3.2 Create New Chat
```http
POST /api/v1/chats
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "title": "New Trading Analysis",
  "initialMessage": "Show me Bitcoin chart with RSI for the last 7 days"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "chat-uuid-new",
    "title": "New Trading Analysis",
    "messageCount": 0,
    "isPinned": false,
    "isArchived": false,
    "createdAt": "2025-11-23T10:00:00.000Z",
    "lastMessageAt": "2025-11-23T10:00:00.000Z"
  }
}
```

**Business Logic:**
1. Extract user_id from JWT token
2. Create new chat in `chats` table
3. If `initialMessage` provided:
   - Create first message in `messages` table
   - Trigger AI response processing (async)
   - Update chat title from AI response (if title is generic)
4. Return chat object

**Title Auto-Generation:**
If title not provided, generate from first user message:
- "Show me Bitcoin with RSI" → "Bitcoin RSI Analysis"
- "Analyze Ethereum MACD" → "Ethereum MACD Analysis"
- Use first 3-5 words, capitalize properly

---

### 2.3 Get Chat by ID
```http
GET /api/v1/chats/:chatId
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "chat-uuid-1",
    "title": "Bitcoin RSI Analysis",
    "messageCount": 8,
    "isPinned": false,
    "isArchived": false,
    "createdAt": "2025-11-23T08:00:00.000Z",
    "updatedAt": "2025-11-23T09:30:00.000Z",
    "lastMessageAt": "2025-11-23T09:30:00.000Z"
  }
}
```

**Business Logic:**
1. Extract user_id from JWT token
2. Fetch chat by ID from `chats` table
3. Verify chat belongs to user (user_id match)
4. Return 404 if not found or unauthorized

---

### 2.4 Update Chat
```http
PATCH /api/v1/chats/:chatId
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "isPinned": true,
  "isArchived": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "chat-uuid-1",
    "title": "Updated Title",
    "isPinned": true,
    "isArchived": false,
    "updatedAt": "2025-11-23T10:05:00.000Z"
  }
}
```

**Business Logic:**
1. Extract user_id from JWT token
2. Verify chat ownership
3. Update allowed fields in `chats` table
4. Update `updated_at` timestamp
5. Return updated chat

---

### 2.5 Delete Chat
```http
DELETE /api/v1/chats/:chatId
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Chat deleted successfully",
    "deletedChatId": "chat-uuid-1",
    "messagesDeleted": 8,
    "chartsDeleted": 3
  }
}
```

**Business Logic:**
1. Extract user_id from JWT token
2. Verify chat ownership
3. CASCADE delete will automatically remove:
   - All messages in chat
   - All charts linked to messages
   - All analyses linked to charts
4. Return deletion summary

---

## 3. Message Endpoints (`/api/v1/messages`)

### 3.1 Get Messages for Chat
```http
GET /api/v1/chats/:chatId/messages?limit=50&before=message-uuid
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `limit` (optional, default: 50, max: 100) - Number of messages to return
- `before` (optional) - Message ID for cursor-based pagination (load older messages)
- `after` (optional) - Message ID for cursor-based pagination (load newer messages)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "msg-uuid-1",
      "chatId": "chat-uuid-1",
      "role": "user",
      "content": "Show me Bitcoin chart with RSI for the last 7 days",
      "chart": null,
      "analysis": null,
      "createdAt": "2025-11-23T09:00:00.000Z"
    },
    {
      "id": "msg-uuid-2",
      "chatId": "chat-uuid-1",
      "role": "assistant",
      "content": "I'll generate a Bitcoin chart with RSI indicator for the last 7 days. One moment...",
      "chart": {
        "id": "chart-uuid-1",
        "symbol": "BINANCE:BTCUSDT",
        "interval": "4h",
        "range": "7D",
        "indicators": [
          {
            "name": "RSI",
            "inputs": { "period": 14 }
          }
        ],
        "imageUrl": "https://r2.chart-img.com/...",
        "s3Url": "https://s3.amazonaws.com/...",
        "thumbnailUrl": "https://...",
        "config": { /* full chart config */ }
      },
      "analysis": null,
      "createdAt": "2025-11-23T09:00:15.000Z"
    },
    {
      "id": "msg-uuid-3",
      "chatId": "chat-uuid-1",
      "role": "user",
      "content": "Analyze this chart and give me trading signals",
      "chart": null,
      "analysis": null,
      "createdAt": "2025-11-23T09:05:00.000Z"
    },
    {
      "id": "msg-uuid-4",
      "chatId": "chat-uuid-1",
      "role": "assistant",
      "content": "Based on the chart analysis, I've identified a high-probability LONG setup:\n\n**Entry:** $96,100\n**Stop Loss:** $95,500\n**Take Profit:** $99,500\n**Risk/Reward:** 5.67:1\n**Confidence:** 78%\n\nThe chart shows bullish RSI divergence with price bouncing off the $96K support level...",
      "chart": null,
      "analysis": {
        "id": "analysis-uuid-1",
        "trend": "bullish",
        "recommendation": "LONG",
        "confidence": 0.78,
        "entryPrice": 96100,
        "stopLoss": 95500,
        "takeProfit": 99500,
        "riskRewardRatio": 5.67,
        "signals": [
          "Bullish RSI divergence detected",
          "Price bouncing off major support",
          "Volume confirmation on recent candles"
        ],
        "keyLevels": {
          "support": [96000, 94000],
          "resistance": [99500, 102000]
        }
      },
      "createdAt": "2025-11-23T09:05:30.000Z"
    }
  ],
  "meta": {
    "total": 8,
    "limit": 50,
    "hasMore": false,
    "cursor": {
      "before": null,
      "after": "msg-uuid-4"
    },
    "timestamp": "2025-11-23T10:00:00.000Z"
  }
}
```

**Business Logic:**
1. Extract user_id from JWT token
2. Verify chat ownership
3. Query `messages` table filtered by chat_id
4. Order by `created_at ASC` (oldest first)
5. Apply cursor-based pagination:
   - If `before` provided: fetch messages created before that message
   - If `after` provided: fetch messages created after that message
6. For each message:
   - If message has chart_id, JOIN with `charts` table
   - If message has analysis_id, JOIN with `analyses` table
7. Return messages with embedded chart/analysis data

---

### 3.2 Send Message (User to AI)
```http
POST /api/v1/chats/:chatId/messages
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "content": "Show me Bitcoin chart with RSI for the last 7 days"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userMessage": {
      "id": "msg-uuid-user",
      "chatId": "chat-uuid-1",
      "role": "user",
      "content": "Show me Bitcoin chart with RSI for the last 7 days",
      "createdAt": "2025-11-23T10:00:00.000Z"
    },
    "assistantMessage": {
      "id": "msg-uuid-assistant",
      "chatId": "chat-uuid-1",
      "role": "assistant",
      "content": "",
      "status": "processing",
      "streamUrl": "/api/v1/stream/chats/chat-uuid-1/messages/msg-uuid-assistant",
      "createdAt": "2025-11-23T10:00:01.000Z"
    }
  }
}
```

**Business Logic:**
1. Extract user_id from JWT token
2. Verify chat ownership
3. Check user quota (charts/analyses per day)
4. Create user message in `messages` table
5. Create placeholder assistant message with `status: "processing"`
6. Trigger async AI processing pipeline:
   - Parse user intent (chart generation, analysis, general query)
   - If chart generation:
     - Call `construct_chart_config` service
     - Call `validate_chart_config` service
     - Call `generate_chart_image` service
     - Save chart to `charts` table
     - Link chart to assistant message
   - If analysis request:
     - Get chart from previous message or chart ID
     - Call `analyze_chart` service
     - Save analysis to `analyses` table
     - Link analysis to assistant message
   - Generate AI response text
   - Stream response via SSE to client
7. Update chat's `last_message_at` timestamp
8. Increment user quota usage
9. Return user message + assistant message with stream URL

**AI Processing Pipeline:**
```
User Message
    ↓
Intent Classification (chart generation | analysis | general query)
    ↓
┌─────────────────┬──────────────────┬────────────────┐
│ Chart Generation│    Analysis      │  General Query │
├─────────────────┼──────────────────┼────────────────┤
│ Construct Config│ Get Chart        │ Generate       │
│ Validate Config │ Analyze Chart    │ Response       │
│ Generate Chart  │ Parse Signals    │                │
│ Save to DB      │ Save Analysis    │                │
└─────────────────┴──────────────────┴────────────────┘
    ↓
Generate AI Response Text
    ↓
Stream via SSE to Client
    ↓
Update Assistant Message in DB
```

---

### 3.3 Stream Assistant Response (SSE)
```http
GET /api/v1/stream/chats/:chatId/messages/:messageId
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
Accept: text/event-stream
```

**Response (Server-Sent Events):**
```
event: start
data: {"messageId":"msg-uuid-assistant","status":"processing"}

event: chunk
data: {"text":"I'll generate a Bitcoin chart with RSI indicator"}

event: chunk
data: {"text":" for the last 7 days. One moment..."}

event: chart_processing
data: {"status":"constructing_config"}

event: chart_processing
data: {"status":"validating_config"}

event: chart_processing
data: {"status":"generating_image","progress":50}

event: chart_complete
data: {"chartId":"chart-uuid-1","imageUrl":"https://...","thumbnailUrl":"https://..."}

event: chunk
data: {"text":"\n\nHere's your Bitcoin chart with RSI indicator:"}

event: complete
data: {"messageId":"msg-uuid-assistant","status":"completed","finalContent":"I'll generate a Bitcoin chart with RSI indicator for the last 7 days. One moment...\n\nHere's your Bitcoin chart with RSI indicator:"}

event: close
data: {}
```

**Business Logic:**
1. Extract user_id from JWT token
2. Verify chat ownership and message exists
3. Establish SSE connection
4. Stream AI processing events in real-time:
   - `start` - Processing started
   - `chunk` - Text chunks (streamed token by token from AI)
   - `chart_processing` - Chart generation status updates
   - `chart_complete` - Chart generation finished (with URLs)
   - `analysis_processing` - Analysis status updates
   - `analysis_complete` - Analysis finished (with results)
   - `complete` - Processing finished
   - `error` - Error occurred
   - `close` - Stream closed
5. Update message in database when complete
6. Close SSE connection

**Error Handling:**
```
event: error
data: {"code":"QUOTA_EXCEEDED","message":"Daily chart limit reached (500/500)","retryIn":3600}
```

---

### 3.4 Delete Message
```http
DELETE /api/v1/messages/:messageId
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Message deleted successfully",
    "deletedMessageId": "msg-uuid-1",
    "chartDeleted": true,
    "analysisDeleted": false
  }
}
```

**Business Logic:**
1. Extract user_id from JWT token
2. Fetch message and verify ownership (via chat → user)
3. CASCADE delete will remove linked charts/analyses
4. Decrement chat's `message_count`
5. If deleting last message, update chat's `last_message_at`

---

## 4. Chart Endpoints (`/api/v1/charts`)

### 4.1 Get Chart by ID
```http
GET /api/v1/charts/:chartId
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "chart-uuid-1",
    "messageId": "msg-uuid-2",
    "symbol": "BINANCE:BTCUSDT",
    "interval": "4h",
    "range": "7D",
    "indicators": [
      {
        "name": "RSI",
        "inputs": { "period": 14 },
        "panel": 1
      }
    ],
    "drawings": [],
    "imageUrl": "https://r2.chart-img.com/...",
    "s3Url": "https://s3.amazonaws.com/...",
    "thumbnailUrl": "https://...",
    "config": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "range": "1M",
      "theme": "dark",
      "width": 1200,
      "height": 675
    },
    "metadata": {
      "format": "PNG",
      "resolution": "1200x675",
      "generatedAt": "2025-11-23T09:00:15.000Z"
    },
    "createdAt": "2025-11-23T09:00:15.000Z"
  }
}
```

**Business Logic:**
1. Extract user_id from JWT token
2. Fetch chart by ID
3. Verify ownership (chart.user_id matches)
4. Return full chart data

---

### 4.2 Download Chart
```http
GET /api/v1/charts/:chartId/download
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
Binary image data (PNG/JPEG) with headers:
```http
Content-Type: image/png
Content-Disposition: attachment; filename="BTCUSDT-4h-20251123.png"
Content-Length: 245678
```

**Business Logic:**
1. Extract user_id from JWT token
2. Verify chart ownership
3. Fetch image from S3 URL (permanent storage)
4. Stream binary data to client
5. Set appropriate headers for download

---

### 4.3 Share Chart (Generate Public Link)
```http
POST /api/v1/charts/:chartId/share
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "expiresIn": 86400
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "shareUrl": "https://charttalk.ai/share/abc123xyz",
    "shortUrl": "https://charttalk.ai/s/abc123",
    "expiresAt": "2025-11-24T10:00:00.000Z",
    "viewCount": 0
  }
}
```

**Business Logic:**
1. Extract user_id from JWT token
2. Verify chart ownership
3. Generate unique share token (short, URL-safe)
4. Create entry in `shared_charts` table:
   ```sql
   CREATE TABLE shared_charts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     share_token VARCHAR(50) UNIQUE NOT NULL,
     expires_at TIMESTAMP,
     view_count INT DEFAULT 0,
     created_at TIMESTAMP DEFAULT NOW()
   );
   ```
5. Return share URL

---

### 4.4 View Shared Chart (Public, No Auth)
```http
GET /share/:shareToken
```

**No authentication required**

**Response:**
```json
{
  "success": true,
  "data": {
    "chart": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "range": "7D",
      "imageUrl": "https://s3.amazonaws.com/...",
      "indicators": ["RSI"],
      "createdAt": "2025-11-23T09:00:15.000Z"
    },
    "sharedBy": "John Doe",
    "expiresAt": "2025-11-24T10:00:00.000Z"
  }
}
```

**Business Logic:**
1. Fetch shared chart by token
2. Check expiration
3. Increment view_count
4. Return chart data (sanitized, no user_id exposed)

---

## 5. Analysis Endpoints (`/api/v1/analysis`)

### 5.1 Get Analysis by ID
```http
GET /api/v1/analysis/:analysisId
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "analysis-uuid-1",
    "chartId": "chart-uuid-1",
    "trend": "bullish",
    "recommendation": "LONG",
    "confidence": 0.78,
    "entryPrice": 96100,
    "stopLoss": 95500,
    "takeProfit": 99500,
    "riskRewardRatio": 5.67,
    "analysisText": "Based on the chart analysis, I've identified a high-probability LONG setup...",
    "signals": [
      "Bullish RSI divergence detected",
      "Price bouncing off major support",
      "Volume confirmation on recent candles"
    ],
    "keyLevels": {
      "support": [96000, 94000],
      "resistance": [99500, 102000]
    },
    "tradingSignal": {
      "type": "LONG",
      "symbol": "BINANCE:BTCUSDT",
      "entryPrice": 96100,
      "stopLoss": 95500,
      "takeProfit": 99500,
      "confidence": 0.78,
      "reasoning": "Strong support confluence at $96K with bullish RSI divergence"
    },
    "model": "gpt-4o-mini",
    "tokensUsed": 1847,
    "processingTime": 3241,
    "createdAt": "2025-11-23T09:05:30.000Z"
  }
}
```

**Business Logic:**
1. Extract user_id from JWT token
2. Fetch analysis by ID
3. Verify ownership (analysis.user_id matches)
4. Return full analysis data

---

## 6. User Endpoints (`/api/v1/users`)

### 6.1 Get Current User
```http
GET /api/v1/users/me
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatar": "https://...",
    "plan": "PRO",
    "createdAt": "2025-01-15T10:00:00.000Z",
    "lastLoginAt": "2025-11-23T08:00:00.000Z"
  }
}
```

---

### 6.2 Update User Profile
```http
PATCH /api/v1/users/me
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "name": "John Smith",
  "avatar": "https://..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid",
    "email": "user@example.com",
    "name": "John Smith",
    "avatar": "https://...",
    "plan": "PRO",
    "updatedAt": "2025-11-23T10:00:00.000Z"
  }
}
```

---

### 6.3 Get Usage/Quota
```http
GET /api/v1/users/me/usage
```

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "plan": "PRO",
    "quota": {
      "chartsPerDay": 500,
      "chartsUsedToday": 47,
      "chartsRemaining": 453,
      "analysesPerDay": 100,
      "analysesUsedToday": 12,
      "analysesRemaining": 88,
      "resetsAt": "2025-11-24T00:00:00.000Z",
      "resetsIn": 50400
    },
    "usage": {
      "totalChatsCreated": 23,
      "totalMessagesExchanged": 187,
      "totalChartsGenerated": 456,
      "totalAnalysesRun": 89,
      "storageUsed": "2.4 GB",
      "memberSince": "2025-01-15T10:00:00.000Z"
    }
  }
}
```

**Business Logic:**
1. Extract user_id from JWT token
2. Fetch user quota from `user_quotas` table
3. Check if quota needs reset (daily at midnight UTC)
4. If reset needed:
   - Set `charts_used_today = 0`
   - Set `analyses_used_today = 0`
   - Update `last_reset_at`
5. Calculate remaining quota
6. Fetch usage statistics (aggregations from other tables)
7. Return quota + usage data

---

## 7. Existing Endpoints (Already Implemented)

These endpoints already exist in the current codebase and should be integrated:

### 7.1 Construct Chart Config
```http
POST /api/v1/charts/construct
```

**Request Body:**
```json
{
  "naturalLanguage": "Show me Bitcoin with RSI for the last 7 days",
  "preferences": {
    "theme": "dark",
    "resolution": "1200x800"
  }
}
```

**Usage in Chat Flow:**
Called internally when user sends chart generation request.

---

### 7.2 Validate Chart Config
```http
POST /api/v1/charts/validate
```

**Request Body:**
```json
{
  "config": { /* chart config */ },
  "planLevel": "PRO"
}
```

**Usage in Chat Flow:**
Called internally before chart generation to ensure config is valid for user's plan.

---

### 7.3 Generate Chart Image
```http
POST /api/v1/charts/generate
```

**Request Body:**
```json
{
  "config": { /* chart config */ },
  "storage": false,
  "saveToFile": true,
  "uploadToS3": true,
  "format": "png"
}
```

**Usage in Chat Flow:**
Called internally to generate chart image and save to S3.

---

### 7.4 Analyze Chart
```http
POST /api/v1/analysis/chart
```

**Request Body:**
```json
{
  "imageUrl": "https://s3.amazonaws.com/...",
  "symbol": "BINANCE:BTCUSDT",
  "interval": "4h",
  "tradingStyle": "swing_trading",
  "generateSignal": true
}
```

**Usage in Chat Flow:**
Called internally when user requests chart analysis.

---

## 8. Middleware Architecture

### Middleware Stack

All endpoints use composable middleware:

```typescript
export const POST = pipe(
  withCors,
  withAuth,              // JWT authentication
  withQuotaCheck,        // Check user quota
  withRateLimit,         // Rate limiting
  withErrorHandler       // Error handling
)(handler);
```

### 8.1 Authentication Middleware (`withAuth`)

```typescript
async function withAuth(req: Request, next: Function) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return unauthorizedResponse('Missing authentication token');
  }

  try {
    // Verify JWT signature
    const payload = verifyJWT(token);

    // Check if session exists and not expired
    const session = await db.sessions.findOne({
      token_hash: hashToken(token),
      expires_at: { $gt: new Date() }
    });

    if (!session) {
      return unauthorizedResponse('Invalid or expired session');
    }

    // Attach user to request context
    req.context.user = {
      id: payload.userId,
      email: payload.email,
      plan: payload.plan
    };

    // Update last activity
    await db.sessions.updateOne(
      { id: session.id },
      { last_activity_at: new Date() }
    );

    return next(req);
  } catch (error) {
    return unauthorizedResponse('Invalid token');
  }
}
```

---

### 8.2 Quota Check Middleware (`withQuotaCheck`)

```typescript
async function withQuotaCheck(req: Request, next: Function) {
  const userId = req.context.user.id;
  const action = req.context.action; // 'chart' | 'analysis'

  // Fetch user quota
  let quota = await db.user_quotas.findOne({ user_id: userId });

  if (!quota) {
    // Create default quota based on plan
    quota = await createDefaultQuota(userId, req.context.user.plan);
  }

  // Check if quota needs daily reset (midnight UTC)
  const now = new Date();
  const lastReset = new Date(quota.last_reset_at);
  if (now.getUTCDate() !== lastReset.getUTCDate()) {
    await db.user_quotas.updateOne(
      { user_id: userId },
      {
        charts_used_today: 0,
        analyses_used_today: 0,
        last_reset_at: now
      }
    );
    quota.charts_used_today = 0;
    quota.analyses_used_today = 0;
  }

  // Check quota limits
  if (action === 'chart' && quota.charts_used_today >= quota.charts_per_day) {
    return quotaExceededResponse('Daily chart limit reached', {
      limit: quota.charts_per_day,
      used: quota.charts_used_today,
      resetsAt: getNextMidnightUTC()
    });
  }

  if (action === 'analysis' && quota.analyses_used_today >= quota.analyses_per_day) {
    return quotaExceededResponse('Daily analysis limit reached', {
      limit: quota.analyses_per_day,
      used: quota.analyses_used_today,
      resetsAt: getNextMidnightUTC()
    });
  }

  // Attach quota to request context
  req.context.quota = quota;

  return next(req);
}
```

---

### 8.3 Rate Limiting Middleware (`withRateLimit`)

```typescript
// Use Redis for distributed rate limiting (production)
// Use in-memory for development (already implemented)

async function withRateLimit(req: Request, next: Function) {
  const userId = req.context.user.id;
  const endpoint = req.context.endpoint;

  // Different limits per endpoint type
  const limits = {
    'chat.send_message': { capacity: 20, refillRate: 5 },   // 20 burst, 5/sec
    'chart.generate': { capacity: 10, refillRate: 2 },      // 10 burst, 2/sec
    'analysis.analyze': { capacity: 5, refillRate: 1 }      // 5 burst, 1/sec
  };

  const limit = limits[endpoint] || { capacity: 100, refillRate: 10 };

  // Check rate limit (Redis or in-memory)
  const allowed = await rateLimiter.check(userId, endpoint, limit);

  if (!allowed.success) {
    return rateLimitResponse('Too many requests', {
      limit: limit.capacity,
      remaining: 0,
      resetAt: allowed.resetAt
    });
  }

  // Add rate limit headers
  req.context.rateLimitHeaders = {
    'X-RateLimit-Limit': limit.capacity,
    'X-RateLimit-Remaining': allowed.remaining,
    'X-RateLimit-Reset': allowed.resetAt.toISOString()
  };

  return next(req);
}
```

---

## 9. WebSocket/SSE Architecture

### Server-Sent Events (SSE) - Recommended

**Why SSE over WebSocket:**
- ✅ Simpler implementation (HTTP-based)
- ✅ Automatic reconnection
- ✅ Works through HTTP proxies/load balancers
- ✅ No need for bidirectional communication (AI → Client only)
- ✅ Built-in event types and IDs

**SSE Implementation:**

```typescript
// /api/v1/stream/chats/:chatId/messages/:messageId/route.ts
export async function GET(req: Request) {
  const { chatId, messageId } = req.params;
  const userId = req.context.user.id;

  // Verify ownership
  const message = await db.messages.findOne({
    id: messageId,
    chat_id: chatId
  });

  const chat = await db.chats.findOne({
    id: chatId,
    user_id: userId
  });

  if (!chat || !message) {
    return notFoundResponse();
  }

  // Create SSE stream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const sendEvent = (event: string, data: any) => {
        const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(message));
      };

      try {
        // Send start event
        sendEvent('start', { messageId, status: 'processing' });

        // Process AI pipeline
        const userMessage = await db.messages.findOne({
          chat_id: chatId,
          role: 'user',
          created_at: { $lt: message.created_at }
        });

        // Determine intent
        const intent = await classifyIntent(userMessage.content);

        if (intent === 'chart_generation') {
          // Chart generation flow
          sendEvent('chart_processing', { status: 'constructing_config' });

          const config = await constructChartConfig({
            naturalLanguage: userMessage.content
          });

          sendEvent('chart_processing', { status: 'validating_config' });

          const validation = await validateChartConfig({
            config: config.config,
            planLevel: req.context.user.plan
          });

          if (!validation.valid) {
            sendEvent('error', {
              code: 'INVALID_CONFIG',
              message: validation.errors[0]
            });
            return;
          }

          sendEvent('chart_processing', { status: 'generating_image', progress: 0 });

          const chart = await generateChartImage({
            config: config.config,
            storage: false,
            saveToFile: true,
            uploadToS3: true
          });

          // Save chart to DB
          const savedChart = await db.charts.create({
            message_id: messageId,
            user_id: userId,
            symbol: config.config.symbol,
            interval: config.config.interval,
            range: config.config.range,
            config: config.config,
            image_url: chart.imageUrl,
            s3_url: chart.s3Url,
            s3_key: chart.s3Key,
            metadata: chart.metadata
          });

          // Link chart to message
          await db.messages.updateOne(
            { id: messageId },
            { chart_id: savedChart.id }
          );

          sendEvent('chart_complete', {
            chartId: savedChart.id,
            imageUrl: chart.s3Url,
            thumbnailUrl: chart.s3Url
          });

          // Generate AI response text
          const responseText = `I've generated a ${config.config.symbol} chart with ${config.config.indicators?.length || 0} indicators for the ${config.config.range} timeframe.`;

          // Stream text chunks
          for (const chunk of responseText.split(' ')) {
            sendEvent('chunk', { text: chunk + ' ' });
            await sleep(50); // Simulate streaming
          }

          // Update message content
          await db.messages.updateOne(
            { id: messageId },
            { content: responseText }
          );

          sendEvent('complete', {
            messageId,
            status: 'completed',
            finalContent: responseText
          });

          // Increment quota usage
          await db.user_quotas.updateOne(
            { user_id: userId },
            { $inc: { charts_used_today: 1 } }
          );

        } else if (intent === 'analysis') {
          // Analysis flow (similar structure)
          sendEvent('analysis_processing', { status: 'analyzing_chart' });

          // Get chart from previous message
          const chartMessage = await db.messages.findOne({
            chat_id: chatId,
            chart_id: { $ne: null },
            created_at: { $lt: message.created_at }
          }, { sort: { created_at: -1 } });

          if (!chartMessage) {
            sendEvent('error', {
              code: 'NO_CHART_FOUND',
              message: 'No chart found to analyze'
            });
            return;
          }

          const chart = await db.charts.findOne({ id: chartMessage.chart_id });

          const analysis = await analyzeChart({
            imageUrl: chart.s3_url,
            symbol: chart.symbol,
            interval: chart.interval,
            tradingStyle: 'swing_trading',
            generateSignal: true
          });

          // Save analysis to DB
          const savedAnalysis = await db.analyses.create({
            chart_id: chart.id,
            user_id: userId,
            ...analysis.data
          });

          // Link analysis to message
          await db.messages.updateOne(
            { id: messageId },
            { analysis_id: savedAnalysis.id }
          );

          sendEvent('analysis_complete', {
            analysisId: savedAnalysis.id,
            trend: analysis.data.trend,
            recommendation: analysis.data.recommendation,
            confidence: analysis.data.confidence
          });

          // Generate AI response text
          const responseText = analysis.data.analysisText;

          // Stream text chunks
          for (const chunk of responseText.split(' ')) {
            sendEvent('chunk', { text: chunk + ' ' });
            await sleep(30);
          }

          // Update message content
          await db.messages.updateOne(
            { id: messageId },
            { content: responseText }
          );

          sendEvent('complete', {
            messageId,
            status: 'completed',
            finalContent: responseText
          });

          // Increment quota usage
          await db.user_quotas.updateOne(
            { user_id: userId },
            { $inc: { analyses_used_today: 1 } }
          );
        }

        // Close stream
        sendEvent('close', {});
        controller.close();

      } catch (error) {
        sendEvent('error', {
          code: 'INTERNAL_ERROR',
          message: error.message
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}
```

---

## 10. Technology Stack Recommendations

### Backend
- **Framework**: Next.js 14 App Router (already in use)
- **Database**: PostgreSQL (production) or SQLite (development)
  - **ORM**: Prisma or Drizzle ORM
  - **Migrations**: Prisma Migrate or Drizzle Kit
- **Authentication**: JWT (jsonwebtoken library)
- **Email**: SendGrid or AWS SES (for OTP emails)
- **File Storage**: AWS S3 (already implemented)
- **Caching**: Redis (for rate limiting, session storage)
- **Real-time**: Server-Sent Events (SSE)

### Frontend (Assumed)
- **Framework**: Next.js 14 + React
- **State Management**: Zustand or React Context
- **HTTP Client**: Axios (already in use at `/Users/paul/Desktop/projects/charttalk.ai/lib/auth-service.ts`)
- **SSE Client**: EventSource API or custom SSE hook

### DevOps
- **Hosting**: Vercel (Next.js), AWS (database, S3)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (error tracking), Vercel Analytics
- **Logging**: Winston or Pino

---

## 11. Migration Plan

### Phase 1: Database Setup (Week 1)
1. ✅ Choose ORM (Prisma recommended)
2. ✅ Define database schema (tables above)
3. ✅ Create migrations
4. ✅ Seed development data

### Phase 2: Authentication (Week 2)
1. ✅ Implement OTP email flow (`send-otp`, `resend-otp`, `verify-otp`)
2. ✅ Implement Google OAuth flow (`google/redirect`, `google/callback`)
3. ✅ Implement JWT token generation/verification
4. ✅ Implement session management
5. ✅ Implement logout endpoints

### Phase 3: Chat & Message Endpoints (Week 3)
1. ✅ Implement chat CRUD endpoints
2. ✅ Implement message endpoints (list, send, delete)
3. ✅ Implement SSE streaming for AI responses
4. ✅ Integrate existing chart generation services
5. ✅ Integrate existing analysis services

### Phase 4: Quota & User Management (Week 4)
1. ✅ Implement quota checking middleware
2. ✅ Implement quota reset logic (daily at midnight UTC)
3. ✅ Implement user profile endpoints
4. ✅ Implement usage tracking

### Phase 5: Chart Sharing & Advanced Features (Week 5)
1. ✅ Implement chart download endpoint
2. ✅ Implement chart sharing (public links)
3. ✅ Implement chart thumbnail generation
4. ✅ Add pagination to chat list

### Phase 6: Testing & Optimization (Week 6)
1. ✅ Write unit tests for services
2. ✅ Write integration tests for API endpoints
3. ✅ Load testing (rate limiting, concurrent SSE connections)
4. ✅ Security audit (SQL injection, XSS, CSRF)
5. ✅ Performance optimization (database indexes, caching)

### Phase 7: Frontend Integration (Week 7-8)
1. ✅ Update frontend to use new chat endpoints
2. ✅ Implement SSE client for real-time updates
3. ✅ Update UI for chat history sidebar
4. ✅ Implement quota display in UI
5. ✅ End-to-end testing

---

## 12. Security Considerations

### 12.1 Authentication
- ✅ Use HTTPS in production (TLS 1.3)
- ✅ Hash passwords with bcrypt (if adding password auth)
- ✅ Use secure JWT secret (256-bit random key)
- ✅ Short JWT expiration (24 hours)
- ✅ Implement refresh token rotation
- ✅ Store session tokens hashed in database

### 12.2 Authorization
- ✅ Always verify resource ownership (user can only access their own chats)
- ✅ Use user_id from JWT token (never trust client input)
- ✅ Implement role-based access control (RBAC) for admin features

### 12.3 Input Validation
- ✅ Use Zod schemas for all request bodies
- ✅ Sanitize user input (prevent XSS)
- ✅ Validate file uploads (if added)
- ✅ Limit request body size (prevent DoS)

### 12.4 Rate Limiting
- ✅ Implement per-user rate limits
- ✅ Implement per-IP rate limits (prevent DDoS)
- ✅ Use Redis for distributed rate limiting (production)
- ✅ Return proper `429 Too Many Requests` responses

### 12.5 CORS
- ✅ Whitelist specific origins (no `*` in production)
- ✅ Use credentials: true for cookie-based auth (if added)

### 12.6 SQL Injection Prevention
- ✅ Use parameterized queries (ORM handles this)
- ✅ Never concatenate user input into SQL strings

### 12.7 Data Privacy
- ✅ Don't log sensitive data (passwords, tokens, OTP codes)
- ✅ Implement GDPR compliance (user data export/deletion)
- ✅ Encrypt sensitive data at rest (database encryption)

---

## 13. Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    }
  },
  "meta": {
    "timestamp": "2025-11-23T10:00:00.000Z",
    "path": "/api/v1/chats",
    "method": "POST"
  }
}
```

### Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `BAD_REQUEST` | Invalid request body or parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication token |
| 403 | `FORBIDDEN` | User doesn't have permission |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource already exists |
| 422 | `VALIDATION_ERROR` | Request validation failed (Zod) |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 429 | `QUOTA_EXCEEDED` | Daily quota limit reached |
| 500 | `INTERNAL_ERROR` | Server error |
| 503 | `EXTERNAL_API_ERROR` | Third-party API error (chart-img.com, OpenAI) |

---

## 14. Performance Optimization

### 14.1 Database Indexes

```sql
-- Chats
CREATE INDEX idx_user_chats ON chats(user_id, last_message_at DESC);
CREATE INDEX idx_user_pinned ON chats(user_id, is_pinned, last_message_at DESC);

-- Messages
CREATE INDEX idx_chat_messages ON messages(chat_id, created_at ASC);

-- Charts
CREATE INDEX idx_user_charts ON charts(user_id, created_at DESC);
CREATE INDEX idx_symbol_charts ON charts(symbol, created_at DESC);

-- Analyses
CREATE INDEX idx_chart_analyses ON analyses(chart_id, created_at DESC);
CREATE INDEX idx_user_analyses ON analyses(user_id, created_at DESC);

-- Sessions
CREATE INDEX idx_user_sessions ON sessions(user_id, expires_at DESC);
CREATE INDEX idx_token_lookup ON sessions(token_hash);

-- OTP Codes
CREATE INDEX idx_email_otp ON otp_codes(email, verified, expires_at);
```

### 14.2 Caching Strategy

**Redis Cache:**
- User quota (cache for 5 minutes, invalidate on update)
- Chart thumbnails (cache for 24 hours)
- Shared chart links (cache until expiration)

**CDN:**
- S3 chart images (CloudFront distribution)
- Static assets (Vercel Edge Network)

### 14.3 Query Optimization

**Use SELECT specific columns** (not `SELECT *`):
```sql
-- ❌ Bad
SELECT * FROM messages WHERE chat_id = ?;

-- ✅ Good
SELECT id, role, content, created_at FROM messages WHERE chat_id = ?;
```

**Use JOIN instead of N+1 queries**:
```sql
-- Fetch messages with charts in a single query
SELECT
  m.id, m.role, m.content, m.created_at,
  c.id AS chart_id, c.symbol, c.image_url
FROM messages m
LEFT JOIN charts c ON m.chart_id = c.id
WHERE m.chat_id = ?
ORDER BY m.created_at ASC;
```

### 14.4 Pagination

**Cursor-based pagination** (recommended for chat messages):
- More efficient for large datasets
- Consistent results even when data is inserted/deleted
- Use `created_at` + `id` as cursor

**Offset-based pagination** (acceptable for chat list):
- Simpler implementation
- Works well for smaller datasets (< 10,000 chats)

---

## 15. Monitoring & Logging

### 15.1 Application Metrics

Track these metrics:
- Request latency (p50, p95, p99)
- Error rate (5xx errors)
- Rate limit hits
- Quota usage per plan
- SSE connection duration
- Chart generation success rate
- Analysis processing time

### 15.2 Logging

Use structured logging (JSON format):

```typescript
logger.info('Chart generated', {
  userId: user.id,
  chartId: chart.id,
  symbol: chart.symbol,
  interval: chart.interval,
  processingTime: elapsed,
  s3Upload: chart.s3Url ? 'success' : 'failed'
});
```

**Log Levels:**
- `ERROR`: Unhandled exceptions, failed API calls
- `WARN`: Quota exceeded, rate limit hits, validation errors
- `INFO`: Request/response logging, successful operations
- `DEBUG`: Detailed processing steps (development only)

### 15.3 Error Tracking

Use Sentry or similar:
- Capture unhandled exceptions
- Track error frequency by endpoint
- Monitor error trends over time
- Alert on critical errors

---

## 16. Example User Flow

### Complete User Journey: Chart Generation + Analysis

**1. User Login**
```http
POST /api/v1/auth/send-otp
Body: { "email": "user@example.com" }
→ OTP sent to email

POST /api/v1/auth/verify-otp
Body: { "email": "user@example.com", "code": "123456" }
→ Returns JWT token
```

**2. Create New Chat**
```http
POST /api/v1/chats
Headers: Authorization: Bearer <token>
Body: { "initialMessage": "Show me Bitcoin chart with RSI for the last 7 days" }
→ Returns chat object + assistant message with stream URL
```

**3. Stream AI Response (SSE)**
```http
GET /api/v1/stream/chats/chat-uuid/messages/msg-uuid
Headers:
  Authorization: Bearer <token>
  Accept: text/event-stream

→ Receives events:
  event: start
  event: chart_processing (status: constructing_config)
  event: chart_processing (status: generating_image)
  event: chart_complete (imageUrl, chartId)
  event: chunk (text chunks)
  event: complete
```

**4. User Requests Analysis**
```http
POST /api/v1/chats/chat-uuid/messages
Headers: Authorization: Bearer <token>
Body: { "content": "Analyze this chart and give me trading signals" }
→ Returns new message + stream URL
```

**5. Stream Analysis Response**
```http
GET /api/v1/stream/chats/chat-uuid/messages/msg-uuid-2
→ Receives events:
  event: analysis_processing
  event: analysis_complete (trend, recommendation, signals)
  event: chunk (analysis text)
  event: complete
```

**6. Download Chart**
```http
GET /api/v1/charts/chart-uuid/download
Headers: Authorization: Bearer <token>
→ Returns binary PNG image
```

**7. Share Chart**
```http
POST /api/v1/charts/chart-uuid/share
Headers: Authorization: Bearer <token>
Body: { "expiresIn": 86400 }
→ Returns public share URL
```

**8. View Chat History**
```http
GET /api/v1/chats?limit=20
Headers: Authorization: Bearer <token>
→ Returns list of chats with previews
```

---

## 17. Next Steps

### Immediate Actions

1. **Choose Database**: PostgreSQL (recommended) or MySQL
2. **Set up Prisma ORM**: Install, configure, create schema
3. **Create Migrations**: Generate database tables
4. **Implement Auth Endpoints**: Start with OTP flow (highest priority - fixes current frontend error)
5. **Test Auth Flow**: Verify frontend integration works

### Week-by-Week Plan

**Week 1**: Database + Auth
- Set up PostgreSQL database
- Implement all auth endpoints
- Test with frontend integration

**Week 2**: Chat & Message CRUD
- Implement chat endpoints
- Implement message endpoints (without AI processing)
- Test CRUD operations

**Week 3**: AI Integration
- Implement SSE streaming
- Integrate chart generation services
- Integrate analysis services
- Test end-to-end flow

**Week 4**: Quota & Polish
- Implement quota system
- Add rate limiting
- Implement user profile endpoints
- Security audit

**Week 5**: Advanced Features
- Chart sharing
- Chart download
- Chat pagination
- Performance optimization

**Week 6**: Testing & Launch
- Write tests
- Load testing
- Bug fixes
- Production deployment

---

## Appendix A: Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/charttalk

# JWT
JWT_SECRET=your-256-bit-secret-key-here
JWT_EXPIRES_IN=86400  # 24 hours
REFRESH_TOKEN_EXPIRES_IN=604800  # 7 days

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3010/api/v1/auth/google/callback

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@charttalk.ai

# AWS S3 (already configured)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_REGION=us-east-1
AWS_S3_BUCKET=charttalk-charts

# Chart-img.com API (already configured)
CHART_IMG_API_KEY=your-chart-img-api-key
CHART_IMG_PLAN=PRO

# OpenAI (already configured)
OPENAI_API_KEY=your-openai-api-key

# Redis (optional, for rate limiting)
REDIS_URL=redis://localhost:6379

# Application
NODE_ENV=production
API_BASE_URL=https://api.charttalk.ai
FRONTEND_URL=https://charttalk.ai

# Rate Limiting (in-memory fallback)
ENABLE_REDIS_RATE_LIMIT=false  # Set to true when Redis is available
```

---

## Appendix B: Database Schema SQL

Complete PostgreSQL schema:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  google_id VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  avatar_url TEXT,
  plan VARCHAR(50) DEFAULT 'FREE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW(),
  message_count INT DEFAULT 0
);

CREATE INDEX idx_user_chats ON chats(user_id, last_message_at DESC);
CREATE INDEX idx_user_pinned ON chats(user_id, is_pinned, last_message_at DESC);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  chart_id UUID REFERENCES charts(id) ON DELETE SET NULL,
  analysis_id UUID REFERENCES analyses(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chat_messages ON messages(chat_id, created_at ASC);

-- Charts table
CREATE TABLE charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol VARCHAR(50) NOT NULL,
  interval VARCHAR(10) NOT NULL,
  range VARCHAR(10) NOT NULL,
  indicators JSONB,
  drawings JSONB,
  image_url TEXT,
  s3_url TEXT,
  s3_key TEXT,
  config JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_charts ON charts(user_id, created_at DESC);
CREATE INDEX idx_symbol_charts ON charts(symbol, created_at DESC);

-- Analyses table
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trend VARCHAR(20),
  recommendation VARCHAR(20),
  confidence DECIMAL(3,2),
  entry_price DECIMAL(20,8),
  stop_loss DECIMAL(20,8),
  take_profit DECIMAL(20,8),
  risk_reward_ratio DECIMAL(10,2),
  analysis_text TEXT NOT NULL,
  signals JSONB,
  key_levels JSONB,
  trading_signal JSONB,
  model VARCHAR(50),
  tokens_used INT,
  processing_time INT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_chart_analyses ON analyses(chart_id, created_at DESC);
CREATE INDEX idx_user_analyses ON analyses(user_id, created_at DESC);

-- User quotas table
CREATE TABLE user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  charts_per_day INT NOT NULL,
  analyses_per_day INT NOT NULL,
  charts_used_today INT DEFAULT 0,
  analyses_used_today INT DEFAULT 0,
  last_reset_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- OTP codes table
CREATE TABLE otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_otp ON otp_codes(email, verified, expires_at);

-- Sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  device_info JSONB,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_activity_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_sessions ON sessions(user_id, expires_at DESC);
CREATE INDEX idx_token_lookup ON sessions(token_hash);

-- Shared charts table (for public sharing)
CREATE TABLE shared_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chart_id UUID NOT NULL REFERENCES charts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token VARCHAR(50) UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  view_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_share_token ON shared_charts(share_token);
```

---

**End of Documentation**

This architecture document provides a comprehensive plan for building the ChartTalk.ai REST API. It includes:
- ✅ Complete database schema with relationships
- ✅ All API endpoints with request/response examples
- ✅ Authentication & authorization flows
- ✅ Real-time SSE streaming architecture
- ✅ Quota & rate limiting systems
- ✅ Security best practices
- ✅ Performance optimization strategies
- ✅ Migration plan with timeline
- ✅ Example user flows

**Total New Endpoints to Build: 25+**

Priority order:
1. Auth endpoints (fix frontend integration error)
2. Chat CRUD endpoints
3. Message endpoints + SSE streaming
4. Quota & user management
5. Chart sharing & advanced features
