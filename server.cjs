/**
 * Zero-dependency local test server for PW MedEd Faculty Calendar.
 *
 * Serves the project straight from source (no build step, no node_modules)
 * and reproduces the two Google Sheets proxy endpoints that vite.config.js
 * only provides in `vite dev`, plus the clean routes from render.yaml.
 *
 *   node server.cjs            -> http://localhost:5173
 *   PORT=8080 node server.cjs  -> http://localhost:8080
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json; charset=utf-8'
};

// Clean routes, mirroring render.yaml rewrites
const ROUTES = {
  '/': '/admin.html',
  '/index.html': '/admin.html',
  '/admin': '/admin.html',
  '/faculty': '/faculty.html',
  '/week': '/week.html',
  '/timeline': '/timeline.html',
  '/requests': '/requests.html',
  '/login': '/login.html',
  '/admin-login': '/admin-login.html',
  '/faculty-login': '/faculty-login.html',
  '/admin/login': '/admin-login.html',
  '/faculty/login': '/faculty-login.html'
};

function json(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}

async function detectTabs(res, q) {
  let sheetId = q.sheetId;
  if (!sheetId && q.url) {
    const match = q.url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) sheetId = match[1];
  }
  if (!sheetId) return json(res, 400, { error: 'Missing sheetId', tabs: ['Lecture Planner'], recommendedTab: 'Lecture Planner' });
  try {
    const timestamp = Date.now();
    const r = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit?_t=${timestamp}`, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    });
    const html = await r.text();
    const re = /docs-sheet-tab-caption">([^<]+)<\/div>/g;
    const tabs = [];
    let m;
    while ((m = re.exec(html)) !== null) tabs.push(m[1]);
    const recommended =
      tabs.find(t => /planner|lecture/i.test(t)) ||
      tabs.find(t => /schedule/i.test(t)) ||
      tabs[0] || 'Lecture Planner';
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return json(res, 200, { success: true, tabs, recommendedTab: recommended });
  } catch (err) {
    return json(res, 500, { error: err.message, tabs: ['Lecture Planner'], recommendedTab: 'Lecture Planner' });
  }
}

async function fetchSheet(res, q) {
  let sheetId = q.sheetId;
  let gid = q.gid;
  if (!sheetId && q.url) {
    const match = q.url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) sheetId = match[1];
    const gidMatch = q.url.match(/[#&]gid=([0-9]+)/);
    if (!gid && gidMatch) gid = gidMatch[1];
  }
  const sheet = q.sheet || 'Lecture Planner';
  if (!sheetId) return json(res, 400, { error: 'Missing sheetId' });

  const timestamp = Date.now();
  const tries = [];
  if (gid) tries.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}&_t=${timestamp}`);
  tries.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&_t=${timestamp}`);
  tries.push(
    sheet.endsWith(' ')
      ? `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet.trim())}&_t=${timestamp}`
      : `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet + ' ')}&_t=${timestamp}`
  );

  for (const target of tries) {
    try {
      const r = await fetch(target, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      const text = await r.text();
      if (text && text.trim().length > 50 && !/^"?Completion %/.test(text)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.end(text);
      }
    } catch (_) { /* try next */ }
  }
  return json(res, 404, { error: `Could not find a valid lecture tab for "${sheet}".` });
}

const ONBOARDING_JSON_FILE = path.join(ROOT, 'data_faculty_onboarding.json');
const ONBOARDING_CSV_FILE = path.join(ROOT, 'data_faculty_onboarding.csv');

