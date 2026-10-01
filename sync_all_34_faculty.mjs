import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_FACULTY_ONBOARDING, facultyListToCSV, facultyListToTSV } from './js/facultyOnboardingData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(`Loaded ${DEFAULT_FACULTY_ONBOARDING.length} faculty records from facultyOnboardingData.js`);

// 1. Write data_faculty_onboarding.json
fs.writeFileSync(
  path.join(__dirname, 'data_faculty_onboarding.json'),
  JSON.stringify(DEFAULT_FACULTY_ONBOARDING, null, 2),
  'utf-8'
);
console.log(`✓ Updated data_faculty_onboarding.json with ${DEFAULT_FACULTY_ONBOARDING.length} records`);

// 2. Write data_faculty_onboarding.csv
const csvContent = facultyListToCSV(DEFAULT_FACULTY_ONBOARDING);
fs.writeFileSync(
  path.join(__dirname, 'data_faculty_onboarding.csv'),
  csvContent,
  'utf-8'
);
console.log(`✓ Updated data_faculty_onboarding.csv with ${DEFAULT_FACULTY_ONBOARDING.length} records`);

// 3. Write faculty_sheet_export.tsv
const tsvContent = facultyListToTSV(DEFAULT_FACULTY_ONBOARDING);
fs.writeFileSync(
  path.join(__dirname, 'faculty_sheet_export.tsv'),
  tsvContent,
  'utf-8'
);
console.log(`✓ Updated faculty_sheet_export.tsv with ${DEFAULT_FACULTY_ONBOARDING.length} records`);

// 4. Update DEFAULT_FACULTY_SEED in apps-script/Code.gs
const seedRows = DEFAULT_FACULTY_ONBOARDING.map(f => [
  f.id || '',
  f.name || '',
  f.email || '',
  f.secondaryEmail || '',
  f.phone || '',
  f.dept || '',
  f.role || '',
  f.status || 'Verified',
  f.canRescheduleCancel !== false ? 'TRUE' : 'FALSE',
  Array.isArray(f.cohorts) ? f.cohorts.join('; ') : (f.cohorts || "Prarambh '26"),
  f.lastUpdated || '2026-09-24T12:00:00.000Z'
]);

const codeGsPath = path.join(__dirname, 'apps-script', 'Code.gs');
let codeGs = fs.readFileSync(codeGsPath, 'utf-8');

const seedJs = 'var DEFAULT_FACULTY_SEED = ' + JSON.stringify(seedRows, null, 2) + ';';
codeGs = codeGs.replace(/var DEFAULT_FACULTY_SEED = \[[\s\S]*?\];/, seedJs);
fs.writeFileSync(codeGsPath, codeGs, 'utf-8');

console.log(`✓ Updated apps-script/Code.gs with all ${seedRows.length} records in DEFAULT_FACULTY_SEED`);
