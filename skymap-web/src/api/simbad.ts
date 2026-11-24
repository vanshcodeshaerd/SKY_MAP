export interface SimbadHit {
  id: string;
  ra: number;
  dec: number;
  constellation: string | null;
  otype: string | null;
}

const cache = new Map<string, SimbadHit | null>();

function cacheKey(ra: number, dec: number): string {
  return `${ra.toFixed(2)},${dec.toFixed(2)}`;
}

/** Identify the object at ICRS RA/Dec via CDS SIMBAD TAP (no API key). */
export async function querySimbad(ra: number, dec: number, radiusDeg = 0.08): Promise<SimbadHit | null> {
  const key = cacheKey(ra, dec);
  if (cache.has(key)) return cache.get(key) ?? null;

  const adql = `SELECT TOP 1 main_id, ra, dec, otype, const FROM basic WHERE CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', ${ra.toFixed(5)}, ${dec.toFixed(5)}, ${radiusDeg}))=1`;
  const url =
    'https://simbad.cds.unistra.fr/simbad/sim-tap/sync?' +
    new URLSearchParams({
      REQUEST: 'doQuery',
      LANG: 'ADQL',
      FORMAT: 'json',
      QUERY: adql,
    });

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      cache.set(key, null);
      return null;
    }
    const json = (await res.json()) as {
      data?: (string | number | null)[][];
    };
    const row = json.data?.[0];
    if (!row) {
      cache.set(key, null);
      return null;
    }
    const hit: SimbadHit = {
      id: String(row[0] ?? ''),
      ra: Number(row[1]),
      dec: Number(row[2]),
      otype: row[3] != null ? String(row[3]) : null,
      constellation: row[4] != null ? String(row[4]) : null,
    };
    cache.set(key, hit);
    return hit;
  } catch {
    cache.set(key, null);
    return null;
  }
}