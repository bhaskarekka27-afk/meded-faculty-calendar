/**
 * Month Grid Calendar View Renderer
 */

export function getSubjectColor(subject) {
  if (!subject) return { bg: '#334155', text: '#cbd5e1', border: '#475569', label: 'General' };
  const s = subject.trim().toLowerCase();
  
  if (s.includes('anatomy')) {
    return { bg: 'rgba(244, 63, 94, 0.15)', text: '#fb7185', border: '#f43f5e', accent: '#f43f5e' };
  }
  if (s.includes('physiology')) {
    return { bg: 'rgba(99, 102, 241, 0.15)', text: '#818cf8', border: '#6366f1', accent: '#6366f1' };
  }
  if (s.includes('biochemistry')) {
    return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: '#f59e0b', accent: '#f59e0b' };
  }
  if (s.includes('ent')) {
    return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: '#a855f7', accent: '#a855f7' };
  }
  if (s.includes('community medicine')) {
    return { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: '#06b6d4', accent: '#06b6d4' };
  }
  if (s.includes('ophthalmology')) {
    return { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', border: '#ec4899', accent: '#ec4899' };
  }
  if (s.includes('fmt') || s.includes('forensic')) {
    return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: '#10b981', accent: '#10b981' };
  }
  if (s.includes('pharmacology')) {
    return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: '#3b82f6', accent: '#3b82f6' };
  }
  if (s.includes('pathology')) {
    return { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', border: '#f97316', accent: '#f97316' };
  }
  if (s.includes('microbiology')) {
    return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: '#22c55e', accent: '#22c55e' };
  }
  return { bg: 'rgba(14, 165, 233, 0.15)', text: '#38bdf8', border: '#0ea5e9', accent: '#0ea5e9' };
}

