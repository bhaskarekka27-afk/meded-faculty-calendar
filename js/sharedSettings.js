/**
 * Shared portal settings.
 *
 * Settings, the write-back endpoint and faculty requests used to live only in
 * the browser that changed them. This module mirrors them through a
 * "Portal Settings" tab in the master Google Sheet so a change made in one
 * admin login shows up in every other login.
 *
 *  - Reads use the public sheet read path, so every browser can pull.
 *  - Writes go through the Apps Script web app (needs the endpoint).
 *  - Last write wins per key; the requests list is merged by id so two admins
 *    (or a faculty submitting) never overwrite each other.
 *  - The write-back TOKEN is never published to the sheet.
 */
import { parseCSV, fetchGoogleSheetJSONP, getRegistrySheetId, getRegistryWriter, postRegistryAction } from './sheetConnector.js';

const SETTINGS_TAB = 'Portal Settings';
const META_KEY = 'meded_shared_settings_meta_v1';
const PULL_INTERVAL_MS = 3500;
const PUSH_DEBOUNCE_MS = 400;
const MAX_REQUESTS = 150;
const DEFAULT_TOKEN = 'pw-meded-token-2026';

/** localStorage keys mirrored across logins. */
const SHARED_KEYS = {
  'meded_email_settings': { merge: 'replace' },
  'pw_meded_email_settings': { merge: 'replace' },
  'meded_sync_settings_v1': { merge: 'replace' },
  'pw_faculty_spreadsheet_url': { merge: 'replace' },
  'meded_sheet_writeback_config_v1': { merge: 'replace', outgoing: stripToken, incoming: keepLocalToken },
  'pw_meded_faculty_requests': { merge: 'requests' }
};

function stripToken(raw) {
  try {
    const c = JSON.parse(raw) || {};
    return JSON.stringify({ endpoint: c.endpoint || '', enabled: c.enabled !== false });
  } catch (_) { return raw; }
}

function keepLocalToken(remoteRaw, localRaw) {
  try {
    const remote = JSON.parse(remoteRaw) || {};
    const local = JSON.parse(localRaw || 'null') || {};
    return JSON.stringify({
      endpoint: remote.endpoint || local.endpoint || '',
      enabled: remote.enabled !== false,
      token: local.token || DEFAULT_TOKEN
    });
  } catch (_) { return remoteRaw; }
}

let rawSet = null;
let applying = false;
let ready = false;
let started = false;
let pushTimers = {};
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

async function fetchRemote() {
  const out = {};
  // 1. Try server settings API first for lightning-fast real-time sync across logins
  try {
    const res = await fetch('/api/settings', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.settings) {
        for (const [k, v] of Object.entries(data.settings)) {
          if (SHARED_KEYS[k]) {
            out[k] = { value: typeof v === 'string' ? v : JSON.stringify(v), updatedAt: new Date().toISOString() };
          }
        }
      }
    }
  } catch (_) {}

  // 1b. Pull requests from server API
  try {
    const resReq = await fetch('/api/requests', { cache: 'no-store' });
    if (resReq.ok) {
      const dataReq = await resReq.json();
      if (dataReq && Array.isArray(dataReq.requests)) {
        out['pw_meded_faculty_requests'] = { value: JSON.stringify(dataReq.requests), updatedAt: new Date().toISOString() };
      }
    }
  } catch (_) {}

  // 2. Also check Google Sheet tab as secondary/cloud backup
  try {
    const csv = await fetchGoogleSheetJSONP(getRegistrySheetId(), SETTINGS_TAB);
    if (csv) {
      const rows = parseCSV(csv);
      if (rows.length > 1) {
        const h = rows[0].map(x => String(x || '').trim().toLowerCase());
        const iK = h.indexOf('key'), iV = h.indexOf('value'), iU = h.indexOf('updated at');
        if (iK >= 0 && iV >= 0) {
          for (const r of rows.slice(1)) {
            const key = String(r[iK] || '').trim();
            if (key && SHARED_KEYS[key]) {
              const val = String(r[iV] == null ? '' : r[iV]);
              const upAt = String(iU >= 0 && r[iU] ? r[iU] : '');
              if (!out[key] || (upAt && upAt > (out[key].updatedAt || ''))) {
                out[key] = { value: val, updatedAt: upAt || new Date().toISOString() };
              }
            }
          }
        }
      }
    }
  } catch (_) {}

  return Object.keys(out).length > 0 ? out : null;
}

async function push(key) {
  const cfg = SHARED_KEYS[key];
  let value = localStorage.getItem(key);
  if (value == null) return false;
  if (cfg.outgoing) value = cfg.outgoing(value);
  const updatedAt = (readMeta()[key] || {}).updatedAt || new Date().toISOString();

  // Push to server API
  try {
    if (key === 'pw_meded_faculty_requests') {
      let parsed = [];
      try { parsed = JSON.parse(value); } catch (_) {}
      fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: parsed })
      }).catch(() => {});
    } else {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      }).catch(() => {});
    }
  } catch (_) {}

  // Also push to Google Sheets Apps Script registry if configured
  if (getRegistryWriter()) {
    postRegistryAction('set_setting', { key, value, updatedAt }, 'setting').catch(() => {});
  }
  return true;
}

function schedulePush(key) {
  clearTimeout(pushTimers[key]);
  pushTimers[key] = setTimeout(() => { push(key).catch(() => {}); }, PUSH_DEBOUNCE_MS);
}

function applyLocal(key, value, updatedAt) {
  applying = true;
  try { rawSet.call(localStorage, key, value); } finally { applying = false; }
  const meta = readMeta();
  meta[key] = { updatedAt };
  writeMeta(meta);
}

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
        // Nothing shared yet: an admin browser seeds the registry with what it has.
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

      if (rem.updatedAt > localAt) {
        const incoming = cfg.incoming ? cfg.incoming(rem.value, localRaw) : rem.value;
        if (incoming !== localRaw) { applyLocal(key, incoming, rem.updatedAt); changedKeys.push(key); }
        else { meta[key] = { updatedAt: rem.updatedAt }; writeMeta(meta); }
      } else if (localAt > rem.updatedAt) {
        schedulePush(key);
      }
    }

    if (changedKeys.length && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meded:settings_synced', { detail: { keys: changedKeys } }));
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
    if (this !== localStorage || applying || !ready || !SHARED_KEYS[key] || previous === String(value)) return;
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
