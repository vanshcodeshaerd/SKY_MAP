import { initCamera } from './camera';
import { watchLocation, type LocationData } from './location';
import { startOrientation, getSmoothedOrientation } from './orientation';
import { initCalibrationUI, getCalibratedFOV } from './calibration';
import { loadCatalog, indexStars } from './catalog';
import { SkyState } from './sky/SkyState';
import { createRenderer, type IRenderer } from './render/index.ts';
import type { RenderOptions } from './render/types.ts';
import { buildSkyScene } from './scene/buildScene.ts';
import { coneSearch, findConstellationByStars, confirmWithSimbad } from './recognition.ts';
import { showCalibrationModal } from './ui/calibrationModal.ts';
import { showConstellationCard } from './ui/constellationCard.ts';
import { initLayerDrawer, type LayerSettings } from './ui/layerDrawer.ts';
import { initTimeSlider } from './ui/timeSlider.ts';
import { magneticDeclination } from './sensors/wmm.ts';
import { OrientationFusion } from './sensors/fusion.ts';
import { setBrightness, setContrast, setSobelEnabled, processSobelFrame } from './vision/cameraFilters.ts';
import { hitTestStar, buildGeodesicArc, type MeasureState } from './measure.ts';
import { drawDirectionalArrow } from './render/draw2d.ts';
import { sunAltAz, moonAltAz } from './astronomy.ts';
import { planetAltAz, NAKED_EYE_PLANETS } from './planets.ts';
import { initPlanetariumControls, drawPlanetariumDome } from './planetarium.ts';
import { WebXRRenderer } from './render/WebXRRenderer.ts';

const catalog = loadCatalog('advanced');
const sky = new SkyState(catalog.stars);
const starIndex = indexStars(catalog.stars);
const fusion = new OrientationFusion();

