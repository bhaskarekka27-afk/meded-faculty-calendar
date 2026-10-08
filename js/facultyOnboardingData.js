/**
 * PW MedEd - Dynamic Faculty Onboarding Master Data & State Management
 * 
 * Provides centralized in-code faculty onboarding data storage, persistent sync,
 * dynamic batch/sheet discovery, and real-time state broadcasts.
 */

import { appsScriptGet, appsScriptPost } from './appsScriptConfig.js';

export const DEFAULT_FACULTY_ONBOARDING = [
  {
    "id": "fac-1",
    "name": "Dr. Rajesh Jambhulkar",
    "email": "harshraj01@gmail.com",
    "secondaryEmail": "harshraj01@gmail.com",
    "phone": "94234 07557",
    "dept": "Biochemistry",
    "role": "Teacher",
    "designation": "Professor • Biochemistry",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "Prarambh '26",
      "Sushruta '26",
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-2",
    "name": "Dr. Pradeep Pawar",
    "email": "pawarpradeep@gmail.com",
    "secondaryEmail": "pawarpradeep@gmail.com",
    "phone": "99203 00794",
    "dept": "Anatomy",
    "role": "Teacher",
    "designation": "Professor • Anatomy",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "Prarambh '26",
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-3",
    "name": "Dr. Vivek Nalgirkar",
    "email": "viveknalgirkar@gmail.com",
    "secondaryEmail": "viveknalgirkar@gmail.com",
    "phone": "97690 67069",
    "dept": "Physiology",
    "role": "Teacher",
    "designation": "Professor • Physiology",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "Sushruta '26",
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-15",
    "name": "Dr. Ranjith AR",
    "email": "xpresspinacle@gmail.com",
    "secondaryEmail": "xpresspinacle@gmail.com",
    "phone": "99414 81668",
    "dept": "Pathology",
    "role": "Teacher",
    "designation": "Professor • Pathology",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-16",
    "name": "Dr. Manjunath A",
    "email": "drmanjunathforensic@gmail.com",
    "secondaryEmail": "drmanjunathforensic@gmail.com",
    "phone": "96862 52725",
    "dept": "Forensic Medicine",
    "role": "Teacher",
    "designation": "Professor • Forensic Medicine",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-17",
    "name": "Dr. Vinish Srivastava",
    "email": "drvinish@yahoo.com",
    "secondaryEmail": "drvinish@yahoo.com",
    "phone": "99115 09119",
    "dept": "Anaesthesia",
    "role": "Teacher",
    "designation": "Professor • Anaesthesia",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-18",
    "name": "Dr. Ashwani Ranjan",
    "email": "docashwani23@gmail.com",
    "secondaryEmail": "docashwani23@gmail.com",
    "phone": "88607 96675",
    "dept": "Community Medicine",
    "role": "Teacher",
    "designation": "Assoc. Professor • Community Medicine",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-20",
    "name": "Dr. Sanchit Bajpai",
    "email": "drsanchitbaipaihns@gmail.com",
    "secondaryEmail": "drsanchitbaipaihns@gmail.com",
    "phone": "70073 35207",
    "dept": "ENT",
    "role": "Teacher",
    "designation": "Professor • ENT",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-21",
    "name": "Dr. Santhosh Patil",
    "email": "santhoshmp@icloud.com",
    "secondaryEmail": "santhoshmp@icloud.com",
    "phone": "83109 84841",
    "dept": "General Medicine",
    "role": "Teacher",
    "designation": "Professor • General Medicine",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-22",
    "name": "Dr. Era Dutta",
    "email": "dreradutta@gmail.com",
    "secondaryEmail": "dreradutta@gmail.com",
    "phone": "98204 03635",
    "dept": "Psychiatry",
    "role": "Teacher",
    "designation": "Assoc. Professor • Psychiatry",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-23",
    "name": "Dr. Siraj Ahmad",
    "email": "sirajahmad9@gmail.com",
    "secondaryEmail": "sirajahmad9@gmail.com",
    "phone": "95826 26153",
    "dept": "Pharmacology",
    "role": "Teacher",
    "designation": "Professor • Pharmacology",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-24",
    "name": "Dr. Prassan Vij",
    "email": "drprassan@yahoo.com",
    "secondaryEmail": "drprassan@yahoo.com",
    "phone": "98103 05975",
    "dept": "Obstetrics & Gynaecology",
    "role": "Teacher",
    "designation": "Professor • Obstetrics & Gynaecology",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-25",
    "name": "Dr. Alekhya",
    "email": "alekhya.kumar89@gmail.com",
    "secondaryEmail": "alekhya.kumar89@gmail.com",
    "phone": "90526 90055",
    "dept": "Orthopedics",
    "role": "Teacher",
    "designation": "Consultant • Orthopedics",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-26",
    "name": "Dr. Sandeep Seeramreddi",
    "email": "sandeepseeramreddi@gmail.com",
    "secondaryEmail": "sandeepseeramreddi@gmail.com",
    "phone": "99663 35541",
    "dept": "General Surgery",
    "role": "Teacher",
    "designation": "Senior Consultant • General Surgery",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-27",
    "name": "Dr. Natisha Arora",
    "email": "Natishaarora@gmail.com",
    "secondaryEmail": "Natishaarora@gmail.com",
    "phone": "90164 06216",
    "dept": "Radiology",
    "role": "Teacher",
    "designation": "Consultant • Radiology",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-28",
    "name": "Dr. Jazeer Abdul Khader",
    "email": "admin@drjazeerdermatology.com",
    "secondaryEmail": "admin@drjazeerdermatology.com",
    "phone": "98098 44313",
    "dept": "Dermatology",
    "role": "Teacher",
    "designation": "Consultant • Dermatology",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-29",
    "name": "Dr. Anusha Rathi",
    "email": "rathi.anusha@gmail.com",
    "secondaryEmail": "rathi.anusha@gmail.com",
    "phone": "95603 44064",
    "dept": "Microbiology",
    "role": "Teacher",
    "designation": "Assistant Professor • Microbiology",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-30",
    "name": "Dr. Divya Madan",
    "email": "divyamadan121295@gmail.com",
    "secondaryEmail": "divyamadan121295@gmail.com",
    "phone": "89303 45037",
    "dept": "Pediatrics",
    "role": "Teacher",
    "designation": "Senior Consultant • Pediatrics",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-admin-2",
    "name": "Bhaskar Ekka",
    "email": "bhaskar.ekka@pw.live",
    "secondaryEmail": "bhaskarekka27@gmail.com",
    "phone": "98765 43210",
    "dept": "Medical Sciences",
    "role": "Admin",
    "designation": "Lead Academic Faculty",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "Prarambh '26",
      "Sushruta '26",
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  },
  {
    "id": "fac-admin-1",
    "name": "Kanchan Gupta",
    "email": "kanchan.gupta1@pw.live",
    "secondaryEmail": "kanchan.gupta1@pw.live",
    "phone": "98765 43211",
    "dept": "Academic Administration",
    "role": "Admin",
    "designation": "Academic Operations Lead",
    "status": "Verified",
    "canRescheduleCancel": false,
    "cohorts": [
      "Prarambh '26",
      "Sushruta '26",
      "INI-CET '26",
      "FMGE '26"
    ],
    "lastUpdated": "2026-09-24T12:00:00.000Z"
  }
];

