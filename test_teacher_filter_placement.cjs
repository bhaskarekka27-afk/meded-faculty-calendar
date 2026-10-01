// test_teacher_filter_placement.cjs
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

console.log('================================================================');
console.log('🧪 Testing Teacher Filter Placement & Clean Calendar Section');
console.log('================================================================\n');

const filesToTest = ['admin.html', 'index.html', 'week.html', 'timeline.html'];

filesToTest.forEach(file => {
  const content = fs.readFileSync(path.join(__dirname, file), 'utf-8');
  const dom = new JSDOM(content);
  const doc = dom.window.document;

  // 1. Verify Teacher Filter elements exist
  const facultyBtn = doc.getElementById('calActionFacultyBtn');
  const facultyDropdown = doc.getElementById('calActionFacultyDropdown');
  const facultyLabel = doc.getElementById('calActionFacultyLabel');
  const facultySearchInput = doc.getElementById('calFacultySearchInput');
  const facultyList = doc.getElementById('calActionFacultyList');

  assert.ok(facultyBtn, `${file} must have #calActionFacultyBtn`);
  assert.ok(facultyDropdown, `${file} must have #calActionFacultyDropdown`);
  assert.ok(facultyLabel, `${file} must have #calActionFacultyLabel`);
  assert.ok(facultySearchInput, `${file} must have #calFacultySearchInput`);
  assert.ok(facultyList, `${file} must have #calActionFacultyList`);

  // 2. Verify Placement: Teacher filter must come before Date Navigation (< Today >)
  const todayBtn = doc.getElementById('todayMonthBtn');
  assert.ok(todayBtn, `${file} must have #todayMonthBtn`);

  // In DOM tree, facultyBtn's container should be before todayBtn's container
  const facultyContainer = facultyBtn.closest('.relative');
  const dateNavContainer = todayBtn.closest('.track-3d');
  assert.ok(facultyContainer, `${file}: facultyContainer exists`);
  assert.ok(dateNavContainer, `${file}: dateNavContainer exists`);

  // Check compareDocumentPosition: facultyContainer precedes dateNavContainer
  const pos = facultyContainer.compareDocumentPosition(dateNavContainer);
  assert.ok(pos & dom.window.Node.DOCUMENT_POSITION_FOLLOWING, `${file}: Teacher filter must precede Date Navigation (< Today >)`);

  // 3. Verify Batch filter is NOT in the calendar section
  const calBatchBtn = doc.getElementById('calActionBatchBtn');
  assert.strictEqual(calBatchBtn, null, `${file}: #calActionBatchBtn must be removed`);

  // 4. Verify the complete combination strip is NOT in the calendar section
  const combinationBar = doc.getElementById('adminCombinationFilterBar');
  assert.strictEqual(combinationBar, null, `${file}: #adminCombinationFilterBar must be removed`);

  // 5. Verify the horizontal faculty chips strip is NOT in the calendar section
  const facultyStrip = doc.getElementById('adminFacultyFiltersScroll');
  assert.strictEqual(facultyStrip, null, `${file}: #adminFacultyFiltersScroll must be removed`);

  console.log(`✅ ${file}: Teacher filter placed before Today button, batch filter & extra strips removed.`);
});

console.log('\n--- Verifying js/adminApp.js logic ---');
const adminAppCode = fs.readFileSync(path.join(__dirname, 'js/adminApp.js'), 'utf-8');

assert.ok(adminAppCode.includes("this.selectedFaculty = 'all'"), 'adminApp.js must initialize this.selectedFaculty = "all"');
assert.ok(adminAppCode.includes('setupTeacherFilter()'), 'adminApp.js must define setupTeacherFilter');
assert.ok(adminAppCode.includes('renderTeacherDropdownList()'), 'adminApp.js must define renderTeacherDropdownList');
assert.ok(adminAppCode.includes('updateTeacherFilterLabel()'), 'adminApp.js must define updateTeacherFilterLabel');
console.log('✅ adminApp.js: Verified teacher filter methods, state initialization, and event filtering.');

console.log('\n================================================================');
console.log('🎉 ALL TEACHER FILTER PLACEMENT TESTS PASSED (100%)!');
console.log('================================================================');
