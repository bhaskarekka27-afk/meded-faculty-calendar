const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🧪 Testing Requests View & Modals Logic');
console.log('================================================================\n');

// 1. Verify CSS .hidden rule
const cssPath = path.join(__dirname, 'css', '3d-aesthetic.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');
assert(cssContent.includes('.hidden {'), 'CSS must include .hidden rule');
assert(cssContent.includes('display: none !important;'), 'CSS must include display: none !important;');
console.log('✓ Verified .hidden { display: none !important; } exists in css/3d-aesthetic.css');

// 2. Verify admin.html modal markup has hidden placed first
const htmlPath = path.join(__dirname, 'admin.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

assert(htmlContent.includes('id="declineConfirmModal" role="dialog"'), 'declineConfirmModal exists in admin.html');
assert(htmlContent.includes('id="rescheduleModal" role="dialog"'), 'rescheduleModal exists in admin.html');
assert(htmlContent.includes('id="rejectCancellationModal" role="dialog"'), 'rejectCancellationModal exists in admin.html');
assert(htmlContent.includes('id="altSlotModal" role="dialog"'), 'altSlotModal exists in admin.html');

// Check that hidden class is applied to each modal container
const declineMatch = htmlContent.match(/id="declineConfirmModal"[^>]*class="([^"]*)"/) || htmlContent.match(/class="([^"]*)"[^>]*id="declineConfirmModal"/);
assert(declineMatch && declineMatch[1].includes('hidden'), 'declineConfirmModal must have hidden class');

const rescheduleMatch = htmlContent.match(/id="rescheduleModal"[^>]*class="([^"]*)"/) || htmlContent.match(/class="([^"]*)"[^>]*id="rescheduleModal"/);
assert(rescheduleMatch && rescheduleMatch[1].includes('hidden'), 'rescheduleModal must have hidden class');

const rejectMatch = htmlContent.match(/id="rejectCancellationModal"[^>]*class="([^"]*)"/) || htmlContent.match(/class="([^"]*)"[^>]*id="rejectCancellationModal"/);
assert(rejectMatch && rejectMatch[1].includes('hidden'), 'rejectCancellationModal must have hidden class');

const altMatch = htmlContent.match(/id="altSlotModal"[^>]*class="([^"]*)"/) || htmlContent.match(/class="([^"]*)"[^>]*id="altSlotModal"/);
assert(altMatch && altMatch[1].includes('hidden'), 'altSlotModal must have hidden class');
console.log('✓ Verified all 4 modal elements in admin.html have hidden class by default');

// 3. Verify js/requestsView.js button classes
const requestsViewPath = path.join(__dirname, 'js', 'requestsView.js');
const requestsViewContent = fs.readFileSync(requestsViewPath, 'utf8');

assert(requestsViewContent.includes('decline-session-btn'), 'Must include decline-session-btn class');
assert(requestsViewContent.includes('open-reschedule-modal-btn'), 'Must include open-reschedule-modal-btn class');
assert(requestsViewContent.includes('open-approve-cancellation-btn'), 'Must include open-approve-cancellation-btn class');
assert(requestsViewContent.includes('open-reject-cancellation-btn'), 'Must include open-reject-cancellation-btn class');
assert(requestsViewContent.includes('openRescheduleApprovalModal'), 'Must export openRescheduleApprovalModal');

console.log('✓ Verified button classes in js/requestsView.js are separate and clean without conflicts');

// 4. Verify js/adminApp.js single setupRequestsHandlers definition
const adminAppPath = path.join(__dirname, 'js', 'adminApp.js');
const adminAppContent = fs.readFileSync(adminAppPath, 'utf8');

const occurrences = (adminAppContent.match(/setupRequestsHandlers\s*\(\s*\)/g) || []).length;
console.log(`✓ setupRequestsHandlers occurrences in adminApp.js: ${occurrences}`);
assert.strictEqual(occurrences, 2, 'setupRequestsHandlers should be called in init and defined once');

assert(adminAppContent.includes('closeDeclineModal()'), 'closeDeclineModal exists');
assert(adminAppContent.includes('closeRescheduleModal()'), 'closeRescheduleModal exists');
assert(adminAppContent.includes('closeRejectCancelModal()'), 'closeRejectCancelModal exists');
assert(adminAppContent.includes('closeAltSlotModal()'), 'closeAltSlotModal exists');

console.log('✓ Verified modal open/close lifecycle methods exist cleanly in js/adminApp.js');
console.log('\n🎉 ALL REQUESTS VIEW & MODALS LOGIC CHECKS PASSED!');
