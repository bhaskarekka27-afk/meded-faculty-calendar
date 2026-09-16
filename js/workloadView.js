/**
 * PW MedEd - Faculty Workload Dashboard Renderer
 * Renders faculty-wise teaching workload metrics, App vs YouTube hours breakdown, and detailed logs.
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
  const entries = workloadManager.getFilteredEntries(currentFilters);

  const availableMonths = workloadManager.getAvailableMonths();
  const availableBatches = workloadManager.getAvailableBatches();
  const availableFaculty = workloadManager.getAvailableFaculty();

  const maxHours = summaries.length > 0 ? summaries[0].totalHours : 1;

  let html = `
    <div class="space-y-6">
      <!-- 1. TOP HEADER BANNER & SCOPE -->
      <div class="panel-3d rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3.5">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] border border-[#cde0d3] shadow-xs flex items-center justify-center text-[#4a7c59]">
            <span class="material-symbols-outlined text-[28px]">query_stats</span>
          </div>
          <div>
            <div class="flex items-center gap-2 flex-wrap">
              <h2 class="font-headline font-bold text-xl text-[#2c332d]">Faculty Workload Dashboard</h2>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#eef4f0] text-[#3b6347] border border-[#cde0d3] badge-3d">
                Live Sheet Sync • Faculty Hours Tracking
              </span>
            </div>
            <p class="text-xs text-[#576058] mt-0.5">
              Faculty-wise working hours split by App (Mobile) &amp; YouTube Channel across teaching series
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button id="wlRefreshBtn" class="btn-3d-secondary px-3.5 py-2 rounded-xl text-xs font-bold text-[#2c332d] flex items-center gap-1.5 cursor-pointer">
            <span class="material-symbols-outlined text-[16px] text-[#4a7c59]">sync</span>
            <span>Refresh Data</span>
          </button>
        </div>
      </div>

      <!-- 2. SUMMARY METRICS CARDS (5 KPI CARDS) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Total Workload Hours -->
        <div class="panel-3d p-4 rounded-2xl border border-[#ded5c6] card-3d-static">
          <div class="flex items-center justify-between text-[#68736a] text-xs font-bold mb-1">
            <span class="uppercase tracking-wider text-[10px]">Total Working Hours</span>
            <span class="material-symbols-outlined text-[18px] text-[#4a7c59]">schedule</span>
          </div>
          <div class="font-headline font-extrabold text-2xl text-[#2c332d]">
            ${metrics.totalHours} <span class="text-xs font-body font-semibold text-[#68736a]">hrs</span>
          </div>
          <p class="text-[10px] text-[#788279] mt-1 font-medium">Aggregated across active filters</p>
        </div>

        <!-- App Working Hours -->
        <div class="panel-3d p-4 rounded-2xl border border-[#cde0d3] bg-[#fbfdfc] card-3d-static">
          <div class="flex items-center justify-between text-[#3b6347] text-xs font-bold mb-1">
            <span class="uppercase tracking-wider text-[10px] flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">smartphone</span> App Hours
            </span>
            <span class="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3]">App</span>
          </div>
          <div class="font-headline font-extrabold text-2xl text-[#2d4d37]">
            ${metrics.appHours} <span class="text-xs font-body font-semibold text-[#68736a]">hrs</span>
          </div>
          <p class="text-[10px] text-[#576058] mt-1 font-medium">Mobile App live sessions</p>
        </div>

        <!-- YouTube Working Hours -->
        <div class="panel-3d p-4 rounded-2xl border border-[#fca5a5] bg-[#fffaf9] card-3d-static">
          <div class="flex items-center justify-between text-[#e02828] text-xs font-bold mb-1">
            <span class="uppercase tracking-wider text-[10px] flex items-center gap-1">
              <svg class="w-3 h-3 fill-[#e02828]" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              YT Hours
            </span>
            <span class="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-[#feeeed] text-[#e02828] border border-[#fca5a5]">YT</span>
          </div>
          <div class="font-headline font-extrabold text-2xl text-[#b91c1c]">
            ${metrics.youtubeHours} <span class="text-xs font-body font-semibold text-[#68736a]">hrs</span>
          </div>
          <p class="text-[10px] text-[#881337] mt-1 font-medium">YouTube live revisions</p>
        </div>

        <!-- Total Sessions -->
        <div class="panel-3d p-4 rounded-2xl border border-[#ded5c6] card-3d-static">
          <div class="flex items-center justify-between text-[#68736a] text-xs font-bold mb-1">
            <span class="uppercase tracking-wider text-[10px]">Total Sessions</span>
            <span class="material-symbols-outlined text-[18px] text-[#4a7c59]">cast_for_education</span>
          </div>
          <div class="font-headline font-extrabold text-2xl text-[#2c332d]">
            ${metrics.totalSessions}
          </div>
          <p class="text-[10px] text-[#788279] mt-1 font-medium">Scheduled class entries</p>
        </div>

        <!-- Active Faculty Count -->
        <div class="panel-3d p-4 rounded-2xl border border-[#ded5c6] card-3d-static">
          <div class="flex items-center justify-between text-[#68736a] text-xs font-bold mb-1">
            <span class="uppercase tracking-wider text-[10px]">Teaching Doctors</span>
            <span class="material-symbols-outlined text-[18px] text-[#4a7c59]">group</span>
          </div>
          <div class="font-headline font-extrabold text-2xl text-[#2c332d]">
            ${metrics.activeFacultyCount}
          </div>
          <p class="text-[10px] text-[#788279] mt-1 font-medium">Faculty tab sources</p>
        </div>
      </div>

      <!-- 3. INTERACTIVE FILTER BAR -->
      <div class="panel-3d p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2.5 flex-wrap">
          <!-- Month Filter -->
          <div class="flex items-center gap-1.5 bg-[#f4efe6] px-3 py-1.5 rounded-xl border border-[#ded5c6]">
            <span class="material-symbols-outlined text-[16px] text-[#4a7c59]">calendar_month</span>
            <label class="text-xs font-bold text-[#2c332d]">Month:</label>
            <select id="wlFilterMonth" class="bg-transparent text-xs font-bold text-[#2c332d] outline-none cursor-pointer">
              <option value="all" ${currentFilters.month === 'all' ? 'selected' : ''}>All Months</option>
              ${availableMonths.map(m => `<option value="${m}" ${currentFilters.month.toLowerCase() === m.toLowerCase() ? 'selected' : ''}>${m}</option>`).join('')}
            </select>
          </div>

          <!-- Platform Filter -->
          <div class="flex items-center gap-1.5 bg-[#f4efe6] px-3 py-1.5 rounded-xl border border-[#ded5c6]">
            <span class="material-symbols-outlined text-[16px] text-[#e02828]">devices</span>
            <label class="text-xs font-bold text-[#2c332d]">Platform:</label>
            <select id="wlFilterPlatform" class="bg-transparent text-xs font-bold text-[#2c332d] outline-none cursor-pointer">
              <option value="all" ${currentFilters.platform === 'all' ? 'selected' : ''}>All Platforms (App &amp; YT)</option>
              <option value="app" ${currentFilters.platform === 'app' ? 'selected' : ''}>📱 App Only</option>
              <option value="youtube" ${currentFilters.platform === 'youtube' ? 'selected' : ''}>🔴 YouTube Only</option>
            </select>
          </div>

          <!-- Faculty Filter -->
          <div class="flex items-center gap-1.5 bg-[#f4efe6] px-3 py-1.5 rounded-xl border border-[#ded5c6]">
            <span class="material-symbols-outlined text-[16px] text-[#4a7c59]">person</span>
            <label class="text-xs font-bold text-[#2c332d]">Faculty:</label>
            <select id="wlFilterFaculty" class="bg-transparent text-xs font-bold text-[#2c332d] outline-none cursor-pointer max-w-[140px] truncate">
              <option value="all" ${currentFilters.faculty === 'all' ? 'selected' : ''}>All Faculty</option>
              ${availableFaculty.map(f => `<option value="${f}" ${currentFilters.faculty.toLowerCase().includes(f.toLowerCase()) ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
          </div>

          <!-- Batch Filter -->
          <div class="flex items-center gap-1.5 bg-[#f4efe6] px-3 py-1.5 rounded-xl border border-[#ded5c6]">
            <span class="material-symbols-outlined text-[16px] text-[#4a7c59]">school</span>
            <label class="text-xs font-bold text-[#2c332d]">Batch:</label>
            <select id="wlFilterBatch" class="bg-transparent text-xs font-bold text-[#2c332d] outline-none cursor-pointer max-w-[150px] truncate">
              <option value="all" ${currentFilters.batch === 'all' ? 'selected' : ''}>All Batches</option>
              ${availableBatches.map(b => `<option value="${b}" ${currentFilters.batch.toLowerCase().includes(b.toLowerCase()) ? 'selected' : ''}>${b}</option>`).join('')}
            </select>
          </div>
        </div>

        <!-- Search Input -->
        <div class="relative min-w-[200px] flex-1 sm:flex-none">
          <span class="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-[#68736a]">search</span>
          <input type="text" id="wlSearchInput" value="${currentFilters.search}" placeholder="Search faculty, batch, date..." class="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#ded5c6] rounded-xl outline-none focus:border-[#4a7c59] transition-all" />
        </div>
      </div>

      <!-- 4. FACULTY WORKLOAD BREAKDOWN CARDS -->
      <div class="panel-3d rounded-2xl p-5">
        <div class="flex items-center justify-between pb-3.5 mb-4 border-b border-[#e5dfd5]">
          <div>
            <h3 class="font-headline font-bold text-lg text-[#2c332d]">Faculty Workload Breakdown</h3>
            <p class="text-xs text-[#68736a] mt-0.5">Working hours per faculty member split by platform</p>
          </div>
          <span class="text-xs font-bold text-[#4a7c59] bg-[#eef4f0] px-3 py-1 rounded-xl border border-[#cde0d3]">
            ${summaries.length} Doctors Listed
          </span>
        </div>

        ${summaries.length === 0 ? `
          <div class="p-8 text-center text-[#68736a]">
            <span class="material-symbols-outlined text-[40px] text-[#8b958c] mb-2">error</span>
            <p class="font-headline font-bold text-base text-[#2c332d]">No workload entries match the selected filters</p>
            <p class="text-xs text-[#788279] mt-1">Try selecting "All Months" or "All Platforms".</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${summaries.map(s => {
              const initial = s.faculty.replace(/^Dr\.\s*/i, '').trim().charAt(0) || 'D';
              const pct = Math.min(100, Math.round((s.totalHours / (maxHours || 1)) * 100));

              return `
                <div class="card-3d p-4 rounded-xl border border-[#ded5c6] hover:border-[#4a7c59] transition-all bg-white flex flex-col justify-between">
                  <div>
                    <div class="flex items-start justify-between gap-2 mb-2">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-[#f4ece1] border border-[#705c30] flex items-center justify-center font-headline font-bold text-base text-[#705c30] shrink-0">
                          ${initial}
                        </div>
                        <div>
                          <h4 class="font-headline font-bold text-sm text-[#2c332d] leading-snug">${s.faculty}</h4>
                          <span class="text-[10px] text-[#788279] font-medium">Sheet Tab: <strong class="text-[#2c332d]">${s.tabName}</strong></span>
                        </div>
                      </div>

                      <div class="text-right">
                        <div class="font-headline font-extrabold text-xl text-[#2d4d37] leading-none">${s.totalHours}h</div>
                        <span class="text-[10px] font-bold text-[#68736a] block mt-0.5">${s.totalSessions} sessions</span>
                      </div>
                    </div>

                    <!-- Workload Progress Bar -->
                    <div class="my-2.5">
                      <div class="flex justify-between text-[10px] font-bold text-[#576058] mb-1">
                        <span>Workload Share</span>
                        <span>${pct}% of top faculty</span>
                      </div>
                      <div class="w-full h-2 bg-[#f4efe6] rounded-full overflow-hidden flex border border-[#ded5c6]">
                        <div class="h-full bg-gradient-to-r from-[#4a7c59] to-[#2d4d37] rounded-full" style="width: ${pct}%"></div>
                      </div>
                    </div>

                    <!-- App vs YT Hours Breakdown Pills -->
                    <div class="flex items-center gap-2 mt-3 flex-wrap text-xs">
                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3] font-bold text-[11px]">
                        <span class="material-symbols-outlined text-[14px]">smartphone</span>
                        <span>App: <strong>${s.appHours}h</strong> (${s.appSessions} sessions)</span>
                      </span>

                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#feeeed] text-[#e02828] border border-[#fca5a5] font-bold text-[11px]">
                        <svg class="w-3 h-3 fill-[#e02828]" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                        <span>YT: <strong>${s.youtubeHours}h</strong> (${s.youtubeSessions} sessions)</span>
                      </span>
                    </div>
                  </div>

                  <div class="mt-3 pt-2.5 border-t border-[#f0ece4] flex items-center justify-between text-[10px] text-[#68736a]">
                    <span class="truncate max-w-[200px]">Batches: <strong>${s.batches.join(', ') || 'N/A'}</strong></span>
                    <span>Months: <strong>${s.months.join(', ') || 'N/A'}</strong></span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- 5. DETAILED WORKLOAD LOG TABLE -->
      <div class="panel-3d rounded-2xl p-5 overflow-hidden">
        <div class="flex items-center justify-between pb-3.5 mb-4 border-b border-[#e5dfd5]">
          <div>
            <h3 class="font-headline font-bold text-lg text-[#2c332d]">Detailed Workload Log</h3>
            <p class="text-xs text-[#68736a] mt-0.5">Individual lecture session entries with working hours</p>
          </div>
          <span class="text-xs font-bold text-[#4a7c59] bg-[#eef4f0] px-3 py-1 rounded-xl border border-[#cde0d3]">
            ${entries.length} Logged Entries
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs border-collapse">
            <thead>
              <tr class="bg-[#f7f4ed] text-[#576058] uppercase font-bold text-[10px] border-b border-[#ded5c6]">
                <th class="p-3">Date &amp; Month</th>
                <th class="p-3">Faculty Member</th>
                <th class="p-3">Sheet Tab</th>
                <th class="p-3">Batch Name</th>
                <th class="p-3">Live Type</th>
                <th class="p-3 text-right">Working Hours</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[#e8e2d8]">
              ${entries.map(e => {
                const isYt = e.isYoutube || (e.liveType && e.liveType.toLowerCase() === 'youtube');
                const badge = isYt 
                  ? `<span class="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded bg-[#feeeed] text-[#e02828] border border-[#fca5a5]"><svg class="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg> Youtube</span>`
                  : `<span class="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3]"><span class="material-symbols-outlined text-[12px] text-[#2d4d37]">smartphone</span> App</span>`;

                return `
                  <tr class="hover:bg-[#fbf9f5] transition-colors">
                    <td class="p-3 font-semibold text-[#2c332d]">
                      <span class="block">${e.dateRaw}</span>
                      <span class="text-[10px] text-[#788279]">${e.month}</span>
                    </td>
                    <td class="p-3 font-bold text-[#2c332d]">${e.faculty}</td>
                    <td class="p-3 text-[#576058]">${e.tabName}</td>
                    <td class="p-3 font-semibold text-[#3b6347]">${e.batchName}</td>
                    <td class="p-3">${badge}</td>
                    <td class="p-3 text-right font-headline font-extrabold text-sm text-[#2d4d37]">${e.workingHours} hrs</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;

  // Bind filter change handlers
  document.getElementById('wlFilterMonth')?.addEventListener('change', (e) => {
    state.month = e.target.value;
    renderWorkloadView(container, workloadManager, state);
  });

  document.getElementById('wlFilterPlatform')?.addEventListener('change', (e) => {
    state.platform = e.target.value;
    renderWorkloadView(container, workloadManager, state);
  });

  document.getElementById('wlFilterFaculty')?.addEventListener('change', (e) => {
    state.faculty = e.target.value;
    renderWorkloadView(container, workloadManager, state);
  });

  document.getElementById('wlFilterBatch')?.addEventListener('change', (e) => {
    state.batch = e.target.value;
    renderWorkloadView(container, workloadManager, state);
  });

  document.getElementById('wlSearchInput')?.addEventListener('input', (e) => {
    state.search = e.target.value;
    renderWorkloadView(container, workloadManager, state);
  });

  document.getElementById('wlRefreshBtn')?.addEventListener('click', () => {
    workloadManager.loadFromStorage();
    renderWorkloadView(container, workloadManager, state);
  });
}
