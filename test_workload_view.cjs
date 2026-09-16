// Verification test script for Faculty Workload View
const { WorkloadManager, parseWorkloadCSV } = require('./js/workloadData.js');

console.log("=== TESTING WORKLOAD MANAGER & DATA AGGREGATION ===");

const manager = new WorkloadManager();

// Test 1: Verify overall metrics with default data
const overall = manager.getOverallMetrics();
console.log("Overall Metrics (Default):", JSON.stringify(overall, null, 2));

if (overall.totalHours <= 0) {
  console.error("FAIL: totalHours should be greater than 0");
  process.exit(1);
}
if (overall.activeFacultyCount <= 0) {
  console.error("FAIL: activeFacultyCount should be greater than 0");
  process.exit(1);
}
if (overall.totalSessions <= 0) {
  console.error("FAIL: totalSessions should be greater than 0");
  process.exit(1);
}

// Test 2: Verify faculty summaries
const summaries = manager.getFacultySummaries({ selectedMonth: 'All', selectedPlatform: 'All', selectedBatch: 'All', facultyQuery: '' });
console.log(`Faculty Summaries Count: ${summaries.length}`);
console.log("Top Faculty Workload:", summaries[0]);

if (summaries.length === 0) {
  console.error("FAIL: Faculty summaries should not be empty");
  process.exit(1);
}

// Test 3: Month filtering
const aprilSummaries = manager.getFacultySummaries({ selectedMonth: 'April', selectedPlatform: 'All', selectedBatch: 'All', facultyQuery: '' });
console.log(`April Faculty Summaries Count: ${aprilSummaries.length}`);

// Test 4: Platform filtering (App vs Youtube)
const appEntries = manager.getFilteredEntries({ selectedMonth: 'All', selectedPlatform: 'App', selectedBatch: 'All', facultyQuery: '' });
const ytEntries = manager.getFilteredEntries({ selectedMonth: 'All', selectedPlatform: 'Youtube', selectedBatch: 'All', facultyQuery: '' });
console.log(`App entries count: ${appEntries.length}, YouTube entries count: ${ytEntries.length}`);

// Test 5: CSV Parsing function
const sampleCSV = `Month,Date,Batch Name,,,,,,Live Type,,Working Hours
April,2026-04-10,Prarambh 2026,,,,,,App,,2.5
April,2026-04-12,INI-CET Essentials,,,,,,Youtube,,1.5`;

const parsed = parseWorkloadCSV(sampleCSV, "Dr. Test Sir");
console.log(`Parsed sample CSV entries for Dr. Test Sir: ${parsed.length}`);
if (parsed.length !== 2 || !parsed[0].faculty.includes("Dr. Test") || parsed[0].workingHours !== 2.5) {
  console.error("FAIL: CSV parsing failed for Dr. Test Sir", parsed);
  process.exit(1);
}

console.log("\n✅ ALL WORKLOAD TESTS PASSED SUCCESSFULLY!");
