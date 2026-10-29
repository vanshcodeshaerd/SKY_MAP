import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Camera,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  Eye,
  Glasses,
  Moon,
  Orbit,
  Compass,
  Navigation,
  Target,
  RotateCcw,
} from 'lucide-react';
import {
  GeodeticLocation,
  ManualCalibration,
  DeviceOrientationState,
  CelestialBodyId,
  CELESTIAL_BODIES,
  CELESTIAL_BODY_LIST,
} from '../../types/astronomy';
import { getClientCelestialPosition, getAllCelestialPositions } from '../../services/astronomyEngine';
import { azAltToEnuVector, projectEnuToScreen } from '../../services/coordinateTransforms';
import { useCameraStream } from '../../hooks/useCameraStream';
import { calculateStarPositions, CONSTELLATION_DEFS } from '../../services/starCatalog';
import { getPlanetThumbnail } from '../../services/planetTextures';
import { CelestialBodySelector } from '../../components/CelestialBodySelector';
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
}: ARSkyViewProps) {
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

  // Quick compass trim for real-life magnetic alignment (+/- degrees on the fly)
  const [quickAzimuthNudge, setQuickAzimuthNudge] = useState<number>(0);

  const [viewport, setViewport] = useState({ width: 800, height: 600 });

  const activeMeta = CELESTIAL_BODIES[selectedBody] || CELESTIAL_BODIES.Sun;

  // Real-time planetary positions (VSOP87)
  const activeCoords = useMemo(() => {
    return getClientCelestialPosition(selectedBody, location, currentDate);
  }, [selectedBody, location, currentDate]);

  const allPositions = useMemo(() => {
    return getAllCelestialPositions(location, currentDate);
  }, [location, currentDate]);

  // Pre-calculate topocentric Star Catalog positions only when location/time changes
  const starsMap = useMemo(() => {
    return calculateStarPositions(location, currentDate, 80);
  }, [location, currentDate]);

  // Pre-calculate topocentric Ecliptic Orbit path (golden planetary highway across sky)
  const eclipticEnuPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const eps = (23.43928 * Math.PI) / 180;
    const sinEps = Math.sin(eps);
    const cosEps = Math.cos(eps);

    for (let deg = 0; deg < 360; deg += 10) {
      const lambda = (deg * Math.PI) / 180;
      const sinLambda = Math.sin(lambda);
      const cosLambda = Math.cos(lambda);

      const ra = Math.atan2(cosEps * sinLambda, cosLambda);
      const dec = Math.asin(sinEps * sinLambda);

      const d = (currentDate.getTime() / 86400000) - 10957.5;
      const gmstHours = (18.697374558 + 24.06570982441908 * d) % 24;
      const lstRad = ((gmstHours + location.longitude / 15) * 15 * Math.PI) / 180;
      const ha = lstRad - ra;

      const latRad = (location.latitude * Math.PI) / 180;
      const sinAlt = Math.sin(latRad) * Math.sin(dec) + Math.cos(latRad) * Math.cos(dec) * Math.cos(ha);
      const altRad = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

      const cosAlt = Math.cos(altRad);
      const cosAz = (Math.sin(dec) - Math.sin(latRad) * sinAlt) / (cosAlt * Math.cos(latRad) || 1e-5);
      let azRad = Math.acos(Math.max(-1, Math.min(1, cosAz)));
      if (Math.sin(ha) > 0) azRad = 2 * Math.PI - azRad;

      const azDeg = (azRad * 180) / Math.PI;
      const altDeg = (altRad * 180) / Math.PI;

      points.push(azAltToEnuVector(azDeg, altDeg));
    }
    return points;
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

  // Gyro Smoothing State for jitter-free 60 FPS motion
  const smoothedAnglesRef = useRef({ heading: 180, pitch: 30, roll: 0 });
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

      // 1. Determine target attitude angles from device sensor or manual drags
      // Uses the upgraded true compass heading and elevation pitch from useDeviceOrientation
      const hasSensor =
        orientation.compassHeading !== undefined &&
        orientation.compassHeading !== null &&
        orientation.cameraPitch !== undefined &&
        orientation.cameraPitch !== null;

      const targetAlpha = hasSensor ? orientation.compassHeading! : manualYaw;
      const targetBeta = hasSensor ? orientation.cameraPitch! : manualPitch;
      const targetGamma = orientation.cameraRoll !== undefined && orientation.cameraRoll !== null ? orientation.cameraRoll! : manualRoll;

      // 2. Exponential smoothing (low-pass filter) to eliminate phone sensor jitter
      const smoothFactor = hasSensor ? 0.25 : 0.45;
      smoothedAnglesRef.current.heading += (targetAlpha - smoothedAnglesRef.current.heading) * smoothFactor;
      smoothedAnglesRef.current.pitch += (targetBeta - smoothedAnglesRef.current.pitch) * smoothFactor;
      smoothedAnglesRef.current.roll += (targetGamma - smoothedAnglesRef.current.roll) * smoothFactor;

      const rawAlpha = smoothedAnglesRef.current.heading;
      const rawBeta = smoothedAnglesRef.current.pitch;
      const rawGamma = smoothedAnglesRef.current.roll;

      // Apply magnetic declination, calibration nudge, and on-the-fly quick trim
      const effectiveHeading =
        (rawAlpha + calibration.declinationDeg + calibration.azimuthNudgeDeg + quickAzimuthNudge + 360) % 360;
      const effectivePitch = Math.max(-89.9, Math.min(89.9, rawBeta + calibration.altitudeNudgeDeg));
      const effectiveRoll = rawGamma;

      setHudHeading(effectiveHeading);
      setHudPitch(effectivePitch);

      // 3. Project all 9 Solar System bodies using mathematically exact ENU-to-Camera Orthonormal Matrix
      const bodyProjs: Record<CelestialBodyId, any> = {} as any;
      CELESTIAL_BODY_LIST.forEach((body) => {
        const pos = allPositions[body.id];
        if (pos) {
          const enu = azAltToEnuVector(pos.azimuthDeg, pos.altitudeDeg);
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

      // 4. Project Ecliptic golden arc
      if (showEcliptic) {
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

      // 5. Project Horizon Cardinal Points (N, E, S, W)
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

      // 6. Project stars and constellation lines
      if (showConstellations) {
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
    calibration,
    quickAzimuthNudge,
    viewport,
    starsMap,
    eclipticEnuPoints,
    cardinalEnuPoints,
    showConstellations,
    showEcliptic,
  ]);

  const activeProj = projectedBodies[selectedBody] || {
    u: -1000,
    v: -1000,
    isInFront: false,
    angularSeparationDeg: 180,
    azimuthOffsetDeg: 0,
    elevationOffsetDeg: 0,
  };

  // Is active planet within visible screen bounds
  const isTargetOnScreen =
    activeProj.isInFront &&
    activeProj.u >= 35 &&
    activeProj.u <= viewport.width - 35 &&
    activeProj.v >= 35 &&
    activeProj.v <= viewport.height - 35;

  // Is target locked (centered in reticle within 5.5 degrees)
  const isTargetLocked = isTargetOnScreen && activeProj.angularSeparationDeg < 5.5;

  // Screen perimeter guidance beacon calculation
  const edgeRadar = useMemo(() => {
    if (isTargetOnScreen) return null;

    const cx = viewport.width / 2;
    const cy = viewport.height / 2;
    let dx = activeProj.u - cx;
    let dy = activeProj.v - cy;

    if (!activeProj.isInFront) {
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
      separation: activeProj.angularSeparationDeg || 90,
    };
  }, [activeProj, isTargetOnScreen, viewport]);

  // Compute flight guidance turn instructions
  const guidanceInstruction = useMemo(() => {
    if (isTargetLocked) return 'TARGET LOCKED';

    const azDiff = activeProj.azimuthOffsetDeg;
    const elDiff = activeProj.elevationOffsetDeg;

    const parts: string[] = [];

    if (Math.abs(azDiff) > 2.5) {
      if (azDiff > 0) parts.push(`Turn Right ${Math.abs(azDiff).toFixed(0)}°`);
      else parts.push(`Turn Left ${Math.abs(azDiff).toFixed(0)}°`);
    }

    if (Math.abs(elDiff) > 2.5) {
      if (elDiff > 0) parts.push(`Tilt Up ${Math.abs(elDiff).toFixed(0)}°`);
      else parts.push(`Tilt Down ${Math.abs(elDiff).toFixed(0)}°`);
    }

    if (parts.length === 0) return 'Aligning crosshair...';
    return parts.join(' & ');
  }, [activeProj, isTargetLocked]);

  // Guidance Arrow Rotation Angle (points directly along 2D turn direction)
  const guidanceArrowAngle = useMemo(() => {
    return (Math.atan2(-activeProj.elevationOffsetDeg, activeProj.azimuthOffsetDeg) * 180) / Math.PI;
  }, [activeProj]);

  // Compass Tape Ticks Generation (around current heading)
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

  // Quick Align Compass to Currently Selected Body (Sun or Moon in daylight/night)
  const handleSnapCompassToBody = () => {
    // Aligns current heading to match the selected celestial body's true azimuth
    const trueAz = activeCoords.azimuthDeg;
    const diff = trueAz - hudHeading;
    setQuickAzimuthNudge((prev) => (prev + diff + 360) % 360);
  };

  return (
    <div className="space-y-4">
      {/* Horizontal Multi-Planet Selector Strip */}
      <CelestialBodySelector
        selectedBody={selectedBody}
        onSelectBody={(id) => onSelectBody && onSelectBody(id)}
        allPositions={allPositions}
      />

      {/* iOS / Mobile Gyro Permission Banner */}
      {needsOrientationPermission && (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-300 text-xs shadow-lg">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Enable device motion sensors for real-time sky orientation tracking</span>
          </div>
          <button
            onClick={onRequestOrientationPermission}
            className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition"
          >
            Enable Gyro
          </button>
        </div>
      )}

      {/* Main AR / VR Viewport Container */}
      <div
        ref={containerRef}
        className={`relative w-full h-[580px] rounded-3xl overflow-hidden shadow-2xl border transition-colors select-none ${
          nightVisionMode
            ? 'bg-red-950/90 border-red-800 ring-2 ring-red-600/30'
            : 'bg-slate-950 border-slate-800'
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

        {/* Layer 3: SVG Celestial Vector Canvas (Constellations, Ecliptic, Stars, Horizon) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-5">
          {/* Glowing Golden Ecliptic Line (Planetary Highway) */}
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
                    strokeWidth={1.75}
                    strokeDasharray="4 4"
                  />
                );
              })}
            </g>
          )}

          {/* Glowing Constellation Lines */}
          {showConstellations &&
            projectedConstellations.map((line, i) => (
              <line
                key={`line-${i}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.y2}
                stroke={nightVisionMode ? '#ef4444' : '#38bdf8'}
                strokeWidth={1.25}
                strokeDasharray="3 3"
                opacity={nightVisionMode ? 0.4 : 0.55}
              />
            ))}

          {/* Star Field Points & Labels */}
          {showConstellations &&
            projectedStars.map((star, i) => (
              <g key={`star-${i}`} transform={`translate(${star.u}, ${star.v})`}>
                <circle
                  r={Math.max(1.5, 4.2 - star.mag * 0.75)}
                  fill={nightVisionMode ? '#f87171' : star.color}
                  opacity={0.9}
                />
                <circle
                  r={Math.max(3, 7.5 - star.mag * 1.2)}
                  fill={nightVisionMode ? '#ef4444' : star.color}
                  opacity={0.25}
                />
                {star.mag < 1.8 && (
                  <text
                    x={8}
                    y={3}
                    fill={nightVisionMode ? '#fca5a5' : '#94a3b8'}
                    fontSize={9}
                    fontFamily="monospace"
                    opacity={0.7}
                  >
                    {star.name}
                  </text>
                )}
              </g>
            ))}

          {/* Projected Cardinal Horizon Markers (N, E, S, W) */}
          {projectedCardinals.map((c, i) => {
            if (!c.inFront || c.x < -30 || c.x > viewport.width + 30 || c.y < -30 || c.y > viewport.height + 30)
              return null;

            return (
              <g key={`cardinal-${i}`} transform={`translate(${c.x}, ${c.y})`}>
                <circle r={12} fill="rgba(15, 23, 42, 0.7)" stroke="#10b981" strokeWidth={1} opacity={0.8} />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#34d399"
                  fontSize={10}
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
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 mb-1">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">Live Camera Stream Inactive</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Enable your camera to blend the virtual star map and planets over the real sky, or switch to{' '}
              <strong>VR Gyro Planetarium</strong> mode!
            </p>
            {cameraError && (
              <p className="text-xs text-red-400 font-mono bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-900/60 max-w-md">
                {cameraError}
              </p>
            )}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-amber-500/20"
              >
                Enable Camera
              </button>
              <button
                onClick={() => setViewMode('vr')}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
              >
                Switch to VR Gyro Mode
              </button>
            </div>
          </div>
        )}

        {/* Star Walk Style Top Compass Azimuth Tape HUD */}
        <div className="absolute top-0 inset-x-0 h-11 bg-gradient-to-b from-slate-950/90 to-transparent flex items-center justify-center overflow-hidden pointer-events-none z-10 border-b border-slate-800/40">
          <div className="relative w-80 h-full flex items-center justify-center">
            {/* Center Pointer Triangle */}
            <div className="absolute top-1 text-amber-400 text-xs">▼</div>
            {/* Compass Scale */}
            <div
              className="flex items-center gap-6 transition-transform duration-75"
              style={{
                transform: `translateX(${-((hudHeading % 360) * 4)}px)`,
              }}
            >
              {[...compassTicks, ...compassTicks, ...compassTicks].map((tick, i) => (
                <div key={i} className="flex flex-col items-center min-w-[32px] text-[10px] font-mono">
                  <span className={tick.label.length <= 2 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                    {tick.label}
                  </span>
                  <span className="w-0.5 h-1.5 bg-slate-600 mt-0.5" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Flight-Grade Guidance Banner at Top Center */}
        <div className="absolute top-12 inset-x-4 flex justify-center pointer-events-none z-20">
          <div
            className={`px-4 py-1.5 rounded-full backdrop-blur-md border shadow-2xl flex items-center gap-2 text-xs font-mono transition-all ${
              isTargetLocked
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40 animate-pulse'
                : 'bg-slate-950/90 border-amber-500/60 text-amber-300'
            }`}
          >
            {isTargetLocked ? (
              <Target className="w-4 h-4 text-emerald-400 animate-spin" />
            ) : (
              <div
                className="w-4 h-4 flex items-center justify-center transition-transform"
                style={{ transform: `rotate(${guidanceArrowAngle}deg)` }}
              >
                <Navigation className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              </div>
            )}
            <span className="font-semibold">{guidanceInstruction}</span>
            <span className="text-[10px] text-slate-400 font-normal">
              ({activeMeta.name}: {activeProj.angularSeparationDeg.toFixed(0)}° away)
            </span>
          </div>
        </div>

        {/* Pitch Ladder Elevation Indicator (Left Side) */}
        <div className="absolute left-3 top-20 bottom-20 w-10 flex flex-col justify-between items-center pointer-events-none z-10 text-[10px] font-mono text-slate-400">
          <span>+90°</span>
          <span>+60°</span>
          <span>+30°</span>
          <span className="text-amber-400 font-bold bg-slate-950/80 px-1 py-0.5 rounded border border-amber-500/40">
            {hudPitch >= 0 ? '+' : ''}{hudPitch.toFixed(0)}°
          </span>
          <span>-30°</span>
          <span>-60°</span>
          <span>-90°</span>
        </div>

        {/* Top Control Action Bar (Right Side) */}
        <div className="absolute top-14 right-4 z-20 flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* Mode Switch (AR vs VR) */}
          <button
            onClick={() => setViewMode(viewMode === 'ar' ? 'vr' : 'ar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border backdrop-blur-md transition shadow-lg ${
              viewMode === 'vr'
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-slate-900/80 text-slate-200 border-slate-800 hover:bg-slate-800'
            }`}
            title="Toggle between Camera AR Overlay and Gyro VR Planetarium"
          >
            <Glasses className="w-3.5 h-3.5" />
            <span>{viewMode === 'ar' ? 'AR Camera' : 'VR Planetarium'}</span>
          </button>

          {/* Red Night Vision Mode Toggle */}
          <button
            onClick={() => setNightVisionMode(!nightVisionMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border backdrop-blur-md transition shadow-lg ${
              nightVisionMode
                ? 'bg-red-600 text-white border-red-500 ring-2 ring-red-500/50'
                : 'bg-slate-900/80 text-slate-200 border-slate-800 hover:bg-slate-800'
            }`}
            title="Toggle Red Night Vision Mode for Dark Adaptation"
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Red Mode</span>
          </button>

          {/* Ecliptic Orbit Highway Toggle */}
          <button
            onClick={() => setShowEcliptic(!showEcliptic)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md transition shadow-lg ${
              showEcliptic
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900/80 text-slate-400 border-slate-800'
            }`}
            title="Toggle the Golden Ecliptic Zodiac Path"
          >
            <Orbit className="w-3.5 h-3.5 inline mr-1" />
            <span>Ecliptic</span>
          </button>

          {/* Constellations Overlay Toggle */}
          <button
            onClick={() => setShowConstellations(!showConstellations)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md transition shadow-lg ${
              showConstellations
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                : 'bg-slate-900/80 text-slate-400 border-slate-800'
            }`}
          >
            Constellations
          </button>

          {/* All Planets in AR Toggle */}
          <button
            onClick={() => setShowAllPlanetsInAR(!showAllPlanetsInAR)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border backdrop-blur-md transition shadow-lg ${
              showAllPlanetsInAR
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900/80 text-slate-400 border-slate-800'
            }`}
          >
            {showAllPlanetsInAR ? 'All Planets ON' : 'Solo Target'}
          </button>

          {isCameraActive && viewMode === 'ar' && (
            <>
              <button
                onClick={toggleFacingMode}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 backdrop-blur-md text-xs transition shadow-lg"
                title={`Switch camera (current: ${facingMode})`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={stopCamera}
                className="px-2.5 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900/80 text-red-200 border border-red-800/80 backdrop-blur-md text-xs transition shadow-lg"
              >
                Stop
              </button>
            </>
          )}

          <button
            onClick={onOpenCalibration}
            className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-800 backdrop-blur-md text-xs flex items-center gap-1.5 transition shadow-lg"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>Calibrate</span>
          </button>
        </div>

        {/* Center Crosshair (Weapon / Science HUD Style) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative w-8 h-8 flex items-center justify-center opacity-40">
            <div className="absolute w-full h-[1px] bg-slate-400" />
            <div className="absolute h-full w-[1px] bg-slate-400" />
            <div className="w-3 h-3 rounded-full border border-slate-400" />
          </div>
        </div>

        {/* Render ALL Visible Solar System Planets with Photorealistic 3D Appearance */}
        {showAllPlanetsInAR &&
          CELESTIAL_BODY_LIST.map((b) => {
            if (b.id === selectedBody) return null; // handled by primary target lock reticle below
            const proj = projectedBodies[b.id];
            if (!proj || !proj.isInFront) return null;
            if (proj.u < 15 || proj.u > viewport.width - 15 || proj.v < 15 || proj.v > viewport.height - 15) return null;

            const isPlanetAboveHorizon = (allPositions[b.id]?.altitudeDeg || 0) > 0;
            const thumbUrl = getPlanetThumbnail(b.id, 96);

            return (
              <div
                key={b.id}
                onClick={() => onSelectBody && onSelectBody(b.id)}
                className="absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-15 flex flex-col items-center hover:scale-125 transition-transform group"
                style={{ left: `${proj.u}px`, top: `${proj.v}px` }}
              >
                <div className="relative flex items-center justify-center">
                  <div
                    className="absolute -inset-1 rounded-full blur-sm opacity-60 group-hover:opacity-100 transition-opacity"
                    style={{ backgroundColor: b.color }}
                  />
                  <img
                    src={thumbUrl}
                    alt={b.name}
                    className="relative w-9 h-9 object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                    loading="lazy"
                  />
                </div>

                <div className="mt-1 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-slate-800 text-[10px] font-mono shadow-md backdrop-blur-sm">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isPlanetAboveHorizon ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                    }`}
                  />
                  <span className="text-slate-200 font-semibold">{b.name}</span>
                </div>
              </div>
            );
          })}

        {/* Primary Selected Target AR Reticle (Star Walk / Flight HUD Lock) */}
        {isTargetOnScreen && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out z-25 flex flex-col items-center"
            style={{ left: `${activeProj.u}px`, top: `${activeProj.v}px` }}
          >
            <div className="relative flex items-center justify-center">
              <div
                className={`w-28 h-28 rounded-full border-2 border-dashed ${
                  isTargetLocked
                    ? 'animate-[spin_4s_linear_infinite] border-amber-400 ring-4 ring-amber-400/25'
                    : 'animate-[spin_12s_linear_infinite]'
                }`}
                style={{ borderColor: activeMeta.color }}
              />

              <div
                className="absolute w-20 h-20 rounded-full border border-current opacity-85"
                style={{ color: activeMeta.color }}
              />

              <div
                className="absolute w-24 h-24 border-t-2 border-l-2 border-current opacity-75 -top-1 -left-1"
                style={{ color: activeMeta.color }}
              />
              <div
                className="absolute w-24 h-24 border-b-2 border-r-2 border-current opacity-75 -bottom-1 -right-1"
                style={{ color: activeMeta.color }}
              />

              <div className="relative flex items-center justify-center">
                <div
                  className="absolute -inset-2 rounded-full blur-md opacity-70 animate-pulse"
                  style={{ backgroundColor: activeMeta.color }}
                />
                <img
                  src={getPlanetThumbnail(activeMeta.id, 128)}
                  alt={activeMeta.name}
                  className="relative w-14 h-14 object-contain drop-shadow-[0_0_16px_rgba(0,0,0,0.9)]"
                />
              </div>
            </div>

            <div className="mt-3 bg-slate-950/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800 text-center font-mono text-[11px] space-y-0.5 shadow-2xl">
              <div className="flex items-center justify-center gap-1.5">
                <span className="font-bold text-white text-xs">
                  {activeMeta.symbol} {activeMeta.name}
                </span>
                {isTargetLocked ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500 text-slate-950 font-bold uppercase animate-pulse">
                    TARGET ACQUIRED
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-300 font-semibold">
                    {activeProj.angularSeparationDeg.toFixed(1)}° OFF
                  </span>
                )}
              </div>
              <div className="text-amber-300 text-[10px]">
                Az: {activeCoords.azimuthDeg.toFixed(1)}° | Alt: {activeCoords.altitudeDeg.toFixed(1)}°
              </div>
              {activeCoords.distanceAu && (
                <div className="text-slate-400 text-[9px]">
                  {activeCoords.distanceAu < 0.01
                    ? `${(activeCoords.distanceKm || 0).toLocaleString()} km`
                    : `${activeCoords.distanceAu.toFixed(3)} AU`}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Flight-Grade Screen-Edge Radar Pointer (Guides user directly to off-screen planet) */}
        {edgeRadar && (
          <div
            className="absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-75 ease-out animate-pulse"
            style={{ left: `${edgeRadar.x}px`, top: `${edgeRadar.y}px` }}
            onClick={() => onSelectBody && onSelectBody(activeMeta.id)}
            title={`Pan towards ${activeMeta.name} (${edgeRadar.separation.toFixed(0)}° away)`}
          >
            <div className="flex items-center gap-1.5 bg-slate-950/95 border-2 border-amber-400 px-2.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md text-slate-100">
              <div
                className="text-amber-400 text-sm font-bold flex items-center justify-center"
                style={{ transform: `rotate(${edgeRadar.angleDeg}deg)` }}
              >
                ➔
              </div>
              <img
                src={getPlanetThumbnail(activeMeta.id, 64)}
                alt={activeMeta.name}
                className="w-5 h-5 rounded-full object-contain"
              />
              <span className="font-bold text-[11px] text-white">{activeMeta.name}</span>
              <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-1 rounded">
                {edgeRadar.separation.toFixed(0)}°
              </span>
            </div>
          </div>
        )}

        {/* Target Acquisition Observatory Dossier Card (Star Walk style when target locked) */}
        {isTargetLocked && (
          <div className="absolute bottom-16 left-6 right-6 md:left-auto md:right-6 md:w-84 bg-slate-950/95 backdrop-blur-md p-4 rounded-2xl border border-emerald-500/60 shadow-2xl z-30 space-y-2.5 pointer-events-auto animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img
                  src={getPlanetThumbnail(activeMeta.id, 96)}
                  alt={activeMeta.name}
                  className="w-10 h-10 object-contain drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                />
                <div>
                  <h4 className="font-bold text-white text-sm">{activeMeta.name}</h4>
                  <span className="text-[10px] text-emerald-400 font-mono uppercase font-semibold">
                    {activeMeta.category.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-lg animate-pulse">
                100% IN VIEW
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{activeMeta.description}</p>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[10px] font-mono">
              <div className="bg-slate-900/60 p-1.5 rounded-lg">
                <span className="text-slate-400 block">Atmosphere</span>
                <span className="text-slate-200 font-semibold">{activeMeta.color}</span>
              </div>
              <div className="bg-slate-900/60 p-1.5 rounded-lg">
                <span className="text-slate-400 block">Separation</span>
                <span className="text-emerald-400 font-semibold">
                  {activeProj.angularSeparationDeg.toFixed(2)}° (Locked)
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom AR HUD Control Strip & Real-World Compass Alignment Controls */}
        <div className="absolute bottom-3 inset-x-4 flex flex-wrap items-center justify-between pointer-events-auto z-20 gap-2">
          {/* Compass Heading & Field of View Badge */}
          <div className="flex items-center gap-2 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 shadow-lg">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-[10px]">
              Heading: {hudHeading.toFixed(0)}° | Pitch: {hudPitch.toFixed(0)}° | FOV: {calibration.fieldOfViewDeg}°
            </span>
          </div>

          {/* Quick Real-Life Compass Alignment Controls */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-slate-800 text-xs shadow-lg">
            <span className="text-[10px] text-slate-400 font-mono">Compass Trim:</span>
            <button
              onClick={() => setQuickAzimuthNudge((prev) => prev - 5)}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 font-mono text-[10px] border border-slate-800"
              title="Nudge Compass 5 degrees left"
            >
              -5°
            </button>
            <button
              onClick={() => setQuickAzimuthNudge((prev) => prev + 5)}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-amber-400 font-mono text-[10px] border border-slate-800"
              title="Nudge Compass 5 degrees right"
            >
              +5°
            </button>
            {quickAzimuthNudge !== 0 && (
              <button
                onClick={() => setQuickAzimuthNudge(0)}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px]"
                title="Reset compass trim"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={handleSnapCompassToBody}
              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[10px] border border-amber-500/40 ml-1 transition"
              title={`Snap compass heading directly to ${activeMeta.name} in the sky`}
            >
              Snap to {activeMeta.name}
            </button>
          </div>

          {/* Sky Opacity Slider */}
          <div className="hidden sm:flex items-center gap-2 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-300 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-[10px]">Sky Blend:</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={skyOpacity}
              onChange={(e) => setSkyOpacity(parseFloat(e.target.value))}
              className="w-20 accent-amber-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
