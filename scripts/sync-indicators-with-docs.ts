/**
 * Sync Indicators Database with Documentation
 *
 * This script:
 * 1. Removes indicators not in the official documentation
 * 2. Fixes name mismatches
 * 3. Adds missing indicators from documentation
 */

import * as fs from 'fs';
import * as path from 'path';

// Official indicators from chart-img.com documentation
const OFFICIAL_INDICATORS = [
  // Trend Indicators
  { name: 'Arnaud Legoux Moving Average', category: 'Trend' },
  { name: 'Double EMA', category: 'Trend' },
  { name: 'Hull Moving Average', category: 'Trend' },
  { name: 'Ichimoku Cloud', category: 'Trend' },
  { name: 'Least Squares Moving Average', category: 'Trend' },
  { name: 'Linear Regression Curve', category: 'Trend' },
  { name: 'Linear Regression Slope', category: 'Trend' },
  { name: 'MA Cross', category: 'Trend' },
  { name: 'MA with EMA Cross', category: 'Trend' },
  { name: 'McGinley Dynamic', category: 'Trend' },
  { name: 'Moving Average', category: 'Trend' },
  { name: 'Moving Average Adaptive', category: 'Trend' },
  { name: 'Moving Average Channel', category: 'Trend' },
  { name: 'Moving Average Double', category: 'Trend' },
  { name: 'Moving Average Exponential', category: 'Trend' },
  { name: 'Moving Average Hamming', category: 'Trend' },
  { name: 'Moving Average Multiple', category: 'Trend' },
  { name: 'Moving Average Triple', category: 'Trend' },
  { name: 'Moving Average Weighted', category: 'Trend' },
  { name: 'Parabolic SAR', category: 'Trend' },
  { name: 'Smoothed Moving Average', category: 'Trend' },
  { name: 'Super Trend', category: 'Trend' },
  { name: 'Triple EMA', category: 'Trend' },
  { name: 'Williams Alligator', category: 'Trend' },

  // Momentum Indicators
  { name: 'Awesome Oscillator', category: 'Momentum' },
  { name: 'Chande Momentum Oscillator', category: 'Momentum' },
  { name: 'Commodity Channel Index', category: 'Momentum' },
  { name: 'Connors RSI', category: 'Momentum' },
  { name: 'Coppock Curve', category: 'Momentum' },
  { name: 'Detrended Price Oscillator', category: 'Momentum' },
  { name: 'MACD', category: 'Momentum' },
  { name: 'Momentum', category: 'Momentum' },
  { name: 'Price Oscillator', category: 'Momentum' },
  { name: 'Rate Of Change', category: 'Momentum' },
  { name: 'Relative Strength Index', category: 'Momentum' },
  { name: 'Relative Vigor Index', category: 'Momentum' },
  { name: 'SMI Ergodic Indicator/Oscillator', category: 'Momentum' },
  { name: 'Stochastic', category: 'Momentum' },
  { name: 'Stochastic RSI', category: 'Momentum' },
  { name: 'Trend Strength Index', category: 'Momentum' },
  { name: 'TRIX', category: 'Momentum' },
  { name: 'True Strength Index', category: 'Momentum' },
  { name: 'Ultimate Oscillator', category: 'Momentum' },
  { name: 'Williams %R', category: 'Momentum' },

  // Volume Indicators
  { name: 'Accumulation/Distribution', category: 'Volume' },
  { name: 'Chaikin Money Flow', category: 'Volume' },
  { name: 'Chaikin Oscillator', category: 'Volume' },
  { name: 'Ease of Movement', category: 'Volume' },
  { name: "Elder's Force Index", category: 'Volume' },
  { name: 'Klinger Oscillator', category: 'Volume' },
  { name: 'Money Flow Index', category: 'Volume' },
  { name: 'Net Volume', category: 'Volume' },
  { name: 'On Balance Volume', category: 'Volume' },
  { name: 'Price Volume Trend', category: 'Volume' },
  { name: 'Volume', category: 'Volume' },
  { name: 'Volume Oscillator', category: 'Volume' },
  { name: 'Volume Profile Visible Range', category: 'Volume' },
  { name: 'VWAP', category: 'Volume' },
  { name: 'VWMA', category: 'Volume' },

  // Volatility Indicators
  { name: 'Average True Range', category: 'Volatility' },
  { name: 'Bollinger Bands', category: 'Volatility' },
  { name: 'Bollinger Bands %B', category: 'Volatility' },
  { name: 'Bollinger Bands Width', category: 'Volatility' },
  { name: 'Chaikin Volatility', category: 'Volatility' },
  { name: 'Donchian Channels', category: 'Volatility' },
  { name: 'Envelopes', category: 'Volatility' },
  { name: 'Historical Volatility', category: 'Volatility' },
  { name: 'Keltner Channels', category: 'Volatility' },
  { name: 'Price Channel', category: 'Volatility' },
  { name: 'Standard Deviation', category: 'Volatility' },
  { name: 'Standard Error', category: 'Volatility' },
  { name: 'Standard Error Bands', category: 'Volatility' },
  { name: 'Volatility Close-to-Close', category: 'Volatility' },
  { name: 'Volatility Index', category: 'Volatility' },
  { name: 'Volatility O-H-L-C', category: 'Volatility' },
  { name: 'Volatility Zero Trend Close-to-Close', category: 'Volatility' },

  // Directional Indicators
  { name: 'Aroon', category: 'Directional' },
  { name: 'Average Directional Index', category: 'Directional' },
  { name: 'Balance of Power', category: 'Directional' },
  { name: 'Chande Kroll Stop', category: 'Directional' },
  { name: 'Directional Movement', category: 'Directional' },
  { name: 'Vortex Indicator', category: 'Directional' },

  // Market Breadth
  { name: 'Advance/Decline', category: 'Market Breadth' },
  { name: 'Majority Rule', category: 'Market Breadth' },

  // Other
  { name: 'Accumulative Swing Index', category: 'Other' },
  { name: 'Chop Zone', category: 'Other' },
  { name: 'Choppiness Index', category: 'Other' },
  { name: 'Fisher Transform', category: 'Other' },
  { name: 'Know Sure Thing', category: 'Other' },
  { name: 'Mass Index', category: 'Other' },
  { name: 'Williams Fractal', category: 'Other' },
  { name: 'Zig Zag', category: 'Other' },
];

