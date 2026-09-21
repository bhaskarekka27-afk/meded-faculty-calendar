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
              const sheetId = parsedUrl.searchParams.get('sheetId');
              if (!sheetId) throw new Error('Missing sheetId');

              const response = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
              const html = await response.text();
              const regex = /docs-sheet-tab-caption">([^<]+)<\/div>/g;
              const tabs = [];
              let m;
              while ((m = regex.exec(html)) !== null) {
                tabs.push(m[1]);
              }
              const recommended = tabs.find(t => /planner|lecture/i.test(t)) || tabs.find(t => /schedule/i.test(t)) || (tabs[0] || 'Lecture Planner');
              res.setHeader('Content-Type', 'application/json');
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
              const sheetId = parsedUrl.searchParams.get('sheetId');
              let sheet = parsedUrl.searchParams.get('sheet') || 'Lecture Planner';
              const gid = parsedUrl.searchParams.get('gid');

              // Candidate URLs to try in order
              const urlsToTry = [];
              if (gid) {
                urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
              }
              urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`);
              if (!sheet.endsWith(' ')) {
                urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet + ' ')}`);
              } else {
                urlsToTry.push(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet.trim())}`);
              }

              let finalCsv = '';
              for (const targetUrl of urlsToTry) {
                try {
                  const response = await fetch(targetUrl);
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
          if (req.url === '/' || req.url === '/index.html') {
            req.url = '/admin.html';
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
        admin: resolve(__dirname, 'admin.html'),
        faculty: resolve(__dirname, 'faculty.html'),
        week: resolve(__dirname, 'week.html'),
        timeline: resolve(__dirname, 'timeline.html'),
        requests: resolve(__dirname, 'requests.html')
      }
    }
  }
});
