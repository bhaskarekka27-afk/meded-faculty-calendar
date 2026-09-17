const fs = require('fs');
const assert = require('assert');

console.log('================================================================');
console.log('🧪 Verifying Mobile Week View Grid & Design');
console.log('================================================================');

const html = fs.readFileSync('faculty.html', 'utf8');

// Check Week View Grid in DOM
assert.ok(html.includes('id="mobileViewSectionWeek"'), 'mobileViewSectionWeek should exist in faculty.html');
assert.ok(html.includes('id="mobileWeekDaysGrid"'), 'mobileWeekDaysGrid should exist in faculty.html');
assert.ok(html.includes('id="mobileWeekRangeBadge"'), 'mobileWeekRangeBadge should exist in faculty.html');
assert.ok(html.includes('id="mobileWeekLiveCount"'), 'mobileWeekLiveCount should exist in faculty.html');

// Check Shared Sections
assert.ok(html.includes('id="mobileSharedScheduleSections"'), 'mobileSharedScheduleSections should exist in faculty.html');
assert.ok(html.includes('id="mobileSelectedScheduleContainer"'), 'mobileSelectedScheduleContainer should exist in faculty.html');
assert.ok(html.includes('id="mobileUpcomingLecturesContainer"'), 'mobileUpcomingLecturesContainer should exist in faculty.html');

console.log('✅ DOM structure for Mobile Week View Grid and Shared Sections verified in faculty.html.');

const js = fs.readFileSync('js/facultyApp.js', 'utf8');
assert.ok(js.includes('renderMobileWeekGrid'), 'renderMobileWeekGrid function should exist in facultyApp.js');
assert.ok(js.includes('getMobileWeekDays'), 'getMobileWeekDays function should exist in facultyApp.js');
assert.ok(js.includes('mobileSharedScheduleSections'), 'mobileSharedScheduleSections should be referenced in facultyApp.js');

console.log('✅ Controller logic for Mobile Week View Grid verified in facultyApp.js.');

console.log('\n🎉 ALL CHECKS PASSED 100%!');
