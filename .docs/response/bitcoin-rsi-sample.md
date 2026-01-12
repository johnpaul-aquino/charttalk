# Sample Response: Bitcoin with RSI

This document shows how the AI responds to chart generation requests. Use this for testing, tuning, and frontend development reference.

---

## User Request

```
"Show me Bitcoin with RSI"
```

---

## SSE Streaming Response

**Endpoint**: `POST /api/v1/chat/messages/stream`

The streaming response delivers events in real-time as the AI processes the request.

### Event Sequence

#### 1. Stream Start
```
event: start
data: {"messageId":"msg_a1b2c3d4-e5f6-7890-abcd-ef1234567890"}
```

#### 2. Text Chunks (AI generating response)
```
event: chunk
data: {"text":"I'll"}

event: chunk
data: {"text":" generate"}

event: chunk
data: {"text":" a"}

event: chunk
data: {"text":" Bitcoin"}

event: chunk
data: {"text":" chart"}

event: chunk
data: {"text":" with"}

event: chunk
data: {"text":" RSI"}

event: chunk
data: {"text":" indicator"}

event: chunk
data: {"text":" for"}

event: chunk
data: {"text":" you"}

event: chunk
data: {"text":"."}
```

#### 3. Tool Use (Chart Construction)
```
event: tool_use
data: {
  "tool": "construct_chart_config",
  "input": {
    "naturalLanguage": "Bitcoin with RSI",
    "preferences": {
      "theme": "dark"
    }
  }
}
```

#### 4. Tool Use (Chart Generation)
```
event: tool_use
data: {
  "tool": "generate_chart_image",
  "input": {
    "config": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "range": "1M",
      "theme": "dark",
      "style": "candle",
      "width": 1200,
      "height": 675,
      "studies": [
        {
          "name": "RelativeStrengthIndex@tv-basicstudies",
          "input": {
            "length": 14
          }
        }
      ]
    },
    "storage": true
  }
}
```

#### 5. Chart Complete
```
event: chart_complete
data: {
  "imageUrl": "https://r2.chart-img.com/20260103/tradingview/advanced-chart/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png",
  "symbol": "BINANCE:BTCUSDT",
  "interval": "4h"
}
```

#### 6. More Text Chunks (Analysis)
```
event: chunk
data: {"text":"\n\nHere's"}

event: chunk
data: {"text":" your"}

event: chunk
data: {"text":" Bitcoin"}

event: chunk
data: {"text":" chart"}

event: chunk
data: {"text":" with"}

event: chunk
data: {"text":" RSI"}

event: chunk
data: {"text":"!\n\n"}

event: chunk
data: {"text":"**RSI"}

event: chunk
data: {"text":" Reading"}

event: chunk
data: {"text":" Guide"}

event: chunk
data: {"text":":**\n\n"}

event: chunk
data: {"text":"| Zone | RSI Value | Signal |\n"}

event: chunk
data: {"text":"|------|-----------|--------|\n"}

event: chunk
data: {"text":"| Overbought | Above 70 | Potential reversal down |\n"}

event: chunk
data: {"text":"| Neutral | 30-70 | No extreme signal |\n"}

event: chunk
data: {"text":"| Oversold | Below 30 | Potential reversal up |\n"}
```

#### 7. Stream Complete
```
event: complete
data: {
  "message": {
    "id": "msg_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "role": "assistant",
    "content": "I'll generate a Bitcoin chart with RSI indicator for you.\n\nHere's your Bitcoin chart with RSI!\n\n**RSI Reading Guide:**\n\n| Zone | RSI Value | Signal |\n|------|-----------|--------|\n| Overbought | Above 70 | Potential reversal down |\n| Neutral | 30-70 | No extreme signal |\n| Oversold | Below 30 | Potential reversal up |\n\nThe RSI (Relative Strength Index) helps identify momentum and potential reversal points. Look for divergences between price and RSI for stronger signals.",
    "createdAt": "2026-01-03T10:30:15.000Z"
  },
  "conversationId": "conv_x9y8z7w6-v5u4-3210-tsrq-ponmlkjihgfe",
  "chart": {
    "imageUrl": "https://r2.chart-img.com/20260103/tradingview/advanced-chart/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png",
    "symbol": "BINANCE:BTCUSDT",
    "interval": "4h"
  },
  "analysis": null
}
```

---

## Non-Streaming Response

**Endpoint**: `POST /api/v1/chat/messages`

The non-streaming endpoint returns the complete response in a single JSON object.

### Request

