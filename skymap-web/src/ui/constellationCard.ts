import type { ConstellationMeta, Star } from '../data/types.ts';
import { getConstellationHistory, IAU_STANDARDIZATION_NOTE } from '../data/constellationHistory.ts';
import type { NextConstellationSuggestion, RecognitionResult } from '../recognition.ts';

export interface ConstellationCardOptions {
  conId: string | null;
  meta: ConstellationMeta[];
  stars: Star[];
  isLocked?: boolean;
  recognition?: {
    confidence: number;
    status: RecognitionResult['status'];
    alt: number;
    az: number;
  };
  nextSuggestions?: NextConstellationSuggestion[];
  onSelectNext?: (conId: string) => void;
  onUnlock?: () => void;
  onClose?: () => void;
}

let lastRenderedKey = '';

export function showConstellationCard(opts: ConstellationCardOptions): void {
  const {
    conId,
    meta,
    stars,
    isLocked = false,
    recognition,
    nextSuggestions = [],
    onSelectNext,
    onUnlock,
    onClose,
  } = opts;

  const card = document.getElementById('constellation-card');
  const title = document.getElementById('constellation-title');
  const body = document.getElementById('constellation-body');
  const closeBtn = document.getElementById('constellation-card-close');
  if (!card || !title || !body) return;

  if (!conId) {
    card.classList.add('hidden');
    return;
  }

  closeBtn?.addEventListener('click', () => {
    card.classList.add('hidden');
    onClose?.();
  }, { once: true });

  const renderKey = `${conId}|${isLocked}|${recognition?.status}|${Math.round((recognition?.alt ?? 0) / 2)}|${nextSuggestions.map((n) => n.id).join(',')}`;
  if (renderKey === lastRenderedKey && !card.classList.contains('hidden')) {
    return;
  }
  lastRenderedKey = renderKey;

  const m = meta.find(
    (c) =>
      c.id === conId ||
      c.abbreviation === conId ||
      c.id.toLowerCase() === conId.toLowerCase() ||
      c.abbreviation.toLowerCase() === conId.toLowerCase()
  );

  const hist = getConstellationHistory(m?.id ?? conId, m?.mythology);
  const abbrev = m?.abbreviation ?? conId.toUpperCase();

  title.textContent = m ? `${m.nameLatin} · ${m.nameEnglish} (${abbrev})` : conId;

  const mainStars = stars
    .filter(
      (s) =>
        s.constellationId &&
        s.constellationId.toLowerCase() === (m?.id ?? conId).toLowerCase()
    )
    .sort((a, b) => a.magnitude - b.magnitude)
    .slice(0, 4);

  const starRows = mainStars
    .map((s) => {
      const label = s.name || s.bayer || `HIP ${s.hip ?? s.id}`;
      const spec = s.spectralType ? ` · ${s.spectralType}` : '';
      const dist = s.distanceLightYears ? ` · ${s.distanceLightYears} ly` : '';
      return `<div class="flex justify-between text-[11px] py-0.5 border-b border-white/5 last:border-0"><span>★ ${label}</span><span class="text-on-surface-variant">V=${s.magnitude.toFixed(1)}${spec}${dist}</span></div>`;
    })
    .join('');

  const statusBadge = recognition
    ? recognition.status === 'aligned-stars'
      ? `<span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">Aligned Stars · ${Math.round(recognition.confidence * 100)}%</span>`
      : `<span class="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px]">Region Predicted · ${Math.round(recognition.confidence * 100)}%</span>`
    : '';

  const unlockBtnHtml = isLocked
    ? `<button id="con-unlock-btn" type="button" class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 text-[10px] hover:bg-amber-500/30">Auto-Detect</button>`
    : '';

  const posText = recognition
    ? `Alt ${recognition.alt >= 0 ? '+' : ''}${recognition.alt.toFixed(1)}° · Az ${recognition.az.toFixed(1)}° · ${
        recognition.alt > 0 ? 'Visible' : 'Below horizon'
      }`
    : '';

  body.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-1.5 mb-2">
      ${statusBadge}
      ${unlockBtnHtml}
    </div>
    ${posText ? `<div class="text-[11px] text-on-surface/90 mb-2 font-mono">${posText}</div>` : ''}
    <details open class="mb-2 group">
      <summary class="cursor-pointer text-[10px] uppercase tracking-wider text-primary-container/85 font-semibold select-none">Origin &amp; Age</summary>
      <div class="text-[11px] text-on-surface-variant mt-1 leading-relaxed">${hist.origin}</div>
      <div class="text-[11px] text-on-surface-variant mt-1 leading-relaxed"><b>Age:</b> ${hist.culturalAge}</div>
      <div class="text-[10px] text-on-surface-variant/75 mt-1 leading-snug">${IAU_STANDARDIZATION_NOTE}</div>
    </details>
    <details open class="mb-2">
      <summary class="cursor-pointer text-[10px] uppercase tracking-wider text-primary-container/85 font-semibold select-none">Main Stars</summary>
      <div class="mt-1">${starRows || '<div class="text-[11px] text-on-surface-variant">Cataloged stars loaded</div>'}</div>
    </details>
    <details class="mb-2">
      <summary class="cursor-pointer text-[10px] uppercase tracking-wider text-primary-container/85 font-semibold select-none">Mythology &amp; Visibility</summary>
      <div class="text-[11px] text-on-surface-variant mt-1 leading-relaxed">${hist.mythology}</div>
      <div class="text-[10px] text-primary-container/80 mt-1">Best: ${hist.bestMonths} (${hist.seasonalVisibility})</div>
    </details>
    <div id="next-constellations-box" class="mt-2 pt-2 border-t border-primary-container/20"></div>
  `;

  document.getElementById('con-unlock-btn')?.addEventListener('click', () => {
    lastRenderedKey = '';
    onUnlock?.();
  });

  const nextBox = document.getElementById('next-constellations-box');
  if (nextBox && nextSuggestions.length > 0) {
    const labelMap: Record<string, string> = {
      NEXT_IN_VIEW: 'Next in View',
      NEXT_VISIBLE: 'Next Visible',
      NEAREST: 'Nearest',
    };
    nextBox.innerHTML = `<div class="text-[10px] uppercase tracking-wider text-primary-container/85 font-semibold mb-1.5">Next Constellation</div>`;
    for (const s of nextSuggestions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'w-full text-left text-[11px] px-2 py-1 mb-1 rounded-md bg-surface-container/70 hover:bg-primary-container/20 border border-primary-container/20 flex justify-between items-center transition-colors';
      btn.innerHTML = `<span><b>${labelMap[s.kind]}:</b> ${s.name}</span><span class="text-primary-container font-mono">${s.directionLabel} · ${s.angularDistanceDeg.toFixed(0)}°</span>`;
      btn.addEventListener('click', () => onSelectNext?.(s.id));
      nextBox.appendChild(btn);
    }
  }

  card.classList.remove('hidden');
}

export function hideConstellationCard(): void {
  lastRenderedKey = '';
  document.getElementById('constellation-card')?.classList.add('hidden');
}
