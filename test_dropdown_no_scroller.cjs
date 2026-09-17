// Test verification script: Dropdown Natural Extension and Zero Scrollbars
const fs = require('fs');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 Verifying Dropdown Scroller Removal & Natural Extension');
console.log('================================================================\n');

const htmlFiles = ['faculty.html', 'admin.html', 'index.html', 'week.html', 'timeline.html'];

htmlFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // Check that batch dropdown lists don't have max-h or overflow-y-auto
  const hasBatchMaxH = /id=["'](faculty|admin)BatchDropdownList["'][^>]*max-h-/.test(content);
  const hasBatchOverflow = /id=["'](faculty|admin)BatchDropdownList["'][^>]*overflow-y-auto/.test(content);
  
  assert.strictEqual(hasBatchMaxH, false, `${file} should not have max-h on BatchDropdownList`);
  assert.strictEqual(hasBatchOverflow, false, `${file} should not have overflow-y-auto on BatchDropdownList`);

  // Check header present in both admin and faculty
  assert.ok(content.includes('Select Active Batch'), `${file} must contain "Select Active Batch" header`);
  assert.ok(content.includes('Live Google Sheets'), `${file} must contain "Live Google Sheets" header`);

  console.log(`✅ ${file}: Batch dropdown has no max-height or scrollbar, and includes the standardized Live Google Sheets header.`);
});

// Check css/3d-aesthetic.css
const cssContent = fs.readFileSync('css/3d-aesthetic.css', 'utf8');
assert.ok(cssContent.includes('#facultyBatchDropdownList'), 'CSS should target #facultyBatchDropdownList');
assert.ok(cssContent.includes('#adminBatchDropdownList'), 'CSS should target #adminBatchDropdownList');
assert.ok(cssContent.includes('max-height: none !important;'), 'CSS must specify max-height: none !important');
assert.ok(cssContent.includes('overflow: visible !important;'), 'CSS must specify overflow: visible !important');
console.log('✅ css/3d-aesthetic.css: Verified CSS rules for natural list expansion and scrollbar suppression.');

console.log('\n================================================================');
console.log('🎉 ALL DROPDOWN SCROLLER REMOVAL TESTS PASSED (100%)!');
console.log('================================================================\n');