export const ONBOARDING_STORAGE_KEY = 'meded_faculty_onboarding';

// The /api/* endpoints only exist on the local Node server, not on the static Render site.
const HAS_LOCAL_API = typeof window !== 'undefined' && window.location && /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.|10\.)/.test(window.location.hostname || '');

// Background sync from server
if (typeof window !== 'undefined' && typeof fetch !== 'undefined' && HAS_LOCAL_API) {
  fetch('/api/faculty-onboarding')
    .then(r => r.json())
    .then(data => {
      if (data && data.success && Array.isArray(data.list) && data.list.length > 0) {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data.list));
      }
    })
    .catch(() => {});
}

// ---------------------------------------------------------------------------
// Shared-sheet write queue ("outbox") and delete markers ("tombstones")
//
// The Google Sheet is the one copy every admin shares. A change made here is
//   1. applied locally right away,
//   2. queued in the outbox and delivered to the Apps Script web app (retried
//      until the script confirms it - offline, cold start, quota hiccup...),
//   3. layered on top of whatever the sheet currently returns, so the 15-second
//      background read can never bring a deleted person back (or undo an edit)
//      before the sheet has caught up.
// Once the sheet agrees, the marker is dropped and the sheet is the truth again.
// ---------------------------------------------------------------------------
const OUTBOX_KEY = 'meded_faculty_outbox_v1';
const TOMBSTONE_KEY = 'meded_faculty_tombstones_v1';
const TOMBSTONE_TTL_MS = 10 * 60 * 1000;   // a confirmed delete the sheet still lists (read cache) is hidden this long
const PENDING_TTL_MS = 24 * 60 * 60 * 1000; // give up on an undeliverable change after a day
const HAS_BROWSER = typeof window !== 'undefined' && !!window.location;

function readStore(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(v) ? v : [];
  } catch (_) { return []; }
}

function writeStore(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* storage unavailable */ }
}

function sameFaculty(a, b) {
  if (!a || !b) return false;
  if (a.id && b.id && String(a.id) === String(b.id)) return true;
  const ae = String(a.email || '').trim().toLowerCase();
  const be = String(b.email || '').trim().toLowerCase();
  return !!ae && ae === be;
}

/** Faculty changes that have not been confirmed by the shared sheet yet. */
export function getPendingFacultyOps() {
  return readStore(OUTBOX_KEY);
}

function emitFacultySyncStatus(extra = {}) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
  window.dispatchEvent(new CustomEvent('meded:faculty_sync_status', {
    detail: { pending: getPendingFacultyOps().length, ...extra }
  }));
}

/**
 * Record a faculty change for delivery to the shared sheet.
 * @param {'upsert'|'delete'} action
 */
export function queueFacultyOp(action, faculty) {
  if (!faculty || (!faculty.id && !faculty.email)) return;
  const kind = action === 'delete' ? 'delete' : 'upsert';

  // A newer change to the same person replaces the older queued one.
  const outbox = readStore(OUTBOX_KEY).filter(o => !sameFaculty(o.faculty, faculty));
  outbox.push({
    opId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action: kind,
    faculty: JSON.parse(JSON.stringify(faculty)),
    ts: Date.now(),
    attempts: 0
  });
  writeStore(OUTBOX_KEY, outbox);

  const tombs = readStore(TOMBSTONE_KEY).filter(t => !sameFaculty(t, faculty));
  if (kind === 'delete') {
    tombs.push({ id: faculty.id || '', email: String(faculty.email || '').trim().toLowerCase(), deletedAt: Date.now() });
  }
  writeStore(TOMBSTONE_KEY, tombs);

  scheduleOutboxFlush();
}

let flushTimer = null;
let flushing = false;

