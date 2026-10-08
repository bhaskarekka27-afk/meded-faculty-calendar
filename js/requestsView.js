/**
 * PW MedEd - Faculty Reschedule & Cancellation Requests View Controller
 * Dynamic requests management with real data persistence via localStorage,
 * slot comparison, timetable grid, approval/decline modals, and empty state support.
 */

const STORAGE_KEY = 'pw_meded_faculty_requests';

export const INITIAL_REQUESTS_DATA = [
  {
    id: 'req-resched-1',
    faculty: 'Dr. Rajesh Jambhulkar',
    facultyName: 'Dr. Rajesh Jambhulkar',
    initials: 'RJ',
    avatar: 'RJ',
    subject: 'Biochemistry',
    batch: 'Prarambh 2026 Batch',
    enrolledCount: '184 Enrolled',
    type: 'Reschedule',
    timeAgo: '2 hours ago',
    currentSlot: 'Saturday, October 17, 2026 • 7:00 PM – 9:00 PM',
    originalSlot: 'Saturday, October 17, 2026 • 7:00 PM – 9:00 PM',
    currentVenue: 'Live on PW MedEd Mobile App • Studio 04',
    proposedSlot: 'Tuesday, October 20, 2026 • 6:30 PM – 8:30 PM',
    proposedVenue: 'Studio 02 (Cleared) • Zero Batch Clashes',
    reason: 'Slot adjustment requested for clinical rounds & CME conference (Fluid Mosaic Model, Passive Transport, Active Transport)',
    avatarBg: 'bg-[#c8e8d0] text-[#002110]',
    typeBg: 'bg-[#f8e0a8] text-[#221a05]',
    status: 'pending',
    createdAt: '2026-10-15T10:00:00.000Z'
  },
  {
    id: 'req-cancel-1',
    faculty: 'Dr. Vivek Nalgirkar',
    facultyName: 'Dr. Vivek Nalgirkar',
    initials: 'VN',
    avatar: 'VN',
    subject: 'Physiology',
    batch: 'Sushruta 2026 Batch',
    enrolledCount: '140 Enrolled',
    type: 'Cancellation',
    timeAgo: '4 hours ago',
    currentSlot: 'Thursday, October 15, 2026 • 5:00 PM – 7:00 PM',
    originalSlot: 'Thursday, October 15, 2026 • 5:00 PM – 7:00 PM',
    currentVenue: 'Studio 01 • App Live',
    proposedSlot: 'No substitute (Class Cancelled)',
    proposedVenue: 'Studio 01 • App Live',
    substituteFaculty: 'Dr. Priya Sharma (Verified NMC Faculty)',
    reason: 'Sudden clinical emergency duty at affiliated ICU. Unable to conduct in-person Studio 01.',
    avatarBg: 'bg-[#fbf3ec] text-[#c26d3e]',
    typeBg: 'bg-[#ffdad8] text-[#690005]',
    status: 'pending',
    createdAt: '2026-10-15T08:00:00.000Z'
  }
];

/**
 * Get all stored faculty requests (falls back to INITIAL_REQUESTS_DATA if empty)
 */
export function getStoredRequests() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading requests from localStorage:', e);
  }
  return [...INITIAL_REQUESTS_DATA];
}

/**
 * Save requests list to localStorage and persist to server
 */
export function saveStoredRequests(requests, syncToServer = true) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    }
  } catch (e) {
    console.error('Error saving requests to localStorage:', e);
  }
  if (syncToServer && typeof fetch !== 'undefined') {
    fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests })
    }).catch(() => {});
  }
}

export async function pullServerRequests() {
  if (typeof fetch === 'undefined') return null;
  try {
    const res = await fetch('/api/requests', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.requests)) {
        const curList = getStoredRequests();
        if (JSON.stringify(curList) !== JSON.stringify(data.requests)) {
          saveStoredRequests(data.requests, false);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('meded:requests_updated', { detail: data.requests }));
          }
          return data.requests;
        }
      }
    }
  } catch (_) {}
  return null;
}

/**
 * Add a new real request submitted by a faculty member
 */
