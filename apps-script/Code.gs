/**
 * PW MedEd — Lecture Status Write-Back Web App
 * ---------------------------------------------
 * Receives reschedule / cancellation decisions from the MedEd Admin portal and
 * writes them back into the connected Lecture Planner sheet.
 *
 * It never overwrites the original planned date, faculty or topic. It only
 * writes to five columns that it appends to the right of your existing
 * columns, creating them on first use:
 *
 *   Status | Rescheduled Date | Rescheduled Time | Rescheduled Duration | Status Updated At
 *
 * DEPLOY (see README.md for the walkthrough):
 *   1. Open the Lecture Planner spreadsheet -> Extensions -> Apps Script.
 *   2. Paste this file in, then set SHARED_TOKEN below to a long random string.
 *   3. Deploy -> New deployment -> Web app
 *        Execute as:      Me
 *        Who has access:  Anyone
 *   4. Copy the /exec URL into the portal: Dean menu -> Connect Sheet ->
 *      "Sheet write-back", together with the same token.
 */

// ---------------------------------------------------------------------------
// CONFIG — change this before deploying.
// ---------------------------------------------------------------------------

/** Shared secret. Must match the token saved in the portal. */
var SHARED_TOKEN = 'CHANGE-ME-to-a-long-random-string';

/** Column headers this script manages. Order matters; rename freely. */
var STATUS_COLUMNS = [
  'Status',
  'Rescheduled Date',
  'Rescheduled Time',
  'Rescheduled Duration',
  'Status Updated At'
];

/** Optional: also append every action to this tab as an audit trail. */
var LOG_TAB_NAME = 'Reschedule Log';
var ENABLE_LOG_TAB = true;

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

function doGet(e) {
  // Health check so the portal can verify the URL before saving it.
  var token = (e && e.parameter && e.parameter.token) || '';
  if (!tokenOk_(token)) return json_({ ok: false, error: 'Invalid token' });
  return json_({
    ok: true,
    service: 'meded-status-writeback',
    version: 1,
    spreadsheet: SpreadsheetApp.getActiveSpreadsheet().getName(),
    tabs: SpreadsheetApp.getActiveSpreadsheet().getSheets().map(function (s) { return s.getName(); })
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Serialise writes so two admins approving at once cannot clobber a row.
    lock.waitLock(25000);
  } catch (err) {
    return json_({ ok: false, error: 'Sheet is busy, please retry' });
  }

  try {
    var body = parseBody_(e);
    if (!tokenOk_(body.token)) return json_({ ok: false, error: 'Invalid token' });

    var action = String(body.action || '').toLowerCase();
    if (action === 'ping') return json_({ ok: true, pong: true });
    if (action !== 'reschedule' && action !== 'cancel' && action !== 'revert') {
      return json_({ ok: false, error: 'Unknown action: ' + action });
    }

    return json_(applyStatus_(action, body));
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

function applyStatus_(action, body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabName = body.tabName || 'Lecture Planner';
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    return { ok: false, error: 'Tab not found: "' + tabName + '". Available: ' +
      ss.getSheets().map(function (s) { return s.getName(); }).join(', ') };
  }

  var headerRow = Number(body.headerRow || 1);

  // Resolve the row BEFORE touching the sheet, so a request we cannot match
  // leaves the spreadsheet completely unmodified.
  var row = resolveRow_(sheet, headerRow, body);
  if (!row.found) {
    return { ok: false, error: row.error || 'Could not locate the lecture row in the sheet' };
  }

  var cols = ensureStatusColumns_(sheet, headerRow);

  var status = body.status || (action === 'cancel' ? 'Cancelled'
                              : action === 'revert' ? ''
                              : 'Rescheduled');
  var stamp = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), 'yyyy-MM-dd HH:mm:ss');

  var values = {};
  values[cols.status] = status;

  if (action === 'reschedule') {
    values[cols.rescheduledDate] = body.rescheduledDate || '';
    values[cols.rescheduledTime] = body.rescheduledTime || '';
    values[cols.rescheduledDuration] = body.rescheduledDuration || '';
  } else if (action === 'cancel') {
    // A cancelled class has no new slot; clear any stale reschedule values so
    // the row cannot read as both moved and cancelled.
    values[cols.rescheduledDate] = '';
    values[cols.rescheduledTime] = '';
    values[cols.rescheduledDuration] = '';
  } else if (action === 'revert') {
    values[cols.rescheduledDate] = '';
    values[cols.rescheduledTime] = '';
    values[cols.rescheduledDuration] = '';
  }
  values[cols.updatedAt] = stamp;

  Object.keys(values).forEach(function (colIndex) {
    sheet.getRange(row.row, Number(colIndex)).setValue(values[colIndex]);
  });

  if (ENABLE_LOG_TAB) {
    appendLog_(ss, {
      timestamp: stamp,
      action: action,
      status: status,
      tabName: tabName,
      row: row.row,
      matchedBy: row.matchedBy,
      originalDate: row.snapshot.date,
      faculty: row.snapshot.faculty,
      topic: row.snapshot.topic,
      rescheduledDate: body.rescheduledDate || '',
      rescheduledTime: body.rescheduledTime || '',
      rescheduledDuration: body.rescheduledDuration || '',
      reason: body.reason || '',
      actor: body.actor || '',
      requestId: body.requestId || ''
    });
  }

  return {
    ok: true,
    row: row.row,
    matchedBy: row.matchedBy,
    status: status,
    updatedAt: stamp,
    columns: STATUS_COLUMNS
  };
}

