import fs from 'fs';

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

const summary = JSON.parse(fs.readFileSync('all_tabs_summary.json', 'utf-8'));

for (const [tabName, tabInfo] of Object.entries(summary)) {
  const file = `raw_tab_${tabInfo.gid}.csv`;
  if (!fs.existsSync(file)) continue;

  const raw = fs.readFileSync(file, 'utf-8');
  const rows = parseCSVStateMachine(raw);

  console.log(`\n======================================================`);
  console.log(`Faculty: ${tabName} (GID: ${tabInfo.gid}, Rows: ${rows.length})`);
  
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

  if (monthCol === -1) monthCol = 0;
  if (dateCol === -1) dateCol = 1;
  if (batchCol === -1) batchCol = 2;
  if (cancelCol === -1) cancelCol = 7;
  if (reschedCol === -1) reschedCol = 6;
  if (liveTypeCol === -1) liveTypeCol = 8;
  if (hoursCol === -1) hoursCol = 10;

  let currentMonth = '';
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
    const rawReason = reasonCol !== -1 ? (cols[reasonCol] || '') : '';

    console.log(`  Row ${i.toString().padStart(2, ' ')}: [M: ${(rawMonth || currentMonth).padEnd(9)}] [Date: ${rawDate.padEnd(14)}] [Batch: ${rawBatch.slice(0, 25).padEnd(25)}] [Type: ${rawLiveType.padEnd(8)}] [Hrs: ${rawHours.padStart(4)}] [Cancel: ${rawCancel.padEnd(5)}] [Resched: ${rawResched.padEnd(5)}] [Reason: ${rawReason}]`);
  }
}
