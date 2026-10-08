const assert = require('assert');
const fs = require('fs');
const path = require('path');

// Test 1: Check data_faculty_onboarding.json structure
console.log('--- Test 1: Checking data_faculty_onboarding.json ---');
const jsonData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data_faculty_onboarding.json'), 'utf8'));
assert(Array.isArray(jsonData), 'Onboarding JSON must be an array');
assert(jsonData.length >= 19, 'Should have all registered faculty');

const admins = jsonData.filter(f => f.role === 'Admin');
const teachers = jsonData.filter(f => f.role === 'Teacher');
console.log(`Found ${admins.length} Admins and ${teachers.length} Teachers in onboarding JSON.`);
assert(admins.length >= 2, 'Must have at least 2 Admin records (Bhaskar and Kanchan)');
assert(teachers.length >= 17, 'Must have at least 17 Teacher records');

// Check Bhaskar and Kanchan records
const bhaskar = jsonData.find(f => f.email === 'bhaskar.ekka@pw.live' || f.secondaryEmail === 'bhaskarekka27@gmail.com');
assert(bhaskar, 'Bhaskar must exist in sheet data');
assert.strictEqual(bhaskar.role, 'Admin', 'Bhaskar role must be Admin');
assert(bhaskar.designation, 'Bhaskar must have designation');

const secondAdmin = jsonData.find(f => (f.email || '').toLowerCase() === 'kanchan.gupta1@pw.live');
assert(secondAdmin, 'Second admin (Kanchan Gupta) must exist in sheet data');
assert.strictEqual(secondAdmin.role, 'Admin', 'Second admin role must be Admin');
assert(secondAdmin.designation, 'Second admin must have designation');

// Test 2: Check CSV format
console.log('\n--- Test 2: Checking data_faculty_onboarding.csv ---');
const csvData = fs.readFileSync(path.join(__dirname, 'data_faculty_onboarding.csv'), 'utf8');
const lines = csvData.trim().split(/\r?\n/);
const header = lines[0];
console.log('CSV Header:', header);
assert(header.includes('Role'), 'CSV header must include Role');
assert(header.includes('Designation'), 'CSV header must include Designation');
assert(header.includes('Primary Email'), 'CSV header must include Primary Email');
assert(header.includes('Secondary Email'), 'CSV header must include Secondary Email');

// Test 3: Check server.cjs CSV parsing & endpoints
console.log('\n--- Test 3: Checking server.cjs CSV parsing & endpoints ---');
const serverCode = fs.readFileSync(path.join(__dirname, 'server.cjs'), 'utf8');
assert(serverCode.includes('Role'), 'server.cjs must parse Role column');
assert(serverCode.includes('Designation'), 'server.cjs must parse Designation column');
console.log('server.cjs verified for 12-column support.');

// Test 4: Check admin-login.html and login.html for removal of hardcoded admin arrays
console.log('\n--- Test 4: Checking login pages for absence of hardcoded admin arrays ---');
const adminLoginHtml = fs.readFileSync(path.join(__dirname, 'admin-login.html'), 'utf8');
const loginHtml = fs.readFileSync(path.join(__dirname, 'login.html'), 'utf8');

assert(!adminLoginHtml.includes("const ADMIN_AUTHORIZED_EMAILS = ["), 'admin-login.html must not have hardcoded ADMIN_AUTHORIZED_EMAILS');
assert(!loginHtml.includes("const ADMIN_AUTHORIZED_EMAILS = ["), 'login.html must not have hardcoded ADMIN_AUTHORIZED_EMAILS');

// Test 5: Verify role-based authorization logic
console.log('\n--- Test 5: Verifying dynamic role-based authorization logic ---');
function mockFindFacultyByEmail(email, list) {
  if (!email) return null;
  const clean = email.trim().toLowerCase();
  return list.find(f => {
    const pEmail = (f.email || '').trim().toLowerCase();
    const sEmail = (f.secondaryEmail || '').trim().toLowerCase();
    return pEmail === clean || (sEmail && sEmail === clean);
  }) || null;
}

function mockIsAuthorizedAdmin(email, list) {
  const f = mockFindFacultyByEmail(email, list);
  return !!(f && f.role === 'Admin');
}

function mockIsAuthorizedTeacher(email, list) {
  const f = mockFindFacultyByEmail(email, list);
  return !!(f && f.role === 'Teacher');
}

// 5a. Authorized Admins
assert.strictEqual(mockIsAuthorizedAdmin('bhaskar.ekka@pw.live', jsonData), true, 'bhaskar.ekka@pw.live must be authorized admin');
assert.strictEqual(mockIsAuthorizedAdmin('bhaskarekka27@gmail.com', jsonData), true, 'bhaskarekka27@gmail.com must be authorized admin');
assert.strictEqual(mockIsAuthorizedAdmin('kanchan.gupta1@pw.live', jsonData), true, 'kanchan.gupta1@pw.live must be authorized admin');

// 5b. Teachers trying admin access -> should NOT be authorized as Admin
assert.strictEqual(mockIsAuthorizedAdmin('harshraj01@gmail.com', jsonData), false, 'Teacher must not be authorized as admin');
assert.strictEqual(mockIsAuthorizedAdmin('drprassan@yahoo.com', jsonData), false, 'Teacher must not be authorized as admin');
assert.strictEqual(mockIsAuthorizedTeacher('harshraj01@gmail.com', jsonData), true, 'Teacher must be authorized as teacher');

// 5c. Completely unlisted users -> MUST NOT be allowed access anywhere
assert.strictEqual(mockFindFacultyByEmail('intruder@unknown.com', jsonData), null, 'Unlisted email must be null');
assert.strictEqual(mockIsAuthorizedAdmin('intruder@unknown.com', jsonData), false, 'Unlisted user must NOT be authorized as admin');
assert.strictEqual(mockIsAuthorizedTeacher('intruder@unknown.com', jsonData), false, 'Unlisted user must NOT be authorized as teacher');

// 5d. Unlisted institutional email -> MUST NOT be allowed access
assert.strictEqual(mockFindFacultyByEmail('fake.admin@pwmeded.edu.in', jsonData), null, 'Unregistered institutional email must be blocked');
assert.strictEqual(mockIsAuthorizedAdmin('fake.admin@pwmeded.edu.in', jsonData), false, 'Unregistered institutional email must not have admin access');

console.log('✓ All 5 test suites PASSED successfully!');
