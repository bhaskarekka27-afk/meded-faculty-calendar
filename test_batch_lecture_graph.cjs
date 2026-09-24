const assert = require('assert');
const { BatchManager } = require('./js/sheetConnector.js');

const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = v; },
  removeItem: (k) => { delete storage[k]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

console.log('================================================================');
console.log('🧪 Testing Batch-Level Lecture View Graph (Day / Week / Month)');
console.log('================================================================\n');

global.toLocalIso = (d) => {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
global.todayIso = () => '2026-10-15';
global.startOfWeek = (d) => {
  const dt = new Date(d);
  const day = dt.getDay();
  dt.setDate(dt.getDate() - day);
  dt.setHours(0,0,0,0);
  return dt;
};
global.endOfWeek = (d) => {
  const dt = global.startOfWeek(d);
  dt.setDate(dt.getDate() + 6);
  dt.setHours(23,59,59,999);
  return dt;
};

// Import or require controller simulation
const fs = require('fs');
const code = fs.readFileSync('./js/adminApp.js', 'utf-8');

// Check that methods exist in adminApp.js
assert.ok(code.includes('buildBatchLectureGraphHtml()'), 'adminApp.js must define buildBatchLectureGraphHtml');
assert.ok(code.includes('attachBatchLectureGraphListeners('), 'adminApp.js must define attachBatchLectureGraphListeners');
assert.ok(code.includes('updateBatchLectureGraph('), 'adminApp.js must define updateBatchLectureGraph');
assert.ok(code.includes('id="batchLectureGraphCard"'), 'adminApp.js must render batchLectureGraphCard container');
assert.ok(code.includes('batchGraphScopeDayBtn'), 'adminApp.js must define Day-Wise button');
assert.ok(code.includes('batchGraphScopeWeekBtn'), 'adminApp.js must define Weekly button');
assert.ok(code.includes('batchGraphScopeMonthBtn'), 'adminApp.js must define Monthly button');
console.log('✅ Core Batch-Level Graph methods and DOM hooks verified in adminApp.js.\n');

// Now simulate controller class
const bm = new BatchManager();
const allEvents = bm.getAllEvents('all');
const classes = allEvents.filter(e => e.eventType === 'class' && e.isoDate);

console.log(`Curriculum Classes available: ${classes.length}`);

// Test granularity outputs
const mockController = {
  batchManager: bm,
  batchGraphGranularity: 'month',
  batchGraphCohort: 'all',
  batchGraphDayMonth: 'all',
  batchGraphSelectedKey: null
};

// Extract method function dynamically
const fnMatch = code.match(/buildBatchLectureGraphHtml\(\)\s*\{([\s\S]*?)\n  attachBatchLectureGraphListeners/);
assert.ok(fnMatch, 'buildBatchLectureGraphHtml body must be extractable');
const methodBody = fnMatch[1].trim().replace(/\}\s*$/, '');
const buildBatchLectureGraphHtml = new Function(methodBody);

// 1. Test Monthly View
console.log('--- TEST 1: Monthly Granularity View ---');
mockController.batchGraphGranularity = 'month';
mockController.batchGraphCohort = 'all';
const monthHtml = buildBatchLectureGraphHtml.call(mockController);

assert.ok(monthHtml.includes('Batch-Level Lecture Volume &amp; Rhythm'), 'Must include component title');
assert.ok(monthHtml.includes('September 2026'), 'Must render September');
assert.ok(monthHtml.includes('October 2026'), 'Must render October');
assert.ok(monthHtml.includes('November 2026'), 'Must render November');
assert.ok(monthHtml.includes("Prarambh &#39;26") || monthHtml.includes("Prarambh '26"), 'Must render Prarambh badge');
assert.ok(monthHtml.includes("Sushruta &#39;26") || monthHtml.includes("Sushruta '26"), 'Must render Sushruta badge');
assert.ok(monthHtml.includes("INI-CET &#39;26") || monthHtml.includes("INI-CET '26"), 'Must render INI-CET badge');
assert.ok(monthHtml.includes("FMGE &#39;26") || monthHtml.includes("FMGE '26"), 'Must render FMGE badge');
assert.ok(monthHtml.includes('Deep Dive'), 'Must render inspector deep dive');
console.log('✅ TEST 1 PASSED: Monthly view renders 3 months with cohort segments & breakdown.\n');

// 2. Test Weekly View
console.log('--- TEST 2: Weekly Granularity View ---');
mockController.batchGraphGranularity = 'week';
mockController.batchGraphCohort = 'all';
const weekHtml = buildBatchLectureGraphHtml.call(mockController);

assert.ok(weekHtml.includes('Calendar Timeline: W36 to W48'), 'Must include week range timeline');
assert.ok(weekHtml.includes('W36') && weekHtml.includes('W42') && weekHtml.includes('W48'), 'Must render calendar weeks');
assert.ok(weekHtml.includes('batch-graph-week-item'), 'Must render weekly interactive bars');
assert.ok(weekHtml.includes('Active Faculty'), 'Must render weekly inspector with active faculty');
console.log('✅ TEST 2 PASSED: Weekly view renders 13 weeks with stacked cohort columns.\n');

// 3. Test Day-Wise View
console.log('--- TEST 3: Day-Wise Granularity View ---');
mockController.batchGraphGranularity = 'day';
mockController.batchGraphCohort = 'all';
mockController.batchGraphDayMonth = '2026-10'; // October zoom
const dayHtml = buildBatchLectureGraphHtml.call(mockController);

assert.ok(dayHtml.includes('Day-Wise Cadence: 26 Active Teaching Days Scheduled'), 'Must render October active days');
assert.ok(dayHtml.includes('batch-graph-day-item'), 'Must render daily interactive bars');
assert.ok(dayHtml.includes('event_available'), 'Must render day inspector');
console.log('✅ TEST 3 PASSED: Day-Wise view renders daily stacked bars with scheduled sessions.\n');

// 4. Test Cohort Filter Isolation
console.log('--- TEST 4: Cohort Filter Isolation ---');
mockController.batchGraphGranularity = 'month';
mockController.batchGraphCohort = 'batch-prarambh-2026';
const prarambhHtml = buildBatchLectureGraphHtml.call(mockController);

assert.ok(prarambhHtml.includes('36 Sessions Plotted'), 'Prarambh must have exactly 36 classes');
console.log('✅ TEST 4 PASSED: Cohort filter isolates specific batch classes.\n');

console.log('================================================================');
console.log('🎉 ALL BATCH LECTURE GRAPH TESTS PASSED (100%)!');
console.log('================================================================');
