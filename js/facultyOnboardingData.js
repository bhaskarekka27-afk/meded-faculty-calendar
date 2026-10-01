/**
 * PW MedEd - Dynamic Faculty Onboarding Master Data & State Management
 * 
 * Provides centralized in-code faculty onboarding data storage, persistent sync,
 * dynamic batch/sheet discovery, and real-time state broadcasts.
 */

export const DEFAULT_FACULTY_ONBOARDING = [
  {
    id: 'fac-1',
    name: 'Dr. Rajesh Jambhulkar',
    email: 'bhaskarekka27@gmail.com',
    secondaryEmail: 'rajesh.j@pwmeded.edu.in',
    phone: '98234 56710',
    dept: 'Biochemistry',
    role: 'Professor • Biochemistry',
    status: 'Verified',
    canRescheduleCancel: false,
    cohorts: ["Prarambh '26", "Sushruta '26", "INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-2',
    name: 'Dr. Pradeep Pawar',
    email: 'pradeep.p@pwmeded.edu.in',
    phone: '98450 12389',
    dept: 'Anatomy',
    role: 'Professor • Anatomy',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Prarambh '26", "INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-3',
    name: 'Dr. Vivek Nalgirkar',
    email: 'vivek.physio@pwmeded.edu.in',
    phone: '99881 23411',
    dept: 'Physiology',
    role: 'Professor • Physiology',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Sushruta '26", "INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-4',
    name: 'Dr. Sanchit Sir',
    email: 'sanchit.path@pwmeded.edu.in',
    phone: '98721 54320',
    dept: 'Pathology',
    role: 'Assoc. Professor • Pathology',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Sushruta '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-5',
    name: 'Dr. Ashwani Sir',
    email: 'ashwani.psm@pwmeded.edu.in',
    phone: '98112 34509',
    dept: 'Community Med',
    role: 'Assoc. Professor • Community Med',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Sushruta '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-6',
    name: "Dr. Sudha Ma'am",
    email: 'sudha.optha@pwmeded.edu.in',
    phone: '97654 32100',
    dept: 'Ophthalmology',
    role: 'Assistant Professor • Ophthalmology',
    status: 'Pending',
    canRescheduleCancel: true,
    cohorts: ["Sushruta '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-7',
    name: 'Dr. Gobind Rai Garg',
    email: 'gobind.garg@pwmeded.edu.in',
    phone: '98100 45678',
    dept: 'Pharmacology',
    role: 'Professor • Pharmacology',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Prarambh '26", "Sushruta '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-8',
    name: 'Dr. Preeti Sharma',
    email: 'preeti.micro@pwmeded.edu.in',
    phone: '98711 22334',
    dept: 'Microbiology',
    role: 'Professor • Microbiology',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Prarambh '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-9',
    name: 'Dr. Apurv Mehra',
    email: 'apurv.ortho@pwmeded.edu.in',
    phone: '98188 99001',
    dept: 'General Surgery',
    role: 'Professor • Ortho & Surgery',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Sushruta '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-10',
    name: 'Dr. Zainab Vora',
    email: 'zainab.med@pwmeded.edu.in',
    phone: '98200 11223',
    dept: 'General Medicine',
    role: 'Consultant • Radiology & Medicine',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Prarambh '26", "Sushruta '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-11',
    name: 'Dr. Nikita Nanwani',
    email: 'nikita.fmt@pwmeded.edu.in',
    phone: '98333 44556',
    dept: 'Forensic Med',
    role: 'Assoc. Professor • FMT',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Sushruta '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-12',
    name: 'Dr. Neha Taneja',
    email: 'neha.psm@pwmeded.edu.in',
    phone: '98122 33445',
    dept: 'Community Med',
    role: 'Assoc. Professor • PSM',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Prarambh '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-13',
    name: 'Dr. Shrikant',
    email: 'shrikant.peds@pwmeded.edu.in',
    phone: '98765 11223',
    dept: 'Pediatrics',
    role: 'Assistant Professor • Pediatrics',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Sushruta '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-14',
    name: 'Dr. Rajiv Ranjan',
    email: 'rajiv.ent@pwmeded.edu.in',
    phone: '98990 01122',
    dept: 'ENT',
    role: 'Assistant Professor • ENT',
    status: 'Pending',
    canRescheduleCancel: true,
    cohorts: ["Prarambh '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  // INI-CET & FMGE Series Faculty
  {
    id: 'fac-15',
    name: 'Dr. Ranjith AR',
    email: 'ranjith.ar@pwmeded.edu.in',
    phone: '98401 22334',
    dept: 'Pathology',
    role: 'Senior Consultant • Pathology',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-16',
    name: 'Dr. Manjunath A',
    email: 'manjunath.a@pwmeded.edu.in',
    phone: '98452 33445',
    dept: 'Forensic Medicine',
    role: 'Assoc. Professor • Forensic Medicine',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-17',
    name: 'Dr. Vinish Srivastava',
    email: 'vinish.s@pwmeded.edu.in',
    phone: '98110 44556',
    dept: 'Anaesthesia',
    role: 'Professor • Anaesthesia',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-18',
    name: 'Dr. Ashwani Ranjan',
    email: 'ashwani.r@pwmeded.edu.in',
    phone: '98112 55667',
    dept: 'Community Medicine',
    role: 'Professor • Community Medicine (PSM)',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-19',
    name: 'Dr. Sudha Seetharam',
    email: 'sudha.s@pwmeded.edu.in',
    phone: '97654 66778',
    dept: 'Ophthalmology',
    role: 'Professor • Ophthalmology',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-20',
    name: 'Dr. Sanchit Bajpai',
    email: 'sanchit.b@pwmeded.edu.in',
    phone: '98721 77889',
    dept: 'ENT',
    role: 'Assoc. Professor • ENT',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-21',
    name: 'Dr. Santhosh Patil',
    email: 'santhosh.p@pwmeded.edu.in',
    phone: '98440 88990',
    dept: 'General Medicine',
    role: 'Lead Consultant • Medicine',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-22',
    name: 'Dr. Era Dutta',
    email: 'era.dutta@pwmeded.edu.in',
    phone: '98201 99001',
    dept: 'Psychiatry',
    role: 'Consultant Psychiatrist',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-23',
    name: 'Dr. Siraj Ahmad',
    email: 'siraj.a@pwmeded.edu.in',
    phone: '98102 11223',
    dept: 'Pharmacology',
    role: 'Professor • Pharmacology',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-24',
    name: 'Dr. Prassan Vij',
    email: 'prassan.vij@pwmeded.edu.in',
    phone: '98103 22334',
    dept: 'Obstetrics & Gynaecology',
    role: 'Lead Consultant • OBG',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-25',
    name: 'Dr. Alekhya',
    email: 'alekhya.ortho@pwmeded.edu.in',
    phone: '98480 33445',
    dept: 'Orthopedics',
    role: 'Consultant • Orthopedics',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-26',
    name: 'Dr. Sandeep Seeramreddi',
    email: 'sandeep.s@pwmeded.edu.in',
    phone: '98490 44556',
    dept: 'General Surgery',
    role: 'Senior Consultant • Surgery',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-27',
    name: 'Dr. Natisha Arora',
    email: 'natisha.a@pwmeded.edu.in',
    phone: '98114 55667',
    dept: 'Radiology',
    role: 'Consultant • Radio-diagnosis',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-28',
    name: 'Dr. Jazeer Abdul Khader',
    email: 'jazeer.k@pwmeded.edu.in',
    phone: '98470 66778',
    dept: 'Dermatology',
    role: 'Consultant • Dermatology & Venereology',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-29',
    name: 'Dr. Anusha Rathi',
    email: 'anusha.r@pwmeded.edu.in',
    phone: '98715 77889',
    dept: 'Microbiology',
    role: 'Assistant Professor • Microbiology',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-30',
    name: 'Dr. Divya Madan',
    email: 'divya.m@pwmeded.edu.in',
    phone: '98180 88990',
    dept: 'Pediatrics',
    role: 'Senior Consultant • Pediatrics',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-admin-2',
    name: 'Bhaskar Ekka',
    email: 'bhaskar.ekka@pw.live',
    phone: '98765 43210',
    dept: 'Medical Sciences',
    role: 'Lead Academic Faculty',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Prarambh '26", "Sushruta '26", "INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-admin-3',
    name: 'Kanchan Gupta',
    email: 'kanchan.gupta1@pw.live',
    phone: '98765 43211',
    dept: 'Medical Sciences',
    role: 'Faculty Coordinator',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Prarambh '26", "Sushruta '26", "INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-admin-4',
    name: 'Academic Dean Office',
    email: 'admin.office@pwmeded.edu.in',
    phone: '98765 43212',
    dept: 'Academic Operations',
    role: 'Dean & Academic Director',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Prarambh '26", "Sushruta '26", "INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  },
  {
    id: 'fac-admin-5',
    name: 'Academic Office',
    email: 'admin.office@pw.live',
    phone: '98765 43213',
    dept: 'Academic Operations',
    role: 'Academic Director',
    status: 'Verified',
    canRescheduleCancel: true,
    cohorts: ["Prarambh '26", "Sushruta '26", "INI-CET '26", "FMGE '26"],
    lastUpdated: '2026-09-24T12:00:00.000Z'
  }
];

export const ONBOARDING_STORAGE_KEY = 'meded_faculty_onboarding';

// Background sync from server
if (typeof window !== 'undefined' && typeof fetch !== 'undefined') {
  fetch('/api/faculty-onboarding')
    .then(r => r.json())
    .then(data => {
      if (data && data.success && Array.isArray(data.list) && data.list.length > 0) {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(data.list));
      }
    })
    .catch(() => {});
}

/**
 * Returns the current faculty onboarding data (from localStorage if available, merged with code defaults).
 */
export function getFacultyOnboardingData() {
  try {
    if (typeof localStorage === 'undefined') {
      return JSON.parse(JSON.stringify(DEFAULT_FACULTY_ONBOARDING));
    }
    const data = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    if (data === null) {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(DEFAULT_FACULTY_ONBOARDING));
      return JSON.parse(JSON.stringify(DEFAULT_FACULTY_ONBOARDING));
    }
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch (e) {
    console.warn('Error reading faculty onboarding data:', e);
    return [];
  }
}

/**
 * Persists faculty onboarding data and broadcasts update event across all tabs/windows.
 */
export function saveFacultyOnboardingData(list) {
  if (!Array.isArray(list)) return;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(list));
    }
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('meded:faculty_onboarding_updated', { detail: list }));
    }
    if (typeof fetch !== 'undefined') {
      fetch('/api/faculty-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list })
      }).catch(() => {});
    }
  } catch (e) {
    console.error('Error saving faculty onboarding data:', e);
  }
}

