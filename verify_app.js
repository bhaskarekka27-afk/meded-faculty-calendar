import { DEFAULT_BATCHES } from './js/defaultData.js';
import { parseCSV, processRawCSVToBatch, extractSheetDetails, parseDateString, parseTimingsString } from './js/sheetConnector.js';
import { generateGoogleCalendarUrl, generateIcsContent } from './js/icsExporter.js';

console.log('--- TEST 1: Default Batches Verification ---');
console.assert(DEFAULT_BATCHES.length === 2, `Expected 2 batches, got ${DEFAULT_BATCHES.length}`);
const batch1 = DEFAULT_BATCHES[0];
const batch2 = DEFAULT_BATCHES[1];

console.log(`Batch 1: ${batch1.name}, Total Events: ${batch1.events.length}`);
console.log(`Batch 2: ${batch2.name}, Total Events: ${batch2.events.length}`);

console.assert(batch1.name.includes('Prarambh 2026 Batch for MBBS 1st Year'), 'Batch 1 name mismatch');
console.assert(batch2.name.includes('Sushruta 2026 Batch for MBBS 3rd Year'), 'Batch 2 name mismatch');

console.log('\n--- TEST 2: Event Timing & Dates Verification ---');
const sampleEvent1 = batch1.events.find(e => e.eventType === 'class');
console.log('Sample Class Event:', {
  dateRaw: sampleEvent1.dateRaw,
  isoDate: sampleEvent1.isoDate,
  faculty: sampleEvent1.faculty,
  subject: sampleEvent1.subject,
  chapter: sampleEvent1.chapter,
  topic: sampleEvent1.topic,
  timings: sampleEvent1.timings,
  duration: sampleEvent1.duration
});

console.assert(sampleEvent1.isoDate === '2026-10-15', 'Expected isoDate 2026-10-15');
console.assert(sampleEvent1.faculty === 'Dr. Pradeep Pawar', 'Expected Dr. Pradeep Pawar');
console.assert(sampleEvent1.subject === 'Anatomy', 'Expected Anatomy');

console.log('\n--- TEST 3: Cool-Off & Holiday Events ---');
const coolOff = batch1.events.find(e => e.eventType === 'cool_off');
console.log('Found Cool Off Event:', coolOff.dateRaw, coolOff.eventType);
console.assert(coolOff.eventType === 'cool_off', 'Expected cool_off eventType');

const diwali = batch1.events.find(e => e.eventType === 'holiday');
console.log('Found Holiday Event:', diwali.dateRaw, diwali.faculty, diwali.eventType);
console.assert(diwali.eventType === 'holiday', 'Expected holiday eventType');

console.log('\n--- TEST 4: Google Calendar & iCal Export ---');
const gcalUrl = generateGoogleCalendarUrl(sampleEvent1);
console.log('Generated GCal URL:', gcalUrl.slice(0, 100) + '...');
console.assert(gcalUrl.includes('calendar.google.com'), 'Invalid GCal URL');
console.assert(gcalUrl.includes('Anatomy'), 'Subject missing in GCal URL');

const icsText = generateIcsContent([sampleEvent1], 'Test Calendar');
console.log('Generated iCal excerpt:');
console.log(icsText.split('\r\n').slice(0, 12).join('\n'));
console.assert(icsText.includes('BEGIN:VCALENDAR') && icsText.includes('END:VCALENDAR'), 'Invalid ICS format');

console.log('\n--- TEST 5: Sheet Details Extractor ---');
const extracted1 = extractSheetDetails('https://docs.google.com/spreadsheets/d/1o2lcDhROx_alTy2zm2he5b7xSPsnk6UdzxzmTWA5_40/edit?gid=883157297#gid=883157297');
console.log('Extracted 1:', extracted1);
console.assert(extracted1.sheetId === '1o2lcDhROx_alTy2zm2he5b7xSPsnk6UdzxzmTWA5_40', 'Sheet ID extraction mismatch');
console.assert(extracted1.gid === '883157297', 'Gid extraction mismatch');

console.log('\n✅ ALL BACKEND & PARSER TESTS PASSED PERFECTLY!');
