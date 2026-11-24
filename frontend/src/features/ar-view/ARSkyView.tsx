import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Camera,
  RefreshCw,
  SlidersHorizontal,
  Eye,
  Glasses,
  Compass,
  Navigation,
  Target,
  RotateCcw,
  Layers,
  X,
  Sliders,
  MapPin,
  Radio,
} from 'lucide-react';
import {
  GeodeticLocation,
  ManualCalibration,
  DeviceOrientationState,
  CelestialBodyId,
  CELESTIAL_BODIES,
  CELESTIAL_BODY_LIST,
} from '../../types/astronomy';
import { getAllCelestialPositions, getEclipticPathEnuPoints, CELESTIAL_DETECTION_PRIORITY } from '../../services/astronomyEngine';
import { azAltToEnuVector, projectEnuToScreen } from '../../services/coordinateTransforms';
import { useCameraStream } from '../../hooks/useCameraStream';
import { calculateStarPositions, CONSTELLATION_DEFS } from '../../services/starCatalog';
import { getPlanetThumbnail } from '../../services/planetTextures';
import { CelestialBodySelector } from '../../components/CelestialBodySelector';
import {
  buildSubHorizonCatalog,
  classifyArBodyVisibility,
  isInArViewport,
  subHorizonGuidanceText,
  AR_SUB_HORIZON_BOTTOM_EXTRA_PX,
  AR_VIEWPORT_MARGIN_PX,
} from './arSubHorizon';
import { PlanetDiscoveryModal } from './PlanetDiscoveryModal';
import { useMissionProgressContext } from '../../hooks/useMissionProgress';
import * as THREE from 'three';

interface ARSkyViewProps {
  location: GeodeticLocation;
  currentDate: Date;
  orientation: DeviceOrientationState;
  needsOrientationPermission: boolean;
  onRequestOrientationPermission: () => Promise<boolean>;
  calibration: ManualCalibration;
  onOpenCalibration: () => void;
  manualYaw: number;
  manualPitch: number;
  manualRoll: number;
  selectedBody?: CelestialBodyId;
  onSelectBody?: (body: CelestialBodyId) => void;
  onRequestGps?: () => void;
  gpsLoading?: boolean;
  onNavigateTo3DExplorer?: (body: CelestialBodyId) => void;
}

