import { initCamera } from './camera';
import { watchLocation, type LocationData } from './location';
import {
  getScreenOrientationAngle,
  getSensorCapabilities,
  getSmoothedOrientation,
  startOrientation,
} from './orientation';
import { initCalibrationUI, getCalibratedFOV } from './calibration';
import { loadCatalog, indexStars } from './catalog';
import { SkyState } from './sky/SkyState';
import { createRenderer, type IRenderer } from './render/index.ts';
import {
  visibilityFromMode,
  type CelestialFilterMode,
  type RenderOptions,
} from './render/types.ts';
import { buildSkyScene } from './scene/buildScene.ts';
import {
  computeConstellationCenters,
  computeNextConstellations,
  coneSearch,
  ConstellationTracker,
  confirmWithSimbad,
} from './recognition.ts';
import { showCalibrationModal } from './ui/calibrationModal.ts';
import { hideConstellationCard, showConstellationCard } from './ui/constellationCard.ts';
import { showPlanetCard } from './ui/planetCard.ts';
import { updateCompassHud } from './ui/compassHud.ts';
import { initSearchPanel } from './ui/searchPanel.ts';
import { initLayerDrawer, type LayerSettings } from './ui/layerDrawer.ts';
import { initTimeSlider } from './ui/timeSlider.ts';
import { magneticDeclination } from './sensors/wmm.ts';
import { OrientationFusion } from './sensors/fusion.ts';
import { setBrightness, setContrast, setSobelEnabled, processSobelFrame } from './vision/cameraFilters.ts';
import { hitTestStar, buildGeodesicArc, type MeasureState } from './measure.ts';
import { drawDirectionalArrow } from './render/draw2d.ts';
import { sunAltAz, moonAltAz } from './astronomy.ts';
import { equatorialToHorizontal } from './astronomy/fast.ts';
import { getPlanetDetails, type PlanetName } from './planets.ts';
import { initPlanetariumControls, drawPlanetariumDome } from './planetarium.ts';
import { WebXRRenderer } from './render/WebXRRenderer.ts';
import { orientationMatrix } from './projection.ts';

const catalog = loadCatalog('advanced');
const sky = new SkyState(catalog.stars);
const starIndex = indexStars(catalog.stars);
const constellationCenters = computeConstellationCenters(catalog.stars, catalog.constellations);
const tracker = new ConstellationTracker();
const fusion = new OrientationFusion();

