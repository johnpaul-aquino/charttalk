/**
 * Test All Indicators Script
 *
 * Tests all untested indicators against the chart-img.com API
 * and updates the database with results.
 *
 * Usage: npx tsx scripts/test-all-indicators.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
import { config } from 'dotenv';
config();

const API_URL = 'https://api.chart-img.com/v2/tradingview/advanced-chart/storage';
const CONCURRENCY = 5;  // Parallel requests (PRO plan allows 10 RPS)
const DELAY_MS = 300;   // Delay between batches

interface Indicator {
  id: string;
  name: string;
  category: string;
  tested: boolean;
  notes?: string;
  [key: string]: any;
}

interface IndicatorsDatabase {
  version: string;
  lastUpdated: string;
  totalCount: number;
  addedCount: number;
  indicators: Indicator[];
  progress: any;
}

interface TestResult {
  id: string;
  name: string;
  status: number;
  success: boolean;
  error?: string;
}

async function testIndicator(indicator: Indicator): Promise<TestResult> {
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
        studies: [{ name: indicator.name }]
      })
    });

    const errorText = response.status !== 200 ? await response.text() : undefined;

    return {
      id: indicator.id,
      name: indicator.name,
      status: response.status,
      success: response.status === 200,
      error: errorText
    };
  } catch (error) {
    return {
      id: indicator.id,
      name: indicator.name,
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function runTests() {
  // Check API key
  if (!process.env.CHART_IMG_API_KEY) {
    console.error('Error: CHART_IMG_API_KEY not found in environment');
    process.exit(1);
  }

  // Load database directly (avoid cache issues)
  const dbPath = path.join(process.cwd(), 'src/core/database/indicators.json');
  const db: IndicatorsDatabase = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

  const untested = db.indicators.filter(i => !i.tested);

  console.log('='.repeat(60));
  console.log('Testing All Indicators');
  console.log('='.repeat(60));
  console.log(`Total indicators: ${db.indicators.length}`);
  console.log(`Already tested: ${db.indicators.length - untested.length}`);
  console.log(`To test: ${untested.length}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log('='.repeat(60));
  console.log('');

  const results: TestResult[] = [];
  const startTime = Date.now();

  // Process in batches
  for (let i = 0; i < untested.length; i += CONCURRENCY) {
    const batch = untested.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(ind => testIndicator(ind)));
    results.push(...batchResults);

    // Progress with indicator names
    const progress = Math.min(i + CONCURRENCY, untested.length);
    const passedInBatch = batchResults.filter(r => r.success).length;
    const failedInBatch = batchResults.filter(r => !r.success).length;

    console.log(`[${progress}/${untested.length}] Batch: ${passedInBatch} passed, ${failedInBatch} failed`);
    batchResults.forEach(r => {
      const icon = r.success ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
      console.log(`  ${icon} ${r.name}`);
    });

    // Delay between batches (except last)
    if (i + CONCURRENCY < untested.length) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // Summary
  const passed = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log('');
  console.log('='.repeat(60));
  console.log('Results Summary');
  console.log('='.repeat(60));
  console.log(`\x1b[32m✓ Passed: ${passed.length}\x1b[0m`);
  console.log(`\x1b[31m✗ Failed: ${failed.length}\x1b[0m`);
  console.log(`Time: ${elapsed}s`);
  console.log('');

  // Update database
  let updatedCount = 0;
  for (const result of passed) {
    const indicator = db.indicators.find(i => i.id === result.id);
    if (indicator && !indicator.tested) {
      indicator.tested = true;
      updatedCount++;
    }
  }

  // Add notes to failed indicators
  for (const result of failed) {
    const indicator = db.indicators.find(i => i.id === result.id);
    if (indicator) {
      indicator.notes = `API test failed: ${result.error?.substring(0, 100) || 'Unknown error'}`;
    }
  }

  // Write updated database
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
  console.log(`Database updated: ${updatedCount} indicators marked as tested`);

  // Log failures for review
  if (failed.length > 0) {
    console.log('');
    console.log('='.repeat(60));
    console.log('Failed Indicators (may need name corrections)');
    console.log('='.repeat(60));
    failed.forEach(f => {
      console.log(`  - ${f.name}`);
      if (f.error) {
        // Parse error to show relevant part
        try {
          const errData = JSON.parse(f.error);
          if (Array.isArray(errData) && errData[0]?.msg) {
            console.log(`    Error: ${errData[0].msg}`);
          }
        } catch {
          console.log(`    Error: ${f.error.substring(0, 80)}`);
        }
      }
    });
  }

  // Final stats
  console.log('');
  console.log('='.repeat(60));
  console.log('Final Database Stats');
  console.log('='.repeat(60));
  const finalTested = db.indicators.filter(i => i.tested).length;
  const finalUntested = db.indicators.filter(i => !i.tested).length;
  console.log(`Tested: ${finalTested}/${db.indicators.length}`);
  console.log(`Untested: ${finalUntested}`);
}

runTests().catch(console.error);
