/**
 * PW MedEd - Admin Dashboard Controller
 * Full multi-view scheduling: Month, Week, Timeline Table, Faculty Directory, and Curriculum Dashboard.
 */

import { BatchManager, detectGoogleSheetTabs } from './sheetConnector.js';
import { generateGoogleCalendarUrl, generateIcsContent, downloadIcsFile } from './icsExporter.js';
import { reminderEmailService } from './reminderEmailService.js';
import { renderPlatformBadges, renderBatchBadge, getDeliveryPlatformText } from './platformBadge.js';
import { WorkloadManager } from './workloadData.js';
import { renderWorkloadView } from './workloadView.js';
import { renderRequestsView, getStoredRequests, updateRequestStatus, saveStoredRequests, addFacultyRequest, openRescheduleApprovalModal, getRequestById } from './requestsView.js';
import { toLocalIso, todayIso, parseIso, startOfWeek, endOfWeek, isInMonth, nearestMonthWithEvents, parseSlotText, formatDuration } from './dateUtils.js';
import {
  pushRescheduleToSheet,
  pushCancellationToSheet,
  isSheetWriteBackConfigured,
  getSheetWriterConfig,
  saveSheetWriterConfig,
  testSheetWriteBack,
  flushPendingSheetWrites,
  getPendingSheetWrites
} from './sheetWriter.js';

class AdminDashboardController {
  constructor() {
    this.batchManager = new BatchManager();
    this.workloadManager = new WorkloadManager();
    this.workloadState = {
      selectedMonth: 'All',
      selectedPlatform: 'All',
      selectedBatch: 'All',
      facultyQuery: '',
      sortBy: 'hours'
    };
    this.currentBatchId = 'batch-prarambh-2026';
    const _now = new Date();
    this.currentYear = _now.getFullYear();
    this.currentMonth = _now.getMonth();
    this.currentWeekStart = startOfWeek(_now);
    this.selectedSubject = 'all';
    this.searchQuery = '';
    
    // View state
    this.mainTab = 'calendar'; // 'calendar' | 'dashboard' | 'faculty' | 'onboarding' | 'workload'
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
    } else if (urlParams.get('tab') === 'workload' || window.location.hash === '#workload' || path.includes('workload')) {
      this.mainTab = 'workload';
    } else if (urlParams.get('tab') === 'onboarding' || window.location.hash === '#onboarding' || path.includes('onboard')) {
      this.mainTab = 'onboarding';
    } else if (urlParams.get('tab') === 'requests' || window.location.hash === '#requests' || path.includes('requests')) {
      this.mainTab = 'requests';
    }

    // Requests review filter state
    this.requestsState = { filter: 'all', batch: 'all' };

    // Faculty Highlights Card State (Day | Week | Month)
    this.facultyHighlightScope = 'month'; // 'day' | 'week' | 'month'
    this.selectedDayIso = todayIso();

    // Dashboard Individual Period & Navigation State (Independent of Calendar)
    this.dashboardScope = 'month'; // 'month' | 'week' | 'day'
    this.dashboardYear = _now.getFullYear();
    this.dashboardMonth = _now.getMonth();
    this.dashboardWeekStart = startOfWeek(_now);
    this.dashboardDayIso = todayIso();
    this.dashboardInitialized = false;

    // Batch-Level Lecture View Graph State (Day | Week | Month)
    this.batchGraphGranularity = 'month'; // 'day' | 'week' | 'month'
    this.batchGraphCohort = 'all'; // 'all' | batchId
    this.batchGraphDayMonth = 'all'; // 'all' | '2026-09' | '2026-10' | '2026-11'
    this.batchGraphSelectedKey = null; // Key of inspected item