/**
 * Upserts a single faculty member, automatically creating or modifying details.
 */
export function upsertFacultyMember(facultyData) {
  if (!facultyData || !facultyData.name) return null;
  const list = getFacultyOnboardingData();
  const cleanName = (facultyData.name || '').trim().replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').toLowerCase();
  const cleanEmail = (facultyData.email || '').trim().toLowerCase();

  const existingIndex = list.findIndex(f => {
    if (facultyData.id && f.id === facultyData.id) return true;
    const fClean = (f.name || '').trim().replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').toLowerCase();
    const fEmail = (f.email || '').trim().toLowerCase();
    return (cleanEmail && fEmail === cleanEmail) || (cleanName && fClean === cleanName);
  });

  const now = new Date().toISOString();
  if (existingIndex >= 0) {
    list[existingIndex] = {
      ...list[existingIndex],
      ...facultyData,
      lastUpdated: now
    };
    saveFacultyOnboardingData(list);
    return list[existingIndex];
  } else {
    const newEntry = {
      id: facultyData.id || `fac-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: facultyData.name.startsWith('Dr.') || facultyData.name.startsWith('Prof.') ? facultyData.name : `Dr. ${facultyData.name}`,
      email: facultyData.email || `${cleanName.replace(/\s+/g, '.')}@pwmeded.edu.in`,
      phone: facultyData.phone || '98765 43210',
      dept: facultyData.dept || 'Medical Sciences',
      role: facultyData.role || `Professor • ${facultyData.dept || 'Medical Sciences'}`,
      status: facultyData.status || 'Verified',
      canRescheduleCancel: facultyData.canRescheduleCancel !== false,
      cohorts: facultyData.cohorts || ["Prarambh '26"],
      lastUpdated: now
    };
    list.push(newEntry);
    saveFacultyOnboardingData(list);
    return newEntry;
  }
}

/**
 * Removes a faculty member by ID or email.
 */
export function deleteFacultyMember(idOrEmail) {
  if (!idOrEmail) return false;
  const list = getFacultyOnboardingData();
  const filtered = list.filter(f => f.id !== idOrEmail && f.email?.toLowerCase() !== idOrEmail.toLowerCase());
  if (filtered.length !== list.length) {
    saveFacultyOnboardingData(filtered);
    return true;
  }
  return false;
}

/**
 * Dynamically synchronizes faculty discovered in batch/sheet lecture schedules into the onboarding directory.
 */
export function syncFacultyFromBatches(batches) {
  if (!Array.isArray(batches)) return getFacultyOnboardingData();
  const list = getFacultyOnboardingData();
  let updated = false;

  batches.forEach(b => {
    const batchName = b.name || "Prarambh '26";
    const cohortBadge = batchName.includes('Prarambh') ? "Prarambh '26" :
                        batchName.includes('Sushruta') ? "Sushruta '26" :
                        batchName.includes('INI-CET') ? "INI-CET '26" :
                        batchName.includes('FMGE') ? "FMGE '26" : batchName;

    (b.events || []).forEach(ev => {
      const rawFaculty = (ev.faculty || '').trim();
      if (!rawFaculty || rawFaculty.toLowerCase() === 'to be announced' || rawFaculty.toLowerCase() === 'tbd') return;

      const cleanFaculty = rawFaculty.replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim();
      const subject = ev.subject || 'General Medicine';

      let matched = list.find(f => {
        const fClean = (f.name || '').replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().toLowerCase();
        return fClean === cleanFaculty.toLowerCase() || f.name.toLowerCase() === rawFaculty.toLowerCase();
      });

      if (matched) {
        // Ensure this cohort is included
        if (!matched.cohorts) matched.cohorts = [];
        if (!matched.cohorts.includes(cohortBadge)) {
          matched.cohorts.push(cohortBadge);
          updated = true;
        }
        if (!matched.dept && subject) {
          matched.dept = subject;
          updated = true;
        }
      } else {
        // Create new dynamic onboarding entry
        const nameParts = cleanFaculty.split(/\s+/);
        const emailPrefix = nameParts[0].toLowerCase() + (nameParts.length > 1 ? '.' + nameParts[nameParts.length - 1][0].toLowerCase() : '');
        const newFaculty = {
          id: `fac-dyn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          name: rawFaculty.startsWith('Dr.') || rawFaculty.startsWith('Prof.') ? rawFaculty : `Dr. ${cleanFaculty}`,
          email: `${emailPrefix}@pwmeded.edu.in`,
          phone: '98' + Math.floor(10000000 + Math.random() * 90000000).toString().substring(0, 8),
          dept: subject,
          role: `Professor • ${subject}`,
          status: 'Verified',
          canRescheduleCancel: true,
          cohorts: [cohortBadge],
          lastUpdated: new Date().toISOString()
        };
        list.push(newFaculty);
        updated = true;
      }
    });
  });

  if (updated) {
    saveFacultyOnboardingData(list);
  }
  return list;
}

