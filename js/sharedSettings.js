/**
 * Shared portal settings.
 *
 * Settings, the write-back endpoint and faculty requests used to live only in
 * the browser that changed them. This module mirrors them through a
 * "Portal Settings" tab in the master Google Sheet so a change made in one
 * admin login shows up in every other login.
 *
 *  - Reads use the public sheet read path (Apps Script is the fallback).
 *  - Writes go through the Apps Script web app.
 *  - Last write wins per key; the requests list is merged by id so two admins
 *    (or a faculty submitting) never overwrite each other.
 *  - The write-back TOKEN is never published to the sheet.
 *
 * Only the *meaningful* part of each setting is shared. Per-browser runtime
 * fields (last-synced time, sync status, "last configured" stamps) are stripped
 * before comparing, publishing and applying. Without that, every browser's
 * 30-second background sync rewrote the shared sync setting with its own stale
 * interval / toggle, which is what made settings "change by themselves" a
 * little while after an admin saved them.
 */
import { parseCSV, fetchGoogleSheetJSONP, getRegistrySheetId, getRegistryWriter, postRegistryAction } from './sheetConnector.js';
import { appsScriptGet } from './appsScriptConfig.js';

const SETTINGS_TAB = 'Portal Settings';
const META_KEY = 'meded_shared_settings_meta_v1';
const PULL_INTERVAL_MS = 3500;
const PUSH_DEBOUNCE_MS = 400;
const REPUSH_OK_AFTER_MS = 120000;   // a published value the sheet still has not echoed back
const REPUSH_FAIL_AFTER_MS = 15000;  // a publish that failed
const MAX_REQUESTS = 150;
const DEFAULT_TOKEN = 'pw-meded-token-2026';
const EPOCH = '1970-01-01T00:00:00.000Z';

