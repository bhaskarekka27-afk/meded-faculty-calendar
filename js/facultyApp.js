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

export class FacultyDashboardController {
  constructor() {
    this.batchManager = new BatchManager();
    this.batches = this.batchManager.getBatches();
    this.activeBatchId = this.batches[0] ? this.batches[0].id : null;

    // Faculty identity (defaults to Dr. Rajesh Jambhulkar)
    this.currentFaculty = 'Dr. Rajesh Jambhulkar';
    this.facultySubject = 'Biochemistry';

    // Calendar state - defaults to October 2026 where lecture data exists
    this.currentYear = 2026;
    this.currentMonth = 9; // 0-indexed: 9 is October
    this.currentWeekStart = new Date(2026, 9, 15); // Oct 15, 2026
    this.calendarView = 'month'; // 'month', 'week', 'timeline'
    this.activeFilterTab = 'total'; // 'today', 'upcoming', 'total'
    this.searchQuery = '';

    // Simulated "Today" ISO matching academic schedule
    this.todayIso = '2026-10-15';

    this.init();
  }

  init() {
    this.loadFacultySession();
    this.bindDOM();
    this.populateBatchDropdown();
    this.populateFacultySwitcher();
    this.setupFacultyNotificationDrawer();
    this.setupFacultyEmailPreviewModal();
    this.render();
    this.renderFacultyNotifications();
  }

  loadFacultySession() {
    try {
      const stored = localStorage.getItem('meded_active_user');
      if (stored) {
        const user = JSON.parse(stored);
        if (user.role === 'faculty' || !user.role) {
          if (user.name && user.name.trim()) {
            this.currentFaculty = user.name.trim();
          }
          if (user.subject && user.subject.trim()) {
            this.facultySubject = user.subject.trim();
          }
        }
      }
    } catch (e) {
      console.warn('Could not read user session:', e);
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
    this.exportIcsBtn = document.getElementById('facultyExportIcsBtn');

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
      this.currentYear = 2026;
      this.currentMonth = 9; // October
      this.currentWeekStart = new Date(2026, 9, 15);
      this.render();
    });

