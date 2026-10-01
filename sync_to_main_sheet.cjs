/**
 * Direct TSV / CSV / Apps Script Generator to sync 34 Faculty records
 * into the main Google Sheet:
 * https://docs.google.com/spreadsheets/d/1ny3xsppBVxJb1FNPBU97mpm0b4eyAkUAG9CanjXf5FE/edit?gid=0#gid=0
 */
const fs = require('fs');
const path = require('path');

const HEADERS = [
  'Faculty ID',
  'Name',
  'Primary Email',
  'Secondary Email',
  'Phone',
  'Department',
  'Designation Role',
  'Status',
  'Can Reschedule Cancel',
  'Assigned Cohorts',
  'Last Updated'
];

const facultyList = JSON.parse(fs.readFileSync(path.join(__dirname, 'data_faculty_onboarding.json'), 'utf-8'));

function generateTSV(list) {
  const rows = [HEADERS.join('\t')];
  for (const f of list) {
    const row = [
      f.id || '',
      f.name || '',
      f.email || '',
      f.secondaryEmail || '',
      f.phone || '',
      f.dept || '',
      f.role || '',
      f.status || 'Verified',
      f.canRescheduleCancel !== false ? 'TRUE' : 'FALSE',
      Array.isArray(f.cohorts) ? f.cohorts.join('; ') : (f.cohorts || ''),
      f.lastUpdated || new Date().toISOString()
    ];
    rows.push(row.join('\t'));
  }
  return rows.join('\r\n');
}

const tsvContent = generateTSV(facultyList);
fs.writeFileSync(path.join(__dirname, 'faculty_sheet_export.tsv'), tsvContent, 'utf-8');

console.log(`✓ Exported ${facultyList.length} faculty entries to faculty_sheet_export.tsv`);
console.log('--- Ready for 1-Click Paste into Google Sheet (A1) ---');
