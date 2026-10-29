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

  // Modern UI states: clean popover menus to eliminate screen clutter
  const [isLayersOpen, setIsLayersOpen] = useState<boolean>(false);
  const [isTrimOpen, setIsTrimOpen] = useState<boolean>(false);

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

      const hasSensor =
        orientation.compassHeading !== undefined &&
        orientation.compassHeading !== null &&
        orientation.cameraPitch !== undefined &&
        orientation.cameraPitch !== null;

      const targetAlpha = hasSensor ? orientation.compassHeading! : manualYaw;
      const targetBeta = hasSensor ? orientation.cameraPitch! : manualPitch;
      const targetGamma =
        orientation.cameraRoll !== undefined && orientation.cameraRoll !== null ? orientation.cameraRoll! : manualRoll;

      // Exponential smoothing low-pass filter
      const smoothFactor = hasSensor ? 0.25 : 0.45;
      smoothedAnglesRef.current.heading += (targetAlpha - smoothedAnglesRef.current.heading) * smoothFactor;
      smoothedAnglesRef.current.pitch += (targetBeta - smoothedAnglesRef.current.pitch) * smoothFactor;
      smoothedAnglesRef.current.roll += (targetGamma - smoothedAnglesRef.current.roll) * smoothFactor;

      const rawAlpha = smoothedAnglesRef.current.heading;
      const rawBeta = smoothedAnglesRef.current.pitch;
      const rawGamma = smoothedAnglesRef.current.roll;

      const effectiveHeading =
        (rawAlpha + calibration.declinationDeg + calibration.azimuthNudgeDeg + quickAzimuthNudge + 360) % 360;
      const effectivePitch = Math.max(-89.9, Math.min(89.9, rawBeta + calibration.altitudeNudgeDeg));
      const effectiveRoll = rawGamma;

      setHudHeading(effectiveHeading);
      setHudPitch(effectivePitch);

      // Project all 9 Solar System bodies using Orthonormal Camera Matrix
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

      // Project Ecliptic golden arc
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

      // Project Horizon Cardinal Points (N, E, S, W)
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

      // Project stars and constellation lines
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

  const isTargetOnScreen =
    activeProj.isInFront &&
    activeProj.u >= 35 &&
    activeProj.u <= viewport.width - 35 &&
    activeProj.v >= 35 &&
    activeProj.v <= viewport.height - 35;

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

  // Turn guidance instructions
  const guidanceInstruction = useMemo(() => {
    if (isTargetLocked) return 'TARGET LOCKED';

    const azDiff = activeProj.azimuthOffsetDeg;
    const elDiff = activeProj.elevationOffsetDeg;

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
  }, [activeProj, isTargetLocked]);

  const guidanceArrowAngle = useMemo(() => {
    return (Math.atan2(-activeProj.elevationOffsetDeg, activeProj.azimuthOffsetDeg) * 180) / Math.PI;
  }, [activeProj]);

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

  const handleSnapCompassToBody = () => {
    const trueAz = activeCoords.azimuthDeg;
    const diff = trueAz - hudHeading;
    setQuickAzimuthNudge((prev) => (prev + diff + 360) % 360);
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
        className={`relative w-full h-[68vh] min-h-[440px] max-h-[720px] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border transition-colors select-none ${
          nightVisionMode ? 'bg-red-950/90 border-red-800' : 'bg-slate-950 border-slate-800'
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
        <div className="absolute top-11 inset-x-2 flex justify-center pointer-events-none z-20">
          <div
            className={`px-3 py-1 rounded-full backdrop-blur-md border shadow-xl flex items-center gap-1.5 text-[11px] font-mono transition-all max-w-[90vw] truncate ${
              isTargetLocked
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/40'
                : 'bg-slate-950/90 border-amber-500/50 text-amber-300'
            }`}
          >
            {isTargetLocked ? (
              <Target className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
            ) : (
              <div
                className="w-3.5 h-3.5 flex items-center justify-center transition-transform shrink-0"
                style={{ transform: `rotate(${guidanceArrowAngle}deg)` }}
              >
                <Navigation className="w-3 h-3 text-amber-400 fill-amber-400" />
              </div>
            )}
            <span className="font-semibold">{guidanceInstruction}</span>
            <span className="text-[10px] text-slate-400 truncate">({activeMeta.name})</span>
          </div>
        </div>

        {/* Uncluttered Top Right Action Bar (Mode Pill + Layers Button) */}
        <div className="absolute top-10 right-3 z-30 flex items-center gap-1.5 pointer-events-auto">
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

          {/* Unified Layers & Controls Button (Unclutters the viewport!) */}
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
          </div>
        )}

        {/* Center Crosshair */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="relative w-7 h-7 flex items-center justify-center opacity-30">
            <div className="absolute w-full h-[1px] bg-slate-400" />
            <div className="absolute h-full w-[1px] bg-slate-400" />
            <div className="w-2.5 h-2.5 rounded-full border border-slate-400" />
          </div>
        </div>

        {/* Render ALL Visible Solar System Planets with Photorealistic 3D Appearance */}
        {showAllPlanetsInAR &&
          CELESTIAL_BODY_LIST.map((b) => {
            if (b.id === selectedBody) return null;
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
                    className="relative w-8 h-8 object-contain drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]"
                    loading="lazy"
                  />
                </div>

                <div className="mt-0.5 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-slate-800 text-[9px] font-mono shadow-md backdrop-blur-sm">
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

        {/* Primary Selected Target AR Reticle */}
        {isTargetOnScreen && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out z-25 flex flex-col items-center"
            style={{ left: `${activeProj.u}px`, top: `${activeProj.v}px` }}
          >
            <div className="relative flex items-center justify-center">
              <div
                className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-dashed ${
                  isTargetLocked
                    ? 'animate-[spin_4s_linear_infinite] border-amber-400 ring-4 ring-amber-400/25'
                    : 'animate-[spin_12s_linear_infinite]'
                }`}
                style={{ borderColor: activeMeta.color }}
              />

              <div
                className="absolute w-18 h-18 rounded-full border border-current opacity-85"
                style={{ color: activeMeta.color }}
              />

              <div
                className="absolute w-20 h-20 border-t-2 border-l-2 border-current opacity-75 -top-1 -left-1"
                style={{ color: activeMeta.color }}
              />
              <div
                className="absolute w-20 h-20 border-b-2 border-r-2 border-current opacity-75 -bottom-1 -right-1"
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
                  className="relative w-12 h-12 sm:w-14 sm:h-14 object-contain drop-shadow-[0_0_16px_rgba(0,0,0,0.9)]"
                />
              </div>
            </div>

            <div className="mt-2 bg-slate-950/95 backdrop-blur-md px-3 py-1 rounded-xl border border-slate-800 text-center font-mono text-[10px] space-y-0.5 shadow-2xl">
              <div className="flex items-center justify-center gap-1.5">
                <span className="font-bold text-white text-xs">{activeMeta.name}</span>
                {isTargetLocked && (
                  <span className="px-1.5 py-0.2 rounded text-[8px] bg-emerald-500 text-slate-950 font-bold uppercase">
                    LOCKED
                  </span>
                )}
              </div>
              <div className="text-amber-300">
                Az: {activeCoords.azimuthDeg.toFixed(1)}° | Alt: {activeCoords.altitudeDeg.toFixed(1)}°
              </div>
            </div>
          </div>
        )}

        {/* Screen-Edge Radar Pointer */}
        {edgeRadar && (
          <div
            className="absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-30 transition-all duration-75 ease-out animate-pulse"
            style={{ left: `${edgeRadar.x}px`, top: `${edgeRadar.y}px` }}
            onClick={() => onSelectBody && onSelectBody(activeMeta.id)}
            title={`Pan towards ${activeMeta.name} (${edgeRadar.separation.toFixed(0)}°)`}
          >
            <div className="flex items-center gap-1.5 bg-slate-950/95 border border-amber-400 px-2 py-1 rounded-full shadow-xl backdrop-blur-md text-slate-100">
              <div
                className="text-amber-400 text-xs font-bold"
                style={{ transform: `rotate(${edgeRadar.angleDeg}deg)` }}
              >
                ➔
              </div>
              <img
                src={getPlanetThumbnail(activeMeta.id, 64)}
                alt={activeMeta.name}
                className="w-4 h-4 rounded-full object-contain"
              />
              <span className="font-bold text-[10px] text-white">{activeMeta.name}</span>
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

          {/* Quick Compass Trim Capsule */}
          <div className="flex items-center gap-1 bg-slate-950/90 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-800 text-[10px] shadow-md">
            <button
              onClick={() => setIsTrimOpen(!isTrimOpen)}
              className="text-slate-400 hover:text-white flex items-center gap-1 font-mono pr-1"
            >
              <span>Trim</span>
              {quickAzimuthNudge !== 0 && (
                <span className="text-amber-400 font-bold">({quickAzimuthNudge > 0 ? '+' : ''}{quickAzimuthNudge}°)</span>
              )}
            </button>

            {isTrimOpen && (
              <div className="flex items-center gap-1 pl-1 border-l border-slate-800 animate-fade-in">
                <button
                  onClick={() => setQuickAzimuthNudge((prev) => prev - 5)}
                  className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-400 font-mono text-[9px] border border-slate-800"
                >
                  -5°
                </button>
                <button
                  onClick={() => setQuickAzimuthNudge((prev) => prev + 5)}
                  className="px-1.5 py-0.5 rounded bg-slate-900 text-amber-400 font-mono text-[9px] border border-slate-800"
                >
                  +5°
                </button>
                {quickAzimuthNudge !== 0 && (
                  <button
                    onClick={() => setQuickAzimuthNudge(0)}
                    className="p-1 rounded bg-slate-900 text-slate-400"
                    title="Reset"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  onClick={handleSnapCompassToBody}
                  className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold text-[9px] border border-amber-500/40"
                  title={`Snap compass heading to ${activeMeta.name}`}
                >
                  Snap
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
