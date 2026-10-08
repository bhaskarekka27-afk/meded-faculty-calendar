const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const tsvFile = path.join(rootDir, 'faculty_sheet_export.tsv');
const tsvContent = fs.readFileSync(tsvFile, 'utf-8');

const lines = tsvContent.trim().split(/\r?\n/);
const list = [];

for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split('\t').map(p => p.trim());
  if (!parts[1]) continue;
  list.push({
    id: parts[0] || (`fac-${i}`),
    name: parts[1],
    email: parts[2] || '',
    secondaryEmail: parts[3] || '',
    phone: parts[4] || '98765 43210',
    dept: parts[5] || 'Medical Sciences',
    role: parts[6] || (`Professor • ${parts[5] || 'Medical Sciences'}`),
    status: parts[7] || 'Verified',
    canRescheduleCancel: parts[8] !== 'FALSE',
    cohorts: parts[9] ? parts[9].split(';').map(c => c.trim()).filter(Boolean) : ["Prarambh '26"],
    lastUpdated: parts[10] || '2026-09-24T12:00:00.000Z'
  });
}

console.log(`Parsed ${list.length} faculty members from TSV.`);

// 1. Write data_faculty_onboarding.json
const jsonPath = path.join(rootDir, 'data_faculty_onboarding.json');
fs.writeFileSync(jsonPath, JSON.stringify(list, null, 2), 'utf-8');
console.log('✓ Updated data_faculty_onboarding.json');

// 2. Write data_faculty_onboarding.csv
function facultyListToCSV(facultyList) {
  const headers = ['Faculty ID', 'Name', 'Primary Email', 'Secondary Email', 'Phone', 'Department', 'Designation Role', 'Status', 'Can Reschedule Cancel', 'Assigned Cohorts', 'Last Updated'];
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = [headers.join(',')];
  for (const f of facultyList) {
    const row = [
      escapeCsv(f.id || ''),
      escapeCsv(f.name || ''),
      escapeCsv(f.email || ''),
      escapeCsv(f.secondaryEmail || ''),
      escapeCsv(f.phone || ''),
      escapeCsv(f.dept || ''),
      escapeCsv(f.role || ''),
      escapeCsv(f.status || 'Verified'),
      escapeCsv(f.canRescheduleCancel !== false ? 'TRUE' : 'FALSE'),
      escapeCsv(Array.isArray(f.cohorts) ? f.cohorts.join('; ') : (f.cohorts || '')),
      escapeCsv(f.lastUpdated || '2026-09-24T12:00:00.000Z')
    ];
    rows.push(row.join(','));
  }
  return rows.join('\r\n');
}

const csvPath = path.join(rootDir, 'data_faculty_onboarding.csv');
fs.writeFileSync(csvPath, facultyListToCSV(list), 'utf-8');
console.log('✓ Updated data_faculty_onboarding.csv');

// 3. Update js/facultyOnboardingData.js DEFAULT_FACULTY_ONBOARDING
const onboardingJsPath = path.join(rootDir, 'js', 'facultyOnboardingData.js');
let onboardingJs = fs.readFileSync(onboardingJsPath, 'utf-8');
const replacementBlock = `export const DEFAULT_FACULTY_ONBOARDING = ${JSON.stringify(list, null, 2)};`;
onboardingJs = onboardingJs.replace(/export const DEFAULT_FACULTY_ONBOARDING = \[[\s\S]*?\n\];/, replacementBlock);
fs.writeFileSync(onboardingJsPath, onboardingJs, 'utf-8');
console.log('✓ Updated js/facultyOnboardingData.js');

// 4. Update apps-script/Code.gs DEFAULT_FACULTY_SEED
const seedRows = list.map(f => [
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

const codeGsPath = path.join(rootDir, 'apps-script', 'Code.gs');
let codeGs = fs.readFileSync(codeGsPath, 'utf-8');
const seedJs = 'var DEFAULT_FACULTY_SEED = ' + JSON.stringify(seedRows, null, 2) + ';';
codeGs = codeGs.replace(/var DEFAULT_FACULTY_SEED = \[[\s\S]*?\n\];/, seedJs);
fs.writeFileSync(codeGsPath, codeGs, 'utf-8');
console.log('✓ Updated apps-script/Code.gs with all 34 faculty records');