const video = document.getElementById('camera-feed') as HTMLVideoElement;
const canvas = document.getElementById('ar-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const startScreen = document.getElementById('start-screen') as HTMLElement;
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;
const startSkyBtn = document.getElementById('start-sky-btn') as HTMLButtonElement;
const uiContainer = document.getElementById('ui-container') as HTMLElement;
const planetariumScreen = document.getElementById('planetarium-screen') as HTMLElement;
const planetariumCanvas = document.getElementById('planetarium-canvas') as HTMLCanvasElement;
const pCtx = planetariumCanvas?.getContext('2d');

const hudAlt = document.getElementById('hud-alt') as HTMLElement;
const hudAz = document.getElementById('hud-az') as HTMLElement;
const hudBoresight = document.getElementById('hud-boresight') as HTMLElement;
const hudLoc = document.getElementById('hud-loc') as HTMLElement;
const fovSlider = document.getElementById('fov-slider') as HTMLInputElement;
const fovVal = document.getElementById('fov-val') as HTMLElement;
const btnModeAr = document.getElementById('btn-mode-ar') as HTMLButtonElement;
const btnModeSky = document.getElementById('btn-mode-sky') as HTMLButtonElement;
const btnVr = document.getElementById('btn-vr') as HTMLButtonElement;
const btnCalibrate = document.getElementById('btn-calibrate') as HTMLButtonElement;
const planetBar = document.getElementById('planet-bar') as HTMLElement;

const filterBothBtn = document.getElementById('filter-both') as HTMLButtonElement;
const filterPlanetsBtn = document.getElementById('filter-planets') as HTMLButtonElement;
const filterConstellationsBtn = document.getElementById('filter-constellations') as HTMLButtonElement;

// Default observer fallback if GPS is still acquiring or denied on desktop
let currentLocation: LocationData = { lat: 23.0225, lon: 72.5714 };
let locationLocked = false;
let cameraReady = false;
let currentFov = getCalibratedFOV();
let targetBody: PlanetName | 'Sun' | 'Moon' = 'Sun';
let selectedPlanetName: PlanetName | 'Sun' | 'Moon' | null = null;
let guidedConstellationId: string | null = null;
let celestialMode: CelestialFilterMode = 'BOTH';
let simDate = new Date();
let azimuthNudge = 0;
let appMode: 'AR' | 'PLANETARIUM' = 'AR';
let cardDismissedForCon: string | null = null;
let renderer!: IRenderer;
let webglRenderer: IRenderer | null = null;
let xrRenderer: WebXRRenderer | null = null;
const measure: MeasureState = { starA: null, starB: null };
let lastScene: ReturnType<typeof buildSkyScene> | null = null;

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

function applyCelestialFilterMode(mode: CelestialFilterMode) {
  celestialMode = mode;
  const map: [HTMLButtonElement | null, CelestialFilterMode][] = [
    [filterBothBtn, 'BOTH'],
    [filterPlanetsBtn, 'PLANETS'],
    [filterConstellationsBtn, 'CONSTELLATIONS'],
  ];

  for (const [btn, m] of map) {
    if (!btn) continue;
    btn.classList.toggle('hud-pill-active', m === mode);
    btn.classList.toggle('text-on-surface-variant', m !== mode);
  }

  if (mode === 'CONSTELLATIONS') {
    planetBar?.classList.add('hidden');
    showPlanetCard(null);
    selectedPlanetName = null;
  } else {
    planetBar?.classList.remove('hidden');
  }

  if (mode === 'PLANETS') {
    hideConstellationCard();
    guidedConstellationId = null;
  }
}

filterBothBtn?.addEventListener('click', () => applyCelestialFilterMode('BOTH'));
filterPlanetsBtn?.addEventListener('click', () => applyCelestialFilterMode('PLANETS'));
filterConstellationsBtn?.addEventListener('click', () => applyCelestialFilterMode('CONSTELLATIONS'));
applyCelestialFilterMode('BOTH');

function selectTargetPlanet(name: PlanetName | 'Sun' | 'Moon') {
  targetBody = name;
  selectedPlanetName = name;

  document.querySelectorAll<HTMLButtonElement>('.planet-chip').forEach((chip) => {
    const active = chip.dataset.planet === name;
    chip.classList.toggle('hud-pill-active', active);
    chip.classList.toggle('bg-white/5', !active);
    chip.classList.toggle('border-white/10', !active);
    chip.classList.toggle('text-on-surface-variant', !active);
  });

  if (name !== 'Sun' && name !== 'Moon') {
    const details = getPlanetDetails(name, simDate, currentLocation.lat, currentLocation.lon);
    showPlanetCard(details, () => {
      selectedPlanetName = null;
    });
    if (appMode === 'PLANETARIUM' && planetarium) {
      planetarium.lookAt(details.azimuth, details.altitude);
    }
  } else {
    showPlanetCard(null);
  }
}

document.querySelectorAll<HTMLButtonElement>('.planet-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const p = chip.dataset.planet as PlanetName | 'Sun' | 'Moon' | undefined;
    if (p) selectTargetPlanet(p);
  });
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

initCalibrationUI(fovSlider, fovVal, (newFov) => {
  currentFov = newFov;
  fovVal.textContent = `${newFov}°`;
});

initTimeSlider((d) => {
  simDate = d;
  sky.setSimulatedDate(d);
});

const planetarium = planetariumScreen
  ? initPlanetariumControls(planetariumScreen, (deltaFov) => {
      currentFov = Math.max(25, Math.min(115, currentFov + deltaFov));
      if (fovSlider) fovSlider.value = currentFov.toString();
      if (fovVal) fovVal.textContent = `${Math.round(currentFov)}°`;
    })
  : null;

