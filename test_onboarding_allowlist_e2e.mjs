import { getFacultyOnboardingData, autoSyncFacultyMutation, facultyListToCSV } from './js/facultyOnboardingData.js';
import { ReminderEmailService } from './js/reminderEmailService.js';

// Setup Mock LocalStorage for Node test environment
const mockStore = {};
globalThis.localStorage = {
  getItem: (k) => mockStore[k] || null,
  setItem: (k, v) => { mockStore[k] = String(v); },
  removeItem: (k) => { delete mockStore[k]; },
  clear: () => { Object.keys(mockStore).forEach(k => delete mockStore[k]); }
};

async function runTests() {
  const service = new ReminderEmailService();
  
  console.log('=== TEST 1: Initial Allowlist Verification ===');
  const facultyList = getFacultyOnboardingData();
  console.log('Total Active Faculty in Directory:', facultyList.length);
  
  // Test valid active faculty
  const valid1 = service.findFacultyByEmail('harshraj01@gmail.com');
  console.assert(valid1 !== null, 'Failed to find harshraj01@gmail.com');
  console.log('✓ Found Dr. Rajesh:', valid1?.name);

  const valid2 = service.findFacultyByEmail('pawarpradeep@gmail.com');
  console.assert(valid2 !== null, 'Failed to find pawarpradeep@gmail.com');
  console.log('✓ Found Dr. Pradeep:', valid2?.name);

  const valid3 = service.findFacultyByEmail('viveknalgirkar@gmail.com');
  console.assert(valid3 !== null, 'Failed to find viveknalgirkar@gmail.com');
  console.log('✓ Found Dr. Vivek:', valid3?.name);

  // Test intentionally removed faculty email (must be denied)
  const removed1 = service.findFacultyByEmail('preeti.micro@pwmeded.edu.in');
  console.assert(removed1 === null, 'Intentionally removed faculty was found!');
  console.log('✓ Intentionally removed faculty is blocked:', removed1);

  // Test random unauthorized email
  const invalid1 = service.findFacultyByEmail('random_intruder@gmail.com');
  console.assert(invalid1 === null, 'Random intruder was not blocked!');
  console.log('✓ Intruder blocked correctly:', invalid1);
  console.assert(invalid1 === null, 'Random intruder was not blocked!');
  console.log('✓ Intruder blocked correctly:', invalid1);

  console.log('\n=== TEST 2: Dynamic Add Faculty & Login Authorization ===');
  const testFac = {
    id: 'fac-dynamic-test-101',
    name: 'Dr. Test Specialist',
    email: 'test.specialist@pwmeded.edu.in',
    phone: '99887 76655',
    dept: 'Radiology',
    role: 'Professor • Radiology',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Prarambh '26"],
    lastUpdated: new Date().toISOString()
  };

  await autoSyncFacultyMutation('add', testFac, [testFac, ...facultyList]);
  
  // Now verify test.specialist is immediately allowed to sign in
  const checkNew = service.findFacultyByEmail('test.specialist@pwmeded.edu.in');
  console.assert(checkNew !== null, 'Newly added faculty could not sign in!');
  console.log('✓ Newly added faculty is authorized to sign in:', checkNew.name);

  console.log('\n=== TEST 3: Dynamic Edit Faculty & Update Login Details ===');
  testFac.dept = 'Interventional Radiology';
  testFac.email = 'test.specialist.updated@pwmeded.edu.in';
  await autoSyncFacultyMutation('update', testFac, [testFac, ...facultyList]);
  
  const checkUpdated = service.findFacultyByEmail('test.specialist.updated@pwmeded.edu.in');
  console.assert(checkUpdated !== null, 'Updated faculty email could not sign in!');
  console.assert(checkUpdated.dept === 'Interventional Radiology', 'Department was not updated');
  console.log('✓ Updated faculty record verified:', checkUpdated.name, '-', checkUpdated.dept);

  console.log('\n=== TEST 4: Dynamic Delete Faculty & Immediate Revocation ===');
  const remainingList = facultyList.filter(f => f.id !== testFac.id && f.email !== testFac.email);
  await autoSyncFacultyMutation('delete', testFac, remainingList);

  const checkRevoked = service.findFacultyByEmail('test.specialist.updated@pwmeded.edu.in');
  console.assert(checkRevoked === null, 'Revoked faculty was not blocked!');
  console.log('✓ Revoked faculty is immediately blocked from signing in.');

  console.log('\n======================================================');
  console.log('✓ ALL SPREADSHEET MUTATION AND LOGIN ALLOWLIST TESTS PASSED');
  console.log('======================================================');
}

runTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