const video = document.getElementById('camera-feed') as HTMLVideoElement;
const canvas = document.getElementById('ar-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const startScreen = document.getElementById('start-screen') as HTMLElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const uiContainer = document.getElementById('ui-container') as HTMLElement;
const planetariumScreen = document.getElementById('planetarium-screen') as HTMLElement;
const planetariumCanvas = document.getElementById('planetarium-canvas') as HTMLCanvasElement;
const pCtx = planetariumCanvas?.getContext('2d');

const hudAlt = document.getElementById('hud-alt') as HTMLElement;
const hudAz = document.getElementById('hud-az') as HTMLElement;
const hudPhase = document.getElementById('hud-phase') as HTMLElement;
const hudBoresight = document.getElementById('hud-boresight') as HTMLElement;
const targetDist = document.getElementById('target-dist') as HTMLElement;
const btnSun = document.getElementById('btn-sun') as HTMLButtonElement;
const btnMoon = document.getElementById('btn-moon') as HTMLButtonElement;
const fovSlider = document.getElementById('fov-slider') as HTMLInputElement;
const fovVal = document.getElementById('fov-val') as HTMLElement;
const btnModeAr = document.getElementById('btn-mode-ar') as HTMLButtonElement;
const btnModeSky = document.getElementById('btn-mode-sky') as HTMLButtonElement;
const btnVr = document.getElementById('btn-vr') as HTMLButtonElement;

let currentLocation: LocationData | null = null;
let currentFov = getCalibratedFOV();
let targetBody: 'Sun' | 'Moon' = 'Sun';
let simDate = new Date();
let azimuthNudge = 0;
let useIosTrueNorth = false;
let appMode: 'AR' | 'PLANETARIUM' = 'AR';
let renderer!: IRenderer;
let webglRenderer: IRenderer | null = null;
let xrRenderer: WebXRRenderer | null = null;
const measure: MeasureState = { starA: null, starB: null };
let projectedForHit: ReturnType<typeof buildSkyScene>['stars'] = [];

const renderOptions: RenderOptions = {
  mode: 'AR',
  magLimit: 5.8,
  showStars: true,
  showLines: true,
  showLabels: true,
};

let layerSettings: LayerSettings = initLayerDrawer((s) => {
  layerSettings = s;
  renderOptions.showStars = s.showStars;
  renderOptions.showLines = s.showLines;
  renderOptions.showLabels = s.showLabels;
  setContrast(s.contrast);
  setBrightness(s.brightness);
  setSobelEnabled(s.sobel);
  document.body.classList.toggle('night-red', s.nightRed);
  if (s.useWebGL && !webglRenderer) {
    void createRenderer('webgl', document.body, renderOptions).then((r) => {
      webglRenderer = r;
    });
  }
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (planetariumCanvas) {
    planetariumCanvas.width = window.innerWidth;
    planetariumCanvas.height = window.innerHeight;
  }
  renderer?.resize(canvas.width, canvas.height);
  webglRenderer?.resize(canvas.width, canvas.height);
}
window.addEventListener('resize', resizeCanvas);

function updateTargetUI() {
  const activeClass = ['bg-primary-container/20', 'border-primary-container', 'text-primary-container', 'shadow-[0_0_8px_rgba(0,242,255,0.4)]'];
  const inactiveClass = ['bg-surface-container/50', 'border-outline/30', 'text-on-surface-variant', 'hover:bg-surface-variant'];
  if (targetBody === 'Sun') {
    btnSun.classList.add(...activeClass);
    btnSun.classList.remove(...inactiveClass);
    btnMoon.classList.add(...inactiveClass);
    btnMoon.classList.remove(...activeClass);
    targetDist.textContent = '1 AU';
  } else {
    btnMoon.classList.add(...activeClass);
    btnMoon.classList.remove(...inactiveClass);
    btnSun.classList.add(...inactiveClass);
    btnSun.classList.remove(...activeClass);
    targetDist.textContent = '384K KM';
  }
}
btnSun.addEventListener('click', () => { targetBody = 'Sun'; updateTargetUI(); });
btnMoon.addEventListener('click', () => { targetBody = 'Moon'; updateTargetUI(); });
updateTargetUI();

initCalibrationUI(fovSlider, fovVal, (newFov) => {
  currentFov = newFov;
  fovVal.textContent = `${newFov}°`;
});

initTimeSlider((d) => {
  simDate = d;
  sky.setSimulatedDate(d);
});

const planetarium = planetariumScreen ? initPlanetariumControls(planetariumScreen) : null;

btnModeAr?.addEventListener('click', () => {
  appMode = 'AR';
  planetariumScreen?.classList.add('hidden');
  video.style.display = 'block';
  renderer.setMode('AR');
});
btnModeSky?.addEventListener('click', () => {
  appMode = 'PLANETARIUM';
  planetariumScreen?.classList.remove('hidden');
  video.style.display = 'none';
  renderer.setMode('VR_PLANETARIUM');
});
btnVr?.addEventListener('click', async () => {
  if (!xrRenderer) {
    xrRenderer = new WebXRRenderer(renderOptions);
    await xrRenderer.init(document.body, renderOptions);
  }
  const ok = await xrRenderer.enterVR();
  if (!ok) alert('WebXR immersive-vr not supported on this device.');
});

canvas.addEventListener('click', (e) => {
  if (!layerSettings.measureMode) return;
  const star = hitTestStar(projectedForHit, starIndex, e.clientX, e.clientY);
  if (!star) return;
  if (!measure.starA) measure.starA = star;
  else if (!measure.starB) measure.starB = star;
  else { measure.starA = star; measure.starB = null; }
});

function getFusedOrientation() {
  const raw = getSmoothedOrientation();
  const decl = currentLocation ? magneticDeclination(currentLocation.lat, currentLocation.lon) : 0;
  return fusion.updateFromEuler(
    { h: raw.h + azimuthNudge, b: raw.b, g: raw.g },
    decl,
    useIosTrueNorth
  );
}

function render() {
  requestAnimationFrame(render);
  if (!currentLocation) return;

  const orientation = appMode === 'PLANETARIUM' && planetarium
    ? { h: planetarium.yaw(), b: planetarium.pitch(), g: 0 }
    : getFusedOrientation();

  const R = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  let measureArc = null;
  if (measure.starA && measure.starB) {
    const pa = projectedForHit.find((p) => p.id === measure.starA!.id);
    const pb = projectedForHit.find((p) => p.id === measure.starB!.id);
    if (pa && pb) measureArc = buildGeodesicArc({ x: pa.x, y: pa.y }, { x: pb.x, y: pb.y }, measure.starA, measure.starB);
  }

  const scene = buildSkyScene({
    catalog,
    sky,
    lat: currentLocation.lat,
    lon: currentLocation.lon,
    date: simDate,
    heading: orientation.h,
    beta: orientation.b,
    gamma: orientation.g,
    width: canvas.width,
    height: canvas.height,
    fov: currentFov,
    bortle: layerSettings.bortle,
    lines: catalog.lines,
    measureArc,
  });
  projectedForHit = scene.stars;

  const rec = coneSearch(
    catalog.stars,
    currentLocation.lat,
    currentLocation.lon,
    simDate,
    orientation.h,
    orientation.b,
    orientation.g,
    currentFov / 2,
    layerSettings.bortle <= 3 ? 6 : layerSettings.bortle <= 5 ? 4.8 : 3
  );
  const con = findConstellationByStars(
    catalog.stars,
    currentLocation.lat,
    currentLocation.lon,
    simDate,
    orientation.h,
    orientation.b,
    orientation.g,
    12
  );
  const conId = rec.constellationId ?? con;
  if (rec.star || conId) {
    const label = rec.star?.name ?? rec.star?.id ?? '';
    hudBoresight.textContent = [label, conId].filter(Boolean).join(' · ') || '—';
    showConstellationCard(conId, catalog.constellations, catalog.stars);
    confirmWithSimbad(rec.ra, rec.dec, (hit) => {
      if (!hit) return;
      const simCon = hit.constellation ?? conId;
      hudBoresight.textContent = [hit.id.replace(/^NAME /, ''), simCon].filter(Boolean).join(' · ');
      showConstellationCard(simCon, catalog.constellations, catalog.stars);
    });
  } else if (hudBoresight) {
    hudBoresight.textContent = '—';
  }

  const sunPos = sunAltAz(simDate, currentLocation.lat, currentLocation.lon);
  const moonPos = moonAltAz(simDate, currentLocation.lat, currentLocation.lon);
  const bodyPos = targetBody === 'Sun' ? sunPos : moonPos;
  hudAlt.textContent = `${bodyPos.altitude > 0 ? '+' : ''}${bodyPos.altitude.toFixed(1)}°`;
  hudAz.textContent = `${bodyPos.azimuth.toFixed(1)}°`;
  if (targetBody === 'Moon' && moonPos.illumFraction !== undefined) {
    hudPhase.textContent = `${(moonPos.illumFraction * 100).toFixed(0)}%`;
  }

  if (appMode === 'PLANETARIUM' && pCtx && planetariumCanvas) {
    drawPlanetariumDome(pCtx, planetariumCanvas.width, planetariumCanvas.height, layerSettings.bortle);
  }
  renderer.render({ ...scene, bortle: layerSettings.bortle }, R);
  if (appMode === 'AR') {
    processSobelFrame(video);
    const target = targetBody === 'Sun' ? sunPos : moonPos;
    const targetOnScreen = scene.bodies.some((b) => b.label === targetBody && b.onScreen);
    if (!targetOnScreen) {
      drawDirectionalArrow(ctx, canvas.width, canvas.height, orientation.h, target.azimuth, targetBody === 'Sun' ? '#fbbf24' : '#f1f5f9');
    }
  }

  webglRenderer?.render(scene, R);

  for (const planet of NAKED_EYE_PLANETS) {
    planetAltAz(planet, simDate, currentLocation.lat, currentLocation.lon);
  }
}

startBtn.addEventListener('click', async () => {
  startBtn.textContent = 'INITIALIZING...';
  startBtn.disabled = true;
  try {
    renderer = await createRenderer('canvas', document.body, renderOptions);
    resizeCanvas();

    await initCamera(video);
    watchLocation(
      (loc) => { currentLocation = loc; },
      (err) => console.error(err)
    );

    showCalibrationModal((cal) => {
      azimuthNudge = cal.azimuthNudge;
    });

    await startOrientation(() => {});
    useIosTrueNorth = typeof (window as any).DeviceOrientationEvent !== 'undefined';

    requestAnimationFrame(render);

    startScreen.classList.add('opacity-0');
    setTimeout(() => {
      startScreen.classList.add('hidden');
      uiContainer.classList.remove('hidden');
      setTimeout(() => { uiContainer.style.opacity = '1'; }, 50);
    }, 500);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    alert(`System Error: ${msg}`);
    startBtn.textContent = 'ENGAGE AR';
    startBtn.disabled = false;
  }
});