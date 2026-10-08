/**
 * Google Sheets Connector & Batch Manager
 * Supports dynamic connection, live synchronization, and offline fallback.
 */

import { DEFAULT_BATCHES } from './defaultData.js';

const STORAGE_KEY = 'meded_faculty_batches_v1';

/**
 * Robust CSV parser that correctly handles escaped quotes, multiline values, and commas.
 */
export function parseCSV(text) {
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
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
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
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
 * Parse Date strings like "Thursday, October 15, 2026"
 */
export function parseDateString(dateStr) {
  if (!dateStr) return { isoDate: null, dayName: '', monthName: '', dayNumber: null, year: null };
  const clean = dateStr.trim();
  const parts = clean.split(',');
  let dayName = '';
  let monthDay = '';
  let year = 2026;
  
  if (parts.length >= 3) {
    dayName = parts[0].trim();
    monthDay = parts[1].trim();
    year = parseInt(parts[2].trim(), 10) || 2026;
  } else if (parts.length === 2) {
    dayName = parts[0].trim();
    monthDay = parts[1].trim();
  } else {
    monthDay = clean;
  }
  
  const monthMap = {
    january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
    jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  
  const tokens = monthDay.split(/\s+/);
  if (tokens.length >= 2) {
    const mStr = tokens[0].toLowerCase();
    const dStr = tokens[1].replace(/\D/g, '').padStart(2, '0');
    const mNum = monthMap[mStr] || '01';
    return {
      isoDate: `${year}-${mNum}-${dStr}`,
      dayName,
      monthName: tokens[0],
      dayNumber: parseInt(dStr, 10),
      year
    };
  }
  return { isoDate: null, dayName, monthName: '', dayNumber: null, year };
}

/**
 * Parse Timing strings like "7:00pm to 9:00pm" or "6:30pm to 9:00pm"
 */
export function parseTimingsString(timingsStr) {
  if (!timingsStr) return { start: '', end: '', startHour: 19, durationMinutes: 120 };
  const parts = timingsStr.split(/to|-/i).map(s => s.trim());
  const start = parts[0] || '';
  const end = parts[1] || '';
  
  function toMinutes(tStr) {
    const m = tStr.match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2] || '0', 10);
    const ampm = (m[3] || '').toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return h * 60 + min;
  }
  
  const sm = toMinutes(start);
  const em = toMinutes(end);
  const durationMinutes = (sm !== null && em !== null && em > sm) ? (em - sm) : 120;
  const startHour = sm !== null ? sm / 60 : 19;
  
  return {
    start,
    end,
    startHour,
    durationMinutes
  };
}

/**
 * Extract Google Sheet ID and GID from URL
 */
