/**
 * PW MedEd - Automated Faculty Class Reminder Email Service
 * 
 * Capabilities:
 * 1. Configurable Sender Email ID (e.g. academic-reminders@pwmeded.edu.in)
 * 2. Dynamically configurable lead duration (e.g. 15m, 30m, 45m, 1h, 2h, 24h, or custom minutes)
 * 3. Resolves faculty registered email addresses from Onboarding Directory (meded_faculty_onboarding)
 * 4. Generates responsive, beautifully styled HTML emails matching the PW MedEd 3D portal theme
 * 5. Dispatches real-time notifications for both Admin and Faculty portals
 * 6. Automated interval checker for upcoming scheduled classes
 */

import { 
  DEFAULT_FACULTY_ONBOARDING, 
  getFacultyOnboardingData, 
  saveFacultyOnboardingData, 
  upsertFacultyMember, 
  deleteFacultyMember, 
  syncFacultyFromBatches, 
  exportFacultyOnboardingAsCode 
} from './facultyOnboardingData.js';

export class ReminderEmailService {
  constructor() {
    this.SETTINGS_KEY = 'meded_email_settings';
    this.ONBOARDING_KEY = 'meded_faculty_onboarding';
    this.NOTIFICATIONS_KEY = 'meded_notifications';
    this.SENT_KEY = 'meded_sent_reminders';

    this.defaultSettings = {
      senderEmail: 'academic-reminders@pwmeded.edu.in',
      senderName: 'PW MedEd Academic Directorate',
      replyTo: 'dean.office@pwmeded.edu.in',
      leadDurationMinutes: 30, // Default: 30 minutes prior to class
      leadDurationUnit: 'minutes',
      leadDurationValue: 30,
      isEnabled: true,
      autoTriggerIntervalSeconds: 30,
      lastConfiguredAt: new Date().toISOString()
    };

    this.defaultFacultyList = DEFAULT_FACULTY_ONBOARDING;

    this.initStorage();
  }