window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    document.getElementById('layer-drawer')?.classList.add('hidden');
    const sp = document.getElementById('search-panel');
    sp?.classList.toggle('hidden');
    if (!sp?.classList.contains('hidden')) {
      (document.getElementById('sky-search-input') as HTMLInputElement | null)?.focus();
    }
  }
});

function setEnvironmentMode(mode: 'AR' | 'PLANETARIUM') {
  appMode = mode;
  if (mode === 'AR') {
    planetariumScreen?.classList.add('hidden');
    video.style.display = 'block';
    btnModeAr.classList.add('hud-pill-active');
    btnModeAr.classList.remove('text-on-surface-variant');
    btnModeSky.classList.remove('hud-pill-active');
    btnModeSky.classList.add('text-on-surface-variant');
    renderer?.setMode('AR');
  } else {
    planetariumScreen?.classList.remove('hidden');
    video.style.display = 'none';
    btnModeSky.classList.add('hud-pill-active');
    btnModeSky.classList.remove('text-on-surface-variant');
    btnModeAr.classList.remove('hud-pill-active');
    btnModeAr.classList.add('text-on-surface-variant');
    renderer?.setMode('VR_PLANETARIUM');
  }
}

btnModeAr?.addEventListener('click', () => setEnvironmentMode('AR'));
btnModeSky?.addEventListener('click', () => setEnvironmentMode('PLANETARIUM'));
btnVr?.addEventListener('click', async () => {
  if (!xrRenderer) {
    xrRenderer = new WebXRRenderer(renderOptions);
    await xrRenderer.init(document.body, renderOptions);
  }
  const ok = await xrRenderer.enterVR();
  if (!ok) {
    alert('WebXR immersive-vr is unavailable on this browser. Switching to 360° Planetarium mode.');
    setEnvironmentMode('PLANETARIUM');
  }
});

btnCalibrate?.addEventListener('click', () => {
  showCalibrationModal(
    (cal) => {
      azimuthNudge = cal.azimuthNudge;
    },
    {
      cameraReady,
      locationReady: locationLocked,
      headingDeg: getFusedOrientation().h,
    }
  );
});

initSearchPanel(catalog.constellations, catalog.stars, {
  onSelectConstellation: (conId) => {
    guidedConstellationId = conId;
    tracker.forceSelect(conId);
    if (celestialMode === 'PLANETS') applyCelestialFilterMode('BOTH');
    const center = constellationCenters.get(conId);
    if (center && appMode === 'PLANETARIUM' && planetarium) {
      const hor = equatorialToHorizontal(center.ra, center.dec, currentLocation.lat, currentLocation.lon, simDate);
      planetarium.lookAt(hor.azimuth, hor.altitude);
    }
  },
  onSelectPlanet: (planet) => {
    if (celestialMode === 'CONSTELLATIONS') applyCelestialFilterMode('BOTH');
    selectTargetPlanet(planet);
  },
});

canvas.addEventListener('click', (e) => {
  if (!lastScene) return;

  if (layerSettings.measureMode) {
    const star = hitTestStar(lastScene.stars, starIndex, e.clientX, e.clientY);
    if (!star) return;
    if (!measure.starA) measure.starA = star;
    else if (!measure.starB) measure.starB = star;
    else {
      measure.starA = star;
      measure.starB = null;
    }
    return;
  }

  // Hit-test planets/bodies first if visible
  if (celestialMode !== 'CONSTELLATIONS') {
    for (const b of lastScene.bodies) {
      if (!b.onScreen || b.kind === 'dso') continue;
      if (Math.hypot(b.x - e.clientX, b.y - e.clientY) <= 26) {
        selectTargetPlanet(b.label as PlanetName | 'Sun' | 'Moon');
        return;
      }
    }
  }

  // Hit-test stars to inspect their constellation
  if (celestialMode !== 'PLANETS') {
    const star = hitTestStar(lastScene.stars, starIndex, e.clientX, e.clientY);
    if (star?.constellationId) {
      guidedConstellationId = star.constellationId;
      tracker.forceSelect(star.constellationId);
    }
  }
});

