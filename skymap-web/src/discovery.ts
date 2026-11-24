/** Constellation line reveal animation progress 0–1 per constellation id. */
const animationProgress = new Map<string, number>();

export function tickConstellationDiscovery(activeCon: string | null, dt: number): number {
  if (!activeCon) return 0;
  const cur = animationProgress.get(activeCon) ?? 0;
  const next = Math.min(1, cur + dt * 0.5);
  animationProgress.set(activeCon, next);
  return next;
}

export function lineVisibleForAnimation(constellationId: string, segmentIndex: number, total: number): boolean {
  const p = animationProgress.get(constellationId) ?? 0;
  return segmentIndex / Math.max(1, total) <= p;
}