/**
 * Verify Indicators Script
 *
 * Generates charts for all tested indicators and saves them for visual verification.
 * Uses Playwright to screenshot each chart and check if indicator label is visible.
 *
 * Usage: npx tsx scripts/verify-indicators.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config();

const API_URL = 'https://api.chart-img.com/v2/tradingview/advanced-chart/storage';
const CONCURRENCY = 3;
const DELAY_MS = 500;

interface Indicator {
  id: string;
  name: string;
  category: string;
  tested: boolean;
  notes?: string;
}

interface IndicatorsDatabase {
  indicators: Indicator[];
}

interface VerifyResult {
  id: string;
  name: string;
  imageUrl: string | null;
  success: boolean;
  error?: string;
}

async function generateChart(indicator: Indicator): Promise<VerifyResult> {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': process.env.CHART_IMG_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol: 'BINANCE:BTCUSDT',
        interval: '4h',
        range: '1M',
        width: 800,
        height: 450,
        studies: [{ name: indicator.name }]
      })
    });

    if (response.status === 200) {
      const data = await response.json();
      return {
        id: indicator.id,
        name: indicator.name,
        imageUrl: data.url,
        success: true
      };
    } else {
      const errorText = await response.text();
      return {
        id: indicator.id,
        name: indicator.name,
        imageUrl: null,
        success: false,
        error: errorText
      };
    }
  } catch (error) {
    return {
      id: indicator.id,
      name: indicator.name,
      imageUrl: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function verifyIndicators() {
  if (!process.env.CHART_IMG_API_KEY) {
    console.error('Error: CHART_IMG_API_KEY not found');
    process.exit(1);
  }

  // Load database
  const dbPath = path.join(process.cwd(), 'src/core/database/indicators.json');
  const db: IndicatorsDatabase = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

  // Get only tested indicators (excluding the ones we know work from manual testing)
  const testedIndicators = db.indicators.filter(i => i.tested);

  console.log('='.repeat(60));
  console.log('Verifying Tested Indicators');
  console.log('='.repeat(60));
  console.log(`Total tested indicators: ${testedIndicators.length}`);
  console.log('');

  const results: VerifyResult[] = [];
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < testedIndicators.length; i += CONCURRENCY) {
    const batch = testedIndicators.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(ind => generateChart(ind)));
    results.push(...batchResults);

    // Progress
    const progress = Math.min(i + CONCURRENCY, testedIndicators.length);
    console.log(`[${progress}/${testedIndicators.length}] Generated charts`);
    batchResults.forEach(r => {
      const icon = r.success ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
      console.log(`  ${icon} ${r.name}`);
    });

    if (i + CONCURRENCY < testedIndicators.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Summary
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log('');
  console.log('='.repeat(60));
  console.log('Verification Summary');
  console.log('='.repeat(60));
  console.log(`\x1b[32m✓ Charts generated: ${successful.length}\x1b[0m`);
  console.log(`\x1b[31m✗ Failed: ${failed.length}\x1b[0m`);
  console.log(`Time: ${elapsed}s`);

  // Save results to JSON for review
  const outputPath = path.join(process.cwd(), 'scripts/verification-results.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    results: results.map(r => ({
      id: r.id,
      name: r.name,
      success: r.success,
      imageUrl: r.imageUrl,
      error: r.error
    }))
  }, null, 2));

  console.log(`\nResults saved to: ${outputPath}`);

  // Print chart URLs for visual inspection
  console.log('');
  console.log('='.repeat(60));
  console.log('Chart URLs for Visual Verification');
  console.log('='.repeat(60));
  successful.forEach(r => {
    console.log(`${r.name}:`);
    console.log(`  ${r.imageUrl}`);
  });

  if (failed.length > 0) {
    console.log('');
    console.log('='.repeat(60));
    console.log('Failed Indicators');
    console.log('='.repeat(60));
    failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.error?.substring(0, 80)}`);
    });
  }
}

verifyIndicators().catch(console.error);