function scheduleOutboxFlush(delay = 150) {
  if (!HAS_BROWSER) return;
  clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { flushFacultyOutbox().catch(() => {}); }, delay);
}

/**
 * Deliver queued changes to the Apps Script web app and wait for its answer.
 * @returns {Promise<{sent: number, remaining: number, error?: string}>}
 */
export async function flushFacultyOutbox() {
  const snapshot = readStore(OUTBOX_KEY);
  if (!HAS_BROWSER || flushing || snapshot.length === 0) return { sent: 0, remaining: snapshot.length };

  flushing = true;
  let sent = 0;
  let lastError = '';
  try {
    const failed = [];
    for (const op of snapshot) {
      if (Date.now() - op.ts > PENDING_TTL_MS) continue;
      const res = await appsScriptPost(op.action === 'delete' ? 'delete_faculty' : 'update_faculty', { faculty: op.faculty });
      // Deleting someone the sheet no longer has is exactly the outcome we wanted.
      const alreadyGone = op.action === 'delete' && /not found/i.test(res.error || '');
      if (res.ok || alreadyGone) {
        sent += 1;
      } else {
        lastError = res.error || 'Unknown error';
        failed.push({ ...op, attempts: (op.attempts || 0) + 1, lastError });
      }
    }

    // Changes made while we were sending stay queued; a failed op that has since
    // been superseded by a newer change to the same person is dropped.
    const snapshotIds = new Set(snapshot.map(o => o.opId));
    const arrivedMeanwhile = readStore(OUTBOX_KEY).filter(o => !snapshotIds.has(o.opId));
    const keptFailed = failed.filter(f => !arrivedMeanwhile.some(n => sameFaculty(n.faculty, f.faculty)));
    writeStore(OUTBOX_KEY, [...keptFailed, ...arrivedMeanwhile]);
  } finally {
    flushing = false;
  }

  const remaining = getPendingFacultyOps().length;
  emitFacultySyncStatus(lastError ? { error: lastError } : {});
  return lastError ? { sent, remaining, error: lastError } : { sent, remaining };
}

/**
 * Layer this browser's not-yet-confirmed changes on top of the list read from the sheet.
 * @param {boolean} [prune=true] drop delete markers the source no longer lists. Pass false
 *   for sources that are not the sheet (they do not prove the sheet has caught up).
 */
function applyPendingToRemote(remoteList, prune = true) {
  const now = Date.now();
  const outbox = readStore(OUTBOX_KEY);
  let list = Array.isArray(remoteList) ? remoteList.slice() : [];

  const keep = [];
  for (const t of readStore(TOMBSTONE_KEY)) {
    const pending = outbox.some(o => o.action === 'delete' && sameFaculty(o.faculty, t));
    if (pending) {
      if (now - t.deletedAt < PENDING_TTL_MS) keep.push(t);
      continue;
    }
    const stillListed = list.find(f => sameFaculty(f, t));
    if (!stillListed) {
      if (!prune) keep.push(t);   // the sheet has not confirmed yet - keep hiding
      continue;                    // sheet confirms it is gone: marker no longer needed
    }
    const reAddedLater = Date.parse(stillListed.lastUpdated || '') > t.deletedAt;
    if (reAddedLater || now - t.deletedAt > TOMBSTONE_TTL_MS) continue;
    keep.push(t);
  }
  writeStore(TOMBSTONE_KEY, keep);
  list = list.filter(f => !keep.some(t => sameFaculty(f, t)));

  for (const op of outbox) {
    if (op.action !== 'upsert') continue;
    const idx = list.findIndex(f => sameFaculty(f, op.faculty));
    if (idx >= 0) list[idx] = { ...list[idx], ...op.faculty };
    else list.push({ ...op.faculty });
  }
  return list;
}

/**
 * Returns the current faculty onboarding data (from localStorage if available, merged with code defaults).
 */
export function getFacultyOnboardingData() {
  try {
    if (typeof localStorage === 'undefined') {
      return JSON.parse(JSON.stringify(DEFAULT_FACULTY_ONBOARDING));
    }
    const data = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (data === null) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(DEFAULT_FACULTY_ONBOARDING));
      return JSON.parse(JSON.stringify(DEFAULT_FACULTY_ONBOARDING));
    }
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (e) {
    console.warn('Error reading faculty onboarding data:', e);
    return [];
  }
}

/**
 * Persists faculty onboarding data and broadcasts update event across all tabs/windows.
 */
export function saveFacultyOnboardingData(list) {
  if (!Array.isArray(list)) return;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(list));
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('meded:faculty_onboarding_updated', { detail: list }));
    }
    if (typeof fetch !== 'undefined' && HAS_LOCAL_API) {
      fetch('/api/faculty-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list })
      }).catch(() => {});
    }
  } catch (e) {
    console.error('Error saving faculty onboarding data:', e);
  }
}

/**
 * Upserts a single faculty member, automatically creating or modifying details.
 */
