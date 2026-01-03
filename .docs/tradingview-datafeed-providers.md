# TradingView Charting Library: Datafeed Providers Research

**Date:** 2025-12-30
**Purpose:** Understanding how chart-img.com and similar services source market data for TradingView's charting library

---

## Key Insight

The TradingView Charting Library (Advanced Charts) is **only a rendering engine**. It does NOT include any market data. You must provide your own datafeed.

> "Neither Advanced Charts nor Trading Platform contains any market data. You should use data from your own source or third-party providers."
> — [TradingView Charting Library Docs](https://www.tradingview.com/charting-library-docs/latest/connecting_data/datafeed-api/)

---

## Datafeed Connection Methods

### 1. Datafeed API (Recommended)
A JavaScript-based implementation where you implement methods like:
- `resolveSymbol()` - Symbol lookup
- `getBars()` - Historical data
- `subscribeBars()` - Real-time updates

### 2. UDF Adapter
HTTP-based protocol that transforms your data into TradingView's expected format. Pre-built adapter available.

---

## Market Data Providers Comparison

| Provider | Stocks | Crypto | Forex | Futures | Real-time WS | Latency | Free Tier | Paid Pricing |
|----------|--------|--------|-------|---------|--------------|---------|-----------|--------------|
| [Polygon.io](https://polygon.io/) | ✅ | ✅ | ✅ | ✅ | ✅ | Low | 5 calls/min | $199+/mo |
| [Finnhub](https://finnhub.io/) | ✅ | ✅ | ✅ | ✅ | ✅ | Low | 60 calls/min | $49-200/mo |
| [Twelve Data](https://twelvedata.com/) | ✅ | ✅ | ✅ | ✅ | ✅ | ~170ms | 800 calls/day | $79-999/mo |
| [Finage](https://finage.co.uk/) | ✅ | ✅ | ✅ | ✅ | ✅ | Low | Limited | Custom |
| [FMP](https://financialmodelingprep.com/) | ✅ | ✅ | ❌ | ❌ | ✅ | Medium | 250 calls/day | $19/mo flat |
| [Alpha Vantage](https://www.alphavantage.co/) | ✅ | ✅ | ✅ | ❌ | ❌ | High | 25 calls/day | $49.99/mo |
| [CryptoCompare](https://cryptocompare.com/) | ❌ | ✅ | ❌ | ❌ | ✅ | Low | Limited | $79-999/mo |

---

## Provider Details

### Polygon.io (Now Massive)
**Best for:** Enterprise-grade, high-frequency trading apps

- Real-time and historical data
- Market depth, trade events, quotes, aggregates
- Covers stocks, options, forex, crypto
- WebSocket streaming with edge nodes

**Pricing:**
| Tier | Price | Features |
|------|-------|----------|
| Basic | Free | 5 API calls/min, 2yr history, EOD |
| Stocks Starter | $29/mo | 15-min delayed |
| Stocks Developer | $79/mo | Real-time, limited |
| Stocks Advanced | $199/mo | Full real-time |
| Enterprise | Custom | Unlimited |

### Finnhub
**Best for:** Cost-effective real-time data

- Real-time stock, forex, crypto
- Company fundamentals, economic data
- News sentiment, earnings calendars
- ESG scores

**Pricing:**
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 60 calls/min |
| All-in-one | $49.99/mo | US market data |
| Professional | $200/mo | Global markets |

### Twelve Data
**Best for:** Reliability and low latency

- 99.95% SLA uptime
- ~170ms WebSocket latency
- Stocks, forex, crypto, ETFs
- 20+ years historical data

**Pricing:**
| Tier | Price | API Credits |
|------|-------|-------------|
| Free | $0 | 800/day |
| Grow | $79/mo | 377/month |
| Pro | $229/mo | 1,597/month |
| Ultra | $999/mo | All markets |
| Enterprise | $1,999/mo | Unlimited |

### Direct Exchange APIs (Crypto - FREE)
Most crypto exchanges provide free WebSocket feeds:

```javascript
// Binance - FREE real-time
wss://stream.binance.com:9443/ws/btcusdt@kline_1m

// Coinbase - FREE real-time
wss://ws-feed.exchange.coinbase.com

// Kraken - FREE real-time
wss://ws.kraken.com
```

---

## Chart-Img.com Architecture Analysis

Based on their exchange coverage (NASDAQ, NYSE, CME, Binance, etc.), here's the likely architecture:

```
┌────────────────────────────────────────────────────────────────┐
│                     CHART-IMG.COM BACKEND                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────┐                                          │
│  │  DATA SOURCES    │                                          │
│  ├──────────────────┤                                          │
│  │ Stocks/Futures:  │                                          │
│  │ - Polygon.io     │──────┐                                   │
│  │ - or Finnhub     │      │                                   │
│  ├──────────────────┤      │                                   │
│  │ Crypto:          │      │                                   │
│  │ - Binance WS     │──────┼───▶ ┌─────────────────────────┐  │
│  │ - Coinbase WS    │      │     │    UDF Server           │  │
│  │ - Exchange APIs  │      │     │    (Data Transformer)   │  │
│  ├──────────────────┤      │     └───────────┬─────────────┘  │
│  │ Forex:           │      │                 │                 │
│  │ - Twelve Data    │──────┘                 ▼                 │
│  │ - or OANDA       │           ┌─────────────────────────┐   │
│  └──────────────────┘           │  TradingView Charting   │   │
│                                 │  Library (Advanced)     │   │
│                                 │                         │   │
│                                 │  ┌───────────────────┐  │   │
│                                 │  │ Datafeed Adapter  │  │   │
│                                 │  │ - resolveSymbol() │  │   │
│                                 │  │ - getBars()       │  │   │
│                                 │  │ - subscribeBars() │  │   │
│                                 │  └───────────────────┘  │   │
│                                 └───────────┬─────────────┘   │
│                                             │                  │
│                                             ▼                  │
│                                 ┌─────────────────────────┐   │
│                                 │   Headless Browser      │   │
│                                 │   (Puppeteer/Playwright)│   │
│                                 │   Screenshot Capture    │   │
│                                 └───────────┬─────────────┘   │
│                                             │                  │
│                                             ▼                  │
│                                        PNG/JPEG                │
│                                             │                  │
│                                             ▼                  │
│                                   ┌─────────────────┐          │
│                                   │  REST API       │          │
│                                   │  /v2/advanced   │          │
│                                   └─────────────────┘          │
└────────────────────────────────────────────────────────────────┘
```

---

## Most Likely Data Sources for Chart-Img

### Hypothesis 1: Polygon.io (Primary)
**Evidence:**
- Covers all US exchanges they support (NASDAQ, NYSE, OTC)
- Covers CME, CBOT, COMEX, NYMEX futures
- Enterprise-grade for high volume
- Crypto via separate endpoint

### Hypothesis 2: Multi-Provider Setup
```
┌─────────────────┬────────────────────┐
│ Asset Class     │ Provider           │
├─────────────────┼────────────────────┤
│ US Stocks       │ Polygon or Finnhub │
│ US Futures      │ Polygon or CQG     │
│ Crypto (CEX)    │ Direct Exchange WS │
│ Forex           │ Twelve Data/OANDA  │
│ Indices         │ Polygon/Finnhub    │
└─────────────────┴────────────────────┘
```

### Hypothesis 3: TradingView Partnership
Chart-img.com may have a **partnership with TradingView** that provides:
- Access to TradingView's aggregated data feed
- Session passthrough for user subscriptions
- This would explain their seamless integration

---

## Cost Estimate: Building Similar Service

| Data Type | Provider | Monthly Cost |
|-----------|----------|--------------|
| US Stocks (real-time) | Polygon Advanced | $199-999 |
| US Futures (CME Group) | Polygon/Databento | $200-500 |
| Crypto (80+ exchanges) | Direct Exchange APIs | $0 (free) |
| Forex | Twelve Data Pro | $79-229 |
| Server Infrastructure | AWS/GCP | $200-500 |
| TradingView License | Commercial | ~$1,000-5,000 |
| **Total Estimate** | | **$1,678-7,228/mo** |

---

## Implementation: Datafeed Adapter Example

```typescript
// UDF Server endpoint structure
interface UDFConfig {
  // Symbol resolution
  '/symbols': (symbol: string) => SymbolInfo;

  // Historical bars
  '/history': (params: {
    symbol: string;
    from: number;
    to: number;
    resolution: string;
  }) => BarsData;

  // Server time
  '/time': () => number;

  // Configuration
  '/config': () => DatafeedConfig;
}

// Datafeed adapter implementation
class PolygonDatafeed implements IDatafeed {
  private polygon: PolygonClient;

  async getBars(
    symbolInfo: SymbolInfo,
    resolution: string,
    from: number,
    to: number
  ): Promise<Bar[]> {
    const bars = await this.polygon.stocks.aggregates(
      symbolInfo.ticker,
      1,
      this.resolutionToTimespan(resolution),
      from * 1000,
      to * 1000
    );

    return bars.results.map(bar => ({
      time: bar.t,
      open: bar.o,
      high: bar.h,
      low: bar.l,
      close: bar.c,
      volume: bar.v
    }));
  }

  subscribeBars(
    symbolInfo: SymbolInfo,
    resolution: string,
    onTick: (bar: Bar) => void
  ): void {
    this.polygon.websocket.subscribe(`A.${symbolInfo.ticker}`, onTick);
  }
}
```

---

## Key Takeaways

1. **Chart-img.com doesn't publicly disclose their data provider**
2. **Most likely setup:** Polygon.io for stocks/futures + direct exchange WebSockets for crypto
3. **Alternative:** They may have a TradingView partnership for data access
4. **Cost to replicate:** $1,500-7,000/month for data + infrastructure
5. **Crypto is free:** All major exchanges provide free WebSocket feeds

---

## References

- [TradingView Datafeed API Documentation](https://www.tradingview.com/charting-library-docs/latest/connecting_data/datafeed-api/)
- [TradingView UDF Adapter](https://www.tradingview.com/charting-library-docs/latest/connecting_data/UDF/)
- [Polygon.io Stock Market API](https://polygon.io/)
- [Finnhub Real-time APIs](https://finnhub.io/)
- [Twelve Data Market APIs](https://twelvedata.com/)
- [Finage Real-Time Market Data](https://finage.co.uk/)
- [Financial Modeling Prep API](https://financialmodelingprep.com/)
- [Best Financial APIs 2025](https://blog.apilayer.com/12-best-financial-market-apis-for-real-time-data-in-2025/)
- [TradingView Data Coverage](https://www.tradingview.com/data-coverage/)
- [Chart-Img Medium Articles](https://chart-img.medium.com/)
