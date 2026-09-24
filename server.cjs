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
  const sheetId = q.sheetId;
  if (!sheetId) return json(res, 400, { error: 'Missing sheetId', tabs: ['Lecture Planner'], recommendedTab: 'Lecture Planner' });
  try {
    const r = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
    const html = await r.text();
    const re = /docs-sheet-tab-caption">([^<]+)<\/div>/g;
    const tabs = [];
    let m;
    while ((m = re.exec(html)) !== null) tabs.push(m[1]);
    const recommended =
      tabs.find(t => /planner|lecture/i.test(t)) ||
      tabs.find(t => /schedule/i.test(t)) ||
      tabs[0] || 'Lecture Planner';
    return json(res, 200, { success: true, tabs, recommendedTab: recommended });
  } catch (err) {
    return json(res, 500, { error: err.message, tabs: ['Lecture Planner'], recommendedTab: 'Lecture Planner' });
  }
}

async function fetchSheet(res, q) {
  const sheetId = q.sheetId;
  const sheet = q.sheet || 'Lecture Planner';
  const gid = q.gid;
  if (!sheetId) return json(res, 400, { error: 'Missing sheetId' });

  const tries = [];
  if (gid) tries.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
  tries.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`);
  tries.push(
    sheet.endsWith(' ')
      ? `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet.trim())}`
      : `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet + ' ')}`
  );

  for (const target of tries) {
    try {
      const r = await fetch(target);
      const text = await r.text();
      if (text && text.trim().length > 50 && !/^"?Completion %/.test(text)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
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
  const headers = ['Faculty ID', 'Name', 'Primary Email', 'Secondary Email', 'Phone', 'Department', 'Designation Role', 'Status', 'Can Reschedule Cancel', 'Assigned Cohorts', 'Last Updated'];
  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };

  const rows = [headers.join(',')];
  for (const f of list) {
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
  const list = [];
  for (let i = 1; i < lines.length; i++) {
    const r = lines[i];
    if (!r || r.length < 2 || !r[1]) continue;
    const cohortsRaw = r[9] || '';
    const cohorts = cohortsRaw ? cohortsRaw.split(';').map(c => c.trim()).filter(Boolean) : ["Prarambh '26"];
    list.push({
      id: r[0] || `fac-${i}`,
      name: r[1],
      email: r[2] || '',
      secondaryEmail: r[3] || '',
      phone: r[4] || '98765 43210',
      dept: r[5] || 'Medical Sciences',
      role: r[6] || `Professor • ${r[5] || 'Medical Sciences'}`,
      status: r[7] || 'Verified',
      canRescheduleCancel: String(r[8]).toUpperCase() !== 'FALSE',
      cohorts,
      lastUpdated: r[10] || new Date().toISOString()
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
        if (Array.isArray(data.list)) {
          fs.writeFileSync(ONBOARDING_JSON_FILE, JSON.stringify(data.list, null, 2), 'utf-8');
          const csvText = facultyListToCSV(data.list);
          fs.writeFileSync(ONBOARDING_CSV_FILE, csvText, 'utf-8');
          return json(res, 200, { success: true, count: data.list.length });
        }
      } catch (err) {
        return json(res, 400, { error: err.message });
      }
      return json(res, 400, { error: 'Invalid data' });
    });
    return;
  }
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsed.pathname);

  if (pathname.startsWith('/api/detect-tabs')) return detectTabs(res, parsed.query);
  if (pathname.startsWith('/api/fetch-sheet')) return fetchSheet(res, parsed.query);
  if (pathname.startsWith('/api/faculty-onboarding')) return handleFacultyOnboardingApi(req, res, pathname);

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