function facultyListToCSV(list) {
  const headers = ['Faculty ID', 'Name', 'Primary Email', 'Secondary Email', 'Phone', 'Department', 'Role', 'Designation', 'Status', 'Can Reschedule Cancel', 'Assigned Cohorts', 'Last Updated'];
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = [headers.join(',')];
  for (const f of list) {
    const roleVal = (f.role && String(f.role).toLowerCase().includes('admin')) ? 'Admin' : 'Teacher';
    const desigVal = f.designation || (f.role && f.role !== 'Teacher' && f.role !== 'Admin' ? f.role : (roleVal === 'Admin' ? 'Lead Academic Faculty' : `Professor • ${f.dept || 'Biochemistry'}`));
    const row = [
      escapeCsv(f.id || ''),
      escapeCsv(f.name || ''),
      escapeCsv(f.email || ''),
      escapeCsv(f.secondaryEmail || ''),
      escapeCsv(f.phone || ''),
      escapeCsv(f.dept || ''),
      escapeCsv(roleVal),
      escapeCsv(desigVal),
      escapeCsv(f.status || 'Verified'),
      escapeCsv(f.canRescheduleCancel !== false ? 'TRUE' : 'FALSE'),
      escapeCsv(Array.isArray(f.cohorts) ? f.cohorts.join('; ') : (f.cohorts || '')),
      escapeCsv(f.lastUpdated || new Date().toISOString())
    ];
    rows.push(row.join(','));
  }
  return rows.join('\r\n');
}

