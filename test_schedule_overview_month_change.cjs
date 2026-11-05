const assert = require('assert');

console.log('================================================================');
console.log('🧪 Testing Schedule Overview Card Updates Dynamically On Month Change');
console.log('================================================================\n');

const elements = {};
function createMockEl(id) {
  const listeners = {};
  let _innerHTML = '';
  return {
    id,
    textContent: '',
    get innerHTML() { return _innerHTML; },
    set innerHTML(val) {
      _innerHTML = val;
      if (id === 'viewSectionDashboard') {
        ['dashPrevPeriodBtn', 'dashNextPeriodBtn', 'dashTodayPeriodBtn', 'dashScopeMonthBtn', 'dashScopeWeekBtn', 'dashScopeDayBtn', 'dashPeriodTitleDisplay'].forEach(childId => {
          delete elements[childId];
        });
      }
    },
    className: '',
    value: '',
    style: {},
    classList: {
      _classes: new Set(),
      add: function(c) { this._classes.add(c); },
      remove: function(c) { this._classes.delete(c); },
      toggle: function(c) { if (this._classes.has(c)) this._classes.delete(c); else this._classes.add(c); },
      contains: function(c) { return this._classes.has(c); }
    },
    addEventListener: (evt, handler) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(handler);
    },
    click: function() {
      if (listeners['click']) {
        listeners['click'].forEach(h => h({ stopPropagation: () => {}, target: this }));
      }
    },
    querySelector: (sel) => {
      const match = sel.match(/#([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        if (!elements[match[1]]) elements[match[1]] = createMockEl(match[1]);
        return elements[match[1]];
      }
      return createMockEl('sub-' + Math.random().toString(36).slice(2, 6));
    },
    querySelectorAll: () => [],
    setAttribute: () => {},
    getAttribute: () => null
  };
}

const elementIds = [
  'adminBatchLabel', 'adminBatchDropdown', 'adminBatchDropdownList', 'adminSearchInput',
  'adminLogoBtn', 'adminDeanProfileBtn', 'adminDeanDropdown', 'adminCurrentMonthTitle',
  'prevMonthBtn', 'nextMonthBtn', 'todayMonthBtn',
  'btnViewMonth', 'btnViewWeek', 'btnViewTimeline',
  'cardScheduleOverviewBtn', 'cardScheduleCount', 'cardScheduleMonthBadge', 'cardScheduleProgressBar', 'cardScheduleMonthDropdown',
  'cardActiveFacultyBtn', 'cardFacultyCount', 'cardFacultyAvatars', 'cardSubjectsSummary', 'cardFacultyCoverageBadge',
  'cardFacultyHighlightsCard', 'cardFacultyHighlightsClassesCount', 'cardFacultyHighlightsFacultyCount',
  'cardFacultyHighlightsScopeBadge', 'cardFacultyHighlightsProgressBar', 'cardFacultyHighlightsChips',
  'cardFacultyScopeDay', 'cardFacultyScopeWeek', 'cardFacultyScopeMonth',
  'cardClassDeliveryStatusBtn', 'cardDeliveryScopeDay', 'cardDeliveryScopeWeek', 'cardDeliveryScopeMonth',
  'cardConductedCount', 'cardCancelledCount', 'cardDeliveryScopeBadge', 'cardDeliveryTotalText', 'cardDeliveryConductedBar',
  'cardCurriculumPaceSubtitle', 'cardCurriculumPacePercent', 'cardCurriculumPaceStatus', 'cardCurriculumPaceBadge',
  'btnSubjectScrollLeft', 'btnSubjectScrollRight', 'adminSubjectFiltersScroll', 'adminSubjectFilters',
  'viewSectionCalendar', 'viewSectionWeek', 'viewSectionTimeline', 'viewSectionDashboard',
  'viewSectionFaculty', 'viewSectionOnboarding', 'viewSectionWorkload', 'viewSectionRequests',
  'adminActionControlsBar', 'adminSummaryCardsContainer',
  'adminCalendarGrid', 'adminWeekdayHeaders', 'adminToast'
];

elementIds.forEach(id => { elements[id] = createMockEl(id); });

global.window = {
  location: { search: '', pathname: '/admin.html', hash: '' },
  addEventListener: () => {}
};
global.document = {
  getElementById: (id) => elements[id] || (elements[id] = createMockEl(id)),
  createElement: (tag) => createMockEl('created-' + tag),
  addEventListener: () => {},
  querySelectorAll: () => [],
  body: createMockEl('body')
};

