const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5173;

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('Testing code-level persistence and multi-user sync...');

  // 1. Check GET /api/settings
  const getSettingsRes = await request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/settings',
    method: 'GET'
  });
  console.log('1. GET /api/settings status:', getSettingsRes.status);
  if (getSettingsRes.status !== 200 || !getSettingsRes.data.success) {
    throw new Error('GET /api/settings failed');
  }
  console.log('   Settings keys:', Object.keys(getSettingsRes.data.settings));

  // 2. Test updating email / whatsapp settings via POST /api/settings
  const testEmailSettings = {
    senderEmail: 'dean.academic@pwmeded.edu.in',
    senderName: 'PW MedEd Academic Directorate',
    leadDurationMinutes: 45,
    leadDurationUnit: 'minutes',
    leadDurationValue: 45,
    isEnabled: true,
    whatsappEnabled: true,
    whatsappCadenceSeconds: 30,
    whatsappJitterSeconds: 12,
    whatsappSenderName: 'PW MedEd Academic Directorate',
    whatsappSenderNumber: '94234 07557',
    whatsappCountryCode: '+91'
  };

  const postSettingRes = await request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/settings',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    key: 'meded_email_settings',
    value: JSON.stringify(testEmailSettings)
  });

  console.log('2. POST /api/settings status:', postSettingRes.status);
  if (postSettingRes.status !== 200 || !postSettingRes.data.success) {
    throw new Error('POST /api/settings failed');
  }

  // 3. Verify settings file on disk (code level)
  const settingsFile = path.join(__dirname, 'data_settings.json');
  const diskSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'));
  console.log('3. data_settings.json updated on disk:', Boolean(diskSettings.meded_email_settings));
  const parsedEmailSettings = JSON.parse(diskSettings.meded_email_settings);
  if (parsedEmailSettings.senderEmail !== 'dean.academic@pwmeded.edu.in' || parsedEmailSettings.leadDurationValue !== 45) {
    throw new Error('Settings not persisted accurately to disk');
  }

  // 4. Test GET /api/batches
  const getBatchesRes = await request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/batches',
    method: 'GET'
  });
  console.log('4. GET /api/batches count:', getBatchesRes.data.batches?.length);
  if (!getBatchesRes.data.batches || getBatchesRes.data.batches.length < 4) {
    throw new Error('Batches not loaded from server');
  }

  // 5. Test adding a new batch / spreadsheet via POST /api/batches
  const testNewBatch = {
    id: 'batch-test-new-sheet',
    name: 'Clinical Pediatrics 2026 Batch',
    sourceUrl: 'https://docs.google.com/spreadsheets/d/test-sheet-id/edit',
    sheetTabName: 'Lecture Planner',
    platform: 'app',
    isYoutube: false,
    isApp: true,
    eventCount: 1,
    events: [{
      id: 'test-ev-1',
      batchId: 'batch-test-new-sheet',
      batchName: 'Clinical Pediatrics 2026 Batch',
      faculty: 'Dr. Rajesh Jambhulkar',
      subject: 'Pediatrics',
      topic: 'Neonatal Resuscitation',
      isoDate: '2026-10-25',
      eventType: 'class'
    }]
  };

  const postBatchRes = await request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/batches',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    batch: testNewBatch
  });

  console.log('5. POST /api/batches status:', postBatchRes.status);
  if (postBatchRes.status !== 200) {
    throw new Error('POST /api/batches failed');
  }

  // Check that new batch is in data_batches.json
  const batchesFile = path.join(__dirname, 'data_batches.json');
  const diskBatches = JSON.parse(fs.readFileSync(batchesFile, 'utf-8'));
  const found = diskBatches.find(b => b.id === 'batch-test-new-sheet');
  console.log('6. New spreadsheet batch found in data_batches.json:', Boolean(found));
  if (!found) {
    throw new Error('New batch not found in data_batches.json');
  }

  // Clean up the test batch
  await request({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/api/batches',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    action: 'delete',
    id: 'batch-test-new-sheet'
  });

  console.log('7. Cleaned up test batch, restored original list.');
  console.log('✅ ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
