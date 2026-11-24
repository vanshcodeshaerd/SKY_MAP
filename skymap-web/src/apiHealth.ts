/** Optional DE421 API status chip (AR works offline). */

const bases = [
  import.meta.env.VITE_API_BASE_URL
    ? `${String(import.meta.env.VITE_API_BASE_URL).replace(/\/$/, '')}/api`
    : '/api',
];

export function startApiHealthChip(el: HTMLElement) {
  const paint = (online: boolean, detail: string) => {
    el.textContent = online ? 'DE421' : 'Local';
    el.title = online
      ? 'Backend online (optional benchmark)'
      : `Offline AR ephemeris — ${detail}`;
    el.style.background = online ? 'rgba(16,185,129,0.25)' : 'rgba(100,116,139,0.35)';
  };

  const probe = async () => {
    for (const base of bases) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const res = await fetch(`${base}/health`, { signal: ctrl.signal });
        clearTimeout(t);
        if (res.ok) {
          const j = await res.json();
          if (j?.status === 'online') {
            paint(true, '');
            return;
          }
        }
      } catch {
        /* try next */
      }
    }
    paint(false, 'using astronomy-engine');
  };

  paint(false, 'checking…');
  probe();
  window.setInterval(probe, 12000);
}