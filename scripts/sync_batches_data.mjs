import fs from 'fs';
import { processRawCSVToBatch } from '../js/sheetConnector.js';

const BATCHES_FILE = 'data_batches.json';
const DEFAULT_DATA_FILE = 'js/defaultData.js';

async function syncAll() {
  const batches = JSON.parse(fs.readFileSync(BATCHES_FILE, 'utf8'));
  console.log(`Starting sync for ${batches.length} batches...`);

  const updatedBatches = [];

  for (const b of batches) {
    console.log(`\nSyncing: "${b.name}" (${b.id})...`);
    const tab = b.sheetTabName || 'Lecture Planner';
    const url = `http://localhost:5173/api/fetch-sheet?url=${encodeURIComponent(b.sourceUrl)}&sheet=${encodeURIComponent(tab)}`;
    
    try {
      const res = await fetch(url);
      const csv = await res.text();
      if (!res.ok || csv.startsWith('{"error"')) {
        console.error(`  -> Failed fetch: ${csv}`);
        updatedBatches.push(b);
        continue;
      }
      const processed = processRawCSVToBatch(csv, b.id, b.sourceUrl, tab);
      console.log(`  -> Batch Name (Row 1): "${processed.name}"`);
      console.log(`  -> Medium (Row 2): ${processed.platform} ("${processed.subtitle}")`);
      console.log(`  -> Events: ${processed.eventCount}`);
      
      // Preserve original batch properties if any
      processed.active = b.active !== false;
      processed.fromRegistry = Boolean(b.fromRegistry);
      if (b.publishedAt) processed.publishedAt = b.publishedAt;
      
      updatedBatches.push(processed);
    } catch (err) {
      console.error(`  -> Error: ${err.message}`);
      updatedBatches.push(b);
    }
  }

  // Save to data_batches.json
  fs.writeFileSync(BATCHES_FILE, JSON.stringify(updatedBatches, null, 2), 'utf8');
  console.log(`\nSaved updated batches to ${BATCHES_FILE}`);

  // Also update default batches in js/defaultData.js for initial loads
  const defaultBatchIds = ['batch-prarambh-2026', 'batch-sushruta-2026', 'batch-inicet-essentials-2026', 'batch-fmge-express-2026'];
  const newDefaults = updatedBatches.filter(b => defaultBatchIds.includes(b.id));
  if (newDefaults.length > 0) {
    const fileContent = `export const DEFAULT_BATCHES = ${JSON.stringify(newDefaults, null, 2)};\n`;
    fs.writeFileSync(DEFAULT_DATA_FILE, fileContent, 'utf8');
    console.log(`Updated ${DEFAULT_DATA_FILE} with refreshed default batches.`);
  }

  console.log('\n=== ALL BATCHES SUMMARY ===');
  updatedBatches.forEach((b, i) => {
    console.log(`${i+1}. [${b.platform.toUpperCase()}] "${b.name}" - ${b.eventCount} classes (${b.subtitle})`);
  });
}

syncAll();
