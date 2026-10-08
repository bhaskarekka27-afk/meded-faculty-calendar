/**
 * Single place that answers "where do I send writes to the shared Google Sheet?"
 *
 * On the Render deployment there is no Node backend: the only thing every admin
 * and faculty browser has in common is the Google Sheet + its Apps Script web
 * app. Several modules (faculty directory, batch registry, shared settings) used
 * to each look for the web-app URL in a different localStorage key, and quietly
 * skipped the write when THIS browser did not have it - so a delete, a newly
 * connected spreadsheet or a changed setting stayed on the device that made it.
 *
 * Resolution order (first hit wins):
 *   1. Sheet write-back config            (meded_sheet_writeback_config_v1)
 *   2. Email settings "Apps Script URL"   (meded_email_settings.appsScriptUrl)
 *   3. Legacy keys                        (meded_sheet_writer_url / pw_faculty_script_url)
 *   4. A connected sheet link that is itself a /exec URL
 *   5. The built-in default deployment below
 *
 * This module has no imports on purpose so any file can use it without
 * creating an import cycle.
 */

/** Apps Script web app that is bound to the master "MedEd Faculty Onboarding Data" sheet. */
export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzngJRD2AiQknJcxH4rzwX9Txuo6vcrQ_fBb6wMwVHhTeewkdaaSm_4qGmjdUkuU_sAJg/exec';

/** Matches SHARED_TOKEN in apps-script/Code.gs. */
export const DEFAULT_WRITER_TOKEN = 'pw-meded-token-2026';

function ls(key) {
  try {
    return (typeof localStorage !== 'undefined' && localStorage.getItem(key)) || '';
  } catch (_) {
    return '';
  }
}

function parseObj(raw) {
  try {
    const o = JSON.parse(raw || 'null');
    return o && typeof o === 'object' ? o : {};
  } catch (_) {
    return {};
  }
}

export function isAppsScriptUrl(url) {
  return typeof url === 'string' && url.includes('script.google.com/macros/s/');
}

/** @returns {{endpoint: string, token: string, source: string}} never null - falls back to the default deployment. */
export function resolveAppsScriptWriter() {
  const wb = parseObj(ls('meded_sheet_writeback_config_v1'));
  const em = parseObj(ls('meded_email_settings'));
  const savedSheet = ls('pw_faculty_spreadsheet_url');

  const candidates = [
    ['writeback-config', wb.endpoint],
    ['email-settings', em.appsScriptUrl],
    ['legacy-writer-url', ls('meded_sheet_writer_url')],
    ['legacy-script-url', ls('pw_faculty_script_url')],
    ['sheet-link', savedSheet.includes('/exec') ? savedSheet : ''],
    ['default', DEFAULT_APPS_SCRIPT_URL]
  ];

  for (const [source, value] of candidates) {
    const endpoint = String(value || '').trim();
    if (isAppsScriptUrl(endpoint)) {
      const token = String(wb.token || ls('meded_sheet_writer_token') || DEFAULT_WRITER_TOKEN).trim();
      return { endpoint, token, source };
    }
  }
  return { endpoint: DEFAULT_APPS_SCRIPT_URL, token: DEFAULT_WRITER_TOKEN, source: 'default' };
}

/** The faculty portal is read-mostly; admin-only housekeeping must not run there. */
export function isFacultyPage() {
  try {
    return typeof location !== 'undefined' && /faculty/i.test(location.pathname || '');
  } catch (_) {
    return false;
  }
}

function withTimeout(ms) {
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), ms) : null;
  return { signal: ctrl ? ctrl.signal : undefined, done: () => timer && clearTimeout(timer) };
}

/**
 * GET an action from the Apps Script web app (read-only actions need no token).
 * Resolves to the parsed JSON, or null when the call fails / is not JSON.
 */
export async function appsScriptGet(action, params = {}, timeoutMs = 12000) {
  if (typeof fetch === 'undefined') return null;
  const { endpoint } = resolveAppsScriptWriter();
  const t = withTimeout(timeoutMs);
  try {
    const u = new URL(endpoint);
    u.searchParams.set('action', action);
    Object.keys(params).forEach(k => u.searchParams.set(k, params[k]));
    u.searchParams.set('_t', String(Date.now()));
    const res = await fetch(u.toString(), { cache: 'no-store', signal: t.signal });
    const text = await res.text();
    return JSON.parse(text);
  } catch (_) {
    return null;
  } finally {
    t.done();
  }
}

/**
 * POST an action to the Apps Script web app and READ the answer.
 * text/plain keeps it a "simple request" (Apps Script cannot answer CORS preflights).
 * @returns {Promise<{ok: boolean, error?: string, data?: any}>}
 */
export async function appsScriptPost(action, payload = {}, timeoutMs = 20000) {
  if (typeof fetch === 'undefined') return { ok: false, error: 'fetch unavailable' };
  const { endpoint, token } = resolveAppsScriptWriter();
  const t = withTimeout(timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token, ...payload }),
      signal: t.signal
    });
    const json = await res.json();
    return json && json.ok ? { ok: true, data: json } : { ok: false, error: (json && json.error) || 'Apps Script rejected the request', data: json };
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'Could not reach the Apps Script web app' };
  } finally {
    t.done();
  }
}
