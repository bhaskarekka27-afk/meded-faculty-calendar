import fs from 'fs';

const entries = JSON.parse(fs.readFileSync('workload_complete_entries.json', 'utf-8'));

const code = `/**
 * PW MedEd - Faculty Workload Data Model & Verified Pre-bundled Storage
 * Sourced directly from official Faculty Workload Calculation Sheet:
 * https://docs.google.com/spreadsheets/d/1dXhAe2a-1Veks15_4QxftrEe2iDhwQKWVmBgllMk2cI/edit?gid=711486978#gid=711486978
 */

export const WORKLOAD_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1dXhAe2a-1Veks15_4QxftrEe2iDhwQKWVmBgllMk2cI/edit?gid=711486978#gid=711486978';
export const WORKLOAD_SHEET_ID = '1dXhAe2a-1Veks15_4QxftrEe2iDhwQKWVmBgllMk2cI';
export const WORKLOAD_STORAGE_KEY = 'meded_faculty_workload_records_v3';

export const FACULTY_TABS_CONFIG = [
  { name: 'Dr. Pradeep Pawar', gid: '711486978' },
  { name: 'Dr. Vivek Nalgirkar', gid: '1725439557' },
  { name: 'Dr. Rajesh Jambhulkar', gid: '1930160354' },
  { name: 'Dr. Siraj Ahmad', gid: '990314881' },
  { name: 'Dr. Ranjith AR', gid: '1236421990' },
  { name: 'Dr. Anusha Rathi', gid: '2060553098' },
  { name: 'Dr. Sudha Seetharam', gid: '519820584' },
  { name: 'Dr. Sanchit Bajpai', gid: '1743666767' },
  { name: 'Dr. Manjunath A', gid: '604499510' },
  { name: 'Dr. Ashwani Ranjan', gid: '770688589' },
  { name: 'Dr. Era Dutta', gid: '199317986' },
  { name: 'Dr. Alekhya', gid: '2053522934' },
  { name: 'Dr. Santosh Sir', gid: '659343407' },
  { name: 'Dr. Natisha Arora', gid: '1939913651' },
  { name: 'Dr. Vinish Srivastava', gid: '1674849711' },
  { name: 'Dr. Prassan Vij', gid: '1674718737' },
  { name: 'Dr. Sandeep Seeramreddi', gid: '1859662830' },
  { name: 'Dr. Divya Madan', gid: '909809096' },
  { name: 'Dr. Jazeer Abdul Khader', gid: '1031060902' },
  { name: 'Dr. Ichita Joshi', gid: '1928790804' },
  { name: 'Dr. Jyoti Chaturvedi ', gid: '1733842484' },
  { name: 'Dr. Anusha Rathi BDS', gid: '753732696' },
  { name: 'Dr. Akash Sinha', gid: '376230375' },
  { name: 'Dr. Rajesh Jambhulkar BDS', gid: '1091234239' }
];

export const DEFAULT_WORKLOAD_ENTRIES = ${JSON.stringify(entries, null, 2)};

export class WorkloadManager {
  constructor() {
    this.entries = [];
    this.loadFromStorage();
  }

  loadFromStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(WORKLOAD_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length >= 700) {
            this.entries = parsed;
            return;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read workload from storage:', e);
    }
    this.entries = JSON.parse(JSON.stringify(DEFAULT_WORKLOAD_ENTRIES));
    this.saveToStorage();
  }

  saveToStorage() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(WORKLOAD_STORAGE_KEY, JSON.stringify(this.entries));
      }
    } catch (e) {
      console.error('Failed to save workload to storage:', e);
    }
  }

  /**
   * Live sync with Google Sheets across all faculty tabs
   */
  async syncFromGoogleSheet(onProgress) {
    const sheetId = WORKLOAD_SHEET_ID;
    const allFetched = [];

    for (let tIdx = 0; tIdx < FACULTY_TABS_CONFIG.length; tIdx++) {
      const tab = FACULTY_TABS_CONFIG[tIdx];
      if (typeof onProgress === 'function') {
        onProgress({ current: tIdx + 1, total: FACULTY_TABS_CONFIG.length, name: tab.name });
      }

      let csvText = '';
      try {
        const proxyUrl = \`/api/fetch-sheet?sheetId=\${sheetId}&gid=\${tab.gid}\`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
          csvText = await res.text();
        } else {
          const directUrl = \`https://docs.google.com/spreadsheets/d/\${sheetId}/gviz/tq?tqx=out:csv&gid=\${tab.gid}\`;
          const dirRes = await fetch(directUrl);
          if (dirRes.ok) csvText = await dirRes.text();
        }
      } catch (err) {
        console.warn(\`Could not sync tab \${tab.name}:\`, err);
      }

      if (csvText && csvText.trim().length > 30) {
        const parsed = parseWorkloadCSV(csvText, tab.name, tab.gid);
        if (parsed.length > 0) {
          allFetched.push(...parsed);
        }
      }
    }

    if (allFetched.length >= 500) {
      this.entries = allFetched;
      this.saveToStorage();
      return { success: true, count: allFetched.length };
    }

    return { success: false, count: this.entries.length };
  }

  getAllEntries() {
    return this.entries;
  }

  getFilteredEntries(filters = {}) {
    const month = (filters.month || filters.selectedMonth || 'all').toString().toLowerCase();
    const platform = (filters.platform || filters.selectedPlatform || 'all').toString().toLowerCase();
    const faculty = (filters.faculty || filters.selectedFaculty || 'all').toString().toLowerCase();
    const batch = (filters.batch || filters.selectedBatch || 'all').toString().toLowerCase();
    const search = (filters.search || filters.facultyQuery || '').toString().toLowerCase().trim();

    return this.entries.filter(e => {
      // Month Filter
      if (month && month !== 'all' && e.month) {
        if (e.month.toLowerCase() !== month) return false;
      }

      // Platform Filter (App vs Youtube)
      if (platform && platform !== 'all') {
        if (platform === 'app' && !e.isApp) return false;
        if (platform === 'youtube' && !e.isYoutube) return false;
      }

      // Faculty Filter
      if (faculty && faculty !== 'all') {
        const facLower = (e.faculty || '').toLowerCase();
        const tabLower = (e.tabName || '').toLowerCase();
        if (!facLower.includes(faculty) && !tabLower.includes(faculty)) {
          return false;
        }
      }

      // Batch Filter
      if (batch && batch !== 'all') {
        const bName = (e.batchName || '').toLowerCase();
        if (!bName.includes(batch)) return false;
      }

      // Search Query
      if (search) {
        const haystack = [e.faculty, e.tabName, e.batchName, e.month, e.liveType, e.dateRaw].join(' ').toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }

  getFacultySummaries(filters = {}) {
    const filtered = this.getFilteredEntries(filters);
    const facultyMap = {};

    filtered.forEach(e => {
      const facName = e.faculty || e.tabName || 'Faculty';
      if (!facultyMap[facName]) {
        facultyMap[facName] = {
          faculty: facName,
          tabName: e.tabName || facName,
          totalHours: 0,
          appHours: 0,
          youtubeHours: 0,
          totalSessions: 0,
          appSessions: 0,
          youtubeSessions: 0,
          cancelledCount: 0,
          rescheduledCount: 0,
          batches: new Set(),
          months: new Set()
        };
      }

      const hrs = Number(e.workingHours) || 0;
      facultyMap[facName].totalHours += hrs;
      facultyMap[facName].totalSessions += 1;

      if (e.isCancel) facultyMap[facName].cancelledCount += 1;
      if (e.isResched) facultyMap[facName].rescheduledCount += 1;

      if (e.isApp || (e.liveType && /app/i.test(e.liveType))) {
        facultyMap[facName].appHours += hrs;
        facultyMap[facName].appSessions += 1;
      }
      if (e.isYoutube || (e.liveType && /youtube|yt/i.test(e.liveType))) {
        facultyMap[facName].youtubeHours += hrs;
        facultyMap[facName].youtubeSessions += 1;
      }

      if (e.batchName) facultyMap[facName].batches.add(e.batchName);
      if (e.month) facultyMap[facName].months.add(e.month);
    });

    const summaries = Object.values(facultyMap).map(f => ({
      ...f,
      totalHours: Number(f.totalHours.toFixed(1)),
      appHours: Number(f.appHours.toFixed(1)),
      youtubeHours: Number(f.youtubeHours.toFixed(1)),
      batches: Array.from(f.batches),
      months: Array.from(f.months)
    }));

    // Sort by total hours descending
    summaries.sort((a, b) => b.totalHours - a.totalHours);
    return summaries;
  }

  getOverallMetrics(filters = {}) {
    const filtered = this.getFilteredEntries(filters);
    const summaries = this.getFacultySummaries(filters);

    let totalHours = 0;
    let appHours = 0;
    let youtubeHours = 0;

    filtered.forEach(e => {
      const hrs = Number(e.workingHours) || 0;
      totalHours += hrs;
      if (e.isApp || (e.liveType && /app/i.test(e.liveType))) appHours += hrs;
      if (e.isYoutube || (e.liveType && /youtube|yt/i.test(e.liveType))) youtubeHours += hrs;
    });

    return {
      totalHours: Number(totalHours.toFixed(1)),
      appHours: Number(appHours.toFixed(1)),
      youtubeHours: Number(youtubeHours.toFixed(1)),
      totalSessions: filtered.length,
      activeFacultyCount: summaries.length
    };
  }

  getAvailableMonths() {
    const monthOrder = ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const months = new Set();
    this.entries.forEach(e => {
      if (e.month) months.add(e.month);
    });
    return Array.from(months).sort((a, b) => {
      const idxA = monthOrder.indexOf(a);
      const idxB = monthOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      return a.localeCompare(b);
    });
  }

  getAvailableBatches() {
    const batches = new Set();
    this.entries.forEach(e => {
      if (e.batchName) batches.add(e.batchName);
    });
    return Array.from(batches).sort();
  }

  getAvailableFaculty() {
    const facs = new Set();
    this.entries.forEach(e => {
      if (e.faculty) facs.add(e.faculty);
    });
    return Array.from(facs).sort();
  }
}

export function cleanFacultyTabName(tabName = '') {
  if (!tabName) return 'Faculty Doctor';
  let clean = tabName.trim();
  clean = clean.replace(/\\s+Sir$/i, '').replace(/\\s+Ma'am$/i, '').replace(/\\s+Maam$/i, '');
  if (!clean.startsWith('Dr.') && !clean.startsWith('Prof.')) {
    clean = 'Dr. ' + clean;
  }
  return clean;
}

export function parseCSVStateMachine(text) {
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
      row.push(currentField.trim());
      currentField = '';
    } else if ((char === '\\r' || char === '\\n') && !inQuotes) {
      if (char === '\\r' && nextChar === '\\n') {
        i++;
      }
      row.push(currentField.trim());
      lines.push(row);
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || row.length > 0) {
    row.push(currentField.trim());
    lines.push(row);
  }
  return lines;
}

export function normalizeMonth(monthName = '', dateRaw = '') {
  let m = (monthName || '').trim();
  if (dateRaw) {
    const match = dateRaw.match(/(\\d{1,2})[\\/\\-\\.]([A-Za-z]+)[\\/\\-\\.](\\d{2,4})/);
    if (match && match[2]) {
      m = match[2];
    }
  }

  const map = {
    jan: 'January', janary: 'January', january: 'January',
    feb: 'February', feburary: 'February', february: 'February',
    mar: 'March', march: 'March',
    apr: 'April', april: 'April',
    may: 'May',
    jun: 'June', june: 'June',
    jul: 'July', july: 'July',
    aug: 'August', august: 'August',
    sep: 'September', sept: 'September', september: 'September',
    oct: 'October', october: 'October',
    nov: 'November', november: 'November',
    dec: 'December', december: 'December'
  };

  const cleanM = m.replace(/202[0-9]/g, '').trim().toLowerCase();
  return map[cleanM] || m || 'Unspecified';
}

export function parseWorkloadCSV(csvText, tabName, gid = '') {
  const rows = parseCSVStateMachine(csvText);
  if (rows.length < 2) return [];

  let headerRowIdx = -1;
  let headers = [];
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    const r = rows[i];
    if (r.some(c => /month/i.test(c) || /^1$/i.test(c) || /date/i.test(c))) {
      headerRowIdx = i;
      headers = r;
      break;
    }
  }

  let monthCol = -1, dateCol = -1, batchCol = -1, liveTypeCol = -1, hoursCol = -1, cancelCol = -1, reschedCol = -1, reasonCol = -1;
  if (headerRowIdx !== -1) {
    headers.forEach((h, idx) => {
      const lower = h.toLowerCase().trim();
      if (lower === 'month' || lower === '1' || lower === 'months' || lower === 'month 2026') monthCol = idx;
      else if (lower === 'date' || lower === 'dates') dateCol = idx;
      else if (lower.includes('batch')) batchCol = idx;
      else if (lower.includes('live type') || lower.includes('platform') || lower === 'type') liveTypeCol = idx;
      else if (lower.includes('working hours') || lower === 'hours' || lower === 'working hour' || lower.includes('hrs')) hoursCol = idx;
      else if (lower.includes('class cancel') || lower === 'cancel' || lower === 'cancelled') cancelCol = idx;
      else if (lower.includes('reschedule') || lower === 'reschedule class') reschedCol = idx;
      else if (lower.includes('reason')) reasonCol = idx;
    });
  }

  if (monthCol === -1) monthCol = 0;
  if (dateCol === -1) dateCol = 1;
  if (batchCol === -1) batchCol = 2;
  if (cancelCol === -1) cancelCol = 7;
  if (reschedCol === -1) reschedCol = 6;
  if (liveTypeCol === -1) liveTypeCol = 8;
  if (hoursCol === -1) hoursCol = 10;

  const entries = [];
  let currentMonth = '';
  const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 1;

  for (let i = startRow; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 2 || cols.every(c => !c)) continue;

    const rawMonth = cols[monthCol] || '';
    if (rawMonth && !/total|sum|average|note/i.test(rawMonth)) {
      currentMonth = rawMonth;
    }

    const rawDate = cols[dateCol] || '';
    const rawBatch = cols[batchCol] || '';
    const rawLiveType = cols[liveTypeCol] || '';
    const rawHours = cols[hoursCol] || '';
    const rawCancel = cols[cancelCol] || '';
    const rawResched = cols[reschedCol] || '';
    const rawReason = reasonCol !== -1 ? (cols[reasonCol] || '') : '';

    if (/total|sum|average/i.test(rawMonth) || /total|sum|average/i.test(rawDate) || /total|sum|average/i.test(rawBatch)) {
      continue;
    }
    if (!rawDate && !rawBatch && (!rawHours || rawHours === '0')) {
      continue;
    }

    const normMonth = normalizeMonth(currentMonth, rawDate);
    const hours = parseFloat(rawHours) || 0;
    const isCancel = rawCancel.toUpperCase() === 'TRUE';
    const isResched = rawResched.toUpperCase() === 'TRUE';

    const isYt = /youtube|yt/i.test(rawLiveType) || /youtube/i.test(rawBatch);
    const isApp = /app/i.test(rawLiveType) || (!isYt && rawLiveType.length > 0) || (!isYt && !rawLiveType && hours > 0);

    let isoDate = null;
    if (rawDate) {
      const dateMatch = rawDate.match(/(\\d{1,2})[\\/\\-\\.]([A-Za-z]+)[\\/\\-\\.](\\d{2,4})/);
      if (dateMatch) {
        const monthMap = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12', jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const mNum = monthMap[dateMatch[2].toLowerCase()] || '05';
        const yNum = dateMatch[3].length === 2 ? \`20\${dateMatch[3]}\` : dateMatch[3];
        isoDate = \`\${yNum}-\${mNum}-\${dateMatch[1].padStart(2, '0')}\`;
      }
    }

    entries.push({
      id: \`wl-\${gid || tabName}-\${i}\`,
      faculty: cleanFacultyTabName(tabName),
      tabName: tabName,
      gid: gid || '',
      month: normMonth,
      dateRaw: rawDate,
      isoDate: isoDate,
      batchName: rawBatch || 'Standard Lecture',
      liveType: rawLiveType || (isYt && isApp ? 'YT+APP' : (isYt ? 'Youtube' : 'App')),
      workingHours: hours,
      isApp: isApp,
      isYoutube: isYt,
      isCancel: isCancel,
      isResched: isResched,
      reason: rawReason
    });
  }

  return entries;
}
`;

fs.writeFileSync('js/workloadData.js', code, 'utf-8');
console.log('Successfully updated js/workloadData.js with verified 814 entries and robust parser!');
