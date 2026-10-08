/**
 * Regression test: faculty deletes / connected spreadsheets / portal settings must be shared
 * between admin logins through the Google Sheet + Apps Script (the Render site has no Node backend).
 *
 * Simulates the Google side in memory (gviz reads with a controllable cache, Apps Script web app)
 * and two separate browsers (A and B, each with its own localStorage) running the real modules.
 *
 *   node test_shared_sync_fix.mjs
 */
import assert from 'assert';

// ---------------------------------------------------------------------------
// Fake browser plumbing
// ---------------------------------------------------------------------------
class FakeStorage {
  constructor() { this.map = new Map(); }
  getItem(k) { return this.map.has(k) ? this.map.get(k) : null; }
  setItem(k, v) { this.map.set(k, String(v)); }
  removeItem(k) { this.map.delete(k); }
  clear() { this.map.clear(); }
}
globalThis.Storage = FakeStorage;

const browsers = { A: new FakeStorage(), B: new FakeStorage() };
function use(name) { globalThis.localStorage = browsers[name]; }
use('A');

const listeners = {};
globalThis.window = {
  location: { hostname: 'meded-faculty-calendar.onrender.com', pathname: '/admin', href: 'https://meded-faculty-calendar.onrender.com/admin' },
  addEventListener: (n, f) => { (listeners[n] = listeners[n] || []).push(f); },
  removeEventListener() {},
  dispatchEvent() { return true; }
};
globalThis.CustomEvent = class { constructor(name, o) { this.name = name; this.detail = o && o.detail; } };
globalThis.location = globalThis.window.location;

// No background timers: the test drives every sync itself.
const realSetInterval = globalThis.setInterval;
globalThis.setInterval = () => 0;

// ---------------------------------------------------------------------------
// Fake Google: spreadsheet + gviz (with a read cache) + Apps Script (mirrors apps-script/Code.gs)
// ---------------------------------------------------------------------------
const FACULTY_HEADERS = ['Faculty ID', 'Name', 'Primary Email', 'Secondary Email', 'Phone', 'Department', 'Role', 'Designation', 'Status', 'Can Reschedule Cancel', 'Assigned Cohorts', 'Last Updated'];
const sheet = {
  faculty: [],
  batches: [],     // {id,name,sourceUrl,tabName,platform,active}
  settings: []     // {key,value,updatedAt}
};
let gvizSnapshot = null;       // what the (cached) public read path currently returns
let appsScriptDown = false;
const calls = [];

function facultyRow(f) {
  return [f.id, f.name, f.email, f.secondaryEmail || '', f.phone || '', f.dept || '', f.role || 'Teacher', f.designation || '', f.status || 'Verified',
    f.canRescheduleCancel === false ? 'FALSE' : 'TRUE', Array.isArray(f.cohorts) ? f.cohorts.join('; ') : (f.cohorts || ''), f.lastUpdated || ''];
}
function tabs() {
  return {
    'Faculty Directory': { cols: FACULTY_HEADERS, rows: sheet.faculty.map(facultyRow) },
    'Batch Registry': { cols: ['Batch ID', 'Name', 'Source URL', 'Tab Name', 'Platform', 'Active', 'Updated By', 'Updated At'], rows: sheet.batches.map(b => [b.id, b.name, b.sourceUrl, b.tabName, b.platform, b.active ? 'TRUE' : 'FALSE', 'portal', '']) },
    'Portal Settings': { cols: ['Key', 'Value', 'Updated At', 'Updated By'], rows: sheet.settings.map(s => [s.key, s.value, s.updatedAt, 'portal']) }
  };
}
function snapshotNow() { gvizSnapshot = JSON.parse(JSON.stringify(tabs())); }
function pickTab(params) {
  const snap = gvizSnapshot;
  const name = params.get('sheet');
  if (name && snap[name]) return snap[name];
  if (params.get('gid') === '1720160974') return snap['Faculty Directory'];
  if (params.get('gid') === '0') return snap['Batch Registry'];   // a wrong gid: some OTHER tab
  return snap['Faculty Directory'];                                // unknown tab => Google serves the first sheet
}
const csvEsc = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
const tabToCsv = t => [t.cols, ...t.rows].map(r => r.map(csvEsc).join(',')).join('\r\n');

