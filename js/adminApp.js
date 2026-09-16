/**
 * PW MedEd - Admin Dashboard Controller
 * Full multi-view scheduling: Month, Week, Timeline Table, Faculty Directory, and Curriculum Dashboard.
 */

import { BatchManager, detectGoogleSheetTabs } from './sheetConnector.js';
import { generateGoogleCalendarUrl, generateIcsContent, downloadIcsFile } from './icsExporter.js';
import { reminderEmailService } from './reminderEmailService.js';

class AdminDashboardController {
  constructor() {
    this.batchManager = new BatchManager();
    this.currentBatchId = 'batch-prarambh-2026';
    this.currentYear = 2026;
    this.currentMonth = 9; // 0-indexed: 9 = October
    this.currentWeekStart = new Date(2026, 9, 11); // Sunday Oct 11, 2026
    this.selectedSubject = 'all';
    this.searchQuery = '';
    
    // View state
    this.mainTab = 'calendar'; // 'calendar' | 'dashboard' | 'faculty' | 'onboarding'
    this.calendarSubView = 'month'; // 'month' | 'week' | 'timeline'
    this.timelineMode = 'stream'; // 'stream' | 'table'

    // Check URL parameters / hash for pre-selected view or screen
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const path = window.location.pathname.toLowerCase();
    if (viewParam === 'week' || path.includes('week') || window.location.hash === '#week') {
      this.calendarSubView = 'week';
    } else if (viewParam === 'timeline' || path.includes('timeline') || window.location.hash === '#timeline' || window.location.hash === '#agenda') {
      this.calendarSubView = 'timeline';
    } else if (urlParams.get('tab') === 'dashboard' || window.location.hash === '#dashboard') {
      this.mainTab = 'dashboard';
    } else if (urlParams.get('tab') === 'faculty' || window.location.hash === '#faculty') {
      this.mainTab = 'faculty';
    } else if (urlParams.get('tab') === 'onboarding' || window.location.hash === '#onboarding' || path.includes('onboard')) {
      this.mainTab = 'onboarding';
    }

    // Faculty Onboarding State - loaded dynamically from Reminder Email Service
    this.onboardingPage = 1;
    this.onboardingPageSize = 5;
    this.editingFacultyId = null;
    this.onboardingSearchQuery = '';
    this.onboardingDeptFilter = 'All';
    this.onboardingStatusFilter = 'All';
    this.facultyOnboardingList = reminderEmailService.getFacultyOnboardingList();

    this.init();
  }

  init() {
    this.setupHeaderControls();
    this.setupViewSwitcher();
    this.setupDockNavigation();
    this.setupNotificationDrawer();
    this.setupScheduleClassModal();
    this.setupConnectSheetModal();
    this.setupAdminSettingsModal();
    this.setupEmailPreviewModal();
    this.setupEventDetailModal();
    this.initOnboardingHandlers();
    this.renderOnboardingList();
    this.renderAdminNotifications();
    this.startAutomatedReminderEngine();
    this.autoAdjustDateToActiveBatch();
    this.renderAll();
  }

  autoAdjustDateToActiveBatch() {
    const events = this.batchManager.getAllEvents(this.currentBatchId);
    const firstClass = events.find(e => e.eventType === 'class' && e.isoDate);
    if (firstClass && firstClass.isoDate) {
      const [y, m, d] = firstClass.isoDate.split('-').map(Number);
      if (y && m) {
        this.currentYear = y;
        this.currentMonth = m - 1;
        this.currentWeekStart = new Date(y, m - 1, d || 1);
      }
    }
  }

  renderAll() {
    this.updateHeaderBatchSelector();
    this.updateMonthTitle();
    this.updateSummaryCards();
    this.updateSubjectFilterButtons();
    this.renderMainContent();
  }

  getActiveBatch() {
    if (this.currentBatchId === 'all') {
      const allEvents = this.batchManager.getAllEvents('all');
      return {
        id: 'all',
        name: 'All Batches • Combined Schedule',
        sheetTabName: 'All Sheets',
        events: allEvents
      };
    }
    let active = this.batchManager.getBatch(this.currentBatchId);
    if (active && active.name && !active.name.toLowerCase().includes('completion %')) {
      return active;
    }
    const valid = this.batchManager.getBatches().filter(b => b && b.name && !b.name.toLowerCase().includes('completion %'));
    if (valid.length > 0) {
      this.currentBatchId = valid[0].id;
      return valid[0];
    }
    return this.batchManager.getBatches()[0] || {
      id: 'batch-prarambh-2026',
      name: 'Prarambh 2026 Batch for MBBS 1st Year',
      events: []
    };
  }

  getCurrentBatch() {
    return this.getActiveBatch();
  }

  getAllActiveEvents() {
    let events = this.batchManager.getAllEvents(this.currentBatchId);

    // Apply Subject Filter
    if (this.selectedSubject !== 'all') {
      events = events.filter(e => e.subject && e.subject.toLowerCase() === this.selectedSubject.toLowerCase());
    }

    // Apply Search Filter
    if (this.searchQuery) {
      events = events.filter(e => {
        const text = [
          e.topic || '',
          e.chapter || '',
          e.faculty || '',
          e.subject || '',
          e.dateRaw || '',
          e.timings || ''
        ].join(' ').toLowerCase();
        return text.includes(this.searchQuery);
      });
    }

    return events;
  }

  // --- 1. Header & Batch Selector ---
  setupHeaderControls() {
    const batchPill = document.getElementById('adminBatchPill');
    const batchDropdown = document.getElementById('adminBatchDropdown');
    const searchInput = document.getElementById('adminSearchInput');

    // Toggle Batch Dropdown
    batchPill?.addEventListener('click', (e) => {
      e.stopPropagation();
      batchDropdown?.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!batchPill?.contains(e.target) && !batchDropdown?.contains(e.target)) {
        batchDropdown?.classList.add('hidden');
      }
    });

