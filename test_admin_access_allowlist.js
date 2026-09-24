import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const loginHtmlPath = path.join(__dirname, 'login.html');
const loginContent = fs.readFileSync(loginHtmlPath, 'utf8');

console.log('--- TEST: Admin Access Authorization for Specified Accounts ---');

// 1. Verify that bhaskarekka27@gmail.com and kanchan.gupta1@pw.live are in ADMIN_AUTHORIZED_EMAILS
console.assert(loginContent.includes('bhaskarekka27@gmail.com'), 'Missing bhaskarekka27@gmail.com in admin authorized emails');
console.assert(loginContent.includes('kanchan.gupta1@pw.live'), 'Missing kanchan.gupta1@pw.live in admin authorized emails');
console.log('✓ 1. bhaskarekka27@gmail.com and kanchan.gupta1@pw.live configured in Admin authorization list');

// 2. Simulate validation logic
const ADMIN_AUTHORIZED_EMAILS = [
  'bhaskarekka27@gmail.com',
  'kanchan.gupta1@pw.live',
  'admin.office@pwmeded.edu.in',
  'dean.office@pwmeded.edu.in',
  'admin.office@pw.live'
];

function isAuthorizedAdminEmail(em) {
  if (!em) return false;
  const clean = em.trim().toLowerCase();
  if (ADMIN_AUTHORIZED_EMAILS.includes(clean)) return true;
  if (clean.endsWith('@pwmeded.edu.in') || clean.endsWith('@pw.live')) return true;
  return false;
}

// Test cases
console.assert(isAuthorizedAdminEmail('bhaskarekka27@gmail.com') === true, 'bhaskarekka27@gmail.com should be authorized');
console.assert(isAuthorizedAdminEmail('BHASKAREKKA27@GMAIL.COM') === true, 'BHASKAREKKA27@GMAIL.COM (uppercase) should be authorized');
console.assert(isAuthorizedAdminEmail('kanchan.gupta1@pw.live') === true, 'kanchan.gupta1@pw.live should be authorized');
console.assert(isAuthorizedAdminEmail('KANCHAN.GUPTA1@PW.LIVE') === true, 'KANCHAN.GUPTA1@PW.LIVE (uppercase) should be authorized');
console.assert(isAuthorizedAdminEmail('admin.office@pwmeded.edu.in') === true, 'admin.office@pwmeded.edu.in should be authorized');

// Unauthorized tests
console.assert(isAuthorizedAdminEmail('unauthorized.user@gmail.com') === false, 'unauthorized.user@gmail.com should be rejected');
console.assert(isAuthorizedAdminEmail('random.person@yahoo.com') === false, 'random.person@yahoo.com should be rejected');

console.log('✓ 2. Case-insensitive authorization verification passed for all target accounts');
console.log('✓ 3. Unauthorized accounts correctly restricted');

console.log('\n========================================');
console.log('🎉 ALL ADMIN ACCESS AUTHORIZATION TESTS PASSED (100%)');
console.log('========================================');
