// Comprehensive test for Mobile Responsive View Functionality in Faculty Portal
const assert = require('assert');

console.log('================================================================');
console.log('🧪 Testing Faculty Mobile Responsive View Functionality');
console.log('================================================================\n');

// Mock DOM Environment
const elements = {};
function createMockEl(id, tagName = 'div') {
  const el = {
    id,
    tagName: tagName.toUpperCase(),
    textContent: '',
    innerHTML: '',
    className: '',
    style: {},
    classList: {
      _classes: new Set(),
      add: function(...cls) { cls.forEach(c => this._classes.add(c)); },
      remove: function(...cls) { cls.forEach(c => this._classes.delete(c)); },
      toggle: function(c, force) {
        if (force === undefined) {
          if (this._classes.has(c)) this._classes.delete(c);
          else this._classes.add(c);
        } else if (force) {
          this._classes.add(c);
        } else {
          this._classes.delete(c);
        }
      },
      contains: function(c) { return this._classes.has(c); }
    },
    listeners: {},
    addEventListener: function(event, handler) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(handler);
    },
    trigger: function(event, data = {}) {
      if (this.listeners[event]) {
        this.listeners[event].forEach(h => h({ ...data, stopPropagation: () => {}, target: this }));
      }
    },
    children: [],
    appendChild: function(child) {
      this.children.push(child);
      return child;
    },
    querySelectorAll: function(sel) {
      return [];
    },
    querySelector: function(sel) {
      return createMockEl('mock-sub-' + sel);
    },
    setAttribute: function(k, v) { this[k] = v; },
    getAttribute: function(k) { return this[k] || null; }
  };
  return el;
}

const mockIds = [
  // Desktop elements to prevent init crash
  'facultyBatchPill', 'facultyBatchDropdown', 'facultyBatchDropdownList', 'facultyBatchLabel',
  'facultyProfileBtn', 'facultyProfileDropdown', 'facultyProfilesList',
  'facultyHeaderAvatar', 'facultyHeaderName', 'facultyHeaderSubject',
  'facultyDropdownCurrentName', 'facultyDropdownCurrentSubject', 'facultyActiveNameBadge',
  'facultySearchInput', 'facultySubjectFilter',
  'facultyTabToday', 'facultyTabUpcoming', 'facultyTabTotal',
  'facultyTabCountToday', 'facultyTabSubToday',
  'facultyTabCountUpcoming', 'facultyTabSubUpcoming',
  'facultyTabCountTotal', 'facultyTabSubTotal',
  'facultyCurrentMonthTitle', 'facultyPrevPeriodBtn', 'facultyNextPeriodBtn', 'facultyTodayPeriodBtn',
  'facultyBtnViewMonth', 'facultyBtnViewWeek', 'facultyBtnViewTimeline',
  'facultyViewMonth', 'facultyViewWeek', 'facultyViewTimeline',
  'facultyCalendarGrid', 'facultyWeekdayHeaders', 'facultyExportIcsBtn',
  'facultyDetailModal', 'facultyModalBackdrop', 'facultyCloseModalBtn', 'facultyModalCloseBtn',
  'facultyModalTopic', 'facultyModalSubject', 'facultyModalBatch', 'facultyModalDate',
  'facultyModalTime', 'facultyModalFaculty', 'facultyModalStudio', 'facultyModalDesc',
  'facultyModalBatchPill', 'facultyModalStatusBadge',
  'facultyNotificationBtn', 'facultyNotificationDrawer', 'facultyNotificationBadge',
  'facultyNotificationBackdrop', 'facultyNotificationCloseBtn', 'facultyNotificationFeed',
  'facultyNotificationMarkReadBtn', 'facultyNotificationClearBtn',
  'facultyEmailPreviewModal', 'facultyEmailModalBackdrop', 'facultyEmailCloseBtn',
  'facultyEmailSubject', 'facultyEmailBody',

  // Mobile elements
  'mobileBatchBtn', 'mobileBatchLabel', 'mobileBatchDropdown', 'mobileBatchDropdownList',
  'mobileProfileBtn', 'mobileProfileDropdown', 'mobileFacultyProfilesList',
  'mobileProfileAvatar', 'mobileProfileName', 'mobileProfileSubject',
  'mobileMetricToday', 'mobileTodayCount', 'mobileTodaySubtitle',
  'mobileMetricUpcoming', 'mobileUpcomingCount', 'mobileUpcomingSubtitle',
  'mobileMetricTotal', 'mobileTotalCount', 'mobileTotalSubtitle',
  'mobilePeriodTitle', 'mobileFacultySubtitle',
  'mobilePrevPeriodBtn', 'mobileTodayPeriodBtn', 'mobileNextPeriodBtn',
  'mobileBtnViewMonth', 'mobileBtnViewWeek', 'mobileBtnViewAgenda',
  'mobileViewSectionMonth', 'mobileViewSectionWeek', 'mobileViewSectionAgenda',
  'mobileCalendarDaysGrid', 'mobileSelectedDateTitle', 'mobileSelectedDateBadge', 'mobileSelectedScheduleContainer',
  'mobileUpcomingLecturesHeader', 'mobileUpcomingLecturesContainer',
  'mobileWeekScheduleContainer', 'mobileWeekRangeBadge',
  'mobileAgendaScheduleContainer', 'mobileAgendaCountBadge',
  'mobileExportIcsBtn',
  'mobileNotificationBtn', 'notification-drawer', 'mobileNotificationBackdrop',
  'mobileNotificationCloseBtn', 'mobileNotificationDismissBtn', 'mobileNotificationMarkReadBtn',
  'mobileNotificationFeed', 'mobileNotificationBadge', 'mobileNotificationCountBadge',
  'lecture-modal-backdrop', 'lecture-bottom-sheet', 'mobileModalCloseBtn',
  'mobileModalCloseSecondaryBtn', 'mobileModalRescheduleBtn', 'mobileModalCancelBtn',
  'mobileModalRescheduleCancelRow', 'mobileModalFooter', 'mobileModalSubjectBadge',
  'mobileModalTopic', 'mobileModalBatch', 'mobileModalPlatformRow', 'mobileModalPlatformText',
  'mobileModalDate', 'mobileModalTimings', 'mobileModalDuration', 'mobileModalFaculty',
  'mobileModalTopicText'
];

