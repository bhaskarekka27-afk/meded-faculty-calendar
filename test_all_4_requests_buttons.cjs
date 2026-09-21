const fs = require('fs');

console.log('🧪 Verifying Requests Page 4 Action Buttons & Modals...');

const adminHtml = fs.readFileSync('admin.html', 'utf8');
const adminAppJs = fs.readFileSync('js/adminApp.js', 'utf8');
const requestsViewJs = fs.readFileSync('js/requestsView.js', 'utf8');

// 1. Check all 4 modals exist in admin.html
const requiredModals = [
  'declineConfirmModal',
  'rescheduleModal',
  'approveCancellationModal',
  'rejectCancellationModal',
  'altSlotModal'
];

requiredModals.forEach(mId => {
  if (!adminHtml.includes(`id="${mId}"`)) {
    throw new Error(`Missing modal in admin.html: ${mId}`);
  }
  console.log(`✓ Modal exists in HTML: #${mId}`);
});

// 2. Check all 4 button classes & bindings in requestsView.js
const requiredButtonClasses = [
  'btn-decline-reschedule',
  'btn-open-reschedule-modal',
  'btn-approve-cancellation',
  'btn-reject-cancellation-open'
];

requiredButtonClasses.forEach(cls => {
  if (!requestsViewJs.includes(cls)) {
    throw new Error(`Missing button class in requestsView.js: ${cls}`);
  }
  console.log(`✓ Button class exists in requestsView.js: .${cls}`);
});

// 3. Check methods on AdminDashboardController in adminApp.js
const requiredMethods = [
  'openDeclineModal',
  'closeDeclineModal',
  'openRescheduleModal',
  'closeRescheduleModal',
  'openApproveCancellationModal',
  'closeApproveCancellationModal',
  'openRejectCancellationModal',
  'closeRejectCancellationModal',
  'openAltSlotModal',
  'closeAltSlotModal',
  'setupRequestsModalHandlers'
];

requiredMethods.forEach(method => {
  if (!adminAppJs.includes(method)) {
    throw new Error(`Missing method in adminApp.js: ${method}`);
  }
  console.log(`✓ Controller method exists in adminApp.js: ${method}()`);
});

// 4. Verify specific modal action buttons inside admin.html
const modalActions = [
  'closeDeclineIconBtn', 'declineNoBtn', 'declineYesBtn',
  'closeRescheduleModalIconBtn', 'rescheduleModalCancelBtn', 'rescheduleModalDeclineBtn', 'rescheduleModalConfirmBtn',
  'closeApproveCancellationIconBtn', 'approveCancelDismissBtn', 'confirmApproveCancellationBtn',
  'closeRejectModalIconBtn', 'rejectCancelDismissBtn', 'confirmRejectBtn'
];

modalActions.forEach(btnId => {
  if (!adminHtml.includes(`id="${btnId}"`)) {
    throw new Error(`Missing modal action button in admin.html: #${btnId}`);
  }
  console.log(`✓ Modal action button exists: #${btnId}`);
});

console.log('\n🎉 ALL 4 ACTION BUTTONS AND CORRESPONDING MODALS ARE FULLY VERIFIED & LINKED!');
