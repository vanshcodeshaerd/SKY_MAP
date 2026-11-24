import type { ConstellationMeta, Star } from '../data/types.ts';
import { NAKED_EYE_PLANETS, type PlanetName } from '../planets.ts';

export interface SearchCallbacks {
  onSelectConstellation: (conId: string) => void;
  onSelectPlanet: (planet: PlanetName | 'Sun' | 'Moon') => void;
}

export function initSearchPanel(
  constellations: ConstellationMeta[],
  stars: Star[],
  callbacks: SearchCallbacks
): void {
  const input = document.getElementById('sky-search-input') as HTMLInputElement | null;
  const resultsEl = document.getElementById('sky-search-results');
  const toggleBtn = document.getElementById('btn-search-toggle');
  const closeBtn = document.getElementById('search-panel-close');
  const panel = document.getElementById('search-panel');

  if (!input || !resultsEl) return;

  toggleBtn?.addEventListener('click', () => {
    document.getElementById('layer-drawer')?.classList.add('hidden');
    panel?.classList.toggle('hidden');
    if (!panel?.classList.contains('hidden')) {
      input.focus();
      renderResults(input.value);
    }
  });
  closeBtn?.addEventListener('click', () => panel?.classList.add('hidden'));

  const renderResults = (q: string) => {
    const query = q.trim().toLowerCase();
    resultsEl.innerHTML = '';

    const planetMatches = (['Sun', 'Moon', ...NAKED_EYE_PLANETS] as const).filter((p) =>
      !query || p.toLowerCase().includes(query)
    );
    for (const p of planetMatches.slice(0, query ? 7 : 3)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-primary-container/20 text-amber-300 flex justify-between items-center transition-colors';
      btn.innerHTML = `<span>🪐 ${p}</span><span class="text-[10px] opacity-70">Solar System</span>`;
      btn.addEventListener('click', () => {
        callbacks.onSelectPlanet(p);
        panel?.classList.add('hidden');
      });
      resultsEl.appendChild(btn);
    }

    const conMatches = constellations
      .filter(
        (c) =>
          !query ||
          c.nameLatin.toLowerCase().includes(query) ||
          c.nameEnglish.toLowerCase().includes(query) ||
          c.abbreviation.toLowerCase().includes(query) ||
          c.principalStars?.some((ps) => ps.toLowerCase().includes(query))
      )
      .slice(0, query ? 10 : 6);

    for (const c of conMatches) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className =
        'w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-primary-container/20 text-on-surface flex justify-between items-center transition-colors';
      btn.innerHTML = `<span>✦ ${c.nameLatin} <span class="text-on-surface-variant">(${c.nameEnglish})</span></span><span class="text-[10px] text-primary-container font-mono">${c.abbreviation}</span>`;
      btn.addEventListener('click', () => {
        callbacks.onSelectConstellation(c.id);
        panel?.classList.add('hidden');
      });
      resultsEl.appendChild(btn);
    }

    if (query) {
      const starMatches = stars
        .filter((s) => s.name && s.name.toLowerCase().includes(query) && s.constellationId)
        .slice(0, 5);
      for (const s of starMatches) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className =
          'w-full text-left px-2.5 py-1.5 text-xs rounded-lg hover:bg-primary-container/20 text-cyan-200 flex justify-between items-center transition-colors';
        btn.innerHTML = `<span>★ ${s.name}</span><span class="text-[10px] opacity-75">in ${s.constellationId}</span>`;
        btn.addEventListener('click', () => {
          if (s.constellationId) callbacks.onSelectConstellation(s.constellationId);
          panel?.classList.add('hidden');
        });
        resultsEl.appendChild(btn);
      }
    }
  };

  input.addEventListener('input', () => renderResults(input.value));
}
