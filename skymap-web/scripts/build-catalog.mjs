/**
 * Builds Hipparcos-based catalogs + IAU stick figures from d3-celestial (XHIP / IAU).
 * Run: node scripts/build-catalog.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '../src/data');

if (fs.existsSync(path.join(outDir, 'stars.advanced.json')) && !process.env.FORCE_FETCH) {
  console.log('Catalog files already exist in src/data. Skipping remote fetch.');
  process.exit(0);
}

const BASE = 'https://raw.githubusercontent.com/ofrohn/d3-celestial/master/data';

function lonToRa(lon) {
  return lon < 0 ? lon + 360 : lon;
}

function raToLon(ra) {
  const r = ((ra % 360) + 360) % 360;
  return r > 180 ? r - 360 : r;
}

function angularSep(ra1, dec1, ra2, dec2) {
  const d1 = (dec1 * Math.PI) / 180;
  const d2 = (dec2 * Math.PI) / 180;
  const dr = ((ra1 - ra2) * Math.PI) / 180;
  const c = Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(dr);
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

function pointInRing(ra, dec, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = yi > dec !== yj > dec && ra < ((xj - xi) * (dec - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

async function fetchJson(name) {
  const url = `${BASE}/${name}`;
  console.log('Fetching', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${name}: ${res.status}`);
  return res.json();
}

const [starsGeo, names, consGeo, linesGeo, boundsGeo] = await Promise.all([
  fetchJson('stars.6.json'),
  fetchJson('starnames.json'),
  fetchJson('constellations.json'),
  fetchJson('constellations.lines.json'),
  fetchJson('constellations.bounds.json'),
]);

const bounds = [];
for (const f of boundsGeo.features ?? []) {
  const id = f.id;
  const geom = f.geometry;
  const polys = [];
  if (!geom) continue;
  if (geom.type === 'Polygon') polys.push(geom.coordinates);
  if (geom.type === 'MultiPolygon') {
    for (const p of geom.coordinates) polys.push(p);
  }
  const ringsLon = [];
  for (const poly of polys) {
    for (const ring of poly) {
      ringsLon.push(ring.map(([lon, lat]) => [lon, lat]));
    }
  }
  bounds.push({ id, rings: ringsLon });
}

function constellationAt(ra, dec) {
  const lon = raToLon(ra);
  for (const b of bounds) {
    for (const ring of b.rings) {
      for (const shift of [0, 360, -360]) {
        const shifted = ring.map(([x, y]) => [x + shift, y]);
        if (pointInRing(lon, dec, shifted)) return b.id;
      }
    }
  }
  return null;
}

const stars = [];
for (const f of starsGeo.features ?? []) {
  const hip = Number(f.id);
  const [lon, lat] = f.geometry.coordinates;
  const ra = lonToRa(lon);
  const mag = Number(f.properties.mag);
  const nameRec = names[String(hip)] ?? names[hip];
  const proper = nameRec?.name ?? nameRec?.desig ?? undefined;
  stars.push({
    id: `hip${hip}`,
    hip,
    name: typeof proper === 'string' ? proper : proper?.[0],
    ra,
    dec: lat,
    magnitude: mag,
    colorIndex: f.properties.bv != null ? Number(f.properties.bv) : 0.6,
    bayer: nameRec?.bayer ?? nameRec?.b,
  });
}

function nearestStar(ra, dec) {
  let best = null;
  let bestD = 0.35;
  for (const s of stars) {
    const d = angularSep(ra, dec, s.ra, s.dec);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

const lines = [];
for (const f of linesGeo.features ?? []) {
  const conId = f.id;
  const parts = f.geometry?.coordinates ?? [];
  for (const line of parts) {
    for (let i = 0; i < line.length - 1; i++) {
      const a = nearestStar(lonToRa(line[i][0]), line[i][1]);
      const b = nearestStar(lonToRa(line[i + 1][0]), line[i + 1][1]);
        if (a && b && a.id !== b.id) {
        lines.push({ constellationId: conId, fromStarId: a.id, toStarId: b.id });
        a.constellationId = conId;
        b.constellationId = conId;
      }
    }
  }
}

for (const s of stars) {
  if (!s.constellationId) s.constellationId = constellationAt(s.ra, s.dec) ?? undefined;
}

const seen = new Set();
const uniqueLines = lines.filter((l) => {
  const k = `${l.constellationId}:${[l.fromStarId, l.toStarId].sort().join('-')}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

const meta = [];
const seenCon = new Set();
for (const f of consGeo.features ?? []) {
  if (seenCon.has(f.id)) continue;
  seenCon.add(f.id);
  const p = f.properties;
  meta.push({
    id: f.id,
    abbreviation: p.desig ?? f.id,
    nameLatin: p.la ?? p.name,
    nameEnglish: (p.en ?? p.name ?? '').replace(/\u2009/g, ' ').replace(/_/g, ' '),
    mythology: `${p.gen ?? ''} · IAU constellation`,
    principalStars: stars
      .filter((s) => s.constellationId === f.id && s.magnitude <= 2.5 && s.name)
      .slice(0, 6)
      .map((s) => s.name),
  });
}

const stages = {
  initial: stars.filter((s) => s.magnitude <= 3.5),
  intermediate: stars.filter((s) => s.magnitude <= 4.5),
  advanced: stars.filter((s) => s.magnitude <= 5.8),
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'stars.initial.json'), JSON.stringify(stages.initial));
fs.writeFileSync(path.join(outDir, 'stars.intermediate.json'), JSON.stringify(stages.intermediate));
fs.writeFileSync(path.join(outDir, 'stars.advanced.json'), JSON.stringify(stages.advanced));
fs.writeFileSync(path.join(outDir, 'constellations.lines.json'), JSON.stringify(uniqueLines));
fs.writeFileSync(path.join(outDir, 'constellations.meta.json'), JSON.stringify(meta));
fs.writeFileSync(path.join(outDir, 'constellations.bounds.json'), JSON.stringify(bounds));

console.log(
  `Catalog: ${stars.length} stars (adv ${stages.advanced.length}), ${uniqueLines.length} lines, ${meta.length} constellations, ${bounds.length} bounds`
);