export function extractSheetDetails(url) {
  if (!url) return null;
  const cleanUrl = url.trim();
  
  // Direct sheet ID?
  if (/^[a-zA-Z0-9-_]{30,}$/.test(cleanUrl)) {
    return { sheetId: cleanUrl, gid: null };
  }
  
  const idMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  const gidMatch = cleanUrl.match(/[?&#]gid=([0-9]+)/);
  
  if (idMatch && idMatch[1]) {
    return {
      sheetId: idMatch[1],
      gid: gidMatch ? gidMatch[1] : null
    };
  }
  return null;
}

/**
 * Process Raw CSV into structured Batch Object
 */
export function processRawCSVToBatch(csvText, id, sourceUrl, tabName = 'Lecture Planner', overrideName = '') {
  const rows = parseCSV(csvText);
  if (!rows || rows.length < 2) {
    throw new Error('The fetched sheet is empty or not in expected Lecture Planner format.');
  }

  const header = rows[0] || [];
  const rawBatchHeader = (header[0] || '').trim();
  
  if (rawBatchHeader.toLowerCase().includes('completion %')) {
    throw new Error(`The sheet tab "${tabName}" returned a progress/summary sheet ("Completion %") rather than lecture rows. Please ensure the tab name is set to "Lecture Planner".`);
  }

  const isFourColLayout = header.length <= 6 || (header[1] && header[1].toLowerCase().includes('faculty') && header[3] && header[3].toLowerCase().includes('time'));
  const isYoutube = rawBatchHeader.toLowerCase().includes('yt channel') || 
                    rawBatchHeader.toLowerCase().includes('youtube') || 
                    (sourceUrl && (sourceUrl.includes('1aCO-QvwVi2xIVB_kJWroM6Zv7vvI3MPOksDctjQAzYU') || sourceUrl.includes('1nsVXeu3Jn8sroOeGB5diOLMvQ7jdbt89hkU7-wdAOSE')));

  let detectedName = overrideName || rawBatchHeader;
  let subtitle = isYoutube ? 'Live On YT Channel & MedEd App' : 'Live on PW MedEd APP';

  if (!overrideName && rawBatchHeader) {
    if (rawBatchHeader.includes('Live On PW') || rawBatchHeader.includes('Live on PW')) {
      const split = rawBatchHeader.split(/Live [Oo]n PW/i);
      detectedName = split[0].trim();
    } else {
      const match = rawBatchHeader.match(/^(.*?)(?:Lecture Planner|Date & Days|Live On|Time :)/i);
      if (match && match[1].trim()) {
        detectedName = match[1].trim();
      }
    }
  }

  // Handle specific series names cleanly
  if (detectedName.includes('INI-CET Essentials Series')) {
    detectedName = 'INI-CET Essentials Series';
  } else if (detectedName.includes('FMGE Express Revision Series')) {
    detectedName = 'FMGE Express Revision Series';
  }

  if (!detectedName || detectedName.toLowerCase().startsWith('date') || detectedName.toLowerCase().includes('completion %')) {
    detectedName = overrideName || `Batch ${new Date().toLocaleDateString()}`;
  }

  // Columns written back by the Apps Script Web App (apps-script/Code.gs).
  // Located by header name so inserting a column in the sheet cannot shift
  // them, and absent entirely on sheets that have never been written to.
  const findCol = (name) => header.findIndex(h => String(h || '').replace(/\s+/g, ' ').trim().toLowerCase() === name);
  const statusCols = {
    status: findCol('status'),
    rescheduledDate: findCol('rescheduled date'),
    rescheduledTime: findCol('rescheduled time'),
    rescheduledDuration: findCol('rescheduled duration'),
    updatedAt: findCol('status updated at')
  };

  const events = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(cell => !cell.trim())) continue;

    let dateStr = '';
    let facultyStr = '';
    let subjectStr = '';
    let chapterStr = '';
    let topicStr = '';
    let noLectures = '1';
    let durationStr = '';
    let timingsStr = '';

    if (isFourColLayout) {
      dateStr = (r[0] || '').trim();
      facultyStr = (r[1] || '').trim();
      const subjectOrTopic = (r[2] || '').trim();
      timingsStr = (r[3] || '').trim();

      if (!dateStr && !facultyStr && !subjectOrTopic) continue;

      if (subjectOrTopic.toLowerCase().includes('session part') || subjectOrTopic.toLowerCase().includes('session')) {
        const subMatch = subjectOrTopic.match(/^(.*?)\s+session/i);
        subjectStr = (subMatch && subMatch[1]) ? subMatch[1].trim() : subjectOrTopic;
        if (subjectStr.toUpperCase() === 'PSM') subjectStr = 'Community Medicine';
        chapterStr = subjectOrTopic;
        topicStr = `${subjectOrTopic} • High Yield Rapid Revision`;
      } else {
        subjectStr = subjectOrTopic;
        chapterStr = `${subjectOrTopic} Essentials`;
        topicStr = `${subjectOrTopic} • High Yield 50 Questions Discussion`;
      }
    } else {
      dateStr = (r[0] || '').trim();
      facultyStr = (r[1] || '').trim();
      subjectStr = (r[2] || '').trim();
      chapterStr = (r[3] || '').trim();
      topicStr = (r[4] || '').trim();
      noLectures = (r[5] || '').trim() || '1';
      durationStr = (r[6] || '').trim();
      timingsStr = (r[7] || '').trim();

      if (!dateStr && !facultyStr && !subjectStr) continue;
    }

    const parsedDate = parseDateString(dateStr);
    const parsedTiming = parseTimingsString(timingsStr);

    const isCoolOff = facultyStr.toUpperCase().includes('COOL OFF') || dateStr.toUpperCase().includes('COOL OFF');
    const isHoliday = facultyStr.toLowerCase().includes('holiday') || 
                      facultyStr.toLowerCase().includes('jayanti') || 
                      (dateStr && !facultyStr && !subjectStr);

    let eventType = 'class';
    let displayTitle = topicStr || chapterStr;
    if (isCoolOff) {
      eventType = 'cool_off';
      displayTitle = 'COOL OFF';
      subjectStr = '';
      chapterStr = '';
      topicStr = '';
    } else if (isHoliday) {
      eventType = 'holiday';
      displayTitle = facultyStr || 'Official Holiday';
      subjectStr = '';
      chapterStr = '';
      topicStr = '';
    }

    const durText = durationStr || (parsedTiming.durationMinutes 
      ? `${parsedTiming.durationMinutes >= 60 ? Math.round(parsedTiming.durationMinutes / 60) : parsedTiming.durationMinutes} ${parsedTiming.durationMinutes >= 60 ? 'Hours' : 'Mins'}` 
      : '2 Hours');

    const cell = (idx) => (idx >= 0 ? (r[idx] || '').trim() : '');
    const sheetStatus = cell(statusCols.status);
    const normalisedStatus = sheetStatus.toLowerCase();

    events.push({
      id: `${id}_ev_${i}`,
      batchId: id,
      // Live status as it currently stands in the sheet.
      sheetStatus,
      isCancelled: normalisedStatus === 'cancelled' || normalisedStatus === 'canceled',
      isRescheduled: normalisedStatus === 'rescheduled',
      rescheduledDate: cell(statusCols.rescheduledDate),
      rescheduledTime: cell(statusCols.rescheduledTime),
      rescheduledDuration: cell(statusCols.rescheduledDuration),
      statusUpdatedAt: cell(statusCols.updatedAt),
      batchName: detectedName,
      rowIndex: i + 1,
      dateRaw: dateStr,
      isoDate: parsedDate.isoDate,
      dayName: parsedDate.dayName,
      monthName: parsedDate.monthName,
      dayNumber: parsedDate.dayNumber,
      year: parsedDate.year,
      faculty: isHoliday ? '' : facultyStr,
      subject: subjectStr,
      chapter: chapterStr,
      topic: topicStr,
      noLectures: noLectures || '1',
      duration: durText,
      durationMinutes: parsedTiming.durationMinutes,
      timings: timingsStr || (parsedTiming.start ? `${parsedTiming.start} to ${parsedTiming.end}` : '5:00 PM Onwards'),
      startTime: parsedTiming.start,
      endTime: parsedTiming.end,
      startHour: parsedTiming.startHour,
      eventType,
      displayTitle,
      platform: isYoutube ? 'youtube' : 'app',
      isYoutube: Boolean(isYoutube),
      isApp: !isYoutube
    });
  }

  if (events.length === 0) {
    throw new Error(`No valid lecture schedule rows found in tab "${tabName}". Please make sure the selected tab contains lecture data with dates, faculty, and subjects.`);
  }

  return {
    id,
    name: detectedName,
    subtitle,
    sourceUrl,
    sheetTabName: tabName,
    platform: isYoutube ? 'youtube' : 'app',
    isYoutube: Boolean(isYoutube),
    isApp: !isYoutube,
    lastSynced: new Date().toISOString(),
    eventCount: events.length,
    events
  };
}

