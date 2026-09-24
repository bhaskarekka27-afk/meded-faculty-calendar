/**
 * Sheet write-back client.
 *
 * Posts reschedule / cancellation decisions to the Apps Script Web App
 * deployed from the connected Lecture Planner spreadsheet (see
 * apps-script/Code.gs). The portal is a static site, so this is the only way
 * it can write to the sheet — the gviz CSV endpoint it reads from is
 * read-only.
 *
 * Two details that matter:
 *  - The request is sent as text/plain. Apps Script Web Apps do not answer
 *    CORS preflights, and a JSON content-type would trigger one, so the body
 *    is JSON text under a "simple request" content type.
 *  - Every write that fails is queued in localStorage and retried, so an
 *    approval is never silently lost when the network or the endpoint is down.
 */

const CONFIG_KEY = 'meded_sheet_writeback_config_v1';
const QUEUE_KEY = 'meded_sheet_writeback_queue_v1';
const MAX_QUEUE = 100;

/** @returns {{endpoint: string, token: string, enabled: boolean}} */
export function getSheetWriterConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        endpoint: parsed.endpoint || '',
        token: parsed.token || '',
        enabled: parsed.enabled !== false
      };
    }
  } catch (_) { /* fall through to defaults */ }
  return { endpoint: '', token: '', enabled: true };
}

export function saveSheetWriterConfig({ endpoint, token, enabled = true }) {
  const config = {
    endpoint: (endpoint || '').trim(),
    token: (token || '').trim(),
    enabled: Boolean(enabled)
  };
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (_) { /* storage unavailable; config stays in memory only */ }
  return config;
}

export function isSheetWriteBackConfigured() {
  const { endpoint, token, enabled } = getSheetWriterConfig();
  return Boolean(enabled && endpoint && token);
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function writeQueue(items) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)));
  } catch (_) { /* nothing more we can do */ }
}

export function getPendingSheetWrites() {
  return readQueue();
}

function enqueue(payload, error) {
  const items = readQueue();
  items.push({
    payload,
    queuedAt: new Date().toISOString(),
    attempts: 1,
    lastError: String(error || 'unknown error')
  });
  writeQueue(items);
}

/**
 * Retry everything that failed earlier. Safe to call on load and after a
 * successful write. Returns {sent, failed, remaining}.
 */
export async function flushPendingSheetWrites() {
  if (!isSheetWriteBackConfigured()) return { sent: 0, failed: 0, remaining: readQueue().length };

  const items = readQueue();
  if (items.length === 0) return { sent: 0, failed: 0, remaining: 0 };

  const still = [];
  let sent = 0;
  for (const item of items) {
    const res = await postToSheet(item.payload, { queueOnFailure: false });
    if (res.ok) {
      sent += 1;
    } else {
      still.push({ ...item, attempts: (item.attempts || 0) + 1, lastError: res.error });
    }
  }
  writeQueue(still);
  return { sent, failed: still.length, remaining: still.length };
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

async function postToSheet(payload, { queueOnFailure = true } = {}) {
  const { endpoint, token, enabled } = getSheetWriterConfig();

  if (!enabled) return { ok: false, skipped: true, error: 'Sheet write-back is switched off' };
  if (!endpoint || !token) {
    return { ok: false, skipped: true, error: 'Sheet write-back is not configured (no Web App URL or token)' };
  }

  const body = { ...payload, token };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      // text/plain keeps this a CORS "simple request" - no preflight, which
      // Apps Script cannot answer.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      redirect: 'follow'
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw new Error(`Endpoint did not return JSON (HTTP ${res.status}). Check that the deployment is "Anyone" access and you copied the /exec URL.`);
    }

    if (!res.ok || !data.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return { ok: true, data };
  } catch (err) {
    const message = String((err && err.message) || err);
    if (queueOnFailure) enqueue(payload, message);
    return { ok: false, error: message, queued: queueOnFailure };
  }
}

// ---------------------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------------------

/**
 * The identity of a lecture row, as the sheet will recognise it.
 * `rowIndex` is a hint; the Web App verifies it against date + faculty and
 * falls back to a search, so a row inserted in the sheet since the last sync
 * cannot cause a write to the wrong lecture.
 */
function rowRef(event = {}) {
  return {
    tabName: event.sheetTabName || event.tabName || 'Lecture Planner',
    rowIndex: event.rowIndex || 0,
    match: {
      date: event.dateRaw || '',
      faculty: event.faculty || '',
      topic: event.topic || event.chapter || ''
    }
  };
}

/** Write "Rescheduled" plus the new date / time / duration. */
export function pushRescheduleToSheet(event, slot = {}, meta = {}) {
  return postToSheet({
    action: 'reschedule',
    ...rowRef(event),
    status: 'Rescheduled',
    rescheduledDate: slot.isoDate || slot.date || '',
    rescheduledTime: slot.timings || '',
    rescheduledDuration: slot.duration || '',
    reason: meta.reason || '',
    actor: meta.actor || '',
    requestId: meta.requestId || ''
  });
}

/** Write "Cancelled" and clear any stale reschedule values. */
export function pushCancellationToSheet(event, meta = {}) {
  return postToSheet({
    action: 'cancel',
    ...rowRef(event),
    status: 'Cancelled',
    reason: meta.reason || '',
    actor: meta.actor || '',
    requestId: meta.requestId || ''
  });
}

/** Clear the status columns for a lecture (undo an approval). */
export function clearSheetStatus(event, meta = {}) {
  return postToSheet({
    action: 'revert',
    ...rowRef(event),
    status: '',
    reason: meta.reason || '',
    actor: meta.actor || '',
    requestId: meta.requestId || ''
  });
}

/** Verify a URL + token pair without writing anything. */
export async function testSheetWriteBack(endpoint, token) {
  try {
    const url = `${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    const text = await res.text();
    const data = JSON.parse(text);
    if (!data.ok) return { ok: false, error: data.error || 'Endpoint rejected the token' };
    return { ok: true, spreadsheet: data.spreadsheet, tabs: data.tabs || [] };
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
}
