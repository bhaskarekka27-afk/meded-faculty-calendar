/**
 * Faculty Directory & Workload View
 */

import { getSubjectColor } from './calendarView.js';
import { generateIcsContent, downloadIcsFile } from './icsExporter.js';

export function renderFacultyView(container, allEvents, onFilterFaculty, onSelectEvent) {
  // Aggregate data by faculty
  const facultyMap = {};

  allEvents.forEach(ev => {
    if (ev.eventType !== 'class' || !ev.faculty) return;
    const name = ev.faculty.trim();
    if (!facultyMap[name]) {
      facultyMap[name] = {
        name,
        classes: [],
        subjects: new Set(),
        batches: new Set(),
        totalHours: 0,
        nextClass: null
      };
    }
    facultyMap[name].classes.push(ev);
    if (ev.subject) facultyMap[name].subjects.add(ev.subject);
    if (ev.batchName) facultyMap[name].batches.add(ev.batchName);

    // Calculate hours
    const durMatch = (ev.duration || '').match(/(\d+(?:\.\d+)?)/);
    const h = durMatch ? parseFloat(durMatch[1]) : (ev.durationMinutes ? ev.durationMinutes / 60 : 2);
    facultyMap[name].totalHours += h;
  });

  const facultyList = Object.values(facultyMap).sort((a, b) => b.classes.length - a.classes.length);

  // Sort each faculty's classes by date
  facultyList.forEach(fac => {
    fac.classes.sort((a, b) => (a.isoDate || '').localeCompare(b.isoDate || ''));
    fac.nextClass = fac.classes[0] || null;
  });

  let html = `
    <div class="faculty-view-wrapper">
      <div class="faculty-view-header">
        <div class="fac-title-group">
          <h2 class="fac-section-title">Faculty Roster & Workload</h2>
          <span class="fac-subtext">${facultyList.length} Active Medical Faculty Members</span>
        </div>
      </div>

      <div class="faculty-cards-grid">
  `;

  if (facultyList.length === 0) {
    html += `
      <div class="empty-state">
        <i data-lucide="users"></i>
        <p>No faculty data found in the current selection.</p>
      </div>
    `;
  } else {
    facultyList.forEach(fac => {
      const subjectArray = Array.from(fac.subjects);
      const batchArray = Array.from(fac.batches);
      const initial = fac.name.replace(/^Dr\.\s*/i, '').trim().charAt(0) || 'D';

      html += `
        <div class="faculty-card" data-faculty-name="${escapeHtml(fac.name)}">
          <div class="faculty-card-top">
            <div class="faculty-avatar-large">
              <span>${initial}</span>
            </div>
            <div class="faculty-meta">
              <h3 class="faculty-card-name">${escapeHtml(fac.name)}</h3>
              <div class="faculty-batches-list">
                ${batchArray.map(b => `<span class="fac-batch-chip">${escapeHtml(b)}</span>`).join('')}
              </div>
            </div>
          </div>

          <div class="faculty-subjects-row">
            ${subjectArray.map(sub => {
              const col = getSubjectColor(sub);
              return `<span class="subject-mini-chip" style="color: ${col.text}; background: ${col.bg}; border: 1px solid ${col.border};">${escapeHtml(sub)}</span>`;
            }).join('')}
          </div>

          <div class="faculty-stats-row">
            <div class="fac-stat-item">
              <span class="fac-stat-val">${fac.classes.length}</span>
              <span class="fac-stat-lbl">Lectures</span>
            </div>
            <div class="fac-stat-item">
              <span class="fac-stat-val">${Math.round(fac.totalHours)}h</span>
              <span class="fac-stat-lbl">Total Hours</span>
            </div>
            <div class="fac-stat-item">
              <span class="fac-stat-val">${subjectArray.length}</span>
              <span class="fac-stat-lbl">Subjects</span>
            </div>
          </div>

          ${fac.nextClass ? `
            <div class="faculty-next-class-box" data-event-id="${fac.nextClass.id}">
              <div class="next-class-tag"><i data-lucide="calendar-arrow-up"></i> Next Upcoming Lecture</div>
              <div class="next-class-date">${escapeHtml(fac.nextClass.dateRaw)} (${fac.nextClass.timings})</div>
              <div class="next-class-topic font-medium">${escapeHtml(fac.nextClass.chapter)}: ${escapeHtml(fac.nextClass.topic)}</div>
            </div>
          ` : ''}

          <div class="faculty-card-actions">
            <button class="btn btn-primary btn-sm btn-filter-fac" data-name="${escapeHtml(fac.name)}">
              <i data-lucide="filter"></i> View Schedule (${fac.classes.length})
            </button>
            <button class="btn btn-secondary btn-sm btn-download-fac-ics" data-name="${escapeHtml(fac.name)}" title="Download Calendar for ${escapeHtml(fac.name)}">
              <i data-lucide="calendar-download"></i> .ICS
            </button>
          </div>
        </div>
      `;
    });
  }

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Filter button listener
  container.querySelectorAll('.btn-filter-fac').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name');
      if (onFilterFaculty) onFilterFaculty(name);
    });
  });

  // ICS download listener
  container.querySelectorAll('.btn-download-fac-ics').forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name');
      const facData = facultyList.find(f => f.name === name);
      if (facData && facData.classes.length > 0) {
        const icsContent = generateIcsContent(facData.classes, `${name} Schedule`);
        downloadIcsFile(`${name.replace(/[^a-zA-Z0-9]/g, '_')}_Schedule.ics`, icsContent);
      }
    });
  });

  // Next class click listener
  container.querySelectorAll('.faculty-next-class-box').forEach(box => {
    box.addEventListener('click', () => {
      const evId = box.getAttribute('data-event-id');
      const found = allEvents.find(e => e.id === evId);
      if (found && onSelectEvent) onSelectEvent(found);
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
