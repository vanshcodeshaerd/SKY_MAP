const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;

export function headingToCardinal(headingDeg: number): string {
  const norm = ((headingDeg % 360) + 360) % 360;
  return DIRS[Math.round(norm / 45) % 8];
}

export function updateCompassHud(headingDeg: number): void {
  const container = document.getElementById('compass-strip');
  const readout = document.getElementById('compass-heading');
  if (!container || !readout) return;

  const norm = ((headingDeg % 360) + 360) % 360;
  const activeDir = headingToCardinal(norm);
  readout.textContent = `${norm.toFixed(0)}° ${activeDir}`;

  const items = container.querySelectorAll<HTMLElement>('[data-dir]');
  items.forEach((el) => {
    const isActive = el.dataset.dir === activeDir;
    el.classList.toggle('text-primary-container', isActive);
    el.classList.toggle('font-bold', isActive);
    el.classList.toggle('scale-110', isActive);
    el.classList.toggle('text-on-surface-variant/60', !isActive);
  });
}
