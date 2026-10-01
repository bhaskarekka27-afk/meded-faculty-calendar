import fs from 'fs';

const targetFacultyNames = [
  'Pradeep', 'Vivek', 'Siraj', 'Anusha', 'Manjunath', 'Era', 
  'Prassan', 'Santosh', 'Santhosh', 'Sandeep', 'Divya', 'Jazeer', 'Ichita'
];

const entries = JSON.parse(fs.readFileSync('workload_complete_entries.json', 'utf-8'));

// Group entries by faculty and month
const facultyMonthStats = {};

entries.forEach(e => {
  const fac = e.faculty;
  const m = e.month;
  if (!facultyMonthStats[fac]) facultyMonthStats[fac] = {};
  if (!facultyMonthStats[fac][m]) {
    facultyMonthStats[fac][m] = {
      hours: 0,
      sessions: 0,
      appHours: 0,
      ytHours: 0,
      cancels: 0,
      rescheds: 0,
      batches: new Set(),
      items: []
    };
  }

  const hrs = Number(e.workingHours) || 0;
  facultyMonthStats[fac][m].hours += hrs;
  facultyMonthStats[fac][m].sessions += 1;
  if (e.isApp) facultyMonthStats[fac][m].appHours += hrs;
  if (e.isYoutube) facultyMonthStats[fac][m].ytHours += hrs;
  if (e.isCancel) facultyMonthStats[fac][m].cancels += 1;
  if (e.isResched) facultyMonthStats[fac][m].rescheds += 1;
  if (e.batchName) facultyMonthStats[fac][m].batches.add(e.batchName);
  facultyMonthStats[fac][m].items.push(e);
});

console.log('=== VERIFICATION REPORT FOR TARGET FACULTY ===\n');

for (const [fac, months] of Object.entries(facultyMonthStats)) {
  const isTarget = targetFacultyNames.some(tf => fac.toLowerCase().includes(tf.toLowerCase()));
  if (!isTarget) continue;

  console.log(`\n======================================================`);
  console.log(`Doctor: ${fac}`);
  let grandTotal = 0;
  let grandSessions = 0;
  let grandCancels = 0;
  let grandRescheds = 0;

  const monthOrder = ['March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const sortedMonths = Object.keys(months).sort((a, b) => {
    const idxA = monthOrder.indexOf(a);
    const idxB = monthOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return a.localeCompare(b);
  });

  for (const m of sortedMonths) {
    const s = months[m];
    grandTotal += s.hours;
    grandSessions += s.sessions;
    grandCancels += s.cancels;
    grandRescheds += s.rescheds;

    console.log(`  • ${m.padEnd(10)}: Total=${s.hours.toFixed(1).padStart(5)}h | App=${s.appHours.toFixed(1).padStart(5)}h | YT=${s.ytHours.toFixed(1).padStart(5)}h | Sessions=${s.sessions.toString().padStart(2)} | Cancel=${s.cancels} | Resched=${s.rescheds} | Batches: [${Array.from(s.batches).join(', ')}]`);
  }

  console.log(`  ----------------------------------------------------`);
  console.log(`  OVERALL   : Total=${grandTotal.toFixed(1)}h | Sessions=${grandSessions} | Cancel=${grandCancels} | Resched=${grandRescheds}`);
}
