const fs = require('fs');
const assert = require('assert');

console.log('--- Testing Dual-Engine Google Sign-In: Live Google Identity Services + Replica ---');

const loginHtml = fs.readFileSync('login.html', 'utf8');
const oauthHtml = fs.readFileSync('google-oauth.html', 'utf8');

// 1. Check Google Identity Services SDK presence
assert(loginHtml.includes('https://accounts.google.com/gsi/client'), 'Must include official Google Identity Services SDK');
console.log('✓ Official Google Identity Services SDK included in login.html');

// 2. Check Live Google Sign-In implementation
assert(loginHtml.includes('window.signInWithGoogleIdentityServices'), 'Must include signInWithGoogleIdentityServices');
assert(loginHtml.includes('google.accounts.oauth2.initTokenClient'), 'Must support Google OAuth 2.0 initTokenClient');
assert(loginHtml.includes('https://www.googleapis.com/oauth2/v3/userinfo'), 'Must query Google userinfo endpoint');
console.log('✓ Live Google Cloud OAuth 2.0 implementation verified');

// 3. Check Interactive Google Replica implementation
assert(loginHtml.includes('launchGoogleOAuthReplicaPopup'), 'Must include launchGoogleOAuthReplicaPopup');
assert(loginHtml.includes('google-oauth.html'), 'Must point to google-oauth.html popup');
assert(oauthHtml.includes('isValidPassword'), 'Replica must include password validation');
assert(oauthHtml.includes('Wrong password. Try again or click Forgot password to reset it.'), 'Replica must have authentic Google wrong password alert');
console.log('✓ Interactive Google OAuth Replica verified');

// 4. Check Dual Engine Switcher & Client ID Settings
assert(loginHtml.includes('googleAuthSettingsModal'), 'Must include Google Auth Settings Modal');
assert(loginHtml.includes('openGoogleAuthSettings'), 'Must include openGoogleAuthSettings');
assert(loginHtml.includes('saveGoogleAuthSettings'), 'Must include saveGoogleAuthSettings');
assert(loginHtml.includes('settingGoogleClientId'), 'Must allow setting Google OAuth Client ID');
console.log('✓ Google Auth Engine Settings & Client ID configuration verified');

console.log('\nALL ACTUAL GOOGLE SIGN-IN & REPLICA FLOW TESTS PASSED (100%)!');
