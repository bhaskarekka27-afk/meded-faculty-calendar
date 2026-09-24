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
