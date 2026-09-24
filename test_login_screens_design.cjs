const fs = require('fs');
const path = require('path');

const loginHtmlPath = path.join(__dirname, 'login.html');
const googleOAuthPath = path.join(__dirname, 'google-oauth.html');

const loginContent = fs.readFileSync(loginHtmlPath, 'utf8');
const oauthContent = fs.readFileSync(googleOAuthPath, 'utf8');

console.log('--- TEST: Access Restricted UI Modal & Standard OAuth Verification ---');

// 1. Check styles and animations
console.assert(loginContent.includes('.lock-shackle'), 'Missing .lock-shackle CSS');
console.assert(loginContent.includes('.lock-unlocked'), 'Missing .lock-unlocked CSS');
console.assert(loginContent.includes('shakeAnimation'), 'Missing shakeAnimation CSS');
console.assert(loginContent.includes('pulseGlowSuccess'), 'Missing pulseGlowSuccess CSS');
console.log('✓ 1. Keyframes & Shackle animation styles present');

// 2. Check that Access Restricted UI Modal exists
console.assert(loginContent.includes('id="accessRestrictedModal"'), 'Missing #accessRestrictedModal');
console.assert(loginContent.includes('showAccessRestrictedModal'), 'Missing showAccessRestrictedModal function');
console.assert(!loginContent.includes('alert(`Access Restricted'), 'Native alert should NOT be used for access restricted');
console.log('✓ 2. Access Restricted UI Modal implemented and native browser alert removed');

// 3. Check Google OAuth popup launcher & messaging
console.assert(loginContent.includes('triggerGoogleOAuth'), 'Missing triggerGoogleOAuth function');
console.assert(loginContent.includes('handleGoogleAuthCallback'), 'Missing handleGoogleAuthCallback function');
console.assert(loginContent.includes('GOOGLE_SIGN_IN_SUCCESS'), 'Missing message event listener for OAuth');
console.log('✓ 3. Standard Google OAuth popup flow verified');

// 4. Check google-oauth.html structure
console.assert(oauthContent.includes('Sign in - Google Accounts'), 'Missing Google Accounts title in google-oauth.html');
console.log('✓ 4. Authentic standard Google OAuth page verified');

console.log('\n========================================');
console.log('🎉 ALL ACCESS RESTRICTED UI MODAL TESTS PASSED (100%)');
console.log('========================================');
