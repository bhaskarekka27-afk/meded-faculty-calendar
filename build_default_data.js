import fs from 'fs';
import https from 'https';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(get(res.headers.location));
      }
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

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
  if (!dateStr) return { isoDate: null, dayName: '', monthName: '', dayNumber: null, year: 2026 };
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

function parseTimings(timingsStr) {
  if (!timingsStr) return { start: '', end: '', startHour: 19, durationMinutes: 120 };
  const parts = timingsStr.split(/to|-/i).map(s => s.trim());
  let start = parts[0] || '';
  let end = parts[1] || '';
  
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

function processAppBatchFile(filename, id, defaultUrl, defaultGid) {
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
      faculty: isHoliday ? '' : facultyStr,
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
      displayTitle,
      platform: 'app',
      isYoutube: false,
      isApp: true
    });
  }
  
  return {
    id,
    name: batchName,
    subtitle,
    sourceUrl: defaultUrl,
    gid: defaultGid,
    sheetTabName: 'Lecture Planner',
    platform: 'app',
    isYoutube: false,
    isApp: true,
    lastSynced: new Date().toISOString(),
    eventCount: events.length,
    events
  };
}

function processYTBatchCSV(content, id, name, subtitle, defaultUrl, defaultGid, tabName) {
  const rows = parseCSV(content);
  const events = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(c => !c.trim())) continue;

    const dateStr = (r[0] || '').trim();
    const facultyStr = (r[1] || '').trim();
    const subjectOrTopicStr = (r[2] || '').trim();
    const timingsStr = (r[3] || '').trim();

    if (!dateStr && !facultyStr && !subjectOrTopicStr) continue;

    const parsedDate = parseDate(dateStr);
    const parsedTiming = parseTimings(timingsStr);

    const isCoolOff = facultyStr.toUpperCase().includes('COOL OFF') || dateStr.toUpperCase().includes('COOL OFF');
    const isHoliday = facultyStr.toLowerCase().includes('holiday') || 
                      facultyStr.toLowerCase().includes('jayanti') || 
                      (dateStr && !facultyStr && !subjectOrTopicStr) ||
                      (!subjectOrTopicStr && !timingsStr && facultyStr);

    let eventType = 'class';
    let displayTitle = '';
    let cleanSubject = subjectOrTopicStr;
    let cleanChapter = subjectOrTopicStr;
    let cleanTopic = subjectOrTopicStr;

    if (isCoolOff) {
      eventType = 'cool_off';
      displayTitle = 'COOL OFF';
      cleanSubject = '';
      cleanChapter = '';
      cleanTopic = '';
    } else if (isHoliday) {
      eventType = 'holiday';
      displayTitle = facultyStr || 'Official Holiday';
      cleanSubject = '';
      cleanChapter = '';
      cleanTopic = '';
    } else {
      if (subjectOrTopicStr.toLowerCase().includes('session part') || subjectOrTopicStr.toLowerCase().includes('session')) {
        const subMatch = subjectOrTopicStr.match(/^(.*?)\s+session/i);
        if (subMatch && subMatch[1]) {
          cleanSubject = subMatch[1].trim();
          if (cleanSubject.toUpperCase() === 'PSM') cleanSubject = 'Community Medicine';
        }
        cleanChapter = subjectOrTopicStr;
        cleanTopic = `${subjectOrTopicStr} • High Yield Rapid Revision`;
      } else {
        cleanChapter = `${subjectOrTopicStr} Essentials`;
        cleanTopic = `${subjectOrTopicStr} • High Yield 50 Questions Discussion`;
      }
      displayTitle = cleanTopic;
    }

    const durationText = parsedTiming.durationMinutes 
      ? `${parsedTiming.durationMinutes >= 60 ? Math.round(parsedTiming.durationMinutes / 60) : parsedTiming.durationMinutes} ${parsedTiming.durationMinutes >= 60 ? 'Hours' : 'Mins'}` 
      : '2 Hours';

    events.push({
      id: `${id}_ev_${i}`,
      batchId: id,
      batchName: name,
      rowIndex: i + 1,
      dateRaw: dateStr,
      isoDate: parsedDate.isoDate,
      dayName: parsedDate.dayName,
      monthName: parsedDate.monthName,
      dayNumber: parsedDate.dayNumber,
      year: parsedDate.year,
      faculty: isHoliday ? '' : facultyStr,
      subject: cleanSubject,
      chapter: cleanChapter,
      topic: cleanTopic,
      noLectures: '1',
      duration: durationText,
      durationMinutes: parsedTiming.durationMinutes,
      timings: timingsStr || (parsedTiming.start ? `${parsedTiming.start} to ${parsedTiming.end}` : '5:00 PM Onwards'),
      startTime: parsedTiming.start,
      endTime: parsedTiming.end,
      startHour: parsedTiming.startHour,
      eventType,
      displayTitle,
      platform: 'youtube_app',
      isYoutube: true,
      isApp: true
    });
  }

  return {
    id,
    name,
    subtitle,
    sourceUrl: defaultUrl,
    gid: defaultGid,
    sheetTabName: tabName,
    platform: 'youtube_app',
    isYoutube: true,
    isApp: true,
    lastSynced: new Date().toISOString(),
    eventCount: events.length,
    events
  };
}

