import { useEffect, useRef, useState, useMemo } from 'react';
import { Camera, RefreshCw, Compass, Sparkles, SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import {
  GeodeticLocation,
  ManualCalibration,
  DeviceOrientationState,
  CelestialBodyId,
  CELESTIAL_BODIES,
} from '../../types/astronomy';
import { getClientCelestialPosition, getAllCelestialPositions } from '../../services/astronomyEngine';
import { azAltToEnuVector, orientationToQuaternion, projectVectorToScreen } from '../../services/coordinateTransforms';
import { useCameraStream } from '../../hooks/useCameraStream';
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

  // Screen projection coordinates for active target
  const [screenPos, setScreenPos] = useState<{ u: number; v: number; isInFront: boolean; angularSeparationDeg: number }>({
    u: -1000,
    v: -1000,
    isInFront: false,
    angularSeparationDeg: 180,
  });

  const [viewport, setViewport] = useState({ width: 800, height: 600 });

  const activeMeta = CELESTIAL_BODIES[selectedBody] || CELESTIAL_BODIES.Sun;

  // Real-time celestial coordinates
  const activeCoords = useMemo(() => {
    return getClientCelestialPosition(selectedBody, location, currentDate);
  }, [selectedBody, location, currentDate]);

  const allPositions = useMemo(() => {
    return getAllCelestialPositions(location, currentDate);
  }, [location, currentDate]);

  // Handle container resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewport({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 500,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Real-time animation loop projecting active celestial vector onto screen space at 60 FPS
  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);

      // 1. Determine effective attitude angles
      const hasSensor = orientation.alpha !== null && orientation.beta !== null && orientation.gamma !== null;
      const alpha = hasSensor ? orientation.alpha! : manualYaw;
      const beta = hasSensor ? orientation.beta! : manualPitch;
      const gamma = hasSensor ? orientation.gamma! : manualRoll;

      // 2. Compute camera attitude quaternion
      const cameraQuat = orientationToQuaternion(
        alpha,
        beta,
        gamma,
        calibration.azimuthNudgeDeg,
        calibration.altitudeNudgeDeg,
        calibration.declinationDeg
      );

      // 3. Compute 3D ENU vector for active target
      const enuTarget = azAltToEnuVector(activeCoords.azimuthDeg, activeCoords.altitudeDeg);

      // 4. Transform into camera local space (inverse camera rotation)
      const invQuat = cameraQuat.clone().invert();
      const targetCam = enuTarget.clone().applyQuaternion(invQuat);

      // 5. Pinhole perspective projection onto 2D viewport
      const proj = projectVectorToScreen(
        targetCam,
        viewport.width,
        viewport.height,
        calibration.fieldOfViewDeg
      );

      setScreenPos(proj);
    };

    renderLoop();
    return () => cancelAnimationFrame(animId);
  }, [
    orientation,
    manualYaw,
    manualPitch,
    manualRoll,
    activeCoords,
    calibration,
    viewport,
  ]);

  // Check if marker is within visible screen bounds
  const isOnScreen =
    screenPos.isInFront &&
    screenPos.u >= 20 &&
    screenPos.u <= viewport.width - 20 &&
    screenPos.v >= 20 &&
    screenPos.v <= viewport.height - 20;

  // Offscreen target angle for guide arrow
  const offscreenAngleDeg = useMemo(() => {
    const dx = screenPos.u - viewport.width / 2;
    const dy = screenPos.v - viewport.height / 2;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }, [screenPos, viewport]);

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Target Body Selector Bar */}
      <div className="glass-panel p-3 rounded-2xl border border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs px-1 text-slate-400">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>AR Tracking Target:</span>
            <strong className="text-amber-300 font-bold">{activeMeta.name}</strong>
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            Tap any planet to track in real-time camera
          </span>
        </div>
        <CelestialBodySelector
          selectedBody={selectedBody}
          onSelectBody={(body) => onSelectBody && onSelectBody(body)}
          allPositions={allPositions}
        />
      </div>

      {/* AR Viewport Container */}
      <div
        ref={containerRef}
        className="glass-panel rounded-2xl overflow-hidden relative border border-slate-800 w-full h-[540px] bg-slate-950 flex items-center justify-center shadow-2xl"
      >
        {/* Real-time Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition duration-300 ${
            isCameraActive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Camera Inactive Fallback Canvas */}
        {!isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/90 z-0 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 mb-1">
              <Camera className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-100">Live Camera Stream Inactive</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Enable your device camera to superimpose the synthetic {activeMeta.name} reticle over the live sky in augmented reality.
            </p>
            {cameraError && (
              <p className="text-xs text-red-400 font-mono bg-red-950/40 px-3 py-1.5 rounded-lg border border-red-900/60 max-w-md">
                {cameraError}
              </p>
            )}
            <button
              onClick={startCamera}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition shadow-lg shadow-amber-500/20"
            >
              Start AR Camera Stream
            </button>
          </div>
        )}

        {/* Top Floating Telemetry Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-slate-950/85 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs space-y-1 shadow-lg pointer-events-auto">
          <div className="flex items-center gap-2 text-slate-100 font-semibold">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>AR Tracking: {activeMeta.symbol} {activeMeta.name}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300 font-mono text-[11px]">
            <span>
              Target Az: <strong className="text-amber-400">{activeCoords.azimuthDeg.toFixed(1)}°</strong>
            </span>
            <span>
              Alt:{' '}
              <strong className={activeCoords.isAboveHorizon ? 'text-emerald-400' : 'text-indigo-400'}>
                {activeCoords.altitudeDeg >= 0 ? '+' : ''}{activeCoords.altitudeDeg.toFixed(1)}°
              </strong>
            </span>
            <span>
              Sep: <strong className="text-slate-100">{screenPos.angularSeparationDeg.toFixed(1)}°</strong>
            </span>
          </div>
        </div>

        {/* Top Right Camera Action Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
          {isCameraActive && (
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
                className="px-3 py-1.5 rounded-xl bg-red-950/80 hover:bg-red-900/80 text-red-200 border border-red-800/80 backdrop-blur-md text-xs transition shadow-lg"
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

        {/* iOS / Safari Permission Modal Prompt */}
        {needsOrientationPermission && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <div className="glass-panel p-6 rounded-2xl max-w-sm text-center space-y-4 border border-amber-500/40">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <Compass className="w-6 h-6" />
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

        {/* On-Screen Synthetic AR Reticle */}
        {isOnScreen && (
          <div
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out z-20 flex flex-col items-center"
            style={{ left: `${screenPos.u}px`, top: `${screenPos.v}px` }}
          >
            {/* Glowing Reticle Rings */}
            <div className="relative flex items-center justify-center">
              <div
                className="w-20 h-20 rounded-full border-2 border-dashed animate-[spin_10s_linear_infinite]"
                style={{ borderColor: activeMeta.color }}
              />
              <div
                className="absolute w-12 h-12 rounded-full border border-current opacity-80"
                style={{ color: activeMeta.color }}
              />
              <div
                className="absolute w-6 h-6 rounded-full flex items-center justify-center text-sm shadow-lg"
                style={{ backgroundColor: activeMeta.color }}
              >
                <span className="select-none text-slate-950">{activeMeta.symbol}</span>
              </div>
            </div>

            {/* Reticle Data Tag */}
            <div className="mt-2 bg-slate-950/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-center font-mono text-[10px] space-y-0.5 shadow-xl">
              <span className="font-bold text-white block">
                {activeMeta.symbol} {activeMeta.name}
              </span>
              <span className="text-amber-400 block">
                Az: {activeCoords.azimuthDeg.toFixed(1)}° | Alt: {activeCoords.altitudeDeg.toFixed(1)}°
              </span>
            </div>
          </div>
        )}

        {/* Off-Screen Directional Guidance Pointer */}
        {!isOnScreen && (
          <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
            <div
              className="absolute w-24 h-24 flex items-center justify-center transition-transform duration-100 ease-out"
              style={{
                transform: `rotate(${offscreenAngleDeg}deg) translateX(110px)`,
              }}
            >
              <div className="bg-amber-500 text-slate-950 px-3 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/30 transform -rotate-90">
                <ArrowUpRight className="w-4 h-4" />
                <span>Pan to {activeMeta.name}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
