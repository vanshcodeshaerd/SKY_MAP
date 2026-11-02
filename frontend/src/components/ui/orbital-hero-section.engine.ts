import type { HTMLAttributes, MutableRefObject } from 'react';

const TAU = Math.PI * 2;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const MS_PER_DAY = 86_400_000;
const DEG = Math.PI / 180;

/** J2000 heliocentric orbital element set (JPL approximate, degrees + AU). */
export type Planet = {
  name: string;
  a: number;
  e: number;
  i: number;
  /** Mean longitude L at J2000 (deg). */
  L: number;
  /** Argument of perihelion ω (deg). */
  w: number;
  /** Longitude of ascending node Ω (deg). */
  node: number;
  /** Mean longitude rate (deg / Julian century). */
  Ldot: number;
  color: string;
  /** Screen radius in CSS pixels (base, scaled by projection). */
  size: number;
  texture?: string;
};

export interface OrbitalHeroSectionProps extends HTMLAttributes<HTMLDivElement> {
  /** Simulation speed multiplier (1 = real-time days). */
  speed?: number;
  /** Pause the animation loop. */
  paused?: boolean;
  /** Render only the inner four planets. */
  innerOnly?: boolean;
  /** Override default planet list. */
  planets?: Planet[];
  /** Wake trail length (samples per planet). */
  trailLength?: number;
  /** Draw the readability scrim gradient. */
  scrim?: boolean;
  /** Which edge the scrim darkens (for hero copy). */
  scrimEdge?: 'none' | 'left' | 'right' | 'top' | 'bottom';
  /** Scrim opacity at the dark edge (0–1). */
  scrimStrength?: number;
  /** Star count (approximate). */
  starCount?: number;
  /** AU → pixel scale at reference depth. */
  orbitScale?: number;
  /** Ecliptic tilt for projection (deg). */
  tilt?: number;
  /** Sun core color. */
  sunColor?: string;
}

/** J2000 elements + JPL mean-longitude rates (deg / century). */
export const SOLAR_SYSTEM: Planet[] = [
  {
    name: 'Mercury',
    a: 0.38709927,
    e: 0.20563593,
    i: 7.00497902,
    L: 252.2503235,
    w: 29.124,
    node: 48.33076593,
    Ldot: 149_472.67411175,
    color: '#B8B8B8',
    size: 3.2,
  },
  {
    name: 'Venus',
    a: 0.72333566,
    e: 0.00677672,
    i: 3.39467605,
    L: 181.9790995,
    w: 54.891,
    node: 76.67984255,
    Ldot: 58_517.81538729,
    color: '#E8C07D',
    size: 4.8,
  },
  {
    name: 'Earth',
    a: 1.00000261,
    e: 0.01671123,
    i: 0.00001531,
    L: 100.46457166,
    w: 102.947,
    node: 0,
    Ldot: 35_999.37244981,
    color: '#6FB7FF',
    size: 5,
  },
  {
    name: 'Mars',
    a: 1.52371034,
    e: 0.0933941,
    i: 1.84969142,
    L: 355.44643205,
    w: 286.502,
    node: 49.55953891,
    Ldot: 19_140.30268499,
    color: '#E07A5F',
    size: 3.8,
  },
  {
    name: 'Jupiter',
    a: 5.202887,
    e: 0.04838624,
    i: 1.30439695,
    L: 34.39644051,
    w: 273.867,
    node: 100.47390909,
    Ldot: 3034.74612775,
    color: '#D9A066',
    size: 11,
  },
  {
    name: 'Saturn',
    a: 9.53667594,
    e: 0.05386179,
    i: 2.48599187,
    L: 49.95424423,
    w: 339.392,
    node: 113.66242448,
    Ldot: 1222.49362201,
    color: '#E3CE9E',
    size: 9.5,
  },
  {
    name: 'Uranus',
    a: 19.18916464,
    e: 0.04725744,
    i: 0.77263783,
    L: 313.23810451,
    w: 96.998,
    node: 74.01692503,
    Ldot: 428.48202785,
    color: '#9FE3E0',
    size: 7,
  },
  {
    name: 'Neptune',
    a: 30.06992276,
    e: 0.00859048,
    i: 1.77004347,
    L: 304.34897031,
    w: 273.249,
    node: 131.78422574,
    Ldot: 218.45945325,
    color: '#6E8CFF',
    size: 6.8,
  },
];

export const INNER_PLANETS: Planet[] = SOLAR_SYSTEM.slice(0, 4);

type Vec3 = { x: number; y: number; z: number };

type Projected = { x: number; y: number; depth: number; scale: number };

