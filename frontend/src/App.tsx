import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SafetyBanner } from './components/SafetyBanner';
import { CalibrationDrawer } from './components/CalibrationDrawer';
import { SolarDashboard } from './features/dashboard/SolarDashboard';
import { ThreeSkyExplorer } from './features/sky-explorer/ThreeSkyExplorer';
import { ARSkyView } from './features/ar-view/ARSkyView';
import { CVLab } from './features/cv-lab/CVLab';
import { useGeolocation } from './hooks/useGeolocation';
import { useDeviceOrientation } from './hooks/useDeviceOrientation';
import { ManualCalibration } from './types/astronomy';
import { fetchServerHealth } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sky3d' | 'ar' | 'cvlab'>('dashboard');
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean>(false);

  // Time & Simulation State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState<boolean>(true);

  // Geolocation Hook
  const { location, loading: gpsLoading, requestGpsLocation, setManualLocation } = useGeolocation();

  // Device Orientation Hook
  const { orientation, needsPermission, requestPermission } = useDeviceOrientation();

  // Optical & Orientation Calibration State
  const [calibration, setCalibration] = useState<ManualCalibration>({
    azimuthNudgeDeg: 0,
    altitudeNudgeDeg: 0,
    fieldOfViewDeg: 60,
    declinationDeg: 0,
  });

  // Desktop simulated orientation Euler angles (for workstations without IMU)
  const [manualYaw, setManualYaw] = useState<number>(180);
  const [manualPitch, setManualPitch] = useState<number>(25);
  const [manualRoll, setManualRoll] = useState<number>(0);

  // Real-time clock update (1 Hz) when live tracking is active
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Periodic health check to backend FastAPI service
  useEffect(() => {
    const checkHealth = () => {
      fetchServerHealth()
        .then(() => setServerOnline(true))
        .catch(() => setServerOnline(false));
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F19] text-slate-100">
      {/* Top Solar Eye Safety Banner */}
      <SafetyBanner />

      {/* Main Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        location={location}
        onOpenCalibration={() => setIsCalibrationOpen(true)}
        serverOnline={serverOnline}
      />

      {/* Primary Application Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <SolarDashboard
            location={location}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            isLive={isLive}
            setIsLive={setIsLive}
          />
        )}

        {activeTab === 'sky3d' && (
          <ThreeSkyExplorer
            location={location}
            currentDate={currentDate}
            setCurrentDate={setCurrentDate}
            isLive={isLive}
            setIsLive={setIsLive}
          />
        )}

        {activeTab === 'ar' && (
          <ARSkyView
            location={location}
            currentDate={currentDate}
            orientation={orientation}
            needsOrientationPermission={needsPermission}
            onRequestOrientationPermission={requestPermission}
            calibration={calibration}
            onOpenCalibration={() => setIsCalibrationOpen(true)}
            manualYaw={manualYaw}
            manualPitch={manualPitch}
            manualRoll={manualRoll}
          />
        )}

        {activeTab === 'cvlab' && <CVLab />}
      </main>

      {/* Sensor Calibration Drawer */}
      <CalibrationDrawer
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        calibration={calibration}
        setCalibration={setCalibration}
        location={location}
        setLocation={setManualLocation}
        onRequestGps={requestGpsLocation}
        gpsLoading={gpsLoading}
        manualYaw={manualYaw}
        setManualYaw={setManualYaw}
        manualPitch={manualPitch}
        setManualPitch={setManualPitch}
        manualRoll={manualRoll}
        setManualRoll={setManualRoll}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SkyGazer AR — Computer Graphics & Image Processing (CGIP) University Project</span>
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span>React 18</span>
            <span>•</span>
            <span>Three.js / WebGL</span>
            <span>•</span>
            <span>FastAPI</span>
            <span>•</span>
            <span>OpenCV 4</span>
            <span>•</span>
            <span>Skyfield</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
