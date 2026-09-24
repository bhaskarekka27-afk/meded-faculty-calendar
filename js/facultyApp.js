/**
 * PW MedEd - Faculty Academic Calendar Controller
 * Uses the exact same calendar layout, aesthetics, and card design as Admin Login.
 * 
 * Features:
 * 1. 3 Dynamic Metric Tabs above the calendar:
 *    - Today's class details & count
 *    - Upcoming class details & count
 *    - Total classes count & teaching hours
 *    - Numbers dynamically adapt when Month, Week, or Today is selected.
 * 2. Strictly filters and renders ONLY the logged-in faculty's classes.
 * 3. Exact same Month Grid, Week Timetable Matrix, and Timeline views as Admin.
 * 4. Faculty Profile Switcher to easily test between faculty members.
 */

import { BatchManager } from './sheetConnector.js';
import { generateGoogleCalendarUrl, generateIcsContent, downloadIcsFile } from './icsExporter.js';
import { reminderEmailService } from './reminderEmailService.js';
import { renderPlatformBadges, renderBatchBadge, getDeliveryPlatformText } from './platformBadge.js';
import { addFacultyRequest } from './requestsView.js';
import { toLocalIso, todayIso, parseIso, startOfWeek, isInMonth, nearestMonthWithEvents } from './dateUtils.js';

export class FacultyDashboardController {
  constructor() {
    this.batchManager = new BatchManager();
    this.batches = this.batchManager.getBatches();
    this.activeBatchId = this.batches[0] ? this.batches[0].id : null;

    // Faculty identity (defaults to Dr. Rajesh Jambhulkar)
    this.currentFaculty = 'Dr. Rajesh Jambhulkar';
    this.facultySubject = 'Biochemistry';
    this.loggedInFaculty = 'Dr. Rajesh Jambhulkar';
    this.loggedInSubject = 'Biochemistry';

    // Calendar state - always defaults to the current real-time month & year
    const _now = new Date();
    this.currentYear = _now.getFullYear();
    this.currentMonth = _now.getMonth();
    this.currentWeekStart = startOfWeek(_now);
    this.calendarView = 'month'; // 'month', 'week', 'timeline'
    this.activeFilterTab = 'total'; // 'today', 'upcoming', 'total'
    this.searchQuery = '';

    // Today's real date, in the user's own timezone. Single source of truth.
    this.todayIso = todayIso();

    // Mobile responsive view state - always defaults to current month & today's date
    this.mobileView = 'month'; // 'month', 'week', 'agenda'
    this.mobileSelectedDateIso = this.todayIso;

    this.init();
  }

  init() {
    this.loadFacultySession();
    this.bindDOM();
    this.bindMobileDOM();
    this.populateBatchDropdown();
    this.populateMobileBatchDropdown();
    this.populateFacultySwitcher();
    this.populateMobileFacultySwitcher();
    this.setupFacultyNotificationDrawer();
    this.setupFacultyEmailPreviewModal();
    
    // Always show current month calendar by default on faculty login on both web and mobile view
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth();
    this.currentWeekStart = startOfWeek(now);
    this.todayIso = todayIso();
    this.mobileSelectedDateIso = this.todayIso;

    this.render();
    this.renderFacultyNotifications();
  }

