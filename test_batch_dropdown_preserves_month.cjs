const assert = require('assert');

console.log('================================================================');
console.log('🧪 Testing Batch Selection Preserves Month & Updates Faculty Highlights');
console.log('================================================================\n');

// Mock DOM elements
const elements = {};
function createMockEl(id) {
  const listeners = {};
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
    addEventListener: (evt, fn) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    },
    click: function() {
      if (listeners['click']) {
        listeners['click'].forEach(fn => fn({ target: this, stopPropagation: () => {}, closest: () => null }));
      }
    },
    closest: (sel) => null,
    querySelectorAll: (sel) => [],
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
  'adminSubjectFilters', 'adminSubjectFiltersScroll', 'btnSubjectScrollLeft', 'btnSubjectScrollRight',
  'calActionFacultyBtn', 'calActionFacultyDropdown', 'calFacultySearchInput', 'calActionFacultyList', 'calActionFacultyLabel',
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

async function run() {
  const { AdminDashboardController } = await import('./js/adminApp.js');
  const controller = new AdminDashboardController();

  console.log('--- TEST 1: Navigate Calendar to October 2026 ---');
  controller.currentYear = 2026;
  controller.currentMonth = 9; // October (0-indexed)
  controller.renderAll();

  assert.strictEqual(controller.currentMonth, 9, 'Calendar month should be October');
  assert.strictEqual(controller.facultyHighlightScope, 'month', 'Faculty highlights scope should be month');
  console.log('Current Month Title:', elements['adminCurrentMonthTitle'].textContent);
  console.log('Faculty Highlights Badge:', elements['cardFacultyHighlightsScopeBadge'].textContent);
  console.log('Faculty Highlights Classes:', elements['cardFacultyHighlightsClassesCount'].textContent);

  assert.ok(elements['cardFacultyHighlightsScopeBadge'].textContent.includes('October 2026'), 'Badge must say October 2026');
  assert.strictEqual(Number(elements['cardFacultyHighlightsClassesCount'].textContent) > 0, true, 'Classes count must be > 0 in October');
  console.log('✅ TEST 1 PASSED: October calendar view correctly displays October data in Faculty Highlights.\n');

  console.log('--- TEST 2: Switch Batch via Dropdown (Select Sushruta 2026) ---');
  // Simulate clicking Sushruta batch item in dropdown
  const dropdownList = elements['adminBatchDropdownList'];
  const sushrutaEl = createMockEl('sushruta-item');
  sushrutaEl.getAttribute = (attr) => attr === 'data-batch-id' ? 'batch-sushruta-2026' : null;

  dropdownList.querySelectorAll = (sel) => {
    if (sel.includes('data-batch-id')) {
      return [sushrutaEl];
    }
    return [];
  };

  controller.updateHeaderBatchSelector();
  sushrutaEl.click();

  console.log('Active Batch:', controller.getActiveBatch()?.name);
  console.log('Calendar Month after switch:', controller.currentMonth, `(Year: ${controller.currentYear})`);
  console.log('Faculty Highlights Badge:', elements['cardFacultyHighlightsScopeBadge'].textContent);
  console.log('Faculty Highlights Classes:', elements['cardFacultyHighlightsClassesCount'].textContent);

  assert.strictEqual(controller.currentBatchId, 'batch-sushruta-2026', 'Batch should be Sushruta');
  assert.strictEqual(controller.currentMonth, 9, 'Calendar month MUST REMAIN October (9) after batch switch');
  assert.strictEqual(controller.currentYear, 2026, 'Calendar year MUST REMAIN 2026 after batch switch');
  assert.strictEqual(controller.facultyHighlightScope, 'month', 'Faculty highlights scope must remain month');
  assert.ok(elements['cardFacultyHighlightsScopeBadge'].textContent.includes('October 2026'), 'Highlights badge must still be October 2026');
  assert.strictEqual(Number(elements['cardFacultyHighlightsClassesCount'].textContent) > 0, true, 'Sushruta classes count must be > 0 in October');
  console.log('✅ TEST 2 PASSED: Batch selection preserves selected month (October 2026) and displays its data.\n');

  console.log('--- TEST 3: Switch to All Batches Combined ---');
  const allEl = createMockEl('all-batches-item');
  allEl.getAttribute = (attr) => attr === 'data-batch-id' ? 'all' : null;

  dropdownList.querySelectorAll = (sel) => {
    if (sel.includes('data-batch-id')) {
      return [allEl];
    }
    return [];
  };
  controller.updateHeaderBatchSelector();
  allEl.click();

  assert.strictEqual(controller.currentBatchId, 'all', 'Batch should be all');
  assert.strictEqual(controller.currentMonth, 9, 'Calendar month MUST REMAIN October (9)');
  assert.strictEqual(Number(elements['cardFacultyHighlightsClassesCount'].textContent) >= 30, true, 'All batches should have aggregate classes in October');
  console.log('All Batches Highlights Classes:', elements['cardFacultyHighlightsClassesCount'].textContent);
  console.log('✅ TEST 3 PASSED: All Batches selection also preserves selected month.\n');

  console.log('================================================================');
  console.log('🎉 ALL BATCH SELECTION & FACULTY HIGHLIGHTS MONTH TESTS PASSED (100%)!');
  console.log('================================================================');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