```json
{
  "message": "Show me Bitcoin with RSI",
  "conversationId": "conv_x9y8z7w6-v5u4-3210-tsrq-ponmlkjihgfe"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": {
      "id": "msg_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "role": "assistant",
      "content": "I'll generate a Bitcoin chart with RSI indicator for you.\n\nHere's your Bitcoin chart with RSI!\n\n**RSI Reading Guide:**\n\n| Zone | RSI Value | Signal |\n|------|-----------|--------|\n| Overbought | Above 70 | Potential reversal down |\n| Neutral | 30-70 | No extreme signal |\n| Oversold | Below 30 | Potential reversal up |\n\nThe RSI (Relative Strength Index) helps identify momentum and potential reversal points. Look for divergences between price and RSI for stronger signals.",
      "chartId": "chart_f1e2d3c4-b5a6-7890-0987-654321fedcba",
      "createdAt": "2026-01-03T10:30:15.000Z"
    },
    "conversationId": "conv_x9y8z7w6-v5u4-3210-tsrq-ponmlkjihgfe",
    "chart": {
      "imageUrl": "https://r2.chart-img.com/20260103/tradingview/advanced-chart/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png",
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h"
    },
    "analysis": null
  },
  "meta": {
    "timestamp": "2026-01-03T10:30:15.000Z"
  }
}
```

---

## Response Breakdown

### AI Response Content (Markdown)

```markdown
I'll generate a Bitcoin chart with RSI indicator for you.

Here's your Bitcoin chart with RSI!

**RSI Reading Guide:**

| Zone | RSI Value | Signal |
|------|-----------|--------|
| Overbought | Above 70 | Potential reversal down |
| Neutral | 30-70 | No extreme signal |
| Oversold | Below 30 | Potential reversal up |

The RSI (Relative Strength Index) helps identify momentum and potential reversal points. Look for divergences between price and RSI for stronger signals.
```

### Chart Configuration Used

```json
{
  "symbol": "BINANCE:BTCUSDT",
  "interval": "4h",
  "range": "1M",
  "theme": "dark",
  "style": "candle",
  "width": 1200,
  "height": 675,
  "studies": [
    {
      "name": "RelativeStrengthIndex@tv-basicstudies",
      "input": {
        "length": 14
      }
    }
  ]
}
```

---

## Tuning Points

The following aspects can be tuned to customize AI responses:

### 1. Response Style

**Current**: Educational with tables and explanations

**Alternatives**:
- **Minimal**: Just the chart, no explanation
- **Detailed**: Full technical analysis with entry/exit points
- **Conversational**: More casual, friendly tone

### 2. Default Timeframe

**Current**: 4h for crypto

**Configurable via**:
- User preferences in request
- System prompt defaults
- `ChartConfigService` defaults

### 3. Indicator Explanation Depth

**Current**: Brief table with zones and signals

**Options**:
- No explanation (just generate chart)
- Brief (current)
- Detailed (with examples and trading strategies)

### 4. Chart Configuration Defaults

| Setting | Current Default | Can Override |
|---------|-----------------|--------------|
| Theme | `dark` | Yes, via preferences |
| Interval | `4h` (crypto) / `1D` (stocks) | Yes |
| Range | `1M` | Yes |
| Resolution | `1200x675` | Yes |
| RSI Period | `14` | Yes, via natural language |

### 5. System Prompt Location

The AI behavior is controlled by the system prompt in:
```
src/modules/conversation/services/conversation.service.ts
```

Key sections to tune:
- Tool usage instructions
- Response formatting guidelines
- Educational content inclusion

---

## Error Response Examples

### Rate Limited (429)

```
event: error
data: {
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Daily chart limit reached. You've used 10/10 charts today. Limit resets at midnight UTC. Upgrade to Pro for 500 charts/day."
}
```

### Invalid Symbol

```
event: error
data: {
  "code": "BAD_REQUEST",
  "message": "Unknown symbol 'INVALID'. Please specify a valid trading pair like 'Bitcoin' or 'BINANCE:BTCUSDT'."
}
```

### API Error

```
event: error
data: {
  "code": "EXTERNAL_API_ERROR",
  "message": "Chart generation service temporarily unavailable. Please try again."
}
```

---

## Frontend Integration Example

```typescript
// React hook for streaming chat
const useChatStream = () => {
  const sendMessage = async (message: string, conversationId?: string) => {
    const response = await fetch('/api/v1/chat/messages/stream', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, conversationId }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let content = '';
    let chart = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      const lines = text.split('\n');

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7);
        } else if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));

          switch (currentEvent) {
            case 'chunk':
              content += data.text;
              setStreamingContent(content);
              break;
            case 'chart_complete':
              chart = data;
              setChart(data);
              break;
            case 'complete':
              setFinalMessage(data.message);
              break;
            case 'error':
              setError(data);
              break;
          }
        }
      }
    }
  };

  return { sendMessage };
};
```

---

## Notes

- Chart URLs from `r2.chart-img.com` expire after 7 days
- Use `/api/v1/storage/s3` for permanent storage
- SSE responses use native `Response`, not `NextResponse`
- All timestamps are ISO 8601 format (UTC)
