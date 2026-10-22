// Comprehensive test for 'All Batches (Select All)' in Admin and Faculty Dashboards
const assert = require('assert');

// 1. Test BatchManager
const { BatchManager } = require('./js/sheetConnector.js');

// Mock localStorage for node environment
const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = v; },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

console.log('================================================================');
console.log('🧪 Testing "All Batches (Select All)" in Admin and Faculty Portals');
console.log('================================================================\n');

const bm = new BatchManager();
const batches = bm.getBatches();
console.log(`Found ${batches.length} default batches:`, batches.map(b => b.name));
assert.strictEqual(batches.length >= 4, true, 'Should have at least 4 default batches');

const allEvents = bm.getAllEvents('all');
const expectedTotal = batches.reduce((sum, b) => sum + (b.events ? b.events.length : 0), 0);
console.log(`Total events across all batches: ${allEvents.length} (expected: ${expectedTotal})`);
assert.strictEqual(allEvents.length, expectedTotal, `Should match sum of events (${expectedTotal})`);

// Verify batchId and batchName attached to each event
const prarambhEvents = allEvents.filter(e => e.batchName && e.batchName.includes('Prarambh'));
const sushrutaEvents = allEvents.filter(e => e.batchName && e.batchName.includes('Sushruta'));
const inicetEvents = allEvents.filter(e => e.batchName && e.batchName.includes('INI-CET'));
const fmgeEvents = allEvents.filter(e => e.batchName && e.batchName.includes('FMGE'));

console.log(`Prarambh: ${prarambhEvents.length}, Sushruta: ${sushrutaEvents.length}, INI-CET: ${inicetEvents.length}, FMGE: ${fmgeEvents.length}`);
assert.ok(prarambhEvents.length > 0, 'Prarambh should have events');
assert.ok(sushrutaEvents.length > 0, 'Sushruta should have events');
assert.ok(inicetEvents.length > 0, 'INI-CET should have events');
assert.ok(fmgeEvents.length > 0, 'FMGE should have events');
console.log('✅ BatchManager.getAllEvents("all") correctly merges and annotates all batch events.\n');

// 2. Test FacultyDashboardController
// Mock DOM elements
const elements = {};
function createMockEl(id) {
  return {
    id,
    textContent: '',
    innerHTML: '',
    className: '',
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    },
    addEventListener: () => {},
    querySelectorAll: (sel) => [],
    querySelector: (sel) => null,
    appendChild: (child) => {}
  };
}

const mockIds = [
  'facultyBatchPill', 'facultyBatchDropdown', 'facultyBatchDropdownList', 'facultyBatchLabel',
  'facultyProfileBtn', 'facultyProfileDropdown', 'facultyProfilesList', 'facultyHeaderAvatar',
  'facultyHeaderName', 'facultyHeaderSubject', 'facultyDropdownCurrentName', 'facultyDropdownCurrentSubject',
  'facultyActiveNameBadge', 'facultySearchInput', 'facultyExportIcsBtn',
  'tabFacultyToday', 'tabFacultyUpcoming', 'tabFacultyTotal',
  'facultyTodayCount', 'facultyTodaySubtitle', 'facultyTodayBadge',
  'facultyUpcomingCount', 'facultyUpcomingSubtitle', 'facultyUpcomingScopeBadge',
  'facultyTotalCount', 'facultyTotalSubtitle', 'facultyTotalScopeBadge',
  'facultyPeriodTitle', 'prevPeriodBtn', 'todayPeriodBtn', 'nextPeriodBtn',
  'btnViewMonth', 'btnViewWeek', 'btnViewTimeline',
  'viewSectionCalendar', 'viewSectionWeek', 'viewSectionTimeline',
  'facultyCalendarGrid', 'facultyWeekContainer', 'facultyTimelineContainer',
  'facultyEventDetailModal', 'closeFacultyEventModal', 'modalDetailCloseBtn',
  'openFacultyNotificationBtn', 'facultyNotifBadgeCount', 'facultyNotifPulse', 'facultyNotifDot',
  'facultyNotificationModal', 'facultyNotificationDrawer', 'facultyNotificationBackdrop',
  'closeFacultyNotificationBtn', 'facultyMarkAllReadBtn', 'facultyNotificationFeed',
  'facultyDrawerFooterName', 'facultyNotifBadgeFilterCount',
  'facultyEmailPreviewModal', 'closeFacultyEmailPreviewBtn', 'closeFacultyEmailPreviewBottomBtn',
  'facultyEmailPreviewFrom', 'facultyEmailPreviewTo', 'facultyEmailPreviewSubject', 'facultyEmailPreviewContainer',
  'facultyToast', 'facultyToastText'
];

global.document = {
  getElementById: (id) => {
    if (!elements[id]) elements[id] = createMockEl(id);
    return elements[id];
  },
  createElement: (tag) => {
    const el = createMockEl(tag);
    el.tagName = tag.toUpperCase();
    return el;
  },
  querySelectorAll: () => [],
  addEventListener: () => {},
  readyState: 'complete'
};

global.window = {
  location: { search: '', pathname: '', hash: '' },
  addEventListener: () => {}
};

