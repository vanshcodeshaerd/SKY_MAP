import type { ConstellationLine, ConstellationMeta, Star } from '../data/types.ts';
import { equatorialToHorizontal } from '../astronomy/fast.ts';
import { angularSeparationDeg } from '../astronomy/precision.ts';

export const QUEST_LOCK_RADIUS_DEG = 2.2;
export const QUEST_DWELL_MS = 600;
export const QUEST_HORIZON_ALT_DEG = 15;
export const QUEST_ALIGN_DWELL_MS = 800;
export const QUEST_ALIGN_RADIUS_DEG = 2.5;

/** Brighter, well-known stick figures for kids when they are above the horizon. */
export const KID_PREFERRED_IDS = [
  'UMa',
  'UMi',
  'Ori',
  'Cyg',
  'Leo',
  'Sco',
  'Cas',
  'Cru',
  'Tau',
  'Gem',
  'Aql',
  'Lyr',
  'CMa',
];

export interface QuestEdge {
  a: string;
  b: string;
  key: string;
}

export interface QuestRuntime {
  constellationId: string;
  edges: QuestEdge[];
  completed: Set<string>;
  lastLockedId: string | null;
  dwellId: string | null;
  dwellSince: number;
  hint: boolean;
  message: string;
  finished: boolean;
}

export function wrap180(deg: number): number {
  let d = deg;
  while (d < -180) d += 360;
  while (d > 180) d -= 360;
  return d;
}

export function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function buildQuestEdges(lines: ConstellationLine[], constellationId: string): QuestEdge[] {
  const id = constellationId.toLowerCase();
  const seen = new Set<string>();
  const edges: QuestEdge[] = [];
  for (const line of lines) {
    if (line.constellationId.toLowerCase() !== id) continue;
    const key = edgeKey(line.fromStarId, line.toStarId);
    if (seen.has(key)) continue;
    seen.add(key);
    edges.push({ a: line.fromStarId, b: line.toStarId, key });
  }
  return edges;
}

export function questStarIds(edges: QuestEdge[]): Set<string> {
  const ids = new Set<string>();
  for (const e of edges) {
    ids.add(e.a);
    ids.add(e.b);
  }
  return ids;
}

export function neighborsOf(starId: string, edges: QuestEdge[]): string[] {
  const out: string[] = [];
  for (const e of edges) {
    if (e.a === starId) out.push(e.b);
    else if (e.b === starId) out.push(e.a);
  }
  return out;
}

export function tryConnect(
  fromId: string,
  toId: string,
  edges: QuestEdge[],
  completed: Set<string>
): { ok: boolean; key?: string; reason: string } {
  if (fromId === toId) {
    return { ok: false, reason: 'Same star — find a neighbor.' };
  }
  const key = edgeKey(fromId, toId);
  if (completed.has(key)) {
    return { ok: false, reason: 'That line is already drawn.' };
  }
  const exists = edges.some((e) => e.key === key);
  if (!exists) {
    return { ok: false, reason: 'Try a neighbor star on this figure.' };
  }
  return { ok: true, key, reason: 'Line complete!' };
}

export function createQuest(constellationId: string, lines: ConstellationLine[]): QuestRuntime | null {
  const edges = buildQuestEdges(lines, constellationId);
  if (edges.length === 0) return null;
  return {
    constellationId,
    edges,
    completed: new Set(),
    lastLockedId: null,
    dwellId: null,
    dwellSince: 0,
    hint: false,
    message: 'Point at a bright star in the figure.',
    finished: false,
  };
}

export interface QuestPick {
  constellationId: string;
  altitude: number;
  aboveHorizon: boolean;
  edgeCount: number;
}

export function pickQuestConstellation(
  constellations: ConstellationMeta[],
  lines: ConstellationLine[],
  centers: Map<string, { ra: number; dec: number }>,
  lat: number,
  lon: number,
  date: Date,
  excludeIds: Set<string> = new Set()
): QuestPick | null {
  const preferred = new Set(KID_PREFERRED_IDS.map((x) => x.toLowerCase()));
  const scored: QuestPick[] = [];

  for (const meta of constellations) {
    if (excludeIds.has(meta.id.toLowerCase())) continue;
    const edges = buildQuestEdges(lines, meta.id);
    if (edges.length < 2) continue;
    const c = centers.get(meta.id);
    if (!c) continue;
    const hor = equatorialToHorizontal(c.ra, c.dec, lat, lon, date);
    scored.push({
      constellationId: meta.id,
      altitude: hor.altitude,
      aboveHorizon: hor.altitude >= QUEST_HORIZON_ALT_DEG,
      edgeCount: edges.length,
    });
  }

  if (scored.length === 0) return null;

  const rank = (p: QuestPick) => {
    const pref = preferred.has(p.constellationId.toLowerCase()) ? 0 : 1;
    const sky = p.aboveHorizon ? 0 : 2;
    return sky * 1000 + pref * 100 + p.edgeCount;
  };

  scored.sort((a, b) => rank(a) - rank(b) || b.altitude - a.altitude);
  const up = scored.filter((p) => p.aboveHorizon);
  return (up[0] ?? scored[0]) ?? null;
}

