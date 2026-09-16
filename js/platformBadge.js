/**
 * PW MedEd - Platform Delivery & Batch Badge Helper
 * Renders visual bifurcation badges for YouTube (YT) and App (Mobile).
 */

export function getBatchTag(batchName) {
  if (!batchName) return '';
  if (batchName.includes('Prarambh')) return "Prarambh '26";
  if (batchName.includes('Sushruta')) return "Sushruta '26";
  if (batchName.includes('INI-CET') || batchName.includes('INICET')) return "INI-CET '26";
  if (batchName.includes('FMGE')) return "FMGE '26";
  return batchName.length > 18 ? `${batchName.slice(0, 16)}...` : batchName;
}

export function renderBatchBadge(batchName) {
  const tag = getBatchTag(batchName);
  if (!tag) return '';

  let colorClasses = 'bg-[#f4efe6] text-[#576058] border-[#ded5c6]';
  if (batchName.includes('Prarambh')) {
    colorClasses = 'bg-[#eef4f0] text-[#3b6347] border-[#cde0d3]';
  } else if (batchName.includes('Sushruta')) {
    colorClasses = 'bg-[#fbf3ec] text-[#c26d3e] border-[#eed9cc]';
  } else if (batchName.includes('INI-CET') || batchName.includes('INICET')) {
    colorClasses = 'bg-[#f3eef8] text-[#6b3ba7] border-[#dfd0f0]';
  } else if (batchName.includes('FMGE')) {
    colorClasses = 'bg-[#eaf4f8] text-[#1c6e8c] border-[#c8e2ec]';
  }

  return `<span class="text-[9px] font-bold px-1.5 py-0.2 rounded border ${colorClasses} shrink-0">${tag}</span>`;
}

export function renderPlatformBadges(ev, options = { compact: false }) {
  if (!ev) return '';

  const isYt = Boolean(
    ev.isYoutube ||
    ev.platform === 'youtube' ||
    ev.platform === 'youtube_app' ||
    (ev.batchName && (ev.batchName.includes('INI-CET') || ev.batchName.includes('INICET') || ev.batchName.includes('FMGE'))) ||
    (ev.name && (ev.name.includes('INI-CET') || ev.name.includes('INICET') || ev.name.includes('FMGE')))
  );

  const isYtOnly = Boolean(
    ev.platform === 'youtube' ||
    (ev.batchName && (ev.batchName.includes('INI-CET') || ev.batchName.includes('INICET') || ev.batchName.includes('FMGE'))) ||
    (ev.name && (ev.name.includes('INI-CET') || ev.name.includes('INICET') || ev.name.includes('FMGE')))
  );

  const isApp = Boolean(
    (ev.isApp || ev.platform === 'app' || ev.platform === 'youtube_app') && !isYtOnly
  );

  const ytLogoSvg = `<svg class="w-2.5 h-2.5 fill-current shrink-0" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
  const appLogoSvg = `<span class="material-symbols-outlined text-[12px] text-[#2d4d37] shrink-0 leading-none">smartphone</span>`;

  if (isYt && isApp) {
    if (options.compact) {
      return `
        <span class="inline-flex items-center gap-1 shrink-0" title="Delivered Live on YouTube Channel & PW MedEd Mobile App">
          <span class="inline-flex items-center gap-0.5 text-[8.5px] font-extrabold px-1.5 py-0.2 rounded bg-[#feeeed] text-[#e02828] border border-[#fca5a5] badge-yt">
            ${ytLogoSvg} YT
          </span>
          <span class="inline-flex items-center gap-0.5 text-[8.5px] font-extrabold px-1.5 py-0.2 rounded bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3] badge-app">
            ${appLogoSvg} App
          </span>
        </span>
      `;
    }
    return `
      <span class="inline-flex items-center gap-1.5 shrink-0" title="Delivered Live on YouTube Channel & PW MedEd Mobile App">
        <span class="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-[#feeeed] text-[#e02828] border border-[#fca5a5] badge-yt">
          ${ytLogoSvg} YouTube
        </span>
        <span class="inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md bg-[#eef4f0] text-[#2d4d37] border border-[#cde0d3] badge-app">
          ${appLogoSvg} App (Mobile)
        </span>
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
    evOrBatch.platform === 'youtube_app' ||
    (evOrBatch.batchName && (evOrBatch.batchName.includes('INI-CET') || evOrBatch.batchName.includes('FMGE'))) ||
    (evOrBatch.name && (evOrBatch.name.includes('INI-CET') || evOrBatch.name.includes('FMGE')))
  );

  if (isYt) {
    return 'Live on YouTube Channel';
  }
  return 'Live on PW MedEd Mobile App';
}