/**
 * Generates an executable ES6 code module string of the updated faculty onboarding directory.
 */
export function exportFacultyOnboardingAsCode(customList) {
  const data = customList || getFacultyOnboardingData();
  return `// Auto-generated PW MedEd Faculty Onboarding Directory Master Data
export const DEFAULT_FACULTY_ONBOARDING = ${JSON.stringify(data, null, 2)};
`;
}

// Storage Keys & Constants
export const DEFAULT_FACULTY_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1ny3xsppBVxJb1FNPBU97mpm0b4eyAkUAG9CanjXf5FE/edit?gid=0#gid=0';
export const FACULTY_SHEET_URL_KEY = 'pw_faculty_spreadsheet_url';
export const FACULTY_SHEET_HEADERS = [
  'Faculty ID',
  'Name',
  'Primary Email',
  'Secondary Email',
  'Phone',
  'Department',
  'Designation Role',
  'Status',
  'Can Reschedule Cancel',
  'Assigned Cohorts',
  'Last Updated'
];

/**
 * Returns the connected Google Spreadsheet URL, defaulting to the embedded master sheet.
 */
export function getConnectedFacultySheetUrl() {
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem(FACULTY_SHEET_URL_KEY);
    if (saved && saved.trim()) return saved.trim();
  }
  return DEFAULT_FACULTY_SPREADSHEET_URL;
}