    // Search Input
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim().toLowerCase();
      this.renderMainContent();
    });

    // Logo Click -> Reset to Month view
    document.getElementById('adminLogoBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.mainTab = 'calendar';
      this.calendarSubView = 'month';
      this.selectedSubject = 'all';
      this.searchQuery = '';
      if (searchInput) searchInput.value = '';
      this.updateDockState('calendar');
      this.updateMonthTitle();
      this.renderAll();
    });

    // Dean Profile Dropdown
    const deanBtn = document.getElementById('adminDeanProfileBtn');
    const deanDropdown = document.getElementById('adminDeanDropdown');
    deanBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      deanDropdown?.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!deanBtn?.contains(e.target) && !deanDropdown?.contains(e.target)) {
        deanDropdown?.classList.add('hidden');
      }
    });

    document.getElementById('deanMenuDashboardBtn')?.addEventListener('click', () => {
      deanDropdown?.classList.add('hidden');
      this.mainTab = 'dashboard';
      this.updateDockState('dashboard');
      this.renderMainContent();
    });

    document.getElementById('deanMenuFacultyBtn')?.addEventListener('click', () => {
      deanDropdown?.classList.add('hidden');
      this.mainTab = 'faculty';
      this.updateDockState('faculty');
      this.renderMainContent();
    });

    document.getElementById('deanMenuOnboardBtn')?.addEventListener('click', () => {
      deanDropdown?.classList.add('hidden');
      this.mainTab = 'onboarding';
      this.updateDockState('onboarding');
      window.location.hash = 'onboarding';
      this.renderMainContent();
    });

    document.getElementById('deanMenuSettingsBtn')?.addEventListener('click', () => {
      deanDropdown?.classList.add('hidden');
      this.openAdminSettingsModal('email');
    });

    document.getElementById('deanMenuConnectSheetBtn')?.addEventListener('click', () => {
      deanDropdown?.classList.add('hidden');
      this.openAdminSettingsModal('sheet');
    });

    // Summary Metric Cards Click Handlers
    document.getElementById('cardScheduleOverviewBtn')?.addEventListener('click', () => {
      this.currentYear = 2026;
      this.currentMonth = 9; // October 2026
      this.currentWeekStart = new Date(2026, 9, 11);
      this.mainTab = 'calendar';
      this.calendarSubView = 'month';
      this.updateDockState('calendar');
      this.updateMonthTitle();
      this.renderMainContent();
      this.showToast('Viewing October 2026 Term Overview');
    });

    document.getElementById('cardActiveFacultyBtn')?.addEventListener('click', () => {
      this.mainTab = 'faculty';
      this.updateDockState('faculty');
      this.renderMainContent();
    });

    document.getElementById('cardCurriculumPaceBtn')?.addEventListener('click', () => {
      this.mainTab = 'dashboard';
      this.updateDockState('dashboard');
      this.renderMainContent();
    });

    // Month & Week Date Navigation
    document.getElementById('prevMonthBtn')?.addEventListener('click', () => {
      if (this.calendarSubView === 'week') {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
        this.currentYear = this.currentWeekStart.getFullYear();
        this.currentMonth = this.currentWeekStart.getMonth();
      } else {
        this.currentMonth--;
        if (this.currentMonth < 0) {
          this.currentMonth = 11;
          this.currentYear--;
        }
        this.currentWeekStart = new Date(this.currentYear, this.currentMonth, 1);
      }
      this.updateMonthTitle();
      this.renderMainContent();
    });

    document.getElementById('nextMonthBtn')?.addEventListener('click', () => {
      if (this.calendarSubView === 'week') {
        this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
        this.currentYear = this.currentWeekStart.getFullYear();
        this.currentMonth = this.currentWeekStart.getMonth();
      } else {
        this.currentMonth++;
        if (this.currentMonth > 11) {
          this.currentMonth = 0;
          this.currentYear++;
        }
        this.currentWeekStart = new Date(this.currentYear, this.currentMonth, 1);
      }
      this.updateMonthTitle();
      this.renderMainContent();
    });

    document.getElementById('todayMonthBtn')?.addEventListener('click', () => {
      const now = new Date();
      this.currentYear = now.getFullYear();
      this.currentMonth = now.getMonth();
      this.currentWeekStart = new Date(now);
      this.updateMonthTitle();
      this.renderMainContent();

      setTimeout(() => {
        const todayEl = document.getElementById('calendarTodayCell') || document.getElementById('weekTodayColumn');
        if (todayEl) {
          todayEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      }, 80);

      const formatted = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      this.showToast(`Navigated to Today (${formatted})`);
    });
  }

  updateHeaderBatchSelector() {
    const batch = this.getActiveBatch();
    const label = document.getElementById('adminBatchLabel');
    if (label && batch) {
      label.textContent = batch.name;
    }

    const dropdownList = document.getElementById('adminBatchDropdownList');
    if (dropdownList) {
      const batches = this.batchManager.getBatches();
      const isAllSelected = this.currentBatchId === 'all';
      const allEvents = this.batchManager.getAllEvents('all');
      const totalAllClasses = allEvents.filter(e => e.eventType === 'class').length;

      dropdownList.innerHTML = `
        <div class="px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#f4efe6] cursor-pointer flex items-center justify-between transition-colors border-b border-[#f0ece4] ${isAllSelected ? 'bg-[#eef4f0] text-[#2d4d37] font-bold' : 'text-[#3b433c]'}" data-batch-id="all">
          <div class="truncate pr-2">
            <span class="block font-bold truncate text-xs flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[15px] text-[#4a7c59]">select_all</span>
              All Batches (Select All)
            </span>
            <span class="text-[10px] text-[#788279] block pl-5">Combined Schedule • ${totalAllClasses} classes</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            ${isAllSelected ? '<span class="material-symbols-outlined text-[16px] text-[#4a7c59]">check</span>' : ''}
          </div>
        </div>
      ` + batches.map(b => `
        <div class="px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#f4efe6] cursor-pointer flex items-center justify-between transition-colors ${b.id === this.currentBatchId ? 'bg-[#eef4f0] text-[#2d4d37] font-bold' : 'text-[#3b433c]'}" data-batch-id="${b.id}">
          <div class="truncate pr-2">
            <span class="block truncate font-semibold">${b.name}</span>
            <span class="text-[10px] text-[#788279] block">${b.sheetTabName || 'Lecture Planner'} • ${b.events ? b.events.length : 0} classes</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            ${b.id === this.currentBatchId ? '<span class="material-symbols-outlined text-[16px] text-[#4a7c59]">check</span>' : ''}
            ${!['batch-prarambh-2026', 'batch-sushruta-2026'].includes(b.id) ? `
              <button class="text-[#8b958c] hover:text-[#c26d3e] p-0.5 rounded hover:bg-[#faeae1] cursor-pointer btn-delete-batch" data-delete-id="${b.id}" title="Remove this batch">
                <span class="material-symbols-outlined text-[15px]">delete</span>
              </button>
            ` : ''}
          </div>
        </div>
      `).join('') + `
        <div class="px-3 py-2 text-xs font-bold rounded-lg hover:bg-[#eef4f0] text-[#4a7c59] cursor-pointer flex items-center gap-1.5 border-t border-[#ded5c6] mt-1 pt-2" id="adminAddNewSheetLink">
          <span class="material-symbols-outlined text-[16px]">add_circle</span>
          <span>Connect New Google Sheet</span>
        </div>
        <div class="px-3 py-1.5 text-[11px] font-semibold text-[#8b958c] hover:text-[#2c332d] hover:bg-[#f4efe6] rounded-lg cursor-pointer flex items-center gap-1.5" id="adminResetBatchesLink">
          <span class="material-symbols-outlined text-[15px]">restart_alt</span>
          <span>Reset Default Batches</span>
        </div>
      `;

      dropdownList.querySelectorAll('[data-batch-id]').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('.btn-delete-batch')) return;
          this.currentBatchId = el.getAttribute('data-batch-id');
          document.getElementById('adminBatchDropdown')?.classList.add('hidden');
          this.selectedSubject = 'all';
          this.autoAdjustDateToActiveBatch();
          this.renderAll();
          this.showToast(`Switched to ${this.getActiveBatch()?.name}`);
        });
      });

      dropdownList.querySelectorAll('.btn-delete-batch').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const idToDelete = btn.getAttribute('data-delete-id');
          if (confirm('Are you sure you want to remove this batch?')) {
            this.batchManager.removeBatch(idToDelete);
            this.currentBatchId = this.batchManager.getBatches()[0].id;
            this.autoAdjustDateToActiveBatch();
            this.renderAll();
            this.showToast('Batch removed');
          }
        });
      });

      dropdownList.querySelector('#adminResetBatchesLink')?.addEventListener('click', () => {
        if (confirm('Reset all batch calendars to default (Prarambh 2026 & Sushruta 2026)?')) {
          this.batchManager.resetToDefaults();
          this.currentBatchId = 'batch-prarambh-2026';
          document.getElementById('adminBatchDropdown')?.classList.add('hidden');
          this.autoAdjustDateToActiveBatch();
          this.renderAll();
          this.showToast('Reset to default batches');
        }
      });

      dropdownList.querySelector('#adminAddNewSheetLink')?.addEventListener('click', () => {
        document.getElementById('adminBatchDropdown')?.classList.add('hidden');
        document.getElementById('connectSheetModalAdmin')?.classList.remove('hidden');
      });
    }
  }

  updateMonthTitle() {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const titleEl = document.getElementById('adminCurrentMonthTitle');
    if (titleEl) {
      if (this.calendarSubView === 'week') {
        const d = new Date(this.currentWeekStart.getTime());
        const day = d.getDay();
        const sunday = new Date(d);
        sunday.setDate(d.getDate() - day);
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        titleEl.textContent = `Week: ${sunday.toLocaleString('en-US', { month: 'short' })} ${sunday.getDate()} – ${saturday.toLocaleString('en-US', { month: 'short' })} ${saturday.getDate()}, ${saturday.getFullYear()}`;
      } else if (this.calendarSubView === 'timeline') {
        titleEl.textContent = `${monthNames[this.currentMonth]} ${this.currentYear} Timeline`;
      } else {
        titleEl.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
      }
    }
  }

  // --- 2. View Switcher (Month / Week / Timeline) ---
  setupViewSwitcher() {
    const btnMonth = document.getElementById('btnViewMonth');
    const btnWeek = document.getElementById('btnViewWeek');
    const btnTimeline = document.getElementById('btnViewTimeline');

    this.updateViewButtons = () => {
      [btnMonth, btnWeek, btnTimeline].forEach(b => {
        if (!b) return;
        b.className = 'px-3.5 py-1 rounded-lg text-[#576058] hover:text-[#2c332d] font-semibold transition-colors cursor-pointer border-none bg-transparent';
      });

      let activeBtn = btnMonth;
      if (this.calendarSubView === 'week') activeBtn = btnWeek;
      if (this.calendarSubView === 'timeline') activeBtn = btnTimeline;

      if (activeBtn) {
        activeBtn.className = 'px-3.5 py-1 rounded-lg btn-3d-primary font-bold text-white cursor-pointer border-none';
      }
    };

    this.updateViewButtons();

    btnMonth?.addEventListener('click', () => {
      this.calendarSubView = 'month';
      this.mainTab = 'calendar';
      this.updateDockState('calendar');
      this.updateViewButtons();
      this.updateMonthTitle();
      this.renderMainContent();
    });

    btnWeek?.addEventListener('click', () => {
      this.calendarSubView = 'week';
      this.mainTab = 'calendar';
      this.updateDockState('calendar');
      this.updateViewButtons();
      this.updateMonthTitle();
      this.renderMainContent();
    });

    btnTimeline?.addEventListener('click', () => {
      this.calendarSubView = 'timeline';
      this.mainTab = 'calendar';
      this.updateDockState('calendar');
      this.updateViewButtons();
      this.updateMonthTitle();
      this.renderMainContent();
    });
  }

  // --- 3. Summary Metric Cards ---
  updateSummaryCards() {
    const activeBatch = this.getActiveBatch();
    const allEvents = this.batchManager.getAllEvents(this.currentBatchId);
    const classes = allEvents.filter(e => e.eventType === 'class');

    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthLabel = `${monthsShort[this.currentMonth]} '${String(this.currentYear).slice(-2)}`;

    const monthClasses = classes.filter(e => {
      if (!e.isoDate) return false;
      const [y, m] = e.isoDate.split('-').map(Number);
      return y === this.currentYear && m === (this.currentMonth + 1);
    });

    // Card 1: Schedule Overview
    const countEl = document.getElementById('cardScheduleCount');
    if (countEl) countEl.textContent = monthClasses.length || classes.length;

    const monthBadge = document.getElementById('cardScheduleMonthBadge');
    if (monthBadge) monthBadge.textContent = currentMonthLabel;

    const progressBar = document.getElementById('cardScheduleProgressBar');
    if (progressBar) {
      const targetCount = Math.max(classes.length, 25);
      const pct = Math.min(100, Math.max(20, Math.round(((monthClasses.length || classes.length) / targetCount) * 100)));
      progressBar.style.width = `${pct}%`;
    }

    // Card 2: Active Faculty
    const facultySet = new Set(classes.map(e => e.faculty).filter(Boolean));
    const facCountEl = document.getElementById('cardFacultyCount');
    if (facCountEl) facCountEl.textContent = facultySet.size;

    const facAvatarList = document.getElementById('cardFacultyAvatars');
    if (facAvatarList) {
      const facArray = Array.from(facultySet).slice(0, 5);
      facAvatarList.innerHTML = facArray.map((name, i) => {
        const initials = name.replace(/^Dr\.\s*/i, '').split(' ').map(n => n[0]).join('').slice(0, 2) || 'DR';
        const colors = ['bg-[#f4ece1] text-[#705c30]', 'bg-[#eef4f0] text-[#4a7c59]', 'bg-[#fbf3ec] text-[#c26d3e]', 'bg-[#e4ede6] text-[#3b6347]'];
        const col = colors[i % colors.length];
        return `<div class="w-6 h-6 rounded-full ${col} border-2 border-white shadow-xs flex items-center justify-center text-[9px] font-bold" title="${name}">${initials}</div>`;
      }).join('');
    }

    const subSet = new Set(classes.map(e => e.subject).filter(Boolean));
    const subSummaryEl = document.getElementById('cardSubjectsSummary');
    if (subSummaryEl) {
      subSummaryEl.textContent = Array.from(subSet).slice(0, 4).join(', ') || 'No subjects assigned';
    }

    const facCoverageBadge = document.getElementById('cardFacultyCoverageBadge');
    if (facCoverageBadge) {
      facCoverageBadge.textContent = facultySet.size > 0 ? `${facultySet.size} Assigned` : 'Unassigned';
    }

    // Card 3: Curriculum Pace
    const pacePercentEl = document.getElementById('cardCurriculumPacePercent');
    const paceStatusEl = document.getElementById('cardCurriculumPaceStatus');
    const paceSubtitleEl = document.getElementById('cardCurriculumPaceSubtitle');
    const paceBadgeEl = document.getElementById('cardCurriculumPaceBadge');

    let batchYearLabel = 'CBME Curriculum';
    if (this.currentBatchId === 'all') {
      batchYearLabel = 'All Batches • Combined CBME Syllabus';
    } else if (activeBatch?.name) {
      const yrMatch = activeBatch.name.match(/MBBS\s*(\d+)(?:st|nd|rd|th)?\s*Year/i);
      if (yrMatch) {
        batchYearLabel = `CBME Syllabus Year ${yrMatch[1]}`;
      } else if (activeBatch.name.includes('2nd') || activeBatch.name.includes('Second')) {
        batchYearLabel = 'CBME Syllabus Year 2';
      } else if (activeBatch.name.includes('1st') || activeBatch.name.includes('First')) {
        batchYearLabel = 'CBME Syllabus Year 1';
      } else {
        batchYearLabel = activeBatch.name;
      }
    }
    if (paceSubtitleEl) paceSubtitleEl.textContent = batchYearLabel;

    const pacePct = classes.length > 0 ? Math.min(95, Math.max(35, Math.round((classes.length / 45) * 85))) : 0;
    if (pacePercentEl) pacePercentEl.textContent = `${pacePct}%`;
    if (paceStatusEl) paceStatusEl.textContent = pacePct >= 70 ? 'On-Track' : (pacePct >= 40 ? 'In-Progress' : 'Planning');
    if (paceBadgeEl) paceBadgeEl.textContent = 'NMC Aligned';
  }

  // --- 4. Subject Filter Buttons ---
  updateSubjectFilterButtons() {
    const container = document.getElementById('adminSubjectFilters');
    if (!container) return;

    const allEvents = this.batchManager.getAllEvents(this.currentBatchId);
    const subjectCounts = {};
    allEvents.filter(e => e.eventType === 'class').forEach(e => {
      if (e.subject) {
        subjectCounts[e.subject] = (subjectCounts[e.subject] || 0) + 1;
      }
    });

    let html = `
      <button class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${this.selectedSubject === 'all' ? 'btn-3d-primary pill-3d-active text-white' : 'pill-3d text-[#3b6347] bg-[#eef4f0] hover:bg-[#e2ede6] border border-[#cde0d3]'}" data-subject="all">
        All Subjects
      </button>
    `;

    const colorConfig = {
      Biochemistry: { text: '#3b6347', bg: '#eef4f0', border: '#cde0d3', dot: '#4a7c59' },
      Anatomy: { text: '#c26d3e', bg: '#fbf3ec', border: '#eed9cc', dot: '#c26d3e' },
      Physiology: { text: '#705c30', bg: '#fdf8f0', border: '#ebe0ca', dot: '#705c30' },
      ENT: { text: '#7c52aa', bg: '#eedcff', border: '#dcc8e0', dot: '#7c52aa' },
      'Community Medicine': { text: '#0096cc', bg: '#e0f4fc', border: '#b8e6f8', dot: '#0096cc' },
      Ophthalmology: { text: '#8b4361', bg: '#fdf2f5', border: '#f7d8e2', dot: '#8b4361' },
      FMT: { text: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', dot: '#10b981' }
    };

    Object.entries(subjectCounts).forEach(([sub, count]) => {
      const cfg = colorConfig[sub] || { text: '#4a7c59', bg: '#eef4f0', border: '#cde0d3', dot: '#4a7c59' };
      const isSelected = this.selectedSubject.toLowerCase() === sub.toLowerCase();

      html += `
        <button class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border cursor-pointer ${isSelected ? 'btn-3d-primary pill-3d-active text-white border-[#4a7c59]' : `pill-3d text-[${cfg.text}] bg-[${cfg.bg}] border-[${cfg.border}] hover:brightness-95`}" data-subject="${sub}">
          <span class="w-2 h-2 rounded-full shadow-xs" style="background-color: ${cfg.dot};"></span>
          ${sub} (${count})
        </button>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('[data-subject]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedSubject = btn.getAttribute('data-subject');
        this.updateSubjectFilterButtons();
        this.renderMainContent();
      });
    });
  }

  // --- 5. Main Content Dispatcher ---
  renderMainContent() {
    this.updateViewButtons?.();
    const calendarSection = document.getElementById('viewSectionCalendar');
    const weekSection = document.getElementById('viewSectionWeek');
    const timelineSection = document.getElementById('viewSectionTimeline');
    const dashboardSection = document.getElementById('viewSectionDashboard');
    const facultySection = document.getElementById('viewSectionFaculty');
    const onboardingSection = document.getElementById('viewSectionOnboarding');
    const actionControls = document.getElementById('adminActionControlsBar');
    const summaryCards = document.getElementById('adminSummaryCardsContainer');

    // Hide all main containers
    calendarSection?.classList.add('hidden');
    weekSection?.classList.add('hidden');
    timelineSection?.classList.add('hidden');
    dashboardSection?.classList.add('hidden');
    facultySection?.classList.add('hidden');
    onboardingSection?.classList.add('hidden');
    summaryCards?.classList.remove('hidden');

    if (this.mainTab === 'calendar') {
      actionControls?.classList.remove('hidden');
      summaryCards?.classList.remove('hidden');

      if (this.calendarSubView === 'month') {
        calendarSection?.classList.remove('hidden');
        this.renderMonthView();
      } else if (this.calendarSubView === 'week') {
        weekSection?.classList.remove('hidden');
        this.renderWeekView();
      } else if (this.calendarSubView === 'timeline') {
        timelineSection?.classList.remove('hidden');
        this.renderTimelineTableView();
      }
    } else if (this.mainTab === 'dashboard') {
      dashboardSection?.classList.remove('hidden');
      actionControls?.classList.add('hidden');
      summaryCards?.classList.remove('hidden');
      this.renderDashboardView();
    } else if (this.mainTab === 'faculty') {
      facultySection?.classList.remove('hidden');
      actionControls?.classList.add('hidden');
      summaryCards?.classList.remove('hidden');
      this.renderFacultyView();
    } else if (this.mainTab === 'onboarding') {
      onboardingSection?.classList.remove('hidden');
      actionControls?.classList.add('hidden');
      summaryCards?.classList.add('hidden');
      this.initOnboardingHandlers();
      this.renderOnboardingList();
    }
  }

  // --- 6. Month Calendar Grid View ---
  renderMonthView() {
    const gridContainer = document.getElementById('adminCalendarGrid');
    const weekdayHeaders = document.getElementById('adminWeekdayHeaders');
    if (!gridContainer) return;

    if (weekdayHeaders) weekdayHeaders.classList.remove('hidden');

    const events = this.getAllActiveEvents();
    const eventsByDate = {};
    events.forEach(e => {
      if (!e.isoDate) return;
      if (!eventsByDate[e.isoDate]) eventsByDate[e.isoDate] = [];
      eventsByDate[e.isoDate].push(e);
    });

    const year = this.currentYear;
    const month = this.currentMonth;

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sun
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const calendarCells = [];

    // 1. Previous month trailing days
    for (let p = startDayOfWeek - 1; p >= 0; p--) {
      const dayNum = prevMonthLastDay - p;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const pIso = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      calendarCells.push({
        dayNum,
        isoDate: pIso,
        isCurrentMonth: false,
        dayOfWeek: (startDayOfWeek - 1 - p) % 7,
        events: eventsByDate[pIso] || []
      });
    }

    // 2. Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dObj = new Date(year, month, d);
      calendarCells.push({
        dayNum: d,
        isoDate: dIso,
        isCurrentMonth: true,
        dayOfWeek: dObj.getDay(),
        isToday: dIso === todayIso,
        events: eventsByDate[dIso] || []
      });
    }

    // 3. Next month leading days
    const totalCellsSoFar = calendarCells.length;
    const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
    for (let n = 1; n <= remainingCells; n++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      const nIso = `${nextY}-${String(nextM).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      calendarCells.push({
        dayNum: n,
        isoDate: nIso,
        isCurrentMonth: false,
        dayOfWeek: (totalCellsSoFar + n - 1) % 7,
        events: eventsByDate[nIso] || []
      });
    }

    let html = '';
    for (let i = 0; i < calendarCells.length; i += 7) {
      const row = calendarCells.slice(i, i + 7);
      html += `<div class="grid grid-cols-7 col-span-7 divide-x divide-[#ece5d8] min-h-[145px]">`;

      row.forEach((cell) => {
        const isSunday = cell.dayOfWeek === 0;

        if (!cell.isCurrentMonth) {
          html += `
            <div class="p-2.5 bg-[#fbf9f5] text-[#a0a8a1] flex flex-col justify-between">
              <span class="text-xs font-semibold text-[#a0a8a1]">${cell.dayNum}</span>
            </div>
          `;
          return;
        }

        // Sunday Cool-Off Day
        if (isSunday) {
          html += `
            <div class="p-2.5 bg-[#faf6f0] flex flex-col justify-between border-l-4 border-l-[#c26d3e]">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-extrabold text-[#c26d3e]">${cell.dayNum}</span>
              </div>
              <div class="rounded-xl border border-dashed border-[#e1ba9f] p-2.5 text-center my-auto bg-white/80 shadow-sm">
                <span class="material-symbols-outlined text-[#c26d3e] text-[20px]">self_improvement</span>
                <p class="text-[11px] font-bold text-[#c26d3e] mt-0.5 font-headline">Cool Off</p>
                <p class="text-[10px] text-[#68736a] font-medium">Self Study Day</p>
              </div>
            </div>
          `;
          return;
        }

        // Check for official holidays
        const holidayEv = cell.events.find(e => e.eventType === 'holiday');
        if (holidayEv || (month === 9 && cell.dayNum === 2)) {
          const holidayTitle = holidayEv ? (holidayEv.faculty || 'Holiday') : 'Gandhi Jayanti';
          html += `
            <div class="p-2.5 bg-[#fdfbf6] flex flex-col justify-between">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xs font-bold text-[#705c30]">${cell.dayNum}</span>
                <span class="text-[9px] font-bold text-[#705c30] bg-[#f8e0a8] px-2 py-0.5 rounded-md border border-[#dcc48e]">Holiday</span>
              </div>
              <div class="h-full flex items-center justify-center text-center">
                <span class="text-xs text-[#705c30] font-bold font-headline">${holidayTitle}</span>
              </div>
            </div>
          `;
          return;
        }

        // Active Class or Empty Day
        const classEvents = cell.events.filter(e => e.eventType === 'class');

        let cellClasses = 'p-2.5 hover:bg-[#fbf9f5] transition-colors flex flex-col justify-between';
        if (cell.isToday) {
          cellClasses = 'p-2.5 bg-[#f5f1ea] hover:bg-[#ede6dc] transition-colors flex flex-col justify-between ring-2 ring-inset ring-[#4a7c59] shadow-sm rounded-xl';
        }

        html += `
          <div ${cell.isToday ? 'id="calendarTodayCell"' : ''} class="${cellClasses}">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs ${cell.isToday ? 'font-extrabold text-[#2d4d37] flex items-center gap-1.5 font-headline' : 'font-bold text-[#2c332d]'}">
                ${cell.dayNum}
                ${cell.isToday ? '<span class="text-[9px] bg-[#4a7c59] text-white px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-body">Today</span>' : ''}
              </span>
            </div>
        `;

        if (classEvents.length > 0) {
          html += `<div class="space-y-1.5 overflow-y-auto max-h-[170px] pr-0.5">`;
          classEvents.forEach(ev => {
            const initial = ev.faculty ? ev.faculty.replace(/^Dr\.\s*/i, '').split(' ').map(w => w[0]).join('').slice(0, 2) : 'DR';
            const batchTag = ev.batchName?.includes('Prarambh') ? "Prarambh '26" : ev.batchName?.includes('Sushruta') ? "Sushruta '26" : (ev.batchName || '');
            const batchBadge = batchTag ? `<span class="text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${ev.batchName?.includes('Prarambh') ? 'bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3]' : 'bg-[#fbf3ec] text-[#c26d3e] border border-[#eed9cc]'}">${batchTag}</span>` : '';

            html += `
              <div class="bg-[#fbf9f5] hover:bg-white border ${cell.isToday ? 'border-2 border-[#4a7c59]' : 'border-[#d8e5dc]'} rounded-xl p-2.5 text-left transition-all shadow-sm cursor-pointer class-card-clickable" data-event-id="${ev.id}">
                <div class="flex items-center justify-between text-[10px] font-bold text-[#3b6347] mb-1 gap-1">
                  <span class="uppercase tracking-wide truncate">${ev.subject || 'Lecture'}</span>
                  ${batchBadge}
                </div>
                <p class="text-xs font-bold text-[#2c332d] leading-snug line-clamp-1" title="${ev.topic || ev.chapter}">
                  ${ev.topic || ev.chapter}
                </p>
                <div class="text-[11px] text-[#576058] mt-1.5 flex items-center gap-1.5">
                  <div class="w-4 h-4 rounded-full bg-[#f4ece1] border border-[#705c30] flex items-center justify-center text-[8px] font-bold text-[#705c30] shrink-0">
                    ${initial}
                  </div>
                  <span class="truncate font-medium">${ev.faculty}</span>
                </div>
                <div class="text-[10px] font-bold text-[#4a7c59] mt-1 font-mono flex items-center justify-between">
                  <span class="truncate">${(ev.timings || '7:00 PM - 9:00 PM').replace(/\s*to\s*/i, ' – ')}</span>
                </div>
              </div>
            `;
          });
          html += `</div>`;
        } else {
          html += `
            <div class="my-auto text-center">
              <span class="text-[11px] font-medium text-[#8b958c]">No scheduled lecture</span>
            </div>
          `;
        }

        html += `</div>`;
      });

      html += `</div>`;
    }

    gridContainer.innerHTML = html;

    // Attach click listeners to cards
    gridContainer.querySelectorAll('.class-card-clickable').forEach(card => {
      card.addEventListener('click', () => {
        const evId = card.getAttribute('data-event-id');
        const ev = events.find(e => e.id === evId);
        if (ev) this.openEventDetail(ev);
      });
    });
  }

  // Helper for subject color pills
  getSubjectColorStyles(subject = '') {
    const s = (subject || '').trim();
    const colorConfig = {
      Biochemistry: { pillText: 'text-[#3b6347]', pillBg: 'bg-[#eef4f0]', border: 'border-[#cde0d3]', dot: '#4a7c59' },
      Anatomy: { pillText: 'text-[#c26d3e]', pillBg: 'bg-[#fbf3ec]', border: 'border-[#eed9cc]', dot: '#c26d3e' },
      Physiology: { pillText: 'text-[#705c30]', pillBg: 'bg-[#fdf8f0]', border: 'border-[#ebe0ca]', dot: '#705c30' },
      ENT: { pillText: 'text-[#7c52aa]', pillBg: 'bg-[#eedcff]', border: 'border-[#dcc8e0]', dot: '#7c52aa' },
      'Community Medicine': { pillText: 'text-[#0096cc]', pillBg: 'bg-[#e0f4fc]', border: 'border-[#b8e6f8]', dot: '#0096cc' },
      Ophthalmology: { pillText: 'text-[#8b4361]', pillBg: 'bg-[#fdf2f5]', border: 'border-[#f7d8e2]', dot: '#8b4361' },
      FMT: { pillText: 'text-[#10b981]', pillBg: 'bg-[#ecfdf5]', border: 'border-[#a7f3d0]', dot: '#10b981' }
    };
    return colorConfig[s] || { pillText: 'text-[#3b6347]', pillBg: 'bg-[#eef4f0]', border: 'border-[#cde0d3]', dot: '#4a7c59' };
  }

  // Helper for faculty avatar initials
  getFacultyInitials(facName = '') {
    const clean = (facName || '').replace(/^(dr\.|prof\.)\s*/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (clean.slice(0, 2) || 'DR').toUpperCase();
  }

  // --- 7. Dedicated Weekly Timetable Screen ---
  renderWeekView() {
    const container = document.getElementById('viewSectionWeek');
    if (!container) return;

    const batch = this.getActiveBatch() || { name: 'Prarambh 2026 Batch for MBBS 1st Year' };
    const events = this.getAllActiveEvents();

    // Determine week range starting from Sunday
    const d = new Date(this.currentWeekStart);
    const day = d.getDay();
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - day);
    sunday.setHours(0, 0, 0, 0);

    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);

    const weekDays = [];
    const weekClasses = [];

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(sunday);
      cur.setDate(sunday.getDate() + i);
      const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      
      const dayEvents = events.filter(e => e.isoDate === iso);
      const dayClasses = dayEvents.filter(e => e.eventType === 'class');
      dayClasses.forEach(c => weekClasses.push(c));

      const now = new Date();
      const isToday = cur.toDateString() === now.toDateString();

      weekDays.push({
        dateObj: cur,
        isoDate: iso,
        dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
        dayFullName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i],
        dayNum: cur.getDate(),
        monthShort: monthNames[cur.getMonth()],
        monthFull: fullMonthNames[cur.getMonth()],
        events: dayEvents,
        classes: dayClasses,
        isToday,
        isSunday: i === 0
      });
    }

    const weekRangeStr = `${sunday.toLocaleString('en-US', { month: 'short' })} ${sunday.getDate()} – ${saturday.toLocaleString('en-US', { month: 'short' })} ${saturday.getDate()}, ${saturday.getFullYear()}`;
    const totalTeachingHours = (weekClasses.length * 2.0).toFixed(1);
    const uniqueFaculty = [...new Set(weekClasses.map(c => c.faculty).filter(Boolean))];

    let html = `
      <!-- TOP WEEK BANNER & CONTROLS -->
      <div class="mb-5 panel-3d rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] border border-[#cde0d3] shadow-xs flex items-center justify-center text-[#4a7c59]">
            <span class="material-symbols-outlined text-[28px]">calendar_view_week</span>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-headline font-bold text-xl text-[#2c332d]">Weekly Timetable Matrix</h3>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3] badge-3d">Term 1 • Week 4 of 16</span>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fbf3ec] text-[#c26d3e] border border-[#eed9cc] badge-3d">CBME Aligned</span>
            </div>
            <p class="text-xs text-[#576058] mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span class="material-symbols-outlined text-[15px] text-[#4a7c59]">date_range</span>
              <span class="font-bold text-[#2c332d]">${weekRangeStr}</span>
              <span class="text-[#8b958c]">•</span>
              <span>Batch: <strong class="text-[#2c332d]">${batch.name}</strong></span>
            </p>
          </div>
        </div>

        <!-- Week Navigation & Actions -->
        <div class="flex items-center gap-2.5 flex-wrap">
          <div class="track-3d flex items-center rounded-xl overflow-hidden p-0.5">
            <button id="weekNavPrevBtn" class="px-3 py-1.5 text-xs font-bold text-[#576058] hover:text-[#2c332d] hover:bg-[#ede7db] transition-colors flex items-center gap-1 cursor-pointer border-none bg-transparent">
              <span class="material-symbols-outlined text-[16px]">chevron_left</span> Prev
            </button>
            <button id="weekNavTodayBtn" class="px-3.5 py-1.5 text-xs font-bold text-[#2c332d] hover:bg-[#ede7db] border-x border-[#ded5c6] transition-colors cursor-pointer bg-transparent">
              Current Week
            </button>
            <button id="weekNavNextBtn" class="px-3 py-1.5 text-xs font-bold text-[#576058] hover:text-[#2c332d] hover:bg-[#ede7db] transition-colors flex items-center gap-1 cursor-pointer border-none bg-transparent">
              Next <span class="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>

          <button id="weekExportIcsBtn" class="btn-3d-primary px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">calendar_add_on</span> Export Week (.ics)
          </button>
        </div>
      </div>

      <!-- WEEK KPI METRICS (4 CARDS) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div class="card-3d rounded-xl p-4 cursor-default">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#68736a] uppercase tracking-wider">Scheduled Lectures</span>
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] text-[#4a7c59] border border-[#cde0d3] shadow-xs flex items-center justify-center">
              <span class="material-symbols-outlined text-[17px]">school</span>
            </div>
          </div>
          <div class="flex items-baseline gap-1.5 mt-2">
            <span class="font-headline text-2xl font-bold text-[#2c332d]">${weekClasses.length}</span>
            <span class="text-xs font-semibold text-[#68736a]">Classes</span>
          </div>
          <p class="text-[10px] text-[#788279] mt-1 font-medium">Online interactive teaching sessions</p>
        </div>

        <div class="card-3d rounded-xl p-4 cursor-default">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#68736a] uppercase tracking-wider">Teaching Workload</span>
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] text-[#4a7c59] border border-[#cde0d3] shadow-xs flex items-center justify-center">
              <span class="material-symbols-outlined text-[17px]">schedule</span>
            </div>
          </div>
          <div class="flex items-baseline gap-1.5 mt-2">
            <span class="font-headline text-2xl font-bold text-[#2c332d]">${totalTeachingHours}</span>
            <span class="text-xs font-semibold text-[#68736a]">Hours</span>
          </div>
          <p class="text-[10px] text-[#788279] mt-1 font-medium">2.0 hrs standard evening module slot</p>
        </div>

        <div class="card-3d rounded-xl p-4 cursor-default">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#68736a] uppercase tracking-wider">Specialist Faculty</span>
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f0f4f8] to-[#dce8f2] text-[#2e5b70] border border-[#c8d9e6] shadow-xs flex items-center justify-center">
              <span class="material-symbols-outlined text-[17px]">person</span>
            </div>
          </div>
          <div class="flex items-baseline gap-1.5 mt-2">
            <span class="font-headline text-2xl font-bold text-[#2c332d]">${uniqueFaculty.length}</span>
            <span class="text-xs font-semibold text-[#68736a]">Professors</span>
          </div>
          <p class="text-[10px] text-[#788279] mt-1 font-medium">${uniqueFaculty.slice(0, 2).join(', ')}${uniqueFaculty.length > 2 ? '...' : ''}</p>
        </div>

        <div class="card-3d rounded-xl p-4 cursor-default">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#68736a] uppercase tracking-wider">Curriculum Wellness</span>
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#fbf3ec] to-[#f4e2d2] text-[#c26d3e] border border-[#eed9cc] shadow-xs flex items-center justify-center">
              <span class="material-symbols-outlined text-[17px]">self_improvement</span>
            </div>
          </div>
          <div class="flex items-baseline gap-1.5 mt-2">
            <span class="font-headline text-2xl font-bold text-[#2c332d]">1</span>
            <span class="text-xs font-semibold text-[#68736a]">Cool-Off Day</span>
          </div>
          <p class="text-[10px] text-[#788279] mt-1 font-medium">Sunday reserved for self study &amp; revision</p>
        </div>
      </div>

      <!-- 7-DAY TIMETABLE GRID -->
      <div class="panel-3d rounded-2xl overflow-hidden mb-6">
        <!-- Weekday Top Bar -->
        <div class="grid grid-cols-1 md:grid-cols-7 border-b border-[#e5dfd5] bg-[#f7f4ed] text-center text-xs font-bold text-[#576058]">
    `;

    weekDays.forEach(w => {
      const isSunday = w.isSunday;
      const count = w.classes.length;
      html += `
        <div ${w.isToday ? 'id="weekTodayHeader"' : ''} class="py-3.5 px-2 border-b md:border-b-0 ${w.dayName !== 'Sun' ? 'md:border-l md:border-[#e5dfd5]' : ''} ${w.isToday ? 'bg-[#eef4f0]/80 font-extrabold' : ''}">
          <div class="flex items-center justify-center gap-1.5">
            <span class="font-extrabold ${isSunday ? 'text-[#c26d3e]' : 'text-[#2c332d]'}">${w.dayName}</span>
            <span class="text-[11px] text-[#788279]">${w.monthShort} ${w.dayNum}</span>
            ${w.isToday ? '<span class="w-2 h-2 rounded-full bg-[#4a7c59]" title="Today"></span>' : ''}
          </div>
          <div class="mt-1">
            ${isSunday 
              ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#fbf3ec] text-[#c26d3e] border border-[#eed9cc] badge-3d">Cool-Off</span>'
              : count > 0 
                ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3] badge-3d">${count} Lecture${count > 1 ? 's' : ''}</span>`
                : '<span class="text-[10px] text-[#8b958c] font-normal">No Class</span>'
            }
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <!-- Day Columns Grid -->
        <div class="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-[#ded5c6] min-h-[500px] bg-[#f6f2ea]">
    `;

    weekDays.forEach(w => {
      html += `<div ${w.isToday ? 'id="weekTodayColumn"' : ''} class="p-2 sm:p-2.5 flex flex-col gap-2.5 ${w.isToday ? 'bg-[#eef4f0]/90 ring-1 ring-[#4a7c59]/40 rounded-b-xl' : 'bg-[#f6f2ea]/60'}">`;

      if (w.isSunday) {
        html += `
          <div class="rounded-xl border border-dashed border-[#e1ba9f] p-3.5 text-center bg-[#faf6f0] card-3d">
            <div class="w-9 h-9 rounded-full bg-[#fbf3ec] text-[#c26d3e] flex items-center justify-center mx-auto mb-2 border border-[#eed9cc] shadow-xs">
              <span class="material-symbols-outlined text-[20px]">self_improvement</span>
            </div>
            <p class="text-xs font-bold text-[#c26d3e] font-headline">Cool-Off Day</p>
            <p class="text-[11px] font-semibold text-[#2c332d] mt-0.5">CBME Self-Study</p>
            <p class="text-[10px] text-[#68736a] mt-1 leading-relaxed">Dedicated for retention, revision &amp; wellness.</p>
          </div>
        `;
      } else if (w.events.some(e => e.eventType === 'holiday')) {
        const h = w.events.find(e => e.eventType === 'holiday');
        html += `
          <div class="rounded-xl border border-dashed border-[#dcc48e] p-3.5 text-center bg-[#fdfbf6] card-3d">
            <div class="w-9 h-9 rounded-full bg-[#f8e0a8] text-[#705c30] flex items-center justify-center mx-auto mb-2 border border-[#dcc48e] shadow-xs">
              <span class="material-symbols-outlined text-[20px]">celebration</span>
            </div>
            <p class="text-xs font-bold text-[#705c30] font-headline">Official Holiday</p>
            <p class="text-[11px] font-semibold text-[#2c332d] mt-0.5">${h?.faculty || 'Institutional Holiday'}</p>
            <p class="text-[10px] text-[#68736a] mt-1">Institutional academic recess.</p>
          </div>
        `;
      } else if (w.classes.length === 0) {
        html += `
          <div class="text-center text-[#8b958c] py-8 px-2 rounded-xl border border-dashed border-[#ded5c6] bg-transparent">
            <span class="material-symbols-outlined text-[26px] opacity-35 block mb-1">event_busy</span>
            <span class="text-[11px] font-medium">No Lectures Scheduled</span>
          </div>
        `;
      } else {
        w.classes.forEach(ev => {
          const subStyle = this.getSubjectColorStyles(ev.subject);
          const initials = this.getFacultyInitials(ev.faculty);
          const gcalUrl = generateGoogleCalendarUrl(ev);

          // Clean, compact timing formatting (e.g. "6:30pm – 9:00pm")
          let timingStr = ev.timings || '7:00 PM - 9:00 PM';
          if (ev.startTime && ev.endTime) {
            timingStr = `${ev.startTime} – ${ev.endTime}`;
          } else {
            timingStr = timingStr.replace(/\s*to\s*/i, ' – ');
          }

          const durationStr = (ev.duration || '2h').replace(/hours?/i, 'h').trim();

          html += `
            <div class="bg-white border border-[#d8e5dc] hover:border-[#4a7c59] rounded-xl p-3 text-left transition-all cursor-pointer week-class-card flex flex-col justify-between gap-2.5 group" data-event-id="${ev.id}">
              <!-- Top Subject & Venue Row -->
              <div>
                <div class="flex items-center justify-between text-[10px] font-bold mb-1.5 gap-1">
                  <span class="uppercase tracking-wider px-2 py-0.5 rounded-md ${subStyle.pillBg} ${subStyle.pillText} border ${subStyle.border} truncate badge-3d">
                    ${ev.subject || 'Lecture'}
                  </span>
                  ${ev.batchName ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${ev.batchName.includes('Prarambh') ? 'bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3]' : 'bg-[#fbf3ec] text-[#c26d3e] border border-[#eed9cc]'} badge-3d">${ev.batchName.includes('Prarambh') ? "Prarambh '26" : ev.batchName.includes('Sushruta') ? "Sushruta '26" : "Batch"}</span>` : ''}
                </div>
                <h4 class="text-xs font-bold text-[#2c332d] leading-snug font-headline group-hover:text-[#4a7c59] transition-colors line-clamp-2" title="${ev.chapter || 'Chapter'}">
                  ${ev.chapter || 'Chapter'}
                </h4>
                <p class="text-[11px] text-[#576058] mt-1 line-clamp-2 leading-relaxed" title="${ev.topic || ev.chapter}">
                  ${ev.topic || ev.chapter}
                </p>
              </div>

              <!-- Meta: Faculty, Schedule & Action Controls -->
              <div class="space-y-2 pt-2 border-t border-[#f0ece4]">
                <!-- Row 1: Faculty Specialist -->
                <div class="flex items-center gap-1.5 min-w-0" title="${ev.faculty}">
                  <div class="w-5 h-5 rounded-full bg-[#f4ece1] border border-[#ded5c6] shadow-xs flex items-center justify-center text-[8px] font-bold text-[#705c30] shrink-0">
                    ${initials}
                  </div>
                  <span class="font-bold text-[#2c332d] truncate text-[11px] flex-1">${ev.faculty}</span>
                </div>

                <!-- Row 2: Timings & Duration Badges -->
                <div class="flex items-center justify-between gap-1 text-[10px]">
                  <div class="inline-flex items-center gap-1 font-mono font-bold text-[#3b6347] bg-[#eef4f0] px-2 py-0.5 rounded-md border border-[#cde0d3] whitespace-nowrap badge-3d">
                    <span class="material-symbols-outlined text-[12px] leading-none">schedule</span>
                    <span>${timingStr}</span>
                  </div>
                  <span class="text-[10px] font-semibold text-[#788279] whitespace-nowrap shrink-0 flex items-center gap-0.5" title="Duration">
                    <span class="material-symbols-outlined text-[11px] leading-none">hourglass_top</span>
                    <span>${durationStr}</span>
                  </span>
                </div>

                <!-- Row 3: Action Button (View Details) -->
                <div class="pt-1.5 border-t border-[#f4efe6]">
                  <button class="btn-3d-secondary w-full py-1.5 px-3 rounded-lg font-bold text-xs text-center week-card-detail-btn flex items-center justify-center gap-1 cursor-pointer" data-event-id="${ev.id}">
                    <span>View Details</span>
                  </button>
                </div>
              </div>
            </div>
          `;
        });
      }

      html += `</div>`;
    });

    html += `
        </div>
      </div>

      <!-- WEEK AGENDA BREAKDOWN TABLE -->
      <div class="panel-3d rounded-2xl p-5 mb-6">
        <div class="flex items-center justify-between pb-3 border-b border-[#e5dfd5] mb-4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#4a7c59] text-[20px]">list_alt</span>
            <h4 class="font-headline font-bold text-base text-[#2c332d]">Weekly Lecture Agenda &amp; Competencies</h4>
          </div>
          <span class="text-xs text-[#68736a] font-medium">${weekClasses.length} Scheduled Sessions</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-[#f7f4ed] border-b border-[#e5dfd5] text-[#576058] font-bold text-[11px] uppercase tracking-wider">
                <th class="py-2.5 px-3">Day &amp; Date</th>
                <th class="py-2.5 px-3">Faculty Specialist</th>
                <th class="py-2.5 px-3">Subject</th>
                <th class="py-2.5 px-3">Chapter</th>
                <th class="py-2.5 px-3">Topic Covered</th>
                <th class="py-2.5 px-3">Timings</th>
                <th class="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#ece5d8] bg-white">
    `;

    if (weekClasses.length === 0) {
      html += `
        <tr>
          <td colspan="7" class="text-center py-8 text-[#8b958c]">
            <span class="material-symbols-outlined text-[28px] opacity-40 block mb-1">calendar_today</span>
            No lectures scheduled for this week.
          </td>
        </tr>
      `;
    } else {
      weekClasses.forEach(ev => {
        const subStyle = this.getSubjectColorStyles(ev.subject);
        html += `
          <tr class="hover:bg-[#fbf9f5] transition-colors cursor-pointer week-table-row" data-event-id="${ev.id}">
            <td class="py-3 px-3 font-bold text-[#2c332d] whitespace-nowrap">${ev.dateRaw || ev.isoDate}</td>
            <td class="py-3 px-3 font-semibold text-[#2c332d] whitespace-nowrap">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[#4a7c59] text-[16px]">account_circle</span>
                <span>${ev.faculty}</span>
              </div>
            </td>
            <td class="py-3 px-3">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${subStyle.pillBg} ${subStyle.pillText} border ${subStyle.border}">
                ${ev.subject}
              </span>
            </td>
            <td class="py-3 px-3 font-bold text-[#2c332d]">${ev.chapter}</td>
            <td class="py-3 px-3 text-[#576058] max-w-xs truncate" title="${ev.topic}">${ev.topic}</td>
            <td class="py-3 px-3 font-mono font-bold text-[#4a7c59] whitespace-nowrap">${ev.timings || '7:00 PM - 9:00 PM'}</td>
            <td class="py-3 px-3 text-right whitespace-nowrap">
              <button class="px-2.5 py-1 rounded-lg bg-[#eef4f0] hover:bg-[#d8e8dc] text-[#4a7c59] font-bold text-[11px] transition-colors cursor-pointer border border-[#cde0d3] week-row-detail-btn" data-event-id="${ev.id}">
                View
              </button>
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

    // Attach week view event listeners
    container.querySelector('#weekNavPrevBtn')?.addEventListener('click', () => {
      this.currentWeekStart.setDate(this.currentWeekStart.getDate() - 7);
      this.currentYear = this.currentWeekStart.getFullYear();
      this.currentMonth = this.currentWeekStart.getMonth();
      this.updateMonthTitle();
      this.renderWeekView();
    });

    container.querySelector('#weekNavTodayBtn')?.addEventListener('click', () => {
      const now = new Date();
      this.currentWeekStart = new Date(now);
      this.currentYear = now.getFullYear();
      this.currentMonth = now.getMonth();
      this.updateMonthTitle();
      this.renderWeekView();
      setTimeout(() => {
        const todayCol = container.querySelector('#weekTodayColumn');
        todayCol?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }, 60);
      const formatted = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      this.showToast(`Navigated to Current Week (${formatted})`);
    });

    container.querySelector('#weekNavNextBtn')?.addEventListener('click', () => {
      this.currentWeekStart.setDate(this.currentWeekStart.getDate() + 7);
      this.currentYear = this.currentWeekStart.getFullYear();
      this.currentMonth = this.currentWeekStart.getMonth();
      this.updateMonthTitle();
      this.renderWeekView();
    });

    container.querySelector('#weekExportIcsBtn')?.addEventListener('click', () => {
      if (weekClasses.length === 0) {
        this.showToast('No classes scheduled in this week to export.', 'error');
        return;
      }
      const ics = generateIcsContent(weekClasses, `${batch.name} - Week of ${sunday.toLocaleDateString()}`);
      downloadIcsFile(`Weekly_Schedule_${sunday.toISOString().slice(0, 10)}.ics`, ics);
      this.showToast(`Exported ${weekClasses.length} lectures as .ics!`);
    });

    container.querySelectorAll('.week-class-card, .week-card-detail-btn, .week-table-row, .week-row-detail-btn').forEach(el => {
      el.addEventListener('click', () => {
        const evId = el.getAttribute('data-event-id');
        const ev = events.find(item => item.id === evId);
        if (ev) this.openEventDetail(ev);
      });
    });

    container.querySelectorAll('.week-card-ics-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const evId = btn.getAttribute('data-event-id');
        const ev = events.find(item => item.id === evId);
        if (ev) {
          const ics = generateIcsContent(ev);
          downloadIcsFile(`${(ev.chapter || 'Lecture').replace(/\s+/g, '_')}.ics`, ics);
          this.showToast(`Downloaded ${ev.chapter} (.ics)!`);
        }
      });
    });
  }

  // --- 8. Dedicated Academic Timeline & Syllabus Progression Screen ---
  renderTimelineTableView() {
    const container = document.getElementById('viewSectionTimeline');
    if (!container) return;

    const batch = this.getActiveBatch() || { name: 'Prarambh 2026 Batch for MBBS 1st Year' };
    const events = this.getAllActiveEvents();

    const classes = events.filter(e => e.eventType === 'class');
    const coolOffEvents = events.filter(e => e.eventType === 'cool_off');
    const holidayEvents = events.filter(e => e.eventType === 'holiday');
    const uniqueFaculty = [...new Set(classes.map(c => c.faculty).filter(Boolean))];
    const totalHours = (classes.length * 2.0).toFixed(1);

    let html = `
      <!-- TOP TIMELINE BANNER & CONTROLS -->
      <div class="mb-5 panel-3d rounded-2xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] border border-[#cde0d3] shadow-xs flex items-center justify-center text-[#4a7c59]">
            <span class="material-symbols-outlined text-[28px]">timeline</span>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h3 class="font-headline font-bold text-xl text-[#2c332d]">Academic Timeline &amp; Progression</h3>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3] badge-3d">Milestone Stream</span>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#fbf9f5] text-[#576058] border border-[#ded5c6] badge-3d">${batch.name}</span>
            </div>
            <p class="text-xs text-[#576058] mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span class="material-symbols-outlined text-[15px] text-[#4a7c59]">route</span>
              <span>Sequential chronological progression of lectures, self-study days &amp; NMC milestones</span>
            </p>
          </div>
        </div>

        <!-- Mode Switcher & Export -->
        <div class="flex items-center gap-3 flex-wrap">
          <div class="track-3d flex items-center p-1 rounded-xl text-xs">
            <button id="btnTimelineStreamMode" class="px-3.5 py-1.5 rounded-lg ${this.timelineMode === 'stream' ? 'btn-3d-primary text-white font-bold' : 'text-[#576058] hover:text-[#2c332d] font-semibold bg-transparent'} transition-all cursor-pointer border-none flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">view_timeline</span> Stream View
            </button>
            <button id="btnTimelineTableMode" class="px-3.5 py-1.5 rounded-lg ${this.timelineMode === 'table' ? 'btn-3d-primary text-white font-bold' : 'text-[#576058] hover:text-[#2c332d] font-semibold bg-transparent'} transition-all cursor-pointer border-none flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px]">table_rows</span> Table View
            </button>
          </div>

          <button id="timelineExportAllIcsBtn" class="btn-3d-primary px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">download</span> Export All (.ics)
          </button>
        </div>
      </div>

      <!-- TIMELINE KPI MINI-METRICS (4 CARDS) -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div class="card-3d rounded-xl p-4 cursor-default">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#68736a] uppercase tracking-wider">Total Modules</span>
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] text-[#4a7c59] border border-[#cde0d3] shadow-xs flex items-center justify-center">
              <span class="material-symbols-outlined text-[17px]">event_note</span>
            </div>
          </div>
          <div class="flex items-baseline gap-1.5 mt-2">
            <span class="font-headline text-2xl font-bold text-[#2c332d]">${classes.length}</span>
            <span class="text-xs font-semibold text-[#68736a]">Lectures</span>
          </div>
          <p class="text-[10px] text-[#788279] mt-1 font-medium">100% Live Online Transmission</p>
        </div>

        <div class="card-3d rounded-xl p-4 cursor-default">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#68736a] uppercase tracking-wider">Curriculum Hours</span>
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] text-[#4a7c59] border border-[#cde0d3] shadow-xs flex items-center justify-center">
              <span class="material-symbols-outlined text-[17px]">hourglass_top</span>
            </div>
          </div>
          <div class="flex items-baseline gap-1.5 mt-2">
            <span class="font-headline text-2xl font-bold text-[#2c332d]">${totalHours}</span>
            <span class="text-xs font-semibold text-[#68736a]">Total Hours</span>
          </div>
          <p class="text-[10px] text-[#788279] mt-1 font-medium">Standard 2.0h live evening lecture blocks</p>
        </div>

        <div class="card-3d rounded-xl p-4 cursor-default">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#68736a] uppercase tracking-wider">Active Faculty</span>
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f0f4f8] to-[#dce8f2] text-[#2e5b70] border border-[#c8d9e6] shadow-xs flex items-center justify-center">
              <span class="material-symbols-outlined text-[17px]">group</span>
            </div>
          </div>
          <div class="flex items-baseline gap-1.5 mt-2">
            <span class="font-headline text-2xl font-bold text-[#2c332d]">${uniqueFaculty.length}</span>
            <span class="text-xs font-semibold text-[#68736a]">Specialists</span>
          </div>
          <p class="text-[10px] text-[#788279] mt-1 font-medium">Covers Anatomy, Physiology, Biochemistry</p>
        </div>

        <div class="card-3d rounded-xl p-4 cursor-default">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold text-[#68736a] uppercase tracking-wider">Break &amp; Recess</span>
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#fbf3ec] to-[#f4e2d2] text-[#c26d3e] border border-[#eed9cc] shadow-xs flex items-center justify-center">
              <span class="material-symbols-outlined text-[17px]">weekend</span>
            </div>
          </div>
          <div class="flex items-baseline gap-1.5 mt-2">
            <span class="font-headline text-2xl font-bold text-[#2c332d]">${coolOffEvents.length + holidayEvents.length}</span>
            <span class="text-xs font-semibold text-[#68736a]">Days Off</span>
          </div>
          <p class="text-[10px] text-[#788279] mt-1 font-medium">${coolOffEvents.length} Cool-Offs • ${holidayEvents.length} Holidays</p>
        </div>
      </div>
    `;

    if (this.timelineMode === 'stream') {
      // --- STREAM VIEW (Vertical Timeline Ribbon) ---
      html += `
        <div class="panel-3d rounded-2xl p-5 sm:p-8 mb-6">
          <div class="flex items-center justify-between pb-4 border-b border-[#e5dfd5] mb-6">
            <div>
              <h4 class="font-headline font-bold text-lg text-[#2c332d]">Chronological Milestone Stream</h4>
              <p class="text-xs text-[#576058] mt-0.5">Scroll through each class session in chronological order</p>
            </div>
            <span class="px-3 py-1 rounded-full bg-[#eef4f0] text-[#3b6347] font-bold text-xs border border-[#cde0d3] badge-3d">
              ${events.length} Milestones
            </span>
          </div>

          <!-- Vertical Timeline Ribbon Structure -->
          <div class="relative pl-6 sm:pl-10 space-y-6 before:content-[''] before:absolute before:top-3 before:bottom-3 before:left-3 sm:before:left-5 before:w-0.5 before:bg-[#ded5c6]">
      `;

      events.forEach(ev => {
        if (ev.eventType === 'cool_off') {
          html += `
            <div class="relative flex items-start gap-4">
              <!-- Node icon on the spine -->
              <div class="spine-node-3d absolute -left-6 sm:-left-10 mt-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#fbf3ec] border-2 border-[#c26d3e] text-[#c26d3e] flex items-center justify-center">
                <span class="material-symbols-outlined text-[14px]">self_improvement</span>
              </div>

              <!-- Content card -->
              <div class="w-full bg-[#fbf9f5] border border-dashed border-[#e1ba9f] rounded-xl p-4 card-3d">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-[#c26d3e] uppercase tracking-wider flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px]">self_improvement</span> COOL OFF • Self Study Period
                  </span>
                  <span class="text-xs font-bold text-[#2c332d]">${ev.dateRaw || ev.isoDate}</span>
                </div>
                <p class="text-xs text-[#576058] mt-1">Dedicated self-directed study and cognitive consolidation under CBME curriculum guidelines.</p>
              </div>
            </div>
          `;
          return;
        }

        if (ev.eventType === 'holiday') {
          html += `
            <div class="relative flex items-start gap-4">
              <div class="spine-node-3d absolute -left-6 sm:-left-10 mt-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#f8e0a8] border-2 border-[#705c30] text-[#705c30] flex items-center justify-center">
                <span class="material-symbols-outlined text-[14px]">celebration</span>
              </div>

              <div class="w-full bg-[#fdfbf6] border border-[#ebe0ca] rounded-xl p-4 card-3d">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-[#705c30] uppercase tracking-wider flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[16px]">celebration</span> Institutional Holiday
                  </span>
                  <span class="text-xs font-bold text-[#2c332d]">${ev.dateRaw || ev.isoDate}</span>
                </div>
                <p class="text-xs font-bold text-[#2c332d] mt-1">${ev.faculty || 'Official Holiday'}</p>
                <p class="text-[11px] text-[#576058] mt-0.5">Campus and academic operations suspended.</p>
              </div>
            </div>
          `;
          return;
        }

        // Standard Class Milestone
        const subStyle = this.getSubjectColorStyles(ev.subject);
        const initials = this.getFacultyInitials(ev.faculty);
        const gcalUrl = generateGoogleCalendarUrl(ev);

        html += `
          <div class="relative flex items-start gap-4 group">
            <!-- Spine milestone dot -->
            <div class="spine-node-3d absolute -left-6 sm:-left-10 mt-2 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white border-2 border-[#4a7c59] text-[#4a7c59] flex items-center justify-center group-hover:bg-[#4a7c59] group-hover:text-white transition-colors">
              <span class="material-symbols-outlined text-[14px]">school</span>
            </div>

            <!-- Main Milestone Card -->
            <div class="w-full bg-white border border-[#ded5c6] hover:border-[#4a7c59] rounded-2xl p-4 sm:p-5 timeline-card-3d cursor-pointer" data-event-id="${ev.id}">
              <div class="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#f0ece4]">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${subStyle.pillBg} ${subStyle.pillText} border ${subStyle.border} badge-3d">
                    ${ev.subject || 'Lecture'}
                  </span>
                  ${ev.batchName ? `<span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${ev.batchName.includes('Prarambh') ? 'bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3]' : 'bg-[#fbf3ec] text-[#c26d3e] border border-[#eed9cc]'} badge-3d">${ev.batchName.includes('Prarambh') ? "Prarambh '26" : ev.batchName.includes('Sushruta') ? "Sushruta '26" : "Batch"}</span>` : ''}
                  <span class="text-xs font-bold text-[#2c332d]">${ev.dateRaw || ev.isoDate}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="font-mono font-bold text-xs text-[#4a7c59] bg-[#eef4f0] px-2.5 py-0.5 rounded-md badge-3d">${ev.timings || '7:00 PM - 9:00 PM'}</span>
                  <span class="text-[11px] text-[#788279] font-medium">• ${ev.duration || '2 Hours'}</span>
                </div>
              </div>

              <div class="mt-3">
                <h4 class="font-headline font-bold text-base text-[#2c332d] group-hover:text-[#4a7c59] transition-colors leading-snug">${ev.chapter || 'Chapter'}</h4>
                <p class="text-xs text-[#576058] mt-1 leading-relaxed">${ev.topic || ev.chapter}</p>
              </div>

              <div class="mt-4 pt-3 border-t border-[#f0ece4] flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <div class="w-6 h-6 rounded-full bg-[#f4ece1] border border-[#ded5c6] shadow-xs flex items-center justify-center text-[9px] font-bold text-[#705c30]">
                    ${initials}
                  </div>
                  <div>
                    <span class="text-xs font-bold text-[#2c332d]">${ev.faculty}</span>
                    <span class="text-[10px] text-[#788279] block">Department of ${ev.subject}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button class="btn-3d-primary px-3.5 py-1.5 rounded-xl text-white font-bold text-xs timeline-stream-detail-btn cursor-pointer" data-event-id="${ev.id}">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    } else {
      // --- TABLE VIEW (Multi-Column Agenda Grid) ---
      html += `
        <div class="panel-3d rounded-2xl overflow-hidden mb-6">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-[#f7f4ed] border-b border-[#e5dfd5] text-[#576058] font-bold text-[11px] uppercase tracking-wider">
                  <th class="py-3 px-4">Date &amp; Day</th>
                  <th class="py-3 px-4">Faculty Specialist</th>
                  <th class="py-3 px-4">Subject</th>
                  <th class="py-3 px-4">Chapter Name</th>
                  <th class="py-3 px-4">Topic Covered</th>
                  <th class="py-3 px-4">Timings</th>
                  <th class="py-3 px-4 text-center">Duration</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#ece5d8] bg-white">
      `;

      if (events.length === 0) {
        html += `
          <tr>
            <td colspan="8" class="text-center py-12 text-[#8b958c]">
              <span class="material-symbols-outlined text-[32px] block opacity-40 mb-2">search_off</span>
              No lecture schedules found matching your query.
            </td>
          </tr>
        `;
      } else {
        events.forEach(ev => {
          if (ev.eventType === 'cool_off') {
            html += `
              <tr class="bg-[#faf6f0] hover:bg-[#f6eee2] transition-colors">
                <td class="py-3 px-4 font-bold text-[#c26d3e] whitespace-nowrap">${ev.dateRaw || ev.isoDate}</td>
                <td colspan="6" class="py-3 px-4 text-center">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#fbf3ec] text-[#c26d3e] font-bold text-[11px] border border-[#eed9cc]">
                    <span class="material-symbols-outlined text-[15px]">self_improvement</span> COOL OFF • Self Study Day
                  </span>
                </td>
                <td class="py-3 px-4 text-right"></td>
              </tr>
            `;
            return;
          }

          if (ev.eventType === 'holiday') {
            html += `
              <tr class="bg-[#fdfbf6] hover:bg-[#f8f2e4] transition-colors">
                <td class="py-3 px-4 font-bold text-[#705c30] whitespace-nowrap">${ev.dateRaw || ev.isoDate}</td>
                <td colspan="6" class="py-3 px-4 text-center">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f8e0a8] text-[#705c30] font-bold text-[11px] border border-[#dcc48e]">
                    <span class="material-symbols-outlined text-[15px]">celebration</span> ${ev.faculty || 'Official Holiday'}
                  </span>
                </td>
                <td class="py-3 px-4 text-right"></td>
              </tr>
            `;
            return;
          }

          const subStyle = this.getSubjectColorStyles(ev.subject);
          const gcalUrl = generateGoogleCalendarUrl(ev);

          html += `
            <tr class="hover:bg-[#fbf9f5] transition-colors cursor-pointer class-row-clickable" data-event-id="${ev.id}">
              <td class="py-3 px-4 font-bold text-[#2c332d] whitespace-nowrap">${ev.dateRaw || ev.isoDate}</td>
              <td class="py-3 px-4 font-semibold text-[#2c332d] whitespace-nowrap">
                <div class="flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[#4a7c59] text-[16px]">account_circle</span>
                  <span>${ev.faculty}</span>
                </div>
              </td>
              <td class="py-3 px-4">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${subStyle.pillBg} ${subStyle.pillText} border ${subStyle.border}">
                    ${ev.subject}
                  </span>
                  ${ev.batchName ? `<span class="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${ev.batchName.includes('Prarambh') ? 'bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3]' : 'bg-[#fbf3ec] text-[#c26d3e] border border-[#eed9cc]'}">${ev.batchName.includes('Prarambh') ? "Prarambh '26" : ev.batchName.includes('Sushruta') ? "Sushruta '26" : "Batch"}</span>` : ''}
                </div>
              </td>
              <td class="py-3 px-4 font-bold text-[#2c332d]">${ev.chapter}</td>
              <td class="py-3 px-4 text-[#576058] max-w-xs truncate" title="${ev.topic}">${ev.topic}</td>
              <td class="py-3 px-4 font-mono font-bold text-[#4a7c59] whitespace-nowrap">${ev.timings || '7:00 PM - 9:00 PM'}</td>
              <td class="py-3 px-4 text-center whitespace-nowrap font-medium">${ev.duration || '2 Hours'}</td>
              <td class="py-3 px-4 text-right whitespace-nowrap">
                <div class="flex items-center justify-end" onclick="event.stopPropagation();">
                  <button class="px-3 py-1.5 rounded-lg bg-[#eef4f0] hover:bg-[#d8e8dc] text-[#4a7c59] font-bold text-xs transition-colors cursor-pointer border border-[#cde0d3] timeline-row-detail-btn" data-event-id="${ev.id}">
                    Details
                  </button>
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
    }

    container.innerHTML = html;

    // Attach listeners for mode toggle
    container.querySelector('#btnTimelineStreamMode')?.addEventListener('click', () => {
      this.timelineMode = 'stream';
      this.renderTimelineTableView();
    });

    container.querySelector('#btnTimelineTableMode')?.addEventListener('click', () => {
      this.timelineMode = 'table';
      this.renderTimelineTableView();
    });

    // Export entire timeline as ICS
    container.querySelector('#timelineExportAllIcsBtn')?.addEventListener('click', () => {
      if (classes.length === 0) {
        this.showToast('No classes available in this timeline to export.', 'error');
        return;
      }
      const ics = generateIcsContent(classes, `${batch.name} Complete Timeline`);
      downloadIcsFile(`${batch.name.replace(/\s+/g, '_')}_Timeline.ics`, ics);
      this.showToast(`Exported all ${classes.length} lectures as .ics!`);
    });

    // Click on rows/cards to open details
    container.querySelectorAll('.timeline-stream-card, .timeline-stream-detail-btn, .class-row-clickable, .timeline-row-detail-btn').forEach(el => {
      el.addEventListener('click', () => {
        const evId = el.getAttribute('data-event-id');
        const ev = events.find(item => item.id === evId);
        if (ev) this.openEventDetail(ev);
      });
    });

    container.querySelectorAll('.timeline-card-ics-btn, .timeline-row-ics-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const evId = btn.getAttribute('data-event-id');
        const ev = events.find(item => item.id === evId);
        if (ev) {
          const ics = generateIcsContent(ev);
          downloadIcsFile(`${(ev.chapter || 'Lecture').replace(/\s+/g, '_')}.ics`, ics);
          this.showToast(`Downloaded ${ev.chapter} (.ics)!`);
        }
      });
    });
  }

  // --- 9. Dashboard Overview Tab (In-Dashboard) ---
  renderDashboardView() {
    const container = document.getElementById('viewSectionDashboard');
    if (!container) return;

    const allEvents = this.batchManager.getAllEvents(this.currentBatchId);
    const classes = allEvents.filter(e => e.eventType === 'class');
    const coolOffDays = allEvents.filter(e => e.eventType === 'cool_off' || e.eventType === 'holiday');

    // Subject breakdown
    const subjectMap = {};
    classes.forEach(e => {
      const sub = e.subject || 'General';
      if (!subjectMap[sub]) subjectMap[sub] = { count: 0, hours: 0, chapters: new Set() };
      subjectMap[sub].count++;
      subjectMap[sub].hours += 2;
      if (e.chapter) subjectMap[sub].chapters.add(e.chapter);
    });

    let html = `
      <div class="space-y-6">
        <!-- Dashboard Header -->
        <div class="flex items-center justify-between pb-2 border-b border-[#e5dfd5]">
          <div>
            <h2 class="font-headline font-bold text-2xl text-[#2c332d]">Academic Directorate Overview</h2>
            <p class="text-xs text-[#68736a] mt-0.5">Syllabus pacing, teaching workload & batch telemetry • ${this.getActiveBatch()?.name}</p>
          </div>
          <button id="dashboardReturnToCalBtn" class="btn-3d-primary px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer">
            <span class="material-symbols-outlined text-[16px]">calendar_today</span> Return to Calendar
          </button>
        </div>

        <!-- Subject Progress Breakdown Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    `;

    Object.entries(subjectMap).forEach(([sub, data]) => {
      html += `
        <div class="card-3d rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="font-headline font-bold text-base text-[#2c332d]">${sub}</h3>
            <span class="text-[10px] font-bold text-[#4a7c59] bg-[#eef4f0] px-2 py-0.5 rounded-md border border-[#cde0d3] badge-3d">NMC CBME</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="font-headline text-2xl font-bold text-[#2c332d]">${data.count}</span>
            <span class="text-xs text-[#68736a] font-semibold">Total Lectures (${data.hours} Hours)</span>
          </div>
          <div class="w-full bg-[#e8e2d8] rounded-full h-2 overflow-hidden shadow-inner">
            <div class="bg-[#4a7c59] h-2 rounded-full" style="width: ${Math.min(100, (data.count / 20) * 100)}%"></div>
          </div>
          <div class="text-[11px] text-[#576058] pt-2 border-t border-[#f0ece4]">
            <strong>${data.chapters.size} Chapters covered</strong> across Term 1
          </div>
        </div>
      `;
    });

    html += `
        </div>

        <!-- Batch Metrics & Sync Health -->
        <div class="panel-3d rounded-xl p-5 space-y-4">
          <h3 class="font-headline font-bold text-lg text-[#2c332d]">Google Sheets Batch Governance</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div class="p-3 bg-[#fbf9f5] rounded-xl border border-[#e8e2d8] card-3d-static">
              <span class="text-[10px] uppercase font-bold text-[#68736a]">Connected Sheet</span>
              <p class="font-bold text-[#2c332d] mt-1">${this.getActiveBatch()?.name}</p>
              <span class="text-[10px] text-[#4a7c59] font-medium">Tab: ${(this.getActiveBatch()?.sheetTabName || 'Lecture Planner').trim()}</span>
            </div>
            <div class="p-3 bg-[#fbf9f5] rounded-xl border border-[#e8e2d8] card-3d-static">
              <span class="text-[10px] uppercase font-bold text-[#68736a]">Break Telemetry</span>
              <p class="font-bold text-[#c26d3e] mt-1">${coolOffDays.length} Cool-Off & Holiday Days</p>
              <span class="text-[10px] text-[#68736a] font-medium">Full student recovery schedule</span>
            </div>
            <div class="p-3 bg-[#fbf9f5] rounded-xl border border-[#e8e2d8] card-3d-static">
              <span class="text-[10px] uppercase font-bold text-[#68736a]">Live Sync Engine</span>
              <p class="font-bold text-[#3b6347] mt-1 flex items-center gap-1">
                <span class="w-2 h-2 rounded-full bg-[#4a7c59]"></span> Operational (Google GViz)
              </p>
              <span class="text-[10px] text-[#68736a] font-medium">Auto-updates on change</span>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    container.querySelector('#dashboardReturnToCalBtn')?.addEventListener('click', () => {
      this.mainTab = 'calendar';
      this.updateDockState('calendar');
      this.renderMainContent();
    });
  }

  // --- 10. Faculty Directory View (In-Dashboard) ---
  renderFacultyView() {
    const container = document.getElementById('viewSectionFaculty');
    if (!container) return;

    const allEvents = this.batchManager.getAllEvents(this.currentBatchId);
    const classes = allEvents.filter(e => e.eventType === 'class');

    const facultyMap = {};
    classes.forEach(e => {
      if (!e.faculty) return;
      const name = e.faculty.trim();
      if (!facultyMap[name]) {
        facultyMap[name] = {
          name,
          classes: [],
          subjects: new Set(),
          totalHours: 0
        };
      }
      facultyMap[name].classes.push(e);
      if (e.subject) facultyMap[name].subjects.add(e.subject);
      facultyMap[name].totalHours += 2;
    });

    let html = `
      <div class="space-y-6">
        <div class="flex items-center justify-between pb-2 border-b border-[#e5dfd5]">
          <div>
            <h2 class="font-headline font-bold text-2xl text-[#2c332d]">Medical Faculty Directorate</h2>
            <p class="text-xs text-[#68736a] mt-0.5">Faculty workload, assigned lecture slots & schedules • ${this.getActiveBatch()?.name}</p>
          </div>
          <div class="flex items-center gap-2">
            <button id="facultyGoToOnboardBtn" class="btn-3d-secondary px-3.5 py-2 rounded-xl text-[#2c332d] font-bold text-xs flex items-center gap-1.5 cursor-pointer">
              <span class="material-symbols-outlined text-[16px] text-[#4a7c59]">person_add</span> Onboard Faculty
            </button>
            <button id="facultyReturnToCalBtn" class="btn-3d-primary px-4 py-2 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer">
              <span class="material-symbols-outlined text-[16px]">calendar_today</span> Return to Calendar
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    `;

    Object.values(facultyMap).forEach(fac => {
      const initial = fac.name.replace(/^Dr\.\s*/i, '').split(' ').map(n => n[0]).join('').slice(0, 2) || 'DR';
      const subjectsStr = Array.from(fac.subjects).join(', ');
      const nextLecture = fac.classes[0];

      html += `
        <div class="card-3d rounded-xl p-5 space-y-4">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 rounded-xl bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] text-[#4a7c59] border border-[#d2e2d7] shadow-xs flex items-center justify-center font-headline font-bold text-sm">
              ${initial}
            </div>
            <div>
              <h3 class="font-headline font-bold text-base text-[#2c332d]">${fac.name}</h3>
              <span class="text-[11px] font-semibold text-[#4a7c59] bg-[#eef4f0] px-2 py-0.5 rounded border border-[#cde0d3] badge-3d">
                ${subjectsStr}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 text-center bg-[#fbf9f5] p-2.5 rounded-xl border border-[#e8e2d8] card-3d-static">
            <div>
              <span class="font-headline text-lg font-bold text-[#2c332d]">${fac.classes.length}</span>
              <span class="block text-[10px] uppercase font-bold text-[#68736a]">Lectures</span>
            </div>
            <div>
              <span class="font-headline text-lg font-bold text-[#2c332d]">${fac.totalHours}h</span>
              <span class="block text-[10px] uppercase font-bold text-[#68736a]">Total Hours</span>
            </div>
          </div>

          ${nextLecture ? `
            <div class="text-xs bg-[#fbf9f5] p-3 rounded-xl border border-[#e8e2d8] card-3d-static">
              <span class="text-[10px] uppercase font-bold text-[#68736a]">Next Upcoming Class</span>
              <p class="font-bold text-[#2c332d] mt-0.5 line-clamp-1">${nextLecture.topic || nextLecture.chapter}</p>
              <span class="text-[10px] text-[#4a7c59] font-mono font-bold">${nextLecture.dateRaw} (${nextLecture.timings})</span>
            </div>
          ` : ''}

          <div class="flex gap-2 pt-1">
            <button class="btn-3d-primary flex-1 py-2 rounded-xl text-white font-bold text-xs cursor-pointer btn-filter-fac-in-cal" data-faculty="${fac.name}">
              View Schedule
            </button>
            <button class="btn-3d-secondary px-3 py-2 rounded-xl font-bold text-xs cursor-pointer btn-export-fac-ics" data-faculty="${fac.name}">
              <span class="material-symbols-outlined text-[15px]">download</span>
            </button>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    container.innerHTML = html;

    container.querySelector('#facultyReturnToCalBtn')?.addEventListener('click', () => {
      this.mainTab = 'calendar';
      this.updateDockState('calendar');
      this.renderMainContent();
    });

    container.querySelector('#facultyGoToOnboardBtn')?.addEventListener('click', () => {
      this.mainTab = 'onboarding';
      this.updateDockState('onboarding');
      window.location.hash = 'onboarding';
      this.renderMainContent();
    });

    container.querySelectorAll('.btn-filter-fac-in-cal').forEach(btn => {
      btn.addEventListener('click', () => {
        const facName = btn.getAttribute('data-faculty');
        this.searchQuery = facName;
        const searchInput = document.getElementById('adminSearchInput');
        if (searchInput) searchInput.value = facName;
        this.mainTab = 'calendar';
        this.updateDockState('calendar');
        this.renderMainContent();
        this.showToast(`Filtered calendar for ${facName}`);
      });
    });

    container.querySelectorAll('.btn-export-fac-ics').forEach(btn => {
      btn.addEventListener('click', () => {
        const facName = btn.getAttribute('data-faculty');
        const facClasses = classes.filter(e => e.faculty === facName);
        if (facClasses.length > 0) {
          const ics = generateIcsContent(facClasses, `${facName} Schedule`);
          downloadIcsFile(`${facName.replace(/\s+/g, '_')}_Schedule.ics`, ics);
          this.showToast(`Exported ${facClasses.length} lectures for ${facName}!`);
        }
      });
    });
  }

  // --- 10b. Faculty Onboarding View Handler ---
  renderOnboardingList() {
    const listContainer = document.getElementById('faculty-list-container');
    const countEl = document.getElementById('faculty-page-count');
    const pageNumEl = document.getElementById('faculty-page-num');
    const prevBtn = document.getElementById('faculty-prev-btn');
    const nextBtn = document.getElementById('faculty-next-btn');

    const totalEl = document.getElementById('stat-total-faculty');
    const verifiedEl = document.getElementById('stat-verified-faculty');
    const pendingEl = document.getElementById('stat-pending-faculty');

    if (!this.facultyOnboardingList) {
      this.facultyOnboardingList = [];
    }

    // Filter list
    const q = (this.onboardingSearchQuery || '').trim().toLowerCase();
    const dept = this.onboardingDeptFilter || 'All';
    const status = this.onboardingStatusFilter || 'All';

    const filtered = this.facultyOnboardingList.filter(f => {
      const matchesQ = !q ||
        (f.name && f.name.toLowerCase().includes(q)) ||
        (f.email && f.email.toLowerCase().includes(q)) ||
        (f.phone && f.phone.replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))) ||
        (f.dept && f.dept.toLowerCase().includes(q)) ||
        (f.cohorts && f.cohorts.some(c => c.toLowerCase().includes(q)));

      const matchesDept = dept === 'All' || 
        (f.dept && (f.dept.toLowerCase() === dept.toLowerCase() || 
                    f.dept.toLowerCase().includes(dept.toLowerCase()) || 
                    dept.toLowerCase().includes(f.dept.toLowerCase())));
      const matchesStatus = status === 'All' || f.status === status;

      return matchesQ && matchesDept && matchesStatus;
    });

    // Update global stat cards
    const totalCount = this.facultyOnboardingList.length;
    const verifiedCount = this.facultyOnboardingList.filter(f => f.status === 'Verified').length;
    const pendingCount = this.facultyOnboardingList.filter(f => f.status === 'Pending').length;

    if (totalEl) totalEl.textContent = `${totalCount} Registered`;
    if (verifiedEl) verifiedEl.textContent = `${verifiedCount} Active`;
    if (pendingEl) pendingEl.textContent = `${pendingCount} Pending`;

    // Pagination bounds
    const pageSize = this.onboardingPageSize || 5;
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (this.onboardingPage > totalPages) this.onboardingPage = totalPages;
    if (this.onboardingPage < 1) this.onboardingPage = 1;

    const startIdx = (this.onboardingPage - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, filtered.length);
    const pagedItems = filtered.slice(startIdx, endIdx);

    // Update pagination labels & buttons
    if (countEl) {
      if (filtered.length === 0) {
        countEl.textContent = 'No matching instructors found';
      } else {
        countEl.textContent = `Showing ${startIdx + 1}-${endIdx} of ${filtered.length} mapped instructors`;
      }
    }
    if (pageNumEl) pageNumEl.textContent = `Page ${this.onboardingPage} of ${totalPages}`;
    if (prevBtn) prevBtn.disabled = this.onboardingPage <= 1;
    if (nextBtn) nextBtn.disabled = this.onboardingPage >= totalPages;

    if (!listContainer) return;

    if (pagedItems.length === 0) {
      listContainer.innerHTML = `
        <div class="bg-white rounded-xl p-8 card-3d text-center border border-[#ded5c6]">
          <span class="material-symbols-outlined text-[36px] text-[#8b958c] mb-2 block">person_search</span>
          <h4 class="font-bold text-base text-[#2c332d]">No faculty instructors found</h4>
          <p class="text-xs text-[#576058] mt-1">Try adjusting your search query, department filter, or status filter.</p>
          <button id="btn-reset-onboarding-filters" class="mt-3 btn-3d-secondary text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer">Reset Filters</button>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = pagedItems.map(f => {
      const isVerified = f.status === 'Verified';
      const initials = (f.name || '').replace(/^(Dr\.|Prof\.)\s*/i, '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
      const cohortsHtml = (f.cohorts || []).map(c => `<span class="px-2.5 py-0.5 rounded-md bg-[#f4efe6] border border-[#ded5c6] text-[11px] font-semibold text-[#2c332d]">${c}</span>`).join(' ');

      const statusBadge = isVerified
        ? `<span class="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-[#eef4f0] text-[#2d4d37] font-bold border border-[#cde0d3] badge-3d">
             <span class="material-symbols-outlined text-[13px] text-[#4a7c59]">check_circle</span> Verified
           </span>`
        : `<span class="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-[#fdf8f0] text-[#705c30] font-bold border border-[#ebe0ca] badge-3d">
             <span class="material-symbols-outlined text-[13px]">pending</span> Pending Invite
           </span>`;

      const avatarBox = isVerified
        ? `<div class="w-11 h-11 rounded-xl bg-[#eef4f0] text-[#4a7c59] border border-[#cde0d3] flex items-center justify-center font-bold text-sm shrink-0">${initials}</div>`
        : `<div class="w-11 h-11 rounded-xl bg-[#fdf8f0] text-[#705c30] border border-[#ebe0ca] flex items-center justify-center font-bold text-sm shrink-0">${initials}</div>`;

      const actionButtons = isVerified
        ? `<button class="btn-edit-mapping btn-3d-secondary text-xs font-bold text-[#2c332d] px-3.5 py-1.5 rounded-lg cursor-pointer" data-id="${f.id}" type="button">
             Edit Mapping
           </button>
           <button class="btn-resend-creds w-8 h-8 rounded-lg bg-[#f7f4ed] hover:bg-[#ede7da] border border-[#ded5c6] text-[#576058] flex items-center justify-center hover:text-[#2c332d] transition-colors cursor-pointer" data-id="${f.id}" title="Resend Credentials" type="button">
             <span class="material-symbols-outlined text-[16px]">forward_to_inbox</span>
           </button>
           <button class="btn-delete-faculty w-8 h-8 rounded-lg bg-[#fdf2f2] hover:bg-[#fae2e2] border border-[#f5c6c6] text-[#b83230] flex items-center justify-center transition-colors cursor-pointer" data-id="${f.id}" title="Remove Faculty" type="button">
             <span class="material-symbols-outlined text-[16px]">delete</span>
           </button>`
        : `<button class="btn-complete-mapping btn-3d-primary text-xs font-bold text-white px-3.5 py-1.5 rounded-lg cursor-pointer" data-id="${f.id}" type="button">
             Complete Mapping
           </button>
           <button class="btn-send-otp btn-3d-secondary text-xs font-bold text-[#4a7c59] px-3.5 py-1.5 rounded-lg cursor-pointer" data-id="${f.id}" title="Send OTP Token" type="button">
             Send OTP
           </button>
           <button class="btn-delete-faculty w-8 h-8 rounded-lg bg-[#fdf2f2] hover:bg-[#fae2e2] border border-[#f5c6c6] text-[#b83230] flex items-center justify-center transition-colors cursor-pointer" data-id="${f.id}" title="Remove Faculty" type="button">
             <span class="material-symbols-outlined text-[16px]">delete</span>
           </button>`;

      return `
        <div class="faculty-row bg-white rounded-xl p-5 card-3d flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all" data-id="${f.id}" data-dept="${f.dept}" data-name="${f.name}" data-status="${f.status}">
          <div class="flex items-start gap-3.5 min-w-0">
            ${avatarBox}
            <div class="min-w-0 space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-bold text-base text-[#2c332d] leading-snug">${f.name}</h3>
                ${statusBadge}
              </div>
              <div class="text-xs font-semibold text-[#576058]">${f.role || `Professor • ${f.dept}`}</div>
              <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#68736a] pt-1">
                <span class="inline-flex items-center gap-1">
                  <span class="material-symbols-outlined text-[15px] text-[#8b958c]">alternate_email</span>
                  <span class="font-mono text-[11px]">${f.email}</span>
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="material-symbols-outlined text-[15px] text-[#8b958c]">phone_iphone</span>
                  <span>+91 ${f.phone}</span>
                </span>
              </div>
            </div>
          </div>
          <div class="flex flex-row md:flex-col items-start md:items-end justify-between gap-2 shrink-0 pt-2 md:pt-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="text-[10px] font-bold uppercase tracking-wider text-[#8b958c]">Cohorts:</span>
              ${cohortsHtml || '<span class="text-[11px] text-[#8b958c]">None</span>'}
            </div>
            <div class="flex items-center gap-2">
              ${actionButtons}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  initOnboardingHandlers() {
    if (this._onboardingInitialized) return;
    this._onboardingInitialized = true;

    const searchInput = document.getElementById('faculty-search-input');
    const searchClearBtn = document.getElementById('faculty-search-clear');
    const deptFilter = document.getElementById('dept-filter-select');
    const statusFilter = document.getElementById('status-filter-select');
    const container = document.getElementById('faculty-list-container');
    const onboardCard = document.getElementById('quick-onboard-card');
    const form = document.getElementById('onboard-form');
    const subjectDropdown = document.getElementById('subject-dropdown-select');
    const subjectChips = document.getElementById('subject-chips-container');
    const prevBtn = document.getElementById('faculty-prev-btn');
    const nextBtn = document.getElementById('faculty-next-btn');
    const cancelBtn = document.getElementById('onboard-cancel-btn');
    const submitBtnText = document.getElementById('onboard-submit-text');
    const submitIcon = document.getElementById('onboard-submit-icon');
    const panelTitle = document.getElementById('onboard-panel-title');
    const onboardBadge = document.getElementById('onboard-badge');

    // Stat Cards Interactive Filters
    const statTotalCard = document.getElementById('card-stat-total');
    const statVerifiedCard = document.getElementById('card-stat-verified');
    const statPendingCard = document.getElementById('card-stat-pending');

    statTotalCard?.addEventListener('click', () => {
      this.onboardingStatusFilter = 'All';
      if (statusFilter) statusFilter.value = 'All';
      this.onboardingPage = 1;
      this.renderOnboardingList();
      this.showToast('Showing all registered faculty');
    });

    statVerifiedCard?.addEventListener('click', () => {
      this.onboardingStatusFilter = 'Verified';
      if (statusFilter) statusFilter.value = 'Verified';
      this.onboardingPage = 1;
      this.renderOnboardingList();
      this.showToast('Filtered by: Verified & Mapped faculty');
    });

    statPendingCard?.addEventListener('click', () => {
      this.onboardingStatusFilter = 'Pending';
      if (statusFilter) statusFilter.value = 'Pending';
      this.onboardingPage = 1;
      this.renderOnboardingList();
      this.showToast('Filtered by: Pending Mapping faculty');
    });

    // 1. Search filter
    searchInput?.addEventListener('input', (e) => {
      this.onboardingSearchQuery = e.target.value;
      if (searchClearBtn) {
        searchClearBtn.classList.toggle('hidden', !e.target.value);
      }
      this.onboardingPage = 1;
      this.renderOnboardingList();
    });

    searchClearBtn?.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      this.onboardingSearchQuery = '';
      searchClearBtn.classList.add('hidden');
      this.onboardingPage = 1;
      this.renderOnboardingList();
      searchInput?.focus();
    });

    // 2. Department filter
    deptFilter?.addEventListener('change', (e) => {
      this.onboardingDeptFilter = e.target.value;
      this.onboardingPage = 1;
      this.renderOnboardingList();
    });

    // 3. Status filter
    statusFilter?.addEventListener('change', (e) => {
      this.onboardingStatusFilter = e.target.value;
      this.onboardingPage = 1;
      this.renderOnboardingList();
    });

    // 4. Pagination
    prevBtn?.addEventListener('click', () => {
      if (this.onboardingPage > 1) {
        this.onboardingPage--;
        this.renderOnboardingList();
        container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    nextBtn?.addEventListener('click', () => {
      this.onboardingPage++;
      this.renderOnboardingList();
      container?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Helper: set chip visual state
    const setChipState = (chip, isSelected) => {
      if (isSelected) {
        chip.classList.add('active');
        chip.setAttribute('data-selected', 'true');
        chip.className = 'subject-chip active inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3] font-bold text-[11px] cursor-pointer hover:opacity-90 transition-opacity';
        if (!chip.querySelector('.material-symbols-outlined')) {
          const check = document.createElement('span');
          check.className = 'material-symbols-outlined text-[13px]';
          check.textContent = 'check';
          chip.prepend(check);
        }
      } else {
        chip.classList.remove('active');
        chip.setAttribute('data-selected', 'false');
        chip.className = 'subject-chip inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f7f4ed] hover:bg-[#ede7da] text-[#576058] border border-[#ded5c6] font-medium text-[11px] cursor-pointer transition-colors';
        chip.querySelector('.material-symbols-outlined')?.remove();
      }
    };

    // 5. Subject chips interactive toggle
    if (subjectChips) {
      subjectChips.addEventListener('click', (e) => {
        const chip = e.target.closest('.subject-chip');
        if (!chip) return;
        const isSelected = chip.classList.contains('active') || chip.getAttribute('data-selected') === 'true';
        setChipState(chip, !isSelected);
      });
    }

    // 6. Subject dropdown selection
    if (subjectDropdown && subjectChips) {
      subjectDropdown.addEventListener('change', () => {
        const val = subjectDropdown.value;
        if (!val) return;
        let existingChip = Array.from(subjectChips.querySelectorAll('.subject-chip')).find(
          c => (c.getAttribute('data-subject') || '').toLowerCase() === val.toLowerCase()
        );
        if (existingChip) {
          setChipState(existingChip, true);
        } else {
          const newChip = document.createElement('span');
          newChip.setAttribute('data-subject', val);
          setChipState(newChip, true);
          newChip.innerHTML = `<span class="material-symbols-outlined text-[13px]">check</span> ${val}`;
          subjectChips.appendChild(newChip);
        }
        subjectDropdown.selectedIndex = 0;
      });
    }

    // 7. Reset form function
    const resetFormState = () => {
      this.editingFacultyId = null;
      form?.reset();
      if (submitBtnText) submitBtnText.textContent = 'Save & Map Credentials';
      if (submitIcon) submitIcon.textContent = 'how_to_reg';
      if (panelTitle) panelTitle.textContent = 'Quick Map & Onboard';
      if (onboardBadge) {
        onboardBadge.textContent = 'Fast Track';
        onboardBadge.className = 'text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3] badge-3d';
      }
      cancelBtn?.classList.add('hidden');

      // Reset chips to default (Anatomy active)
      subjectChips?.querySelectorAll('.subject-chip').forEach(c => {
        const isAnatomy = (c.getAttribute('data-subject') || '').toLowerCase() === 'anatomy';
        setChipState(c, isAnatomy);
      });
    };

    cancelBtn?.addEventListener('click', () => {
      resetFormState();
      this.showToast('Edit mode canceled');
    });

    // 8. Row Action Buttons delegation
    container?.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.btn-edit-mapping');
      const resendBtn = e.target.closest('.btn-resend-creds');
      const completeBtn = e.target.closest('.btn-complete-mapping');
      const sendOtpBtn = e.target.closest('.btn-send-otp');
      const deleteBtn = e.target.closest('.btn-delete-faculty');
      const resetFiltersBtn = e.target.closest('#btn-reset-onboarding-filters');

      if (resetFiltersBtn) {
        this.onboardingSearchQuery = '';
        this.onboardingDeptFilter = 'All';
        this.onboardingStatusFilter = 'All';
        if (searchInput) searchInput.value = '';
        if (searchClearBtn) searchClearBtn.classList.add('hidden');
        if (deptFilter) deptFilter.value = 'All';
        if (statusFilter) statusFilter.value = 'All';
        this.onboardingPage = 1;
        this.renderOnboardingList();
        return;
      }

      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        const fac = this.facultyOnboardingList.find(f => f.id === id);
        if (!fac) return;
        const confirmDelete = confirm(`Are you sure you want to remove ${fac.name} from faculty onboarding?`);
        if (confirmDelete) {
          this.facultyOnboardingList = this.facultyOnboardingList.filter(f => f.id !== id);
          if (this.editingFacultyId === id) resetFormState();
          reminderEmailService.saveFacultyOnboardingList(this.facultyOnboardingList);
          this.renderOnboardingList();
          this.showToast(`Removed ${fac.name} from faculty directory.`);
        }
        return;
      }

      if (editBtn) {
        const id = editBtn.getAttribute('data-id');
        const fac = this.facultyOnboardingList.find(f => f.id === id);
        if (!fac) return;

        this.editingFacultyId = id;
        const nameInput = document.getElementById('onboard-name-input');
        const emailInput = document.getElementById('onboard-email-input');
        const phoneInput = document.getElementById('onboard-phone-input');

        if (nameInput) nameInput.value = fac.name;
        if (emailInput) emailInput.value = fac.email;
        if (phoneInput) phoneInput.value = (fac.phone || '').replace(/\D/g, '');

        // Deactivate all chips first
        subjectChips?.querySelectorAll('.subject-chip').forEach(c => setChipState(c, false));

        // Activate matching chips or dynamically create chip if department not present
        const facDepts = (fac.dept || '').split(/[,&/]/).map(d => d.trim()).filter(Boolean);
        if (facDepts.length === 0 && fac.dept) facDepts.push(fac.dept);

        facDepts.forEach(dName => {
          let chip = Array.from(subjectChips?.querySelectorAll('.subject-chip') || []).find(
            c => (c.getAttribute('data-subject') || '').toLowerCase() === dName.toLowerCase()
          );
          if (!chip && subjectChips) {
            chip = document.createElement('span');
            chip.setAttribute('data-subject', dName);
            chip.innerHTML = `${dName}`;
            subjectChips.appendChild(chip);
          }
          if (chip) setChipState(chip, true);
        });

        // Set cohort checkboxes properly (matching "Prarambh" or "Sushruta")
        form?.querySelectorAll('input[name="cohort"]').forEach(cb => {
          const isPrarambh = cb.value.toLowerCase().includes('prarambh');
          const isSushruta = cb.value.toLowerCase().includes('sushruta');
          cb.checked = (fac.cohorts || []).some(c => {
            const cLower = c.toLowerCase();
            return (isPrarambh && cLower.includes('prarambh')) || (isSushruta && cLower.includes('sushruta'));
          });
        });

        // Update form UI
        if (submitBtnText) submitBtnText.textContent = `Update Mapping (${fac.name})`;
        if (submitIcon) submitIcon.textContent = 'save';
        if (panelTitle) panelTitle.textContent = 'Edit Faculty Mapping';
        if (onboardBadge) {
          onboardBadge.textContent = 'Editing Mode';
          onboardBadge.className = 'text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-[#fdf8f0] text-[#705c30] border border-[#ebe0ca] badge-3d';
        }
        cancelBtn?.classList.remove('hidden');

        onboardCard?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameInput?.focus();
        this.showToast(`Loaded ${fac.name} into credentials editor`);
      } else if (resendBtn) {
        const id = resendBtn.getAttribute('data-id');
        const fac = this.facultyOnboardingList.find(f => f.id === id);
        this.showToast(`Institutional access credentials re-sent to ${fac?.email || 'faculty'}!`);
      } else if (completeBtn) {
        const id = completeBtn.getAttribute('data-id');
        const fac = this.facultyOnboardingList.find(f => f.id === id);
        if (fac) {
          fac.status = 'Verified';
          this.renderOnboardingList();
          this.showToast(`Credentials verified & mapping completed for ${fac.name}!`);
        }
      } else if (sendOtpBtn) {
        const id = sendOtpBtn.getAttribute('data-id');
        const fac = this.facultyOnboardingList.find(f => f.id === id);
        sendOtpBtn.disabled = true;
        sendOtpBtn.innerHTML = '<span class="material-symbols-outlined text-[14px] animate-spin">sync</span> Sending...';
        setTimeout(() => {
          sendOtpBtn.disabled = false;
          sendOtpBtn.textContent = 'Send OTP';
          const mockOtp = Math.floor(100000 + Math.random() * 900000);
          this.showToast(`OTP Token (${mockOtp}) dispatched via SMS to +91 ${fac?.phone || ''}!`);
        }, 600);
      }
    });

    // 9. Form Submission
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('onboard-name-input');
      const emailInput = document.getElementById('onboard-email-input');
      const phoneInput = document.getElementById('onboard-phone-input');

      const nameVal = (nameInput?.value || '').trim();
      const emailVal = (emailInput?.value || '').trim();
      const phoneVal = (phoneInput?.value || '').trim();

      if (!nameVal || !emailVal) {
        alert('Please provide faculty name and registered institutional email.');
        return;
      }

      // Collect active subjects safely
      const activeChips = Array.from(subjectChips?.querySelectorAll('.subject-chip.active, .subject-chip[data-selected="true"]') || []);
      const selectedSubjects = activeChips.map(c => c.getAttribute('data-subject')).filter(Boolean);
      const primarySubject = selectedSubjects.length > 0 ? selectedSubjects.join(', ') : 'General Medicine';

      // Collect active cohorts
      const checkedCohorts = Array.from(form.querySelectorAll('input[name="cohort"]:checked')).map(cb => {
        return cb.value.includes('Prarambh') ? "Prarambh '26" : "Sushruta '26";
      });
      if (checkedCohorts.length === 0) checkedCohorts.push("Prarambh '26");

      const cleanName = nameVal.startsWith('Dr.') || nameVal.startsWith('Prof.') ? nameVal : `Dr. ${nameVal}`;

      if (this.editingFacultyId) {
        const fac = this.facultyOnboardingList.find(f => f.id === this.editingFacultyId);
        if (fac) {
          fac.name = cleanName;
          fac.email = emailVal;
          fac.phone = phoneVal;
          fac.dept = primarySubject;
          fac.role = `Professor • ${primarySubject}`;
          fac.cohorts = checkedCohorts;
          reminderEmailService.saveFacultyOnboardingList(this.facultyOnboardingList);
          this.showToast(`Updated credentials & cohort mapping for ${cleanName}!`);
        }
        resetFormState();
        this.renderOnboardingList();
      } else {
        const newFaculty = {
          id: `fac-${Date.now()}`,
          name: cleanName,
          email: emailVal,
          phone: phoneVal || '98765 43210',
          dept: primarySubject,
          role: `Professor • ${primarySubject}`,
          status: 'Verified',
          cohorts: checkedCohorts
        };

        this.facultyOnboardingList.unshift(newFaculty);
        this.onboardingPage = 1;
        reminderEmailService.saveFacultyOnboardingList(this.facultyOnboardingList);
        resetFormState();
        this.renderOnboardingList();
        this.showToast(`Faculty ${cleanName} onboarded & mapped successfully!`);
      }
    });
  }

  // --- 11. Bottom Floating Candy Dock ---
  setupDockNavigation() {
    const dockItems = document.querySelectorAll('.dock-nav-item');
    dockItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-dock');
        
        if (tab === 'settings') {
          this.openAdminSettingsModal('email');
          return;
        }

        this.mainTab = tab;
        this.updateDockState(tab);
        window.location.hash = tab === 'calendar' ? '' : tab;
        this.renderMainContent();
      });
    });

    this.updateDockState(this.mainTab);
  }

  updateDockState(tab) {
    document.querySelectorAll('.dock-nav-item').forEach(i => {
      const t = i.getAttribute('data-dock');
      if (t === tab) {
        i.className = 'dock-nav-item flex items-center gap-2 px-4 py-1.5 rounded-xl btn-3d-primary text-white text-xs font-bold transition-all cursor-pointer border-none';
      } else {
        i.className = 'dock-nav-item flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[#576058] hover:text-[#2c332d] hover:bg-[#f4efe6] text-xs font-semibold transition-all cursor-pointer border-none bg-transparent';
      }
    });
  }

  // --- 12. Notification Drawer & Real-time Alerts ---
  setupNotificationDrawer() {
    const modal = document.getElementById('notificationModal');
    const backdrop = document.getElementById('notificationBackdrop');
    const drawer = document.getElementById('notificationDrawer');
    const openBtn = document.getElementById('openNotificationBtn');
    const closeBtn = document.getElementById('closeNotificationBtn');
    const markAllReadBtn = document.getElementById('adminMarkAllReadBtn');
    const filterAllBtn = document.getElementById('btnAdminNotifFilterAll');
    const filterEmailsBtn = document.getElementById('btnAdminNotifFilterEmails');

    let currentFilter = 'all';

    const openDrawer = () => {
      this.renderAdminNotifications(currentFilter);
      modal?.classList.remove('pointer-events-none');
      backdrop?.classList.remove('pointer-events-none', 'opacity-0');
      backdrop?.classList.add('opacity-100', 'pointer-events-auto');
      drawer?.classList.remove('translate-x-full');
      drawer?.classList.add('translate-x-0');
      document.body.style.overflow = 'hidden';
    };

    const closeDrawer = () => {
      backdrop?.classList.remove('opacity-100', 'pointer-events-auto');
      backdrop?.classList.add('opacity-0', 'pointer-events-none');
      drawer?.classList.remove('translate-x-0');
      drawer?.classList.add('translate-x-full');
      modal?.classList.add('pointer-events-none');
      document.body.style.overflow = '';
    };

    openBtn?.addEventListener('click', openDrawer);
    closeBtn?.addEventListener('click', closeDrawer);
    backdrop?.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer && !drawer.classList.contains('translate-x-full')) {
        closeDrawer();
      }
    });

    filterAllBtn?.addEventListener('click', () => {
      currentFilter = 'all';
      filterAllBtn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3] cursor-pointer';
      if (filterEmailsBtn) filterEmailsBtn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#576058] hover:bg-[#f4efe6] border border-transparent cursor-pointer';
      this.renderAdminNotifications(currentFilter);
    });

    filterEmailsBtn?.addEventListener('click', () => {
      currentFilter = 'emails';
      filterEmailsBtn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#fbf3ec] text-[#c26d3e] border border-[#eed9cc] cursor-pointer';
      if (filterAllBtn) filterAllBtn.className = 'px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#576058] hover:bg-[#f4efe6] border border-transparent cursor-pointer';
      this.renderAdminNotifications(currentFilter);
    });

    markAllReadBtn?.addEventListener('click', () => {
      reminderEmailService.markAllAsRead('admin');
      this.renderAdminNotifications(currentFilter);
      this.showToast('All admin notifications marked as read.');
    });

    // Cross-tab and service event sync
    window.addEventListener('meded:email_dispatched', (e) => {
      this.renderAdminNotifications(currentFilter);
      const detail = e.detail;
      if (detail?.faculty?.name) {
        this.showToast(`📧 Automated reminder sent to ${detail.faculty.name} (${detail.faculty.email})`);
      }
    });

    window.addEventListener('meded:notifications_updated', () => {
      this.renderAdminNotifications(currentFilter);
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'meded_notifications' || e.key === 'meded_sync_trigger') {
        this.renderAdminNotifications(currentFilter);
      }
    });

    // Initial render
    this.renderAdminNotifications(currentFilter);
  }

  renderAdminNotifications(filter = 'all') {
    const feed = document.getElementById('adminNotificationFeed');
    const badgePulse = document.getElementById('adminNotifPulse');
    const badgeDot = document.getElementById('adminNotifDot');
    const badgeCount = document.getElementById('adminNotifBadgeCount');
    if (!feed) return;

    let notifs = reminderEmailService.getAdminNotifications();
    if (filter === 'emails') {
      notifs = notifs.filter(n => n.type === 'email_reminder_sent');
    }

    const unreadCount = reminderEmailService.getAdminUnreadCount();
    if (badgeCount) {
      badgeCount.textContent = unreadCount;
      badgeCount.classList.toggle('hidden', unreadCount === 0);
    }
    if (badgePulse && badgeDot) {
      badgePulse.classList.toggle('hidden', unreadCount === 0);
      badgeDot.classList.toggle('hidden', unreadCount === 0);
    }

    if (notifs.length === 0) {
      feed.innerHTML = `
        <div class="py-10 text-center text-[#68736a] space-y-2">
          <span class="material-symbols-outlined text-[32px] text-[#ded5c6]">notifications_off</span>
          <p class="text-xs font-semibold">No notifications in this category.</p>
        </div>
      `;
      return;
    }

    feed.innerHTML = notifs.map(n => {
      const timeAgo = this.formatTimeAgo(n.timestamp);
      const isUnread = !n.read;

      if (n.type === 'email_reminder_sent') {
        return `
          <div class="p-3.5 rounded-xl bg-[#fbf9f5] border ${isUnread ? 'border-[#4a7c59] shadow-xs' : 'border-[#d8e5dc]'} card-3d space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold text-[#c26d3e] bg-[#fbf3ec] px-2 py-0.5 rounded uppercase border border-[#eed9cc] badge-3d flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px]">forward_to_inbox</span> Automated Email Dispatched
              </span>
              <span class="text-[10px] text-[#8b958c] font-medium">${timeAgo}</span>
            </div>
            <div>
              <p class="text-xs font-bold text-[#2c332d]">${n.topic || 'Medical Class Reminder'}</p>
              <p class="text-[11px] text-[#576058] mt-0.5 leading-snug">
                Recipient: <strong class="text-[#2c332d]">${n.facultyName || 'Faculty'}</strong> (<span class="font-mono text-[#4a7c59] font-medium">${n.recipientEmail}</span>)
              </p>
              <div class="flex items-center gap-2 mt-1.5 text-[10px] text-[#68736a] flex-wrap">
                <span class="font-medium text-[#2c332d]">⏰ ${n.timings || '7:00 PM'}</span>
                <span>•</span>
                <span class="bg-[#f4efe6] px-1.5 py-0.2 rounded border border-[#ded5c6]">Lead: ${n.leadDurationText || '30 Mins'}</span>
                <span>•</span>
                <span class="truncate max-w-[170px] text-[#4a7c59]">From: ${n.senderEmail || ''}</span>
              </div>
            </div>
            <div class="pt-2 border-t border-[#e8e2d8] flex items-center justify-between">
              <span class="text-[10px] text-[#788279] font-medium">Onboarding Registered Address</span>
              <button type="button" class="btn-preview-email-item text-xs font-bold text-[#4a7c59] hover:text-[#2d4d37] flex items-center gap-1 cursor-pointer bg-transparent border-none" data-notif-id="${n.id}">
                <span class="material-symbols-outlined text-[15px]">visibility</span> View Sent Email
              </button>
            </div>
          </div>
        `;
      }

      // Default system alert
      return `
        <div class="p-3.5 rounded-xl bg-[#fbf9f5] border border-[#d8e5dc] card-3d space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-[#4a7c59] bg-[#eef4f0] px-2 py-0.5 rounded uppercase border border-[#cde0d3] badge-3d">
              ${n.title || 'System Alert'}
            </span>
            <span class="text-[10px] text-[#8b958c]">${timeAgo}</span>
          </div>
          <p class="text-xs font-bold text-[#2c332d]">${n.title}</p>
          <p class="text-[11px] text-[#576058] leading-relaxed">${n.body}</p>
          ${n.id === 'notif-sync-1' ? `
            <div class="mt-2.5 pt-2 border-t border-[#e8e2d8] flex justify-end">
              <button id="drawerSyncSheetBtn" class="text-xs font-bold text-[#4a7c59] hover:text-[#3b6347] flex items-center gap-1 cursor-pointer bg-transparent border-none">
                <span class="material-symbols-outlined text-[16px]">refresh</span> Sync Now
              </button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Bind "View Sent Email" buttons
    feed.querySelectorAll('.btn-preview-email-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const notifId = btn.getAttribute('data-notif-id');
        const notif = notifs.find(n => n.id === notifId);
        if (notif) {
          reminderEmailService.markNotificationAsRead(notifId);
          this.openEmailPreview({
            from: notif.senderEmail,
            to: `${notif.facultyName} <${notif.recipientEmail}>`,
            subject: `[PW MedEd] Class Reminder: ${notif.topic}`,
            html: notif.emailHtml
          });
          this.renderAdminNotifications(filter);
        }
      });
    });

    // Drawer sync button listener if present
    document.getElementById('drawerSyncSheetBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('drawerSyncSheetBtn');
      if (btn) btn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> Syncing...';
      try {
        await this.batchManager.syncBatch(this.currentBatchId);
        this.renderAll();
        this.showToast('Batch successfully synchronized with Google Sheet!');
      } catch (err) {
        this.showToast(`Sync failed: ${err.message}`, 'error');
      } finally {
        if (btn) btn.innerHTML = '<span class="material-symbols-outlined text-[16px]">refresh</span> Sync Now';
      }
    });
  }

  // --- 12b. Admin Settings Modal with Automated Email Configuration ---
  setupAdminSettingsModal() {
    const modal = document.getElementById('adminSettingsModal');
    const closeBtn = document.getElementById('closeAdminSettingsBtn');
    const tabEmailBtn = document.getElementById('tabSettingsEmailBtn');
    const tabSheetBtn = document.getElementById('tabSettingsSheetBtn');
    const tabEmailContent = document.getElementById('settingsTabContentEmail');
    const tabSheetContent = document.getElementById('settingsTabContentSheet');

    const senderEmailInput = document.getElementById('settingSenderEmail');
    const autoToggle = document.getElementById('settingAutoReminderToggle');
    const statusBadge = document.getElementById('settingsStatusBadge');
    const leadDurationNum = document.getElementById('settingLeadDurationNum');
    const leadDurationUnit = document.getElementById('settingLeadDurationUnit');
    const leadSummaryBadge = document.getElementById('settingLeadSummaryBadge');
    const presetBtns = document.querySelectorAll('.btn-lead-preset');
    const domainBtns = document.querySelectorAll('.btn-domain-preset');
    const saveBtn = document.getElementById('btnSaveEmailSettings');
    const previewBtn = document.getElementById('btnPreviewEmailTheme');
    const testDispatchBtn = document.getElementById('btnTestEmailDispatch');

    // Close handlers
    closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });

    // Tab switcher
    tabEmailBtn?.addEventListener('click', () => this.switchSettingsTab('email'));
    tabSheetBtn?.addEventListener('click', () => this.switchSettingsTab('sheet'));

    // Toggle switch
    autoToggle?.addEventListener('change', () => {
      if (statusBadge) {
        statusBadge.textContent = autoToggle.checked ? 'Active' : 'Disabled';
        statusBadge.className = autoToggle.checked 
          ? 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3] badge-3d'
          : 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#fdf2f2] text-[#b83230] border border-[#fed7d7] badge-3d';
      }
    });

    // Quick presets for lead duration
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        presetBtns.forEach(b => {
          b.className = 'btn-lead-preset py-1.5 px-2 rounded-lg text-[11px] font-bold text-center border transition-all cursor-pointer bg-[#f4efe6] text-[#2c332d] border-[#ded5c6] hover:bg-[#ede7da]';
        });
        btn.className = 'btn-lead-preset active py-1.5 px-2 rounded-lg text-[11px] font-bold text-center border transition-all cursor-pointer bg-[#4a7c59] text-white border-[#3d6b4b] shadow-xs';

        const val = parseInt(btn.getAttribute('data-val'), 10);
        const unit = btn.getAttribute('data-unit');
        if (leadDurationNum) leadDurationNum.value = val;
        if (leadDurationUnit) leadDurationUnit.value = unit;

        const mins = unit === 'hours' ? val * 60 : val;
        if (leadSummaryBadge) {
          leadSummaryBadge.textContent = `${reminderEmailService.getLeadDurationText(mins)} Prior`;
        }
      });
    });

    // Custom lead duration inputs
    const updateFromCustomInputs = () => {
      const val = parseInt(leadDurationNum?.value, 10) || 30;
      const unit = leadDurationUnit?.value || 'minutes';
      const mins = unit === 'hours' ? val * 60 : val;

      if (leadSummaryBadge) {
        leadSummaryBadge.textContent = `${reminderEmailService.getLeadDurationText(mins)} Prior`;
      }

      // Update preset buttons active state
      presetBtns.forEach(b => {
        const bVal = parseInt(b.getAttribute('data-val'), 10);
        const bUnit = b.getAttribute('data-unit');
        const matches = bVal === val && bUnit === unit;
        b.className = matches 
          ? 'btn-lead-preset active py-1.5 px-2 rounded-lg text-[11px] font-bold text-center border transition-all cursor-pointer bg-[#4a7c59] text-white border-[#3d6b4b] shadow-xs'
          : 'btn-lead-preset py-1.5 px-2 rounded-lg text-[11px] font-bold text-center border transition-all cursor-pointer bg-[#f4efe6] text-[#2c332d] border-[#ded5c6] hover:bg-[#ede7da]';
      });
    };

    leadDurationNum?.addEventListener('input', updateFromCustomInputs);
    leadDurationUnit?.addEventListener('change', updateFromCustomInputs);

    // Quick domain pills
    domainBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const domain = btn.getAttribute('data-domain');
        let current = (senderEmailInput?.value || '').trim();
        const atIdx = current.indexOf('@');
        const prefix = atIdx > 0 ? current.substring(0, atIdx) : (current || 'academic-reminders');
        if (senderEmailInput) {
          senderEmailInput.value = `${prefix}${domain}`;
          senderEmailInput.focus();
        }
      });
    });

    // Save Email Settings
    saveBtn?.addEventListener('click', () => {
      const senderEmail = (senderEmailInput?.value || '').trim();
      const isEnabled = autoToggle?.checked !== false;
      const val = parseInt(leadDurationNum?.value, 10) || 30;
      const unit = leadDurationUnit?.value || 'minutes';

      if (!senderEmail || !senderEmail.includes('@') || !senderEmail.includes('.')) {
        alert('Please enter a valid institutional sender email address.');
        senderEmailInput?.focus();
        return;
      }

      const res = reminderEmailService.saveSettings({
        senderEmail,
        isEnabled,
        leadDurationValue: val,
        leadDurationUnit: unit
      });

      if (res.success) {
        modal?.classList.add('hidden');
        this.showToast(`Automated reminder settings saved! Sender: ${senderEmail} (${reminderEmailService.getLeadDurationText()} prior)`);
        this.renderAdminNotifications();
      } else {
        alert(`Failed to save settings: ${res.error}`);
      }
    });

    // Preview Email Template
    previewBtn?.addEventListener('click', () => {
      const settings = reminderEmailService.getSettings();
      const senderEmail = (senderEmailInput?.value || settings.senderEmail).trim();
      const val = parseInt(leadDurationNum?.value, 10) || settings.leadDurationValue || 30;
      const unit = leadDurationUnit?.value || settings.leadDurationUnit || 'minutes';
      const mins = unit === 'hours' ? val * 60 : val;
      const leadText = reminderEmailService.getLeadDurationText(mins);

      // Find upcoming class or construct sample
      const batch = this.getActiveBatch();
      const sampleEvent = (batch?.events || []).find(e => e.eventType === 'class') || {
        chapter: 'Enzymes & Catalysis',
        topic: 'Enzyme Kinetics, Lineweaver-Burk Plots & Clinical Inhibitors',
        subject: 'Biochemistry',
        faculty: 'Dr. Rajesh Jambhulkar',
        dateRaw: 'Thursday, Oct 15, 2026',
        isoDate: '2026-10-15',
        timings: '7:00 PM - 9:00 PM',
        duration: '2 Hours',
        batchName: batch?.name || "Prarambh 2026 Batch • MBBS 1st Year"
      };

      const fac = reminderEmailService.resolveFacultyDetails(sampleEvent.faculty);
      const html = reminderEmailService.generateEmailHtml({
        facultyName: fac.name,
        facultyEmail: fac.email,
        senderEmail: senderEmail,
        event: sampleEvent,
        leadDurationText: leadText
      });

      this.openEmailPreview({
        from: senderEmail,
        to: `${fac.name} <${fac.email}>`,
        subject: `[PW MedEd] Class Reminder: ${sampleEvent.topic || sampleEvent.chapter}`,
        html: html
      });
    });

    // Test Dispatch Button
    testDispatchBtn?.addEventListener('click', () => {
      const batch = this.getActiveBatch();
      const events = batch?.events || [];
      const targetEvent = events.find(e => e.eventType === 'class' && e.faculty && !e.faculty.toLowerCase().includes('cool off')) || {
        id: `test_class_${Date.now()}`,
        chapter: 'Enzymes',
        topic: 'Enzyme Kinetics & Clinical Regulation',
        subject: 'Biochemistry',
        faculty: 'Dr. Rajesh Jambhulkar',
        dateRaw: 'Thursday, Oct 15, 2026',
        isoDate: '2026-10-15',
        timings: '7:00 PM - 9:00 PM',
        duration: '2 Hours',
        batchName: batch?.name || "Prarambh 2026 Batch • MBBS 1st Year"
      };

      const res = reminderEmailService.dispatchReminder(targetEvent, { force: true });
      if (res.success) {
        this.renderAdminNotifications();
        this.showToast(`Automated reminder email dispatched to ${res.facultyName} (${res.recipient})!`);
        this.openEmailPreview({
          from: res.senderEmail,
          to: `${res.facultyName} <${res.recipient}>`,
          subject: `[PW MedEd] Class Reminder: ${targetEvent.topic || targetEvent.chapter}`,
          html: res.emailHtml
        });
      } else {
        alert(`Dispatch failed: ${res.reason}`);
      }
    });

    // Sheet connection inside Settings
    const sheetUrlInput = document.getElementById('settingsSheetUrl');
    const sheetTabInput = document.getElementById('settingsSheetTab');
    const sheetBatchNameInput = document.getElementById('settingsSheetBatchName');
    const sheetConnectBtn = document.getElementById('settingsConnectSheetBtn');
    const tabStatus = document.getElementById('settingsTabDetectStatus');
    const detectedContainer = document.getElementById('settingsDetectedTabsContainer');
    const detectedChips = document.getElementById('settingsDetectedTabsChips');

    const renderSheetTabChips = (tabs, activeTab) => {
      if (!detectedChips || !tabs || tabs.length === 0) {
        detectedContainer?.classList.add('hidden');
        return;
      }
      detectedChips.innerHTML = tabs.map(t => {
        const isSelected = t.trim() === (activeTab || '').trim();
        return `<button type="button" data-tab-name="${encodeURIComponent(t)}" class="tab-chip px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${isSelected ? 'bg-[#2d4d37] text-white border-[#2d4d37] shadow-xs' : 'bg-[#f4efe6] text-[#2c332d] hover:bg-[#e8dfcf] border-[#ded5c6]'}">${t.trim()}</button>`;
      }).join('');

      detectedChips.querySelectorAll('.tab-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const tabName = decodeURIComponent(btn.getAttribute('data-tab-name') || '');
          if (sheetTabInput) sheetTabInput.value = tabName;
          renderSheetTabChips(tabs, tabName);
          if (tabStatus) {
            tabStatus.innerHTML = `<span class="material-symbols-outlined text-[14px] text-[#2d7d46]">check_circle</span><span class="text-[#2d7d46] font-semibold">Selected tab: "${tabName.trim()}"</span>`;
            tabStatus.classList.remove('hidden');
          }
        });
      });
      detectedContainer?.classList.remove('hidden');
    };

    let autoDetectTimer = null;
    const triggerTabDetection = async (url) => {
      const trimmed = (url || '').trim();
      if (!trimmed || !trimmed.includes('/spreadsheets/d/')) {
        tabStatus?.classList.add('hidden');
        detectedContainer?.classList.add('hidden');
        return;
      }

      tabStatus?.classList.remove('hidden');
      if (tabStatus) tabStatus.innerHTML = '<span class="material-symbols-outlined text-[14px] text-[#4a7c59] animate-spin">progress_activity</span><span class="text-[#576058] font-medium">Detecting tabs...</span>';

      try {
        const res = await detectGoogleSheetTabs(trimmed);
        if (res && res.tabs && res.tabs.length > 0) {
          const rec = res.recommendedTab || res.tabs[0];
          if (sheetTabInput) sheetTabInput.value = rec;
          if (tabStatus) {
            tabStatus.innerHTML = `<span class="material-symbols-outlined text-[14px] text-[#2d7d46]">check_circle</span><span class="text-[#2d7d46] font-semibold">Auto-detected tab: "${rec.trim()}"</span>`;
          }
          renderSheetTabChips(res.tabs, rec);
        }
      } catch (err) {
        if (tabStatus) {
          tabStatus.innerHTML = '<span class="material-symbols-outlined text-[14px] text-[#b87d2b]">info</span><span class="text-[#7d561b]">Default tab: "Lecture Planner"</span>';
        }
      }
    };

    sheetUrlInput?.addEventListener('input', () => {
      clearTimeout(autoDetectTimer);
      autoDetectTimer = setTimeout(() => triggerTabDetection(sheetUrlInput.value), 350);
    });

    sheetConnectBtn?.addEventListener('click', async () => {
      const url = sheetUrlInput?.value?.trim();
      const tab = sheetTabInput?.value?.trim() || 'Lecture Planner';
      const customName = sheetBatchNameInput?.value?.trim() || '';

      if (!url) {
        alert('Please provide a Google Sheet link.');
        return;
      }

      sheetConnectBtn.disabled = true;
      sheetConnectBtn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> Connecting...';

      try {
        const newBatch = await this.batchManager.addBatchFromUrl(url, tab, customName);
        this.currentBatchId = newBatch.id;
        this.renderAll();
        modal?.classList.add('hidden');
        this.showToast(`Connected batch "${newBatch.name}" with ${newBatch.events.length} lectures!`);
      } catch (err) {
        alert(`Failed to connect sheet: ${err.message}`);
      } finally {
        sheetConnectBtn.disabled = false;
        sheetConnectBtn.innerHTML = 'Connect &amp; Import';
      }
    });
  }

  openAdminSettingsModal(activeTab = 'email') {
    const modal = document.getElementById('adminSettingsModal');
    if (!modal) return;

    // Load fresh settings from service
    const settings = reminderEmailService.getSettings();
    const senderEmailInput = document.getElementById('settingSenderEmail');
    const autoToggle = document.getElementById('settingAutoReminderToggle');
    const statusBadge = document.getElementById('settingsStatusBadge');
    const leadDurationNum = document.getElementById('settingLeadDurationNum');
    const leadDurationUnit = document.getElementById('settingLeadDurationUnit');
    const leadSummaryBadge = document.getElementById('settingLeadSummaryBadge');
    const presetBtns = document.querySelectorAll('.btn-lead-preset');

    if (senderEmailInput) senderEmailInput.value = settings.senderEmail || 'academic-reminders@pwmeded.edu.in';
    if (autoToggle) autoToggle.checked = settings.isEnabled !== false;
    if (statusBadge) {
      statusBadge.textContent = settings.isEnabled !== false ? 'Active' : 'Disabled';
      statusBadge.className = settings.isEnabled !== false 
        ? 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3] badge-3d'
        : 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#fdf2f2] text-[#b83230] border border-[#fed7d7] badge-3d';
    }

    const val = settings.leadDurationValue || 30;
    const unit = settings.leadDurationUnit || 'minutes';
    if (leadDurationNum) leadDurationNum.value = val;
    if (leadDurationUnit) leadDurationUnit.value = unit;

    const mins = settings.leadDurationMinutes || (unit === 'hours' ? val * 60 : val);
    if (leadSummaryBadge) {
      leadSummaryBadge.textContent = `${reminderEmailService.getLeadDurationText(mins)} Prior`;
    }

    // Set preset buttons active state
    presetBtns.forEach(b => {
      const bVal = parseInt(b.getAttribute('data-val'), 10);
      const bUnit = b.getAttribute('data-unit');
      const matches = bVal === val && bUnit === unit;
      b.className = matches 
        ? 'btn-lead-preset active py-1.5 px-2 rounded-lg text-[11px] font-bold text-center border transition-all cursor-pointer bg-[#4a7c59] text-white border-[#3d6b4b] shadow-xs'
        : 'btn-lead-preset py-1.5 px-2 rounded-lg text-[11px] font-bold text-center border transition-all cursor-pointer bg-[#f4efe6] text-[#2c332d] border-[#ded5c6] hover:bg-[#ede7da]';
    });

    this.switchSettingsTab(activeTab);
    modal.classList.remove('hidden');
  }

  switchSettingsTab(tab = 'email') {
    const tabEmailBtn = document.getElementById('tabSettingsEmailBtn');
    const tabSheetBtn = document.getElementById('tabSettingsSheetBtn');
    const tabEmailContent = document.getElementById('settingsTabContentEmail');
    const tabSheetContent = document.getElementById('settingsTabContentSheet');

    if (tab === 'email') {
      tabEmailBtn?.classList.remove('bg-transparent', 'text-[#576058]');
      tabEmailBtn?.classList.add('btn-3d-primary', 'text-white');
      tabSheetBtn?.classList.remove('btn-3d-primary', 'text-white');
      tabSheetBtn?.classList.add('bg-transparent', 'text-[#576058]');
      tabEmailContent?.classList.remove('hidden');
      tabSheetContent?.classList.add('hidden');
    } else {
      tabSheetBtn?.classList.remove('bg-transparent', 'text-[#576058]');
      tabSheetBtn?.classList.add('btn-3d-primary', 'text-white');
      tabEmailBtn?.classList.remove('btn-3d-primary', 'text-white');
      tabEmailBtn?.classList.add('bg-transparent', 'text-[#576058]');
      tabSheetContent?.classList.remove('hidden');
      tabEmailContent?.classList.add('hidden');
    }
  }

  // --- 12c. Full Fidelity Email Preview Modal ---
  setupEmailPreviewModal() {
    const modal = document.getElementById('emailPreviewModal');
    const closeBtn = document.getElementById('closeEmailPreviewBtn');
    const closeBottomBtn = document.getElementById('closeEmailPreviewBottomBtn');

    const closeModal = () => modal?.classList.add('hidden');
    closeBtn?.addEventListener('click', closeModal);
    closeBottomBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        closeModal();
      }
    });
  }

  openEmailPreview({ from, to, subject, html }) {
    const modal = document.getElementById('emailPreviewModal');
    const fromEl = document.getElementById('previewHeaderFrom');
    const toEl = document.getElementById('previewHeaderTo');
    const subjectEl = document.getElementById('previewHeaderSubject');
    const container = document.getElementById('emailPreviewContainer');

    if (!modal || !container) return;

    if (fromEl) fromEl.textContent = from || 'academic-reminders@pwmeded.edu.in';
    if (toEl) toEl.textContent = to || 'Faculty Member';
    if (subjectEl) subjectEl.textContent = subject || '[PW MedEd] Class Reminder';

    container.innerHTML = html || '<p class="text-xs text-[#68736a] text-center p-8">No email content generated.</p>';
    modal.classList.remove('hidden');
  }

  // --- 12d. Automated Reminder Interval Runner ---
  startAutomatedReminderEngine() {
    // Initial check
    this.runAutomatedReminderCheck();

    // Periodic check every 30 seconds
    setInterval(() => {
      this.runAutomatedReminderCheck();
    }, 30000);
  }

  runAutomatedReminderCheck() {
    try {
      const batch = this.getActiveBatch();
      if (!batch || !batch.events) return;

      const dispatched = reminderEmailService.checkAndDispatchUpcoming(batch.events, batch.name);
      if (dispatched && dispatched.length > 0) {
        this.renderAdminNotifications();
        dispatched.forEach(res => {
          if (res && res.success) {
            this.showToast(`📧 Automated reminder dispatched to ${res.facultyName} (${res.recipient})`);
          }
        });
      }
    } catch (e) {
      console.warn('Reminder check error:', e);
    }
  }

  formatTimeAgo(isoString) {
    if (!isoString) return 'Just now';
    const diffSec = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const mins = Math.floor(diffSec / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  // --- 13. Schedule Class Modal ---
  setupScheduleClassModal() {
    const modal = document.getElementById('scheduleClassModal');
    const openBtn = document.getElementById('openScheduleClassBtn');
    const closeBtn = document.getElementById('closeScheduleModalBtn');
    const form = document.getElementById('scheduleClassForm');

    openBtn?.addEventListener('click', () => {
      modal?.classList.remove('hidden');
    });

    closeBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
    });

    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const date = document.getElementById('modalClassDate')?.value;
      const faculty = document.getElementById('modalClassFaculty')?.value;
      const subject = document.getElementById('modalClassSubject')?.value;
      const chapter = document.getElementById('modalClassChapter')?.value;
      const topic = document.getElementById('modalClassTopic')?.value;
      const timings = document.getElementById('modalClassTimings')?.value || '7:00 PM - 9:00 PM';

      if (!date || !faculty || !subject || !topic) {
        alert('Please fill out all required fields.');
        return;
      }

      const batch = this.getActiveBatch();
      if (batch) {
        const newEvent = {
          id: `custom_${Date.now()}`,
          batchId: batch.id,
          batchName: batch.name,
          dateRaw: date,
          isoDate: date,
          faculty,
          subject,
          chapter: chapter || topic,
          topic,
          noLectures: '1',
          duration: '2 Hours',
          timings,
          eventType: 'class',
          displayTitle: topic
        };
        batch.events.push(newEvent);
        this.batchManager.saveToStorage();
        this.renderAll();
        modal?.classList.add('hidden');
        form.reset();
        this.showToast(`Class "${topic}" scheduled successfully for ${date}!`);
      }
    });
  }

  // --- 14. Connect Sheet Modal ---
  setupConnectSheetModal() {
    const modal = document.getElementById('connectSheetModalAdmin');
    const saveBtn = document.getElementById('adminSaveSheetBtn');
    const urlInput = document.getElementById('adminNewSheetUrl');
    const tabInput = document.getElementById('adminNewSheetTab');
    const nameInput = document.getElementById('adminNewSheetName');
    const statusDiv = document.getElementById('adminTabDetectStatus');
    const chipsContainer = document.getElementById('adminDetectedTabsContainer');
    const chipsDiv = document.getElementById('adminDetectedTabsChips');

    let detectTimeout = null;
    let lastDetectedUrl = '';

    const renderTabChips = (tabs, activeTab) => {
      if (!chipsDiv || !tabs || tabs.length === 0) {
        if (chipsContainer) chipsContainer.classList.add('hidden');
        return;
      }
      chipsDiv.innerHTML = tabs.map(tab => {
        const isSelected = (tab.trim() === (activeTab || '').trim());
        return `<button type="button" data-tab-name="${encodeURIComponent(tab)}" class="tab-chip px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer border ${isSelected ? 'bg-[#2d4d37] text-white border-[#2d4d37] shadow-xs' : 'bg-[#f4efe6] text-[#2c332d] hover:bg-[#e8dfcf] border-[#ded5c6]'}">${tab.trim()}</button>`;
      }).join('');

      chipsDiv.querySelectorAll('.tab-chip').forEach(btn => {
        btn.addEventListener('click', () => {
          const chosenTab = decodeURIComponent(btn.getAttribute('data-tab-name') || '');
          if (tabInput) tabInput.value = chosenTab;
          renderTabChips(tabs, chosenTab);
          if (statusDiv) {
            statusDiv.innerHTML = `<span class="material-symbols-outlined text-[14px] text-[#2d7d46]">check_circle</span><span class="text-[#2d7d46] font-semibold">Selected tab: "${chosenTab.trim()}"</span>`;
            statusDiv.classList.remove('hidden');
          }
        });
      });
      if (chipsContainer) chipsContainer.classList.remove('hidden');
    };

    const triggerTabDetection = async (url) => {
      const cleanUrl = (url || '').trim();
      if (!cleanUrl || !cleanUrl.includes('/spreadsheets/d/')) {
        if (statusDiv) statusDiv.classList.add('hidden');
        if (chipsContainer) chipsContainer.classList.add('hidden');
        return;
      }

      if (cleanUrl === lastDetectedUrl) return;
      lastDetectedUrl = cleanUrl;

      if (statusDiv) {
        statusDiv.innerHTML = `<span class="material-symbols-outlined text-[14px] text-[#4a7c59] animate-spin">progress_activity</span><span class="text-[#576058] font-medium">Auto-detecting sheet tabs...</span>`;
        statusDiv.classList.remove('hidden');
      }

      try {
        const detectRes = await detectGoogleSheetTabs(cleanUrl);
        if (detectRes && detectRes.tabs && detectRes.tabs.length > 0) {
          const recTab = detectRes.recommendedTab || detectRes.tabs[0];
          if (tabInput) {
            tabInput.value = recTab;
          }
          if (statusDiv) {
            statusDiv.innerHTML = `<span class="material-symbols-outlined text-[14px] text-[#2d7d46]">check_circle</span><span class="text-[#2d7d46] font-semibold">Auto-detected tab: "${recTab.trim()}"</span>`;
            statusDiv.classList.remove('hidden');
          }
          renderTabChips(detectRes.tabs, recTab);
        } else {
          if (statusDiv) {
            statusDiv.innerHTML = `<span class="material-symbols-outlined text-[14px] text-[#b87d2b]">info</span><span class="text-[#7d561b]">Using default tab "Lecture Planner"</span>`;
            statusDiv.classList.remove('hidden');
          }
        }
      } catch (err) {
        console.warn('Tab detection error:', err);
        if (statusDiv) {
          statusDiv.innerHTML = `<span class="material-symbols-outlined text-[14px] text-[#b87d2b]">info</span><span class="text-[#7d561b]">Using default tab "Lecture Planner"</span>`;
          statusDiv.classList.remove('hidden');
        }
      }
    };

    // Auto-detect tabs immediately on paste or debounced input
    urlInput?.addEventListener('paste', () => {
      setTimeout(() => triggerTabDetection(urlInput.value), 50);
    });

    urlInput?.addEventListener('input', () => {
      clearTimeout(detectTimeout);
      detectTimeout = setTimeout(() => {
        triggerTabDetection(urlInput.value);
      }, 350);
    });

    urlInput?.addEventListener('change', () => {
      triggerTabDetection(urlInput.value);
    });

    saveBtn?.addEventListener('click', async () => {
      const url = urlInput?.value?.trim();
      const tab = tabInput?.value?.trim() || 'Lecture Planner';
      const customName = nameInput?.value?.trim() || '';

      if (!url) {
        alert('Please provide a valid Google Sheet link.');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span> Connecting...';

      try {
        const newBatch = await this.batchManager.addBatchFromUrl(url, tab, customName);
        this.currentBatchId = newBatch.id;
        this.renderAll();
        modal?.classList.add('hidden');
        if (urlInput) urlInput.value = '';
        if (nameInput) nameInput.value = '';
        if (statusDiv) statusDiv.classList.add('hidden');
        if (chipsContainer) chipsContainer.classList.add('hidden');
        lastDetectedUrl = '';
        this.showToast(`Connected batch "${newBatch.name}" with ${newBatch.events.length} lectures!`);
      } catch (err) {
        alert(`Failed to connect sheet: ${err.message}`);
      } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = 'Connect &amp; Import';
      }
    });
  }

  // --- 15. Event Detail Modal ---
  setupEventDetailModal() {
    const modal = document.getElementById('adminEventDetailModal');
    const closeBtn = document.getElementById('closeAdminEventModal');
    const bottomCloseBtn = document.getElementById('modalDetailCloseBtn');

    closeBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
    });

    bottomCloseBtn?.addEventListener('click', () => {
      modal?.classList.add('hidden');
    });

    modal?.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.add('hidden');
    });
  }

  openEventDetail(ev) {
    const modal = document.getElementById('adminEventDetailModal');
    if (!modal) return;

    document.getElementById('modalDetailTitle').textContent = ev.chapter || ev.topic;
    document.getElementById('modalDetailBatch').textContent = ev.batchName || 'PW MedEd Batch';
    document.getElementById('modalDetailSubject').textContent = ev.subject || 'Medical Lecture';
    document.getElementById('modalDetailFaculty').textContent = ev.faculty || 'Faculty';
    document.getElementById('modalDetailDate').textContent = ev.dateRaw || ev.isoDate;
    document.getElementById('modalDetailTimings').textContent = ev.timings || '7:00 PM - 9:00 PM';
    document.getElementById('modalDetailDuration').textContent = ev.duration || '2 Hours';
    document.getElementById('modalDetailTopic').textContent = ev.topic || ev.chapter;

    const gcalBtn = document.getElementById('modalDetailGCalBtn');
    if (gcalBtn) gcalBtn.href = generateGoogleCalendarUrl(ev);

    const icsBtn = document.getElementById('modalDetailIcsBtn');
    if (icsBtn) {
      icsBtn.onclick = () => {
        const ics = generateIcsContent(ev);
        downloadIcsFile(`${(ev.chapter || 'Lecture').replace(/\s+/g, '_')}.ics`, ics);
      };
    }

    modal.classList.remove('hidden');
  }

  showToast(msg, type = 'success') {
    let toast = document.getElementById('adminToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'adminToast';
      toast.className = 'fixed bottom-20 right-6 z-50 bg-[#2d4d37] text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 transition-all transform translate-y-10 opacity-0 pointer-events-none';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span class="material-symbols-outlined text-[16px] text-[#8ecf9e]">${type === 'success' ? 'check_circle' : 'error'}</span><span>${msg}</span>`;
    toast.classList.remove('translate-y-10', 'opacity-0', 'pointer-events-none');
    toast.classList.add('translate-y-0', 'opacity-100');

    setTimeout(() => {
      toast.classList.add('translate-y-10', 'opacity-0', 'pointer-events-none');
      toast.classList.remove('translate-y-0', 'opacity-100');
    }, 3200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.adminApp = new AdminDashboardController();
});

export { AdminDashboardController };
