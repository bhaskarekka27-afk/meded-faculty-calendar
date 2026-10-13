// Test verification script: Dropdown Height Just Above Navigation & UI-Based Scroller
const fs = require('fs');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 Verifying Dropdown Height Just Above Dock & UI-Based Scroller');
console.log('================================================================\n');

const htmlFiles = ['faculty.html', 'admin.html', 'index.html', 'week.html', 'timeline.html'];

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');

  // Check header present in both admin and faculty
  assert.ok(content.includes('Select Active Batch'), `${file} must contain "Select Active Batch" header`);
  if (file !== 'faculty.html') {
    assert.ok(content.includes('Live Google Sheets'), `${file} must contain "Live Google Sheets" header`);
  }

  console.log(`✅ ${file}: Batch dropdown markup verified.`);
});

// Check css/3d-aesthetic.css
const cssContent = fs.readFileSync('css/3d-aesthetic.css', 'utf8');
assert.ok(cssContent.includes('#adminBatchDropdown'), 'CSS should target #adminBatchDropdown');
assert.ok(cssContent.includes('#facultyBatchDropdown'), 'CSS should target #facultyBatchDropdown');
assert.ok(cssContent.includes('#adminBatchDropdownList'), 'CSS should target #adminBatchDropdownList');
assert.ok(cssContent.includes('#facultyBatchDropdownList'), 'CSS should target #facultyBatchDropdownList');

// Height reduced to just above bottom navigation menu (Candy Dock at fixed bottom-6)
assert.ok(cssContent.includes('calc(100vh - 148px) !important;'), 'Dropdown max-height must be constrained above bottom navigation bar');
assert.ok(cssContent.includes('calc(100dvh - 148px) !important;'), 'Dropdown max-height must support 100dvh for mobile');

// Overflow and UI-based scroller rules
assert.ok(cssContent.includes('overflow-y: auto !important;'), 'Dropdown list must have overflow-y: auto');
assert.ok(cssContent.includes('#adminBatchDropdownList::-webkit-scrollbar'), 'CSS must define custom WebKit scroller for #adminBatchDropdownList');
assert.ok(cssContent.includes('#adminBatchDropdownList::-webkit-scrollbar-thumb'), 'CSS must define custom UI scrollbar thumb');
assert.ok(cssContent.includes('#adminBatchDropdownList::-webkit-scrollbar-track'), 'CSS must define custom UI scrollbar track');
assert.ok(cssContent.includes('scrollbar-color: #9ab2a1 #f5f1ea !important;'), 'CSS must define UI scrollbar-color for Firefox');

console.log('✅ css/3d-aesthetic.css: Verified reduced height (above nav menu) & themed UI-based scroller.');

console.log('\n================================================================');
console.log('🎉 ALL DROPDOWN HEIGHT & UI SCROLLER TESTS PASSED (100%)!');
console.log('================================================================\n');

