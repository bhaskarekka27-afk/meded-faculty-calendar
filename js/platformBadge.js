/**
 * PW MedEd - Platform Delivery & Batch Badge Helper
 * Renders visual bifurcation badges for YouTube (YT) and App (Mobile).
 */

export function getBatchTag(batchName) {
  if (!batchName) return '';
  const n = batchName.toLowerCase();
  if (n.includes('radiolink')) return "RadioLink '26";
  if (n.includes('survival')) return "BDS Survival '26";
  if (n.includes('bds') && n.includes('prarambh')) return "Prarambh BDS '26";
  if (n.includes('bds') && n.includes('nishchay')) return "Nishchay BDS '26";
  if (n.includes('marathon')) return "FMGE Marathon";
  if (n.includes('nishchay')) return "Nishchay '26";
  if (n.includes('prarambh')) return "Prarambh '26";
  if (n.includes('sushruta')) return "Sushruta '26";
  if (n.includes('ini-cet') || n.includes('inicet')) return "INI-CET '26";
  if (n.includes('fmge')) return "FMGE '26";
  return batchName.length > 18 ? `${batchName.slice(0, 16)}...` : batchName;
}

export function renderBatchBadge(batchName) {
  const tag = getBatchTag(batchName);
  if (!tag) return '';

  let colorClasses = 'bg-[#f4efe6] text-[#576058] border-[#ded5c6]';
  const n = (batchName || '').toLowerCase();
  if (n.includes('radiolink')) {
    colorClasses = 'bg-[#fef2f2] text-[#dc2626] border-[#fecaca]';
  } else if (n.includes('survival')) {
    colorClasses = 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]';
  } else if (n.includes('bds') && n.includes('prarambh')) {
    colorClasses = 'bg-[#eef2ff] text-[#4f46e5] border-[#c7d2fe]';
  } else if (n.includes('bds') && n.includes('nishchay')) {
    colorClasses = 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]';
  } else if (n.includes('marathon')) {
    colorClasses = 'bg-[#fdf2f8] text-[#db2777] border-[#fbcfe8]';
  } else if (n.includes('nishchay')) {
    colorClasses = 'bg-[#f0f9ff] text-[#0369a1] border-[#bae6fd]';
  } else if (n.includes('prarambh')) {
    colorClasses = 'bg-[#eef4f0] text-[#3b6347] border-[#cde0d3]';
  } else if (n.includes('sushruta')) {
    colorClasses = 'bg-[#fbf3ec] text-[#c26d3e] border-[#eed9cc]';
  } else if (n.includes('ini-cet') || n.includes('inicet')) {
    colorClasses = 'bg-[#f3eef8] text-[#6b3ba7] border-[#dfd0f0]';
  } else if (n.includes('fmge')) {
    colorClasses = 'bg-[#eaf4f8] text-[#1c6e8c] border-[#c8e2ec]';
  }

  // Long custom batch names are cut by CSS (not mid-word dots) so the platform icons beside it always fit
  const known = /Prarambh|Sushruta|INI-CET|INICET|FMGE|Nishchay|RadioLink|Survival|Marathon/i.test(batchName);
  const label = known ? tag : batchName;
  const safe = String(label).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const title = String(batchName).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  return `<span class="inline-block max-w-[96px] truncate align-middle text-[9px] font-bold px-1.5 py-0.2 rounded border ${colorClasses}" title="${title}">${safe}</span>`;
}

export function renderPlatformBadges(ev, options = { compact: false }) {
  if (!ev) return '';

  const isYt = Boolean(
    ev.isYoutube ||
    ev.platform === 'youtube' ||
    ev.platform === 'youtube_app'
  );

  const isApp = Boolean(
    ev.isApp ||
    ev.platform === 'app' ||
    ev.platform === 'youtube_app'
  );

  const ytLogoSvg = `<svg class="w-2.5 h-2.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
  const appLogoSvg = `<span class="material-symbols-outlined text-[12px] text-[#2d4d37] shrink-0 leading-none">smartphone</span>`;

  if (isYt && isApp) {
    // Both platforms: icons only (no text) so the badge stays small on tight cards
    const size = options.compact ? 'w-[18px] h-[18px]' : 'w-6 h-6';
    const ytBig = ytLogoSvg.replace('w-2.5 h-2.5', options.compact ? 'w-3 h-3' : 'w-3.5 h-3.5');
    const appBig = appLogoSvg.replace('text-[12px]', options.compact ? 'text-[13px]' : 'text-[16px]');
    return `
      <span class="inline-flex items-center gap-1 shrink-0" title="Delivered Live on YouTube Channel &amp; PW MedEd Mobile App">
        <span class="inline-flex items-center justify-center ${size} rounded-md bg-[#feeeed] text-[#e02828] border border-[#fca5a5] badge-yt" aria-label="YouTube">${ytBig}</span>
        <span class="inline-flex items-center justify-center ${size} rounded-md bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3] badge-app" aria-label="PW MedEd App">${appBig}</span>
      </span>
    `;
  }

  // YouTube-only
  if (isYt) {
    if (options.compact) {
      return `
        <span class="inline-flex items-center gap-0.5 text-[8.5px] font-extrabold px-1.5 py-0.2 rounded bg-[#feeeed] text-[#e02828] border border-[#fca5a5] shrink-0 badge-yt" title="Delivered Live on YouTube Channel">
          ${ytLogoSvg} YT
        </span>
      `;
    }
    return `
      <span class="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-[#feeeed] text-[#e02828] border border-[#fca5a5] shrink-0 badge-yt" title="Delivered Live on YouTube Channel">
        ${ytLogoSvg} YouTube
      </span>
    `;
  }

  // App-only
  if (options.compact) {
    return `
      <span class="inline-flex items-center gap-0.5 text-[8.5px] font-extrabold px-1.5 py-0.2 rounded bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3] shrink-0 badge-app" title="Delivered Live on PW MedEd Mobile App">
        ${appLogoSvg} App
      </span>
    `;
  }
  return `
    <span class="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3] shrink-0 badge-app" title="Delivered Live on PW MedEd Mobile App">
      ${appLogoSvg} App (Mobile)
    </span>
  `;
}

export function getDeliveryPlatformText(evOrBatch) {
  if (!evOrBatch) return 'PW MedEd Mobile App';
  const isYt = Boolean(
    evOrBatch.isYoutube ||
    evOrBatch.platform === 'youtube' ||
    evOrBatch.platform === 'youtube_app'
  );
  const isApp = Boolean(
    evOrBatch.isApp ||
    evOrBatch.platform === 'app' ||
    evOrBatch.platform === 'youtube_app'
  );

  if (isYt && isApp) {
    return 'Live on PW MedEd App & YouTube';
  }
  if (isYt) {
    return 'Live on YouTube Channel';
  }
  return 'Live on PW MedEd Mobile App';
}
