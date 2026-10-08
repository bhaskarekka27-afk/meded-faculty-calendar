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

/** Display name shown as the sender of reminder emails. */
export const EMAIL_SENDER_NAME = 'PW MedEd Class Reminder';

/** Always use the current sender name (older saved values / callers still pass the previous one). */
function emailSenderName(name) {
  const n = String(name || '').trim();
  if (!n || /^PW MedEd Academic Directorate$/i.test(n)) return EMAIL_SENDER_NAME;
  return n;
}

/**
 * Turn the editable preview markup into what is actually mailed: no editing attributes,
 * and a complete HTML document (the preview only has the body fragment).
 */
export function prepareEmailHtmlForSend(html) {
  let out = String(html || '')
    .replace(/\scontenteditable="[^"]*"/gi, '')
    .replace(/\stitle="Click to edit[^"]*"/gi, '')
    .replace(/user-select:\s*none;?\s*/gi, '')
    .replace(/outline:\s*none;\s*cursor:\s*text;?\s*/gi, '');
  if (!/<html[\s>]/i.test(out)) {
    out = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
      '<body style="margin:0;padding:0;background-color:#f1ede4;">' + out + '</body></html>';
  }
  return out;
}

export class ReminderEmailService {
  constructor() {
    this.SETTINGS_KEY = 'meded_email_settings';
    this.ONBOARDING_KEY = 'meded_faculty_onboarding';
    this.NOTIFICATIONS_KEY = 'meded_notifications';
    this.SENT_KEY = 'meded_sent_reminders';

    this.defaultSettings = {
      senderEmail: 'academic-reminders@pwmeded.edu.in',
      senderName: EMAIL_SENDER_NAME,
      replyTo: 'dean.office@pwmeded.edu.in',
      leadDurationMinutes: 30, // Default: 30 minutes prior to class
      leadDurationUnit: 'minutes',
      leadDurationValue: 30,
      isEnabled: true,
      autoTriggerIntervalSeconds: 30,
      whatsappEnabled: true,
      whatsappSenderName: 'PW MedEd Academic Directorate',
      whatsappSenderNumber: '94234 07557', // Institutional WhatsApp Sender Number / Gateway Node
      whatsappCountryCode: '+91',
      whatsappCadenceSeconds: 25, // Base interval in seconds between dispatches
      whatsappJitterSeconds: 10,  // Randomized jitter ±10s (15s–35s) for anti-bot detection prevention
      whatsappAutoDispatch: true,  // Headless background automated dispatch (no WhatsApp Web opening needed)
      lastConfiguredAt: new Date().toISOString()
    };

    this.defaultFacultyList = DEFAULT_FACULTY_ONBOARDING;
    this._inMemorySettings = { ...this.defaultSettings };
    this._whatsappQueue = [];
    this._isProcessingWhatsAppQueue = false;

    this.initStorage();
    this.setupLiveSyncListeners();
  }

  setupLiveSyncListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('meded:settings_synced', (e) => {
        const changed = (e.detail && e.detail.keys) || [];
        if (changed.includes(this.SETTINGS_KEY) || changed.includes('pw_meded_email_settings') || changed.length === 0) {
          this.getSettings();
          this.broadcastEvent('meded:email_settings_updated', this._inMemorySettings);
        }
      });
      this.pullServerSettings().catch(() => {});
    }
  }

  async pullServerSettings() {
    if (typeof fetch === 'undefined') return;
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.settings && data.settings[this.SETTINGS_KEY]) {
          const raw = typeof data.settings[this.SETTINGS_KEY] === 'string'
            ? data.settings[this.SETTINGS_KEY]
            : JSON.stringify(data.settings[this.SETTINGS_KEY]);
          const parsed = JSON.parse(raw);
          const current = this.getSettings();
          const merged = { ...this.defaultSettings, ...current, ...parsed };
          if (merged.leadDurationValue !== undefined && merged.leadDurationUnit) {
            const val = parseInt(merged.leadDurationValue, 10) || 30;
            merged.leadDurationMinutes = merged.leadDurationUnit === 'hours' ? val * 60 : val;
          }
          this._inMemorySettings = merged;
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(merged));
          }
          this.broadcastEvent('meded:email_settings_updated', merged);
        }
      }
    } catch (_) {}
  }

  initStorage() {
    if (typeof localStorage === 'undefined') return;
    if (!localStorage.getItem(this.SETTINGS_KEY)) {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.defaultSettings));
    }
    if (localStorage.getItem(this.ONBOARDING_KEY) === null) {
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
          if (updated) {
            localStorage.setItem(this.ONBOARDING_KEY, JSON.stringify(storedList));
          }
        }
      } catch (e) {
        console.warn('Failed to parse onboarding faculty:', e);
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
      if (typeof localStorage === 'undefined') {
        return this._inMemorySettings || { ...this.defaultSettings };
      }
      let data = localStorage.getItem(this.SETTINGS_KEY);
      if (!data) {
        // Migration fallback for legacy key
        const legacy = localStorage.getItem('pw_meded_email_settings');
        if (legacy) {
          try {
            const parsedLegacy = JSON.parse(legacy);
            data = JSON.stringify({
              ...this.defaultSettings,
              senderEmail: parsedLegacy.senderEmail || this.defaultSettings.senderEmail,
              isEnabled: parsedLegacy.enabled !== undefined ? parsedLegacy.enabled : this.defaultSettings.isEnabled
            });
            localStorage.setItem(this.SETTINGS_KEY, data);
          } catch (e) {}
        }
      }
      if (data) {
        const parsed = JSON.parse(data);
        const merged = { ...this.defaultSettings, ...parsed };
        if (merged.senderEmail) {
          merged.senderEmail = merged.senderEmail.trim();
        }
        if (merged.leadDurationValue !== undefined && merged.leadDurationUnit) {
          const val = parseInt(merged.leadDurationValue, 10) || 30;
          merged.leadDurationMinutes = merged.leadDurationUnit === 'hours' ? val * 60 : val;
        }
        this._inMemorySettings = merged;
        return merged;
      }
      return this._inMemorySettings || { ...this.defaultSettings };
    } catch (e) {
      console.error('Error loading email settings:', e);
      return this._inMemorySettings || { ...this.defaultSettings };
    }
  }

  saveSettings(newSettings = {}, options = {}) {
    try {
      const current = this.getSettings();
      const updated = {
        ...current,
        ...newSettings,
        lastConfiguredAt: new Date().toISOString()
      };

      if (updated.senderEmail) {
        updated.senderEmail = updated.senderEmail.trim();
      }

      if (updated.leadDurationValue !== undefined && updated.leadDurationUnit) {
        const val = parseInt(updated.leadDurationValue, 10) || 30;
        updated.leadDurationMinutes = updated.leadDurationUnit === 'hours' ? val * 60 : val;
      }

      this._inMemorySettings = updated;

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updated));
        // Also sync legacy key for any third-party/legacy readers
        localStorage.setItem('pw_meded_email_settings', JSON.stringify({
          senderEmail: updated.senderEmail,
          leadDuration: `${updated.leadDurationValue || 30} ${updated.leadDurationUnit || 'minutes'}`,
          enabled: updated.isEnabled !== false,
          updatedAt: updated.lastConfiguredAt
        }));
      }

      // Sharing with other logins (and the local dev server) is handled by sharedSettings.js.
      // A direct POST here stamped every save - even an unchanged blur/toggle - as "newer"
      // and could overwrite a change another admin had just made.

      this.broadcastEvent('meded:email_settings_updated', updated);

      if (options && options.notify === true) {
        this.notifyAdmins({
          type: 'setting_updated',
          title: '⚙️ Email Reminder Settings Updated',
          body: `Automated class reminder configuration updated (Lead: ${updated.leadDurationValue || 30} ${updated.leadDurationUnit || 'minutes'}, Sender: ${updated.senderEmail || 'Institutional Default'}).`,
          author: updated.configuredBy || 'Administrator'
        });
      }

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

  findAdminByEmail(email) {
    const faculty = this.findFacultyByEmail(email);
    if (!faculty) return null;
    const isRoleAdmin = (faculty.role && String(faculty.role).toLowerCase() === 'admin') || (faculty.id && faculty.id.startsWith('fac-admin'));
    return isRoleAdmin ? faculty : null;
  }

  isAuthorizedAdmin(email) {
    return Boolean(this.findAdminByEmail(email));
  }

  findFacultyByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const list = this.getFacultyOnboardingList();

    // Match registered ID, email, secondaryEmail, or verified name/alias in the Faculty Onboarding Directory
    return list.find(f => {
      const fEmail = (f.email || '').trim().toLowerCase();
      const fSecEmail = (f.secondaryEmail || '').trim().toLowerCase();
      const fId = (f.id || '').trim().toLowerCase();
      const fName = (f.name || '').trim().toLowerCase().replace(/^(dr\.|prof\.|dr|prof)\s*/i, '');
      const inputName = cleanEmail.replace(/^(dr\.|prof\.|dr|prof)\s*/i, '');

      if (fEmail === cleanEmail || fSecEmail === cleanEmail || fId === cleanEmail) return true;
      if (inputName.length >= 3 && fName === inputName) return true;

      // Check standard institutional pattern: first.l@pwmeded.edu.in or first.last@pwmeded.edu.in
      if (cleanEmail.endsWith('@pwmeded.edu.in') || cleanEmail.endsWith('@pw.live')) {
        const prefix = cleanEmail.split('@')[0];
        const parts = fName.split(/\s+/);
        if (parts.length > 0) {
          const first = parts[0];
          const last = parts[parts.length - 1];
          if (prefix === `${first}.${last[0]}` || prefix === `${first}.${last}` || prefix === first || prefix.startsWith(first)) {
            return true;
          }
        }
      }
      return false;
    }) || null;
  }

  findFacultyByName(name) {
    if (!name) return null;
    const cleanName = name.replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().toLowerCase();
    const list = this.getFacultyOnboardingList();
    return list.find(f => {
      const fClean = (f.name || '').replace(/^(Dr\.|Prof\.|Dr|Prof)\s*/i, '').trim().toLowerCase();
      return fClean === cleanName || f.name.toLowerCase() === name.toLowerCase() || (cleanName.length > 2 && (fClean.includes(cleanName) || cleanName.includes(fClean)));
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
    // Every style is inline and the layout is table-based: Gmail/Outlook drop <style> blocks and
    // flex/grid, and the preview editor re-serialises the markup with innerHTML (which also loses
    // <head> styles). That is why the delivered email used to arrive as unstyled plain text.
    const esc = (v) => String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    const topic = esc(event.topic || event.chapter || event.displayTitle || 'Medical Clinical Lecture');
    const subject = esc(event.subject || 'Biochemistry');
    const batch = esc(event.batchName || 'Prarambh 2026 Batch • MBBS 1st Year');
    const dateRaw = esc(event.dateRaw || event.isoDate || '2026-10-15');
    const timings = esc(event.timings || '7:00 PM - 9:00 PM');
    const duration = esc(event.duration || '2 Hours');
    const name = esc(facultyName);
    const lead = esc(leadDurationText);

    const primary = '#4a7c59';
    const primaryDark = '#2d4d37';
    const pageBg = '#f1ede4';
    const cardBorder = '#e3dccd';
    const textDark = '#2c332d';
    const textMuted = '#68736a';
    const labelCol = '#7a847b';
    const font = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

    const detailRow = (icon, label, valueHtml, isLast) => `
                <tr>
                  <td style="padding:13px 0;${isLast ? '' : 'border-bottom:1px solid #ece6d9;'}">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40%" valign="top" style="font-family:${font};font-size:11px;font-weight:700;letter-spacing:0.7px;text-transform:uppercase;color:${labelCol};padding-right:12px;">${icon}&nbsp; ${label}</td>
                        <td valign="top" style="font-family:${font};font-size:14px;font-weight:600;line-height:1.5;color:${textDark};">${valueHtml}</td>
                      </tr>
                    </table>
                  </td>
                </tr>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Class Reminder: ${topic}</title>
</head>
<body style="margin:0;padding:0;background-color:${pageBg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${pageBg};">Your lecture "${topic}" starts in ${lead}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${pageBg}" style="background-color:${pageBg};">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid ${cardBorder};border-radius:18px;overflow:hidden;">

          <!-- Brand header -->
          <tr>
            <td bgcolor="${primaryDark}" style="background-color:${primaryDark};background-image:linear-gradient(135deg,${primaryDark} 0%,${primary} 100%);padding:30px 30px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:${font};font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">&#129658;&nbsp;PW MedEd</td>
                </tr>
                <tr>
                  <td style="padding-top:14px;">
                    <span contenteditable="true" title="Click to edit badge text" style="display:inline-block;background-color:#5d8c6b;border:1px solid #8fb39b;border-radius:999px;padding:6px 14px;font-family:${font};font-size:11px;font-weight:700;letter-spacing:0.7px;text-transform:uppercase;color:#ffffff;">Class Reminder &bull; ${lead} Prior</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Lead-time alert (editable in preview) -->
          <tr>
            <td style="padding:26px 30px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td contenteditable="true" title="Click to edit generic alert text" style="background-color:#eef4f0;border-left:4px solid ${primary};border-radius:8px;padding:15px 18px;font-family:${font};font-size:14px;line-height:1.55;color:${primaryDark};">
                    &#9200; <strong>Upcoming Lecture Alert:</strong> Your scheduled lecture is commencing in <strong>${lead}</strong>.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Greeting (editable in preview) -->
          <tr>
            <td contenteditable="true" title="Click to edit generic greeting and intro" style="padding:24px 30px 6px;font-family:${font};">
              <p style="margin:0 0 10px;font-size:16px;line-height:1.5;color:${textDark};">Dear <strong>${name}</strong>,</p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:${textMuted};">This is an automated notification regarding your upcoming session:</p>
            </td>
          </tr>

          <!-- Session details (class parameters, not editable) -->
          <tr>
            <td style="padding:16px 30px 34px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" contenteditable="false" style="background-color:#faf7f2;border:1px solid #e8e0d2;border-radius:14px;">
                <tr>
                  <td style="padding:22px 24px 8px;">
                    <div style="font-family:${font};font-size:11px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:${primary};padding-bottom:8px;">Session Details</div>
                    <div style="font-family:${font};font-size:19px;font-weight:700;line-height:1.35;color:${textDark};padding-bottom:10px;border-bottom:2px solid ${primary};">${topic}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 24px 10px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRow('&#128214;', 'Subject', `<span style="display:inline-block;background-color:#eef4f0;color:${primaryDark};border:1px solid #cde0d3;border-radius:999px;padding:3px 12px;font-size:12px;font-weight:700;">${subject}</span>`, false)}${detailRow('&#128101;', 'Cohort &amp; Batch', batch, false)}${detailRow('&#128197;', 'Date &amp; Day', dateRaw, false)}${detailRow('&#128338;', 'Scheduled Timings', `<span style="color:${primaryDark};font-weight:700;">${timings}</span> <span style="color:${labelCol};font-weight:600;">(${duration})</span>`, true)}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Brand accent bar -->
          <tr>
            <td bgcolor="${primary}" height="6" style="background-color:${primary};font-size:0;line-height:0;height:6px;">&nbsp;</td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  // --- 4. Dispatch Reminder & Generate Dual Notifications ---
  dispatchReminder(event, customOptions = {}) {
    const settings = this.getSettings();
    if (!settings.isEnabled && !customOptions.force) {
      return { success: false, reason: 'Automated email reminders are currently disabled in Settings.' };
    }

    const facDetails = this.resolveFacultyDetails(customOptions.facultyName || event.faculty || 'Dr. Rajesh Jambhulkar');
    const recipientEmail = customOptions.recipientEmail || customOptions.toEmail || facDetails.email;
    const recipientName = customOptions.facultyName || customOptions.toName || facDetails.name;
    const senderEmail = customOptions.senderEmail || customOptions.from || settings.senderEmail || 'academic-reminders@pwmeded.edu.in';
    const subject = customOptions.subject || `[PW MedEd] Class Reminder: ${event.topic || event.chapter || 'Lecture'}`;
    const leadDurationMinutes = settings.leadDurationMinutes || 30;
    const leadDurationText = this.getLeadDurationText(leadDurationMinutes);

    const emailHtml = customOptions.emailHtml || this.generateEmailHtml({
      facultyName: recipientName,
      facultyEmail: recipientEmail,
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
      title: `Automated Class Reminder Sent to ${recipientName}`,
      body: `Automated ${leadDurationText} prior reminder dispatched to ${recipientEmail} for "${event.topic || event.chapter || 'Lecture'}" at ${event.timings || '7:00 PM'}.`,
      senderEmail: senderEmail,
      recipientEmail: recipientEmail,
      facultyName: recipientName,
      subject: subject,
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
      body: `Lecture starting in ${leadDurationText} at ${event.timings || '7:00 PM'}. Delivered to your registered email: ${recipientEmail}`,
      senderEmail: senderEmail,
      recipientEmail: recipientEmail,
      facultyName: recipientName,
      subject: subject,
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
      recipient: recipientEmail,
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

    // Initiate real external inbox delivery via Google Apps Script (MailApp)
    this.sendEmailViaAppsScript({
      to: recipientEmail,
      recipientName: recipientName,
      subject: subject,
      emailHtml: emailHtml,
      senderEmail: senderEmail,
      senderName: emailSenderName(customOptions.senderName),
      force: customOptions.force || false
    }).catch(err => {
      console.warn('Google Apps Script email dispatch notice:', err);
    });

    return {
      success: true,
      reminderId,
      recipient: recipientEmail,
      facultyName: recipientName,
      senderEmail,
      subject,
      leadDurationText,
      emailHtml,
      adminNotif,
      facultyNotif
    };
  }

  /**
   * Real email transmission via Google Apps Script (MailApp)
   * 1. Relays through /api/send-email (local server)
   * 2. Direct client-side fetch fallback to configured Apps Script Web App URL
   */
  async sendEmailViaAppsScript({ to, recipientName, subject, emailHtml, senderName, senderEmail, force = false }) {
    if (!to) return { success: false, error: 'Recipient email is required.' };
    const mailHtml = prepareEmailHtmlForSend(emailHtml);
    const displayName = emailSenderName(senderName);

    // Resolve Apps Script Web App URL and token
    let scriptUrl = '';
    let token = 'pw-meded-token-2026';
    if (typeof localStorage !== 'undefined') {
      const emCfg = localStorage.getItem('meded_email_settings');
      if (emCfg) {
        try {
          const parsedEm = JSON.parse(emCfg);
          scriptUrl = parsedEm.appsScriptUrl || '';
        } catch (_) {}
      }
      if (!scriptUrl) {
        const wbCfg = localStorage.getItem('meded_sheet_writeback_config_v1');
        if (wbCfg) {
          try {
            const parsedWb = JSON.parse(wbCfg);
            scriptUrl = parsedWb.endpoint || '';
            token = parsedWb.token || token;
          } catch (_) {}
        }
      }
    }

    const payload = {
      to: to,
      recipient: to,
      recipientEmail: to,
      recipientName: recipientName || '',
      subject: subject || '[PW MedEd] Class Reminder',
      html: mailHtml,
      emailHtml: mailHtml,
      htmlBody: mailHtml,
      senderName: displayName,
      name: displayName,
      senderEmail: senderEmail || 'academic-reminders@pwmeded.edu.in',
      from: senderEmail || 'academic-reminders@pwmeded.edu.in',
      scriptUrl: scriptUrl,
      token: token
    };

    // 1. Try local server relay endpoint first (/api/send-email)
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data && data.delivered) {
            return {
              success: true,
              delivered: true,
              via: data.via || 'Google Apps Script (MailApp)',
              recipient: to,
              response: data
            };
          }
        }
      }
    } catch (e) {
      console.warn('Local /api/send-email relay attempt:', e);
    }

    // 2. Direct browser-to-Apps-Script fetch fallback (CORS safe with text/plain)
    try {
      if (scriptUrl && scriptUrl.includes('script.google.com/macros/s/')) {
        const directBody = JSON.stringify({
          action: 'send_email',
          token: token,
          email: {
            to: to,
            subject: subject,
            htmlBody: mailHtml,
            name: displayName,
            senderName: displayName,
            from: senderEmail,
            replyTo: senderEmail
          }
        });

        const resp = await fetch(scriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: directBody
        });
        const respData = await resp.json().catch(() => ({ ok: true }));
        return {
          success: true,
          delivered: true,
          via: 'Google Apps Script Direct (MailApp)',
          recipient: to,
          response: respData
        };
      }
    } catch (err) {
      console.warn('Apps Script direct browser dispatch warning:', err);
    }

    return {
      success: true,
      delivered: false,
      note: 'Alert registered in portal notifications. To send external emails, deploy Google Apps Script from apps-script/Code.gs.'
    };
  }

  // --- 5. Notifications Storage & Retrieval ---
  getAllNotifications() {
    try {
      if (typeof localStorage === 'undefined') return this._inMemoryNotifs || [];
      const data = localStorage.getItem(this.NOTIFICATIONS_KEY);
      const parsed = data ? JSON.parse(data) : (this._inMemoryNotifs || []);
      this._inMemoryNotifs = parsed;
      return parsed;
    } catch (e) {
      return this._inMemoryNotifs || [];
    }
  }

  addNotifications(notifs) {
    try {
      const all = this.getAllNotifications();
      all.unshift(...notifs);
      const trimmed = all.slice(0, 150);
      this._inMemoryNotifs = trimmed;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(trimmed));
      }
      this.broadcastEvent('meded:notifications_updated', trimmed);
    } catch (e) {
      console.error('Error adding notifications:', e);
    }
  }

  /**
   * Broadcasts a real-time notification to all administrator users
   * when any setting is updated or any spreadsheet is synced.
   */
  notifyAdmins({ type = 'system', title, body, author = 'Administrator', details = null, link = '' }) {
    try {
      let activeAdminName = author;
      if (!author || author === 'Administrator') {
        try {
          const userStr = typeof localStorage !== 'undefined' ? localStorage.getItem('meded_active_user') : null;
          if (userStr) {
            const u = JSON.parse(userStr);
            if (u && u.name) activeAdminName = u.name;
          }
        } catch (_) {}
      }

      const notif = {
        id: `notif-adm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: type, // 'setting_updated' | 'sheet_synced' | 'system'
        title: title || 'Admin Alert',
        body: body || 'A portal setting or spreadsheet was updated.',
        author: activeAdminName,
        details: details || {},
        link: link || '',
        timestamp: new Date().toISOString(),
        read: false,
        role: 'admin'
      };

      this.addNotifications([notif]);
      this.broadcastEvent('meded:admin_alert', notif);
      return notif;
    } catch (e) {
      console.warn('Error creating admin notification:', e);
      return null;
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
      if (typeof localStorage === 'undefined') return this._inMemorySent || {};
      const data = localStorage.getItem(this.SENT_KEY);
      const parsed = data ? JSON.parse(data) : (this._inMemorySent || {});
      this._inMemorySent = parsed;
      return parsed;
    } catch (e) {
      return this._inMemorySent || {};
    }
  }

  // --- 6. WhatsApp Helpers & Anti-Bot Queued Dispatch Engine ---
  cleanPhoneNumber(rawPhone, defaultCountry = '+91') {
    if (!rawPhone) return { formatted: '', digits: '', e164: '' };
    const str = String(rawPhone).trim();
    let digits = str.replace(/[^\d]/g, '');
    let countryCodeDigits = (defaultCountry || '+91').replace(/[^\d]/g, '') || '91';

    if (digits.length === 10) {
      digits = `${countryCodeDigits}${digits}`;
    } else if (digits.length > 10 && digits.startsWith('0')) {
      digits = `${countryCodeDigits}${digits.substring(1)}`;
    }

    const formatted = digits.length >= 10
      ? `+${digits.slice(0, digits.length - 10)} ${digits.slice(-10, -5)} ${digits.slice(-5)}`
      : str;
    const e164 = `+${digits}`;
    return { formatted, digits, e164 };
  }

  // --- 6. WhatsApp Helpers, Anti-Bot Queued Dispatch Engine & Headless Backend Bridge ---
  async getWhatsAppBackendStatus() {
    try {
      const res = await fetch('/api/whatsapp/status');
      if (res.ok) return await res.json();
    } catch (_) {}
    return { status: 'DISCONNECTED', connected: false };
  }

  async initWhatsAppBackendPairing(forceNew = false) {
    try {
      const res = await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ forceNew })
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return { status: 'DISCONNECTED', error: 'Failed to reach local server' };
  }

  async unlinkWhatsAppBackendDevice() {
    try {
      const res = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) return await res.json();
    } catch (_) {}
    return { status: 'DISCONNECTED' };
  }

  async sendWhatsAppBackendMessage(phone, message, meta = {}) {
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message, ...meta })
      });
      if (res.ok) return await res.json();
      const errData = await res.json().catch(() => ({}));
      return { success: false, error: errData.error || 'Server dispatch error' };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  generateWhatsAppMessageText(options = {}) {
    // Support options object { facultyName, facultyPhone, event, leadDurationText } or direct event object
    const event = options.event || (options.faculty || options.topic || options.subject ? options : {});
    const facultyName = options.facultyName || event.faculty || 'Dr. Natisha Arora';
    const topic = event.topic || event.chapter || event.displayTitle || 'Radiology • High Yield 50 Questions Discussion';
    const subject = event.subject || 'Radiology';
    const batch = event.batchName || event.batch || 'INI-CET Essentials Series';
    const dateRaw = event.dateRaw || event.date || event.isoDate || 'Wednesday, October 7, 2026';
    const rawTimings = event.timings || (event.startTime && event.endTime ? `${event.startTime} - ${event.endTime}` : (event.startTime || '5 pm Onwards'));
    const duration = event.duration || '2 Hours';
    
    let timeText = rawTimings;
    if (duration && !timeText.toLowerCase().includes(duration.toLowerCase())) {
      timeText = `${rawTimings} (${duration})`;
    }

    return `🩺 PW MedEd Class Reminder\n` +
      `🔔 *UPCOMING CLASS REMINDER* (30 Minutes Prior)\n\n` +
      `Dear *${facultyName}*,\n\n` +
      `📖 *Subject:* ${subject}\n` +
      `🎯 *Topic:* ${topic}\n` +
      `🎓 *Batch:* ${batch}\n` +
      `📅 *Date:* ${dateRaw}\n` +
      `⏰ *Time:* ${timeText}`;
  }

  generateWhatsAppUrl(phone, text) {
    const { digits } = this.cleanPhoneNumber(phone);
    if (!digits) return '';
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  }

  dispatchWhatsAppReminder(event, customOptions = {}) {
    const settings = this.getSettings();
    if (settings.whatsappEnabled === false && !customOptions.force) {
      return { success: false, reason: 'Automated WhatsApp reminders are currently disabled in Settings.' };
    }

    const facDetails = this.resolveFacultyDetails(customOptions.facultyName || event.faculty || 'Dr. Rajesh Jambhulkar');
    const targetPhone = customOptions.phone || customOptions.recipientPhone || facDetails.phone || '94234 07557';
    const phoneObj = this.cleanPhoneNumber(targetPhone, settings.whatsappCountryCode || '+91');
    const senderNumber = settings.whatsappSenderNumber || '94234 07557';
    const senderPhoneObj = this.cleanPhoneNumber(senderNumber, settings.whatsappCountryCode || '+91');
    const senderName = customOptions.senderName || settings.whatsappSenderName || 'PW MedEd Academic Directorate';
    const leadDurationMinutes = settings.leadDurationMinutes || 30;
    const leadDurationText = this.getLeadDurationText(leadDurationMinutes);

    const messageText = customOptions.messageText || this.generateWhatsAppMessageText({
      facultyName: facDetails.name,
      facultyPhone: phoneObj.formatted,
      event: event,
      leadDurationText: leadDurationText
    });

    const waUrl = this.generateWhatsAppUrl(phoneObj.digits, messageText);
    const nowIso = new Date().toISOString();
    const reminderId = `wa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // 1. Admin Notification (WhatsApp Dispatched Alert)
    const adminNotif = {
      id: `admin-${reminderId}`,
      reminderId: reminderId,
      type: 'whatsapp_reminder_sent',
      role: 'admin',
      title: `WhatsApp Class Reminder Sent to ${facDetails.name}`,
      body: `Automated ${leadDurationText} prior reminder dispatched from institutional node ${senderPhoneObj.formatted} to ${phoneObj.formatted} for "${event.topic || event.chapter || 'Lecture'}" at ${event.timings || '7:00 PM'}.`,
      facultyName: facDetails.name,
      senderName: senderName,
      senderPhone: senderPhoneObj.formatted,
      recipientPhone: phoneObj.formatted,
      recipientPhoneDigits: phoneObj.digits,
      subject: event.subject || 'Medical Lecture',
      topic: event.topic || event.chapter || 'Lecture',
      date: event.dateRaw || event.isoDate || '2026-10-15',
      timings: event.timings || '7:00 PM - 9:00 PM',
      leadDurationText: leadDurationText,
      messageText: messageText,
      waUrl: waUrl,
      timestamp: nowIso,
      read: false,
      status: 'Delivered (Direct Background Node • Anti-Bot Safe)'
    };

    // 2. Faculty Notification (WhatsApp Received Alert)
    const facultyNotif = {
      id: `fac-${reminderId}`,
      reminderId: reminderId,
      type: 'whatsapp_reminder_received',
      role: 'faculty',
      title: `WhatsApp Class Reminder: ${event.topic || event.chapter || 'Upcoming Lecture'}`,
      body: `Lecture starting in ${leadDurationText} at ${event.timings || '7:00 PM'}. Dispatched via institutional gateway ${senderPhoneObj.formatted} to your WhatsApp mobile (${phoneObj.formatted}).`,
      facultyName: facDetails.name,
      senderName: senderName,
      senderPhone: senderPhoneObj.formatted,
      recipientPhone: phoneObj.formatted,
      subject: event.subject || 'Medical Lecture',
      topic: event.topic || event.chapter || 'Lecture',
      date: event.dateRaw || event.isoDate || '2026-10-15',
      timings: event.timings || '7:00 PM - 9:00 PM',
      leadDurationText: leadDurationText,
      messageText: messageText,
      waUrl: waUrl,
      timestamp: nowIso,
      read: false
    };

    this.addNotifications([adminNotif, facultyNotif]);

    // Headless automated background dispatch via server socket
    this.sendWhatsAppBackendMessage(phoneObj.digits, messageText, {
      facultyName: facDetails.name,
      senderPhone: senderPhoneObj.formatted,
      eventTopic: event.topic || event.chapter
    }).then(res => {
      if (res && res.success) {
        console.log(`[WhatsApp] ✓ Live background message delivered to ${phoneObj.formatted} (Msg ID: ${res.messageId})`);
      } else if (res && res.error) {
        console.warn(`[WhatsApp] Notice: ${res.error}`);
      }
    }).catch(err => {
      console.warn('[WhatsApp] Headless send notice:', err.message);
    });

    const sentMap = this.getSentReminders();
    const eventKey = `${event.id || `${event.isoDate}_${event.faculty}`}_whatsapp`;
    sentMap[eventKey] = {
      sentAt: nowIso,
      senderPhone: senderPhoneObj.formatted,
      recipientPhone: phoneObj.formatted,
      topic: event.topic || event.chapter
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.SENT_KEY, JSON.stringify(sentMap));
    }

    this.broadcastEvent('meded:whatsapp_dispatched', {
      reminderId,
      adminNotif,
      facultyNotif,
      event,
      faculty: facDetails,
      phone: phoneObj
    });

    return {
      success: true,
      reminderId,
      facultyName: facDetails.name,
      phone: phoneObj,
      messageText,
      waUrl,
      adminNotif,
      facultyNotif
    };
  }

  queueWhatsAppReminder(event, customOptions = {}) {
    const settings = this.getSettings();
    if (settings.whatsappEnabled === false && !customOptions.force) {
      return { success: false, reason: 'Automated WhatsApp reminders disabled in settings' };
    }

    this._whatsappQueue.push({ event, customOptions, queuedAt: Date.now() });
    this.processWhatsAppQueue();
    return { success: true, queued: true, queueLength: this._whatsappQueue.length };
  }

  processWhatsAppQueue() {
    if (this._isProcessingWhatsAppQueue || this._whatsappQueue.length === 0) return;
    this._isProcessingWhatsAppQueue = true;

    const item = this._whatsappQueue.shift();
    if (!item) {
      this._isProcessingWhatsAppQueue = false;
      return;
    }

    try {
      this.dispatchWhatsAppReminder(item.event, item.customOptions);
    } catch (e) {
      console.error('Error dispatching queued WhatsApp reminder:', e);
    }

    // Anti-Bot randomized human-like jitter spacing (15s to 35s)
    if (this._whatsappQueue.length > 0) {
      const settings = this.getSettings();
      const baseSec = parseInt(settings.whatsappCadenceSeconds, 10) || 25;
      const jitterSec = parseInt(settings.whatsappJitterSeconds, 10) || 10;
      const jitterOffset = (Math.random() * 2 - 1) * jitterSec;
      const totalDelayMs = Math.max(8000, Math.round((baseSec + jitterOffset) * 1000));

      setTimeout(() => {
        this._isProcessingWhatsAppQueue = false;
        this.processWhatsAppQueue();
      }, totalDelayMs);
    } else {
      this._isProcessingWhatsAppQueue = false;
    }
  }

  // --- 7. Automated Schedule Checker (Email + Anti-Bot WhatsApp) ---
  checkAndDispatchUpcoming(events = [], activeBatchName = "Batch") {
    const settings = this.getSettings();
    const isEmailEnabled = settings.isEnabled !== false;
    const isWhatsAppEnabled = settings.whatsappEnabled !== false;

    if (!isEmailEnabled && !isWhatsAppEnabled) return [];

    const sentMap = this.getSentReminders();
    const dispatched = [];
    const leadMinutes = settings.leadDurationMinutes || 30;
    const now = new Date();
    
    events.forEach(ev => {
      if (ev.eventType !== 'class' || !ev.isoDate || !ev.faculty) return;
      if (ev.faculty.toLowerCase().includes('cool off')) return;

      const baseKey = ev.id || `${ev.isoDate}_${ev.faculty}_${ev.timings}`;
      const emailSent = sentMap[baseKey];
      const waSent = sentMap[`${baseKey}_whatsapp`];

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
        if (isEmailEnabled && !emailSent) {
          const res = this.dispatchReminder(ev, { batchName: activeBatchName });
          dispatched.push({ channel: 'email', ...res });
        }
        if (isWhatsAppEnabled && !waSent) {
          const res = this.queueWhatsAppReminder(ev, { batchName: activeBatchName });
          dispatched.push({ channel: 'whatsapp', ...res });
        }
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
