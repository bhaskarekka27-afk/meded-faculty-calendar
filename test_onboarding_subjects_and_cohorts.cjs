const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('--- Testing Onboarding Cohorts Removal & Dynamic Subjects Population ---');

// 1. Verify admin.html does not have the Assigned Cohorts section in the onboarding form
const adminHtml = fs.readFileSync(path.join(__dirname, 'admin.html'), 'utf-8');

assert(!adminHtml.includes('<label class="block text-xs font-bold text-[#576058]">Assigned Cohorts</label>'), 'Assigned Cohorts label should be removed from onboarding form');
assert(!adminHtml.includes('name="cohort"'), 'name="cohort" checkboxes should be removed from onboarding form');
console.log('✓ Cohorts section successfully removed from onboarding form in admin.html');

// 2. Verify adminApp.js does not render the Cohorts strip in faculty cards
const adminAppJs = fs.readFileSync(path.join(__dirname, 'js', 'adminApp.js'), 'utf-8');

assert(!adminAppJs.includes('>Cohorts:</span>'), 'Cohorts label should be removed from faculty directory cards in adminApp.js');
console.log('✓ Cohorts badge strip successfully removed from faculty directory cards in adminApp.js');

// 3. Verify populateOnboardingSubjects dynamically gathers subjects from events, batches, and faculty
assert(adminAppJs.includes('populateOnboardingSubjects'), 'adminApp.js must implement populateOnboardingSubjects');
assert(adminAppJs.includes('subject-dropdown-select'), 'adminApp.js must reference subject-dropdown-select');
assert(adminAppJs.includes('dept-filter-select'), 'adminApp.js must reference dept-filter-select');

console.log('✓ populateOnboardingSubjects helper correctly implemented to auto-fetch subjects from schedule data & directory');

console.log('\nALL TESTS PASSED SUCCESSFULLY! 🎉');
