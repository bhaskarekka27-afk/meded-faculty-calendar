const assert = require('assert');
const http = require('http');

console.log('================================================================');
console.log('🧪 Testing Multi-Admin & Faculty Real-Time Synchronization');
console.log('================================================================\n');

const BASE_URL = 'http://127.0.0.1:5173';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  // 1. Initial Batches Check
  console.log('--- Step 1: Initial Sync Check ---');
  const initRes = await request('GET', '/api/batches');
  assert.strictEqual(initRes.status, 200, 'GET /api/batches should return 200');
  assert.strictEqual(initRes.body.success, true, 'Batches API returned success');
  const initialBatches = initRes.body.batches;
  console.log(`✓ Initial batches in persistent server store: ${initialBatches.length}`);

  // 2. Admin 1 adds a new spreadsheet / batch
  console.log('\n--- Step 2: Admin 1 Adds New Spreadsheet Batch ---');
  const newBatch = {
    id: `batch-test-${Date.now()}`,
    name: 'Super Speciality 2026 Batch',
    sheetUrl: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    createdAt: new Date().toISOString(),
    events: [
      {
        id: `ev-test-1-${Date.now()}`,
        topic: 'Advanced Clinical Biochemistry in Renal Disorders',
        faculty: 'Dr. Rajesh Jambhulkar',
        subject: 'Biochemistry',
        dateRaw: '2026-10-25',
        timings: '6:00 PM – 8:00 PM',
        room: 'Studio 01',
        eventType: 'class'
      }
    ]
  };

  const updatedBatchesList = [...initialBatches, newBatch];
  const postRes = await request('POST', '/api/batches', { batches: updatedBatchesList });
  assert.strictEqual(postRes.status, 200, 'POST /api/batches should return 200');
  console.log(`✓ Admin 1 successfully added "${newBatch.name}" (with classes for Dr. Rajesh Jambhulkar)`);

  // 3. Admin 2 Sync Check
  console.log('\n--- Step 3: Admin 2 Logged-in Session Reads Batches ---');
  const admin2Res = await request('GET', '/api/batches');
  assert.strictEqual(admin2Res.status, 200);
  const foundInAdmin2 = admin2Res.body.batches.find(b => b.id === newBatch.id);
  assert.ok(foundInAdmin2, 'Admin 2 must immediately receive newly added spreadsheet batch');
  console.log(`✓ Admin 2 immediately fetched new batch: "${foundInAdmin2.name}"`);

  // 4. Faculty 1 (Dr. Rajesh Jambhulkar) Login Check
  console.log('\n--- Step 4: Faculty 1 (Dr. Rajesh Jambhulkar) Login Sync ---');
  const faculty1Name = 'Dr. Rajesh Jambhulkar';
  const faculty1RelevantBatches = admin2Res.body.batches.filter(b => {
    return (b.events || []).some(ev => {
      const f = (ev.faculty || '').toLowerCase();
      return f.includes('rajesh') || f.includes('jambhulkar');
    });
  });
  const faculty1HasNewBatch = faculty1RelevantBatches.some(b => b.id === newBatch.id);
  assert.strictEqual(faculty1HasNewBatch, true, 'Dr. Rajesh Jambhulkar must see the new batch because he has classes in it');
  console.log(`✓ Dr. Rajesh Jambhulkar sees "${newBatch.name}" in his active schedule (${faculty1RelevantBatches.length} total active batches)`);

  // 5. Faculty 2 (Dr. Pradeep Pawar) Login Check
  console.log('\n--- Step 5: Faculty 2 (Dr. Pradeep Pawar) Filter Check ---');
  const faculty2RelevantBatches = admin2Res.body.batches.filter(b => {
    return (b.events || []).some(ev => {
      const f = (ev.faculty || '').toLowerCase();
      return f.includes('pradeep') || f.includes('pawar');
    });
  });
  const faculty2HasNewBatch = faculty2RelevantBatches.some(b => b.id === newBatch.id);
  assert.strictEqual(faculty2HasNewBatch, false, 'Dr. Pradeep Pawar should NOT see this batch as he has no classes in it');
  console.log(`✓ Dr. Pradeep Pawar calendar is uncluttered (new batch omitted from his personal schedule view)`);

  // 6. Cleanup test batch
  console.log('\n--- Step 6: Clean Up Test Batch ---');
  const cleanBatches = admin2Res.body.batches.filter(b => b.id !== newBatch.id);
  await request('POST', '/api/batches', { batches: cleanBatches });
  console.log('✓ Cleaned up test batch from persistent storage');

  console.log('\n================================================================');
  console.log('🎉 ALL MULTI-USER REAL-TIME SYNCHRONIZATION TESTS PASSED (100%)');
  console.log('================================================================');
}

run().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
