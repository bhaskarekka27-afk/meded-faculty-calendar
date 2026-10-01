const assert = require('assert');
const fs = require('fs');

console.log('================================================================');
console.log('🧪 Testing Left Arrow Placed After All Subjects & Dynamic Visibility');
console.log('================================================================\n');

const htmlFiles = ['admin.html', 'index.html', 'week.html', 'timeline.html'];

htmlFiles.forEach(file => {
  const content = fs.readFileSync(`./${file}`, 'utf-8');

  // Verify btnSubjectFilterAll is present and placed BEFORE btnSubjectScrollLeft
  const allIdx = content.indexOf('id="btnSubjectFilterAll"');
  const leftIdx = content.indexOf('id="btnSubjectScrollLeft"');
  const scrollIdx = content.indexOf('id="adminSubjectFiltersScroll"');
  const rightIdx = content.indexOf('id="btnSubjectScrollRight"');

  assert.ok(allIdx !== -1, `${file} must include #btnSubjectFilterAll`);
  assert.ok(leftIdx !== -1, `${file} must include #btnSubjectScrollLeft`);
  assert.ok(scrollIdx !== -1, `${file} must include #adminSubjectFiltersScroll`);
  assert.ok(rightIdx !== -1, `${file} must include #btnSubjectScrollRight`);

  // Verify the order: All Subjects -> Left Arrow (<) -> Scroll Container -> Right Arrow (>)
  assert.ok(allIdx < leftIdx, `${file}: #btnSubjectScrollLeft must be placed AFTER #btnSubjectFilterAll`);
  assert.ok(leftIdx < scrollIdx, `${file}: #adminSubjectFiltersScroll must be placed AFTER #btnSubjectScrollLeft`);
  assert.ok(scrollIdx < rightIdx, `${file}: #btnSubjectScrollRight must be placed AFTER #adminSubjectFiltersScroll`);

  console.log(`✅ ${file}: Order verified: [ All Subjects ] -> [ < ] -> [ Scroll Container ] -> [ > ]`);
});

console.log('\n--- Verifying Dynamic Arrow Visibility in js/adminApp.js ---');
const js = fs.readFileSync('./js/adminApp.js', 'utf-8');

assert.ok(js.includes('canLeft = scrollLeft > 2 && maxScroll > 0'), 'adminApp.js must only show left arrow when scrollLeft > 2 and maxScroll > 0');
assert.ok(js.includes("leftBtn.classList.remove('hidden')"), 'adminApp.js must show leftBtn when canLeft is true');
assert.ok(js.includes("leftBtn.classList.add('hidden')"), 'adminApp.js must hide leftBtn when canLeft is false');

console.log('✅ adminApp.js: Left arrow dynamic visibility logic verified.\n');

console.log('================================================================');
console.log('🎉 ALL DYNAMIC LEFT ARROW PLACEMENT & SCROLL TESTS PASSED (100%)!');
console.log('================================================================');
