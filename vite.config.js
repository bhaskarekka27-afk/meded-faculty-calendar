import fs from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'root-redirect-and-sheet-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url && req.url.startsWith('/api/detect-tabs')) {
            try {
              const parsedUrl = new URL(req.url, 'http://localhost');
              let sheetId = parsedUrl.searchParams.get('sheetId');
              const urlParam = parsedUrl.searchParams.get('url');
              if (!sheetId && urlParam) {
                const match = urlParam.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                if (match) sheetId = match[1];
              }
              if (!sheetId) throw new Error('Missing sheetId');

              const timestamp = Date.now();
              const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit?_t=${timestamp}`, {
                headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
              });
              const html = await response.text();
              const regex = /docs-sheet-tab-caption">([^<]+)<\/div>/g;
              const tabs = [];
              let m;
              while ((m = regex.exec(html)) !== null) {
                tabs.push(m[1]);
              }
              const recommended = tabs.find(t => /planner|lecture/i.test(t)) || tabs.find(t => /schedule/i.test(t)) || (tabs[0] || 'Lecture Planner');
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
              res.setHeader('Pragma', 'no-cache');
              res.setHeader('Expires', '0');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ success: true, tabs, recommendedTab: recommended }));
              return;
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ error: err.message, tabs: ['Lecture Planner'], recommendedTab: 'Lecture Planner' }));
              return;
            }
          }

          if (req.url && req.url.startsWith('/api/fetch-sheet')) {
            try {
              const parsedUrl = new URL(req.url, 'http://localhost');
              let sheetId = parsedUrl.searchParams.get('sheetId');
              let sheet = parsedUrl.searchParams.get('sheet') || 'Lecture Planner';
              let gid = parsedUrl.searchParams.get('gid');
              const urlParam = parsedUrl.searchParams.get('url');
              if (!sheetId && urlParam) {
                const match = urlParam.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                if (match) sheetId = match[1];
                const gidMatch = urlParam.match(/[#&]gid=([0-9]+)/);
                if (!gid && gidMatch) gid = gidMatch[1];
              }
              const timestamp = Date.now();

              let targetGid = gid;
              try {
                const editResp = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit?_t=${timestamp}`, {
                  headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
                });
                const html = await editResp.text();
                const re = /\\\"(\d+)\\\",\[\{\\\"1\\\":\[\[0,0,\\\"([^\\\"]+)\\\"/g;
                let m;
                const tabs = [];
                while ((m = re.exec(html)) !== null) tabs.push({ gid: m[1], name: m[2].trim() });
                const req = (sheet || '').toLowerCase();
                const match = tabs.find(t => t.name.toLowerCase() === req) ||
                              tabs.find(t => t.name.toLowerCase().includes(req)) ||
                              tabs.find(t => req.includes(t.name.toLowerCase())) ||
                              tabs.find(t => /planner|lecture/i.test(t.name)) ||
                              tabs.find(t => /schedule/i.test(t.name));
                if (match) targetGid = match.gid;
              } catch (_) {}

              // Candidate URLs to try in order with cache-busting timestamp
              const urlsToTry = [];
              if (targetGid != null) {
                urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${targetGid}&_t=${timestamp}`);
                urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${targetGid}&_t=${timestamp}`);
              }
              if (gid && gid !== targetGid) {
                urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}&_t=${timestamp}`);
                urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}&_t=${timestamp}`);
              }
              urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&_t=${timestamp}`);
              if (!sheet.endsWith(' ')) {
                urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet + ' ')}&_t=${timestamp}`);
              } else {
                urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet.trim())}&_t=${timestamp}`);
              }

              let finalCsv = '';
              for (const targetUrl of urlsToTry) {
                try {
                  const response = await fetch(targetUrl, {
                    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
                  });
                  const text = await response.text();
                  if (text && text.trim().length > 50) {
                    if (!text.startsWith('"Completion %') && !text.startsWith('Completion %')) {
                      finalCsv = text;
                      break;
                    }
                  }
                } catch (e) {
                  // continue trying
                }
              }

              if (finalCsv) {
                res.setHeader('Content-Type', 'text/csv; charset=utf-8');
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(finalCsv);
                return;
              } else {
                res.statusCode = 404;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ error: `Could not find valid lecture tab for "${sheet}". Returned summary tab.` }));
                return;
              }
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ error: err.message }));
              return;
            }
          }

          const ONBOARDING_JSON_FILE = resolve(__dirname, 'data_faculty_onboarding.json');
          const ONBOARDING_CSV_FILE = resolve(__dirname, 'data_faculty_onboarding.csv');

          if (req.url && req.url.startsWith('/api/faculty-onboarding-csv')) {
            let csvContent = '';
            if (fs.existsSync(ONBOARDING_CSV_FILE)) {
              csvContent = fs.readFileSync(ONBOARDING_CSV_FILE, 'utf-8');
            } else if (fs.existsSync(ONBOARDING_JSON_FILE)) {
              csvContent = fs.readFileSync(ONBOARDING_JSON_FILE, 'utf-8');
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="PW_MedEd_Faculty_Onboarding_Directory.csv"');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(csvContent);
            return;
          }

          if (req.url && req.url.startsWith('/api/faculty-onboarding/sync-sheet') && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
              try {
                const data = JSON.parse(body);
                const sheetUrl = data.sheetUrl;
                if (!sheetUrl) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Missing sheetUrl' }));
                  return;
                }
                const match = sheetUrl.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
                if (!match) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: 'Invalid Google Spreadsheet URL' }));
                  return;
                }
                const sheetId = match[1];
                const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
                const gid = gidMatch ? gidMatch[1] : '0';

                const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}&_t=${Date.now()}`;
                const response = await fetch(csvUrl);
                const csvText = await response.text();
                
                // Read current json to return or update
                let currentList = [];
                if (fs.existsSync(ONBOARDING_JSON_FILE)) {
                  try { currentList = JSON.parse(fs.readFileSync(ONBOARDING_JSON_FILE, 'utf-8')); } catch (_) {}
                }
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Access-Control-Allow-Origin', '*');
                res.end(JSON.stringify({ success: true, count: currentList.length, list: currentList, rawCsv: csvText }));
              } catch (err) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          if (req.url && req.url.startsWith('/api/faculty-onboarding')) {
            if (req.method === 'GET') {
              try {
                if (fs.existsSync(ONBOARDING_JSON_FILE)) {
                  const content = fs.readFileSync(ONBOARDING_JSON_FILE, 'utf-8');
                  const parsed = JSON.parse(content);
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(JSON.stringify({ success: true, list: parsed }));
                  return;
                }
              } catch (e) {}
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ success: true, list: null }));
              return;
            }

            if (req.method === 'POST') {
              let body = '';
              req.on('data', chunk => { body += chunk; });
              req.on('end', () => {
                try {
                  const data = JSON.parse(body);
                  if (Array.isArray(data.list)) {
                    fs.writeFileSync(ONBOARDING_JSON_FILE, JSON.stringify(data.list, null, 2), 'utf-8');
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.end(JSON.stringify({ success: true, count: data.list.length }));
                    return;
                  }
                } catch (err) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                  return;
                }
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid data' }));
              });
              return;
            }
          }

          const BATCHES_JSON_FILE = resolve(__dirname, 'data_batches.json');
          const REQUESTS_JSON_FILE = resolve(__dirname, 'data_requests.json');
          const SETTINGS_JSON_FILE = resolve(__dirname, 'data_settings.json');

          if (req.url && req.url.startsWith('/api/batches')) {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.end();
              return;
            }
            if (req.method === 'GET') {
              try {
                if (fs.existsSync(BATCHES_JSON_FILE)) {
                  const content = fs.readFileSync(BATCHES_JSON_FILE, 'utf-8');
                  const parsed = JSON.parse(content);
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(JSON.stringify({ success: true, batches: parsed }));
                  return;
                }
              } catch (e) {}
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ success: true, batches: [] }));
              return;
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
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.end(JSON.stringify({ success: true, count: data.batches.length, batches: data.batches }));
                    return;
                  } else if (data.batch && data.batch.id) {
                    const idx = list.findIndex(b => b.id === data.batch.id);
                    if (idx >= 0) list[idx] = data.batch;
                    else list.push(data.batch);
                    fs.writeFileSync(BATCHES_JSON_FILE, JSON.stringify(list, null, 2), 'utf-8');
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.end(JSON.stringify({ success: true, count: list.length, batch: data.batch }));
                    return;
                  } else if (data.action === 'delete' && data.id) {
                    list = list.filter(b => b.id !== data.id);
                    fs.writeFileSync(BATCHES_JSON_FILE, JSON.stringify(list, null, 2), 'utf-8');
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.end(JSON.stringify({ success: true, count: list.length }));
                    return;
                  }
                } catch (err) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                  return;
                }
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid batch data' }));
              });
              return;
            }
          }

          if (req.url && req.url.startsWith('/api/requests')) {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.end();
              return;
            }
            if (req.method === 'GET') {
              try {
                if (fs.existsSync(REQUESTS_JSON_FILE)) {
                  const content = fs.readFileSync(REQUESTS_JSON_FILE, 'utf-8');
                  const parsed = JSON.parse(content);
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(JSON.stringify({ success: true, requests: parsed }));
                  return;
                }
              } catch (e) {}
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ success: true, requests: [] }));
              return;
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
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.end(JSON.stringify({ success: true, count: data.requests.length, requests: data.requests }));
                    return;
                  } else if (data.request && data.request.id) {
                    const idx = list.findIndex(r => r.id === data.request.id);
                    if (idx >= 0) list[idx] = data.request;
                    else list.unshift(data.request);
                    fs.writeFileSync(REQUESTS_JSON_FILE, JSON.stringify(list, null, 2), 'utf-8');
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader('Access-Control-Allow-Origin', '*');
                    res.end(JSON.stringify({ success: true, count: list.length, request: data.request }));
                    return;
                  } else if (data.action === 'update_status' && data.id) {
                    const reqItem = list.find(r => r.id === data.id);
                    if (reqItem) {
                      reqItem.status = data.status || 'approved';
                      reqItem.resolvedAt = new Date().toISOString();
                      if (data.notes) reqItem.notes = data.notes;
                      fs.writeFileSync(REQUESTS_JSON_FILE, JSON.stringify(list, null, 2), 'utf-8');
                      res.statusCode = 200;
                      res.setHeader('Content-Type', 'application/json');
                      res.setHeader('Access-Control-Allow-Origin', '*');
                      res.end(JSON.stringify({ success: true, request: reqItem }));
                      return;
                    }
                    res.statusCode = 404;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Request not found' }));
                    return;
                  }
                } catch (err) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                  return;
                }
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Invalid requests data' }));
              });
              return;
            }
          }

          if (req.url && req.url.startsWith('/api/settings')) {
            if (req.method === 'OPTIONS') {
              res.statusCode = 204;
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.end();
              return;
            }
            if (req.method === 'GET') {
              try {
                if (fs.existsSync(SETTINGS_JSON_FILE)) {
                  const content = fs.readFileSync(SETTINGS_JSON_FILE, 'utf-8');
                  const parsed = JSON.parse(content);
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(JSON.stringify({ success: true, settings: parsed }));
                  return;
                }
              } catch (e) {}
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(JSON.stringify({ success: true, settings: {} }));
              return;
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
                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(JSON.stringify({ success: true, settings }));
                  return;
                } catch (err) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message }));
                  return;
                }
              });
              return;
            }
          }

          if (req.url && req.url.startsWith('/api/sync-state')) {
            const getMtime = (f) => {
              try { return fs.statSync(f).mtimeMs; } catch (_) { return 0; }
            };
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify({
              success: true,
              state: {
                batches: getMtime(BATCHES_JSON_FILE),
                onboarding: getMtime(ONBOARDING_JSON_FILE),
                requests: getMtime(REQUESTS_JSON_FILE),
                settings: getMtime(SETTINGS_JSON_FILE)
              }
            }));
            return;
          }

          if (req.url && req.url.startsWith('/api/pyq-documents')) {
            const parsedUrl = new URL(req.url, 'http://localhost');
            const pathname = parsedUrl.pathname;
            const docId = parsedUrl.searchParams.get('id');
            const pyqFile = resolve(__dirname, 'data_pyq_documents.json');
            let data = { totalDocuments: 0, documents: [] };
            if (fs.existsSync(pyqFile)) {
              try { data = JSON.parse(fs.readFileSync(pyqFile, 'utf-8')); } catch (_) {}
            }
            const isPdf = pathname.startsWith('/api/pyq-documents/pdf') || pathname.startsWith('/api/pyq-documents/download');
            if (isPdf) {
              const doc = (data.documents && data.documents.find(d => d.id === docId)) || data.documents?.[0] || {
                title: 'PW MedEd Question Bank.pdf', subject: 'Clinical Sciences', exam: 'NEET PG PYQs',
                summary: 'Curated 5-year repeat questions and clinical vignettes.'
              };
              const title = (doc.title || 'PW MedEd Question Bank').replace('.pdf', '');
              const subject = doc.subject || 'Clinical Sciences';
              const exam = doc.exam || 'NEET PG & INI-CET';
              const summary = doc.summary || 'Previous year solved questions with clinical explanations.';
              const pageLines = [
                '================================================================================',
                'PW MEDED ACADEMIC DIRECTORATE - OFFICIAL MASTER QUESTION BANK',
                '================================================================================',
                '', `DOCUMENT TITLE: ${title}`, `SUBJECT SPECIALTY: ${subject}`, `TARGET EXAMINATION: ${exam}`,
                'CURRICULUM: National Medical Commission (NMC) - CBME Aligned',
                '================================================================================',
                `SUMMARY: ${summary}`
              ];
              let s = 'BT\n/F1 10.5 Tf\n40 745 Td\n15 TL\n';
              pageLines.forEach(line => {
                const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
                s += `(${escaped}) '\n`;
              });
              s += 'ET';
              const streamLen = Buffer.byteLength(s, 'utf-8');
              const objects = [
                '%PDF-1.4\n',
                '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
                '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
                '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
                `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${s}\nendstream\nendobj\n`,
                '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n'
              ];
              let offset = 0; const offsets = []; let pdfData = '';
              objects.forEach(obj => {
                offsets.push(offset); pdfData += obj; offset += Buffer.byteLength(obj, 'utf-8');
              });
              let xref = `xref\n0 6\n0000000000 65535 f \n`;
              for (let i = 1; i <= 5; i++) {
                xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
              }
              const trailer = `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
              const pdfBuf = Buffer.from(pdfData + xref + trailer, 'utf-8');
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/pdf');
              res.setHeader('Content-Disposition', `inline; filename="${doc.downloadFileName || 'PW_MedEd_PYQ.pdf'}"`);
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.end(pdfBuf);
              return;
            }
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.end(JSON.stringify(data));
            return;
          }

          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/admin.html';
          } else if (req.url === '/admin-login' || req.url === '/admin/login') {
            req.url = '/admin-login.html';
          } else if (req.url === '/faculty-login' || req.url === '/faculty/login') {
            req.url = '/faculty-login.html';
          } else if (req.url === '/login') {
            req.url = '/login.html';
          }
          next();
        });
      }
    }
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        adminLogin: resolve(__dirname, 'admin-login.html'),
        facultyLogin: resolve(__dirname, 'faculty-login.html'),
        googleOauth: resolve(__dirname, 'google-oauth.html'),
        admin: resolve(__dirname, 'admin.html'),
        faculty: resolve(__dirname, 'faculty.html'),
        week: resolve(__dirname, 'week.html'),
        timeline: resolve(__dirname, 'timeline.html'),
        requests: resolve(__dirname, 'requests.html')
      }
    }
  }
});