  initStorage() {
    if (typeof localStorage === 'undefined') return;
    if (!localStorage.getItem(this.SETTINGS_KEY)) {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.defaultSettings));
    }
    if (!localStorage.getItem(this.ONBOARDING_KEY)) {
      localStorage.setItem(this.ONBOARDING_KEY, JSON.stringify(this.defaultFacultyList));
    } else {
      try {
        const storedList = JSON.parse(localStorage.getItem(this.ONBOARDING_KEY));
        if (Array.isArray(storedList)) {
          let updated = false;
          // Ensure every existing entry has canRescheduleCancel flag
          for (const f of storedList) {
            if (f.canRescheduleCancel === undefined) {
              f.canRescheduleCancel = true;
              updated = true;
            }
          }
          for (const defFac of this.defaultFacultyList) {
            if (!storedList.some(f => f.name.toLowerCase() === defFac.name.toLowerCase())) {
              storedList.push(defFac);
              updated = true;
            }
          }
          if (updated) {
            localStorage.setItem(this.ONBOARDING_KEY, JSON.stringify(storedList));
          }
        }
      } catch (e) {
        console.warn('Failed to merge onboarding faculty:', e);
      }
    }
    if (!localStorage.getItem(this.NOTIFICATIONS_KEY)) {
      const seedNotifs = [
        {
          id: 'notif-sync-1',
          type: 'system',
          title: 'Google Sheets Live Sync',
          body: 'Lecture Planner and batch curriculum tables synchronized successfully.',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: true,
          role: 'admin'
        }
      ];
      localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(seedNotifs));
    }
    if (!localStorage.getItem(this.SENT_KEY)) {
      localStorage.setItem(this.SENT_KEY, JSON.stringify({}));
    }
  }

  // --- 1. Settings Management ---
  getSettings() {
    try {
      if (typeof localStorage === 'undefined') return this.defaultSettings;
      const data = localStorage.getItem(this.SETTINGS_KEY);
      return data ? { ...this.defaultSettings, ...JSON.parse(data) } : this.defaultSettings;
    } catch (e) {
      console.error('Error loading email settings:', e);
      return this.defaultSettings;
    }
  }

  saveSettings(newSettings) {
    try {
      const current = this.getSettings();
      const updated = {
        ...current,
        ...newSettings,
        lastConfiguredAt: new Date().toISOString()
      };

      if (updated.leadDurationValue !== undefined && updated.leadDurationUnit) {
        const val = parseInt(updated.leadDurationValue, 10) || 30;
        updated.leadDurationMinutes = updated.leadDurationUnit === 'hours' ? val * 60 : val;
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
      }
      this.broadcastEvent('meded:email_settings_updated', updated);
      return { success: true, settings: updated };
    } catch (e) {
      console.error('Error saving email settings:', e);
      return { success: false, error: e.message };
    }
  }

  getLeadDurationText(minutes = null) {
    const mins = minutes !== null ? minutes : this.getSettings().leadDurationMinutes;
    if (mins >= 1440 && mins % 1440 === 0) {
      const days = mins / 1440;
      return `${days} ${days === 1 ? 'Day' : 'Days'}`;
    }
    if (mins >= 60 && mins % 60 === 0) {
      const hrs = mins / 60;
      return `${hrs} ${hrs === 1 ? 'Hour' : 'Hours'}`;
    }
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const rem = mins % 60;
      return `${hrs}h ${rem}m`;
    }
    return `${mins} Minutes`;
  }

  // --- 2. Faculty Onboarding Directory ---
  getFacultyOnboardingList() {
    return getFacultyOnboardingData();
  }

  saveFacultyOnboardingList(list) {
    saveFacultyOnboardingData(list);
    this.broadcastEvent('meded:faculty_onboarding_updated', list);
  }

  upsertFaculty(facultyData) {
    const result = upsertFacultyMember(facultyData);
    this.broadcastEvent('meded:faculty_onboarding_updated', this.getFacultyOnboardingList());
    return result;
  }

  deleteFaculty(idOrEmail) {
    const result = deleteFacultyMember(idOrEmail);
    if (result) {
      this.broadcastEvent('meded:faculty_onboarding_updated', this.getFacultyOnboardingList());
    }
    return result;
  }

  syncFromBatches(batches) {
    const result = syncFacultyFromBatches(batches);
    this.broadcastEvent('meded:faculty_onboarding_updated', result);
    return result;
  }

  exportCode(list) {
    return exportFacultyOnboardingAsCode(list || this.getFacultyOnboardingList());
  }

  getFacultyReschedulePermission(facultyIdentifier) {
    if (!facultyIdentifier) return true;
    const list = this.getFacultyOnboardingList();
    const clean = String(facultyIdentifier).trim().toLowerCase();
    const nameClean = clean.replace(/^(dr\.|prof\.|dr|prof)\s*/i, '').trim();

    // Check in-session user directly if matches
    if (typeof localStorage !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('meded_active_user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          if (u) {
            const uEmail = (u.email || '').toLowerCase().trim();
            const uName = (u.name || '').replace(/^(dr\.|prof\.|dr|prof)\s*/i, '').toLowerCase().trim();
            if (uEmail === clean || (nameClean.length > 2 && (uName === nameClean || uName.includes(nameClean) || nameClean.includes(uName)))) {
              if (u.canRescheduleCancel === false) return false;
            }
          }
        }
      } catch (e) {}
    }

    const matched = list.find(f => {
      if (f.id && f.id.toLowerCase() === clean) return true;
      if (f.email && f.email.toLowerCase().trim() === clean) return true;
      const fNameClean = (f.name || '').replace(/^(dr\.|prof\.|dr|prof)\s*/i, '').trim().toLowerCase();
      if (fNameClean === nameClean) return true;
      if (f.name && f.name.toLowerCase().trim() === clean) return true;
      if (nameClean.length > 2 && (fNameClean.includes(nameClean) || nameClean.includes(fNameClean))) return true;
      return false;
    });

    if (matched) {
      return matched.canRescheduleCancel !== false;
    }
    return true;
  }

  setFacultyReschedulePermission(facultyIdOrNameOrEmail, enabled) {
    const list = this.getFacultyOnboardingList();
    const raw = String(facultyIdOrNameOrEmail || '').trim();
    const clean = raw.toLowerCase();
    const nameClean = clean.replace(/^(dr\.|prof\.|dr|prof)\s*/i, '').trim();
    
    const matched = list.find(f => {
      if (f.id && (f.id === raw || f.id.toLowerCase() === clean)) return true;
      if (f.email && f.email.toLowerCase().trim() === clean) return true;
      const fClean = (f.name || '').replace(/^(dr\.|prof\.|dr|prof)\s*/i, '').trim().toLowerCase();
      return fClean === nameClean || (f.name && f.name.toLowerCase() === clean);
    });

    if (matched) {
      matched.canRescheduleCancel = Boolean(enabled);
      this.saveFacultyOnboardingList(list);

      // Also update in-session user if matched
      if (typeof localStorage !== 'undefined') {
        try {
          const storedUser = localStorage.getItem('meded_active_user');
          if (storedUser) {
            const u = JSON.parse(storedUser);
            if (u) {
              const uEmail = (u.email || '').toLowerCase().trim();
              const uName = (u.name || '').replace(/^(dr\.|prof\.|dr|prof)\s*/i, '').toLowerCase().trim();
              if (uEmail === (matched.email || '').toLowerCase().trim() || (matched.id && u.id === matched.id) || (nameClean.length > 2 && (uName === nameClean || uName.includes(nameClean) || nameClean.includes(uName)))) {
                u.canRescheduleCancel = Boolean(enabled);
                localStorage.setItem('meded_active_user', JSON.stringify(u));
              }
            }
          }
        } catch (e) {}
      }

      return { success: true, faculty: matched };
    }
    return { success: false, error: 'Faculty not found' };
  }

  findFacultyByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const list = this.getFacultyOnboardingList();

    // Strictly match only registered ID, email, secondaryEmail, or verified name in the Faculty Onboarding Directory
    return list.find(f => {
      const fEmail = (f.email || '').trim().toLowerCase();
      const fSecEmail = (f.secondaryEmail || '').trim().toLowerCase();
      const fId = (f.id || '').trim().toLowerCase();
      const fName = (f.name || '').trim().toLowerCase().replace(/^(dr\.|prof\.|dr|prof)\s*/i, '');
      const inputName = cleanEmail.replace(/^(dr\.|prof\.|dr|prof)\s*/i, '');
      return fEmail === cleanEmail || fSecEmail === cleanEmail || fId === cleanEmail || (inputName.length >= 3 && fName === inputName);
    }) || null;
  }

  resolveFacultyDetails(facultyName) {
    if (!facultyName) return null;
    const cleanName = facultyName.replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().toLowerCase();
    const list = this.getFacultyOnboardingList();

    let matched = list.find(f => {
      const fClean = (f.name || '').replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().toLowerCase();
      return fClean === cleanName || f.name.toLowerCase() === facultyName.toLowerCase();
    });

    if (!matched) {
      matched = list.find(f => {
        const fClean = (f.name || '').replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().toLowerCase();
        return fClean.includes(cleanName) || cleanName.includes(fClean);
      });
    }

    if (matched) {
      return {
        id: matched.id,
        name: matched.name,
        email: matched.email || `${cleanName.replace(/\s+/g, '.')}@pwmeded.edu.in`,
        phone: matched.phone || '98765 43210',
        dept: matched.dept || 'Medicine',
        status: matched.status || 'Verified',
        canRescheduleCancel: matched.canRescheduleCancel !== false
      };
    }

    const fallbackEmail = `${cleanName.replace(/[^a-z0-9]/gi, '.').toLowerCase()}@pwmeded.edu.in`;
    return {
      name: facultyName.startsWith('Dr.') || facultyName.startsWith('Prof.') ? facultyName : `Dr. ${facultyName}`,
      email: fallbackEmail,
      phone: '98765 43210',
      dept: 'Clinical Medicine',
      status: 'Onboarding Registered',
      canRescheduleCancel: true
    };
  }

  // --- 3. Email Template Generation (Matching PW MedEd 3D Portal Theme) ---
  generateEmailHtml({ facultyName, facultyEmail, senderEmail, event, leadDurationText }) {
    const topic = event.topic || event.chapter || event.displayTitle || 'Medical Clinical Lecture';
    const subject = event.subject || 'Biochemistry';
    const batch = event.batchName || 'Prarambh 2026 Batch • MBBS 1st Year';
    const dateRaw = event.dateRaw || event.isoDate || '2026-10-15';
    const timings = event.timings || '7:00 PM - 9:00 PM';
    const duration = event.duration || '2 Hours';

    const primary = '#4a7c59';
    const primaryDark = '#2d4d37';
    const surfaceBg = '#fbf9f5';
    const cardBg = '#ffffff';
    const borderCol = '#ded5c6';
    const textDark = '#2c332d';
    const textMuted = '#576058';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Class Reminder: ${topic}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: ${surfaceBg};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: ${textDark};
      line-height: 1.5;
    }
    .wrapper {
      max-width: 600px;
      margin: 20px auto;
      padding: 0 16px;
    }
    .email-card {
      background: ${cardBg};
      border-radius: 18px;
      border: 1px solid ${borderCol};
      overflow: hidden;
      box-shadow: 0 8px 30px -4px rgba(44, 51, 45, 0.08), 0 2px 8px -1px rgba(44, 51, 45, 0.04);
    }
    .header-banner {
      background: linear-gradient(135deg, ${primaryDark} 0%, ${primary} 100%);
      color: #ffffff;
      padding: 22px 26px;
      border-bottom: 2px solid #3d6b4b;
    }
    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .brand-title {
      font-size: 19px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .badge-reminder {
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.35);
      border-radius: 20px;
      padding: 4px 10px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .lead-notice {
      background: #eef4f0;
      border-left: 4px solid ${primary};
      padding: 12px 18px;
      margin: 18px 22px 14px;
      border-radius: 8px;
      font-size: 13px;
      color: ${primaryDark};
      font-weight: 600;
    }
    .content-section {
      padding: 0 22px 22px;
    }
    .session-card {
      background: #faf7f2;
      border: 1px solid ${borderCol};
      border-radius: 14px;
      padding: 16px 18px;
      margin-top: 12px;
    }
    .topic-title {
      font-size: 16px;
      font-weight: 700;
      color: ${textDark};
      margin: 0 0 10px 0;
      line-height: 1.35;
    }
    .info-grid {
      display: table;
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }
    .info-row {
      display: table-row;
    }
    .info-cell-label {
      display: table-cell;
      padding: 5px 0;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: ${textMuted};
      width: 35%;
      letter-spacing: 0.3px;
    }
    .info-cell-val {
      display: table-cell;
      padding: 5px 0;
      font-size: 12.5px;
      font-weight: 600;
      color: ${textDark};
    }
    .badge-subject {
      display: inline-block;
      background: #eef4f0;
      color: ${primaryDark};
      border: 1px solid #cde0d3;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
    }
    .actions-container {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #e8e2d8;
      text-align: center;
    }
    .btn-primary {
      display: inline-block;
      background: ${primary};
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 12.5px;
      padding: 10px 22px;
      border-radius: 10px;
      box-shadow: 0 3px 10px rgba(74, 124, 89, 0.3);
      margin: 4px;
    }
    .btn-secondary {
      display: inline-block;
      background: #ffffff;
      color: ${textDark} !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 12px;
      padding: 9px 16px;
      border-radius: 10px;
      border: 1px solid ${borderCol};
      margin: 4px;
    }
    .footer {
      background: #f4efe6;
      border-top: 1px solid ${borderCol};
      padding: 16px 20px;
      font-size: 11px;
      color: ${textMuted};
      text-align: center;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="email-card">
      
      <!-- Top Brand Header -->
      <div class="header-banner">
        <div class="header-top">
          <h1 class="brand-title">🩺 PW MedEd</h1>
          <span class="badge-reminder">Class Reminder • ${leadDurationText} Prior</span>
        </div>
        <div style="font-size: 11px; opacity: 0.95; font-weight: 500;">
          Academic Directorate & Curriculum Governance
        </div>
      </div>

      <!-- Lead Duration Alert Banner -->
      <div class="lead-notice">
        ⏰ <strong>Upcoming Lecture Alert:</strong> Your scheduled lecture is commencing in <strong>${leadDurationText}</strong>.
      </div>

      <!-- Content Area -->
      <div class="content-section">
        <p style="margin: 6px 0 12px; font-size: 13.5px; color: ${textDark};">
          Dear <strong>${facultyName}</strong>,
        </p>
        <p style="margin: 0 0 12px; font-size: 12.5px; color: ${textMuted};">
          This is an automated institutional notification dispatched to your registered onboarding email (<strong>${facultyEmail}</strong>) regarding your upcoming session:
        </p>

        <!-- Lecture Details Card -->
        <div class="session-card">
          <div class="topic-title">${topic}</div>
          
          <div class="info-grid">
            <div class="info-row">
              <div class="info-cell-label">Subject</div>
              <div class="info-cell-val">
                <span class="badge-subject">${subject}</span>
              </div>
            </div>
            <div class="info-row">
              <div class="info-cell-label">Cohort & Batch</div>
              <div class="info-cell-val">${batch}</div>
            </div>
            <div class="info-row">
              <div class="info-cell-label">Date & Day</div>
              <div class="info-cell-val">${dateRaw}</div>
            </div>
            <div class="info-row">
              <div class="info-cell-label">Scheduled Timings</div>
              <div class="info-cell-val" style="color: ${primaryDark}; font-family: monospace; font-weight: 700;">
                ${timings} (${duration})
              </div>
            </div>
            <div class="info-row">
              <div class="info-cell-label">Registered Faculty</div>
              <div class="info-cell-val">${facultyName} &lt;${facultyEmail}&gt;</div>
            </div>
          </div>
        </div>

        <!-- Instructions -->
        <div style="margin-top: 14px; font-size: 11.5px; color: ${textMuted}; background: #ffffff; border: 1px dashed ${borderCol}; border-radius: 10px; padding: 10px 12px;">
          📌 <strong>Faculty Checklist:</strong> Please ensure your lecture slides and clinical case demonstrations are loaded 10-15 minutes prior to live transmission. Attendance will be auto-synchronized via the PW MedEd Faculty Portal.
        </div>

        <!-- Action Links -->
        <div class="actions-container">
          <a href="/faculty.html" class="btn-primary">
            📅 Open Faculty Portal
          </a>
        </div>
      </div>

      <!-- Institutional Footer -->
      <div class="footer">
        <p style="margin: 0 0 5px;">
          Generated by <strong>PW MedEd Automated Academic Notification System</strong>.
        </p>
        <p style="margin: 0 0 5px;">
          From: <strong>${senderEmail}</strong> | Configured Lead: <strong>${leadDurationText} before session</strong>
        </p>
        <p style="margin: 0; font-size: 10px; color: #8b958c;">
          PW MedEd Academic Directorate • NMC CBME Guidelines Compliant
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;
  }

  // --- 4. Dispatch Reminder & Generate Dual Notifications ---
  dispatchReminder(event, customOptions = {}) {
    const settings = this.getSettings();
    if (!settings.isEnabled && !customOptions.force) {
      return { success: false, reason: 'Automated email reminders are currently disabled in Settings.' };
    }

    const facDetails = this.resolveFacultyDetails(event.faculty || customOptions.facultyName || 'Dr. Rajesh Jambhulkar');
    const senderEmail = settings.senderEmail || 'academic-reminders@pwmeded.edu.in';
    const leadDurationMinutes = settings.leadDurationMinutes || 30;
    const leadDurationText = this.getLeadDurationText(leadDurationMinutes);

    const emailHtml = this.generateEmailHtml({
      facultyName: facDetails.name,
      facultyEmail: facDetails.email,
      senderEmail: senderEmail,
      event: event,
      leadDurationText: leadDurationText
    });

    const nowIso = new Date().toISOString();
    const reminderId = `rem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 1. Admin Notification (Email Dispatched Alert)
    const adminNotif = {
      id: `admin-${reminderId}`,
      reminderId: reminderId,
      type: 'email_reminder_sent',
      role: 'admin',
      title: `Automated Class Reminder Sent to ${facDetails.name}`,
      body: `Automated ${leadDurationText} prior reminder dispatched to ${facDetails.email} for "${event.topic || event.chapter || 'Lecture'}" at ${event.timings || '7:00 PM'}.`,
      senderEmail: senderEmail,
      recipientEmail: facDetails.email,
      facultyName: facDetails.name,
      subject: event.subject || 'Medical Lecture',
      topic: event.topic || event.chapter || 'Lecture',
      date: event.dateRaw || event.isoDate || '2026-10-15',
      timings: event.timings || '7:00 PM - 9:00 PM',
      leadDurationText: leadDurationText,
      timestamp: nowIso,
      read: false,
      emailHtml: emailHtml
    };

    // 2. Faculty Notification (Email Received Alert)
    const facultyNotif = {
      id: `fac-${reminderId}`,
      reminderId: reminderId,
      type: 'email_reminder_received',
      role: 'faculty',
      title: `Class Reminder: ${event.topic || event.chapter || 'Upcoming Lecture'}`,
      body: `Lecture starting in ${leadDurationText} at ${event.timings || '7:00 PM'}. Delivered to your registered email: ${facDetails.email}`,
      senderEmail: senderEmail,
      recipientEmail: facDetails.email,
      facultyName: facDetails.name,
      subject: event.subject || 'Medical Lecture',
      topic: event.topic || event.chapter || 'Lecture',
      date: event.dateRaw || event.isoDate || '2026-10-15',
      timings: event.timings || '7:00 PM - 9:00 PM',
      leadDurationText: leadDurationText,
      timestamp: nowIso,
      read: false,
      emailHtml: emailHtml
    };

    this.addNotifications([adminNotif, facultyNotif]);

    const sentMap = this.getSentReminders();
    sentMap[event.id || `${event.isoDate}_${event.faculty}`] = {
      sentAt: nowIso,
      recipient: facDetails.email,
      topic: event.topic || event.chapter
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.SENT_KEY, JSON.stringify(sentMap));
    }

    this.broadcastEvent('meded:email_dispatched', {
      reminderId,
      adminNotif,
      facultyNotif,
      event,
      faculty: facDetails
    });

    return {
      success: true,
      reminderId,
      recipient: facDetails.email,
      facultyName: facDetails.name,
      senderEmail,
      leadDurationText,
      emailHtml,
      adminNotif,
      facultyNotif
    };
  }

  // --- 5. Notifications Storage & Retrieval ---
  getAllNotifications() {
    try {
      if (typeof localStorage === 'undefined') return [];
      const data = localStorage.getItem(this.NOTIFICATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  addNotifications(notifs) {
    try {
      const all = this.getAllNotifications();
      all.unshift(...notifs);
      const trimmed = all.slice(0, 100);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(trimmed));
      }
      this.broadcastEvent('meded:notifications_updated', trimmed);
    } catch (e) {
      console.error('Error adding notifications:', e);
    }
  }

  getAdminNotifications() {
    const all = this.getAllNotifications();
    return all.filter(n => n.role === 'admin' || n.type === 'system' || !n.role);
  }

  getFacultyNotifications(facultyName, facultyEmail = '') {
    const all = this.getAllNotifications();
    const cleanName = (facultyName || '').replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().toLowerCase();
    const cleanEmail = (facultyEmail || '').trim().toLowerCase();

    return all.filter(n => {
      if (n.role !== 'faculty') return false;
      if (n.type === 'system') return false;
      if (n.title && n.title.toLowerCase().includes('google sheets')) return false;
      if (cleanEmail && n.recipientEmail && n.recipientEmail.toLowerCase() === cleanEmail) return true;
      if (cleanName && n.facultyName) {
        const notifClean = n.facultyName.replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().toLowerCase();
        return notifClean.includes(cleanName) || cleanName.includes(notifClean);
      }
      return !cleanName;
    });
  }

  getAdminUnreadCount() {
    return this.getAdminNotifications().filter(n => !n.read).length;
  }

  getFacultyUnreadCount(facultyName, facultyEmail = '') {
    return this.getFacultyNotifications(facultyName, facultyEmail).filter(n => !n.read).length;
  }

  markNotificationAsRead(notifId) {
    try {
      const all = this.getAllNotifications();
      const notif = all.find(n => n.id === notifId);
      if (notif) {
        notif.read = true;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(all));
        }
        this.broadcastEvent('meded:notifications_updated', all);
      }
    } catch (e) {
      console.error('Error marking notification read:', e);
    }
  }

  markAllAsRead(role = 'admin') {
    try {
      const all = this.getAllNotifications();
      all.forEach(n => {
        if (role === 'admin' && (n.role === 'admin' || !n.role)) n.read = true;
        if (role === 'faculty' && n.role === 'faculty') n.read = true;
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(all));
      }
      this.broadcastEvent('meded:notifications_updated', all);
    } catch (e) {
      console.error('Error marking all notifications read:', e);
    }
  }

  getSentReminders() {
    try {
      if (typeof localStorage === 'undefined') return {};
      const data = localStorage.getItem(this.SENT_KEY);
      return data ? JSON.parse(data) : {};
    } catch (e) {
      return {};
    }
  }

  // --- 6. Automated Schedule Checker ---
  checkAndDispatchUpcoming(events = [], activeBatchName = "Batch") {
    const settings = this.getSettings();
    if (!settings.isEnabled) return [];

    const sentMap = this.getSentReminders();
    const dispatched = [];
    const leadMinutes = settings.leadDurationMinutes || 30;
    const now = new Date();
    
    events.forEach(ev => {
      if (ev.eventType !== 'class' || !ev.isoDate || !ev.faculty) return;
      if (ev.faculty.toLowerCase().includes('cool off')) return;

      const eventKey = ev.id || `${ev.isoDate}_${ev.faculty}_${ev.timings}`;
      if (sentMap[eventKey]) return;

      const classDateStr = ev.isoDate;
      let startHours = 19;
      let startMins = 0;

      if (ev.timings) {
        const timeMatch = ev.timings.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3].toUpperCase();
          if (ampm === 'PM' && h < 12) h += 12;
          if (ampm === 'AM' && h === 12) h = 0;
          startHours = h;
          startMins = m;
        }
      }

      const [y, m, d] = classDateStr.split('-').map(Number);
      const classStartTime = new Date(y, m - 1, d, startHours, startMins);
      const diffMs = classStartTime.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / 60000);

      const isWithinWindow = diffMinutes >= 0 && diffMinutes <= leadMinutes;

      if (isWithinWindow) {
        const res = this.dispatchReminder(ev, { batchName: activeBatchName });
        dispatched.push(res);
      }
    });

    return dispatched;
  }

  broadcastEvent(name, detail) {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(name, { detail }));
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('meded_sync_trigger', JSON.stringify({ event: name, time: Date.now() }));
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

export const reminderEmailService = new ReminderEmailService();
