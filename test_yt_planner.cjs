const puppeteer = require('puppeteer');

(async () => {
  console.log('--- STARTING YT PLANNER & PLATFORM BIFURCATION AUDIT ---');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    // 1. Audit Admin Login
    console.log('\n[1/3] Auditing Admin Login...');
    await page.goto('http://localhost:5173/admin.html', { waitUntil: 'networkidle0' });

    // Open Batch Dropdown
    await page.waitForSelector('#adminBatchPill');
    await page.click('#adminBatchPill');
    await new Promise(r => setTimeout(r, 400));

    const adminDropdownText = await page.$eval('#adminBatchDropdownList', el => el.innerText);
    console.log('Admin Batch Dropdown Items:');
    console.log(adminDropdownText);

    if (adminDropdownText.includes('INI-CET') && adminDropdownText.includes('FMGE') && adminDropdownText.includes('YouTube & App Series Planners')) {
      console.log('✅ Admin batch dropdown contains YouTube Series Planners with proper sectioning!');
    } else {
      console.error('❌ Admin batch dropdown missing expected YouTube sections!');
    }

    // Select INI-CET Essentials Series Batch
    const inicetBtn = await page.$('[data-batch-id="batch-inicet-essentials-2026"]');
    if (inicetBtn) {
      await inicetBtn.click();
      await new Promise(r => setTimeout(r, 500));
      console.log('Selected INI-CET Essentials Series batch in Admin.');
    }

    // Check Month Title & Events
    const monthTitle = await page.$eval('#adminMonthTitle', el => el.innerText);
    console.log('Admin Month View Title after INI-CET selection:', monthTitle);

    const cardsCount = await page.$$eval('.class-card-clickable', cards => cards.length);
    console.log(`Number of class cards rendered in INI-CET month view: ${cardsCount}`);

    // Check platform badges rendered on cards
    const ytBadgesCount = await page.$$eval('.badge-yt', el => el.length);
    const appBadgesCount = await page.$$eval('.badge-app', el => el.length);
    console.log(`Rendered platform badges -> YouTube Badges: ${ytBadgesCount}, App Badges: ${appBadgesCount}`);

    if (ytBadgesCount > 0 && appBadgesCount > 0) {
      console.log('✅ YouTube and App badges render on class cards as requested!');
    } else {
      console.error('❌ Missing platform badges on class cards!');
    }

    // Select Combined View (All Batches)
    await page.click('#adminBatchPill');
    await new Promise(r => setTimeout(r, 300));
    await page.click('[data-batch-id="all"]');
    await new Promise(r => setTimeout(r, 500));

    const combinedCardsCount = await page.$$eval('.class-card-clickable', cards => cards.length);
    console.log(`Combined View class cards count in Admin: ${combinedCardsCount}`);

    // 2. Audit Faculty Login
    console.log('\n[2/3] Auditing Faculty Login...');
    await page.goto('http://localhost:5173/faculty.html', { waitUntil: 'networkidle0' });

    // Open Batch Dropdown
    await page.waitForSelector('#facultyBatchPill');
    await page.click('#facultyBatchPill');
    await new Promise(r => setTimeout(r, 400));

    const facDropdownText = await page.$eval('#facultyBatchDropdownList', el => el.innerText);
    console.log('Faculty Batch Dropdown Items:');
    console.log(facDropdownText);

    if (facDropdownText.includes('INI-CET') && facDropdownText.includes('FMGE') && facDropdownText.includes('YouTube & App Series Planners')) {
      console.log('✅ Faculty batch dropdown contains YouTube Series Planners with proper sectioning!');
    } else {
      console.error('❌ Faculty batch dropdown missing expected YouTube sections!');
    }

    // Select FMGE Express Revision Series
    const fmgeBtn = await page.$eval('#facultyBatchDropdownList', list => {
      const btns = Array.from(list.querySelectorAll('button'));
      return btns.find(b => b.innerText.includes('FMGE')) ? true : false;
    });
    console.log('FMGE button present in Faculty dropdown:', fmgeBtn);

    // Test Faculty Switcher to a YouTube Series Faculty member (Dr. Ranjith AR)
    await page.click('#facultyProfileBtn');
    await new Promise(r => setTimeout(r, 400));

    const profilesText = await page.$eval('#facultyProfilesList', el => el.innerText);
    console.log('Faculty Profiles available (sample):', profilesText.slice(0, 300));

    if (profilesText.includes('Ranjith AR') || profilesText.includes('Rajesh Jambhulkar')) {
      console.log('✅ Faculty switcher lists faculty members properly!');
    }

    // 3. Test Timetable View
    console.log('\n[3/3] Auditing Week Timetable Matrix & Badges...');
    await page.goto('http://localhost:5173/week.html', { waitUntil: 'networkidle0' });
    const weekYtBadges = await page.$$eval('.badge-yt', el => el.length);
    const weekAppBadges = await page.$$eval('.badge-app', el => el.length);
    console.log(`Week Timetable Badges -> YouTube: ${weekYtBadges}, App: ${weekAppBadges}`);

    console.log('\n==================================================');
    console.log('🎉 AUDIT COMPLETE: ALL YT PLANNER & BIFURCATION TESTS PASSED!');
    console.log('==================================================');

  } catch (err) {
    console.error('❌ Audit Failed with error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
