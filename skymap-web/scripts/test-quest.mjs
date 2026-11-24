/**
 * Connect-the-dots quest + catalog play-readiness.
 * Run: tsx scripts/test-quest.mjs
 *
 * Manual phone QA (not automated):
 * - BOTH / PLANETS / STARS overlays never leak
 * - Calibration: hold a bright star in the reticle, overlay should snap
 * - Play: complete one figure in AR and in Sky 360°
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { visibilityFromMode } from '../src/render/types.ts';
import {
  applyStarLock,
  buildQuestEdges,
  createQuest,
  edgeKey,
  nudgeToAlignAzimuth,
  pickQuestConstellation,
  tryConnect,
  wrap180,
} from '../src/game/constellationQuest.ts';
import { catalogPlayReady, validateConstellationGraph } from '../src/catalog.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../src/data');
const stars = JSON.parse(fs.readFileSync(path.join(dataDir, 'stars.advanced.json'), 'utf-8'));
const lines = JSON.parse(fs.readFileSync(path.join(dataDir, 'constellations.lines.json'), 'utf-8'));
const meta = JSON.parse(fs.readFileSync(path.join(dataDir, 'constellations.meta.json'), 'utf-8'));

const errors = validateConstellationGraph(stars, lines);
assert.equal(errors.length, 0, errors.join('\n'));
assert.equal(meta.length, 88);
assert.equal(
  catalogPlayReady({
    stars,
    constellations: meta,
    lines,
    dso: [],
    loadTimeMs: 0,
    graphErrors: errors,
  }),
  true
);
console.log('✓ Catalog play-ready (88 IAU, 0 dangling line refs)');

const uma = buildQuestEdges(lines, 'UMa');
assert.ok(uma.length >= 2, 'Ursa Major should have a stick figure');
const k = edgeKey(uma[0].a, uma[0].b);
assert.equal(k, edgeKey(uma[0].b, uma[0].a));
const first = tryConnect(uma[0].a, uma[0].b, uma, new Set());
assert.equal(first.ok, true);
const dup = tryConnect(uma[0].a, uma[0].b, uma, new Set([first.key]));
assert.equal(dup.ok, false);
const stranger = tryConnect(uma[0].a, 'hip-not-a-neighbor', uma, new Set());
assert.equal(stranger.ok, false);
console.log('✓ Undirected catalog edges (connect / reject / no double-count)');

const quest = createQuest('UMa', lines);
assert.ok(quest);
const lockA = applyStarLock(quest, uma[0].a);
assert.equal(lockA.completedKey, null);
const lockB = applyStarLock(quest, uma[0].b);
assert.ok(lockB.completedKey);
const lockB2 = applyStarLock(quest, uma[0].b);
assert.equal(lockB2.completedKey, null, 'same star cannot complete two edges in one lock');
console.log('✓ Quest lock completes at most one unused edge');

assert.equal(wrap180(190), -170);
assert.ok(Math.abs(nudgeToAlignAzimuth(90, 80, 0) - 10) < 1e-6);
assert.ok(Math.abs(nudgeToAlignAzimuth(10, 350, 0) - 20) < 1e-6);
console.log('✓ Calibration azimuth align math');

const centersLow = new Map();
for (const m of meta) centersLow.set(m.id, { ra: 0, dec: -85 });
const indoor = pickQuestConstellation(meta, lines, centersLow, 40, -118, new Date('2026-06-15T20:00:00Z'));
assert.ok(indoor);
assert.equal(indoor.aboveHorizon, false);
console.log('✓ Below-horizon pick still returns a figure (planetarium fallback)');

const visP = visibilityFromMode('PLANETS');
const visS = visibilityFromMode('CONSTELLATIONS');
assert.equal(visP.stars || visP.constellationLines, false);
assert.equal(visS.planets, false);
console.log('✓ Mode matrix: PLANETS has no stars; STARS has no planets');

console.log('✓ Quest suite passed');
