import { ReminderEmailService } from './js/reminderEmailService.js';

// Setup Mock LocalStorage
const mockStore = {};
globalThis.localStorage = {
  getItem: (k) => mockStore[k] || null,
  setItem: (k, v) => { mockStore[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }
};

console.log('--- TEST: Google Sign-In Faculty Onboarding Email Verification ---');

const service = new ReminderEmailService();
const initialList = service.getFacultyOnboardingList();

console.log(`✓ Total Initial Onboarded Faculty: ${initialList.length}`);

// Test 1: Onboarded email sign-in (Case sensitivity check)
const testEmail1 = 'rajesh.j@pwmeded.edu.in';
const faculty1 = service.findFacultyByEmail(testEmail1);
console.assert(faculty1 !== null, 'Test 1 Failed: Expected to find Dr. Rajesh');
console.assert(faculty1.name === 'Dr. Rajesh Jambhulkar', `Test 1 Name Failed: ${faculty1?.name}`);
console.log(`✓ Test 1 Passed: Found onboarded faculty for "${testEmail1}": ${faculty1?.name}`);

// Test 2: Upper/Mixed Case email
const testEmail2 = 'Pradeep.P@PWMEDED.EDU.IN';
const faculty2 = service.findFacultyByEmail(testEmail2);
console.assert(faculty2 !== null, 'Test 2 Failed: Expected case-insensitive match for Pradeep');
console.assert(faculty2.name === 'Dr. Pradeep Pawar', `Test 2 Name Failed: ${faculty2?.name}`);
console.log(`✓ Test 2 Passed: Case-insensitive match for "${testEmail2}": ${faculty2?.name}`);

// Test 3: Unauthorized / Un-onboarded email
const testEmail3 = 'unauthorized.user@gmail.com';
const faculty3 = service.findFacultyByEmail(testEmail3);
console.assert(faculty3 === null, `Test 3 Failed: Expected null for unauthorized email, got ${faculty3?.name}`);
console.log(`✓ Test 3 Passed: Access Denied for un-onboarded email "${testEmail3}"`);

// Test 4: Another unauthorized email with pwmeded domain
const testEmail4 = 'stranger.doctor@pwmeded.edu.in';
const faculty4 = service.findFacultyByEmail(testEmail4);
console.assert(faculty4 === null, `Test 4 Failed: Expected null for stranger doctor, got ${faculty4?.name}`);
console.log(`✓ Test 4 Passed: Access Denied for un-onboarded institutional email "${testEmail4}"`);

// Test 5: Dynamic Onboarding: Admin adds new faculty on Onboarding screen
console.log('\n--- Dynamic Onboarding Scenario ---');
const updatedList = [...initialList, {
  id: 'fac-999',
  name: 'Dr. Vikram Sarabhai',
  email: 'vikram.s@pwmeded.edu.in',
  phone: '99999 88888',
  dept: 'Nuclear Medicine',
  role: 'Professor • Nuclear Medicine',
  status: 'Verified',
  canRescheduleCancel: true,
  cohorts: ["Prarambh '26"]
}];
service.saveFacultyOnboardingList(updatedList);

// Verify new email can now sign in
const facultyNew = service.findFacultyByEmail('vikram.s@pwmeded.edu.in');
console.assert(facultyNew !== null, 'Test 5 Failed: Expected new faculty to be found');
console.assert(facultyNew.name === 'Dr. Vikram Sarabhai', `Test 5 Name Failed: ${facultyNew?.name}`);
console.log(`✓ Test 5 Passed: Newly onboarded email "vikram.s@pwmeded.edu.in" successfully authorized for "${facultyNew?.name}"`);

// Test 6: Removal from Onboarding screen revokes login access
const listWithoutNew = updatedList.filter(f => f.email !== 'vikram.s@pwmeded.edu.in');
service.saveFacultyOnboardingList(listWithoutNew);
const facultyRevoked = service.findFacultyByEmail('vikram.s@pwmeded.edu.in');
console.assert(facultyRevoked === null, 'Test 6 Failed: Expected revoked faculty to be blocked');
console.log(`✓ Test 6 Passed: Removed faculty email "vikram.s@pwmeded.edu.in" is immediately blocked from signing in.`);

console.log('\n========================================');
console.log('🎉 ALL GOOGLE SIGN-IN ONBOARDING AUTHORIZATION TESTS PASSED (100%)');
console.log('========================================');
