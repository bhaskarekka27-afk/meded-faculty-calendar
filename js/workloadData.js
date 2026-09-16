/**
 * PW MedEd - Faculty Workload Data Model & Pre-bundled Storage
 * Manages faculty-wise teaching workload hours (App vs YouTube) sourced from Google Sheets.
 */

export const DEFAULT_WORKLOAD_ENTRIES = [
  // --- Dr. Pradeep Pawar (Dr. Pradeep Sir) ---
  { id: 'wl-p1', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'April', dateRaw: '2/April/2026', isoDate: '2026-04-02', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 1.5, isApp: true, isYoutube: false },
  { id: 'wl-p2', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'April', dateRaw: '6/April/2026', isoDate: '2026-04-06', batchName: '1st YEAR: ONE SHOT SERIES', liveType: 'Youtube', workingHours: 0.5, isApp: false, isYoutube: true },
  { id: 'wl-p3', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'April', dateRaw: '7/April/2026', isoDate: '2026-04-07', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 1.5, isApp: true, isYoutube: false },
  { id: 'wl-p4', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'April', dateRaw: '9/April/2026', isoDate: '2026-04-09', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 1.0, isApp: true, isYoutube: false },
  { id: 'wl-p5', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'April', dateRaw: '11/April/2026', isoDate: '2026-04-11', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 1.5, isApp: true, isYoutube: false },
  { id: 'wl-p6', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'April', dateRaw: '16/April/2026', isoDate: '2026-04-16', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 1.5, isApp: true, isYoutube: false },
  { id: 'wl-p7', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'April', dateRaw: '18/April/2026', isoDate: '2026-04-18', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 1.5, isApp: true, isYoutube: false },
  { id: 'wl-p8', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'April', dateRaw: '21/April/2026', isoDate: '2026-04-21', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 1.5, isApp: true, isYoutube: false },
  { id: 'wl-p9', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'April', dateRaw: '22/April/2026', isoDate: '2026-04-22', batchName: 'INI-CET PYQ Series 2026', liveType: 'Youtube', workingHours: 3.0, isApp: false, isYoutube: true },
  { id: 'wl-p10', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'April', dateRaw: '23/April/2026', isoDate: '2026-04-23', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 1.5, isApp: true, isYoutube: false },
  { id: 'wl-p11', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'April', dateRaw: '28/April/2026', isoDate: '2026-04-28', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 1.5, isApp: true, isYoutube: false },
  { id: 'wl-p12', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'April', dateRaw: '30/April/2026', isoDate: '2026-04-30', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 1.0, isApp: true, isYoutube: false },
  
  { id: 'wl-p13', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'May', dateRaw: '5/May/2026', isoDate: '2026-05-05', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 1.0, isApp: true, isYoutube: false },
  { id: 'wl-p14', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'May', dateRaw: '8/May/2026', isoDate: '2026-05-08', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-p15', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'May', dateRaw: '9/May/2026', isoDate: '2026-05-09', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-p16', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'May', dateRaw: '10/May/2026', isoDate: '2026-05-10', batchName: 'INI-CET Predictor Marathon', liveType: 'Youtube', workingHours: 3.0, isApp: false, isYoutube: true },
  { id: 'wl-p17', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'May', dateRaw: '14/May/2026', isoDate: '2026-05-14', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-p18', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'May', dateRaw: '20/May/2026', isoDate: '2026-05-20', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },

  { id: 'wl-p19', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'October', dateRaw: '15/October/2026', isoDate: '2026-10-15', batchName: 'Prarambh 2026 Batch for MBBS 1st Year', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-p20', faculty: 'Dr. Pradeep Pawar', tabName: 'Dr. Pradeep Sir', month: 'October', dateRaw: '19/October/2026', isoDate: '2026-10-19', batchName: 'INI-CET Essentials Series', liveType: 'Youtube', workingHours: 2.5, isApp: false, isYoutube: true },

  // --- Dr. Vivek Nalgirkar (Dr. Vivek Sir) ---
  { id: 'wl-v1', faculty: 'Dr. Vivek Nalgirkar', tabName: 'Dr. Vivek Sir', month: 'April', dateRaw: '3/April/2026', isoDate: '2026-04-03', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-v2', faculty: 'Dr. Vivek Nalgirkar', tabName: 'Dr. Vivek Sir', month: 'April', dateRaw: '10/April/2026', isoDate: '2026-04-10', batchName: '1st YEAR: ONE SHOT SERIES', liveType: 'Youtube', workingHours: 1.5, isApp: false, isYoutube: true },
  { id: 'wl-v3', faculty: 'Dr. Vivek Nalgirkar', tabName: 'Dr. Vivek Sir', month: 'April', dateRaw: '15/April/2026', isoDate: '2026-04-15', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-v4', faculty: 'Dr. Vivek Nalgirkar', tabName: 'Dr. Vivek Sir', month: 'April', dateRaw: '24/April/2026', isoDate: '2026-04-24', batchName: 'INI-CET PYQ Series 2026', liveType: 'Youtube', workingHours: 2.5, isApp: false, isYoutube: true },

  { id: 'wl-v5', faculty: 'Dr. Vivek Nalgirkar', tabName: 'Dr. Vivek Sir', month: 'May', dateRaw: '6/May/2026', isoDate: '2026-05-06', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-v6', faculty: 'Dr. Vivek Nalgirkar', tabName: 'Dr. Vivek Sir', month: 'May', dateRaw: '12/May/2026', isoDate: '2026-05-12', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },

  { id: 'wl-v7', faculty: 'Dr. Vivek Nalgirkar', tabName: 'Dr. Vivek Sir', month: 'October', dateRaw: '16/October/2026', isoDate: '2026-10-16', batchName: 'Prarambh 2026 Batch for MBBS 1st Year', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-v8', faculty: 'Dr. Vivek Nalgirkar', tabName: 'Dr. Vivek Sir', month: 'October', dateRaw: '21/October/2026', isoDate: '2026-10-21', batchName: 'INI-CET Essentials Series', liveType: 'Youtube', workingHours: 2.0, isApp: false, isYoutube: true },

  // --- Dr. Rajesh Jambhulkar (Dr. Rajesh Sir) ---
  { id: 'wl-r1', faculty: 'Dr. Rajesh Jambhulkar', tabName: 'Dr. Rajesh Sir', month: 'April', dateRaw: '4/April/2026', isoDate: '2026-04-04', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-r2', faculty: 'Dr. Rajesh Jambhulkar', tabName: 'Dr. Rajesh Sir', month: 'April', dateRaw: '12/April/2026', isoDate: '2026-04-12', batchName: '1st YEAR: ONE SHOT SERIES', liveType: 'Youtube', workingHours: 1.0, isApp: false, isYoutube: true },
  { id: 'wl-r3', faculty: 'Dr. Rajesh Jambhulkar', tabName: 'Dr. Rajesh Sir', month: 'April', dateRaw: '17/April/2026', isoDate: '2026-04-17', batchName: 'Prarambh Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-r4', faculty: 'Dr. Rajesh Jambhulkar', tabName: 'Dr. Rajesh Sir', month: 'April', dateRaw: '25/April/2026', isoDate: '2026-04-25', batchName: 'INI-CET PYQ Series 2026', liveType: 'Youtube', workingHours: 3.0, isApp: false, isYoutube: true },

  { id: 'wl-r5', faculty: 'Dr. Rajesh Jambhulkar', tabName: 'Dr. Rajesh Sir', month: 'October', dateRaw: '15/October/2026', isoDate: '2026-10-15', batchName: 'Prarambh 2026 Batch for MBBS 1st Year', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-r6', faculty: 'Dr. Rajesh Jambhulkar', tabName: 'Dr. Rajesh Sir', month: 'October', dateRaw: '22/October/2026', isoDate: '2026-10-22', batchName: 'INI-CET Essentials Series', liveType: 'Youtube', workingHours: 2.5, isApp: false, isYoutube: true },

  // --- Dr. Siraj Ahmad (Dr. Siraj Sir) ---
  { id: 'wl-s1', faculty: 'Dr. Siraj Ahmad', tabName: 'Dr. Siraj Sir', month: 'April', dateRaw: '5/April/2026', isoDate: '2026-04-05', batchName: 'Sushruta Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-s2', faculty: 'Dr. Siraj Ahmad', tabName: 'Dr. Siraj Sir', month: 'April', dateRaw: '14/April/2026', isoDate: '2026-04-14', batchName: 'FMGE Express Revision Series', liveType: 'Youtube', workingHours: 2.5, isApp: false, isYoutube: true },
  { id: 'wl-s3', faculty: 'Dr. Siraj Ahmad', tabName: 'Dr. Siraj Sir', month: 'October', dateRaw: '17/October/2026', isoDate: '2026-10-17', batchName: 'Sushruta 2026 Batch for MBBS 3rd Year', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-s4', faculty: 'Dr. Siraj Ahmad', tabName: 'Dr. Siraj Sir', month: 'October', dateRaw: '24/October/2026', isoDate: '2026-10-24', batchName: 'FMGE Express Revision Series', liveType: 'Youtube', workingHours: 2.0, isApp: false, isYoutube: true },

  // --- Dr. Ranjith AR (Dr. Ranjith Sir) ---
  { id: 'wl-rj1', faculty: 'Dr. Ranjith AR', tabName: 'Dr. Ranjith Sir', month: 'April', dateRaw: '8/April/2026', isoDate: '2026-04-08', batchName: 'Sushruta Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-rj2', faculty: 'Dr. Ranjith AR', tabName: 'Dr. Ranjith Sir', month: 'April', dateRaw: '19/April/2026', isoDate: '2026-04-19', batchName: 'INI-CET PYQ Series 2026', liveType: 'Youtube', workingHours: 3.0, isApp: false, isYoutube: true },
  { id: 'wl-rj3', faculty: 'Dr. Ranjith AR', tabName: 'Dr. Ranjith Sir', month: 'October', dateRaw: '18/October/2026', isoDate: '2026-10-18', batchName: 'Sushruta 2026 Batch for MBBS 3rd Year', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-rj4', faculty: 'Dr. Ranjith AR', tabName: 'Dr. Ranjith Sir', month: 'October', dateRaw: '25/October/2026', isoDate: '2026-10-25', batchName: 'FMGE Express Revision Series', liveType: 'Youtube', workingHours: 2.5, isApp: false, isYoutube: true },

  // --- Dr. Anusha (Dr. Anusha Ma'am) ---
  { id: 'wl-a1', faculty: 'Dr. Anusha', tabName: "Dr. Anusha Ma'am", month: 'April', dateRaw: '10/April/2026', isoDate: '2026-04-10', batchName: 'Sushruta Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-a2', faculty: 'Dr. Anusha', tabName: "Dr. Anusha Ma'am", month: 'April', dateRaw: '20/April/2026', isoDate: '2026-04-20', batchName: 'FMGE Express Revision Series', liveType: 'Youtube', workingHours: 2.0, isApp: false, isYoutube: true },
  { id: 'wl-a3', faculty: 'Dr. Anusha', tabName: "Dr. Anusha Ma'am", month: 'October', dateRaw: '20/October/2026', isoDate: '2026-10-20', batchName: 'Sushruta 2026 Batch for MBBS 3rd Year', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },

  // --- Dr. Sudha (Dr. Sudha Ma'am) ---
  { id: 'wl-su1', faculty: 'Dr. Sudha', tabName: "Dr. Sudha Ma'am", month: 'April', dateRaw: '13/April/2026', isoDate: '2026-04-13', batchName: 'Sushruta Batch', liveType: 'App', workingHours: 1.5, isApp: true, isYoutube: false },
  { id: 'wl-su2', faculty: 'Dr. Sudha', tabName: "Dr. Sudha Ma'am", month: 'October', dateRaw: '23/October/2026', isoDate: '2026-10-23', batchName: 'Sushruta 2026 Batch for MBBS 3rd Year', liveType: 'App', workingHours: 1.5, isApp: true, isYoutube: false },

  // --- Dr. Sanchit (Dr. Sanchit Sir) ---
  { id: 'wl-sc1', faculty: 'Dr. Sanchit', tabName: 'Dr. Sanchit Sir', month: 'April', dateRaw: '15/April/2026', isoDate: '2026-04-15', batchName: 'Sushruta Batch', liveType: 'App', workingHours: 2.0, isApp: true, isYoutube: false },
  { id: 'wl-sc2', faculty: 'Dr. Sanchit', tabName: 'Dr. Sanchit Sir', month: 'April', dateRaw: '26/April/2026', isoDate: '2026-04-26', batchName: 'FMGE Express Revision Series', liveType: 'Youtube', workingHours: 2.5, isApp: false, isYoutube: true },
  { id: 'wl-sc3', faculty: 'Dr. Sanchit', tabName: 'Dr. Sanchit Sir', month: 'October', dateRaw: '26/October/2026', isoDate: '2026-10-26', batchName: 'INI-CET Essentials Series', liveType: 'Youtube', workingHours: 2.0, isApp: false, isYoutube: true }
];

const WORKLOAD_STORAGE_KEY = 'meded_faculty_workload_records';

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
          if (Array.isArray(parsed) && parsed.length > 0) {
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

  getAllEntries() {
    return this.entries;
  }

  getFilteredEntries({ month = 'all', platform = 'all', faculty = 'all', batch = 'all', search = '' } = {}) {
    return this.entries.filter(e => {
      // Month Filter
      if (month && month !== 'all' && e.month) {
        if (e.month.toLowerCase() !== month.toLowerCase()) return false;
      }

      // Platform Filter (App vs Youtube)
      if (platform && platform !== 'all') {
        if (platform === 'app' && !e.isApp) return false;
        if (platform === 'youtube' && !e.isYoutube) return false;
      }

      // Faculty Filter
      if (faculty && faculty !== 'all') {
        if (!e.faculty.toLowerCase().includes(faculty.toLowerCase()) && !e.tabName.toLowerCase().includes(faculty.toLowerCase())) {
          return false;
        }
      }

      // Batch Filter
      if (batch && batch !== 'all') {
        if (!e.batchName.toLowerCase().includes(batch.toLowerCase())) return false;
      }

      // Search Query
      if (search) {
        const q = search.toLowerCase();
        const haystack = [e.faculty, e.tabName, e.batchName, e.month, e.liveType, e.dateRaw].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
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
          batches: new Set(),
          months: new Set()
        };
      }

      const hrs = Number(e.workingHours) || 0;
      facultyMap[facName].totalHours += hrs;
      facultyMap[facName].totalSessions += 1;

      if (e.isApp || (e.liveType && e.liveType.toLowerCase() === 'app')) {
        facultyMap[facName].appHours += hrs;
        facultyMap[facName].appSessions += 1;
      }
      if (e.isYoutube || (e.liveType && e.liveType.toLowerCase() === 'youtube')) {
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
      if (e.isApp || (e.liveType && e.liveType.toLowerCase() === 'app')) appHours += hrs;
      if (e.isYoutube || (e.liveType && e.liveType.toLowerCase() === 'youtube')) youtubeHours += hrs;
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
    const months = new Set();
    this.entries.forEach(e => {
      if (e.month) months.add(e.month);
    });
    return Array.from(months);
  }

  getAvailableBatches() {
    const batches = new Set();
    this.entries.forEach(e => {
      if (e.batchName) batches.add(e.batchName);
    });
    return Array.from(batches);
  }

  getAvailableFaculty() {
    const facs = new Set();
    this.entries.forEach(e => {
      if (e.faculty) facs.add(e.faculty);
    });
    return Array.from(facs);
  }
}

export function cleanFacultyTabName(tabName = '') {
  if (!tabName) return 'Faculty Doctor';
  let clean = tabName.trim();
  clean = clean.replace(/\s+Sir$/i, '').replace(/\s+Ma'am$/i, '').replace(/\s+Maam$/i, '');
  if (!clean.startsWith('Dr.') && !clean.startsWith('Prof.')) {
    clean = 'Dr. ' + clean;
  }
  return clean;
}

export function parseWorkloadCSV(csvText, tabName) {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  let headerIdx = -1;
  let headers = [];

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (line.toLowerCase().includes('month') && (line.toLowerCase().includes('working hours') || line.toLowerCase().includes('date'))) {
      headerIdx = i;
      headers = line.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      break;
    }
  }

  let monthCol = 0;
  let dateCol = 1;
  let batchCol = 2;
  let liveTypeCol = 8;
  let workingHoursCol = 10;

  if (headerIdx !== -1) {
    headers.forEach((h, idx) => {
      const lower = h.toLowerCase();
      if (lower === 'month') monthCol = idx;
      else if (lower === 'date') dateCol = idx;
      else if (lower.includes('batch')) batchCol = idx;
      else if (lower.includes('live type') || lower.includes('platform')) liveTypeCol = idx;
      else if (lower.includes('working hours') || lower.includes('hours')) workingHoursCol = idx;
    });
  }

  const entries = [];
  const startRow = headerIdx !== -1 ? headerIdx + 1 : 1;

  for (let i = startRow; i < lines.length; i++) {
    const rowStr = lines[i].trim();
    if (!rowStr) continue;

    const cols = rowStr.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const month = cols[monthCol] || '';
    const dateRaw = cols[dateCol] || '';
    const batchName = cols[batchCol] || '';
    const liveType = cols[liveTypeCol] || '';
    const hoursStr = cols[workingHoursCol] || '0';
    const hours = parseFloat(hoursStr) || 0;

    if (!month && !dateRaw && hours === 0) continue;

    const isYt = liveType.toLowerCase().includes('youtube') || liveType.toLowerCase().includes('yt');
    const isApp = liveType.toLowerCase().includes('app') || (!isYt && liveType.length > 0);

    entries.push({
      id: `wl-parsed-${tabName}-${i}`,
      tabName: tabName,
      faculty: cleanFacultyTabName(tabName),
      month: month || 'Unspecified',
      dateRaw: dateRaw,
      batchName: batchName || 'Standard Lecture',
      liveType: liveType || (isYt ? 'Youtube' : 'App'),
      workingHours: hours,
      isApp: isApp,
      isYoutube: isYt
    });
  }

  return entries;
}