export function upsertFacultyMember(facultyData) {
  if (!facultyData || !facultyData.name) return null;
  const list = getFacultyOnboardingData();
  const cleanName = (facultyData.name || '').trim().replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').toLowerCase();
  const cleanEmail = (facultyData.email || '').trim().toLowerCase();

  const existingIndex = list.findIndex(f => {
    if (facultyData.id && f.id === facultyData.id) return true;
    const fClean = (f.name || '').trim().replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').toLowerCase();
    const fEmail = (f.email || '').trim().toLowerCase();
    return (cleanEmail && fEmail === cleanEmail) || (cleanName && fClean === cleanName);
  });

  const now = new Date().toISOString();
  const normalizedRole = (facultyData.role && String(facultyData.role).toLowerCase().includes('admin')) ? 'Admin' : 'Teacher';
  const defaultDesignation = normalizedRole === 'Admin' ? 'Academic Administration Lead' : `Professor • ${facultyData.dept || 'Medical Sciences'}`;

  if (existingIndex >= 0) {
    list[existingIndex] = {
      ...list[existingIndex],
      ...facultyData,
      role: normalizedRole,
      designation: facultyData.designation || list[existingIndex].designation || list[existingIndex].role || defaultDesignation,
      lastUpdated: now
    };
    saveFacultyOnboardingData(list);
    queueFacultyOp('upsert', list[existingIndex]);
    return list[existingIndex];
  } else {
    const newEntry = {
      id: facultyData.id || `fac-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: facultyData.name.startsWith('Dr.') || facultyData.name.startsWith('Prof.') ? facultyData.name : (normalizedRole === 'Admin' ? facultyData.name : `Dr. ${facultyData.name}`),
      email: facultyData.email || `${cleanName.replace(/\s+/g, '.')}@pwmeded.edu.in`,
      secondaryEmail: facultyData.secondaryEmail || '',
      phone: facultyData.phone || '98765 43210',
      dept: facultyData.dept || (normalizedRole === 'Admin' ? 'Academic Administration' : 'Medical Sciences'),
      role: normalizedRole,
      designation: facultyData.designation || facultyData.role || defaultDesignation,
      status: facultyData.status || 'Verified',
      canRescheduleCancel: facultyData.canRescheduleCancel !== false,
      cohorts: facultyData.cohorts || ["Prarambh '26"],
      lastUpdated: now
    };
    list.push(newEntry);
    saveFacultyOnboardingData(list);
    queueFacultyOp('upsert', newEntry);
    return newEntry;
  }
}

/**
 * Removes a faculty member by ID or email.
 */
export function deleteFacultyMember(idOrEmail) {
  if (!idOrEmail) return false;
  const list = getFacultyOnboardingData();
  const filtered = list.filter(f => f.id !== idOrEmail && f.email?.toLowerCase() !== idOrEmail.toLowerCase());
  if (filtered.length !== list.length) {
    const removed = list.filter(f => f.id === idOrEmail || f.email?.toLowerCase() === idOrEmail.toLowerCase());
    saveFacultyOnboardingData(filtered);
    removed.forEach(f => queueFacultyOp('delete', f));
    return true;
  }
  return false;
}

/**
 * Dynamically synchronizes faculty discovered in batch/sheet lecture schedules into the onboarding directory.
 */
export function syncFacultyFromBatches(batches) {
  // Keep only existing verified faculty, do not auto-inject removed/unrelated faculties
  return getFacultyOnboardingData();
}

/**
 * Generates an executable ES6 code module string of the updated faculty onboarding directory.
 */
export function exportFacultyOnboardingAsCode(customList) {
  const data = customList || getFacultyOnboardingData();
  return `// Auto-generated PW MedEd Faculty Onboarding Directory Master Data
export const DEFAULT_FACULTY_ONBOARDING = ${JSON.stringify(data, null, 2)};
`;
}

// Storage Keys & Constants
export const DEFAULT_FACULTY_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1ny3xsppBVxJb1FNPBU97mpm0b4eyAkUAG9CanjXf5FE/edit?gid=1720160974#gid=1720160974';
export const FACULTY_SHEET_URL_KEY = 'pw_faculty_spreadsheet_url';
export const FACULTY_SHEET_HEADERS = [
  'Faculty ID',
  'Name',
  'Primary Email',
  'Secondary Email',
  'Phone',
  'Department',
  'Role',
  'Designation',
  'Status',
  'Can Reschedule Cancel',
  'Assigned Cohorts',
  'Last Updated'
];

/**
 * Returns the connected Google Spreadsheet URL, defaulting to the embedded master sheet.
 */
export function getConnectedFacultySheetUrl() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(FACULTY_SHEET_URL_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_FACULTY_SPREADSHEET_URL;
}

/**
 * Converts a list of faculty records to standard CSV format.
 */
export function facultyListToCSV(list) {
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = [FACULTY_SHEET_HEADERS.map(h => `"${h}"`).join(',')];
  for (const f of (list || [])) {
    const roleVal = (f.role && String(f.role).toLowerCase().includes('admin')) ? 'Admin' : 'Teacher';
    const desigVal = f.designation || (f.role && f.role !== 'Teacher' && f.role !== 'Admin' ? f.role : (roleVal === 'Admin' ? 'Lead Academic Faculty' : `Professor • ${f.dept || 'Biochemistry'}`));
    const row = [
      escapeCsv(f.id || ''),
      escapeCsv(f.name || ''),
      escapeCsv(f.email || ''),
      escapeCsv(f.secondaryEmail || ''),
      escapeCsv(f.phone || ''),
      escapeCsv(f.dept || ''),
      escapeCsv(roleVal),
      escapeCsv(desigVal),
      escapeCsv(f.status || 'Verified'),
      escapeCsv(f.canRescheduleCancel !== false ? 'TRUE' : 'FALSE'),
      escapeCsv(Array.isArray(f.cohorts) ? f.cohorts.join('; ') : (f.cohorts || '')),
      escapeCsv(f.lastUpdated || new Date().toISOString())
    ];
    rows.push(row.join(','));
  }
  return rows.join('\r\n');
}

/**
 * Converts a list of faculty records to Tab-Separated Values (TSV)
 * for instant 1-click clipboard paste into cell A1 of Google Sheets.
 */
export function facultyListToTSV(list) {
  const cleanVal = (val) => {
    if (val === null || val === undefined) return '';
    return String(val).replace(/\t/g, ' ').replace(/[\r\n]+/g, ' ');
  };

  const rows = [FACULTY_SHEET_HEADERS.join('\t')];
  for (const f of (list || [])) {
    const roleVal = (f.role && String(f.role).toLowerCase().includes('admin')) ? 'Admin' : 'Teacher';
    const desigVal = f.designation || (f.role && f.role !== 'Teacher' && f.role !== 'Admin' ? f.role : (roleVal === 'Admin' ? 'Lead Academic Faculty' : `Professor • ${f.dept || 'Biochemistry'}`));
    const row = [
      cleanVal(f.id || ''),
      cleanVal(f.name || ''),
      cleanVal(f.email || ''),
      cleanVal(f.secondaryEmail || ''),
      cleanVal(f.phone || ''),
      cleanVal(f.dept || ''),
      cleanVal(roleVal),
      cleanVal(desigVal),
      cleanVal(f.status || 'Verified'),
      cleanVal(f.canRescheduleCancel !== false ? 'TRUE' : 'FALSE'),
      cleanVal(Array.isArray(f.cohorts) ? f.cohorts.join('; ') : (f.cohorts || '')),
      cleanVal(f.lastUpdated || new Date().toISOString())
    ];
    rows.push(row.join('\t'));
  }
  return rows.join('\n');
}

/**
 * Raw CSV line parser handling quotes, multiline content, and escaped characters.
 */
function parseRawCSVLines(csvText) {
  if (!csvText) return [];
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentField);
      lines.push(row);
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || row.length > 0) {
    row.push(currentField);
    lines.push(row);
  }
  return lines;
}

/**
 * Robust Faculty CSV Parser that dynamically resolves column order, roles, designations and synonyms.
 */
export function parseFacultyCSV(csvText) {
  if (!csvText || !csvText.trim()) return [];
  const lines = parseRawCSVLines(csvText);
  if (lines.length <= 1) return [];

  const rawHeaders = lines[0].map(h => String(h || '').trim().toLowerCase());
  
  const getCol = (patterns) => {
    // 1. Exact match first
    const exact = rawHeaders.findIndex(h => patterns.some(p => h === p));
    if (exact >= 0) return exact;
    // 2. Substring match avoiding collisions
    return rawHeaders.findIndex(h => patterns.some(p => {
      if (p === 'name' || p === 'faculty' || p === 'professor') {
        if (h.includes('id') || h.includes('email') || h.includes('role') || h.includes('status')) return false;
      }
      return h.includes(p);
    }));
  };

  const idIdx = getCol(['faculty id', 'fac id', 'id']);
  const nameIdx = getCol(['name', 'faculty name', 'faculty', 'professor']);
  const emailIdx = getCol(['primary email', 'email', 'login email', 'mail']);
  const secEmailIdx = getCol(['secondary email', 'alt email', 'alternate email', 'secondary']);
  const phoneIdx = getCol(['phone', 'mobile', 'contact', 'whatsapp']);
  const deptIdx = getCol(['department', 'dept', 'subject', 'specialty']);
  const roleIdx = getCol(['role', 'portal role', 'access role']);
  const desigIdx = getCol(['designation', 'designation role', 'title']);
  const statusIdx = getCol(['status', 'verification']);
  const permIdx = getCol(['can reschedule', 'reschedule', 'permission', 'reschedule cancel']);
  const cohortsIdx = getCol(['cohort', 'batch', 'assigned cohorts', 'batches']);
  const updatedIdx = getCol(['last updated', 'updated', 'timestamp']);

  const list = [];
  for (let i = 1; i < lines.length; i++) {
    const r = lines[i];
    if (!r || r.length === 0 || !r.some(cell => cell && cell.trim())) continue;
    
    const name = (nameIdx >= 0 ? r[nameIdx] : r[1]) || '';
    if (!name.trim()) continue;

    const id = (idIdx >= 0 && r[idIdx] ? r[idIdx] : `fac-${i}`).trim();
    const email = ((emailIdx >= 0 ? r[emailIdx] : r[2]) || '').trim();
    const secEmail = ((secEmailIdx >= 0 ? r[secEmailIdx] : r[3]) || '').trim();
    const phone = ((phoneIdx >= 0 ? r[phoneIdx] : r[4]) || '98765 43210').trim();
    const dept = ((deptIdx >= 0 ? r[deptIdx] : r[5]) || 'Medical Sciences').trim();

    // Determine Role & Designation
    let role = 'Teacher';
    let designation = `Professor • ${dept}`;

    const rawRole = (roleIdx >= 0 ? r[roleIdx] : '').trim();
    const rawDesig = (desigIdx >= 0 ? r[desigIdx] : '').trim();

    if (roleIdx >= 0 && desigIdx >= 0 && roleIdx !== desigIdx) {
      // 12-column schema with separate Role and Designation
      role = (rawRole.toLowerCase() === 'admin' || rawRole.toLowerCase().includes('admin')) ? 'Admin' : 'Teacher';
      designation = rawDesig || (role === 'Admin' ? 'Academic Administration Lead' : `Professor • ${dept}`);
    } else if (roleIdx >= 0 && desigIdx < 0) {
      if (rawRole.toLowerCase() === 'admin' || rawRole.toLowerCase() === 'teacher') {
        role = rawRole.toLowerCase() === 'admin' ? 'Admin' : 'Teacher';
        designation = role === 'Admin' ? 'Lead Academic Faculty' : `Professor • ${dept}`;
      } else {
        role = rawRole.toLowerCase().includes('admin') ? 'Admin' : 'Teacher';
        designation = rawRole;
      }
    } else if (desigIdx >= 0) {
      role = (rawDesig.toLowerCase().includes('admin') || id.includes('admin') || email.includes('admin')) ? 'Admin' : 'Teacher';
      designation = rawDesig;
    }

    // Explicit ID or admin email check fallback
    if (id.startsWith('fac-admin') || email === 'bhaskar.ekka@pw.live' || email === 'kanchan.gupta1@pw.live') {
      role = 'Admin';
    }

    const status = ((statusIdx >= 0 ? r[statusIdx] : r[7]) || 'Verified').trim();
    const permVal = String(permIdx >= 0 ? r[permIdx] : (r[8] || '')).trim();
    const canRescheduleCancel = permVal.toUpperCase() !== 'FALSE' && permVal.toLowerCase() !== 'no';
    const cohortsRaw = (cohortsIdx >= 0 ? r[cohortsIdx] : r[9]) || '';
    const cohorts = cohortsRaw ? cohortsRaw.split(/[;,]/).map(c => c.trim()).filter(Boolean) : ["Prarambh '26"];
    const lastUpdated = (updatedIdx >= 0 ? r[updatedIdx] : r[10]) || new Date().toISOString();

    list.push({
      id,
      name: name.trim(),
      email,
      secondaryEmail: secEmail,
      phone,
      dept,
      role,
      designation,
      status: status || 'Verified',
      canRescheduleCancel,
      cohorts,
      lastUpdated
    });
  }
  return list;
}

/** True when a fetched sheet export really is the faculty directory (not Batch Registry, Portal Settings, an HTML error page...). */
function looksLikeFacultyCSV(text) {
  if (!text || text.trim().length < 15) return false;
  if (/^\s*<(!doctype|html)/i.test(text)) return false;
  const head = text.split(/\r?\n/, 3).join('\n').toLowerCase();
  return head.includes('email') && head.includes('name') && !head.includes('batch id') && !head.includes('"key"');
}

/** Faculty list straight from the Apps Script web app (always fresh - no Google read cache). */
async function fetchFacultyViaAppsScript(execUrl) {
  let data = null;
  if (execUrl) {
    try {
      const u = execUrl + (execUrl.includes('?') ? '&' : '?') + 'action=get_faculty&_t=' + Date.now();
      const r = await fetch(u, { cache: 'no-store' });
      data = JSON.parse(await r.text());
    } catch (_) { /* fall through */ }
  } else {
    data = await appsScriptGet('get_faculty');
  }
  const list = data && (Array.isArray(data.list) ? data.list : (Array.isArray(data) ? data : null));
  return list && list.length > 0 ? list : null;
}

function persistFacultySheetUrl(url, opts) {
  if (opts && opts.persistUrl === false) return;
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem(FACULTY_SHEET_URL_KEY) !== url) {
      localStorage.setItem(FACULTY_SHEET_URL_KEY, url);
    }
  } catch (_) { /* ignore */ }
}

/** Order- and timestamp-insensitive fingerprint, so a read that changes nothing is not treated as a change. */
function facultySignature(list) {
  return JSON.stringify((list || []).map(f => ({ ...f, lastUpdated: undefined })));
}

/**
 * Robust Client-Side and Proxy Google Sheet Synchronizer.
 * Works 100% reliably in static production (Render) without crashing on JSON parsing.
 *
 * The sheet is the source of truth: the returned list is what the sheet holds, with this
 * browser's not-yet-confirmed changes (see the outbox above) layered on top. People who
 * were deleted elsewhere disappear here too; people deleted here stay gone.
 */
export async function syncFacultyFromGoogleSheet(sheetUrl, forceRemote = false, opts = {}) {
  if (!sheetUrl || typeof sheetUrl !== 'string') {
    throw new Error('Please provide a valid Google Spreadsheet URL or Apps Script URL.');
  }

  const cleanUrl = sheetUrl.trim();

  // Deliver anything still waiting, so the read below reflects our own edits.
  await flushFacultyOutbox().catch(() => {});

  let parsedList = null;
  let fetchedVia = '';
  let csvText = '';

  // Strategy 0: a Google Apps Script Web App URL (/exec) - call it directly
  if (cleanUrl.includes('script.google.com/macros/s/') && cleanUrl.includes('/exec')) {
    const list = await fetchFacultyViaAppsScript(cleanUrl);
    if (list) { parsedList = list; fetchedVia = 'apps_script'; }
  }

  // Extract Sheet ID and GID
  const match = cleanUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!parsedList && !match) {
    throw new Error('Invalid Google Spreadsheet link. URL must contain "/spreadsheets/d/{SHEET_ID}".');
  }

  if (!parsedList) {
    const sheetId = match[1];
    const gidMatch = cleanUrl.match(/gid=([0-9]+)/);
    const gid = gidMatch ? gidMatch[1] : '0';

    // Strategy 1: local server proxy (dev only)
    try {
      if (!HAS_LOCAL_API) throw new Error('no local proxy');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const proxyRes = await fetch('/api/faculty-onboarding/sync-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: cleanUrl }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const contentType = proxyRes.headers.get('content-type') || '';
      if (proxyRes.ok && contentType.includes('application/json')) {
        const jsonRes = await proxyRes.json();
        if (jsonRes && jsonRes.success && Array.isArray(jsonRes.list) && jsonRes.list.length > 0) {
          parsedList = jsonRes.list;
          fetchedVia = 'local_proxy';
        }
      }
    } catch (err) {
      // Expected on static production (Render) - proceed to client-side strategies
    }

    // Strategy 2: Google Visualization API (GViz) CSV export (works in the browser if the sheet is link-shared).
    // Every candidate is checked to really be the faculty tab, so a wrong/renamed gid
    // (e.g. gid=0 pointing at another tab) falls through to the named tabs instead of
    // importing the wrong rows.
    if (!parsedList) {
      const gvizUrls = [];
      if (gid) {
        gvizUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
      }
      gvizUrls.push(
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Faculty%20Directory`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Faculty`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Sheet1`,
        `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`
      );

      for (const targetUrl of gvizUrls) {
        try {
          const res = await fetch(targetUrl + '&_t=' + Date.now(), { mode: 'cors', cache: 'no-store' });
          if (res.ok) {
            const text = await res.text();
            if (looksLikeFacultyCSV(text)) {
              csvText = text;
              fetchedVia = 'gviz_direct';
              break;
            }
          }
        } catch (_) {
          // Continue to next candidate
        }
      }
    }

    // Strategy 3: Client-side JSONP (bypasses CORS limitations on production)
    if (!parsedList && !csvText && typeof window !== 'undefined' && typeof document !== 'undefined') {
      const candidateTabs = gid ? [null, 'Faculty Directory', 'Faculty', 'Onboarding', 'Sheet1'] : ['Faculty Directory', 'Faculty', 'Onboarding', 'Sheet1', null];
      for (const tab of candidateTabs) {
        try {
          const jsonpCsv = await new Promise((resolve, reject) => {
            const cbName = `gviz_faculty_cb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=responseHandler:${cbName}`;
            if (tab) url += `&sheet=${encodeURIComponent(tab)}`;
            else if (gid) url += `&gid=${gid}`;

            const timer = setTimeout(() => {
              cleanup();
              reject(new Error('JSONP timeout'));
            }, 8000);

            function cleanup() {
              clearTimeout(timer);
              delete window[cbName];
              const el = document.getElementById(cbName);
              if (el && el.parentNode) el.parentNode.removeChild(el);
            }

            window[cbName] = function(data) {
              cleanup();
              if (data && data.table && data.table.rows) {
                const cols = (data.table.cols || []).map(c => c.label || '');
                const rows = [cols.map(c => `"${c.replace(/"/g, '""')}"`).join(',')];
                for (const r of data.table.rows) {
                  if (!r || !r.c) continue;
                  const rowVals = r.c.map(cell => {
                    const val = cell ? (cell.f !== undefined ? cell.f : (cell.v !== undefined ? cell.v : '')) : '';
                    return `"${String(val).replace(/"/g, '""')}"`;
                  });
                  rows.push(rowVals.join(','));
                }
                resolve(rows.join('\r\n'));
              } else {
                reject(new Error('Invalid table'));
              }
            };

            const script = document.createElement('script');
            script.id = cbName;
            script.src = url;
            script.onerror = () => { cleanup(); reject(new Error('Script error')); };
            document.body.appendChild(script);
          });

          if (looksLikeFacultyCSV(jsonpCsv)) {
            csvText = jsonpCsv;
            fetchedVia = 'jsonp_gviz';
            break;
          }
        } catch (_) {}
      }
    }

    // Strategy 4: ask the Apps Script web app (works even if the sheet is not link-shared)
    if (!parsedList && !csvText) {
      const list = await fetchFacultyViaAppsScript(null);
      if (list) { parsedList = list; fetchedVia = 'apps_script'; }
    }

    if (!parsedList && !csvText) {
      throw new Error(
        'Could not read the Google Sheet. Please make sure the sheet is shared as "Anyone with the link can view".'
      );
    }
  }

  // Parse extracted CSV
  if (!parsedList) {
    parsedList = parseFacultyCSV(csvText);
    // Check if sheet was found but empty or without valid records
    if (parsedList.length === 0) {
      return {
        success: false,
        empty: true,
        error: 'Google Sheet connected, but no faculty rows found. Headers might be missing.',
        rawCsv: csvText,
        headers: FACULTY_SHEET_HEADERS
      };
    }
  }

  // The sheet wins - except for this browser's changes it has not confirmed yet.
  const mergedList = applyPendingToRemote(parsedList);

  const currentSaved = typeof localStorage !== 'undefined' ? localStorage.getItem(ONBOARDING_STORAGE_KEY) : null;
  let currentList = [];
  try { currentList = JSON.parse(currentSaved || '[]') || []; } catch (_) {}
  const hasChanged = currentSaved === null || facultySignature(currentList) !== facultySignature(mergedList);

  // Persist synced data locally and broadcast to all tabs if changed
  if (hasChanged) {
    saveFacultyOnboardingData(mergedList);

    try {
      import('./reminderEmailService.js').then(({ reminderEmailService }) => {
        reminderEmailService.notifyAdmins({
          type: 'sheet_synced',
          title: '👥 Faculty Onboarding Sheet Synced',
          body: `Faculty Onboarding Master Google Sheet was synchronized (${mergedList.length} verified faculty members).`,
          author: 'Faculty Sync Service',
          details: { count: mergedList.length, method: fetchedVia }
        });
      }).catch(() => {});
    } catch (_) {}
  }
  persistFacultySheetUrl(cleanUrl, opts);

  return {
    success: true,
    count: mergedList.length,
    list: mergedList,
    changed: hasChanged,
    method: fetchedVia
  };
}