function normFaculty(f) {
  return { id: f.id, name: f.name, email: f.email, secondaryEmail: f.secondaryEmail || '', phone: f.phone || '', dept: f.dept || '', role: f.role || 'Teacher', designation: f.designation || '', status: f.status || 'Verified', canRescheduleCancel: f.canRescheduleCancel !== false, cohorts: f.cohorts || [], lastUpdated: f.lastUpdated || new Date().toISOString() };
}
function appsScript(action, body) {
  calls.push(action);
  switch (action) {
    case 'get_faculty': return { ok: true, list: sheet.faculty.map(normFaculty) };
    case 'update_faculty': {
      const f = body.faculty; const i = sheet.faculty.findIndex(r => r.id === f.id || (f.email && r.email === f.email));
      if (i >= 0) sheet.faculty[i] = normFaculty(f); else sheet.faculty.push(normFaculty(f));
      return { ok: true };
    }
    case 'delete_faculty': {
      const f = body.faculty; const i = sheet.faculty.findIndex(r => r.id === f.id || (f.email && r.email === f.email));
      if (i >= 0) { sheet.faculty.splice(i, 1); return { ok: true }; }
      return { ok: false, error: 'Faculty not found to delete' };   // what the ALREADY-DEPLOYED script answers
    }
    case 'get_batches': return { ok: true, batches: sheet.batches };
    case 'upsert_batch': {
      const b = body.batch; const i = sheet.batches.findIndex(r => r.id === b.id || r.sourceUrl === b.sourceUrl);
      const row = { id: (i >= 0 ? sheet.batches[i].id : b.id), name: b.name, sourceUrl: b.sourceUrl, tabName: b.tabName || 'Lecture Planner', platform: b.platform || '', active: true };
      if (i >= 0) sheet.batches[i] = row; else sheet.batches.push(row);
      return { ok: true, id: row.id };
    }
    case 'remove_batch': { const r = sheet.batches.find(x => x.id === body.batch.id); if (r) r.active = false; return { ok: true }; }
    case 'get_settings': return { ok: true, settings: sheet.settings };
    case 'set_setting': {
      const s = body.setting; const i = sheet.settings.findIndex(r => r.key === s.key);
      if (i >= 0) { if (sheet.settings[i].updatedAt > s.updatedAt) return { ok: true, stale: true }; sheet.settings[i] = { key: s.key, value: s.value, updatedAt: s.updatedAt }; }
      else sheet.settings.push({ key: s.key, value: s.value, updatedAt: s.updatedAt });
      return { ok: true };
    }
    default: return { ok: false, error: 'Unknown action: ' + action };
  }
}

const respond = (obj, ok = true, status = 200) => ({
  ok, status, headers: { get: () => (ok ? 'application/json' : 'text/html') },
  text: async () => (typeof obj === 'string' ? obj : JSON.stringify(obj)), json: async () => obj
});

globalThis.fetch = async (input, init = {}) => {
  const url = String(input);
  if (url.startsWith('/api/')) return respond('Not found', false, 404);          // static Render site: no Node backend
  const u = new URL(url);
  if (u.hostname === 'script.google.com') {
    if (appsScriptDown) throw new TypeError('Failed to fetch');
    if ((init.method || 'GET') === 'POST') return respond(appsScript(JSON.parse(init.body).action, JSON.parse(init.body)));
    return respond(appsScript(u.searchParams.get('action'), {}));
  }
  if (u.hostname === 'docs.google.com') {
    if (!gvizSnapshot) snapshotNow();
    return respond(tabToCsv(pickTab(u.searchParams)));
  }
  throw new Error('Unexpected URL ' + url);
};