    // Faculty Onboarding State - loaded dynamically from persistent spreadsheet & storage
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
    this.setupFacultyHighlightsCard();
    this.setupFacultyHighlightsModal();
    this.initOnboardingHandlers();
    this.setupOnboardingSyncListener();
    this.renderOnboardingList();
    this.renderAdminNotifications();
    this.startAutomatedReminderEngine();
    this.autoAdjustDateToActiveBatch();
    this.setupHashListener();
    this.renderAll();
    // Retry any sheet write-backs that failed in an earlier session.
    setTimeout(() => this.flushSheetWriteQueue(), 1500);
  }

  setupOnboardingSyncListener() {
    window.addEventListener('meded:faculty_onboarding_updated', (e) => {
      if (e.detail && Array.isArray(e.detail)) {
        this.facultyOnboardingList = e.detail;
      } else {
        this.facultyOnboardingList = reminderEmailService.getFacultyOnboardingList();
      }
      if (this.mainTab === 'onboarding') {
        this.renderOnboardingList();
      }
    });

    // Synchronize with server spreadsheet on initial load
    if (typeof fetch !== 'undefined') {
      fetch('/api/faculty-onboarding')
        .then(r => r.json())
        .then(res => {
          if (res && res.success && Array.isArray(res.list)) {
            this.facultyOnboardingList = res.list;
            reminderEmailService.saveFacultyOnboardingList(res.list);
            if (this.mainTab === 'onboarding') {
              this.renderOnboardingList();
            }
          }
        })
        .catch(() => {});
    }
  }

  setupHashListener() {
    window.addEventListener('hashchange', () => {
      this.handleHashChange();
    });
    if (window.location.hash) {
      this.handleHashChange();
    }
  }

  handleHashChange() {
    const hash = window.location.hash.toLowerCase();
    if (hash === '#requests') {
      window.location.href = 'requests.html';
      return;
    } else if (hash === '#workload') {
      this.mainTab = 'workload';
    } else if (hash === '#onboarding') {
      this.mainTab = 'onboarding';
    } else if (hash === '#faculty') {
      this.mainTab = 'faculty';
    } else if (hash === '#dashboard') {
      this.mainTab = 'dashboard';
    } else if (hash === '#week') {
      this.mainTab = 'calendar';
      this.calendarSubView = 'week';
    } else if (hash === '#timeline' || hash === '#agenda') {
      this.mainTab = 'calendar';
      this.calendarSubView = 'timeline';
    } else if (hash === '#calendar' || !hash) {
      this.mainTab = 'calendar';
      this.calendarSubView = 'month';
    }
    this.updateDockState(this.mainTab);
    this.renderMainContent();
  }

  autoAdjustDateToActiveBatch() {
    const today = new Date();
    const todayStr = todayIso();

    this.currentYear = today.getFullYear();
    this.currentMonth = today.getMonth();
    this.currentWeekStart = startOfWeek(today);
    this.selectedDayIso = todayStr;

    if (!this.dashboardInitialized) {
      this.dashboardYear = today.getFullYear();
      this.dashboardMonth = today.getMonth();
      this.dashboardWeekStart = startOfWeek(today);
      this.dashboardDayIso = todayStr;
      this.dashboardInitialized = true;
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

  /**
   * Keep the visible period in sync with the active filters.
   *
   * Stays on the current month when it still has at least one matching class,
   * and only moves when the month would otherwise render blank — then it jumps
   * to the nearest month that does have matches. Returns the month it landed
   * on when it moved, else null.
   */
  syncPeriodToFilters() {
    const events = this.getAllActiveEvents().filter(e => e.eventType === 'class' && e.isoDate);
    const target = nearestMonthWithEvents(events, this.currentYear, this.currentMonth);
    if (!target) return null;

    this.currentYear = target.year;
    this.currentMonth = target.month;

    // Anchor the week/day views inside the new month, preferring a day that
    // actually has classes so week and timeline views are not blank either.
    const monthEvents = events
      .filter(e => isInMonth(e.isoDate, target.year, target.month))
      .map(e => e.isoDate)
      .sort();
    const anchorIso = monthEvents[0] || `${target.year}-${String(target.month + 1).padStart(2, '0')}-01`;
    this.currentWeekStart = startOfWeek(parseIso(anchorIso) || new Date(target.year, target.month, 1));
    this.selectedDayIso = anchorIso;
    return target;
  }

  /** Re-render everything that displays the active period or filter counts. */
  refreshPeriodChrome() {
    this.updateMonthTitle();
    this.updateSummaryCards();
    this.renderMainContent();
  }

  /** Human label for a {year, month} pair. */
  formatMonthLabel(year, month) {
    return new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  // --- Sheet write-back -----------------------------------------------------

  /**
   * Read the Alternative Slot dialog into a structured slot.
   * Returns null when the dialog's date cannot be understood, so the caller
   * can fall back rather than writing a wrong date to the sheet.
   */
  readAltSlotSelection() {
    const summary = document.getElementById('altSlotSummaryText')?.textContent || '';
    const startText = document.getElementById('altSlotStartText')?.textContent || '';
    const endText = document.getElementById('altSlotEndText')?.textContent || '';
    const activeDur = document.querySelector('#altSlotModal .btn-alt-dur.active')?.getAttribute('data-dur');

    // The dialog's summary line carries the date; the Start/End boxes are
    // authoritative for the time window.
    const composed = `${summary.split('•')[0].trim()} ${startText} - ${endText}`;
    const parsed = parseSlotText(composed, this.currentYear) || parseSlotText(summary, this.currentYear);
    if (!parsed) return null;

    const durMinutes = activeDur ? Math.round(Number(activeDur) * 60) : parsed.durationMinutes;
    return {
      isoDate: parsed.isoDate,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      timings: parsed.timings,
      durationMinutes: durMinutes,
      duration: formatDuration(durMinutes) || parsed.duration,
      label: parseIso(parsed.isoDate)
        ? parseIso(parsed.isoDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
        : parsed.isoDate
    };
  }

  /**
   * The new slot for a reschedule approval, in priority order: what the admin
   * picked in this session, then anything structured on the request, then the
   * request's human-readable proposed slot.
   */
  resolveApprovedSlot(req) {
    if (this.pendingRescheduleSlot) return this.pendingRescheduleSlot;
    if (req?.proposedSlotData?.isoDate) return req.proposedSlotData;
    const parsed = parseSlotText(req?.proposedSlot, this.currentYear);
    return parsed && parsed.isoDate ? parsed : null;
  }

  /** Who is acting, for the sheet's audit columns. */
  getActorLabel() {
    const fromSettings = (() => {
      try { return JSON.parse(localStorage.getItem('meded_admin_identity_v1') || 'null')?.name; }
      catch (_) { return null; }
    })();
    return fromSettings || document.getElementById('adminDeanProfileBtn')?.getAttribute('data-actor') || 'MedEd Admin';
  }

  /**
   * Report a write-back outcome without ever hiding a failure: if the sheet
   * could not be updated the admin is told, and the write stays queued.
   */
  reportSheetSync(result, { action }) {
    if (!result) return null;
    if (result.ok) {
      const row = result.data?.row;
      this.showToast(`Sheet updated${row ? ` (row ${row})` : ''} - ${action} recorded`);
      return { ok: true, row: row || null, at: new Date().toISOString() };
    }
    if (result.skipped) {
      this.showToast(`Saved locally. ${result.error} - connect it under Dean menu > Connect Sheet.`);
      return { ok: false, skipped: true, error: result.error, at: new Date().toISOString() };
    }
    this.showToast(`Sheet NOT updated: ${result.error}${result.queued ? ' (queued, will retry)' : ''}`);
    return { ok: false, error: result.error, queued: Boolean(result.queued), at: new Date().toISOString() };
  }

  /** Retry any write-backs that failed in an earlier session. */
  async flushSheetWriteQueue({ quiet = true } = {}) {
    if (!isSheetWriteBackConfigured()) return;
    const pending = getPendingSheetWrites();
    if (pending.length === 0) return;
    const res = await flushPendingSheetWrites();
    if (res.sent > 0) this.showToast(`Synced ${res.sent} pending sheet update${res.sent > 1 ? 's' : ''}`);
    else if (!quiet && res.remaining > 0) this.showToast(`${res.remaining} sheet update(s) still pending`);
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
      this.syncPeriodToFilters();
      this.refreshPeriodChrome();
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

    document.getElementById('deanMenuWorkloadBtn')?.addEventListener('click', () => {
      deanDropdown?.classList.add('hidden');
      this.mainTab = 'workload';
      this.updateDockState('workload');
      window.location.hash = 'workload';
      this.renderMainContent();
    });

    document.getElementById('deanMenuOnboardBtn')?.addEventListener('click', () => {
      deanDropdown?.classList.add('hidden');
      this.mainTab = 'onboarding';
      this.updateDockState('onboarding');
      window.location.hash = 'onboarding';
      this.renderMainContent();
    });

    document.getElementById('deanMenuRequestsBtn')?.addEventListener('click', () => {
      deanDropdown?.classList.add('hidden');
      window.location.href = 'requests.html';
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
      const now = new Date();
      this.currentYear = now.getFullYear();
      this.currentMonth = now.getMonth();
      this.currentWeekStart = startOfWeek(now);
      this.mainTab = 'calendar';
      this.calendarSubView = 'month';
      // Fall forward to the nearest month that actually has classes.
      this.autoAdjustDateToActiveBatch();
      this.updateDockState('calendar');
      this.updateMonthTitle();
      this.renderMainContent();
      this.showToast(`Viewing ${this.formatMonthLabel(this.currentYear, this.currentMonth)} schedule overview`);
    });

    document.getElementById('cardActiveFacultyBtn')?.addEventListener('click', () => {
      this.mainTab = 'faculty';
      this.updateDockState('faculty');
      this.renderMainContent();
    });

    document.getElementById('cardFacultyHighlightsCard')?.addEventListener('click', () => {
      this.openFacultyHighlightsModal();
    });
    // Fallback for legacy ID
    document.getElementById('cardCurriculumPaceBtn')?.addEventListener('click', () => {
      this.openFacultyHighlightsModal();
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
        this.currentWeekStart = startOfWeek(new Date(this.currentYear, this.currentMonth, 1));
      }
      this.updateMonthTitle();
      this.updateSummaryCards();
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
        this.currentWeekStart = startOfWeek(new Date(this.currentYear, this.currentMonth, 1));
      }
      this.updateMonthTitle();
      this.updateSummaryCards();
      this.renderMainContent();
    });

    document.getElementById('todayMonthBtn')?.addEventListener('click', () => {
      const now = new Date();
      this.currentYear = now.getFullYear();
      this.currentMonth = now.getMonth();
      this.currentWeekStart = startOfWeek(now);
      this.selectedDayIso = todayIso();
      this.dashboardYear = now.getFullYear();
      this.dashboardMonth = now.getMonth();
      this.dashboardWeekStart = startOfWeek(now);
      this.dashboardDayIso = todayIso();
      this.updateMonthTitle();
      this.updateSummaryCards();
      this.renderFacultyHighlightsCard();
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

      const defaultBatchIds = ['batch-prarambh-2026', 'batch-sushruta-2026', 'batch-inicet-essentials-2026', 'batch-fmge-express-2026'];
      const appBatches = batches.filter(b => b.platform === 'app' || (!b.isYoutube && b.platform !== 'youtube'));
      const ytBatches = batches.filter(b => b.platform === 'youtube' || b.platform === 'youtube_app' || b.isYoutube);

      const renderBatchItem = (b) => {
        const isSelected = b.id === this.currentBatchId;
        const platformBadge = renderPlatformBadges(b, { compact: true });
        const canDelete = !defaultBatchIds.includes(b.id);

        return `
          <div class="px-3 py-2 text-xs font-semibold rounded-lg hover:bg-[#f4efe6] cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-[#eef4f0] text-[#2d4d37] font-bold' : 'text-[#3b433c]'}" data-batch-id="${b.id}">
            <div class="truncate pr-2 min-w-0">
              <div class="flex items-center gap-1.5 truncate">
                <span class="truncate font-semibold">${b.name}</span>
                ${platformBadge}
              </div>
              <span class="text-[10px] text-[#788279] block truncate">${b.sheetTabName || 'Lecture Planner'} • ${b.events ? b.events.length : 0} classes</span>
            </div>
            <div class="flex items-center gap-1.5 shrink-0">
              ${isSelected ? '<span class="material-symbols-outlined text-[16px] text-[#4a7c59]">check</span>' : ''}
              ${canDelete ? `
                <button class="text-[#8b958c] hover:text-[#c26d3e] p-0.5 rounded hover:bg-[#faeae1] cursor-pointer btn-delete-batch" data-delete-id="${b.id}" title="Remove this batch">
                  <span class="material-symbols-outlined text-[15px]">delete</span>
                </button>
              ` : ''}
            </div>
          </div>
        `;
      };

      dropdownList.innerHTML = `
        <!-- Combined View Option -->
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

        <!-- YouTube Planners -->
        ${ytBatches.length > 0 ? `
          <div class="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#e02828] flex items-center gap-1">
            <svg class="w-3 h-3 fill-[#e02828]" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            <span>YouTube Series Planners</span>
          </div>
          ${ytBatches.map(renderBatchItem).join('')}
        ` : ''}

        <!-- Mobile App Batches -->
        ${appBatches.length > 0 ? `
          <div class="px-3 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#4a7c59] flex items-center gap-1 ${ytBatches.length > 0 ? 'border-t border-[#f0ece4] mt-1' : ''}">
            <span class="material-symbols-outlined text-[13px] text-[#4a7c59]">smartphone</span>
            <span>Mobile App Batches</span>
          </div>
          ${appBatches.map(renderBatchItem).join('')}
        ` : ''}

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
          this.showToast(`Switched to ${this.getActiveBatch()?.name} - ${this.formatMonthLabel(this.currentYear, this.currentMonth)}`);
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
      this.updateSummaryCards();
      this.renderMainContent();
    });

    btnWeek?.addEventListener('click', () => {
      this.calendarSubView = 'week';
      this.mainTab = 'calendar';
      this.updateDockState('calendar');
      this.updateViewButtons();
      this.updateMonthTitle();
      this.updateSummaryCards();
      this.renderMainContent();
    });

    btnTimeline?.addEventListener('click', () => {
      this.calendarSubView = 'timeline';
      this.mainTab = 'calendar';
      this.updateDockState('calendar');
      this.updateViewButtons();
      this.updateMonthTitle();
      this.updateSummaryCards();
      this.renderMainContent();
    });
  }

  // --- 2b. Bottom Floating Dock Navigation Controller ---
  setupDockNavigation() {
    const dockItems = document.querySelectorAll('.dock-nav-item');
    dockItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const tab = item.getAttribute('data-dock');
        if (!tab) return;

        if (tab === 'requests') {
          window.location.href = 'requests.html';
          return;
        }

        if (tab === 'settings') {
          this.openAdminSettingsModal('email');
          return;
        }

        this.mainTab = tab;
        this.updateDockState(tab);

        // Update URL hash for direct bookmarking
        if (tab === 'calendar') {
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          window.location.hash = tab;
        }

        this.renderMainContent();
      });
    });

    this.updateDockState(this.mainTab);
  }

  updateDockState(activeTab) {
    const dockItems = document.querySelectorAll('.dock-nav-item');
    dockItems.forEach(item => {
      const tab = item.getAttribute('data-dock');
      const isCurrent = tab === activeTab;

      if (isCurrent) {
        item.classList.remove('text-[#576058]', 'hover:text-[#2c332d]', 'hover:bg-[#f4efe6]', 'bg-transparent');
        item.classList.add('btn-3d-primary', 'text-white', 'font-bold');
      } else {
        item.classList.remove('btn-3d-primary', 'text-white', 'font-bold');
        item.classList.add('text-[#576058]', 'hover:text-[#2c332d]', 'hover:bg-[#f4efe6]', 'bg-transparent', 'font-semibold');
      }
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

    // Card 3: Faculty-Wise Class Highlights (Single Tab for Day, Week, Month)
    this.renderFacultyHighlightsCard();

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

  // --- Faculty Highlights Single Card Controller ---
  setupFacultyHighlightsCard() {
    const card = document.getElementById('cardFacultyHighlightsCard') || document.getElementById('cardCurriculumPaceBtn');
    const btnDay = document.getElementById('cardFacultyScopeDay');
    const btnWeek = document.getElementById('cardFacultyScopeWeek');
    const btnMonth = document.getElementById('cardFacultyScopeMonth');

    const updateScopeButtons = () => {
      [btnDay, btnWeek, btnMonth].forEach(b => {
        if (!b) return;
        b.className = 'px-2 py-0.5 rounded text-[#576058] hover:text-[#2c332d] transition-colors cursor-pointer border-none bg-transparent';
      });
      let activeBtn = btnMonth;
      if (this.facultyHighlightScope === 'day') activeBtn = btnDay;
      if (this.facultyHighlightScope === 'week') activeBtn = btnWeek;
      if (activeBtn) {
        activeBtn.className = 'px-2 py-0.5 rounded btn-3d-primary font-bold text-white cursor-pointer border-none';
      }
    };

    btnDay?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.facultyHighlightScope = 'day';
      this.dashboardScope = 'day';
      this.batchGraphGranularity = 'day';
      updateScopeButtons();
      this.renderFacultyHighlightsCard();
      this.renderDashboardView();
    });

    btnWeek?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.facultyHighlightScope = 'week';
      this.dashboardScope = 'week';
      this.batchGraphGranularity = 'week';
      updateScopeButtons();
      this.renderFacultyHighlightsCard();
      this.renderDashboardView();
    });

    btnMonth?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.facultyHighlightScope = 'month';
      this.dashboardScope = 'month';
      this.batchGraphGranularity = 'month';
      updateScopeButtons();
      this.renderFacultyHighlightsCard();
      this.renderDashboardView();
    });

    card?.addEventListener('click', () => {
      this.openFacultyHighlightsModal();
    });

    this.updateFacultyCardScopeButtons = updateScopeButtons;
  }

  renderFacultyHighlightsCard() {
    this.updateFacultyCardScopeButtons?.();

    if (this.facultyHighlightScope) {
      this.dashboardScope = this.facultyHighlightScope;
    }

    const allEvents = this.batchManager.getAllEvents(this.currentBatchId);
    const classes = allEvents.filter(e => e.eventType === 'class');

    let filtered = [];
    let scopeBadgeText = '';

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const targetYear = this.dashboardYear !== undefined ? this.dashboardYear : (this.currentYear || 2026);
    const targetMonth = this.dashboardMonth !== undefined ? this.dashboardMonth : (this.currentMonth !== undefined ? this.currentMonth : 8);
    const targetWeekStart = this.dashboardWeekStart || this.currentWeekStart || new Date(2026, 8, 14);
    const targetDayIso = this.dashboardDayIso || this.selectedDayIso || todayIso();

    if (this.facultyHighlightScope === 'day') {
      filtered = classes.filter(e => e.isoDate === targetDayIso);
      const d = parseIso(targetDayIso) || new Date();
      const isToday = targetDayIso === todayIso();
      scopeBadgeText = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}${isToday ? ' (Today)' : ''}`;
    } else if (this.facultyHighlightScope === 'week') {
      const sunday = startOfWeek(targetWeekStart);
      const saturday = endOfWeek(targetWeekStart);

      const sundayIso = toLocalIso(sunday);
      const saturdayIso = toLocalIso(saturday);

      filtered = classes.filter(e => e.isoDate && e.isoDate >= sundayIso && e.isoDate <= saturdayIso);

      const d = new Date(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

      scopeBadgeText = `Week ${weekNo} • ${sunday.toLocaleString('en-US', { month: 'short' })} ${sunday.getDate()}-${saturday.getDate()}`;
    } else {
      filtered = classes.filter(e => {
        if (!e.isoDate) return false;
        const [y, m] = e.isoDate.split('-').map(Number);
        return y === targetYear && m === (targetMonth + 1);
      });
      scopeBadgeText = `${monthNames[targetMonth]} ${targetYear}`;
    }

    // Group by faculty
    const facultyMap = new Map();
    filtered.forEach(ev => {
      const fac = (ev.faculty || 'Unassigned Faculty').trim();
      if (!facultyMap.has(fac)) {
        facultyMap.set(fac, {
          name: fac,
          subject: ev.subject || 'General',
          classes: [],
          count: 0
        });
      }
      const entry = facultyMap.get(fac);
      entry.classes.push(ev);
      entry.count++;
    });

    const facultyList = Array.from(facultyMap.values()).sort((a, b) => b.count - a.count);

    // Update Card DOM Elements
    const classesCountEl = document.getElementById('cardFacultyHighlightsClassesCount');
    const facultyCountEl = document.getElementById('cardFacultyHighlightsFacultyCount');
    const scopeBadgeEl = document.getElementById('cardFacultyHighlightsScopeBadge');
    const progressBarEl = document.getElementById('cardFacultyHighlightsProgressBar');
    const chipsContainer = document.getElementById('cardFacultyHighlightsChips');

    if (classesCountEl) classesCountEl.textContent = filtered.length;
    if (facultyCountEl) facultyCountEl.textContent = `${facultyList.length} Faculty`;
    if (scopeBadgeEl) scopeBadgeEl.textContent = scopeBadgeText;

    // Proportional Segment Bar
    if (progressBarEl) {
      if (filtered.length === 0) {
        progressBarEl.innerHTML = `<div class="bg-[#d5cdc0] h-full w-full rounded-full"></div>`;
      } else {
        const palette = ['#4a7c59', '#c26d3e', '#705c30', '#0096cc', '#7c52aa', '#8b4361', '#10b981'];
        progressBarEl.innerHTML = facultyList.map((f, i) => {
          const pct = ((f.count / filtered.length) * 100).toFixed(1);
          const color = palette[i % palette.length];
          return `<div class="h-full transition-all" style="width: ${pct}%; background-color: ${color};" title="${f.name}: ${f.count} classes (${pct}%)"></div>`;
        }).join('');
      }
    }

    // Chips container
    if (chipsContainer) {
      if (facultyList.length === 0) {
        chipsContainer.innerHTML = `
          <span class="text-[11px] text-[#788279] italic py-0.5">
            No classes scheduled for this ${this.facultyHighlightScope}
          </span>
        `;
      } else {
        const avatarPalettes = [
          { bg: 'bg-[#eef4f0]', text: 'text-[#3b6347]', border: 'border-[#cde0d3]', badgeBg: 'bg-[#eef4f0]', badgeText: 'text-[#2d4d37]' },
          { bg: 'bg-[#fbf3ec]', text: 'text-[#c26d3e]', border: 'border-[#eed9cc]', badgeBg: 'bg-[#fbf3ec]', badgeText: 'text-[#9c4c23]' },
          { bg: 'bg-[#fdf8f0]', text: 'text-[#705c30]', border: 'border-[#ebe0ca]', badgeBg: 'bg-[#fdf8f0]', badgeText: 'text-[#5a4820]' },
          { bg: 'bg-[#e0f4fc]', text: 'text-[#0077a3]', border: 'border-[#b8e6f8]', badgeBg: 'bg-[#e0f4fc]', badgeText: 'text-[#005a7d]' },
          { bg: 'bg-[#eedcff]', text: 'text-[#6a3fa0]', border: 'border-[#dcc8e0]', badgeBg: 'bg-[#eedcff]', badgeText: 'text-[#542d82]' },
          { bg: 'bg-[#fdf2f5]', text: 'text-[#8b4361]', border: 'border-[#f7d8e2]', badgeBg: 'bg-[#fdf2f5]', badgeText: 'text-[#702e48]' }
        ];

        chipsContainer.innerHTML = facultyList.map((f, idx) => {
          const pal = avatarPalettes[idx % avatarPalettes.length];
          const initials = f.name.replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().split(' ').map(n => n[0]).join('').slice(0, 2) || 'FC';
          const shortName = f.name.replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().split(' ')[0];
          const titleName = f.name.startsWith('Dr.') ? `Dr. ${shortName}` : shortName;

          let extraDetail = '';
          if (this.facultyHighlightScope === 'day' && f.classes[0]) {
            const firstEv = f.classes[0];
            const cleanTime = (firstEv.timings || '').split('-')[0].trim();
            extraDetail = cleanTime ? `<span class="text-[9.5px] text-[#68736a]">• ${cleanTime}</span>` : '';
          }

          return `
            <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/95 border border-[#ded5c6] shadow-2xs shrink-0 hover:bg-[#ede7db] transition-colors cursor-pointer" title="${f.name} • ${f.count} ${f.subject} classes in selected ${this.facultyHighlightScope}">
              <span class="w-4 h-4 rounded-full ${pal.bg} ${pal.text} ${pal.border} border flex items-center justify-center text-[8px] font-bold shrink-0">
                ${initials}
              </span>
              <span class="font-semibold text-[#2c332d] text-[10.5px] whitespace-nowrap">
                ${titleName}
              </span>
              ${extraDetail}
              <span class="font-bold text-[9.5px] ${pal.badgeText} ${pal.badgeBg} px-1.5 py-0.2 rounded border ${pal.border}">
                ${f.count}
              </span>
            </div>
          `;
        }).join('');
      }
    }
  }

  setupFacultyHighlightsModal() {
    const modal = document.getElementById('facultyHighlightsModal');
    const closeBtn = document.getElementById('closeFacultyHighlightsModalBtn');
    const closeBottomBtn = document.getElementById('closeFacultyHighlightsBottomBtn');
    const btnDay = document.getElementById('modalScopeDayBtn');
    const btnWeek = document.getElementById('modalScopeWeekBtn');
    const btnMonth = document.getElementById('modalScopeMonthBtn');

    const closeModal = () => modal?.classList.add('hidden');

    closeBtn?.addEventListener('click', closeModal);
    closeBottomBtn?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal?.classList.contains('hidden')) {
        closeModal();
      }
    });

    const updateModalScopeButtons = () => {
      [btnDay, btnWeek, btnMonth].forEach(b => {
        if (!b) return;
        b.className = 'px-2.5 py-1 rounded text-[#576058] hover:text-[#2c332d] transition-colors cursor-pointer border-none bg-transparent';
      });
      let activeBtn = btnMonth;
      if (this.facultyHighlightScope === 'day') activeBtn = btnDay;
      if (this.facultyHighlightScope === 'week') activeBtn = btnWeek;
      if (activeBtn) {
        activeBtn.className = 'px-2.5 py-1 rounded btn-3d-primary font-bold text-white cursor-pointer border-none';
      }
    };

    btnDay?.addEventListener('click', () => {
      this.facultyHighlightScope = 'day';
      this.dashboardScope = 'day';
      this.batchGraphGranularity = 'day';
      updateModalScopeButtons();
      this.renderFacultyHighlightsCard();
      this.renderDashboardView();
      this.renderFacultyHighlightsModal();
    });

    btnWeek?.addEventListener('click', () => {
      this.facultyHighlightScope = 'week';
      this.dashboardScope = 'week';
      this.batchGraphGranularity = 'week';
      updateModalScopeButtons();
      this.renderFacultyHighlightsCard();
      this.renderDashboardView();
      this.renderFacultyHighlightsModal();
    });

    btnMonth?.addEventListener('click', () => {
      this.facultyHighlightScope = 'month';
      this.dashboardScope = 'month';
      this.batchGraphGranularity = 'month';
      updateModalScopeButtons();
      this.renderFacultyHighlightsCard();
      this.renderDashboardView();
      this.renderFacultyHighlightsModal();
    });

    this.updateModalScopeButtons = updateModalScopeButtons;
  }

  openFacultyHighlightsModal(targetFaculty = null) {
    const modal = document.getElementById('facultyHighlightsModal');
    if (!modal) return;
    this.updateModalScopeButtons?.();
    this.renderFacultyHighlightsModal();
    modal.classList.remove('hidden');

    if (targetFaculty) {
      setTimeout(() => {
        const targetEl = modal.querySelector(`[data-faculty-card="${CSS.escape(targetFaculty)}"]`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          targetEl.classList.add('ring-2', 'ring-[#4a7c59]');
          setTimeout(() => targetEl.classList.remove('ring-2', 'ring-[#4a7c59]'), 2200);
        }
      }, 80);
    }
  }

  renderFacultyHighlightsModal() {
    const subtitleEl = document.getElementById('modalFacultySubtitle');
    const totalClassesEl = document.getElementById('modalTotalClasses');
    const activeFacultyEl = document.getElementById('modalActiveFaculty');
    const totalHoursEl = document.getElementById('modalTotalHours');
    const activePeriodBadge = document.getElementById('modalActivePeriodBadge');
    const listContainer = document.getElementById('modalFacultyDistributionList');

    if (this.dashboardScope) {
      this.facultyHighlightScope = this.dashboardScope;
    }

    const allEvents = this.batchManager.getAllEvents(this.currentBatchId);
    const classes = allEvents.filter(e => e.eventType === 'class');

    let filtered = [];
    let periodText = '';

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const targetYear = this.dashboardYear !== undefined ? this.dashboardYear : (this.currentYear || 2026);
    const targetMonth = this.dashboardMonth !== undefined ? this.dashboardMonth : (this.currentMonth !== undefined ? this.currentMonth : 8);
    const targetWeekStart = this.dashboardWeekStart || this.currentWeekStart || new Date(2026, 8, 14);
    const targetDayIso = this.dashboardDayIso || this.selectedDayIso || todayIso();

    if (this.facultyHighlightScope === 'day') {
      filtered = classes.filter(e => e.isoDate === targetDayIso);
      const d = parseIso(targetDayIso) || new Date();
      periodText = `Selected Day: ${d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    } else if (this.facultyHighlightScope === 'week') {
      const sunday = startOfWeek(targetWeekStart);
      const saturday = endOfWeek(targetWeekStart);

      const sundayIso = toLocalIso(sunday);
      const saturdayIso = toLocalIso(saturday);

      filtered = classes.filter(e => e.isoDate && e.isoDate >= sundayIso && e.isoDate <= saturdayIso);
      periodText = `Active Week: ${sunday.toLocaleString('en-US', { month: 'short' })} ${sunday.getDate()} – ${saturday.toLocaleString('en-US', { month: 'short' })} ${saturday.getDate()}, ${saturday.getFullYear()}`;
    } else {
      filtered = classes.filter(e => {
        if (!e.isoDate) return false;
        const [y, m] = e.isoDate.split('-').map(Number);
        return y === targetYear && m === (targetMonth + 1);
      });
      periodText = `Active Month: ${monthNames[targetMonth]} ${targetYear}`;
    }

    if (subtitleEl) subtitleEl.textContent = `Detailed class load for ${periodText}`;
    if (activePeriodBadge) activePeriodBadge.textContent = periodText;
    if (totalClassesEl) totalClassesEl.textContent = filtered.length;

    // Group by faculty
    const facultyMap = new Map();
    filtered.forEach(ev => {
      const fac = (ev.faculty || 'Unassigned Faculty').trim();
      if (!facultyMap.has(fac)) {
        facultyMap.set(fac, {
          name: fac,
          subject: ev.subject || 'General',
          classes: [],
          count: 0
        });
      }
      const entry = facultyMap.get(fac);
      entry.classes.push(ev);
      entry.count++;
    });

    const facultyList = Array.from(facultyMap.values()).sort((a, b) => b.count - a.count);

    if (activeFacultyEl) activeFacultyEl.textContent = facultyList.length;
    if (totalHoursEl) totalHoursEl.textContent = `${filtered.length * 2} hrs`;

    if (!listContainer) return;

    if (facultyList.length === 0) {
      listContainer.innerHTML = `
        <div class="py-12 px-4 text-center text-[#68736a] space-y-2">
          <div class="w-12 h-12 mx-auto rounded-2xl bg-[#ede7da] border border-[#ded5c6] flex items-center justify-center text-[#8b958c]">
            <span class="material-symbols-outlined text-[26px]">event_busy</span>
          </div>
          <p class="text-xs font-bold text-[#2c332d]">No classes scheduled for this ${this.facultyHighlightScope}</p>
          <p class="text-[11px] text-[#788279]">Try selecting a different day, week, or month from the scope switcher above.</p>
        </div>
      `;
      return;
    }

    listContainer.innerHTML = facultyList.map(f => {
      const initials = f.name.replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().split(' ').map(n => n[0]).join('').slice(0, 2) || 'FC';
      const pct = Math.round((f.count / filtered.length) * 100);

      const classItems = f.classes.map(c => `
        <div class="p-2 rounded-lg bg-white border border-[#e8e2d8] text-xs flex items-center justify-between gap-2 hover:bg-[#faf7f2] transition-colors">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-bold text-[#2c332d] truncate">${c.topic || c.chapter || 'Lecture Session'}</span>
              <span class="text-[10px] font-semibold text-[#4a7c59] bg-[#eef4f0] px-1.5 py-0.2 rounded border border-[#cde0d3] shrink-0">${c.subject || f.subject}</span>
              ${renderBatchBadge(c.batchName)}
              ${renderPlatformBadges(c, { compact: true })}
            </div>
            <div class="flex items-center gap-2 mt-0.5 text-[10.5px] text-[#68736a]">
              <span>📅 ${c.dateRaw || c.isoDate}</span>
              <span>•</span>
              <span>⏰ ${(c.timings || '7:00 PM - 9:00 PM').replace(/\s*to\s*/i, ' – ')}</span>
            </div>
          </div>
          <span class="text-[10px] font-bold text-[#68736a] px-2 py-1 rounded bg-[#f4efe6] border border-[#ded5c6] shrink-0">${c.duration || '2 hrs'}</span>
        </div>
      `).join('');

      return `
        <div class="p-3.5 rounded-xl bg-white border border-[#ded5c6] card-3d space-y-2.5 transition-all" data-faculty-card="${f.name}">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5 min-w-0">
              <div class="w-8 h-8 rounded-full bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3] flex items-center justify-center text-xs font-bold shrink-0">
                ${initials}
              </div>
              <div class="min-w-0">
                <h4 class="font-bold text-xs text-[#2c332d] truncate">${f.name}</h4>
                <p class="text-[10.5px] text-[#68736a] font-medium">${f.subject} • ${f.count} ${f.count === 1 ? 'Class' : 'Classes'} (${f.count * 2} hrs)</p>
              </div>
            </div>
            <div class="text-right shrink-0">
              <span class="text-xs font-bold text-[#4a7c59] bg-[#eef4f0] px-2.5 py-1 rounded-lg border border-[#cde0d3] badge-3d">
                ${f.count} Classes • ${pct}% Load
              </span>
            </div>
          </div>

          <!-- Class List inside Faculty Card -->
          <div class="space-y-1.5 pt-1 border-t border-[#f0eae1]">
            ${classItems}
          </div>
        </div>
      `;
    }).join('');
  }

  // --- 4. Subject Filter Buttons ---
  updateSubjectFilterButtons() {
    const container = document.getElementById('adminSubjectFilters');
    if (!container) return;

    // Ensure single-line flex-nowrap
    container.classList.remove('flex-wrap');
    container.classList.add('flex-nowrap', 'whitespace-nowrap', 'min-w-max');

    const allEvents = this.batchManager.getAllEvents(this.currentBatchId);
    const subjectCounts = {};
    allEvents.filter(e => e.eventType === 'class').forEach(e => {
      if (e.subject) {
        subjectCounts[e.subject] = (subjectCounts[e.subject] || 0) + 1;
      }
    });

    let html = `
      <button class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shrink-0 whitespace-nowrap ${this.selectedSubject === 'all' ? 'btn-3d-primary pill-3d-active text-white' : 'pill-3d text-[#3b6347] bg-[#eef4f0] hover:bg-[#e2ede6] border border-[#cde0d3]'}" data-subject="all">
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
      FMT: { text: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', dot: '#10b981' },
      Pathology: { text: '#8b4361', bg: '#fdf2f5', border: '#f7d8e2', dot: '#8b4361' },
      Pharmacology: { text: '#2b6e56', bg: '#ecf7f2', border: '#c7ebd9', dot: '#2b6e56' },
      Microbiology: { text: '#0284c7', bg: '#e0f2fe', border: '#bae6fd', dot: '#0284c7' },
      Medicine: { text: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', dot: '#2563eb' },
      Surgery: { text: '#059669', bg: '#ecfdf5', border: '#a7f3d0', dot: '#059669' },
      Pediatrics: { text: '#ea580c', bg: '#fff7ed', border: '#ffedd5', dot: '#ea580c' },
      OBG: { text: '#be185d', bg: '#fdf2f8', border: '#fbcfe8', dot: '#be185d' },
      Radiology: { text: '#4f46e5', bg: '#eef2ff', border: '#c7d2fe', dot: '#4f46e5' },
      Orthopedics: { text: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#d97706' },
      Dermatology: { text: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', dot: '#0891b2' },
      Anaesthesia: { text: '#0d9488', bg: '#f0fdfa', border: '#99f6e4', dot: '#0d9488' },
      Psychiatry: { text: '#9333ea', bg: '#faf5ff', border: '#e9d5ff', dot: '#9333ea' },
      'Forensic Medicine': { text: '#10b981', bg: '#ecfdf5', border: '#a7f3d0', dot: '#10b981' }
    };

    Object.entries(subjectCounts).forEach(([sub, count]) => {
      const cfg = colorConfig[sub] || { text: '#4a7c59', bg: '#eef4f0', border: '#cde0d3', dot: '#4a7c59' };
      const isSelected = this.selectedSubject.toLowerCase() === sub.toLowerCase();

      html += `
        <button
          class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border cursor-pointer shrink-0 whitespace-nowrap ${
            isSelected
              ? 'btn-3d-primary pill-3d-active text-white border-[#4a7c59]'
              : 'pill-3d hover:brightness-95'
          }"
          style="${!isSelected ? `color: ${cfg.text}; background-color: ${cfg.bg}; border-color: ${cfg.border};` : ''}"
          data-subject="${sub}"
        >
          <span class="w-2 h-2 rounded-full shadow-xs shrink-0" style="background-color: ${cfg.dot};"></span>
          ${sub} (${count})
        </button>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('[data-subject]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedSubject = btn.getAttribute('data-subject');
        const moved = this.syncPeriodToFilters();
        this.updateSubjectFilterButtons();
        this.refreshPeriodChrome();
        if (moved) {
          this.showToast(`No ${this.selectedSubject === 'all' ? 'classes' : this.selectedSubject} classes in view - jumped to ${this.formatMonthLabel(moved.year, moved.month)}`);
        }
        document.querySelector(`#adminSubjectFilters [data-subject="${this.selectedSubject}"]`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });
    });

    this.setupSubjectFilterScroll();
  }

  setupSubjectFilterScroll() {
    const container = document.getElementById('adminSubjectFilters');
    if (!container) return;

    let scrollWrapper = document.getElementById('adminSubjectFiltersScroll');
    let leftBtn = document.getElementById('btnSubjectScrollLeft');
    let rightBtn = document.getElementById('btnSubjectScrollRight');

    // Dynamic Fallback: Wrap container if not already enclosed by scroll wrapper and arrow buttons
    if (!scrollWrapper || !leftBtn || !rightBtn) {
      const parent = container.parentElement;
      if (parent && !parent.classList.contains('subject-nav-wrapped')) {
        parent.classList.add('subject-nav-wrapped', 'relative', 'flex', 'items-center', 'gap-1.5', 'py-0.5', 'w-full');
        
        if (!leftBtn) {
          leftBtn = document.createElement('button');
          leftBtn.id = 'btnSubjectScrollLeft';
          leftBtn.type = 'button';
          leftBtn.className = 'w-7 h-7 rounded-lg bg-white border border-[#ded5c6] text-[#576058] hover:text-[#2c332d] hover:bg-[#f7f4ed] shadow-2xs flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed';
          leftBtn.setAttribute('aria-label', 'Scroll left');
          leftBtn.title = 'Scroll subjects left';
          leftBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">chevron_left</span>';
          parent.insertBefore(leftBtn, container);
        }

        if (!scrollWrapper) {
          scrollWrapper = document.createElement('div');
          scrollWrapper.id = 'adminSubjectFiltersScroll';
          scrollWrapper.className = 'flex-1 overflow-x-auto scroll-smooth no-scrollbar py-1';
          scrollWrapper.style.cssText = 'scrollbar-width: none; -ms-overflow-style: none;';
          parent.insertBefore(scrollWrapper, container);
          scrollWrapper.appendChild(container);
        }

        if (!rightBtn) {
          rightBtn = document.createElement('button');
          rightBtn.id = 'btnSubjectScrollRight';
          rightBtn.type = 'button';
          rightBtn.className = 'w-7 h-7 rounded-lg bg-white border border-[#ded5c6] text-[#576058] hover:text-[#2c332d] hover:bg-[#f7f4ed] shadow-2xs flex items-center justify-center shrink-0 transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed';
          rightBtn.setAttribute('aria-label', 'Scroll right');
          rightBtn.title = 'Scroll subjects right';
          rightBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">chevron_right</span>';
          parent.appendChild(rightBtn);
        }
      }
    }

    if (!scrollWrapper) {
      scrollWrapper = container.parentElement;
    }

    const updateArrows = () => {
      if (!scrollWrapper) return;
      const scrollLeft = scrollWrapper.scrollLeft;
      const maxScroll = Math.max(0, scrollWrapper.scrollWidth - scrollWrapper.clientWidth);

      if (leftBtn) {
        const canLeft = scrollLeft > 3;
        leftBtn.disabled = !canLeft;
        leftBtn.style.opacity = canLeft ? '1' : '0.25';
        leftBtn.style.pointerEvents = canLeft ? 'auto' : 'none';
      }
      if (rightBtn) {
        const canRight = scrollLeft < maxScroll - 3;
        rightBtn.disabled = !canRight;
        rightBtn.style.opacity = canRight ? '1' : '0.25';
        rightBtn.style.pointerEvents = canRight ? 'auto' : 'none';
      }
    };

    if (leftBtn && !leftBtn._scrollBound) {
      leftBtn._scrollBound = true;
      leftBtn.addEventListener('click', () => {
        if (scrollWrapper && typeof scrollWrapper.scrollBy === 'function') {
          scrollWrapper.scrollBy({ left: -220, behavior: 'smooth' });
          setTimeout(updateArrows, 250);
        }
      });
    }

    if (rightBtn && !rightBtn._scrollBound) {
      rightBtn._scrollBound = true;
      rightBtn.addEventListener('click', () => {
        if (scrollWrapper && typeof scrollWrapper.scrollBy === 'function') {
          scrollWrapper.scrollBy({ left: 220, behavior: 'smooth' });
          setTimeout(updateArrows, 250);
        }
      });
    }

    if (scrollWrapper && !scrollWrapper._scrollBound) {
      scrollWrapper._scrollBound = true;
      if (typeof scrollWrapper.addEventListener === 'function') {
        scrollWrapper.addEventListener('scroll', updateArrows, { passive: true });
      }
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('resize', updateArrows);
      }
    }

    // Run arrow state check
    setTimeout(updateArrows, 60);
  }

  // --- 5. Main Content Dispatcher ---
  renderMainContent() {
    this.updateViewButtons?.();
    this.updateSubjectFilterButtons?.();
    const calendarSection = document.getElementById('viewSectionCalendar');
    const weekSection = document.getElementById('viewSectionWeek');
    const timelineSection = document.getElementById('viewSectionTimeline');
    const dashboardSection = document.getElementById('viewSectionDashboard');
    const facultySection = document.getElementById('viewSectionFaculty');
    const onboardingSection = document.getElementById('viewSectionOnboarding');
    const workloadSection = document.getElementById('viewSectionWorkload');
    const requestsSection = document.getElementById('viewSectionRequests');
    const actionControls = document.getElementById('adminActionControlsBar');
    const summaryCards = document.getElementById('adminSummaryCardsContainer');

    // Hide all main containers
    calendarSection?.classList.add('hidden');
    weekSection?.classList.add('hidden');
    timelineSection?.classList.add('hidden');
    dashboardSection?.classList.add('hidden');
    facultySection?.classList.add('hidden');
    onboardingSection?.classList.add('hidden');
    workloadSection?.classList.add('hidden');
    requestsSection?.classList.add('hidden');
    summaryCards?.classList.remove('hidden');

    if (this.mainTab === 'calendar') {
      actionControls?.classList.remove('hidden');
      summaryCards?.classList.remove('hidden');
      this.updateSummaryCards();

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
    } else if (this.mainTab === 'workload') {
      workloadSection?.classList.remove('hidden');
      actionControls?.classList.add('hidden');
      summaryCards?.classList.remove('hidden');
      renderWorkloadView(workloadSection, this.workloadManager, this.workloadState);
    } else if (this.mainTab === 'onboarding') {
      onboardingSection?.classList.remove('hidden');
      actionControls?.classList.add('hidden');
      summaryCards?.classList.add('hidden');
      this.initOnboardingHandlers();
      this.renderOnboardingList();
    } else if (this.mainTab === 'requests') {
      requestsSection?.classList.remove('hidden');
      actionControls?.classList.add('hidden');
      summaryCards?.classList.add('hidden');
      this.setupRequestsHandlers();
      renderRequestsView(requestsSection, this.requestsState, this);
    }
  }

  // --- Requests & Approvals View Handlers (Dynamic with zero dummy data) ---
  setupRequestsHandlers() {
    const requestsSection = document.getElementById('viewSectionRequests');

    this.openDeclineModal = (data) => {
      this.currentActiveRequestId = data?.id;
      const faculty = data?.faculty || 'Faculty Member';
      const subject = data?.subject || 'Curriculum Subject';
      const session = data?.session || 'Scheduled Slot';
      const batch = data?.batch || 'Prarambh 2026';

      const facultyTargetEl = document.getElementById('declineFacultyTarget');
      const facultySubEl = document.getElementById('declineFacultySub');
      const sessionTimeEl = document.getElementById('declineSessionTime');

      if (facultyTargetEl) facultyTargetEl.textContent = faculty;
      if (facultySubEl) facultySubEl.textContent = `${subject} - ${batch}`;
      if (sessionTimeEl) sessionTimeEl.textContent = session;

      const declineModal = document.getElementById('declineConfirmModal');
      if (declineModal) {
        declineModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
    };

    this.openRescheduleModal = (requestId) => {
      this.currentActiveRequestId = requestId;
      openRescheduleApprovalModal(requestId, this);
    };

    this.openApproveCancellationModal = (requestId) => {
      this.currentActiveRequestId = requestId;
      const approveCancelModal = document.getElementById('approveCancellationModal');
      if (approveCancelModal) {
        approveCancelModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
    };

    this.openRejectCancellationModal = (requestId) => {
      this.currentActiveRequestId = requestId;
      const rejectCancelModal = document.getElementById('rejectCancellationModal');
      if (rejectCancelModal) {
        rejectCancelModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
      }
    };

    if (this._requestsModalsBound) return;
    this._requestsModalsBound = true;

    // Modals references & close handlers
    const declineModal = document.getElementById('declineConfirmModal');
    const declineBackdrop = document.getElementById('declineModalBackdrop');
    const closeDeclineIconBtn = document.getElementById('closeDeclineIconBtn');
    const declineNoBtn = document.getElementById('declineNoBtn');
    const declineYesBtn = document.getElementById('declineYesBtn');

    const closeDeclineModal = () => {
      if (declineModal) {
        declineModal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    };

    if (closeDeclineIconBtn) closeDeclineIconBtn.addEventListener('click', closeDeclineModal);
    if (declineNoBtn) declineNoBtn.addEventListener('click', closeDeclineModal);
    if (declineBackdrop) declineBackdrop.addEventListener('click', closeDeclineModal);

    if (declineYesBtn) {
      declineYesBtn.addEventListener('click', () => {
        declineYesBtn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">refresh</span> Cancelling...';
        declineYesBtn.disabled = true;

        setTimeout(() => {
          closeDeclineModal();
          declineYesBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">check</span> Yes';
          declineYesBtn.disabled = false;

          if (this.currentActiveRequestId) {
            updateRequestStatus(this.currentActiveRequestId, 'declined');
          }
          if (requestsSection) {
            renderRequestsView(requestsSection, this.requestsState, this);
          }
          this.showToast('Request declined. Slot vacated & faculty notified.', 'error');
        }, 400);
      });
    }

    // Reschedule Modal
    const rescheduleModal = document.getElementById('rescheduleModal');
    const rescheduleBackdrop = document.getElementById('modalBackdrop');
    const closeRescheduleIconBtn = document.getElementById('closeModalIconBtn');
    const rescheduleCancelBtn = document.getElementById('rescheduleCancelBtn');
    const rescheduleDeclineBtn = document.getElementById('closeModalBtn');
    const confirmApproveBtn = document.getElementById('confirmApproveBtn');

    const closeRescheduleModal = () => {
      if (rescheduleModal) {
        rescheduleModal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    };

    if (closeRescheduleIconBtn) closeRescheduleIconBtn.addEventListener('click', closeRescheduleModal);
    if (rescheduleCancelBtn) rescheduleCancelBtn.addEventListener('click', closeRescheduleModal);
    if (rescheduleBackdrop) rescheduleBackdrop.addEventListener('click', closeRescheduleModal);

    if (rescheduleDeclineBtn) {
      rescheduleDeclineBtn.addEventListener('click', () => {
        closeRescheduleModal();
        if (this.currentActiveRequestId) {
          this.openDeclineModal({ id: this.currentActiveRequestId });
        }
      });
    }

    if (confirmApproveBtn) {
      confirmApproveBtn.addEventListener('click', () => {
        confirmApproveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">check</span> Reschedule Approved!';
        confirmApproveBtn.classList.remove('bg-[#4a7c59]');
        confirmApproveBtn.classList.add('bg-[#3d6749]');

        setTimeout(async () => {
          closeRescheduleModal();
          confirmApproveBtn.innerHTML = '<span class="material-symbols-outlined text-[18px]">check_circle</span><span>Confirm Reschedule &amp; Approve</span>';
          confirmApproveBtn.classList.add('bg-[#4a7c59]');
          confirmApproveBtn.classList.remove('bg-[#3d6749]');

          const req = this.currentActiveRequestId ? getRequestById(this.currentActiveRequestId) : null;
          this.showToast('Reschedule approved! New slot locked & students updated.');

          // Write the decision back to the connected sheet.
          let sync = null;
          if (req?.lecture) {
            const slot = this.resolveApprovedSlot(req);
            if (!slot) {
              this.showToast('Approved locally, but the new slot could not be read - sheet not updated.');
              sync = { ok: false, error: 'Could not determine the rescheduled slot', at: new Date().toISOString() };
            } else {
              const result = await pushRescheduleToSheet(req.lecture, slot, {
                reason: req.reason || '',
                actor: this.getActorLabel(),
                requestId: req.id
              });
              sync = this.reportSheetSync(result, { action: 'reschedule' });
            }
          } else if (this.currentActiveRequestId && isSheetWriteBackConfigured()) {
            this.showToast('Approved locally. This request has no sheet row reference, so the sheet was not updated.');
            sync = { ok: false, error: 'Request carries no lecture reference', at: new Date().toISOString() };
          }

          if (this.currentActiveRequestId) {
            updateRequestStatus(this.currentActiveRequestId, 'approved', sync);
          }
          this.pendingRescheduleSlot = null;
          if (requestsSection) {
            renderRequestsView(requestsSection, this.requestsState, this);
          }
        }, 400);
      });
    }

    // Alternative Slot Modal
    const altSlotModal = document.getElementById('altSlotModal');
    const altSlotBackdrop = document.getElementById('altSlotBackdrop');
    const closeAltSlotBtn = document.getElementById('closeAltSlotBtn');
    const mon19SlotTrigger = document.getElementById('mon19SlotTrigger');
    const scheduleAltSlotBtn = document.getElementById('scheduleAltSlotBtn');
    const altDurButtons = document.querySelectorAll('.btn-alt-dur');

    const openAltSlotModal = () => { if (altSlotModal) altSlotModal.classList.remove('hidden'); };
    const closeAltSlotModal = () => { if (altSlotModal) altSlotModal.classList.add('hidden'); };

    if (mon19SlotTrigger) mon19SlotTrigger.addEventListener('click', openAltSlotModal);
    if (closeAltSlotBtn) closeAltSlotBtn.addEventListener('click', closeAltSlotModal);
    if (altSlotBackdrop) altSlotBackdrop.addEventListener('click', closeAltSlotModal);

    altDurButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        altDurButtons.forEach(b => {
          b.classList.remove('active', 'bg-[#4a7c59]', 'text-white', 'font-bold', 'shadow-xs', 'border-[#4a7c59]');
          b.classList.add('bg-white', 'text-[#2e3230]', 'font-semibold', 'border-[#c4c8bc]');
        });
        this.classList.add('active', 'bg-[#4a7c59]', 'text-white', 'font-bold', 'shadow-xs', 'border-[#4a7c59]');
        this.classList.remove('bg-white', 'text-[#2e3230]', 'font-semibold', 'border-[#c4c8bc]');
      });
    });

    if (scheduleAltSlotBtn) {
      scheduleAltSlotBtn.addEventListener('click', () => {
        const slot = this.readAltSlotSelection();
        const propText = document.getElementById('rescheduleProposedSlotText');
        const label = slot ? `${slot.label} • ${slot.timings}` : 'Mon, 19 Oct • 5:00 PM – 7:00 PM';
        if (propText) propText.textContent = label;
        // Remember the pick in machine-readable form so approving can write
        // the exact date, time and duration back to the sheet.
        this.pendingRescheduleSlot = slot;
        closeAltSlotModal();
        this.showToast(`Selected ${label} as the alternative proposed slot`);
      });
    }

    // Approve Cancellation Modal
    const approveCancelModal = document.getElementById('approveCancellationModal');
    const approveCancelBackdrop = document.getElementById('approveCancellationModalBackdrop');
    const closeApproveCancelIconBtn = document.getElementById('closeApproveCancellationIconBtn');
    const approveCancelDismissBtn = document.getElementById('approveCancelDismissBtn');
    const confirmApproveCancellationBtn = document.getElementById('confirmApproveCancellationBtn');

    const closeApproveCancelModal = () => {
      if (approveCancelModal) {
        approveCancelModal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    };

    if (closeApproveCancelIconBtn) closeApproveCancelIconBtn.addEventListener('click', closeApproveCancelModal);
    if (approveCancelDismissBtn) approveCancelDismissBtn.addEventListener('click', closeApproveCancelModal);
    if (approveCancelBackdrop) approveCancelBackdrop.addEventListener('click', closeApproveCancelModal);

    if (confirmApproveCancellationBtn) {
      confirmApproveCancellationBtn.addEventListener('click', () => {
        confirmApproveCancellationBtn.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">refresh</span> Processing...';
        confirmApproveCancellationBtn.disabled = true;

        setTimeout(async () => {
          closeApproveCancelModal();
          confirmApproveCancellationBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">check_circle</span> Confirm Approval';
          confirmApproveCancellationBtn.disabled = false;

          const req = this.currentActiveRequestId ? getRequestById(this.currentActiveRequestId) : null;
          this.showToast('Cancellation approved. Slot vacated & substitute mapped.');

          let sync = null;
          if (req?.lecture) {
            const result = await pushCancellationToSheet(req.lecture, {
              reason: req.reason || '',
              actor: this.getActorLabel(),
              requestId: req.id
            });
            sync = this.reportSheetSync(result, { action: 'cancellation' });
          } else if (this.currentActiveRequestId && isSheetWriteBackConfigured()) {
            this.showToast('Approved locally. This request has no sheet row reference, so the sheet was not updated.');
            sync = { ok: false, error: 'Request carries no lecture reference', at: new Date().toISOString() };
          }

          if (this.currentActiveRequestId) {
            updateRequestStatus(this.currentActiveRequestId, 'approved', sync);
          }
          if (requestsSection) {
            renderRequestsView(requestsSection, this.requestsState, this);
          }
        }, 400);
      });
    }

    // Reject Cancellation Modal
    const rejectCancelModal = document.getElementById('rejectCancellationModal');
    const rejectCancelBackdrop = document.getElementById('rejectModalBackdrop');
    const closeRejectModalIconBtn = document.getElementById('closeRejectModalIconBtn');
    const rejectCancelDismissBtn = document.getElementById('rejectCancelDismissBtn');
    const confirmRejectBtn = document.getElementById('confirmRejectBtn');
    const reasonTextarea = document.getElementById('rejectionReasonText');
    const quickReasonButtons = document.querySelectorAll('.btn-quick-reason');

    const closeRejectCancelModal = () => {
      if (rejectCancelModal) {
        rejectCancelModal.classList.add('hidden');
        document.body.style.overflow = '';
      }
    };

    if (closeRejectModalIconBtn) closeRejectModalIconBtn.addEventListener('click', closeRejectCancelModal);
    if (rejectCancelDismissBtn) rejectCancelDismissBtn.addEventListener('click', closeRejectCancelModal);
    if (rejectCancelBackdrop) rejectCancelBackdrop.addEventListener('click', closeRejectCancelModal);

    quickReasonButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const reason = this.getAttribute('data-reason');
        if (reasonTextarea) {
          if (reason) reasonTextarea.value = reason;
          else reasonTextarea.focus();
        }
      });
    });

    if (confirmRejectBtn) {
      confirmRejectBtn.addEventListener('click', () => {
        confirmRejectBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">cancel</span> Cancellation Rejected';
        confirmRejectBtn.disabled = true;

        setTimeout(() => {
          closeRejectCancelModal();
          confirmRejectBtn.innerHTML = '<span class="material-symbols-outlined text-[16px]">cancel</span> Confirm Rejection';
          confirmRejectBtn.disabled = false;

          if (this.currentActiveRequestId) {
            updateRequestStatus(this.currentActiveRequestId, 'declined');
          }
          if (requestsSection) {
            renderRequestsView(requestsSection, this.requestsState, this);
          }
          this.showToast('Cancellation request rejected. Notice dispatched.', 'error');
        }, 400);
      });
    }

    // Escape Key Handler
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (altSlotModal && !altSlotModal.classList.contains('hidden')) closeAltSlotModal();
        else if (declineModal && !declineModal.classList.contains('hidden')) closeDeclineModal();
        else if (approveCancelModal && !approveCancelModal.classList.contains('hidden')) closeApproveCancelModal();
        else if (rejectCancelModal && !rejectCancelModal.classList.contains('hidden')) closeRejectCancelModal();
        else if (rescheduleModal && !rescheduleModal.classList.contains('hidden')) closeRescheduleModal();
      }
    });
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
          <div ${cell.isToday ? 'id="calendarTodayCell"' : ''} class="${cellClasses} calendar-day-box cursor-pointer" data-cell-iso="${cell.isoDate}" title="Click to view faculty classes for this day">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xs ${cell.isToday ? 'font-extrabold text-[#2d4d37] flex items-center gap-1.5 font-headline' : 'font-bold text-[#2c332d]'}">
                ${cell.dayNum}
                ${cell.isToday ? '<span class="text-[9px] bg-[#4a7c59] text-white px-2 py-0.5 rounded-md font-bold uppercase tracking-wider font-body">Today</span>' : ''}
              </span>
            </div>
        `;

        if (classEvents.length > 0) {
          html += `<div class="space-y-1.5 overflow-y-auto max-h-[170px] pt-1.5 pb-1 px-1 -mx-1 no-scrollbar">`;
          classEvents.forEach(ev => {
            const initial = ev.faculty ? ev.faculty.replace(/^Dr\.\s*/i, '').split(' ').map(w => w[0]).join('').slice(0, 2) : 'DR';
            const batchBadge = renderBatchBadge(ev.batchName);
            const platformBadge = renderPlatformBadges(ev, { compact: true });

            html += `
              <div class="bg-[#fbf9f5] hover:bg-white border ${cell.isToday ? 'border-2 border-[#4a7c59]' : 'border-[#d8e5dc]'} rounded-xl p-2.5 text-left transition-all shadow-sm cursor-pointer class-card-clickable" data-event-id="${ev.id}">
                <div class="flex items-center justify-between text-[10px] font-bold text-[#3b6347] mb-1 gap-1">
                  <span class="uppercase tracking-wide truncate">${ev.subject || 'Lecture'}</span>
                  <div class="flex items-center gap-1 shrink-0">
                    ${batchBadge}
                    ${platformBadge}
                  </div>
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

    // Attach click listeners to day cells
    gridContainer.querySelectorAll('.calendar-day-box').forEach(box => {
      box.addEventListener('click', (e) => {
        if (e.target.closest('.class-card-clickable')) return;
        const iso = box.getAttribute('data-cell-iso');
        if (iso) {
          this.selectedDayIso = iso;
          this.facultyHighlightScope = 'day';
          this.renderFacultyHighlightsCard();
          const d = new Date(iso + 'T00:00:00');
          this.showToast(`Selected ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} highlights`);
        }
      });
    });

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

  getWeekNumber(d = new Date()) {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
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

    const weekNum = this.getWeekNumber(sunday);
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
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3] badge-3d">Term 1 • Week ${weekNum} of 52</span>
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
            <div class="bg-white border border-[#d8e5dc] hover:border-[#4a7c59] rounded-xl p-3 text-left transition-all cursor-pointer week-class-card flex flex-col justify-between gap-2.5 group overflow-hidden max-w-full" data-event-id="${ev.id}">
              <div class="min-w-0">
                <!-- Top Subject & Venue Row -->
                <div class="flex items-center justify-between text-[10px] font-bold mb-1.5 gap-1 flex-wrap">
                  <span class="uppercase tracking-wider px-2 py-0.5 rounded-md ${subStyle.pillBg} ${subStyle.pillText} border ${subStyle.border} truncate badge-3d max-w-[95px]">
                    ${ev.subject || 'Lecture'}
                  </span>
                  <div class="flex items-center gap-1 flex-wrap shrink-0">
                    ${renderBatchBadge(ev.batchName)}
                    ${renderPlatformBadges(ev, { compact: true })}
                  </div>
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
              <div class="flex items-center gap-1.5 flex-wrap">
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${subStyle.pillBg} ${subStyle.pillText} border ${subStyle.border}">
                  ${ev.subject}
                </span>
                ${renderBatchBadge(ev.batchName)}
                ${renderPlatformBadges(ev, { compact: true })}
              </div>
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
            <div class="w-full bg-white border border-[#ded5c6] hover:border-[#4a7c59] rounded-2xl p-4 sm:p-5 timeline-card-3d cursor-pointer shadow-xs hover:shadow-md transition-all" data-event-id="${ev.id}">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${subStyle.pillBg} ${subStyle.pillText} border ${subStyle.border} badge-3d">
                    ${ev.subject || 'Lecture'}
                  </span>
                  ${renderBatchBadge(ev.batchName)}
                  ${renderPlatformBadges(ev, { compact: true })}
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
                  <div class="w-7 h-7 rounded-full bg-[#f4ece1] border border-[#ded5c6] shadow-xs flex items-center justify-center text-[10px] font-bold text-[#705c30]">
                    ${initials}
                  </div>
                  <div>
                    <span class="text-xs font-bold text-[#2c332d]">${ev.faculty}</span>
                    <span class="text-[10px] text-[#788279] block">Department of ${ev.subject}</span>
                  </div>
                </div>

                <div class="flex items-center gap-2" onclick="event.stopPropagation();">
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
                  ${renderBatchBadge(ev.batchName)}
                  ${renderPlatformBadges(ev, { compact: true })}
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

  // --- 9. Dashboard Overview Tab (Faculty-Wise Highlights View) ---
  renderDashboardView() {
    const container = document.getElementById('viewSectionDashboard');
    if (!container) return;

    // Ensure independent dashboard period properties exist
    if (!this.dashboardScope) this.dashboardScope = this.facultyHighlightScope || 'month';
    if (this.dashboardYear === undefined) this.dashboardYear = this.currentYear || 2026;
    if (this.dashboardMonth === undefined) this.dashboardMonth = this.currentMonth !== undefined ? this.currentMonth : 9;
    if (!this.dashboardWeekStart) this.dashboardWeekStart = new Date(this.currentWeekStart || new Date(2026, 9, 11));
    if (!this.dashboardDayIso) this.dashboardDayIso = this.selectedDayIso || todayIso();

    this.facultyHighlightScope = this.dashboardScope;
    this.batchGraphGranularity = this.dashboardScope;
    this.renderFacultyHighlightsCard();

    const allEvents = this.batchManager.getAllEvents(this.currentBatchId);
    const classes = allEvents.filter(e => e.eventType === 'class');

    let filtered = [];
    let periodText = '';

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    if (this.dashboardScope === 'day') {
      const targetIso = this.dashboardDayIso || todayIso();
      filtered = classes.filter(e => e.isoDate === targetIso);
      const d = new Date(targetIso + 'T00:00:00');
      const isToday = targetIso === todayIso();
      periodText = `${d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}${isToday ? ' (Today)' : ''}`;
    } else if (this.dashboardScope === 'week') {
      const sunday = startOfWeek(this.dashboardWeekStart);
      const saturday = endOfWeek(this.dashboardWeekStart);

      const sundayIso = toLocalIso(sunday);
      const saturdayIso = toLocalIso(saturday);

      filtered = classes.filter(e => e.isoDate && e.isoDate >= sundayIso && e.isoDate <= saturdayIso);

      // ISO week calculation
      const dWeek = new Date(Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate()));
      const dayNum = dWeek.getUTCDay() || 7;
      dWeek.setUTCDate(dWeek.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(dWeek.getUTCFullYear(), 0, 1));
      const weekNo = Math.ceil((((dWeek - yearStart) / 86400000) + 1) / 7);

      periodText = `Week ${weekNo}: ${sunday.toLocaleString('en-US', { month: 'short' })} ${sunday.getDate()} – ${saturday.toLocaleString('en-US', { month: 'short' })} ${saturday.getDate()}, ${saturday.getFullYear()}`;
    } else {
      // Month mode
      filtered = classes.filter(e => {
        if (!e.isoDate) return false;
        const [y, m] = e.isoDate.split('-').map(Number);
        return y === this.dashboardYear && m === (this.dashboardMonth + 1);
      });
      periodText = `${monthNames[this.dashboardMonth]} ${this.dashboardYear}`;
    }

    // Group by faculty and calculate total hours
    const facultyMap = new Map();
    let totalComputedHours = 0;
    const subjectStats = {};
    const dayStats = {
      Mon: { name: 'Mon', count: 0, hours: 0 },
      Tue: { name: 'Tue', count: 0, hours: 0 },
      Wed: { name: 'Wed', count: 0, hours: 0 },
      Thu: { name: 'Thu', count: 0, hours: 0 },
      Fri: { name: 'Fri', count: 0, hours: 0 },
      Sat: { name: 'Sat', count: 0, hours: 0 },
      Sun: { name: 'Sun', count: 0, hours: 0 }
    };
    const dayNameMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let appClassesCount = 0;
    let appHours = 0;
    let ytClassesCount = 0;
    let ytHours = 0;

    filtered.forEach(ev => {
      const fac = (ev.faculty || 'Unassigned Faculty').trim();
      const durMatch = (ev.duration || '').match(/(\d+(?:\.\d+)?)/);
      const evHours = durMatch ? parseFloat(durMatch[1]) : 2;
      totalComputedHours += evHours;

      // Faculty map
      if (!facultyMap.has(fac)) {
        facultyMap.set(fac, {
          name: fac,
          subject: ev.subject || 'General',
          classes: [],
          count: 0,
          totalHours: 0
        });
      }
      const entry = facultyMap.get(fac);
      entry.classes.push(ev);
      entry.count++;
      entry.totalHours += evHours;

      // Subject stats
      const sub = (ev.subject || 'General').trim();
      if (!subjectStats[sub]) {
        subjectStats[sub] = { subject: sub, count: 0, hours: 0 };
      }
      subjectStats[sub].count++;
      subjectStats[sub].hours += evHours;

      // Day stats
      if (ev.isoDate) {
        const d = new Date(ev.isoDate + 'T00:00:00');
        const shortDay = dayNameMap[d.getDay()];
        if (dayStats[shortDay]) {
          dayStats[shortDay].count++;
          dayStats[shortDay].hours += evHours;
        }
      }

      // Platform stats
      const isYt = ev.isYoutube || ev.platform === 'youtube' || (ev.batchName && /youtube|yt/i.test(ev.batchName));
      if (isYt) {
        ytClassesCount++;
        ytHours += evHours;
      } else {
        appClassesCount++;
        appHours += evHours;
      }
    });

    const facultyList = Array.from(facultyMap.values()).sort((a, b) => b.count - a.count);

    // Subject Color Mapping
    const subjectColorMap = {
      'Biochemistry': '#4a7c59',
      'Anatomy': '#c26d3e',
      'Physiology': '#705c30',
      'Pathology': '#dc2626',
      'Community Medicine': '#0096cc',
      'ENT': '#7c52aa',
      'Ophthalmology': '#8b4361',
      'FMT': '#10b981',
      'Pharmacology': '#d97706',
      'Microbiology': '#0284c7',
      'Medicine': '#2563eb',
      'Surgery': '#059669',
      'Pediatrics': '#ea580c',
      'OBGY': '#be185d',
      'General': '#68736a'
    };
    const paletteFallback = ['#4a7c59', '#c26d3e', '#705c30', '#0096cc', '#7c52aa', '#8b4361', '#10b981', '#dc2626', '#d97706', '#0284c7', '#3b82f6', '#f59e0b'];

    const subjectList = Object.values(subjectStats).sort((a, b) => b.hours - a.hours);

    // 1. Generate Subject Donut SVG
    const radius = 54;
    const circumference = 2 * Math.PI * radius; // ~ 339.292
    let cumulativeOffset = 0;

    const donutSlicesHtml = subjectList.map((s, idx) => {
      const color = subjectColorMap[s.subject] || paletteFallback[idx % paletteFallback.length];
      const fraction = s.hours / (totalComputedHours || 1);
      const dash = fraction * circumference;
      const pct = Math.round(fraction * 100);
      const offset = cumulativeOffset;
      cumulativeOffset += dash;

      return `
        <circle
          cx="70" cy="70" r="${radius}"
          fill="transparent"
          stroke="${color}"
          stroke-width="16"
          stroke-dasharray="${dash.toFixed(2)} ${(circumference - dash).toFixed(2)}"
          stroke-dashoffset="${(-offset).toFixed(2)}"
          transform="rotate(-90 70 70)"
          class="donut-slice transition-all duration-200 cursor-pointer"
          data-subject="${s.subject}"
          data-hours="${s.hours}"
          data-count="${s.count}"
          data-pct="${pct}"
        />
      `;
    }).join('');

    const donutLegendHtml = subjectList.map((s, idx) => {
      const color = subjectColorMap[s.subject] || paletteFallback[idx % paletteFallback.length];
      const pct = Math.round((s.hours / (totalComputedHours || 1)) * 100);
      return `
        <div class="donut-legend-item flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-[#f7f4ed] transition-colors cursor-pointer text-xs" data-subject="${s.subject}" data-hours="${s.hours}" data-count="${s.count}" data-pct="${pct}">
          <div class="flex items-center gap-2 min-w-0">
            <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${color};"></span>
            <span class="font-bold text-[#2c332d] truncate text-[11px]">${s.subject}</span>
          </div>
          <div class="flex items-center gap-1.5 shrink-0 text-[10.5px]">
            <span class="text-[#68736a] font-medium">${s.hours}h (${s.count})</span>
            <span class="font-bold px-1.5 py-0.2 rounded bg-[#f4efe6] text-[#2c332d] border border-[#ded5c6]">${pct}%</span>
          </div>
        </div>
      `;
    }).join('');

    // 2. Generate Weekly Day-of-Week Bar Chart
    const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const maxDayCount = Math.max(1, ...dayOrder.map(d => dayStats[d].count));
    const peakDay = dayOrder.find(d => dayStats[d].count === maxDayCount && dayStats[d].count > 0);

    const barChartHtml = dayOrder.map(d => {
      const stat = dayStats[d];
      const isPeak = d === peakDay && stat.count > 0;
      const heightPct = stat.count > 0 ? Math.max(16, Math.round((stat.count / maxDayCount) * 100)) : 8;

      return `
        <div class="flex-1 flex flex-col items-center gap-1 group">
          <span class="text-[10px] font-bold ${isPeak ? 'text-[#3b6347]' : 'text-[#68736a]'} ${stat.count === 0 ? 'opacity-40' : ''}">
            ${stat.count > 0 ? stat.count : '–'}
          </span>
          <div class="w-full flex-1 flex items-end justify-center">
            <div
              class="w-full max-w-[28px] rounded-t-lg transition-all duration-300 group-hover:brightness-95 ${
                stat.count === 0
                  ? 'bg-[#ede7da] border border-dashed border-[#ded5c6]'
                  : isPeak
                  ? 'bg-gradient-to-t from-[#3b6347] to-[#4a7c59] shadow-xs'
                  : 'bg-gradient-to-t from-[#cde0d3] to-[#7fa38a]'
              }"
              style="height: ${heightPct}%;"
              title="${stat.name}: ${stat.count} sessions • ${stat.hours} teaching hours"
            ></div>
          </div>
          <div class="text-center pt-1">
            <span class="block text-[10.5px] font-bold ${isPeak ? 'text-[#2c332d]' : 'text-[#576058]'}">${d}</span>
            <span class="block text-[9px] text-[#8b958c]">${stat.hours > 0 ? `${stat.hours}h` : 'Off'}</span>
          </div>
        </div>
      `;
    }).join('');

    // 3. Generate Platform Modality Donut
    const appPct = Math.round((appHours / (totalComputedHours || 1)) * 100);
    const ytPct = 100 - appPct;
    const platformRadius = 42;
    const platformCircumference = 2 * Math.PI * platformRadius; // ~ 263.89
    const appDash = (appHours / (totalComputedHours || 1)) * platformCircumference;
    const ytDash = platformCircumference - appDash;

    const avgSessionHours = filtered.length > 0 ? (totalComputedHours / filtered.length).toFixed(1) : '2.0';

    const avatarPalettes = [
      { bg: 'bg-[#eef4f0]', text: 'text-[#3b6347]', border: 'border-[#cde0d3]', barColor: '#4a7c59' },
      { bg: 'bg-[#fbf3ec]', text: 'text-[#c26d3e]', border: 'border-[#eed9cc]', barColor: '#c26d3e' },
      { bg: 'bg-[#fdf8f0]', text: 'text-[#705c30]', border: 'border-[#ebe0ca]', barColor: '#705c30' },
      { bg: 'bg-[#e0f4fc]', text: 'text-[#0077a3]', border: 'border-[#b8e6f8]', barColor: '#0096cc' },
      { bg: 'bg-[#eedcff]', text: 'text-[#6a3fa0]', border: 'border-[#dcc8e0]', barColor: '#7c52aa' },
      { bg: 'bg-[#fdf2f5]', text: 'text-[#8b4361]', border: 'border-[#f7d8e2]', barColor: '#8b4361' }
    ];
    const paletteColors = ['#4a7c59', '#c26d3e', '#705c30', '#0096cc', '#7c52aa', '#8b4361', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'];

    let overviewContentHtml = '';
    if (facultyList.length === 0) {
      overviewContentHtml = `
        <div class="py-12 px-4 text-center text-[#68736a] space-y-2">
          <div class="w-12 h-12 mx-auto rounded-2xl bg-[#ede7da] border border-[#ded5c6] flex items-center justify-center text-[#8b958c]">
            <span class="material-symbols-outlined text-[26px]">event_busy</span>
          </div>
          <p class="text-xs font-bold text-[#2c332d]">No classes scheduled for this ${this.dashboardScope === 'day' ? 'day' : this.dashboardScope}</p>
          <p class="text-[11px] text-[#788279]">Try navigating to another period or selecting a different filter scope above.</p>
        </div>
      `;
    } else {
      // Visual Proportional Bar
      const proportionalBarHtml = `
        <div class="space-y-1.5 pt-1">
          <div class="flex items-center justify-between text-[11px] font-semibold text-[#68736a]">
            <span>Workload Distribution Across Active Faculty</span>
            <span>${facultyList.length} Faculty • ${filtered.length} Sessions</span>
          </div>
          <div class="h-2 rounded-full overflow-hidden flex bg-[#e8e2d8] shadow-inner">
            ${facultyList.map((f, i) => {
              const pct = ((f.count / (filtered.length || 1)) * 100).toFixed(1);
              const color = paletteColors[i % paletteColors.length];
              return `<div class="h-full transition-all" style="width: ${pct}%; background-color: ${color};" title="${f.name}: ${f.count} classes (${pct}%)"></div>`;
            }).join('')}
          </div>
        </div>
      `;

      // Table Rows
      const tableRowsHtml = facultyList.map((f, idx) => {
        const pal = avatarPalettes[idx % avatarPalettes.length];
        const initials = f.name.replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().split(' ').map(n => n[0]).join('').slice(0, 2) || 'FC';
        const pct = Math.round((f.count / (filtered.length || 1)) * 100);

        // Compute schedule window
        const dates = f.classes.map(c => c.dateRaw || c.isoDate).filter(Boolean);
        let scheduleWindow = '–';
        if (dates.length === 1) {
          scheduleWindow = dates[0];
        } else if (dates.length > 1) {
          const sortedIso = f.classes.map(c => c.isoDate).filter(Boolean).sort();
          if (sortedIso.length > 0) {
            const firstD = new Date(sortedIso[0] + 'T00:00:00');
            const lastD = new Date(sortedIso[sortedIso.length - 1] + 'T00:00:00');
            if (sortedIso[0] === sortedIso[sortedIso.length - 1]) {
              scheduleWindow = firstD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            } else {
              scheduleWindow = `${firstD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${lastD.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
            }
          } else {
            scheduleWindow = `${dates.length} scheduled dates`;
          }
        }

        return `
          <tr class="hover:bg-[#fbf9f5] transition-colors cursor-pointer faculty-overview-row" data-faculty="${f.name}">
            <td class="py-3.5 px-4 whitespace-nowrap">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-full ${pal.bg} ${pal.text} border ${pal.border} flex items-center justify-center text-xs font-bold shrink-0">
                  ${initials}
                </div>
                <div>
                  <strong class="font-bold text-[#2c332d] text-xs block">${f.name}</strong>
                  <span class="text-[10.5px] text-[#788279]">${f.count === 1 ? '1 Lecture Session' : `${f.count} Lecture Sessions`}</span>
                </div>
              </div>
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">
              <span class="px-2.5 py-0.5 rounded-md text-[11px] font-semibold text-[#3b6347] bg-[#eef4f0] border border-[#cde0d3]">
                ${f.subject}
              </span>
            </td>
            <td class="py-3.5 px-4 text-center whitespace-nowrap">
              <span class="inline-flex items-center gap-1 font-bold text-xs text-[#2c332d] bg-[#f7f4ed] px-2.5 py-1 rounded-lg border border-[#ded5c6]">
                <span class="material-symbols-outlined text-[14px] text-[#4a7c59]">school</span>
                ${f.count}
              </span>
            </td>
            <td class="py-3.5 px-4 text-center whitespace-nowrap font-bold text-xs text-[#c26d3e]">
              ${f.totalHours} hrs
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">
              <div class="flex items-center gap-2">
                <div class="w-20 bg-[#ece5d8] h-2 rounded-full overflow-hidden">
                  <div class="h-full rounded-full transition-all" style="width: ${pct}%; background-color: ${pal.barColor || '#4a7c59'};"></div>
                </div>
                <span class="text-[11px] font-bold text-[#576058]">${pct}%</span>
              </div>
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap text-[11px] text-[#576058]">
              <div class="flex items-center gap-1.5">
                <span class="material-symbols-outlined text-[15px] text-[#8b958c]">calendar_month</span>
                <span>${scheduleWindow}</span>
              </div>
            </td>
            <td class="py-3.5 px-4 text-right whitespace-nowrap">
              <button type="button" class="btn-faculty-overview-detail btn-3d-secondary px-3 py-1 rounded-lg text-xs font-bold text-[#2c332d] hover:text-[#3b6347] transition-all cursor-pointer" data-faculty="${f.name}">
                View Schedule
              </button>
            </td>
          </tr>
        `;
      }).join('');

      overviewContentHtml = `
        <div class="space-y-3.5">
          ${proportionalBarHtml}

          <div class="overflow-x-auto rounded-xl border border-[#ded5c6] bg-white">
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-[#f7f4ed] border-b border-[#ded5c6] text-[10.5px] font-bold uppercase tracking-wider text-[#68736a]">
                  <th class="py-3 px-4">Faculty Member</th>
                  <th class="py-3 px-4">Department / Subject</th>
                  <th class="py-3 px-4 text-center">Classes</th>
                  <th class="py-3 px-4 text-center">Hours</th>
                  <th class="py-3 px-4 min-w-[130px]">Workload Share</th>
                  <th class="py-3 px-4">Schedule Window</th>
                  <th class="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#f0ece4]">
                ${tableRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    let html = `
      <div class="space-y-5">
        <!-- Dashboard Header & Scope Switcher -->
        <div class="panel-3d rounded-2xl p-5 bg-white space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] text-[#3b6347] border border-[#cde0d3] flex items-center justify-center font-bold shrink-0">
                <span class="material-symbols-outlined text-[24px]">co_present</span>
              </div>
              <div>
                <div class="flex items-center gap-2 flex-wrap">
                  <h2 class="font-headline font-bold text-xl text-[#2c332d]">Faculty-Wise Class Highlights</h2>
                  <span class="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3] badge-3d">
                    ${this.getActiveBatch()?.name || 'All Batches'}
                  </span>
                </div>
                <p class="text-xs text-[#68736a] mt-0.5">
                  Consolidated faculty workload &amp; schedule distribution overview
                </p>
              </div>
            </div>

            <!-- Right Controls: Period Indicator, < Today > Navigation, and Week/Month Switcher -->
            <div class="flex items-center gap-2.5 sm:gap-3 flex-wrap ml-auto">
              <!-- Period Display Badge -->
              <span class="text-xs font-bold text-[#2c332d] px-3 py-1.5 rounded-xl bg-[#f7f4ed] border border-[#ded5c6] flex items-center gap-1.5 shadow-2xs select-none">
                <span class="material-symbols-outlined text-[16px] text-[#4a7c59]">calendar_today</span>
                <span id="dashPeriodTitleDisplay">${periodText}</span>
              </span>

              <!-- Date Navigation (< Today >) -->
              <div class="track-3d flex items-center rounded-xl overflow-hidden shadow-2xs">
                <button id="dashPrevPeriodBtn" type="button" class="w-8 h-8 flex items-center justify-center text-[#68736a] hover:text-[#2c332d] hover:bg-[#ede7db] transition-colors cursor-pointer" title="Previous ${this.dashboardScope === 'day' ? 'Day' : (this.dashboardScope === 'week' ? 'Week' : 'Month')}">
                  <span class="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <button id="dashTodayPeriodBtn" type="button" class="px-3 py-1 text-xs font-bold text-[#2c332d] hover:bg-[#ede7db] border-x border-[#ded5c6] transition-colors cursor-pointer" title="Jump to Current Academic Reference">Today</button>
                <button id="dashNextPeriodBtn" type="button" class="w-8 h-8 flex items-center justify-center text-[#68736a] hover:text-[#2c332d] hover:bg-[#ede7db] transition-colors cursor-pointer" title="Next ${this.dashboardScope === 'day' ? 'Day' : (this.dashboardScope === 'week' ? 'Week' : 'Month')}">
                  <span class="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>

              <!-- Scope Switcher Track (Month / Week / Day) -->
              <div class="track-3d flex items-center p-1 rounded-xl text-xs font-bold shadow-2xs">
                <button id="dashScopeMonthBtn" type="button" class="px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer border-none ${this.dashboardScope === 'month' ? 'btn-3d-primary font-bold text-white' : 'text-[#576058] hover:text-[#2c332d] bg-transparent'}" title="Switch to Month View">Month</button>
                <button id="dashScopeWeekBtn" type="button" class="px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer border-none ${this.dashboardScope === 'week' ? 'btn-3d-primary font-bold text-white' : 'text-[#576058] hover:text-[#2c332d] bg-transparent'}" title="Switch to Week View">Week</button>
                <button id="dashScopeDayBtn" type="button" class="px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer border-none ${this.dashboardScope === 'day' ? 'btn-3d-primary font-bold text-white' : 'text-[#576058] hover:text-[#2c332d] bg-transparent'}" title="Switch to Day View">Day</button>
              </div>
            </div>
          </div>

          <!-- KPI Summary Strip -->
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 border-t border-[#f0ece4] text-xs">
            <div class="p-2.5 rounded-xl bg-[#f7f4ed] border border-[#ded5c6]">
              <span class="text-[10px] uppercase font-bold text-[#68736a] block">Classes</span>
              <strong class="font-headline text-lg text-[#2c332d]">${filtered.length}</strong>
            </div>
            <div class="p-2.5 rounded-xl bg-[#eef4f0] border border-[#cde0d3]">
              <span class="text-[10px] uppercase font-bold text-[#3b6347] block">Active Faculty</span>
              <strong class="font-headline text-lg text-[#2d4d37]">${facultyList.length}</strong>
            </div>
            <div class="p-2.5 rounded-xl bg-[#fbf3ec] border border-[#eed9cc]">
              <span class="text-[10px] uppercase font-bold text-[#c26d3e] block">Total Hours</span>
              <strong class="font-headline text-lg text-[#9c4c23]">${totalComputedHours} hrs</strong>
            </div>
            <div class="p-2.5 rounded-xl bg-[#f7f4ed] border border-[#ded5c6]">
              <span class="text-[10px] uppercase font-bold text-[#68736a] block">Filter Scope</span>
              <strong class="font-headline text-xs text-[#2c332d] truncate block">${periodText}</strong>
            </div>
          </div>
        </div>

        ${filtered.length > 0 ? `
        <!-- Graphical & Donut Quick Glance Visualizations -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <!-- Card 1: Curriculum Subject Share Donut -->
          <div class="panel-3d rounded-2xl p-4 sm:p-5 bg-white flex flex-col justify-between space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-[#f0ece4]">
              <div>
                <h3 class="font-headline font-bold text-sm text-[#2c332d] flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[18px] text-[#4a7c59]">donut_large</span>
                  Discipline Share
                </h3>
                <p class="text-[11px] text-[#68736a] mt-0.5">Teaching hours by specialty</p>
              </div>
              <span class="text-[10px] font-bold text-[#4a7c59] bg-[#eef4f0] px-2 py-0.5 rounded border border-[#cde0d3]">
                ${subjectList.length} Subjects
              </span>
            </div>

            <!-- Donut Visual + Legend Container -->
            <div class="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center gap-4 py-1">
              <!-- SVG Donut Chart -->
              <div class="relative flex items-center justify-center shrink-0">
                <svg viewBox="0 0 140 140" class="w-32 h-32 sm:w-34 sm:h-34 drop-shadow-xs">
                  <circle cx="70" cy="70" r="${radius}" fill="transparent" stroke="#ede7da" stroke-width="16" />
                  ${donutSlicesHtml}
                  <text x="70" y="65" text-anchor="middle" class="font-headline font-bold text-xl fill-[#2c332d]" id="donutCenterVal">${totalComputedHours}h</text>
                  <text x="70" y="80" text-anchor="middle" class="text-[9.5px] font-bold fill-[#68736a] uppercase tracking-wider" id="donutCenterLabel">Curriculum</text>
                  <text x="70" y="93" text-anchor="middle" class="text-[8.5px] font-bold fill-[#4a7c59]" id="donutCenterSub">${filtered.length} Classes</text>
                </svg>
              </div>

              <!-- Interactive Legend -->
              <div class="flex-1 w-full max-h-36 overflow-y-auto space-y-0.5 pr-1">
                ${donutLegendHtml}
              </div>
            </div>
          </div>

          <!-- Card 2: Day-of-Week Schedule Rhythm Bar Graph -->
          <div class="panel-3d rounded-2xl p-4 sm:p-5 bg-white flex flex-col justify-between space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-[#f0ece4]">
              <div>
                <h3 class="font-headline font-bold text-sm text-[#2c332d] flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[18px] text-[#c26d3e]">equalizer</span>
                  Schedule Rhythm
                </h3>
                <p class="text-[11px] text-[#68736a] mt-0.5">Session density across days</p>
              </div>
              ${peakDay ? `
                <span class="text-[10px] font-bold text-[#c26d3e] bg-[#fbf3ec] px-2 py-0.5 rounded border border-[#eed9cc] flex items-center gap-1">
                  <span>Peak: ${peakDay}</span>
                </span>
              ` : ''}
            </div>

            <!-- Vertical Bar Chart -->
            <div class="pt-2 pb-1">
              <div class="flex items-end justify-between gap-1.5 h-32 px-1">
                ${barChartHtml}
              </div>
            </div>

            <div class="pt-2 border-t border-[#f0ece4] flex items-center justify-between text-[10.5px] text-[#68736a]">
              <span>Active Teaching Days: <strong>${dayOrder.filter(d => dayStats[d].count > 0).length} of 7</strong></span>
              <span>Daily Avg: <strong>${(filtered.length / 7).toFixed(1)} sessions</strong></span>
            </div>
          </div>

          <!-- Card 3: Platform Delivery & Cohort Balance -->
          <div class="panel-3d rounded-2xl p-4 sm:p-5 bg-white flex flex-col justify-between space-y-3">
            <div class="flex items-center justify-between pb-2 border-b border-[#f0ece4]">
              <div>
                <h3 class="font-headline font-bold text-sm text-[#2c332d] flex items-center gap-1.5">
                  <span class="material-symbols-outlined text-[18px] text-[#7c52aa]">hub</span>
                  Delivery Modality
                </h3>
                <p class="text-[11px] text-[#68736a] mt-0.5">Interactive App vs YouTube Series</p>
              </div>
              <span class="text-[10px] font-bold text-[#7c52aa] bg-[#eedcff] px-2 py-0.5 rounded border border-[#dcc8e0]">
                ${avgSessionHours}h avg / cls
              </span>
            </div>

            <!-- Modality Dual-Arc Donut & Stats -->
            <div class="flex items-center gap-3.5 py-1">
              <div class="relative shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 110 110" class="w-24 h-24 drop-shadow-xs">
                  <circle cx="55" cy="55" r="${platformRadius}" fill="transparent" stroke="#ede7da" stroke-width="12" />
                  <!-- App Arc -->
                  <circle
                    cx="55" cy="55" r="${platformRadius}"
                    fill="transparent"
                    stroke="#4a7c59"
                    stroke-width="12"
                    stroke-dasharray="${appDash.toFixed(2)} ${(platformCircumference - appDash).toFixed(2)}"
                    stroke-dashoffset="0"
                    transform="rotate(-90 55 55)"
                    class="platform-slice transition-all duration-200 cursor-pointer"
                    data-platform="PW MedEd App"
                    data-hours="${appHours}"
                    data-count="${appClassesCount}"
                    data-pct="${appPct}"
                  />
                  <!-- YouTube Arc -->
                  <circle
                    cx="55" cy="55" r="${platformRadius}"
                    fill="transparent"
                    stroke="#e02828"
                    stroke-width="12"
                    stroke-dasharray="${ytDash.toFixed(2)} ${(platformCircumference - ytDash).toFixed(2)}"
                    stroke-dashoffset="${(-appDash).toFixed(2)}"
                    transform="rotate(-90 55 55)"
                    class="platform-slice transition-all duration-200 cursor-pointer"
                    data-platform="YouTube Series"
                    data-hours="${ytHours}"
                    data-count="${ytClassesCount}"
                    data-pct="${ytPct}"
                  />
                  <text x="55" y="52" text-anchor="middle" class="font-headline font-bold text-base fill-[#2c332d]" id="platformCenterVal">${appPct}%</text>
                  <text x="55" y="65" text-anchor="middle" class="text-[8px] font-bold fill-[#4a7c59] uppercase tracking-wider" id="platformCenterLabel">App Live</text>
                </svg>
              </div>

              <!-- Modality Indicators -->
              <div class="flex-1 space-y-2 text-xs">
                <div class="p-2 rounded-xl bg-[#eef4f0] border border-[#cde0d3] flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <span class="material-symbols-outlined text-[15px] text-[#4a7c59]">smartphone</span>
                    <span class="font-bold text-[#2d4d37] text-[11px]">PW MedEd App</span>
                  </div>
                  <div class="text-right">
                    <span class="font-headline font-bold text-xs text-[#2d4d37]">${appClassesCount} cls</span>
                    <span class="text-[9.5px] text-[#4a7c59] block">${appHours} hrs</span>
                  </div>
                </div>

                <div class="p-2 rounded-xl bg-[#fdf2f2] border border-[#f8c8c8] flex items-center justify-between">
                  <div class="flex items-center gap-1.5">
                    <svg class="w-3.5 h-3.5 fill-[#e02828] shrink-0" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                    <span class="font-bold text-[#9e1c1c] text-[11px]">YouTube Live</span>
                  </div>
                  <div class="text-right">
                    <span class="font-headline font-bold text-xs text-[#9e1c1c]">${ytClassesCount} cls</span>
                    <span class="text-[9.5px] text-[#e02828] block">${ytHours} hrs</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Batch-Level Lecture View (Day-Wise, Weekly, Monthly) -->
        <div id="batchLectureGraphCard">
          ${this.buildBatchLectureGraphHtml()}
        </div>

        <!-- Unified Faculty Overview Section -->
        <div class="panel-3d rounded-2xl p-5 bg-white space-y-4">
          <div class="flex items-center justify-between pb-3 border-b border-[#e5dfd5]">
            <div>
              <h3 class="font-headline font-bold text-base text-[#2c332d]">Faculty Distribution &amp; Schedule Highlights</h3>
              <p class="text-xs text-[#68736a] mt-0.5">Unified overview across all teaching departments</p>
            </div>
            <span class="text-xs font-bold text-[#3b6347] bg-[#eef4f0] px-2.5 py-0.5 rounded-lg border border-[#cde0d3]">
              ${facultyList.length} Active Faculty
            </span>
          </div>

          ${overviewContentHtml}
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach Batch Lecture Graph Listeners
    this.attachBatchLectureGraphListeners(container);

    // Attach Scope Filter Click Listeners (Month / Week / Day)
    container.querySelector('#dashScopeMonthBtn')?.addEventListener('click', () => {
      this.dashboardScope = 'month';
      this.facultyHighlightScope = 'month';
      this.batchGraphGranularity = 'month';
      this.renderFacultyHighlightsCard();
      this.renderDashboardView();
    });

    container.querySelector('#dashScopeWeekBtn')?.addEventListener('click', () => {
      this.dashboardScope = 'week';
      this.facultyHighlightScope = 'week';
      this.batchGraphGranularity = 'week';
      this.renderFacultyHighlightsCard();
      this.renderDashboardView();
    });

    container.querySelector('#dashScopeDayBtn')?.addEventListener('click', () => {
      this.dashboardScope = 'day';
      this.facultyHighlightScope = 'day';
      this.batchGraphGranularity = 'day';
      this.renderFacultyHighlightsCard();
      this.renderDashboardView();
    });

    // Attach Period Navigation (< Today >) Click Listeners
    container.querySelector('#dashPrevPeriodBtn')?.addEventListener('click', () => {
      if (this.dashboardScope === 'month') {
        this.dashboardMonth--;
        if (this.dashboardMonth < 0) {
          this.dashboardMonth = 11;
          this.dashboardYear--;
        }
      } else if (this.dashboardScope === 'week') {
        this.dashboardWeekStart = new Date(this.dashboardWeekStart.getTime() - (7 * 24 * 60 * 60 * 1000));
      } else if (this.dashboardScope === 'day') {
        const d = parseIso(this.dashboardDayIso) || new Date();
        d.setDate(d.getDate() - 1);
        this.dashboardDayIso = toLocalIso(d);
      }
      this.renderDashboardView();
    });

    container.querySelector('#dashNextPeriodBtn')?.addEventListener('click', () => {
      if (this.dashboardScope === 'month') {
        this.dashboardMonth++;
        if (this.dashboardMonth > 11) {
          this.dashboardMonth = 0;
          this.dashboardYear++;
        }
      } else if (this.dashboardScope === 'week') {
        this.dashboardWeekStart = new Date(this.dashboardWeekStart.getTime() + (7 * 24 * 60 * 60 * 1000));
      } else if (this.dashboardScope === 'day') {
        const d = parseIso(this.dashboardDayIso) || new Date();
        d.setDate(d.getDate() + 1);
        this.dashboardDayIso = toLocalIso(d);
      }
      this.renderDashboardView();
    });

    container.querySelector('#dashTodayPeriodBtn')?.addEventListener('click', () => {
      const now = new Date();
      this.dashboardYear = now.getFullYear();
      this.dashboardMonth = now.getMonth();
      this.dashboardWeekStart = startOfWeek(now);
      this.dashboardDayIso = todayIso();
      this.currentYear = now.getFullYear();
      this.currentMonth = now.getMonth();
      this.currentWeekStart = startOfWeek(now);
      this.selectedDayIso = todayIso();
      this.renderFacultyHighlightsCard();
      this.renderDashboardView();
      this.showToast(`Navigated to Today (${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`);
    });

    // Donut hover interaction
    const centerValEl = container.querySelector('#donutCenterVal');
    const centerLabelEl = container.querySelector('#donutCenterLabel');
    const centerSubEl = container.querySelector('#donutCenterSub');
    const allSlices = container.querySelectorAll('.donut-slice');

    container.querySelectorAll('.donut-slice, .donut-legend-item').forEach(el => {
      el.addEventListener('mouseenter', () => {
        const subName = el.getAttribute('data-subject');
        const subHours = el.getAttribute('data-hours');
        const subCount = el.getAttribute('data-count');
        const subPct = el.getAttribute('data-pct');

        if (centerValEl) centerValEl.textContent = `${subHours}h`;
        if (centerLabelEl) centerLabelEl.textContent = subName;
        if (centerSubEl) centerSubEl.textContent = `${subCount} cls (${subPct}%)`;

        allSlices.forEach(s => {
          if (s.getAttribute('data-subject') === subName) {
            s.style.opacity = '1';
            s.style.strokeWidth = '19';
          } else {
            s.style.opacity = '0.35';
            s.style.strokeWidth = '15';
          }
        });
      });

      el.addEventListener('mouseleave', () => {
        if (centerValEl) centerValEl.textContent = `${totalComputedHours}h`;
        if (centerLabelEl) centerLabelEl.textContent = 'Curriculum';
        if (centerSubEl) centerSubEl.textContent = `${filtered.length} Classes`;

        allSlices.forEach(s => {
          s.style.opacity = '1';
          s.style.strokeWidth = '16';
        });
      });
    });

    // Platform Donut hover interaction
    const centerPlatformValEl = container.querySelector('#platformCenterVal');
    const centerPlatformLabelEl = container.querySelector('#platformCenterLabel');
    const allPlatformSlices = container.querySelectorAll('.platform-slice');

    container.querySelectorAll('.platform-slice').forEach(el => {
      el.addEventListener('mouseenter', () => {
        const pName = el.getAttribute('data-platform');
        const pPct = el.getAttribute('data-pct');

        if (centerPlatformValEl) centerPlatformValEl.textContent = `${pPct}%`;
        if (centerPlatformLabelEl) centerPlatformLabelEl.textContent = pName.includes('App') ? 'App Live' : 'YouTube';

        allPlatformSlices.forEach(s => {
          if (s.getAttribute('data-platform') === pName) {
            s.style.opacity = '1';
            s.style.strokeWidth = '14';
          } else {
            s.style.opacity = '0.35';
            s.style.strokeWidth = '10';
          }
        });
      });

      el.addEventListener('mouseleave', () => {
        if (centerPlatformValEl) centerPlatformValEl.textContent = `${appPct}%`;
        if (centerPlatformLabelEl) centerPlatformLabelEl.textContent = 'App Live';

        allPlatformSlices.forEach(s => {
          s.style.opacity = '1';
          s.style.strokeWidth = '12';
        });
      });
    });

    // Row & Detail Button Click Listeners -> open detailed schedule in modal
    container.querySelectorAll('.btn-faculty-overview-detail, .faculty-overview-row').forEach(el => {
      el.addEventListener('click', (e) => {
        const facName = el.getAttribute('data-faculty');
        if (facName) {
          this.openFacultyHighlightsModal(facName);
        }
      });
    });
  }

  // --- 9b. Batch-Level Lecture Volume & Schedule Trajectory Graph ---
  buildBatchLectureGraphHtml() {
    const allEvents = this.batchManager.getAllEvents('all');
    const classes = allEvents.filter(e => e.eventType === 'class' && e.isoDate);

    const BATCH_CONFIG = {
      'batch-prarambh-2026': {
        id: 'batch-prarambh-2026',
        shortName: "Prarambh '26",
        fullName: 'Prarambh 2026 (MBBS 1st Year)',
        hex: '#3b6347',
        gradient: 'from-[#2d4d37] to-[#4a7c59]',
        lightBg: 'bg-[#eef4f0]',
        textColor: 'text-[#3b6347]',
        borderColor: 'border-[#cde0d3]',
        badgeBg: 'bg-[#eef4f0]',
        badgeText: 'text-[#3b6347]',
        badgeBorder: 'border-[#cde0d3]'
      },
      'batch-sushruta-2026': {
        id: 'batch-sushruta-2026',
        shortName: "Sushruta '26",
        fullName: 'Sushruta 2026 (MBBS 3rd Year)',
        hex: '#c26d3e',
        gradient: 'from-[#a15124] to-[#c26d3e]',
        lightBg: 'bg-[#fbf3ec]',
        textColor: 'text-[#c26d3e]',
        borderColor: 'border-[#eed9cc]',
        badgeBg: 'bg-[#fbf3ec]',
        badgeText: 'text-[#c26d3e]',
        badgeBorder: 'border-[#eed9cc]'
      },
      'batch-inicet-essentials-2026': {
        id: 'batch-inicet-essentials-2026',
        shortName: "INI-CET '26",
        fullName: 'INI-CET Essentials Series',
        hex: '#6b3ba7',
        gradient: 'from-[#542d87] to-[#7c52aa]',
        lightBg: 'bg-[#f3eef8]',
        textColor: 'text-[#6b3ba7]',
        borderColor: 'border-[#dfd0f0]',
        badgeBg: 'bg-[#f3eef8]',
        badgeText: 'text-[#6b3ba7]',
        badgeBorder: 'border-[#dfd0f0]'
      },
      'batch-fmge-express-2026': {
        id: 'batch-fmge-express-2026',
        shortName: "FMGE '26",
        fullName: 'FMGE Express Revision Series',
        hex: '#1c6e8c',
        gradient: 'from-[#145269] to-[#0096cc]',
        lightBg: 'bg-[#eaf4f8]',
        textColor: 'text-[#1c6e8c]',
        borderColor: 'border-[#c8e2ec]',
        badgeBg: 'bg-[#eaf4f8]',
        badgeText: 'text-[#1c6e8c]',
        badgeBorder: 'border-[#c8e2ec]'
      }
    };

    const BATCH_ORDER = [
      'batch-prarambh-2026',
      'batch-sushruta-2026',
      'batch-inicet-essentials-2026',
      'batch-fmge-express-2026'
    ];

    const resolveBatchKey = (c) => {
      if (c.batchId && BATCH_CONFIG[c.batchId]) return c.batchId;
      const name = (c.batchName || '').toLowerCase();
      if (name.includes('prarambh')) return 'batch-prarambh-2026';
      if (name.includes('sushruta')) return 'batch-sushruta-2026';
      if (name.includes('ini-cet') || name.includes('inicet')) return 'batch-inicet-essentials-2026';
      if (name.includes('fmge')) return 'batch-fmge-express-2026';
      return 'batch-prarambh-2026';
    };

    const parseHours = (dur) => {
      const m = (dur || '').match(/(\d+(?:\.\d+)?)/);
      return m ? parseFloat(m[1]) : 2;
    };

    // Calculate totals per cohort across all curriculum classes
    const cohortStats = {};
    BATCH_ORDER.forEach(bId => {
      cohortStats[bId] = { id: bId, count: 0, hours: 0 };
    });
    classes.forEach(c => {
      const bKey = resolveBatchKey(c);
      const hrs = parseHours(c.duration);
      if (cohortStats[bKey]) {
        cohortStats[bKey].count++;
        cohortStats[bKey].hours += hrs;
      }
    });

    const granularity = this.batchGraphGranularity || 'month'; // 'day' | 'week' | 'month'
    const cohortFilter = this.batchGraphCohort || 'all';

    const filteredClasses = classes.filter(c => {
      if (cohortFilter !== 'all' && resolveBatchKey(c) !== cohortFilter) return false;
      return true;
    });

    let totalFilteredHours = 0;
    filteredClasses.forEach(c => {
      totalFilteredHours += parseHours(c.duration);
    });

    let activeDayMonth = this.batchGraphDayMonth;
    if (!activeDayMonth || activeDayMonth === 'all') {
      const dashYm = `${this.dashboardYear || 2026}-${String((this.dashboardMonth !== undefined ? this.dashboardMonth : 8) + 1).padStart(2, '0')}`;
      activeDayMonth = ['2026-09', '2026-10', '2026-11'].includes(dashYm) ? dashYm : '2026-09';
      this.batchGraphDayMonth = activeDayMonth;
    }

    let chartHtml = '';
    let inspectorHtml = '';
    let peakBadgeText = '';

    // ==========================================
    // 1. MONTHLY VIEW
    // ==========================================
    if (granularity === 'month') {
      const months = {
        '2026-09': { key: '2026-09', name: 'September 2026', shortName: 'Sep 2026', phase: 'Foundation & Rapid Recall', total: 0, hours: 0, batches: {}, classes: [] },
        '2026-10': { key: '2026-10', name: 'October 2026', shortName: 'Oct 2026', phase: 'Peak Multi-Cohort Synergy', total: 0, hours: 0, batches: {}, classes: [] },
        '2026-11': { key: '2026-11', name: 'November 2026', shortName: 'Nov 2026', phase: 'Clinical Intensive & Prelims', total: 0, hours: 0, batches: {}, classes: [] }
      };

      filteredClasses.forEach(c => {
        const ym = c.isoDate.slice(0, 7);
        if (months[ym]) {
          const bKey = resolveBatchKey(c);
          const hrs = parseHours(c.duration);
          months[ym].total++;
          months[ym].hours += hrs;
          if (!months[ym].batches[bKey]) months[ym].batches[bKey] = { count: 0, hours: 0, classes: [] };
          months[ym].batches[bKey].count++;
          months[ym].batches[bKey].hours += hrs;
          months[ym].batches[bKey].classes.push(c);
          months[ym].classes.push(c);
        }
      });

      const maxMonthClasses = Math.max(1, ...Object.values(months).map(m => m.total));
      const peakMonthKey = Object.keys(months).reduce((a, b) => months[a].total >= months[b].total ? a : b);
      peakBadgeText = `Peak Month: ${months[peakMonthKey].shortName} (${months[peakMonthKey].total} cls)`;

      const selectedMonthKey = this.batchGraphSelectedKey && months[this.batchGraphSelectedKey]
        ? this.batchGraphSelectedKey
        : peakMonthKey;

      const monthCardsHtml = Object.values(months).map(m => {
        const isSelected = m.key === selectedMonthKey;
        const isPeak = m.key === peakMonthKey;
        const barHeightPct = m.total > 0 ? Math.max(20, Math.round((m.total / maxMonthClasses) * 100)) : 10;

        // Build stacked segments inside the bar
        const segmentsHtml = BATCH_ORDER.map(bId => {
          const bData = m.batches[bId];
          if (!bData || bData.count === 0) return '';
          const cfg = BATCH_CONFIG[bId];
          const segPct = ((bData.count / (m.total || 1)) * 100).toFixed(1);
          return `
            <div
              class="w-full transition-all duration-300 relative group cursor-pointer"
              style="height: ${segPct}%; background-color: ${cfg.hex};"
              title="${cfg.shortName}: ${bData.count} classes • ${bData.hours} hours (${segPct}%)"
            ></div>
          `;
        }).join('');

        // Breakdown chips for this month
        const batchChipsHtml = BATCH_ORDER.map(bId => {
          const bData = m.batches[bId];
          if (!bData || bData.count === 0) return '';
          const cfg = BATCH_CONFIG[bId];
          return `
            <div class="flex items-center justify-between gap-1.5 py-1 px-2 rounded-lg ${cfg.lightBg} border ${cfg.borderColor} text-[10.5px]">
              <div class="flex items-center gap-1.5 truncate">
                <span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${cfg.hex};"></span>
                <span class="font-bold ${cfg.textColor} truncate">${cfg.shortName}</span>
              </div>
              <span class="font-bold text-[#2c332d] shrink-0">${bData.count} cls <span class="font-normal text-[#68736a]">(${bData.hours}h)</span></span>
            </div>
          `;
        }).join('');

        return `
          <div
            class="flex-1 rounded-2xl p-4 transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 batch-graph-month-item ${
              isSelected
                ? 'bg-gradient-to-b from-[#fbf9f5] to-[#f4efe6] border-2 border-[#3b6347] shadow-sm ring-2 ring-[#3b6347]/10'
                : 'bg-[#faf7f2] border border-[#ded5c6] hover:border-[#c5bcac] hover:bg-white'
            }"
            data-graph-item-key="${m.key}"
          >
            <div class="flex items-center justify-between gap-2">
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="font-headline font-bold text-sm text-[#2c332d]">${m.name}</h4>
                  ${isPeak ? `
                    <span class="px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3]">
                      PEAK
                    </span>
                  ` : ''}
                </div>
                <p class="text-[10px] text-[#788279] mt-0.5">${m.phase}</p>
              </div>
              <div class="text-right">
                <span class="font-headline font-bold text-base text-[#2c332d] block">${m.total}</span>
                <span class="text-[9.5px] text-[#68736a] block">${m.hours} hrs</span>
              </div>
            </div>

            <!-- Vertical Stacked Bar Chart for Month -->
            <div class="h-28 flex items-end justify-center py-1 bg-white/70 rounded-xl border border-[#ece5d8] px-3">
              <div class="w-14 rounded-t-xl overflow-hidden flex flex-col-reverse shadow-xs transition-all duration-300" style="height: ${barHeightPct}%;">
                ${segmentsHtml || `<div class="w-full h-full bg-[#ede7da]"></div>`}
              </div>
            </div>

            <!-- Cohort Breakdown List -->
            <div class="space-y-1 pt-1">
              ${batchChipsHtml || `<p class="text-[10px] text-center text-[#8b958c] py-2">No sessions for filtered batch</p>`}
            </div>
          </div>
        `;
      }).join('');

      chartHtml = `
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          ${monthCardsHtml}
        </div>
      `;

      // Inspector for selected month
      const activeMonth = months[selectedMonthKey] || months[peakMonthKey];
      const monthFaculties = [...new Set(activeMonth.classes.map(c => c.faculty).filter(Boolean))];

      inspectorHtml = `
        <div class="p-3.5 rounded-xl bg-[#f7f4ed] border border-[#ded5c6] space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px] text-[#3b6347]">calendar_month</span>
              <strong class="text-xs font-bold text-[#2c332d]">${activeMonth.name} Deep Dive</strong>
              <span class="text-[10.5px] text-[#68736a]">• ${activeMonth.total} Lectures scheduled (${activeMonth.hours} Teaching Hours)</span>
            </div>
            <span class="text-[10.5px] font-bold text-[#3b6347] bg-[#eef4f0] px-2 py-0.5 rounded border border-[#cde0d3]">
              ${monthFaculties.length} Distinct Faculty Members
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            ${BATCH_ORDER.map(bId => {
              const cfg = BATCH_CONFIG[bId];
              const bData = activeMonth.batches[bId] || { count: 0, hours: 0, classes: [] };
              const pct = Math.round((bData.count / (activeMonth.total || 1)) * 100);
              return `
                <div class="p-2 rounded-lg bg-white border ${cfg.borderColor} flex items-center justify-between">
                  <div>
                    <span class="block font-bold text-[11px] ${cfg.textColor}">${cfg.shortName}</span>
                    <span class="block text-[10px] text-[#788279]">${bData.hours} teaching hrs</span>
                  </div>
                  <div class="text-right">
                    <span class="font-headline font-bold text-xs text-[#2c332d]">${bData.count} cls</span>
                    <span class="block text-[9px] font-semibold text-[#8b958c]">${pct}% share</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // ==========================================
    // 2. WEEKLY VIEW
    // ==========================================
    else if (granularity === 'week') {
      const weeks = {};
      const getWeekInfo = (isoDate) => {
        const d = new Date(isoDate + 'T00:00:00');
        const day = d.getDay();
        const sun = new Date(d);
        sun.setDate(d.getDate() - day);
        const sat = new Date(sun);
        sat.setDate(sun.getDate() + 6);
        const firstJan = new Date(d.getFullYear(), 0, 1);
        const weekNum = Math.ceil((((d - firstJan) / 86400000) + firstJan.getDay() + 1) / 7);
        const wkKey = toLocalIso(sun);
        return {
          key: wkKey,
          label: `W${weekNum}`,
          dateRange: `${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sat.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          shortRange: `${sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        };
      };

      filteredClasses.forEach(c => {
        const wInfo = getWeekInfo(c.isoDate);
        if (!weeks[wInfo.key]) {
          weeks[wInfo.key] = {
            key: wInfo.key,
            label: wInfo.label,
            dateRange: wInfo.dateRange,
            shortRange: wInfo.shortRange,
            total: 0,
            hours: 0,
            batches: {},
            classes: []
          };
        }
        const bKey = resolveBatchKey(c);
        const hrs = parseHours(c.duration);
        weeks[wInfo.key].total++;
        weeks[wInfo.key].hours += hrs;
        if (!weeks[wInfo.key].batches[bKey]) weeks[wInfo.key].batches[bKey] = { count: 0, hours: 0 };
        weeks[wInfo.key].batches[bKey].count++;
        weeks[wInfo.key].batches[bKey].hours += hrs;
        weeks[wInfo.key].classes.push(c);
      });

      const sortedWeekKeys = Object.keys(weeks).sort();
      const maxWeekClasses = Math.max(1, ...Object.values(weeks).map(w => w.total));
      const peakWeekKey = sortedWeekKeys.find(k => weeks[k].total === maxWeekClasses) || sortedWeekKeys[0];
      peakBadgeText = `Peak Week: ${weeks[peakWeekKey]?.label || 'W42'} (${maxWeekClasses} cls)`;

      const selectedWeekKey = this.batchGraphSelectedKey && weeks[this.batchGraphSelectedKey]
        ? this.batchGraphSelectedKey
        : peakWeekKey;

      const weeklyBarsHtml = sortedWeekKeys.map(k => {
        const w = weeks[k];
        const isSelected = w.key === selectedWeekKey;
        const isPeak = w.total === maxWeekClasses;
        const barHeightPct = Math.max(14, Math.round((w.total / maxWeekClasses) * 100));

        const segmentsHtml = BATCH_ORDER.map(bId => {
          const bData = w.batches[bId];
          if (!bData || bData.count === 0) return '';
          const cfg = BATCH_CONFIG[bId];
          const segPct = ((bData.count / (w.total || 1)) * 100).toFixed(1);
          return `
            <div
              class="w-full transition-all duration-200 cursor-pointer"
              style="height: ${segPct}%; background-color: ${cfg.hex};"
              title="${cfg.shortName}: ${bData.count} cls (${bData.hours}h)"
            ></div>
          `;
        }).join('');

        return `
          <div
            class="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer batch-graph-week-item"
            data-graph-item-key="${w.key}"
          >
            <span class="text-[10px] font-bold ${isSelected ? 'text-[#3b6347]' : isPeak ? 'text-[#c26d3e]' : 'text-[#68736a]'}">
              ${w.total}
            </span>

            <div class="w-full flex-1 flex items-end justify-center">
              <div
                class="w-full max-w-[28px] rounded-t-lg overflow-hidden flex flex-col-reverse transition-all duration-300 group-hover:scale-105 ${
                  isSelected ? 'ring-2 ring-[#3b6347] shadow-md' : 'shadow-2xs'
                }"
                style="height: ${barHeightPct}%;"
              >
                ${segmentsHtml}
              </div>
            </div>

            <div class="text-center pt-0.5">
              <span class="block text-[10.5px] font-bold ${isSelected ? 'text-[#3b6347]' : 'text-[#2c332d]'}">${w.label}</span>
              <span class="block text-[8.5px] text-[#8b958c] truncate">${w.shortRange}</span>
            </div>
          </div>
        `;
      }).join('');

      chartHtml = `
        <div class="p-3 bg-[#faf7f2] rounded-2xl border border-[#ded5c6] space-y-2">
          <div class="flex items-center justify-between text-[10.5px] text-[#788279] px-2">
            <span>Calendar Timeline: W36 to W48 (13 Active Curriculum Weeks)</span>
            <span class="flex items-center gap-1 font-bold text-[#3b6347]">
              <span class="material-symbols-outlined text-[13px]">touch_app</span>
              Click any week to inspect batch breakdown
            </span>
          </div>

          <div class="h-40 flex items-end justify-between gap-1 sm:gap-2 px-1 pt-4 pb-1 border-b border-[#e5dfd5]">
            ${weeklyBarsHtml}
          </div>
        </div>
      `;

      // Inspector for selected week
      const activeWeek = weeks[selectedWeekKey] || weeks[peakWeekKey];
      const activeWeekFaculties = [...new Set(activeWeek.classes.map(c => c.faculty).filter(Boolean))];

      inspectorHtml = `
        <div class="p-3.5 rounded-xl bg-[#f7f4ed] border border-[#ded5c6] space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px] text-[#3b6347]">view_week</span>
              <strong class="text-xs font-bold text-[#2c332d]">${activeWeek.label} (${activeWeek.dateRange})</strong>
              <span class="text-[10.5px] text-[#68736a]">• ${activeWeek.total} Classes scheduled (${activeWeek.hours} Teaching Hours)</span>
            </div>
            <span class="text-[10.5px] font-bold text-[#3b6347] bg-[#eef4f0] px-2 py-0.5 rounded border border-[#cde0d3]">
              ${activeWeekFaculties.length} Active Faculty
            </span>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            ${BATCH_ORDER.map(bId => {
              const cfg = BATCH_CONFIG[bId];
              const bData = activeWeek.batches[bId] || { count: 0, hours: 0 };
              const pct = Math.round((bData.count / (activeWeek.total || 1)) * 100);
              return `
                <div class="p-2 rounded-lg bg-white border ${cfg.borderColor} flex items-center justify-between">
                  <div>
                    <span class="block font-bold text-[11px] ${cfg.textColor}">${cfg.shortName}</span>
                    <span class="block text-[10px] text-[#788279]">${bData.hours} teaching hrs</span>
                  </div>
                  <div class="text-right">
                    <span class="font-headline font-bold text-xs text-[#2c332d]">${bData.count} cls</span>
                    <span class="block text-[9px] font-semibold text-[#8b958c]">${pct}% share</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // ==========================================
    // 3. DAY-WISE VIEW
    // ==========================================
    else {
      const days = {};
      filteredClasses.forEach(c => {
        const dt = c.isoDate;
        const ym = dt.slice(0, 7);
        if (activeDayMonth !== 'all' && ym !== activeDayMonth) return;

        if (!days[dt]) {
          const d = new Date(dt + 'T00:00:00');
          days[dt] = {
            key: dt,
            dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            formattedDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            dayNum: d.getDate(),
            monthKey: ym,
            total: 0,
            hours: 0,
            batches: {},
            classes: []
          };
        }
        const bKey = resolveBatchKey(c);
        const hrs = parseHours(c.duration);
        days[dt].total++;
        days[dt].hours += hrs;
        if (!days[dt].batches[bKey]) days[dt].batches[bKey] = { count: 0, hours: 0 };
        days[dt].batches[bKey].count++;
        days[dt].batches[bKey].hours += hrs;
        days[dt].classes.push(c);
      });

      const sortedDayKeys = Object.keys(days).sort();
      const maxDayClasses = Math.max(1, ...Object.values(days).map(d => d.total));
      const peakDayKey = sortedDayKeys.find(k => days[k].total === maxDayClasses) || todayIso();
      peakBadgeText = `Peak Day: ${days[peakDayKey]?.formattedDate || 'Oct 15'} (${maxDayClasses} cls)`;

      const selectedDayKey = this.batchGraphSelectedKey && days[this.batchGraphSelectedKey]
        ? this.batchGraphSelectedKey
        : (days[todayIso()] ? todayIso() : peakDayKey);

      const dayBarsHtml = sortedDayKeys.map(k => {
        const d = days[k];
        const isSelected = d.key === selectedDayKey;
        const isPeak = d.total === maxDayClasses && d.total > 1;
        const barHeightPct = Math.max(20, Math.round((d.total / maxDayClasses) * 100));

        const segmentsHtml = BATCH_ORDER.map(bId => {
          const bData = d.batches[bId];
          if (!bData || bData.count === 0) return '';
          const cfg = BATCH_CONFIG[bId];
          const segPct = ((bData.count / (d.total || 1)) * 100).toFixed(1);
          return `
            <div
              class="w-full transition-all duration-200 cursor-pointer"
              style="height: ${segPct}%; background-color: ${cfg.hex};"
              title="${cfg.shortName}: ${bData.count} cls (${bData.hours}h)"
            ></div>
          `;
        }).join('');

        return `
          <div
            class="flex-1 min-w-[28px] max-w-[42px] flex flex-col items-center gap-1 group cursor-pointer batch-graph-day-item"
            data-graph-item-key="${d.key}"
          >
            <span class="text-[9.5px] font-bold ${isSelected ? 'text-[#3b6347]' : isPeak ? 'text-[#c26d3e]' : 'text-[#68736a]'}">
              ${d.total}
            </span>

            <div class="w-full flex-1 flex items-end justify-center">
              <div
                class="w-full max-w-[22px] rounded-t-md overflow-hidden flex flex-col-reverse transition-all duration-300 group-hover:scale-105 ${
                  isSelected ? 'ring-2 ring-[#3b6347] shadow-md' : 'shadow-2xs'
                }"
                style="height: ${barHeightPct}%;"
              >
                ${segmentsHtml}
              </div>
            </div>

            <div class="text-center pt-0.5">
              <span class="block text-[10px] font-bold ${isSelected ? 'text-[#3b6347]' : 'text-[#2c332d]'}">${d.dayNum}</span>
              <span class="block text-[8px] text-[#8b958c]">${d.dayName}</span>
            </div>
          </div>
        `;
      }).join('');

      chartHtml = `
        <div class="p-3 bg-[#faf7f2] rounded-2xl border border-[#ded5c6] space-y-2">
          <div class="flex items-center justify-between text-[10.5px] text-[#788279] px-2">
            <span>Day-Wise Cadence: ${sortedDayKeys.length} Active Teaching Days Scheduled</span>
            <span class="flex items-center gap-1 font-bold text-[#3b6347]">
              <span class="material-symbols-outlined text-[13px]">touch_app</span>
              Click any date to inspect scheduled sessions
            </span>
          </div>

          <div class="h-36 flex items-end justify-start gap-1 sm:gap-1.5 overflow-x-auto px-2 pt-4 pb-1 border-b border-[#e5dfd5]">
            ${dayBarsHtml || `<p class="py-8 text-center text-xs text-[#788279] w-full">No active days in this month range</p>`}
          </div>
        </div>
      `;

      // Inspector for selected day
      const activeDay = days[selectedDayKey] || days[peakDayKey] || { classes: [], formattedDate: 'Oct 15', total: 0, hours: 0 };

      const daySessionsHtml = (activeDay.classes || []).map(c => {
        const bKey = resolveBatchKey(c);
        const cfg = BATCH_CONFIG[bKey];
        const isYt = c.isYoutube || c.platform === 'youtube' || (c.batchName && /youtube|yt/i.test(c.batchName));

        return `
          <div class="p-2.5 rounded-xl bg-white border border-[#ded5c6] hover:border-[#3b6347] transition-all flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span class="px-2 py-0.5 rounded text-[10px] font-bold ${cfg.badgeBg} ${cfg.badgeText} border ${cfg.badgeBorder} shrink-0">
                ${cfg.shortName}
              </span>
              <div class="truncate">
                <strong class="text-xs font-bold text-[#2c332d] block truncate">${c.subject || 'Lecture'} • ${c.faculty || 'Faculty'}</strong>
                <span class="text-[10px] text-[#788279]">${c.time || '10:00 AM - 12:00 PM'} • ${c.duration || '2 hrs'}</span>
              </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0 text-xs">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isYt ? 'bg-[#fdf2f2] text-[#9e1c1c] border border-[#f8c8c8]' : 'bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3]'}">
                ${isYt ? 'YouTube Live' : 'PW MedEd App'}
              </span>
            </div>
          </div>
        `;
      }).join('');

      inspectorHtml = `
        <div class="p-3.5 rounded-xl bg-[#f7f4ed] border border-[#ded5c6] space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px] text-[#3b6347]">event_available</span>
              <strong class="text-xs font-bold text-[#2c332d]">${activeDay.dayName ? `${activeDay.dayName}, ` : ''}${activeDay.formattedDate || 'Selected Day'}</strong>
              <span class="text-[10.5px] text-[#68736a]">• ${activeDay.total || 0} Lectures scheduled (${activeDay.hours || 0} hrs)</span>
            </div>
            <span class="text-[10.5px] font-bold text-[#3b6347] bg-[#eef4f0] px-2 py-0.5 rounded border border-[#cde0d3]">
              ${Object.keys(activeDay.batches || {}).length} Cohorts Active Today
            </span>
          </div>

          <div class="space-y-1.5">
            ${daySessionsHtml || `<p class="text-xs text-[#788279] py-2">No lecture sessions scheduled on this date.</p>`}
          </div>
        </div>
      `;
    }

    // Cohort Legend HTML
    const legendHtml = BATCH_ORDER.map(bId => {
      const cfg = BATCH_CONFIG[bId];
      const stats = cohortStats[bId] || { count: 0, hours: 0 };
      const isFiltered = cohortFilter === bId;

      return `
        <button
          type="button"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-xs font-semibold ${
            isFiltered
              ? `${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder} ring-2 ring-[#3b6347]/20 font-bold`
              : 'bg-white hover:bg-[#f7f4ed] text-[#3b433c] border-[#ded5c6]'
          }"
          data-cohort-filter="${bId}"
          title="Filter to ${cfg.fullName}"
        >
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${cfg.hex};"></span>
          <span class="truncate">${cfg.shortName}</span>
          <span class="font-bold text-[10.5px] text-[#2c332d]">(${stats.count})</span>
        </button>
      `;
    }).join('');

    return `
      <div class="panel-3d rounded-2xl p-5 bg-white space-y-4">
        <!-- Card Header with Granularity Switcher -->
        <div class="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#f0ece4]">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] text-[#3b6347] border border-[#cde0d3] flex items-center justify-center font-bold shrink-0">
              <span class="material-symbols-outlined text-[24px]">stacked_bar_chart</span>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-headline font-bold text-lg text-[#2c332d]">Batch-Level Lecture Volume &amp; Rhythm</h3>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3]">
                  ${peakBadgeText}
                </span>
              </div>
              <p class="text-xs text-[#68736a] mt-0.5">
                Interactive day-wise, weekly &amp; monthly session volume across all medical cohorts
              </p>
            </div>
          </div>

          <!-- Granularity Switcher Buttons (Day | Week | Month) -->
          <div class="track-3d flex items-center p-1 rounded-xl text-xs font-bold">
            <button id="batchGraphScopeDayBtn" type="button" class="px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-none ${granularity === 'day' ? 'btn-3d-primary font-bold text-white' : 'text-[#576058] hover:text-[#2c332d] bg-transparent'}">Day-Wise</button>
            <button id="batchGraphScopeWeekBtn" type="button" class="px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-none ${granularity === 'week' ? 'btn-3d-primary font-bold text-white' : 'text-[#576058] hover:text-[#2c332d] bg-transparent'}">Weekly</button>
            <button id="batchGraphScopeMonthBtn" type="button" class="px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-none ${granularity === 'month' ? 'btn-3d-primary font-bold text-white' : 'text-[#576058] hover:text-[#2c332d] bg-transparent'}">Monthly</button>
          </div>
        </div>

        <!-- Cohort Filter & Day-Month Filter Bar -->
        <div class="flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <!-- Cohort Chips -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] font-bold text-[#788279] mr-1">Filter Cohort:</span>
            <button
              type="button"
              class="px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-xs font-semibold ${
                cohortFilter === 'all'
                  ? 'btn-3d-primary font-bold text-white border-transparent'
                  : 'bg-white hover:bg-[#f7f4ed] text-[#3b433c] border-[#ded5c6]'
              }"
              data-cohort-filter="all"
            >
              All Cohorts (${classes.length})
            </button>
            ${legendHtml}
          </div>

          <!-- Day-Wise Month Switcher (Only visible in Day-Wise view) -->
          ${granularity === 'day' ? `
            <div class="flex items-center gap-1 p-0.5 rounded-xl bg-[#f4efe6] border border-[#ded5c6] text-[11px] font-bold">
              <button type="button" class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${activeDayMonth === '2026-09' ? 'bg-white text-[#2c332d] shadow-xs' : 'text-[#68736a] hover:text-[#2c332d]'}" data-day-month-filter="2026-09">Sep '26 (14)</button>
              <button type="button" class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${activeDayMonth === '2026-10' ? 'bg-white text-[#2c332d] shadow-xs' : 'text-[#68736a] hover:text-[#2c332d]'}" data-day-month-filter="2026-10">Oct '26 (26)</button>
              <button type="button" class="px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${activeDayMonth === '2026-11' ? 'bg-white text-[#2c332d] shadow-xs' : 'text-[#68736a] hover:text-[#2c332d]'}" data-day-month-filter="2026-11">Nov '26 (27)</button>
            </div>
          ` : `
            <div class="text-[11px] font-bold text-[#68736a] bg-[#f7f4ed] px-2.5 py-1 rounded-lg border border-[#ded5c6]">
              ${filteredClasses.length} Sessions Plotted • ${totalFilteredHours} Teaching Hours
            </div>
          `}
        </div>

        <!-- The Main Chart Visualization Area -->
        ${chartHtml}

        <!-- Dynamic Period Inspector Box -->
        ${inspectorHtml}
      </div>
    `;
  }

  attachBatchLectureGraphListeners(container) {
    if (!container) return;

    // Granularity Switcher
    container.querySelector('#batchGraphScopeDayBtn')?.addEventListener('click', () => {
      this.batchGraphGranularity = 'day';
      this.dashboardScope = 'day';
      this.facultyHighlightScope = 'day';
      this.batchGraphSelectedKey = null;
      this.renderFacultyHighlightsCard();
      this.renderDashboardView();
    });

    container.querySelector('#batchGraphScopeWeekBtn')?.addEventListener('click', () => {
      this.batchGraphGranularity = 'week';
      this.dashboardScope = 'week';
      this.facultyHighlightScope = 'week';
      this.batchGraphSelectedKey = null;
      this.renderFacultyHighlightsCard();
      this.renderDashboardView();
    });

    container.querySelector('#batchGraphScopeMonthBtn')?.addEventListener('click', () => {
      this.batchGraphGranularity = 'month';
      this.dashboardScope = 'month';
      this.facultyHighlightScope = 'month';
      this.batchGraphSelectedKey = null;
      this.renderFacultyHighlightsCard();
      this.renderDashboardView();
    });

    // Cohort Filters
    container.querySelectorAll('[data-cohort-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.batchGraphCohort = btn.getAttribute('data-cohort-filter');
        this.updateBatchLectureGraph(container);
      });
    });

    // Day Month Filters
    container.querySelectorAll('[data-day-month-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.batchGraphDayMonth = btn.getAttribute('data-day-month-filter');
        this.batchGraphSelectedKey = null;
        this.updateBatchLectureGraph(container);
      });
    });

    // Bar / Card click handlers to inspect item
    container.querySelectorAll('[data-graph-item-key]').forEach(item => {
      item.addEventListener('click', () => {
        this.batchGraphSelectedKey = item.getAttribute('data-graph-item-key');
        this.updateBatchLectureGraph(container);
      });
    });
  }

  updateBatchLectureGraph(container) {
    const card = container.querySelector('#batchLectureGraphCard') || document.getElementById('batchLectureGraphCard');
    if (card) {
      card.innerHTML = this.buildBatchLectureGraphHtml();
      this.attachBatchLectureGraphListeners(card);
    }
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

          <div class="pt-1">
            <button class="btn-3d-primary w-full py-2 rounded-xl text-white font-bold text-xs cursor-pointer btn-filter-fac-in-cal" data-faculty="${fac.name}">
              View Schedule
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
      const canReschedule = f.canRescheduleCancel !== false;
      const initials = (f.name || '').replace(/^(Dr\.|Prof\.)\s*/i, '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
      const cohortsHtml = (f.cohorts || []).map(c => `<span class="px-2 py-0.5 rounded-md bg-[#f4efe6] border border-[#ded5c6] text-[10px] font-semibold text-[#2c332d] whitespace-nowrap">${c}</span>`).join(' ');

      const statusBadge = isVerified
        ? `<span class="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-[#eef4f0] text-[#2d4d37] font-bold border border-[#cde0d3] badge-3d shrink-0">
             <span class="material-symbols-outlined text-[13px] text-[#4a7c59]">check_circle</span> Verified
           </span>`
        : `<span class="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md bg-[#fdf8f0] text-[#705c30] font-bold border border-[#ebe0ca] badge-3d shrink-0">
             <span class="material-symbols-outlined text-[13px]">pending</span> Pending Invite
           </span>`;

      const avatarBox = isVerified
        ? `<div class="w-11 h-11 rounded-xl bg-[#eef4f0] text-[#4a7c59] border border-[#cde0d3] flex items-center justify-center font-bold text-sm shrink-0 select-none">${initials}</div>`
        : `<div class="w-11 h-11 rounded-xl bg-[#fdf8f0] text-[#705c30] border border-[#ebe0ca] flex items-center justify-center font-bold text-sm shrink-0 select-none">${initials}</div>`;

      const rescheduleToggleHtml = `
        <div class="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-[#faf7f2] border border-[#ded5c6]/80 shrink-0" title="${canReschedule ? 'Reschedule & cancellation enabled for faculty portal' : 'Reschedule & cancellation disabled (shows Close button only)'}">
          <span class="text-[11px] font-bold ${canReschedule ? 'text-[#2d4d37]' : 'text-[#8b958c]'} select-none flex items-center gap-1 whitespace-nowrap">
            <span class="material-symbols-outlined text-[13px] ${canReschedule ? 'text-[#4a7c59]' : 'text-[#8b958c]'}">edit_calendar</span>
            Reschedule &amp; Cancel
          </span>
          <button type="button" role="switch" aria-checked="${canReschedule}" class="btn-toggle-reschedule relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${canReschedule ? 'bg-[#4a7c59]' : 'bg-[#ded5c6]'}" data-id="${f.id}" title="${canReschedule ? 'Click to disable reschedule & cancellation for this faculty' : 'Click to enable reschedule & cancellation for this faculty'}">
            <span class="sr-only">Toggle Reschedule and Cancellation</span>
            <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${canReschedule ? 'translate-x-4' : 'translate-x-0'}"></span>
          </button>
        </div>
      `;

      const actionButtons = isVerified
        ? `<button class="btn-edit-mapping btn-3d-secondary text-xs font-bold text-[#2c332d] px-3.5 py-1.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0" data-id="${f.id}" type="button">
             Edit Mapping
           </button>
           <button class="btn-resend-creds w-8 h-8 rounded-lg bg-[#f7f4ed] hover:bg-[#ede7da] border border-[#ded5c6] text-[#576058] flex items-center justify-center hover:text-[#2c332d] transition-colors cursor-pointer shrink-0" data-id="${f.id}" title="Resend Credentials" type="button">
             <span class="material-symbols-outlined text-[16px]">forward_to_inbox</span>
           </button>
           <button class="btn-delete-faculty w-8 h-8 rounded-lg bg-[#fdf2f2] hover:bg-[#fae2e2] border border-[#f5c6c6] text-[#b83230] flex items-center justify-center transition-colors cursor-pointer shrink-0" data-id="${f.id}" title="Remove Faculty" type="button">
             <span class="material-symbols-outlined text-[16px]">delete</span>
           </button>`
        : `<button class="btn-complete-mapping btn-3d-primary text-xs font-bold text-white px-3.5 py-1.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0" data-id="${f.id}" type="button">
             Complete Mapping
           </button>
           <button class="btn-send-otp btn-3d-secondary text-xs font-bold text-[#4a7c59] px-3.5 py-1.5 rounded-lg cursor-pointer whitespace-nowrap shrink-0" data-id="${f.id}" title="Send OTP Token" type="button">
             Send OTP
           </button>
           <button class="btn-delete-faculty w-8 h-8 rounded-lg bg-[#fdf2f2] hover:bg-[#fae2e2] border border-[#f5c6c6] text-[#b83230] flex items-center justify-center transition-colors cursor-pointer shrink-0" data-id="${f.id}" title="Remove Faculty" type="button">
             <span class="material-symbols-outlined text-[16px]">delete</span>
           </button>`;

      return `
        <div class="faculty-row bg-white rounded-xl p-4 sm:p-5 card-3d flex flex-col gap-3.5 transition-all hover:border-[#4a7c59]/40" data-id="${f.id}" data-dept="${f.dept}" data-name="${f.name}" data-status="${f.status}">
          <!-- Top Section: Avatar, Full Name & Role, Action Buttons -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <div class="flex items-center gap-3.5 min-w-0 flex-1">
              ${avatarBox}
              <div class="min-w-0 flex-1 space-y-0.5">
                <div class="flex items-center gap-2.5 flex-wrap">
                  <h3 class="font-bold text-base text-[#2c332d] leading-snug tracking-tight">${f.name}</h3>
                  ${statusBadge}
                </div>
                <div class="text-xs font-semibold text-[#576058] truncate">${f.role || `Professor • ${f.dept}`}</div>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0 self-start sm:self-center pt-1 sm:pt-0">
              ${actionButtons}
            </div>
          </div>

          <!-- Bottom Section: Email, Phone, Cohorts & Permission Toggle -->
          <div class="pt-3 border-t border-[#ded5c6]/60 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs">
            <div class="flex flex-wrap items-center gap-2 text-[#68736a] min-w-0">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#faf7f2] border border-[#ded5c6]/70 text-[11px] font-mono text-[#4a524b] whitespace-nowrap">
                <span class="material-symbols-outlined text-[14px] text-[#8b958c]">alternate_email</span>
                <span>${f.email}</span>
              </span>
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#faf7f2] border border-[#ded5c6]/70 text-[11px] font-medium text-[#4a524b] whitespace-nowrap">
                <span class="material-symbols-outlined text-[14px] text-[#8b958c]">phone_iphone</span>
                <span>+91 ${f.phone}</span>
              </span>
              <div class="flex items-center gap-1.5 flex-wrap pl-0.5">
                <span class="text-[10px] font-bold uppercase tracking-wider text-[#8b958c]">Cohorts:</span>
                ${cohortsHtml || '<span class="text-[11px] text-[#8b958c]">None</span>'}
              </div>
            </div>
            <div class="shrink-0 flex items-center justify-start md:justify-end pt-1 md:pt-0">
              ${rescheduleToggleHtml}
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Update the live master spreadsheet table view on every render
    this.renderSpreadsheetTableView();
  }

  /**
   * Renders the embedded, Excel-style live Master Spreadsheet table view directly
   * in the Faculty Master Spreadsheet section for instant view and verification.
   */
  renderSpreadsheetTableView() {
    const tbody = document.getElementById('spreadsheet-table-body');
    const totalBadge = document.getElementById('spreadsheet-total-rows-badge');
    const footerInfo = document.getElementById('spreadsheet-footer-info');
    if (!tbody) return;

    if (!this.facultyOnboardingList) {
      this.facultyOnboardingList = reminderEmailService.getFacultyOnboardingList() || [];
    }

    const list = this.facultyOnboardingList;
    if (totalBadge) totalBadge.textContent = `${list.length} Rows`;

    const searchQ = (this.spreadsheetTableSearchQuery || '').trim().toLowerCase();
    const testEmailQ = (this.spreadsheetVerifyEmailQuery || '').trim().toLowerCase();

    const filtered = list.filter((f, idx) => {
      if (!searchQ) return true;
      const text = `${idx + 1} ${f.id} ${f.name} ${f.email} ${f.secondaryEmail || ''} ${f.phone || ''} ${f.dept || ''} ${f.role || ''} ${f.status || ''} ${f.cohorts ? f.cohorts.join(' ') : ''}`.toLowerCase();
      return text.includes(searchQ);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="12" class="py-8 text-center text-[#8b958c]">
            <span class="material-symbols-outlined text-[24px] block mb-1">search_off</span>
            No matching spreadsheet rows found for "${searchQ}".
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map((f, idx) => {
      const isMatchedTest = testEmailQ && (
        (f.email && f.email.toLowerCase() === testEmailQ) ||
        (f.secondaryEmail && f.secondaryEmail.toLowerCase() === testEmailQ) ||
        (f.name && f.name.toLowerCase().includes(testEmailQ))
      );
      const rowBg = isMatchedTest 
        ? 'bg-emerald-100 font-medium' 
        : idx % 2 === 0 ? 'bg-white hover:bg-[#f6faf7]' : 'bg-[#faf9f5] hover:bg-[#f2f7f3]';
      
      const statusBadge = f.status === 'Verified'
        ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3]"><span class="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>Verified</span>`
        : `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#fdf8f0] text-[#705c30] border border-[#ebe0ca]"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>Pending</span>`;
      
      const reschedBadge = f.canRescheduleCancel !== false
        ? `<span class="text-[11px] font-bold text-[#2d4d37] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">TRUE</span>`
        : `<span class="text-[11px] font-bold text-[#b91c1c] bg-red-50 border border-red-200 px-1.5 py-0.5 rounded">FALSE</span>`;

      const cohortsHtml = (f.cohorts || ["Prarambh '26"]).map(c => 
        `<span class="inline-block bg-[#f0ede6] text-[#2c332d] text-[10px] font-semibold px-1.5 py-0.5 rounded mr-1 mb-0.5">${c}</span>`
      ).join('');

      const updatedStr = f.lastUpdated ? new Date(f.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Live Synced';

      return `
        <tr class="${rowBg} transition-colors border-b border-[#eef4f0]">
          <td class="py-2 px-3 border-r border-[#eef4f0] text-center font-mono text-[11px] text-[#8b958c] bg-[#f9faf9] select-none">${idx + 1}</td>
          <td class="py-2 px-3 border-r border-[#eef4f0] font-mono text-[11px] font-bold text-[#3b6347] whitespace-nowrap">${f.id}</td>
          <td class="py-2 px-3 border-r border-[#eef4f0] font-bold text-[#2c332d] whitespace-nowrap">${f.name}</td>
          <td class="py-2 px-3 border-r border-[#eef4f0] font-mono text-[11px] text-[#1c3225] whitespace-nowrap font-semibold">${f.email}</td>
          <td class="py-2 px-3 border-r border-[#eef4f0] font-mono text-[11px] text-[#68736a] whitespace-nowrap">${f.secondaryEmail || '<span class="text-neutral-300">-</span>'}</td>
          <td class="py-2 px-3 border-r border-[#eef4f0] font-mono text-[11px] text-[#576058] whitespace-nowrap">${f.phone || '-'}</td>
          <td class="py-2 px-3 border-r border-[#eef4f0] font-semibold text-[#2c332d] whitespace-nowrap">${f.dept || 'Medicine'}</td>
          <td class="py-2 px-3 border-r border-[#eef4f0] text-[#576058] text-[11px] whitespace-nowrap">${f.role || `Professor • ${f.dept || 'Medicine'}`}</td>
          <td class="py-2 px-3 border-r border-[#eef4f0] text-center whitespace-nowrap">${statusBadge}</td>
          <td class="py-2 px-3 border-r border-[#eef4f0] text-center whitespace-nowrap font-mono">${reschedBadge}</td>
          <td class="py-2 px-3 border-r border-[#eef4f0] text-[11px]">${cohortsHtml}</td>
          <td class="py-2 px-3 text-[10px] text-[#8b958c] font-mono whitespace-nowrap">${updatedStr}</td>
        </tr>
      `;
    }).join('');

    if (footerInfo) {
      footerInfo.textContent = `Showing ${filtered.length} of ${list.length} mapped spreadsheet entries in data_faculty_onboarding.csv`;
    }
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

    // Master Spreadsheet Action Controls & Email Mapping Tester
    const downloadCsvBtn = document.getElementById('btn-download-onboarding-csv');
    const syncGoogleSheetBtn = document.getElementById('btn-sync-google-sheet');
    const toggleSpreadsheetBtn = document.getElementById('btn-toggle-spreadsheet-view');
    const toggleSpreadsheetText = document.getElementById('btn-toggle-spreadsheet-text');
    const spreadsheetWrapper = document.getElementById('spreadsheet-table-wrapper');
    const tableSearchInput = document.getElementById('spreadsheet-table-search-input');
    const refreshTableBtn = document.getElementById('btn-refresh-spreadsheet-table');
    const emailVerifyInput = document.getElementById('spreadsheet-email-verify-input');
    const emailVerifyResult = document.getElementById('spreadsheet-verify-result');

    // 1. Toggle Table View
    toggleSpreadsheetBtn?.addEventListener('click', () => {
      if (!spreadsheetWrapper) return;
      const isHidden = spreadsheetWrapper.classList.toggle('hidden');
      if (toggleSpreadsheetText) {
        toggleSpreadsheetText.textContent = isHidden ? 'View Spreadsheet Table' : 'Hide Spreadsheet Table';
      }
    });

    // 2. Search inside spreadsheet grid
    tableSearchInput?.addEventListener('input', (e) => {
      this.spreadsheetTableSearchQuery = e.target.value;
      this.renderSpreadsheetTableView();
    });

    // 3. Refresh Spreadsheet Table from Server
    refreshTableBtn?.addEventListener('click', async () => {
      this.showToast('Refreshing master spreadsheet rows from server...');
      try {
        const res = await fetch('/api/faculty-onboarding');
        const data = await res.json();
        if (Array.isArray(data)) {
          this.facultyOnboardingList = data;
          reminderEmailService.saveFacultyOnboardingList(data);
          this.renderOnboardingList();
          this.showToast('Master spreadsheet synchronized with server data.');
        }
      } catch (e) {
        this.renderSpreadsheetTableView();
      }
    });

    // 4. Live Email Login Verification Tester
    const updateVerifyResult = (val) => {
      const q = (val || '').trim().toLowerCase();
      this.spreadsheetVerifyEmailQuery = q;
      this.renderSpreadsheetTableView();

      if (!q) {
        if (emailVerifyResult) {
          emailVerifyResult.className = 'flex items-center gap-2 text-xs font-semibold bg-white/15 border border-white/20 rounded-lg px-3 py-1.5 text-white/70 shrink-0';
          emailVerifyResult.innerHTML = '<span class="material-symbols-outlined text-white/60 text-[16px]">info</span><span>Type an email above to test mapped login credentials</span>';
        }
        return;
      }

      const matched = reminderEmailService.findFacultyByEmail(q);
      if (matched) {
        if (emailVerifyResult) {
          emailVerifyResult.className = 'flex items-center gap-2 text-xs font-semibold bg-emerald-950/80 border border-emerald-500/50 rounded-lg px-3 py-1.5 text-emerald-200 shrink-0';
          emailVerifyResult.innerHTML = `<span class="material-symbols-outlined text-emerald-400 text-[16px]">check_circle</span><span>${matched.name} • ${matched.dept || 'Faculty'} (${matched.status}) [Authorized Login]</span>`;
        }
      } else {
        if (emailVerifyResult) {
          emailVerifyResult.className = 'flex items-center gap-2 text-xs font-semibold bg-red-950/80 border border-red-500/50 rounded-lg px-3 py-1.5 text-red-200 shrink-0';
          emailVerifyResult.innerHTML = `<span class="material-symbols-outlined text-red-400 text-[16px]">block</span><span>No faculty record found for "${q}" [Login Blocked]</span>`;
        }
      }
    };

    emailVerifyInput?.addEventListener('input', (e) => updateVerifyResult(e.target.value));
    if (emailVerifyInput && emailVerifyInput.value) {
      updateVerifyResult(emailVerifyInput.value);
    }

    downloadCsvBtn?.addEventListener('click', () => {
      this.showToast('Downloading Faculty Onboarding Master Spreadsheet (.csv)...');
      try {
        const link = document.createElement('a');
        link.href = '/api/faculty-onboarding-csv';
        link.download = 'PW_MedEd_Faculty_Onboarding_Directory.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
        window.open('/api/faculty-onboarding-csv', '_blank');
      }
    });

    syncGoogleSheetBtn?.addEventListener('click', async () => {
      const defaultUrl = 'https://docs.google.com/spreadsheets/d/1X5X.../edit';
      const inputUrl = prompt(
        'Enter public/shared Google Spreadsheet URL containing Faculty Onboarding Mappings:\n(Format: Faculty ID, Name, Primary Email, Secondary Email, Phone, Department, Designation Role, Status, Can Reschedule Cancel, Assigned Cohorts, Last Updated)',
        ''
      );
      if (!inputUrl || !inputUrl.trim()) return;

      this.showToast('Connecting and synchronizing with Google Sheet...');
      try {
        const res = await fetch('/api/faculty-onboarding/sync-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetUrl: inputUrl.trim() })
        });
        const jsonRes = await res.json();
        if (jsonRes.success && Array.isArray(jsonRes.list)) {
          this.facultyOnboardingList = jsonRes.list;
          reminderEmailService.saveFacultyOnboardingList(this.facultyOnboardingList);
          this.onboardingPage = 1;
          this.renderOnboardingList();
          this.showToast(`Successfully synced ${jsonRes.count} faculty records from Google Spreadsheet!`);
        } else {
          alert(`Google Sheet Sync Error: ${jsonRes.error || 'Failed to parse spreadsheet data'}`);
        }
      } catch (e) {
        alert(`Failed to connect to spreadsheet server: ${e.message}`);
      }
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
      const reschedToggle = document.getElementById('onboard-reschedule-toggle');
      if (reschedToggle) reschedToggle.checked = true;

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

    // 8. Row Action Buttons & Toggle delegation
    container?.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('.btn-toggle-reschedule');
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

      if (toggleBtn) {
        const id = toggleBtn.getAttribute('data-id');
        const fac = this.facultyOnboardingList.find(f => f.id === id);
        if (fac) {
          const newVal = fac.canRescheduleCancel === false ? true : false;
          fac.canRescheduleCancel = newVal;
          reminderEmailService.saveFacultyOnboardingList(this.facultyOnboardingList);
          this.renderOnboardingList();
          if (newVal) {
            this.showToast(`Reschedule & cancellation enabled for ${fac.name}`);
          } else {
            this.showToast(`Reschedule & cancellation disabled for ${fac.name}`);
          }
        }
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
        const reschedToggle = document.getElementById('onboard-reschedule-toggle');

        if (nameInput) nameInput.value = fac.name;
        if (emailInput) emailInput.value = fac.email;
        if (phoneInput) phoneInput.value = (fac.phone || '').replace(/\D/g, '');
        if (reschedToggle) reschedToggle.checked = fac.canRescheduleCancel !== false;

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
      const reschedToggle = document.getElementById('onboard-reschedule-toggle');

      const nameVal = (nameInput?.value || '').trim();
      const emailVal = (emailInput?.value || '').trim();
      const phoneVal = (phoneInput?.value || '').trim();
      const canReschedVal = reschedToggle ? reschedToggle.checked : true;

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
          fac.canRescheduleCancel = canReschedVal;
          reminderEmailService.saveFacultyOnboardingList(this.facultyOnboardingList);
          this.showToast(`Updated credentials & permissions for ${cleanName}!`);
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
          canRescheduleCancel: canReschedVal,
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
      modal?.classList.remove('hidden', 'pointer-events-none');
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
      document.body.style.overflow = '';
      setTimeout(() => {
        if (drawer?.classList.contains('translate-x-full')) {
          modal?.classList.add('hidden', 'pointer-events-none');
        }
      }, 300);
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

  /**
   * Render the sheet write-back settings into the existing "Connect Sheet"
   * settings panel. Built from JS so the five HTML entry points stay in sync
   * automatically.
   */
  renderSheetWriteBackSettings() {
    const host = document.getElementById('settingsTabContentSheet');
    if (!host) return;

    let card = document.getElementById('sheetWriteBackCard');
    if (!card) {
      card = document.createElement('div');
      card.id = 'sheetWriteBackCard';
      card.className = 'mt-4 p-3.5 rounded-xl border border-[#ded5c6] bg-[#fbf9f4]';
      card.innerHTML = `
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[18px] text-[#4a7c59]">sync_alt</span>
            <span class="font-headline text-xs font-bold text-[#2c332d]">Sheet Write-Back</span>
          </div>
          <span id="sheetWriteBackBadge" class="text-[10px] font-bold px-2 py-0.5 rounded-md border"></span>
        </div>
        <p class="text-[11px] text-[#68736a] leading-relaxed mb-2.5">
          Writes <strong>Status</strong>, <strong>Rescheduled Date</strong>, <strong>Rescheduled Time</strong> and
          <strong>Rescheduled Duration</strong> back into the Lecture Planner tab when you approve a reschedule or
          cancellation. Deploy <code class="text-[10px]">apps-script/Code.gs</code> from the sheet as a Web App, then paste its
          <code class="text-[10px]">/exec</code> URL and token below.
        </p>
        <label class="block text-[10px] font-bold uppercase tracking-wider text-[#68736a] mb-1">Web App URL</label>
        <input id="sheetWriteBackUrl" type="url" placeholder="https://script.google.com/macros/s/AKfy.../exec"
          class="w-full px-2.5 py-1.5 mb-2 rounded-lg border border-[#ded5c6] text-xs text-[#2c332d] bg-white" />
        <label class="block text-[10px] font-bold uppercase tracking-wider text-[#68736a] mb-1">Shared Token</label>
        <input id="sheetWriteBackToken" type="password" placeholder="must match SHARED_TOKEN in the script"
          class="w-full px-2.5 py-1.5 mb-2.5 rounded-lg border border-[#ded5c6] text-xs text-[#2c332d] bg-white" />
        <label class="flex items-center gap-2 mb-2.5 cursor-pointer">
          <input id="sheetWriteBackEnabled" type="checkbox" class="cursor-pointer" />
          <span class="text-[11px] font-semibold text-[#2c332d]">Update the sheet on approval</span>
        </label>
        <div class="flex items-center gap-2">
          <button id="sheetWriteBackTestBtn" type="button"
            class="px-3 py-1.5 rounded-lg border border-[#c4c8bc] hover:bg-[#f4efe6] text-[11px] font-semibold text-[#2c332d] cursor-pointer bg-white">Test connection</button>
          <button id="sheetWriteBackSaveBtn" type="button"
            class="px-3 py-1.5 rounded-lg btn-3d-primary text-white text-[11px] font-bold cursor-pointer border-none">Save</button>
          <button id="sheetWriteBackRetryBtn" type="button"
            class="px-3 py-1.5 rounded-lg border border-[#c4c8bc] hover:bg-[#f4efe6] text-[11px] font-semibold text-[#2c332d] cursor-pointer bg-white hidden">Retry pending</button>
        </div>
        <p id="sheetWriteBackResult" class="text-[11px] mt-2 text-[#68736a]"></p>
      `;
      host.appendChild(card);

      const urlEl = card.querySelector('#sheetWriteBackUrl');
      const tokenEl = card.querySelector('#sheetWriteBackToken');
      const enabledEl = card.querySelector('#sheetWriteBackEnabled');
      const resultEl = card.querySelector('#sheetWriteBackResult');

      card.querySelector('#sheetWriteBackSaveBtn')?.addEventListener('click', () => {
        const cfg = saveSheetWriterConfig({
          endpoint: urlEl.value,
          token: tokenEl.value,
          enabled: enabledEl.checked
        });
        resultEl.textContent = cfg.endpoint && cfg.token
          ? 'Saved.'
          : 'Saved, but the URL or token is empty - approvals will stay local only.';
        this.renderSheetWriteBackSettings();
        this.flushSheetWriteQueue({ quiet: false });
      });

      card.querySelector('#sheetWriteBackTestBtn')?.addEventListener('click', async () => {
        resultEl.textContent = 'Testing...';
        const res = await testSheetWriteBack(urlEl.value.trim(), tokenEl.value.trim());
        resultEl.textContent = res.ok
          ? `Connected to "${res.spreadsheet}". Tabs: ${res.tabs.join(', ')}`
          : `Failed: ${res.error}`;
      });

      card.querySelector('#sheetWriteBackRetryBtn')?.addEventListener('click', async () => {
        resultEl.textContent = 'Retrying...';
        const res = await flushPendingSheetWrites();
        resultEl.textContent = `Sent ${res.sent}, still pending ${res.remaining}.`;
        this.renderSheetWriteBackSettings();
      });
    }

    const cfg = getSheetWriterConfig();
    const urlEl = card.querySelector('#sheetWriteBackUrl');
    const tokenEl = card.querySelector('#sheetWriteBackToken');
    const enabledEl = card.querySelector('#sheetWriteBackEnabled');
    if (urlEl && document.activeElement !== urlEl) urlEl.value = cfg.endpoint;
    if (tokenEl && document.activeElement !== tokenEl) tokenEl.value = cfg.token;
    if (enabledEl) enabledEl.checked = cfg.enabled;

    const pending = getPendingSheetWrites().length;
    const badge = card.querySelector('#sheetWriteBackBadge');
    if (badge) {
      const connected = isSheetWriteBackConfigured();
      badge.textContent = connected ? (pending ? `${pending} pending` : 'Connected') : 'Not connected';
      badge.className = connected && !pending
        ? 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3]'
        : connected
          ? 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#fdf6e3] text-[#7a5c00] border border-[#e8d9a8]'
          : 'text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#fdf2f2] text-[#b83230] border border-[#fed7d7]';
    }
    card.querySelector('#sheetWriteBackRetryBtn')?.classList.toggle('hidden', pending === 0);
  }

  openAdminSettingsModal(activeTab = 'email') {
    const modal = document.getElementById('adminSettingsModal');
    if (!modal) return;

    this.renderSheetWriteBackSettings();

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
    
    const batchEl = document.getElementById('modalDetailBatch');
    if (batchEl) {
      batchEl.innerHTML = `${renderBatchBadge(ev.batchName || 'PW MedEd')} ${renderPlatformBadges(ev, { size: 'sm' })}`;
      batchEl.className = 'inline-flex items-center gap-1.5';
    }

    document.getElementById('modalDetailSubject').textContent = ev.subject || 'Medical Lecture';
    document.getElementById('modalDetailFaculty').textContent = ev.faculty || 'Faculty';
    document.getElementById('modalDetailDate').textContent = ev.dateRaw || ev.isoDate;
    document.getElementById('modalDetailTimings').textContent = ev.timings || '7:00 PM - 9:00 PM';
    document.getElementById('modalDetailDuration').textContent = ev.duration || '2 Hours';
    document.getElementById('modalDetailTopic').textContent = ev.topic || ev.chapter;

    // Delivery Platform row
    let platformRow = document.getElementById('modalDetailPlatformRow');
    if (!platformRow) {
      const container = modal.querySelector('.space-y-2');
      if (container) {
        platformRow = document.createElement('div');
        platformRow.id = 'modalDetailPlatformRow';
        platformRow.className = 'flex justify-between items-center';
        platformRow.innerHTML = `<span class="text-[#68736a] font-semibold">Delivery Platform:</span><span id="modalDetailPlatform" class="font-bold text-[#2c332d] flex items-center gap-1"></span>`;
        container.appendChild(platformRow);
      }
    }
    const platformEl = document.getElementById('modalDetailPlatform');
    if (platformEl) {
      platformEl.innerHTML = `${getDeliveryPlatformText(ev)} ${renderPlatformBadges(ev, { size: 'sm' })}`;
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

function initAdminApp() {
  if (!window.adminApp) {
    window.adminApp = new AdminDashboardController();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdminApp);
} else {
  initAdminApp();
}

export { AdminDashboardController };