  loadFacultySession() {
    try {
      const stored = localStorage.getItem('meded_active_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user.role === 'faculty' || !user.role) {
          if (user.email) {
            const matchedFaculty = reminderEmailService.findFacultyByEmail(user.email);
            if (matchedFaculty) {
              this.currentFaculty = matchedFaculty.name;
              this.facultySubject = matchedFaculty.dept || 'Biochemistry';
              this.loggedInFaculty = matchedFaculty.name;
              this.loggedInSubject = matchedFaculty.dept || 'Biochemistry';
              this.loggedInEmail = matchedFaculty.email;
              return;
            }
          }
          if (user.name && user.name.trim()) {
            this.currentFaculty = user.name.trim();
            this.loggedInFaculty = user.name.trim();
          }
          if (user.subject && user.subject.trim()) {
            this.facultySubject = user.subject.trim();
            this.loggedInSubject = user.subject.trim();
          }
          if (user.email) {
            this.loggedInEmail = user.email;
          }
        }
      }
    } catch (e) {
      console.warn('Could not read user session:', e);
    }
    if (!this.loggedInFaculty) {
      this.loggedInFaculty = this.currentFaculty || 'Dr. Rajesh Jambhulkar';
      this.loggedInSubject = this.facultySubject || 'Biochemistry';
      this.loggedInEmail = 'bhaskarekka27@gmail.com';
    }
  }

  bindDOM() {
    // Header controls
    this.batchPill = document.getElementById('facultyBatchPill');
    this.batchDropdown = document.getElementById('facultyBatchDropdown');
    this.batchDropdownList = document.getElementById('facultyBatchDropdownList');
    this.batchLabel = document.getElementById('facultyBatchLabel');

    this.profileBtn = document.getElementById('facultyProfileBtn');
    this.profileDropdown = document.getElementById('facultyProfileDropdown');
    this.profilesList = document.getElementById('facultyProfilesList');

    this.headerAvatar = document.getElementById('facultyHeaderAvatar');
    this.headerName = document.getElementById('facultyHeaderName');
    this.headerSubject = document.getElementById('facultyHeaderSubject');
    this.dropdownCurrentName = document.getElementById('facultyDropdownCurrentName');
    this.dropdownCurrentSubject = document.getElementById('facultyDropdownCurrentSubject');
    this.activeNameBadge = document.getElementById('facultyActiveNameBadge');

    this.searchInput = document.getElementById('facultySearchInput');

    // 3 Dynamic Metric Tabs
    this.tabToday = document.getElementById('tabFacultyToday');
    this.tabUpcoming = document.getElementById('tabFacultyUpcoming');
    this.tabTotal = document.getElementById('tabFacultyTotal');

    this.todayCountEl = document.getElementById('facultyTodayCount');
    this.todaySubtitleEl = document.getElementById('facultyTodaySubtitle');
    this.todayBadgeEl = document.getElementById('facultyTodayBadge');

    this.upcomingCountEl = document.getElementById('facultyUpcomingCount');
    this.upcomingSubtitleEl = document.getElementById('facultyUpcomingSubtitle');
    this.upcomingScopeBadgeEl = document.getElementById('facultyUpcomingScopeBadge');

    this.totalCountEl = document.getElementById('facultyTotalCount');
    this.totalSubtitleEl = document.getElementById('facultyTotalSubtitle');
    this.totalScopeBadgeEl = document.getElementById('facultyTotalScopeBadge');

    // Calendar Navigation Bar
    this.periodTitle = document.getElementById('facultyPeriodTitle');
    this.prevPeriodBtn = document.getElementById('prevPeriodBtn');
    this.todayPeriodBtn = document.getElementById('todayPeriodBtn');
    this.nextPeriodBtn = document.getElementById('nextPeriodBtn');

    this.btnViewMonth = document.getElementById('btnViewMonth');
    this.btnViewWeek = document.getElementById('btnViewWeek');
    this.btnViewTimeline = document.getElementById('btnViewTimeline');

    // View Containers
    this.viewSectionCalendar = document.getElementById('viewSectionCalendar');
    this.viewSectionWeek = document.getElementById('viewSectionWeek');
    this.viewSectionTimeline = document.getElementById('viewSectionTimeline');

    this.calendarGrid = document.getElementById('facultyCalendarGrid');
    this.weekContainer = document.getElementById('facultyWeekContainer');
    this.timelineContainer = document.getElementById('facultyTimelineContainer');

    // Modal elements
    this.detailModal = document.getElementById('facultyEventDetailModal');
    this.closeModalBtn = document.getElementById('closeFacultyEventModal');
    this.modalCloseBtn = document.getElementById('modalDetailCloseBtn');
    this.modalRescheduleBtn = document.getElementById('modalDetailRescheduleBtn');
    this.modalCancelBtn = document.getElementById('modalDetailCancelBtn');
    this.modalGCalBtn = document.getElementById('modalDetailGCalBtn');
    this.modalIcsBtn = document.getElementById('modalDetailIcsBtn');

    // Batch Dropdown Toggle
    this.batchPill?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.batchDropdown?.classList.toggle('hidden');
      this.profileDropdown?.classList.add('hidden');
    });

    // Profile Dropdown Toggle
    this.profileBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.profileDropdown?.classList.toggle('hidden');
      this.batchDropdown?.classList.add('hidden');
    });

    // Close Dropdowns on Click Outside
    document.addEventListener('click', () => {
      this.batchDropdown?.classList.add('hidden');
      this.profileDropdown?.classList.add('hidden');
    });

    // Metric Tabs Click Handlers
    this.tabToday?.addEventListener('click', () => this.setActiveMetricTab('today'));
    this.tabUpcoming?.addEventListener('click', () => this.setActiveMetricTab('upcoming'));
    this.tabTotal?.addEventListener('click', () => this.setActiveMetricTab('total'));

    // View Switching Handlers (Month, Week, Timeline)
    this.btnViewMonth?.addEventListener('click', () => this.switchView('month'));
    this.btnViewWeek?.addEventListener('click', () => this.switchView('week'));
    this.btnViewTimeline?.addEventListener('click', () => this.switchView('timeline'));

    // Period Navigation
    this.prevPeriodBtn?.addEventListener('click', () => this.navigatePeriod(-1));
    this.nextPeriodBtn?.addEventListener('click', () => this.navigatePeriod(1));
    this.todayPeriodBtn?.addEventListener('click', () => {
      const now = new Date();
      this.todayIso = todayIso();
      this.currentYear = now.getFullYear();
      this.currentMonth = now.getMonth();
      this.currentWeekStart = startOfWeek(now);
      this.mobileSelectedDateIso = this.todayIso;
      this.render();
      this.showToast?.(`Showing today (${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`);
    });

    // Search Input
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.syncPeriodToFilters();
      this.render();
    });


    // Modal Actions
    this.closeModalBtn?.addEventListener('click', () => this.closeDetailModal());
    this.modalCloseBtn?.addEventListener('click', () => this.closeDetailModal());
    this.modalRescheduleBtn?.addEventListener('click', () => this.handleRescheduleLecture());
    this.modalCancelBtn?.addEventListener('click', () => this.handleCancelLecture());
    this.detailModal?.addEventListener('click', (e) => {
      if (e.target === this.detailModal) this.closeDetailModal();
    });
  }

  populateBatchDropdown() {
    if (!this.batchDropdownList) return;
    this.batchDropdownList.innerHTML = '';

    this.batches = this.batchManager.getBatches();
    const allEvents = this.batchManager.getAllEvents('all');
    const totalAllClasses = allEvents.filter(e => e.eventType === 'class').length;
    const isAllSelected = this.activeBatchId === 'all';

    const appBatches = this.batches.filter(b => b.platform === 'app' || (!b.isYoutube && b.platform !== 'youtube'));
    const ytBatches = this.batches.filter(b => b.platform === 'youtube' || b.platform === 'youtube_app' || b.isYoutube);

    const renderBatchButton = (batch) => {
      const isSelected = batch.id === this.activeBatchId;
      const platformBadge = renderPlatformBadges(batch, { compact: true });

      const item = document.createElement('button');
      item.type = 'button';
      item.className = `w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-[#f4efe6] transition-colors ${
        isSelected ? 'bg-[#eef4f0] font-bold text-[#3b6347]' : 'text-[#2c332d]'
      }`;
      item.innerHTML = `
        <div class="truncate mr-2 min-w-0">
          <div class="flex items-center gap-1.5 truncate">
            <span class="block font-semibold truncate text-xs">${batch.name}</span>
            ${platformBadge}
          </div>
          <span class="text-[10px] text-[#788279] block truncate">${batch.sheetTabName || 'Lecture Planner'} • ${batch.events ? batch.events.length : 0} classes</span>
        </div>
        ${isSelected ? '<span class="material-symbols-outlined text-[16px] text-[#4a7c59] shrink-0">check</span>' : ''}
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchBatch(batch.id);
      });
      return item;
    };

    // 1. All Batches (Select All)
    const allItem = document.createElement('button');
    allItem.type = 'button';
    allItem.className = `w-full text-left px-3.5 py-2.5 flex items-center justify-between hover:bg-[#f4efe6] transition-colors border-b border-[#f0ece4] ${
      isAllSelected ? 'bg-[#eef4f0] font-bold text-[#3b6347]' : 'text-[#2c332d]'
    }`;
    allItem.innerHTML = `
      <div class="truncate mr-2">
        <span class="block font-bold truncate text-xs flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[15px] text-[#4a7c59]">select_all</span>
          All Batches (Select All)
        </span>
        <span class="text-[10px] text-[#788279] block pl-5">Combined Schedule • ${totalAllClasses} classes</span>
      </div>
      ${isAllSelected ? '<span class="material-symbols-outlined text-[16px] text-[#4a7c59]">check</span>' : ''}
    `;
    allItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.switchBatch('all');
    });
    this.batchDropdownList.appendChild(allItem);

    // 2. YouTube Series Planners
    if (ytBatches.length > 0) {
      const header = document.createElement('div');
      header.className = 'px-3.5 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#e02828] flex items-center gap-1';
      header.innerHTML = `
        <svg class="w-3 h-3 fill-[#e02828]" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        <span>YouTube Series Planners</span>
      `;
      this.batchDropdownList.appendChild(header);
      ytBatches.forEach(b => this.batchDropdownList.appendChild(renderBatchButton(b)));
    }

    // 3. Mobile App Batches
    if (appBatches.length > 0) {
      const header = document.createElement('div');
      header.className = `px-3.5 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#4a7c59] flex items-center gap-1 ${ytBatches.length > 0 ? 'border-t border-[#f0ece4] mt-1' : ''}`;
      header.innerHTML = `
        <span class="material-symbols-outlined text-[13px] text-[#4a7c59]">smartphone</span>
        <span>Mobile App Batches</span>
      `;
      this.batchDropdownList.appendChild(header);
      appBatches.forEach(b => this.batchDropdownList.appendChild(renderBatchButton(b)));
    }

    if (isAllSelected && this.batchLabel) {
      this.batchLabel.textContent = 'All Batches • Combined Schedule';
    } else {
      const active = this.batches.find(b => b.id === this.activeBatchId);
      if (active && this.batchLabel) {
        this.batchLabel.textContent = active.name;
      }
    }
  }

  switchBatch(batchId) {
    this.activeBatchId = batchId;
    const isAll = batchId === 'all';
    const batch = isAll ? null : this.batches.find(b => b.id === batchId);

    if (this.batchLabel) {
      this.batchLabel.textContent = isAll ? 'All Batches • Combined Schedule' : (batch ? batch.name : 'Batch');
    }

    // Auto adjust calendar dates to the newly selected batch
    const batchClasses = this.batchManager.getAllEvents(batchId)
      .filter(e => e && e.eventType === 'class' && e.isoDate);
    if (batchClasses.length > 0) {
      const target = nearestMonthWithEvents(batchClasses, this.currentYear, this.currentMonth);
      if (target) {
        this.currentYear = target.year;
        this.currentMonth = target.month;
      }
      // Chronologically first class of that month, not whichever row came first.
      const isos = batchClasses.map(e => e.isoDate).sort();
      const inMonth = isos.filter(iso => isInMonth(iso, this.currentYear, this.currentMonth));
      const anchorIso = inMonth[0] || isos[0];
      this.currentWeekStart = startOfWeek(parseIso(anchorIso) || new Date(this.currentYear, this.currentMonth, 1));
      this.mobileSelectedDateIso = anchorIso;
    }

    // ALWAYS preserve the logged-in faculty member's profile identity.
    // Changing batch filters must NEVER change the logged-in faculty profile!
    if (this.loggedInFaculty) {
      this.currentFaculty = this.loggedInFaculty;
      this.facultySubject = this.loggedInSubject || this.facultySubject;
    } else if (!this.currentFaculty) {
      this.currentFaculty = 'Dr. Rajesh Jambhulkar';
      this.facultySubject = 'Biochemistry';
    }
    this.updateFacultyProfileUI();

    // Close batch dropdown popup immediately
    this.batchDropdown?.classList.add('hidden');
    this.mobileBatchDropdown?.classList.add('hidden');

    // Re-populate batch dropdown list so checkmark updates to the selected batch
    this.populateBatchDropdown();
    this.populateMobileBatchDropdown();

    // Re-populate faculty switcher with new batch faculty
    this.populateFacultySwitcher();
    this.populateMobileFacultySwitcher();

    // Re-render calendar views and metric tabs
    this.render();
    this.showToast(isAll ? 'Switched to: All Batches (Combined Schedule)' : `Switched to: ${batch ? batch.name : 'Batch'}`);
  }

  populateFacultySwitcher() {
    if (this.profilesList) {
      this.profilesList.innerHTML = '';
    }
    this.updateFacultyProfileUI();
  }

  getFacultyInitials(facName = '') {
    const clean = (facName || '').replace(/^(dr\.|prof\.)\s*/i, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (clean.slice(0, 2) || 'DR').toUpperCase();
  }

  switchFaculty(name, subject) {
    this.currentFaculty = name;
    this.facultySubject = subject || this.facultySubject;
    this.updateFacultyProfileUI();
    // Close profile dropdown immediately
    this.profileDropdown?.classList.add('hidden');
    this.mobileProfileDropdown?.classList.add('hidden');
    // Re-populate faculty list so checkmark updates to the newly selected faculty
    this.populateFacultySwitcher();
    this.populateMobileFacultySwitcher();
    this.render();
    this.renderFacultyNotifications();
    this.showToast(`Switched view to ${name}`);
  }

  updateFacultyProfileUI() {
    const isAll = this.currentFaculty === 'All Faculty' || this.currentFaculty === 'all';
    const initials = isAll ? 'ALL' : this.getFacultyInitials(this.currentFaculty);
    const displayName = isAll ? 'All Faculty & Batches' : this.currentFaculty;
    const displaySubject = isAll ? 'Combined Curriculum' : (this.facultySubject || this.loggedInSubject || 'Biochemistry');
    const displayBadge = isAll ? 'All Batches • Combined Schedule' : displaySubject;

    if (this.headerAvatar) this.headerAvatar.textContent = initials;
    if (this.headerName) this.headerName.textContent = displayName;
    if (this.headerSubject) this.headerSubject.textContent = displaySubject;
    if (this.dropdownCurrentName) this.dropdownCurrentName.textContent = displayName;
    if (this.dropdownCurrentSubject) this.dropdownCurrentSubject.textContent = isAll ? 'Combined Curriculum' : `Department of ${this.facultySubject}`;
    if (this.activeNameBadge) this.activeNameBadge.textContent = displayBadge;

    // Mobile profile elements sync
    const mobileAvatar = document.getElementById('mobileProfileAvatar');
    const mobileName = document.getElementById('mobileProfileName');
    const mobileSubj = document.getElementById('mobileProfileSubject');
    const mobileDropName = document.getElementById('mobileDropdownName');
    const mobileDropSubj = document.getElementById('mobileDropdownSubject');
    const mobileDropEmail = document.getElementById('mobileDropdownEmail');
    const mobileFacultySub = document.getElementById('mobileFacultySubtitle');

    if (mobileAvatar) mobileAvatar.textContent = initials;
    if (mobileName) {
      mobileName.textContent = isAll ? 'All Faculty' : displayName;
    }
    if (mobileSubj) {
      mobileSubj.textContent = isAll ? 'All Batches' : displaySubject;
    }
    if (mobileDropName) mobileDropName.textContent = displayName;
    if (mobileDropSubj) mobileDropSubj.textContent = isAll ? 'Combined Curriculum' : `Department of ${displaySubject}`;
    if (mobileDropEmail) {
      const matched = reminderEmailService.findFacultyByEmail(this.loggedInEmail || this.currentFaculty) || reminderEmailService.findFacultyByName(this.currentFaculty);
      mobileDropEmail.textContent = matched ? matched.email : (this.loggedInEmail || 'bhaskarekka27@gmail.com');
    }
    if (mobileFacultySub) mobileFacultySub.textContent = displaySubject;
  }

  /**
   * Filters events for the active view.
   * When 'All Batches' and 'All Faculty' is selected, returns all events across all batches.
   * When a specific faculty is selected, filters to that faculty.
   */
  /**
   * Keep the visible period in sync with the active filters (faculty, batch,
   * subject, search). Stays put when the current month still has matching
   * classes; only moves when it would render blank. Returns the month it moved
   * to, or null if it stayed.
   */
  syncPeriodToFilters() {
    const classes = this.getFacultyEvents()
      .filter(ev => ev && ev.eventType === 'class' && ev.isoDate)
      .filter(ev => {
        if (!this.searchQuery) return true;
        return (ev.topic && ev.topic.toLowerCase().includes(this.searchQuery)) ||
               (ev.chapter && ev.chapter.toLowerCase().includes(this.searchQuery)) ||
               (ev.subject && ev.subject.toLowerCase().includes(this.searchQuery));
      });

    const target = nearestMonthWithEvents(classes, this.currentYear, this.currentMonth);
    if (!target) return null;

    this.currentYear = target.year;
    this.currentMonth = target.month;

    const inMonth = classes
      .filter(ev => isInMonth(ev.isoDate, target.year, target.month))
      .map(ev => ev.isoDate)
      .sort();
    const anchorIso = inMonth[0] || `${target.year}-${String(target.month + 1).padStart(2, '0')}-01`;
    this.currentWeekStart = startOfWeek(parseIso(anchorIso) || new Date(target.year, target.month, 1));
    this.mobileSelectedDateIso = anchorIso;
    return target;
  }

  /** Human label for a {year, month} pair. */
  formatMonthLabel(year, month) {
    return new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  /** Move the visible period onto the day that holds `iso`. */
  goToIsoDate(iso) {
    const d = parseIso(iso);
    if (!d) return;
    this.currentYear = d.getFullYear();
    this.currentMonth = d.getMonth();
    this.currentWeekStart = startOfWeek(d);
    this.mobileSelectedDateIso = iso;
  }

  getFacultyEvents() {
    const allBatchEvents = this.batchManager.getAllEvents(this.activeBatchId);
    if (!this.currentFaculty || this.currentFaculty === 'All Faculty' || this.currentFaculty === 'all') {
      return allBatchEvents;
    }
    const facultyLower = (this.currentFaculty || '').toLowerCase().trim();

    return allBatchEvents.filter(ev => {
      // Keep cool_off / holiday markers for calendar structure
      if (ev.eventType === 'cool_off' || ev.eventType === 'holiday') return true;
      // Strictly match current faculty
      return ev.eventType === 'class' && ev.faculty && ev.faculty.toLowerCase().includes(facultyLower);
    });
  }

  canFacultyRescheduleCancel(ev) {
    const facultyName = ev?.faculty || (this.currentFaculty !== 'All Faculty' ? this.currentFaculty : null);
    
    // 1. If currently logged in as a specific user, check active user session first
    try {
      if (typeof localStorage !== 'undefined') {
        const storedUser = localStorage.getItem('meded_active_user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          if (u) {
            if (u.canRescheduleCancel === false) return false;
            if (u.email && !reminderEmailService.getFacultyReschedulePermission(u.email)) return false;
            if (u.name && !reminderEmailService.getFacultyReschedulePermission(u.name)) return false;
          }
        }
      }
    } catch (e) {}

    // 2. Check current active faculty selection in UI
    if (this.currentFaculty && this.currentFaculty !== 'All Faculty') {
      if (!reminderEmailService.getFacultyReschedulePermission(this.currentFaculty)) return false;
    }

    // 3. Check event faculty
    if (facultyName) {
      if (!reminderEmailService.getFacultyReschedulePermission(facultyName)) return false;
    }

    return true;
  }

  /**
   * Dynamically calculates the 3 Tabs based on the current view (Month, Week, or Today).
   */
  updateMetricTabs() {
    const allEvents = this.getFacultyEvents();
    const classesOnly = allEvents.filter(ev => ev.eventType === 'class');

    // 1. TODAY's Classes
    const todayClasses = classesOnly.filter(ev => ev.isoDate === this.todayIso);
    const todayCount = todayClasses.length;
    if (this.todayCountEl) this.todayCountEl.textContent = todayCount;
    if (this.todaySubtitleEl) {
      if (todayCount === 0) {
        this.todaySubtitleEl.textContent = 'No clinical sessions today';
      } else {
        const first = todayClasses[0];
        this.todaySubtitleEl.textContent = `${todayCount} Class${todayCount > 1 ? 'es' : ''} • ${first.timings || '7:00 PM - 9:00 PM'}`;
      }
    }

    // Determine current viewed range boundaries
    let rangeStartIso, rangeEndIso;
    const year = this.currentYear;
    const month = this.currentMonth;
    let isThisWeek = false;
    let selectedWeekNum = null;

    if (this.calendarView === 'month') {
      const lastDay = new Date(year, month + 1, 0).getDate();
      rangeStartIso = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      rangeEndIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else if (this.calendarView === 'week') {
      const weekDays = this.getWeekDays(this.currentWeekStart);
      rangeStartIso = weekDays[0].isoDate;
      rangeEndIso = weekDays[6].isoDate;

      isThisWeek = weekDays.some(d => d.isoDate === this.todayIso);
      selectedWeekNum = this.getWeekNumber(weekDays[4].dateObj);
    } else {
      // Timeline
      rangeStartIso = this.todayIso;
      rangeEndIso = '2099-12-31';
    }

    // 2. UPCOMING Classes (Dynamic to viewed period)
    let upcomingClasses;
    if (this.calendarView === 'month') {
      upcomingClasses = classesOnly.filter(ev => {
        return ev.isoDate >= this.todayIso && ev.isoDate <= rangeEndIso && ev.isoDate >= rangeStartIso;
      });
      const _t = parseIso(this.todayIso) || new Date();
      const isCurrentMonth = this.currentYear === _t.getFullYear() && this.currentMonth === _t.getMonth();
      if (this.upcomingScopeBadgeEl) {
        this.upcomingScopeBadgeEl.textContent = isCurrentMonth ? 'This Month' : `${new Date(this.currentYear, this.currentMonth, 1).toLocaleString('en-US', { month: 'short' })} ${this.currentYear}`;
      }
    } else if (this.calendarView === 'week') {
      upcomingClasses = classesOnly.filter(ev => {
        return ev.isoDate >= this.todayIso && ev.isoDate <= rangeEndIso && ev.isoDate >= rangeStartIso;
      });
      if (this.upcomingScopeBadgeEl) {
        this.upcomingScopeBadgeEl.textContent = isThisWeek ? 'This Week' : `Week ${selectedWeekNum}`;
      }
    } else {
      upcomingClasses = classesOnly.filter(ev => ev.isoDate >= this.todayIso);
      if (this.upcomingScopeBadgeEl) this.upcomingScopeBadgeEl.textContent = 'Upcoming Ahead';
    }

    const upcomingCount = upcomingClasses.length;
    if (this.upcomingCountEl) this.upcomingCountEl.textContent = upcomingCount;
    if (this.upcomingSubtitleEl) {
      if (upcomingCount === 0) {
        this.upcomingSubtitleEl.textContent = 'No upcoming classes in period';
      } else {
        const nextEv = upcomingClasses[0];
        const dateParts = nextEv.isoDate ? nextEv.isoDate.split('-') : [];
        const evMonthName = dateParts.length === 3 ? new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2])).toLocaleString('en-US', { month: 'short' }) : 'Oct';
        const dayDisplay = dateParts[2] || '';
        this.upcomingSubtitleEl.textContent = `Next: ${nextEv.dayName ? nextEv.dayName.slice(0, 3) : ''} ${dayDisplay} ${evMonthName} • ${nextEv.subject || 'Lecture'}`;
      }
    }

    // 3. TOTAL Classes (Dynamic to viewed period)
    let totalClassesInScope;
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentMonthName = monthNames[this.currentMonth] || 'October';

    if (this.calendarView === 'month') {
      totalClassesInScope = classesOnly.filter(ev => ev.isoDate >= rangeStartIso && ev.isoDate <= rangeEndIso);
      if (this.totalScopeBadgeEl) this.totalScopeBadgeEl.textContent = `${currentMonthName} Total`;
    } else if (this.calendarView === 'week') {
      totalClassesInScope = classesOnly.filter(ev => ev.isoDate >= rangeStartIso && ev.isoDate <= rangeEndIso);
      if (this.totalScopeBadgeEl) {
        this.totalScopeBadgeEl.textContent = isThisWeek ? 'Week Total' : `Week ${selectedWeekNum} Total`;
      }
    } else {
      totalClassesInScope = classesOnly;
      if (this.totalScopeBadgeEl) this.totalScopeBadgeEl.textContent = 'All Batches';
    }

    const totalCount = totalClassesInScope.length;
    if (this.totalCountEl) this.totalCountEl.textContent = totalCount;
    if (this.totalSubtitleEl) {
      const totalHours = (totalClassesInScope.length * 2.0).toFixed(1);
      this.totalSubtitleEl.textContent = `${totalCount} lectures • ${totalHours} teaching hours`;
    }
  }

  setActiveMetricTab(tabKey) {
    this.activeFilterTab = tabKey;
    [this.tabToday, this.tabUpcoming, this.tabTotal].forEach(t => t?.classList.remove('tab-active-glow'));

    if (tabKey === 'today') {
      this.tabToday?.classList.add('tab-active-glow');
      // Show the period that actually contains today, otherwise the timeline
      // filters to today while the header still shows another month.
      this.todayIso = todayIso();
      this.goToIsoDate(this.todayIso);
      this.switchView('timeline');
    } else if (tabKey === 'upcoming') {
      this.tabUpcoming?.classList.add('tab-active-glow');
      const next = this.getFacultyEvents()
        .filter(ev => ev.eventType === 'class' && ev.isoDate && ev.isoDate >= this.todayIso)
        .map(ev => ev.isoDate)
        .sort()[0];
      if (next) this.goToIsoDate(next);
      this.render();
    } else {
      this.tabTotal?.classList.add('tab-active-glow');
      this.render();
    }
  }

  switchView(view) {
    this.calendarView = view;

    // Synchronize week anchor when switching views
    if (view === 'week') {
      if (this.currentWeekStart.getMonth() !== this.currentMonth || this.currentWeekStart.getFullYear() !== this.currentYear) {
        // Prefer today's week when we are already on today's month.
        const t = parseIso(this.todayIso) || new Date();
        const anchor = (t.getFullYear() === this.currentYear && t.getMonth() === this.currentMonth)
          ? t
          : new Date(this.currentYear, this.currentMonth, 1);
        this.currentWeekStart = startOfWeek(anchor);
      }
    } else if (view === 'month') {
      this.currentMonth = this.currentWeekStart.getMonth();
      this.currentYear = this.currentWeekStart.getFullYear();
    }

    const activeBtnClass = 'px-3.5 py-1 rounded-lg btn-3d-primary font-bold text-white cursor-pointer border-none';
    const inactiveBtnClass = 'px-3.5 py-1 rounded-lg text-[#576058] hover:text-[#2c332d] font-semibold transition-colors cursor-pointer border-none bg-transparent';

    if (this.btnViewMonth) this.btnViewMonth.className = view === 'month' ? activeBtnClass : inactiveBtnClass;
    if (this.btnViewWeek) this.btnViewWeek.className = view === 'week' ? activeBtnClass : inactiveBtnClass;
    if (this.btnViewTimeline) this.btnViewTimeline.className = view === 'timeline' ? activeBtnClass : inactiveBtnClass;

    if (this.viewSectionCalendar) this.viewSectionCalendar.classList.toggle('hidden', view !== 'month');
    if (this.viewSectionWeek) this.viewSectionWeek.classList.toggle('hidden', view !== 'week');
    if (this.viewSectionTimeline) this.viewSectionTimeline.classList.toggle('hidden', view !== 'timeline');

    this.render();
  }

  navigatePeriod(delta) {
    if (this.calendarView === 'month') {
      this.currentMonth += delta;
      if (this.currentMonth > 11) {
        this.currentMonth = 0;
        this.currentYear += 1;
      } else if (this.currentMonth < 0) {
        this.currentMonth = 11;
        this.currentYear -= 1;
      }
      this.currentWeekStart = startOfWeek(new Date(this.currentYear, this.currentMonth, 1));
    } else if (this.calendarView === 'week') {
      const w = startOfWeek(this.currentWeekStart);
      w.setDate(w.getDate() + delta * 7);
      this.currentWeekStart = w;
      this.currentMonth = this.currentWeekStart.getMonth();
      this.currentYear = this.currentWeekStart.getFullYear();
    } else {
      this.currentMonth += delta;
      if (this.currentMonth > 11) {
        this.currentMonth = 0;
        this.currentYear += 1;
      } else if (this.currentMonth < 0) {
        this.currentMonth = 11;
        this.currentYear -= 1;
      }
      this.currentWeekStart = startOfWeek(new Date(this.currentYear, this.currentMonth, 1));
    }
    this.render();
  }

  getWeekDays(startDate) {
    const d = new Date(startDate);
    const day = d.getDay(); // 0 is Sunday
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - day);
    sunday.setHours(0, 0, 0, 0);

    const weekDays = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    for (let i = 0; i < 7; i++) {
      const cur = new Date(sunday);
      cur.setDate(sunday.getDate() + i);
      const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      weekDays.push({
        dateObj: cur,
        isoDate: iso,
        dayName: dayNames[i],
        dayFullName: fullDayNames[i],
        dayNum: cur.getDate(),
        isToday: iso === this.todayIso,
        isSunday: i === 0
      });
    }
    return weekDays;
  }

  /**
   * Returns the ISO-8601 calendar week number for a given date.
   */
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
  }

  render() {
    this.updatePeriodTitle();
    this.updateMetricTabs();
    this.renderCurrentView();
    this.renderMobileView();
  }

  updatePeriodTitle() {
    if (!this.periodTitle) return;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    if (this.calendarView === 'month') {
      this.periodTitle.textContent = `${months[this.currentMonth]} ${this.currentYear}`;
    } else if (this.calendarView === 'week') {
      const weekDays = this.getWeekDays(this.currentWeekStart);
      const sunday = weekDays[0].dateObj;
      const saturday = weekDays[6].dateObj;
      const sunMonth = sunday.toLocaleString('en-US', { month: 'short' });
      const satMonth = saturday.toLocaleString('en-US', { month: 'short' });
      const year = saturday.getFullYear();
      this.periodTitle.textContent = `${sunMonth} ${sunday.getDate()} – ${satMonth} ${saturday.getDate()}, ${year}`;
    } else {
      this.periodTitle.textContent = `Chronological Schedule (${months[this.currentMonth]} ${this.currentYear})`;
    }
  }

  renderCurrentView() {
    if (this.calendarView === 'month') {
      this.renderMonthGrid();
    } else if (this.calendarView === 'week') {
      this.renderWeekTimetable();
    } else {
      this.renderTimeline();
    }
  }

  /**
   * Renders the Month Grid matching Admin's exact card layout and structure.
   */
  renderMonthGrid() {
    const gridContainer = document.getElementById('facultyCalendarGrid');
    if (!gridContainer) return;

    const events = this.getFacultyEvents();
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

    const calendarCells = [];

    // 1. Trailing days from previous month
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
        isToday: dIso === this.todayIso,
        events: eventsByDate[dIso] || []
      });
    }

    // 3. Leading days for next month to complete the 7xN grid
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

      row.forEach(cell => {
        const isSunday = cell.dayOfWeek === 0;

        if (!cell.isCurrentMonth) {
          html += `
            <div class="p-2.5 bg-[#fbf9f5] text-[#a0a8a1] flex flex-col justify-between">
              <span class="text-xs font-semibold text-[#a0a8a1]">${cell.dayNum}</span>
            </div>
          `;
          return;
        }

        // Sunday Cool-Off Day (Exact Admin Card)
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

        // Holiday Check
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

        // Scheduled Classes for logged-in faculty
        const classEvents = cell.events.filter(e => {
          if (e.eventType !== 'class') return false;
          if (!this.searchQuery) return true;
          return (e.topic && e.topic.toLowerCase().includes(this.searchQuery)) ||
                 (e.chapter && e.chapter.toLowerCase().includes(this.searchQuery)) ||
                 (e.subject && e.subject.toLowerCase().includes(this.searchQuery));
        });

        let cellClasses = 'p-2.5 hover:bg-[#fbf9f5] transition-colors flex flex-col justify-between';
        if (cell.isToday) {
          cellClasses = 'p-2.5 bg-[#f5f1ea] hover:bg-[#ede6dc] transition-colors flex flex-col justify-between ring-2 ring-inset ring-[#4a7c59] shadow-sm rounded-xl';
        }

        html += `
          <div class="${cellClasses} calendar-day-box">
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
            const initial = this.getFacultyInitials(ev.faculty);
            const batchBadge = renderBatchBadge(ev.batchName);
            const platformBadges = renderPlatformBadges(ev, { compact: true });

            html += `
              <div class="bg-[#fbf9f5] hover:bg-white border ${cell.isToday ? 'border-2 border-[#4a7c59]' : 'border-[#d8e5dc]'} rounded-xl p-2.5 text-left transition-all shadow-sm cursor-pointer class-card-clickable" data-event-id="${ev.id}">
                <div class="flex items-center justify-between text-[10px] font-bold text-[#3b6347] mb-1 gap-1">
                  <span class="uppercase tracking-wide truncate">${ev.subject || 'Medical Lecture'}</span>
                  <div class="flex items-center gap-1 shrink-0">
                    ${batchBadge}
                    ${platformBadges}
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

    // Attach click listeners to cards to open Lecture Detail modal
    gridContainer.querySelectorAll('.class-card-clickable').forEach(card => {
      card.addEventListener('click', () => {
        const evId = card.getAttribute('data-event-id');
        const ev = events.find(e => e.id === evId);
        if (ev) this.openDetailModal(ev);
      });
    });
  }

  /**
   * Renders the Week Timetable Matrix matching Admin's exact week view.
   */
  renderWeekTimetable() {
    if (!this.weekContainer) return;

    const events = this.getFacultyEvents();
    const weekDays = this.getWeekDays(this.currentWeekStart);
    const weekClasses = [];

    weekDays.forEach(w => {
      const dayClasses = events.filter(e => e.eventType === 'class' && e.isoDate === w.isoDate);
      dayClasses.forEach(c => weekClasses.push(c));
    });

    const sunday = weekDays[0].dateObj;
    const saturday = weekDays[6].dateObj;
    const weekRangeStr = `${sunday.toLocaleString('en-US', { month: 'short' })} ${sunday.getDate()} – ${saturday.toLocaleString('en-US', { month: 'short' })} ${saturday.getDate()}, ${saturday.getFullYear()}`;
    const totalTeachingHours = (weekClasses.length * 2.0).toFixed(1);
    const weekNum = this.getWeekNumber(weekDays[4].dateObj);
    const isThisWeek = weekDays.some(d => d.isoDate === this.todayIso);

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
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3] badge-3d">${isThisWeek ? 'This Week • Teaching Schedule' : `Week ${weekNum} • Teaching Schedule`}</span>
            </div>
            <p class="text-xs text-[#576058] mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span class="material-symbols-outlined text-[15px] text-[#4a7c59]">date_range</span>
              <span class="font-bold text-[#2c332d]">${weekRangeStr}</span>
              <span class="text-[#8b958c]">•</span>
              <span>Faculty: <strong class="text-[#2c332d]">${this.currentFaculty}</strong></span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="flex items-center gap-3 text-xs bg-white border border-[#ded5c6] rounded-xl px-3.5 py-2 shadow-xs">
            <div class="text-center border-r border-[#ded5c6] pr-3">
              <span class="block text-[10px] uppercase font-bold text-[#68736a]">${isThisWeek ? 'This Week' : `Week ${weekNum}`} Lectures</span>
              <span class="font-headline font-bold text-base text-[#2c332d]">${weekClasses.length}</span>
            </div>
            <div class="text-center">
              <span class="block text-[10px] uppercase font-bold text-[#68736a]">Teaching Hours</span>
              <span class="font-headline font-bold text-base text-[#4a7c59]">${totalTeachingHours}h</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 7-DAY TIMETABLE COLUMNS GRID -->
      <div class="panel-3d rounded-2xl overflow-hidden mb-6">
        <!-- Week Column Headers -->
        <div class="grid grid-cols-7 border-b border-[#ded5c6] bg-[#f7f4ed] text-center text-xs font-bold divide-x divide-[#ded5c6]">
    `;

    weekDays.forEach(w => {
      html += `
        <div class="py-3 px-1 ${w.isToday ? 'bg-[#eef4f0] text-[#3b6347]' : (w.isSunday ? 'text-[#c26d3e]' : 'text-[#2c332d]')}" data-iso="${w.isoDate}">
          <span class="block text-[11px] font-extrabold uppercase tracking-wider">${w.dayName}</span>
          <span class="inline-block mt-0.5 text-base font-headline font-bold ${w.isToday ? 'w-7 h-7 rounded-full bg-[#4a7c59] text-white leading-7 mx-auto shadow-xs' : ''}">${w.dayNum}</span>
          ${w.isToday ? '<span class="block text-[9px] font-bold text-[#4a7c59] uppercase">Today</span>' : ''}
        </div>
      `;
    });

    html += `
        </div>
        <!-- Week Day Body -->
        <div class="grid grid-cols-7 divide-x divide-[#ece5d8] min-h-[360px] bg-white">
    `;

    weekDays.forEach(w => {
      const dayClasses = events.filter(e => e.eventType === 'class' && e.isoDate === w.isoDate);

      html += `<div class="p-2.5 flex flex-col gap-2 ${w.isToday ? 'bg-[#faf8f4]' : ''}">`;

      if (w.isSunday) {
        html += `
          <div class="rounded-xl border border-dashed border-[#e1ba9f] p-3 text-center my-auto bg-[#faf6f0]">
            <span class="material-symbols-outlined text-[#c26d3e] text-[22px]">self_improvement</span>
            <p class="text-xs font-bold text-[#c26d3e] mt-1 font-headline">Cool Off</p>
            <p class="text-[10px] text-[#68736a] mt-0.5">Self Study Day</p>
          </div>
        `;
      } else if (dayClasses.length === 0) {
        html += `
          <div class="my-auto text-center py-8">
            <span class="material-symbols-outlined text-[#8b958c] text-[20px] opacity-40">event_available</span>
            <p class="text-[11px] font-medium text-[#8b958c] mt-1">No sessions</p>
          </div>
        `;
      } else {
        dayClasses.forEach(c => {
          const batchBadge = renderBatchBadge(c.batchName);
          const platformBadges = renderPlatformBadges(c, { compact: true });
          const initial = this.getFacultyInitials(c.faculty);

          html += `
            <div class="card-3d p-3 rounded-xl border border-[#ded5c6] hover:border-[#4a7c59] transition-all cursor-pointer class-card-clickable" data-event-id="${c.id}">
              <div class="flex items-center justify-between text-[10px] font-bold text-[#3b6347] mb-1 gap-1">
                <span class="uppercase tracking-wide truncate">${c.subject || 'Medical Lecture'}</span>
                <div class="flex items-center gap-1 shrink-0">
                  ${batchBadge}
                  ${platformBadges}
                </div>
              </div>
              <h4 class="text-xs font-bold text-[#2c332d] leading-snug line-clamp-2 mb-1.5">
                ${c.topic || c.chapter}
              </h4>
              <div class="text-[11px] text-[#576058] mb-1.5 flex items-center gap-1.5">
                <div class="w-4 h-4 rounded-full bg-[#f4ece1] border border-[#705c30] flex items-center justify-center text-[8px] font-bold text-[#705c30] shrink-0">
                  ${initial}
                </div>
                <span class="truncate font-medium">${c.faculty}</span>
              </div>
              <div class="text-[10px] text-[#4a7c59] font-mono font-bold">
                ${(c.timings || '7:00 PM - 9:00 PM').replace(/\s*to\s*/i, ' – ')}
              </div>
              <div class="text-[10px] text-[#68736a] mt-1 pt-1 border-t border-black/5 flex items-center justify-between">
                <span>Duration:</span>
                <strong class="text-[#2c332d]">${c.duration || '2 Hours'}</strong>
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
    `;

    this.weekContainer.innerHTML = html;

    // Attach click listeners to cards
    this.weekContainer.querySelectorAll('.class-card-clickable').forEach(card => {
      card.addEventListener('click', () => {
        const evId = card.getAttribute('data-event-id');
        const ev = events.find(e => e.id === evId);
        if (ev) this.openDetailModal(ev);
      });
    });
  }

  /**
   * Renders the Timeline View matching Admin's timeline agenda.
   */
  renderTimeline() {
    if (!this.timelineContainer) return;

    const facultyEvents = this.getFacultyEvents();
    let events = facultyEvents.filter(ev => {
      if (ev.eventType !== 'class') return false;
      if (!this.searchQuery) return true;
      return (ev.topic && ev.topic.toLowerCase().includes(this.searchQuery)) ||
             (ev.chapter && ev.chapter.toLowerCase().includes(this.searchQuery)) ||
             (ev.subject && ev.subject.toLowerCase().includes(this.searchQuery));
    });

    if (this.activeFilterTab === 'today') {
      events = events.filter(ev => ev.isoDate === this.todayIso);
    } else if (this.activeFilterTab === 'upcoming') {
      events = events.filter(ev => ev.isoDate >= this.todayIso);
    }

    if (events.length === 0) {
      this.timelineContainer.innerHTML = `
        <div class="panel-3d p-12 rounded-2xl text-center text-[#68736a]">
          <span class="material-symbols-outlined text-[40px] text-[#8b958c] mb-2">event_busy</span>
          <h4 class="font-headline font-bold text-base text-[#2c332d]">No classes scheduled</h4>
          <p class="text-xs mt-1 text-[#788279]">Try switching to Month View or selecting another faculty profile.</p>
        </div>
      `;
      return;
    }

    let html = `
      <div class="panel-3d rounded-2xl p-5 mb-6">
        <div class="flex items-center justify-between pb-3.5 mb-4 border-b border-[#e5dfd5]">
          <div>
            <h3 class="font-headline font-bold text-lg text-[#2c332d]">Chronological Teaching Stream</h3>
            <p class="text-xs text-[#68736a] mt-0.5">Assigned clinical lectures & syllabus milestones</p>
          </div>
          <span class="text-xs font-bold text-[#4a7c59] bg-[#eef4f0] px-3 py-1 rounded-xl border border-[#cde0d3]">
            ${events.length} Classes in Agenda
          </span>
        </div>
        <div class="space-y-3">
    `;

    events.forEach(ev => {
      const isToday = ev.isoDate === this.todayIso;
      const initial = this.getFacultyInitials(ev.faculty);

      html += `
        <div class="card-3d p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border transition-all cursor-pointer class-card-clickable ${
          isToday ? 'border-[#4a7c59] bg-[#fcfdfc] ring-1 ring-[#4a7c59]' : 'hover:border-[#4a7c59]'
        }" data-event-id="${ev.id}">
          <div class="flex items-start gap-3.5">
            <!-- Date badge -->
            <div class="w-14 h-14 rounded-xl flex flex-col items-center justify-center text-center shrink-0 border ${
              isToday ? 'bg-[#4a7c59] text-white border-[#3c6749] shadow-xs' : 'bg-[#f4efe6] text-[#2c332d] border-[#ded5c6]'
            }">
              <span class="text-[9px] uppercase font-bold tracking-wider">${ev.dayName ? ev.dayName.slice(0, 3) : 'DAY'}</span>
              <span class="font-headline font-bold text-lg leading-none">${ev.dayNumber || (ev.isoDate ? ev.isoDate.split('-')[2] : '15')}</span>
              <span class="text-[8px] uppercase font-semibold">${ev.monthName ? ev.monthName.slice(0, 3) : 'OCT'}</span>
            </div>

            <!-- Details -->
            <div>
              <div class="flex items-center gap-2 mb-1 flex-wrap">
                <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3]">
                  ${ev.subject || 'Biochemistry'}
                </span>
                ${renderBatchBadge(ev.batchName)}
                ${renderPlatformBadges(ev, { compact: true })}
                <span class="text-xs font-mono font-bold text-[#4a7c59] flex items-center gap-1">
                  <span class="material-symbols-outlined text-[13px]">schedule</span>
                  ${(ev.timings || '7:00 PM - 9:00 PM').replace(/\s*to\s*/i, ' – ')}
                </span>
                ${isToday ? '<span class="text-[9px] font-bold uppercase bg-[#4a7c59] text-white px-1.5 py-0.2 rounded-md">Today</span>' : ''}
              </div>
              <h4 class="font-headline font-bold text-sm sm:text-base text-[#2c332d] leading-snug">
                ${ev.topic || ev.chapter || 'Lecture Session'}
              </h4>
              <p class="text-xs text-[#68736a] mt-0.5">
                ${ev.faculty ? `Faculty: <strong class="text-[#2c332d]">${ev.faculty}</strong> • ` : ''}${ev.chapter ? `Chapter: ${ev.chapter} • ` : ''}Duration: ${ev.duration || '2 Hours'}
              </p>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 self-end sm:self-center shrink-0">
            <button class="btn-3d-secondary px-3 py-1.5 rounded-xl text-xs font-bold text-[#2c332d] flex items-center gap-1 cursor-pointer">
              <span class="material-symbols-outlined text-[15px] text-[#4a7c59]">visibility</span>
              <span>Details</span>
            </button>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    this.timelineContainer.innerHTML = html;

    this.timelineContainer.querySelectorAll('.class-card-clickable').forEach(card => {
      card.addEventListener('click', () => {
        const evId = card.getAttribute('data-event-id');
        const ev = events.find(e => e.id === evId);
        if (ev) this.openDetailModal(ev);
      });
    });
  }

  /**
   * Opens Lecture Detail Modal matching Admin
   */
  openDetailModal(ev) {
    if (!this.detailModal) return;
    this.currentDetailEvent = ev;

    const modalSubjectBadge = document.getElementById('modalSubjectBadge');
    const modalDetailTitle = document.getElementById('modalDetailTitle');
    const modalDetailBatch = document.getElementById('modalDetailBatch');
    const modalDetailDate = document.getElementById('modalDetailDate');
    const modalDetailTimings = document.getElementById('modalDetailTimings');
    const modalDetailDuration = document.getElementById('modalDetailDuration');
    const modalDetailFaculty = document.getElementById('modalDetailFaculty');
    const modalDetailTopic = document.getElementById('modalDetailTopic');

    // Format Date & Day nicely
    let formattedDate = ev.dateRaw || ev.isoDate || 'Scheduled Date';
    if (ev.isoDate) {
      try {
        const [y, m, d] = ev.isoDate.split('-').map(Number);
        if (y && m && d) {
          const dateObj = new Date(y, m - 1, d);
          const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          formattedDate = `${fullDays[dateObj.getDay()]}, ${fullMonths[dateObj.getMonth()]} ${d}, ${y}`;
        }
      } catch (e) {}
    }

    if (modalSubjectBadge) modalSubjectBadge.textContent = ev.subject || 'Clinical Lecture';
    if (modalDetailTitle) modalDetailTitle.textContent = ev.topic || ev.chapter || 'Lecture Session';
    if (modalDetailBatch) {
      modalDetailBatch.innerHTML = `${renderBatchBadge(ev.batchName || 'PW MedEd Batch')} ${renderPlatformBadges(ev, { size: 'sm' })} ${ev.chapter ? `• ${ev.chapter}` : ''}`;
      modalDetailBatch.className = 'inline-flex items-center gap-1.5 flex-wrap';
    }
    if (modalDetailDate) modalDetailDate.textContent = formattedDate;
    if (modalDetailTimings) modalDetailTimings.textContent = (ev.timings || '7:00 PM - 9:00 PM').replace(/\s*to\s*/i, ' – ');
    if (modalDetailDuration) modalDetailDuration.textContent = ev.duration ? `• ${ev.duration}` : '• 2 Hours';
    const facultyName = ev.faculty || this.currentFaculty;
    if (modalDetailFaculty) modalDetailFaculty.textContent = facultyName;
    if (modalDetailTopic) modalDetailTopic.textContent = ev.topic ? `${ev.topic} (Chapter: ${ev.chapter || 'General'})` : 'Detailed curricular session according to NMC guidelines.';

    // Check permission for Reschedule & Cancellation option at faculty level
    const canRescheduleCancel = this.canFacultyRescheduleCancel(ev);
    const actionGroup = document.getElementById('modalDetailActionButtonsGroup');
    const closeBtn = document.getElementById('modalDetailCloseBtn');
    const footerEl = document.getElementById('modalDetailFooter');

    if (actionGroup && closeBtn) {
      if (canRescheduleCancel) {
        actionGroup.classList.remove('hidden');
        closeBtn.className = 'btn-3d-primary px-5 py-2 rounded-xl text-xs font-bold cursor-pointer';
        if (footerEl) {
          footerEl.classList.remove('justify-center');
          footerEl.classList.add('justify-between');
        }
      } else {
        actionGroup.classList.add('hidden');
        closeBtn.className = 'btn-3d-primary w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer text-center shadow-md';
        if (footerEl) {
          footerEl.classList.remove('justify-between');
          footerEl.classList.add('justify-center');
        }
      }
    }

    // Delivery Platform info
    let platformEl = document.getElementById('facultyModalPlatformText');
    if (!platformEl) {
      const container = this.detailModal.querySelector('.space-y-3');
      if (container) {
        const row = document.createElement('div');
        row.className = 'text-xs text-[#576058] bg-[#fbf9f5] p-2.5 rounded-xl border border-[#e8e2d8] flex items-center justify-between';
        row.innerHTML = `<span class="font-semibold text-[#68736a]">Delivery Platform:</span><span id="facultyModalPlatformText" class="font-bold text-[#2c332d] flex items-center gap-1.5"></span>`;
        container.insertBefore(row, container.firstChild);
        platformEl = document.getElementById('facultyModalPlatformText');
      }
    }
    if (platformEl) {
      platformEl.innerHTML = `${getDeliveryPlatformText(ev)} ${renderPlatformBadges(ev, { size: 'sm' })}`;
    }

    if (this.modalGCalBtn) {
      this.modalGCalBtn.href = generateGoogleCalendarUrl(ev);
    }

    if (this.modalIcsBtn) {
      this.modalIcsBtn.onclick = () => {
        const icsContent = generateIcsContent([ev], `${ev.faculty || 'Faculty'}_Class`);
        downloadIcsFile(icsContent, `PW_MedEd_${ev.isoDate}_${ev.subject || 'Lecture'}.ics`);
        this.showToast('Downloaded .ics event');
      };
    }

    this.detailModal.classList.remove('hidden');
  }

  closeDetailModal() {
    this.detailModal?.classList.add('hidden');
  }


  exportScheduleIcs() {
    const facultyEvents = this.getFacultyEvents().filter(ev => ev.eventType === 'class');
    if (facultyEvents.length === 0) {
      this.showToast('No classes to export');
      return;
    }
    const cleanName = this.currentFaculty.replace(/[^a-zA-Z0-9]/g, '_');
    const icsContent = generateIcsContent(facultyEvents, `${this.currentFaculty} Schedule`);
    downloadIcsFile(icsContent, `PW_MedEd_${cleanName}_Schedule.ics`);
    this.showToast(`Exported ${facultyEvents.length} classes to .ics`);
  }

  showToast(text) {
    const toast = document.getElementById('facultyToast');
    const toastText = document.getElementById('facultyToastText');
    if (toast && toastText) {
      toastText.textContent = text;
      toast.classList.remove('opacity-0', 'translate-y-10', 'pointer-events-none');
      setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-10', 'pointer-events-none');
      }, 3000);
    }
  }

  // --- FACULTY NOTIFICATION DRAWER & EMAIL PREVIEWS ---
  setupFacultyNotificationDrawer() {
    const openBtn = document.getElementById('openFacultyNotificationBtn');
    const modal = document.getElementById('facultyNotificationModal');
    const drawer = document.getElementById('facultyNotificationDrawer');
    const backdrop = document.getElementById('facultyNotificationBackdrop');
    const closeBtn = document.getElementById('closeFacultyNotificationBtn');
    const markAllReadBtn = document.getElementById('facultyMarkAllReadBtn');

    const openDrawer = () => {
      this.renderFacultyNotifications();
      modal?.classList.remove('hidden', 'pointer-events-none');
      backdrop?.classList.remove('opacity-0', 'pointer-events-none');
      backdrop?.classList.add('opacity-100');
      drawer?.classList.remove('translate-x-full');
      drawer?.classList.add('translate-x-0');
    };

    const closeDrawer = () => {
      drawer?.classList.remove('translate-x-0');
      drawer?.classList.add('translate-x-full');
      backdrop?.classList.remove('opacity-100');
      backdrop?.classList.add('opacity-0', 'pointer-events-none');
      setTimeout(() => {
        if (drawer?.classList.contains('translate-x-full')) {
          modal?.classList.add('hidden', 'pointer-events-none');
        }
      }, 300);
    };

    openBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      openDrawer();
    });

    closeBtn?.addEventListener('click', closeDrawer);
    backdrop?.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !drawer?.classList.contains('translate-x-full')) {
        closeDrawer();
      }
    });

    markAllReadBtn?.addEventListener('click', () => {
      reminderEmailService.markAllAsRead('faculty');
      this.renderFacultyNotifications();
      this.showToast('All faculty notifications marked as read.');
    });

    // Cross-tab and service event sync
    window.addEventListener('meded:email_dispatched', (e) => {
      this.renderFacultyNotifications();
      const detail = e.detail;
      const myClean = (this.currentFaculty || '').replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().toLowerCase();
      const notifClean = (detail?.faculty?.name || '').replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().toLowerCase();
      if (notifClean && (notifClean.includes(myClean) || myClean.includes(notifClean))) {
        this.showToast(`📩 Class reminder email received for: ${detail.event?.topic || 'Upcoming Lecture'}`);
      }
    });

    window.addEventListener('meded:notifications_updated', () => {
      this.renderFacultyNotifications();
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'meded_notifications' || e.key === 'meded_sync_trigger') {
        this.renderFacultyNotifications();
      }
    });
  }

  renderFacultyNotifications() {
    const feed = document.getElementById('facultyNotificationFeed');
    const badgeCount = document.getElementById('facultyNotifBadgeCount');
    const badgePulse = document.getElementById('facultyNotifPulse');
    const badgeDot = document.getElementById('facultyNotifDot');
    const filterBadge = document.getElementById('facultyNotifBadgeFilterCount');
    const footerName = document.getElementById('facultyDrawerFooterName');

    if (footerName) {
      footerName.textContent = this.currentFaculty;
    }

    const notifs = reminderEmailService.getFacultyNotifications(this.currentFaculty);
    const unreadCount = reminderEmailService.getFacultyUnreadCount(this.currentFaculty);

    if (badgeCount) {
      badgeCount.textContent = unreadCount;
      badgeCount.classList.toggle('hidden', unreadCount === 0);
    }
    if (badgePulse && badgeDot) {
      badgePulse.classList.toggle('hidden', unreadCount === 0);
      badgeDot.classList.toggle('hidden', unreadCount === 0);
    }
    if (filterBadge) {
      filterBadge.textContent = `${notifs.length} Received`;
    }

    if (!feed) return;

    if (notifs.length === 0) {
      feed.innerHTML = `
        <div class="py-12 px-4 text-center text-[#68736a] space-y-2.5">
          <div class="w-12 h-12 mx-auto rounded-2xl bg-[#f4efe6] border border-[#ded5c6] flex items-center justify-center text-[#8b958c] shadow-xs">
            <span class="material-symbols-outlined text-[26px]">mark_email_read</span>
          </div>
          <p class="text-xs font-bold text-[#2c332d]">No class reminders yet</p>
          <p class="text-[11px] text-[#788279] max-w-xs mx-auto leading-relaxed">
            Automated class reminders for <strong>${this.currentFaculty}</strong> will appear here prior to scheduled lecture commencement.
          </p>
        </div>
      `;
      return;
    }

    feed.innerHTML = notifs.map(n => {
      const timeAgo = this.formatTimeAgo(n.timestamp);
      const isUnread = !n.read;

      if (n.type === 'email_reminder_received') {
        return `
          <div class="p-3.5 rounded-xl bg-[#fbf9f5] border ${isUnread ? 'border-[#4a7c59] bg-[#f8faf8] shadow-xs' : 'border-[#ded5c6]'} card-3d space-y-2.5 transition-all">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-bold text-[#4a7c59] bg-[#eef4f0] px-2 py-0.5 rounded border border-[#cde0d3] badge-3d flex items-center gap-1">
                  <span class="material-symbols-outlined text-[13px]">mail</span> Class Reminder
                </span>
                ${isUnread ? '<span class="w-2 h-2 rounded-full bg-[#4a7c59]"></span>' : ''}
              </div>
              <span class="text-[10px] text-[#8b958c] font-medium">${timeAgo}</span>
            </div>

            <div>
              <p class="text-xs font-bold text-[#2c332d] leading-snug">${n.topic || 'Curricular Lecture Session'}</p>
              <div class="flex items-center gap-2 mt-1.5 text-[10px] text-[#576058] flex-wrap">
                <span class="font-bold text-[#2d4d37]">⏰ ${n.timings || '7:00 PM'}</span>
                <span>•</span>
                <span class="bg-[#fbf3ec] text-[#c26d3e] font-semibold px-1.5 py-0.2 rounded border border-[#eed9cc]">Commencing in ${n.leadDurationText || '30 Mins'}</span>
                <span>•</span>
                <span class="bg-[#eef4f0] text-[#3b6347] font-semibold px-1.5 py-0.2 rounded border border-[#cde0d3]">${n.subject || 'Medicine'}</span>
              </div>
            </div>

            <div class="p-2 rounded-lg bg-white border border-[#e8e2d8] text-[10.5px] text-[#68736a] space-y-1">
              <div class="flex items-center justify-between">
                <span>Delivered To:</span>
                <span class="font-mono font-semibold text-[#2c332d] truncate max-w-[210px]">${n.recipientEmail}</span>
              </div>
              <div class="flex items-center justify-between text-[10px] text-[#8b958c]">
                <span>Sender:</span>
                <span class="truncate max-w-[210px]">${n.senderEmail || 'academic-reminders@pwmeded.edu.in'}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-[#e8e2d8] flex items-center justify-between gap-2">
              <a href="https://meet.google.com/pwm-med" target="_blank" class="text-xs font-bold text-[#4a7c59] hover:text-[#2d4d37] flex items-center gap-1">
                <span class="material-symbols-outlined text-[15px]">video_call</span> Join Room
              </a>
              <button type="button" class="btn-preview-faculty-email px-2.5 py-1 rounded-lg bg-[#eef4f0] hover:bg-[#d8e8dc] text-[#2d4d37] text-xs font-bold flex items-center gap-1 border border-[#cde0d3] cursor-pointer transition-colors shadow-xs" data-notif-id="${n.id}">
                <span class="material-symbols-outlined text-[14px]">visibility</span> View Email
              </button>
            </div>
          </div>
        `;
      }

      // Default system alert
      return `
        <div class="p-3.5 rounded-xl bg-[#fbf9f5] border border-[#ded5c6] card-3d space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-[#4a7c59] bg-[#eef4f0] px-2 py-0.5 rounded uppercase border border-[#cde0d3] badge-3d">
              ${n.title || 'System Notification'}
            </span>
            <span class="text-[10px] text-[#8b958c] font-medium">${timeAgo}</span>
          </div>
          <p class="text-xs font-bold text-[#2c332d]">${n.title}</p>
          <p class="text-[11px] text-[#576058] leading-relaxed">${n.body}</p>
        </div>
      `;
    }).join('');

    // Bind "View Email" buttons
    feed.querySelectorAll('.btn-preview-faculty-email').forEach(btn => {
      btn.addEventListener('click', () => {
        const notifId = btn.getAttribute('data-notif-id');
        const notif = notifs.find(n => n.id === notifId);
        if (notif) {
          reminderEmailService.markNotificationAsRead(notifId);
          this.openFacultyEmailPreview({
            from: notif.senderEmail,
            to: `${notif.facultyName} <${notif.recipientEmail}>`,
            subject: `[PW MedEd] Class Reminder: ${notif.topic}`,
            html: notif.emailHtml
          });
          this.renderFacultyNotifications();
        }
      });
    });
  }

  setupFacultyEmailPreviewModal() {
    const modal = document.getElementById('facultyEmailPreviewModal');
    const closeTop = document.getElementById('closeFacultyEmailPreviewBtn');
    const closeBottom = document.getElementById('closeFacultyEmailPreviewBottomBtn');

    const closeModal = () => modal?.classList.add('hidden');

    closeTop?.addEventListener('click', closeModal);
    closeBottom?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal?.classList.contains('hidden')) {
        closeModal();
      }
    });
  }

  openFacultyEmailPreview({ from, to, subject, html }) {
    const modal = document.getElementById('facultyEmailPreviewModal');
    const fromEl = document.getElementById('facultyEmailPreviewFrom');
    const toEl = document.getElementById('facultyEmailPreviewTo');
    const subjectEl = document.getElementById('facultyEmailPreviewSubject');
    const container = document.getElementById('facultyEmailPreviewContainer');

    if (fromEl) fromEl.textContent = from || 'academic-reminders@pwmeded.edu.in';
    if (toEl) toEl.textContent = to || 'Registered Faculty';
    if (subjectEl) subjectEl.textContent = subject || '[PW MedEd] Class Reminder';

    if (container) {
      container.innerHTML = html || '<div class="p-6 text-center text-xs text-[#68736a]">No preview available</div>';
    }

    modal?.classList.remove('hidden');
  }

  formatTimeAgo(isoString) {
    if (!isoString) return 'Recently';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  /* ========================================================================= */
  /* MOBILE RESPONSIVE DASHBOARD METHODS                                      */
  /* ========================================================================= */

  bindMobileDOM() {
    this.mobileBatchBtn = document.getElementById('mobileBatchBtn');
    this.mobileBatchLabel = document.getElementById('mobileBatchLabel');
    this.mobileBatchDropdown = document.getElementById('mobileBatchDropdown');
    this.mobileBatchDropdownList = document.getElementById('mobileBatchDropdownList');

    this.mobileProfileBtn = document.getElementById('mobileProfileBtn');
    this.mobileProfileDropdown = document.getElementById('mobileProfileDropdown');
    this.mobileFacultyProfilesList = document.getElementById('mobileFacultyProfilesList');

    this.mobileMetricToday = document.getElementById('mobileMetricToday');
    this.mobileTodayCount = document.getElementById('mobileTodayCount');
    this.mobileTodaySubtitle = document.getElementById('mobileTodaySubtitle');

    this.mobileMetricUpcoming = document.getElementById('mobileMetricUpcoming');
    this.mobileUpcomingCount = document.getElementById('mobileUpcomingCount');
    this.mobileUpcomingSubtitle = document.getElementById('mobileUpcomingSubtitle');

    this.mobileMetricTotal = document.getElementById('mobileMetricTotal');
    this.mobileTotalCount = document.getElementById('mobileTotalCount');
    this.mobileTotalSubtitle = document.getElementById('mobileTotalSubtitle');

    this.mobilePeriodTitle = document.getElementById('mobilePeriodTitle');
    this.mobileFacultySubtitle = document.getElementById('mobileFacultySubtitle');
    this.mobilePrevPeriodBtn = document.getElementById('mobilePrevPeriodBtn');
    this.mobileTodayPeriodBtn = document.getElementById('mobileTodayPeriodBtn');
    this.mobileNextPeriodBtn = document.getElementById('mobileNextPeriodBtn');

    this.mobileBtnViewMonth = document.getElementById('mobileBtnViewMonth');
    this.mobileBtnViewWeek = document.getElementById('mobileBtnViewWeek');
    this.mobileBtnViewAgenda = document.getElementById('mobileBtnViewAgenda');

    this.mobileViewSectionMonth = document.getElementById('mobileViewSectionMonth');
    this.mobileViewSectionWeek = document.getElementById('mobileViewSectionWeek');
    this.mobileViewSectionAgenda = document.getElementById('mobileViewSectionAgenda');

    this.mobileCalendarDaysGrid = document.getElementById('mobileCalendarDaysGrid');
    this.mobileSelectedDateTitle = document.getElementById('mobileSelectedDateTitle');
    this.mobileSelectedDateBadge = document.getElementById('mobileSelectedDateBadge');
    this.mobileSelectedScheduleContainer = document.getElementById('mobileSelectedScheduleContainer');

    this.mobileUpcomingLecturesHeader = document.getElementById('mobileUpcomingLecturesHeader');
    this.mobileUpcomingLecturesContainer = document.getElementById('mobileUpcomingLecturesContainer');

    this.mobileWeekScheduleContainer = document.getElementById('mobileWeekScheduleContainer');
    this.mobileWeekRangeBadge = document.getElementById('mobileWeekRangeBadge');
    this.mobileWeekDaysGrid = document.getElementById('mobileWeekDaysGrid');
    this.mobileSharedScheduleSections = document.getElementById('mobileSharedScheduleSections');
    this.mobileWeekLiveCount = document.getElementById('mobileWeekLiveCount');
    this.mobileWeekLegendLive = document.getElementById('mobileWeekLegendLive');
    this.mobileWeekLegendToday = document.getElementById('mobileWeekLegendToday');

    this.mobileAgendaScheduleContainer = document.getElementById('mobileAgendaScheduleContainer');
    this.mobileAgendaCountBadge = document.getElementById('mobileAgendaCountBadge');

    // Notifications
    this.mobileNotificationBtn = document.getElementById('mobileNotificationBtn');
    this.mobileNotificationDrawer = document.getElementById('notification-drawer');
    this.mobileNotificationBackdrop = document.getElementById('mobileNotificationBackdrop');
    this.mobileNotificationCloseBtn = document.getElementById('mobileNotificationCloseBtn');
    this.mobileNotificationDismissBtn = document.getElementById('mobileNotificationDismissBtn');
    this.mobileNotificationMarkReadBtn = document.getElementById('mobileNotificationMarkReadBtn');
    this.mobileNotificationFeed = document.getElementById('mobileNotificationFeed');
    this.mobileNotificationBadge = document.getElementById('mobileNotificationBadge');

    // Lecture Bottom Sheet
    this.mobileLectureBackdrop = document.getElementById('lecture-modal-backdrop');
    this.mobileLectureSheet = document.getElementById('lecture-bottom-sheet');
    this.mobileModalCloseBtn = document.getElementById('mobileModalCloseBtn');
    this.mobileModalCloseSecondaryBtn = document.getElementById('mobileModalCloseSecondaryBtn');
    this.mobileModalStartBtn = document.getElementById('mobileModalStartBtn');
    this.mobileModalRescheduleBtn = document.getElementById('mobileModalRescheduleBtn');
    this.mobileModalCancelBtn = document.getElementById('mobileModalCancelBtn');

    // Batch toggle
    this.mobileBatchBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.mobileBatchDropdown?.classList.toggle('hidden');
      this.mobileProfileDropdown?.classList.add('hidden');
    });

    // Profile toggle
    this.mobileProfileBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.mobileProfileDropdown?.classList.toggle('hidden');
      this.mobileBatchDropdown?.classList.add('hidden');
    });

    // Click outside to close mobile dropdowns
    document.addEventListener('click', () => {
      this.mobileBatchDropdown?.classList.add('hidden');
      this.mobileProfileDropdown?.classList.add('hidden');
    });

    // Mobile period navigation
    this.mobilePrevPeriodBtn?.addEventListener('click', () => this.navigateMobilePeriod(-1));
    this.mobileNextPeriodBtn?.addEventListener('click', () => this.navigateMobilePeriod(1));
    this.mobileTodayPeriodBtn?.addEventListener('click', () => {
      this.todayIso = todayIso();
      this.goToIsoDate(this.todayIso);
      this.render();
    });

    // Mobile segmented views
    this.mobileBtnViewMonth?.addEventListener('click', () => this.switchMobileView('month'));
    this.mobileBtnViewWeek?.addEventListener('click', () => this.switchMobileView('week'));
    this.mobileBtnViewAgenda?.addEventListener('click', () => this.switchMobileView('agenda'));

    // Mobile metrics click
    this.mobileMetricToday?.addEventListener('click', () => {
      this.todayIso = todayIso();
      this.goToIsoDate(this.todayIso);
      this.switchMobileView('month');
      this.renderMobileView();
    });

    this.mobileMetricUpcoming?.addEventListener('click', () => {
      const next = this.getFacultyEvents()
        .filter(e => e.eventType === 'class' && e.isoDate && e.isoDate >= this.todayIso)
        .map(e => e.isoDate)
        .sort()[0];
      if (next) this.goToIsoDate(next);
      this.switchMobileView('month');
      this.renderMobileView();
    });

    this.mobileMetricTotal?.addEventListener('click', () => {
      this.switchMobileView('agenda');
    });


    // Notifications
    this.mobileNotificationBtn?.addEventListener('click', () => this.openMobileNotifications());
    this.mobileNotificationCloseBtn?.addEventListener('click', () => this.closeMobileNotifications());
    this.mobileNotificationBackdrop?.addEventListener('click', () => this.closeMobileNotifications());
    this.mobileNotificationDismissBtn?.addEventListener('click', () => this.closeMobileNotifications());
    this.mobileNotificationMarkReadBtn?.addEventListener('click', () => this.markMobileNotificationsRead());

    // Modal
    this.mobileModalCloseBtn?.addEventListener('click', () => this.closeMobileLectureDetail());
    this.mobileModalCloseSecondaryBtn?.addEventListener('click', () => this.closeMobileLectureDetail());
    this.mobileModalRescheduleBtn?.addEventListener('click', () => this.handleMobileRescheduleLecture());
    this.mobileModalCancelBtn?.addEventListener('click', () => this.handleMobileCancelLecture());
    this.mobileLectureBackdrop?.addEventListener('click', (e) => {
      if (e.target === this.mobileLectureBackdrop) this.closeMobileLectureDetail();
    });
    this.mobileModalStartBtn?.addEventListener('click', () => this.startMobileLiveSession());
  }

  switchMobileView(view) {
    this.mobileView = view;
    
    // Update segmented buttons
    const activeClass = 'py-1.5 text-xs font-bold rounded-lg bg-terra-forest text-white text-center shadow-sm transition-all cursor-pointer';
    const inactiveClass = 'py-1.5 text-xs font-semibold rounded-lg text-terra-muted hover:text-terra-charcoal text-center transition-all cursor-pointer bg-transparent';

    if (this.mobileBtnViewMonth) this.mobileBtnViewMonth.className = view === 'month' ? activeClass : inactiveClass;
    if (this.mobileBtnViewWeek) this.mobileBtnViewWeek.className = view === 'week' ? activeClass : inactiveClass;
    if (this.mobileBtnViewAgenda) this.mobileBtnViewAgenda.className = view === 'agenda' ? activeClass : inactiveClass;

    if (this.mobileViewSectionMonth) this.mobileViewSectionMonth.classList.toggle('hidden', view !== 'month');
    if (this.mobileViewSectionWeek) this.mobileViewSectionWeek.classList.toggle('hidden', view !== 'week');
    if (this.mobileViewSectionAgenda) this.mobileViewSectionAgenda.classList.toggle('hidden', view !== 'agenda');
    if (this.mobileSharedScheduleSections) this.mobileSharedScheduleSections.classList.toggle('hidden', view === 'agenda');

    this.renderMobileView();
  }

  navigateMobilePeriod(delta) {
    if (this.mobileView === 'week') {
      const w = startOfWeek(this.currentWeekStart);
      w.setDate(w.getDate() + delta * 7);
      this.currentWeekStart = w;
      this.currentMonth = this.currentWeekStart.getMonth();
      this.currentYear = this.currentWeekStart.getFullYear();
    } else {
      this.currentMonth += delta;
      if (this.currentMonth > 11) {
        this.currentMonth = 0;
        this.currentYear += 1;
      } else if (this.currentMonth < 0) {
        this.currentMonth = 11;
        this.currentYear -= 1;
      }
      this.currentWeekStart = startOfWeek(new Date(this.currentYear, this.currentMonth, 1));
    }
    this.render();
  }

  populateMobileBatchDropdown() {
    if (!this.mobileBatchDropdownList) return;
    this.mobileBatchDropdownList.innerHTML = '';

    const batches = this.batchManager.getBatches();
    const isAll = this.activeBatchId === 'all';
    const allEvents = this.batchManager.getAllEvents('all');
    const totalAllClasses = allEvents.filter(e => e.eventType === 'class').length;

    // 1. All Batches item
    const allItem = document.createElement('button');
    allItem.type = 'button';
    allItem.className = `w-full text-left px-3 py-2 flex items-center justify-between hover:bg-terra-sand/80 transition-colors border-b border-terra-border/50 cursor-pointer ${
      isAll ? 'bg-terra-forestLight font-bold text-terra-forest' : 'text-terra-charcoal'
    }`;
    allItem.innerHTML = `
      <div class="truncate mr-2">
        <span class="block font-bold text-xs">All Batches (Combined)</span>
        <span class="text-[10px] text-terra-muted block">${totalAllClasses} Total Classes</span>
      </div>
      ${isAll ? '<svg class="w-4 h-4 text-terra-forest shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' : ''}
    `;
    allItem.addEventListener('click', (e) => {
      e.stopPropagation();
      this.mobileBatchDropdown?.classList.add('hidden');
      this.switchBatch('all');
    });
    this.mobileBatchDropdownList.appendChild(allItem);

    // 2. Individual Batches
    batches.forEach(b => {
      const isSelected = b.id === this.activeBatchId;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `w-full text-left px-3 py-2 flex items-center justify-between hover:bg-terra-sand/80 transition-colors cursor-pointer ${
        isSelected ? 'bg-terra-forestLight font-bold text-terra-forest' : 'text-terra-charcoal'
      }`;
      const badgeText = (b.platform === 'youtube' || b.isYoutube) ? 'YT Live' : 'App Live';
      const badgeClass = (b.platform === 'youtube' || b.isYoutube) ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

      item.innerHTML = `
        <div class="truncate mr-2 min-w-0">
          <div class="flex items-center gap-1.5 truncate">
            <span class="block font-semibold text-xs truncate">${b.name}</span>
            <span class="text-[9px] font-bold px-1 py-0.5 rounded border ${badgeClass} shrink-0">${badgeText}</span>
          </div>
          <span class="text-[10px] text-terra-muted block truncate">${b.events ? b.events.length : 0} classes</span>
        </div>
        ${isSelected ? '<svg class="w-4 h-4 text-terra-forest shrink-0" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>' : ''}
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.mobileBatchDropdown?.classList.add('hidden');
        this.switchBatch(b.id);
      });
      this.mobileBatchDropdownList.appendChild(item);
    });

    this.updateMobileHeader();
  }

  populateMobileFacultySwitcher() {
    if (this.mobileFacultyProfilesList) {
      this.mobileFacultyProfilesList.innerHTML = '';
    }
  }

  updateMobileHeader() {
    if (this.mobileBatchLabel) {
      if (this.activeBatchId === 'all') {
        this.mobileBatchLabel.textContent = 'All Batches (Combined Schedule)';
      } else {
        const b = this.batches.find(x => x.id === this.activeBatchId);
        this.mobileBatchLabel.textContent = b ? b.name : 'Select Batch';
      }
    }
    this.updateFacultyProfileUI();
  }

  updateMobileMetrics() {
    const allEvents = this.getFacultyEvents();
    const classesOnly = allEvents.filter(ev => ev.eventType === 'class');

    // 1. Today
    const todayClasses = classesOnly.filter(ev => ev.isoDate === this.todayIso);
    const todayCount = todayClasses.length;
    if (this.mobileTodayCount) this.mobileTodayCount.textContent = todayCount;
    if (this.mobileTodaySubtitle) {
      if (todayCount === 0) {
        this.mobileTodaySubtitle.textContent = 'No clinical sessions today';
      } else {
        const first = todayClasses[0];
        this.mobileTodaySubtitle.textContent = `${todayCount} Class${todayCount > 1 ? 'es' : ''} • ${first.timings || '7:00 PM - 9:00 PM'}`;
      }
    }

    // 2. Upcoming Ahead
    const upcomingClasses = classesOnly.filter(ev => ev.isoDate >= this.todayIso);
    const upcomingCount = upcomingClasses.length;
    if (this.mobileUpcomingCount) this.mobileUpcomingCount.textContent = upcomingCount;
    if (this.mobileUpcomingSubtitle) {
      if (upcomingCount === 0) {
        this.mobileUpcomingSubtitle.textContent = 'No upcoming classes ahead';
      } else {
        const nextEv = upcomingClasses[0];
        const dateParts = nextEv.isoDate ? nextEv.isoDate.split('-') : [];
        const evMonthName = dateParts.length === 3 ? new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2])).toLocaleString('en-US', { month: 'short' }) : 'Oct';
        const dayDisplay = dateParts[2] || '';
        const dayName = nextEv.dayName ? nextEv.dayName.slice(0, 3) : '';
        this.mobileUpcomingSubtitle.textContent = `Next: ${dayName} ${dayDisplay} ${evMonthName} • ${nextEv.subject || 'Biochem'}`;
      }
    }

    // 3. Total Scope (month scope)
    const year = this.currentYear;
    const month = this.currentMonth;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const rangeStartIso = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const rangeEndIso = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const monthClasses = classesOnly.filter(ev => ev.isoDate >= rangeStartIso && ev.isoDate <= rangeEndIso);
    const totalCount = monthClasses.length;
    if (this.mobileTotalCount) this.mobileTotalCount.textContent = totalCount;
    if (this.mobileTotalSubtitle) {
      const totalHrs = (totalCount * 2.0).toFixed(1);
      this.mobileTotalSubtitle.textContent = `${totalHrs} total teaching hrs`;
    }
  }

  updateMobileNavigation() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    if (this.mobilePeriodTitle) {
      if (this.mobileView === 'week') {
        const weekDays = this.getWeekDays(this.currentWeekStart);
        const sun = weekDays[0].dateObj;
        const sat = weekDays[6].dateObj;
        const sunM = sun.toLocaleString('en-US', { month: 'short' });
        const satM = sat.toLocaleString('en-US', { month: 'short' });
        this.mobilePeriodTitle.textContent = `${sunM} ${sun.getDate()} – ${satM} ${sat.getDate()}, ${sat.getFullYear()}`;
      } else {
        this.mobilePeriodTitle.textContent = `${months[this.currentMonth]} ${this.currentYear}`;
      }
    }
    if (this.mobileFacultySubtitle) {
      this.mobileFacultySubtitle.textContent = this.facultySubject || this.loggedInSubject || 'Biochemistry';
    }
  }

  renderMobileView() {
    this.updateMobileHeader();
    this.updateMobileMetrics();
    this.updateMobileNavigation();

    if (this.mobileView === 'month') {
      this.renderMobileMonthGrid();
      this.renderMobileSelectedSchedule();
      this.renderMobileUpcomingLectures();
    } else if (this.mobileView === 'week') {
      this.renderMobileWeekView();
    } else if (this.mobileView === 'agenda') {
      this.renderMobileAgendaView();
    }
    this.renderMobileNotifications();
  }

  renderMobileMonthGrid() {
    if (!this.mobileCalendarDaysGrid) return;
    this.mobileCalendarDaysGrid.innerHTML = '';

    const year = this.currentYear;
    const month = this.currentMonth;

    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Map of events by ISO
    const facultyEvents = this.getFacultyEvents();
    const eventMap = new Map();
    let monthClassCount = 0;

    facultyEvents.forEach(ev => {
      if (!ev.isoDate) return;
      if (!eventMap.has(ev.isoDate)) eventMap.set(ev.isoDate, []);
      eventMap.get(ev.isoDate).push(ev);
      if (ev.eventType === 'class' && ev.isoDate.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
        monthClassCount++;
      }
    });

    // Update legend
    const liveLegend = document.getElementById('mobileLegendLiveCount');
    if (liveLegend) liveLegend.textContent = `Live Class (${monthClassCount})`;
    const todayLegend = document.getElementById('mobileLegendTodayText');
    if (todayLegend) {
      const d = new Date();
      todayLegend.textContent = `Today (${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })})`;
    }

    // Prev month padding
    for (let i = firstDay - 1; i >= 0; i--) {
      const prevNum = prevMonthDays - i;
      const padEl = document.createElement('div');
      padEl.className = 'h-8 flex flex-col items-center justify-center text-terra-muted/40 font-normal select-none';
      padEl.textContent = prevNum;
      this.mobileCalendarDaysGrid.appendChild(padEl);
    }

    // Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const curDate = new Date(year, month, day);
      const dayOfWeek = curDate.getDay(); // 0 is Sun
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = eventMap.get(iso) || [];
      const hasClass = dayEvents.some(e => e.eventType === 'class');
      const isSunday = dayOfWeek === 0;
      const isHoliday = dayEvents.some(e => e.eventType === 'holiday') || (month === 9 && day === 2); // Gandhi Jayanti
      const isToday = iso === this.todayIso;
      const isSelected = iso === this.mobileSelectedDateIso;

      const btn = document.createElement('button');
      btn.type = 'button';

      if (isSelected) {
        // Active selected day style
        btn.className = 'h-8 rounded-lg bg-terra-forest text-white flex flex-col items-center justify-center font-bold shadow-sm ring-2 ring-terra-forest/20 cursor-pointer';
        btn.innerHTML = `
          <span class="leading-none text-xs">${day}</span>
          <span class="w-1.5 h-1.5 rounded-full bg-white mt-0.5"></span>
        `;
      } else if (isSunday) {
        // Sunday Cool Off
        btn.className = 'h-8 rounded-lg bg-terra-amberBg/70 border border-terra-amberBorder/60 flex flex-col items-center justify-center font-semibold text-terra-amber cursor-pointer hover:bg-terra-amberBg transition-colors';
        btn.innerHTML = `
          <span class="leading-none text-xs">${day}</span>
          <span class="text-[7px] leading-none uppercase font-bold">OFF</span>
        `;
      } else if (isToday) {
        // Today Marker
        btn.className = 'h-8 rounded-lg border-2 border-terra-forest bg-terra-forestLight/50 flex flex-col items-center justify-center font-bold text-terra-forest relative shadow-sm cursor-pointer hover:bg-terra-forestLight transition-colors';
        btn.innerHTML = `
          <span class="leading-none text-xs">${day}</span>
          <span class="text-[7px] font-extrabold uppercase tracking-tighter text-terra-forest leading-none">TODAY</span>
        `;
      } else if (hasClass) {
        // Has class
        btn.className = 'h-8 rounded-lg hover:bg-terra-sand flex flex-col items-center justify-center font-semibold text-terra-forest relative cursor-pointer transition-colors';
        btn.innerHTML = `
          <span class="leading-none text-xs">${day}</span>
          <span class="w-1.5 h-1.5 rounded-full bg-terra-forest mt-0.5"></span>
        `;
      } else if (isHoliday) {
        // Holiday
        btn.className = 'h-8 rounded-lg hover:bg-terra-sand flex flex-col items-center justify-center font-medium text-terra-charcoal relative cursor-pointer transition-colors';
        btn.innerHTML = `
          <span class="leading-none text-xs">${day}</span>
          <span class="w-1.5 h-1.5 rounded-full bg-terra-amber mt-0.5"></span>
        `;
      } else {
        // Regular day
        btn.className = 'h-8 rounded-lg flex flex-col items-center justify-center hover:bg-terra-sand font-medium text-terra-charcoal cursor-pointer transition-colors';
        btn.innerHTML = `<span class="leading-none text-xs">${day}</span>`;
      }

      btn.addEventListener('click', () => {
        this.mobileSelectedDateIso = iso;
        this.renderMobileMonthGrid();
        this.renderMobileSelectedSchedule();
      });

      this.mobileCalendarDaysGrid.appendChild(btn);
    }
  }

  renderMobileSelectedSchedule() {
    if (!this.mobileSelectedScheduleContainer) return;
    this.mobileSelectedScheduleContainer.innerHTML = '';

    const selectedIso = this.mobileSelectedDateIso;
    const [y, m, d] = (selectedIso || '').split('-').map(Number);
    const dateObj = (y && m && d) ? new Date(y, m - 1, d) : new Date();

    const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const formattedTitle = `${fullDayNames[dateObj.getDay()]}, ${dateObj.getDate()} ${monthNames[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
    if (this.mobileSelectedDateTitle) this.mobileSelectedDateTitle.textContent = formattedTitle;

    const allEvents = this.getFacultyEvents();
    const dayClasses = allEvents.filter(ev => ev.isoDate === selectedIso && ev.eventType === 'class');
    const isSunday = dateObj.getDay() === 0;
    const isHoliday = allEvents.some(ev => ev.isoDate === selectedIso && ev.eventType === 'holiday') || (dateObj.getMonth() === 9 && dateObj.getDate() === 2);

    if (this.mobileSelectedDateBadge) {
      if (dayClasses.length > 0) {
        this.mobileSelectedDateBadge.textContent = `${dayClasses.length} Lecture${dayClasses.length > 1 ? 's' : ''}`;
        this.mobileSelectedDateBadge.className = 'text-[11px] font-semibold text-terra-forest bg-terra-forestLight px-2.5 py-1 rounded-md border border-terra-forest/20 whitespace-nowrap shrink-0';
      } else if (isSunday) {
        this.mobileSelectedDateBadge.textContent = 'Cool Off Day';
        this.mobileSelectedDateBadge.className = 'text-[11px] font-semibold text-terra-amber bg-terra-amberBg px-2.5 py-1 rounded-md border border-terra-amberBorder/60 whitespace-nowrap shrink-0';
      } else if (isHoliday) {
        this.mobileSelectedDateBadge.textContent = 'Holiday';
        this.mobileSelectedDateBadge.className = 'text-[11px] font-semibold text-terra-amber bg-terra-amberBg px-2.5 py-1 rounded-md border border-terra-amberBorder/60 whitespace-nowrap shrink-0';
      } else {
        this.mobileSelectedDateBadge.textContent = 'No Lectures';
        this.mobileSelectedDateBadge.className = 'text-[11px] font-medium text-terra-muted bg-terra-sand px-2.5 py-1 rounded-md border border-terra-border whitespace-nowrap shrink-0';
      }
    }

    if (isSunday) {
      // Sunday Cool Off Card
      const coolOffCard = document.createElement('article');
      coolOffCard.className = 'bg-terra-amberBg/50 rounded-2xl border border-dashed border-terra-amberBorder p-4 shadow-soft space-y-2.5';
      coolOffCard.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-terra-amber text-white shadow-sm">
            Sunday Cool Off
          </span>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-terra-amber border border-terra-amberBorder/80">
            Self Study &amp; Revision
          </span>
        </div>
        <h4 class="text-base font-bold text-terra-charcoal leading-snug">No live lectures scheduled for Sunday</h4>
        <p class="text-xs text-terra-muted leading-relaxed">
          Students use this day for self-paced revision, mock drills, and clearing backlogs.
        </p>
      `;
      this.mobileSelectedScheduleContainer.appendChild(coolOffCard);
      return;
    }

    if (isHoliday && dayClasses.length === 0) {
      const holidayCard = document.createElement('article');
      holidayCard.className = 'bg-terra-amberBg/50 rounded-2xl border border-dashed border-terra-amberBorder p-4 shadow-soft space-y-2';
      holidayCard.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-terra-amber text-white shadow-sm">
            Gazetted Holiday
          </span>
        </div>
        <h4 class="text-base font-bold text-terra-charcoal leading-snug">Gandhi Jayanti • Academic Break</h4>
        <p class="text-xs text-terra-muted leading-relaxed">No live streaming sessions on national holidays.</p>
      `;
      this.mobileSelectedScheduleContainer.appendChild(holidayCard);
      return;
    }

    if (dayClasses.length === 0) {
      // Empty weekday
      const emptyCard = document.createElement('article');
      emptyCard.className = 'bg-white rounded-2xl border border-terra-border/80 p-4 shadow-soft text-center space-y-3';
      emptyCard.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-terra-sand mx-auto flex items-center justify-center text-terra-muted">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
          </svg>
        </div>
        <div>
          <h4 class="text-sm font-bold text-terra-charcoal">No Lectures Scheduled</h4>
          <p class="text-xs text-terra-muted mt-0.5">There are no teaching commitments scheduled on this date.</p>
        </div>
        <button id="mobileViewNextClassBtn" type="button" class="py-2 px-3.5 rounded-xl bg-terra-sand/80 hover:bg-terra-sand text-terra-charcoal font-bold text-xs border border-terra-border mx-auto inline-flex items-center gap-1.5 transition-colors cursor-pointer">
          <span>View Next Upcoming Class</span>
          <svg class="w-3.5 h-3.5 text-terra-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
        </button>
      `;
      this.mobileSelectedScheduleContainer.appendChild(emptyCard);

      const nextBtn = document.getElementById('mobileViewNextClassBtn');
      nextBtn?.addEventListener('click', () => {
        const nextClasses = allEvents.filter(ev => ev.eventType === 'class' && ev.isoDate > selectedIso);
        if (nextClasses.length > 0) {
          this.mobileSelectedDateIso = nextClasses[0].isoDate;
          this.renderMobileMonthGrid();
          this.renderMobileSelectedSchedule();
        } else {
          this.showToast('No later classes found in current view');
        }
      });
      return;
    }

    // Render classes
    dayClasses.forEach(ev => {
      const card = document.createElement('article');
      card.className = 'bg-white rounded-2xl border border-terra-border/80 p-4 shadow-soft space-y-3.5 cursor-pointer hover:border-terra-forest/40 transition-all';
      if (typeof card.setAttribute === 'function') {
        card.setAttribute('data-purpose', 'lecture-card');
      }

      const batchObj = this.batches.find(b => b.id === ev.batchId) || { name: 'Prarambh 2026', platform: 'app' };
      const isYoutube = (batchObj.platform === 'youtube' || batchObj.isYoutube);
      const badgeLiveText = isYoutube ? 'YouTube Live' : 'App Live';
      const badgeLiveClass = isYoutube ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      const pulseColor = isYoutube ? 'bg-rose-500' : 'bg-emerald-500';

      const initials = this.getFacultyInitials(ev.faculty || this.currentFaculty);
      const canRescheduleCancel = this.canFacultyRescheduleCancel(ev);

      card.innerHTML = `
        <!-- Header Row 1: Subject Badge (Left) & App/YT Live Badge (Right) -->
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-terra-forest text-white shadow-sm">
            ${ev.subject || this.facultySubject}
          </span>
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded border flex items-center gap-1 shrink-0 ${badgeLiveClass}">
            <span class="w-1.5 h-1.5 rounded-full animate-pulse ${pulseColor}"></span>
            ${badgeLiveText}
          </span>
        </div>

        <!-- Header Row 2: Batch Badge (Left) & Time Pill (Right) -->
        <div class="flex items-center justify-between gap-2">
          <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-terra-sand text-terra-charcoal border border-terra-border/80 truncate max-w-[170px]" title="${batchObj.name || "Prarambh '26"}">
            ${batchObj.name || "Prarambh '26"}
          </span>
          <div class="text-[11px] font-bold text-terra-charcoal flex items-center gap-1 shrink-0 bg-terra-sand/60 px-2 py-1 rounded-lg border border-terra-border/50">
            <svg class="w-3.5 h-3.5 text-terra-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
            </svg>
            ${ev.timings || '7:00pm to 9:00pm'}
          </div>
        </div>

        <!-- Title and Details -->
        <div>
          <h4 class="text-base font-bold text-terra-charcoal leading-snug tracking-tight">${ev.topic || 'Medical Lecture'}</h4>
          <div class="text-xs text-terra-muted mt-2 flex items-center gap-2 font-medium">
            <div class="w-6 h-6 rounded-full bg-terra-sand border border-terra-border text-terra-forest flex items-center justify-center text-[10px] font-bold shrink-0">
              ${initials}
            </div>
            <span class="truncate">${ev.faculty || this.currentFaculty} <span class="text-terra-muted/60">•</span> 2.0 Teaching Hours</span>
          </div>
        </div>

        ${canRescheduleCancel ? `
        <!-- Action Row: Reschedule and Cancel Class -->
        <div class="pt-1 border-t border-terra-border/60 flex items-center gap-2">
          <button type="button" class="btn-reschedule flex-1 py-2 px-3 rounded-xl bg-terra-sand/70 hover:bg-terra-sand text-terra-charcoal font-bold text-xs border border-terra-border flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer">
            <svg class="w-3.5 h-3.5 text-terra-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
            </svg>
            <span>Reschedule</span>
          </button>
          <button type="button" class="btn-cancel py-2 px-3.5 rounded-xl bg-terra-amberBg hover:bg-terra-amberBg/80 text-terra-amber font-bold text-xs border border-terra-amberBorder/80 flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer">
            <svg class="w-3.5 h-3.5 text-terra-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
            </svg>
            <span>Cancel</span>
          </button>
        </div>
        ` : `
        <!-- View Details Only when Reschedule is disabled -->
        <div class="pt-1 border-t border-terra-border/60 flex items-center justify-end">
          <span class="text-[11px] font-bold text-terra-forest flex items-center gap-1">
            <span>View Lecture Details</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
          </span>
        </div>
        `}
      `;

      // Open detail modal when clicking card body
      card.addEventListener?.('click', (e) => {
        if (e.target?.closest?.('.btn-reschedule') || e.target?.closest?.('.btn-cancel')) return;
        this.openMobileLectureDetail(ev);
      });

      // Reschedule action
      card.querySelector?.('.btn-reschedule')?.addEventListener?.('click', (e) => {
        e.stopPropagation();
        this.handleRescheduleLecture(ev);
      });

      // Cancel action
      card.querySelector?.('.btn-cancel')?.addEventListener?.('click', (e) => {
        e.stopPropagation();
        this.handleCancelLecture(ev);
      });

      this.mobileSelectedScheduleContainer.appendChild(card);
    });
  }

  renderMobileUpcomingLectures() {
    if (!this.mobileUpcomingLecturesContainer) return;
    this.mobileUpcomingLecturesContainer.innerHTML = '';

    const allEvents = this.getFacultyEvents();
    const upcomingEvents = allEvents.filter(ev => {
      return (ev.eventType === 'class' || ev.eventType === 'cool_off') && ev.isoDate > this.mobileSelectedDateIso;
    });

    if (this.mobileUpcomingLecturesHeader) {
      const classCount = upcomingEvents.filter(e => e.eventType === 'class').length;
      this.mobileUpcomingLecturesHeader.textContent = `${classCount} Lecture${classCount !== 1 ? 's' : ''} Left`;
    }

    if (upcomingEvents.length === 0) {
      this.mobileUpcomingLecturesContainer.innerHTML = `
        <div class="p-3 bg-terra-sand/50 rounded-xl text-center text-xs text-terra-muted">
          No further lectures remaining in this month view.
        </div>
      `;
      return;
    }

    // Render up to 6 remaining items
    upcomingEvents.slice(0, 6).forEach(ev => {
      const [y, m, d] = (ev.isoDate || '').split('-').map(Number);
      const dateObj = (y && m && d) ? new Date(y, m - 1, d) : new Date();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dayStr = dayNames[dateObj.getDay()] || 'Day';

      if (ev.eventType === 'cool_off' || dateObj.getDay() === 0) {
        // Cool Off item
        const item = document.createElement('div');
        item.className = 'bg-terra-amberBg/50 border border-dashed border-terra-amberBorder rounded-xl p-3 flex items-center justify-between cursor-pointer';
        item.innerHTML = `
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-terra-amberBg border border-terra-amberBorder flex flex-col items-center justify-center shrink-0">
              <span class="text-[10px] font-bold uppercase text-terra-amber">${dayStr}</span>
              <span class="text-sm font-black leading-none text-terra-amber">${d || 18}</span>
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-bold uppercase tracking-wider text-terra-amber">Cool Off</span>
                <span class="text-[10px] text-terra-muted">• All Batches</span>
              </div>
              <h4 class="text-xs font-bold text-terra-charcoal">Self Study Day &amp; Revision</h4>
            </div>
          </div>
          <div class="w-6 h-6 rounded-full bg-terra-amber/10 flex items-center justify-center text-terra-amber shrink-0">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
            </svg>
          </div>
        `;
        item.addEventListener('click', () => {
          this.mobileSelectedDateIso = ev.isoDate;
          this.renderMobileMonthGrid();
          this.renderMobileSelectedSchedule();
        });
        this.mobileUpcomingLecturesContainer.appendChild(item);
      } else {
        // Lecture item
        const item = document.createElement('div');
        item.className = 'bg-terra-card border border-terra-border rounded-xl p-3 flex items-center justify-between shadow-soft cursor-pointer hover:border-terra-forest/40 transition-colors';
        
        const batchObj = this.batches.find(b => b.id === ev.batchId) || { name: 'Prarambh 2026', platform: 'app' };
        const isYoutube = (batchObj.platform === 'youtube' || batchObj.isYoutube);
        const badgeLiveText = isYoutube ? 'YouTube Live' : 'App Live';
        const badgeLiveClass = isYoutube ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
        const pulseColor = isYoutube ? 'bg-rose-500' : 'bg-emerald-500';

        item.innerHTML = `
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="w-10 h-10 rounded-lg bg-terra-forestLight border border-terra-forest/20 flex flex-col items-center justify-center shrink-0">
              <span class="text-[10px] font-bold uppercase text-terra-forest">${dayStr}</span>
              <span class="text-sm font-black leading-none text-terra-forest">${d || 21}</span>
            </div>
            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex items-center justify-between gap-1.5">
                <span class="text-[10px] font-bold uppercase text-terra-forest">${ev.subject || this.facultySubject}</span>
                <span class="text-[9px] font-semibold px-1.5 py-0.2 rounded border flex items-center gap-1 shrink-0 ${badgeLiveClass}">
                  <span class="w-1.5 h-1.5 rounded-full ${pulseColor}"></span>
                  ${badgeLiveText}
                </span>
              </div>
              <div class="flex items-center justify-between gap-1.5 text-[10px] font-semibold text-terra-muted">
                <span class="truncate max-w-[130px]">${batchObj.name || "Prarambh '26"}</span>
                <span class="shrink-0 font-medium font-mono">${(ev.timings || '7:00pm to 9:00pm').replace(/\s*to\s*/i, ' to ')}</span>
              </div>
              <h4 class="text-xs font-bold text-terra-charcoal truncate pt-0.5">${ev.topic || 'Medical Lecture'}</h4>
            </div>
          </div>
          <button aria-label="View lecture details" class="w-8 h-8 rounded-lg bg-terra-sand hover:bg-terra-sandHover flex items-center justify-center text-terra-charcoal shrink-0 ml-2 cursor-pointer" type="button">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
            </svg>
          </button>
        `;
        item.addEventListener('click', () => {
          this.openMobileLectureDetail(ev);
        });
        this.mobileUpcomingLecturesContainer.appendChild(item);
      }
    });
  }

  getMobileWeekDays(startDate) {
    const d = new Date(startDate);
    const day = d.getDay(); // 0 is Sunday, 1 is Mon, ..., 6 is Sat
    const distToMon = day === 0 ? -6 : 1 - day;
    const monday = new Date(d);
    monday.setDate(d.getDate() + distToMon);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // Sunday of this week (e.g. Oct 18)

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    // Sunday first in the strip (matching user's provided snippet: Sun 18, Mon 12, Tue 13, Wed 14, Thu 15, Fri 16, Sat 17)
    const sunIso = `${sunday.getFullYear()}-${String(sunday.getMonth() + 1).padStart(2, '0')}-${String(sunday.getDate()).padStart(2, '0')}`;
    const result = [{
      dateObj: sunday,
      isoDate: sunIso,
      dayName: 'Sun',
      dayFullName: 'Sunday',
      dayNum: sunday.getDate(),
      isToday: sunIso === this.todayIso,
      isSunday: true
    }];

    for (let i = 0; i < 6; i++) {
      const cur = new Date(monday);
      cur.setDate(monday.getDate() + i);
      const iso = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
      result.push({
        dateObj: cur,
        isoDate: iso,
        dayName: dayNames[i],
        dayFullName: fullDayNames[i],
        dayNum: cur.getDate(),
        isToday: iso === this.todayIso,
        isSunday: false
      });
    }

    return result;
  }

  renderMobileWeekGrid() {
    if (!this.mobileWeekDaysGrid) return;
    this.mobileWeekDaysGrid.innerHTML = '';

    const weekDays = this.getMobileWeekDays(this.currentWeekStart);
    const allEvents = this.getFacultyEvents();

    const monObj = weekDays.find(d => d.dayName === 'Mon')?.dateObj || weekDays[1].dateObj;
    const sunObj = weekDays.find(d => d.dayName === 'Sun')?.dateObj || weekDays[0].dateObj;
    const weekNum = Math.ceil(monObj.getDate() / 7);

    const weekIsos = weekDays.map(d => d.isoDate);
    const weekClasses = allEvents.filter(ev => weekIsos.includes(ev.isoDate) && ev.eventType === 'class');
    const liveSessionsCount = weekClasses.length;

    if (this.mobileWeekRangeBadge) {
      const sm = monObj.toLocaleString('en-US', { month: 'short' });
      const em = sunObj.toLocaleString('en-US', { month: 'short' });
      this.mobileWeekRangeBadge.textContent = `Week ${weekNum}: ${sm} ${monObj.getDate()} – ${em} ${sunObj.getDate()}`;
    }

    if (this.mobileWeekLiveCount) {
      this.mobileWeekLiveCount.textContent = `${liveSessionsCount} Live Session${liveSessionsCount !== 1 ? 's' : ''}`;
    }

    if (this.mobileWeekLegendLive) {
      const monthClasses = allEvents.filter(ev => {
        if (ev.eventType !== 'class' || !ev.isoDate) return false;
        const [y, m] = ev.isoDate.split('-').map(Number);
        return y === this.currentYear && (m - 1) === this.currentMonth;
      });
      this.mobileWeekLegendLive.textContent = `Live Class (${monthClasses.length})`;
    }

    if (this.mobileWeekLegendToday) {
      const [ty, tm, td] = this.todayIso.split('-').map(Number);
      const tDate = new Date(ty, tm - 1, td);
      this.mobileWeekLegendToday.textContent = `Today (${tDate.getDate()} ${tDate.toLocaleString('en-US', { month: 'short' })})`;
    }

    weekDays.forEach(dayInfo => {
      const dayClasses = allEvents.filter(ev => ev.isoDate === dayInfo.isoDate && ev.eventType === 'class');
      const isSelected = dayInfo.isoDate === this.mobileSelectedDateIso;
      const isToday = dayInfo.isToday;
      const isSunday = dayInfo.isSunday;
      const hasClasses = dayClasses.length > 0;

      const btn = document.createElement('button');
      btn.type = 'button';

      if (isSelected) {
        btn.className = 'h-12 rounded-lg bg-[#2D553E] text-white flex flex-col items-center justify-center font-bold shadow-sm ring-2 ring-[#2D553E]/20 transition-all cursor-pointer';
        btn.innerHTML = `
          <span class="text-[9px] font-semibold text-white/80 uppercase leading-none">${dayInfo.dayName}</span>
          <span class="text-xs font-black mt-0.5 leading-none">${dayInfo.dayNum}</span>
          ${hasClasses ? '<span class="w-1.5 h-1.5 rounded-full bg-white mt-1"></span>' : ''}
        `;
      } else if (isToday) {
        btn.className = 'h-12 rounded-lg border-2 border-[#2D553E] bg-[#EDF4EE]/50 flex flex-col items-center justify-center font-bold text-[#2D553E] shadow-sm transition-all cursor-pointer';
        btn.innerHTML = `
          <span class="text-[7px] font-extrabold uppercase tracking-tighter text-[#2D553E] leading-none">TODAY</span>
          <span class="text-xs font-black mt-1 leading-none">${dayInfo.dayNum}</span>
        `;
      } else if (isSunday) {
        btn.className = 'h-12 rounded-lg bg-[#FDF4EC]/70 border border-[#F6D7BE]/60 flex flex-col items-center justify-center font-semibold text-[#C86D3B] transition-all cursor-pointer';
        btn.innerHTML = `
          <span class="text-[9px] font-bold uppercase leading-none">${dayInfo.dayName}</span>
          <span class="text-xs font-black mt-0.5 leading-none">${dayInfo.dayNum}</span>
          <span class="text-[7px] leading-none uppercase mt-0.5 px-1 py-0.2 rounded bg-[#FDF4EC] font-bold">OFF</span>
        `;
      } else {
        btn.className = 'h-12 rounded-lg flex flex-col items-center justify-center hover:bg-[#F3EDE2] font-medium text-[#242424] transition-all cursor-pointer';
        btn.innerHTML = `
          <span class="text-[9px] font-semibold text-[#706E6B] uppercase leading-none">${dayInfo.dayName}</span>
          <span class="text-xs font-bold mt-1 leading-none">${dayInfo.dayNum}</span>
          ${hasClasses ? '<span class="w-1.5 h-1.5 rounded-full bg-[#2D553E] mt-1"></span>' : ''}
        `;
      }

      btn.addEventListener('click', () => {
        this.mobileSelectedDateIso = dayInfo.isoDate;
        this.renderMobileWeekGrid();
        this.renderMobileSelectedSchedule();
        this.renderMobileUpcomingLectures();
      });

      this.mobileWeekDaysGrid.appendChild(btn);
    });
  }

  renderMobileWeekView() {
    this.renderMobileWeekGrid();

    // Populate backward-compatible container if needed
    if (this.mobileWeekScheduleContainer) {
      this.mobileWeekScheduleContainer.innerHTML = '';
      const weekDays = this.getWeekDays(this.currentWeekStart);
      const allEvents = this.getFacultyEvents();
      weekDays.forEach(dayInfo => {
        const dayClasses = allEvents.filter(ev => ev.isoDate === dayInfo.isoDate && ev.eventType === 'class');
        const dayCard = document.createElement('div');
        dayCard.className = 'hidden';
        dayCard.textContent = `${dayInfo.dayFullName}: ${dayClasses.length} lectures`;
        this.mobileWeekScheduleContainer.appendChild(dayCard);
      });
    }

    this.renderMobileSelectedSchedule();
    this.renderMobileUpcomingLectures();
  }

  renderMobileAgendaView() {
    if (!this.mobileAgendaScheduleContainer) return;
    this.mobileAgendaScheduleContainer.innerHTML = '';

    const allEvents = this.getFacultyEvents();
    const classes = allEvents.filter(ev => ev.eventType === 'class').sort((a, b) => (a.isoDate || '').localeCompare(b.isoDate || ''));

    if (this.mobileAgendaCountBadge) {
      this.mobileAgendaCountBadge.textContent = `${classes.length} Total Lectures`;
    }

    if (classes.length === 0) {
      this.mobileAgendaScheduleContainer.innerHTML = `
        <div class="p-6 text-center text-xs text-terra-muted bg-white rounded-2xl border border-terra-border">
          No lectures found in active batch for this faculty.
        </div>
      `;
      return;
    }

    classes.forEach(c => {
      const [y, m, d] = (c.isoDate || '').split('-').map(Number);
      const dateObj = (y && m && d) ? new Date(y, m - 1, d) : new Date();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      const batchObj = this.batches.find(b => b.id === c.batchId) || { name: 'Prarambh 2026', platform: 'app' };
      const isYoutube = (batchObj.platform === 'youtube' || batchObj.isYoutube);
      const badgeLiveText = isYoutube ? 'YouTube Live' : 'App Live';
      const badgeLiveClass = isYoutube ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
      const pulseColor = isYoutube ? 'bg-rose-500' : 'bg-emerald-500';

      const card = document.createElement('div');
      card.className = 'bg-white rounded-2xl border border-terra-border/80 p-3.5 shadow-soft flex items-center justify-between cursor-pointer hover:border-terra-forest/40 transition-all';
      card.innerHTML = `
        <div class="flex items-center gap-3 min-w-0 flex-1">
          <div class="w-12 h-12 rounded-xl bg-terra-forestLight border border-terra-forest/20 flex flex-col items-center justify-center shrink-0">
            <span class="text-[9px] font-bold uppercase text-terra-forest">${monthNames[dateObj.getMonth()]}</span>
            <span class="text-base font-black leading-none text-terra-forest">${d || 1}</span>
            <span class="text-[8px] font-semibold text-terra-muted uppercase">${dayNames[dateObj.getDay()]}</span>
          </div>
          <div class="min-w-0 flex-1 space-y-1">
            <div class="flex items-center justify-between gap-1.5 text-[10px] font-bold">
              <span class="text-terra-forest uppercase">${c.subject || this.facultySubject}</span>
              <span class="text-[9px] font-semibold px-1.5 py-0.2 rounded border flex items-center gap-1 shrink-0 ${badgeLiveClass}">
                <span class="w-1.5 h-1.5 rounded-full ${pulseColor}"></span>
                ${badgeLiveText}
              </span>
            </div>
            <div class="flex items-center justify-between gap-1.5 text-[10px] font-semibold text-terra-muted">
              <span class="truncate max-w-[130px]">${batchObj.name || "Prarambh '26"}</span>
              <span class="shrink-0 font-medium font-mono">${(c.timings || '7:00 PM – 9:00 PM').replace(/\s*to\s*/i, ' to ')}</span>
            </div>
            <h4 class="text-xs font-bold text-terra-charcoal truncate mt-0.5">${c.topic || 'Medical Lecture'}</h4>
            <div class="text-[10px] text-terra-muted truncate mt-0.5">${c.faculty || this.currentFaculty}</div>
          </div>
        </div>
        <button type="button" class="w-8 h-8 rounded-lg bg-terra-sand flex items-center justify-center text-terra-charcoal shrink-0 ml-2">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
        </button>
      `;

      card.addEventListener('click', () => this.openMobileLectureDetail(c));
      this.mobileAgendaScheduleContainer.appendChild(card);
    });
  }

  openMobileLectureDetail(ev) {
    if (!ev) return;
    this.currentMobileDetailEvent = ev;

    const modalSubjectBadge = document.getElementById('mobileModalSubjectBadge');
    const modalTopic = document.getElementById('mobileModalTopic');
    const modalBatch = document.getElementById('mobileModalBatch');
    const modalPlatformText = document.getElementById('mobileModalPlatformText');
    const modalDate = document.getElementById('mobileModalDate');
    const modalTimings = document.getElementById('mobileModalTimings');
    const modalDuration = document.getElementById('mobileModalDuration');
    const modalFaculty = document.getElementById('mobileModalFaculty');
    const modalTopicText = document.getElementById('mobileModalTopicText');

    if (modalSubjectBadge) modalSubjectBadge.textContent = ev.subject || this.facultySubject || 'Clinical Lecture';
    if (modalTopic) modalTopic.textContent = ev.topic || ev.chapter || 'Lecture Session';
    if (modalBatch) {
      modalBatch.innerHTML = `${renderBatchBadge(ev.batchName || 'PW MedEd Batch')} ${renderPlatformBadges(ev, { size: 'sm' })} ${ev.chapter ? `• ${ev.chapter}` : ''}`;
      modalBatch.className = 'inline-flex items-center gap-1.5 flex-wrap text-xs text-[#68736a]';
    }

    if (modalPlatformText) {
      modalPlatformText.innerHTML = `${getDeliveryPlatformText(ev)} ${renderPlatformBadges(ev, { size: 'sm' })}`;
    }

    // Format Date & Day nicely
    let formattedDate = ev.dateRaw || ev.isoDate || 'Scheduled Date';
    if (ev.isoDate) {
      try {
        const [y, m, d] = ev.isoDate.split('-').map(Number);
        if (y && m && d) {
          const dateObj = new Date(y, m - 1, d);
          const fullDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          formattedDate = `${fullDays[dateObj.getDay()]}, ${fullMonths[dateObj.getMonth()]} ${d}, ${y}`;
        }
      } catch (e) {}
    }

    if (modalDate) modalDate.textContent = formattedDate;
    if (modalTimings) modalTimings.textContent = (ev.timings || '7:00 PM - 9:00 PM').replace(/\s*to\s*/i, ' – ');
    if (modalDuration) modalDuration.textContent = ev.duration ? `• ${ev.duration}` : '• 2 Hours';

    const facultyName = ev.faculty || this.currentFaculty;
    if (modalFaculty) modalFaculty.textContent = facultyName;
    if (modalTopicText) modalTopicText.textContent = ev.topic ? `${ev.topic} (Chapter: ${ev.chapter || 'General'})` : 'Detailed curricular session according to NMC guidelines.';

    // Check permission for Reschedule & Cancellation option at faculty level
    const canRescheduleCancel = this.canFacultyRescheduleCancel(ev);
    const mobileReschedCancelRow = document.getElementById('mobileModalRescheduleCancelRow');
    const mobileCloseSecondaryBtn = document.getElementById('mobileModalCloseSecondaryBtn');
    const mobileFooter = document.getElementById('mobileModalFooter');

    if (mobileReschedCancelRow && mobileCloseSecondaryBtn) {
      if (canRescheduleCancel) {
        mobileReschedCancelRow.classList.remove('hidden');
        mobileCloseSecondaryBtn.className = 'btn-3d-primary px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer';
        if (mobileFooter) {
          mobileFooter.classList.remove('justify-center');
          mobileFooter.classList.add('justify-between');
        }
      } else {
        mobileReschedCancelRow.classList.add('hidden');
        mobileCloseSecondaryBtn.className = 'btn-3d-primary w-full py-2.5 rounded-xl text-xs font-bold cursor-pointer text-center shadow-md';
        if (mobileFooter) {
          mobileFooter.classList.remove('justify-between');
          mobileFooter.classList.add('justify-center');
        }
      }
    }

    const backdrop = document.getElementById('lecture-modal-backdrop');
    const sheet = document.getElementById('lecture-bottom-sheet');
    if (backdrop && sheet) {
      backdrop.classList.remove('hidden');
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => {
          sheet.classList.remove('translate-y-full');
        });
      } else {
        sheet.classList.remove('translate-y-full');
      }
    }
  }

  closeMobileLectureDetail() {
    const backdrop = document.getElementById('lecture-modal-backdrop');
    const sheet = document.getElementById('lecture-bottom-sheet');
    if (sheet) sheet.classList.add('translate-y-full');
    setTimeout(() => {
      if (backdrop) backdrop.classList.add('hidden');
    }, 280);
  }

  formatEventSlot(ev) {
    if (!ev) return 'Saturday, October 17, 2026 • 7:00 PM – 9:00 PM';
    if (ev.isoDate) {
      try {
        const [y, m, d] = ev.isoDate.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const dayName = days[dateObj.getDay()];
        const monthName = months[dateObj.getMonth()];
        const timeStr = (ev.timings || '7:00 PM - 9:00 PM').replace(/\s*to\s*/i, ' – ');
        return `${dayName}, ${monthName} ${d}, ${y} • ${timeStr}`;
      } catch (e) {
        return `${ev.isoDate} • ${ev.timings || '7:00 PM – 9:00 PM'}`;
      }
    }
    if (ev.dateRaw) {
      return `${ev.dateRaw} • ${(ev.timings || '7:00 PM - 9:00 PM').replace(/\s*to\s*/i, ' – ')}`;
    }
    return 'Saturday, October 17, 2026 • 7:00 PM – 9:00 PM';
  }

  /**
   * Machine-readable pointer to the lecture's row in the connected sheet.
   * Carried on every faculty request so the admin's approval can be written
   * back to the correct row rather than guessed from display strings.
   */
  buildLectureRef(ev = {}) {
    const batch = this.batches?.find(b => b.id === ev.batchId);
    return {
      eventId: ev.id || '',
      batchId: ev.batchId || '',
      batchName: ev.batchName || batch?.name || '',
      sheetTabName: batch?.sheetTabName || 'Lecture Planner',
      sourceUrl: batch?.sourceUrl || '',
      rowIndex: ev.rowIndex || 0,
      isoDate: ev.isoDate || '',
      dateRaw: ev.dateRaw || '',
      faculty: ev.faculty || '',
      subject: ev.subject || '',
      chapter: ev.chapter || '',
      topic: ev.topic || ev.chapter || '',
      timings: ev.timings || '',
      duration: ev.duration || ''
    };
  }

  handleRescheduleLecture(evData) {
    const ev = evData || this.currentDetailEvent || this.currentMobileDetailEvent || {};
    if (!this.canFacultyRescheduleCancel(ev)) {
      this.showToast('Reschedule requests are disabled for this faculty profile.');
      return;
    }
    const faculty = ev.faculty || this.currentFaculty || 'Dr. Rajesh Jambhulkar';
    const subject = ev.subject || this.facultySubject || 'Biochemistry';
    const batch = ev.batchName || (this.batches.find(b => b.id === ev.batchId)?.name) || 'Prarambh 2026 Batch';
    const topic = ev.topic || ev.chapter || 'Introduction and orientation- Biochemistry';
    const originalSlot = this.formatEventSlot(ev);
    const proposedSlot = 'Tuesday, October 20, 2026 • 6:30 PM – 8:30 PM';

    addFacultyRequest({
      type: 'Reschedule',
      facultyName: faculty,
      subject: subject,
      batch: batch,
      originalSlot: originalSlot,
      proposedSlot: proposedSlot,
      reason: `Slot adjustment requested for clinical rounds & CME conference (${topic})`,
      lecture: this.buildLectureRef(ev)
    });

    this.closeDetailModal();
    this.closeMobileLectureDetail();
    this.showToast(`Reschedule request submitted for "${topic}". Admin notified.`);
  }

  handleCancelLecture(evData) {
    const ev = evData || this.currentDetailEvent || this.currentMobileDetailEvent || {};
    if (!this.canFacultyRescheduleCancel(ev)) {
      this.showToast('Cancellation requests are disabled for this faculty profile.');
      return;
    }
    const faculty = ev.faculty || this.currentFaculty || 'Dr. Rajesh Jambhulkar';
    const subject = ev.subject || this.facultySubject || 'Biochemistry';
    const batch = ev.batchName || (this.batches.find(b => b.id === ev.batchId)?.name) || 'Prarambh 2026 Batch';
    const topic = ev.topic || ev.chapter || 'Introduction and orientation- Biochemistry';
    const originalSlot = this.formatEventSlot(ev);

    addFacultyRequest({
      type: 'Cancellation',
      facultyName: faculty,
      subject: subject,
      batch: batch,
      originalSlot: originalSlot,
      reason: `Medical leave & scheduled clinical ward duties (${topic})`,
      lecture: this.buildLectureRef(ev)
    });

    this.closeDetailModal();
    this.closeMobileLectureDetail();
    this.showToast(`Cancellation request submitted for "${topic}". Admin notified.`);
  }

  closeDetailModal() {
    if (this.detailModal) {
      this.detailModal.classList.add('hidden');
      document.body.style.overflow = '';
    }
  }

  handleMobileRescheduleLecture() {
    const ev = this.currentMobileDetailEvent;
    this.handleRescheduleLecture(ev);
  }

  handleMobileCancelLecture() {
    const ev = this.currentMobileDetailEvent;
    this.handleCancelLecture(ev);
  }

  startMobileLiveSession() {
    this.closeMobileLectureDetail();
    this.showToast('Connecting to PW MedEd Live Broadcast Studio...');
  }

  openMobileNotifications() {
    if (this.mobileNotificationDrawer) {
      this.mobileNotificationDrawer.classList.remove('hidden');
    }
  }

  closeMobileNotifications() {
    if (this.mobileNotificationDrawer) {
      this.mobileNotificationDrawer.classList.add('hidden');
    }
  }

  markMobileNotificationsRead() {
    reminderEmailService.markAllAsRead('faculty');
    if (this.mobileNotificationDrawer) {
      const dots = this.mobileNotificationDrawer.querySelectorAll('.unread-dot');
      dots.forEach(d => d.remove());
      if (this.mobileNotificationBadge) this.mobileNotificationBadge.classList.add('hidden');
    }
    this.renderFacultyNotifications();
    this.renderMobileNotifications();
    this.showToast('All notifications marked as read');
  }

  renderMobileNotifications() {
    const feed = this.mobileNotificationFeed;
    if (!feed) return;
    feed.innerHTML = '';

    const notifs = reminderEmailService.getFacultyNotifications(this.currentFaculty);
    const unreadCount = reminderEmailService.getFacultyUnreadCount(this.currentFaculty);

    if (this.mobileNotificationBadge) {
      this.mobileNotificationBadge.classList.toggle('hidden', unreadCount === 0);
    }

    const countBadge = document.getElementById('mobileNotificationCountBadge');
    if (countBadge) {
      countBadge.textContent = unreadCount > 0 ? `${unreadCount} New` : `All (${notifs.length})`;
    }

    if (notifs.length === 0) {
      feed.innerHTML = `
        <div class="py-10 px-4 text-center text-terra-muted space-y-2">
          <div class="w-12 h-12 mx-auto rounded-2xl bg-terra-sand border border-terra-border flex items-center justify-center text-terra-muted">
            <svg class="w-6 h-6 text-terra-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path>
            </svg>
          </div>
          <p class="text-xs font-bold text-terra-charcoal">No class reminders yet</p>
          <p class="text-[11px] text-terra-muted leading-relaxed">
            Automated class reminder notifications for <strong>${this.currentFaculty}</strong> will appear here prior to scheduled lecture commencement.
          </p>
        </div>
      `;
      return;
    }

    feed.innerHTML = notifs.map(n => {
      const timeAgo = this.formatTimeAgo(n.timestamp);
      const isUnread = !n.read;

      if (n.type === 'email_reminder_received') {
        return `
          <div class="p-3.5 rounded-2xl border ${isUnread ? 'bg-terra-forestLight/40 border-terra-forest/40 ring-1 ring-terra-forest/20' : 'bg-terra-card border-terra-border/80 shadow-soft'} space-y-2.5 transition-all">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] font-bold text-terra-forest bg-terra-forestLight px-2 py-0.5 rounded border border-terra-forest/20 flex items-center gap-1">
                  <svg class="w-3 h-3 text-terra-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                  <span>Class Reminder</span>
                </span>
                ${isUnread ? '<span class="unread-dot w-2 h-2 rounded-full bg-terra-forest shrink-0"></span>' : ''}
              </div>
              <span class="text-[10px] text-terra-muted font-medium">${timeAgo}</span>
            </div>

            <div>
              <p class="text-xs font-bold text-terra-charcoal leading-snug">${n.topic || 'Curricular Lecture Session'}</p>
              <div class="flex items-center gap-2 mt-1.5 text-[10px] text-terra-muted flex-wrap">
                <span class="font-bold text-terra-forest">⏰ ${n.timings || '7:00 PM'}</span>
                <span>•</span>
                <span class="bg-terra-amberBg text-terra-amber font-semibold px-1.5 py-0.2 rounded border border-terra-amberBorder">In ${n.leadDurationText || '30 Mins'}</span>
                <span>•</span>
                <span class="bg-terra-forestLight text-terra-forest font-semibold px-1.5 py-0.2 rounded border border-terra-forest/20">${n.subject || 'Biochemistry'}</span>
              </div>
            </div>

            <div class="p-2 rounded-xl bg-terra-sand/50 border border-terra-border/60 text-[10.5px] text-terra-muted space-y-0.5">
              <div class="flex items-center justify-between">
                <span>Delivered To:</span>
                <span class="font-mono font-semibold text-terra-charcoal truncate max-w-[180px]">${n.recipientEmail}</span>
              </div>
            </div>

            <div class="pt-2 border-t border-terra-border/60 flex items-center justify-between gap-2">
              <a href="https://meet.google.com/pwm-med" target="_blank" class="text-xs font-bold text-terra-forest hover:underline flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"></path></svg>
                <span>Join Room</span>
              </a>
              <button type="button" class="btn-preview-mobile-faculty-email px-2.5 py-1 rounded-lg bg-terra-sand hover:bg-terra-sandHover text-terra-charcoal text-xs font-bold flex items-center gap-1 border border-terra-border cursor-pointer transition-colors" data-notif-id="${n.id}">
                <span>View Email</span>
              </button>
            </div>
          </div>
        `;
      }

      // Default system alert
      return `
        <div class="p-3.5 rounded-2xl border ${isUnread ? 'bg-terra-forestLight/40 border-terra-forest/40' : 'bg-terra-card border-terra-border/80 shadow-soft'} space-y-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-terra-forest bg-terra-forestLight px-2 py-0.5 rounded uppercase border border-terra-forest/20">
              ${n.title || 'System Notification'}
            </span>
            <span class="text-[10px] text-terra-muted font-medium">${timeAgo}</span>
          </div>
          <p class="text-xs font-bold text-terra-charcoal">${n.title}</p>
          <p class="text-[11px] text-terra-muted leading-relaxed">${n.body}</p>
        </div>
      `;
    }).join('');

    // Bind "View Email" buttons on mobile
    feed.querySelectorAll('.btn-preview-mobile-faculty-email').forEach(btn => {
      btn.addEventListener('click', () => {
        const notifId = btn.getAttribute('data-notif-id');
        const notif = notifs.find(n => n.id === notifId);
        if (notif) {
          reminderEmailService.markNotificationAsRead(notifId);
          this.openFacultyEmailPreview({
            from: notif.senderEmail,
            to: `${notif.facultyName} <${notif.recipientEmail}>`,
            subject: `[PW MedEd] Class Reminder: ${notif.topic}`,
            html: notif.emailHtml
          });
          this.renderMobileNotifications();
          this.renderFacultyNotifications();
        }
      });
    });
  }
}

// Guaranteed Bootstrap: executes immediately if DOM is ready, or attaches listener
function boot() {
  window.facultyDashboard = new FacultyDashboardController();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
}
