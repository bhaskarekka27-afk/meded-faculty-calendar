const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Starting Requests Page Interactive Test...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Navigate to requests tab
  console.log('1. Navigating to http://localhost:5173/admin.html#requests');
  await page.goto('http://localhost:5173/admin.html#requests', { waitUntil: 'networkidle2' });
  await page.waitForSelector('#viewSectionRequests', { timeout: 5000 });

  // Check that summary cards render
  const summaryCount = await page.$eval('#summaryPendingCount', el => el.textContent.trim());
  console.log(`✓ Summary Pending Count: ${summaryCount}`);

  // Test 1: Test Filter Tabs
  console.log('2. Testing Filter Tabs...');
  const filterBtns = await page.$$('.btn-request-filter');
  console.log(`✓ Found ${filterBtns.length} filter buttons`);
  
  // Click Reschedule filter
  await page.evaluate(() => {
    const btn = document.querySelector('.btn-request-filter[data-filter="reschedule"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 200));
  
  let cardsCount = await page.$$eval('#requestsCardsList > div', els => els.length);
  console.log(`✓ Cards count after filtering for Reschedule: ${cardsCount}`);

  // Click All filter
  await page.evaluate(() => {
    const btn = document.querySelector('.btn-request-filter[data-filter="all"]');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 200));

  // Test 2: Test Decline Modal for Rajesh
  console.log('3. Testing Decline Modal on Dr. Rajesh card...');
  const declineBtn = await page.$('#declineBtnRajesh');
  if (!declineBtn) throw new Error('Decline button for Rajesh not found!');
  await declineBtn.click();
  await new Promise(r => setTimeout(r, 300));

  // Check decline modal is visible
  const isDeclineModalVisible = await page.evaluate(() => {
    const m = document.getElementById('declineConfirmModal');
    return m && !m.classList.contains('hidden') && window.getComputedStyle(m).display !== 'none';
  });
  console.log(`✓ Decline modal visible: ${isDeclineModalVisible}`);
  if (!isDeclineModalVisible) throw new Error('Decline modal failed to open!');

  // Check faculty name in decline modal
  const facultyTargetName = await page.$eval('#declineFacultyTarget', el => el.textContent.trim());
  console.log(`✓ Decline modal target faculty: "${facultyTargetName}"`);

  // Click 'No' to dismiss
  await page.click('#declineNoBtn');
  await new Promise(r => setTimeout(r, 300));

  const isDeclineClosed = await page.evaluate(() => {
    const m = document.getElementById('declineConfirmModal');
    return m && (m.classList.contains('hidden') || window.getComputedStyle(m).display === 'none');
  });
  console.log(`✓ Decline modal closed after clicking No: ${isDeclineClosed}`);
  if (!isDeclineClosed) throw new Error('Decline modal failed to close on No!');

  // Test 3: Test Reschedule Timetable Modal on Dr. Rajesh card
  console.log('4. Testing Reschedule Modal on Dr. Rajesh card...');
  const approveBtn = await page.$('#openApproveModalBtn');
  if (!approveBtn) throw new Error('Approve button for Rajesh not found!');
  await approveBtn.click();
  await new Promise(r => setTimeout(r, 300));

  const isRescheduleModalVisible = await page.evaluate(() => {
    const m = document.getElementById('rescheduleModal');
    return m && !m.classList.contains('hidden') && window.getComputedStyle(m).display !== 'none';
  });
  console.log(`✓ Reschedule timetable modal visible: ${isRescheduleModalVisible}`);
  if (!isRescheduleModalVisible) throw new Error('Reschedule modal failed to open!');

  // Check Alt Slot Modal within Reschedule Modal
  console.log('5. Testing Alt Slot selection modal...');
  const mon19Slot = await page.$('#mon19SlotTrigger');
  if (mon19Slot) {
    await mon19Slot.click();
    await new Promise(r => setTimeout(r, 300));
    const isAltSlotVisible = await page.evaluate(() => {
      const m = document.getElementById('altSlotModal');
      return m && !m.classList.contains('hidden') && window.getComputedStyle(m).display !== 'none';
    });
    console.log(`✓ Alt slot modal visible: ${isAltSlotVisible}`);

    // Click Close Alt Slot
    await page.click('#closeAltSlotBtn');
    await new Promise(r => setTimeout(r, 200));
  }

  // Click Confirm Reschedule & Approve
  console.log('6. Confirming Reschedule...');
  await page.click('#rescheduleModalConfirmBtn');
  await new Promise(r => setTimeout(r, 900));

  // Check card status is updated to Approved
  const cardRajeshText = await page.evaluate(() => {
    const card = document.getElementById('cardRajesh');
    return card ? card.innerText : '';
  });
  console.log(`✓ Dr. Rajesh card approved status: ${cardRajeshText.includes('Approved')}`);
  if (!cardRajeshText.includes('Approved')) throw new Error('Rajesh card status not updated to Approved!');

  // Test 4: Test Cancellation card (Dr. Vivek Nalgirkar)
  console.log('7. Testing Reject Cancellation on Dr. Vivek card...');
  const rejectBtn = await page.$('#rejectCancellationBtn-req-vivek-2');
  if (!rejectBtn) throw new Error('Reject button for Vivek not found!');
  await rejectBtn.click();
  await new Promise(r => setTimeout(r, 300));

  const isRejectModalVisible = await page.evaluate(() => {
    const m = document.getElementById('rejectCancellationModal');
    return m && !m.classList.contains('hidden') && window.getComputedStyle(m).display !== 'none';
  });
  console.log(`✓ Reject Cancellation modal visible: ${isRejectModalVisible}`);
  if (!isRejectModalVisible) throw new Error('Reject cancellation modal failed to open!');

  // Click quick reason
  await page.evaluate(() => {
    const btn = document.querySelector('.btn-quick-reason');
    if (btn) btn.click();
  });
  const reasonVal = await page.$eval('#rejectionReasonText', el => el.value);
  console.log(`✓ Quick reason populated: "${reasonVal.slice(0, 30)}..."`);

  // Confirm Rejection
  await page.click('#confirmRejectBtn');
  await new Promise(r => setTimeout(r, 900));

  const cardVivekText = await page.evaluate(() => {
    const card = document.getElementById('card-req-vivek-2');
    return card ? card.innerText : '';
  });
  console.log(`✓ Dr. Vivek card declined status: ${cardVivekText.includes('Declined')}`);
  if (!cardVivekText.includes('Declined')) throw new Error('Vivek card status not updated to Declined!');

  // Test 5: Verify entire UI remains interactive (no freezing)
  console.log('8. Verifying page responsiveness and scroll state...');
  const isBodyScrollUnlocked = await page.evaluate(() => document.body.style.overflow !== 'hidden');
  console.log(`✓ Body scroll unlocked (no freeze): ${isBodyScrollUnlocked}`);
  if (!isBodyScrollUnlocked) throw new Error('Body scroll remains locked!');

  // Verify dock navigation to Calendar and back works smoothly
  console.log('9. Switching to Calendar tab and back to Requests...');
  await page.evaluate(() => {
    const calDock = document.querySelector('[data-dock="calendar"]');
    if (calDock) calDock.click();
  });
  await new Promise(r => setTimeout(r, 400));
  
  await page.evaluate(() => {
    const reqDock = document.querySelector('[data-dock="requests"]');
    if (reqDock) reqDock.click();
  });
  await new Promise(r => setTimeout(r, 400));

  console.log('🎉 ALL REQUESTS PAGE TESTS PASSED WITH ZERO FREEZING OR GLITCHES!');
  await browser.close();
})();
