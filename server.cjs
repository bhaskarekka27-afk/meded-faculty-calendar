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

const tabGidCache = new Map();

async function resolveSheetGid(sheetId, requestedSheetName) {
  const cacheKey = `${sheetId}:${requestedSheetName || ''}`;
  if (tabGidCache.has(cacheKey)) return tabGidCache.get(cacheKey);
  try {
    const timestamp = Date.now();
    const r = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit?_t=${timestamp}`, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    });
    const html = await r.text();
    const re = /\\\"(\d+)\\\",\[\{\\\"1\\\":\[\[0,0,\\\"([^\\\"]+)\\\"/g;
    let m;
    const tabs = [];
    while ((m = re.exec(html)) !== null) {
      tabs.push({ gid: m[1], name: m[2].trim() });
    }
    let matchedGid = null;
    if (requestedSheetName) {
      const req = requestedSheetName.toLowerCase();
      const match = tabs.find(t => t.name.toLowerCase() === req) ||
                    tabs.find(t => t.name.toLowerCase().includes(req)) ||
                    tabs.find(t => req.includes(t.name.toLowerCase())) ||
                    tabs.find(t => /planner|lecture/i.test(t.name)) ||
                    tabs.find(t => /schedule/i.test(t.name));
      if (match) matchedGid = match.gid;
    }
    if (!matchedGid && tabs.length > 0) {
      const best = tabs.find(t => /planner|lecture/i.test(t.name)) || tabs.find(t => /schedule/i.test(t.name)) || tabs[0];
      matchedGid = best ? best.gid : null;
    }
    if (matchedGid) tabGidCache.set(cacheKey, matchedGid);
    return matchedGid;
  } catch (_) {
    return null;
  }
}

async function fetchSheetRaw(sheetIdOrUrl, sheet = 'Lecture Planner', gidParam = null) {
  let sheetId = sheetIdOrUrl;
  let gid = gidParam;
  if (sheetIdOrUrl && sheetIdOrUrl.includes('/spreadsheets/d/')) {
    const match = sheetIdOrUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) sheetId = match[1];
    const gidMatch = sheetIdOrUrl.match(/[#&]gid=([0-9]+)/);
    if (!gid && gidMatch) gid = gidMatch[1];
  }
  if (!sheetId) throw new Error('Missing sheetId');

  const resolvedGid = await resolveSheetGid(sheetId, sheet);
  const targetGid = resolvedGid || gid;

  const timestamp = Date.now();
  const tries = [];
  if (targetGid != null) {
    tries.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${targetGid}&_t=${timestamp}`);
    tries.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${targetGid}&_t=${timestamp}`);
  }
  if (gid && gid !== targetGid) {
    tries.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&_t=${timestamp}`);
    tries.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}&_t=${timestamp}`);
  }
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
        return text;
      }
    } catch (_) { /* try next */ }
  }
  throw new Error(`Could not find a valid lecture tab for "${sheet}".`);
}

async function fetchSheet(res, q) {
  const sheetIdOrUrl = q.sheetId || q.url;
  const sheet = q.sheet || 'Lecture Planner';
  if (!sheetIdOrUrl) return json(res, 400, { error: 'Missing sheetId or url' });
  try {
    const text = await fetchSheetRaw(sheetIdOrUrl, sheet, q.gid);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.end(text);
  } catch (err) {
    return json(res, 404, { error: err.message });
  }
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
// When each setting last changed (ISO). The client needs this to tell "newer than mine" from
// "older than mine"; without it every poll looked brand new and overwrote the admin's edit.
const SETTINGS_META_FILE = path.join(ROOT, 'data_settings_meta.json');

function readSettingsMeta() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_META_FILE, 'utf-8')) || {}; } catch (_) { return {}; }
}

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
        return json(res, 200, { success: true, settings: parsed, meta: readSettingsMeta() });
      }
    } catch (e) {}
    return json(res, 200, { success: true, settings: {}, meta: {} });
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

        const meta = readSettingsMeta();
        const stamp = data.updatedAt || new Date().toISOString();
        if (data.key) {
          // Ignore a write that is older than what the server already holds for this key.
          if (meta[data.key] && meta[data.key] > stamp) {
            return json(res, 200, { success: true, stale: true, settings, meta });
          }
          settings[data.key] = data.value;
          meta[data.key] = stamp;
        } else if (data.settings && typeof data.settings === 'object') {
          settings = { ...settings, ...data.settings };
          Object.keys(data.settings).forEach(k => { meta[k] = stamp; });
        }
        fs.writeFileSync(SETTINGS_JSON_FILE, JSON.stringify(settings, null, 2), 'utf-8');
        fs.writeFileSync(SETTINGS_META_FILE, JSON.stringify(meta, null, 2), 'utf-8');
        return json(res, 200, { success: true, settings, meta });
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

const crypto = require('crypto');
function computeHash(content) {
  return crypto.createHash('md5').update(content || '').digest('hex');
}

const SENT_REMINDERS_FILE = path.join(ROOT, 'data_sent_reminders.json');
const NOTIFICATIONS_FILE = path.join(ROOT, 'data_notifications.json');

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (_) {}

function readSentReminders() {
  try {
    if (fs.existsSync(SENT_REMINDERS_FILE)) {
      return JSON.parse(fs.readFileSync(SENT_REMINDERS_FILE, 'utf-8')) || {};
    }
  } catch (_) {}
  return {};
}

function writeSentReminders(map) {
  try {
    fs.writeFileSync(SENT_REMINDERS_FILE, JSON.stringify(map, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Reminder Engine] Failed to write sent reminders:', err.message);
  }
}

function readNotifications() {
  try {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      return JSON.parse(fs.readFileSync(NOTIFICATIONS_FILE, 'utf-8')) || [];
    }
  } catch (_) {}
  return [];
}

function writeNotifications(list) {
  try {
    fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(list.slice(0, 300), null, 2), 'utf-8');
  } catch (err) {
    console.error('[Reminder Engine] Failed to write notifications:', err.message);
  }
}

function resolveFacultyEmail(facultyName) {
  if (!facultyName) return null;
  const clean = String(facultyName).trim().toLowerCase();
  try {
    if (fs.existsSync(ONBOARDING_JSON_FILE)) {
      const list = JSON.parse(fs.readFileSync(ONBOARDING_JSON_FILE, 'utf-8')) || [];
      // 1. Exact match
      let match = list.find(f => (f.name || '').trim().toLowerCase() === clean);
      // 2. Loose match
      if (!match) {
        match = list.find(f => {
          const fn = (f.name || '').trim().toLowerCase();
          return fn && (clean.includes(fn) || fn.includes(clean));
        });
      }
      if (match && (match.email || match.secondaryEmail)) {
        return {
          name: match.name || facultyName,
          email: match.email || match.secondaryEmail,
          phone: match.phone || '',
          dept: match.dept || ''
        };
      }
    }
  } catch (_) {}
  return null;
}

function generateReminderHtml({ facultyName, topic, chapter, batchName, dateStr, timings, leadText }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f1ede4;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:620px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 12px 32px rgba(45,77,55,0.12);border:1px solid #e5dfd5;">
    <div style="background:linear-gradient(135deg, #1b3524 0%, #2d4d37 100%);color:#ffffff;padding:32px 28px;text-align:center;">
      <div style="font-size:28px;margin-bottom:8px;">🩺</div>
      <h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em;">PW MedEd Academic Directorate</h1>
      <p style="margin:8px 0 0;font-size:13px;opacity:0.9;letter-spacing:0.04em;text-transform:uppercase;font-weight:600;">Class Reminder • ${leadText} Prior</p>
    </div>
    <div style="padding:32px 28px;color:#2c332d;">
      <p style="font-size:16px;margin:0 0 16px;color:#1b3524;">Dear <strong>${facultyName}</strong>,</p>
      <p style="font-size:14px;line-height:1.6;color:#526054;margin:0 0 24px;">
        This is an automated academic notification that your upcoming scheduled lecture commences in <strong>${leadText}</strong>. Please ensure your digital whiteboard and lecture hall are ready.
      </p>
      <div style="background:#faf7f2;border:1px solid #ede7dc;border-radius:12px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:8px 0;color:#7a6d59;font-weight:600;width:35%;">Batch / Cohort:</td>
            <td style="padding:8px 0;color:#1b3524;font-weight:700;">${batchName || 'PW MedEd Academic Cohort'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a6d59;font-weight:600;">Topic:</td>
            <td style="padding:8px 0;color:#1b3524;font-weight:700;">${topic || chapter || 'Scheduled Lecture'}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a6d59;font-weight:600;">Date:</td>
            <td style="padding:8px 0;color:#1b3524;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;color:#7a6d59;font-weight:600;">Scheduled Slot:</td>
            <td style="padding:8px 0;color:#2d4d37;font-weight:700;">${timings}</td>
          </tr>
        </table>
      </div>
      <div style="text-align:center;margin:28px 0 16px;">
        <a href="http://localhost:${PORT}/faculty" style="display:inline-block;background:#2d4d37;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;box-shadow:0 4px 14px rgba(45,77,55,0.25);">
          Open Faculty Portal &rarr;
        </a>
      </div>
      <p style="font-size:12px;color:#8a8070;text-align:center;margin:24px 0 0;line-height:1.5;">
        Automated reminder delivered via PW MedEd Faculty Calendar Engine.<br/>
        For slot swaps or emergencies, use the Request Reschedule toggle in the faculty portal.
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function sendEmailInternal({ to, recipientName, subject, html, senderName, senderEmail, scriptUrl, token }) {
  if (!to) return { success: false, error: 'Recipient email is required' };

  // 1. Try direct SMTP if configured via environment or settings
  let smtpConfig = null;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    smtpConfig = {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      from: process.env.SMTP_FROM || senderEmail || process.env.SMTP_USER
    };
  } else {
    try {
      if (fs.existsSync(SETTINGS_JSON_FILE)) {
        const cfg = JSON.parse(fs.readFileSync(SETTINGS_JSON_FILE, 'utf-8'));
        const em = typeof cfg.meded_email_settings === 'string' ? JSON.parse(cfg.meded_email_settings) : (cfg.meded_email_settings || {});
        if (em.smtp && em.smtp.host && em.smtp.user && em.smtp.pass) {
          smtpConfig = em.smtp;
        }
      }
    } catch (_) {}
  }

  if (smtpConfig && nodemailer) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: Number(smtpConfig.port) || 587,
        secure: smtpConfig.secure || Number(smtpConfig.port) === 465,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass
        }
      });

      const info = await transporter.sendMail({
        from: `"${senderName || 'PW MedEd Class Reminder'}" <${smtpConfig.from || smtpConfig.user}>`,
        to: to,
        subject: subject,
        html: html
      });

      return {
        success: true,
        delivered: true,
        via: `SMTP (${smtpConfig.host})`,
        recipient: to,
        messageId: info.messageId
      };
    } catch (smtpErr) {
      console.warn('[Email Dispatch] SMTP attempt failed:', smtpErr.message);
    }
  }

  // 2. Try Google Apps Script Web App
  if (!scriptUrl) {
    try {
      if (fs.existsSync(SETTINGS_JSON_FILE)) {
        const cfg = JSON.parse(fs.readFileSync(SETTINGS_JSON_FILE, 'utf-8'));
        const em = typeof cfg.meded_email_settings === 'string' ? JSON.parse(cfg.meded_email_settings) : (cfg.meded_email_settings || {});
        scriptUrl = em.appsScriptUrl || cfg.appsScriptUrl || '';
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
          token: token || 'pw-meded-token-2026',
          email: {
            to,
            subject,
            htmlBody: html,
            name: senderName || 'PW MedEd Class Reminder',
            senderName: senderName || 'PW MedEd Class Reminder',
            senderEmail: senderEmail || 'academic-reminders@pwmeded.edu.in',
            from: senderEmail || 'academic-reminders@pwmeded.edu.in',
            replyTo: senderEmail || 'academic-reminders@pwmeded.edu.in'
          }
        })
      });

      const scriptRes = await resp.json().catch(() => ({ ok: true }));
      if (scriptRes && scriptRes.ok === false) {
        const isUnknownAction = String(scriptRes.error || '').includes('Unknown action');
        return {
          success: false,
          delivered: false,
          via: 'Google Apps Script (MailApp)',
          error: scriptRes.error,
          scriptResponse: scriptRes,
          note: isUnknownAction
            ? "Google Apps Script needs redeployment: copy apps-script/Code.gs into Apps Script editor and deploy as a new version to activate 'send_email'."
            : scriptRes.error
        };
      }

      return {
        success: true,
        delivered: true,
        via: 'Google Apps Script (MailApp)',
        recipient: to,
        scriptResponse: scriptRes
      };
    } catch (scriptErr) {
      return {
        success: false,
        delivered: false,
        error: 'Apps Script dispatch failed: ' + scriptErr.message
      };
    }
  }

  return {
    success: true,
    delivered: false,
    note: 'Apps Script or SMTP not connected. Alert recorded in institutional portal notifications.'
  };
}

class AutomatedReminderEngine {
  constructor() {
    this.timer = null;
    this.isRunning = false;
    this.lastCheckedAt = null;
    this.lastDispatched = [];
    this.scanStats = { totalEvents: 0, upcomingEvents: 0, sentCount: 0 };
  }

  start(intervalMs = 30000) {
    if (this.timer) clearInterval(this.timer);
    this.isRunning = true;
    console.log(`[Reminder Engine] 🕒 Automated calendar scheduler started (interval: ${Math.round(intervalMs / 1000)}s)`);
    
    // Initial check after 3 seconds
    setTimeout(() => {
      this.checkUpcomingClasses().catch(err => {
        console.error('[Reminder Engine] Initial check error:', err.message);
      });
    }, 3000);

    // Periodic check
    this.timer = setInterval(() => {
      this.checkUpcomingClasses().catch(err => {
        console.error('[Reminder Engine] Periodic check error:', err.message);
      });
    }, intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.isRunning = false;
  }

  getStatus() {
    const sentMap = readSentReminders();
    return {
      running: this.isRunning,
      lastCheckedAt: this.lastCheckedAt,
      stats: {
        ...this.scanStats,
        totalSentSaved: Object.keys(sentMap).length
      },
      recentDispatches: this.lastDispatched.slice(0, 10)
    };
  }

  async checkUpcomingClasses(force = false) {
    this.lastCheckedAt = new Date().toISOString();

    // 1. Load settings
    let emailSettings = {
      isEnabled: true,
      leadDurationMinutes: 45,
      senderEmail: 'academic-reminders@pwmeded.edu.in',
      senderName: 'PW MedEd Academic Directorate',
      replyTo: 'dean.office@pwmeded.edu.in'
    };

    if (fs.existsSync(SETTINGS_JSON_FILE)) {
      try {
        const raw = JSON.parse(fs.readFileSync(SETTINGS_JSON_FILE, 'utf-8'));
        if (raw.meded_email_settings) {
          const parsed = typeof raw.meded_email_settings === 'string' ? JSON.parse(raw.meded_email_settings) : raw.meded_email_settings;
          emailSettings = { ...emailSettings, ...parsed };
        }
      } catch (_) {}
    }

    if (!emailSettings.isEnabled && !force) {
      return { ok: true, skipped: 'Automated email reminders disabled in settings' };
    }

    let leadMinutes = Number(emailSettings.leadDurationMinutes || 45);
    if (emailSettings.leadDurationValue !== undefined && emailSettings.leadDurationUnit) {
      const val = parseInt(emailSettings.leadDurationValue, 10) || 45;
      leadMinutes = emailSettings.leadDurationUnit === 'hours' ? val * 60 : (emailSettings.leadDurationUnit === 'days' ? val * 1440 : val);
    }
    const maxDiffMinutes = leadMinutes + 5; // 5m forward leeway
    const minDiffMinutes = -15;             // 15m grace window for classes just starting
    const now = new Date();

    // 2. Load batches and events
    let batches = [];
    if (fs.existsSync(BATCHES_JSON_FILE)) {
      try {
        batches = JSON.parse(fs.readFileSync(BATCHES_JSON_FILE, 'utf-8')) || [];
      } catch (_) {}
    }

    const sentMap = readSentReminders();
    const notifications = readNotifications();
    const newlyDispatched = [];
    let scannedTotal = 0;
    let upcomingCount = 0;

    for (const b of batches) {
      const events = Array.isArray(b.events) ? b.events : [];
      for (const ev of events) {
        scannedTotal++;
        if (ev.eventType !== 'class' || !ev.isoDate || !ev.faculty) continue;
        if (ev.faculty.toLowerCase().includes('cool off') || ev.isCancelled) continue;

        // Parse class start time
        let startH = 19;
        let startM = 0;
        const timingSource = ev.startTime || ev.timings || '';
        if (timingSource) {
          const tm = timingSource.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
          if (tm) {
            let h = parseInt(tm[1], 10);
            const m = parseInt(tm[2] || '0', 10);
            const ampm = (tm[3] || '').toUpperCase();
            if (ampm === 'PM' && h < 12) h += 12;
            if (ampm === 'AM' && h === 12) h = 0;
            startH = h;
            startM = m;
          }
        } else if (typeof ev.startHour === 'number' && !isNaN(ev.startHour)) {
          startH = Math.floor(ev.startHour);
          startM = Math.round((ev.startHour - startH) * 60);
        }

        const [y, m, d] = ev.isoDate.split('-').map(Number);
        const classStartTime = new Date(y, m - 1, d, startH, startM);
        const diffMs = classStartTime.getTime() - now.getTime();
        const diffMinutes = Math.round(diffMs / 60000);

        // Check if class falls into upcoming window
        if (diffMinutes >= minDiffMinutes && diffMinutes <= maxDiffMinutes) {
          upcomingCount++;
          const baseKey = ev.id || `${ev.isoDate}_${ev.faculty}_${ev.timings || ''}`;
          const emailKey = `${baseKey}_email_${leadMinutes}`;

          if (sentMap[emailKey] && !force) {
            continue; // Already sent for this lead interval
          }

          // Resolve faculty contact details
          const facInfo = resolveFacultyEmail(ev.faculty);
          const recipientEmail = facInfo?.email || 'dean.notifications@pwmeded.edu.in';
          const recipientName = facInfo?.name || ev.faculty;
          const leadText = leadMinutes >= 60 ? `${Math.round(leadMinutes / 60)} Hour(s)` : `${leadMinutes} Minutes`;
          const subject = `[PW MedEd] Class Reminder: ${ev.topic || ev.chapter || 'Lecture'} (${leadText} Prior)`;

          const htmlBody = generateReminderHtml({
            facultyName: recipientName,
            topic: ev.topic,
            chapter: ev.chapter,
            batchName: ev.batchName || b.name,
            dateStr: ev.dateRaw || ev.isoDate,
            timings: ev.timings || `${startH}:${startM < 10 ? '0' + startM : startM}`,
            leadText
          });

          // Dispatch email
          const dispatchRes = await sendEmailInternal({
            to: recipientEmail,
            recipientName,
            subject,
            html: htmlBody,
            senderName: emailSettings.senderName,
            senderEmail: emailSettings.senderEmail
          });

          // Record in sent log
          sentMap[emailKey] = {
            sentAt: now.toISOString(),
            faculty: recipientName,
            recipient: recipientEmail,
            topic: ev.topic || ev.chapter,
            batch: ev.batchName || b.name,
            diffMinutes,
            leadMinutes,
            delivered: dispatchRes.delivered,
            via: dispatchRes.via || 'System Alert'
          };
          sentMap[baseKey] = sentMap[emailKey];

          // Create dual notification
          const reminderId = `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          notifications.unshift({
            id: `admin-${reminderId}`,
            type: 'email_reminder_sent',
            role: 'admin',
            title: `Automated Class Reminder Sent to ${recipientName}`,
            body: `Automated ${leadText} reminder dispatched to ${recipientEmail} for "${ev.topic || ev.chapter || 'Lecture'}" (${diffMinutes > 0 ? diffMinutes + 'm prior' : 'in progress'}).`,
            recipientEmail,
            facultyName: recipientName,
            subject,
            topic: ev.topic || ev.chapter,
            timings: ev.timings || `${startH}:${startM < 10 ? '0' + startM : startM}`,
            date: ev.isoDate,
            timestamp: now.toISOString(),
            delivered: dispatchRes.delivered,
            via: dispatchRes.via
          });

          notifications.unshift({
            id: `fac-${reminderId}`,
            type: 'email_reminder_received',
            role: 'faculty',
            title: `Class Reminder: ${ev.topic || ev.chapter || 'Upcoming Lecture'}`,
            body: `Lecture starting in ${leadText}. Reminder dispatched to ${recipientEmail}.`,
            recipientEmail,
            facultyName: recipientName,
            subject,
            topic: ev.topic || ev.chapter,
            timings: ev.timings || `${startH}:${startM < 10 ? '0' + startM : startM}`,
            date: ev.isoDate,
            timestamp: now.toISOString(),
            delivered: dispatchRes.delivered
          });

          newlyDispatched.push({
            faculty: recipientName,
            email: recipientEmail,
            topic: ev.topic || ev.chapter,
            batch: ev.batchName || b.name,
            diffMinutes,
            leadMinutes,
            delivered: dispatchRes.delivered,
            via: dispatchRes.via,
            note: dispatchRes.note || dispatchRes.error
          });

          console.log(`[Reminder Engine] 📧 Dispatched reminder to ${recipientName} (${recipientEmail}) for "${ev.topic || ev.chapter}" (starts in ${diffMinutes}m) [via: ${dispatchRes.via || 'Portal Alert'}]`);
        }
      }
    }

    if (newlyDispatched.length > 0) {
      writeSentReminders(sentMap);
      writeNotifications(notifications);
      this.lastDispatched.unshift(...newlyDispatched);
    }

    this.scanStats = {
      totalEvents: scannedTotal,
      upcomingEvents: upcomingCount,
      sentCount: Object.keys(sentMap).length
    };

    return {
      ok: true,
      scannedTotal,
      upcomingCount,
      dispatchedCount: newlyDispatched.length,
      dispatched: newlyDispatched
    };
  }
}

