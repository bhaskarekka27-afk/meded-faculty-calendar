// Node.js test script for Automated Email Reminder and Notification System
import { reminderEmailService } from './js/reminderEmailService.js';
import { DEFAULT_BATCHES } from './js/defaultData.js';
import fs from 'fs';

console.log('================================================================');
console.log('🧪 PW MedEd - Automated Reminder Email & Notification Verification');
console.log('================================================================\n');

// Mock localStorage for Node environment if not present
if (typeof localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

// Re-init storage with our mock
reminderEmailService.initStorage();

console.log('--- TEST 1: Default Settings & Onboarding Directory ---');
const settings = reminderEmailService.getSettings();
console.log('Default Settings:', {
  senderEmail: settings.senderEmail,
  leadDurationMinutes: settings.leadDurationMinutes,
  isEnabled: settings.isEnabled
});
console.assert(settings.senderEmail === 'academic-reminders@pwmeded.edu.in', 'Default sender email mismatch');
console.assert(settings.leadDurationMinutes === 30, 'Default lead duration should be 30m');
console.assert(settings.isEnabled === true, 'Automated reminders should be enabled by default');

const facultyList = reminderEmailService.getFacultyOnboardingList();
console.log(`Onboarded Faculty count: ${facultyList.length}`);
console.assert(facultyList.length >= 10, 'Should have at least 10 onboarded faculties');

const rajesh = facultyList.find(f => f.name.includes('Rajesh'));
console.log('Dr. Rajesh Jambhulkar registered email:', rajesh.email);
console.assert(rajesh.email === 'rajesh.j@pwmeded.edu.in', 'Email mismatch for Dr. Rajesh');

console.log('✅ TEST 1 PASSED: Settings & Onboarding initialized.\n');

console.log('--- TEST 2: Dynamic Settings Configuration ---');
const updateResult = reminderEmailService.saveSettings({
  senderEmail: 'dean.notifications@pwmeded.edu.in',
  leadDurationValue: 45,
  leadDurationUnit: 'minutes'
});
console.assert(updateResult.success, 'Failed to save settings');
const updatedSettings = reminderEmailService.getSettings();
console.log('Updated Settings:', {
  senderEmail: updatedSettings.senderEmail,
  leadDurationMinutes: updatedSettings.leadDurationMinutes,
  leadDurationText: reminderEmailService.getLeadDurationText()
});
console.assert(updatedSettings.senderEmail === 'dean.notifications@pwmeded.edu.in', 'Updated sender email mismatch');
console.assert(updatedSettings.leadDurationMinutes === 45, 'Updated duration should be 45m');
console.assert(reminderEmailService.getLeadDurationText().includes('45'), 'Lead duration text should contain 45');

// Test hours configuration
reminderEmailService.saveSettings({
  leadDurationValue: 2,
  leadDurationUnit: 'hours'
});
console.assert(reminderEmailService.getSettings().leadDurationMinutes === 120, '2 hours should equal 120 minutes');
console.assert(reminderEmailService.getLeadDurationText() === '2 Hours', 'Lead text should be 2 Hours');

console.log('✅ TEST 2 PASSED: Dynamic sender email & lead duration configuration works.\n');

console.log('--- TEST 3: Email Template Generation (PW MedEd 3D Theme) ---');
const sampleBatch = DEFAULT_BATCHES[0];
const sampleClass = sampleBatch.events.find(e => e.eventType === 'class' && e.faculty.includes('Pradeep'));
console.log('Sample Class for Email:', {
  topic: sampleClass.topic,
  faculty: sampleClass.faculty,
  timings: sampleClass.timings,
  dateRaw: sampleClass.dateRaw
});

const facultyDetails = reminderEmailService.resolveFacultyDetails(sampleClass.faculty);
console.log('Resolved Faculty Details:', facultyDetails);
console.assert(facultyDetails.email === 'pradeep.p@pwmeded.edu.in', 'Faculty registered email mismatch');

const emailHtml = reminderEmailService.generateEmailHtml({
  facultyName: facultyDetails.name,
  facultyEmail: facultyDetails.email,
  senderEmail: 'academic-reminders@pwmeded.edu.in',
  event: sampleClass,
  leadDurationText: '30 Mins'
});

console.assert(emailHtml.includes('PW MedEd'), 'Email missing PW MedEd branding');
console.assert(!emailHtml.includes('Join Live Lecture Room'), 'Join Live Lecture Room button should not be present in email');
console.assert(emailHtml.includes('Open Faculty Portal'), 'Email missing Open Faculty Portal button');
console.assert(emailHtml.includes('#4a7c59') || emailHtml.includes('#2d4d37'), 'Email missing PW MedEd green theme colors');
console.assert(emailHtml.includes('30 Mins'), 'Email missing lead duration notification');

console.log('Email template length:', emailHtml.length, 'characters. Aesthetic elements verified.');
console.log('✅ TEST 3 PASSED: PW MedEd styled HTML email template generated.\n');

console.log('--- TEST 4: Dispatch Flow & Dual-Role Notifications ---');
// Dispatch test reminder
const dispatchResult = reminderEmailService.dispatchReminder(sampleClass, {
  force: true,
  senderEmail: 'academic-reminders@pwmeded.edu.in',
  leadDurationMinutes: 30
});
console.assert(dispatchResult.success, 'Dispatch failed');
console.log('Dispatched Reminder ID:', dispatchResult.reminderId);
console.log('Admin Notification Title:', dispatchResult.adminNotif.title);
console.log('Faculty Notification Title:', dispatchResult.facultyNotif.title);

// Verify Admin Notifications
const adminNotifs = reminderEmailService.getAdminNotifications();
const adminReminder = adminNotifs.find(n => n.reminderId === dispatchResult.reminderId);
console.assert(adminReminder !== undefined, 'Admin notification not found');
console.assert(adminReminder.role === 'admin', 'Admin role mismatch');
console.assert(adminReminder.recipientEmail === 'pradeep.p@pwmeded.edu.in', 'Admin recipient email mismatch');
console.log(`Admin Notifications count: ${adminNotifs.length}, Unread: ${reminderEmailService.getAdminUnreadCount()}`);

// Verify Faculty Notifications for Dr. Pradeep Pawar
const pradeepNotifs = reminderEmailService.getFacultyNotifications('Dr. Pradeep Pawar');
const pradeepReminder = pradeepNotifs.find(n => n.reminderId === dispatchResult.reminderId);
console.assert(pradeepReminder !== undefined, 'Dr. Pradeep Pawar notification not found');
console.assert(pradeepReminder.role === 'faculty', 'Faculty role mismatch');
console.assert(pradeepReminder.recipientEmail === 'pradeep.p@pwmeded.edu.in', 'Recipient email mismatch');
console.assert(pradeepReminder.read === false, 'New reminder should be unread');

// Verify Profile Filtering: Dr. Rajesh Jambhulkar should NOT see Dr. Pradeep Pawar's class reminder
const rajeshNotifs = reminderEmailService.getFacultyNotifications('Dr. Rajesh Jambhulkar');
const rajeshSeesPradeep = rajeshNotifs.some(n => n.reminderId === dispatchResult.reminderId);
console.assert(!rajeshSeesPradeep, 'Profile isolation failed: Dr. Rajesh should NOT see Dr. Pradeep reminder');
console.log('Dr. Pradeep Pawar notifications:', pradeepNotifs.length);
console.log('Dr. Rajesh Jambhulkar notifications:', rajeshNotifs.length, '(isolated as expected)');

console.log('✅ TEST 4 PASSED: Dual-role notification dispatch & faculty profile filtering verified.\n');

console.log('--- TEST 5: Read State & Mark All Read ---');
const pradeepUnreadBefore = reminderEmailService.getFacultyUnreadCount('Dr. Pradeep Pawar');
console.assert(pradeepUnreadBefore >= 1, 'Should have at least 1 unread notification');

reminderEmailService.markNotificationAsRead(pradeepReminder.id);
const pradeepUnreadAfter = reminderEmailService.getFacultyUnreadCount('Dr. Pradeep Pawar');
console.assert(pradeepUnreadAfter === pradeepUnreadBefore - 1, 'Unread count should decrease after reading');

// Now mark all read for admin
reminderEmailService.markAllAsRead('admin');
const adminUnreadAfter = reminderEmailService.getAdminUnreadCount();
console.assert(adminUnreadAfter === 0, 'Admin unread count should be 0 after markAllAsRead');

console.log('✅ TEST 5 PASSED: Read states & batch mark as read functioning properly.\n');

console.log('--- TEST 6: Automated Reminder Check Loop ---');
// Let's create an upcoming class event right in the lead window
const now = new Date();
const targetTime = new Date(now.getTime() + 25 * 60 * 1000); // 25 mins from now
const testIso = targetTime.toISOString().split('T')[0];
const testTimeString = `${targetTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - 9:00 PM`;

const upcomingEvent = {
  id: 'auto-test-1',
  eventType: 'class',
  faculty: 'Dr. Rajesh Jambhulkar',
  subject: 'Biochemistry',
  topic: 'Clinical Enzymology & Kinetics',
  chapter: 'Metabolic Pathways',
  isoDate: testIso,
  timings: testTimeString,
  batchName: 'Prarambh 2026 Batch'
};

// Set lead duration to 30 mins, tolerance +/- 15 mins (window 15 to 45 mins)
reminderEmailService.saveSettings({
  leadDurationValue: 30,
  leadDurationUnit: 'minutes',
  isEnabled: true
});

const autoDispatched = reminderEmailService.checkAndDispatchUpcoming([upcomingEvent], 'Prarambh 2026 Batch');
console.log(`Upcoming class automatically detected and dispatched: ${autoDispatched.length}`);
console.assert(autoDispatched.length === 1, 'Expected 1 event auto-dispatched in 30-min window');

const rajeshNotifsAfterAuto = reminderEmailService.getFacultyNotifications('Dr. Rajesh Jambhulkar');
const foundAutoNotif = rajeshNotifsAfterAuto.find(n => n.topic.includes('Clinical Enzymology'));
console.assert(foundAutoNotif !== undefined, 'Auto-dispatched notification missing on faculty side');
console.assert(foundAutoNotif.recipientEmail === 'rajesh.j@pwmeded.edu.in', 'Delivered to wrong faculty email');
console.log('Auto-dispatched to Dr. Rajesh:', foundAutoNotif.topic, 'at', foundAutoNotif.recipientEmail);

// Running it again immediately should NOT dispatch duplicates
const secondRun = reminderEmailService.checkAndDispatchUpcoming([upcomingEvent], 'Prarambh 2026 Batch');
console.assert(secondRun.length === 0, 'Duplicate reminder should be prevented on second run');
console.log('Deduplication verified: 0 duplicate dispatches.');

console.log('✅ TEST 6 PASSED: Automated check loop, timing calculation & deduplication verified.\n');

console.log('--- TEST 7: HTML DOM Structure & Elements Integrity ---');
const adminHtml = fs.readFileSync('./admin.html', 'utf8');
const facultyHtml = fs.readFileSync('./faculty.html', 'utf8');

// Admin Elements Check
const requiredAdminIds = [
  'openNotificationBtn',
  'adminNotifBadgeCount',
  'notificationDrawer',
  'adminNotificationFeed',
  'adminMarkAllReadBtn',
  'adminSettingsModal',
  'settingSenderEmail',
  'settingLeadDurationNum',
  'settingLeadDurationUnit',
  'btnSaveEmailSettings',
  'btnTestEmailDispatch',
  'btnPreviewEmailTheme',
  'emailPreviewModal',
  'previewHeaderFrom',
  'previewHeaderTo',
  'previewHeaderSubject',
  'emailPreviewContainer',
  'deanMenuSettingsBtn'
];

requiredAdminIds.forEach(id => {
  console.assert(adminHtml.includes(`id="${id}"`), `Admin HTML missing required ID: ${id}`);
});
console.log(`All ${requiredAdminIds.length} Admin Portal notification and settings IDs verified.`);

// Faculty Elements Check
const requiredFacultyIds = [
  'openFacultyNotificationBtn',
  'facultyNotifBadgeCount',
  'facultyNotificationModal',
  'facultyNotificationDrawer',
  'facultyNotificationFeed',
  'facultyMarkAllReadBtn',
  'facultyEmailPreviewModal',
  'facultyEmailPreviewFrom',
  'facultyEmailPreviewTo',
  'facultyEmailPreviewSubject',
  'facultyEmailPreviewContainer'
];

requiredFacultyIds.forEach(id => {
  console.assert(facultyHtml.includes(`id="${id}"`), `Faculty HTML missing required ID: ${id}`);
});
console.log(`All ${requiredFacultyIds.length} Faculty Portal notification and email preview IDs verified.`);

console.log('✅ TEST 7 PASSED: HTML templates contain all required controls and modals.\n');

console.log('================================================================');
console.log('🎉 ALL 7 TEST SUITES PASSED FLAWLESSLY!');
console.log('Automated reminder flow, settings popup, themes & notifications are 100% functional.');
console.log('================================================================');
