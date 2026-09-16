/**
 * Weekly Timetable View Renderer
 */

import { getSubjectColor } from './calendarView.js';
import { renderPlatformBadges, renderBatchBadge } from './platformBadge.js';

export function renderTimetableView(container, events, currentWeekStart, onSelectEvent) {
  // Ensure we have a valid Date for week start (Monday)
  const weekStart = new Date(currentWeekStart);
  // Normalize to Monday
  const day = weekStart.getDay();
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);

  const daysOfWeek = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    daysOfWeek.push({
      dateObj: d,
      isoDate: iso,
      dayName: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
      fullDayName: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i],
      dayNum: d.getDate(),
      monthName: d.toLocaleString('en-US', { month: 'short' }),
      year: d.getFullYear()
    });
  }

  const weekEnd = daysOfWeek[6].dateObj;
  const weekRangeLabel = `${daysOfWeek[0].monthName} ${daysOfWeek[0].dayNum}, ${daysOfWeek[0].year} – ${daysOfWeek[6].monthName} ${daysOfWeek[6].dayNum}, ${daysOfWeek[6].year}`;

  // Index events by date
  const eventsByDate = {};
  for (const ev of events) {
    if (!ev.isoDate) continue;
    if (!eventsByDate[ev.isoDate]) eventsByDate[ev.isoDate] = [];
    eventsByDate[ev.isoDate].push(ev);
  }

  // Count classes this week
  let weekClassCount = 0;
  daysOfWeek.forEach(d => {
    const list = eventsByDate[d.isoDate] || [];
    weekClassCount += list.filter(e => e.eventType === 'class').length;
  });

  let html = `
    <div class="timetable-wrapper">
      <div class="timetable-top-bar">
        <div class="timetable-title-group">
          <h2 class="timetable-week-title">${weekRangeLabel}</h2>
          <span class="timetable-badge">${weekClassCount} Lectures Scheduled</span>
        </div>
        <div class="timetable-nav-actions">
          <button class="btn btn-secondary btn-sm" id="tt-jump-first">Start of Classes (Oct 15)</button>
          <div class="calendar-arrows">
            <button class="btn-icon" id="tt-prev-week" title="Previous Week">
              <i data-lucide="chevron-left"></i>
            </button>
            <button class="btn btn-secondary btn-sm" id="tt-curr-week">This Week</button>
            <button class="btn-icon" id="tt-next-week" title="Next Week">
              <i data-lucide="chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="timetable-columns-grid">
  `;

  daysOfWeek.forEach((dayInfo, idx) => {
    const dayEvents = eventsByDate[dayInfo.isoDate] || [];
    const isSunday = idx === 6;
    const isToday = isSameDay(dayInfo.dateObj, new Date());

    html += `
      <div class="tt-day-col ${isSunday ? 'tt-col-sunday' : ''} ${isToday ? 'tt-col-today' : ''}" data-date="${dayInfo.isoDate}">
        <div class="tt-col-header">
          <span class="tt-col-dayname">${dayInfo.dayName}</span>
          <span class="tt-col-daynum ${isToday ? 'active-day-circle' : ''}">${dayInfo.dayNum}</span>
          <span class="tt-col-month">${dayInfo.monthName}</span>
        </div>
        <div class="tt-col-body">
          ${renderTimetableColumnEvents(dayEvents)}
        </div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Event handlers
  container.querySelectorAll('.tt-event-card').forEach(card => {
    card.addEventListener('click', (e) => {
      const eventId = card.getAttribute('data-event-id');
      const found = events.find(ev => ev.id === eventId);
      if (found && onSelectEvent) {
        onSelectEvent(found);
      }
    });
  });
}

function renderTimetableColumnEvents(events) {
  if (!events || events.length === 0) {
    return `
      <div class="tt-empty-day">
        <span class="tt-empty-icon"><i data-lucide="calendar-x-2"></i></span>
        <span class="tt-empty-text">No Lectures</span>
      </div>
    `;
  }

  return events.map(ev => {
    if (ev.eventType === 'cool_off') {
      return `
        <div class="tt-event-card tt-card-cool-off" data-event-id="${ev.id}">
          <div class="tt-cool-badge"><i data-lucide="coffee"></i> COOL OFF</div>
          <p class="tt-cool-desc">Break & Self Study Day</p>
        </div>
      `;
    }

    if (ev.eventType === 'holiday') {
      return `
        <div class="tt-event-card tt-card-holiday" data-event-id="${ev.id}">
          <div class="tt-holiday-badge"><i data-lucide="sparkles"></i> ${escapeHtml(ev.faculty || 'Holiday')}</div>
          <p class="tt-holiday-desc">Official Break</p>
        </div>
      `;
    }

    const col = getSubjectColor(ev.subject);
    const facultyInitial = ev.faculty ? ev.faculty.replace(/^Dr\.\s*/i, '').trim().charAt(0) : 'F';
    const batchBadgeHtml = renderBatchBadge(ev.batchName);
    const platformBadgesHtml = renderPlatformBadges(ev, { compact: true });

    return `
      <div class="tt-event-card tt-card-class" data-event-id="${ev.id}" style="border-top-color: ${col.border};">
        <div class="tt-card-time-slot">
          <i data-lucide="clock"></i>
          <span>${ev.timings || '7:00pm to 9:00pm'}</span>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap my-1">
          <div class="tt-card-subject-pill" style="color: ${col.text}; background: ${col.bg}; border: 1px solid ${col.border};">
            ${escapeHtml(ev.subject)}
          </div>
          ${batchBadgeHtml}
          ${platformBadgesHtml}
        </div>

        <h4 class="tt-card-chapter">${escapeHtml(ev.chapter || 'Chapter')}</h4>
        <p class="tt-card-topic" title="${escapeHtml(ev.topic)}">${escapeHtml(ev.topic || ev.chapter)}</p>

        <div class="tt-card-footer">
          <div class="tt-faculty-row">
            <span class="tt-faculty-avatar" style="background: ${col.border};">${facultyInitial}</span>
            <span class="tt-faculty-name">${escapeHtml(ev.faculty)}</span>
          </div>
          <span class="tt-duration-pill">${ev.duration || '2 Hours'}</span>
        </div>
      </div>
    `;
  }).join('');
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
