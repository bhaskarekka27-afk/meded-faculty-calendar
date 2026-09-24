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

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsed.pathname);

  if (pathname.startsWith('/api/detect-tabs')) return detectTabs(res, parsed.query);
  if (pathname.startsWith('/api/fetch-sheet')) return fetchSheet(res, parsed.query);

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
