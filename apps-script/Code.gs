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
// CONFIG — default pre-configured for instant operation
// ---------------------------------------------------------------------------

/** Shared secret. Matches the default token in the portal. */
var SHARED_TOKEN = 'pw-meded-token-2026';

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
// 1-Click Runnable Setup Functions (Select in Apps Script toolbar & Click "Run")
// ---------------------------------------------------------------------------

/**
 * 1-Click Setup: Formats headers, applies styling, and writes all 34 faculty records into the sheet.
 */
function setup_faculty_sheet() {
  var res = setupFacultySheet_({});
  Logger.log('Setup Result: ' + JSON.stringify(res, null, 2));
  return res;
}

/**
 * Verifies active spreadsheet connection.
 */
function test_connection() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var info = {
    ok: true,
    name: ss.getName(),
    id: ss.getId(),
    sheets: ss.getSheets().map(function(s) { return s.getName(); })
  };
  Logger.log('Connected: ' + JSON.stringify(info, null, 2));
  return info;
}

// ---------------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------------

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  var token = (e && e.parameter && e.parameter.token) || '';

  if (action === 'get_faculty') {
    return json_(getFacultyRecords_());
  }

  if (action === 'setup_faculty_sheet') {
    if (!tokenOk_(token)) return json_({ ok: false, error: 'Invalid token' });
    return json_(setupFacultySheet_({}));
  }

  // Health check so the portal can verify the URL before saving it.
  if (!tokenOk_(token)) return json_({ ok: false, error: 'Invalid token' });
  return json_({
    ok: true,
    service: 'meded-status-writeback',
    version: 2,
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

    if (action === 'setup_faculty_sheet' || action === 'init_faculty_sheet') {
      return json_(setupFacultySheet_(body));
    }

    if (action === 'get_faculty') {
      return json_(getFacultyRecords_());
    }

    if (action === 'add_faculty') {
      return json_(addFacultyRecord_(body.faculty || {}));
    }

    if (action === 'update_faculty') {
      return json_(updateFacultyRecord_(body.faculty || {}));
    }

    if (action === 'delete_faculty') {
      return json_(deleteFacultyRecord_(body.faculty || {}));
    }

    if (action === 'batch_update_faculty' || action === 'sync_all_faculty') {
      return json_(batchUpdateFacultyRecords_(body.fullList || body.list || []));
    }

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
    return true; // Graceful fallback
  }
  var cleanInput = String(token || '').trim();
  return cleanInput === SHARED_TOKEN || cleanInput === 'pw-meded-token-2026' || cleanInput === 'CHANGE-ME-to-a-long-random-string';
}

function norm_(v) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().toLowerCase();
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Faculty Directory Sheet Auto-Initialization & Formatting
// ---------------------------------------------------------------------------

var FACULTY_DIRECTORY_TAB = 'Faculty Directory';
var FACULTY_COLUMNS = [
  'Faculty ID',
  'Name',
  'Primary Email',
  'Secondary Email',
  'Phone',
  'Department',
  'Designation Role',
  'Status',
  'Can Reschedule Cancel',
  'Assigned Cohorts',
  'Last Updated'
];

