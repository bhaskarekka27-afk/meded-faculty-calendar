import assert from 'assert';
import { 
  DEFAULT_FACULTY_ONBOARDING,
  getFacultyOnboardingData,
  saveFacultyOnboardingData,
  upsertFacultyMember,
  deleteFacultyMember,
  syncFacultyFromBatches,
  exportFacultyOnboardingAsCode,
  ONBOARDING_STORAGE_KEY
} from './js/facultyOnboardingData.js';
import { ReminderEmailService } from './js/reminderEmailService.js';
import { DEFAULT_BATCHES } from './js/defaultData.js';

// Setup Mock Environment
const store = {};
globalThis.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); }
};

let eventDispatched = false;
let eventDetail = null;
globalThis.window = {
  dispatchEvent: (ev) => {
    eventDispatched = true;
    eventDetail = ev.detail;
  }
};
globalThis.CustomEvent = class CustomEvent {
  constructor(name, opts) {
    this.name = name;
    this.detail = opts?.detail;
  }
};

console.log('--- TEST: Dynamic Faculty Onboarding State & Storage in Code ---');

// 1. Initial State from Code Defaults
const list1 = getFacultyOnboardingData();
assert(Array.isArray(list1), 'Initial list must be an array');
assert(list1.length >= 30, `Expected at least 30 default faculty, got ${list1.length}`);
console.log(`✓ 1. Loaded ${list1.length} faculty members from code defaults`);

// 2. Upsert New Faculty
eventDispatched = false;
const newFac = {
  name: 'Dr. Alok Verma',
  email: 'alok.v@pwmeded.edu.in',
  phone: '98765 12345',
  dept: 'Cardiology',
  cohorts: ["Prarambh '26", "Sushruta '26"]
};
const created = upsertFacultyMember(newFac);
assert(created && created.id, 'Created faculty must have an id');
assert(created.name === 'Dr. Alok Verma', 'Name match');
assert(eventDispatched, 'Update event must be dispatched to window');
console.log(`✓ 2. Dynamically created new faculty member "${created.name}" (ID: ${created.id})`);

// 3. Update Existing Faculty (e.g. change phone & permissions)
const updated = upsertFacultyMember({
  id: created.id,
  name: 'Dr. Alok Verma',
  email: 'alok.verma.hod@pwmeded.edu.in',
  phone: '99999 00000',
  canRescheduleCancel: false
});
assert(updated.email === 'alok.verma.hod@pwmeded.edu.in', 'Updated email check');
assert(updated.phone === '99999 00000', 'Updated phone check');
assert(updated.canRescheduleCancel === false, 'Updated permission check');
console.log(`✓ 3. Dynamically updated faculty member "${updated.name}" details in storage`);

// 4. Dynamic Batch Synchronization
const dummyBatches = [
  {
    id: 'batch-test-2026',
    name: 'Clinical Special Batch 2026',
    events: [
      {
        faculty: 'Dr. Meenakshi Sundaram',
        subject: 'Endocrinology',
        eventType: 'class'
      }
    ]
  }
];
const syncedList = syncFacultyFromBatches(dummyBatches);
const foundSynced = syncedList.find(f => f.name.includes('Meenakshi'));
assert(foundSynced, 'Must automatically discover and onboard faculty from batch schedules');
assert(foundSynced.dept === 'Endocrinology', 'Subject mapped to department');
console.log(`✓ 4. Dynamically synced and created onboarding credentials for "${foundSynced.name}" from batch schedule`);

// 5. Code Export Verification
const codeString = exportFacultyOnboardingAsCode();
assert(typeof codeString === 'string', 'Exported code must be a string');
assert(codeString.includes('export const DEFAULT_FACULTY_ONBOARDING'), 'Exported code has standard module syntax');
assert(codeString.includes('Dr. Alok Verma'), 'Exported code includes dynamically added faculty');
assert(codeString.includes('Dr. Meenakshi Sundaram'), 'Exported code includes batch synced faculty');
console.log('✓ 5. Exported updated faculty onboarding data as executable Javascript code module');

// 6. Delete Faculty
const deleted = deleteFacultyMember(created.id);
assert(deleted === true, 'Delete operation returned true');
const afterDelete = getFacultyOnboardingData();
assert(!afterDelete.some(f => f.id === created.id), 'Deleted faculty no longer present in storage');
console.log(`✓ 6. Successfully deleted faculty member and synchronized persistent storage`);

// 7. ReminderEmailService Integration
const service = new ReminderEmailService();
const serviceList = service.getFacultyOnboardingList();
assert(Array.isArray(serviceList), 'Service onboarding list valid');
assert(service.findFacultyByEmail('rajesh.j@pwmeded.edu.in') !== null, 'Service findFacultyByEmail works');
console.log('✓ 7. ReminderEmailService smoothly interfaces with dynamic faculty onboarding module');

console.log('\n======================================================');
console.log('🎉 ALL DYNAMIC FACULTY ONBOARDING TESTS PASSED (100%)');
console.log('======================================================');
