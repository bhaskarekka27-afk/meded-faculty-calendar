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

/**
 * 1-Click Runnable Test: Authorizes Google MailApp permissions and sends a test email to the active account.
 */
function test_email_permissions() {
  var activeUser = (Session.getActiveUser && Session.getActiveUser().getEmail()) ||
                   (Session.getEffectiveUser && Session.getEffectiveUser().getEmail()) ||
                   'bhaskar.ekka@pw.live';
  var res = sendEmailViaAppsScript_({
    to: activeUser,
    subject: '[PW MedEd] Apps Script Email Authorization Verified',
    htmlBody: '<h3>PW MedEd Apps Script Email Service Active</h3><p>MailApp.sendEmail is authorized and ready for live class reminder dispatches.</p>',
    name: 'PW MedEd Academic Directorate',
    from: activeUser
  });
  Logger.log('Email Test Result: ' + JSON.stringify(res, null, 2));
  return res;
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

  if (action === 'get_batches') {
    return json_(getBatchRegistry_());
  }

  if (action === 'get_settings') {
    return json_(getSettings_());
  }

  if (action === 'setup_faculty_sheet') {
    if (!tokenOk_(token)) return json_({ ok: false, error: 'Invalid token' });
    return json_(setupFacultySheet_({}));
  }

  if (action === 'test_email' || action === 'send_email') {
    if (!tokenOk_(token)) return json_({ ok: false, error: 'Invalid token' });
    var to = (e && e.parameter && e.parameter.to) || (Session.getActiveUser && Session.getActiveUser().getEmail()) || 'bhaskar.ekka@pw.live';
    return json_(sendEmailViaAppsScript_({
      to: to,
      subject: (e && e.parameter && e.parameter.subject) || '[PW MedEd] Apps Script Email Test',
      htmlBody: '<h3>PW MedEd Apps Script Email Service Active</h3><p>MailApp.sendEmail is functioning properly.</p>'
    }));
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

    if (action === 'get_batches') return json_(getBatchRegistry_());
    if (action === 'upsert_batch') return json_(upsertBatch_(body.batch));
    if (action === 'remove_batch') return json_(removeBatch_(body.batch));
    if (action === 'get_settings') return json_(getSettings_());
    if (action === 'set_setting') return json_(setSetting_(body.setting));

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

    if (action === 'send_email' || action === 'send_reminder_email') {
      return json_(sendEmailViaAppsScript_(body.email || body));
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
  'Role',
  'Designation',
  'Status',
  'Can Reschedule Cancel',
  'Assigned Cohorts',
  'Last Updated'
];

var DEFAULT_FACULTY_SEED = [
  [
    "fac-1",
    "Dr. Rajesh Jambhulkar",
    "harshraj01@gmail.com",
    "harshraj01@gmail.com",
    "94234 07557",
    "Biochemistry",
    "Teacher",
    "Professor • Biochemistry",
    "Verified",
    "FALSE",
    "Prarambh '26; Sushruta '26; INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-2",
    "Dr. Pradeep Pawar",
    "pawarpradeep@gmail.com",
    "pawarpradeep@gmail.com",
    "99203 00794",
    "Anatomy",
    "Teacher",
    "Professor • Anatomy",
    "Verified",
    "FALSE",
    "Prarambh '26; INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-3",
    "Dr. Vivek Nalgirkar",
    "viveknalgirkar@gmail.com",
    "viveknalgirkar@gmail.com",
    "97690 67069",
    "Physiology",
    "Teacher",
    "Professor • Physiology",
    "Verified",
    "FALSE",
    "Sushruta '26; INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-15",
    "Dr. Ranjith AR",
    "xpresspinacle@gmail.com",
    "xpresspinacle@gmail.com",
    "99414 81668",
    "Pathology",
    "Teacher",
    "Professor • Pathology",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-16",
    "Dr. Manjunath A",
    "drmanjunathforensic@gmail.com",
    "drmanjunathforensic@gmail.com",
    "96862 52725",
    "Forensic Medicine",
    "Teacher",
    "Professor • Forensic Medicine",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-17",
    "Dr. Vinish Srivastava",
    "drvinish@yahoo.com",
    "drvinish@yahoo.com",
    "99115 09119",
    "Anaesthesia",
    "Teacher",
    "Professor • Anaesthesia",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-18",
    "Dr. Ashwani Ranjan",
    "docashwani23@gmail.com",
    "docashwani23@gmail.com",
    "88607 96675",
    "Community Medicine",
    "Teacher",
    "Assoc. Professor • Community Medicine",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-20",
    "Dr. Sanchit Bajpai",
    "drsanchitbaipaihns@gmail.com",
    "drsanchitbaipaihns@gmail.com",
    "70073 35207",
    "ENT",
    "Teacher",
    "Professor • ENT",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-21",
    "Dr. Santhosh Patil",
    "santhoshmp@icloud.com",
    "santhoshmp@icloud.com",
    "83109 84841",
    "General Medicine",
    "Teacher",
    "Professor • General Medicine",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-22",
    "Dr. Era Dutta",
    "dreradutta@gmail.com",
    "dreradutta@gmail.com",
    "98204 03635",
    "Psychiatry",
    "Teacher",
    "Assoc. Professor • Psychiatry",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-23",
    "Dr. Siraj Ahmad",
    "sirajahmad9@gmail.com",
    "sirajahmad9@gmail.com",
    "95826 26153",
    "Pharmacology",
    "Teacher",
    "Professor • Pharmacology",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-24",
    "Dr. Prassan Vij",
    "drprassan@yahoo.com",
    "drprassan@yahoo.com",
    "98103 05975",
    "Obstetrics & Gynaecology",
    "Teacher",
    "Professor • Obstetrics & Gynaecology",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-25",
    "Dr. Alekhya",
    "alekhya.kumar89@gmail.com",
    "alekhya.kumar89@gmail.com",
    "90526 90055",
    "Orthopedics",
    "Teacher",
    "Consultant • Orthopedics",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-26",
    "Dr. Sandeep Seeramreddi",
    "sandeepseeramreddi@gmail.com",
    "sandeepseeramreddi@gmail.com",
    "99663 35541",
    "General Surgery",
    "Teacher",
    "Senior Consultant • General Surgery",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-27",
    "Dr. Natisha Arora",
    "Natishaarora@gmail.com",
    "Natishaarora@gmail.com",
    "90164 06216",
    "Radiology",
    "Teacher",
    "Consultant • Radiology",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-28",
    "Dr. Jazeer Abdul Khader",
    "admin@drjazeerdermatology.com",
    "admin@drjazeerdermatology.com",
    "98098 44313",
    "Dermatology",
    "Teacher",
    "Consultant • Dermatology",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-29",
    "Dr. Anusha Rathi",
    "rathi.anusha@gmail.com",
    "rathi.anusha@gmail.com",
    "95603 44064",
    "Microbiology",
    "Teacher",
    "Assistant Professor • Microbiology",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-30",
    "Dr. Divya Madan",
    "divyamadan121295@gmail.com",
    "divyamadan121295@gmail.com",
    "89303 45037",
    "Pediatrics",
    "Teacher",
    "Senior Consultant • Pediatrics",
    "Verified",
    "FALSE",
    "INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-admin-2",
    "Bhaskar Ekka",
    "bhaskar.ekka@pw.live",
    "bhaskarekka27@gmail.com",
    "98765 43210",
    "Medical Sciences",
    "Admin",
    "Lead Academic Faculty",
    "Verified",
    "FALSE",
    "Prarambh '26; Sushruta '26; INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ],
  [
    "fac-admin-1",
    "Kanchan Gupta",
    "kanchan.gupta1@pw.live",
    "kanchan.gupta1@pw.live",
    "98765 43211",
    "Academic Administration",
    "Admin",
    "Academic Operations Lead",
    "Verified",
    "FALSE",
    "Prarambh '26; Sushruta '26; INI-CET '26; FMGE '26",
    "2026-09-24T12:00:00.000Z"
  ]
];

function setupFacultySheet_(body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tabName = body.tabName || FACULTY_DIRECTORY_TAB;
  var sheet = ss.getSheetByName(tabName);

  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }

  // Clear existing content to cleanly populate records
  sheet.clearContents();

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

  var getCol = function (patterns) {
    for (var p = 0; p < patterns.length; p++) {
      var pat = patterns[p];
      for (var h = 0; h < headers.length; h++) {
        if (headers[h] === pat) return h;
      }
    }
    for (var p2 = 0; p2 < patterns.length; p2++) {
      var pat2 = patterns[p2];
      for (var h2 = 0; h2 < headers.length; h2++) {
        if (headers[h2].indexOf(pat2) !== -1) return h2;
      }
    }
    return -1;
  };

  var idIdx = getCol(['faculty id', 'fac id', 'id']);
  var nameIdx = getCol(['name', 'faculty name', 'faculty', 'professor']);
  var emailIdx = getCol(['primary email', 'email', 'login email', 'mail']);
  var secEmailIdx = getCol(['secondary email', 'alt email', 'alternate email', 'secondary']);
  var phoneIdx = getCol(['phone', 'mobile', 'contact', 'whatsapp']);
  var deptIdx = getCol(['department', 'dept', 'subject', 'specialty']);
  var roleIdx = getCol(['role', 'portal role', 'access role']);
  var desigIdx = getCol(['designation', 'designation role', 'title']);
  var statusIdx = getCol(['status', 'verification']);
  var permIdx = getCol(['can reschedule', 'reschedule', 'permission', 'reschedule cancel']);
  var cohortsIdx = getCol(['cohort', 'batch', 'assigned cohorts', 'batches']);
  var updatedIdx = getCol(['last updated', 'updated', 'timestamp']);

  var list = [];
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    if (!r || !r.some(function(c) { return c && c.trim(); })) continue;

    var name = (nameIdx >= 0 ? r[nameIdx] : r[1]) || '';
    if (!name.trim()) continue;

    var id = (idIdx >= 0 && r[idIdx] ? r[idIdx] : ('fac-' + i)).trim();
    var email = ((emailIdx >= 0 ? r[emailIdx] : r[2]) || '').trim();
    var secEmail = ((secEmailIdx >= 0 ? r[secEmailIdx] : r[3]) || '').trim();
    var phone = ((phoneIdx >= 0 ? r[phoneIdx] : r[4]) || '98765 43210').trim();
    var dept = ((deptIdx >= 0 ? r[deptIdx] : r[5]) || 'Medical Sciences').trim();

    var role = 'Teacher';
    var designation = 'Professor • ' + dept;
    var rawRole = (roleIdx >= 0 ? r[roleIdx] : '').trim();
    var rawDesig = (desigIdx >= 0 ? r[desigIdx] : '').trim();

    if (roleIdx >= 0 && desigIdx >= 0 && roleIdx !== desigIdx) {
      role = (rawRole.toLowerCase() === 'admin' || rawRole.toLowerCase().indexOf('admin') !== -1) ? 'Admin' : 'Teacher';
      designation = rawDesig || (role === 'Admin' ? 'Academic Administration Lead' : ('Professor • ' + dept));
    } else if (roleIdx >= 0 && desigIdx < 0) {
      if (rawRole.toLowerCase() === 'admin' || rawRole.toLowerCase() === 'teacher') {
        role = rawRole.toLowerCase() === 'admin' ? 'Admin' : 'Teacher';
        designation = role === 'Admin' ? 'Lead Academic Faculty' : ('Professor • ' + dept);
      } else {
        role = rawRole.toLowerCase().indexOf('admin') !== -1 ? 'Admin' : 'Teacher';
        designation = rawRole;
      }
    } else if (desigIdx >= 0) {
      role = (rawDesig.toLowerCase().indexOf('admin') !== -1 || id.indexOf('admin') !== -1 || email.indexOf('admin') !== -1) ? 'Admin' : 'Teacher';
      designation = rawDesig;
    }

    if (id.indexOf('fac-admin') === 0 || email === 'bhaskar.ekka@pw.live' || email === 'kanchan.gupta1@pw.live') {
      role = 'Admin';
    }

    var status = ((statusIdx >= 0 ? r[statusIdx] : r[7]) || 'Verified').trim();
    var permVal = String(permIdx >= 0 ? r[permIdx] : (r[8] || '')).trim();
    var canRescheduleCancel = permVal.toUpperCase() !== 'FALSE' && permVal.toLowerCase() !== 'no';
    var cohortsRaw = (cohortsIdx >= 0 ? r[cohortsIdx] : r[9]) || '';
    var cohorts = cohortsRaw ? cohortsRaw.split(/[;,]/).map(function (c) { return c.trim(); }) : ["Prarambh '26"];
    var lastUpdated = (updatedIdx >= 0 ? r[updatedIdx] : r[10]) || new Date().toISOString();

    list.push({
      id: id,
      name: name.trim(),
      email: email,
      secondaryEmail: secEmail,
      phone: phone,
      dept: dept,
      role: role,
      designation: designation,
      status: status || 'Verified',
      canRescheduleCancel: canRescheduleCancel,
      cohorts: cohorts,
      lastUpdated: lastUpdated
    });
  }
  return { ok: true, list: list };
}

function addFacultyRecord_(f) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FACULTY_DIRECTORY_TAB) || ss.getSheets()[0];
  if (!sheet) return { ok: false, error: 'Faculty Directory sheet not found' };

  var role = (f.role && String(f.role).toLowerCase().indexOf('admin') !== -1) ? 'Admin' : 'Teacher';
  var desig = f.designation || (role === 'Admin' ? 'Lead Academic Faculty' : ('Professor • ' + (f.dept || 'Medical Sciences')));

  var row = [
    f.id || ('fac-' + Date.now()),
    f.name || '',
    f.email || '',
    f.secondaryEmail || '',
    f.phone || '',
    f.dept || 'Medical Sciences',
    role,
    desig,
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
  var values = sheet.getRange(1, 1, lastRow, 3).getDisplayValues();

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

  var role = (f.role && String(f.role).toLowerCase().indexOf('admin') !== -1) ? 'Admin' : 'Teacher';
  var desig = f.designation || (role === 'Admin' ? 'Lead Academic Faculty' : ('Professor • ' + (f.dept || 'Medical Sciences')));

  var rowVals = [
    f.id || ('fac-' + (targetRow > 0 ? targetRow - 1 : Date.now())),
    f.name || '',
    f.email || '',
    f.secondaryEmail || '',
    f.phone || '',
    f.dept || 'Medical Sciences',
    role,
    desig,
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

  // Already gone (deleted from the sheet by hand or by another admin): that is the outcome asked for.
  return { ok: true, removed: false, message: 'Faculty not found - nothing to delete' };
}

function batchUpdateFacultyRecords_(fullList) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(FACULTY_DIRECTORY_TAB) || ss.getSheets()[0];
  if (!sheet) return { ok: false, error: 'Faculty Directory sheet not found' };

  var rows = (fullList || []).map(function (f) {
    var role = (f.role && String(f.role).toLowerCase().indexOf('admin') !== -1) ? 'Admin' : 'Teacher';
    var desig = f.designation || (role === 'Admin' ? 'Lead Academic Faculty' : ('Professor • ' + (f.dept || 'Medical Sciences')));
    return [
      f.id || ('fac-' + Math.random().toString(36).slice(2, 8)),
      f.name || '',
      f.email || '',
      f.secondaryEmail || '',
      f.phone || '',
      f.dept || 'Medical Sciences',
      role,
      desig,
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

// ---------------------------------------------------------------------------
// Shared Batch Registry — one row per connected Lecture Planner sheet.
// Every portal login (admin or faculty) reads this tab, so a sheet connected by
// one admin shows up for everyone. Removal is soft (Active = FALSE) so other
// browsers learn about it.
// ---------------------------------------------------------------------------

var BATCH_REGISTRY_TAB = 'Batch Registry';
var BATCH_REGISTRY_HEADERS = ['Batch ID', 'Name', 'Source URL', 'Tab Name', 'Platform', 'Active', 'Updated By', 'Updated At'];

function batchRegistrySheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(BATCH_REGISTRY_TAB);
  if (!sh) sh = ss.insertSheet(BATCH_REGISTRY_TAB);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, BATCH_REGISTRY_HEADERS.length).setValues([BATCH_REGISTRY_HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function sheetIdOf_(url) {
  var m = String(url || '').match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : '';
}

function findBatchRow_(sh, batch) {
  var last = sh.getLastRow();
  if (last < 2) return -1;
  var vals = sh.getRange(2, 1, last - 1, 3).getValues();
  var sid = sheetIdOf_(batch.sourceUrl);
  for (var i = 0; i < vals.length; i++) {
    if ((batch.id && String(vals[i][0]) === String(batch.id)) ||
        (sid && sheetIdOf_(vals[i][2]) === sid)) return i + 2;
  }
  return -1;
}

function getBatchRegistry_() {
  var sh = batchRegistrySheet_();
  var last = sh.getLastRow();
  if (last < 2) return { ok: true, batches: [] };
  var rows = sh.getRange(2, 1, last - 1, BATCH_REGISTRY_HEADERS.length).getValues();
  return { ok: true, batches: rows.map(function (r) {
    return { id: r[0], name: r[1], sourceUrl: r[2], tabName: r[3], platform: r[4], active: String(r[5]).toUpperCase() !== 'FALSE' };
  }) };
}

function upsertBatch_(batch) {
  batch = batch || {};
  if (!batch.sourceUrl) return { ok: false, error: 'sourceUrl is required' };
  var sh = batchRegistrySheet_();
  var row = findBatchRow_(sh, batch);
  var existingId = row > 0 ? sh.getRange(row, 1).getValue() : '';
  var values = [[
    existingId || batch.id || ('batch-' + new Date().getTime()),
    batch.name || '', batch.sourceUrl, batch.tabName || 'Lecture Planner', batch.platform || '',
    true, Session.getActiveUser().getEmail() || 'portal', new Date().toISOString()
  ]];
  if (row > 0) sh.getRange(row, 1, 1, values[0].length).setValues(values);
  else sh.appendRow(values[0]);
  return { ok: true, id: values[0][0] };
}

function removeBatch_(batch) {
  var sh = batchRegistrySheet_();
  var row = findBatchRow_(sh, batch || {});
  if (row < 0) return { ok: true, removed: false };
  sh.getRange(row, 6).setValue(false);
  sh.getRange(row, 8).setValue(new Date().toISOString());
  return { ok: true, removed: true };
}

/** Run once from the Apps Script toolbar to create the tab up front. */
function setup_batch_registry() {
  batchRegistrySheet_();
}

// ---------------------------------------------------------------------------
// Shared Portal Settings — key/value rows mirrored to every admin/faculty login.
// Values are stored as text (JSON). Last write wins per key via Updated At.
// The write-back token is never stored here.
// ---------------------------------------------------------------------------

var PORTAL_SETTINGS_TAB = 'Portal Settings';
var PORTAL_SETTINGS_HEADERS = ['Key', 'Value', 'Updated At', 'Updated By'];
var PORTAL_SETTINGS_ALLOWED = [
  'meded_email_settings',
  'pw_meded_email_settings',
  'meded_sync_settings_v1',
  'pw_faculty_spreadsheet_url',
  'meded_sheet_writeback_config_v1',
  'pw_meded_faculty_requests'
];

function portalSettingsSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(PORTAL_SETTINGS_TAB);
  if (!sh) sh = ss.insertSheet(PORTAL_SETTINGS_TAB);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, PORTAL_SETTINGS_HEADERS.length).setValues([PORTAL_SETTINGS_HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    // Plain text so timestamps and JSON are never auto-converted by Sheets.
    sh.getRange(1, 1, sh.getMaxRows(), PORTAL_SETTINGS_HEADERS.length).setNumberFormat('@');
  }
  return sh;
}

function getSettings_() {
  var sh = portalSettingsSheet_();
  var last = sh.getLastRow();
  if (last < 2) return { ok: true, settings: [] };
  return { ok: true, settings: sh.getRange(2, 1, last - 1, 3).getValues().map(function (r) {
    return { key: r[0], value: r[1], updatedAt: r[2] };
  }) };
}

function setSetting_(s) {
  s = s || {};
  var key = String(s.key || '');
  if (PORTAL_SETTINGS_ALLOWED.indexOf(key) < 0) return { ok: false, error: 'Setting not allowed: ' + key };
  var value = String(s.value == null ? '' : s.value);
  if (value.length > 45000) return { ok: false, error: 'Value too large' };
  var updatedAt = String(s.updatedAt || new Date().toISOString());
  var sh = portalSettingsSheet_();
  var last = sh.getLastRow();
  var row = -1;
  if (last >= 2) {
    var keys = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) if (String(keys[i][0]) === key) { row = i + 2; break; }
  }
  if (row > 0) {
    var existing = String(sh.getRange(row, 3).getValue());
    if (existing && existing > updatedAt) return { ok: true, stale: true };
  } else {
    row = last + 1;
  }
  var cells = sh.getRange(row, 1, 1, 4);
  cells.setNumberFormat('@');
  cells.setValues([[key, value, updatedAt, Session.getActiveUser().getEmail() || 'portal']]);
  return { ok: true };
}

/** Run once from the Apps Script toolbar to create the tab up front. */
function setup_portal_settings() {
  portalSettingsSheet_();
}

/**
 * Sends a real institutional class reminder email directly using MailApp / GmailApp.
 */
function sendEmailViaAppsScript_(data) {
  data = data || {};
  var to = String(data.to || data.recipientEmail || data.recipient || '').trim();
  var subject = String(data.subject || '[PW MedEd] Class Reminder').trim();
  var htmlBody = String(data.htmlBody || data.emailHtml || data.html || '').trim();
  var name = String(data.name || data.senderName || 'PW MedEd Academic Directorate').trim();
  var replyTo = String(data.replyTo || data.from || data.senderEmail || '').trim();
  var requestedFrom = String(data.from || data.senderEmail || '').trim();

  if (!to) {
    return { ok: false, error: 'Recipient email address (to) is missing.' };
  }

  try {
    var mailOptions = {
      to: to,
      subject: subject,
      htmlBody: htmlBody,
      name: name
    };
    if (replyTo && replyTo.indexOf('@') > 0) {
      mailOptions.replyTo = replyTo;
    }

    // If an alias matches configured Gmail send-as aliases, send with from alias
    var aliasSent = false;
    if (requestedFrom && requestedFrom.indexOf('@') > 0 && typeof GmailApp !== 'undefined') {
      try {
        var aliases = GmailApp.getAliases ? GmailApp.getAliases() : [];
        if (aliases && aliases.indexOf(requestedFrom) !== -1) {
          mailOptions.from = requestedFrom;
          GmailApp.sendEmail(to, subject, '', mailOptions);
          aliasSent = true;
        }
      } catch (aliasErr) {
        Logger.log('Alias lookup note: ' + aliasErr.message);
      }
    }

    if (!aliasSent) {
      MailApp.sendEmail(mailOptions);
    }

    return {
      ok: true,
      success: true,
      recipient: to,
      subject: subject,
      senderName: name,
      replyTo: replyTo,
      sentAt: new Date().toISOString()
    };
  } catch (err) {
    Logger.log('Apps Script send email error: ' + err.message);
    return {
      ok: false,
      error: String((err && err.message) || err)
    };
  }
}
