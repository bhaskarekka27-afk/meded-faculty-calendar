const fs = require('fs');
const path = require('path');

console.log('================================================================');
console.log('🧪 Verifying Complete Removal of LT-1, Lecture Hall & Physical Venues');
console.log('================================================================\n');

const filesToCheck = [
  'faculty.html',
  'admin.html',
  'index.html',
  'week.html',
  'timeline.html',
  'js/facultyApp.js',
  'js/adminApp.js',
  'js/reminderEmailService.js',
  'dist/faculty.html',
  'dist/admin.html',
  'dist/index.html',
  'dist/week.html',
  'dist/timeline.html'
];

const patterns = [
  { name: 'LT-1', regex: /LT-1/i },
  { name: 'Lecture Hall', regex: /Lecture\s+Hall/i },
  { name: 'Main Academic Block', regex: /Main\s+Academic\s+Block/i },
  { name: 'Lecture Theater', regex: /Lecture\s+Theater/i },
  { name: 'Lecture Venue', regex: /Lecture\s+Venue/i }
];

let totalViolations = 0;

filesToCheck.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing file: ${file}`);
    totalViolations++;
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  patterns.forEach(({ name, regex }) => {
    const match = content.match(regex);
    if (match) {
      console.error(`❌ Violation in ${file}: Found "${name}"`);
      totalViolations++;
    }
  });
});

if (totalViolations === 0) {
  console.log('✅ ALL CHECKS PASSED: Zero occurrences of LT-1, Lecture Hall, Lecture Theater, Lecture Venue, or Main Academic Block found across all source and dist files!');
} else {
  console.error(`❌ FAILED: ${totalViolations} violations detected.`);
  process.exit(1);
}

// Verify faculty modal layout in faculty.html
const facultyHtml = fs.readFileSync(path.join(__dirname, 'faculty.html'), 'utf8');
if (facultyHtml.includes('modalDetailFaculty') && !facultyHtml.includes('Lecture Hall')) {
  console.log('✅ faculty.html modal structure verified: Assigned Faculty is cleanly displayed without Lecture Hall.');
} else {
  console.error('❌ faculty.html modal verification failed.');
  process.exit(1);
}

console.log('\n🎉 Verification completed successfully with 0 errors.');