let connectedSyncInFlight = false;

/**
 * Automatically syncs from the connected Google Sheet. The sheet is authoritative, so edits and
 * deletes made by other admins show up here, while this browser's pending changes are preserved.
 */
export async function syncFacultyFromConnectedSheet(forceRemote = false) {
  if (connectedSyncInFlight) return null;
  connectedSyncInFlight = true;
  try {
    const connectedUrl = getConnectedFacultySheetUrl();
    if (!connectedUrl) return null;
    // Background reads never write the URL back into settings (that used to stamp a
    // "new" shared setting from every browser on every tick).
    return await syncFacultyFromGoogleSheet(connectedUrl, forceRemote, { persistUrl: false });
  } catch (err) {
    console.warn('Background faculty sheet sync notice:', err.message);
    return null;
  } finally {
    connectedSyncInFlight = false;
  }
}

/** Local dev server copy of the list. Only exists on localhost - skipped on the static Render site. */
export async function pullServerFacultyList() {
  if (typeof fetch === 'undefined' || !HAS_LOCAL_API) return null;
  try {
    const res = await fetch('/api/faculty-onboarding', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.list) && data.list.length > 0) {
        const nextList = applyPendingToRemote(data.list, false);
        const curJson = JSON.stringify(getFacultyOnboardingData());
        const newJson = JSON.stringify(nextList);
        if (curJson !== newJson) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(ONBOARDING_STORAGE_KEY, newJson);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('meded:faculty_onboarding_updated', { detail: nextList }));
          }
          return nextList;
        }
      }
    }
  } catch (_) {}
  return null;
}