function parseFacultyCSV(csvText) {
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

  if (lines.length <= 1) return [];

  const rawHeaders = lines[0].map(h => String(h || '').trim().toLowerCase());
  const getCol = (patterns) => {
    const exact = rawHeaders.findIndex(h => patterns.some(p => h === p));
    if (exact >= 0) return exact;
    return rawHeaders.findIndex(h => patterns.some(p => {
      if (p === 'name' || p === 'faculty' || p === 'professor') {
        if (h.includes('id') || h.includes('email') || h.includes('role') || h.includes('status')) return false;
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
  const roleIdx = getCol(['role', 'portal role', 'access role']);
  const desigIdx = getCol(['designation', 'designation role', 'title']);
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

    const id = (idIdx >= 0 && r[idIdx] ? r[idIdx] : `fac-${i}`).trim();
    const email = ((emailIdx >= 0 ? r[emailIdx] : r[2]) || '').trim();
    const secEmail = ((secEmailIdx >= 0 ? r[secEmailIdx] : r[3]) || '').trim();
    const phone = ((phoneIdx >= 0 ? r[phoneIdx] : r[4]) || '98765 43210').trim();
    const dept = ((deptIdx >= 0 ? r[deptIdx] : r[5]) || 'Medical Sciences').trim();

    let role = 'Teacher';
    let designation = `Professor • ${dept}`;

    const rawRole = (roleIdx >= 0 ? r[roleIdx] : '').trim();
    const rawDesig = (desigIdx >= 0 ? r[desigIdx] : '').trim();

    if (roleIdx >= 0 && desigIdx >= 0 && roleIdx !== desigIdx) {
      role = (rawRole.toLowerCase() === 'admin' || rawRole.toLowerCase().includes('admin')) ? 'Admin' : 'Teacher';
      designation = rawDesig || (role === 'Admin' ? 'Academic Administration Lead' : `Professor • ${dept}`);
    } else if (roleIdx >= 0 && desigIdx < 0) {
      if (rawRole.toLowerCase() === 'admin' || rawRole.toLowerCase() === 'teacher') {
        role = rawRole.toLowerCase() === 'admin' ? 'Admin' : 'Teacher';
        designation = role === 'Admin' ? 'Lead Academic Faculty' : `Professor • ${dept}`;
      } else {
        role = rawRole.toLowerCase().includes('admin') ? 'Admin' : 'Teacher';
        designation = rawRole;
      }
    } else if (desigIdx >= 0) {
      role = (rawDesig.toLowerCase().includes('admin') || id.includes('admin') || email.includes('admin')) ? 'Admin' : 'Teacher';
      designation = rawDesig;
    }

    if (id.startsWith('fac-admin') || email === 'bhaskar.ekka@pw.live' || email === 'kanchan.gupta1@pw.live') {
      role = 'Admin';
    }

    const status = ((statusIdx >= 0 ? r[statusIdx] : r[7]) || 'Verified').trim();
    const permVal = String(permIdx >= 0 ? r[permIdx] : (r[8] || '')).trim();
    const canRescheduleCancel = permVal.toUpperCase() !== 'FALSE' && permVal.toLowerCase() !== 'no';
    const cohortsRaw = (cohortsIdx >= 0 ? r[cohortsIdx] : r[9]) || '';
    const cohorts = cohortsRaw ? cohortsRaw.split(/[;,]/).map(c => c.trim()).filter(Boolean) : ["Prarambh '26"];
    const lastUpdated = (updatedIdx >= 0 ? r[updatedIdx] : r[10]) || new Date().toISOString();

    list.push({
      id,
      name: name.trim(),
      email,
      secondaryEmail: secEmail || (email === 'bhaskar.ekka@pw.live' ? 'bhaskarekka27@gmail.com' : ''),
      phone,
      dept,
      role,
      designation,
      status: status || 'Verified',
      canRescheduleCancel,
      cohorts,
      lastUpdated
    });
  }
  return list;
}

function handleFacultyOnboardingApi(req, res, pathname) {
  if (pathname === '/api/faculty-onboarding-csv') {
    let csvContent = '';
    if (fs.existsSync(ONBOARDING_CSV_FILE)) {
      csvContent = fs.readFileSync(ONBOARDING_CSV_FILE, 'utf-8');
    } else if (fs.existsSync(ONBOARDING_JSON_FILE)) {
      try {
        const list = JSON.parse(fs.readFileSync(ONBOARDING_JSON_FILE, 'utf-8'));
        csvContent = facultyListToCSV(list);
        fs.writeFileSync(ONBOARDING_CSV_FILE, csvContent, 'utf-8');
      } catch (_) {}
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="PW_MedEd_Faculty_Onboarding_Directory.csv"');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.end(csvContent);
  }

  if (pathname === '/api/faculty-onboarding/sync-sheet' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const sheetUrl = data.sheetUrl;
        if (!sheetUrl) return json(res, 400, { error: 'Missing sheetUrl' });

        const match = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) return json(res, 400, { error: 'Invalid Google Spreadsheet URL' });
        const sheetId = match[1];
        const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : '0';

        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
        const response = await fetch(csvUrl);
        const csvText = await response.text();
        const parsedList = parseFacultyCSV(csvText);

        if (parsedList.length > 0) {
          fs.writeFileSync(ONBOARDING_JSON_FILE, JSON.stringify(parsedList, null, 2), 'utf-8');
          fs.writeFileSync(ONBOARDING_CSV_FILE, facultyListToCSV(parsedList), 'utf-8');
          return json(res, 200, { success: true, count: parsedList.length, list: parsedList });
        } else {
          return json(res, 400, { error: 'Could not extract valid faculty records from sheet.' });
        }
      } catch (err) {
        return json(res, 500, { error: err.message });
      }
    });
    return;
  }

  if (req.method === 'GET') {
    try {
      if (fs.existsSync(ONBOARDING_JSON_FILE)) {
        const content = fs.readFileSync(ONBOARDING_JSON_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        return json(res, 200, { success: true, list: parsed });
      }
    } catch (e) {}
    return json(res, 200, { success: true, list: null });
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        let list = [];
        if (fs.existsSync(ONBOARDING_JSON_FILE)) {
          try { list = JSON.parse(fs.readFileSync(ONBOARDING_JSON_FILE, 'utf-8')); } catch (_) {}
        }

        if (Array.isArray(data.list)) {
          list = data.list;
        } else if (data.action === 'add' && data.faculty) {
          list.unshift(data.faculty);
        } else if (data.action === 'update' && data.faculty) {
          const idx = list.findIndex(f => f.id === data.faculty.id || (f.email && f.email.toLowerCase() === (data.faculty.email || '').toLowerCase()));
          if (idx >= 0) list[idx] = { ...list[idx], ...data.faculty };
          else list.push(data.faculty);
        } else if (data.action === 'delete' && (data.faculty || data.id)) {
          const targetId = (data.faculty && data.faculty.id) || data.id;
          const targetEmail = (data.faculty && data.faculty.email) || data.email;
          list = list.filter(f => f.id !== targetId && (!targetEmail || f.email?.toLowerCase() !== targetEmail.toLowerCase()));
        }

        fs.writeFileSync(ONBOARDING_JSON_FILE, JSON.stringify(list, null, 2), 'utf-8');
        const csvText = facultyListToCSV(list);
        fs.writeFileSync(ONBOARDING_CSV_FILE, csvText, 'utf-8');
        return json(res, 200, { success: true, count: list.length, list });
      } catch (err) {
        return json(res, 400, { error: err.message });
      }
    });
    return;
  }
}