function getFusedOrientation() {
  const raw = getSmoothedOrientation();
  const caps = getSensorCapabilities();
  const decl = magneticDeclination(currentLocation.lat, currentLocation.lon);
  return fusion.updateFromEuler(
    { h: raw.h + azimuthNudge, b: raw.b, g: raw.g },
    decl,
    caps.iosTrueNorth
  );
}

let lastUiUpdate = 0;

function render() {
  requestAnimationFrame(render);

  const screenAngle = getScreenOrientationAngle();
  const orientation =
    appMode === 'PLANETARIUM' && planetarium
      ? { h: planetarium.yaw(), b: planetarium.pitch(), g: 0 }
      : getFusedOrientation();

  updateCompassHud(orientation.h);

  const R = orientationMatrix(orientation.h, orientation.b, orientation.g, appMode === 'PLANETARIUM' ? 0 : screenAngle);
  const visibility = visibilityFromMode(celestialMode);

  let measureArc = null;
  if (measure.starA && measure.starB && lastScene) {
    const pa = lastScene.stars.find((p) => p.id === measure.starA!.id);
    const pb = lastScene.stars.find((p) => p.id === measure.starB!.id);
    if (pa && pb) measureArc = buildGeodesicArc({ x: pa.x, y: pa.y }, { x: pb.x, y: pb.y }, measure.starA, measure.starB);
  }

  // Recognition & Constellation Tracking (only when constellations are active)
  const nowMs = performance.now();
  let activeConId: string | null = guidedConstellationId;
  if (visibility.constellations) {
    const magThresh = layerSettings.bortle <= 3 ? 6 : layerSettings.bortle <= 5 ? 4.8 : 3.2;
    const rec = coneSearch(
      catalog.stars,
      currentLocation.lat,
      currentLocation.lon,
      simDate,
      orientation.h,
      orientation.b,
      orientation.g,
      currentFov / 2,
      magThresh,
      appMode === 'PLANETARIUM' ? 0 : screenAngle
    );
    const tracked = tracker.update(rec, nowMs);
    activeConId = guidedConstellationId ?? tracked.constellationId;

    if (nowMs - lastUiUpdate > 250) {
      lastUiUpdate = nowMs;
      const starLabel = rec.star?.name ?? rec.star?.bayer ?? '';
      hudBoresight.textContent = [starLabel, activeConId].filter(Boolean).join(' · ') || 'Scanning sky...';

      if (activeConId && activeConId !== cardDismissedForCon) {
        const nextSuggestions = computeNextConstellations(
          activeConId,
          rec.ra,
          rec.dec,
          orientation.h,
          currentLocation.lat,
          currentLocation.lon,
          simDate,
          catalog.constellations,
          constellationCenters
        );
        showConstellationCard({
          conId: activeConId,
          meta: catalog.constellations,
          stars: catalog.stars,
          isLocked: guidedConstellationId !== null,
          recognition: {
            confidence: tracked.confidence,
            status: tracked.status,
            alt: rec.alt,
            az: rec.az,
          },
          nextSuggestions,
          onSelectNext: (nextId) => {
            cardDismissedForCon = null;
            guidedConstellationId = nextId;
            tracker.forceSelect(nextId);
            const center = constellationCenters.get(nextId);
            if (center && appMode === 'PLANETARIUM' && planetarium) {
              const hor = equatorialToHorizontal(center.ra, center.dec, currentLocation.lat, currentLocation.lon, simDate);
              planetarium.lookAt(hor.azimuth, hor.altitude);
            }
          },
          onUnlock: () => {
            guidedConstellationId = null;
            cardDismissedForCon = null;
          },
          onClose: () => {
            cardDismissedForCon = activeConId;
          },
        });
      }
      confirmWithSimbad(rec.ra, rec.dec, () => {});
    }
  } else if (nowMs - lastUiUpdate > 250) {
    lastUiUpdate = nowMs;
    hudBoresight.textContent = `Planet Mode (${targetBody})`;
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
    screenAngle: appMode === 'PLANETARIUM' ? 0 : screenAngle,
    width: canvas.width,
    height: canvas.height,
    fov: currentFov,
    bortle: layerSettings.bortle,
    lines: catalog.lines,
    visibility,
    activeConstellationId: activeConId,
    selectedPlanetName,
    measureArc,
  });
  lastScene = scene;

  // Update target Alt/Az telemetry
  let targetAz = 0;
  let targetAlt = 0;
  if (targetBody === 'Sun') {
    const s = sunAltAz(simDate, currentLocation.lat, currentLocation.lon);
    targetAlt = s.altitude;
    targetAz = s.azimuth;
  } else if (targetBody === 'Moon') {
    const m = moonAltAz(simDate, currentLocation.lat, currentLocation.lon);
    targetAlt = m.altitude;
    targetAz = m.azimuth;
  } else {
    const details = getPlanetDetails(targetBody, simDate, currentLocation.lat, currentLocation.lon);
    targetAlt = details.altitude;
    targetAz = details.azimuth;
  }
  hudAlt.textContent = `${targetAlt >= 0 ? '+' : ''}${targetAlt.toFixed(1)}°`;
  hudAz.textContent = `${targetAz.toFixed(1)}°`;

  if (appMode === 'PLANETARIUM' && pCtx && planetariumCanvas) {
    drawPlanetariumDome(pCtx, planetariumCanvas.width, planetariumCanvas.height, layerSettings.bortle);
  }

  renderer.render(scene, R);
  webglRenderer?.render(scene, R);

  if (appMode === 'AR') {
    processSobelFrame(video);
  }

  // Offscreen directional guidance arrow
  if (visibility.planets) {
    const targetSprite = scene.bodies.find((b) => b.label === targetBody);
    if (targetSprite && !targetSprite.onScreen) {
      drawDirectionalArrow(ctx, canvas.width, canvas.height, orientation.h, targetAz, targetSprite.color, targetBody);
    }
  } else if (guidedConstellationId) {
    const center = constellationCenters.get(guidedConstellationId);
    if (center) {
      const hor = equatorialToHorizontal(center.ra, center.dec, currentLocation.lat, currentLocation.lon, simDate);
      const anyVisible = scene.labels.some(
        (l) => l.constellationId?.toLowerCase() === guidedConstellationId?.toLowerCase()
      );
      if (!anyVisible) {
        drawDirectionalArrow(ctx, canvas.width, canvas.height, orientation.h, hor.azimuth, '#00f2ff', guidedConstellationId);
      }
    }
  }
}

