import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { DEFAULT_FACULTY_ONBOARDING } from '../js/facultyOnboardingData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const jsonPath = path.join(__dirname, '..', 'data_faculty_onboarding.json');
const csvPath = path.join(__dirname, '..', 'data_faculty_onboarding.csv');

fs.writeFileSync(jsonPath, JSON.stringify(DEFAULT_FACULTY_ONBOARDING, null, 2), 'utf-8');

const headers = ['Faculty ID', 'Name', 'Primary Email', 'Secondary Email', 'Phone', 'Department', 'Designation Role', 'Status', 'Can Reschedule Cancel', 'Assigned Cohorts', 'Last Updated'];
const escapeCsv = (val) => {
  if (val === null || val === undefined) return '""';
  const str = String(val);
  return '"' + str.replace(/"/g, '""') + '"';
};

const rows = [headers.join(',')];
for (const f of DEFAULT_FACULTY_ONBOARDING) {
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
    escapeCsv(f.lastUpdated || new Date().toISOString())
  ];
  rows.push(row.join(','));
}
fs.writeFileSync(csvPath, rows.join('\r\n'), 'utf-8');
console.log(`✅ Generated data_faculty_onboarding.json (${DEFAULT_FACULTY_ONBOARDING.length} entries) and data_faculty_onboarding.csv`);
