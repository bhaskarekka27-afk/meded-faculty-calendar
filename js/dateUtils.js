/**
 * Shared date helpers.
 *
 * Every date-only value in this app is an ISO "YYYY-MM-DD" string compared as
 * text, so it MUST be produced in the user's local timezone. `toISOString()`
 * converts to UTC first, which in India (UTC+5:30) rolls local midnight back
 * to the previous day — that is why week ranges and "today" checks were off
 * by one. Use `toLocalIso()` instead.
 */

/** Local-timezone "YYYY-MM-DD" for a Date. */
export function toLocalIso(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The real current date, as a local "YYYY-MM-DD". Single source of truth. */
export function todayIso() {
  return toLocalIso(new Date());
}

/** Parse "YYYY-MM-DD" to a Date at local midnight (never UTC). */
export function parseIso(iso) {
  if (!iso || typeof iso !== 'string') return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Sunday of the week containing `date`, at local midnight. */
export function startOfWeek(date) {
  const d = date instanceof Date ? new Date(date.getTime()) : new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** Saturday of the week containing `date`, at local midnight. */
export function endOfWeek(date) {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  return d;
}

/** "YYYY-MM" for an ISO date string. */
export function monthKeyOf(iso) {
  return typeof iso === 'string' && iso.length >= 7 ? iso.slice(0, 7) : '';
}

/** Does `iso` fall in the given year / 0-indexed month? */
export function isInMonth(iso, year, month) {
  return monthKeyOf(iso) === `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Pick the month to show for a set of events, without moving unnecessarily.
 *
 * Returns null when the currently-viewed month already contains at least one
 * event (so the view should stay put), otherwise the {year, month} of the
 * month with events closest to the current view — ties preferring the future.
 */
export function nearestMonthWithEvents(events, year, month) {
  const keys = new Set();
  for (const ev of events || []) {
    const k = monthKeyOf(ev && ev.isoDate);
    if (k) keys.add(k);
  }
  if (keys.size === 0) return null;

  const current = year * 12 + month;
  if (keys.has(`${year}-${String(month + 1).padStart(2, '0')}`)) return null;

  let best = null;
  let bestScore = Infinity;
  for (const k of keys) {
    const [y, m] = k.split('-').map(Number);
    const idx = y * 12 + (m - 1);
    const delta = idx - current;
    // Distance first; a forward month wins a tie with a backward one.
    const score = Math.abs(delta) * 2 + (delta < 0 ? 1 : 0);
    if (score < bestScore) {
      bestScore = score;
      best = { year: y, month: m - 1 };
    }
  }
  return best;
}

/** Earliest event date in a list, as ISO, or null. */
export function earliestIso(events) {
  let min = null;
  for (const ev of events || []) {
    const iso = ev && ev.isoDate;
    if (iso && (min === null || iso < min)) min = iso;
  }
  return min;
}

/** First event on/after `fromIso`, else the earliest overall, else null. */
export function nextIsoOnOrAfter(events, fromIso) {
  let next = null;
  for (const ev of events || []) {
    const iso = ev && ev.isoDate;
    if (iso && iso >= fromIso && (next === null || iso < next)) next = iso;
  }
  return next || earliestIso(events);
}

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

/** "6:30 PM" -> minutes past midnight, or null. */
function timeToMinutes(str) {
  const m = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i.exec(String(str || ''));
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] || 0);
  const mer = (m[3] || '').toLowerCase();
  if (mer === 'pm' && h < 12) h += 12;
  if (mer === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** minutes past midnight -> "6:30 PM". */
export function minutesToTime(mins) {
  if (mins == null) return '';
  const total = ((mins % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const mer = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h}:${String(m).padStart(2, '0')} ${mer}`;
}

/** Hours as the sheet spells them: "2 Hours", "1.5 Hours", "45 Mins". */
export function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '';
  if (minutes < 60) return `${minutes} Mins`;
  const hours = minutes / 60;
  const text = Number.isInteger(hours) ? String(hours) : String(Number(hours.toFixed(2)));
  return `${text} Hour${hours === 1 ? '' : 's'}`;
}

/**
 * Parse a human slot label into structured values.
 *
 * Handles the shapes this app produces, e.g.
 *   "Tuesday, October 20, 2026 - 6:30 PM to 8:30 PM"
 *   "Saturday, October 17, 2026 • 7:00 PM – 9:00 PM"
 *   "Mon, 19 Oct • 5:00 – 7:00 PM"   (year taken from fallbackYear)
 *
 * A missing meridiem on the start time is inherited from the end time, so
 * "5:00 - 7:00 PM" is read as 5 PM, not 5 AM.
 *
 * @returns {{isoDate:string,startTime:string,endTime:string,timings:string,durationMinutes:number,duration:string}|null}
 */
export function parseSlotText(text, fallbackYear) {
  const raw = String(text || '').replace(/[\u2012-\u2015\u2212]/g, '-').trim();
  if (!raw) return null;

  const monthAlt = MONTHS.concat(MONTHS.map(m => m.slice(0, 3))).join('|');
  // Day-first is tried first: in "19 October 2026" a month-first pattern would
  // otherwise read the "20" of the year as the day.
  const dayFirst = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthAlt})\\.?(?:\\s*,?\\s*(\\d{4}))?`, 'i');
  const monthFirst = new RegExp(`\\b(${monthAlt})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?!\\d)(?:\\s*,?\\s*(\\d{4}))?`, 'i');

  let monthName, dayNum, yearNum, matched = '';
  let m = dayFirst.exec(raw);
  if (m) {
    dayNum = Number(m[1]); monthName = m[2]; yearNum = m[3] ? Number(m[3]) : undefined; matched = m[0];
  } else {
    m = monthFirst.exec(raw);
    if (m) { monthName = m[1]; dayNum = Number(m[2]); yearNum = m[3] ? Number(m[3]) : undefined; matched = m[0]; }
  }
  if (!monthName || !dayNum || dayNum < 1 || dayNum > 31) return null;

  const key = String(monthName).toLowerCase().replace('.', '');
  const monthIdx = MONTHS.findIndex(mn => mn === key || mn.slice(0, 3) === key.slice(0, 3));
  if (monthIdx < 0) return null;

  const year = yearNum || Number(fallbackYear) || new Date().getFullYear();
  const isoDate = toLocalIso(new Date(year, monthIdx, dayNum));

  // Strip the date we just consumed, so its digits cannot be read as a clock.
  const remainder = raw.replace(matched, ' ');
  // A clock token needs a colon or a meridiem; bare numbers are ignored.
  const clock = remainder.match(/\d{1,2}:\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm)/gi) || [];

  let startTime = '', endTime = '', durationMinutes = 0;
  if (clock.length >= 2) {
    const endMins = timeToMinutes(clock[1]);
    let startMins = timeToMinutes(clock[0]);
    // "5:00 - 7:00 PM" means 5 PM, not 5 AM. When the start omits the
    // meridiem, borrow the end's; if that puts the start after the end, use
    // the opposite half of the day instead.
    const endMer = /(am|pm)/i.exec(clock[1]);
    if (startMins != null && endMins != null && !/am|pm/i.test(clock[0]) && endMer) {
      const borrowed = endMer[1].toLowerCase() === 'pm'
        ? (startMins < 720 ? startMins + 720 : startMins)
        : (startMins >= 720 ? startMins - 720 : startMins);
      startMins = borrowed <= endMins ? borrowed : (borrowed + 720) % 1440;
    }
    if (startMins != null && endMins != null) {
      startTime = minutesToTime(startMins);
      endTime = minutesToTime(endMins);
      durationMinutes = endMins - startMins;
      if (durationMinutes < 0) durationMinutes += 1440; // crosses midnight
    }
  } else if (clock.length === 1) {
    const startMins = timeToMinutes(clock[0]);
    if (startMins != null) startTime = minutesToTime(startMins);
  }

  return {
    isoDate,
    startTime,
    endTime,
    timings: startTime && endTime ? `${startTime} to ${endTime}` : (startTime ? `${startTime} Onwards` : ''),
    durationMinutes,
    duration: formatDuration(durationMinutes)
  };
}
