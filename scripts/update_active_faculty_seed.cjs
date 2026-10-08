const fs = require('fs');
const activeList = JSON.parse(fs.readFileSync('data_faculty_onboarding.json', 'utf-8'));

// Convert to 2D array format for Apps Script
const seedRows = activeList.map(f => [
  f.id || '',
  f.name || '',
  f.email || '',
  f.secondaryEmail || '',
  f.phone || '',
  f.dept || 'Medical Sciences',
  f.role || 'Faculty',
  f.status || 'Verified',
  f.canRescheduleCancel !== false ? 'TRUE' : 'FALSE',
  Array.isArray(f.cohorts) ? f.cohorts.join('; ') : (f.cohorts || "Prarambh '26"),
  f.lastUpdated || new Date().toISOString()
]);

let content = fs.readFileSync('apps-script/Code.gs', 'utf-8');
const startMarker = 'var DEFAULT_FACULTY_SEED = [';
const endMarker = 'function setupFacultySheet_(body) {';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex >= 0 && endIndex > startIndex) {
  const newSeed = 'var DEFAULT_FACULTY_SEED = ' + JSON.stringify(seedRows, null, 2) + ';\n\n';
  content = content.slice(0, startIndex) + newSeed + content.slice(endIndex);
  fs.writeFileSync('apps-script/Code.gs', content, 'utf-8');
  console.log('Updated DEFAULT_FACULTY_SEED in apps-script/Code.gs with active', seedRows.length, 'records');
} else {
  console.error('Markers not found in apps-script/Code.gs');
}
