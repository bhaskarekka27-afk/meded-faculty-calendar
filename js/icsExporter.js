/**
 * iCalendar (.ics) and Google Calendar Link Generator
 */

// Helper to format ISO date + time into UTC or local format for .ics / Google Cal
// e.g. "2026-10-15" and "7:00pm to 9:00pm" -> "20261015T190000"
function parseEventDateTime(isoDate, timingsStr, isEnd = false) {
  if (!isoDate) return null;
  const cleanDate = isoDate.replace(/-/g, ''); // "20261015"
  
  if (!timingsStr) {
    return isEnd ? `${cleanDate}T210000` : `${cleanDate}T190000`;
  }

  const parts = timingsStr.split(/to|-/i).map(s => s.trim());
  const targetStr = isEnd ? (parts[1] || parts[0]) : parts[0];

  const m = targetStr.match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);
  if (!m) {
    return isEnd ? `${cleanDate}T210000` : `${cleanDate}T190000`;
  }

  let h = parseInt(m[1], 10);
  const min = parseInt(m[2] || '0', 10);
  const ampm = (m[3] || '').toLowerCase();
  if (ampm === 'pm' && h < 12) h += 12;
  if (ampm === 'am' && h === 12) h = 0;

  const hh = String(h).padStart(2, '0');
  const mm = String(min).padStart(2, '0');
  return `${cleanDate}T${hh}${mm}00`;
}

/**
 * Generate Google Calendar Web URL
 */
export function generateGoogleCalendarUrl(event) {
  const startStr = parseEventDateTime(event.isoDate, event.timings, false);
  const endStr = parseEventDateTime(event.isoDate, event.timings, true);
  
  const title = `[${event.subject || 'Lecture'}] ${event.chapter || event.topic || 'Class'} - ${event.faculty || ''}`;
  const details = `Batch: ${event.batchName || 'PW MedEd'}\nSubject: ${event.subject}\nFaculty: ${event.faculty}\nChapter: ${event.chapter}\nTopic: ${event.topic}\nTimings: ${event.timings}\nDuration: ${event.duration}\n\nLive on PW MedEd App.`;
  const location = 'Live on PW MedEd APP';

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startStr}/${endStr}`,
    details: details,
    location: location,
    ctz: 'Asia/Kolkata'
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generate single or multiple VEVENT blocks
 */
function createVEvent(event) {
  const start = parseEventDateTime(event.isoDate, event.timings, false);
  const end = parseEventDateTime(event.isoDate, event.timings, true);
  const uid = `${event.id || ('meded-' + Math.random().toString(36).substr(2, 9))}@meded.pw.live`;
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const summary = `[${event.subject || 'Lecture'}] ${event.chapter || event.topic} (${event.faculty})`;
  const description = [
    `Batch: ${event.batchName || 'MedEd'}`,
    `Subject: ${event.subject}`,
    `Faculty: ${event.faculty}`,
    `Chapter: ${event.chapter}`,
    `Topic: ${event.topic ? event.topic.replace(/\n/g, ' \\n ') : ''}`,
    `Timings: ${event.timings}`,
    `Duration: ${event.duration}`,
    `PW MedEd Live Lecture`
  ].join('\\n');

  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART;TZID=Asia/Kolkata:${start}`,
    `DTEND;TZID=Asia/Kolkata:${end}`,
    `SUMMARY:${summary.replace(/,/g, '\\,')}`,
    `DESCRIPTION:${description.replace(/,/g, '\\,')}`,
    `LOCATION:Live on PW MedEd APP`,
    'STATUS:CONFIRMED',
    'END:VEVENT'
  ].join('\r\n');
}

/**
 * Generate full .ics file content for one or multiple events
 */
export function generateIcsContent(events, calendarName = 'PW MedEd Schedule') {
  const eventList = Array.isArray(events) ? events : [events];
  const validEvents = eventList.filter(e => e.eventType === 'class' && e.isoDate);

  const vevents = validEvents.map(createVEvent).join('\r\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PW MedEd//Faculty Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${calendarName}`,
    'X-WR-TIMEZONE:Asia/Kolkata',
    vevents,
    'END:VCALENDAR'
  ].join('\r\n');
}

/**
 * Trigger download of .ics file
 */
export function downloadIcsFile(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.ics') ? filename : `${filename}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