async function startExperience(initialMode: 'AR' | 'PLANETARIUM') {
  renderer = await createRenderer('canvas', document.body, renderOptions);
  resizeCanvas();

  try {
    watchLocation(
      (loc) => {
        currentLocation = loc;
        locationLocked = true;
        if (hudLoc) hudLoc.textContent = `${loc.lat.toFixed(2)}°, ${loc.lon.toFixed(2)}°`;
      },
      () => {
        if (hudLoc) hudLoc.textContent = `${currentLocation.lat.toFixed(2)}°, ${currentLocation.lon.toFixed(2)}° (Default)`;
      }
    );
  } catch {
    if (hudLoc) hudLoc.textContent = `${currentLocation.lat.toFixed(2)}°, ${currentLocation.lon.toFixed(2)}° (Default)`;
  }

  if (initialMode === 'AR') {
    try {
      await initCamera(video);
      cameraReady = true;
    } catch {
      cameraReady = false;
      initialMode = 'PLANETARIUM';
    }
    try {
      await startOrientation(() => {});
    } catch {
      // Fallback gracefully if device orientation is unavailable on desktop
    }
  }

  setEnvironmentMode(initialMode);
  requestAnimationFrame(render);

  startScreen.classList.add('opacity-0');
  setTimeout(() => {
    startScreen.classList.add('hidden');
    uiContainer.classList.remove('hidden');
    setTimeout(() => {
      uiContainer.style.opacity = '1';
    }, 50);
  }, 400);
}

startBtn.addEventListener('click', async () => {
  startBtn.textContent = 'INITIALIZING...';
  startBtn.disabled = true;
  await startExperience('AR');
});

startSkyBtn?.addEventListener('click', async () => {
  startSkyBtn.textContent = 'LOADING...';
  startSkyBtn.disabled = true;
  await startExperience('PLANETARIUM');
});
