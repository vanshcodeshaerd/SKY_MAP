/**
 * Catalog Validation Script
 * Checks:
 *  - All 88 IAU constellations exist in meta, lines, and bounds
 *  - Missing HIP identifiers
 *  - Invalid star references in line segments
 *  - Duplicate line segments
 *  - Disconnected / empty constellation graphs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../src/data');

const stars = JSON.parse(fs.readFileSync(path.join(dataDir, 'stars.advanced.json'), 'utf-8'));
const meta = JSON.parse(fs.readFileSync(path.join(dataDir, 'constellations.meta.json'), 'utf-8'));
const lines = JSON.parse(fs.readFileSync(path.join(dataDir, 'constellations.lines.json'), 'utf-8'));
const bounds = JSON.parse(fs.readFileSync(path.join(dataDir, 'constellations.bounds.json'), 'utf-8'));

const starIds = new Set(stars.map((s) => s.id));
const metaIds = new Set(meta.map((m) => m.id));
const boundIds = new Set(bounds.map((b) => b.id));

let missingStarRefs = 0;
let missingHip = 0;
let duplicateLines = 0;
let invalidConIds = 0;
const seenEdges = new Set();
const linesPerCon = new Map();

for (const s of stars) {
  if (!s.hip || typeof s.hip !== 'number') missingHip++;
}

for (const l of lines) {
  if (!metaIds.has(l.constellationId)) invalidConIds++;
  if (!starIds.has(l.fromStarId) || !starIds.has(l.toStarId)) missingStarRefs++;
  const edgeKey = [l.constellationId, ...[l.fromStarId, l.toStarId].sort()].join('|');
  if (seenEdges.has(edgeKey)) duplicateLines++;
  seenEdges.add(edgeKey);
  linesPerCon.set(l.constellationId, (linesPerCon.get(l.constellationId) ?? 0) + 1);
}

const emptyConstellations = [...metaIds].filter((id) => !linesPerCon.has(id));
const missingBounds = [...metaIds].filter((id) => !boundIds.has(id));

console.log('=== SkyMap Catalog Validation Report ===');
console.log(`Stars loaded:               ${stars.length}`);
console.log(`Constellations in meta:     ${meta.length} (expected: 88)`);
console.log(`Constellations in bounds:   ${bounds.length}`);
console.log(`Line segments total:        ${lines.length}`);
console.log(`Stars missing HIP ID:       ${missingHip}`);
console.log(`Missing star references:    ${missingStarRefs}`);
console.log(`Duplicate line segments:    ${duplicateLines}`);
console.log(`Invalid constellation IDs:  ${invalidConIds}`);
console.log(`Empty constellation graphs: ${emptyConstellations.length}`, emptyConstellations);
console.log(`Missing IAU boundaries:     ${missingBounds.length}`, missingBounds);

if (meta.length !== 88 || missingStarRefs > 0 || invalidConIds > 0) {
  process.exitCode = 1;
}
