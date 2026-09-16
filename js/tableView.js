/**
 * Planner Agenda / Table View Renderer
 * Matches the Google Sheet columns with enhanced interactive features.
 */

import { getSubjectColor } from './calendarView.js';
import { generateGoogleCalendarUrl, generateIcsContent, downloadIcsFile } from './icsExporter.js';

export function renderTableView(container, events, options = {}, onSelectEvent) {
  const searchQuery = (options.searchQuery || '').trim();
  const sortColumn = options.sortColumn || 'date';
  const sortAsc = options.sortAsc !== false;

  let sortedEvents = [...events];
  sortedEvents.sort((a, b) => {
    let valA = '';
    let valB = '';

    if (sortColumn === 'date') {
      valA = a.isoDate || '';
      valB = b.isoDate || '';
    } else if (sortColumn === 'faculty') {
      valA = a.faculty || '';
      valB = b.faculty || '';
    } else if (sortColumn === 'subject') {
      valA = a.subject || '';
      valB = b.subject || '';
    } else if (sortColumn === 'chapter') {
      valA = a.chapter || '';
      valB = b.chapter || '';
    }

    const cmp = valA.localeCompare(valB);
    return sortAsc ? cmp : -cmp;
  });

  let html = `
    <div class="table-view-wrapper">
      <div class="table-view-header">
        <div class="table-stats">
          <span class="badge-pill count-pill">${sortedEvents.length} Rows</span>
          <span class="badge-pill active-pill">${sortedEvents.filter(e => e.eventType === 'class').length} Lectures</span>
          <span class="badge-pill cool-pill">${sortedEvents.filter(e => e.eventType === 'cool_off' || e.eventType === 'holiday').length} Breaks</span>
        </div>
        <div class="table-actions">
          <button class="btn btn-secondary btn-sm" id="table-export-csv">
            <i data-lucide="download"></i> Export CSV
          </button>
          <button class="btn btn-secondary btn-sm" id="table-print-btn">
            <i data-lucide="printer"></i> Print Table
          </button>
        </div>
      </div>

      <div class="table-responsive">
        <table class="meded-planner-table">
          <thead>
            <tr>
              <th class="th-sortable" data-sort="date">
                Date & Days
                <i data-lucide="chevrons-up-down" class="sort-icon"></i>
              </th>
              <th class="th-sortable" data-sort="faculty">
                Faculty Name
                <i data-lucide="chevrons-up-down" class="sort-icon"></i>
              </th>
              <th class="th-sortable" data-sort="subject">
                Subject
                <i data-lucide="chevrons-up-down" class="sort-icon"></i>
              </th>
              <th class="th-sortable" data-sort="chapter">
                Chapter Name
                <i data-lucide="chevrons-up-down" class="sort-icon"></i>
              </th>
              <th>Topic</th>
              <th style="text-align: center; width: 60px;">Lectures</th>
              <th style="width: 85px;">Duration</th>
              <th style="width: 140px;">Timings</th>
              <th style="text-align: right; width: 90px;">Actions</th>
            </tr>
          </thead>
          <tbody>
  `;

  if (sortedEvents.length === 0) {
    html += `
      <tr>
        <td colspan="9" class="table-empty-message">
          <div class="empty-state">
            <i data-lucide="search-x"></i>
            <p>No lectures match your selected filters or search terms.</p>
          </div>
        </td>
      </tr>
    `;
  } else {
    sortedEvents.forEach(ev => {
      if (ev.eventType === 'cool_off') {
        html += `
          <tr class="row-cool-off" data-event-id="${ev.id}">
            <td class="cell-date font-semibold">${escapeHtml(ev.dateRaw || ev.isoDate)}</td>
            <td colspan="7" class="cell-cool-banner">
              <span class="cool-off-tag"><i data-lucide="coffee"></i> COOL OFF</span>
            </td>
            <td class="cell-actions text-right">
              <button class="btn-icon-sm row-view-btn" data-id="${ev.id}" title="View Details">
                <i data-lucide="eye"></i>
              </button>
            </td>
          </tr>
        `;
        return;
      }

      if (ev.eventType === 'holiday') {
        html += `
          <tr class="row-holiday" data-event-id="${ev.id}">
            <td class="cell-date font-semibold">${escapeHtml(ev.dateRaw || ev.isoDate)}</td>
            <td colspan="7" class="cell-holiday-banner">
              <span class="holiday-tag"><i data-lucide="sparkles"></i> ${escapeHtml(ev.faculty || 'Holiday')}</span>
            </td>
            <td class="cell-actions text-right">
              <button class="btn-icon-sm row-view-btn" data-id="${ev.id}" title="View Details">
                <i data-lucide="eye"></i>
              </button>
            </td>
          </tr>
        `;
        return;
      }

      const col = getSubjectColor(ev.subject);
      const highlightedTopic = highlightMatch(ev.topic, searchQuery);
      const highlightedChapter = highlightMatch(ev.chapter, searchQuery);
      const highlightedFaculty = highlightMatch(ev.faculty, searchQuery);

      // Handle multi-line topic strings cleanly
      const formattedTopic = highlightedTopic.split(/\r?\n/).filter(Boolean).map(line => `<div>• ${line}</div>`).join('') || highlightedTopic;

      html += `
        <tr class="row-class" data-event-id="${ev.id}">
          <td class="cell-date font-medium">
            <div class="date-main">${escapeHtml(ev.dateRaw || ev.isoDate)}</div>
            ${ev.batchName ? `<span class="row-batch-sub">${escapeHtml(ev.batchName)}</span>` : ''}
          </td>
          <td class="cell-faculty">
            <span class="faculty-badge">
              <i data-lucide="user-round" class="fac-icon"></i>
              ${highlightedFaculty}
            </span>
          </td>
          <td class="cell-subject">
            <span class="subject-tag" style="color: ${col.text}; background: ${col.bg}; border: 1px solid ${col.border};">
              ${escapeHtml(ev.subject)}
            </span>
          </td>
          <td class="cell-chapter font-semibold">
            ${highlightedChapter}
          </td>
          <td class="cell-topic">
            <div class="topic-content-box">${formattedTopic}</div>
          </td>
          <td class="cell-lectures text-center">
            <span class="pill-mini">${escapeHtml(ev.noLectures || '1')}</span>
          </td>
          <td class="cell-duration">
            <span class="duration-chip"><i data-lucide="hourglass" class="mini-icon"></i> ${escapeHtml(ev.duration || '2 Hours')}</span>
          </td>
          <td class="cell-timings">
            <span class="timings-chip"><i data-lucide="clock" class="mini-icon"></i> ${escapeHtml(ev.timings || '7:00pm to 9:00pm')}</span>
          </td>
          <td class="cell-actions text-right">
            <div class="row-actions-group">
              <button class="btn-icon-sm row-view-btn" data-id="${ev.id}" title="View Details">
                <i data-lucide="eye"></i>
              </button>
              <a href="${generateGoogleCalendarUrl(ev)}" target="_blank" rel="noopener" class="btn-icon-sm" title="Add to Google Calendar">
                <i data-lucide="calendar-plus"></i>
              </a>
            </div>
          </td>
        </tr>
      `;
    });
  }

  html += `
          </tbody>
        </table>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Row click listener
  container.querySelectorAll('.row-view-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-id');
      const found = events.find(ev => ev.id === id);
      if (found && onSelectEvent) onSelectEvent(found);
    });
  });

  // Table row click listener
  container.querySelectorAll('tr[data-event-id]').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('.row-actions-group') || e.target.closest('a') || e.target.closest('button')) return;
      const id = tr.getAttribute('data-event-id');
      const found = events.find(ev => ev.id === id);
      if (found && onSelectEvent) onSelectEvent(found);
    });
  });

  // CSV export listener
  const exportBtn = container.querySelector('#table-export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportEventsToCSV(sortedEvents);
    });
  }

  // Print listener
  const printBtn = container.querySelector('#table-print-btn');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

function highlightMatch(text, query) {
  if (!text) return '';
  if (!query) return escapeHtml(text);

  const escaped = escapeHtml(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
}

function exportEventsToCSV(events) {
  const headers = ['Date & Days', 'Faculty Name', 'Subject', 'Chapter Name', 'Topic', 'No of Lecture', 'Duration', 'Timings', 'Batch'];
  const rows = events.map(e => [
    `"${(e.dateRaw || '').replace(/"/g, '""')}"`,
    `"${(e.faculty || '').replace(/"/g, '""')}"`,
    `"${(e.subject || '').replace(/"/g, '""')}"`,
    `"${(e.chapter || '').replace(/"/g, '""')}"`,
    `"${(e.topic || '').replace(/"/g, '""')}"`,
    `"${(e.noLectures || '1').replace(/"/g, '""')}"`,
    `"${(e.duration || '').replace(/"/g, '""')}"`,
    `"${(e.timings || '').replace(/"/g, '""')}"`,
    `"${(e.batchName || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `MedEd_Faculty_Schedule_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
