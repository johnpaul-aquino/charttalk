# Backend Implementation: Pricing & Plan Changes

**Priority:** High
**Target:** Pre-launch
**Affected Services:** user-and-payment-mgnt (Laravel), mcp-chart-image (Node.js)
**Last Updated:** December 26, 2025

---

## Implementation Status

| Service | Status |
|---------|--------|
| user-and-payment-mgnt (Laravel) | ✅ **COMPLETED** |
| Paddle Billing Setup | ✅ **COMPLETED** |
| mcp-chart-image (Node.js) | ✅ **COMPLETED** |
| Frontend | ⏳ PENDING |

---

## Summary of Changes

We've updated our subscription pricing with new prices, annual billing, and adjusted limits.

---

## 1. New Pricing Structure

### Monthly Plans

| Plan | Price | Change |
|------|-------|--------|
| Free | $0 | No change |
| Pro | **$29/mo** | Was $25 |
| Max | **$99/mo** | Was $100 |

### Annual Plans (NEW)

| Plan | Annual Price | Monthly Equiv | Savings |
|------|--------------|---------------|---------|
| Pro | $290/year | $24.17/mo | $58 saved |
| Max | $990/year | $82.50/mo | $198 saved |

### Paddle Price IDs (Sandbox)

| Plan | Price ID | Amount |
|------|----------|--------|
| Pro Monthly | `pri_01kdbf9pww1pm4e30aehazpher` | $29/mo |
| Max Monthly | `pri_01kdbf9q8w03cghr8bv8ye99a1` | $99/mo |
| Pro Annual | `pri_01kdbf9r4nzedb39bxakvmn36k` | $290/yr |
| Max Annual | `pri_01kdbf9rn80cr16tf6j5jyf7qs` | $990/yr |

---

## 2. Plan Features & Limits

### Free Plan - $0

| Feature | Value | Change |
|---------|-------|--------|
| Daily Chart Generate | **10** | Was 50 |
| Chart Analysis | Yes | - |
| Download and Share | No | - |
| Scheduled Notification | No | - |
| Max Parameter | 3 | - |
| Max Resolution | 800 x 600 | - |
| Rate Limit | 1/sec | - |
| Watermark | Yes | - |

**Best For:** Perfect for beginners exploring AI chart analysis

---

### Pro Plan - $29/mo or $290/year

| Feature | Value | Change |
|---------|-------|--------|
| Daily Chart Generate | 500 | - |
| Chart Analysis | Yes | - |
| Download and Share | Yes | - |
| Scheduled Notification | Yes | - |
| Max Parameter | 5 | - |
| Max Resolution | 1920 x 1080 | - |
| Rate Limit | 10/sec | - |
| Watermark | No | - |

**Best For:** Serious traders who analyze markets daily

---

### Max Plan - $99/mo or $990/year

| Feature | Value | Change |
|---------|-------|--------|
| Daily Chart Generate | **2,000** | Was 1,000 |
| Chart Analysis | Yes | - |
| Download and Share | Yes | - |
| Scheduled Notification | Yes | - |
| Max Parameter | 10 | - |
| Max Resolution | **2048 x 1920** | Was 1920 x 1600 |
| Rate Limit | **25/sec** | Was 15/sec |
| Watermark | No | - |

**Best For:** Trading firms, professional analysts, and high-volume users

---

## 3. Implementation Tasks

### ✅ Task 1: Update Laravel Plans Config (COMPLETED)

**File:** `config/plans.php`