export function renderCalendarMonth(container, events, currentDate, onSelectEvent) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Group events by isoDate string (YYYY-MM-DD)
  const eventsByDate = {};
  for (const ev of events) {
    if (!ev.isoDate) continue;
    if (!eventsByDate[ev.isoDate]) {
      eventsByDate[ev.isoDate] = [];
    }
    eventsByDate[ev.isoDate].push(ev);
  }

  // Days in current month
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const totalDays = lastDayOfMonth.getDate();

  // Day of week for 1st day (0 = Sun, 1 = Mon ...). We'll start weeks on Monday.
  let startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sun
  // Convert so Monday is index 0, Sunday is index 6
  let padDays = (startDayOfWeek + 6) % 7;

  // Previous month fill
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Today ISO
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  let html = `
    <div class="calendar-wrapper">
      <div class="calendar-top-bar">
        <div class="calendar-title-group">
          <h2 class="calendar-month-title">${monthNames[month]} <span class="calendar-year-badge">${year}</span></h2>
          <span class="calendar-events-count">${events.filter(e => e.isoDate && e.isoDate.startsWith(`${year}-${String(month+1).padStart(2,'0')}`)).length} events in ${monthNames[month]}</span>
        </div>
        <div class="calendar-nav-actions">
          <button class="btn btn-secondary btn-sm" id="cal-quick-oct">Oct 2026</button>
          <button class="btn btn-secondary btn-sm" id="cal-quick-nov">Nov 2026</button>
          <div class="calendar-arrows">
            <button class="btn-icon" id="cal-prev-month" title="Previous Month">
              <i data-lucide="chevron-left"></i>
            </button>
            <button class="btn btn-secondary btn-sm" id="cal-today-btn">Today</button>
            <button class="btn-icon" id="cal-next-month" title="Next Month">
              <i data-lucide="chevron-right"></i>
            </button>
          </div>
        </div>
      </div>

      <div class="calendar-grid-header">
        <div class="cal-day-name">Mon</div>
        <div class="cal-day-name">Tue</div>
        <div class="cal-day-name">Wed</div>
        <div class="cal-day-name">Thu</div>
        <div class="cal-day-name">Fri</div>
        <div class="cal-day-name">Sat</div>
        <div class="cal-day-name cal-day-sun">Sun</div>
      </div>

      <div class="calendar-grid-body">
  `;

  // 1. Padding days from previous month
  for (let p = padDays - 1; p >= 0; p--) {
    const dayNum = prevMonthLastDay - p;
    const prevM = month === 0 ? 12 : month;
    const prevY = month === 0 ? year - 1 : year;
    const pIso = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    const dayEvents = eventsByDate[pIso] || [];

    html += `
      <div class="cal-cell cal-cell-muted">
        <div class="cal-cell-header">
          <span class="cal-day-num">${dayNum}</span>
        </div>
        <div class="cal-cell-events">
          ${renderDayEventChips(dayEvents, pIso)}
        </div>
      </div>
    `;
  }

  // 2. Days of current month
  for (let d = 1; d <= totalDays; d++) {
    const dIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = eventsByDate[dIso] || [];
    const isToday = dIso === todayIso;
    const dateObj = new Date(year, month, d);
    const isSunday = dateObj.getDay() === 0;

    let cellClass = 'cal-cell';
    if (isToday) cellClass += ' cal-cell-today';
    if (isSunday) cellClass += ' cal-cell-sunday';
    if (dayEvents.length > 0) cellClass += ' cal-cell-has-events';

    html += `
      <div class="${cellClass}" data-date="${dIso}">
        <div class="cal-cell-header">
          <span class="cal-day-num">${d}</span>
          ${isToday ? '<span class="today-chip">Today</span>' : ''}
          ${dayEvents.length > 0 ? `<span class="events-badge">${dayEvents.length}</span>` : ''}
        </div>
        <div class="cal-cell-events">
          ${renderDayEventChips(dayEvents, dIso)}
        </div>
      </div>
    `;
  }

  // 3. Padding days for next month to complete the row
  const currentTotalCells = padDays + totalDays;
  const remainingCells = (7 - (currentTotalCells % 7)) % 7;
  for (let n = 1; n <= remainingCells; n++) {
    const nextM = month === 11 ? 1 : month + 2;
    const nextY = month === 11 ? year + 1 : year;
    const nIso = `${nextY}-${String(nextM).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
    const dayEvents = eventsByDate[nIso] || [];

    html += `
      <div class="cal-cell cal-cell-muted">
        <div class="cal-cell-header">
          <span class="cal-day-num">${n}</span>
        </div>
        <div class="cal-cell-events">
          ${renderDayEventChips(dayEvents, nIso)}
        </div>
      </div>
    `;
  }

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Add click listeners to event chips
  container.querySelectorAll('.cal-event-chip').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const eventId = el.getAttribute('data-event-id');
      const found = events.find(ev => ev.id === eventId);
      if (found && onSelectEvent) {
        onSelectEvent(found);
      }
    });
  });
}

function renderDayEventChips(dayEvents, isoDate) {
  if (!dayEvents || dayEvents.length === 0) return '';

  return dayEvents.map(ev => {
    if (ev.eventType === 'cool_off') {
      return `
        <div class="cal-event-chip event-cool-off" data-event-id="${ev.id}">
          <div class="chip-top">
            <span class="chip-cool-badge"><i data-lucide="coffee"></i> COOL OFF</span>
          </div>
          <span class="chip-subtext">No Classes Scheduled</span>
        </div>
      `;
    }

    if (ev.eventType === 'holiday') {
      return `
        <div class="cal-event-chip event-holiday" data-event-id="${ev.id}">
          <div class="chip-top">
            <span class="chip-holiday-badge"><i data-lucide="sparkles"></i> ${ev.faculty || 'Holiday'}</span>
          </div>
        </div>
      `;
    }

    const col = getSubjectColor(ev.subject);
    const facultyInitial = ev.faculty ? ev.faculty.replace(/^Dr\.\s*/i, '').trim().charAt(0) : 'F';

    return `
      <div class="cal-event-chip event-class" data-event-id="${ev.id}" style="border-left-color: ${col.border}; background: ${col.bg};">
        <div class="chip-top">
          <span class="subject-pill" style="color: ${col.text};">${ev.subject}</span>
          <span class="chip-time"><i data-lucide="clock"></i> ${ev.startTime || ev.timings}</span>
        </div>
        <div class="chip-title" title="${escapeHtml(ev.topic || ev.chapter)}">${escapeHtml(ev.topic || ev.chapter)}</div>
        <div class="chip-footer">
          <span class="chip-faculty" title="${escapeHtml(ev.faculty)}">
            <span class="avatar-pill" style="background: ${col.border};">${facultyInitial}</span>
            <span class="faculty-name-trunc">${escapeHtml(ev.faculty)}</span>
          </span>
          <span class="chip-duration">${ev.duration}</span>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
