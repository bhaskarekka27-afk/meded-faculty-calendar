const assert = require('assert');
const fs = require('fs');

console.log('================================================================');
console.log('🧪 Testing Subject Navigation Bar (Single Line + Left/Right Arrows)');
console.log('================================================================\n');

const filesToTest = ['admin.html', 'index.html', 'week.html', 'timeline.html'];

filesToTest.forEach(file => {
  const content = fs.readFileSync(`./${file}`, 'utf-8');
  assert.ok(content.includes('id="btnSubjectScrollLeft"'), `${file} must include #btnSubjectScrollLeft`);
  assert.ok(content.includes('id="adminSubjectFiltersScroll"'), `${file} must include #adminSubjectFiltersScroll`);
  assert.ok(content.includes('id="adminSubjectFilters"'), `${file} must include #adminSubjectFilters`);
  assert.ok(content.includes('id="btnSubjectScrollRight"'), `${file} must include #btnSubjectScrollRight`);

  // Verify single-line styling (no flex-wrap in subject container)
  assert.ok(content.includes('flex-nowrap whitespace-nowrap min-w-max'), `${file} subject container must have flex-nowrap and whitespace-nowrap`);
  assert.ok(content.includes('no-scrollbar'), `${file} scroll wrapper must have no-scrollbar`);
  console.log(`✅ ${file}: Verified single-line container with left and right navigation arrows.`);
});

// Verify CSS utility
const cssContent = fs.readFileSync('./css/3d-aesthetic.css', 'utf-8');
assert.ok(cssContent.includes('.no-scrollbar'), '3d-aesthetic.css must define .no-scrollbar utility');
console.log('✅ 3d-aesthetic.css: Verified .no-scrollbar class utility.\n');

// Verify JS implementation
const jsContent = fs.readFileSync('./js/adminApp.js', 'utf-8');
assert.ok(jsContent.includes("container.classList.add('flex-nowrap', 'whitespace-nowrap'"), 'adminApp.js must enforce flex-nowrap and whitespace-nowrap');
assert.ok(jsContent.includes("container.classList.remove('flex-wrap')"), 'adminApp.js must remove flex-wrap');
assert.ok(jsContent.includes('shrink-0 whitespace-nowrap'), 'adminApp.js must set shrink-0 and whitespace-nowrap on subject buttons');
assert.ok(jsContent.includes('setupSubjectFilterScroll()'), 'adminApp.js must define setupSubjectFilterScroll');
assert.ok(jsContent.includes('scrollBy({ left: -220, behavior: \'smooth\' })'), 'adminApp.js must handle smooth left scroll');
assert.ok(jsContent.includes('scrollBy({ left: 220, behavior: \'smooth\' })'), 'adminApp.js must handle smooth right scroll');
assert.ok(jsContent.includes('scrollIntoView({ behavior: \'smooth\', block: \'nearest\', inline: \'center\' })'), 'adminApp.js must scroll active pill into view');

console.log('✅ adminApp.js: Verified single-line pill rendering, click centering, and arrow event handlers.\n');

console.log('================================================================');
console.log('🎉 ALL SUBJECT SCROLL NAVIGATION TESTS PASSED (100%)!');
console.log('================================================================');