/**
 * Convert Google Visualization JSON table to CSV format
 */
export function tableToCSV(table) {
  const header = table.cols.map(c => `"${(c.label || '').replace(/"/g, '""')}"`).join(',');
  const lines = [header];
  for (const r of table.rows) {
    if (!r || !r.c) continue;
    const cells = r.c.map(cell => {
      if (!cell) return '""';
      const val = cell.f !== undefined && cell.f !== null ? String(cell.f) : (cell.v !== undefined && cell.v !== null ? String(cell.v) : '');
      return `"${val.replace(/"/g, '""')}"`;
    });
    lines.push(cells.join(','));
  }
  return lines.join('\n');
}

/**
 * Client-side JSONP fetch for Google Sheets GViz API (bypasses browser CORS completely)
 */
export function fetchGoogleSheetJSONP(sheetId, tabName = 'Lecture Planner') {
  return new Promise((resolve, reject) => {
    const callbackName = `gviz_cb_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const encodedTab = encodeURIComponent(tabName || 'Lecture Planner');
    const timestamp = Date.now();
    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=responseHandler:${callbackName}&sheet=${encodedTab}&_t=${timestamp}`;

    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Google Sheets request timed out after 12 seconds.'));
    }, 12000);

    function cleanup() {
      clearTimeout(timer);
      delete window[callbackName];
      const s = document.getElementById(callbackName);
      if (s && s.parentNode) s.parentNode.removeChild(s);
    }

    window[callbackName] = function(data) {
      cleanup();
      if (!data || !data.table) {
        reject(new Error('Invalid response structure received from Google Sheets.'));
        return;
      }
      const firstCol = data.table.cols && data.table.cols[0] ? (data.table.cols[0].label || '') : '';
      const firstCell = data.table.rows && data.table.rows[0] && data.table.rows[0].c && data.table.rows[0].c[0] ? (data.table.rows[0].c[0].v || '') : '';
      if (String(firstCol).toLowerCase().includes('completion %') || String(firstCell).toLowerCase().includes('completion %')) {
        reject(new Error(`The sheet tab "${tabName}" was not found (Google returned the "Completion %" summary tab). Please check that the tab name matches the tab at the bottom of your sheet (e.g. "Lecture Planner").`));
        return;
      }
      resolve(tableToCSV(data.table));
    };

    const script = document.createElement('script');
    script.id = callbackName;
    script.src = url;
    script.onerror = function() {
      cleanup();
      reject(new Error('Failed to load Google Sheet script via JSONP.'));
    };
    document.body.appendChild(script);
  });
}

/**
 * Auto-detect available sheet tabs and identify the Lecture Planner tab
 */
/**
 * The /api/* sheet proxy only exists on the local Node server (server.cjs / vite).
 * The deployed static site (Render) has none, so calling it just produced a 404
 * on every connect and every 30s sync before falling back to the direct reads.
 */
export const HAS_LOCAL_SHEET_PROXY = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1|\[::1\]|192\.168\.|10\.)/.test(window.location.hostname);