// Name mappings (our DB name -> official name)
const NAME_MAPPINGS: Record<string, string> = {
  'ROC (Rate of Change)': 'Rate Of Change',
  'SMI Ergodic Indicator': 'SMI Ergodic Indicator/Oscillator',
  'Stochastic Oscillator': 'Stochastic',
  'Stochastic Momentum Index': 'Stochastic', // This was wrong, should be just "Stochastic"
};

function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
}

function syncDatabase() {
  const dbPath = path.join(process.cwd(), 'src/core/database/indicators.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

  const officialNames = new Set(OFFICIAL_INDICATORS.map(i => i.name.toLowerCase()));

  // Create a map of existing indicators by lowercase name
  const existingByName = new Map<string, any>();
  for (const ind of db.indicators) {
    existingByName.set(ind.name.toLowerCase(), ind);
  }

  // Also map by corrected names
  for (const [oldName, newName] of Object.entries(NAME_MAPPINGS)) {
    const existing = existingByName.get(oldName.toLowerCase());
    if (existing) {
      existingByName.set(newName.toLowerCase(), existing);
    }
  }

  const newIndicators: any[] = [];
  const added: string[] = [];
  const kept: string[] = [];
  const removed: string[] = [];

  // Process official indicators
  for (const official of OFFICIAL_INDICATORS) {
    const lowerName = official.name.toLowerCase();
    let existing = existingByName.get(lowerName);

    if (existing) {
      // Update name to match official and keep existing data
      const updated = {
        ...existing,
        name: official.name,
        category: official.category,
        id: generateId(official.name),
      };
      newIndicators.push(updated);
      kept.push(official.name);
    } else {
      // Create new indicator entry
      const newInd = {
        id: generateId(official.name),
        name: official.name,
        category: official.category,
        inputs: [],
        keywords: official.name.toLowerCase().split(/[\s\/]+/).filter(k => k.length > 1),
        tested: false,
        notes: 'Added from documentation - needs testing'
      };
      newIndicators.push(newInd);
      added.push(official.name);
    }
  }

  // Find removed indicators
  for (const ind of db.indicators) {
    const lowerName = ind.name.toLowerCase();
    const mappedName = NAME_MAPPINGS[ind.name]?.toLowerCase();

    if (!officialNames.has(lowerName) && (!mappedName || !officialNames.has(mappedName))) {
      removed.push(ind.name);
    }
  }

  // Update database
  db.indicators = newIndicators;
  db.totalCount = newIndicators.length;
  db.addedCount = newIndicators.length;
  db.lastUpdated = new Date().toISOString().split('T')[0];

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

  console.log('='.repeat(60));
  console.log('Database Sync Complete');
  console.log('='.repeat(60));
  console.log(`Total indicators: ${newIndicators.length}`);
  console.log('');

  console.log(`KEPT (${kept.length}):`);
  kept.forEach(k => console.log(`  ✅ ${k}`));

  console.log('');
  console.log(`ADDED (${added.length}):`);
  added.forEach(a => console.log(`  ➕ ${a}`));

  console.log('');
  console.log(`REMOVED (${removed.length}):`);
  removed.forEach(r => console.log(`  ❌ ${r}`));
}

syncDatabase();