/**
 * Converts a list of faculty records to standard CSV format.
 */
export function facultyListToCSV(list) {
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = [FACULTY_SHEET_HEADERS.map(h => `"${h}"`).join(',')];
  for (const f of (list || [])) {
    const row = [
      escapeCsv(f.id || ''),
      escapeCsv(f.name || ''),
      escapeCsv(f.email || ''),
      escapeCsv(f.secondaryEmail || ''),
      escapeCsv(f.phone || ''),
      escapeCsv(f.dept || ''),
      escapeCsv(f.role || ''),
      escapeCsv(f.status || 'Verified'),
      escapeCsv(f.canRescheduleCancel !== false ? 'TRUE' : 'FALSE'),
      escapeCsv(Array.isArray(f.cohorts) ? f.cohorts.join('; ') : (f.cohorts || '')),
      escapeCsv(f.lastUpdated || new Date().toISOString())
    ];
    rows.push(row.join(','));
  }
  return rows.join('\r\n');
}

/**
 * Converts a list of faculty records to Tab-Separated Values (TSV)
 * for instant 1-click clipboard paste into cell A1 of Google Sheets.
 */
export function facultyListToTSV(list) {
  const cleanVal = (val) => {
    if (val === null || val === undefined) return '';
    return String(val).replace(/\t/g, ' ').replace(/[\r\n]+/g, ' ');
  };

  const rows = [FACULTY_SHEET_HEADERS.join('\t')];
  for (const f of (list || [])) {
    const row = [
      cleanVal(f.id || ''),
      cleanVal(f.name || ''),
      cleanVal(f.email || ''),
      cleanVal(f.secondaryEmail || ''),
      cleanVal(f.phone || ''),
      cleanVal(f.dept || ''),
      cleanVal(f.role || ''),
      cleanVal(f.status || 'Verified'),
      cleanVal(f.canRescheduleCancel !== false ? 'TRUE' : 'FALSE'),
      cleanVal(Array.isArray(f.cohorts) ? f.cohorts.join('; ') : (f.cohorts || '')),
      cleanVal(f.lastUpdated || new Date().toISOString())
    ];
    rows.push(row.join('\t'));
  }
  return rows.join('\n');
}