let facultyAutoSyncTimer = null;
let facultyAutoSyncBound = false;

/**
 * Starts continuous background real-time synchronization with the shared spreadsheet
 * (pending writes are delivered first, then the sheet is read back).
 */
export function startFacultyAutoSync(intervalSeconds = 10) {
  stopFacultyAutoSync();
  const intervalMs = Math.max(5, intervalSeconds) * 1000;

  const tick = () => {
    pullServerFacultyList().catch(() => {});
    syncFacultyFromConnectedSheet().catch(() => {});
  };

  // Initial sync immediately
  tick();

  facultyAutoSyncTimer = setInterval(() => {
    if (typeof document === 'undefined' || document.visibilityState === 'visible') tick();
  }, intervalMs);

  if (typeof window !== 'undefined' && !facultyAutoSyncBound) {
    facultyAutoSyncBound = true;
    window.addEventListener('focus', tick);
    window.addEventListener('online', tick);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') tick();
      });
    }
  }
}

export function stopFacultyAutoSync() {
  if (facultyAutoSyncTimer) {
    clearInterval(facultyAutoSyncTimer);
    facultyAutoSyncTimer = null;
  }
}

/**
 * Handles Add, Edit, Update, and Delete operations on the faculty directory.
 * Writes to local storage, broadcasts the DOM event, and queues the change for the shared
 * Google Sheet - then waits for the Apps Script to CONFIRM it (the previous fire-and-forget
 * request could not tell a failed write from a successful one).
 *
 * @returns {Promise<{ok: boolean, count: number, list: object[], synced: boolean, pending: number, error?: string}>}
 */
