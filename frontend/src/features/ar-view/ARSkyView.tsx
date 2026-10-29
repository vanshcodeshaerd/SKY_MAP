import { useEffect, useRef, useState, useMemo } from 'react';
import {
  Camera,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  ArrowUpRight,
  Eye,
  Glasses,
  Moon,
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
import { azAltToEnuVector, orientationToQuaternion, projectVectorToScreen } from '../../services/coordinateTransforms';
import { useCameraStream } from '../../hooks/useCameraStream';
import { calculateStarPositions, CONSTELLATION_DEFS, CalculatedStar } from '../../services/starCatalog';
import { CelestialBodySelector } from '../../components/CelestialBodySelector';

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
  const { videoRef, isActive: isCameraActive, error: cameraError, startCamera, stopCamera, toggleFacingMode, facingMode } = useCameraStream();

  // Mode: AR (Camera Passthrough) vs VR (Gyro Cosmic Planetarium)
  const [viewMode, setViewMode] = useState<'ar' | 'vr'>('ar');
  const [nightVisionMode, setNightVisionMode] = useState<boolean>(false);
  const [showConstellations, setShowConstellations] = useState<boolean>(true);
  const [showAllPlanetsInAR, setShowAllPlanetsInAR] = useState<boolean>(true);
  const [skyOpacity, setSkyOpacity] = useState<number>(0.65); // 0 = camera only, 1 = full star map

  const [viewport, setViewport] = useState({ width: 800, height: 600 });

  const activeMeta = CELESTIAL_BODIES[selectedBody] || CELESTIAL_BODIES.Sun;

  // Real-time planetary positions
  const activeCoords = useMemo(() => {
    return getClientCelestialPosition(selectedBody, location, currentDate);
  }, [selectedBody, location, currentDate]);

  const allPositions = useMemo(() => {
    return getAllCelestialPositions(location, currentDate);
  }, [location, currentDate]);

  // Projected screen coordinates map for all 9 bodies
  const [projectedBodies, setProjectedBodies] = useState<
    Record<
      CelestialBodyId,
      { u: number; v: number; isInFront: boolean; angularSeparationDeg: number }
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

  // Current effective heading & pitch for HUD
  const [currentHeading, setCurrentHeading] = useState<number>(180);
  const [currentPitch, setCurrentPitch] = useState<number>(30);

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

      // 1. Determine effective attitude angles
      const hasSensor = orientation.alpha !== null && orientation.beta !== null && orientation.gamma !== null;
      const alpha = hasSensor ? orientation.alpha! : manualYaw;
      const beta = hasSensor ? orientation.beta! : manualPitch;
      const gamma = hasSensor ? orientation.gamma! : manualRoll;

      setCurrentHeading(alpha);
      setCurrentPitch(beta);

      // 2. Compute camera attitude quaternion
      const cameraQuat = orientationToQuaternion(
        alpha,
        beta,
        gamma,
        calibration.azimuthNudgeDeg,
        calibration.altitudeNudgeDeg,
        calibration.declinationDeg
      );

      const invQuat = cameraQuat.clone().invert();

      // 3. Project all 9 Solar System bodies
      const bodyProjs: Record<CelestialBodyId, any> = {} as any;
      CELESTIAL_BODY_LIST.forEach((body) => {
        const pos = allPositions[body.id];
        if (pos) {
          const enu = azAltToEnuVector(pos.azimuthDeg, pos.altitudeDeg);
          const camVec = enu.clone().applyQuaternion(invQuat);
          bodyProjs[body.id] = projectVectorToScreen(
            camVec,
            viewport.width,
            viewport.height,
            calibration.fieldOfViewDeg
          );
        }
      });
      setProjectedBodies(bodyProjs);

      // 4. Project stars and constellation lines if enabled
      if (showConstellations) {
        const starsMap: Map<string, CalculatedStar> = calculateStarPositions(location, currentDate, 80);
        const projectedStarCoords = new Map<string, { u: number; v: number; inFront: boolean }>();

        const starList: any[] = [];
        starsMap.forEach((s) => {
          const camVec = s.enuVector.clone().applyQuaternion(invQuat);
          const p = projectVectorToScreen(camVec, viewport.width, viewport.height, calibration.fieldOfViewDeg);
          projectedStarCoords.set(s.star.id, { u: p.u, v: p.v, inFront: p.isInFront });

          if (p.isInFront && p.u >= 0 && p.u <= viewport.width && p.v >= 0 && p.v <= viewport.height) {
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
    viewport,
    location,
    currentDate,
    showConstellations,
  ]);

  const activeProj = projectedBodies[selectedBody] || {
    u: -1000,
    v: -1000,
    isInFront: false,
    angularSeparationDeg: 180,
  };

  // Is active planet within visible screen bounds
  const isTargetOnScreen =
    activeProj.isInFront &&
    activeProj.u >= 30 &&
    activeProj.u <= viewport.width - 30 &&
    activeProj.v >= 30 &&
    activeProj.v <= viewport.height - 30;

  // Is target locked (centered in reticle)
  const isTargetLocked = isTargetOnScreen && activeProj.angularSeparationDeg < 8.0;

  // Offscreen target angle for guide arrow
  const offscreenAngleDeg = useMemo(() => {
    const dx = activeProj.u - viewport.width / 2;
    const dy = activeProj.v - viewport.height / 2;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }, [activeProj, viewport]);

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

  return (
    <div
      className={`space-y-4 animate-fade-in ${
        nightVisionMode ? 'text-red-400 font-mono select-none' : ''
      }`}
    >
      {/* Target Body Selector Bar */}
      <div
        className={`glass-panel p-3 rounded-2xl border ${
          nightVisionMode ? 'border-red-900 bg-red-950/40 text-red-300' : 'border-slate-800'
        } space-y-2`}
      >
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-semibold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AR Star Gazer Target:</span>
            <strong className="text-amber-300 font-bold">{activeMeta.name}</strong>
          </span>
          <span className="text-[11px] opacity-75 font-mono">
            {isTargetLocked ? '🎯 TARGET LOCKED' : `Angular distance: ${activeProj.angularSeparationDeg.toFixed(1)}°`}
          </span>
        </div>
        <CelestialBodySelector
          selectedBody={selectedBody}
          onSelectBody={(body) => onSelectBody && onSelectBody(body)}
          allPositions={allPositions}
        />
      </div>

      {/* AR Viewport Container (Star Walk / SkyView HUD Interface) */}
      <div
        ref={containerRef}
        className={`glass-panel rounded-2xl overflow-hidden relative border ${
          nightVisionMode ? 'border-red-900 bg-black' : 'border-slate-800 bg-slate-950'
        } w-full h-[580px] flex items-center justify-center shadow-2xl`}
      >
        {/* AR Mode: Real Camera Stream */}
        {viewMode === 'ar' && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition duration-300 ${
              isCameraActive ? 'opacity-100' : 'opacity-0'
            } ${nightVisionMode ? 'filter grayscale contrast-125 sepia hue-rotate-[320deg]' : ''}`}
          />
        )}

        {/* VR Planetarium Mode: Deep Space Gradient Background */}
        {viewMode === 'vr' && (
          <div className="absolute inset-0 bg-gradient-to-b from-[#02040b] via-[#050b18] to-[#010206] pointer-events-none" />
        )}

        {/* Virtual Starfield & Constellations Overlay Canvas (Inspired by Star Walk & SkyView) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
          style={{ opacity: viewMode === 'ar' ? skyOpacity : 1.0 }}
        >
          {/* Constellation Connection Lines */}
          {showConstellations &&
            projectedConstellations.map((line, idx) => (
              <line
                key={idx}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={nightVisionMode ? '#ef4444' : '#38bdf8'}
                strokeWidth={1.5}
                strokeDasharray="4 2"
                opacity={0.55}
              />
            ))}

          {/* Real Bright Navigational Stars */}
          {showConstellations &&
            projectedStars.map((star, idx) => (
              <g key={idx} transform={`translate(${star.u}, ${star.v})`}>
                <circle
                  r={Math.max(1.8, 4.5 - star.mag * 0.8)}
                  fill={nightVisionMode ? '#f87171' : star.color}
                  opacity={0.9}
                />
                <circle
                  r={Math.max(3, 7.5 - star.mag * 1.2)}
                  fill={nightVisionMode ? '#ef4444' : star.color}
                  opacity={0.25}
                />
                <text
                  x={8}
                  y={4}
                  fill={nightVisionMode ? '#fca5a5' : '#94a3b8'}
                  fontSize={10}
                  fontFamily="monospace"
                  opacity={0.7}
                >
                  {star.name}
                </text>
              </g>
            ))}
        </svg>

        {/* Camera Inactive Fallback Prompt in AR Mode */}
        {viewMode === 'ar' && !isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-0 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 mb-1">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">Live Camera Stream Inactive</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Enable your camera to blend the virtual star map and planets over the real sky, or switch to <strong>VR Gyro Planetarium</strong> mode!
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
                transform: `translateX(${-((currentHeading % 360) * 4)}px)`,
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

        {/* Pitch Ladder Elevation Indicator (Left Side) */}
        <div className="absolute left-3 top-20 bottom-20 w-10 flex flex-col justify-between items-center pointer-events-none z-10 text-[10px] font-mono text-slate-400">
          <span>+90°</span>
          <span>+60°</span>
          <span>+30°</span>
          <span className="text-amber-400 font-bold bg-slate-950/80 px-1 py-0.5 rounded border border-amber-500/40">
            {currentPitch >= 0 ? '+' : ''}{currentPitch.toFixed(0)}°
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
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
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

        {/* Render ALL Visible Planets in AR View */}
        {showAllPlanetsInAR &&
          CELESTIAL_BODY_LIST.map((b) => {
            if (b.id === selectedBody) return null; // handled by primary reticle below
            const proj = projectedBodies[b.id];
            if (!proj || !proj.isInFront) return null;
            if (proj.u < 10 || proj.u > viewport.width - 10 || proj.v < 10 || proj.v > viewport.height - 10) return null;

            return (
              <div
                key={b.id}
                onClick={() => onSelectBody && onSelectBody(b.id)}
                className="absolute pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-1/2 z-15 flex flex-col items-center hover:scale-125 transition-transform"
                style={{ left: `${proj.u}px`, top: `${proj.v}px` }}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs shadow-md border"
                  style={{
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    borderColor: b.color,
                  }}
                >
                  <span className="select-none">{b.symbol}</span>
                </div>
                <span className="text-[9px] font-mono font-semibold px-1 rounded bg-slate-950/80 text-slate-300 mt-0.5">
                  {b.name}
                </span>
              </div>
            );
          })}

        {/* Primary Selected Target AR Reticle (Star Walk / Sci-Fi HUD Lock) */}
        {isTargetOnScreen && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out z-25 flex flex-col items-center"
            style={{ left: `${activeProj.u}px`, top: `${activeProj.v}px` }}
          >
            {/* Outer Rotating Reticle */}
            <div className="relative flex items-center justify-center">
              <div
                className={`w-24 h-24 rounded-full border-2 border-dashed ${
                  isTargetLocked ? 'animate-[spin_4s_linear_infinite] border-amber-400 ring-4 ring-amber-400/20' : 'animate-[spin_12s_linear_infinite]'
                }`}
                style={{ borderColor: activeMeta.color }}
              />
              <div
                className="absolute w-16 h-16 rounded-full border border-current opacity-90"
                style={{ color: activeMeta.color }}
              />
              {/* Corner Bracket Crosshairs */}
              <div className="absolute w-20 h-20 border-t-2 border-l-2 border-current opacity-60 -top-1 -left-1" style={{ color: activeMeta.color }} />
              <div className="absolute w-20 h-20 border-b-2 border-r-2 border-current opacity-60 -bottom-1 -right-1" style={{ color: activeMeta.color }} />

              <div
                className="absolute w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-xl"
                style={{ backgroundColor: activeMeta.color }}
              >
                <span className="select-none text-slate-950 leading-none">{activeMeta.symbol}</span>
              </div>
            </div>

            {/* Reticle Real-Time Telemetry Badge */}
            <div className="mt-3 bg-slate-950/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800 text-center font-mono text-[11px] space-y-0.5 shadow-2xl">
              <div className="flex items-center justify-center gap-1.5">
                <span className="font-bold text-white text-xs">
                  {activeMeta.symbol} {activeMeta.name}
                </span>
                {isTargetLocked && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500 text-slate-950 font-bold uppercase">
                    LOCKED
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

        {/* Off-Screen Directional Guidance Pointer */}
        {!isTargetOnScreen && (
          <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
            <div
              className="absolute w-28 h-28 flex items-center justify-center transition-transform duration-100 ease-out"
              style={{
                transform: `rotate(${offscreenAngleDeg}deg) translateX(120px)`,
              }}
            >
              <div className="bg-amber-500 text-slate-950 px-3.5 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-xl shadow-amber-500/40 transform -rotate-90">
                <ArrowUpRight className="w-4 h-4" />
                <span>Pan to {activeMeta.name}</span>
              </div>
            </div>
          </div>
        )}

        {/* Target Acquisition Observatory Dossier Card (Star Walk style when target locked) */}
        {isTargetLocked && (
          <div className="absolute bottom-16 left-6 right-6 md:left-auto md:right-6 md:w-80 bg-slate-950/90 backdrop-blur-md p-4 rounded-2xl border border-amber-500/60 shadow-2xl z-30 space-y-2 pointer-events-auto animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-lg">
                  {activeMeta.symbol}
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{activeMeta.name}</h4>
                  <span className="text-[10px] text-amber-400 font-mono uppercase">
                    {activeMeta.category.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">100% In View</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">{activeMeta.description}</p>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono pt-1 border-t border-slate-800">
              <div>
                <span className="text-slate-400 block">Distance</span>
                <span className="text-white font-semibold">
                  {activeCoords.distanceAu < 0.01
                    ? `${(activeCoords.distanceKm || 0).toLocaleString()} km`
                    : `${activeCoords.distanceAu.toFixed(3)} AU`}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Illumination</span>
                <span className="text-amber-300 font-semibold">
                  {activeCoords.phaseFraction !== undefined ? `${Math.round(activeCoords.phaseFraction * 100)}%` : '100%'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom AR Sky Opacity Slider (Blends Camera with Planetarium) */}
        {viewMode === 'ar' && (
          <div className="absolute bottom-3 inset-x-6 z-20 flex items-center justify-between gap-3 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-800 text-[11px] pointer-events-auto">
            <span className="text-slate-400 font-mono flex items-center gap-1.5 whitespace-nowrap">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Sky Overlay Blend:</span>
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={skyOpacity}
              onChange={(e) => setSkyOpacity(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="font-mono text-amber-300 text-[10px] w-8 text-right">
              {Math.round(skyOpacity * 100)}%
            </span>
          </div>
        )}

        {/* iOS / Safari Permission Modal Prompt */}
        {needsOrientationPermission && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-40 flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl max-w-sm text-center space-y-4 border border-amber-500/40">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-100 text-base">Motion Sensors Permission</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Apple Safari requires explicit permission to access the gyroscope and digital compass for AR celestial tracking.
                </p>
              </div>
              <button
                onClick={onRequestOrientationPermission}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-amber-500/20"
              >
                Enable Orientation Sensors
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