type PlanetRuntime = {
  p: Planet;
  trail: Vec3[];
};

type Star = {
  x: number;
  y: number;
  z: number;
  r: number;
  phase: number;
  twinkle: number;
};

type PlanetHit = { name: string; x: number; y: number };

const textureCache = new Map<string, HTMLImageElement | null>();

/** Parse any CSS color to 0–255 RGB (alpha ignored). */
export function parseRGB(css: string): [number, number, number] {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [255, 255, 255];
  ctx.fillStyle = '#000000';
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  return [d[0], d[1], d[2]];
}

function norm360(d: number): number {
  return ((d % 360) + 360) % 360;
}

function solveKepler(M: number, e: number): number {
  let E = e < 0.8 ? M : Math.PI;
  for (let k = 0; k < 32; k++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-10) break;
  }
  return E;
}

function heliocentricAU(planet: Planet, dateMs: number): Vec3 {
  const T = (dateMs - J2000_MS) / (MS_PER_DAY * 36525);
  const a = planet.a;
  const e = planet.e;
  const i = (planet.i + 0) * DEG;
  const L = norm360(planet.L + planet.Ldot * T);
  const w = planet.w * DEG;
  const node = planet.node * DEG;
  const M = norm360(L - planet.w - planet.node) * DEG;
  const E = solveKepler(M, e);

  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);

  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const cO = Math.cos(node);
  const sO = Math.sin(node);
  const ci = Math.cos(i);
  const si = Math.sin(i);

  return {
    x: (cw * cO - sw * sO * ci) * xp + (-sw * cO - cw * sO * ci) * yp,
    y: (cw * sO + sw * cO * ci) * xp + (-sw * sO + cw * cO * ci) * yp,
    z: sw * si * xp + cw * si * yp,
  };
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function buildStars(count: number): Star[] {
  const rand = mulberry32(0x0b17a11);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: (rand() - 0.5) * 2,
      y: (rand() - 0.5) * 2,
      z: rand(),
      r: 0.35 + rand() * 1.25,
      phase: rand() * TAU,
      twinkle: 0.35 + rand() * 0.65,
    });
  }
  return stars;
}

function getTexture(url: string): HTMLImageElement | null {
  if (textureCache.has(url)) return textureCache.get(url) ?? null;
  const img = new Image();
  img.decoding = 'async';
  img.crossOrigin = 'anonymous';
  textureCache.set(url, null);
  img.onload = () => textureCache.set(url, img);
  img.onerror = () => textureCache.set(url, null);
  img.src = url;
  return null;
}

function resolvePlanets(props: OrbitalHeroSectionProps): Planet[] {
  if (props.planets?.length) return props.planets;
  return props.innerOnly ? INNER_PLANETS : SOLAR_SYSTEM;
}

function projectPoint(
  p: Vec3,
  width: number,
  height: number,
  tiltRad: number,
  orbitScale: number,
  sunShift: Vec3,
): Projected {
  const sx = p.x - sunShift.x;
  const sy = p.y - sunShift.y;
  const sz = p.z - sunShift.z;
  const ry = sy * Math.cos(tiltRad) - sz * Math.sin(tiltRad);
  const rz = sy * Math.sin(tiltRad) + sz * Math.cos(tiltRad);
  const depth = 8 + rz;
  const persp = 1 / Math.max(0.35, depth);
  const scale = orbitScale * persp;
  return {
    x: width * 0.5 + sx * scale,
    y: height * 0.52 + ry * scale,
    depth: rz,
    scale: persp,
  };
}

function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  width: number,
  height: number,
  t: number,
  sunShift: Vec3,
): void {
  for (const s of stars) {
    const parallax = 0.08 + s.z * 0.22;
    const px = width * (0.5 + (s.x - sunShift.x * parallax) * 0.48);
    const py = height * (0.5 + (s.y - sunShift.y * parallax) * 0.48);
    const tw = 0.55 + 0.45 * Math.sin(t * 0.0012 * s.twinkle + s.phase);
    const alpha = (0.25 + s.z * 0.65) * tw;
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(px, py, s.r, 0, TAU);
    ctx.fill();
  }
}