const BATCHES_JSON_FILE = path.join(ROOT, 'data_batches.json');
const REQUESTS_JSON_FILE = path.join(ROOT, 'data_requests.json');
const SETTINGS_JSON_FILE = path.join(ROOT, 'data_settings.json');

function handleBatchesApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.end();
  }

  if (req.method === 'GET') {
    try {
      if (fs.existsSync(BATCHES_JSON_FILE)) {
        const content = fs.readFileSync(BATCHES_JSON_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        return json(res, 200, { success: true, batches: parsed });
      }
    } catch (e) {}
    return json(res, 200, { success: true, batches: [] });
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        let list = [];
        if (fs.existsSync(BATCHES_JSON_FILE)) {
          try { list = JSON.parse(fs.readFileSync(BATCHES_JSON_FILE, 'utf-8')); } catch (_) {}
        }

        if (Array.isArray(data.batches)) {
          fs.writeFileSync(BATCHES_JSON_FILE, JSON.stringify(data.batches, null, 2), 'utf-8');
          return json(res, 200, { success: true, count: data.batches.length, batches: data.batches });
        } else if (data.batch && data.batch.id) {
          const idx = list.findIndex(b => b.id === data.batch.id);
          if (idx >= 0) {
            list[idx] = data.batch;
          } else {
            list.push(data.batch);
          }
          fs.writeFileSync(BATCHES_JSON_FILE, JSON.stringify(list, null, 2), 'utf-8');
          return json(res, 200, { success: true, count: list.length, batch: data.batch });
        } else if (data.action === 'delete' && data.id) {
          list = list.filter(b => b.id !== data.id);
          fs.writeFileSync(BATCHES_JSON_FILE, JSON.stringify(list, null, 2), 'utf-8');
          return json(res, 200, { success: true, count: list.length });
        }
      } catch (err) {
        return json(res, 400, { error: err.message });
      }
      return json(res, 400, { error: 'Invalid batch data' });
    });
    return;
  }
}

function handleRequestsApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.end();
  }

  if (req.method === 'GET') {
    try {
      if (fs.existsSync(REQUESTS_JSON_FILE)) {
        const content = fs.readFileSync(REQUESTS_JSON_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        return json(res, 200, { success: true, requests: parsed });
      }
    } catch (e) {}
    return json(res, 200, { success: true, requests: [] });
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        let list = [];
        if (fs.existsSync(REQUESTS_JSON_FILE)) {
          try { list = JSON.parse(fs.readFileSync(REQUESTS_JSON_FILE, 'utf-8')); } catch (_) {}
        }

        if (Array.isArray(data.requests)) {
          fs.writeFileSync(REQUESTS_JSON_FILE, JSON.stringify(data.requests, null, 2), 'utf-8');
          return json(res, 200, { success: true, count: data.requests.length, requests: data.requests });
        } else if (data.request && data.request.id) {
          const idx = list.findIndex(r => r.id === data.request.id);
          if (idx >= 0) {
            list[idx] = data.request;
          } else {
            list.unshift(data.request);
          }
          fs.writeFileSync(REQUESTS_JSON_FILE, JSON.stringify(list, null, 2), 'utf-8');
          return json(res, 200, { success: true, count: list.length, request: data.request });
        } else if (data.action === 'update_status' && data.id) {
          const reqItem = list.find(r => r.id === data.id);
          if (reqItem) {
            reqItem.status = data.status || 'approved';
            reqItem.resolvedAt = new Date().toISOString();
            if (data.notes) reqItem.notes = data.notes;
            fs.writeFileSync(REQUESTS_JSON_FILE, JSON.stringify(list, null, 2), 'utf-8');
            return json(res, 200, { success: true, request: reqItem });
          }
          return json(res, 404, { error: 'Request not found' });
        }
      } catch (err) {
        return json(res, 400, { error: err.message });
      }
      return json(res, 400, { error: 'Invalid requests data' });
    });
    return;
  }
}

function handleSettingsApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.end();
  }

  if (req.method === 'GET') {
    try {
      if (fs.existsSync(SETTINGS_JSON_FILE)) {
        const content = fs.readFileSync(SETTINGS_JSON_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        return json(res, 200, { success: true, settings: parsed });
      }
    } catch (e) {}
    return json(res, 200, { success: true, settings: {} });
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        let settings = {};
        if (fs.existsSync(SETTINGS_JSON_FILE)) {
          try { settings = JSON.parse(fs.readFileSync(SETTINGS_JSON_FILE, 'utf-8')); } catch (_) {}
        }

        if (data.key) {
          settings[data.key] = data.value;
        } else if (data.settings && typeof data.settings === 'object') {
          settings = { ...settings, ...data.settings };
        }
        fs.writeFileSync(SETTINGS_JSON_FILE, JSON.stringify(settings, null, 2), 'utf-8');
        return json(res, 200, { success: true, settings });
      } catch (err) {
        return json(res, 400, { error: err.message });
      }
    });
    return;
  }
}

const whatsappService = require('./whatsappService.cjs');

async function handleWhatsAppApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/whatsapp/status') {
    return json(res, 200, whatsappService.getStatus());
  }

  if (req.method === 'POST' && pathname === '/api/whatsapp/connect') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = body ? JSON.parse(body) : {};
        const status = await whatsappService.initialize(!!data.forceNew);
        return json(res, 200, status);
      } catch (err) {
        return json(res, 500, { error: err.message });
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/whatsapp/disconnect') {
    try {
      await whatsappService.clearAuth();
      return json(res, 200, whatsappService.getStatus());
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  if (req.method === 'POST' && pathname === '/api/whatsapp/pair-code') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const resObj = await whatsappService.requestPairingCode(data.phone);
        return json(res, 200, resObj);
      } catch (err) {
        return json(res, 400, { error: err.message });
      }
    });
    return;
  }

  if (req.method === 'POST' && pathname === '/api/whatsapp/send') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const phone = data.phone || data.recipientPhone;
        const message = data.message || data.text;
        if (!phone) return json(res, 400, { error: 'Recipient phone number is required' });
        if (!message) return json(res, 400, { error: 'Message content is required' });

        const sendResult = await whatsappService.sendMessage(phone, message);
        return json(res, 200, sendResult);
      } catch (err) {
        return json(res, 500, { error: err.message });
      }
    });
    return;
  }

  return json(res, 404, { error: 'Unknown WhatsApp endpoint' });
}

function handleSyncStateApi(req, res) {
  const getMtime = (f) => {
    try { return fs.statSync(f).mtimeMs; } catch (_) { return 0; }
  };
  return json(res, 200, {
    success: true,
    state: {
      batches: getMtime(BATCHES_JSON_FILE),
      onboarding: getMtime(ONBOARDING_JSON_FILE),
      requests: getMtime(REQUESTS_JSON_FILE),
      settings: getMtime(SETTINGS_JSON_FILE)
    }
  });
}