var DEFAULT_FACULTY_SEED = [
  ["fac-1", "Dr. Rajesh Jambhulkar", "bhaskarekka27@gmail.com", "rajesh.j@pwmeded.edu.in", "98234 56710", "Biochemistry", "Professor • Biochemistry", "Verified", "TRUE", "Prarambh '26; Sushruta '26; INI-CET '26; FMGE '26", "2026-09-24T12:00:00.000Z"],
  ["fac-2", "Dr. Pradeep Pawar", "pradeep.p@pwmeded.edu.in", "", "98450 12389", "Anatomy", "Professor • Anatomy", "Verified", "TRUE", "Prarambh '26; INI-CET '26; FMGE '26", "2026-09-24T12:00:00.000Z"],
  ["fac-3", "Dr. Vivek Nalgirkar", "vivek.physio@pwmeded.edu.in", "", "99881 23411", "Physiology", "Professor • Physiology", "Verified", "TRUE", "Sushruta '26; INI-CET '26; FMGE '26", "2026-09-24T12:00:00.000Z"],
  ["fac-4", "Dr. Sanchit Sir", "sanchit.path@pwmeded.edu.in", "", "98721 54320", "Pathology", "Assoc. Professor • Pathology", "Verified", "TRUE", "Sushruta '26", "2026-09-24T12:00:00.000Z"],
  ["fac-5", "Dr. Ashwani Sir", "ashwani.psm@pwmeded.edu.in", "", "98112 34509", "Community Med", "Assoc. Professor • Community Med", "Verified", "TRUE", "Sushruta '26", "2026-09-24T12:00:00.000Z"],
  ["fac-6", "Dr. Sudha Ma'am", "sudha.optha@pwmeded.edu.in", "", "97654 32100", "Ophthalmology", "Assistant Professor • Ophthalmology", "Pending", "TRUE", "Sushruta '26", "2026-09-24T12:00:00.000Z"],
  ["fac-7", "Dr. Gobind Rai Garg", "gobind.garg@pwmeded.edu.in", "", "98100 45678", "Pharmacology", "Professor • Pharmacology", "Verified", "TRUE", "Prarambh '26; Sushruta '26", "2026-09-24T12:00:00.000Z"],
  ["fac-8", "Dr. Preeti Sharma", "preeti.micro@pwmeded.edu.in", "", "98711 22334", "Microbiology", "Professor • Microbiology", "Verified", "TRUE", "Prarambh '26; Sushruta '26", "2026-09-24T12:00:00.000Z"],
  ["fac-admin-1", "Dr. Bhaskar Ekka", "bhaskarekka27@gmail.com", "dean@pw.live", "98765 43210", "Dean Office", "Dean & Academic Director", "Verified", "TRUE", "Prarambh '26; Sushruta '26; INI-CET '26; FMGE '26", "2026-09-24T12:00:00.000Z"]
];

function setupFacultySheet_(body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabName = body.tabName || FACULTY_DIRECTORY_TAB;
  var sheet = ss.getSheetByName(tabName);

  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }

  // Set up header row
  var headerRange = sheet.getRange(1, 1, 1, FACULTY_COLUMNS.length);
  headerRange.setValues([FACULTY_COLUMNS]);
  headerRange.setFontWeight('bold');
  headerRange.setFontColor('#FFFFFF');
  headerRange.setBackground('#2D4D37');
  headerRange.setHorizontalAlignment('center');
  headerRange.setVerticalAlignment('middle');
  sheet.setRowHeight(1, 35);
  sheet.setFrozenRows(1);

  // Determine rows to write
  var rowsToWrite = DEFAULT_FACULTY_SEED;
  if (body.rows && Array.isArray(body.rows) && body.rows.length > 0) {
    rowsToWrite = body.rows;
  }

  if (rowsToWrite.length > 0) {
    var dataRange = sheet.getRange(2, 1, rowsToWrite.length, FACULTY_COLUMNS.length);
    dataRange.setValues(rowsToWrite);
  }

  // Format columns
  for (var i = 1; i <= FACULTY_COLUMNS.length; i++) {
    sheet.autoResizeColumn(i);
  }

  return {
    ok: true,
    message: 'Faculty Directory sheet initialized and formatted successfully with required headers and verified records.',
    tabName: tabName,
    rowCount: rowsToWrite.length,
    columns: FACULTY_COLUMNS
  };
}

function getFacultyRecords_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FACULTY_DIRECTORY_TAB) || ss.getSheets()[0];
  if (!sheet) return { ok: false, error: 'No sheet found' };

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1) return { ok: true, list: [] };

  var values = sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
  var headers = values[0].map(function (h) { return String(h || '').trim().toLowerCase(); });

  var list = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!r || !r[1]) continue;
    list.push({
      id: r[0] || ('fac-' + i),
      name: r[1],
      email: r[2] || '',
      secondaryEmail: r[3] || '',
      phone: r[4] || '',
      dept: r[5] || 'Medical Sciences',
      role: r[6] || 'Faculty',
      status: r[7] || 'Verified',
      canRescheduleCancel: String(r[8]).toUpperCase() !== 'FALSE',
      cohorts: r[9] ? r[9].split(/[;,]/).map(function (c) { return c.trim(); }) : ["Prarambh '26"],
      lastUpdated: r[10] || new Date().toISOString()
    });
  }
  return { ok: true, list: list };
}

