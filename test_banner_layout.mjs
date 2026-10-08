import assert from 'assert';
const c = await import('./js/sheetConnector.js');
const q = s => '"' + s.replace(/"/g,'""') + '"';
const body = [
 ['Thursday, October 8, 2026','Day 1','Dr. Aakash + Samakshi','Welcome to the world of BDS\nWhat lies ahead ??','6:00 PM to 7:00 PM'],
 ['','','','','' ],
 ['Friday, October 9, 2026','Day 2','Dr. Anusha Ma\'am + Malvika','Introduction to Path & Micro','6:00 PM to 7:00 PM'],
 ['','','','Doctor patient communication & soft skills',''],
 [],
 ['Saturday, October 10, 2026','Day 3','Dr. Jyoti Ma\'am + Siddharth','Introduction to Physiology','6:00 PM to 7:00 PM'],
 ['','','','Time Mangament and study strategy',''],
 [],
 ['Sunday, October 11, 2026','Day 4','Dr. Rajesh Sir','Introduction to Biochemistry\nHow to start your pg prep in 1st year','6:00 PM to 7:00 PM'],
];
const toCsv = rows => rows.map(r => { const a=[...r]; while(a.length<5)a.push(''); return a.map(q).join(','); }).join('\n');
const hdr = ['Date','Day','Faculty Name','Topic','Time'];
const variants = {
  fullBanner: [['BDS Survival Guide 2026 Batch','','','',''],['Live on PW Meded APP and PW MedEd BDS YT','','','',''],['Time - 6:00 PM to 7:00 PM','','','',''],hdr,...body],
  fusedLabel: [['BDS Survival Guide 2026 Batch Live on PW Meded APP and PW MedEd BDS YT Time - 6:00 PM to 7:00 PM Date','Day','Faculty Name','Topic','Time'],...body],
  oneBannerRow: [['BDS Survival Guide 2026 Batch Live on PW Meded APP and PW MedEd BDS YT','','','',''],hdr,...body],
};
for (const [name, rows] of Object.entries(variants)) {
  const b = c.processRawCSVToBatch(toCsv(rows), 'bds', 'https://docs.google.com/spreadsheets/d/X/edit', 'Lecture planner');
  const dates = b.events.map(e => e.isoDate);
  assert.ok(dates.includes('2026-10-11'), name+' missing 11th');
  assert.strictEqual(b.platform, 'youtube_app', name);
  assert.strictEqual(b.events.length, 6, name+' '+b.events.length);
  const e = b.events.find(e=>e.isoDate==='2026-10-09' && /communication/.test(e.topic));
  assert.strictEqual(e.faculty, "Dr. Anusha Ma'am + Malvika"); assert.strictEqual(e.timings,'6:00 PM to 7:00 PM');
  assert.ok(b.events.every(e=>e.isYoutube&&e.isApp&&e.eventType==='class'));
  console.log(name, 'ok', b.name, '|', b.events.map(e=>e.isoDate.slice(8)+':'+e.topic.slice(0,22)).join(' ; '));
}
// legacy layout untouched
const legacy = 'Prarambh 2026 Lecture Planner,Faculty,Subject,Time\nThursday, October 15, 2026,Dr X,Anatomy,7:00pm to 9:00pm\n';
const lb = c.processRawCSVToBatch(legacy,'l','u'); assert.strictEqual(lb.platform,'app'); assert.strictEqual(lb.events.length,1); console.log('legacy ok');
// Faculty is read from the "Faculty Name" column wherever it is
const moved = 'Prarambh 2026,Subject,Faculty Name,Timings\n"Thursday, October 15, 2026",Anatomy,Dr. Meera Rao,7:00pm to 9:00pm\n';
const mb = c.processRawCSVToBatch(moved,'m','u'); assert.strictEqual(mb.events[0].faculty,'Dr. Meera Rao'); console.log('faculty-name column ok');
process.exit(0);
