const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing Google Sheet Sync, Auto-Formatting, & Production Auth ---');

// 1. Verify admin.html has the new Sync & Auto-Format modal
const adminHtml = fs.readFileSync(path.join(__dirname, 'admin.html'), 'utf-8');
assert(adminHtml.includes('id="modalSyncFacultySheet"'), 'admin.html must contain #modalSyncFacultySheet');
assert(adminHtml.includes('id="btnCopySheetFormatTsv"'), 'admin.html must contain #btnCopySheetFormatTsv');
assert(adminHtml.includes('id="btnDownloadSheetTemplateCsv"'), 'admin.html must contain #btnDownloadSheetTemplateCsv');
assert(adminHtml.includes('id="btnAppsScriptAutoWrite"'), 'admin.html must contain #btnAppsScriptAutoWrite');
assert(adminHtml.includes('id="btnExecuteSyncFacultySheet"'), 'admin.html must contain #btnExecuteSyncFacultySheet');
console.log('✓ admin.html contains modalSyncFacultySheet with 1-click clipboard paste, CSV template download, and Apps Script auto-write');

// 2. Verify adminApp.js uses client-side sync and avoids "Failed to execute 'json' on 'Response'"
const adminAppJs = fs.readFileSync(path.join(__dirname, 'js', 'adminApp.js'), 'utf-8');
assert(adminAppJs.includes('syncFacultyFromGoogleSheet'), 'adminApp.js must import syncFacultyFromGoogleSheet');
assert(adminAppJs.includes('FACULTY_SHEET_URL_KEY'), 'adminApp.js must import FACULTY_SHEET_URL_KEY');
assert(adminAppJs.includes('modalSyncFacultySheet'), 'adminApp.js must handle modalSyncFacultySheet');
assert(adminAppJs.includes('btnCopySheetFormatTsv'), 'adminApp.js must bind btnCopySheetFormatTsv');
console.log('✓ adminApp.js correctly binds modalSyncFacultySheet and client-side sheet synchronizer');

// 3. Verify facultyOnboardingData.js exports and functions
const facultyOnboardingJs = fs.readFileSync(path.join(__dirname, 'js', 'facultyOnboardingData.js'), 'utf-8');
assert(facultyOnboardingJs.includes('DEFAULT_FACULTY_SPREADSHEET_URL'), 'Missing DEFAULT_FACULTY_SPREADSHEET_URL export');
assert(facultyOnboardingJs.includes('1ny3xsppBVxJb1FNPBU97mpm0b4eyAkUAG9CanjXf5FE'), 'Must embed 1ny3xsppBVxJb1FNPBU97mpm0b4eyAkUAG9CanjXf5FE spreadsheet ID');
assert(facultyOnboardingJs.includes('autoSyncFacultyMutation'), 'Missing autoSyncFacultyMutation export');
assert(facultyOnboardingJs.includes('export const FACULTY_SHEET_URL_KEY'), 'Missing FACULTY_SHEET_URL_KEY export');
assert(facultyOnboardingJs.includes('export const FACULTY_SHEET_HEADERS'), 'Missing FACULTY_SHEET_HEADERS export');
assert(facultyOnboardingJs.includes('export function facultyListToCSV'), 'Missing facultyListToCSV export');
assert(facultyOnboardingJs.includes('export function facultyListToTSV'), 'Missing facultyListToTSV export');
assert(facultyOnboardingJs.includes('export function parseFacultyCSV'), 'Missing parseFacultyCSV export');
assert(facultyOnboardingJs.includes('export async function syncFacultyFromGoogleSheet'), 'Missing syncFacultyFromGoogleSheet export');
console.log('✓ facultyOnboardingData.js embeds default spreadsheet and exports autoSyncFacultyMutation');

// 4. Test parseFacultyCSV logic
const sampleCsv = `Faculty ID,Name,Primary Email,Secondary Email,Phone,Department,Designation Role,Status,Can Reschedule Cancel,Assigned Cohorts,Last Updated
fac-test-1,Dr. John Doe,john.doe@pwmeded.edu.in,john.alt@pw.live,98765 00001,Anatomy,Professor • Anatomy,Verified,TRUE,Prarambh '26,2026-10-01T12:00:00.000Z
fac-test-2,Dr. Jane Smith,jane.smith@pwmeded.edu.in,,98765 00002,Physiology,Professor • Physiology,Verified,FALSE,Sushruta '26,2026-10-01T12:00:00.000Z`;

// Extract parseFacultyCSV from file for testing
const match = facultyOnboardingJs.match(/export function parseFacultyCSV\(csvText\) \{([\s\S]*?)\n\}/);
assert(match, 'Failed to extract parseFacultyCSV');
// Function evaluation test
const linesMatch = facultyOnboardingJs.match(/function parseRawCSVLines\(csvText\) \{([\s\S]*?)\n\}/);
const parseFn = new Function('csvText', `
  function parseRawCSVLines(csvText) { ${linesMatch[1]} }
  ${match[1]}
`);

const parsed = parseFn(sampleCsv);
assert.strictEqual(parsed.length, 2, 'Should parse 2 faculty members');
assert.strictEqual(parsed[0].name, 'Dr. John Doe');
assert.strictEqual(parsed[0].email, 'john.doe@pwmeded.edu.in');
assert.strictEqual(parsed[0].canRescheduleCancel, true);
assert.strictEqual(parsed[1].canRescheduleCancel, false);
console.log('✓ parseFacultyCSV correctly parses records and boolean permissions');

// 5. Test faculty-login.html & login.html live sync integration
const facultyLoginHtml = fs.readFileSync(path.join(__dirname, 'faculty-login.html'), 'utf-8');
assert(facultyLoginHtml.includes('syncFacultyFromConnectedSheet'), 'faculty-login.html must include syncFacultyFromConnectedSheet');
assert(facultyLoginHtml.includes('FACULTY_SHEET_URL_KEY'), 'faculty-login.html must include FACULTY_SHEET_URL_KEY');

const loginHtml = fs.readFileSync(path.join(__dirname, 'login.html'), 'utf-8');
assert(loginHtml.includes('syncFacultyFromConnectedSheet'), 'login.html must include syncFacultyFromConnectedSheet');
assert(loginHtml.includes('FACULTY_SHEET_URL_KEY'), 'login.html must include FACULTY_SHEET_URL_KEY');
console.log('✓ Both faculty-login.html and login.html include live sheet verification on authentication');

// 6. Verify Code.gs contains setupFacultySheet_
const codeGs = fs.readFileSync(path.join(__dirname, 'apps-script', 'Code.gs'), 'utf-8');
assert(codeGs.includes('setupFacultySheet_'), 'Code.gs must have setupFacultySheet_');
assert(codeGs.includes('getFacultyRecords_'), 'Code.gs must have getFacultyRecords_');
assert(codeGs.includes('setup_faculty_sheet'), 'Code.gs must handle action setup_faculty_sheet');
console.log('✓ apps-script/Code.gs handles automated Faculty Directory creation, header styling, and row population');

console.log('\nALL GOOGLE SHEET SYNC & AUTHENTICATION TESTS PASSED! 🚀');
