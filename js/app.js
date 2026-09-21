/**
 * MedEd Faculty & Batch Calendar - Main Application Controller
 */

import { BatchManager, detectGoogleSheetTabs } from './sheetConnector.js';
import { renderCalendarMonth, getSubjectColor } from './calendarView.js';
import { renderTimetableView } from './timetableView.js';
import { renderTableView } from './tableView.js';
import { renderFacultyView } from './facultyView.js';
import { generateGoogleCalendarUrl, generateIcsContent, downloadIcsFile } from './icsExporter.js';

class AppController {
  constructor() {
    this.batchManager = new BatchManager();
    
    // State
    this.currentBatchId = 'batch-prarambh-2026'; // Default to 1st year batch
    this.activeView = 'month'; // 'month' | 'timetable' | 'agenda' | 'faculty'
    this.searchQuery = '';
    this.selectedSubjects = new Set();
    this.selectedFaculty = '';
    this.hideBreaks = false;

    // Calendar & timetable dates (Classes start Oct 15, 2026)
    this.calendarDate = new Date(2026, 9, 1); // October 2026 (month is 0-indexed)
    this.timetableWeekStart = new Date(2026, 9, 15); // Week of Oct 15, 2026

    this.tableSort = { column: 'date', asc: true };
    this.theme = localStorage.getItem('meded_theme') || 'dark';

    this.init();
  }

  init() {
    this.applyTheme(this.theme);
    this.setupEventListeners();
    this.initFacultySession();
    this.renderBatchSelector();
    this.updateSubjectAndFacultyFilters();
    this.renderCurrentView();
    this.renderStats();
    this.refreshIcons();
  }

  applyTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('meded_theme', theme);

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = theme === 'dark' 
        ? '<i data-lucide="sun"></i>' 
        : '<i data-lucide="moon"></i>';
      themeToggleBtn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    }
  }

  toggleTheme() {
    this.applyTheme(this.theme === 'dark' ? 'light' : 'dark');
    this.refreshIcons();
  }

  initFacultySession() {
    const container = document.getElementById('faculty-auth-container');
    if (!container) return;

    let user = null;
    try {
      const stored = localStorage.getItem('meded_faculty_user');
      if (stored) user = JSON.parse(stored);
    } catch (e) {
      console.warn('Error reading faculty session:', e);
    }

    if (user && user.facultyName) {
      const initial = user.facultyName.replace(/^Dr\.\s*/i, '').trim().charAt(0) || 'D';
      container.innerHTML = `
        <button class="faculty-profile-btn" id="faculty-profile-btn" title="Faculty Profile: ${user.facultyName}">
          <span class="faculty-profile-avatar">${initial}</span>
          <span class="faculty-profile-name">${user.facultyName}</span>
          <i data-lucide="chevron-down" class="faculty-profile-chevron"></i>
        </button>
        <div class="faculty-profile-dropdown" id="faculty-profile-dropdown">
          <div class="faculty-dropdown-header">
            <span class="dropdown-user-label">Faculty Directorate</span>
            <div class="dropdown-user-name">${user.facultyName}</div>
            <div class="dropdown-user-sub">${user.subject || 'Specialist'}</div>
          </div>
          <button class="faculty-dropdown-btn" id="btn-filter-my-classes">
            <i data-lucide="user-check"></i> My Classes Only
          </button>
          <button class="faculty-dropdown-btn" id="btn-show-all-classes">
            <i data-lucide="layout-grid"></i> All Faculty Classes
          </button>
          <hr style="border: none; border-top: 1px solid var(--border-subtle); margin: 2px 0;">
          <button class="faculty-dropdown-btn danger" id="btn-faculty-signout">
            <i data-lucide="log-out"></i> Sign Out
          </button>
        </div>
      `;

      const profileBtn = container.querySelector('#faculty-profile-btn');
      const dropdown = container.querySelector('#faculty-profile-dropdown');

      profileBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown?.classList.toggle('show');
      });

      document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
          dropdown?.classList.remove('show');
        }
      });

      container.querySelector('#btn-filter-my-classes')?.addEventListener('click', () => {
        this.selectedFaculty = user.facultyName;
        const facSelect = document.getElementById('faculty-filter-select');
        if (facSelect) facSelect.value = user.facultyName;
        dropdown?.classList.remove('show');
        this.renderCurrentView();
        this.renderStats();
        this.showToast(`Filtered schedule to ${user.facultyName}`);
      });

      container.querySelector('#btn-show-all-classes')?.addEventListener('click', () => {
        this.selectedFaculty = '';
        const facSelect = document.getElementById('faculty-filter-select');
        if (facSelect) facSelect.value = '';
        dropdown?.classList.remove('show');
        this.renderCurrentView();
        this.renderStats();
        this.showToast('Showing all faculty classes');
      });

      container.querySelector('#btn-faculty-signout')?.addEventListener('click', () => {
        localStorage.removeItem('meded_faculty_user');
        this.selectedFaculty = '';
        this.initFacultySession();
        this.renderCurrentView();
        this.renderStats();
        this.showToast('Signed out of Faculty Portal');
      });

    } else {
      container.innerHTML = `
        <a href="/login.html" class="btn-faculty-login" title="Sign In to Faculty Portal">
          <i data-lucide="lock"></i> Faculty Sign In
        </a>
      `;
    }

    this.refreshIcons();
  }

  setupEventListeners() {
    // Theme toggle
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => this.toggleTheme());

    // View Navigation tabs
    document.querySelectorAll('.view-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = btn.getAttribute('data-view');
        this.switchView(view);
      });
    });

    // Batch Selector change
    document.getElementById('batch-select')?.addEventListener('change', (e) => {
      this.currentBatchId = e.target.value;
      this.onBatchChanged();
    });

    // Search Input
    const searchInput = document.getElementById('global-search');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.renderCurrentView();
      this.renderStats();
      this.refreshIcons();
    });

    // Clear search button
    document.getElementById('clear-search-btn')?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      this.searchQuery = '';
      this.renderCurrentView();
      this.renderStats();
      this.refreshIcons();
    });

    // Faculty filter dropdown
    document.getElementById('faculty-filter-select')?.addEventListener('change', (e) => {
      this.selectedFaculty = e.target.value;
      this.renderCurrentView();
      this.renderStats();
      this.refreshIcons();
    });

    // Hide Breaks checkbox
    document.getElementById('hide-breaks-toggle')?.addEventListener('change', (e) => {
      this.hideBreaks = e.target.checked;
      this.renderCurrentView();
      this.renderStats();
      this.refreshIcons();
    });

    // Reset filters button
    document.getElementById('reset-filters-btn')?.addEventListener('click', () => {
      this.resetFilters();
    });

    // Connect Sheet Modal Triggers
    document.getElementById('open-connect-sheet-modal')?.addEventListener('click', () => {
      this.openConnectModal();
    });
    document.getElementById('close-connect-modal')?.addEventListener('click', () => {
      this.closeConnectModal();
    });
    document.getElementById('cancel-connect-btn')?.addEventListener('click', () => {
      this.closeConnectModal();
    });
    document.getElementById('save-new-sheet-btn')?.addEventListener('click', () => {
      this.handleConnectNewSheet();
    });

    const legacyUrlInput = document.getElementById('new-sheet-url');
    const legacyTabInput = document.getElementById('new-sheet-tab');
    if (legacyUrlInput && legacyTabInput) {
      const detectLegacyTabs = async () => {
        const url = legacyUrlInput.value.trim();
        if (url.includes('/spreadsheets/d/')) {
          try {
            const res = await detectGoogleSheetTabs(url);
            if (res && res.recommendedTab) {
              legacyTabInput.value = res.recommendedTab;
            }
          } catch (e) {
            // ignore
          }
        }
      };
      legacyUrlInput.addEventListener('paste', () => setTimeout(detectLegacyTabs, 50));
      legacyUrlInput.addEventListener('change', detectLegacyTabs);
    }

    // Sync current batch
    document.getElementById('sync-current-batch-btn')?.addEventListener('click', () => {
      this.handleSyncBatch();
    });

    // Event detail modal close
    document.getElementById('close-event-modal')?.addEventListener('click', () => {
      this.closeEventModal();
    });


    // Close modals on escape or backdrop click
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeConnectModal();
        this.closeEventModal();
      }
    });

    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          this.closeConnectModal();
          this.closeEventModal();
        }
      });
    });
  }

  onBatchChanged() {
    this.selectedSubjects.clear();
    this.selectedFaculty = '';
    const searchInput = document.getElementById('global-search');
    if (searchInput) searchInput.value = '';
    this.searchQuery = '';

    // Auto-adjust calendar to first lecture of selected batch
    const events = this.batchManager.getAllEvents(this.currentBatchId);
    const firstClass = events.find(e => e.eventType === 'class' && e.isoDate);
    if (firstClass && firstClass.isoDate) {
      const parts = firstClass.isoDate.split('-');
      this.calendarDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      this.timetableWeekStart = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }

    this.updateSubjectAndFacultyFilters();
    this.renderCurrentView();
    this.renderStats();
    this.refreshIcons();
  }

  switchView(viewName) {
    this.activeView = viewName;
    document.querySelectorAll('.view-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-view') === viewName);
    });

    this.renderCurrentView();
    this.refreshIcons();
  }

  getFilteredEvents() {
    const rawEvents = this.batchManager.getAllEvents(this.currentBatchId);

    return rawEvents.filter(ev => {
      // 1. Hide breaks / cool-off
      if (this.hideBreaks && (ev.eventType === 'cool_off' || ev.eventType === 'holiday')) {
        return false;
      }

      // 2. Faculty filter
      if (this.selectedFaculty && ev.faculty !== this.selectedFaculty) {
        return false;
      }

      // 3. Subject filter
      if (this.selectedSubjects.size > 0 && ev.subject && !this.selectedSubjects.has(ev.subject)) {
        return false;
      }

      // 4. Search query
      if (this.searchQuery) {
        const text = [
          ev.topic || '',
          ev.chapter || '',
          ev.faculty || '',
          ev.subject || '',
          ev.dateRaw || '',
          ev.timings || ''
        ].join(' ').toLowerCase();

        if (!text.includes(this.searchQuery)) {
          return false;
        }
      }

      return true;
    });
  }

  renderBatchSelector() {
    const select = document.getElementById('batch-select');
    if (!select) return;

    const batches = this.batchManager.getBatches();
    let html = '';

    batches.forEach(b => {
      const isSelected = b.id === this.currentBatchId;
      html += `<option value="${b.id}" ${isSelected ? 'selected' : ''}>${b.name}</option>`;
    });

    html += `<option value="all" ${this.currentBatchId === 'all' ? 'selected' : ''}>✦ All Batches (Combined Cross-Schedule)</option>`;
    select.innerHTML = html;

    // Update batch info display
    const infoEl = document.getElementById('current-batch-meta');
    if (infoEl) {
      if (this.currentBatchId === 'all') {
        infoEl.textContent = `Viewing combined schedule across ${batches.length} medical batches`;
      } else {
        const b = this.batchManager.getBatch(this.currentBatchId);
        infoEl.textContent = b ? `${b.name} • Live on PW MedEd APP` : '';
      }
    }
  }

  updateSubjectAndFacultyFilters() {
    const allEventsForBatch = this.batchManager.getAllEvents(this.currentBatchId);
    
    // Extract unique subjects & faculties
    const subjects = new Set();
    const faculties = new Set();

    allEventsForBatch.forEach(e => {
      if (e.subject) subjects.add(e.subject.trim());
      if (e.faculty && e.eventType === 'class') faculties.add(e.faculty.trim());
    });

    // Render Subject Filter Chips
    const chipsContainer = document.getElementById('subject-chips-container');
    if (chipsContainer) {
      let chipsHtml = `
        <button class="chip-filter ${this.selectedSubjects.size === 0 ? 'active' : ''}" data-subject="all">
          All Subjects
        </button>
      `;

      Array.from(subjects).sort().forEach(sub => {
        const col = getSubjectColor(sub);
        const isActive = this.selectedSubjects.has(sub);
        chipsHtml += `
          <button class="chip-filter ${isActive ? 'active' : ''}" data-subject="${sub}" style="--chip-accent: ${col.border};">
            <span class="chip-dot" style="background: ${col.border};"></span>
            ${sub}
          </button>
        `;
      });

      chipsContainer.innerHTML = chipsHtml;

      chipsContainer.querySelectorAll('.chip-filter').forEach(btn => {
        btn.addEventListener('click', () => {
          const sub = btn.getAttribute('data-subject');
          if (sub === 'all') {
            this.selectedSubjects.clear();
          } else {
            if (this.selectedSubjects.has(sub)) {
              this.selectedSubjects.delete(sub);
            } else {
              this.selectedSubjects.add(sub);
            }
          }
          this.updateSubjectChipStates();
          this.renderCurrentView();
          this.renderStats();
          this.refreshIcons();
        });
      });
    }

    // Render Faculty Dropdown
    const facSelect = document.getElementById('faculty-filter-select');
    if (facSelect) {
      let facHtml = '<option value="">All Faculty Members</option>';
      Array.from(faculties).sort().forEach(fac => {
        facHtml += `<option value="${fac}" ${this.selectedFaculty === fac ? 'selected' : ''}>${fac}</option>`;
      });
      facSelect.innerHTML = facHtml;
    }
  }

  updateSubjectChipStates() {
    const chipsContainer = document.getElementById('subject-chips-container');
    if (!chipsContainer) return;

    chipsContainer.querySelectorAll('.chip-filter').forEach(btn => {
      const sub = btn.getAttribute('data-subject');
      if (sub === 'all') {
        btn.classList.toggle('active', this.selectedSubjects.size === 0);
      } else {
        btn.classList.toggle('active', this.selectedSubjects.has(sub));
      }
    });
  }

  resetFilters() {
    this.searchQuery = '';
    const searchInput = document.getElementById('global-search');
    if (searchInput) searchInput.value = '';

    this.selectedSubjects.clear();
    this.updateSubjectChipStates();

    this.selectedFaculty = '';
    const facSelect = document.getElementById('faculty-filter-select');
    if (facSelect) facSelect.value = '';

    this.hideBreaks = false;
    const hideBreaksCheck = document.getElementById('hide-breaks-toggle');
    if (hideBreaksCheck) hideBreaksCheck.checked = false;

    this.renderCurrentView();
    this.renderStats();
    this.refreshIcons();
  }

  renderStats() {
    const filteredEvents = this.getFilteredEvents();
    const classEvents = filteredEvents.filter(e => e.eventType === 'class');
    const coolOffEvents = filteredEvents.filter(e => e.eventType === 'cool_off' || e.eventType === 'holiday');

    let totalHours = 0;
    classEvents.forEach(e => {
      const m = (e.duration || '').match(/(\d+(?:\.\d+)?)/);
      totalHours += m ? parseFloat(m[1]) : 2;
    });

    const faculties = new Set(classEvents.map(e => e.faculty).filter(Boolean));
    const subjects = new Set(classEvents.map(e => e.subject).filter(Boolean));

    const statLec = document.getElementById('stat-total-lectures');
    const statHours = document.getElementById('stat-total-hours');
    const statFac = document.getElementById('stat-total-faculty');
    const statSub = document.getElementById('stat-total-subjects');
    const statCool = document.getElementById('stat-total-cooloff');

    if (statLec) statLec.textContent = classEvents.length;
    if (statHours) statHours.textContent = `${Math.round(totalHours)}h`;
    if (statFac) statFac.textContent = faculties.size;
    if (statSub) statSub.textContent = subjects.size;
    if (statCool) statCool.textContent = coolOffEvents.length;
  }

  renderCurrentView() {
    const container = document.getElementById('main-content-view');
    if (!container) return;

    const filteredEvents = this.getFilteredEvents();

    if (this.activeView === 'month') {
      renderCalendarMonth(
        container,
        filteredEvents,
        this.calendarDate,
        (event) => this.openEventModal(event)
      );
      this.attachMonthNavListeners();
    } else if (this.activeView === 'timetable') {
      renderTimetableView(
        container,
        filteredEvents,
        this.timetableWeekStart,
        (event) => this.openEventModal(event)
      );
      this.attachTimetableNavListeners();
    } else if (this.activeView === 'agenda') {
      renderTableView(
        container,
        filteredEvents,
        {
          searchQuery: this.searchQuery,
          sortColumn: this.tableSort.column,
          sortAsc: this.tableSort.asc
        },
        (event) => this.openEventModal(event)
      );
      this.attachTableSortListeners();
    } else if (this.activeView === 'faculty') {
      renderFacultyView(
        container,
        filteredEvents,
        (facultyName) => {
          this.selectedFaculty = facultyName;
          const facSelect = document.getElementById('faculty-filter-select');
          if (facSelect) facSelect.value = facultyName;
          this.switchView('month');
        },
        (event) => this.openEventModal(event)
      );
    }

    this.refreshIcons();
  }

  attachMonthNavListeners() {
    document.getElementById('cal-prev-month')?.addEventListener('click', () => {
      this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
      this.renderCurrentView();
    });

    document.getElementById('cal-next-month')?.addEventListener('click', () => {
      this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
      this.renderCurrentView();
    });

    document.getElementById('cal-today-btn')?.addEventListener('click', () => {
      this.calendarDate = new Date();
      this.renderCurrentView();
    });

    document.getElementById('cal-quick-oct')?.addEventListener('click', () => {
      this.calendarDate = new Date(2026, 9, 1);
      this.renderCurrentView();
    });

    document.getElementById('cal-quick-nov')?.addEventListener('click', () => {
      this.calendarDate = new Date(2026, 10, 1);
      this.renderCurrentView();
    });
  }

  attachTimetableNavListeners() {
    document.getElementById('tt-prev-week')?.addEventListener('click', () => {
      this.timetableWeekStart.setDate(this.timetableWeekStart.getDate() - 7);
      this.renderCurrentView();
    });

    document.getElementById('tt-next-week')?.addEventListener('click', () => {
      this.timetableWeekStart.setDate(this.timetableWeekStart.getDate() + 7);
      this.renderCurrentView();
    });

    document.getElementById('tt-curr-week')?.addEventListener('click', () => {
      this.timetableWeekStart = new Date();
      this.renderCurrentView();
    });

    document.getElementById('tt-jump-first')?.addEventListener('click', () => {
      this.timetableWeekStart = new Date(2026, 9, 15);
      this.renderCurrentView();
    });
  }

  attachTableSortListeners() {
    document.querySelectorAll('.th-sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (this.tableSort.column === col) {
          this.tableSort.asc = !this.tableSort.asc;
        } else {
          this.tableSort.column = col;
          this.tableSort.asc = true;
        }
        this.renderCurrentView();
      });
    });
  }

  // --- Modals & Actions ---

  openEventModal(ev) {
    const modal = document.getElementById('event-detail-modal');
    if (!modal) return;

    const col = getSubjectColor(ev.subject);
    const facultyInitial = ev.faculty ? ev.faculty.replace(/^Dr\.\s*/i, '').trim().charAt(0) : 'F';

    // Topic formatting
    let formattedTopic = '';
    if (ev.topic) {
      const lines = ev.topic.split(/\r?\n/).filter(Boolean);
      if (lines.length > 1) {
        formattedTopic = '<ul class="modal-topic-list">' + lines.map(l => `<li>${l.trim()}</li>`).join('') + '</ul>';
      } else {
        formattedTopic = `<p class="modal-topic-single">${ev.topic}</p>`;
      }
    } else {
      formattedTopic = '<p class="text-muted">No topic details provided.</p>';
    }

    const isClass = ev.eventType === 'class';

    const modalBody = document.getElementById('event-modal-content');
    modalBody.innerHTML = `
      <div class="event-modal-header" style="border-left-color: ${isClass ? col.border : '#0d9488'};">
        <div class="modal-tags-row">
          <span class="modal-batch-pill">${escapeHtml(ev.batchName || 'PW MedEd Batch')}</span>
          ${isClass ? `<span class="modal-subject-pill" style="color: ${col.text}; background: ${col.bg}; border: 1px solid ${col.border};">${escapeHtml(ev.subject)}</span>` : ''}
          ${ev.eventType === 'cool_off' ? `<span class="modal-cool-pill"><i data-lucide="coffee"></i> COOL OFF DAY</span>` : ''}
          ${ev.eventType === 'holiday' ? `<span class="modal-holiday-pill"><i data-lucide="sparkles"></i> ${escapeHtml(ev.faculty || 'Holiday')}</span>` : ''}
        </div>

        <h3 class="modal-lecture-title">${escapeHtml(ev.chapter || ev.topic || ev.displayTitle)}</h3>
      </div>

      <div class="modal-meta-grid">
        <div class="meta-item">
          <span class="meta-icon"><i data-lucide="calendar"></i></span>
          <div>
            <span class="meta-label">Date & Day</span>
            <span class="meta-value font-medium">${escapeHtml(ev.dateRaw || ev.isoDate)}</span>
          </div>
        </div>

        <div class="meta-item">
          <span class="meta-icon"><i data-lucide="clock"></i></span>
          <div>
            <span class="meta-label">Lecture Timing</span>
            <span class="meta-value font-medium">${escapeHtml(ev.timings || 'TBD')}</span>
          </div>
        </div>

        <div class="meta-item">
          <span class="meta-icon"><i data-lucide="hourglass"></i></span>
          <div>
            <span class="meta-label">Duration</span>
            <span class="meta-value font-medium">${escapeHtml(ev.duration || '2 Hours')}</span>
          </div>
        </div>

        <div class="meta-item">
          <span class="meta-icon"><i data-lucide="layers"></i></span>
          <div>
            <span class="meta-label">Lecture No.</span>
            <span class="meta-value font-medium">Lecture #${escapeHtml(ev.noLectures || '1')}</span>
          </div>
        </div>
      </div>

      ${isClass ? `
        <div class="modal-faculty-box">
          <div class="fac-avatar" style="background: ${col.border};">${facultyInitial}</div>
          <div class="fac-info">
            <span class="fac-label">Faculty Member</span>
            <h4 class="fac-name">${escapeHtml(ev.faculty)}</h4>
            <span class="fac-subject-tag">${escapeHtml(ev.subject)} Specialist</span>
          </div>
        </div>

        <div class="modal-topic-section">
          <h4 class="section-subheading"><i data-lucide="book-open"></i> Detailed Topics Covered:</h4>
          <div class="topic-box">
            ${formattedTopic}
          </div>
        </div>

        <div class="modal-actions-footer">
          <button class="btn btn-secondary w-full" id="modal-share-btn">
            <i data-lucide="share-2"></i> Copy Details
          </button>
        </div>
      ` : `
        <div class="modal-cool-content">
          <p class="cool-text">This day is designated as a Cool Off / Break period. No live classes are scheduled on the PW MedEd App.</p>
        </div>
      `}
    `;

    modal.classList.add('active');
    this.refreshIcons();

    // Modal action listeners

    modalBody.querySelector('#modal-share-btn')?.addEventListener('click', () => {
      const text = `${ev.batchName}\n${ev.subject} by ${ev.faculty}\nDate: ${ev.dateRaw} (${ev.timings})\nChapter: ${ev.chapter}\nTopic: ${ev.topic}`;
      navigator.clipboard.writeText(text);
      this.showToast('Lecture details copied to clipboard!');
    });
  }

  closeEventModal() {
    document.getElementById('event-detail-modal')?.classList.remove('active');
  }

  openConnectModal() {
    const modal = document.getElementById('connect-sheet-modal');
    if (!modal) return;

    this.renderConnectedSheetsList();
    modal.classList.add('active');
    this.refreshIcons();
  }

  closeConnectModal() {
    document.getElementById('connect-sheet-modal')?.classList.remove('active');
    const statusBox = document.getElementById('connect-status-box');
    if (statusBox) {
      statusBox.innerHTML = '';
      statusBox.className = 'connect-status-box';
    }
  }

  renderConnectedSheetsList() {
    const container = document.getElementById('connected-batches-list');
    if (!container) return;

    const batches = this.batchManager.getBatches();
    let html = '';

    batches.forEach(b => {
      const isDefault = b.id.includes('batch-prarambh-2026') || b.id.includes('batch-sushruta-2026');
      html += `
        <div class="connected-batch-item" data-id="${b.id}">
          <div class="batch-item-info">
            <h4 class="batch-item-name">${escapeHtml(b.name)}</h4>
            <div class="batch-item-meta">
              <span class="meta-tag"><i data-lucide="book-check"></i> ${b.events.length} lectures</span>
              <span class="meta-tag"><i data-lucide="table"></i> ${escapeHtml(b.sheetTabName || 'Lecture Planner')}</span>
              ${b.lastSynced ? `<span class="meta-tag"><i data-lucide="clock"></i> Synced: ${new Date(b.lastSynced).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>` : ''}
            </div>
            ${b.sourceUrl ? `<a href="${b.sourceUrl}" target="_blank" rel="noopener" class="batch-sheet-link"><i data-lucide="external-link"></i> View Google Sheet</a>` : ''}
          </div>
          <div class="batch-item-actions">
            <button class="btn btn-secondary btn-xs btn-sync-single" data-id="${b.id}" title="Sync this sheet live">
              <i data-lucide="refresh-cw"></i> Sync
            </button>
            ${!isDefault ? `
              <button class="btn btn-danger btn-xs btn-remove-batch" data-id="${b.id}" title="Remove batch">
                <i data-lucide="trash-2"></i>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Listeners for sync and delete in list
    container.querySelectorAll('.btn-sync-single').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.classList.add('loading');
        try {
          await this.batchManager.syncBatch(id);
          this.showToast('Sheet synchronized successfully!');
          this.renderConnectedSheetsList();
          this.renderBatchSelector();
          this.renderCurrentView();
          this.renderStats();
        } catch (e) {
          this.showToast(`Sync error: ${e.message}`, 'error');
        } finally {
          btn.classList.remove('loading');
          this.refreshIcons();
        }
      });
    });

    container.querySelectorAll('.btn-remove-batch').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to remove this batch?')) {
          this.batchManager.removeBatch(id);
          if (this.currentBatchId === id) {
            this.currentBatchId = this.batchManager.getBatches()[0].id;
          }
          this.renderConnectedSheetsList();
          this.renderBatchSelector();
          this.onBatchChanged();
          this.showToast('Batch removed.');
        }
      });
    });
  }

  async handleConnectNewSheet() {
    const urlInput = document.getElementById('new-sheet-url');
    const tabInput = document.getElementById('new-sheet-tab');
    const nameInput = document.getElementById('new-sheet-name');
    const statusBox = document.getElementById('connect-status-box');
    const saveBtn = document.getElementById('save-new-sheet-btn');

    const url = (urlInput?.value || '').trim();
    const tabName = (tabInput?.value || '').trim() || 'Lecture Planner';
    const customName = (nameInput?.value || '').trim();

    if (!url) {
      this.setStatusMessage(statusBox, 'Please provide a Google Sheets URL.', 'error');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span class="spinner"></span> Connecting & Syncing...';
    this.setStatusMessage(statusBox, 'Fetching Google Sheet data and parsing schedule...', 'info');

    try {
      const newBatch = await this.batchManager.addBatchFromUrl(url, tabName, customName);
      this.setStatusMessage(statusBox, `Success! Connected "${newBatch.name}" with ${newBatch.events.length} lectures.`, 'success');
      
      this.currentBatchId = newBatch.id;
      this.renderConnectedSheetsList();
      this.renderBatchSelector();
      this.onBatchChanged();

      if (urlInput) urlInput.value = '';
      if (nameInput) nameInput.value = '';

      setTimeout(() => {
        this.closeConnectModal();
        this.showToast(`Batch "${newBatch.name}" is now active!`);
      }, 1200);

    } catch (err) {
      console.error(err);
      this.setStatusMessage(
        statusBox,
        `Connection failed: ${err.message}. Make sure the sheet is shared as "Anyone with the link can view" and has a "Lecture Planner" tab.`,
        'error'
      );
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i data-lucide="plus-circle"></i> Connect & Import Batch';
      this.refreshIcons();
    }
  }

  async handleSyncBatch() {
    const syncBtn = document.getElementById('sync-current-batch-btn');
    if (!syncBtn) return;

    syncBtn.classList.add('rotating');
    try {
      if (this.currentBatchId === 'all') {
        await this.batchManager.syncAllBatches();
        this.showToast('All batches synced successfully!');
      } else {
        await this.batchManager.syncBatch(this.currentBatchId);
        this.showToast('Current batch synced with Google Sheets!');
      }
      this.onBatchChanged();
    } catch (e) {
      this.showToast(`Sync failed: ${e.message}`, 'error');
    } finally {
      syncBtn.classList.remove('rotating');
    }
  }

  exportCurrentScheduleIcs() {
    const filteredEvents = this.getFilteredEvents().filter(e => e.eventType === 'class');
    if (filteredEvents.length === 0) {
      this.showToast('No classes available to export.', 'error');
      return;
    }

    const currentBatch = this.batchManager.getBatch(this.currentBatchId);
    const batchName = currentBatch ? currentBatch.name : 'PW_MedEd_All_Batches';
    const icsContent = generateIcsContent(filteredEvents, `${batchName} Schedule`);
    downloadIcsFile(`${batchName.replace(/[^a-zA-Z0-9]/g, '_')}_Schedule.ics`, icsContent);
    this.showToast(`Exported ${filteredEvents.length} lectures to .ics!`);
  }

  setStatusMessage(el, text, type = 'info') {
    if (!el) return;
    el.className = `connect-status-box status-${type}`;
    el.innerHTML = text;
  }

  showToast(message, type = 'success') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'app-toast';
      toast.className = 'app-toast';
      document.body.appendChild(toast);
    }
    toast.className = `app-toast toast-${type} show`;
    toast.innerHTML = `<i data-lucide="${type === 'success' ? 'check-circle' : 'alert-triangle'}"></i> ${message}`;
    this.refreshIcons();

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  refreshIcons() {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.medEdApp = new AppController();
});
