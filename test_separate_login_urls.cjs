const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('--- Testing Dedicated Separate Login URLs & Layouts ---');

// 1. Verify admin-login.html
const adminLoginHtml = fs.readFileSync(path.join(__dirname, 'admin-login.html'), 'utf8');
assert(adminLoginHtml.includes('ADMIN PORTAL'), 'admin-login.html must contain ADMIN PORTAL badge');
assert(!adminLoginHtml.includes('Live Google Cloud OAuth'), 'admin-login.html must NOT contain engine selection pills');
assert(!adminLoginHtml.includes('Switch to Faculty Portal'), 'admin-login.html must NOT contain switch link');
assert(adminLoginHtml.includes('adminLockIconContainer'), 'admin-login.html must have animated lock');
console.log('✓ admin-login.html verified (no switch link)');

// 2. Verify faculty-login.html
const facultyLoginHtml = fs.readFileSync(path.join(__dirname, 'faculty-login.html'), 'utf8');
assert(facultyLoginHtml.includes('FACULTY PORTAL'), 'faculty-login.html must contain FACULTY PORTAL badge');
assert(!facultyLoginHtml.includes('Live Google Cloud OAuth'), 'faculty-login.html must NOT contain engine selection pills');
assert(!facultyLoginHtml.includes('Switch to Admin Portal'), 'faculty-login.html must NOT contain switch link');
assert(facultyLoginHtml.includes('facultyLockIconContainer'), 'faculty-login.html must have animated lock');
assert(facultyLoginHtml.includes('reminderEmailService.findFacultyByEmail'), 'faculty-login.html must verify against faculty onboarding directory');
console.log('✓ faculty-login.html verified (no switch link)');

// 3. Verify vite.config.js routes & rollup inputs
const viteConfig = fs.readFileSync(path.join(__dirname, 'vite.config.js'), 'utf8');
assert(viteConfig.includes("adminLogin: resolve(__dirname, 'admin-login.html')"), 'vite.config.js must include adminLogin in rollup inputs');
assert(viteConfig.includes("facultyLogin: resolve(__dirname, 'faculty-login.html')"), 'vite.config.js must include facultyLogin in rollup inputs');
assert(viteConfig.includes("'/admin-login'"), 'vite.config.js must rewrite /admin-login');
assert(viteConfig.includes("'/faculty-login'"), 'vite.config.js must rewrite /faculty-login');
console.log('✓ vite.config.js entrypoints & route rewrites verified');

// 4. Verify server.cjs routes
const serverCjs = fs.readFileSync(path.join(__dirname, 'server.cjs'), 'utf8');
assert(serverCjs.includes("'/admin-login': '/admin-login.html'"), 'server.cjs must map /admin-login');
assert(serverCjs.includes("'/faculty-login': '/faculty-login.html'"), 'server.cjs must map /faculty-login');
console.log('✓ server.cjs clean routing verified');

// 5. Verify render.yaml rewrites
const renderYaml = fs.readFileSync(path.join(__dirname, 'render.yaml'), 'utf8');
assert(renderYaml.includes('source: /admin-login'), 'render.yaml must rewrite /admin-login');
assert(renderYaml.includes('source: /faculty-login'), 'render.yaml must rewrite /faculty-login');
console.log('✓ render.yaml deployment configuration verified');

console.log('\n ALL SEPARATE LOGIN URL TESTS PASSED SUCCESSFULLY! ');