export async function detectGoogleSheetTabs(sourceUrl) {
  const details = extractSheetDetails(sourceUrl);
  if (!details || !details.sheetId) {
    return { success: false, tabs: ['Lecture Planner'], recommendedTab: 'Lecture Planner' };
  }

  const timestamp = Date.now();
  // Strategy 1: Local server proxy (Vite dev server)
  const apiBase = (typeof window !== 'undefined' && window.location && window.location.origin) 
    ? '' 
    : 'http://localhost:5173';

  try {
    if (!HAS_LOCAL_SHEET_PROXY) throw new Error('no local proxy');
    const res = await fetch(`${apiBase}/api/detect-tabs?sheetId=${details.sheetId}&_t=${timestamp}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    });
    const contentType = res.headers ? (res.headers.get('content-type') || '') : '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.tabs && data.tabs.length > 0) {
        return data;
      }
    }
  } catch (e) {
    if (HAS_LOCAL_SHEET_PROXY) console.warn('Proxy tab detection failed, trying htmlview...', e);
  }

  // Strategy 2: Direct htmlview fetch (fallback)
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${details.sheetId}/htmlview?_t=${timestamp}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    });
    if (res.ok) {
      const html = await res.text();
      const regex = /docs-sheet-tab-caption">([^<]+)<\/div>/g;
      const tabs = [];
      let m;
      while ((m = regex.exec(html)) !== null) {
        tabs.push(m[1]);
      }
      if (tabs.length > 0) {
        const recommended = tabs.find(t => /planner|lecture/i.test(t)) || tabs.find(t => /schedule/i.test(t)) || tabs[0];
        return { success: true, tabs, recommendedTab: recommended };
      }
    }
  } catch (e) {
    console.warn('Direct html tab detection failed:', e);
  }

  return { success: false, tabs: ['Lecture Planner'], recommendedTab: 'Lecture Planner' };
}

/**
 * Fetch live CSV from Google Sheets via Visualization API with cache-busting
 */
export async function fetchGoogleSheetCSV(sourceUrl, tabName = '') {
  const details = extractSheetDetails(sourceUrl);
  if (!details || !details.sheetId) {
    throw new Error('Invalid Google Sheet link. Please ensure it is a valid Google Sheets URL.');
  }

  const timestamp = Date.now();

  // Auto-detect tab if not specified or defaults to generic "Lecture Planner"
  let targetTab = (tabName || '').trim();
  let detectedRecTab = '';
  try {
    const detectResult = await detectGoogleSheetTabs(sourceUrl);
    if (detectResult && detectResult.recommendedTab) {
      detectedRecTab = detectResult.recommendedTab;
      if (!targetTab || targetTab === 'Lecture Planner') {
        targetTab = detectedRecTab;
      }
    }
  } catch (e) {
    if (!targetTab) targetTab = 'Lecture Planner';
  }

  // Prepare tab candidates to try (handling trailing spaces like "Lecture Planner ")
  const candidates = [targetTab];
  if (detectedRecTab && !candidates.includes(detectedRecTab)) candidates.push(detectedRecTab);
  if (!targetTab.endsWith(' ')) candidates.push(targetTab + ' ');
  if (!candidates.includes('Lecture Planner')) candidates.push('Lecture Planner');
  if (!candidates.includes('Lecture Planner ')) candidates.push('Lecture Planner ');

  // Strategy 1: Try local server proxy (Vite dev server)
  const apiBase = (typeof window !== 'undefined' && window.location && window.location.origin) 
    ? '' 
    : 'http://localhost:5173';

  try {
    if (!HAS_LOCAL_SHEET_PROXY) throw new Error('no local proxy');
    let proxyUrl = `${apiBase}/api/fetch-sheet?sheetId=${details.sheetId}&sheet=${encodeURIComponent(targetTab)}&_t=${timestamp}`;
    if (details.gid) {
      proxyUrl += `&gid=${details.gid}`;
    }
    const res = await fetch(proxyUrl, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    });
    const contentType = res.headers ? (res.headers.get('content-type') || '') : '';
    if (res.ok && !contentType.includes('text/html')) {
      const csv = await res.text();
      if (csv && csv.trim().length > 50 && !csv.includes('{"error"')) {
        if (!csv.startsWith('"Completion %') && !csv.startsWith('Completion %')) {
          return csv;
        }
      }
    }
  } catch (err) {
    if (HAS_LOCAL_SHEET_PROXY) console.warn('Local proxy fetch failed, trying JSONP...', err);
  }

  // Strategy 2: Client-side JSONP with candidate tabs
  for (const cand of candidates) {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      try {
        const jsonpCsv = await fetchGoogleSheetJSONP(details.sheetId, cand);
        if (jsonpCsv && jsonpCsv.trim().length > 50) {
          if (!jsonpCsv.startsWith('"Completion %') && !jsonpCsv.startsWith('Completion %')) {
            return jsonpCsv;
          }
        }
      } catch (err) {
        // continue
      }
    }
  }

  // Strategy 3: Direct GViz CSV fetch with cache-busting
  const gvizUrls = [];
  if (details.gid) {
    gvizUrls.push(`https://docs.google.com/spreadsheets/d/${details.sheetId}/gviz/tq?tqx=out:csv&gid=${details.gid}&_t=${timestamp}`);
  }
  for (const cand of candidates) {
    gvizUrls.push(`https://docs.google.com/spreadsheets/d/${details.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(cand)}&_t=${timestamp}`);
  }

  for (const u of gvizUrls) {
    try {
      const res = await fetch(u, {
        mode: 'cors',
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (res.ok) {
        const csv = await res.text();
        if (csv && csv.trim().length > 50) {
          if (!csv.startsWith('"Completion %') && !csv.startsWith('Completion %')) {
            return csv;
          }
        }
      }
    } catch (e) {
      // continue
    }
  }

  throw new Error(`Unable to load tab "${targetTab}" from Google Sheets. Make sure the sheet is shared as "Anyone with the link can view".`);
}

// ---------------------------------------------------------------------------
// Shared Batch Registry
//
// Connected batches used to live only in the connecting browser's localStorage,
// so nobody else (other admins, any faculty) ever saw them. The registry is a
// "Batch Registry" tab in the master Google Sheet: admins publish to it through
// the Apps Script web app, and EVERY login (admin or faculty) reads it back
// through the public sheet read path and builds the same batches locally.
// ---------------------------------------------------------------------------
const REGISTRY_TAB = 'Batch Registry';
const REGISTRY_DEFAULT_SHEET_ID = '1ny3xsppBVxJb1FNPBU97mpm0b4eyAkUAG9CanjXf5FE';

function registryLS(key) {
  try { return (typeof localStorage !== 'undefined' && localStorage.getItem(key)) || ''; } catch (_) { return ''; }
}

export function getRegistrySheetId() {
  const saved = registryLS('pw_faculty_spreadsheet_url');
  if (saved && !saved.includes('script.google.com')) {
    const d = extractSheetDetails(saved);
    if (d && d.sheetId) return d.sheetId;
  }
  return REGISTRY_DEFAULT_SHEET_ID;
}

/** Apps Script endpoint + token if THIS browser is set up to write (admins). */
export function getRegistryWriter() {
  let endpoint = '';
  let token = '';
  try {
    const cfg = JSON.parse(registryLS('meded_sheet_writeback_config_v1') || 'null') || {};
    endpoint = cfg.endpoint || '';
    token = cfg.token || '';
  } catch (_) { /* ignore */ }
  const saved = registryLS('pw_faculty_spreadsheet_url');
  endpoint = endpoint || registryLS('meded_sheet_writer_url') || registryLS('pw_faculty_script_url') || (saved.includes('/exec') ? saved : '');
  token = token || registryLS('meded_sheet_writer_token') || 'pw-meded-token-2026';
  endpoint = endpoint.trim();
  if (!endpoint.includes('script.google.com/macros/s/')) return null;
  return { endpoint, token: token.trim() };
}

/**
 * Read the shared registry. Resolves to an array of rows, or null when the
 * registry cannot be read (so callers never mistake "offline" for "empty").
 */
export async function fetchBatchRegistry() {
  let csv = '';
  try {
    csv = await fetchGoogleSheetJSONP(getRegistrySheetId(), REGISTRY_TAB);
  } catch (_) {
    try {
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${getRegistrySheetId()}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(REGISTRY_TAB)}&_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) csv = await res.text();
    } catch (__) { return null; }
  }
  if (!csv) return null;
  const rows = parseCSV(csv);
  if (!rows.length) return null;
  const header = rows[0].map(h => String(h || '').trim().toLowerCase());
  const col = (name) => header.indexOf(name);
  const iId = col('batch id'), iName = col('name'), iUrl = col('source url'), iTab = col('tab name'),
        iPlat = col('platform'), iAct = col('active');
  // Missing tab => Google serves some other sheet; the header check rejects that.
  if (iId < 0 || iUrl < 0) return null;
  return rows.slice(1)
    .filter(r => r && String(r[iUrl] || '').trim())
    .map(r => ({
      id: String(r[iId] || '').trim(),
      name: String(r[iName] || '').trim(),
      sourceUrl: String(r[iUrl] || '').trim(),
      tabName: String(r[iTab] || '').trim() || 'Lecture Planner',
      platform: String(r[iPlat] || '').trim(),
      active: !/^(false|no|0)$/i.test(String(r[iAct] == null ? 'TRUE' : r[iAct]).trim())
    }));
}

export async function postRegistryAction(action, payload, field = 'batch') {
  const writer = getRegistryWriter();
  if (!writer) {
    return { ok: false, error: 'Sheet write-back URL is not set on this device, so the batch was saved here only.' };
  }
  try {
    const res = await fetch(writer.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token: writer.token, [field]: payload })
    });
    const json = await res.json();
    return json && json.ok ? { ok: true } : { ok: false, error: (json && json.error) || 'Apps Script rejected the request' };
  } catch (e) {
    return { ok: false, error: e.message || 'Could not reach the Apps Script web app' };
  }
}