/**
 * Raw CSV line parser handling quotes, multiline content, and escaped characters.
 */
function parseRawCSVLines(csvText) {
  if (!csvText) return [];
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      row.push(currentField);
      lines.push(row);
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || row.length > 0) {
    row.push(currentField);
    lines.push(row);
  }
  return lines;
}

/**
 * Robust Faculty CSV Parser that dynamically resolves column order and synonyms.
 */
export function parseFacultyCSV(csvText) {
  if (!csvText || !csvText.trim()) return [];
  const lines = parseRawCSVLines(csvText);
  if (lines.length <= 1) return [];

  const rawHeaders = lines[0].map(h => String(h || '').trim().toLowerCase());
  
  const getCol = (patterns) => {
    // 1. Exact match first
    const exact = rawHeaders.findIndex(h => patterns.some(p => h === p));
    if (exact >= 0) return exact;
    // 2. Substring match avoiding collisions
    return rawHeaders.findIndex(h => patterns.some(p => {
      if (p === 'name' || p === 'faculty' || p === 'professor') {
        if (h.includes('id') || h.includes('email') || h.includes('role')) return false;
      }
      return h.includes(p);
    }));
  };

  const idIdx = getCol(['faculty id', 'fac id', 'id']);
  const nameIdx = getCol(['name', 'faculty name', 'faculty', 'professor']);
  const emailIdx = getCol(['primary email', 'email', 'login email', 'mail']);
  const secEmailIdx = getCol(['secondary email', 'alt email', 'alternate email', 'secondary']);
  const phoneIdx = getCol(['phone', 'mobile', 'contact', 'whatsapp']);
  const deptIdx = getCol(['department', 'dept', 'subject', 'specialty']);
  const roleIdx = getCol(['designation', 'role', 'title']);
  const statusIdx = getCol(['status', 'verification']);
  const permIdx = getCol(['can reschedule', 'reschedule', 'permission', 'reschedule cancel']);
  const cohortsIdx = getCol(['cohort', 'batch', 'assigned cohorts', 'batches']);
  const updatedIdx = getCol(['last updated', 'updated', 'timestamp']);

  const list = [];
  for (let i = 1; i < lines.length; i++) {
    const r = lines[i];
    if (!r || r.length === 0 || !r.some(cell => cell && cell.trim())) continue;
    
    const name = (nameIdx >= 0 ? r[nameIdx] : r[1]) || '';
    if (!name.trim()) continue;

    const email = (emailIdx >= 0 ? r[emailIdx] : r[2]) || '';
    const secEmail = (secEmailIdx >= 0 ? r[secEmailIdx] : r[3]) || '';
    const phone = (phoneIdx >= 0 ? r[phoneIdx] : r[4]) || '98765 43210';
    const dept = (deptIdx >= 0 ? r[deptIdx] : r[5]) || 'Medical Sciences';
    const role = (roleIdx >= 0 ? r[roleIdx] : r[6]) || `Professor • ${dept}`;
    const status = (statusIdx >= 0 ? r[statusIdx] : r[7]) || 'Verified';
    const permVal = String(permIdx >= 0 ? r[permIdx] : (r[8] || '')).trim();
    const canRescheduleCancel = permVal.toUpperCase() !== 'FALSE' && permVal.toLowerCase() !== 'no';
    const cohortsRaw = (cohortsIdx >= 0 ? r[cohortsIdx] : r[9]) || '';
    const cohorts = cohortsRaw ? cohortsRaw.split(/[;,]/).map(c => c.trim()).filter(Boolean) : ["Prarambh '26"];
    const lastUpdated = (updatedIdx >= 0 ? r[updatedIdx] : r[10]) || new Date().toISOString();

    list.push({
      id: (idIdx >= 0 && r[idIdx] ? r[idIdx] : `fac-${i}`),
      name: name.trim(),
      email: email.trim(),
      secondaryEmail: secEmail.trim(),
      phone: phone.trim(),
      dept: dept.trim(),
      role: role.trim(),
      status: status.trim() || 'Verified',
      canRescheduleCancel,
      cohorts,
      lastUpdated
    });
  }
  return list;
}