export function ARSkyView({
  location,
  currentDate,
  orientation,
  needsOrientationPermission,
  onRequestOrientationPermission,
  calibration,
  onOpenCalibration,
  manualYaw,
  manualPitch,
  manualRoll,
  selectedBody = 'Sun',
  onSelectBody,
  onRequestGps,
  gpsLoading,
  onNavigateTo3DExplorer,
}: ARSkyViewProps) {
  const { setArBodyLocked, reportArAlignmentHold, alignmentHoldProgress, progress } =
    useMissionProgressContext();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const {
    videoRef,
    isActive: isCameraActive,
    error: cameraError,
    startCamera,
    stopCamera,
    toggleFacingMode,
    facingMode,
  } = useCameraStream();

  // Mode: AR (Camera Passthrough) vs VR (Gyro Cosmic Planetarium)
  const [viewMode, setViewMode] = useState<'ar' | 'vr'>('ar');
  const [nightVisionMode, setNightVisionMode] = useState<boolean>(false);
  const [showConstellations, setShowConstellations] = useState<boolean>(true);
  const [showAllPlanetsInAR, setShowAllPlanetsInAR] = useState<boolean>(true);
  const [showEcliptic, setShowEcliptic] = useState<boolean>(true);
  const [skyOpacity, setSkyOpacity] = useState<number>(0.6);

  // Modern UI states: clean popover menus to eliminate screen clutter
  const [isLayersOpen, setIsLayersOpen] = useState<boolean>(false);
  const [isTrimOpen, setIsTrimOpen] = useState<boolean>(false);
  const [showSubHorizonPlanets, setShowSubHorizonPlanets] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('skygazer_sub_horizon');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [invertPitch, setInvertPitch] = useState<boolean>(false);

  // Quick compass & altitude tilt trim for real-life magnetic/attitude alignment (+/- degrees on the fly)
  const [quickAzimuthNudge, setQuickAzimuthNudge] = useState<number>(0);
  const [quickAltitudeNudge, setQuickAltitudeNudge] = useState<number>(0);

  // Auto-Scan vs Manual Pin Mode (Free Sky Exploration)
  const [autoScanMode, setAutoScanMode] = useState<boolean>(true);
  const [discoveredBodyId, setDiscoveredBodyId] = useState<CelestialBodyId | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const lockHoldTimerRef = useRef<{ bodyId: CelestialBodyId; startTime: number } | null>(null);
  const lastDismissedRef = useRef<{ bodyId: CelestialBodyId; time: number } | null>(null);
  const lastLockedBodyRef = useRef<CelestialBodyId | null>(null);

  const [viewport, setViewport] = useState({ width: 800, height: 600 });

  const activeMeta = CELESTIAL_BODIES[selectedBody] || CELESTIAL_BODIES.Sun;

  // Single ephemeris pass for all 9 bodies + pre-computed ENU vectors (no duplicate Sun calculation)
  const { allPositions, bodyEnuVectors } = useMemo(() => {
    const positions = getAllCelestialPositions(location, currentDate);
    const vectors = {} as Record<CelestialBodyId, THREE.Vector3>;
    for (const info of CELESTIAL_BODY_LIST) {
      const pos = positions[info.id];
      vectors[info.id] = azAltToEnuVector(pos.azimuthDeg, pos.altitudeDeg);
    }
    return { allPositions: positions, bodyEnuVectors: vectors };
  }, [location, currentDate]);

  const subHorizonCatalog = useMemo(
    () => buildSubHorizonCatalog(allPositions),
    [allPositions]
  );

  // Pre-calculate topocentric Star Catalog positions only when location/time changes
  const starsMap = useMemo(() => {
    return calculateStarPositions(location, currentDate, 80);
  }, [location, currentDate]);

  // Ecliptic path uses the same Horizon pipeline as planet positions (consistent refraction)
  const eclipticEnuPoints = useMemo(() => {
    return getEclipticPathEnuPoints(location, currentDate, 10);
  }, [location, currentDate]);

  // Cardinal Horizon Directions (N, NE, E, SE, S, SW, W, NW) at Alt = 0
  const cardinalEnuPoints = useMemo(() => {
    const cardinals = [
      { label: 'N', az: 0 },
      { label: 'NE', az: 45 },
      { label: 'E', az: 90 },
      { label: 'SE', az: 135 },
      { label: 'S', az: 180 },
      { label: 'SW', az: 225 },
      { label: 'W', az: 270 },
      { label: 'NW', az: 315 },
    ];
    return cardinals.map((c) => ({
      label: c.label,
      az: c.az,
      enu: azAltToEnuVector(c.az, 0),
    }));
  }, []);

  // 360-Degree Continuous Local Horizon Plane (Alt = 0 deg)
  const horizonEnuPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let az = 0; az < 360; az += 10) {
      points.push(azAltToEnuVector(az, 0));
    }
    return points;
  }, []);

  // Projected screen coordinates map for all 9 bodies
  const [projectedBodies, setProjectedBodies] = useState<
    Record<
      CelestialBodyId,
      {
        u: number;
        v: number;
        isInFront: boolean;
        angularSeparationDeg: number;
        azimuthOffsetDeg: number;
        elevationOffsetDeg: number;
      }
    >
  >({} as any);

  // Projected constellation lines for AR canvas overlay
  const [projectedConstellations, setProjectedConstellations] = useState<
    { x1: number; y1: number; x2: number; y2: number; visible: boolean }[]
  >([]);

  // Projected star points for AR canvas overlay
  const [projectedStars, setProjectedStars] = useState<
    { u: number; v: number; name: string; mag: number; color: string; visible: boolean }[]
  >([]);

  // Projected Ecliptic Path lines
  const [projectedEcliptic, setProjectedEcliptic] = useState<{ x: number; y: number; inFront: boolean }[]>([]);

  // Projected Horizon Cardinal Points
  const [projectedCardinals, setProjectedCardinals] = useState<
    { label: string; x: number; y: number; inFront: boolean }[]
  >([]);

  // Projected Continuous 360-Degree Horizon Line
  const [projectedHorizonLine, setProjectedHorizonLine] = useState<{ x: number; y: number; inFront: boolean }[]>([]);

  // Azimuth beacons on the horizon arc for sub-horizon bodies (sky-view underground layer)
  const [projectedSubHorizonBeacons, setProjectedSubHorizonBeacons] = useState<
    Record<CelestialBodyId, { u: number; v: number; isInFront: boolean; azimuthOffsetDeg: number }>
  >({} as Record<CelestialBodyId, { u: number; v: number; isInFront: boolean; azimuthOffsetDeg: number }>);

  // Gyro Smoothing State for jitter-free 60 FPS motion
  const smoothedAnglesRef = useRef({ heading: 180, pitch: 30, roll: 0 });
  const renderFrameRef = useRef(0);
  const [hudHeading, setHudHeading] = useState<number>(180);
  const [hudPitch, setHudPitch] = useState<number>(30);

  // Handle container resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewport({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 560,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 60 FPS Real-Time Projection Engine for AR & VR
  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);

      const hasSensor =
        orientation.compassHeading !== undefined &&
        orientation.compassHeading !== null &&
        orientation.cameraPitch !== undefined &&
        orientation.cameraPitch !== null;

      const targetAlpha = hasSensor ? orientation.compassHeading! : manualYaw;
      const targetBeta = hasSensor ? orientation.cameraPitch! : manualPitch;
      const targetGamma =
        orientation.cameraRoll !== undefined && orientation.cameraRoll !== null ? orientation.cameraRoll! : manualRoll;

      // Dynamic adaptive smoothing: fast panning responds immediately, holding steady filters micro-jitter
      const dHeading = ((targetAlpha - smoothedAnglesRef.current.heading + 540) % 360) - 180;
      const dPitch = targetBeta - smoothedAnglesRef.current.pitch;
      const dRoll = targetGamma - smoothedAnglesRef.current.roll;

      const motionSpeed = Math.abs(dHeading) + Math.abs(dPitch);
      const adaptiveFactor = hasSensor
        ? motionSpeed > 4.0 ? 0.65 : (motionSpeed > 1.0 ? 0.35 : 0.20)
        : 0.55;

      smoothedAnglesRef.current.heading = (smoothedAnglesRef.current.heading + dHeading * adaptiveFactor + 360) % 360;
      smoothedAnglesRef.current.pitch += dPitch * adaptiveFactor;
      smoothedAnglesRef.current.roll += dRoll * adaptiveFactor;

      const rawAlpha = smoothedAnglesRef.current.heading;
      const rawBeta = smoothedAnglesRef.current.pitch;
      const rawGamma = smoothedAnglesRef.current.roll;

      const effectiveHeading =
        (rawAlpha + calibration.declinationDeg + calibration.azimuthNudgeDeg + quickAzimuthNudge + 360) % 360;
      const basePitch = invertPitch ? -rawBeta : rawBeta;
      const effectivePitch = Math.max(
        -89.9,
        Math.min(89.9, basePitch + calibration.altitudeNudgeDeg + quickAltitudeNudge)
      );
      const effectiveRoll = rawGamma;

      setHudHeading(effectiveHeading);
      setHudPitch(effectivePitch);

      // Project all 9 Solar System bodies using pre-computed ENU vectors
      const bodyProjs: Record<CelestialBodyId, any> = {} as any;
      CELESTIAL_BODY_LIST.forEach((body) => {
        const enu = bodyEnuVectors[body.id];
        if (enu) {
          bodyProjs[body.id] = projectEnuToScreen(
            enu,
            effectiveHeading,
            effectivePitch,
            effectiveRoll,
            viewport.width,
            viewport.height,
            calibration.fieldOfViewDeg
          );
        }
      });
      setProjectedBodies(bodyProjs);

      if (showSubHorizonPlanets && subHorizonCatalog.length > 0) {
        const beacons = {} as Record<
          CelestialBodyId,
          { u: number; v: number; isInFront: boolean; azimuthOffsetDeg: number }
        >;
        subHorizonCatalog.forEach(({ bodyId, horizonEnu }) => {
          const bp = projectEnuToScreen(
            horizonEnu,
            effectiveHeading,
            effectivePitch,
            effectiveRoll,
            viewport.width,
            viewport.height,
            calibration.fieldOfViewDeg
          );
          beacons[bodyId] = {
            u: bp.u,
            v: bp.v,
            isInFront: bp.isInFront,
            azimuthOffsetDeg: bp.azimuthOffsetDeg,
          };
        });
        setProjectedSubHorizonBeacons(beacons);
      } else if (renderFrameRef.current % 12 === 0) {
        setProjectedSubHorizonBeacons({} as typeof projectedSubHorizonBeacons);
      }

      renderFrameRef.current += 1;
      const refreshDecorLayers = renderFrameRef.current % 3 === 0;

      // Project Ecliptic golden arc (every 3rd frame — static relative to slow ephemeris drift)
      if (showEcliptic && refreshDecorLayers) {
        const eclipticCoords = eclipticEnuPoints.map((vec) => {
          const p = projectEnuToScreen(
            vec,
            effectiveHeading,
            effectivePitch,
            effectiveRoll,
            viewport.width,
            viewport.height,
            calibration.fieldOfViewDeg
          );
          return { x: p.u, y: p.v, inFront: p.isInFront };
        });
        setProjectedEcliptic(eclipticCoords);
      }

      // Project Horizon Cardinal Points (N, E, S, W)
      if (refreshDecorLayers) {
        const cardinalCoords = cardinalEnuPoints.map((c) => {
          const p = projectEnuToScreen(
            c.enu,
            effectiveHeading,
            effectivePitch,
            effectiveRoll,
            viewport.width,
            viewport.height,
            calibration.fieldOfViewDeg
          );
          return { label: c.label, x: p.u, y: p.v, inFront: p.isInFront };
        });
        setProjectedCardinals(cardinalCoords);

        const horizonCoords = horizonEnuPoints.map((vec) => {
          const p = projectEnuToScreen(
            vec,
            effectiveHeading,
            effectivePitch,
            effectiveRoll,
            viewport.width,
            viewport.height,
            calibration.fieldOfViewDeg
          );
          return { x: p.u, y: p.v, inFront: p.isInFront };
        });
        setProjectedHorizonLine(horizonCoords);
      }

      // Project stars and constellation lines (every 3rd frame)
      if (showConstellations && refreshDecorLayers) {
        const projectedStarCoords = new Map<string, { u: number; v: number; inFront: boolean }>();
        const starList: any[] = [];

        starsMap.forEach((s) => {
          const p = projectEnuToScreen(
            s.enuVector,
            effectiveHeading,
            effectivePitch,
            effectiveRoll,
            viewport.width,
            viewport.height,
            calibration.fieldOfViewDeg
          );
          projectedStarCoords.set(s.star.id, { u: p.u, v: p.v, inFront: p.isInFront });

          if (p.isInFront && p.u >= -30 && p.u <= viewport.width + 30 && p.v >= -30 && p.v <= viewport.height + 30) {
            starList.push({
              u: p.u,
              v: p.v,
              name: s.star.name,
              mag: s.star.mag,
              color: s.star.spectralColor,
              visible: true,
            });
          }
        });
        setProjectedStars(starList);

        // Constellation lines
        const lines: any[] = [];
        CONSTELLATION_DEFS.forEach((c) => {
          c.lines.forEach(([idA, idB]) => {
            const pA = projectedStarCoords.get(idA);
            const pB = projectedStarCoords.get(idB);
            if (pA && pB && (pA.inFront || pB.inFront)) {
              lines.push({
                x1: pA.u,
                y1: pA.v,
                x2: pB.u,
                y2: pB.v,
                visible: true,
              });
            }
          });
        });
        setProjectedConstellations(lines);
      }
    };

    renderLoop();
    return () => cancelAnimationFrame(animId);
  }, [
    orientation,
    manualYaw,
    manualPitch,
    manualRoll,
    allPositions,
    bodyEnuVectors,
    calibration,
    quickAzimuthNudge,
    quickAltitudeNudge,
    viewport,
    starsMap,
    eclipticEnuPoints,
    cardinalEnuPoints,
    horizonEnuPoints,
    showConstellations,
    showEcliptic,
    invertPitch,
    showSubHorizonPlanets,
    subHorizonCatalog,
  ]);

  // Auto-start camera when entering AR Mode
  useEffect(() => {
    if (viewMode === 'ar' && !isCameraActive && !cameraError) {
      startCamera();
    }
  }, [viewMode, isCameraActive, cameraError, startCamera]);

  // Touch and pointer dragging to pan AR sky view (for manual fine-tuning and desktop/mobile without gyro)
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, startAz: 0, startAlt: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.pointer-events-auto')) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startAz: quickAzimuthNudge,
      startAlt: quickAltitudeNudge,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const newAz = (dragStartRef.current.startAz - dx * 0.18 + 360) % 360;
    const newAlt = Math.max(-75, Math.min(75, dragStartRef.current.startAlt + dy * 0.18));
    setQuickAzimuthNudge(newAz);
    setQuickAltitudeNudge(newAlt);
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  // Angular-first detection: crosshair lock uses verified ephemeris + priority disambiguation
  const LOCK_ANGULAR_DEG = 5.5;
  const LOCK_PIXEL_PX = 68;
  const NEAR_ANGULAR_DEG = 18;
  const HYSTERESIS_ANGULAR_DEG = 1.0;
  const HYSTERESIS_PIXEL_PX = 22;

  const scoreCandidate = (angularSeparationDeg: number, distPx: number) =>
    angularSeparationDeg + (distPx / Math.max(viewport.width, 1)) * 6;

  const isCandidateLocked = (onScreen: boolean, angularSeparationDeg: number, distPx: number) =>
    onScreen && angularSeparationDeg < LOCK_ANGULAR_DEG && distPx < LOCK_PIXEL_PX;

  // Find the closest on-screen body to the optical crosshairs (Auto-Detection vs Manual Pin)
  const detectedTarget = useMemo(() => {
    const cx = viewport.width / 2;
    const cy = viewport.height / 2;

    if (!autoScanMode && selectedBody) {
      const pos = allPositions[selectedBody];
      const proj = projectedBodies[selectedBody];
      if (!proj || !pos) return null;

      const vis = classifyArBodyVisibility(pos.altitudeDeg, proj, viewport, showSubHorizonPlanets);
      if (vis === 'hidden') return null;

      const onScreen =
        vis === 'sub-surface'
          ? proj.isInFront &&
            isInArViewport(
              proj.u,
              proj.v,
              viewport,
              AR_VIEWPORT_MARGIN_PX,
              AR_SUB_HORIZON_BOTTOM_EXTRA_PX
            )
          : proj.isInFront && isInArViewport(proj.u, proj.v, viewport);

      const distPx = Math.hypot(proj.u - cx, proj.v - cy);
      const isLocked =
        onScreen && isCandidateLocked(onScreen, proj.angularSeparationDeg, distPx);

      return {
        bodyId: selectedBody,
        proj,
        isOnScreen: onScreen,
        isLocked,
        isSubHorizon: pos.altitudeDeg < 0,
      };
    }

    const candidates: {
      bodyId: CelestialBodyId;
      proj: (typeof projectedBodies)[CelestialBodyId];
      isOnScreen: boolean;
      isLocked: boolean;
      isSubHorizon: boolean;
      distFromCenterPx: number;
      score: number;
    }[] = [];

    CELESTIAL_BODY_LIST.forEach((b) => {
      const pos = allPositions[b.id];
      if (!pos) return;

      const p = projectedBodies[b.id];
      const vis = classifyArBodyVisibility(pos.altitudeDeg, p, viewport, showSubHorizonPlanets);

      if (vis === 'above' || vis === 'sub-surface') {
        if (!p || !p.isInFront) return;

        const onScreen =
          vis === 'sub-surface'
            ? isInArViewport(
                p.u,
                p.v,
                viewport,
                AR_VIEWPORT_MARGIN_PX,
                AR_SUB_HORIZON_BOTTOM_EXTRA_PX
              )
            : isInArViewport(p.u, p.v, viewport);

        const distPx = Math.hypot(p.u - cx, p.v - cy);
        const isLocked = isCandidateLocked(onScreen, p.angularSeparationDeg, distPx);

        candidates.push({
          bodyId: b.id,
          proj: p,
          isOnScreen: onScreen,
          isLocked,
          isSubHorizon: pos.altitudeDeg < 0,
          distFromCenterPx: distPx,
          score: scoreCandidate(p.angularSeparationDeg, distPx),
        });
        return;
      }

      if (vis === 'sub-beacon') {
        const beacon = projectedSubHorizonBeacons[b.id];
        if (!beacon || !beacon.isInFront || !p) return;
        if (Math.abs(beacon.azimuthOffsetDeg) > 24) return;

        const distPx = Math.hypot(beacon.u - cx, beacon.v - cy);
        candidates.push({
          bodyId: b.id,
          proj: p,
          isOnScreen: false,
          isLocked: false,
          isSubHorizon: true,
          distFromCenterPx: distPx,
          score:
            Math.abs(beacon.azimuthOffsetDeg) +
            Math.abs(pos.altitudeDeg) * 0.12 +
            p.angularSeparationDeg * 0.35,
        });
      }
    });

    const rankCandidates = (list: typeof candidates) =>
      [...list].sort((a, b) => {
        if (a.isOnScreen !== b.isOnScreen) return a.isOnScreen ? -1 : 1;
        const scoreDiff = a.score - b.score;
        if (Math.abs(scoreDiff) > 0.15) return scoreDiff;
        return CELESTIAL_DETECTION_PRIORITY[a.bodyId] - CELESTIAL_DETECTION_PRIORITY[b.bodyId];
      });

    const onScreenCandidates = candidates.filter((c) => c.isOnScreen);
    if (onScreenCandidates.length > 0) {
      const ranked = rankCandidates(onScreenCandidates);
      const best = ranked[0];
      const currentlyFocused = lastLockedBodyRef.current;

      if (currentlyFocused && currentlyFocused !== best.bodyId) {
        const currentCandidate = ranked.find((c) => c.bodyId === currentlyFocused);
        if (currentCandidate) {
          const angularGap = best.proj.angularSeparationDeg - currentCandidate.proj.angularSeparationDeg;
          const pixelGap = best.distFromCenterPx - currentCandidate.distFromCenterPx;
          if (angularGap + HYSTERESIS_ANGULAR_DEG > 0 && pixelGap + HYSTERESIS_PIXEL_PX > 0) {
            return currentCandidate;
          }
        }
      }

      lastLockedBodyRef.current = best.bodyId;
      return best;
    }

    lastLockedBodyRef.current = null;

    const guidanceCandidates = candidates.filter((c) => c.isSubHorizon || c.proj.isInFront);
    if (guidanceCandidates.length > 0) {
      return rankCandidates(guidanceCandidates)[0];
    }

    return null;
  }, [
    autoScanMode,
    selectedBody,
    projectedBodies,
    projectedSubHorizonBeacons,
    viewport,
    allPositions,
    showSubHorizonPlanets,
  ]);

  // Conjunction / Close Cluster Detection (when 2+ planets are within close proximity on screen)
  const nearbyClusterBodies = useMemo(() => {
    if (!detectedTarget || !detectedTarget.isOnScreen) return [];
    const targetProj = detectedTarget.proj;
    return CELESTIAL_BODY_LIST.filter((b) => {
      if (b.id === detectedTarget.bodyId) return false;
      const pos = allPositions[b.id];
      if (!pos) return false;
      const vis = classifyArBodyVisibility(pos.altitudeDeg, projectedBodies[b.id], viewport, showSubHorizonPlanets);
      if (vis === 'hidden') return false;
      const p = projectedBodies[b.id];
      if (!p || !p.isInFront) return false;
      const dist = Math.hypot(p.u - targetProj.u, p.v - targetProj.v);
      return dist < 120 || p.angularSeparationDeg < 12;
    }).map((b) => ({
      body: b,
      proj: projectedBodies[b.id],
      coords: allPositions[b.id],
    }));
  }, [detectedTarget, projectedBodies, viewport, allPositions, showSubHorizonPlanets]);

  // Current active body metadata and coordinates for HUD
  const currentTargetBodyId = detectedTarget?.bodyId || selectedBody;
  const currentMeta = CELESTIAL_BODIES[currentTargetBodyId] || CELESTIAL_BODIES.Sun;
  const currentCoords = allPositions[currentTargetBodyId] || allPositions[selectedBody] || allPositions.Sun;
  const currentProj = detectedTarget?.proj || (projectedBodies[currentTargetBodyId] || {
    u: -1000,
    v: -1000,
    isInFront: false,
    angularSeparationDeg: 180,
    azimuthOffsetDeg: 0,
    elevationOffsetDeg: 0,
  });

  const currentVisibility = classifyArBodyVisibility(
    currentCoords.altitudeDeg,
    currentProj,
    viewport,
    showSubHorizonPlanets
  );
  const isCurrentPlacedOnSky =
    currentVisibility === 'above' || currentVisibility === 'sub-surface';
  const isCurrentSubBeacon = currentVisibility === 'sub-beacon';
  const isCurrentLocked = detectedTarget?.isLocked ?? false;
  const isCurrentSubHorizon = currentCoords.altitudeDeg < 0;
  const isCurrentNear =
    detectedTarget &&
    (detectedTarget.proj.angularSeparationDeg < NEAR_ANGULAR_DEG ||
      detectedTarget.isOnScreen ||
      isCurrentSubBeacon);

  // Auto Lock-On Countdown & Pop-Up Trigger
  useEffect(() => {
    if (!detectedTarget || !detectedTarget.isLocked) {
      lockHoldTimerRef.current = null;
      return;
    }

    const { bodyId } = detectedTarget;

    // Check if dismissed recently within cooldown (2.2 seconds)
    if (
      lastDismissedRef.current &&
      lastDismissedRef.current.bodyId === bodyId &&
      Date.now() - lastDismissedRef.current.time < 2200
    ) {
      return;
    }

    if (!lockHoldTimerRef.current || lockHoldTimerRef.current.bodyId !== bodyId) {
      lockHoldTimerRef.current = { bodyId, startTime: Date.now() };
    } else if (Date.now() - lockHoldTimerRef.current.startTime > 320) {
      // Locked steady for 450ms! Open 3D planet modal
      setDiscoveredBodyId(bodyId);
      setIsModalOpen(true);
      lockHoldTimerRef.current = null;
      if (onSelectBody) onSelectBody(bodyId);
    }
  }, [detectedTarget, onSelectBody]);

  const handleCloseModal = () => {
    if (discoveredBodyId) {
      lastDismissedRef.current = { bodyId: discoveredBodyId, time: Date.now() };
    }
    setIsModalOpen(false);
  };

  // Screen perimeter guidance beacon calculation
  const edgeRadar = useMemo(() => {
    if (isCurrentPlacedOnSky) return null;

    const cx = viewport.width / 2;
    const cy = viewport.height / 2;
    let dx = currentProj.u - cx;
    let dy = currentProj.v - cy;

    if (!currentProj.isInFront) {
      dx = -dx;
      dy = -dy;
    }

    const margin = 48;
    const maxDx = cx - margin;
    const maxDy = cy - margin;

    const scaleX = maxDx / (Math.abs(dx) || 1e-6);
    const scaleY = maxDy / (Math.abs(dy) || 1e-6);
    const scale = Math.min(scaleX, scaleY);

    const edgeX = cx + dx * scale;
    const edgeY = cy + dy * scale;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;

    return {
      x: edgeX,
      y: edgeY,
      angleDeg,
      separation: currentProj.angularSeparationDeg || 90,
      bodyName: currentMeta.name,
      bodyColor: currentMeta.color,
      isSubHorizon: isCurrentSubHorizon,
    };
  }, [currentProj, isCurrentPlacedOnSky, viewport, currentMeta, isCurrentSubHorizon]);

  // Turn guidance instructions
  const guidanceInstruction = useMemo(() => {
    if (isCurrentLocked) return 'TARGET LOCKED';

    if (isCurrentSubHorizon && !isCurrentPlacedOnSky) {
      return subHorizonGuidanceText(currentCoords.altitudeDeg, currentCoords.azimuthDeg);
    }

    const azDiff = currentProj.azimuthOffsetDeg;
    const elDiff = currentProj.elevationOffsetDeg;

    const parts: string[] = [];
    if (Math.abs(azDiff) > 2.5) {
      if (azDiff > 0) parts.push(`Right ${Math.abs(azDiff).toFixed(0)}°`);
      else parts.push(`Left ${Math.abs(azDiff).toFixed(0)}°`);
    }

    if (Math.abs(elDiff) > 2.5) {
      if (elDiff > 0) parts.push(`Up ${Math.abs(elDiff).toFixed(0)}°`);
      else parts.push(`Down ${Math.abs(elDiff).toFixed(0)}°`);
    }

    if (parts.length === 0) return 'Centering...';
    return parts.join(' · ');
  }, [currentProj, isCurrentLocked, isCurrentSubHorizon, isCurrentPlacedOnSky, currentCoords]);

  const guidanceArrowAngle = useMemo(() => {
    return (Math.atan2(-currentProj.elevationOffsetDeg, currentProj.azimuthOffsetDeg) * 180) / Math.PI;
  }, [currentProj]);

  useEffect(() => {
    if (detectedTarget?.isLocked && currentCoords.altitudeDeg >= 0) {
      setArBodyLocked(true, detectedTarget.bodyId, {
        moonPhaseName: currentCoords.phaseName,
        sunAltitudeDeg: currentCoords.altitudeDeg,
      });
    } else {
      setArBodyLocked(false, null);
    }
  }, [
    detectedTarget?.isLocked,
    detectedTarget?.bodyId,
    currentCoords.altitudeDeg,
    currentCoords.phaseName,
    setArBodyLocked,
  ]);

  useEffect(() => {
    const bodyId = detectedTarget?.bodyId ?? selectedBody;
    if (!isCurrentLocked || currentCoords.altitudeDeg < 0) {
      reportArAlignmentHold(bodyId, false, 0);
      return;
    }
    const timer = window.setInterval(() => {
      reportArAlignmentHold(bodyId, true, 0.25);
    }, 250);
    return () => {
      window.clearInterval(timer);
      reportArAlignmentHold(bodyId, false, 0);
    };
  }, [
    isCurrentLocked,
    detectedTarget?.bodyId,
    selectedBody,
    currentCoords.altitudeDeg,
    reportArAlignmentHold,
  ]);

  // Compass Tape Ticks Generation
  const compassTicks = useMemo(() => {
    const ticks: { deg: number; label: string }[] = [];
    const cardinalLabels: Record<number, string> = {
      0: 'N',
      45: 'NE',
      90: 'E',
      135: 'SE',
      180: 'S',
      225: 'SW',
      270: 'W',
      315: 'NW',
    };

    for (let i = 0; i < 360; i += 15) {
      ticks.push({
        deg: i,
        label: cardinalLabels[i] || `${i}°`,
      });
    }
    return ticks;
  }, []);

  // 1-Tap Alignment Calibration to Target Body (Syncs both Azimuth and Altitude offsets immediately)
  const handleAlignToTargetBody = () => {
    const trueAz = currentCoords.azimuthDeg;
    const trueAlt = currentCoords.altitudeDeg;
    const azDiff = ((trueAz - hudHeading + 540) % 360) - 180;
    const altDiff = trueAlt - hudPitch;

    setQuickAzimuthNudge((prev) => (prev + azDiff + 360) % 360);
    setQuickAltitudeNudge((prev) => Math.max(-60, Math.min(60, prev + altDiff)));
  };

  return (
    <div className="space-y-3">
      {/* Horizontal Multi-Planet Selector Strip */}
      <CelestialBodySelector
        selectedBody={selectedBody}
        onSelectBody={(id) => onSelectBody && onSelectBody(id)}
        allPositions={allPositions}
      />

      {/* Mobile Gyro Permission Banner */}
      {needsOrientationPermission && (
        <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300 text-xs shadow-lg">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">Enable motion sensors for live sky tracking</span>
          </div>
          <button
            onClick={onRequestOrientationPermission}
            className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition shrink-0 ml-2"
          >
            Enable Gyro
          </button>
        </div>
      )}

      {/* Main AR / VR Viewport Container - Fully Responsive Height */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: 'none' }}
        className={`relative w-full h-[68vh] min-h-[440px] max-h-[720px] rounded-lg overflow-hidden shadow-2xl border transition-colors select-none cursor-grab active:cursor-grabbing ${
          nightVisionMode ? 'bg-[#180a0a] border-red-900/60' : 'bg-[#06080d] border-orbit-border'
        }`}
      >
        {/* Layer 1: Real-World Video Feed (AR Mode) */}
        {viewMode === 'ar' && (
          <video
            ref={videoRef}
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              isCameraActive ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}

        {/* Layer 2: Cosmic Planetarium Starfield (VR Mode or AR Sky Blend) */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            opacity: viewMode === 'vr' ? 1 : skyOpacity,
            background: nightVisionMode
              ? 'radial-gradient(ellipse at 50% 60%, #450a0a 0%, #1a0505 70%, #000000 100%)'
              : 'radial-gradient(ellipse at 50% 60%, #0f172a 0%, #020617 75%, #000000 100%)',
          }}
        />

        {/* Sub-horizon underground sky band (matches 3D sky explorer ground disc) */}
        {showSubHorizonPlanets && subHorizonCatalog.length > 0 && (
          <div
            className="absolute inset-x-0 bottom-0 pointer-events-none z-[4] border-t border-purple-500/25"
            style={{
              height: '36%',
              background:
                'linear-gradient(to top, rgba(46, 16, 101, 0.55) 0%, rgba(30, 27, 75, 0.28) 45%, transparent 100%)',
            }}
          />
        )}

        {/* Layer 3: SVG Celestial Vector Canvas */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-5">
          {/* Ecliptic Line */}
          {showEcliptic && projectedEcliptic.length > 2 && (
            <g opacity={nightVisionMode ? 0.35 : 0.65}>
              {projectedEcliptic.map((pt, i) => {
                const next = projectedEcliptic[(i + 1) % projectedEcliptic.length];
                if (!pt.inFront && !next.inFront) return null;
                if (Math.hypot(next.x - pt.x, next.y - pt.y) > viewport.width * 0.4) return null;

                return (
                  <line
                    key={`ecliptic-${i}`}
                    x1={pt.x}
                    y1={pt.y}
                    x2={next.x}
                    y2={next.y}
                    stroke={nightVisionMode ? '#ef4444' : '#F59E0B'}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                );
              })}
            </g>
          )}

          {/* Constellation Lines */}
          {showConstellations &&
            projectedConstellations.map((line, i) => (
              <line
                key={`line-${i}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.y2}
                stroke={nightVisionMode ? '#ef4444' : '#38bdf8'}
                strokeWidth={1.2}
                strokeDasharray="3 3"
                opacity={nightVisionMode ? 0.35 : 0.55}
              />
            ))}

          {/* Stars */}
          {showConstellations &&
            projectedStars.map((star, i) => (
              <g key={`star-${i}`} transform={`translate(${star.u}, ${star.v})`}>
                <circle
                  r={Math.max(1.5, 4.0 - star.mag * 0.75)}
                  fill={nightVisionMode ? '#f87171' : star.color}
                  opacity={0.9}
                />
                {star.mag < 1.6 && (
                  <text
                    x={7}
                    y={3}
                    fill={nightVisionMode ? '#fca5a5' : '#94a3b8'}
                    fontSize={9}
                    fontFamily="monospace"
                    opacity={0.65}
                  >
                    {star.name}
                  </text>
                )}
              </g>
            ))}

          {/* Continuous 360-Degree Local Horizon Line (Alt = 0°) */}
          {projectedHorizonLine.length > 2 && (
            <g opacity={nightVisionMode ? 0.4 : 0.65}>
              {projectedHorizonLine.map((pt, i) => {
                const next = projectedHorizonLine[(i + 1) % projectedHorizonLine.length];
                if (!pt.inFront && !next.inFront) return null;
                if (Math.hypot(next.x - pt.x, next.y - pt.y) > viewport.width * 0.35) return null;

                return (
                  <line
                    key={`horizon-${i}`}
                    x1={pt.x}
                    y1={pt.y}
                    x2={next.x}
                    y2={next.y}
                    stroke={nightVisionMode ? '#ef4444' : '#10b981'}
                    strokeWidth={1.5}
                    strokeDasharray="6 4"
                  />
                );
              })}
            </g>
          )}

          {/* Horizon Cardinal Markers (N, E, S, W) */}
          {projectedCardinals.map((c, i) => {
            if (!c.inFront || c.x < -30 || c.x > viewport.width + 30 || c.y < -30 || c.y > viewport.height + 30)
              return null;

            return (
              <g key={`cardinal-${i}`} transform={`translate(${c.x}, ${c.y})`}>
                <circle r={11} fill="rgba(15, 23, 42, 0.75)" stroke="#10b981" strokeWidth={1} opacity={0.8} />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#34d399"
                  fontSize={9}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  {c.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Camera Inactive Fallback Prompt in AR Mode */}
        {viewMode === 'ar' && !isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-0 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 mb-1">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-100">Live Camera Stream Inactive</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Enable your camera to blend the virtual star map over the real sky, or switch to <strong>VR Gyro</strong>!
            </p>
            {cameraError && (
              <p className="text-[11px] text-red-400 font-mono bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-900/60 max-w-md">
                {cameraError}
              </p>
            )}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                onClick={startCamera}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-amber-500/20"
              >
                Enable Camera
              </button>
              <button
                onClick={() => setViewMode('vr')}
                className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                VR Gyro Mode
              </button>
            </div>
          </div>
        )}

        {/* Minimalist Compass Ribbon at Top */}
        <div className="absolute top-0 inset-x-0 h-9 bg-gradient-to-b from-slate-950/90 to-transparent flex items-center justify-center overflow-hidden pointer-events-none z-10 border-b border-slate-800/30">
          <div className="relative w-72 h-full flex items-center justify-center">
            <div className="absolute top-0.5 text-amber-400 text-[10px]">▼</div>
            <div
              className="flex items-center gap-5 transition-transform duration-75"
              style={{
                transform: `translateX(${-((hudHeading % 360) * 3.5)}px)`,
              }}
            >
              {[...compassTicks, ...compassTicks, ...compassTicks].map((tick, i) => (
                <div key={i} className="flex flex-col items-center min-w-[28px] text-[9px] font-mono">
                  <span className={tick.label.length <= 2 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                    {tick.label}
                  </span>
                  <span className="w-0.5 h-1 bg-slate-700 mt-0.5" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sleek Floating Guidance Pill at Top Center */}
        <div className="absolute top-11 inset-x-2 flex flex-col items-center gap-1.5 pointer-events-auto z-20">
          {currentMeta.id === 'Sun' && !progress.safetyQuizPassed && (
            <div className="px-3 py-1.5 rounded-md border border-amber-500/50 bg-amber-950/90 text-[11px] text-amber-200 max-w-md text-center">
              Complete the safety quest on Welcome before relying on Sun AR guidance.
            </div>
          )}
          <div
            onClick={() => {
              setDiscoveredBodyId(currentMeta.id);
              setIsModalOpen(true);
            }}
            className={`px-3 py-1 rounded-md border shadow-lg flex items-center gap-1.5 text-[11px] font-mono transition-all max-w-[90vw] truncate cursor-pointer ${
              isCurrentLocked
                ? 'bg-[#0f1f1a] border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                : isCurrentNear
                ? 'bg-[#1f1910] border-amber-500/60 text-amber-300'
                : 'bg-orbit-background/95 border-orbit-border text-sky-300'
            }`}
          >
            {isCurrentLocked ? (
              <>
                <Target className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="font-semibold">TARGET LOCKED: {currentMeta.name}</span>
                {alignmentHoldProgress < 1 && (
                  <span className="text-[10px] text-violet-300">
                    Golden lock {Math.round(alignmentHoldProgress * 100)}%
                  </span>
                )}
                {alignmentHoldProgress >= 1 && (
                  <span className="text-[10px] text-violet-300">Golden lock ✓</span>
                )}
                <span className="text-[10px] text-emerald-400/80 hidden xs:inline">(Tap for 3D)</span>
              </>
            ) : isCurrentSubHorizon && !isCurrentPlacedOnSky ? (
              <>
                <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0 animate-pulse" />
                <span className="font-semibold text-violet-200 truncate">{guidanceInstruction}</span>
                <span className="text-[10px] text-violet-400/80 hidden sm:inline shrink-0">(Sub-sky)</span>
              </>
            ) : isCurrentNear ? (
              <>
                <div
                  className="w-3.5 h-3.5 flex items-center justify-center transition-transform shrink-0"
                  style={{ transform: `rotate(${guidanceArrowAngle}deg)` }}
                >
                  <Navigation className="w-3 h-3 text-amber-400 fill-amber-400" />
                </div>
                <span className="font-semibold">{guidanceInstruction}</span>
                <span className="text-[10px] text-slate-400">({currentMeta.name})</span>
              </>
            ) : (
              <>
                <Radio className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="font-semibold">
                  {autoScanMode ? 'Scanning Night Sky: Sweep camera across sky' : `Aligning with ${activeMeta.name}`}
                </span>
              </>
            )}
          </div>

          {/* Close Cluster / Conjunction Disambiguation Selector */}
          {nearbyClusterBodies.length > 0 && (
            <div className="bg-orbit-background/98 px-2.5 py-1 rounded-md border border-amber-500/40 shadow-2xl flex items-center gap-1.5 text-[10px] font-mono animate-fade-in max-w-[92vw] overflow-x-auto scrollbar-none">
              <span className="text-amber-400 font-semibold shrink-0">⚡ Cluster:</span>
              <button
                onClick={() => {
                  lastLockedBodyRef.current = currentMeta.id;
                  if (onSelectBody) onSelectBody(currentMeta.id);
                  setDiscoveredBodyId(currentMeta.id);
                  setIsModalOpen(true);
                }}
                className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold flex items-center gap-1 shrink-0 shadow-sm"
              >
                <span>{currentMeta.name}</span>
                <span className="text-[9px]">({currentProj?.angularSeparationDeg?.toFixed(1) || '0'}°)</span>
              </button>

              {nearbyClusterBodies.map(({ body, proj }) => (
                <button
                  key={body.id}
                  onClick={() => {
                    lastLockedBodyRef.current = body.id;
                    if (onSelectBody) onSelectBody(body.id);
                    setDiscoveredBodyId(body.id);
                    setIsModalOpen(true);
                  }}
                  className="px-2 py-0.5 rounded bg-orbit-elevated hover:bg-orbit-elevated text-slate-200 border border-orbit-border flex items-center gap-1 shrink-0 transition"
                >
                  <span style={{ color: body.color }}>{body.name}</span>
                  <span className="text-slate-400 text-[9px]">({proj.angularSeparationDeg.toFixed(1)}°)</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Uncluttered Top Right Action Bar (Mode Pill + Layers Button) */}
        <div className="absolute top-10 right-3 z-30 flex items-center gap-1.5 pointer-events-auto">
          {/* Auto-Scan Mode Switch Pill */}
          <button
            onClick={() => setAutoScanMode(!autoScanMode)}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 border backdrop-blur-md transition shadow-md ${
              autoScanMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
            title={autoScanMode ? 'Auto-Scan Mode: Detects whichever planet you aim at' : 'Manual Target Pin Mode'}
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">{autoScanMode ? 'Auto-Scan' : 'Manual Pin'}</span>
          </button>

          {/* Mode Switch Pill */}
          <button
            onClick={() => setViewMode(viewMode === 'ar' ? 'vr' : 'ar')}
            className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 border backdrop-blur-md transition shadow-md ${
              viewMode === 'vr'
                ? 'bg-purple-600/90 text-white border-purple-500'
                : 'bg-slate-900/80 text-slate-200 border-slate-800 hover:bg-slate-800'
            }`}
            title="Switch between AR Camera and VR Planetarium"
          >
            <Glasses className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden xs:inline">{viewMode === 'ar' ? 'AR' : 'VR'}</span>
          </button>

          {/* Unified Layers & Controls Button */}
          <button
            onClick={() => setIsLayersOpen(!isLayersOpen)}
            className={`p-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 border backdrop-blur-md transition shadow-md ${
              isLayersOpen
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-900/80 text-slate-200 border-slate-800 hover:bg-slate-800'
            }`}
            title="Display Layers & Options"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Uncluttered Display & Tools Popover Menu */}
        {isLayersOpen && (
          <div className="absolute top-20 right-3 w-64 max-w-[85vw] bg-slate-950/95 backdrop-blur-xl border border-slate-800 p-3.5 rounded-2xl shadow-2xl z-40 space-y-3 pointer-events-auto text-xs animate-fade-in">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Display & Tools</span>
              </span>
              <button
                onClick={() => setIsLayersOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Layer Toggles */}
            <div className="space-y-1.5">
              <button
                onClick={() => setShowConstellations(!showConstellations)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition ${
                  showConstellations
                    ? 'bg-sky-500/20 text-sky-200 border-sky-500/40'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800'
                }`}
              >
                <span>✨ Constellations & Stars</span>
                <span className="text-[10px] font-mono">{showConstellations ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => setShowEcliptic(!showEcliptic)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition ${
                  showEcliptic
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800'
                }`}
              >
                <span>🪐 Ecliptic Zodiac Orbit</span>
                <span className="text-[10px] font-mono">{showEcliptic ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={() => setShowAllPlanetsInAR(!showAllPlanetsInAR)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition ${
                  showAllPlanetsInAR
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800'
                }`}
              >
                <span>🌌 All Planets in Sky</span>
                <span className="text-[10px] font-mono">{showAllPlanetsInAR ? 'ALL' : 'SOLO'}</span>
              </button>

              <button
                onClick={() => {
                  const next = !showSubHorizonPlanets;
                  setShowSubHorizonPlanets(next);
                  try {
                    localStorage.setItem('skygazer_sub_horizon', String(next));
                  } catch {
                    /* ignore */
                  }
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition ${
                  showSubHorizonPlanets
                    ? 'bg-purple-500/20 text-purple-200 border-purple-500/40'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800'
                }`}
              >
                <span>🌍 Sub-Horizon Sky Layer</span>
                <span className="text-[10px] font-mono">
                  {showSubHorizonPlanets
                    ? `${subHorizonCatalog.length} BELOW`
                    : 'HIDDEN'}
                </span>
              </button>

              <button
                onClick={() => setInvertPitch(!invertPitch)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition ${
                  invertPitch
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800'
                }`}
              >
                <span>↕ Invert Tilt (Pitch Axis)</span>
                <span className="text-[10px] font-mono">{invertPitch ? 'INVERTED' : 'NORMAL'}</span>
              </button>

              <button
                onClick={() => setNightVisionMode(!nightVisionMode)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition ${
                  nightVisionMode
                    ? 'bg-red-600 text-white border-red-500'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800'
                }`}
              >
                <span>🔴 Red Night Vision</span>
                <span className="text-[10px] font-mono">{nightVisionMode ? 'ACTIVE' : 'OFF'}</span>
              </button>
            </div>

            {/* Camera Options in AR Mode */}
            {isCameraActive && viewMode === 'ar' && (
              <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                <button
                  onClick={toggleFacingMode}
                  title={`Switch camera lens (current: ${facingMode})`}
                  className="flex-1 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center gap-1.5 text-[11px]"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Switch Lens</span>
                </button>
                <button
                  onClick={stopCamera}
                  className="py-1.5 px-3 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/80 text-[11px]"
                >
                  Stop
                </button>
              </div>
            )}

            {/* Sky Transparency Slider */}
            <div className="pt-1.5 border-t border-slate-800 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Sky Opacity:</span>
                <span className="font-mono text-amber-300">{(skyOpacity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={skyOpacity}
                onChange={(e) => setSkyOpacity(parseFloat(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Calibration Trigger */}
            <button
              onClick={() => {
                setIsLayersOpen(false);
                onOpenCalibration();
              }}
              className="w-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1.5 text-[11px] transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Sensor Calibration</span>
            </button>

            {/* GPS Location Refresh Button */}
            {onRequestGps && (
              <button
                onClick={() => {
                  onRequestGps();
                }}
                disabled={gpsLoading}
                className="w-full py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 flex items-center justify-center gap-1.5 text-[11px] transition disabled:opacity-50"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>{gpsLoading ? 'Acquiring GPS...' : 'Acquire High-Accuracy GPS'}</span>
              </button>
            )}
          </div>
        )}

        {/* Central Optical HUD Scanner Crosshairs */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-15">
          <div className="relative flex items-center justify-center">
            {/* Outer Scanning Reticle Ring */}
            <div
              className={`rounded-full border border-dashed transition-all duration-300 ${
                isCurrentLocked
                  ? 'w-28 h-28 border-emerald-400 ring-4 ring-emerald-500/30 scale-95 animate-[spin_4s_linear_infinite]'
                  : isCurrentNear
                  ? 'w-26 h-26 border-amber-400/80 scale-100 animate-[spin_10s_linear_infinite]'
                  : 'w-24 h-24 border-sky-400/30 scale-100 animate-[spin_24s_linear_infinite]'
              }`}
            />

            {/* Precision Crosshairs Reticle */}
            <div className="absolute w-6 h-6 border border-sky-400/40 rounded-full flex items-center justify-center">
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  isCurrentLocked
                    ? 'bg-emerald-400 animate-ping'
                    : isCurrentNear
                    ? 'bg-amber-400'
                    : 'bg-sky-400/60'
                }`}
              />
            </div>
            <div className="absolute w-10 h-px bg-sky-400/30 -left-10" />
            <div className="absolute w-10 h-px bg-sky-400/30 -right-10" />
            <div className="absolute h-10 w-px bg-sky-400/30 -top-10" />
            <div className="absolute h-10 w-px bg-sky-400/30 -bottom-10" />
          </div>
        </div>

        {/* Render ALL Visible Solar System Planets with Photorealistic 3D Appearance */}
        {showAllPlanetsInAR &&
          CELESTIAL_BODY_LIST.map((b) => {
            if (b.id === currentTargetBodyId) return null;

            const pos = allPositions[b.id];
            const proj = projectedBodies[b.id];
            if (!pos || !proj) return null;

            const vis = classifyArBodyVisibility(pos.altitudeDeg, proj, viewport, showSubHorizonPlanets);
            if (vis !== 'above' && vis !== 'sub-surface') return null;
            if (!proj.isInFront) return null;

            const inView =
              vis === 'sub-surface'
                ? isInArViewport(
                    proj.u,
                    proj.v,
                    viewport,
                    AR_VIEWPORT_MARGIN_PX,
                    AR_SUB_HORIZON_BOTTOM_EXTRA_PX
                  )
                : isInArViewport(proj.u, proj.v, viewport);
            if (!inView) return null;

            const isSubSurface = vis === 'sub-surface';
            const thumbUrl = getPlanetThumbnail(b.id, 96);

            return (
              <div
                key={b.id}
                onClick={() => {
                  if (onSelectBody) onSelectBody(b.id);
                  setDiscoveredBodyId(b.id);
                  setIsModalOpen(true);
                }}
                className={`absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-15 flex flex-col items-center transition-transform group ${
                  isSubSurface ? 'opacity-75 hover:opacity-100 hover:scale-110' : 'hover:scale-125'
                }`}
                style={{ left: `${proj.u}px`, top: `${proj.v}px` }}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className={`absolute -inset-1 rounded-full blur-sm transition-opacity ${
                      isSubSurface ? 'opacity-40 group-hover:opacity-70' : 'opacity-60 group-hover:opacity-100'
                    }`}
                    style={{ backgroundColor: b.color }}
                  />
                  <img
                    src={thumbUrl}
                    alt={b.name}
                    className={`relative w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] ${
                      isSubSurface ? 'grayscale-[35%]' : ''
                    }`}
                    loading="lazy"
                  />
                </div>

                <div
                  className={`mt-0.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-mono shadow-md backdrop-blur-sm border ${
                    isSubSurface
                      ? 'bg-purple-950/90 border-purple-800/80'
                      : 'bg-slate-950/90 border-slate-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isSubSurface ? 'bg-violet-400' : 'bg-emerald-400 animate-pulse'
                    }`}
                  />
                  <span className="text-slate-200 font-semibold">{b.name}</span>
                  {isSubSurface && (
                    <span className="text-violet-300">{pos.altitudeDeg.toFixed(0)}°</span>
                  )}
                </div>
              </div>
            );
          })}

        {/* Sub-horizon azimuth beacons on the horizon arc (when body is below ground) */}
        {showSubHorizonPlanets &&
          showAllPlanetsInAR &&
          subHorizonCatalog.map(({ bodyId, coords }) => {
            if (bodyId === currentTargetBodyId) return null;
            const vis = classifyArBodyVisibility(
              coords.altitudeDeg,
              projectedBodies[bodyId],
              viewport,
              true
            );
            if (vis !== 'sub-beacon') return null;

            const beacon = projectedSubHorizonBeacons[bodyId];
            if (!beacon || !beacon.isInFront) return null;
            if (
              beacon.u < -20 ||
              beacon.u > viewport.width + 20 ||
              beacon.v < -20 ||
              beacon.v > viewport.height + 20
            ) {
              return null;
            }

            const meta = CELESTIAL_BODIES[bodyId];

            return (
              <button
                key={`beacon-${bodyId}`}
                type="button"
                onClick={() => {
                  if (onSelectBody) onSelectBody(bodyId);
                  setDiscoveredBodyId(bodyId);
                  setIsModalOpen(true);
                }}
                className="absolute pointer-events-auto z-14 flex flex-col items-center -translate-x-1/2 -translate-y-1/2 opacity-80 hover:opacity-100 transition-opacity"
                style={{ left: `${beacon.u}px`, top: `${beacon.v}px` }}
                title={subHorizonGuidanceText(coords.altitudeDeg, coords.azimuthDeg)}
              >
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-mono text-violet-300 mb-0.5">↓</span>
                  <div className="w-7 h-7 rounded-full border border-dashed border-violet-400/70 bg-purple-950/80 flex items-center justify-center overflow-hidden">
                    <img
                      src={getPlanetThumbnail(bodyId, 48)}
                      alt={meta.name}
                      className="w-5 h-5 object-contain opacity-70"
                    />
                  </div>
                  <span className="mt-0.5 text-[8px] font-mono text-violet-200 bg-purple-950/90 px-1 rounded border border-purple-800/60">
                    {meta.name} {coords.altitudeDeg.toFixed(0)}°
                  </span>
                </div>
              </button>
            );
          })}

        {/* Primary Selected Target AR Reticle */}
        {isCurrentPlacedOnSky && (
          <div
            onClick={() => {
              setDiscoveredBodyId(currentMeta.id);
              setIsModalOpen(true);
            }}
            className={`absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out z-25 flex flex-col items-center group ${
              isCurrentSubHorizon ? 'opacity-90' : ''
            }`}
            style={{ left: `${currentProj.u}px`, top: `${currentProj.v}px` }}
          >
            <div className="relative flex items-center justify-center">
              <div
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-dashed ${
                  isCurrentLocked
                    ? 'animate-[spin_4s_linear_infinite] border-amber-400 ring-4 ring-amber-400/30'
                    : 'animate-[spin_12s_linear_infinite]'
                }`}
                style={{ borderColor: currentMeta.color }}
              />

              <div
                className="absolute w-18 h-18 rounded-full border border-current opacity-85"
                style={{ color: currentMeta.color }}
              />

              <div
                className="absolute w-20 h-20 border-t-2 border-l-2 border-current opacity-75 -top-1 -left-1"
                style={{ color: currentMeta.color }}
              />
              <div
                className="absolute w-20 h-20 border-b-2 border-r-2 border-current opacity-75 -bottom-1 -right-1"
                style={{ color: currentMeta.color }}
              />

              <div className="relative flex items-center justify-center">
                <div
                  className="absolute -inset-2 rounded-full blur-md opacity-70 animate-pulse"
                  style={{ backgroundColor: currentMeta.color }}
                />
                <img
                  src={getPlanetThumbnail(currentMeta.id, 128)}
                  alt={currentMeta.name}
                  className="relative w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-[0_0_16px_rgba(0,0,0,0.9)] group-hover:scale-110 transition-transform"
                />
              </div>
            </div>

            <div className="mt-2 bg-slate-950/95 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-800 text-center font-mono text-[10px] space-y-0.5 shadow-2xl">
              <div className="flex items-center justify-center gap-1.5">
                <span className="font-bold text-white text-xs">{currentMeta.name}</span>
                {isCurrentLocked ? (
                  <span className="px-1.5 py-0.2 rounded text-[8px] bg-emerald-500 text-slate-950 font-bold uppercase animate-pulse">
                    LOCKED (TAP FOR 3D)
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[8px] bg-amber-500/30 text-amber-300 font-bold uppercase">
                    {currentProj.angularSeparationDeg.toFixed(1)}°
                  </span>
                )}
              </div>
              <div className="text-amber-300 flex flex-col items-center justify-center gap-0.5">
                <span>
                  Az: {currentCoords.azimuthDeg.toFixed(1)}° | Alt: {currentCoords.altitudeDeg.toFixed(1)}°
                  {currentCoords.altitudeDeg < 0 && (
                    <span className="text-[8px] bg-red-950/90 text-red-300 px-1 py-0.5 rounded border border-red-800 font-bold ml-1">
                      SUB-HORIZON
                    </span>
                  )}
                  {currentCoords.rightAscensionDeg !== undefined && currentCoords.declinationDeg !== undefined && (
                    <span className="text-sky-300/90">
                      {' '}
                      · RA: {currentCoords.rightAscensionDeg.toFixed(1)}° Dec:{' '}
                      {currentCoords.declinationDeg >= 0 ? '+' : ''}
                      {currentCoords.declinationDeg.toFixed(1)}°
                    </span>
                  )}
                </span>
                <span className="text-[8px] text-slate-400">
                  Crosshair offset: {currentProj.azimuthOffsetDeg.toFixed(1)}° az ·{' '}
                  {currentProj.elevationOffsetDeg >= 0 ? '+' : ''}
                  {currentProj.elevationOffsetDeg.toFixed(1)}° el
                  {currentCoords.positionVerified ? ' · ✓ verified' : ''}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Screen-Edge Radar Pointer */}
        {edgeRadar && (
          <div
            className="absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-75 ease-out animate-pulse"
            style={{ left: `${edgeRadar.x}px`, top: `${edgeRadar.y}px` }}
            onClick={() => {
              if (onSelectBody) onSelectBody(currentMeta.id);
            }}
            title={
              edgeRadar.isSubHorizon
                ? `${subHorizonGuidanceText(currentCoords.altitudeDeg, currentCoords.azimuthDeg)} (${edgeRadar.separation.toFixed(0)}°)`
                : `Pan towards ${currentMeta.name} (${edgeRadar.separation.toFixed(0)}°)`
            }
          >
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full shadow-xl backdrop-blur-md text-slate-100 border ${
                edgeRadar.isSubHorizon
                  ? 'bg-purple-950/95 border-violet-400/70'
                  : 'bg-slate-950/95 border-amber-400'
              }`}
            >
              <div
                className={`text-xs font-bold ${edgeRadar.isSubHorizon ? 'text-violet-300' : 'text-amber-400'}`}
                style={{ transform: `rotate(${edgeRadar.angleDeg}deg)` }}
              >
                {edgeRadar.isSubHorizon ? '↓' : '➔'}
              </div>
              <img
                src={getPlanetThumbnail(currentMeta.id, 64)}
                alt={currentMeta.name}
                className="w-4 h-4 rounded-full object-contain"
              />
              <span className="font-bold text-[10px] text-white">{currentMeta.name}</span>
              <span className="text-[9px] font-mono text-amber-300 bg-amber-500/20 px-1 rounded">
                {edgeRadar.separation.toFixed(0)}°
              </span>
            </div>
          </div>
        )}

        {/* Minimalist Bottom Control Strip */}
        <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between pointer-events-auto z-20 gap-2">
          {/* Heading & Pitch Chip */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-800 text-[10px] text-slate-300 shadow-md">
            <Eye className="w-3 h-3 text-amber-400" />
            <span className="font-mono">
              {hudHeading.toFixed(0)}° Az · {hudPitch.toFixed(0)}° Alt
            </span>
          </div>

          {/* Quick Compass & Tilt Calibration Trim Capsule */}
          <div className="flex items-center gap-1 bg-slate-950/90 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-800 text-[10px] shadow-md">
            <button
              onClick={() => setIsTrimOpen(!isTrimOpen)}
              className="text-slate-400 hover:text-white flex items-center gap-1 font-mono pr-1"
            >
              <span>Trim</span>
              {(quickAzimuthNudge !== 0 || quickAltitudeNudge !== 0) && (
                <span className="text-amber-400 font-bold">
                  ({quickAzimuthNudge !== 0 ? `Az:${quickAzimuthNudge > 0 ? '+' : ''}${quickAzimuthNudge.toFixed(0)}° ` : ''}
                  {quickAltitudeNudge !== 0 ? `Tilt:${quickAltitudeNudge > 0 ? '+' : ''}${quickAltitudeNudge.toFixed(0)}°` : ''})
                </span>
              )}
            </button>

            {isTrimOpen && (
              <div className="flex flex-wrap items-center gap-1.5 pl-1.5 border-l border-slate-800 animate-fade-in text-[9px] font-mono">
                {/* Azimuth Nudge */}
                <span className="text-slate-400">Az:</span>
                <button
                  onClick={() => setQuickAzimuthNudge((prev) => prev - 5)}
                  className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-800 hover:bg-slate-800"
                  title="Shift heading left 5°"
                >
                  -5°
                </button>
                <button
                  onClick={() => setQuickAzimuthNudge((prev) => prev + 5)}
                  className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-400 border border-slate-800 hover:bg-slate-800"
                  title="Shift heading right 5°"
                >
                  +5°
                </button>

                {/* Altitude / Tilt Nudge */}
                <span className="text-slate-400 pl-1">Tilt:</span>
                <button
                  onClick={() => setQuickAltitudeNudge((prev) => prev - 3)}
                  className="px-1.5 py-0.5 rounded bg-slate-900 text-sky-400 border border-slate-800 hover:bg-slate-800"
                  title="Tilt pitch down by 3°"
                >
                  -3°
                </button>
                <button
                  onClick={() => setQuickAltitudeNudge((prev) => prev + 3)}
                  className="px-1.5 py-0.5 rounded bg-slate-900 text-sky-400 border border-slate-800 hover:bg-slate-800"
                  title="Tilt pitch up by 3°"
                >
                  +3°
                </button>

                {(quickAzimuthNudge !== 0 || quickAltitudeNudge !== 0) && (
                  <button
                    onClick={() => {
                      setQuickAzimuthNudge(0);
                      setQuickAltitudeNudge(0);
                    }}
                    className="p-1 rounded bg-slate-900 text-slate-400 hover:text-white"
                    title="Reset Trim"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                )}

                <button
                  onClick={() => setInvertPitch(!invertPitch)}
                  className={`px-1.5 py-0.5 rounded border ${
                    invertPitch
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                  title="Invert Vertical Tilt (Pitch)"
                >
                  Inv: {invertPitch ? 'ON' : 'OFF'}
                </button>

                <button
                  onClick={handleAlignToTargetBody}
                  className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40 hover:bg-amber-500/30 whitespace-nowrap"
                  title={`1-Tap Calibrate: Lock ${currentMeta.name} onto center crosshairs`}
                >
                  🎯 Align to {currentMeta.name}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Photorealistic 3D Planet Discovery Pop-Up Modal */}
        {isModalOpen && discoveredBodyId && (
          <PlanetDiscoveryModal
            bodyId={discoveredBodyId}
            coordinates={allPositions[discoveredBodyId]}
            onClose={handleCloseModal}
            onNavigateTo3DExplorer={onNavigateTo3DExplorer}
          />
        )}
      </div>
    </div>
  );
}