const reminderEngine = new AutomatedReminderEngine();

const HASHES_FILE = path.join(ROOT, 'data_sheet_hashes.json');

function readSheetHashes() {
  try {
    if (fs.existsSync(HASHES_FILE)) {
      return JSON.parse(fs.readFileSync(HASHES_FILE, 'utf-8')) || {};
    }
  } catch (_) {}
  return {};
}

function writeSheetHashes(map) {
  try {
    fs.writeFileSync(HASHES_FILE, JSON.stringify(map, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Sheet Sync Engine] Failed to save hashes:', err.message);
  }
}

class SheetSyncEngine {
  constructor() {
    this.intervalId = null;
    this.isSyncing = false;
    this.hashes = readSheetHashes();
    this.lastSyncTime = null;
    this.lastChangeTime = null;
    this.syncHistory = [];
    this.stats = {
      totalChecks: 0,
      totalChangesDetected: 0,
      lastStatus: 'idle'
    };
  }

  getStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      lastChangeTime: this.lastChangeTime,
      hashes: this.hashes,
      stats: this.stats,
      history: this.syncHistory.slice(0, 10)
    };
  }

  async syncAll(force = false) {
    if (this.isSyncing) return { inProgress: true };
    this.isSyncing = true;
    this.stats.lastStatus = 'syncing';
    this.stats.totalChecks++;

    const changedBatches = [];
    let batches = [];
    try {
      if (fs.existsSync(BATCHES_JSON_FILE)) {
        batches = JSON.parse(fs.readFileSync(BATCHES_JSON_FILE, 'utf-8')) || [];
      }
    } catch (err) {
      this.isSyncing = false;
      return { ok: false, error: 'Could not read batches file' };
    }

    if (!Array.isArray(batches) || batches.length === 0) {
      this.isSyncing = false;
      this.stats.lastStatus = 'idle';
      return { ok: true, changedCount: 0 };
    }

    let sheetConnectorModule = null;
    try {
      sheetConnectorModule = await import('./js/sheetConnector.js');
    } catch (err) {
      console.error('[Sheet Sync Engine] Failed to import sheetConnector.js:', err.message);
      this.isSyncing = false;
      return { ok: false, error: err.message };
    }

    const { processRawCSVToBatch } = sheetConnectorModule;

    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      if (!b.sourceUrl || !b.sourceUrl.includes('/spreadsheets/d/')) continue;

      const tabName = b.sheetTabName || 'Lecture Planner';
      try {
        const csv = await fetchSheetRaw(b.sourceUrl, tabName);
        if (!csv || csv.trim().length < 50) continue;

        const currentHash = computeHash(csv);
        const stored = this.hashes[b.id] || {};
        const previousHash = stored.hash;

        this.hashes[b.id] = {
          hash: currentHash,
          lastChecked: new Date().toISOString(),
          lastChanged: (currentHash !== previousHash) ? new Date().toISOString() : (stored.lastChanged || new Date().toISOString()),
          batchName: b.name,
          tabName: tabName,
          eventCount: b.eventCount
        };

        if (force || currentHash !== previousHash) {
          console.log(`[Sheet Sync Engine] 🔄 Detected update for batch "${b.name}" (${b.id}) [Hash: ${currentHash.substring(0, 8)}]`);
          
          const processed = processRawCSVToBatch(csv, b.id, b.sourceUrl, tabName, b.name);
          
          // Preserve batch flags and custom overrides
          processed.active = b.active !== false;
          processed.fromRegistry = Boolean(b.fromRegistry);
          if (b.publishedAt) processed.publishedAt = b.publishedAt;

          // Merge local event status if sheet status is blank
          if (Array.isArray(b.events) && Array.isArray(processed.events)) {
            const oldMap = new Map();
            b.events.forEach(ev => { if (ev.id) oldMap.set(ev.id, ev); });
            processed.events.forEach(ev => {
              const old = oldMap.get(ev.id);
              if (old && !ev.sheetStatus && old.sheetStatus) {
                ev.sheetStatus = old.sheetStatus;
                ev.isConducted = old.isConducted;
                ev.isCancelled = old.isCancelled;
                ev.isRescheduled = old.isRescheduled;
                ev.rescheduledDate = old.rescheduledDate;
                ev.rescheduledTime = old.rescheduledTime;
                ev.rescheduledDuration = old.rescheduledDuration;
                ev.statusUpdatedAt = old.statusUpdatedAt;
              }
            });
          }

          batches[i] = processed;
          this.hashes[b.id].eventCount = processed.eventCount;
          changedBatches.push(processed);
        }
      } catch (err) {
        // Individual sheet fetch issue (e.g. transient network or missing tab)
      }
    }

    this.lastSyncTime = new Date().toISOString();
    writeSheetHashes(this.hashes);

    if (changedBatches.length > 0) {
      this.lastChangeTime = new Date().toISOString();
      this.stats.totalChangesDetected += changedBatches.length;

      // Save updated batches to data_batches.json
      try {
        fs.writeFileSync(BATCHES_JSON_FILE, JSON.stringify(batches, null, 2), 'utf-8');
        console.log(`[Sheet Sync Engine] ✅ Successfully synchronized ${changedBatches.length} batch(es) to ${BATCHES_JSON_FILE}`);
      } catch (err) {
        console.error('[Sheet Sync Engine] Failed to write data_batches.json:', err.message);
      }

      // Also update defaultData.js for default batches
      try {
        const defaultBatchIds = ['batch-prarambh-2026', 'batch-sushruta-2026', 'batch-inicet-essentials-2026', 'batch-fmge-express-2026'];
        const newDefaults = batches.filter(b => defaultBatchIds.includes(b.id));
        if (newDefaults.length > 0) {
          const defaultDataPath = path.join(ROOT, 'js', 'defaultData.js');
          const fileContent = `export const DEFAULT_BATCHES = ${JSON.stringify(newDefaults, null, 2)};\n`;
          fs.writeFileSync(defaultDataPath, fileContent, 'utf-8');
        }
      } catch (_) {}

      // Add system notification
      try {
        const notifs = readNotifications();
        const batchNames = changedBatches.map(b => b.name).join(', ');
        notifs.unshift({
          id: `sync_${Date.now()}`,
          type: 'sheet_synced',
          title: 'Sheet Data Auto-Synchronized',
          message: `Live data refreshed for: ${batchNames}`,
          timestamp: new Date().toISOString(),
          read: false
        });
        writeNotifications(notifs);
      } catch (_) {}

      // Trigger immediate scan in reminder engine so upcoming events get timely emails
      try {
        if (reminderEngine && typeof reminderEngine.checkUpcomingClasses === 'function') {
          reminderEngine.checkUpcomingClasses(false).catch(() => {});
        }
      } catch (_) {}

      this.syncHistory.unshift({
        time: this.lastChangeTime,
        changedBatches: changedBatches.map(b => ({ id: b.id, name: b.name, events: b.eventCount }))
      });
      if (this.syncHistory.length > 50) this.syncHistory.pop();
    }

    this.isSyncing = false;
    this.stats.lastStatus = 'idle';
    return {
      ok: true,
      changedCount: changedBatches.length,
      changed: changedBatches.map(b => ({ id: b.id, name: b.name, events: b.eventCount }))
    };
  }

  start(intervalMs = 30000) {
    if (this.intervalId) clearInterval(this.intervalId);
    console.log(`[Sheet Sync Engine] 🚀 Auto-sync active (polling every ${Math.round(intervalMs / 1000)}s)`);
    // Run an initial sync check
    setTimeout(() => {
      this.syncAll(false).catch(err => {
        console.error('[Sheet Sync Engine] Initial sync error:', err.message);
      });
    }, 2000);

    this.intervalId = setInterval(() => {
      this.syncAll(false).catch(err => {
        console.error('[Sheet Sync Engine] Interval sync error:', err.message);
      });
    }, intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

const sheetSyncEngine = new SheetSyncEngine();

function handleSheetsWebhookApi(req, res) {
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        console.log(`[Sheet Webhook] 🔔 Received webhook trigger from Google Sheets:`, payload.sheetName || payload.sheetId || 'Spreadsheet edit');
        // Trigger immediate sync
        const result = await sheetSyncEngine.syncAll(true);
        return json(res, 200, { success: true, message: 'Sync executed via webhook', result });
      } catch (err) {
        return json(res, 400, { success: false, error: err.message });
      }
    });
    return;
  }
  return json(res, 405, { error: 'Method not allowed' });
}