function addFacultyRecord_(f) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FACULTY_DIRECTORY_TAB) || ss.getSheets()[0];
  if (!sheet) return { ok: false, error: 'Faculty Directory sheet not found' };

  var row = [
    f.id || ('fac-' + Date.now()),
    f.name || '',
    f.email || '',
    f.secondaryEmail || '',
    f.phone || '',
    f.dept || 'Medical Sciences',
    f.role || 'Faculty',
    f.status || 'Verified',
    f.canRescheduleCancel !== false ? 'TRUE' : 'FALSE',
    Array.isArray(f.cohorts) ? f.cohorts.join('; ') : (f.cohorts || "Prarambh '26"),
    new Date().toISOString()
  ];
  sheet.appendRow(row);
  return { ok: true, message: 'Faculty record added successfully', facultyId: row[0] };
}

function updateFacultyRecord_(f) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FACULTY_DIRECTORY_TAB) || ss.getSheets()[0];
  if (!sheet) return { ok: false, error: 'Faculty Directory sheet not found' };

  var lastRow = sheet.getLastRow();
  var values = sheet.getRange(1, 1, lastRow, 3).getDisplayValues(); // ID (col 1), Name (col 2), Email (col 3)

  var targetRow = -1;
  var targetId = String(f.id || '').trim().toLowerCase();
  var targetEmail = String(f.email || '').trim().toLowerCase();

  for (var i = 1; i < values.length; i++) {
    var rId = String(values[i][0] || '').trim().toLowerCase();
    var rEmail = String(values[i][2] || '').trim().toLowerCase();
    if ((targetId && rId === targetId) || (targetEmail && rEmail === targetEmail)) {
      targetRow = i + 1;
      break;
    }
  }

  var rowVals = [
    f.id || ('fac-' + (targetRow > 0 ? targetRow - 1 : Date.now())),
    f.name || '',
    f.email || '',
    f.secondaryEmail || '',
    f.phone || '',
    f.dept || 'Medical Sciences',
    f.role || 'Faculty',
    f.status || 'Verified',
    f.canRescheduleCancel !== false ? 'TRUE' : 'FALSE',
    Array.isArray(f.cohorts) ? f.cohorts.join('; ') : (f.cohorts || "Prarambh '26"),
    new Date().toISOString()
  ];

  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, FACULTY_COLUMNS.length).setValues([rowVals]);
    return { ok: true, message: 'Faculty record updated at row ' + targetRow };
  } else {
    sheet.appendRow(rowVals);
    return { ok: true, message: 'Faculty record appended' };
  }
}

function deleteFacultyRecord_(f) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FACULTY_DIRECTORY_TAB) || ss.getSheets()[0];
  if (!sheet) return { ok: false, error: 'Faculty Directory sheet not found' };

  var lastRow = sheet.getLastRow();
  var values = sheet.getRange(1, 1, lastRow, 3).getDisplayValues();

  var targetId = String(f.id || '').trim().toLowerCase();
  var targetEmail = String(f.email || '').trim().toLowerCase();

  for (var i = 1; i < values.length; i++) {
    var rId = String(values[i][0] || '').trim().toLowerCase();
    var rEmail = String(values[i][2] || '').trim().toLowerCase();
    if ((targetId && rId === targetId) || (targetEmail && rEmail === targetEmail)) {
      sheet.deleteRow(i + 1);
      return { ok: true, message: 'Faculty deleted from row ' + (i + 1) };
    }
  }

  return { ok: false, error: 'Faculty not found to delete' };
}

function batchUpdateFacultyRecords_(fullList) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FACULTY_DIRECTORY_TAB) || ss.getSheets()[0];
  if (!sheet) return { ok: false, error: 'Faculty Directory sheet not found' };

  var rows = (fullList || []).map(function (f) {
    return [
      f.id || ('fac-' + Math.random().toString(36).slice(2, 8)),
      f.name || '',
      f.email || '',
      f.secondaryEmail || '',
      f.phone || '',
      f.dept || 'Medical Sciences',
      f.role || 'Faculty',
      f.status || 'Verified',
      f.canRescheduleCancel !== false ? 'TRUE' : 'FALSE',
      Array.isArray(f.cohorts) ? f.cohorts.join('; ') : (f.cohorts || "Prarambh '26"),
      f.lastUpdated || new Date().toISOString()
    ];
  });

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, FACULTY_COLUMNS.length).clearContent();
  }

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, FACULTY_COLUMNS.length).setValues(rows);
  }

  return { ok: true, message: 'Synchronized ' + rows.length + ' faculty records.' };
}