```php
<?php

return [
    'plans' => [
        'free' => [
            'name' => 'Free',
            'paddle_price_id' => null,
            'price' => 0,
            'currency' => 'USD',
            'interval' => 'month',
            'features' => [
                'daily_chart_generate' => 10,
                'chart_analysis' => true,
                'download_and_share' => false,
                'scheduled_notification' => false,
                'max_parameter' => 3,
                'max_resolution' => '800x600',
                'rate_limit' => '1/sec',
                'watermark' => true,
            ],
            'best_for' => 'Perfect for beginners exploring AI chart analysis',
        ],

        'pro' => [
            'name' => 'Pro',
            'paddle_price_id' => env('PADDLE_PRICE_PRO'),
            'price' => 29.00,
            'currency' => 'USD',
            'interval' => 'month',
            'features' => [
                'daily_chart_generate' => 500,
                'chart_analysis' => true,
                'download_and_share' => true,
                'scheduled_notification' => true,
                'max_parameter' => 5,
                'max_resolution' => '1920x1080',
                'rate_limit' => '10/sec',
                'watermark' => false,
            ],
            'best_for' => 'Serious traders who analyze markets daily',
        ],

        'pro_annual' => [
            'name' => 'Pro',
            'paddle_price_id' => env('PADDLE_PRICE_PRO_ANNUAL'),
            'price' => 290.00,
            'currency' => 'USD',
            'interval' => 'year',
            'base_plan' => 'pro',
            'annual_savings' => 58,
        ],

        'max' => [
            'name' => 'Max',
            'paddle_price_id' => env('PADDLE_PRICE_MAX'),
            'price' => 99.00,
            'currency' => 'USD',
            'interval' => 'month',
            'features' => [
                'daily_chart_generate' => 2000,
                'chart_analysis' => true,
                'download_and_share' => true,
                'scheduled_notification' => true,
                'max_parameter' => 10,
                'max_resolution' => '2048x1920',
                'rate_limit' => '25/sec',
                'watermark' => false,
            ],
            'best_for' => 'Trading firms, professional analysts, and high-volume users',
        ],

        'max_annual' => [
            'name' => 'Max',
            'paddle_price_id' => env('PADDLE_PRICE_MAX_ANNUAL'),
            'price' => 990.00,
            'currency' => 'USD',
            'interval' => 'year',
            'base_plan' => 'max',
            'annual_savings' => 198,
        ],
    ],

    'grace_period_days' => 7,
];
```

---

### ✅ Task 2: Environment Variables (COMPLETED)

**File:** `.env`

```env
# Monthly plans
PADDLE_PRICE_PRO=pri_01kdbf9pww1pm4e30aehazpher
PADDLE_PRICE_MAX=pri_01kdbf9q8w03cghr8bv8ye99a1

# Annual plans
PADDLE_PRICE_PRO_ANNUAL=pri_01kdbf9r4nzedb39bxakvmn36k
PADDLE_PRICE_MAX_ANNUAL=pri_01kdbf9rn80cr16tf6j5jyf7qs
```

---

### ✅ Task 3: Update Rate Limits Config (mcp-chart-image) - COMPLETED

**File:** `src/shared/config/rate-limits.config.ts`

```typescript
export const PLAN_RATE_LIMITS: Record<PlanType, PlanRateLimit> = {
  free: {
    dailyCharts: 10,      // Changed: was 50
  },
  pro: {
    dailyCharts: 500,     // No change
  },
  max: {
    dailyCharts: 2000,    // Changed: was 1000
  },
};
```

---

### ✅ Task 4: Update Validation Limits (mcp-chart-image) - COMPLETED

**File:** `src/modules/chart/services/chart-validation.service.ts`

```typescript
// Resolution limits
const planResolutions: Record<string, { maxWidth: number; maxHeight: number }> = {
  BASIC: { maxWidth: 800, maxHeight: 600 },     // Free
  PRO: { maxWidth: 1920, maxHeight: 1080 },     // Pro (no change)
  MAX: { maxWidth: 2048, maxHeight: 1920 },     // Changed: was 1920x1600
};

// Rate limits (requests per second)
const planRateLimits: Record<string, number> = {
  BASIC: 1,    // Free
  PRO: 10,     // Pro (no change)
  MAX: 25,     // Changed: was 15
};
```

---

### ✅ Task 5: Update Subscription Controller (COMPLETED)

**File:** `app/Http/Controllers/Api/V1/SubscriptionController.php`

- Added support for annual billing plans (`pro_annual`, `max_annual`)
- Updated `index()` to return formatted plan data with annual pricing
- Updated `show()` to return plan interval (month/year)
- Updated `swap()` to handle plan tier upgrades/downgrades correctly

---

### ✅ Task 6: Plans API Response (COMPLETED)

**Endpoint:** `GET /api/v1/subscriptions/plans`

**Response Format:**

