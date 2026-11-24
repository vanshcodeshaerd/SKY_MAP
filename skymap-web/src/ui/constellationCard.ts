import type { ConstellationMeta } from '../data/types.ts';
import type { Star } from '../data/types.ts';

export function showConstellationCard(
  conId: string | null,
  meta: ConstellationMeta[],
  nearbyStars: Star[]
): void {
  const card = document.getElementById('constellation-card');
  const title = document.getElementById('constellation-title');
  const body = document.getElementById('constellation-body');
  if (!card || !title || !body) return;
  if (!conId) {
    card.classList.add('hidden');
    return;
  }
  const m = meta.find(
    (c) =>
      c.id === conId ||
      c.abbreviation === conId ||
      c.id.toLowerCase() === conId.toLowerCase() ||
      c.abbreviation.toLowerCase() === conId.toLowerCase()
  );
  title.textContent = m ? `${m.nameLatin} (${m.nameEnglish})` : conId;
  const stars = nearbyStars
    .filter(
      (s) =>
        s.constellationId &&
        s.constellationId.toLowerCase() === conId.toLowerCase() &&
        s.magnitude < 3
    )
    .slice(0, 5)
    .map((s) => `${s.name ?? s.id} · ${s.distanceLightYears ? s.distanceLightYears + ' ly' : `V=${s.magnitude.toFixed(1)}`}`)
    .join('\n');
  body.textContent = [m?.mythology ?? 'IAU constellation', stars].filter(Boolean).join('\n\n');
  card.classList.remove('hidden');
}

export function hideConstellationCard(): void {
  document.getElementById('constellation-card')?.classList.add('hidden');
}