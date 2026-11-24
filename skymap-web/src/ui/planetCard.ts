import type { PlanetDetails } from '../planets.ts';

export function showPlanetCard(details: PlanetDetails | null, onClose?: () => void): void {
  const card = document.getElementById('planet-card');
  const title = document.getElementById('planet-title');
  const body = document.getElementById('planet-body');
  if (!card || !title || !body) return;

  if (!details) {
    card.classList.add('hidden');
    return;
  }

  title.textContent = `${details.name} · ${details.type}`;
  body.innerHTML = `
    <div class="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] mb-2">
      <div><span class="text-on-surface-variant">Altitude:</span> <span class="text-primary-container">${details.altitude >= 0 ? '+' : ''}${details.altitude.toFixed(1)}°</span></div>
      <div><span class="text-on-surface-variant">Azimuth:</span> <span class="text-primary-container">${details.azimuth.toFixed(1)}°</span></div>
      <div><span class="text-on-surface-variant">Distance:</span> <span class="text-on-surface">${details.distanceAU.toFixed(3)} AU</span></div>
      <div><span class="text-on-surface-variant">Mag (V):</span> <span class="text-on-surface">${details.magnitude.toFixed(2)}</span></div>
      <div><span class="text-on-surface-variant">Ang. Diam:</span> <span class="text-on-surface">${details.angularDiameterArcsec.toFixed(1)}"</span></div>
      <div><span class="text-on-surface-variant">Status:</span> <span class="${details.visible ? 'text-emerald-400' : 'text-amber-400'}">${details.visible ? 'Visible' : 'Below Horizon'}</span></div>
    </div>
    <div class="text-[11px] text-on-surface-variant mb-2">
      <b>Rise:</b> ${details.riseTime} · <b>Transit:</b> ${details.transitTime} · <b>Set:</b> ${details.setTime}
    </div>
    <div class="text-[11px] text-on-surface-variant">${details.facts}</div>
    <button id="planet-card-close" type="button" class="mt-2 text-[10px] px-2 py-0.5 border border-primary-container/30 rounded text-primary-container">CLOSE</button>
  `;

  document.getElementById('planet-card-close')?.addEventListener('click', () => {
    card.classList.add('hidden');
    onClose?.();
  });

  card.classList.remove('hidden');
}
