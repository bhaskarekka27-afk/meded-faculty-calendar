/**
 * PW MedEd - Minimal Unified Faculty Workload Dashboard Renderer
 * Displays unified minimal header, metrics, custom 3D dropdown filters, and faculty workload breakdown.
 * Uses custom 3D pill dropdown popups matching header Batch selector aesthetic.
 */

import { renderPlatformBadges } from './platformBadge.js';

export function renderWorkloadView(container, workloadManager, state = {}) {
  if (!container || !workloadManager) return;

  const currentFilters = {
    month: state.month || 'all',
    platform: state.platform || 'all',
    faculty: state.faculty || 'all',
    batch: state.batch || 'all',
    search: state.search || ''
  };

  const metrics = workloadManager.getOverallMetrics(currentFilters);
  const summaries = workloadManager.getFacultySummaries(currentFilters);

  const availableMonths = workloadManager.getAvailableMonths();
  const availableBatches = workloadManager.getAvailableBatches();
  const availableFaculty = workloadManager.getAvailableFaculty();

  const maxHours = summaries.length > 0 ? summaries[0].totalHours : 1;

  // Option helper for custom dropdown items
  const renderOptions = (type, items, selectedVal) => {
    return items.map(item => {
      const val = typeof item === 'object' ? item.val : item;
      const label = typeof item === 'object' ? item.label : item;
      const isSelected = selectedVal.toString().toLowerCase() === val.toString().toLowerCase();

      return `
        <div class="wl-dropdown-opt px-3 py-1.5 text-xs font-semibold rounded-lg hover:bg-[#f4efe6] cursor-pointer flex items-center justify-between transition-colors ${isSelected ? 'bg-[#eef4f0] text-[#2d4d37] font-bold' : 'text-[#3b433c]'}" data-filter-type="${type}" data-val="${val}">
          <span class="truncate">${label}</span>
          ${isSelected ? '<span class="material-symbols-outlined text-[15px] text-[#4a7c59] shrink-0 ml-1.5">check</span>' : ''}
        </div>
      `;
    }).join('');
  };

  const monthLabel = currentFilters.month === 'all' ? 'All Months' : currentFilters.month;
  const platformLabel = currentFilters.platform === 'all' ? 'All Platforms' : (currentFilters.platform === 'app' ? 'App Only' : 'YouTube Only');
  const facultyLabel = currentFilters.faculty === 'all' ? 'All Faculty' : currentFilters.faculty;
  const batchLabel = currentFilters.batch === 'all' ? 'All Batches' : currentFilters.batch;

  const monthOptions = [{ val: 'all', label: 'All Months' }, ...availableMonths.map(m => ({ val: m, label: m }))];
  const platformOptions = [
    { val: 'all', label: 'All Platforms (App & YT)' },
    { val: 'app', label: '📱 Mobile App Only' },
    { val: 'youtube', label: '🔴 YouTube Channel Only' }
  ];
  const facultyOptions = [{ val: 'all', label: 'All Faculty' }, ...availableFaculty.map(f => ({ val: f, label: f }))];
  const batchOptions = [{ val: 'all', label: 'All Batches' }, ...availableBatches.map(b => ({ val: b, label: b }))];

  let html = `
    <div class="space-y-4">
      <!-- 1. UNIFIED MINIMAL HEADER & METRICS PANEL -->
      <div class="panel-3d rounded-2xl p-4 bg-white space-y-3.5">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-[#eef4f0] text-[#4a7c59] border border-[#cde0d3] flex items-center justify-center font-bold shrink-0">
              <span class="material-symbols-outlined text-[22px]">work_history</span>
            </div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h2 class="font-headline font-bold text-lg text-[#2c332d]">Faculty Workload Analytics</h2>
                <span class="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3] badge-3d">
                  Live Sheet Sync
                </span>
              </div>
              <p class="text-[11.5px] text-[#68736a] mt-0.5">
                Faculty teaching hours breakdown split by App (Mobile) &amp; YouTube Channel
              </p>
            </div>
          </div>

          <button id="wlRefreshBtn" class="btn-3d-secondary px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#2c332d] flex items-center gap-1.5 cursor-pointer">
            <span class="material-symbols-outlined text-[15px] text-[#4a7c59]">sync</span>
            <span>Refresh Data</span>
          </button>
        </div>

        <!-- Sleek Inline Metrics Strip -->
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-3 border-t border-[#f0ece4]">
          <!-- Total Hours -->
          <div class="p-2.5 rounded-xl bg-[#f7f4ed] border border-[#ded5c6] card-3d-static">
            <span class="text-[10px] font-bold text-[#68736a] uppercase block">Total Working Hours</span>
            <strong class="font-headline text-lg text-[#2c332d]">${metrics.totalHours} <span class="text-xs font-normal text-[#68736a]">hrs</span></strong>
          </div>
          <!-- App Hours -->
          <div class="p-2.5 rounded-xl bg-[#eef4f0] border border-[#cde0d3] card-3d-static">
            <span class="text-[10px] font-bold text-[#3b6347] uppercase block flex items-center gap-1">
              <span class="material-symbols-outlined text-[13px]">smartphone</span> App Hours
            </span>
            <strong class="font-headline text-lg text-[#2d4d37]">${metrics.appHours} <span class="text-xs font-normal text-[#576058]">hrs</span></strong>
          </div>
          <!-- YT Hours -->
          <div class="p-2.5 rounded-xl bg-[#fbf3ec] border border-[#eed9cc] card-3d-static">
            <span class="text-[10px] font-bold text-[#c26d3e] uppercase block flex items-center gap-1">
              <svg class="w-3 h-3 fill-[#c26d3e]" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> YT Hours
            </span>
            <strong class="font-headline text-lg text-[#9c4c23]">${metrics.youtubeHours} <span class="text-xs font-normal text-[#576058]">hrs</span></strong>
          </div>
          <!-- Sessions -->
          <div class="p-2.5 rounded-xl bg-[#f7f4ed] border border-[#ded5c6] card-3d-static">
            <span class="text-[10px] font-bold text-[#68736a] uppercase block">Total Sessions</span>
            <strong class="font-headline text-lg text-[#2c332d]">${metrics.totalSessions}</strong>
          </div>
          <!-- Teaching Doctors -->
          <div class="p-2.5 rounded-xl bg-[#f7f4ed] border border-[#ded5c6] card-3d-static">
            <span class="text-[10px] font-bold text-[#68736a] uppercase block">Active Doctors</span>
            <strong class="font-headline text-lg text-[#2c332d]">${metrics.activeFacultyCount}</strong>
          </div>
        </div>
      </div>

      <!-- 2. MINIMAL CUSTOM 3D DROPDOWN FILTER BAR (Matching Header Batch Selector) -->
      <div class="panel-3d p-3 rounded-2xl bg-white flex flex-wrap items-center justify-between gap-2.5">
        <div class="flex items-center gap-2.5 flex-wrap text-xs">
          
          <!-- Month Custom Pill Dropdown -->
          <div class="relative">
            <div id="wlMonthPill" class="pill-3d flex items-center gap-1.5 text-xs bg-[#f7f4ed] hover:bg-[#ede7da] transition-all border border-[#ded5c6] rounded-xl px-3.5 py-1.5 cursor-pointer text-[#3b433c] select-none">
              <span class="material-symbols-outlined text-[#4a7c59] text-[16px]">calendar_month</span>
              <span class="font-bold text-[#576058]">Month:</span>
              <span class="font-bold text-[#2c332d]">${monthLabel}</span>
              <span class="material-symbols-outlined text-[#788279] text-[15px]">expand_more</span>
            </div>
            <div id="wlMonthDropdown" class="hidden absolute left-0 top-full mt-1.5 w-52 bg-white border border-[#ded5c6] rounded-xl modal-3d p-1.5 z-50 shadow-xl space-y-0.5">
              ${renderOptions('month', monthOptions, currentFilters.month)}
            </div>
          </div>

          <!-- Platform Custom Pill Dropdown -->
          <div class="relative">
            <div id="wlPlatformPill" class="pill-3d flex items-center gap-1.5 text-xs bg-[#f7f4ed] hover:bg-[#ede7da] transition-all border border-[#ded5c6] rounded-xl px-3.5 py-1.5 cursor-pointer text-[#3b433c] select-none">
              <span class="material-symbols-outlined text-[#c26d3e] text-[16px]">devices</span>
              <span class="font-bold text-[#576058]">Platform:</span>
              <span class="font-bold text-[#2c332d]">${platformLabel}</span>
              <span class="material-symbols-outlined text-[#788279] text-[15px]">expand_more</span>
            </div>
            <div id="wlPlatformDropdown" class="hidden absolute left-0 top-full mt-1.5 w-56 bg-white border border-[#ded5c6] rounded-xl modal-3d p-1.5 z-50 shadow-xl space-y-0.5">
              ${renderOptions('platform', platformOptions, currentFilters.platform)}
            </div>
          </div>

          <!-- Faculty Custom Pill Dropdown -->
          <div class="relative">
            <div id="wlFacultyPill" class="pill-3d flex items-center gap-1.5 text-xs bg-[#f7f4ed] hover:bg-[#ede7da] transition-all border border-[#ded5c6] rounded-xl px-3.5 py-1.5 cursor-pointer text-[#3b433c] select-none">
              <span class="material-symbols-outlined text-[#4a7c59] text-[16px]">person</span>
              <span class="font-bold text-[#576058]">Faculty:</span>
              <span class="font-bold text-[#2c332d] truncate max-w-[130px]">${facultyLabel}</span>
              <span class="material-symbols-outlined text-[#788279] text-[15px]">expand_more</span>
            </div>
            <div id="wlFacultyDropdown" class="hidden absolute left-0 top-full mt-1.5 w-60 bg-white border border-[#ded5c6] rounded-xl modal-3d p-1.5 z-50 shadow-xl space-y-0.5 max-h-64 overflow-y-auto">
              ${renderOptions('faculty', facultyOptions, currentFilters.faculty)}
            </div>
          </div>

          <!-- Batch Custom Pill Dropdown -->
          <div class="relative">
            <div id="wlBatchPill" class="pill-3d flex items-center gap-1.5 text-xs bg-[#f7f4ed] hover:bg-[#ede7da] transition-all border border-[#ded5c6] rounded-xl px-3.5 py-1.5 cursor-pointer text-[#3b433c] select-none">
              <span class="material-symbols-outlined text-[#4a7c59] text-[16px]">school</span>
              <span class="font-bold text-[#576058]">Batch:</span>
              <span class="font-bold text-[#2c332d] truncate max-w-[130px]">${batchLabel}</span>
              <span class="material-symbols-outlined text-[#788279] text-[15px]">expand_more</span>
            </div>
            <div id="wlBatchDropdown" class="hidden absolute left-0 top-full mt-1.5 w-64 bg-white border border-[#ded5c6] rounded-xl modal-3d p-1.5 z-50 shadow-xl space-y-0.5 max-h-64 overflow-y-auto">
              ${renderOptions('batch', batchOptions, currentFilters.batch)}
            </div>
          </div>

        </div>

        <!-- Search Input -->
        <div class="relative min-w-[200px] flex-1 sm:flex-none">
          <span class="material-symbols-outlined absolute left-3 top-2 text-[16px] text-[#68736a] pointer-events-none">search</span>
          <input type="text" id="wlSearchInput" value="${currentFilters.search}" placeholder="Search workload..." class="w-full pl-9 pr-3 py-1.5 text-xs bg-[#f7f4ed] hover:bg-white focus:bg-white text-[#2c332d] font-semibold border border-[#ded5c6] rounded-xl outline-none focus:border-[#4a7c59] transition-all input-3d" />
        </div>
      </div>

      <!-- 3. UNIFIED FACULTY WORKLOAD BREAKDOWN -->
      <div class="panel-3d rounded-2xl p-4 bg-white">
        <div class="flex items-center justify-between pb-3 mb-3 border-b border-[#e5dfd5]">
          <h3 class="font-headline font-bold text-base text-[#2c332d]">Faculty Workload Breakdown</h3>
          <span class="text-xs font-bold text-[#3b6347] bg-[#eef4f0] px-2.5 py-0.5 rounded-lg border border-[#cde0d3]">
            ${summaries.length} Doctors Listed
          </span>
        </div>

        ${summaries.length === 0 ? `
          <div class="p-8 text-center text-[#68736a]">
            <span class="material-symbols-outlined text-[36px] text-[#8b958c] mb-1">search_off</span>
            <p class="font-headline font-bold text-sm text-[#2c332d]">No faculty workload entries match the selected filters</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            ${summaries.map(s => {
              const initial = s.faculty.replace(/^Dr\.\s*/i, '').trim().charAt(0) || 'D';
              const pct = Math.min(100, Math.round((s.totalHours / (maxHours || 1)) * 100));

              return `
                <div class="card-3d p-3.5 rounded-xl border border-[#ded5c6] hover:border-[#4a7c59] transition-all bg-white flex flex-col justify-between space-y-2.5">
                  <div>
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-full bg-[#f4ece1] border border-[#705c30] flex items-center justify-center font-headline font-bold text-sm text-[#705c30] shrink-0">
                          ${initial}
                        </div>
                        <div>
                          <h4 class="font-headline font-bold text-xs sm:text-sm text-[#2c332d] leading-snug">${s.faculty}</h4>
                          <span class="text-[10px] text-[#788279]">Sheet Tab: <strong class="text-[#2c332d]">${s.tabName}</strong></span>
                        </div>
                      </div>

                      <div class="text-right shrink-0">
                        <div class="font-headline font-extrabold text-lg text-[#2d4d37] leading-none">${s.totalHours}h</div>
                        <span class="text-[10px] font-bold text-[#68736a] block mt-0.5">${s.totalSessions} sessions</span>
                      </div>
                    </div>

                    <!-- Workload Bar -->
                    <div class="mt-2">
                      <div class="flex justify-between text-[9.5px] font-bold text-[#576058] mb-0.5">
                        <span>Share</span>
                        <span>${pct}% of top faculty</span>
                      </div>
                      <div class="w-full h-1.5 bg-[#f4efe6] rounded-full overflow-hidden flex border border-[#ded5c6]">
                        <div class="h-full bg-gradient-to-r from-[#4a7c59] to-[#2d4d37] rounded-full" style="width: ${pct}%"></div>
                      </div>
                    </div>

                    <!-- App vs YT Hours Badges -->
                    <div class="flex items-center gap-2 mt-2.5 flex-wrap text-xs">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3] font-bold text-[10.5px]">
                        <span class="material-symbols-outlined text-[13px]">smartphone</span>
                        <span>App: <strong>${s.appHours}h</strong> (${s.appSessions}s)</span>
                      </span>

                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#fbf3ec] text-[#c26d3e] border border-[#eed9cc] font-bold text-[10.5px]">
                        <svg class="w-2.5 h-2.5 fill-[#c26d3e]" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        <span>YT: <strong>${s.youtubeHours}h</strong> (${s.youtubeSessions}s)</span>
                      </span>
                    </div>
                  </div>

                  <div class="pt-2 border-t border-[#f0ece4] flex items-center justify-between text-[10px] text-[#68736a] flex-wrap gap-1">
                    <span class="truncate max-w-[220px]">Batches: <strong>${s.batches.join(', ') || 'N/A'}</strong></span>
                    <span>Months: <strong>${s.months.join(', ') || 'N/A'}</strong></span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Custom Dropdown Pill toggle handling
  const toggleDropdown = (dropdownEl) => {
    const allDropdowns = [
      document.getElementById('wlMonthDropdown'),
      document.getElementById('wlPlatformDropdown'),
      document.getElementById('wlFacultyDropdown'),
      document.getElementById('wlBatchDropdown')
    ];
    allDropdowns.forEach(d => {
      if (d && d !== dropdownEl) d.classList.add('hidden');
    });
    if (dropdownEl) dropdownEl.classList.toggle('hidden');
  };

  document.getElementById('wlMonthPill')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown(document.getElementById('wlMonthDropdown'));
  });

  document.getElementById('wlPlatformPill')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown(document.getElementById('wlPlatformDropdown'));
  });

  document.getElementById('wlFacultyPill')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown(document.getElementById('wlFacultyDropdown'));
  });

  document.getElementById('wlBatchPill')?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown(document.getElementById('wlBatchDropdown'));
  });

  // Click outside to close dropdowns
  document.addEventListener('click', (e) => {
    const isPill = e.target.closest('.pill-3d');
    const isDropdown = e.target.closest('.modal-3d');
    if (!isPill && !isDropdown) {
      ['wlMonthDropdown', 'wlPlatformDropdown', 'wlFacultyDropdown', 'wlBatchDropdown'].forEach(id => {
        document.getElementById(id)?.classList.add('hidden');
      });
    }
  });

  // Option select handler
  container.querySelectorAll('.wl-dropdown-opt').forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = opt.getAttribute('data-filter-type');
      const val = opt.getAttribute('data-val');
      if (type && val !== null) {
        state[type] = val;
        renderWorkloadView(container, workloadManager, state);
      }
    });
  });

  // Search input handler
  document.getElementById('wlSearchInput')?.addEventListener('input', (e) => {
    state.search = e.target.value;
    renderWorkloadView(container, workloadManager, state);
  });

  // Refresh handler
  document.getElementById('wlRefreshBtn')?.addEventListener('click', () => {
    workloadManager.loadFromStorage();
    renderWorkloadView(container, workloadManager, state);
  });
}
