const fs = require('fs');

console.log('Testing AdminDashboardController IDs...');

const html = fs.readFileSync('admin.html', 'utf8');
const jsContent = fs.readFileSync('js/adminApp.js', 'utf8');
const idMatches = jsContent.match(/document\.getElementById\(['"]([^'"]+)['"]\)/g) || [];

const missingIds = [];
idMatches.forEach(match => {
  const id = match.replace(/document\.getElementById\(['"]/, '').replace(/['"]\)/, '');
  if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
    missingIds.push(id);
  }
});

console.log('Missing IDs referenced in adminApp.js:', [...new Set(missingIds)]);