// ---------------------------------------------------------------------------
// What is shared, per key
// ---------------------------------------------------------------------------

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + stable(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function parseObj(raw) {
  try {
    const o = JSON.parse(raw || 'null');
    return o && typeof o === 'object' && !Array.isArray(o) ? o : null;
  } catch (_) { return null; }
}

/** Canonical form of the shared part of a JSON setting: drop per-browser fields. */
function dropFields(fields) {
  return (raw) => {
    const o = parseObj(raw);
    if (!o) return raw;
    const copy = { ...o };
    fields.forEach(f => delete copy[f]);
    return stable(copy);
  };
}

/** Canonical form keeping only the listed fields. */
function pickFields(fields) {
  return (raw) => {
    const o = parseObj(raw);
    if (!o) return raw;
    const copy = {};
    fields.forEach(f => { if (o[f] !== undefined) copy[f] = o[f]; });
    return stable(copy);
  };
}

/** Apply the remote (shared) fields on top of this browser's own fields. */
function overlayRemote(remoteRaw, localRaw) {
  const remote = parseObj(remoteRaw);
  if (!remote) return remoteRaw;
  const local = parseObj(localRaw) || {};
  return JSON.stringify({ ...local, ...remote });
}

function keepLocalToken(remoteRaw, localRaw) {
  const remote = parseObj(remoteRaw);
  if (!remote) return remoteRaw;
  const local = parseObj(localRaw) || {};
  return JSON.stringify({
    endpoint: remote.endpoint || local.endpoint || '',
    enabled: remote.enabled !== false,
    token: local.token || DEFAULT_TOKEN
  });
}

const stripToken = pickFields(['endpoint', 'enabled']);

/** localStorage keys mirrored across logins. */
const SHARED_KEYS = {
  'meded_email_settings': { merge: 'replace', shared: dropFields(['lastConfiguredAt', 'configuredBy']), incoming: overlayRemote },
  'pw_meded_email_settings': { merge: 'replace', shared: dropFields(['updatedAt']), incoming: overlayRemote },
  // lastSyncedAt / syncStatus change every sync tick in every browser: never share them.
  'meded_sync_settings_v1': { merge: 'replace', shared: pickFields(['autoSyncEnabled', 'intervalSeconds']), incoming: overlayRemote },
  'pw_faculty_spreadsheet_url': { merge: 'replace' },
  'meded_sheet_writeback_config_v1': { merge: 'replace', shared: stripToken, incoming: keepLocalToken },
  'pw_meded_faculty_requests': { merge: 'requests' }
};

/** The shared part of a raw localStorage value (what is compared and published). */
function sharedForm(key, raw) {
  if (raw == null) return raw;
  const cfg = SHARED_KEYS[key];
  return cfg && cfg.shared ? cfg.shared(String(raw)) : String(raw);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let rawSet = null;
let applying = false;
let ready = false;
let started = false;
let pushTimers = {};
let pushState = {};   // key -> { updatedAt, at, ok }
let pulling = false;

function readMeta() {
  try { return JSON.parse(localStorage.getItem(META_KEY) || '{}') || {}; } catch (_) { return {}; }
}
function writeMeta(meta) {
  try { rawSet.call(localStorage, META_KEY, JSON.stringify(meta)); } catch (_) { /* ignore */ }
}

function mergeRequests(localRaw, remoteRaw) {
  let local = [], remote = [];
  try { local = JSON.parse(localRaw || '[]') || []; } catch (_) { /* ignore */ }
  try { remote = JSON.parse(remoteRaw || '[]') || []; } catch (_) { /* ignore */ }
  const byId = new Map();
  for (const r of remote) if (r && r.id) byId.set(r.id, r);
  for (const l of local) {
    if (!l || !l.id) continue;
    const r = byId.get(l.id);
    if (!r) { byId.set(l.id, l); continue; }
    const lDone = l.status && l.status !== 'pending';
    const rDone = r.status && r.status !== 'pending';
    if (lDone && !rDone) byId.set(l.id, l);
    else if (lDone && rDone && String(l.resolvedAt || '') > String(r.resolvedAt || '')) byId.set(l.id, l);
  }
  return [...byId.values()]
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .slice(0, MAX_REQUESTS);
}

// ---------------------------------------------------------------------------
// Remote read
// ---------------------------------------------------------------------------

function rowsFromSheetCsv(csv) {
  const out = [];
  const rows = parseCSV(csv);
  if (rows.length < 1) return null;
  const h = rows[0].map(x => String(x || '').trim().toLowerCase());
  const iK = h.indexOf('key'), iV = h.indexOf('value'), iU = h.indexOf('updated at');
  // Missing tab => Google serves some other sheet; the header check rejects that.
  if (iK < 0 || iV < 0) return null;
  for (const r of rows.slice(1)) {
    const key = String(r[iK] || '').trim();
    if (!key) continue;
    out.push({ key, value: String(r[iV] == null ? '' : r[iV]), updatedAt: String(iU >= 0 && r[iU] ? r[iU] : '') });
  }
  return out;
}

async function fetchRemote() {
  const out = {};

  // 1. Local Node server (dev only) for instant sync between tabs on one machine.
  try {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (res.ok && (res.headers.get('content-type') || '').includes('json')) {
      const data = await res.json();
      if (data && data.settings) {
        const meta = data.meta || {};
        for (const [k, v] of Object.entries(data.settings)) {
          if (SHARED_KEYS[k]) {
            // The server remembers when each key last changed. Stamping "now" here made
            // the server copy look newer than anything typed in the browser, so it
            // overwrote the admin's change on the next poll.
            out[k] = { value: typeof v === 'string' ? v : JSON.stringify(v), updatedAt: meta[k] || EPOCH };
          }
        }
      }
    }
  } catch (_) {}

  // 1b. Faculty requests from the local server.
  try {
    const resReq = await fetch('/api/requests', { cache: 'no-store' });
    if (resReq.ok && (resReq.headers.get('content-type') || '').includes('json')) {
      const dataReq = await resReq.json();
      if (dataReq && Array.isArray(dataReq.requests)) {
        out['pw_meded_faculty_requests'] = { value: JSON.stringify(dataReq.requests), updatedAt: new Date().toISOString() };
      }
    }
  } catch (_) {}

  // 2. The shared Google Sheet: public read first, Apps Script as the fallback.
  let sheetRows = null;
  try {
    const csv = await fetchGoogleSheetJSONP(getRegistrySheetId(), SETTINGS_TAB);
    if (csv) sheetRows = rowsFromSheetCsv(csv);
  } catch (_) {}
  if (!sheetRows) {
    try {
      const data = await appsScriptGet('get_settings');
      if (data && data.ok && Array.isArray(data.settings)) {
        sheetRows = data.settings.map(s => ({ key: String(s.key || ''), value: String(s.value == null ? '' : s.value), updatedAt: String(s.updatedAt || '') }));
      }
    } catch (_) {}
  }
  for (const row of sheetRows || []) {
    if (!SHARED_KEYS[row.key]) continue;
    const upAt = row.updatedAt || EPOCH;
    if (!out[row.key] || upAt > (out[row.key].updatedAt || '')) {
      out[row.key] = { value: row.value, updatedAt: upAt };
    }
  }

  return Object.keys(out).length > 0 ? out : null;
}

// ---------------------------------------------------------------------------
// Remote write
// ---------------------------------------------------------------------------

async function push(key) {
  const cfg = SHARED_KEYS[key];
  const localRaw = localStorage.getItem(key);
  if (localRaw == null) return false;
  const value = cfg.shared ? cfg.shared(localRaw) : localRaw;
  const updatedAt = (readMeta()[key] || {}).updatedAt || new Date().toISOString();
  let ok = false;

  // Local Node server (dev only). It also records WHEN the key changed.
  try {
    if (key === 'pw_meded_faculty_requests') {
      let parsed = [];
      try { parsed = JSON.parse(value); } catch (_) {}
      const r = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: parsed })
      });
      if (r.ok && (r.headers.get('content-type') || '').includes('json')) ok = true;
    } else {
      const r = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value, updatedAt })
      });
      if (r.ok && (r.headers.get('content-type') || '').includes('json')) ok = true;
    }
  } catch (_) {}

  // Shared Google Sheet via Apps Script - what every other login reads.
  if (getRegistryWriter()) {
    try {
      const res = await postRegistryAction('set_setting', { key, value, updatedAt }, 'setting');
      if (res && res.ok) ok = true;
    } catch (_) {}
  }

  pushState[key] = { updatedAt, at: Date.now(), ok };
  return ok;
}