if (typeof global.localStorage === 'undefined') {
  const store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

async function testMonthChange() {
  const { AdminDashboardController } = await import('./js/adminApp.js');
  const controller = new AdminDashboardController();
  controller.currentBatchId = 'all';

  // 1. Initial State (October 2026)
  controller.currentYear = 2026;
  controller.currentMonth = 9; // October (0-indexed: 9)
  controller.dashboardYear = 2026;
  controller.dashboardMonth = 9;
  controller.updateSummaryCards();

  const octCount = elements['cardScheduleCount'].textContent;
  console.log('--- TEST 1: Initial October 2026 Schedule Overview ---');
  console.log('Month Badge:', elements['cardScheduleMonthBadge'].textContent);
  console.log('Schedule Count:', octCount);
  console.log('Progress Width:', elements['cardScheduleProgressBar'].style.width);
  assert.strictEqual(elements['cardScheduleMonthBadge'].textContent, "Oct '26");
  assert.ok(Number(octCount) > 0, 'October classes must be > 0');
  console.log(`✅ TEST 1 PASSED: October 2026 correctly shows Oct '26 and ${octCount} lectures.`);

  // 2. Navigate to November 2026 via Calendar Next Button
  console.log('\n--- TEST 2: Navigate Calendar to November 2026 ---');
  elements['nextMonthBtn'].click();
  const novCount = elements['cardScheduleCount'].textContent;
  console.log('Month Badge after nextMonthBtn:', elements['cardScheduleMonthBadge'].textContent);
  console.log('Schedule Count after nextMonthBtn:', novCount);
  assert.strictEqual(elements['cardScheduleMonthBadge'].textContent, "Nov '26");
  assert.ok(Number(novCount) > 0, 'November classes must be > 0');
  assert.notStrictEqual(novCount, octCount, 'November and October count should reflect month data');
  console.log(`✅ TEST 2 PASSED: Calendar forward navigation correctly updates Card 1 to Nov '26 (${novCount} lectures).`);

  // 3. Navigate to September 2026 via Calendar Prev Button (2 clicks)
  console.log('\n--- TEST 3: Navigate Calendar back to September 2026 ---');
  elements['prevMonthBtn'].click(); // Back to Oct
  elements['prevMonthBtn'].click(); // Back to Sep
  const sepCount = elements['cardScheduleCount'].textContent;
  console.log('Month Badge after prevMonthBtn:', elements['cardScheduleMonthBadge'].textContent);
  console.log('Schedule Count after prevMonthBtn:', sepCount);
  assert.strictEqual(elements['cardScheduleMonthBadge'].textContent, "Sep '26");
  assert.ok(Number(sepCount) > 0, 'September classes must be > 0');
  console.log(`✅ TEST 3 PASSED: Calendar backward navigation correctly updates Card 1 to Sep '26 (${sepCount} lectures).`);

  // 4. Test on Dashboard Tab
  console.log('\n--- TEST 4: Month Navigation on Dashboard Tab ---');
  controller.mainTab = 'dashboard';
  controller.renderDashboardView();

  const getDashEl = (id) => elements['viewSectionDashboard'].querySelector('#' + id);
  // Set dashboard to October
  controller.dashboardYear = 2026;
  controller.dashboardMonth = 9;
  controller.currentYear = 2026;
  controller.currentMonth = 9;
  controller.updateSummaryCards();
  assert.strictEqual(elements['cardScheduleMonthBadge'].textContent, "Oct '26");
  assert.strictEqual(elements['cardScheduleCount'].textContent, octCount);

  // Click Next on Dashboard
  getDashEl('dashNextPeriodBtn').click();
  console.log('Month Badge after dashNextPeriodBtn:', elements['cardScheduleMonthBadge'].textContent);
  console.log('Schedule Count after dashNextPeriodBtn:', elements['cardScheduleCount'].textContent);
  assert.strictEqual(elements['cardScheduleMonthBadge'].textContent, "Nov '26");
  assert.strictEqual(elements['cardScheduleCount'].textContent, novCount);
  console.log(`✅ TEST 4 PASSED: Dashboard Next button dynamically updates Card 1 to Nov '26 (${novCount} lectures).`);

  // Click Prev on Dashboard twice (Nov -> Oct -> Sep)
  getDashEl('dashPrevPeriodBtn').click();
  getDashEl('dashPrevPeriodBtn').click();
  console.log('Month Badge after dashPrevPeriodBtn twice:', elements['cardScheduleMonthBadge'].textContent);
  console.log('Schedule Count after dashPrevPeriodBtn twice:', elements['cardScheduleCount'].textContent);
  assert.strictEqual(elements['cardScheduleMonthBadge'].textContent, "Sep '26");
  assert.strictEqual(elements['cardScheduleCount'].textContent, sepCount);
  console.log(`✅ TEST 4B PASSED: Dashboard Prev button dynamically updates Card 1 to Sep '26 (${sepCount} lectures).`);

  // 5. Test empty month (e.g. August 2026) shows 0, NOT total fallback
  console.log('\n--- TEST 5: Month with zero lectures ---');
  controller.dashboardYear = 2026;
  controller.dashboardMonth = 7; // August
  controller.currentYear = 2026;
  controller.currentMonth = 7;
  controller.updateSummaryCards();
  console.log('Month Badge for August:', elements['cardScheduleMonthBadge'].textContent);
  console.log('Schedule Count for August:', elements['cardScheduleCount'].textContent);
  console.log('Progress width for August:', elements['cardScheduleProgressBar'].style.width);
  assert.strictEqual(elements['cardScheduleMonthBadge'].textContent, "Aug '26");
  assert.strictEqual(elements['cardScheduleCount'].textContent, '0');
  assert.strictEqual(elements['cardScheduleProgressBar'].style.width, '0%');
  console.log('✅ TEST 5 PASSED: Month with 0 lectures shows 0 and 0% progress, not falling back to all lectures.');

  console.log('\n================================================================');
  console.log('🎉 ALL SCHEDULE OVERVIEW MONTH CHANGE TESTS PASSED (100%)!');
  console.log('================================================================');
  process.exit(0);
}

testMonthChange().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
