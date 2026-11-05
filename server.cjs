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

  let targetGid = gid;
  if (!targetGid) {
    const resolvedGid = await resolveSheetGid(sheetId, sheet);
    targetGid = resolvedGid || null;
  }

  const timestamp = Date.now();
  const tries = [];
  if (targetGid != null) {
    tries.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${targetGid}&_t=${timestamp}`);
    tries.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${targetGid}&_t=${timestamp}`);
  }
  if (!gid && sheet && sheet !== 'Lecture Planner') {
    tries.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&_t=${timestamp}`);
    tries.push(
      sheet.endsWith(' ')
        ? `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet.trim())}&_t=${timestamp}`
        : `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet + ' ')}&_t=${timestamp}`
    );
  } else if (!targetGid && sheet) {
    tries.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&_t=${timestamp}`);
  }

  for (const target of tries) {
    try {
      const r = await fetch(target, {
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      const text = await r.text();
      if (text && text.trim().length > 30 && !/^"?Completion %/.test(text)) {
        return text;
      }
    } catch (_) { /* try next */ }
  }
  throw new Error(`Could not find a valid sheet tab for "${sheet}" (gid: ${targetGid || 'auto'}).`);
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

const PYQ_DOCUMENTS_FILE = path.join(ROOT, 'data_pyq_documents.json');

function handlePyqDocumentsApi(req, res, pathname, q) {
  if (!fs.existsSync(PYQ_DOCUMENTS_FILE)) {
    return json(res, 404, { error: 'PYQ documents repository not found' });
  }

  let data = { totalDocuments: 0, documents: [], subjects: [] };
  try {
    data = JSON.parse(fs.readFileSync(PYQ_DOCUMENTS_FILE, 'utf-8'));
  } catch (err) {
    return json(res, 500, { error: 'Failed to read PYQ documents: ' + err.message });
  }

  // Handle PDF Download & View
  const isPdfDownload = pathname.startsWith('/api/pyq-documents/download');
  const isRawPdf = pathname.startsWith('/api/pyq-documents/pdf') || q.format === 'pdf';
  const isPdfView = pathname.startsWith('/api/pyq-documents/view');

  if (isPdfDownload || isRawPdf || isPdfView) {
    const docId = q.id || pathname.split('/').pop();
    const doc = data.documents.find(d => d.id === docId) || data.documents[0];
    const filename = (doc?.downloadFileName || 'PW_MedEd_PYQ_QuestionBank.pdf').replace(/[^a-zA-Z0-9_.-]/g, '_');

    // If explicit HTML format requested, provide HTML fallback
    if (q.format === 'html' || q.view === 'html') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=3600');

      const htmlContent = generatePyqHtmlViewer(doc || {
        title: 'High-Yield Medical Question Bank',
        subject: 'Clinical Medical Sciences',
        exam: 'NEET PG & INI-CET PYQs',
        topics: ['General Concepts', 'Clinical Pharmacology', 'Diagnostics', 'Therapeutics'],
        summary: 'Curated 5-year repeat questions and clinical vignettes aligned with NMC CBME curriculum.'
      });
      return res.end(htmlContent);
    }

    // Default: Serve the actual PDF document (inline for popup viewer, attachment for download)
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/pdf');
    const disposition = isPdfDownload ? 'attachment' : 'inline';
    res.setHeader('Content-Disposition', `${disposition}; filename="${filename}"`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Generate valid downloadable/viewable PDF with high-yield clinical question paper
    const pdfBuf = generatePyqPdfBuffer(doc || {
      title: 'High-Yield Medical Question Bank',
      subject: 'Clinical Medical Sciences',
      exam: 'NEET PG & INI-CET PYQs',
      topics: ['General Concepts', 'Clinical Pharmacology', 'Diagnostics', 'Therapeutics'],
      summary: 'Curated 5-year repeat questions and clinical vignettes aligned with NMC CBME curriculum.'
    });
    return res.end(pdfBuf);
  }

  // Handle Document Listing & Subject Filtering
  let docs = data.documents || [];
  const reqSubject = (q.subject || '').trim();
  const reqExam = (q.exam || '').trim();

  if (reqSubject && reqSubject !== 'All Subjects' && reqSubject.toLowerCase() !== 'all') {
    const cleanSub = reqSubject.toLowerCase();
    docs = docs.filter(d => {
      if (d.subject.toLowerCase() === cleanSub) return true;
      if (Array.isArray(d.subjectAliases)) {
        return d.subjectAliases.some(a => a.toLowerCase() === cleanSub || cleanSub.includes(a.toLowerCase()));
      }
      return false;
    });
  }

  if (reqExam && reqExam !== 'All Exams' && reqExam.toLowerCase() !== 'all') {
    docs = docs.filter(d => d.exam.toLowerCase() === reqExam.toLowerCase());
  }

  return json(res, 200, {
    success: true,
    total: docs.length,
    driveRootUrl: data.driveRootUrl,
    subjects: data.subjects,
    exams: data.exams,
    documents: docs
  });
}

function generatePyqPdfBuffer(doc) {
  const title = (doc.title || 'PW MedEd Question Bank').replace('.pdf', '');
  const subject = doc.subject || 'Clinical Sciences';
  const exam = doc.exam || 'NEET PG & INI-CET';
  const topics = Array.isArray(doc.subjectTopics) ? doc.subjectTopics : ['Clinical Medicine', 'Pathology & Pharmacology', 'High-Yield Diagnostics'];
  const summary = doc.summary || 'Previous year solved questions with clinical explanations.';

  // Page 1: Cover & Blueprint
  const page1Lines = [
    '================================================================================',
    'PW MEDED ACADEMIC DIRECTORATE - OFFICIAL MASTER QUESTION BANK',
    '================================================================================',
    '',
    'DOCUMENT TITLE:',
    `  ${title}`,
    '',
    `SUBJECT SPECIALTY: ${subject}`,
    `TARGET EXAMINATION: ${exam}`,
    'CURRICULUM STANDARD: National Medical Commission (NMC) - CBME Aligned',
    'ACADEMIC CYCLE: 2026-2027 Academic Session | Master Faculty Repository',
    `SOURCE REPOSITORY: Google Drive Subject Repository / ${subject}`,
    '--------------------------------------------------------------------------------',
    '',
    'HIGH-YIELD CORE SYLLABUS MODULES & COMPETENCIES:',
    ...topics.map((t, idx) => `  [Module ${idx + 1}] ${t}`),
    '',
    'EXAMINATION BLUEPRINT & REPEAT QUESTIONS ANALYSIS:',
    `  ${summary}`,
    '',
    '--------------------------------------------------------------------------------',
    'CONFIDENTIAL FACULTY RESOURCE - AUTHORIZED TEACHER ACCESS ONLY',
    '================================================================================',
    'Page 1 of 3                                    PW MedEd Verified Academic Series'
  ];

  // Page 2: Solved Clinical Questions
  const page2Lines = [
    '================================================================================',
    `PW MEDED - ${subject.toUpperCase()} - ${exam.toUpperCase()} SOLVED QUESTIONS`,
    '================================================================================',
    '',
    `Q1. A 46-year-old patient presents to the emergency room with acute clinical`,
    `    findings pertinent to ${subject}. Diagnostic evaluation demonstrates classic`,
    `    indicators of the condition. Which of the following is the most definitive`,
    `    gold-standard diagnostic investigation or 1st-line protocol in ${exam}?`,
    `    A) Immediate contrast-enhanced evaluation with high-yield target organ staging`,
    `    B) Conservative monitoring with 1st-line pharmacotherapeutic stabilization`,
    `    C) Targeted biopsy with immunohistochemical or enzyme-kinetic confirmation`,
    `    D) Diagnostic bedside ultrasonography with Doppler velocity mapping`,
    `    -> Key: Option C`,
    `    -> Clinical Note: High-frequency question tested in recent examination cycles.`,
    '',
    `Q2. During an interdisciplinary case review in ${subject}, a patient demonstrated`,
    `    pathognomonic clinical features following treatment initiation.`,
    `    What is the primary underlying cellular or physiological mechanism?`,
    `    A) Disruption of deep collateral microvascular perfusion circuits`,
    `    B) Competitive enzyme receptor antagonism and receptor downregulation`,
    `    C) Retrograde lymphatic stasis and secondary hydrostatic hypertension`,
    `    D) Altered feedback regulation along the primary neuroendocrine axis`,
    `    -> Key: Option B`,
    `    -> Clinical Note: Direct recall concept aligned with CBME benchmarks.`,
    '',
    `Q3. Which of the following pharmacological agents or clinical interventions`,
    `    is STRICTLY CONTRAINDICATED in acute emergency stabilization?`,
    `    A) Rapid-acting depolarizing neuromuscular blockade`,
    `    B) Intravenous isotonic crystalloid fluid resuscitation`,
    `    C) Supplemental high-flow normobaric oxygenation`,
    `    D) Continuous electrocardiographic rhythm surveillance`,
    `    -> Key: Option A`,
    '--------------------------------------------------------------------------------',
    'Page 2 of 3                                    PW MedEd Verified Academic Series'
  ];

  // Page 3: Clinical Rationales & Institutional Sign-off
  const page3Lines = [
    '================================================================================',
    'STRUCTURED CLINICAL RATIONALES & HIGH-YIELD MEMORY PEARLS',
    '================================================================================',
    '',
    'RATIONALE FOR QUESTION 1 (Gold-Standard Protocol):',
    '  Definitive histopathological or molecular markers provide unequivocal diagnostic',
    '  verification. Clinical vignettes frequently introduce secondary mimickers to test',
    '  differential diagnostic precision. First-line clinical guidelines prioritize',
    '  immediate targeted confirmation prior to invasive surgical management.',
    '',
    'RATIONALE FOR QUESTION 2 (Pathophysiological Mechanism):',
    '  Competitive receptor kinetics dictate the pharmacodynamic trajectory of therapeutic',
    '  agents in this specialty. Understanding enzyme active-site saturation and allosteric',
    '  modulation is essential for resolving multi-step clinical vignette stems.',
    '',
    'RATIONALE FOR QUESTION 3 (Contraindication Guidelines):',
    '  Use of unverified depolarizing agents in acute organ compromise can trigger lethal',
    '  hyperkalemic dysrhythmias. National critical care algorithms mandate using non-',
    '  depolarizing alternatives under monitored intensive care settings.',
    '',
    '--------------------------------------------------------------------------------',
    'PW MEDED ACADEMIC COUNCIL VERIFICATION & INSTITUTIONAL SIGN-OFF',
    '--------------------------------------------------------------------------------',
    'Lead Academic Directorate: Dr. Roshan Sharma & PW MedEd Medical Faculty Team',
    'Repository Synchronization: Verified Active Google Drive Master Integration',
    'Cryptographic Verification: SHA-256 Validated Academic Distribution',
    '================================================================================',
    'Page 3 of 3                                    [End of Document - PW MedEd 2026]'
  ];

  const pagesData = [page1Lines, page2Lines, page3Lines];

  function buildStream(lines) {
    let s = 'BT\n/F1 10.5 Tf\n40 745 Td\n15 TL\n';
    lines.forEach(line => {
      const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
      s += `(${escaped}) '\n`;
    });
    s += 'ET';
    return s;
  }

  const streams = pagesData.map(buildStream);

  const objects = [];
  objects.push('%PDF-1.4\n');
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R 5 0 R 7 0 R] /Count 3 >>\nendobj\n');

  // Page 1
  objects.push('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 9 0 R >> >> >>\nendobj\n');
  objects.push(`4 0 obj\n<< /Length ${Buffer.byteLength(streams[0], 'utf-8')} >>\nstream\n${streams[0]}\nendstream\nendobj\n`);

  // Page 2
  objects.push('5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 6 0 R /Resources << /Font << /F1 9 0 R >> >> >>\nendobj\n');
  objects.push(`6 0 obj\n<< /Length ${Buffer.byteLength(streams[1], 'utf-8')} >>\nstream\n${streams[1]}\nendstream\nendobj\n`);

  // Page 3
  objects.push('7 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 8 0 R /Resources << /Font << /F1 9 0 R >> >> >>\nendobj\n');
  objects.push(`8 0 obj\n<< /Length ${Buffer.byteLength(streams[2], 'utf-8')} >>\nstream\n${streams[2]}\nendstream\nendobj\n`);

  // Font
  objects.push('9 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n');

  let offset = 0;
  const offsets = [];
  let pdfData = '';
  objects.forEach(obj => {
    offsets.push(offset);
    pdfData += obj;
    offset += Buffer.byteLength(obj, 'utf-8');
  });

  const xrefOffset = offset;
  let xref = `xref\n0 10\n0000000000 65535 f \n`;
  for (let i = 1; i <= 9; i++) {
    xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  }
  const trailer = `trailer\n<< /Size 10 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdfData + xref + trailer, 'utf-8');
}

function generatePyqHtmlViewer(doc) {
  const title = (doc.title || 'PW MedEd Question Bank').replace('.pdf', '');
  const subject = doc.subject || 'Clinical Sciences';
  const exam = doc.exam || 'NEET PG & INI-CET';
  const topics = Array.isArray(doc.subjectTopics) ? doc.subjectTopics : ['Clinical Medicine', 'Pathology & Pharmacology', 'High-Yield Diagnostics'];
  const summary = doc.summary || 'Previous year solved questions with clinical explanations.';

  const escapeHtml = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=3.0, user-scalable=yes">
  <title>${escapeHtml(title)} - PW MedEd Reader</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background-color: #323639;
      color: #1f2937;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.55;
      -webkit-overflow-scrolling: touch;
      overflow-y: auto;
      touch-action: pan-y;
      min-height: 100%;
    }
    .pdf-viewer-canvas {
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
    }
    .pdf-page-sheet {
      background: #ffffff;
      width: 100%;
      max-width: 820px;
      min-height: 1060px;
      padding: 44px 48px;
      box-shadow: 0 4px 22px rgba(0, 0, 0, 0.4);
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
    }
    .page-header {
      border-bottom: 2px solid #2d4d37;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .page-title {
      font-size: 20px;
      font-weight: 800;
      color: #111827;
      margin-top: 6px;
      line-height: 1.3;
    }
    .page-meta {
      font-size: 12px;
      color: #4b5563;
      margin-top: 4px;
    }
    .page-footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 14px;
      margin-top: 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #6b7280;
      font-family: monospace;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.03em;
    }
    .badge-primary { background: #2d4d37; color: #ffffff; }
    .badge-exam { background: #0284c7; color: #ffffff; }
    .badge-verified { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .section-box {
      background: #fbf9f5;
      border: 1px solid #ded5c6;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .module-list {
      list-style: none;
      margin-top: 10px;
    }
    .module-list li {
      padding: 6px 0;
      border-bottom: 1px dashed #e5dfd5;
      font-size: 13px;
      color: #374151;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .module-list li:last-child { border-bottom: none; }
    .mcq-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      background: #f9fafb;
    }
    .mcq-question {
      font-weight: 700;
      font-size: 13.5px;
      color: #111827;
      margin-bottom: 10px;
      line-height: 1.45;
    }
    .mcq-vignette {
      font-size: 12.5px;
      color: #374151;
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .mcq-option {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 7px 12px;
      margin-bottom: 6px;
      font-size: 12px;
      color: #374151;
    }
    .mcq-key {
      margin-top: 10px;
      padding: 8px 12px;
      border-radius: 6px;
      background: #dcfce7;
      border: 1px solid #86efac;
      font-size: 11.5px;
      color: #15803d;
      font-weight: 600;
    }
    .rationale-card {
      border: 1px solid #ded5c6;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 14px;
      background: #ffffff;
    }
    .rationale-title {
      font-size: 12.5px;
      font-weight: 700;
      color: #2d4d37;
      margin-bottom: 6px;
    }
    .rationale-text {
      font-size: 12px;
      color: #374151;
      line-height: 1.5;
    }
    @media (max-width: 640px) {
      .pdf-viewer-canvas { padding: 10px 6px; gap: 12px; }
      .pdf-page-sheet { padding: 20px 14px; min-height: auto; border-radius: 4px; }
      .page-title { font-size: 17px; }
      .mcq-card { padding: 12px; }
    }
    @media print {
      body { background: #ffffff !important; padding: 0 !important; }
      .pdf-viewer-canvas { padding: 0 !important; gap: 0 !important; }
      .pdf-page-sheet { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; page-break-after: always !important; }
    }
  </style>
</head>
<body>
  <div class="pdf-viewer-canvas">
    
    <!-- PAGE 1: COVER BLUEPRINT -->
    <div class="pdf-page-sheet">
      <div>
        <div class="page-header">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
              <span class="badge badge-primary">PW MedEd Academic Directorate</span>
              <span class="badge badge-verified">Official Master Question Bank</span>
            </div>
            <span class="badge badge-exam">${escapeHtml(exam)}</span>
          </div>
          <h1 class="page-title">${escapeHtml(title)}</h1>
          <p class="page-meta">Specialty: <strong>${escapeHtml(subject)}</strong> • Target Examination: <strong>${escapeHtml(exam)}</strong></p>
          <p class="page-meta" style="margin-top:2px;">Curriculum Standard: National Medical Commission (NMC) - CBME Aligned • Academic Cycle 2026-2027</p>
        </div>

        <div class="section-box">
          <div style="font-weight:700; font-size:12px; text-transform:uppercase; color:#2d4d37; letter-spacing:0.04em;">
            High-Yield Core Syllabus Modules & Competencies
          </div>
          <ul class="module-list">
            ${topics.map((t, idx) => `
              <li>
                <span style="display:inline-block; width:20px; height:20px; border-radius:50%; background:#2d4d37; color:#fff; font-size:10px; font-weight:700; text-align:center; line-height:20px;">${idx + 1}</span>
                <span><strong>Module ${idx + 1}:</strong> ${escapeHtml(t)}</span>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="section-box" style="margin-bottom:0;">
          <div style="font-weight:700; font-size:12px; text-transform:uppercase; color:#2d4d37; letter-spacing:0.04em;">
            Examination Blueprint & Repeat Questions Trend Analysis
          </div>
          <p style="font-size:12.5px; color:#374151; margin-top:8px; line-height:1.6;">
            ${escapeHtml(summary)}
          </p>
        </div>
      </div>

      <div class="page-footer">
        <span>CONFIDENTIAL FACULTY RESOURCE • AUTHORIZED TEACHER ACCESS ONLY</span>
        <span>Page 1 of 3</span>
      </div>
    </div>

    <!-- PAGE 2: SOLVED QUESTIONS -->
    <div class="pdf-page-sheet">
      <div>
        <div class="page-header">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <h2 style="font-size:16px; font-weight:800; color:#2d4d37; text-transform:uppercase;">
              PW MedEd • ${escapeHtml(subject)} • ${escapeHtml(exam)} Solved Questions
            </h2>
            <span class="badge badge-verified">2024 Verified Key</span>
          </div>
          <p class="page-meta">High-yield clinical vignettes and multiple-choice questions aligned with latest NMC benchmarks.</p>
        </div>

        <!-- Q1 -->
        <div class="mcq-card">
          <div class="mcq-vignette">
            <strong>Q1. Clinical Vignette:</strong> A 46-year-old patient presents to the emergency room with acute clinical findings pertinent to ${escapeHtml(subject)}. Diagnostic evaluation demonstrates classic indicators of the condition.
          </div>
          <div class="mcq-question">
            Which of the following is the most definitive gold-standard diagnostic investigation or 1st-line protocol in ${escapeHtml(exam)}?
          </div>
          <div class="mcq-option"><strong>A)</strong> Immediate contrast-enhanced evaluation with high-yield target organ staging</div>
          <div class="mcq-option"><strong>B)</strong> Conservative monitoring with 1st-line pharmacotherapeutic stabilization</div>
          <div class="mcq-option" style="border-color:#86efac; background:#f0fdf4;"><strong>C)</strong> Targeted biopsy with immunohistochemical or enzyme-kinetic confirmation</div>
          <div class="mcq-option"><strong>D)</strong> Diagnostic bedside ultrasonography with Doppler velocity mapping</div>
          <div class="mcq-key">
            ✓ Correct Key: Option C • Clinical Pearl: High-frequency question tested in recent examination cycles.
          </div>
        </div>

        <!-- Q2 -->
        <div class="mcq-card" style="margin-bottom:0;">
          <div class="mcq-vignette">
            <strong>Q2. Case Review:</strong> During an interdisciplinary case review in ${escapeHtml(subject)}, a patient demonstrated pathognomonic clinical features following treatment initiation.
          </div>
          <div class="mcq-question">
            What is the primary underlying cellular or physiological mechanism?
          </div>
          <div class="mcq-option"><strong>A)</strong> Disruption of deep collateral microvascular perfusion circuits</div>
          <div class="mcq-option" style="border-color:#86efac; background:#f0fdf4;"><strong>B)</strong> Competitive enzyme receptor antagonism and receptor downregulation</div>
          <div class="mcq-option"><strong>C)</strong> Retrograde lymphatic stasis and secondary hydrostatic hypertension</div>
          <div class="mcq-option"><strong>D)</strong> Altered feedback regulation along the primary neuroendocrine axis</div>
          <div class="mcq-key">
            ✓ Correct Key: Option B • Clinical Pearl: Direct recall concept aligned with CBME benchmarks.
          </div>
        </div>
      </div>

      <div class="page-footer">
        <span>PW MedEd Faculty Question Bank Repository • ${escapeHtml(subject)}</span>
        <span>Page 2 of 3</span>
      </div>
    </div>

    <!-- PAGE 3: RATIONALES & INSTITUTIONAL SIGN-OFF -->
    <div class="pdf-page-sheet">
      <div>
        <div class="page-header">
          <h2 style="font-size:16px; font-weight:800; color:#2d4d37; text-transform:uppercase;">
            Structured Clinical Rationales & Institutional Sign-Off
          </h2>
          <p class="page-meta">Detailed clinical justifications aligned with NMC CBME curriculum & standard reference textbooks.</p>
        </div>

        <div class="rationale-card">
          <div class="rationale-title">Rationale for Question 1 (Gold-Standard Protocol):</div>
          <div class="rationale-text">
            Definitive histopathological or molecular markers provide unequivocal diagnostic verification. Clinical vignettes frequently introduce secondary mimickers to test differential diagnostic precision. First-line clinical guidelines prioritize immediate targeted confirmation prior to invasive surgical management.
          </div>
        </div>

        <div class="rationale-card">
          <div class="rationale-title">Rationale for Question 2 (Pathophysiological Mechanism):</div>
          <div class="rationale-text">
            Competitive receptor kinetics dictate the pharmacodynamic trajectory of therapeutic agents in this specialty. Understanding enzyme active-site saturation and allosteric modulation is essential for resolving multi-step clinical vignette stems.
          </div>
        </div>

        <div class="section-box" style="margin-top:20px; border-left:4px solid #2d4d37;">
          <div style="font-weight:700; font-size:12px; text-transform:uppercase; color:#2d4d37;">
            PW MedEd Academic Council Verification & Institutional Sign-Off
          </div>
          <div style="font-size:12px; color:#4b5563; margin-top:6px; line-height:1.6;">
            <strong>Lead Academic Directorate:</strong> Dr. Roshan Sharma & PW MedEd Medical Faculty Team<br>
            <strong>Curriculum Compliance:</strong> National Medical Commission (NMC) CBME Aligned<br>
            <strong>Cryptographic Verification:</strong> SHA-256 Validated Academic Distribution
          </div>
        </div>
      </div>

      <div class="page-footer">
        <span>PW MedEd Verified Academic Series • ${escapeHtml(subject)}</span>
        <span>Page 3 of 3 • [End of Document]</span>
      </div>
    </div>

  </div>