function schedulePush(key) {
  clearTimeout(pushTimers[key]);
  pushTimers[key] = setTimeout(() => { push(key).catch(() => {}); }, PUSH_DEBOUNCE_MS);
}

/** Re-publish only when needed - not on every 3.5s poll while the sheet's copy catches up. */
function schedulePushIfNeeded(key, localAt) {
  const ps = pushState[key];
  if (!ps || ps.updatedAt !== localAt) return schedulePush(key);
  const age = Date.now() - ps.at;
  if (ps.ok ? age > REPUSH_OK_AFTER_MS : age > REPUSH_FAIL_AFTER_MS) schedulePush(key);
}

function applyLocal(key, value, updatedAt) {
  applying = true;
  try { rawSet.call(localStorage, key, value); } finally { applying = false; }
  const meta = readMeta();
  meta[key] = { updatedAt };
  writeMeta(meta);
}

// ---------------------------------------------------------------------------
// Pull + reconcile
// ---------------------------------------------------------------------------

export async function pullSharedSettings() {
  if (pulling) return;
  pulling = true;
  try {
    const remote = await fetchRemote();
    if (!remote) return;
    const meta = readMeta();
    const changedKeys = [];

    for (const key of Object.keys(SHARED_KEYS)) {
      const cfg = SHARED_KEYS[key];
      const rem = remote[key];
      const localRaw = localStorage.getItem(key);
      const localAt = (meta[key] || {}).updatedAt || '';

      if (!rem) {
        // Nothing shared yet: seed the registry with what this browser has.
        if (localRaw != null && !localAt) {
          meta[key] = { updatedAt: new Date().toISOString() };
          writeMeta(meta);
          schedulePush(key);
        }
        continue;
      }

      if (cfg.merge === 'requests') {
        const merged = mergeRequests(localRaw, rem.value);
        const mergedStr = JSON.stringify(merged);
        const localNorm = JSON.stringify(mergeRequests(localRaw, '[]'));
        if (mergedStr !== localNorm) { applyLocal(key, mergedStr, rem.updatedAt || new Date().toISOString()); changedKeys.push(key); }
        if (mergedStr !== JSON.stringify(mergeRequests(rem.value, '[]'))) {
          meta[key] = { updatedAt: new Date().toISOString() };
          writeMeta(meta);
          schedulePush(key);
        }
        continue;
      }

      const sameShared = sharedForm(key, rem.value) === sharedForm(key, localRaw);

      if (sameShared) {
        // Already in agreement on everything that matters; just remember the stamp.
        if (rem.updatedAt > localAt) { meta[key] = { updatedAt: rem.updatedAt }; writeMeta(meta); }
        continue;
      }

      if (rem.updatedAt > localAt) {
        const incoming = cfg.incoming ? cfg.incoming(rem.value, localRaw) : rem.value;
        applyLocal(key, incoming, rem.updatedAt);
        changedKeys.push(key);
      } else if (localAt > rem.updatedAt) {
        schedulePushIfNeeded(key, localAt);
      }
    }

    if (changedKeys.length && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meded:settings_synced', { detail: { keys: changedKeys } }));

      // Automatically create an admin notification for synced settings
      try {
        const notifLabels = {
          'meded_email_settings': 'Email Reminders',
          'pw_meded_email_settings': 'Email Reminders',
          'meded_sync_settings_v1': 'Multi-Admin Sync',
          'pw_faculty_spreadsheet_url': 'Faculty Spreadsheet URL',
          'meded_sheet_writeback_config_v1': 'Sheet Write-Back Endpoint',
          'pw_meded_faculty_requests': 'Faculty Reschedule Requests'
        };
        const updatedNames = changedKeys.map(k => notifLabels[k] || k).join(', ');

        // Push notification to admin feed
        const notifData = JSON.parse(localStorage.getItem('meded_notifications') || '[]');
        const newNotif = {
          id: `notif-sync-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: 'setting_updated',
          title: '⚙️ Settings Synced from Administrator',
          body: `Global portal configuration [${updatedNames}] was updated by another administrator.`,
          author: 'Admin Sync Service',
          timestamp: new Date().toISOString(),
          read: false,
          role: 'admin'
        };
        notifData.unshift(newNotif);
        localStorage.setItem('meded_notifications', JSON.stringify(notifData.slice(0, 150)));
        window.dispatchEvent(new CustomEvent('meded:notifications_updated', { detail: notifData }));
        window.dispatchEvent(new CustomEvent('meded:admin_alert', { detail: newNotif }));
      } catch (_) {}
    }
  } finally {
    pulling = false;
    ready = true;
  }
}

/** Idempotent. Call once from each entry point (admin and faculty). */
export function startSharedSettingsSync() {
  if (started || typeof window === 'undefined' || typeof localStorage === 'undefined' || typeof Storage === 'undefined') return;
  started = true;

  rawSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    const previous = this === localStorage ? localStorage.getItem(key) : null;
    rawSet.call(this, key, value);
    if (this !== localStorage || applying || !ready || !SHARED_KEYS[key]) return;
    // A write that only touches per-browser fields (sync timestamps, "last configured")
    // is not a settings change: do not stamp it as newer or publish it.
    if (previous != null && sharedForm(key, previous) === sharedForm(key, String(value))) return;
    const meta = readMeta();
    meta[key] = { updatedAt: new Date().toISOString() };
    writeMeta(meta);
    schedulePush(key);
  };

  setTimeout(() => { pullSharedSettings().catch(() => { ready = true; }); }, 900);
  setInterval(() => {
    if (document.visibilityState === 'visible') pullSharedSettings().catch(() => {});
  }, PULL_INTERVAL_MS);
  window.addEventListener('focus', () => { pullSharedSettings().catch(() => {}); });
}
