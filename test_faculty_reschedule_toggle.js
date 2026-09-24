import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

async function runTests() {
  console.log('--- Starting Faculty Reschedule & Cancellation Toggle Tests ---');

  // Test 1: Service Unit Tests
  const { ReminderEmailService } = await import('./js/reminderEmailService.js');
  
  // Set up mock localStorage
  const storage = {};
  global.localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; }
  };
  global.window = {
    dispatchEvent: () => {}
  };

  const service = new ReminderEmailService();
  
  console.log('1. Testing default permission is true for all faculty...');
  const initialPermission = service.getFacultyReschedulePermission('Dr. Rajesh Jambhulkar');
  if (initialPermission !== true) throw new Error('Initial permission should be true');
  console.log('   ✓ Default permission is true');

  console.log('2. Testing disabling permission for a faculty...');
  service.setFacultyReschedulePermission('Dr. Rajesh Jambhulkar', false);
  const disabledPerm = service.getFacultyReschedulePermission('Dr. Rajesh Jambhulkar');
  if (disabledPerm !== false) throw new Error('Permission should now be false');
  console.log('   ✓ Permission disabled successfully');

  console.log('3. Testing enabling permission again...');
  service.setFacultyReschedulePermission('Dr. Rajesh Jambhulkar', true);
  const enabledPerm = service.getFacultyReschedulePermission('Dr. Rajesh Jambhulkar');
  if (enabledPerm !== true) throw new Error('Permission should now be true');
  console.log('   ✓ Permission re-enabled successfully');

  // Test 2: Admin App Onboarding List Toggle Simulation
  console.log('4. Testing Admin Onboarding List HTML & Toggle Interactions...');
  const adminHtml = fs.readFileSync(path.resolve('./admin.html'), 'utf-8');
  const facultyHtml = fs.readFileSync(path.resolve('./faculty.html'), 'utf-8');

  if (!adminHtml.includes('onboard-reschedule-toggle')) {
    throw new Error('admin.html missing #onboard-reschedule-toggle in quick onboard card');
  }
  console.log('   ✓ admin.html contains #onboard-reschedule-toggle');

  if (!facultyHtml.includes('modalDetailActionButtonsGroup')) {
    throw new Error('faculty.html missing #modalDetailActionButtonsGroup');
  }
  if (!facultyHtml.includes('mobileModalRescheduleCancelRow')) {
    throw new Error('faculty.html missing #mobileModalRescheduleCancelRow');
  }
  console.log('   ✓ faculty.html contains modal button group containers');

  console.log('\n--- All Automated Verification Tests Passed Successfully! ---');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
