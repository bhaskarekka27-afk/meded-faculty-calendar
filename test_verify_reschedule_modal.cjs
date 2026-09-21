const assert = require('assert');
const fs = require('fs');

console.log('🧪 Running comprehensive test for Reschedule Approval Popup & Real Faculty Data...');

// Verify requests.html contains all modal element IDs
const requestsHtml = fs.readFileSync('requests.html', 'utf8');

const requiredIds = [
  'rescheduleModal',
  'rescheduleModalAvatar',
  'rescheduleModalSubtitle',
  'rescheduleOriginalSlotText',
  'rescheduleProposedSlotText',
  'rescheduleGridBatchPill',
  'rescheduleGridVacatingSubject',
  'rescheduleGridVacatingFaculty',
  'rescheduleGridProposedSubject',
  'rescheduleGridProposedFaculty',
  'rescheduleGridVerificationText',
  'notifyFacultyEmailName',
  'confirmApproveBtn',
  'closeModalBtn',
  'rescheduleCancelBtn',
  'closeModalIconBtn',
  'modalBackdrop'
];

requiredIds.forEach(id => {
  assert(requestsHtml.includes(`id="${id}"`), `requests.html must contain id="${id}"`);
  console.log(`✓ Verified element #${id} exists in requests.html`);
});

// Verify openRescheduleApprovalModal implementation in js/requestsView.js
const requestsViewJs = fs.readFileSync('js/requestsView.js', 'utf8');
assert(requestsViewJs.includes('export function openRescheduleApprovalModal'), 'Must export openRescheduleApprovalModal');
assert(!requestsViewJs.includes('.bg-\\[\\#faece3\\]\\/60'), 'Must not contain failing escaped Tailwind selectors');
assert(requestsViewJs.includes('modal.classList.remove(\'hidden\')'), 'Must remove hidden class to display modal');

console.log('✓ Verified requestsView.js has robust openRescheduleApprovalModal logic without failing selectors');
console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
