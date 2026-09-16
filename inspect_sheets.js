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

['sheet1_planner.csv', 'sheet2_planner.csv'].forEach(file => {
  console.log(`\n=================== ${file} ===================`);
  const content = fs.readFileSync(file, 'utf-8');
  const rows = parseCSV(content);
  console.log('Total rows parsed:', rows.length);
  const header = rows[0] || [];
  console.log('Header 0:', header[0]);
  console.log('Header columns:', header.slice(0, 8));
  
  // Extract Batch Name from Header 0
  // e.g. "Prarambh 2026 Batch for MBBS 1st Year Live on PW Meded APP  Lecture Planner Date & Days"
  const rawBatchHeader = header[0] || '';
  const batchMatch = rawBatchHeader.match(/^(.*?)(?:Live on PW|\s*Lecture Planner|\s*Date & Days)/i);
  const detectedBatch = batchMatch ? batchMatch[1].trim() : rawBatchHeader;
  console.log('Detected Batch Name:', detectedBatch);
  
  const events = [];
  const subjects = new Set();
  const faculties = new Set();
  
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every(cell => !cell.trim())) continue;
    
    const dateStr = (r[0] || '').trim();
    const facultyStr = (r[1] || '').trim();
    const subjectStr = (r[2] || '').trim();
    const chapterStr = (r[3] || '').trim();
    const topicStr = (r[4] || '').trim();
    const noLectures = (r[5] || '').trim();
    const duration = (r[6] || '').trim();
    const timings = (r[7] || '').trim();
    
    // Check for Cool Off / Holiday
    const isCoolOff = facultyStr.toUpperCase().includes('COOL OFF') || dateStr.toUpperCase().includes('COOL OFF');
    const isHoliday = facultyStr.toLowerCase().includes('holiday') || (!facultyStr && !subjectStr && dateStr);
    
    if (subjectStr) subjects.add(subjectStr);
    if (facultyStr && !isCoolOff && !isHoliday) faculties.add(facultyStr);
    
    events.push({
      rowIndex: i + 1,
      dateStr,
      facultyStr,
      subjectStr,
      chapterStr,
      topicStr,
      noLectures,
      duration,
      timings,
      isCoolOff,
      isHoliday
    });
  }
  
  console.log(`Total parsed events: ${events.length}`);
  console.log('Unique Subjects:', Array.from(subjects));
  console.log('Unique Faculties:', Array.from(faculties));
  console.log('First 2 events:', events.slice(0, 2));
  console.log('Last 2 events:', events.slice(-2));
});
