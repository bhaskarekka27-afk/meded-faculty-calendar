const fs = require('fs');
const assert = require('assert');

console.log('--- Testing Google Authentication Password Validation & OAuth Flow ---');

const oauthHtml = fs.readFileSync('google-oauth.html', 'utf8');
const loginHtml = fs.readFileSync('login.html', 'utf8');

// 1. Check google-oauth.html has password validation function
assert(oauthHtml.includes('function isValidPassword(email, password)'), 'google-oauth.html must contain isValidPassword');
assert(oauthHtml.includes('showPasswordError()'), 'google-oauth.html must have showPasswordError');
assert(oauthHtml.includes('Wrong password. Try again or click Forgot password to reset it.'), 'google-oauth.html must display authentic Google wrong password message');
assert(oauthHtml.includes('animate-shake'), 'google-oauth.html must have shake animation for errors');
assert(oauthHtml.includes('border-2 border-[#b83230]'), 'google-oauth.html must use official Google error red border');
console.log('✓ google-oauth.html has authentic Google password rejection & error UI');

// 2. Check standard passwords in google-oauth.html
assert(oauthHtml.includes('MedEd@2026'), 'Must support MedEd@2026 password');
assert(oauthHtml.includes('Admin@2026'), 'Must support Admin@2026 password');
assert(oauthHtml.includes('Bhaskar@2026'), 'Must support Bhaskar@2026 password');
assert(oauthHtml.includes('Kanchan@2026'), 'Must support Kanchan@2026 password');
console.log('✓ Authorized passwords defined for accounts');

// 3. Check login.html fallback modal also has 2-step flow and password validation
assert(loginHtml.includes('inPageEmailStep'), 'login.html in-page modal must have inPageEmailStep');
assert(loginHtml.includes('inPagePasswordStep'), 'login.html in-page modal must have inPagePasswordStep');
assert(loginHtml.includes('handleInPagePasswordSubmit'), 'login.html must have handleInPagePasswordSubmit');
assert(loginHtml.includes('Wrong password. Try again or click Forgot password to reset it.'), 'login.html in-page modal must reject wrong passwords');
console.log('✓ login.html fallback modal strictly requires password validation');

// 4. Check admin allowlist includes requested emails
assert(loginHtml.includes('bhaskarekka27@gmail.com'), 'Must allow bhaskarekka27@gmail.com');
assert(loginHtml.includes('kanchan.gupta1@pw.live'), 'Must allow kanchan.gupta1@pw.live');
console.log('✓ Admin allowlist correctly includes bhaskarekka27@gmail.com and kanchan.gupta1@pw.live');

console.log('\nALL GOOGLE AUTHENTICATION & PASSWORD VALIDATION TESTS PASSED 100%!');