export const SYNC_SETTINGS_KEY = 'meded_sync_settings_v1';

/**
 * Sheet & Batch Manager class with Real-Time Background Synchronization Engine
 */
export class BatchManager {
  constructor() {
    this.batches = [];
    this.autoSyncTimer = null;
    this.isSyncing = false;
    this.syncSettings = this.loadSyncSettings();
    this.loadFromStorage();
    this.initRealTimeSync();
  }

  loadSyncSettings() {
    const defaults = {
      autoSyncEnabled: true,
      intervalSeconds: 30, // 15, 30, 60, 120, 300
      lastSyncedAt: null,
      syncStatus: 'idle' // 'idle' | 'syncing' | 'success' | 'error'
    };
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(SYNC_SETTINGS_KEY);
        if (stored) {
          return { ...defaults, ...JSON.parse(stored) };
        }
      }
    } catch (e) {
      console.warn('Could not load sync settings:', e);
    }
    return defaults;
  }

  saveSyncSettings(settingsUpdate = {}) {
    this.syncSettings = { ...this.syncSettings, ...settingsUpdate };
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(this.syncSettings));
      }
    } catch (e) {
      console.error('Failed to save sync settings:', e);
    }

    // Persist sync settings to server code level
    if (typeof fetch !== 'undefined') {
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: SYNC_SETTINGS_KEY, value: JSON.stringify(this.syncSettings) })
      }).catch(() => {});
    }

    this.broadcastSyncStatus();
    if (this.syncSettings.autoSyncEnabled) {
      this.startAutoSync();
    } else {
      this.stopAutoSync();
    }
    return this.syncSettings;
  }

  getSyncSettings() {
    return { ...this.syncSettings, isSyncing: this.isSyncing };
  }

  initRealTimeSync() {
    if (typeof window === 'undefined') return;

    // Start auto-sync timer if enabled
    if (this.syncSettings.autoSyncEnabled) {
      this.startAutoSync();
    }

    // Listen for remote settings sync updates
    window.addEventListener('meded:settings_synced', (e) => {
      const changed = (e.detail && e.detail.keys) || [];
      if (changed.includes(SYNC_SETTINGS_KEY) || changed.length === 0) {
        const reloaded = this.loadSyncSettings();
        const intervalChanged = this.syncSettings.intervalSeconds !== reloaded.intervalSeconds;
        const autoChanged = this.syncSettings.autoSyncEnabled !== reloaded.autoSyncEnabled;
        this.syncSettings = reloaded;
        if (autoChanged || intervalChanged) {
          if (this.syncSettings.autoSyncEnabled) {
            this.startAutoSync();
          } else {
            this.stopAutoSync();
          }
        }
        this.broadcastSyncStatus();
      }
    });

    // Pull from central server immediately on startup
    this.pullServerBatches().catch(() => {});

    // Fast server sync check every 3 seconds for instant multi-login synchronization
    this.serverPollTimer = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        this.pullServerBatches().catch(() => {});
      }
    }, 3000);

    // Trigger immediate background sync on initial page load
    setTimeout(() => {
      this.syncAllBatches({ background: true }).catch(() => {});
    }, 1200);

    // Refresh instantly when user switches back to this browser tab
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.pullServerBatches().catch(() => {});
        if (this.syncSettings.autoSyncEnabled) {
          this.syncAllBatches({ background: true }).catch(() => {});
        }
      }
    });

    window.addEventListener('focus', () => {
      this.pullServerBatches().catch(() => {});
      if (this.syncSettings.autoSyncEnabled) {
        this.syncAllBatches({ background: true }).catch(() => {});
      }
    });
  }

  async pullServerBatches() {
    if (typeof fetch === 'undefined') return false;
    try {
      const res = await fetch('/api/batches', { cache: 'no-store' });
      if (!res.ok) return false;
      const data = await res.json();
      if (data && data.success && Array.isArray(data.batches) && data.batches.length > 0) {
        const curJson = JSON.stringify(this.batches || []);
        const newJson = JSON.stringify(data.batches);
        if (curJson !== newJson) {
          this.batches = data.batches;
          this.saveToStorage(false);
          this.broadcastBatchesUpdated(true);
          return true;
        }
      }
    } catch (e) {
      // Offline or fallback to local
    }
    return false;
  }

  async saveBatchesToServer() {
    if (typeof fetch === 'undefined') return false;
    try {
      const res = await fetch('/api/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batches: this.batches })
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  startAutoSync(intervalSeconds = null) {
    this.stopAutoSync();
    if (intervalSeconds) {
      this.syncSettings.intervalSeconds = intervalSeconds;
    }
    const intervalMs = Math.max(10, this.syncSettings.intervalSeconds || 30) * 1000;
    this.autoSyncTimer = setInterval(() => {
      if (!this.isSyncing && (typeof document === 'undefined' || document.visibilityState === 'visible')) {
        this.syncAllBatches({ background: true }).catch(() => {});
      }
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
    }
  }

  broadcastSyncStatus() {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meded:sync_status', {
        detail: {
          status: this.isSyncing ? 'syncing' : (this.syncSettings.syncStatus || 'idle'),
          lastSyncedAt: this.syncSettings.lastSyncedAt,
          intervalSeconds: this.syncSettings.intervalSeconds,
          autoSyncEnabled: this.syncSettings.autoSyncEnabled,
          batchCount: this.batches.length
        }
      }));
    }
  }

  broadcastBatchesUpdated(changed = true, sourceBatchId = null) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meded:batches_updated', {
        detail: {
          batches: this.batches,
          changed,
          sourceBatchId,
          lastSyncedAt: this.syncSettings.lastSyncedAt
        }
      }));
    }
  }

  loadFromStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          let parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Filter out corrupt batches (e.g. named "Completion %" or having 0 events)
            parsed = parsed.filter(b => b && b.name && !b.name.toLowerCase().includes('completion %') && Array.isArray(b.events) && b.events.length > 0);
            if (parsed.length > 0) {
              // Ensure newly introduced default batches (e.g. INI-CET & FMGE) are merged in
              for (const defBatch of DEFAULT_BATCHES) {
                const existingIdx = parsed.findIndex(b => b.id === defBatch.id);
                if (existingIdx === -1) {
                  parsed.push(JSON.parse(JSON.stringify(defBatch)));
                } else {
                  // Ensure platform flags & source URLs are up to date
                  if (!parsed[existingIdx].platform && defBatch.platform) {
                    parsed[existingIdx].platform = defBatch.platform;
                    parsed[existingIdx].isYoutube = defBatch.isYoutube;
                    parsed[existingIdx].isApp = defBatch.isApp;
                  }
                  if (!parsed[existingIdx].sourceUrl && defBatch.sourceUrl) {
                    parsed[existingIdx].sourceUrl = defBatch.sourceUrl;
                    parsed[existingIdx].sheetTabName = defBatch.sheetTabName;
                  }
                }
              }
              this.batches = parsed;
              this.saveToStorage(false);
              this.pullServerBatches().catch(() => {});
              return;
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load batches from localStorage, falling back to default:', e);
    }
    this.batches = JSON.parse(JSON.stringify(DEFAULT_BATCHES));
    this.saveToStorage(true);
    this.pullServerBatches().catch(() => {});
  }

  saveToStorage(syncToServer = true) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.batches));
      }
    } catch (e) {
      console.error('Failed to save batches to localStorage:', e);
    }
    if (syncToServer) {
      this.saveBatchesToServer().catch(() => {});
    }
  }

  getBatches() {
    return this.batches;
  }

  getBatch(id) {
    if (!id || id === 'all') return null;
    return this.batches.find(b => b.id === id);
  }

  getAllEvents(batchId = 'all') {
    if (batchId && batchId !== 'all') {
      const b = this.getBatch(batchId);
      if (!b) return [];
      return (b.events || []).map(ev => ({
        ...ev,
        batchId: ev.batchId || b.id,
        batchName: ev.batchName || b.name
      }));
    }
    // Combined events from all batches
    const combined = [];
    for (const b of this.batches) {
      if (b && Array.isArray(b.events)) {
        for (const ev of b.events) {
          combined.push({
            ...ev,
            batchId: ev.batchId || b.id,
            batchName: ev.batchName || b.name
          });
        }
      }
    }
    // Sort by isoDate
    combined.sort((a, b) => {
      if (!a.isoDate) return 1;
      if (!b.isoDate) return -1;
      return a.isoDate.localeCompare(b.isoDate) || (a.startHour || 0) - (b.startHour || 0);
    });
    return combined;
  }

  /**
   * Connect a new Google Sheet batch and immediately register it for real-time sync
   */
  async addBatchFromUrl(url, tabName = 'Lecture Planner', customName = '') {
    const details = extractSheetDetails(url);
    if (!details) {
      throw new Error('Please provide a valid Google Sheet URL.');
    }
    const newId = `batch-${Date.now()}`;
    const csv = await fetchGoogleSheetCSV(url, tabName);
    const newBatch = processRawCSVToBatch(csv, newId, url, tabName, customName);
    newBatch.lastSynced = new Date().toISOString();

    // Check if batch with same sheet ID already exists
    const existingIdx = this.batches.findIndex(b => {
      const d = extractSheetDetails(b.sourceUrl);
      return d && d.sheetId === details.sheetId;
    });

    if (existingIdx >= 0) {
      newBatch.id = this.batches[existingIdx].id;
      this.batches[existingIdx] = newBatch;
    } else {
      this.batches.push(newBatch);
    }

    this.saveToStorage(true);
    this.broadcastBatchesUpdated(true, newBatch.id);

    // Share it: write to the registry so every other login picks it up.
    newBatch.publishResult = await this.publishBatchToRegistry(newBatch);
    return newBatch;
  }

  async publishBatchToRegistry(batch) {
    const result = await postRegistryAction('upsert_batch', {
      id: batch.id,
      name: batch.name,
      sourceUrl: batch.sourceUrl,
      tabName: batch.sheetTabName || 'Lecture Planner',
      platform: batch.platform || ''
    });
    if (result.ok) {
      batch.fromRegistry = true;
      this.saveToStorage(true);
    }
    return result;
  }

  /**
   * Pull the shared registry: add batches other admins connected, drop the ones
   * they removed, and (from an admin browser) publish batches that were only
   * ever stored locally. Safe to call repeatedly.
   */
  async pullRegistry() {
    const rows = await fetchBatchRegistry();
    if (!rows) return false;
    let changed = false;
    const activeIds = new Set();

    for (const r of rows) {
      if (!r.active) continue;
      activeIds.add(r.id);
      const sid = (extractSheetDetails(r.sourceUrl) || {}).sheetId;
      const existing = this.batches.find(b => b.id === r.id ||
        (sid && (extractSheetDetails(b.sourceUrl) || {}).sheetId === sid));
      if (existing) {
        if (!existing.fromRegistry) { existing.fromRegistry = true; changed = true; }
        if (existing.id !== r.id) activeIds.add(existing.id);
        continue;
      }
      try {
        const csv = await fetchGoogleSheetCSV(r.sourceUrl, r.tabName);
        const batch = processRawCSVToBatch(csv, r.id, r.sourceUrl, r.tabName, r.name);
        batch.lastSynced = new Date().toISOString();
        batch.fromRegistry = true;
        this.batches.push(batch);
        changed = true;
      } catch (err) {
        console.warn(`Registry batch "${r.name}" could not be loaded:`, err.message);
      }
    }

    // Removed by an admin elsewhere
    const before = this.batches.length;
    this.batches = this.batches.filter(b => !(b.fromRegistry && !activeIds.has(b.id)) || this.batches.length <= 1);
    if (this.batches.length !== before) changed = true;

    // Admin browsers: share batches that predate the registry
    if (getRegistryWriter()) {
      const defaultIds = new Set(DEFAULT_BATCHES.map(b => b.id));
      for (const b of this.batches) {
        if (b.sourceUrl && !b.fromRegistry && !defaultIds.has(b.id)) {
          const res = await this.publishBatchToRegistry(b);
          if (res.ok) changed = true;
        }
      }
    }

    if (changed) {
      this.saveToStorage();
      this.broadcastBatchesUpdated(true);
    }
    return true;
  }

  /**
   * Sync a single batch with live Google Sheets data
   */
  async syncBatch(id, options = {}) {
    const batch = this.getBatch(id);
    if (!batch) throw new Error('Batch not found');
    if (!batch.sourceUrl) throw new Error('No source URL for this batch');

    const csv = await fetchGoogleSheetCSV(batch.sourceUrl, batch.sheetTabName || 'Lecture Planner');
    const updated = processRawCSVToBatch(csv, batch.id, batch.sourceUrl, batch.sheetTabName, batch.name);
    updated.lastSynced = new Date().toISOString();
    
    const idx = this.batches.findIndex(b => b.id === id);
    if (idx >= 0) {
      const oldEventsStr = JSON.stringify(this.batches[idx].events || []);
      const newEventsStr = JSON.stringify(updated.events || []);
      const changed = oldEventsStr !== newEventsStr || this.batches[idx].eventCount !== updated.eventCount;

      this.batches[idx] = updated;
      this.saveToStorage();

      if (changed || options.forceBroadcast) {
        this.broadcastBatchesUpdated(true, id);
      }
    }
    return updated;
  }

  /**
   * Real-time multi-sheet sync across all connected existing and attached batches
   */
  async syncAllBatches(options = {}) {
    if (this.isSyncing) return [];
    this.isSyncing = true;
    this.broadcastSyncStatus();

    const results = [];
    let hasAnyChanges = false;

    try {
      await this.pullRegistry().catch(() => {});
      for (const b of [...this.batches]) {
        if (b.sourceUrl) {
          try {
            const oldEventsStr = JSON.stringify(b.events || []);
            const res = await this.syncBatch(b.id, { forceBroadcast: false });
            const newEventsStr = JSON.stringify(res.events || []);
            if (oldEventsStr !== newEventsStr) {
              hasAnyChanges = true;
            }
            results.push({ id: b.id, name: b.name, success: true, count: res.eventCount });
          } catch (err) {
            results.push({ id: b.id, name: b.name, success: false, error: err.message });
          }
        }
      }

      this.syncSettings.lastSyncedAt = new Date().toISOString();
      this.syncSettings.syncStatus = results.some(r => r.success) ? 'success' : 'error';
      this.saveSyncSettings({ lastSyncedAt: this.syncSettings.lastSyncedAt, syncStatus: this.syncSettings.syncStatus });

      if (hasAnyChanges) {
        this.broadcastBatchesUpdated(true);
      }
    } finally {
      this.isSyncing = false;
      this.broadcastSyncStatus();
    }
    return results;
  }

  removeBatch(id) {
    if (this.batches.length <= 1) {
      throw new Error('At least one batch must remain active.');
    }
    const removed = this.batches.find(b => b.id === id);
    this.batches = this.batches.filter(b => b.id !== id);
    this.saveToStorage();
    this.broadcastBatchesUpdated(true);
    if (removed && removed.fromRegistry) {
      postRegistryAction('remove_batch', { id: removed.id, sourceUrl: removed.sourceUrl })
        .then(r => { if (!r.ok) console.warn('Registry removal not shared:', r.error); });
    }
  }

  resetToDefaults() {
    this.batches = JSON.parse(JSON.stringify(DEFAULT_BATCHES));
    this.saveToStorage();
    this.broadcastBatchesUpdated(true);
    return this.batches;
  }
}