mockIds.forEach(id => {
  elements[id] = createMockEl(id);
});

global.document = {
  getElementById: (id) => elements[id] || null,
  createElement: (tag) => createMockEl('dynamic-' + Math.random(), tag),
  addEventListener: () => {},
  readyState: 'complete'
};

global.window = {
  addEventListener: () => {},
  requestAnimationFrame: (cb) => cb(),
  setTimeout: (cb) => cb()
};

const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] !== undefined ? storage[k] : null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

// Import ESM module
import('./js/facultyApp.js').then(async ({ FacultyDashboardController }) => {
  const ctrl = new FacultyDashboardController();

  // Test 1: Initialization of mobile state
  console.log('Test 1: Mobile Initial State');
  assert.strictEqual(ctrl.mobileView, 'month', 'Initial mobileView should be "month"');
  assert.strictEqual(ctrl.mobileSelectedDateIso, ctrl.todayIso, 'Initial mobileSelectedDateIso should be current date');
  console.log('✅ Mobile initial state verified.');

  // Test 2: Active Batch Switcher Dropdown Populated
  console.log('\nTest 2: Mobile Batch Switcher');
  assert.ok(elements['mobileBatchDropdownList'].children.length > 0, 'mobileBatchDropdownList should have items');
  console.log(` - Mobile batch list items populated: ${elements['mobileBatchDropdownList'].children.length}`);
  assert.ok(elements['mobileBatchLabel'].textContent.includes('Prarambh'), 'Initial mobile batch label should be Prarambh');
  
  // Test switching batch to Sushruta
  const batches = ctrl.batchManager.getBatches();
  ctrl.switchBatch(batches[1].id);
  assert.strictEqual(ctrl.activeBatchId, batches[1].id);
  assert.ok(elements['mobileBatchLabel'].textContent.includes('Sushruta'), 'Mobile batch label should update to Sushruta');
  console.log('✅ Mobile batch switching verified.');

  // Switch back to Prarambh for deterministic tests
  ctrl.switchBatch(batches[0].id);

  // Test 3: Faculty Profile State
  console.log('\nTest 3: Faculty Profile State');
  // Switch faculty to Dr. Rajesh Jambhulkar explicitly
  ctrl.switchFaculty('Dr. Rajesh Jambhulkar', 'Biochemistry');
  assert.strictEqual(ctrl.currentFaculty, 'Dr. Rajesh Jambhulkar');
  assert.strictEqual(ctrl.facultySubject, 'Biochemistry');
  console.log(' - Switched mobile faculty to Dr. Rajesh Jambhulkar (Biochemistry)');

  // Switch faculty to Dr. Pradeep Pawar
  ctrl.switchFaculty('Dr. Pradeep Pawar', 'Anatomy');
  assert.strictEqual(ctrl.currentFaculty, 'Dr. Pradeep Pawar');
  assert.strictEqual(ctrl.facultySubject, 'Anatomy');
  console.log(' - Switched mobile faculty to Dr. Pradeep Pawar (Anatomy)');

  // Switch back to Dr. Rajesh Jambhulkar
  ctrl.switchFaculty('Dr. Rajesh Jambhulkar', 'Biochemistry');
  assert.strictEqual(ctrl.currentFaculty, 'Dr. Rajesh Jambhulkar');
  console.log('✅ Mobile faculty verified.');

  // Test 4: Mobile Metrics & KPI Cards
  console.log('\nTest 4: Mobile Summary KPI Metrics');
  ctrl.updateMobileMetrics();
  console.log(` - Today Count: ${elements['mobileTodayCount'].textContent}`);
  console.log(` - Upcoming Count: ${elements['mobileUpcomingCount'].textContent}`);
  console.log(` - Total Count: ${elements['mobileTotalCount'].textContent}`);
  assert.notStrictEqual(elements['mobileTotalCount'].textContent, '', 'Total count should be populated');
  assert.ok(Number(elements['mobileTotalCount'].textContent) > 0, 'Total count should be > 0');
  console.log('✅ Mobile summary metrics verified.');

  // Test 5: Mobile View Switching (Month, Week, Agenda)
  console.log('\nTest 5: Segmented View Switcher (Month, Week, Agenda)');
  ctrl.switchMobileView('week');
  assert.strictEqual(ctrl.mobileView, 'week');
  assert.ok(elements['mobileViewSectionMonth'].classList.contains('hidden'), 'Month section should be hidden in week view');
  assert.ok(!elements['mobileViewSectionWeek'].classList.contains('hidden'), 'Week section should be visible');
  
  ctrl.switchMobileView('agenda');
  assert.strictEqual(ctrl.mobileView, 'agenda');
  assert.ok(elements['mobileViewSectionWeek'].classList.contains('hidden'), 'Week section should be hidden in agenda view');
  assert.ok(!elements['mobileViewSectionAgenda'].classList.contains('hidden'), 'Agenda section should be visible');

  ctrl.switchMobileView('month');
  assert.strictEqual(ctrl.mobileView, 'month');
  assert.ok(!elements['mobileViewSectionMonth'].classList.contains('hidden'), 'Month section should be visible');
  console.log('✅ Segmented view switcher verified.');

  // Test 6: Mobile Calendar Days Grid
  console.log('\nTest 6: Mobile Calendar Days Grid Rendering');
  ctrl.renderMobileMonthGrid();
  assert.ok(elements['mobileCalendarDaysGrid'].children.length >= 31, 'Calendar grid should have >= 31 cells');
  console.log(` - Total calendar cells rendered: ${elements['mobileCalendarDaysGrid'].children.length}`);
  console.log('✅ Mobile calendar days grid rendering verified.');

  // Test 7: Mobile Selected Schedule Rendering
  console.log('\nTest 7: Mobile Selected Schedule Container');
  ctrl.mobileSelectedDateIso = '2026-10-17';
  ctrl.renderMobileSelectedSchedule();
  assert.ok(elements['mobileSelectedScheduleContainer'].children.length > 0, 'Selected schedule should render card(s)');
  console.log(` - Cards rendered for 2026-10-17: ${elements['mobileSelectedScheduleContainer'].children.length}`);
  assert.ok(elements['mobileSelectedDateTitle'].textContent.includes('17 Oct 2026'), 'Date title should display Oct 17, 2026');

  // Test Sunday cool off day
  ctrl.mobileSelectedDateIso = '2026-10-18'; // Sunday
  ctrl.renderMobileSelectedSchedule();
  assert.ok(elements['mobileSelectedDateBadge'].textContent.includes('Cool Off'), 'Oct 18 badge should say Cool Off Day');
  console.log(' - Verified Sunday cool-off schedule card');

  // Test Holiday
  ctrl.mobileSelectedDateIso = '2026-10-02'; // Gandhi Jayanti
  ctrl.renderMobileSelectedSchedule();
  assert.ok(elements['mobileSelectedDateBadge'].textContent.includes('Holiday'), 'Oct 2 badge should say Holiday');
  console.log(' - Verified Holiday schedule card');
  console.log('✅ Mobile selected schedule rendering verified.');

  // Test 8: Lecture Details Bottom Sheet Modal
  console.log('\nTest 8: Mobile Lecture Detail Bottom Sheet');
  const allEvents = ctrl.getFacultyEvents();
  const testClass = allEvents.find(e => e.eventType === 'class');
  assert.ok(testClass, 'Should find at least one class event');
  
  ctrl.openMobileLectureDetail(testClass);
  assert.strictEqual(elements['mobileModalTopic'].textContent, testClass.topic);
  assert.ok(elements['mobileModalTimings'].textContent.length > 0);
  assert.strictEqual(elements['mobileModalFaculty'].textContent, testClass.faculty || ctrl.currentFaculty);
  console.log(` - Bottom sheet populated with: ${testClass.topic} (${testClass.subject})`);
  assert.ok(!elements['lecture-modal-backdrop'].classList.contains('hidden'), 'Modal backdrop should not be hidden');

  ctrl.closeMobileLectureDetail();
  console.log(' - Modal closed cleanly');
  console.log('✅ Mobile lecture detail bottom sheet verified.');

  // Test 9: Mobile Notifications Drawer
  console.log('\nTest 9: Mobile Notification Drawer');
  const { reminderEmailService } = await import('./js/reminderEmailService.js');
  reminderEmailService.dispatchReminder({
    faculty: ctrl.currentFaculty,
    facultyEmail: 'rajesh.jambhulkar@pw.live',
    subject: ctrl.facultySubject,
    topic: 'Biochemistry High Yield Session',
    batchName: 'Prarambh 2026 Batch',
    dateRaw: 'Saturday, October 17, 2026',
    timings: '7:00 PM - 9:00 PM'
  }, { force: true });
  ctrl.renderMobileNotifications();
  assert.ok(elements['mobileNotificationFeed'].innerHTML.includes('Class Reminder'), 'Mobile notification feed should contain Class Reminder');
  console.log(` - Notifications rendered successfully in mobile notification feed`);
  
  ctrl.openMobileNotifications();
  assert.ok(!elements['notification-drawer'].classList.contains('hidden'), 'Drawer should be visible');
  
  ctrl.markMobileNotificationsRead();
  assert.ok(elements['mobileNotificationBadge'].classList.contains('hidden'), 'Notification badge should be hidden');
  
  ctrl.closeMobileNotifications();
  assert.ok(elements['notification-drawer'].classList.contains('hidden'), 'Drawer should be hidden');
  console.log('✅ Mobile notification drawer verified.');

  console.log('\n================================================================');
  console.log('🎉 ALL MOBILE FUNCTIONALITY TESTS PASSED 100%!');
  console.log('================================================================\n');
}).catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
