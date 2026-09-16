const fs = require('fs');

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

function parseDate(dateStr) {
  if (!dateStr) return { isoDate: null, dayName: '', monthName: '', year: null };
  // e.g. "Thursday, October 15, 2026"
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
  return { isoDate: null, dayName, monthName: '', year };
}

function parseTimings(timingsStr) {
  if (!timingsStr) return { start: '', end: '', startHour: 19, durationMinutes: 120 };
  // e.g. "7:00pm to 9:00pm", "6:30pm to 9:00pm", "7:00pm to 8:30pm"
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

function processBatchFile(filename, id, defaultUrl, defaultGid) {
  const content = fs.readFileSync(filename, 'utf-8');
  const rows = parseCSV(content);
  const header = rows[0] || [];
  const rawBatchHeader = header[0] || '';
  
  let batchName = rawBatchHeader;
  let subtitle = 'Live on PW MedEd APP';
  if (rawBatchHeader.includes('Live on PW')) {
    const split = rawBatchHeader.split(/Live on PW/i);
    batchName = split[0].trim();
  }
  
  const events = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(cell => !cell.trim())) continue;
    
    const dateStr = (r[0] || '').trim();
    const facultyStr = (r[1] || '').trim();
    const subjectStr = (r[2] || '').trim();
    const chapterStr = (r[3] || '').trim();
    const topicStr = (r[4] || '').trim();
    const noLectures = (r[5] || '').trim();
    const durationStr = (r[6] || '').trim();
    const timingsStr = (r[7] || '').trim();
    
    const parsedDate = parseDate(dateStr);
    const parsedTiming = parseTimings(timingsStr);
    
    const isCoolOff = facultyStr.toUpperCase().includes('COOL OFF') || dateStr.toUpperCase().includes('COOL OFF');
    const isHoliday = facultyStr.toLowerCase().includes('holiday') || (dateStr && !facultyStr && !subjectStr);
    
    let eventType = 'class';
    let displayTitle = topicStr || chapterStr;
    if (isCoolOff) {
      eventType = 'cool_off';
      displayTitle = 'COOL OFF';
    } else if (isHoliday) {
      eventType = 'holiday';
      displayTitle = facultyStr || 'Holiday';
    }
    
    events.push({
      id: `${id}_ev_${i}`,
      batchId: id,
      batchName,
      rowIndex: i + 1,
      dateRaw: dateStr,
      isoDate: parsedDate.isoDate,
      dayName: parsedDate.dayName,
      monthName: parsedDate.monthName,
      dayNumber: parsedDate.dayNumber,
      year: parsedDate.year,
      faculty: facultyStr,
      subject: subjectStr,
      chapter: chapterStr,
      topic: topicStr,
      noLectures: noLectures || '1',
      duration: durationStr || (parsedTiming.durationMinutes ? `${parsedTiming.durationMinutes / 60} Hours` : '2 Hours'),
      durationMinutes: parsedTiming.durationMinutes,
      timings: timingsStr,
      startTime: parsedTiming.start,
      endTime: parsedTiming.end,
      startHour: parsedTiming.startHour,
      eventType,
      displayTitle
    });
  }
  
  return {
    id,
    name: batchName,
    subtitle,
    sourceUrl: defaultUrl,
    gid: defaultGid,
    sheetTabName: 'Lecture Planner',
    lastSynced: new Date().toISOString(),
    eventCount: events.length,
    events
  };
}

const batch1 = processBatchFile(
  'sheet1_planner.csv',
  'batch-prarambh-2026',
  'https://docs.google.com/spreadsheets/d/1o2lcDhROx_alTy2zm2he5b7xSPsnk6UdzxzmTWA5_40/edit?gid=883157297#gid=883157297',
  '883157297'
);

const batch2 = processBatchFile(
  'sheet2_planner.csv',
  'batch-sushruta-2026',
  'https://docs.google.com/spreadsheets/d/1ccYTSQgcGdEEq0Jlaxw3Kt-ScB4O-XLJg4LNQCmJvUU/edit?gid=1107483760#gid=1107483760',
  '1107483760'
);

const output = `// Auto-generated pre-bundled batch data for offline & instant loading
export const DEFAULT_BATCHES = ${JSON.stringify([batch1, batch2], null, 2)};
`;

fs.writeFileSync('js/defaultData.js', output, 'utf-8');
console.log('Successfully generated js/defaultData.js with 2 batches!');
console.log('Batch 1 events:', batch1.events.length, batch1.name);
console.log('Batch 2 events:', batch2.events.length, batch2.name);
