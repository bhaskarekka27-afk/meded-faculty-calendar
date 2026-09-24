const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Testing Official Google Identity Services SDK Flow on Both Logins ---');

const CLIENT_ID = '302077476293-d5a95de9spo7jt4gnvpbmdr71ha3qea4.apps.googleusercontent.com';

// 1. Admin Login
const adminHtml = fs.readFileSync(path.join(__dirname, 'admin-login.html'), 'utf8');
assert(adminHtml.includes('https://accounts.google.com/gsi/client'), 'admin-login.html must include Google Identity Services SDK');
assert(adminHtml.includes(CLIENT_ID), 'admin-login.html must configure the Google OAuth Client ID');
assert(adminHtml.includes('google.accounts.id.initialize'), 'admin-login.html must initialize GIS id');
assert(adminHtml.includes('google.accounts.oauth2.initTokenClient'), 'admin-login.html must initialize TokenClient');
assert(adminHtml.includes('tokenClient.requestAccessToken'), 'admin-login.html must request access token on button click');
console.log('✓ admin-login.html uses official Google Sign-In SDK & Token Client');

// 2. Faculty Login
const facultyHtml = fs.readFileSync(path.join(__dirname, 'faculty-login.html'), 'utf8');
assert(facultyHtml.includes('https://accounts.google.com/gsi/client'), 'faculty-login.html must include Google Identity Services SDK');
assert(facultyHtml.includes(CLIENT_ID), 'faculty-login.html must configure the Google OAuth Client ID');
assert(facultyHtml.includes('google.accounts.id.initialize'), 'faculty-login.html must initialize GIS id');
assert(facultyHtml.includes('google.accounts.oauth2.initTokenClient'), 'faculty-login.html must initialize TokenClient');
assert(facultyHtml.includes('tokenClient.requestAccessToken'), 'faculty-login.html must request access token on button click');
console.log('✓ faculty-login.html uses official Google Sign-In SDK & Token Client');

// 3. Login Switcher
const loginHtml = fs.readFileSync(path.join(__dirname, 'login.html'), 'utf8');
assert(loginHtml.includes('https://accounts.google.com/gsi/client'), 'login.html must include Google Identity Services SDK');
assert(loginHtml.includes(CLIENT_ID), 'login.html must configure the Google OAuth Client ID');
assert(loginHtml.includes('google.accounts.oauth2.initTokenClient'), 'login.html must initialize TokenClient');
console.log('✓ login.html uses official Google Sign-In SDK & Token Client');

console.log('\n ALL OFFICIAL GOOGLE IDENTITY SERVICES TESTS PASSED! ');
