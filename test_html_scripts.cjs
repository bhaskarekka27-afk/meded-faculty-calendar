const fs = require('fs');
const vm = require('vm');

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));

let errorCount = 0;
for (const htmlFile of htmlFiles) {
  const content = fs.readFileSync(htmlFile, 'utf8');
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  let scriptIdx = 0;
  while ((match = scriptRegex.exec(content)) !== null) {
    scriptIdx++;
    const attrs = match[1];
    const scriptBody = match[2].trim();
    if (/src\s*=/i.test(attrs)) continue;
    if (!scriptBody) continue;
    
    try {
      if (/type\s*=\s*["']module["']/i.test(attrs)) {
        const transpiled = scriptBody.replace(/import\s+[^;]+;?/g, '// import')
                                     .replace(/export\s+[^;]+;?/g, '// export');
        new Function(transpiled);
      } else {
        new Function(scriptBody);
      }
    } catch (e) {
      console.error(`✗ Error in ${htmlFile} script #${scriptIdx}:`, e.message);
      errorCount++;
    }
  }
}

if (errorCount === 0) {
  console.log(`✓ All HTML inline scripts passed syntax checks across ${htmlFiles.length} HTML files!`);
} else {
  console.error(`Found ${errorCount} errors in HTML scripts.`);
  process.exit(1);
}