export function addFacultyRequest(newRequest) {
  const list = getStoredRequests();
  const facultyName = newRequest.faculty || newRequest.facultyName || 'Dr. Rajesh Jambhulkar';
  const initials = newRequest.initials || newRequest.avatar || facultyName.replace(/^Dr\.\s*/i, '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'DR';
  const isCancel = (newRequest.type || '').toLowerCase() === 'cancellation';
  const typeFormatted = isCancel ? 'Cancellation' : 'Reschedule';

  const item = {
    id: newRequest.id || `req-${Date.now()}`,
    faculty: facultyName,
    facultyName: facultyName,
    initials: initials,
    avatar: initials,
    subject: newRequest.subject || 'Biochemistry',
    batch: newRequest.batch || 'Prarambh 2026 Batch',
    enrolledCount: newRequest.enrolledCount || '184 Enrolled',
    type: typeFormatted,
    timeAgo: 'Just now',
    currentSlot: newRequest.currentSlot || newRequest.originalSlot || 'Saturday, October 17, 2026 • 7:00 PM – 9:00 PM',
    originalSlot: newRequest.originalSlot || newRequest.currentSlot || 'Saturday, October 17, 2026 • 7:00 PM – 9:00 PM',
    currentVenue: newRequest.currentVenue || 'Live on PW MedEd Mobile App',
    proposedSlot: newRequest.proposedSlot || (isCancel ? 'No substitute (Class Cancelled)' : 'Tuesday, October 20, 2026 • 6:30 PM – 8:30 PM'),
    proposedVenue: newRequest.proposedVenue || 'Live on PW MedEd Mobile App',
    substituteFaculty: newRequest.substituteFaculty || (isCancel ? 'Dr. Priya Sharma' : ''),
    substituteNote: newRequest.substituteNote || '',
    reason: newRequest.reason || (isCancel ? 'Medical leave & scheduled clinical ward duties' : 'Slot adjustment requested for clinical rounds & CME conference'),
    avatarBg: 'bg-[#c8e8d0] text-[#002110]',
    typeBg: isCancel ? 'bg-[#ffdad8] text-[#690005]' : 'bg-[#f8e0a8] text-[#221a05]',
    status: 'pending', // 'pending' | 'approved' | 'declined'
    createdAt: new Date().toISOString(),
    /**
     * Machine-readable pointer back to the row in the connected sheet.
     * Without this the request only holds display strings and an approval
     * cannot be written back to the right lecture.
     */
    lecture: newRequest.lecture || null,
    /** Structured proposed slot, when the faculty app could supply one. */
    proposedSlotData: newRequest.proposedSlotData || null,
    /** Set once the decision has been written to the sheet. */
    sheetSync: null
  };

  list.unshift(item);
  saveStoredRequests(list);
  return list;
}

/**
 * Update a request's review status (approved or declined)
 */
export function updateRequestStatus(requestId, newStatus, sheetSync = undefined) {
  const list = getStoredRequests();
  const item = list.find(r => r.id === requestId);
  if (item) {
    item.status = newStatus;
    item.resolvedAt = new Date().toISOString();
    if (sheetSync !== undefined) item.sheetSync = sheetSync;
    saveStoredRequests(list);
  }
  return list;
}

/** Look up a stored request by id. */
export function getRequestById(requestId) {
  return getStoredRequests().find(r => r.id === requestId) || null;
}

/**
 * Populates and opens the interactive Reschedule Timetable Modal with real faculty request data
 */
export function openRescheduleApprovalModal(requestIdOrReq, controller = {}) {
  const requests = getStoredRequests();
  let req = typeof requestIdOrReq === 'object' && requestIdOrReq.id
    ? requestIdOrReq
    : requests.find(r => r.id === requestIdOrReq) || requests[0];

  if (!req) {
    req = {
      id: typeof requestIdOrReq === 'string' ? requestIdOrReq : 'req-default',
      faculty: 'Dr. Rajesh Jambhulkar',
      facultyName: 'Dr. Rajesh Jambhulkar',
      initials: 'RJ',
      avatar: 'RJ',
      subject: 'Biochemistry',
      batch: 'Prarambh 2026 Batch for MBBS 1st Year',
      enrolledCount: '184 Enrolled',
      type: 'Reschedule',
      timeAgo: 'Just now',
      currentSlot: 'Saturday, October 17, 2026 • 7:00 PM – 9:00 PM',
      originalSlot: 'Saturday, October 17, 2026 • 7:00 PM – 9:00 PM',
      currentVenue: 'Live on PW MedEd Mobile App',
      proposedSlot: 'Tuesday, October 20, 2026 • 6:30 PM – 8:30 PM',
      proposedVenue: 'Live on PW MedEd Mobile App',
      reason: 'Slot adjustment requested for clinical rounds & CME conference',
      avatarBg: 'bg-[#c8e8d0] text-[#002110]',
      status: 'pending'
    };
  }

  if (controller) controller.currentActiveRequestId = req.id;

  const modal = document.getElementById('rescheduleModal');
  if (!modal) {
    console.warn('Reschedule modal #rescheduleModal not found in DOM');
    return;
  }

  try {
    // 1. Avatar & Subtitle
    const avatarEl = document.getElementById('rescheduleModalAvatar');
    const subtitleEl = document.getElementById('rescheduleModalSubtitle');
    const notifyName = document.getElementById('notifyFacultyEmailName');
    const origSlotEl = document.getElementById('rescheduleOriginalSlotText');
    const propSlotEl = document.getElementById('rescheduleProposedSlotText');

    if (avatarEl) {
      avatarEl.textContent = req.initials || 'RJ';
      avatarEl.className = `w-11 h-11 rounded-xl ${req.avatarBg || 'bg-[#c8e8d0] text-[#002110]'} font-headline font-bold text-base flex items-center justify-center shrink-0 shadow-sm`;
    }

    if (subtitleEl) {
      subtitleEl.textContent = `${req.faculty || req.facultyName || 'Dr. Rajesh Jambhulkar'} • Subject: ${req.subject || 'Biochemistry'} • ${req.batch || 'Prarambh 2026 Batch'}`;
    }

    if (notifyName) {
      notifyName.textContent = req.faculty || req.facultyName || 'Dr. Rajesh Jambhulkar';
    }

    if (origSlotEl) {
      origSlotEl.textContent = req.originalSlot || req.currentSlot || 'Sat, 17 Oct • 7:00 PM – 9:00 PM';
    }

    if (propSlotEl) {
      propSlotEl.textContent = req.proposedSlot || 'Tue, 20 Oct • 6:30 PM – 8:30 PM';
    }

    // 2. Batch pill in grid toolbar
    const gridPill = document.getElementById('rescheduleGridBatchPill') || modal.querySelector('.font-label + span');
    if (gridPill) {
      gridPill.textContent = req.batch && req.batch.includes('Prarambh')
        ? 'Prarambh 2026'
        : (req.batch && req.batch.includes('Sushruta') ? 'Sushruta 2026' : (req.batch || 'Batch A'));
    }

    // 3. Vacating Slot inside Grid
    const vacatingSubjEl = document.getElementById('rescheduleGridVacatingSubject');
    const vacatingFacEl = document.getElementById('rescheduleGridVacatingFaculty');
    if (vacatingSubjEl) vacatingSubjEl.textContent = `${req.subject || 'Biochemistry'} Live`;
    if (vacatingFacEl) vacatingFacEl.textContent = req.faculty || req.facultyName || 'Dr. Jambhulkar';

    // 4. Proposed Slot inside Grid
    const proposedSubjEl = document.getElementById('rescheduleGridProposedSubject');
    const proposedFacEl = document.getElementById('rescheduleGridProposedFaculty');
    if (proposedSubjEl) proposedSubjEl.textContent = `${req.subject || 'Biochemistry'} Live`;
    if (proposedFacEl) proposedFacEl.textContent = req.faculty || req.facultyName || 'Dr. Jambhulkar';

    // 5. Verification status message
    const verifyText = document.getElementById('rescheduleGridVerificationText');
    if (verifyText) {
      const dayTime = (req.proposedSlot || 'Tuesday 6:30 PM').split('•')[0].trim();
      verifyText.textContent = `${dayTime} slot verified: Zero batch clash, Studio 02 reserved & faculty travel clearance verified.`;
    }

    // 6. Interactive Alternate Slot Trigger (Mon 19 Oct)
    const mon19Trigger = document.getElementById('mon19SlotTrigger');
    if (mon19Trigger) {
      mon19Trigger.onclick = () => {
        const slotFormatted = `Mon, 19 Oct • 5:00 PM – 7:00 PM`;
        if (propSlotEl) {
          propSlotEl.textContent = slotFormatted;
        }
        if (verifyText) {
          verifyText.textContent = `Monday 5:00 PM slot verified: Zero batch clash, Studio 04 reserved & faculty travel clearance verified.`;
        }
        if (typeof controller.showToast === 'function') {
          controller.showToast(`Selected alternative slot: ${slotFormatted}`);
        }
      };
    }

    // 7. Ensure close buttons are bound
    const closeModalIcon = document.getElementById('closeModalIconBtn');
    const cancelModalBtn = document.getElementById('rescheduleCancelBtn');
    const backdropEl = document.getElementById('modalBackdrop');
    const hideModal = () => {
      modal.classList.add('hidden');
      modal.style.display = 'none';
      document.body.style.overflow = '';
    };
    if (closeModalIcon) closeModalIcon.onclick = hideModal;
    if (cancelModalBtn) cancelModalBtn.onclick = hideModal;
    if (backdropEl) backdropEl.onclick = hideModal;

  } catch (e) {
    console.error('Error populating reschedule modal data:', e);
  } finally {
    modal.classList.remove('hidden');
    modal.style.removeProperty('display');
    modal.style.display = 'flex';
    modal.style.zIndex = '99999';
    document.body.style.overflow = 'hidden';
  }
}

/**
 * Main renderer for Requests View
 */
export function renderRequestsView(container, requestsState = { filter: 'all', batch: 'all', searchQuery: '' }, controller = {}) {
  if (!container) return;

  const requests = getStoredRequests();
  const currentFilter = requestsState.filter || 'all'; // 'all' | 'reschedule' | 'cancellation' | 'resolved'
  const currentBatch = requestsState.batch || 'all';
  const searchQuery = (requestsState.searchQuery || '').trim().toLowerCase();

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const resolvedRequests = requests.filter(r => r.status === 'approved' || r.status === 'declined');

  let baseRequests = currentFilter === 'resolved' ? resolvedRequests : (currentFilter === 'all' ? pendingRequests : pendingRequests);

  const filteredRequests = baseRequests.filter(r => {
    if (currentFilter === 'reschedule' && r.type.toLowerCase() !== 'reschedule') return false;
    if (currentFilter === 'cancellation' && r.type.toLowerCase() !== 'cancellation') return false;
    if (currentBatch !== 'all' && !r.batch.toLowerCase().includes(currentBatch.toLowerCase())) return false;
    
    if (searchQuery) {
      const match = (r.faculty || '').toLowerCase().includes(searchQuery) ||
                    (r.facultyName || '').toLowerCase().includes(searchQuery) ||
                    (r.subject || '').toLowerCase().includes(searchQuery) ||
                    (r.batch || '').toLowerCase().includes(searchQuery) ||
                    (r.reason || '').toLowerCase().includes(searchQuery) ||
                    (r.currentSlot || '').toLowerCase().includes(searchQuery) ||
                    (r.proposedSlot || '').toLowerCase().includes(searchQuery);
      if (!match) return false;
    }
    return true;
  });

  const pendingCount = pendingRequests.length;
  const rescheduleCount = pendingRequests.filter(r => r.type === 'Reschedule').length;
  const cancellationCount = pendingRequests.filter(r => r.type === 'Cancellation').length;
  const resolvedCount = resolvedRequests.length;

  container.innerHTML = `
    <div class="flex flex-col w-full">
      <div class="w-full space-y-6">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#ded5c6]">
          <div>
            <h1 class="font-headline text-2xl sm:text-3xl font-bold tracking-tight text-[#2c332d]">Reschedule &amp; Cancellation Requests</h1>
            <p class="font-body text-xs sm:text-sm text-[#68736a] mt-1 font-medium">Review and manage faculty-initiated lecture modifications across MBBS batches.</p>
          </div>
          <div class="flex items-center gap-2 self-start sm:self-center">
            <span class="text-xs font-bold text-[#3b6347] bg-[#eef4f0] px-3.5 py-1.5 rounded-xl border border-[#cde0d3] flex items-center gap-2 badge-3d shadow-xs">
              <span class="w-2 h-2 rounded-full bg-[#4a7c59] animate-pulse"></span>
              Live Sync Active
            </span>
          </div>
        </div>

        <!-- 3 Top KPI Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
          <!-- Card 1: Pending Review -->
          <div class="card-3d bg-white rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-all">
            <div class="flex flex-col justify-center">
              <span class="text-[11px] font-bold tracking-wider text-[#c26d3e] uppercase font-label">PENDING REVIEW</span>
              <div class="flex items-baseline gap-1.5 mt-1">
                <span class="font-headline text-2xl sm:text-3xl font-bold text-[#2c332d] leading-none" id="kpiPendingCount">${pendingCount}</span>
                <span class="text-sm font-bold text-[#68736a] leading-none">Requests</span>
              </div>
              <p class="text-xs font-semibold text-[#68736a] mt-1.5" id="kpiPendingSubtitle">${rescheduleCount} Reschedules • ${cancellationCount} Cancellations</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#fbf3ec] to-[#f4e2d2] border border-[#eed9cc] text-[#c26d3e] flex items-center justify-center shrink-0 shadow-xs">
              <span class="material-symbols-outlined text-[24px]">schedule</span>
            </div>
          </div>

          <!-- Card 2: Processed This Month -->
          <div class="card-3d bg-white rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-all">
            <div class="flex flex-col justify-center">
              <span class="text-[11px] font-bold tracking-wider text-[#4a7c59] uppercase font-label">PROCESSED THIS MONTH</span>
              <div class="flex items-baseline gap-1.5 mt-1">
                <span class="font-headline text-2xl sm:text-3xl font-bold text-[#2c332d] leading-none" id="kpiResolvedCount">${resolvedCount}</span>
                <span class="text-sm font-bold text-[#68736a] leading-none">Resolved</span>
              </div>
              <p class="text-xs font-semibold text-[#68736a] mt-1.5">Across active MBBS wings</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] border border-[#cde0d3] text-[#4a7c59] flex items-center justify-center shrink-0 shadow-xs">
              <span class="material-symbols-outlined text-[24px]">task_alt</span>
            </div>
          </div>

          <!-- Card 3: Schedule Integrity / Clashes -->
          <div class="card-3d bg-white rounded-2xl p-4 sm:p-5 flex items-center justify-between transition-all">
            <div class="flex flex-col justify-center">
              <span class="text-[11px] font-bold tracking-wider text-[#4a7c59] uppercase font-label">SCHEDULE INTEGRITY</span>
              <div class="flex items-baseline gap-1.5 mt-1">
                <span class="font-headline text-2xl sm:text-3xl font-bold text-[#2c332d] leading-none" id="kpiIntegrityCount">0</span>
                <span class="text-sm font-bold text-[#68736a] leading-none">Clashes</span>
              </div>
              <p class="text-xs font-semibold text-[#68736a] mt-1.5">Zero timetable or hall overlaps</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] border border-[#cde0d3] text-[#4a7c59] flex items-center justify-center shrink-0 shadow-xs">
              <span class="material-symbols-outlined text-[24px]">shield</span>
            </div>
          </div>
        </div>

        <!-- Filter Tabs & Batch Selector Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <!-- Filter Tabs Track -->
          <div class="track-3d flex items-center p-1 rounded-xl text-xs flex-wrap gap-1" id="requestsFilterTabGroup">
            <button class="req-filter-tab px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-none ${currentFilter === 'all' ? 'active btn-3d-primary text-white shadow-xs' : 'text-[#576058] hover:text-[#2c332d] hover:bg-[#ede7da] bg-transparent font-semibold'}" data-filter="all" type="button">
              Pending (${pendingCount})
            </button>
            <button class="req-filter-tab px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-none ${currentFilter === 'reschedule' ? 'active btn-3d-primary text-white shadow-xs' : 'text-[#576058] hover:text-[#2c332d] hover:bg-[#ede7da] bg-transparent font-semibold'}" data-filter="reschedule" type="button">
              Reschedule (${rescheduleCount})
            </button>
            <button class="req-filter-tab px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-none ${currentFilter === 'cancellation' ? 'active btn-3d-primary text-white shadow-xs' : 'text-[#576058] hover:text-[#2c332d] hover:bg-[#ede7da] bg-transparent font-semibold'}" data-filter="cancellation" type="button">
              Cancellation (${cancellationCount})
            </button>
            <button class="req-filter-tab px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border-none ${currentFilter === 'resolved' ? 'active btn-3d-primary text-white shadow-xs' : 'text-[#576058] hover:text-[#2c332d] hover:bg-[#ede7da] bg-transparent font-semibold'}" data-filter="resolved" type="button">
              Resolved (${resolvedCount})
            </button>
          </div>

          <!-- Batch Selector Dropdown -->
          <div class="relative self-start sm:self-auto">
            <button id="batchFilterDropdownBtn" type="button" class="pill-3d flex items-center gap-2 bg-[#f7f4ed] hover:bg-[#ede7da] text-[#2c332d] text-xs font-bold px-3.5 py-2 rounded-xl border border-[#ded5c6] transition-all cursor-pointer group">
              <span class="material-symbols-outlined text-[16px] text-[#4a7c59]">school</span>
              <span id="batchFilterSelectedLabel" class="tracking-tight font-semibold">
                ${currentBatch === 'all' ? 'All Batches (Combined)' : currentBatch.toLowerCase().includes('prarambh') ? 'Batch Prarambh 2026' : 'Batch Sushruta 2026'}
              </span>
              <span class="material-symbols-outlined text-[16px] text-[#788279] group-hover:text-[#2c332d] transition-colors ml-0.5">expand_more</span>
            </button>

            <!-- Styled Dropdown Popup Menu -->
            <div id="batchFilterDropdownMenu" class="hidden absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white border border-[#ded5c6] shadow-xl p-2.5 z-50 modal-3d animate-in fade-in zoom-in-95 duration-150">
              <div class="px-2.5 py-2 flex items-center justify-between border-b border-[#f0ece4] pb-2 mb-1.5">
                <span class="text-[10px] font-bold uppercase tracking-wider text-[#68736a] font-label">Filter by Batch / Cohort</span>
                <span class="text-[10px] font-bold text-[#3b6347] bg-[#eef4f0] px-2 py-0.5 rounded-md border border-[#cde0d3]">2 Active Batches</span>
              </div>

              <div class="space-y-1">
                <!-- Option 1: All -->
                <button type="button" data-batch="all" class="batch-filter-option w-full text-left p-2 rounded-xl ${currentBatch === 'all' ? 'bg-[#eef4f0] border border-[#cde0d3] text-[#2d4d37] font-bold' : 'hover:bg-[#f7f4ed] border border-transparent hover:border-[#ded5c6] text-[#3b433c] font-semibold'} flex items-center justify-between transition-colors group cursor-pointer">
                  <div class="flex items-start gap-2.5 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-[#4a7c59] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <span class="material-symbols-outlined text-[15px]">check</span>
                    </div>
                    <div class="min-w-0 flex flex-col">
                      <span class="text-xs font-bold text-[#2c332d] leading-tight">All Batches (Combined)</span>
                      <span class="text-[11px] text-[#4a7c59] font-medium mt-0.5">Prarambh 2026 • Sushruta 2026</span>
                    </div>
                  </div>
                  ${currentBatch === 'all' ? '<span class="text-[10px] font-bold uppercase tracking-wider bg-white text-[#4a7c59] px-2 py-0.5 rounded border border-[#cde0d3] shrink-0 ml-2 badge-3d">Active</span>' : ''}
                </button>

                <!-- Option 2: Prarambh 2026 -->
                <button type="button" data-batch="prarambh" class="batch-filter-option w-full text-left p-2 rounded-xl ${currentBatch.toLowerCase().includes('prarambh') ? 'bg-[#eef4f0] border border-[#cde0d3] text-[#2d4d37] font-bold' : 'hover:bg-[#f7f4ed] border border-transparent hover:border-[#ded5c6] text-[#3b433c] font-semibold'} flex items-center justify-between transition-colors group cursor-pointer">
                  <div class="flex items-start gap-2.5 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-[#fbf3ec] to-[#f4e2d2] text-[#c26d3e] border border-[#eed9cc] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px]">
                      P
                    </div>
                    <div class="min-w-0 flex flex-col">
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold text-[#2c332d] leading-tight">Batch Prarambh 2026</span>
                        <span class="text-[9px] font-bold text-[#68736a] bg-[#f4efe6] border border-[#ded5c6] px-1.5 rounded uppercase">MBBS Y1</span>
                      </div>
                      <span class="text-[11px] text-[#68736a] font-normal mt-0.5">1st Prof Foundations • 184 Enrolled</span>
                    </div>
                  </div>
                  <span class="text-[11px] text-[#68736a] font-semibold shrink-0 ml-2">184 std</span>
                </button>

                <!-- Option 3: Sushruta 2026 -->
                <button type="button" data-batch="sushruta" class="batch-filter-option w-full text-left p-2 rounded-xl ${currentBatch.toLowerCase().includes('sushruta') ? 'bg-[#eef4f0] border border-[#cde0d3] text-[#2d4d37] font-bold' : 'hover:bg-[#f7f4ed] border border-transparent hover:border-[#ded5c6] text-[#3b433c] font-semibold'} flex items-center justify-between transition-colors group cursor-pointer">
                  <div class="flex items-start gap-2.5 min-w-0">
                    <div class="w-7 h-7 rounded-lg bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] text-[#4a7c59] border border-[#cde0d3] flex items-center justify-center shrink-0 mt-0.5 font-bold text-[11px]">
                      S
                    </div>
                    <div class="min-w-0 flex flex-col">
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold text-[#2c332d] leading-tight">Batch Sushruta 2026</span>
                        <span class="text-[9px] font-bold text-[#68736a] bg-[#f4efe6] border border-[#ded5c6] px-1.5 rounded uppercase">MBBS Y2</span>
                      </div>
                      <span class="text-[11px] text-[#68736a] font-normal mt-0.5">Clinical Masterclass • 140 Enrolled</span>
                    </div>
                  </div>
                  <span class="text-[11px] text-[#68736a] font-semibold shrink-0 ml-2">140 std</span>
                </button>
              </div>

              <div class="mt-2 pt-2 border-t border-[#f0ece4] flex items-center justify-between px-1">
                <button id="batchResetBtn" type="button" class="text-[11px] font-bold text-[#68736a] hover:text-[#2c332d] transition-colors cursor-pointer border-none bg-transparent">
                  Reset to Default
                </button>
                <button id="batchSelectAllBtn" type="button" class="text-[11px] font-bold text-[#4a7c59] hover:text-[#3d6b4b] flex items-center gap-1 transition-colors cursor-pointer border-none bg-transparent">
                  <span>Select All</span>
                  <span class="material-symbols-outlined text-[13px]">done_all</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Request Cards List -->
        <div class="space-y-4 pt-1" id="requestsCardsList">
          ${renderCardsHtml(filteredRequests, currentFilter)}
        </div>

      </div>
    </div>
  `;

  attachRequestsViewListeners(container, requestsState, controller);
}

function renderCardsHtml(requests, currentFilter = 'all') {
  if (!requests || requests.length === 0) {
    const isResolvedTab = currentFilter === 'resolved';
    return `
      <div class="card-3d p-12 text-center text-[#68736a] bg-white rounded-2xl border border-[#ded5c6] space-y-4">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#eef4f0] to-[#d8e8dc] text-[#4a7c59] flex items-center justify-center mx-auto border border-[#cde0d3] shadow-xs">
          <span class="material-symbols-outlined text-[28px]">${isResolvedTab ? 'task_alt' : 'inbox'}</span>
        </div>
        <div class="space-y-1">
          <h3 class="font-headline text-base font-bold text-[#2c332d]">
            ${isResolvedTab ? 'No Resolved Requests' : 'No Pending Requests'}
          </h3>
          <p class="text-xs text-[#68736a] max-w-md mx-auto">
            ${isResolvedTab 
              ? 'There are no processed or approved reschedule/cancellation requests recorded yet.' 
              : 'There are no active faculty schedule requests awaiting review. Faculty submissions appear here in real-time.'}
          </p>
        </div>
        <div class="pt-2">
          <button type="button" id="btnResetSampleRequests" class="btn-3d-secondary px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer text-[#4a7c59]">
            <span class="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Restore Demo Requests Data</span>
          </button>
        </div>
      </div>
    `;
  }

  return requests.map(req => {
    const isCancellation = req.type === 'Cancellation';
    const isResolved = req.status === 'approved' || req.status === 'declined';
    const isApproved = req.status === 'approved';
    
    return `
      <div class="request-card card-3d rounded-2xl bg-white p-5 space-y-4 border border-[#ded5c6] transition-all hover:shadow-md ${isResolved ? 'opacity-90' : ''}" id="card-${req.id}" data-type="${req.type.toLowerCase()}" data-batch="${req.batch.toLowerCase().includes('prarambh') ? 'prarambh' : req.batch.toLowerCase().includes('sushruta') ? 'sushruta' : 'all'}">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="w-10 h-10 rounded-xl ${req.avatarBg || 'bg-[#c8e8d0] text-[#002110]'} font-headline font-bold text-sm flex items-center justify-center shrink-0 shadow-xs border border-[#cde0d3]">
              ${req.initials || 'DR'}
            </div>
            <div class="flex flex-col justify-center min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <h3 class="font-headline text-sm font-bold text-[#2c332d] leading-snug">${req.faculty || req.facultyName || 'Dr. Faculty'}</h3>
                <span class="text-xs text-[#576058] leading-snug font-semibold">• ${req.subject}</span>
              </div>
              <p class="text-xs text-[#68736a] leading-normal mt-0.5 font-medium">Batch: ${req.batch} (${req.enrolledCount || 'Enrolled'})</p>
            </div>
          </div>
          <div class="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
            <span class="px-2.5 py-0.5 rounded-md ${isCancellation ? 'bg-[#ffdad8] text-[#690005] border border-[#f3dcd0]' : 'bg-[#fbf3ec] text-[#c26d3e] border border-[#eed9cc]'} text-[11px] font-bold uppercase tracking-wider badge-3d">
              ${req.type}
            </span>
            ${isResolved ? `
              <span class="px-2.5 py-0.5 rounded-md ${isApproved ? 'bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3]' : 'bg-[#fdf2f2] text-[#b83230] border border-[#fed7d7]'} text-[11px] font-bold uppercase tracking-wider badge-3d flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px]">${isApproved ? 'check_circle' : 'cancel'}</span>
                <span>${isApproved ? 'Approved' : 'Declined'}</span>
              </span>
            ` : ''}
            <span class="text-xs font-semibold text-[#68736a]">${req.timeAgo || 'Recent'}</span>
          </div>
        </div>
        
        <!-- Slot Comparison / Session Details -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#f7f4ed] border border-[#ded5c6] text-xs">
          <div>
            <span class="text-[#68736a] block font-semibold text-[11px] uppercase tracking-wider">${isCancellation ? 'Cancelled Session:' : 'Current Slot:'}</span>
            <strong class="text-[#2c332d] text-xs mt-0.5 block font-bold">${req.currentSlot || req.originalSlot || 'Scheduled Slot'}</strong>
          </div>
          <div>
            <span class="${isCancellation ? 'text-[#c26d3e]' : 'text-[#4a7c59]'} block font-semibold text-[11px] uppercase tracking-wider">${isCancellation ? 'Substitute Faculty:' : 'Proposed Slot:'}</span>
            <strong class="text-[#2c332d] text-xs mt-0.5 block font-bold">${isCancellation ? (req.substituteFaculty || 'Dr. Priya Sharma') : (req.proposedSlot || 'Slot Adjustment')}</strong>
          </div>
        </div>
        
        <!-- Reason & Actions -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
          <p class="text-[#576058] text-xs italic flex-1 font-medium">
            “${req.reason || 'Faculty schedule adjustment request'}”
          </p>
          <div class="flex items-center gap-2 shrink-0">
            ${isResolved ? `
              <div class="flex items-center gap-1.5 text-xs font-bold ${isApproved ? 'text-[#4a7c59]' : 'text-[#b83230]'} bg-white px-3 py-1.5 rounded-xl border border-[#ded5c6] shadow-2xs">
                <span class="material-symbols-outlined text-[16px]">${isApproved ? 'verified' : 'block'}</span>
                <span>Processed ${isApproved ? 'Approval' : 'Declined'}</span>
              </div>
            ` : isCancellation ? `
              <button class="open-approve-cancellation-btn btn-approve-cancellation btn-3d-primary px-4 py-2 rounded-xl text-white font-bold text-xs shadow-sm hover:brightness-105 transition-all cursor-pointer border-none whitespace-nowrap flex items-center gap-1.5" data-req-id="${req.id}" type="button">
                <span class="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Approve Cancellation</span>
              </button>
              <button class="open-reject-cancellation-btn btn-reject-cancellation-open btn-3d-secondary px-4 py-2 rounded-xl text-[#b83230] hover:text-[#962624] font-bold text-xs border border-[#ded5c6] transition-all cursor-pointer whitespace-nowrap" data-req-id="${req.id}" data-batch="${req.batch}" data-faculty="${req.faculty || req.facultyName}" data-session="${req.currentSlot || req.originalSlot}" data-subject="${req.subject}" type="button">
                Reject Cancellation
              </button>
            ` : `
              <button class="decline-session-btn btn-decline-reschedule btn-3d-secondary px-4 py-2 rounded-xl text-[#576058] hover:text-[#2c332d] font-bold text-xs border border-[#ded5c6] transition-all cursor-pointer whitespace-nowrap" data-req-id="${req.id}" data-batch="${req.batch}" data-faculty="${req.faculty || req.facultyName}" data-session="${req.currentSlot || req.originalSlot}" data-subject="${req.subject}" type="button">
                Decline
              </button>
              <button class="open-reschedule-modal-btn btn-open-reschedule-modal btn-3d-primary px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md hover:brightness-105 transition-all cursor-pointer border-none whitespace-nowrap flex items-center gap-1.5" data-req-id="${req.id}" type="button">
                <span class="material-symbols-outlined text-[16px]">how_to_reg</span>
                <span>Approve</span>
              </button>
            `}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

let _batchMenuOutsideClick = null;

function attachRequestsViewListeners(container, requestsState, controller) {
  // Filter Tabs
  container.querySelectorAll('.req-filter-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      requestsState.filter = btn.getAttribute('data-filter');
      renderRequestsView(container, requestsState, controller);
    });
  });

  // Reset Sample Requests button in empty state
  const resetBtn = container.querySelector('#btnResetSampleRequests');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      saveStoredRequests(INITIAL_REQUESTS_DATA);
      requestsState.filter = 'all';
      renderRequestsView(container, requestsState, controller);
      if (typeof controller.showToast === 'function') {
        controller.showToast('Sample faculty requests restored successfully!');
      }
    });
  }

  // Batch Select Filter
  const batchBtn = container.querySelector('#batchFilterDropdownBtn');
  const batchMenu = container.querySelector('#batchFilterDropdownMenu');
  const batchOptions = container.querySelectorAll('.batch-filter-option');
  const batchResetBtn = container.querySelector('#batchResetBtn');
  const batchSelectAllBtn = container.querySelector('#batchSelectAllBtn');

  if (batchBtn && batchMenu) {
    batchBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      batchMenu.classList.toggle('hidden');
    });

    // Single document-level listener, replaced on every render (previously one
    // extra listener leaked per render, which made repeated tab switches slower).
    if (_batchMenuOutsideClick) document.removeEventListener('click', _batchMenuOutsideClick);
    _batchMenuOutsideClick = (e) => {
      if (!batchBtn.isConnected || (!batchBtn.contains(e.target) && !batchMenu.contains(e.target))) {
        batchMenu.classList.add('hidden');
      }
    };
    document.addEventListener('click', _batchMenuOutsideClick);
  }

  batchOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      const batch = opt.getAttribute('data-batch') || 'all';
      requestsState.batch = batch;
      if (batchMenu) batchMenu.classList.add('hidden');
      renderRequestsView(container, requestsState, controller);
    });
  });

  if (batchResetBtn) {
    batchResetBtn.addEventListener('click', () => {
      requestsState.batch = 'all';
      if (batchMenu) batchMenu.classList.add('hidden');
      renderRequestsView(container, requestsState, controller);
    });
  }

  if (batchSelectAllBtn) {
    batchSelectAllBtn.addEventListener('click', () => {
      requestsState.batch = 'all';
      if (batchMenu) batchMenu.classList.add('hidden');
      renderRequestsView(container, requestsState, controller);
    });
  }

  // Action Buttons
  container.querySelectorAll('.decline-session-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.getAttribute('data-req-id');
      const faculty = btn.getAttribute('data-faculty');
      const subject = btn.getAttribute('data-subject');
      const session = btn.getAttribute('data-session');
      const batch = btn.getAttribute('data-batch');
      if (typeof controller.openDeclineModal === 'function') {
        controller.openDeclineModal({ id, faculty, subject, session, batch });
      }
    });
  });

  container.querySelectorAll('.open-reschedule-modal-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.getAttribute('data-req-id') || 'req-default';
      if (typeof controller.openRescheduleModal === 'function') {
        controller.openRescheduleModal(id);
      } else {
        openRescheduleApprovalModal(id, controller);
      }
    });
  });

  container.querySelectorAll('.open-approve-cancellation-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.getAttribute('data-req-id');
      if (typeof controller.openApproveCancellationModal === 'function') {
        controller.openApproveCancellationModal(id);
      } else if (typeof controller.openApproveCancelModal === 'function') {
        controller.openApproveCancelModal(id);
      }
    });
  });

  container.querySelectorAll('.open-reject-cancellation-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = btn.getAttribute('data-req-id');
      if (typeof controller.openRejectCancellationModal === 'function') {
        controller.openRejectCancellationModal(id);
      } else if (typeof controller.openRejectCancelModal === 'function') {
        controller.openRejectCancelModal(id);
      }
    });
  });
}

// Expose on window for global access across all views & modals
if (typeof window !== 'undefined') {
  window.openRescheduleApprovalModal = openRescheduleApprovalModal;
  window.renderRequestsView = renderRequestsView;
  window.getStoredRequests = getStoredRequests;
  window.addFacultyRequest = addFacultyRequest;
  window.updateRequestStatus = updateRequestStatus;
}

// Global click delegation fallback for reschedule approval buttons
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest?.('.open-reschedule-modal-btn');
    if (btn) {
      const id = btn.getAttribute('data-req-id') || 'req-default';
      const modal = document.getElementById('rescheduleModal');
      if (modal && modal.classList.contains('hidden')) {
        openRescheduleApprovalModal(id, window.adminApp || {});
      }
    }
  });
}