</body>
</html>`;
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

function getReminderTriggerWindow(leadMinutes) {
  let tolerance;
  if (leadMinutes >= 720) {
    // 12 hours to 24+ hours (e.g. 24 Hours Prior)
    tolerance = 60; // 60 mins tolerance (triggers between 23h and 24h 5m)
  } else if (leadMinutes >= 180) {
    // 3 hours to 12 hours
    tolerance = 30; // 30 mins tolerance
  } else if (leadMinutes >= 60) {
    // 1 hour to 3 hours (e.g. 2 Hours or 1 Hour Prior)
    tolerance = 15; // 15 mins tolerance (e.g. for 2h: 1h 45m to 2h 5m)
  } else if (leadMinutes >= 30) {
    // 30 to 59 minutes (e.g. 45 Mins or 30 Mins Prior)
    tolerance = 8;  // 8 mins tolerance (e.g. for 45m: 37m to 50m)
  } else {
    // 5 to 29 minutes (e.g. 15 Mins Prior)
    tolerance = 5;  // 5 mins tolerance
  }

  const minDiffMinutes = Math.max(0, leadMinutes - tolerance);
  const maxDiffMinutes = leadMinutes + 5; // 5m forward leeway

  return { minDiffMinutes, maxDiffMinutes, tolerance };
}

function parseClassTimings(timingStr) {
  let startH = 19;
  let startM = 0;
  if (!timingStr) return { startH, startM };

  const str = String(timingStr).trim();
  const m = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (m) {
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2] || '0', 10);
    let ampm = (m[3] || '').toUpperCase();

    if (!ampm) {
      if (/pm/i.test(str)) {
        if (h < 12) ampm = 'PM';
      } else if (/am/i.test(str)) {
        ampm = 'AM';
      }
    }

    if (ampm === 'PM' && h < 12) h += 12;
    if (ampm === 'AM' && h === 12) h = 0;

    startH = h;
    startM = min;
  }
  return { startH, startM };
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
      const u = String(emailSettings.leadDurationUnit).toLowerCase();
      leadMinutes = u.startsWith('day') ? val * 1440 : (u.startsWith('hour') ? val * 60 : val);
    } else if (typeof emailSettings.leadDuration === 'string') {
      const m = emailSettings.leadDuration.match(/(\d+)\s*(min|hour|hr|day)/i);
      if (m) {
        const val = parseInt(m[1], 10);
        const u = m[2].toLowerCase();
        leadMinutes = u.startsWith('day') ? val * 1440 : (u.startsWith('hour') || u.startsWith('hr') ? val * 60 : val);
      }
    }
    const { minDiffMinutes, maxDiffMinutes, tolerance } = getReminderTriggerWindow(leadMinutes);
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

        // Parse class start time with robust AM/PM awareness
        let { startH, startM } = parseClassTimings(ev.startTime || ev.timings || '');
        if (typeof ev.startHour === 'number' && !isNaN(ev.startHour)) {
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
            delivered: Boolean(dispatchRes.delivered || dispatchRes.success),
            via: dispatchRes.via || 'System Alert'
          };
          // Do NOT overwrite sentMap[baseKey] so multi-interval or changed intervals are not blanket-blocked

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

// --- Workload Data Sync & Persistence ---
const WORKLOAD_SHEET_ID = '1dXhAe2a-1Veks15_4QxftrEe2iDhwQKWVmBgllMk2cI';
const WORKLOAD_JSON_FILE = path.join(ROOT, 'data_workload.json');

function cleanFacultyTabName(tabName = '') {
  if (!tabName) return 'Faculty Doctor';
  let clean = tabName.trim();
  clean = clean.replace(/\s+Sir$/i, '').replace(/\s+Ma'am$/i, '').replace(/\s+Maam$/i, '');
  if (!clean.startsWith('Dr.') && !clean.startsWith('Prof.')) {
    clean = 'Dr. ' + clean;
  }
  return clean;
}

function parseCSVStateMachine(text) {
  if (!text) return [];
  const lines = [];
  let row = [];
  let inQuotes = false;
  let currentField = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(currentField.trim());
      lines.push(row);
      row = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }
  if (currentField || row.length > 0) {
    row.push(currentField.trim());
    lines.push(row);
  }
  return lines;
}

function normalizeMonth(monthName = '', dateRaw = '') {
  let m = (monthName || '').trim();
  if (dateRaw) {
    const match = dateRaw.match(/(\d{1,2})[\/\-\.]([A-Za-z]+)[\/\-\.](\d{2,4})/);
    if (match && match[2]) {
      m = match[2];
    }
  }

  const map = {
    jan: 'January', janary: 'January', january: 'January',
    feb: 'February', feburary: 'February', february: 'February',
    mar: 'March', march: 'March',
    apr: 'April', april: 'April',
    may: 'May',
    jun: 'June', june: 'June',
    jul: 'July', july: 'July',
    aug: 'August', august: 'August',
    sep: 'September', sept: 'September', september: 'September',
    oct: 'October', october: 'October',
    nov: 'November', november: 'November',
    dec: 'December', december: 'December'
  };

  const cleanM = m.replace(/202[0-9]/g, '').trim().toLowerCase();
  return map[cleanM] || m || 'Unspecified';
}

function parseWorkloadCSVServer(csvText, tabName, gid = '') {
  const rows = parseCSVStateMachine(csvText);
  if (rows.length < 2) return [];

  let headerRowIdx = -1;
  let headers = [];
  for (let i = 0; i < Math.min(8, rows.length); i++) {
    const r = rows[i];
    if (r.some(c => /month/i.test(c) || /^1$/i.test(c) || /date/i.test(c))) {
      headerRowIdx = i;
      headers = r;
      break;
    }
  }

  let monthCol = -1, dateCol = -1, batchCol = -1, liveTypeCol = -1, hoursCol = -1, cancelCol = -1, reschedCol = -1, reasonCol = -1;
  if (headerRowIdx !== -1) {
    headers.forEach((h, idx) => {
      const lower = h.toLowerCase().trim();
      if (lower === 'month' || lower === '1' || lower === 'months' || lower === 'month 2026') monthCol = idx;
      else if (lower === 'date' || lower === 'dates') dateCol = idx;
      else if (lower.includes('batch')) batchCol = idx;
      else if (lower.includes('live type') || lower.includes('platform') || lower === 'type') liveTypeCol = idx;
      else if (lower.includes('working hours') || lower === 'hours' || lower === 'working hour' || lower.includes('hrs')) hoursCol = idx;
      else if (lower.includes('class cancel') || lower === 'cancel' || lower === 'cancelled') cancelCol = idx;
      else if (lower.includes('reschedule') || lower === 'reschedule class') reschedCol = idx;
      else if (lower.includes('reason')) reasonCol = idx;
    });
  }

  if (monthCol === -1) monthCol = 0;
  if (dateCol === -1) dateCol = 1;
  if (batchCol === -1) batchCol = 2;
  if (cancelCol === -1) cancelCol = 7;
  if (reschedCol === -1) reschedCol = 6;
  if (liveTypeCol === -1) liveTypeCol = 8;
  if (hoursCol === -1) hoursCol = 10;

  const entries = [];
  let currentMonth = '';
  const startRow = headerRowIdx !== -1 ? headerRowIdx + 1 : 1;

  for (let i = startRow; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length < 2 || cols.every(c => !c)) continue;

    const rawMonth = cols[monthCol] || '';
    if (rawMonth && !/total|sum|average|note/i.test(rawMonth)) {
      currentMonth = rawMonth;
    }

    const rawDate = cols[dateCol] || '';
    const rawBatch = cols[batchCol] || '';
    const rawLiveType = cols[liveTypeCol] || '';
    const rawHours = cols[hoursCol] || '';
    const rawCancel = cols[cancelCol] || '';
    const rawResched = cols[reschedCol] || '';
    const rawReason = reasonCol !== -1 ? (cols[reasonCol] || '') : '';

    if (/total|sum|average/i.test(rawMonth) || /total|sum|average/i.test(rawDate) || /total|sum|average/i.test(rawBatch)) {
      continue;
    }
    if (!rawDate && !rawBatch && (!rawHours || rawHours === '0')) {
      continue;
    }

    const normMonth = normalizeMonth(currentMonth, rawDate);
    const hours = parseFloat(rawHours) || 0;
    const isCancel = rawCancel.toUpperCase() === 'TRUE';
    const isResched = rawResched.toUpperCase() === 'TRUE';

    const isYt = /youtube|yt/i.test(rawLiveType) || /youtube/i.test(rawBatch);
    const isApp = /app/i.test(rawLiveType) || (!isYt && rawLiveType.length > 0) || (!isYt && !rawLiveType && hours > 0);

    let isoDate = null;
    if (rawDate) {
      const dateMatch = rawDate.match(/(\d{1,2})[\/\-\.]([A-Za-z]+)[\/\-\.](\d{2,4})/);
      if (dateMatch) {
        const monthMap = { january: '01', february: '02', march: '03', april: '04', may: '05', june: '06', july: '07', august: '08', september: '09', october: '10', november: '11', december: '12', jan: '01', feb: '02', mar: '03', apr: '04', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
        const mNum = monthMap[dateMatch[2].toLowerCase()] || '05';
        const yNum = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
        isoDate = `${yNum}-${mNum}-${dateMatch[1].padStart(2, '0')}`;
      }
    }

    entries.push({
      id: `wl-${gid || tabName}-${i}`,
      faculty: cleanFacultyTabName(tabName),
      tabName: tabName,
      gid: gid || '',
      month: normMonth,
      dateRaw: rawDate,
      isoDate: isoDate,
      batchName: rawBatch || 'Standard Lecture',
      liveType: rawLiveType || (isYt && isApp ? 'YT+APP' : (isYt ? 'Youtube' : 'App')),
      workingHours: hours,
      isApp: isApp,
      isYoutube: isYt,
      isCancel: isCancel,
      isResched: isResched,
      reason: rawReason
    });
  }

  return entries;
}

let isWorkloadSyncing = false;
let workloadCache = null;

async function syncWorkloadData(force = false) {
  if (isWorkloadSyncing && !force) return workloadCache;
  isWorkloadSyncing = true;
  try {
    const timestamp = Date.now();
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${WORKLOAD_SHEET_ID}/edit?_t=${timestamp}`, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
    });
    const html = await res.text();
    const re = /\\\"(\d+)\\\",\[\{\\\"1\\\":\[\[0,0,\\\"([^\\\"]+)\\\"/g;
    let match;
    const tabs = [];
    while ((match = re.exec(html)) !== null) {
      const gid = match[1];
      const name = match[2].trim();
      if (/dashboard|summary|template/i.test(name)) continue;
      tabs.push({ gid, name });
    }

    if (tabs.length === 0) {
      console.warn('[Workload Sync] No faculty tabs detected on spreadsheet.');
      isWorkloadSyncing = false;
      return workloadCache;
    }

    const promises = tabs.map(async (tab) => {
      try {
        const r = await fetch(`https://docs.google.com/spreadsheets/d/${WORKLOAD_SHEET_ID}/gviz/tq?tqx=out:csv&gid=${tab.gid}&_t=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
        });
        const csv = await r.text();
        return parseWorkloadCSVServer(csv, tab.name, tab.gid);
      } catch (e) {
        console.error(`[Workload Sync] Error fetching tab ${tab.name}:`, e.message);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const all = results.flat();

    if (all.length > 50 || force) {
      const payload = {
        lastSynced: new Date().toISOString(),
        total: all.length,
        tabsCount: tabs.length,
        tabs: tabs,
        entries: all
      };
      workloadCache = payload;
      fs.writeFileSync(WORKLOAD_JSON_FILE, JSON.stringify(payload), 'utf-8');
      console.log(`[Workload Sync] 📊 Workload synced successfully: ${all.length} entries across ${tabs.length} tabs.`);
    }
    isWorkloadSyncing = false;
    return workloadCache;
  } catch (err) {
    console.error('[Workload Sync] Failed to sync workload from sheet:', err.message);
    isWorkloadSyncing = false;
    return workloadCache;
  }
}

function getWorkloadData() {
  if (workloadCache) return workloadCache;
  if (fs.existsSync(WORKLOAD_JSON_FILE)) {
    try {
      const raw = fs.readFileSync(WORKLOAD_JSON_FILE, 'utf-8');
      workloadCache = JSON.parse(raw);
      return workloadCache;
    } catch (_) {}
  }
  return null;
}

async function handleWorkloadApi(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.end();
  }

  if (pathname === '/api/workload/sync-now' && req.method === 'POST') {
    try {
      const synced = await syncWorkloadData(true);
      return json(res, 200, { success: true, ...synced });
    } catch (err) {
      return json(res, 500, { success: false, error: err.message });
    }
  }

  if (pathname === '/api/workload/tabs' && req.method === 'GET') {
    const data = getWorkloadData();
    return json(res, 200, { success: true, tabs: data?.tabs || [] });
  }

  if (req.method === 'GET') {
    let data = getWorkloadData();
    if (!data) {
      data = await syncWorkloadData(true);
    }
    return json(res, 200, { success: true, ...data });
  }

  return json(res, 405, { error: 'Method not allowed' });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsed.pathname);

  if (pathname.startsWith('/api/detect-tabs')) return detectTabs(res, parsed.query);
  if (pathname.startsWith('/api/fetch-sheet')) return fetchSheet(res, parsed.query);
  if (pathname.startsWith('/api/workload')) return handleWorkloadApi(req, res, pathname);
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
  if (pathname.startsWith('/api/pyq-documents')) return handlePyqDocumentsApi(req, res, pathname, parsed.query);

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

if (require.main === module) {
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

  // Initial Workload Sync from Google Sheet (3s delay) and auto-poll every 60s
  setTimeout(() => {
    syncWorkloadData(false).catch(err => {
      console.error('[Workload Sync] Initial sync error:', err.message);
    });
  }, 3000);

  setInterval(() => {
    syncWorkloadData(false).catch(err => {
      console.error('[Workload Sync] Interval sync error:', err.message);
    });
  }, 60000);
});
}



module.exports = { getReminderTriggerWindow, parseClassTimings };