/**
 * Robust Client-Side and Proxy Google Sheet Synchronizer.
 * Works 100% reliably in static production (Render) without crashing on JSON parsing.
 */
export async function syncFacultyFromGoogleSheet(sheetUrl) {
  if (!sheetUrl || typeof sheetUrl !== 'string') {
    throw new Error('Please provide a valid Google Spreadsheet URL or Apps Script URL.');
  }

  const cleanUrl = sheetUrl.trim();
  
  // Strategy 0: If it's a Google Apps Script Web App URL (/exec), call it directly
  if (cleanUrl.includes('script.google.com/macros/s/') && cleanUrl.includes('/exec')) {
    try {
      const getUrl = cleanUrl + (cleanUrl.includes('?') ? '&' : '?') + 'action=get_faculty';
      const r = await fetch(getUrl);
      const text = await r.text();
      try {
        const data = JSON.parse(text);
        if (data && (Array.isArray(data.list) || Array.isArray(data))) {
          const list = Array.isArray(data.list) ? data.list : data;
          if (list.length > 0) {
            saveFacultyOnboardingData(list);
            if (typeof localStorage !== 'undefined') {
              localStorage.setItem(FACULTY_SHEET_URL_KEY, cleanUrl);
            }
            return { success: true, count: list.length, list };
          }
        }
      } catch (_) {}
    } catch (e) {
      console.warn('Apps Script direct fetch error:', e);
    }
  }

  // Extract Sheet ID and GID
  const match = cleanUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    throw new Error('Invalid Google Spreadsheet link. URL must contain "/spreadsheets/d/{SHEET_ID}".');
  }
  const sheetId = match[1];
  const gidMatch = cleanUrl.match(/gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  let csvText = '';
  let fetchedVia = '';

  // Strategy 1: Attempt local server proxy if running (with 2.5s timeout, safely handling non-JSON/404)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);
    const proxyRes = await fetch('/api/faculty-onboarding/sync-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetUrl: cleanUrl }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const contentType = proxyRes.headers.get('content-type') || '';
    if (proxyRes.ok && contentType.includes('application/json')) {
      const jsonRes = await proxyRes.json();
      if (jsonRes && jsonRes.success && Array.isArray(jsonRes.list) && jsonRes.list.length > 0) {
        saveFacultyOnboardingData(jsonRes.list);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(FACULTY_SHEET_URL_KEY, cleanUrl);
        }
        return { success: true, count: jsonRes.list.length, list: jsonRes.list, method: 'local_proxy' };
      }
    }
  } catch (err) {
    // Expected on static production (Render, Vercel static, GitHub Pages) - silently proceed to client-side strategies
  }

  // Strategy 2: Direct Google Visualization API (GViz) CSV export (Works in browser if sheet is public)
  const gvizUrls = [];
  if (gid) {
    gvizUrls.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
  }
  gvizUrls.push(
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Faculty%20Directory`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Faculty`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Sheet1`,
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`
  );

  for (const targetUrl of gvizUrls) {
    try {
      const res = await fetch(targetUrl, { mode: 'cors' });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().length > 15 && !text.startsWith('<!DOCTYPE') && !text.startsWith('<html')) {
          csvText = text;
          fetchedVia = 'gviz_direct';
          break;
        }
      }
    } catch (_) {
      // Continue to next candidate
    }
  }

  // Strategy 3: Client-side JSONP (Bypasses all CORS limitations on production)
  if (!csvText && typeof window !== 'undefined' && typeof document !== 'undefined') {
    const candidateTabs = gid ? [null, 'Faculty Directory', 'Faculty', 'Onboarding', 'Sheet1'] : ['Faculty Directory', 'Faculty', 'Onboarding', 'Sheet1', null];
    for (const tab of candidateTabs) {
      try {
        const jsonpCsv = await new Promise((resolve, reject) => {
          const cbName = `gviz_faculty_cb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          let url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=responseHandler:${cbName}`;
          if (tab) url += `&sheet=${encodeURIComponent(tab)}`;
          else if (gid) url += `&gid=${gid}`;

          const timer = setTimeout(() => {
            cleanup();
            reject(new Error('JSONP timeout'));
          }, 8000);

          function cleanup() {
            clearTimeout(timer);
            delete window[cbName];
            const el = document.getElementById(cbName);
            if (el && el.parentNode) el.parentNode.removeChild(el);
          }

          window[cbName] = function(data) {
            cleanup();
            if (data && data.table && data.table.rows) {
              const cols = (data.table.cols || []).map(c => c.label || '');
              const rows = [cols.map(c => `"${c.replace(/"/g, '""')}"`).join(',')];
              for (const r of data.table.rows) {
                if (!r || !r.c) continue;
                const rowVals = r.c.map(cell => {
                  const val = cell ? (cell.f !== undefined ? cell.f : (cell.v !== undefined ? cell.v : '')) : '';
                  return `"${String(val).replace(/"/g, '""')}"`;
                });
                rows.push(rowVals.join(','));
              }
              resolve(rows.join('\r\n'));
            } else {
              reject(new Error('Invalid table'));
            }
          };

          const script = document.createElement('script');
          script.id = cbName;
          script.src = url;
          script.onerror = () => { cleanup(); reject(new Error('Script error')); };
          document.body.appendChild(script);
        });

        if (jsonpCsv && jsonpCsv.trim().length > 30) {
          csvText = jsonpCsv;
          fetchedVia = 'jsonp_gviz';
          break;
        }
      } catch (_) {}
    }
  }

  if (!csvText) {
    throw new Error(
      'Could not read the Google Sheet. Please make sure the sheet is shared as "Anyone with the link can view".'
    );
  }

  // Parse extracted CSV
  const parsedList = parseFacultyCSV(csvText);

  // Check if sheet was found but empty or without valid records
  if (parsedList.length === 0) {
    return {
      success: false,
      empty: true,
      error: 'Google Sheet connected, but no faculty rows found. Headers might be missing.',
      rawCsv: csvText,
      headers: FACULTY_SHEET_HEADERS
    };
  }

  // Persist synced data locally and broadcast to all tabs
  saveFacultyOnboardingData(parsedList);
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(FACULTY_SHEET_URL_KEY, cleanUrl);
  }

  return {
    success: true,
    count: parsedList.length,
    list: parsedList,
    method: fetchedVia
  };
}