/**
 * Find the sheet row for the lecture.
 *
 * Trusts the client's rowIndex only when the row's date and faculty still
 * match what the client saw; otherwise falls back to scanning for a unique
 * date + faculty (+ topic) match. This keeps the write correct even if rows
 * were inserted in the sheet since the portal last synced.
 */
function resolveRow_(sheet, headerRow, body) {
  var match = body.match || {};
  var wantDate = norm_(match.date);
  var wantFaculty = norm_(match.faculty);
  var wantTopic = norm_(match.topic);

  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  if (lastRow <= headerRow) return { found: false, error: 'Sheet has no data rows' };

  var data = sheet.getRange(headerRow + 1, 1, lastRow - headerRow, lastCol).getDisplayValues();

  function snapshotOf(arr) {
    return { date: arr[0] || '', faculty: arr[1] || '', topic: arr[4] || arr[2] || '' };
  }
  function rowMatches(arr) {
    if (!wantDate && !wantFaculty) return false;
    var okDate = !wantDate || norm_(arr[0]) === wantDate;
    var okFaculty = !wantFaculty || norm_(arr[1]) === wantFaculty;
    return okDate && okFaculty;
  }

  // 1. The row the client pointed at, if it still looks like the same lecture.
  var hinted = Number(body.rowIndex || 0);
  if (hinted >= headerRow + 1 && hinted <= lastRow) {
    var arr = data[hinted - headerRow - 1];
    if (arr && rowMatches(arr)) {
      return { found: true, row: hinted, matchedBy: 'rowIndex', snapshot: snapshotOf(arr) };
    }
  }

  // 2. Scan for date + faculty.
  var hits = [];
  for (var i = 0; i < data.length; i++) {
    if (rowMatches(data[i])) hits.push(i);
  }

  // 3. Narrow with the topic when the date+faculty pair is not unique.
  if (hits.length > 1 && wantTopic) {
    var narrowed = hits.filter(function (i) {
      var arr = data[i];
      var topic = norm_(arr[4]) || norm_(arr[2]);
      return topic === wantTopic;
    });
    if (narrowed.length) hits = narrowed;
  }

  if (hits.length === 1) {
    var r = hits[0] + headerRow + 1;
    return { found: true, row: r, matchedBy: 'search', snapshot: snapshotOf(data[hits[0]]) };
  }
  if (hits.length > 1) {
    return { found: false, error: 'Ambiguous: ' + hits.length + ' rows match this date and faculty. Add the topic to disambiguate.' };
  }
  return { found: false, error: 'No row found for ' + (match.date || '?') + ' / ' + (match.faculty || '?') };
}

/** Create the managed columns if missing; return their 1-based indexes. */
function ensureStatusColumns_(sheet, headerRow) {
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet.getRange(headerRow, 1, 1, lastCol).getDisplayValues()[0] || [];

  var indexes = {};
  STATUS_COLUMNS.forEach(function (name) {
    var at = -1;
    for (var i = 0; i < headers.length; i++) {
      if (norm_(headers[i]) === norm_(name)) { at = i + 1; break; }
    }
    if (at === -1) {
      lastCol += 1;
      if (sheet.getMaxColumns() < lastCol) {
        sheet.insertColumnsAfter(sheet.getMaxColumns(), lastCol - sheet.getMaxColumns());
      }
      var cell = sheet.getRange(headerRow, lastCol);
      cell.setValue(name);
      cell.setFontWeight('bold');
      headers[lastCol - 1] = name;
      at = lastCol;
    }
    indexes[name] = at;
  });

  return {
    status: indexes[STATUS_COLUMNS[0]],
    rescheduledDate: indexes[STATUS_COLUMNS[1]],
    rescheduledTime: indexes[STATUS_COLUMNS[2]],
    rescheduledDuration: indexes[STATUS_COLUMNS[3]],
    updatedAt: indexes[STATUS_COLUMNS[4]]
  };
}

var LOG_HEADERS = [
  'Timestamp', 'Action', 'Status', 'Tab', 'Row', 'Matched By',
  'Original Date', 'Faculty', 'Topic',
  'Rescheduled Date', 'Rescheduled Time', 'Rescheduled Duration',
  'Reason', 'Actor', 'Request Id'
];

function appendLog_(ss, entry) {
  var sheet = ss.getSheetByName(LOG_TAB_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(LOG_TAB_NAME);
    sheet.appendRow(LOG_HEADERS);
    sheet.getRange(1, 1, 1, LOG_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([
    entry.timestamp, entry.action, entry.status, entry.tabName, entry.row, entry.matchedBy,
    entry.originalDate, entry.faculty, entry.topic,
    entry.rescheduledDate, entry.rescheduledTime, entry.rescheduledDuration,
    entry.reason, entry.actor, entry.requestId
  ]);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseBody_(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (err) { /* fall through */ }
  }
  // Tolerate form-encoded posts too.
  if (e && e.parameter && e.parameter.payload) {
    try { return JSON.parse(e.parameter.payload); } catch (err) { /* fall through */ }
  }
  return (e && e.parameter) || {};
}

function tokenOk_(token) {
  if (!SHARED_TOKEN || SHARED_TOKEN === 'CHANGE-ME-to-a-long-random-string') {
    throw new Error('SHARED_TOKEN is not set in the Apps Script. Set it, then redeploy.');
  }
  return String(token || '') === SHARED_TOKEN;
}

function norm_(v) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase();
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