async function runControllerTests() {
  const { FacultyDashboardController } = await import('./js/facultyApp.js');
  const facCtrl = new FacultyDashboardController();

  console.log('--- Testing Faculty Dashboard Batch Switching ---');
  console.log('Initial Faculty activeBatchId:', facCtrl.activeBatchId);
  assert.strictEqual(facCtrl.activeBatchId, 'all');

  // Switch to 'all'
  facCtrl.switchBatch('all');
  console.log('After switchBatch("all"):');
  console.log(' - activeBatchId:', facCtrl.activeBatchId);
  console.log(' - batchLabel text:', elements['facultyBatchLabel'].textContent);
  console.log(' - currentFaculty:', facCtrl.currentFaculty);
  console.log(' - activeNameBadge:', elements['facultyActiveNameBadge'].textContent);

  assert.strictEqual(facCtrl.activeBatchId, 'all');
  assert.strictEqual(elements['facultyBatchLabel'].textContent, 'All Batches • Combined Schedule');
  assert.strictEqual(facCtrl.currentFaculty, 'Dr. Rajesh Jambhulkar');
  assert.strictEqual(elements['facultyActiveNameBadge'].textContent, 'Biochemistry');

  const facEventsRajesh = facCtrl.getFacultyEvents();
  console.log(' - Events when switched to All Batches for Dr. Rajesh Jambhulkar:', facEventsRajesh.filter(e => e.eventType === 'class').length);
  assert.ok(facEventsRajesh.filter(e => e.eventType === 'class').length > 0, 'Dr. Rajesh should have classes across all batches');

  // Test filtering to specific faculty while activeBatchId='all'
  facCtrl.switchFaculty('Dr. Rajesh Jambhulkar', 'Biochemistry');
  const facEventsRajesh2 = facCtrl.getFacultyEvents();
  console.log(' - Events when switched to Dr. Rajesh Jambhulkar in All Batches:', facEventsRajesh2.filter(e => e.eventType === 'class').length);
  assert.ok(facEventsRajesh2.filter(e => e.eventType === 'class').length > 0, 'Dr. Rajesh should have classes across all batches');

  // Switch back to All Faculty
  facCtrl.switchFaculty('All Faculty', 'Combined Curriculum');
  assert.strictEqual(facCtrl.getFacultyEvents().length, expectedTotal);
  console.log('✅ Faculty Dashboard correctly supports All Batches and All Faculty.\n');

  // 3. Test Admin Dashboard
  console.log('--- Testing Admin Dashboard Controller ---');
  const adminIds = [
    'adminBatchPill', 'adminBatchDropdown', 'adminBatchDropdownList', 'adminBatchLabel',
    'adminSearchInput', 'adminLogoBtn', 'adminDeanProfileBtn', 'adminDeanDropdown',
    'deanMenuDashboardBtn', 'deanMenuFacultyBtn', 'deanMenuOnboardBtn', 'deanMenuSettingsBtn', 'deanMenuConnectSheetBtn',
    'cardScheduleOverviewBtn', 'cardActiveFacultyBtn', 'cardCurriculumPaceBtn', 'cardVenueGovernanceBtn',
    'prevMonthBtn', 'nextMonthBtn', 'todayMonthBtn', 'adminCurrentMonthTitle',
    'btnViewMonth', 'btnViewWeek', 'btnViewTimeline',
    'viewSectionCalendar', 'viewSectionWeek', 'viewSectionTimeline', 'viewSectionDashboard', 'viewSectionFaculty', 'viewSectionOnboarding',
    'adminActionControlsBar', 'adminSummaryCardsContainer', 'adminCalendarGrid', 'adminWeekdayHeaders',
    'cardScheduleCount', 'cardScheduleMonthBadge', 'cardScheduleProgressBar',
    'cardFacultyCount', 'cardFacultyAvatars', 'cardSubjectsSummary', 'cardFacultyCoverageBadge',
    'cardCurriculumPacePercent', 'cardCurriculumPaceStatus', 'cardCurriculumPaceSubtitle', 'cardCurriculumPaceBadge',
    'cardVenueOverlapCount', 'cardVenueGovernanceSubtitle', 'cardVenueGovernanceBadge',
    'adminSubjectFilters'
  ];

  adminIds.forEach(id => {
    if (!elements[id]) elements[id] = createMockEl(id);
  });

  const { AdminDashboardController } = await import('./js/adminApp.js');
  const adminCtrl = new AdminDashboardController();

  console.log('Initial Admin currentBatchId:', adminCtrl.currentBatchId);
  assert.strictEqual(adminCtrl.currentBatchId, 'all');

  // Switch admin to 'all'
  adminCtrl.currentBatchId = 'all';
  const activeBatch = adminCtrl.getActiveBatch();
  console.log('Admin getActiveBatch() with currentBatchId="all":', activeBatch.name);
  assert.strictEqual(activeBatch.id, 'all');
  assert.strictEqual(activeBatch.name, 'All Batches • Combined Schedule');

  const adminActiveEvents = adminCtrl.getAllActiveEvents();
  console.log('Admin getAllActiveEvents() count:', adminActiveEvents.length);
  assert.strictEqual(adminActiveEvents.length, expectedTotal, `Admin should have all ${expectedTotal} events`);

  // Verify Summary Cards update
  adminCtrl.updateSummaryCards();
  console.log('Card 3 (Curriculum Pace Subtitle):', elements['cardCurriculumPaceSubtitle'].textContent);
  assert.strictEqual(elements['cardCurriculumPaceSubtitle'].textContent, 'All Batches • Combined CBME Syllabus');

  console.log('Card 1 (Schedule Count):', elements['cardScheduleCount'].textContent);
  assert.strictEqual(Number(elements['cardScheduleCount'].textContent) > 0, true);

  console.log('Card 2 (Faculty Count):', elements['cardFacultyCount'].textContent);
  assert.strictEqual(Number(elements['cardFacultyCount'].textContent) >= 7, true);

  console.log('✅ Admin Dashboard correctly handles "all" batches across cards and event views.\n');

  console.log('================================================================');
  console.log('🎉 ALL "SELECT ALL BATCHES" TESTS PASSED 100%!');
  console.log('================================================================');
  process.exit(0);
}

runControllerTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
