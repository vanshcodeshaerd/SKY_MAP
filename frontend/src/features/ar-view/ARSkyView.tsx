import { useEffect, useRef, useState, useMemo } from 'react';
import { Camera, RefreshCw, Compass, Sparkles, SlidersHorizontal, ShieldAlert, ArrowUpRight } from 'lucide-react';
import { GeodeticLocation, ManualCalibration, DeviceOrientationState } from '../../types/astronomy';
import { getClientSolarPosition } from '../../services/astronomyEngine';
import { azAltToEnuVector, orientationToQuaternion, projectVectorToScreen } from '../../services/coordinateTransforms';
import { useCameraStream } from '../../hooks/useCameraStream';

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
}: ARSkyViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { videoRef, isActive: isCameraActive, error: cameraError, startCamera, stopCamera, toggleFacingMode, facingMode } = useCameraStream();

  // Screen projection coordinates
  const [screenPos, setScreenPos] = useState<{ u: number; v: number; isInFront: boolean; angularSeparationDeg: number }>({
    u: -1000,
    v: -1000,
    isInFront: false,
    angularSeparationDeg: 180,
  });

  const [viewport, setViewport] = useState({ width: 800, height: 600 });

  // Compute instantaneous solar position
  const solarCoords = useMemo(() => {
    return getClientSolarPosition(location, currentDate);
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

  // Real-time animation loop projecting solar vector onto screen space at 60 FPS
  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
      animId = requestAnimationFrame(renderLoop);

      // 1. Determine effective attitude angles
      // If mobile orientation sensor is available, use alpha/beta/gamma; otherwise use desktop simulator
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

      // 3. Compute 3D ENU solar vector
      const enuSun = azAltToEnuVector(solarCoords.azimuthDeg, solarCoords.altitudeDeg);

      // 4. Transform into Three.js camera frame
      // Inverse of camera rotation transforms world vectors into camera local space
      const invQuat = cameraQuat.clone().invert();
      const sunCam = enuSun.clone().applyQuaternion(invQuat);

      // 5. Pinhole perspective projection onto 2D viewport
      const proj = projectVectorToScreen(
        sunCam,
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
    solarCoords,
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
      {/* AR Viewport Container */}
      <div
        ref={containerRef}
        className="glass-panel rounded-2xl overflow-hidden relative border border-slate-800 h-[580px] bg-slate-950 flex items-center justify-center select-none"
      >
        {/* Background Video Stream */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 ${
            isCameraActive ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Fallback Camera Inactive Canvas Background */}
        {!isCameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 space-y-4 bg-gradient-to-b from-slate-950 via-[#0B0F19] to-slate-950">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Camera className="w-8 h-8" />
            </div>
            <div className="max-w-md space-y-1">
              <h3 className="font-semibold text-slate-100 text-base">Camera Passthrough Inactive</h3>
              <p className="text-xs text-slate-400">
                Enable your camera to project the augmented reality virtual Sun reticle onto your live video feed.
              </p>
            </div>
            {cameraError && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs px-3 py-2 rounded-lg max-w-sm">
                {cameraError}
              </div>
            )}
            <button
              onClick={startCamera}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
            >
              <Camera className="w-4 h-4" />
              <span>Enable Live Camera</span>
            </button>
          </div>
        )}

        {/* Camera Active Controls Bar */}
        {isCameraActive && (
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              onClick={toggleFacingMode}
              className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs flex items-center gap-1.5 backdrop-blur-md transition"
              title="Switch Camera (Front/Rear)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline capitalize">{facingMode}</span>
            </button>
            <button
              onClick={stopCamera}
              className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs backdrop-blur-md transition"
            >
              Stop
            </button>
          </div>
        )}

        {/* Permission Request Alert for iOS */}
        {needsOrientationPermission && (
          <div className="absolute top-4 left-4 z-30 bg-amber-500/20 border border-amber-500/40 backdrop-blur-md p-3 rounded-xl max-w-xs space-y-2">
            <p className="text-xs text-amber-200">
              iOS requires explicit permission to read gyroscope and orientation sensors.
            </p>
            <button
              onClick={onRequestOrientationPermission}
              className="w-full py-1.5 bg-amber-500 text-slate-950 font-semibold text-xs rounded-lg shadow"
            >
              Grant Orientation Permission
            </button>
          </div>
        )}

        {/* Telemetry HUD Overlay */}
        <div className="absolute bottom-4 left-4 z-20 bg-slate-950/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
          <div className="flex items-center gap-2 text-slate-300 font-sans font-semibold text-[11px] uppercase tracking-wider">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>Orientation Telemetry</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>Heading: <strong className="text-amber-400">{orientation.alpha !== null ? `${orientation.alpha}°` : `${manualYaw}° (Sim)`}</strong></span>
            <span>Tilt: <strong className="text-amber-400">{orientation.beta !== null ? `${orientation.beta}°` : `${manualPitch}° (Sim)`}</strong></span>
            <span>FOV: <strong className="text-slate-200">{calibration.fieldOfViewDeg}°</strong></span>
          </div>
        </div>

        {/* Quick Calibration Button on Viewport */}
        <button
          onClick={onOpenCalibration}
          className="absolute bottom-4 right-4 z-20 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-slate-300 p-2.5 rounded-xl backdrop-blur-md flex items-center gap-1.5 text-xs transition"
        >
          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          <span className="hidden sm:inline">Calibrate</span>
        </button>

        {/* ================= AR SUN RETICLE OVERLAY ================= */}
        {isOnScreen && (
          <div
            style={{
              left: `${screenPos.u}px`,
              top: `${screenPos.v}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="absolute z-30 pointer-events-none transition-all duration-75 flex flex-col items-center"
          >
            {/* Outer Corona Pulse */}
            <div className="w-24 h-24 rounded-full border border-amber-400/40 animate-ping absolute -top-2" />

            {/* Glowing Core Disc */}
            <div className="relative w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500 to-yellow-300 blur-md opacity-80" />
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 via-yellow-200 to-white shadow-2xl shadow-amber-400/80 flex items-center justify-center border-2 border-white">
                <Sparkles className="w-5 h-5 text-amber-950" />
              </div>

              {/* Crosshair reticle lines */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-amber-300/60" />
              <div className="absolute left-0 right-0 h-0.5 bg-amber-300/60" />
            </div>

            {/* Text Tag */}
            <div className="mt-2 bg-slate-950/90 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-mono text-amber-300 whitespace-nowrap shadow-md">
              SUN ({solarCoords.altitudeDeg.toFixed(1)}° Alt)
            </div>
          </div>
        )}

        {/* ================= OFF-SCREEN DIRECTION INDICATOR ================= */}
        {!isOnScreen && (
          <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
            <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-xl border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2 shadow-xl animate-pulse">
              <ArrowUpRight
                style={{ transform: `rotate(${offscreenAngleDeg}deg)` }}
                className="w-4 h-4 text-amber-400"
              />
              <span>
                Sun is outside camera view ({screenPos.angularSeparationDeg.toFixed(1)}° away)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Educational Projection Explainer */}
      <div className="glass-panel p-4 rounded-xl text-xs text-slate-400 flex items-start gap-3">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-200">How AR Alignment Works:</strong> The 3D solar unit vector in the East-North-Up (ENU) frame is rotated into camera-relative coordinates using your device’s attitude quaternion: s_cam = R_world_to_cam * s_world. It is then projected onto screen pixel coordinates (u, v) via the pinhole camera intrinsic matrix K with focal length f = H / (2 * tan(FOV / 2)).
        </p>
      </div>
    </div>
  );
}