async function handleEmailApi(req, res) {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body || '{}');
        const to = data.to || data.recipientEmail || data.recipient;
        const subject = data.subject || '[PW MedEd] Class Reminder';
        const html = data.html || data.emailHtml || data.htmlBody || '';
        const senderEmail = data.from || data.senderEmail || '';
        const senderName = data.name || data.senderName || 'PW MedEd Academic Directorate';
        let scriptUrl = (data.scriptUrl || data.endpoint || '').trim();
        const token = (data.token || 'pw-meded-token-2026').trim();

        if (!to) return json(res, 400, { error: 'Recipient email is required' });

        // If an Apps Script URL is not explicitly passed, resolve from saved settings
        if (!scriptUrl) {
          try {
            if (fs.existsSync(SETTINGS_JSON_FILE)) {
              const cfg = JSON.parse(fs.readFileSync(SETTINGS_JSON_FILE, 'utf-8'));
              scriptUrl = cfg.appsScriptUrl || cfg.pw_faculty_script_url || cfg.meded_sheet_writer_url || '';
              if (!scriptUrl && cfg.meded_sheet_writeback_config_v1) {
                try {
                  const parsedWb = JSON.parse(cfg.meded_sheet_writeback_config_v1);
                  scriptUrl = parsedWb.endpoint || '';
                } catch (_) {}
              }
            }
          } catch (_) {}
        }

        if (scriptUrl && scriptUrl.includes('script.google.com/macros/s/')) {
          try {
            const resp = await fetch(scriptUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain;charset=utf-8' },
              body: JSON.stringify({
                action: 'send_email',
                token: token,
                email: {
                  to,
                  subject,
                  htmlBody: html,
                  name: senderName,
                  senderName,
                  senderEmail,
                  from: senderEmail,
                  replyTo: senderEmail
                }
              })
            });
            const scriptRes = await resp.json().catch(() => ({ ok: true }));
            return json(res, 200, {
              success: true,
              delivered: true,
              via: 'Google Apps Script (MailApp)',
              recipient: to,
              scriptResponse: scriptRes
            });
          } catch (scriptErr) {
            return json(res, 500, {
              success: false,
              error: 'Apps Script dispatch failed: ' + scriptErr.message
            });
          }
        }

        return json(res, 200, {
          success: true,
          delivered: false,
          note: 'Apps Script URL not set. Connect Google Apps Script Web App URL to dispatch directly to external inboxes.'
        });
      } catch (err) {
        return json(res, 400, { error: err.message });
      }
    });
    return;
  }
  return json(res, 405, { error: 'Method not allowed' });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsed.pathname);

  if (pathname.startsWith('/api/detect-tabs')) return detectTabs(res, parsed.query);
  if (pathname.startsWith('/api/fetch-sheet')) return fetchSheet(res, parsed.query);
  if (pathname.startsWith('/api/faculty-onboarding')) return handleFacultyOnboardingApi(req, res, pathname);
  if (pathname.startsWith('/api/batches')) return handleBatchesApi(req, res, pathname);
  if (pathname.startsWith('/api/requests')) return handleRequestsApi(req, res, pathname);
  if (pathname.startsWith('/api/settings')) return handleSettingsApi(req, res, pathname);
  if (pathname.startsWith('/api/send-email') || pathname.startsWith('/api/email')) return handleEmailApi(req, res);
  if (pathname.startsWith('/api/whatsapp')) return handleWhatsAppApi(req, res, pathname);
  if (pathname.startsWith('/api/sync-state')) return handleSyncStateApi(req, res);

  if (ROUTES[pathname]) pathname = ROUTES[pathname];

  // Contain the served path inside ROOT
  const filePath = path.join(ROOT, path.normalize(pathname).replace(/^([/\\])+/, ''));
  if (!filePath.startsWith(ROOT)) {
    res.statusCode = 403;
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.end(`404 Not Found: ${pathname}`);
    }
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(filePath).pipe(res);
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use (a vite dev server, perhaps?).`);
    console.error(`  Stop it, or pick another port:  set PORT=5174 && node server.cjs\n`);
  } else if (err.code === 'EACCES') {
    console.error(`\n  Not allowed to bind port ${PORT}. Try a port above 1024.\n`);
  } else {
    console.error('\n  Server error:', err.message, '\n');
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  PW MedEd local test server\n`);
  console.log(`  Admin     http://localhost:${PORT}/admin`);
  console.log(`  Faculty   http://localhost:${PORT}/faculty`);
  console.log(`  Week      http://localhost:${PORT}/week`);
  console.log(`  Timeline  http://localhost:${PORT}/timeline`);
  console.log(`  Requests  http://localhost:${PORT}/requests`);
  console.log(`  Login     http://localhost:${PORT}/login`);
  console.log(`\n  Sheets proxy: /api/detect-tabs, /api/fetch-sheet`);
  console.log(`  Ctrl+C to stop\n`);
});