```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "free",
        "name": "Free",
        "tagline": "Try ChartTalk",
        "monthly_price": 0,
        "annual_price": null,
        "annual_savings": null,
        "features": [
          {"label": "Daily Chart Generate", "value": "10"},
          {"label": "Chart Analysis", "value": "Yes"},
          {"label": "Download and Share", "value": "No"},
          {"label": "Scheduled Notification", "value": "No"},
          {"label": "Max Parameter", "value": "3"},
          {"label": "Max Resolution", "value": "800x600"},
          {"label": "Rate Limit", "value": "1/sec"},
          {"label": "Watermark", "value": "Yes"}
        ],
        "best_for": "Perfect for beginners exploring AI chart analysis"
      },
      {
        "id": "pro",
        "name": "Pro",
        "tagline": "For everyday trading",
        "monthly_price": 29,
        "annual_price": 290,
        "annual_savings": 58,
        "is_popular": true,
        "features": [
          {"label": "Daily Chart Generate", "value": "500"},
          {"label": "Chart Analysis", "value": "Yes"},
          {"label": "Download and Share", "value": "Yes"},
          {"label": "Scheduled Notification", "value": "Yes"},
          {"label": "Max Parameter", "value": "5"},
          {"label": "Max Resolution", "value": "1920x1080"},
          {"label": "Rate Limit", "value": "10/sec"},
          {"label": "Watermark", "value": "No"}
        ],
        "best_for": "Serious traders who analyze markets daily"
      },
      {
        "id": "max",
        "name": "Max",
        "tagline": "For high-volume usage",
        "monthly_price": 99,
        "annual_price": 990,
        "annual_savings": 198,
        "features": [
          {"label": "Daily Chart Generate", "value": "2,000"},
          {"label": "Chart Analysis", "value": "Yes"},
          {"label": "Download and Share", "value": "Yes"},
          {"label": "Scheduled Notification", "value": "Yes"},
          {"label": "Max Parameter", "value": "10"},
          {"label": "Max Resolution", "value": "2048x1920"},
          {"label": "Rate Limit", "value": "25/sec"},
          {"label": "Watermark", "value": "No"}
        ],
        "best_for": "Trading firms, professional analysts, and high-volume users"
      }
    ]
  }
}
```

---

## 4. Summary of Changes

| Item | Old Value | New Value |
|------|-----------|-----------|
| Pro price | $25/mo | $29/mo |
| Max price | $100/mo | $99/mo |
| Free daily charts | 50 | 10 |
| Max daily charts | 1,000 | 2,000 |
| Max resolution | 1920x1600 | 2048x1920 |
| Max rate limit | 15/sec | 25/sec |
| Annual billing | N/A | Pro $290/yr, Max $990/yr |

---

## 5. Paddle Dashboard Setup (COMPLETED)

✅ Created new prices in Paddle Sandbox:
- Pro Monthly: `pri_01kdbf9pww1pm4e30aehazpher` ($29/mo)
- Max Monthly: `pri_01kdbf9q8w03cghr8bv8ye99a1` ($99/mo)
- Pro Annual: `pri_01kdbf9r4nzedb39bxakvmn36k` ($290/yr)
- Max Annual: `pri_01kdbf9rn80cr16tf6j5jyf7qs` ($990/yr)

⚠️ **Note:** Old prices should be archived manually in Paddle Dashboard:
- `pri_01kaxhhge5jhe5qyg0rab9xnq3` (Pro $25 - old)
- `pri_01kaxhwjv0x382rh8jg42z9mxm` (Max $100 - old)

---

## 6. Testing Checklist

### Backend (user-and-payment-mgnt)
- [x] Plans config updated with new prices and features
- [x] Environment variables configured
- [x] Plans API returns correct format
- [x] Subscribe endpoint supports all plan types
- [x] Swap endpoint handles upgrades/downgrades
- [ ] Free plan: 10 charts/day limit works
- [ ] Pro monthly: $29 checkout works
- [ ] Pro annual: $290 checkout works
- [ ] Max monthly: $99 checkout works
- [ ] Max annual: $990 checkout works
- [ ] Plan swap monthly ↔ annual works
- [ ] JWT includes correct plan info

### mcp-chart-image (COMPLETED)
- [x] Rate limits updated (Free: 10, Max: 2000)
- [x] Resolution limits updated (Max: 2048x1920)
- [x] Rate limit per second updated (Max: 25/sec)

### Frontend (PENDING)
- [ ] Pricing page shows new prices
- [ ] Annual toggle works
- [ ] Checkout redirects work for all plans

---

*Document prepared: December 26, 2025*
*mcp-chart-image updated: December 26, 2025*
