const assert = require('assert');

console.log('================================================================');
console.log('🧪 Testing Dashboard Independent Week/Month Switching & < Today > Navigation');
console.log('================================================================\n');

// Mock DOM elements required for controller initialization
const elements = {};
function createMockElement(id) {
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
      add: () => {},
      remove: () => {},
      toggle: () => {},
      contains: () => false
    },
    addEventListener: (evt, handler) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(handler);
    },
    dispatchEvent: (evt) => {
      if (listeners[evt]) {
        listeners[evt].forEach(h => h({ stopPropagation: () => {}, target: elements[id] }));
      }
    },
    click: function() {
      if (listeners['click']) {
        listeners['click'].forEach(h => h({ stopPropagation: () => {}, target: this }));
      }
    },
    appendChild: () => {},
    querySelector: (sel) => {
      // Find sub element by ID in innerHTML or create mock
      const match = sel.match(/#([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        if (!elements[match[1]]) elements[match[1]] = createMockElement(match[1]);
        return elements[match[1]];
      }
      return createMockElement('sub-' + Math.random().toString(36).slice(2, 6));
    },
    querySelectorAll: () => [],
    setAttribute: () => {},
    getAttribute: () => null,
    scrollIntoView: () => {},
    scrollBy: () => {},
    scrollLeft: 0,
    clientWidth: 800,
    scrollWidth: 1200
  };
}

const elementIds = [
  'adminBatchLabel', 'adminBatchDropdown', 'adminBatchDropdownList', 'adminSearchInput',
  'adminLogoBtn', 'adminDeanProfileBtn', 'adminDeanDropdown', 'adminCurrentMonthTitle',
  'prevMonthBtn', 'nextMonthBtn', 'todayMonthBtn',
  'btnViewMonth', 'btnViewWeek', 'btnViewTimeline',
  'cardScheduleOverviewBtn', 'cardScheduleCount', 'cardScheduleMonthBadge', 'cardScheduleProgressBar',
  'cardActiveFacultyBtn', 'cardFacultyCount', 'cardFacultyAvatars', 'cardSubjectsSummary', 'cardFacultyCoverageBadge',
  'cardFacultyHighlightsCard', 'cardFacultyHighlightsClassesCount', 'cardFacultyHighlightsFacultyCount',
  'cardFacultyHighlightsScopeBadge', 'cardFacultyHighlightsProgressBar', 'cardFacultyHighlightsChips',
  'cardFacultyScopeDay', 'cardFacultyScopeWeek', 'cardFacultyScopeMonth',
  'cardCurriculumPaceSubtitle', 'cardCurriculumPacePercent', 'cardCurriculumPaceStatus', 'cardCurriculumPaceBadge',
  'btnSubjectScrollLeft', 'btnSubjectScrollRight', 'adminSubjectFiltersScroll', 'adminSubjectFilters',
  'viewSectionCalendar', 'viewSectionWeek', 'viewSectionTimeline', 'viewSectionDashboard',
  'viewSectionFaculty', 'viewSectionOnboarding', 'viewSectionWorkload',
  'adminActionControlsBar', 'adminSummaryCardsContainer',
  'adminCalendarGrid', 'adminWeekdayHeaders', 'adminToast'
];

elementIds.forEach(id => {
  elements[id] = createMockElement(id);
});