export function nearestStarInSet(
  stars: Star[],
  ids: Set<string>,
  aimRa: number,
  aimDec: number
): { star: Star; sep: number } | null {
  let best: Star | null = null;
  let bestSep = Infinity;
  for (const star of stars) {
    if (!ids.has(star.id)) continue;
    const sep = angularSeparationDeg(aimRa, aimDec, star.ra, star.dec);
    if (sep < bestSep) {
      bestSep = sep;
      best = star;
    }
  }
  return best ? { star: best, sep: bestSep } : null;
}

export interface QuestTickResult {
  lockedId: string | null;
  completedKey: string | null;
  justFinished: boolean;
}

/**
 * Dwell-lock a quest star near boresight. Resets if the reticle leaves the star.
 * Completes at most one unused catalog edge per lock.
 */
export function tickQuestDwell(
  quest: QuestRuntime,
  nearest: { star: Star; sep: number } | null,
  starOnScreen: boolean,
  nowMs: number
): QuestTickResult {
  const none: QuestTickResult = { lockedId: null, completedKey: null, justFinished: false };
  if (quest.finished) return none;

  const inLock =
    nearest &&
    starOnScreen &&
    nearest.sep <= QUEST_LOCK_RADIUS_DEG &&
    nearest.star.id !== quest.lastLockedId;

  if (!inLock || !nearest) {
    quest.dwellId = null;
    quest.dwellSince = 0;
    return none;
  }

  if (quest.dwellId !== nearest.star.id) {
    quest.dwellId = nearest.star.id;
    quest.dwellSince = nowMs;
    return none;
  }

  if (nowMs - quest.dwellSince < QUEST_DWELL_MS) return none;

  return applyStarLock(quest, nearest.star.id);
}

export function applyStarLock(quest: QuestRuntime, starId: string): QuestTickResult {
  const none: QuestTickResult = { lockedId: null, completedKey: null, justFinished: false };
  if (quest.finished) return none;
  if (starId === quest.lastLockedId) {
    quest.message = 'Find the next star in the figure.';
    return none;
  }

  if (!quest.lastLockedId) {
    quest.lastLockedId = starId;
    quest.dwellId = null;
    quest.dwellSince = 0;
    quest.message = 'Nice — now connect it to a neighbor star.';
    return { lockedId: starId, completedKey: null, justFinished: false };
  }

  const result = tryConnect(quest.lastLockedId, starId, quest.edges, quest.completed);
  quest.dwellId = null;
  quest.dwellSince = 0;

  if (!result.ok || !result.key) {
    quest.message = result.reason;
    quest.lastLockedId = starId;
    return { lockedId: starId, completedKey: null, justFinished: false };
  }

  quest.completed.add(result.key);
  quest.lastLockedId = starId;
  const done = quest.completed.size;
  const total = quest.edges.length;
  quest.finished = done >= total;
  quest.message = quest.finished
    ? 'You drew the whole figure!'
    : `Line ${done} of ${total} — keep going.`;
  return { lockedId: starId, completedKey: result.key, justFinished: quest.finished };
}

export function nextHintStarId(quest: QuestRuntime): string | null {
  if (quest.finished) return null;
  if (!quest.lastLockedId) return quest.edges[0]?.a ?? null;
  for (const n of neighborsOf(quest.lastLockedId, quest.edges)) {
    const key = edgeKey(quest.lastLockedId, n);
    if (!quest.completed.has(key)) return n;
  }
  for (const e of quest.edges) {
    if (!quest.completed.has(e.key)) return e.a;
  }
  return null;
}

/** Heading offset so a catalog azimuth sits on the current boresight. */
export function nudgeToAlignAzimuth(
  objectAzimuth: number,
  headingWithNudge: number,
  currentNudge: number
): number {
  const error = wrap180(objectAzimuth - headingWithNudge);
  return wrap180(currentNudge + error);
}