async function handleSheetsSyncNowApi(req, res) {
  try {
    const result = await sheetSyncEngine.syncAll(true);
    return json(res, 200, { success: true, result });
  } catch (err) {
    return json(res, 500, { success: false, error: err.message });
  }
}

function handleSheetsSyncStatusApi(req, res) {
  return json(res, 200, { success: true, status: sheetSyncEngine.getStatus() });
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
        const senderName = data.name || data.senderName || 'PW MedEd Class Reminder';
        const scriptUrl = (data.scriptUrl || data.endpoint || '').trim();
        const token = (data.token || 'pw-meded-token-2026').trim();

        if (!to) return json(res, 400, { error: 'Recipient email is required' });

        const result = await sendEmailInternal({
          to,
          recipientName: data.recipientName || '',
          subject,
          html,
          senderName,
          senderEmail,
          scriptUrl,
          token
        });

        return json(res, result.success ? 200 : 502, result);
      } catch (err) {
        return json(res, 400, { error: err.message });
      }
    });
    return;
  }
  return json(res, 405, { error: 'Method not allowed' });
}

function handleRemindersStatusApi(req, res) {
  return json(res, 200, {
    success: true,
    engine: reminderEngine.getStatus()
  });
}

async function handleRemindersCheckNowApi(req, res) {
  try {
    const result = await reminderEngine.checkUpcomingClasses(true);
    return json(res, 200, { success: true, result });
  } catch (err) {
    return json(res, 500, { success: false, error: err.message });
  }
}