export async function autoSyncFacultyMutation(action, targetFaculty, entireList) {
  let list = entireList;
  if (!list || !Array.isArray(list)) {
    list = getFacultyOnboardingData();
  }

  // Ensure targetFaculty has updated timestamp
  if (targetFaculty) {
    targetFaculty.lastUpdated = new Date().toISOString();
  }

  // 1. Persist locally immediately (also broadcasts to other tabs/components)
  saveFacultyOnboardingData(list);

  // Notify admins of onboarding setting update
  try {
    import('./reminderEmailService.js').then(({ reminderEmailService }) => {
      const actionTitle = action === 'delete' ? 'Faculty Removed' : (action === 'add' ? 'Faculty Added' : 'Faculty Updated');
      reminderEmailService.notifyAdmins({
        type: 'setting_updated',
        title: `👤 ${actionTitle}`,
        body: targetFaculty ? `${targetFaculty.name} (${targetFaculty.dept || 'Department'}) was ${action === 'delete' ? 'removed from' : 'updated in'} faculty directory.` : 'Faculty onboarding directory updated.',
        author: 'Administrator',
        details: { action, faculty: targetFaculty }
      });
    }).catch(() => {});
  } catch (_) {}

  // 2. Queue for the shared sheet
  if (action === 'batch') {
    list.forEach(f => queueFacultyOp('upsert', f));
  } else if (targetFaculty) {
    queueFacultyOp(action === 'delete' ? 'delete' : 'upsert', targetFaculty);
  }

  // 3. Deliver now and wait for confirmation
  clearTimeout(flushTimer);
  const result = await flushFacultyOutbox().catch(e => ({ sent: 0, remaining: getPendingFacultyOps().length, error: e && e.message }));
  const pending = getPendingFacultyOps().length;

  // 4. Also notify local development server if running
  if (typeof fetch !== 'undefined' && HAS_LOCAL_API) {
    try {
      fetch('/api/faculty-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, faculty: targetFaculty, list })
      }).catch(() => {});
    } catch (_) {}
  }

  return { ok: true, count: list.length, list, synced: pending === 0, pending, ...(result && result.error ? { error: result.error } : {}) };
}

// Background sync from connected Google Sheet on startup (Production-Ready)
if (typeof window !== 'undefined') {
  startFacultyAutoSync(15);
}
