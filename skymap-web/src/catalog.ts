import type {
  CatalogBundle,
  CatalogStage,
  ConstellationLine,
  ConstellationMeta,
  DeepSkyObject,
  Star,
} from './data/types.ts';
import dsoData from './data/dso.messier.json';
import linesData from './data/constellations.lines.json';
import metaData from './data/constellations.meta.json';
import starsInitial from './data/stars.initial.json';
import starsIntermediate from './data/stars.intermediate.json';
import starsAdvanced from './data/stars.advanced.json';

const STAGE_MAP: Record<CatalogStage, Star[]> = {
  initial: starsInitial as Star[],
  intermediate: starsIntermediate as Star[],
  advanced: starsAdvanced as Star[],
  extended: starsAdvanced as Star[],
};

export function validateConstellationGraph(
  stars: Star[],
  lines: ConstellationLine[]
): string[] {
  const ids = new Set(stars.map((s) => s.id));
  const errors: string[] = [];
  for (const line of lines) {
    if (!ids.has(line.fromStarId)) {
      errors.push(`Missing fromStarId ${line.fromStarId} (${line.constellationId})`);
    }
    if (!ids.has(line.toStarId)) {
      errors.push(`Missing toStarId ${line.toStarId} (${line.constellationId})`);
    }
  }
  return errors;
}

export function loadCatalog(stage: CatalogStage = 'advanced'): CatalogBundle {
  const t0 = performance.now();
  const stars = STAGE_MAP[stage];
  const lines = linesData as ConstellationLine[];
  const constellations = metaData as ConstellationMeta[];
  const dso = dsoData as DeepSkyObject[];

  const ids = new Set(stars.map((s) => s.id));
  const activeLines = lines.filter(
    (l) => ids.has(l.fromStarId) && ids.has(l.toStarId)
  );
  const graphErrors = validateConstellationGraph(stars, activeLines);
  if (graphErrors.length > 0) {
    console.warn(`Catalog graph: ${graphErrors.length} dangling references`);
  }

  const loadTimeMs = performance.now() - t0;
  console.info(`Catalog [${stage}]: ${stars.length} stars, ${activeLines.length} lines in ${loadTimeMs.toFixed(1)}ms`);

  return { stars, constellations, lines: activeLines, dso, loadTimeMs };
}

export function indexStars(stars: Star[]): Map<string, Star> {
  return new Map(stars.map((s) => [s.id, s]));
}