/**
 * Automatically syncs from the embedded Google Sheet URL.
 */
export async function syncFacultyFromConnectedSheet() {
  try {
    const connectedUrl = getConnectedFacultySheetUrl();
    if (!connectedUrl) return null;
    return await syncFacultyFromGoogleSheet(connectedUrl);
  } catch (err) {
    console.warn('Background faculty sheet sync notice:', err.message);
    return null;
  }
}

/**
 * Automatically handles Add, Edit, Update, and Delete operations on the faculty directory.
 * Writes to local storage, updates memory, broadcasts DOM event, and synchronizes
 * with Google Sheets / Apps Script backend automatically.
 */
export async function autoSyncFacultyMutation(action, targetFaculty, entireList) {
  let list = entireList;
  if (!list || !Array.isArray(list)) {
    list = getFacultyOnboardingData();
  }

  // 1. Persist locally
  saveFacultyOnboardingData(list);

  // 2. Broadcast event across tabs and components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('meded:faculty_onboarding_updated', { detail: list }));
  }

  // 3. Automated Sheet / Apps Script Writeback
  const scriptUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('meded_sheet_writer_url') : null;
  const token = typeof localStorage !== 'undefined' ? (localStorage.getItem('meded_sheet_writer_token') || 'CHANGE-ME-to-a-long-random-string') : '';

  if (scriptUrl && scriptUrl.includes('script.google.com/macros/s/')) {
    try {
      await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action === 'delete' ? 'delete_faculty' : (action === 'add' ? 'add_faculty' : (action === 'batch' ? 'batch_update_faculty' : 'update_faculty')),
          token,
          faculty: targetFaculty,
          fullList: list
        })
      });
    } catch (e) {
      console.warn('Background sheet mutation writeback skipped:', e);
    }
  }

  // 4. Also notify local development server if running
  if (typeof fetch !== 'undefined') {
    try {
      fetch('/api/faculty-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, faculty: targetFaculty, list })
      }).catch(() => {});
    } catch (_) {}
  }

  return { ok: true, count: list.length, list };
}

// Background sync from connected Google Sheet on startup (Production-Ready)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncFacultyFromConnectedSheet();
  }, 1000);
}

