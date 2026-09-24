// Integration test script for Faculty-Wise Class Highlights Single Admin Tab
const assert = require('assert');

console.log('================================================================');
console.log('🧪 Testing Faculty-Wise Class Highlights Single Tab (Day/Week/Month)');
console.log('================================================================\n');

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
    addEventListener: () => {},
    querySelectorAll: () => [],
    querySelector: () => null,
    appendChild: () => {},
    setAttribute: () => {},
    getAttribute: () => null
  };
}

const mockIds = [
  'adminBatchPill', 'adminBatchDropdown', 'adminBatchDropdownList', 'adminBatchLabel',
  'adminSearchInput', 'adminLogoBtn', 'adminDeanProfileBtn', 'adminDeanDropdown',
  'deanMenuDashboardBtn', 'deanMenuFacultyBtn', 'deanMenuOnboardBtn', 'deanMenuSettingsBtn', 'deanMenuConnectSheetBtn',
  'cardScheduleOverviewBtn', 'cardActiveFacultyBtn', 'cardFacultyHighlightsCard', 'cardCurriculumPaceBtn',
  'cardFacultyScopeDay', 'cardFacultyScopeWeek', 'cardFacultyScopeMonth',
  'cardFacultyHighlightsClassesCount', 'cardFacultyHighlightsFacultyCount', 'cardFacultyHighlightsScopeBadge',
  'cardFacultyHighlightsProgressBar', 'cardFacultyHighlightsChips',
  'cardCurriculumPacePercent', 'cardCurriculumPaceStatus', 'cardCurriculumPaceSubtitle', 'cardCurriculumPaceBadge',
  'cardScheduleCount', 'cardScheduleMonthBadge', 'cardScheduleProgressBar',
  'cardFacultyCount', 'cardFacultyAvatars', 'cardSubjectsSummary', 'cardFacultyCoverageBadge',
  'prevMonthBtn', 'nextMonthBtn', 'todayMonthBtn', 'adminCurrentMonthTitle',
  'btnViewMonth', 'btnViewWeek', 'btnViewTimeline',
  'viewSectionCalendar', 'viewSectionWeek', 'viewSectionTimeline', 'viewSectionDashboard', 'viewSectionFaculty', 'viewSectionOnboarding',
  'adminActionControlsBar', 'adminSummaryCardsContainer', 'adminCalendarGrid', 'adminWeekdayHeaders',
  'adminSubjectFilters',
  'facultyHighlightsModal', 'closeFacultyHighlightsModalBtn', 'closeFacultyHighlightsBottomBtn',
  'modalScopeDayBtn', 'modalScopeWeekBtn', 'modalScopeMonthBtn',
  'modalFacultySubtitle', 'modalTotalClasses', 'modalActiveFaculty', 'modalTotalHours',
  'modalActivePeriodBadge', 'modalFacultyDistributionList'
];

mockIds.forEach(id => {
  elements[id] = createMockEl(id);
});

global.document = {
  getElementById: (id) => {
    if (!elements[id]) elements[id] = createMockEl(id);
    return elements[id];
  },
  createElement: (tag) => createMockEl(tag),
  querySelectorAll: () => [],
  addEventListener: () => {},
  readyState: 'complete'
};

global.window = {
  location: { search: '', pathname: '/admin.html', hash: '' },
  addEventListener: () => {},
  dispatchEvent: () => {}
};

