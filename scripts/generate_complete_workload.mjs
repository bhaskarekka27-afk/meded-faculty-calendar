import fs from 'fs';

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

export function cleanFacultyTabName(tabName = '') {
  if (!tabName) return 'Faculty Doctor';
  let clean = tabName.trim();
  clean = clean.replace(/\s+Sir$/i, '').replace(/\s+Ma'am$/i, '').replace(/\s+Maam$/i, '');
  if (!clean.startsWith('Dr.') && !clean.startsWith('Prof.')) {
    clean = 'Dr. ' + clean;
  }
  return clean;
}

export function normalizeMonth(monthName = '', dateRaw = '') {
  let m = (monthName || '').trim();
  if (dateRaw) {
    const match = dateRaw.match(/(\d{1,2})[\/\-\.]([A-Za-z]+)[\/\-\.](\d{2,4})/);
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

export function parseTabCSV(csvText, tabName, gid = '') {
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

    // Ignore summary footer rows or notes
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
      const dateMatch = rawDate.match(/(\d{1,2})[\/\-\.]([A-Za-z]+)[\/\-\.](\d{2,4})/);
      if (dateMatch) {
        const monthMap = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12', jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const mNum = monthMap[dateMatch[2].toLowerCase()] || '05';
        const yNum = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
        isoDate = `${yNum}-${mNum}-${dateMatch[1].padStart(2, '0')}`;
      }
    }

    entries.push({
      id: `wl-${gid || tabName}-${i}`,
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

async function run() {
  const summary = JSON.parse(fs.readFileSync('all_tabs_summary.json', 'utf-8'));
  const allEntries = [];

  console.log('Generating complete workload entries for all tabs...');
  for (const [tabName, tabInfo] of Object.entries(summary)) {
    const file = `raw_tab_${tabInfo.gid}.csv`;
    if (!fs.existsSync(file)) {
      console.warn(`File missing for ${tabName}: ${file}`);
      continue;
    }
    const raw = fs.readFileSync(file, 'utf-8');
    const entries = parseTabCSV(raw, tabName, tabInfo.gid);
    console.log(`Tab: ${tabName.padEnd(28)} | GID: ${tabInfo.gid} | Entries: ${entries.length}`);
    allEntries.push(...entries);
  }

  console.log(`\nTotal generated entries across all tabs: ${allEntries.length}`);

  // Save entries json
  fs.writeFileSync('workload_complete_entries.json', JSON.stringify(allEntries, null, 2), 'utf-8');
  console.log('Saved workload_complete_entries.json');
}

run();