// Setup global browser mock
global.window = {
  location: { search: '', pathname: '/admin.html', hash: '' },
  addEventListener: () => {}
};
global.document = {
  getElementById: (id) => elements[id] || (elements[id] = createMockElement(id)),
  createElement: (tag) => createMockElement('created-' + tag),
  addEventListener: () => {},
  querySelectorAll: () => [],
  body: createMockElement('body')
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

async function runTests() {
  const { toLocalIso, parseIso } = await import('./js/dateUtils.js');
  const { AdminDashboardController } = await import('./js/adminApp.js');
  const controller = new AdminDashboardController();

  console.log('--- TEST 1: Initial Dashboard State (Independent Default) ---');
  assert.strictEqual(controller.dashboardScope, 'month', 'Initial dashboard scope must be month');
  assert.strictEqual(controller.dashboardMonth, new Date().getMonth(), 'Initial dashboard month must match current month');
  console.log(`✅ Default dashboard scope: ${controller.dashboardScope} (${controller.dashboardMonth + 1}/${controller.dashboardYear})`);

  console.log('\n--- TEST 2: Independence from Calendar View Switching ---');
  // Calendar switches to Week
  elements['btnViewWeek'].click();
  assert.strictEqual(controller.calendarSubView, 'week', 'Calendar subview should be week');
  assert.strictEqual(controller.dashboardScope, 'month', 'Dashboard scope MUST REMAIN month when calendar switches to week');

  // Calendar switches to Timeline
  elements['btnViewTimeline'].click();
  assert.strictEqual(controller.calendarSubView, 'timeline', 'Calendar subview should be timeline');
  assert.strictEqual(controller.dashboardScope, 'month', 'Dashboard scope MUST REMAIN month when calendar switches to timeline');
  console.log('✅ Switching calendar views does NOT overwrite dashboardScope.');

  console.log('\n--- TEST 3: Render Dashboard View & Verify Controls ---');
  controller.renderDashboardView();
  const dashHtml = elements['viewSectionDashboard'].innerHTML;

  assert.ok(dashHtml.includes('id="dashPeriodTitleDisplay"'), 'Dashboard must have period display badge');
  assert.ok(dashHtml.includes('id="dashPrevPeriodBtn"'), 'Dashboard must have < previous period button');
  assert.ok(dashHtml.includes('id="dashTodayPeriodBtn"'), 'Dashboard must have Today button');
  assert.ok(dashHtml.includes('id="dashNextPeriodBtn"'), 'Dashboard must have > next period button');
  assert.ok(dashHtml.includes('id="dashScopeMonthBtn"'), 'Dashboard must have Month scope button');
  assert.ok(dashHtml.includes('id="dashScopeWeekBtn"'), 'Dashboard must have Week scope button');
  assert.ok(dashHtml.includes('id="dashScopeDayBtn"'), 'Dashboard must have Day scope button');
  const initialMonth = controller.dashboardMonth;
  console.log('✅ Dashboard successfully renders period title, < Today > buttons, and Month/Week/Day switchers.');

  const getDashEl = (id) => elements['viewSectionDashboard'].querySelector('#' + id);

  console.log('\n--- TEST 4: Monthly Navigation on Dashboard (< Today >) ---');
  // Click Next Month on Dashboard
  getDashEl('dashNextPeriodBtn').click();
  assert.strictEqual(controller.dashboardMonth, initialMonth + 1, 'Clicking next should increment dashboardMonth');

  // Click Previous Month on Dashboard
  getDashEl('dashPrevPeriodBtn').click();
  assert.strictEqual(controller.dashboardMonth, initialMonth, 'Clicking prev should decrement dashboardMonth back');
  console.log('✅ Dashboard Month navigation works correctly and independently of Calendar.');

  console.log('\n--- TEST 5: Switching to Week Scope on Dashboard ---');
  getDashEl('dashScopeWeekBtn').click();
  assert.strictEqual(controller.dashboardScope, 'week', 'Dashboard scope should now be week');
  assert.ok(elements['viewSectionDashboard'].innerHTML.includes('Week'), 'Dashboard should display Week period text');
  console.log('✅ Dashboard successfully switched to Week scope.');

  console.log('\n--- TEST 6: Weekly Navigation on Dashboard (< Today >) ---');
  const prevWeekTime = controller.dashboardWeekStart.getTime();
  getDashEl('dashNextPeriodBtn').click();
  const nextWeekTime = controller.dashboardWeekStart.getTime();
  assert.strictEqual(nextWeekTime - prevWeekTime, 7 * 24 * 60 * 60 * 1000, 'Next week should advance by exactly 7 days');

  // Today button resets to current date
  getDashEl('dashTodayPeriodBtn').click();
  assert.strictEqual(controller.dashboardMonth, new Date().getMonth(), 'Today button resets to current month');
  assert.strictEqual(controller.dashboardYear, new Date().getFullYear(), 'Today button resets to current year');
  console.log('✅ Weekly forward navigation and Today reset verified.');

  console.log('\n--- TEST 7: Switching to Day Scope on Dashboard ---');
  getDashEl('dashScopeDayBtn').click();
  assert.strictEqual(controller.dashboardScope, 'day', 'Dashboard scope should now be day');

  const currentDay = controller.dashboardDayIso;
  const expectedPrev = toLocalIso(new Date(parseIso(currentDay).getTime() - 86400000));
  getDashEl('dashPrevPeriodBtn').click();
  assert.strictEqual(controller.dashboardDayIso, expectedPrev, 'Previous day should decrement day ISO');
  console.log('✅ Day scope navigation verified.');

  console.log('\n================================================================');
  console.log('🎉 ALL DASHBOARD INDEPENDENT NAVIGATION TESTS PASSED (100%)!');
  console.log('================================================================');
}

runTests().catch(err => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
