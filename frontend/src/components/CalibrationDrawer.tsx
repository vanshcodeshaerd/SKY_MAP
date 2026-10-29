import { X, RefreshCw, Compass, Sliders, MapPin } from 'lucide-react';
import { GeodeticLocation, ManualCalibration } from '../types/astronomy';

interface CalibrationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  calibration: ManualCalibration;
  setCalibration: (cal: ManualCalibration) => void;
  location: GeodeticLocation;
  setLocation: (loc: GeodeticLocation) => void;
  onRequestGps: () => void;
  gpsLoading: boolean;
  manualYaw: number;
  setManualYaw: (yaw: number) => void;
  manualPitch: number;
  setManualPitch: (pitch: number) => void;
  manualRoll: number;
  setManualRoll: (roll: number) => void;
}

export function CalibrationDrawer({
  isOpen,
  onClose,
  calibration,
  setCalibration,
  location,
  setLocation,
  onRequestGps,
  gpsLoading,
  manualYaw,
  setManualYaw,
  manualPitch,
  setManualPitch,
  manualRoll,
  setManualRoll,
}: CalibrationDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#0F172A] border-l border-slate-800 h-full p-6 overflow-y-auto flex flex-col justify-between shadow-2xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 text-slate-100 font-semibold text-base">
              <Sliders className="w-5 h-5 text-amber-400" />
              <span>Sensors & Calibration</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section 1: Geographic Location Override */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Observer Coordinates</span>
              </label>
              <button
                onClick={onRequestGps}
                disabled={gpsLoading}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"
              >
                <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                <span>{gpsLoading ? 'Locating...' : 'GPS Auto'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">Latitude (°N)</span>
                <input
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  value={location.latitude}
                  onChange={(e) =>
                    setLocation({ ...location, latitude: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <span className="text-slate-400 block mb-1">Longitude (°E)</span>
                <input
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  value={location.longitude}
                  onChange={(e) =>
                    setLocation({ ...location, longitude: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <span className="text-slate-400 text-xs block mb-1">Elevation (meters ASL)</span>
              <input
                type="number"
                step="1"
                min="-400"
                max="8848"
                value={location.elevationM}
                onChange={(e) =>
                  setLocation({ ...location, elevationM: parseFloat(e.target.value) || 0 })
                }
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-slate-100 font-mono text-xs focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Camera Optical FOV Calibration */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300">Camera Vertical FOV:</span>
              <span className="font-mono text-amber-400 font-bold">{calibration.fieldOfViewDeg}°</span>
            </div>
            <input
              type="range"
              min="40"
              max="80"
              step="1"
              value={calibration.fieldOfViewDeg}
              onChange={(e) =>
                setCalibration({ ...calibration, fieldOfViewDeg: parseInt(e.target.value, 10) })
              }
              className="w-full accent-amber-500 bg-slate-800 rounded h-1.5 cursor-pointer"
            />
            <p className="text-[11px] text-slate-400">
              Adjusts the pinhole intrinsic matrix focal length to match your specific smartphone or webcam lens.
            </p>
          </div>

          {/* Section 3: Magnetic Declination & Attitude Nudges */}
          <div className="space-y-4 pt-3 border-t border-slate-800/80">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Attitude Fine-Tuning</span>
            </div>

            {/* Azimuth Nudge */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Azimuth Nudge:</span>
                <span className="font-mono text-amber-400">{calibration.azimuthNudgeDeg > 0 ? `+${calibration.azimuthNudgeDeg}` : calibration.azimuthNudgeDeg}°</span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={calibration.azimuthNudgeDeg}
                onChange={(e) =>
                  setCalibration({ ...calibration, azimuthNudgeDeg: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 bg-slate-800 rounded h-1.5 cursor-pointer"
              />
            </div>

            {/* Altitude Nudge */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Altitude Nudge:</span>
                <span className="font-mono text-amber-400">{calibration.altitudeNudgeDeg > 0 ? `+${calibration.altitudeNudgeDeg}` : calibration.altitudeNudgeDeg}°</span>
              </div>
              <input
                type="range"
                min="-15"
                max="15"
                step="0.5"
                value={calibration.altitudeNudgeDeg}
                onChange={(e) =>
                  setCalibration({ ...calibration, altitudeNudgeDeg: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 bg-slate-800 rounded h-1.5 cursor-pointer"
              />
            </div>

            {/* Magnetic Declination */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300">Magnetic Declination (WMM):</span>
                <span className="font-mono text-amber-400">{calibration.declinationDeg > 0 ? `+${calibration.declinationDeg}` : calibration.declinationDeg}°</span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="0.5"
                value={calibration.declinationDeg}
                onChange={(e) =>
                  setCalibration({ ...calibration, declinationDeg: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 bg-slate-800 rounded h-1.5 cursor-pointer"
              />
            </div>
          </div>

          {/* Section 4: Desktop Simulated Orientation Sliders */}
          <div className="space-y-3 pt-3 border-t border-slate-800/80 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <span className="text-xs font-semibold text-amber-300 block">
              Desktop Simulator Controls (No IMU)
            </span>
            <p className="text-[11px] text-slate-400">
              When testing on a PC without gyroscope sensors, use these sliders to simulate phone attitude:
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Simulated Yaw (Heading):</span>
                <span className="font-mono text-amber-400">{manualYaw}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                value={manualYaw}
                onChange={(e) => setManualYaw(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 bg-slate-800 rounded h-1.5"
              />

              <div className="flex justify-between">
                <span>Simulated Pitch (Tilt):</span>
                <span className="font-mono text-amber-400">{manualPitch}°</span>
              </div>
              <input
                type="range"
                min="-90"
                max="90"
                value={manualPitch}
                onChange={(e) => setManualPitch(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 bg-slate-800 rounded h-1.5"
              />

              <div className="flex justify-between">
                <span>Simulated Roll:</span>
                <span className="font-mono text-amber-400">{manualRoll}°</span>
              </div>
              <input
                type="range"
                min="-90"
                max="90"
                value={manualRoll}
                onChange={(e) => setManualRoll(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 bg-slate-800 rounded h-1.5"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-800">
          <button
            onClick={() => {
              setCalibration({
                azimuthNudgeDeg: 0,
                altitudeNudgeDeg: 0,
                fieldOfViewDeg: 60,
                declinationDeg: 0,
              });
              setManualYaw(180);
              setManualPitch(20);
              setManualRoll(0);
            }}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg font-medium transition"
          >
            Reset Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
