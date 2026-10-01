import fs from 'fs';
import { DEFAULT_WORKLOAD_ENTRIES, WorkloadManager, parseWorkloadCSV } from '../js/workloadData.js';

function parseCSVStateMachine(text) {
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
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
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

const targetFacultyNames = [
  'Pradeep', 'Vivek', 'Siraj', 'Anusha', 'Manjunath', 'Era', 
  'Prassan', 'Santhosh', 'Sandeep', 'Divya', 'Jazeer', 'Ichita'
];

const summary = JSON.parse(fs.readFileSync('all_tabs_summary.json', 'utf-8'));

console.log('=== Comparing DEFAULT_WORKLOAD_ENTRIES vs RAW CSV for Target Faculty ===');

// Build map of DEFAULT entries by faculty and month
const defaultStats = {};
DEFAULT_WORKLOAD_ENTRIES.forEach(e => {
  const fac = e.faculty || e.tabName;
  const m = e.month;
  if (!defaultStats[fac]) defaultStats[fac] = {};
  if (!defaultStats[fac][m]) defaultStats[fac][m] = { hours: 0, sessions: 0, appHours: 0, ytHours: 0, cancels: 0, rescheds: 0 };
  const hrs = Number(e.workingHours) || 0;
  defaultStats[fac][m].hours += hrs;
  defaultStats[fac][m].sessions += 1;
  if (e.isApp) defaultStats[fac][m].appHours += hrs;
  if (e.isYoutube) defaultStats[fac][m].ytHours += hrs;
  if (e.isCancel) defaultStats[fac][m].cancels += 1;
  if (e.isResched) defaultStats[fac][m].rescheds += 1;
});

for (const [tabName, tabInfo] of Object.entries(summary)) {
  const isTarget = targetFacultyNames.some(tf => tabName.toLowerCase().includes(tf.toLowerCase()));
  if (!isTarget) continue;

  const file = `raw_tab_${tabInfo.gid}.csv`;
  if (!fs.existsSync(file)) continue;

  const raw = fs.readFileSync(file, 'utf-8');
  const rows = parseCSVStateMachine(raw);

  let headerRowIdx = -1;
  let headers = [];
  for (let i = 0; i < Math.min(6, rows.length); i++) {
    const r = rows[i];
    if (r.some(c => /month/i.test(c) || /^1$/i.test(c) || /date/i.test(c))) {
      headerRowIdx = i;
      headers = r;
      break;
    }
  }

  let monthCol = -1, dateCol = -1, batchCol = -1, liveTypeCol = -1, hoursCol = -1, cancelCol = -1, reschedCol = -1;
  headers.forEach((h, idx) => {
    const lower = h.toLowerCase();
    if (lower === 'month' || lower === '1' || lower === 'months') monthCol = idx;
    else if (lower === 'date' || lower === 'dates') dateCol = idx;
    else if (lower.includes('batch')) batchCol = idx;
    else if (lower.includes('live type') || lower.includes('platform') || lower === 'type') liveTypeCol = idx;
    else if (lower.includes('working hours') || lower === 'hours' || lower === 'working hour') hoursCol = idx;
    else if (lower.includes('class cancel') || lower === 'cancel' || lower === 'cancelled') cancelCol = idx;
    else if (lower.includes('reschedule') || lower === 'reschedule class') reschedCol = idx;
  });

  if (monthCol === -1) monthCol = 0;
  if (dateCol === -1) dateCol = 1;
  if (batchCol === -1) batchCol = 2;
  if (cancelCol === -1) cancelCol = 7;
  if (reschedCol === -1) reschedCol = 6;
  if (liveTypeCol === -1) liveTypeCol = 8;
  if (hoursCol === -1) hoursCol = 10;

  let currentMonth = '';
  const sheetStats = {};

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 2 || cols.every(c => !c)) continue;

    const rawMonth = cols[monthCol] || '';
    if (rawMonth && !/total|sum|average|note/i.test(rawMonth)) currentMonth = rawMonth;

    const rawDate = cols[dateCol] || '';
    const rawBatch = cols[batchCol] || '';
    const rawLiveType = cols[liveTypeCol] || '';
    const rawHours = cols[hoursCol] || '';
    const rawCancel = cols[cancelCol] || '';
    const rawResched = cols[reschedCol] || '';

    if (/total|sum|average/i.test(rawMonth) || /total|sum|average/i.test(rawDate) || /total|sum|average/i.test(rawBatch)) continue;

    let monthName = currentMonth;
    if (rawDate) {
      const match = rawDate.match(/(\d{1,2})[\/\-\.]([A-Za-z]+)[\/\-\.](\d{2,4})/);
      if (match) monthName = match[2];
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

    let normMonth = monthName;
    const cleanM = monthName.replace(/202[0-9]/g, '').trim().toLowerCase();
    if (map[cleanM]) normMonth = map[cleanM];

    if (!normMonth && !rawDate && !rawBatch) continue;

    const hours = parseFloat(rawHours) || 0;
    const isCancel = rawCancel.toUpperCase() === 'TRUE';
    const isResched = rawResched.toUpperCase() === 'TRUE';
    const isYt = /youtube|yt/i.test(rawLiveType) || /youtube/i.test(rawBatch);
    const isApp = /app/i.test(rawLiveType) || (!isYt && rawLiveType.length > 0) || (!isYt && !rawLiveType && hours > 0);

    const mKey = normMonth || 'Unknown';
    if (!sheetStats[mKey]) sheetStats[mKey] = { hours: 0, sessions: 0, appHours: 0, ytHours: 0, cancels: 0, rescheds: 0 };
    sheetStats[mKey].hours += hours;
    sheetStats[mKey].sessions += 1;
    if (isApp) sheetStats[mKey].appHours += hours;
    if (isYt) sheetStats[mKey].ytHours += hours;
    if (isCancel) sheetStats[mKey].cancels += 1;
    if (isResched) sheetStats[mKey].rescheds += 1;
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`Faculty: ${tabName}`);
  
  // Find matching default faculty key
  const defaultFacKey = Object.keys(defaultStats).find(k => k.toLowerCase().includes(tabName.toLowerCase().replace(/dr\.\s*/i, '').trim())) || tabName;
  const defMStats = defaultStats[defaultFacKey] || {};

  const allMonths = Array.from(new Set([...Object.keys(sheetStats), ...Object.keys(defMStats)]));
  for (const m of allMonths) {
    const s = sheetStats[m] || { hours: 0, sessions: 0 };
    const d = defMStats[m] || { hours: 0, sessions: 0 };
    const match = (Math.abs(s.hours - d.hours) < 0.01 && s.sessions === d.sessions);
    const status = match ? '✓ MATCH' : '❌ MISMATCH';
    console.log(`  ${m.padEnd(10)}: Sheet=[${s.hours.toFixed(1)}h, ${s.sessions}s] | Default=[${d.hours.toFixed(1)}h, ${d.sessions}s] -> ${status}`);
  }
}