function handleSentRemindersApi(req, res) {
  if (req.method === 'GET') {
    return json(res, 200, { success: true, sent: readSentReminders() });
  }
  return json(res, 405, { error: 'Method not allowed' });
}

function handleNotificationsApi(req, res, pathname) {
  if (req.method === 'GET') {
    const list = readNotifications();
    return json(res, 200, { success: true, notifications: list });
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        const list = readNotifications();
        if (Array.isArray(data.notifications)) {
          list.unshift(...data.notifications);
        } else if (data.notification) {
          list.unshift(data.notification);
        } else if (data.markAllRead) {
          list.forEach(n => { n.read = true; });
        }
        writeNotifications(list);
        return json(res, 200, { success: true, count: list.length });
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
  if (pathname.startsWith('/api/reminders/status')) return handleRemindersStatusApi(req, res);
  if (pathname.startsWith('/api/reminders/check-now')) return handleRemindersCheckNowApi(req, res);
  if (pathname.startsWith('/api/sent-reminders')) return handleSentRemindersApi(req, res);
  if (pathname.startsWith('/api/notifications')) return handleNotificationsApi(req, res, pathname);
  if (pathname.startsWith('/api/whatsapp')) return handleWhatsAppApi(req, res, pathname);
  if (pathname.startsWith('/api/sheets/webhook')) return handleSheetsWebhookApi(req, res);
  if (pathname.startsWith('/api/sheets/sync-now')) return handleSheetsSyncNowApi(req, res);
  if (pathname.startsWith('/api/sheets/sync-status')) return handleSheetsSyncStatusApi(req, res);
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  PW MedEd server running on port ${PORT}\n`);
  console.log(`  Admin     http://localhost:${PORT}/admin`);
  console.log(`  Faculty   http://localhost:${PORT}/faculty`);
  console.log(`  Week      http://localhost:${PORT}/week`);
  console.log(`  Timeline  http://localhost:${PORT}/timeline`);
  console.log(`  Requests  http://localhost:${PORT}/requests`);
  console.log(`  Login     http://localhost:${PORT}/login`);
  console.log(`\n  WhatsApp Gateway & Sheets proxy active on /api/*`);
  console.log(`  Ctrl+C to stop\n`);

  // Start Server-Side Automated Reminder Engine (checks calendar every 30s)
  reminderEngine.start(30000);

  // Start Server-Side Sheet Auto-Sync Engine (checks sheets every 30s)
  sheetSyncEngine.start(30000);
});