function drawSun(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sunColor: string,
  t: number,
): void {
  const cx = width * 0.5;
  const cy = height * 0.52;
  const pulse = 1 + 0.04 * Math.sin(t * 0.0015);
  const core = 16 * pulse;
  const rgb = parseRGB(sunColor);

  const corona = ctx.createRadialGradient(cx, cy, core * 0.2, cx, cy, core * 4.2);
  corona.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.55)`);
  corona.addColorStop(0.35, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.18)`);
  corona.addColorStop(1, 'rgba(255,200,80,0)');
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(cx, cy, core * 4.2, 0, TAU);
  ctx.fill();

  const disc = ctx.createRadialGradient(cx - core * 0.25, cy - core * 0.25, 1, cx, cy, core);
  disc.addColorStop(0, '#FFFFFF');
  disc.addColorStop(0.35, sunColor);
  disc.addColorStop(1, '#B45309');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, core, 0, TAU);
  ctx.fill();
}

function drawWake(
  ctx: CanvasRenderingContext2D,
  trail: Vec3[],
  color: string,
  width: number,
  height: number,
  tiltRad: number,
  orbitScale: number,
  sunShift: Vec3,
): void {
  if (trail.length < 2) return;
  const rgb = parseRGB(color);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 1; i < trail.length; i++) {
    const a = projectPoint(trail[i - 1], width, height, tiltRad, orbitScale, sunShift);
    const b = projectPoint(trail[i], width, height, tiltRad, orbitScale, sunShift);
    const fade = i / trail.length;
    ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(0.04 + fade * 0.35).toFixed(3)})`;
    ctx.lineWidth = 0.6 + fade * 1.8;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

function drawPlanetDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
): void {
  const rgb = parseRGB(color);
  const glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.4);
  glow.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.95)`);
  glow.addColorStop(0.45, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.35)`);
  glow.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, radius * 2.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

function drawPlanetSprite(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.clip();
  ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
  const shade = ctx.createRadialGradient(
    x - radius * 0.35,
    y - radius * 0.35,
    radius * 0.1,
    x,
    y,
    radius,
  );
  shade.addColorStop(0, 'rgba(255,255,255,0.15)');
  shade.addColorStop(0.7, 'rgba(0,0,0,0.05)');
  shade.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = shade;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.restore();
}

function drawScrim(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  props: OrbitalHeroSectionProps,
): void {
  const edge = props.scrimEdge ?? 'left';
  if (edge === 'none' || props.scrim === false) return;
  const s = Math.max(0, Math.min(1, props.scrimStrength ?? 0.88));
  const g =
    edge === 'left'
      ? ctx.createLinearGradient(0, 0, width, 0)
      : edge === 'right'
        ? ctx.createLinearGradient(width, 0, 0, 0)
        : edge === 'top'
          ? ctx.createLinearGradient(0, 0, 0, height)
          : ctx.createLinearGradient(0, height, 0, 0);
  for (let q = 0; q <= 12; q++) {
    const x = q / 12;
    g.addColorStop(x, `rgba(0,0,0,${(s * Math.pow(1 - x, 2.4)).toFixed(4)})`);
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}

type DrawLayer =
  | { kind: 'wake'; runtime: PlanetRuntime }
  | { kind: 'planet'; runtime: PlanetRuntime; projected: Projected; radius: number };

function drawShot(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  props: OrbitalHeroSectionProps,
  stars: Star[],
  runtimes: PlanetRuntime[],
  simMs: number,
  t: number,
  sunShift: Vec3,
  hitsOut: PlanetHit[],
): void {
  hitsOut.length = 0;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(0, 0, width, height);

  const tilt = (props.tilt ?? 62) * DEG;
  const orbitScale = props.orbitScale ?? Math.min(width, height) * 0.085;
  const trailCap = Math.max(24, Math.min(240, props.trailLength ?? 120));

  drawStars(ctx, stars, width, height, t, sunShift);

  for (const rt of runtimes) {
    const helio = heliocentricAU(rt.p, simMs);
    const world: Vec3 = {
      x: helio.x,
      y: helio.y,
      z: helio.z + sunShift.z * 0.15,
    };
    rt.trail.push(world);
    if (rt.trail.length > trailCap) rt.trail.shift();
  }

  const layers: DrawLayer[] = [];
  for (const rt of runtimes) {
    layers.push({ kind: 'wake', runtime: rt });
    const helio = heliocentricAU(rt.p, simMs);
    const world: Vec3 = {
      x: helio.x,
      y: helio.y,
      z: helio.z + sunShift.z * 0.15,
    };
    const projected = projectPoint(world, width, height, tilt, orbitScale, sunShift);
    const radius = Math.max(1.8, rt.p.size * (0.65 + projected.scale * 0.35));
    layers.push({ kind: 'planet', runtime: rt, projected, radius });
  }

  layers.sort((a, b) => {
    const da = a.kind === 'wake' ? -999 : a.projected.depth;
    const db = b.kind === 'wake' ? -999 : b.projected.depth;
    return da - db;
  });

  for (const layer of layers) {
    if (layer.kind === 'wake') {
      drawWake(
        ctx,
        layer.runtime.trail,
        layer.runtime.p.color,
        width,
        height,
        tilt,
        orbitScale,
        sunShift,
      );
      continue;
    }

    const { runtime, projected, radius } = layer;
    const tex = runtime.p.texture;
    if (tex) {
      const img = getTexture(tex);
      if (img && img.complete && img.naturalWidth > 0) {
        drawPlanetSprite(ctx, img, projected.x, projected.y, radius);
      } else {
        drawPlanetDot(ctx, projected.x, projected.y, radius, runtime.p.color);
      }
    } else {
      drawPlanetDot(ctx, projected.x, projected.y, radius, runtime.p.color);
    }
    hitsOut.push({ name: runtime.p.name, x: projected.x, y: projected.y });
  }

  drawSun(ctx, width, height, props.sunColor ?? '#FBBF24', t);

  if (props.scrim !== false) {
    drawScrim(ctx, width, height, props);
  }
}

/**
 * Mount canvas animation on `host`. Returns cleanup.
 */
export function attachOrbitalHeroCanvas(
  host: HTMLDivElement,
  canvas: HTMLCanvasElement,
  propsRef: MutableRefObject<OrbitalHeroSectionProps>,
  onPlanetSelect?: (name: string) => void,
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => undefined;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let raf = 0;
  let stars = buildStars(propsRef.current.starCount ?? 220);
  let runtimes: PlanetRuntime[] = [];
  const lastHits: PlanetHit[] = [];
  const sunShift: Vec3 = { x: 0, y: 0, z: 0 };

  let pointerDown = false;
  let dragSq = 0;
  let downX = 0;
  let downY = 0;

  const syncPlanets = (props: OrbitalHeroSectionProps) => {
    const list = resolvePlanets(props);
    if (list.length === runtimes.length && list.every((p, i) => p.name === runtimes[i]?.p.name)) {
      runtimes.forEach((rt, i) => {
        rt.p = list[i];
      });
      return;
    }
    runtimes = list.map((p) => ({
      p,
      trail: [],
    }));
  };

  const resize = () => {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const startMs = performance.now();

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const props = propsRef.current;
    if (props.paused) return;

    syncPlanets(props);
    const starTarget = props.starCount ?? 220;
    if (stars.length !== starTarget) stars = buildStars(starTarget);

    const t = now - startMs;
    const speed = props.speed ?? 86400;
    const simMs = J2000_MS + (t / 1000) * speed * MS_PER_DAY;

    sunShift.x = Math.sin(t * 0.000045) * 0.35;
    sunShift.y = Math.cos(t * 0.000038) * 0.22;
    sunShift.z = (t / 1000) * 0.00085;

    drawShot(ctx, width, height, props, stars, runtimes, simMs, t, sunShift, lastHits);
  };

  raf = requestAnimationFrame(frame);

  const toLocal = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const onPointerDown = (ev: PointerEvent) => {
    pointerDown = true;
    dragSq = 0;
    downX = ev.clientX;
    downY = ev.clientY;
    host.setPointerCapture(ev.pointerId);
  };

  const onPointerMove = (ev: PointerEvent) => {
    if (!pointerDown) return;
    const dx = ev.clientX - downX;
    const dy = ev.clientY - downY;
    dragSq = dx * dx + dy * dy;
  };

  const pickPlanet = (clientX: number, clientY: number) => {
    const { x, y } = toLocal(clientX, clientY);
    for (let i = lastHits.length - 1; i >= 0; i--) {
      const hit = lastHits[i];
      const dx = x - hit.x;
      const dy = y - hit.y;
      if (dx * dx + dy * dy <= 24 * 24) {
        onPlanetSelect?.(hit.name);
        return;
      }
    }
  };

  const onPointerUp = (ev: PointerEvent) => {
    if (!pointerDown) return;
    pointerDown = false;
    try {
      host.releasePointerCapture(ev.pointerId);
    } catch {
      /* ignore */
    }
    if (dragSq > 36) return;
    pickPlanet(ev.clientX, ev.clientY);
  };

  host.addEventListener('pointerdown', onPointerDown);
  host.addEventListener('pointermove', onPointerMove);
  host.addEventListener('pointerup', onPointerUp);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    host.removeEventListener('pointerdown', onPointerDown);
    host.removeEventListener('pointermove', onPointerMove);
    host.removeEventListener('pointerup', onPointerUp);
  };
}
