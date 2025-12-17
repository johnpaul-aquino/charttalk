# AWS S3 Storage (Permanent Chart Storage)

The server supports **permanent chart storage** in AWS S3, replacing the 7-day expiration limit of chart-img.com URLs.

## Why Use S3 Storage?

| Feature | chart-img.com | AWS S3 |
|---------|---------------|--------|
| **URL Expiration** | 7 days | Never (permanent) |
| **Storage Control** | chart-img.com servers | Your AWS account |
| **CDN Support** | Limited | CloudFront integration |
| **Metadata Tagging** | No | Yes (symbol, interval, etc.) |
| **Cost** | Included in plan | Pay-as-you-go (~$0.023/GB) |

## Setup AWS S3

### 1. Create S3 Bucket

Via AWS Console or CLI:

```bash
aws s3api create-bucket \
  --bucket my-trading-charts \
  --region us-east-1 \
  --acl public-read
```

### 2. Create IAM User

Create an IAM user with S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-trading-charts/*",
        "arn:aws:s3:::my-trading-charts"
      ]
    }
  ]
}
```

### 3. Add Credentials to `.env`

```bash
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=my-trading-charts
AWS_S3_BUCKET_REGION=us-east-1

# Optional: CloudFront CDN
AWS_CLOUDFRONT_DOMAIN=d123abc.cloudfront.net
```

### 4. Restart Server

```bash
npm run dev
```

## MCP Tool: `upload_chart_to_s3`

**Usage in Claude Code**:
> "Generate a Bitcoin chart with RSI, then upload it to S3 for permanent storage"

**Workflow**:
1. Generate chart with `generate_chart_image` (returns 7-day URL)
2. Upload to S3 with `upload_chart_to_s3` (returns permanent URL)

**Example**:
```typescript
// Step 1: Generate chart (temporary URL)
const chart = await generate_chart_image({
  config: { symbol: "BINANCE:BTCUSDT", interval: "4h", range: "1M" }
});
// chart.imageUrl = "https://r2.chart-img.com/..." (expires in 7 days)

// Step 2: Upload to S3 (permanent URL)
const s3Result = await upload_chart_to_s3({
  imageUrl: chart.imageUrl,
  metadata: {
    symbol: "BINANCE:BTCUSDT",
    interval: "4h",
    indicators: ["RSI", "MACD"]
  }
});
// s3Result.url = "https://my-bucket.s3.us-east-1.amazonaws.com/charts/..." (never expires)
```

## REST API Endpoint: `POST /api/v1/storage/s3`

### Upload from URL

```bash
curl -X POST http://localhost:3010/api/v1/storage/s3 \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://r2.chart-img.com/...",
    "metadata": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "indicators": ["RSI", "MACD"],
      "generatedAt": "2025-11-16T10:30:00Z"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "url": "https://my-trading-charts.s3.us-east-1.amazonaws.com/charts/2025/11/BTCUSDT-4h-20251116T103000-abc12345.png",
    "bucket": "my-trading-charts",
    "key": "charts/2025/11/BTCUSDT-4h-20251116T103000-abc12345.png",
    "size": 245678,
    "uploadedAt": "2025-11-16T10:30:15Z",
    "metadata": {
      "symbol": "BINANCE:BTCUSDT",
      "interval": "4h",
      "indicators": "RSI,MACD",
      "source": "chart-img.com"
    }
  }
}
```

### Upload from Base64

```bash
curl -X POST http://localhost:3010/api/v1/storage/s3 \
  -H "Content-Type: application/json" \
  -d '{
    "imageData": "iVBORw0KGgoAAAANSUhEUgAA...",
    "metadata": {
      "symbol": "BINANCE:ETHUSDT",
      "interval": "1D"
    }
  }'
```

## S3 Object Key Structure

Charts are organized by date for easy management:

```
charts/
  2025/
    11/
      BTCUSDT-4h-20251116T103000-abc12345.png
      ETHUSDT-1D-20251116T143000-def67890.png
    12/
      BTCUSDT-1h-20251201T090000-ghi11121.png
```

**Key Format**: `charts/{year}/{month}/{symbol}-{interval}-{timestamp}-{hash}.png`

## CloudFront CDN (Optional)

For faster global delivery, configure CloudFront:

1. **Create CloudFront Distribution**:
   - Origin: S3 bucket
   - Viewer Protocol: HTTPS only
   - Cache behavior: Cache based on query strings

2. **Add to `.env`**:
```bash
AWS_CLOUDFRONT_DOMAIN=d123abc.cloudfront.net
```

3. **URLs will automatically use CloudFront**:
```
https://d123abc.cloudfront.net/charts/2025/11/BTCUSDT-4h-20251116T103000-abc12345.png
```

## Storage Costs

AWS S3 pricing (as of 2025):

| Storage | Cost |
|---------|------|
| First 50 TB/month | $0.023 per GB |
| Next 450 TB/month | $0.022 per GB |

**Example**: Storing 1,000 charts (average 250KB each):
- Total size: 250 MB
- Monthly cost: ~$0.006 (less than 1 cent!)

**Data Transfer**: First 100 GB/month free, then $0.09/GB

## Code Examples

### JavaScript/TypeScript

```typescript
// Full workflow: Generate → Upload to S3 → Get permanent URL
async function generateAndStoreChart(symbol: string, interval: string) {
  // 1. Construct config from natural language
  const configResponse = await fetch('http://localhost:3010/api/v1/charts/construct', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      naturalLanguage: `${symbol} chart with RSI and MACD, ${interval} timeframe, last month`
    })
  });
  const { data: configData } = await configResponse.json();

  // 2. Generate chart (7-day URL)
  const chartResponse = await fetch('http://localhost:3010/api/v1/charts/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: configData.config,
      storage: true
    })
  });
  const { data: chartData } = await chartResponse.json();

  // 3. Upload to S3 (permanent URL)
  const s3Response = await fetch('http://localhost:3010/api/v1/storage/s3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageUrl: chartData.imageUrl,
      metadata: {
        symbol: configData.config.symbol,
        interval: configData.config.interval,
        indicators: ['RSI', 'MACD']
      }
    })
  });
  const { data: s3Data } = await s3Response.json();

  return {
    temporaryUrl: chartData.imageUrl,  // Expires in 7 days
    permanentUrl: s3Data.url,          // Never expires
    s3Key: s3Data.key,
    metadata: s3Data.metadata
  };
}

// Usage
const result = await generateAndStoreChart('BINANCE:BTCUSDT', '4h');
console.log('Permanent chart URL:', result.permanentUrl);
```

### Python

```python
import requests

def generate_and_store_chart(symbol: str, interval: str):
    # 1. Construct config
    config_response = requests.post(
        'http://localhost:3010/api/v1/charts/construct',
        json={
            'naturalLanguage': f'{symbol} chart with RSI and MACD, {interval} timeframe, last month'
        }
    )
    config_data = config_response.json()['data']

    # 2. Generate chart (7-day URL)
    chart_response = requests.post(
        'http://localhost:3010/api/v1/charts/generate',
        json={
            'config': config_data['config'],
            'storage': True
        }
    )
    chart_data = chart_response.json()['data']

    # 3. Upload to S3 (permanent URL)
    s3_response = requests.post(
        'http://localhost:3010/api/v1/storage/s3',
        json={
            'imageUrl': chart_data['imageUrl'],
            'metadata': {
                'symbol': config_data['config']['symbol'],
                'interval': config_data['config']['interval'],
                'indicators': ['RSI', 'MACD']
            }
        }
    )
    s3_data = s3_response.json()['data']

    return {
        'temporary_url': chart_data['imageUrl'],  # Expires in 7 days
        'permanent_url': s3_data['url'],          # Never expires
        's3_key': s3_data['key'],
        'metadata': s3_data['metadata']
    }

# Usage
result = generate_and_store_chart('BINANCE:BTCUSDT', '4h')
print(f"Permanent chart URL: {result['permanent_url']}")
```