if (typeof localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

async function runTests() {
  const { AdminDashboardController } = await import('./js/adminApp.js');
  const controller = new AdminDashboardController();

  console.log('--- TEST 1: Default Scope (Month View) ---');
  controller.dashboardMonth = 9;
  controller.renderFacultyHighlightsCard();
  assert.strictEqual(controller.facultyHighlightScope, 'month');
  console.log('Card Classes Count:', elements['cardFacultyHighlightsClassesCount'].textContent);
  console.log('Card Faculty Count:', elements['cardFacultyHighlightsFacultyCount'].textContent);
  console.log('Card Scope Badge:', elements['cardFacultyHighlightsScopeBadge'].textContent);

  assert.strictEqual(Number(elements['cardFacultyHighlightsClassesCount'].textContent) > 0, true, 'Should have classes in month');
  assert.strictEqual(Number(elements['cardFacultyHighlightsFacultyCount'].textContent.split(' ')[0]) > 0, true, 'Should have active faculty');
  assert.strictEqual(elements['cardFacultyHighlightsScopeBadge'].textContent.includes('October 2026'), true);
  assert.strictEqual(elements['cardFacultyHighlightsChips'].innerHTML.includes('Dr.'), true, 'Chips should contain faculty');
  console.log('✅ TEST 1 PASSED: Month scope renders faculty classes and chips.\n');

  console.log('--- TEST 2: Switching Scope to Week ---');
  controller.facultyHighlightScope = 'week';
  controller.dashboardWeekStart = new Date(2026, 9, 11);
  controller.renderFacultyHighlightsCard();
  console.log('Week Classes Count:', elements['cardFacultyHighlightsClassesCount'].textContent);
  console.log('Week Faculty Count:', elements['cardFacultyHighlightsFacultyCount'].textContent);
  console.log('Week Scope Badge:', elements['cardFacultyHighlightsScopeBadge'].textContent);

  assert.strictEqual(Number(elements['cardFacultyHighlightsClassesCount'].textContent) > 0, true);
  assert.strictEqual(elements['cardFacultyHighlightsScopeBadge'].textContent.includes('Week'), true);
  console.log('✅ TEST 2 PASSED: Week scope correctly filters and highlights active week faculty.\n');

  console.log('--- TEST 3: Switching Scope to Day ---');
  controller.selectedDayIso = '2026-10-15'; // Day with scheduled classes
  controller.dashboardDayIso = '2026-10-15';
  controller.facultyHighlightScope = 'day';
  controller.renderFacultyHighlightsCard();
  console.log('Day Classes Count:', elements['cardFacultyHighlightsClassesCount'].textContent);
  console.log('Day Faculty Count:', elements['cardFacultyHighlightsFacultyCount'].textContent);
  console.log('Day Scope Badge:', elements['cardFacultyHighlightsScopeBadge'].textContent);

  assert.strictEqual(elements['cardFacultyHighlightsScopeBadge'].textContent.includes('Oct 15'), true);
  assert.strictEqual(Number(elements['cardFacultyHighlightsClassesCount'].textContent) >= 1, true);
  console.log('✅ TEST 3 PASSED: Day scope isolates classes for the selected date.\n');

  console.log('--- TEST 4: All Batches Combined Schedule ---');
  controller.currentBatchId = 'all';
  controller.facultyHighlightScope = 'month';
  controller.renderFacultyHighlightsCard();
  console.log('All Batches Month Classes:', elements['cardFacultyHighlightsClassesCount'].textContent);
  console.log('All Batches Active Faculty:', elements['cardFacultyHighlightsFacultyCount'].textContent);

  // In all batches, classes count should be combined
  const allBatchesClasses = Number(elements['cardFacultyHighlightsClassesCount'].textContent);
  assert.strictEqual(allBatchesClasses >= 30, true, 'All batches should have aggregate classes');
  console.log('✅ TEST 4 PASSED: All Batches aggregates faculty classes across all cohorts.\n');

  console.log('--- TEST 5: Modal Population Verification ---');
  controller.facultyHighlightScope = 'month';
  controller.renderFacultyHighlightsModal();
  console.log('Modal Total Classes:', elements['modalTotalClasses'].textContent);
  console.log('Modal Active Faculty:', elements['modalActiveFaculty'].textContent);
  console.log('Modal Total Hours:', elements['modalTotalHours'].textContent);

  assert.strictEqual(Number(elements['modalTotalClasses'].textContent) >= 30, true);
  assert.strictEqual(elements['modalFacultyDistributionList'].innerHTML.includes('Classes'), true);
  console.log('✅ TEST 5 PASSED: Detailed modal correctly populated with full faculty schedules.\n');

  console.log('================================================================');
  console.log('🎉 ALL FACULTY HIGHLIGHTS TESTS PASSED (100%)!');
  console.log('================================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
