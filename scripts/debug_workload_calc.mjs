import fs from 'fs';

function parseCSV(text) {
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

console.log('=== Checking Target Faculty Tab Structures & Monthly Calculations ===');

for (const [tabName, tabInfo] of Object.entries(summary)) {
  const isTarget = targetFacultyNames.some(tf => tabName.toLowerCase().includes(tf.toLowerCase()));
  if (!isTarget) continue;

  const file = `raw_tab_${tabInfo.gid}.csv`;
  if (!fs.existsSync(file)) {
    console.log(`Missing file for ${tabName}: ${file}`);
    continue;
  }

  const raw = fs.readFileSync(file, 'utf-8');
  const rows = parseCSV(raw);

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

  // Find column indices
  let monthCol = -1, dateCol = -1, batchCol = -1, liveTypeCol = -1, hoursCol = -1, cancelCol = -1, reschedCol = -1, reasonCol = -1;
  headers.forEach((h, idx) => {
    const lower = h.toLowerCase();
    if (lower === 'month' || lower === '1' || lower === 'months') monthCol = idx;
    else if (lower === 'date' || lower === 'dates') dateCol = idx;
    else if (lower.includes('batch')) batchCol = idx;
    else if (lower.includes('live type') || lower.includes('platform') || lower === 'type') liveTypeCol = idx;
    else if (lower.includes('working hours') || lower === 'hours' || lower === 'working hour') hoursCol = idx;
    else if (lower.includes('class cancel') || lower === 'cancel' || lower === 'cancelled') cancelCol = idx;
    else if (lower.includes('reschedule') || lower === 'reschedule class') reschedCol = idx;
    else if (lower.includes('reason')) reasonCol = idx;
  });

  // Fallback default indices if header not fully matching
  if (monthCol === -1) monthCol = 0;
  if (dateCol === -1) dateCol = 1;
  if (batchCol === -1) batchCol = 2;
  if (cancelCol === -1) cancelCol = 7;
  if (reschedCol === -1) reschedCol = 6;
  if (liveTypeCol === -1) liveTypeCol = 8;
  if (hoursCol === -1) hoursCol = 10;

  console.log(`\n======================================================`);
  console.log(`Faculty: ${tabName} (GID: ${tabInfo.gid})`);
  console.log(`Header L${headerRowIdx}: month=${monthCol}, date=${dateCol}, batch=${batchCol}, liveType=${liveTypeCol}, hours=${hoursCol}, cancel=${cancelCol}, resched=${reschedCol}`);

  let currentMonth = '';
  const monthlyStats = {};

  for (let i = headerRowIdx + 1; i < rows.length; i++) {
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

    // If date or batch is missing, check if it's a summary row
    if (/total|sum|average/i.test(rawMonth) || /total|sum|average/i.test(rawDate) || /total|sum|average/i.test(rawBatch)) {
      console.log(`  [Skipped Summary Row L${i}]: ${cols.filter(Boolean).join(' | ')}`);
      continue;
    }

    // Determine month: from currentMonth or from rawDate
    let monthName = currentMonth;
    if (rawDate) {
      const match = rawDate.match(/(\d{1,2})[\/\-\.]([A-Za-z]+)[\/\-\.](\d{2,4})/);
      if (match) {
        monthName = match[2];
      }
    }

    // Normalize Month Name
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
    if (!monthlyStats[mKey]) {
      monthlyStats[mKey] = {
        totalHours: 0,
        appHours: 0,
        ytHours: 0,
        sessions: 0,
        cancels: 0,
        reschedules: 0,
        details: []
      };
    }

    monthlyStats[mKey].totalHours += hours;
    if (isApp) monthlyStats[mKey].appHours += hours;
    if (isYt) monthlyStats[mKey].ytHours += hours;
    monthlyStats[mKey].sessions += 1;
    if (isCancel) monthlyStats[mKey].cancels += 1;
    if (isResched) monthlyStats[mKey].reschedules += 1;
    monthlyStats[mKey].details.push({
      row: i,
      date: rawDate,
      batch: rawBatch,
      liveType: rawLiveType,
      hours: hours,
      isCancel,
      isResched
    });
  }

  console.log(`Monthly stats for ${tabName}:`);
  for (const [m, s] of Object.entries(monthlyStats)) {
    console.log(`  - ${m.padEnd(10)}: Total=${s.totalHours.toFixed(1)}h | App=${s.appHours.toFixed(1)}h | YT=${s.ytHours.toFixed(1)}h | Sessions=${s.sessions} | Cancel=${s.cancels} | Resched=${s.reschedules}`);
  }
}