// JSONP: the app injects <script src=gviz...responseHandler:cb>; answer it from the cached snapshot.
globalThis.document = {
  visibilityState: 'visible',
  addEventListener() {},
  getElementById: () => null,
  createElement: () => ({}),
  body: {
    appendChild(script) {
      const u = new URL(script.src);
      const cb = /responseHandler:([\w]+)/.exec(u.searchParams.get('tqx') || '')[1];
      setTimeout(() => {
        if (!gvizSnapshot) snapshotNow();
        const t = pickTab(u.searchParams);
        globalThis.window[cb]({ table: { cols: t.cols.map(label => ({ label })), rows: t.rows.map(r => ({ c: r.map(v => ({ v })) })) } });
      }, 0);
    }
  }
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Load the real modules
// ---------------------------------------------------------------------------
const fac = await import('./js/facultyOnboardingData.js');
const shared = await import('./js/sharedSettings.js');
const conn = await import('./js/sheetConnector.js');

const names = list => list.map(f => f.id);
const local = () => fac.getFacultyOnboardingData();
let step = 0;
const ok = msg => console.log(`  ✓ ${++step}. ${msg}`);

console.log('\n== Faculty directory ==');

// Master sheet holds the seeded faculty
sheet.faculty = fac.DEFAULT_FACULTY_ONBOARDING.map(normFaculty);
snapshotNow();

use('A');
await fac.syncFacultyFromConnectedSheet();
assert.strictEqual(local().length, sheet.faculty.length);
ok('browser A loads the directory from the sheet');

// --- Delete in A --------------------------------------------------------
let listA = local();
const victim = listA.find(f => f.id === 'fac-2');
listA = listA.filter(f => f.id !== 'fac-2');
let res = await fac.autoSyncFacultyMutation('delete', victim, listA);
assert.strictEqual(res.synced, true, 'delete should be confirmed by the Apps Script');
assert.ok(!sheet.faculty.some(f => f.id === 'fac-2'), 'row must be gone from the sheet');
assert.ok(calls.includes('delete_faculty'));
ok('deleting a faculty in A is written to the sheet and confirmed');

// The public read path is cached and STILL lists fac-2: it must not come back.
assert.ok(gvizSnapshot['Faculty Directory'].rows.some(r => r[0] === 'fac-2'), 'precondition: stale cache still lists fac-2');
await fac.syncFacultyFromConnectedSheet();
assert.ok(!names(local()).includes('fac-2'), 'deleted faculty must not be resurrected by a stale read');
ok('a stale sheet read does not resurrect the deleted faculty');

snapshotNow();
await fac.syncFacultyFromConnectedSheet();
assert.ok(!names(local()).includes('fac-2'));
assert.strictEqual(JSON.parse(browsers.A.getItem('meded_faculty_tombstones_v1') || '[]').length, 0, 'delete marker is cleared once the sheet agrees');
ok('once the sheet catches up, the delete marker is dropped');

// --- Another admin ------------------------------------------------------
use('B');   // fresh browser: seeded with the built-in default list, which still contains fac-2
assert.ok(names(fac.getFacultyOnboardingData()).includes('fac-2'));
await fac.syncFacultyFromConnectedSheet();
assert.ok(!names(local()).includes('fac-2'), 'admin B must see the deletion');
assert.strictEqual(local().length, sheet.faculty.length);
ok('admin B (fresh browser with stale defaults) sees the deletion instead of re-adding the person');

// --- Delete while the Apps Script is unreachable -------------------------
use('A');
appsScriptDown = true;
listA = local();
const victim3 = listA.find(f => f.id === 'fac-3');
listA = listA.filter(f => f.id !== 'fac-3');
res = await fac.autoSyncFacultyMutation('delete', victim3, listA);
assert.strictEqual(res.synced, false);
assert.strictEqual(res.pending, 1);
ok('when the sheet cannot be reached the delete stays queued and the caller is told');

await fac.syncFacultyFromConnectedSheet();   // sheet (cache) still has fac-3
assert.ok(!names(local()).includes('fac-3'), 'a queued delete must survive background syncs');
ok('a queued (undelivered) delete is not undone by the background sync');

appsScriptDown = false;
const flushed = await fac.flushFacultyOutbox();
assert.strictEqual(flushed.remaining, 0);
assert.ok(!sheet.faculty.some(f => f.id === 'fac-3'));
ok('the queued delete is delivered on retry and reaches the sheet');

// --- Add + edit propagate ----------------------------------------------
listA = local();
const added = { id: 'fac-new-1', name: 'Dr. New Person', email: 'new.person@example.com', secondaryEmail: '', phone: '90000 00000', dept: 'Anatomy', role: 'Teacher', designation: 'Professor • Anatomy', status: 'Verified', canRescheduleCancel: true, cohorts: ["Prarambh '26"], lastUpdated: new Date().toISOString() };
listA.unshift(added);
await fac.autoSyncFacultyMutation('add', added, listA);
assert.ok(sheet.faculty.some(f => f.id === 'fac-new-1'));
snapshotNow();
use('B');
await fac.syncFacultyFromConnectedSheet();
assert.ok(names(local()).includes('fac-new-1'));
ok('a faculty added by A shows up for B');

// --- Wrong gid must not import the wrong tab -----------------------------
use('B');
await fac.syncFacultyFromGoogleSheet('https://docs.google.com/spreadsheets/d/1ny3xsppBVxJb1FNPBU97mpm0b4eyAkUAG9CanjXf5FE/edit?gid=0#gid=0', false, { persistUrl: false });
assert.ok(names(local()).includes('fac-new-1') && local().every(f => /^fac-/.test(f.id)), 'gid=0 points at Batch Registry; the faculty tab must still be used');
ok('a saved link with the wrong gid does not import another tab as faculty');

console.log('\n== Connected spreadsheets (batch registry) ==');
use('B');   // B has never saved any write-back URL
assert.ok(conn.getRegistryWriter(), 'a browser with no saved URL still resolves the Apps Script endpoint');
assert.ok(conn.getRegistryWriter().endpoint.includes('script.google.com/macros/s/'));
ok('a browser that never opened the write-back dialog can still publish');

use('A');
const pub = await conn.postRegistryAction('upsert_batch', { id: 'batch-1', name: 'Super Speciality 2026', sourceUrl: 'https://docs.google.com/spreadsheets/d/AAA111/edit', tabName: 'Lecture Planner', platform: '' });
assert.strictEqual(pub.ok, true);
snapshotNow();
use('B');
let rows = await conn.fetchBatchRegistry();
assert.ok(rows && rows.some(r => r.id === 'batch-1' && r.active));
ok('a spreadsheet connected by A is in the registry B reads');

// Public read unavailable -> Apps Script answers
const realFetch = globalThis.fetch;
gvizSnapshot = null;
const brokenSnap = { 'Faculty Directory': tabs()['Faculty Directory'] };     // registry tab missing: Google serves another tab
gvizSnapshot = brokenSnap;
rows = await conn.fetchBatchRegistry();
assert.ok(rows && rows.some(r => r.id === 'batch-1'), 'falls back to the Apps Script when the public read has no registry tab');
ok('registry still readable through Apps Script when the public sheet read fails');
snapshotNow();

console.log('\n== Removing a connected spreadsheet ==');
{
  const defaults = (await import('./js/defaultData.js')).DEFAULT_BATCHES;
  const custom = id => ({ id, name: 'Custom ' + id, sourceUrl: 'https://docs.google.com/spreadsheets/d/' + id.toUpperCase() + '/edit', sheetTabName: 'Lecture Planner', events: [{ isoDate: '2026-10-01', title: 'x' }], fromRegistry: true });
  for (const id of ['cust-a', 'cust-b']) {
    await conn.postRegistryAction('upsert_batch', { id, name: 'Custom ' + id, sourceUrl: custom(id).sourceUrl, tabName: 'Lecture Planner', platform: '' });
  }
  snapshotNow();                                          // Google's cache: both custom sheets Active
  use('A');
  localStorage.setItem('meded_faculty_batches_v1', JSON.stringify([...JSON.parse(JSON.stringify(defaults)), custom('cust-a'), custom('cust-b')]));
  const mgrA = new conn.BatchManager();
  mgrA.syncAllBatches = async () => [];
  assert.ok(mgrA.getBatches().some(b => b.id === 'cust-a'));

  // 1. remove while the public read still says Active (stale cache)
  await mgrA.removeBatch('cust-a');
  await mgrA.pullRegistry();
  assert.ok(!mgrA.getBatches().some(b => b.id === 'cust-a'), 'stale cache must not bring the removed spreadsheet back');
  assert.strictEqual(sheet.batches.find(r => r.id === 'cust-a').active, false, 'removal reached the shared registry');
  ok('removed spreadsheet stays removed while the cached registry still says Active');

  // 2. remove a built-in default (never in the registry) and reload the page
  const defId = defaults[0].id;
  await mgrA.removeBatch(defId);
  assert.strictEqual(sheet.batches.find(r => r.id === defId)?.active, false, 'defaults get a switched-off registry row');
  const reloadedA = new conn.BatchManager();
  assert.ok(!reloadedA.getBatches().some(b => b.id === defId), 'a reload must not re-merge a removed default');
  assert.ok(!reloadedA.getBatches().some(b => b.id === 'cust-a'));
  ok('removed default batch does not come back after a reload');

  // 3. another admin picks the removals up from the registry
  snapshotNow();
  use('B');
  localStorage.setItem('meded_faculty_batches_v1', JSON.stringify([...JSON.parse(JSON.stringify(defaults)), custom('cust-a'), custom('cust-b')]));
  const mgrB = new conn.BatchManager();
  await mgrB.pullRegistry();
  assert.ok(!mgrB.getBatches().some(b => b.id === 'cust-a' || b.id === defId), 'other admins drop removed spreadsheets (defaults included)');
  assert.ok(mgrB.getBatches().some(b => b.id === 'cust-b'));
  ok('another admin sees the removals');

  // 4. removal made offline is retried until the sheet confirms it
  use('A');
  appsScriptDown = true;
  await mgrA.removeBatch('cust-b');
  assert.strictEqual(sheet.batches.find(r => r.id === 'cust-b').active, true, 'offline: sheet not updated yet');
  assert.ok(JSON.parse(localStorage.getItem('meded_batch_outbox_v1')).length === 1, 'queued for retry');
  appsScriptDown = false;
  snapshotNow();
  await mgrA.pullRegistry();
  assert.strictEqual(sheet.batches.find(r => r.id === 'cust-b').active, false, 'retried and confirmed');
  assert.ok(!mgrA.getBatches().some(b => b.id === 'cust-b'));
  ok('an offline removal is retried and then reaches the shared sheet');

  // 5. re-connecting the same sheet on purpose works again
  const stale = JSON.parse(localStorage.getItem('meded_batch_tombstones_v1'));
  assert.ok(stale['sid:CUST-A']);
  mgrA.batches.push(custom('cust-a'));
  conn.BatchManager.prototype.resetToDefaults.call(mgrA);
  assert.ok(mgrA.getBatches().some(b => b.id === defId), 'reset to defaults brings defaults back');
  ok('reset to defaults restores removed defaults');
}

console.log('\n== Shared settings ==');
use('A');
shared.startSharedSettingsSync();
await sleep(1100);   // let the engine's own start-up pull (900ms timer) run while A is the active browser
use('A');
// first pull (marks the sync engine ready for browser A)
await shared.pullSharedSettings();
use('B');
await shared.pullSharedSettings();
use('A');

localStorage.setItem('meded_email_settings', JSON.stringify({ senderEmail: 'old@pw.live', leadDurationValue: 24, leadDurationUnit: 'hours', lastConfiguredAt: '2026-10-08T09:00:00.000Z' }));
await sleep(600);
snapshotNow();
assert.ok(sheet.settings.some(s => s.key === 'meded_email_settings'), 'setting is published to the sheet');
ok('an email setting saved by A is published to the shared sheet');

use('B');
await shared.pullSharedSettings();
assert.strictEqual(JSON.parse(localStorage.getItem('meded_email_settings')).senderEmail, 'old@pw.live');
ok('admin B receives it');

// B has been running with the default sync setting (30s) since before A changed anything
browsers.B.map.set('meded_sync_settings_v1', JSON.stringify({ autoSyncEnabled: true, intervalSeconds: 30, lastSyncedAt: null, syncStatus: 'idle' }));

// A changes the auto-sync interval to 60s
use('A');
localStorage.setItem('meded_sync_settings_v1', JSON.stringify({ autoSyncEnabled: true, intervalSeconds: 60, lastSyncedAt: null, syncStatus: 'idle' }));
await sleep(600);
snapshotNow();
const sheetSync = () => JSON.parse(sheet.settings.find(s => s.key === 'meded_sync_settings_v1').value);
assert.strictEqual(sheetSync().intervalSeconds, 60);
assert.ok(!('lastSyncedAt' in sheetSync()) && !('syncStatus' in sheetSync()), 'per-browser runtime fields are not shared');
ok('the shared sync setting holds only the real settings (no lastSyncedAt / status)');

// B (still at 30s) runs its background sync tick: that writes lastSyncedAt locally, every 30s
use('B');
localStorage.setItem('meded_sync_settings_v1', JSON.stringify({ autoSyncEnabled: true, intervalSeconds: 30, lastSyncedAt: '2026-10-08T10:00:30.000Z', syncStatus: 'success' }));
// (only the runtime fields moved; the real settings are unchanged)
await sleep(600);
snapshotNow();
assert.strictEqual(sheetSync().intervalSeconds, 60, 'B\'s sync tick must not overwrite A\'s 60s interval');
ok('another browser\'s background sync tick no longer overwrites the setting');

await shared.pullSharedSettings();
assert.strictEqual(JSON.parse(localStorage.getItem('meded_sync_settings_v1')).intervalSeconds, 60, 'B adopts the 60s interval');
assert.ok(JSON.parse(localStorage.getItem('meded_sync_settings_v1')).lastSyncedAt, 'B keeps its own lastSyncedAt');
ok('B adopts the new interval and keeps its own last-synced time');

// A keeps its value over several poll cycles
use('A');
for (let i = 0; i < 3; i++) { await shared.pullSharedSettings(); await sleep(50); }
assert.strictEqual(JSON.parse(localStorage.getItem('meded_sync_settings_v1')).intervalSeconds, 60);
assert.strictEqual(JSON.parse(localStorage.getItem('meded_email_settings')).senderEmail, 'old@pw.live');
ok('A\'s settings stay as saved after repeated background polls');

// No re-publish flood while the cached read lags behind
const before = calls.filter(c => c === 'set_setting').length;
use('A');
localStorage.setItem('meded_email_settings', JSON.stringify({ senderEmail: 'new@pw.live', leadDurationValue: 45, leadDurationUnit: 'minutes', lastConfiguredAt: new Date().toISOString() }));
await sleep(600);
for (let i = 0; i < 5; i++) { await shared.pullSharedSettings(); }      // gviz cache still serves the OLD value
await sleep(600);
const after = calls.filter(c => c === 'set_setting').length;
assert.strictEqual(after - before, 1, `expected 1 publish, saw ${after - before}`);
assert.strictEqual(JSON.parse(localStorage.getItem('meded_email_settings')).senderEmail, 'new@pw.live', 'A\'s new value is not reverted by the stale read');
ok('a change is published once and not reverted/re-posted while the public read cache is stale');

console.log(`\nAll ${step} checks passed.\n`);
globalThis.setInterval = realSetInterval;
process.exit(0);
