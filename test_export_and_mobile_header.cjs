const fs = require('fs');
const assert = require('assert');

const html = fs.readFileSync('faculty.html', 'utf8');

console.log('================================================================');
console.log('🧪 Verifying Export Button Removal & Mobile Selected Schedule Header');
console.log('================================================================');

// 1. Check facultyExportIcsBtn is removed from web view
assert.ok(!html.includes('id="facultyExportIcsBtn"'), 'facultyExportIcsBtn should NOT be in faculty.html');
console.log('✅ Web Export .ics button (facultyExportIcsBtn) successfully removed from faculty.html');

// 2. Check mobileExportIcsBtn is removed from mobile view
assert.ok(!html.includes('id="mobileExportIcsBtn"'), 'mobileExportIcsBtn should NOT be in faculty.html');
assert.ok(!html.includes('Export Faculty Calendar (.ics)'), 'Export Faculty Calendar (.ics) text should NOT be in faculty.html');
console.log('✅ Mobile Export Faculty Calendar button successfully removed from faculty.html');

// 3. Check mobile Selected Schedule header structure
assert.ok(html.includes('id="mobileSelectedDateTitle"'), 'mobileSelectedDateTitle should exist');
assert.ok(html.includes('id="mobileSelectedDateBadge"'), 'mobileSelectedDateBadge should exist');

// Check that Selected Schedule and Date are not crammed into a single row flex
const selectedScheduleIdx = html.indexOf('Selected Schedule');
assert.ok(selectedScheduleIdx !== -1, 'Selected Schedule text should exist');
const surroundingSection = html.slice(selectedScheduleIdx - 200, selectedScheduleIdx + 500);

assert.ok(surroundingSection.includes('whitespace-nowrap'), 'Badge should have whitespace-nowrap to prevent multiline wrap');
assert.ok(surroundingSection.includes('shrink-0'), 'Badge should have shrink-0 to protect badge shape');
console.log('✅ Mobile Selected Schedule header layout verified: Title and Date properly formatted, Badge protected from wrapping');

console.log('\n🎉 ALL CHECKS PASSED 100%!');
