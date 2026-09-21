const fs = require('fs');
const html = fs.readFileSync('admin.html', 'utf8');

console.log('--- Checking Modals in admin.html ---');
const modalIds = [
  'declineConfirmModal',
  'rescheduleModal',
  'rejectCancellationModal',
  'altSlotModal',
  'approveCancellationModal'
];

modalIds.forEach(id => {
  const regex = new RegExp(`id=["']${id}["']`, 'g');
  const count = (html.match(regex) || []).length;
  console.log(`Modal [${id}]: ${count} found`);
});

console.log('\n--- Checking Action Buttons & Inputs in admin.html ---');
const btnIds = [
  'closeDeclineIconBtn',
  'declineNoBtn',
  'declineModalBackdrop',
  'declineYesBtn',
  'closeRescheduleModalIconBtn',
  'rescheduleModalCancelBtn',
  'rescheduleModalBackdrop',
  'rescheduleModalDeclineBtn',
  'rescheduleModalConfirmBtn',
  'mon19SlotTrigger',
  'closeRejectModalIconBtn',
  'rejectCancelDismissBtn',
  'rejectModalBackdrop',
  'confirmRejectBtn',
  'rejectionReasonText',
  'closeAltSlotBtn',
  'altSlotBackdrop',
  'scheduleAltSlotBtn'
];

btnIds.forEach(id => {
  const regex = new RegExp(`id=["']${id}["']`, 'g');
  const count = (html.match(regex) || []).length;
  console.log(`Button/Input [${id}]: ${count} found`);
});