async function buildAll() {
  console.log('Building default batches data...');

  const batch1 = processAppBatchFile(
    'sheet1_planner.csv',
    'batch-prarambh-2026',
    'https://docs.google.com/spreadsheets/d/1o2lcDhROx_alTy2zm2he5b7xSPsnk6UdzxzmTWA5_40/edit?gid=883157297#gid=883157297',
    '883157297'
  );

  const batch2 = processAppBatchFile(
    'sheet2_planner.csv',
    'batch-sushruta-2026',
    'https://docs.google.com/spreadsheets/d/1ccYTSQgcGdEEq0Jlaxw3Kt-ScB4O-XLJg4LNQCmJvUU/edit?gid=1107483760#gid=1107483760',
    '1107483760'
  );

  // Fetch or read sheet 3 (INICET)
  let sheet3Content = '';
  try {
    sheet3Content = await get('https://docs.google.com/spreadsheets/d/1aCO-QvwVi2xIVB_kJWroM6Zv7vvI3MPOksDctjQAzYU/gviz/tq?tqx=out:csv&gid=0');
    fs.writeFileSync('sheet3_inicet.csv', sheet3Content, 'utf-8');
  } catch (err) {
    console.warn('Network fetch failed for INICET, reading fallback local:', err);
    if (fs.existsSync('sheet3_inicet.csv')) {
      sheet3Content = fs.readFileSync('sheet3_inicet.csv', 'utf-8');
    }
  }

  // Fetch or read sheet 4 (FMGE)
  let sheet4Content = '';
  try {
    sheet4Content = await get('https://docs.google.com/spreadsheets/d/1nsVXeu3Jn8sroOeGB5diOLMvQ7jdbt89hkU7-wdAOSE/gviz/tq?tqx=out:csv&gid=202319046');
    fs.writeFileSync('sheet4_fmge.csv', sheet4Content, 'utf-8');
  } catch (err) {
    console.warn('Network fetch failed for FMGE, reading fallback local:', err);
    if (fs.existsSync('sheet4_fmge.csv')) {
      sheet4Content = fs.readFileSync('sheet4_fmge.csv', 'utf-8');
    }
  }

  const batch3 = processYTBatchCSV(
    sheet3Content,
    'batch-inicet-essentials-2026',
    'INI-CET Essentials Series',
    'Live On YT Channel & MedEd App',
    'https://docs.google.com/spreadsheets/d/1aCO-QvwVi2xIVB_kJWroM6Zv7vvI3MPOksDctjQAzYU/edit?gid=0#gid=0',
    '0',
    'INICET Planner'
  );

  const batch4 = processYTBatchCSV(
    sheet4Content,
    'batch-fmge-express-2026',
    'FMGE Express Revision Series',
    'Live On YT Channel & MedEd App',
    'https://docs.google.com/spreadsheets/d/1nsVXeu3Jn8sroOeGB5diOLMvQ7jdbt89hkU7-wdAOSE/edit?gid=202319046#gid=202319046',
    '202319046',
    'FMGE Express Revision Planner'
  );

  const batches = [batch1, batch2, batch3, batch4];

  const output = `// Auto-generated pre-bundled batch data for offline & instant loading
export const DEFAULT_BATCHES = ${JSON.stringify(batches, null, 2)};
`;

  fs.writeFileSync('js/defaultData.js', output, 'utf-8');
  console.log(`Successfully generated js/defaultData.js with ${batches.length} batches!`);
  batches.forEach((b, idx) => {
    console.log(`Batch ${idx + 1}: [${b.id}] "${b.name}" -> ${b.events.length} events (Platform: ${b.platform})`);
  });
}

buildAll().catch(console.error);
