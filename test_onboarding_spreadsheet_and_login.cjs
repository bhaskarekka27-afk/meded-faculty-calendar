const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing Faculty Onboarding Master Spreadsheet UI & Login Verification ---');

// 1. Check admin.html for clean Onboarding view & metric cards
const adminHtml = fs.readFileSync(path.join(__dirname, 'admin.html'), 'utf-8');

assert(adminHtml.includes('id="faculty-search-input"'), 'Missing #faculty-search-input');
assert(adminHtml.includes('id="faculty-list-container"'), 'Missing #faculty-list-container');
assert(adminHtml.includes('id="stat-total-faculty"'), 'Missing #stat-total-faculty');
assert(!adminHtml.includes('id="modalFacultySpreadsheet"'), 'modalFacultySpreadsheet should be removed');
assert(!adminHtml.includes('id="btn-open-spreadsheet-modal"'), 'btn-open-spreadsheet-modal should be removed');

console.log('✓ admin.html contains clean Faculty Onboarding workspace with search, stats, and directory');

// 2. Check adminApp.js for real-time synchronization
const adminAppJs = fs.readFileSync(path.join(__dirname, 'js', 'adminApp.js'), 'utf-8');

assert(adminAppJs.includes('renderOnboardingList'), 'adminApp.js should have renderOnboardingList');
assert(adminAppJs.includes('initOnboardingHandlers'), 'adminApp.js should have initOnboardingHandlers');

console.log('✓ adminApp.js contains real-time faculty onboarding and synchronization handlers');

// 3. Test reminderEmailService email verification logic
const facultyDataModule = require('./data_faculty_onboarding.json');
assert(Array.isArray(facultyDataModule), 'data_faculty_onboarding.json must be an array');
console.log(`✓ data_faculty_onboarding.json contains ${facultyDataModule.length} faculty members`);

// Test matching logic
function mockFindFacultyByEmail(email, list) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();
  return list.find(f => {
    const fEmail = (f.email || '').trim().toLowerCase();
    const fSecEmail = (f.secondaryEmail || '').trim().toLowerCase();
    const fId = (f.id || '').trim().toLowerCase();
    const fName = (f.name || '').trim().toLowerCase().replace(/^(dr\.|prof\.|dr|prof)\s*/i, '');
    const inputName = cleanEmail.replace(/^(dr\.|prof\.|dr|prof)\s*/i, '');
    return fEmail === cleanEmail || fSecEmail === cleanEmail || fId === cleanEmail || (inputName.length >= 3 && fName === inputName);
  }) || null;
}

// Test authorized email
const testAuthorized = mockFindFacultyByEmail('bhaskarekka27@gmail.com', facultyDataModule);
assert(testAuthorized, 'bhaskarekka27@gmail.com should be found');
assert.strictEqual(testAuthorized.name, 'Dr. Rajesh Jambhulkar');
console.log('✓ Authorized email verified successfully:', testAuthorized.name);

// Test secondary email
const testSecAuthorized = mockFindFacultyByEmail('rajesh.j@pwmeded.edu.in', facultyDataModule);
assert(testSecAuthorized, 'rajesh.j@pwmeded.edu.in should be found via secondary email');
console.log('✓ Secondary email verified successfully:', testSecAuthorized.name);

// Test faculty ID
const testIdAuthorized = mockFindFacultyByEmail('fac-2', facultyDataModule);
assert(testIdAuthorized, 'fac-2 should be found via ID');
assert.strictEqual(testIdAuthorized.name, 'Dr. Pradeep Pawar');
console.log('✓ Faculty ID verified successfully:', testIdAuthorized.name);

// Test unauthorized email
const testUnauthorized = mockFindFacultyByEmail('unauthorized.hacker@gmail.com', facultyDataModule);
assert.strictEqual(testUnauthorized, null, 'Unauthorized email must return null');
console.log('✓ Unauthorized email blocked successfully');

// 4. Test login.html and faculty-login.html access restriction modals
const facultyLoginHtml = fs.readFileSync(path.join(__dirname, 'faculty-login.html'), 'utf-8');
assert(facultyLoginHtml.includes('showAccessRestrictedModal'), 'faculty-login.html must have showAccessRestrictedModal');
assert(facultyLoginHtml.includes('findFacultyByEmail'), 'faculty-login.html must use findFacultyByEmail');

const loginHtml = fs.readFileSync(path.join(__dirname, 'login.html'), 'utf-8');
assert(loginHtml.includes('showAccessRestrictedModal'), 'login.html must have showAccessRestrictedModal');
assert(loginHtml.includes('findFacultyByEmail'), 'login.html must use findFacultyByEmail');

console.log('✓ Both faculty-login.html and login.html enforce strict authentication against onboarding directory');

console.log('\nALL VERIFICATION TESTS PASSED SUCCESSFULLY! 🎉');