    // Search Input
    this.searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.renderCurrentView();
    });

    // Export .ics Schedule
    this.exportIcsBtn?.addEventListener('click', () => this.exportScheduleIcs());

    // Modal Close
    this.closeModalBtn?.addEventListener('click', () => this.closeDetailModal());
    this.modalCloseBtn?.addEventListener('click', () => this.closeDetailModal());
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

    const appBatches = this.batches.filter(b => b.platform !== 'youtube_app');
    const ytBatches = this.batches.filter(b => b.platform === 'youtube_app');

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

    // 2. YouTube & App Series Planners
    if (ytBatches.length > 0) {
      const header = document.createElement('div');
      header.className = 'px-3.5 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#e02828] flex items-center gap-1';
      header.innerHTML = `
        <svg class="w-3 h-3 fill-[#e02828]" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
        <span>YouTube &amp; App Series Planners</span>
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
    const batchEvents = this.batchManager.getAllEvents(batchId);
    const firstClass = batchEvents.find(e => e.eventType === 'class' && e.isoDate);
    if (firstClass && firstClass.isoDate) {
      const [y, m, d] = firstClass.isoDate.split('-').map(Number);
      if (y && m) {
        this.currentYear = y;
        this.currentMonth = m - 1;
        this.currentWeekStart = new Date(y, m - 1, d || 15);
      }
    }

    if (isAll) {
      // Show all batch classes by default when All Batches is selected
      this.currentFaculty = 'All Faculty';
      this.facultySubject = 'Combined Curriculum';
      this.updateFacultyProfileUI();
    } else {
      // If current faculty is 'All Faculty' or has 0 classes in this new batch, auto-select first available faculty
      const facultyInNewBatch = batchEvents.filter(e => e.eventType === 'class' && e.faculty && e.faculty.toLowerCase().includes(this.currentFaculty.toLowerCase()));
      if (this.currentFaculty === 'All Faculty' || facultyInNewBatch.length === 0) {
        const firstFac = batchEvents.find(e => e.eventType === 'class' && e.faculty && !e.faculty.toLowerCase().includes('cool off'));
        if (firstFac && firstFac.faculty) {
          this.currentFaculty = firstFac.faculty.trim();
          this.facultySubject = firstFac.subject || 'Faculty';
          this.updateFacultyProfileUI();
        }
      }
    }

    // Close batch dropdown popup immediately
    this.batchDropdown?.classList.add('hidden');

    // Re-populate batch dropdown list so checkmark updates to the selected batch
    this.populateBatchDropdown();

    // Re-populate faculty switcher with new batch faculty
    this.populateFacultySwitcher();

    // Re-render calendar views and metric tabs
    this.render();
    this.showToast(isAll ? 'Switched to: All Batches (Combined Schedule)' : `Switched to: ${batch ? batch.name : 'Batch'}`);
  }

  populateFacultySwitcher() {
    if (!this.profilesList) return;
    this.profilesList.innerHTML = '';

    const allBatchEvents = this.batchManager.getAllEvents(this.activeBatchId);
    const facultyMap = new Map();

    allBatchEvents.forEach(ev => {
      if (ev.eventType === 'class' && ev.faculty && !ev.faculty.toLowerCase().includes('cool off')) {
        const facName = ev.faculty.trim();
        if (!facultyMap.has(facName)) {
          facultyMap.set(facName, {
            name: facName,
            subject: ev.subject || 'Faculty',
            count: 0
          });
        }
        facultyMap.get(facName).count++;
      }
    });

    // Fallback if no classes detected
    if (facultyMap.size === 0) {
      facultyMap.set('Dr. Rajesh Jambhulkar', { name: 'Dr. Rajesh Jambhulkar', subject: 'Biochemistry', count: 12 });
      facultyMap.set('Dr. Pradeep Pawar', { name: 'Dr. Pradeep Pawar', subject: 'Anatomy', count: 12 });
      facultyMap.set('Dr. Vivek Nalgirkar', { name: 'Dr. Vivek Nalgirkar', subject: 'Physiology', count: 10 });
    }

    // When viewing 'all' batches, add an "All Faculty & Batches (All Classes)" option at top
    if (this.activeBatchId === 'all') {
      const isAllFaculty = this.currentFaculty === 'All Faculty' || this.currentFaculty === 'all';
      const totalCombinedClasses = allBatchEvents.filter(e => e.eventType === 'class').length;
      const allItem = document.createElement('button');
      allItem.type = 'button';
      allItem.className = `w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-[#f4efe6] transition-colors border-b border-[#f0ece4] ${
        isAllFaculty ? 'bg-[#eef4f0] font-bold text-[#3b6347]' : 'text-[#2c332d]'
      }`;
      allItem.innerHTML = `
        <div class="flex items-center gap-2.5 truncate mr-2">
          <div class="w-6 h-6 rounded-full bg-[#4a7c59] text-white text-[9px] font-bold flex items-center justify-center shrink-0 shadow-xs">
            ALL
          </div>
          <div class="truncate">
            <span class="block truncate leading-tight text-xs font-semibold">All Faculty &amp; Batches</span>
            <span class="text-[10px] text-[#788279] block">All Classes Combined • ${totalCombinedClasses} classes</span>
          </div>
        </div>
        ${isAllFaculty ? '<span class="material-symbols-outlined text-[16px] text-[#4a7c59]">check</span>' : ''}
      `;
      allItem.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchFaculty('All Faculty', 'Combined Curriculum');
      });
      this.profilesList.appendChild(allItem);
    }

    facultyMap.forEach(fac => {
      const isCurrent = fac.name.toLowerCase() === this.currentFaculty.toLowerCase();
      const initials = this.getFacultyInitials(fac.name);

      const item = document.createElement('button');
      item.type = 'button';
      item.className = `w-full text-left px-3.5 py-2 flex items-center justify-between hover:bg-[#f4efe6] transition-colors ${
        isCurrent ? 'bg-[#eef4f0] font-bold text-[#3b6347]' : 'text-[#2c332d]'
      }`;
      item.innerHTML = `
        <div class="flex items-center gap-2.5 truncate mr-2">
          <div class="w-6 h-6 rounded-full bg-white border border-[#ded5c6] text-[10px] font-bold flex items-center justify-center text-[#4a7c59] shrink-0 shadow-xs">
            ${initials}
          </div>
          <div class="truncate">
            <span class="block truncate leading-tight text-xs font-semibold">${fac.name}</span>
            <span class="text-[10px] text-[#788279] block">${fac.subject} • ${fac.count} classes</span>
          </div>
        </div>
        ${isCurrent ? '<span class="material-symbols-outlined text-[16px] text-[#4a7c59]">check</span>' : ''}
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.switchFaculty(fac.name, fac.subject);
      });
      this.profilesList.appendChild(item);
    });

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
    // Re-populate faculty list so checkmark updates to the newly selected faculty
    this.populateFacultySwitcher();
    this.render();
    this.renderFacultyNotifications();
    this.showToast(`Switched view to ${name}`);
  }

  updateFacultyProfileUI() {
    const isAll = this.currentFaculty === 'All Faculty' || this.currentFaculty === 'all';
    const initials = isAll ? 'ALL' : this.getFacultyInitials(this.currentFaculty);
    const displayName = isAll ? 'All Faculty & Batches' : this.currentFaculty;
    const displaySubject = isAll ? 'Combined Curriculum' : this.facultySubject;
    const displayBadge = isAll ? 'All Batches • Combined Schedule' : this.currentFaculty;

    if (this.headerAvatar) this.headerAvatar.textContent = initials;
    if (this.headerName) this.headerName.textContent = displayName;
    if (this.headerSubject) this.headerSubject.textContent = displaySubject;
    if (this.dropdownCurrentName) this.dropdownCurrentName.textContent = displayName;
    if (this.dropdownCurrentSubject) this.dropdownCurrentSubject.textContent = isAll ? 'Combined Curriculum' : `Department of ${this.facultySubject}`;
    if (this.activeNameBadge) this.activeNameBadge.textContent = displayBadge;
  }

  /**
   * Filters events for the active view.
   * When 'All Batches' and 'All Faculty' is selected, returns all events across all batches.
   * When a specific faculty is selected, filters to that faculty.
   */
  getFacultyEvents() {
    const allBatchEvents = this.batchManager.getAllEvents(this.activeBatchId);
    if (this.activeBatchId === 'all' && (this.currentFaculty === 'All Faculty' || this.currentFaculty === 'all')) {
      return allBatchEvents;
    }
    const facultyLower = (this.currentFaculty || '').toLowerCase();

    return allBatchEvents.filter(ev => {
      // Keep cool_off / holiday markers for calendar structure
      if (ev.eventType === 'cool_off' || ev.eventType === 'holiday') return true;
      // Strictly match current faculty
      return ev.eventType === 'class' && ev.faculty && ev.faculty.toLowerCase().includes(facultyLower);
    });
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

      const realTodayIso = new Date().toISOString().split('T')[0];
      isThisWeek = weekDays.some(d => d.isoDate === this.todayIso || d.isoDate === realTodayIso);
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
      const isCurrentMonth = this.currentYear === 2026 && this.currentMonth === 9;
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
      this.switchView('timeline');
    } else if (tabKey === 'upcoming') {
      this.tabUpcoming?.classList.add('tab-active-glow');
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
        this.currentWeekStart = new Date(this.currentYear, this.currentMonth, 15);
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
      this.currentWeekStart = new Date(this.currentYear, this.currentMonth, 15);
    } else if (this.calendarView === 'week') {
      this.currentWeekStart = new Date(this.currentWeekStart.getTime() + delta * 7 * 86400000);
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
      this.currentWeekStart = new Date(this.currentYear, this.currentMonth, 15);
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
          <div class="${cellClasses}">
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
    const realTodayIso = new Date().toISOString().split('T')[0];
    const isThisWeek = weekDays.some(d => d.isoDate === this.todayIso || d.isoDate === realTodayIso);

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

    const modalSubjectBadge = document.getElementById('modalSubjectBadge');
    const modalDetailTitle = document.getElementById('modalDetailTitle');
    const modalDetailBatch = document.getElementById('modalDetailBatch');
    const modalDetailDate = document.getElementById('modalDetailDate');
    const modalDetailTimings = document.getElementById('modalDetailTimings');
    const modalDetailDuration = document.getElementById('modalDetailDuration');
    const modalDetailFaculty = document.getElementById('modalDetailFaculty');
    const modalDetailTopic = document.getElementById('modalDetailTopic');

    if (modalSubjectBadge) modalSubjectBadge.textContent = ev.subject || 'Clinical Lecture';
    if (modalDetailTitle) modalDetailTitle.textContent = ev.topic || ev.chapter || 'Lecture Session';
    if (modalDetailBatch) {
      modalDetailBatch.innerHTML = `${renderBatchBadge(ev.batchName || 'PW MedEd Batch')} ${renderPlatformBadges(ev, { size: 'sm' })} ${ev.chapter ? `• ${ev.chapter}` : ''}`;
      modalDetailBatch.className = 'inline-flex items-center gap-1.5 flex-wrap';
    }
    if (modalDetailDate) modalDetailDate.textContent = ev.dateRaw || ev.isoDate || 'Scheduled Date';
    if (modalDetailTimings) modalDetailTimings.textContent = (ev.timings || '7:00 PM - 9:00 PM').replace(/\s*to\s*/i, ' – ');
    if (modalDetailDuration) modalDetailDuration.textContent = `• ${ev.duration || '2 Hours'}`;
    if (modalDetailFaculty) modalDetailFaculty.textContent = ev.faculty || this.currentFaculty;
    if (modalDetailTopic) modalDetailTopic.textContent = ev.topic ? `${ev.topic} (Chapter: ${ev.chapter || 'General'})` : 'Detailed curricular session according to NMC guidelines.';

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
    if (modalDetailTopic) modalDetailTopic.textContent = ev.topic ? `${ev.topic} (Chapter: ${ev.chapter || 'General'})` : 'Detailed curricular session according to NMC guidelines.';

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
      modal?.classList.remove('pointer-events-none');
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
        modal?.classList.add('pointer-events-none');
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
