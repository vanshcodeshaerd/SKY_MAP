import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { SafetyBanner } from './components/SafetyBanner';
import { CalibrationDrawer } from './components/CalibrationDrawer';
import { MissionCompleteToast } from './components/MissionCompleteToast';
import { XpGainToast } from './components/XpGainToast';
import { WelcomeView } from './features/welcome/WelcomeView';
import { SolarDashboard } from './features/dashboard/SolarDashboard';
import { ThreeSkyExplorer } from './features/sky-explorer/ThreeSkyExplorer';
import { ARSkyView } from './features/ar-view/ARSkyView';
import { CVLab } from './features/cv-lab/CVLab';
import { useGeolocation } from './hooks/useGeolocation';
import { useDeviceOrientation } from './hooks/useDeviceOrientation';
import { MissionProgressProvider, useMissionProgressContext } from './hooks/useMissionProgress';
import { GeodeticLocation, ManualCalibration, CelestialBodyId } from './types/astronomy';
import { fetchServerHealth } from './services/api';

type TabId = 'welcome' | 'dashboard' | 'sky3d' | 'ar' | 'cvlab';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('welcome');
  const [isLive, setIsLive] = useState(true);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const geolocation = useGeolocation();

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isLive]);

  return (
    <MissionProgressProvider
      dashboardLiveActive={activeTab === 'dashboard' && isLive}
      isLiveGps={geolocation.isLiveGps}
      location={geolocation.location}
      currentDate={currentDate}
    >
      <AppMain
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isLive={isLive}
        setIsLive={setIsLive}
        geolocation={geolocation}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
      />
    </MissionProgressProvider>
  );
}

function AppMain({
  activeTab,
  setActiveTab,
  isLive,
  setIsLive,
  geolocation,
  currentDate,
  setCurrentDate,
}: {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  isLive: boolean;
  setIsLive: (live: boolean) => void;
  geolocation: ReturnType<typeof useGeolocation>;
  currentDate: Date;
  setCurrentDate: (d: Date) => void;
}) {
  const {
    location,
    loading: gpsLoading,
    isLiveGps,
    requestGpsLocation,
    setManualLocation,
  } = geolocation;

  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [serverOnline, setServerOnline] = useState<boolean>(false);
  const [selectedBody, setSelectedBody] = useState<CelestialBodyId>('Sun');

  const { orientation, needsPermission, requestPermission } = useDeviceOrientation();
  const {
    markLocationConfigured,
    markVisitedSky3d,
    lastNewlyCompleted,
    clearLastNewlyCompleted,
  } = useMissionProgressContext();

  const [calibration, setCalibration] = useState<ManualCalibration>({
    azimuthNudgeDeg: 0,
    altitudeNudgeDeg: 0,
    fieldOfViewDeg: 60,
    declinationDeg: 0,
  });

  const [manualYaw, setManualYaw] = useState<number>(180);
  const [manualPitch, setManualPitch] = useState<number>(25);
  const [manualRoll, setManualRoll] = useState<number>(0);

  const handleManualLocation = useCallback(
    (newLoc: GeodeticLocation) => {
      setManualLocation(newLoc);
      markLocationConfigured();
    },
    [setManualLocation, markLocationConfigured]
  );

  useEffect(() => {
    if (isLiveGps) markLocationConfigured();
  }, [isLiveGps, markLocationConfigured]);

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

  useEffect(() => {
    if (activeTab === 'sky3d') markVisitedSky3d();
  }, [activeTab, markVisitedSky3d]);

  return (
    <div className="min-h-screen flex flex-col bg-[#090d14] text-slate-100">
      {activeTab !== 'welcome' && <SafetyBanner />}

      <MissionCompleteToast missionIds={lastNewlyCompleted} onDismiss={clearLastNewlyCompleted} />
      <XpGainToast />

      {activeTab !== 'welcome' && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          location={location}
          onOpenCalibration={() => setIsCalibrationOpen(true)}
          serverOnline={serverOnline}
          onRequestGps={requestGpsLocation}
          gpsLoading={gpsLoading}
          isLiveGps={isLiveGps}
        />
      )}

      {activeTab === 'welcome' ? (
        <main className="flex-1 w-full min-h-0 bg-orbit-background">
          <WelcomeView
            onNavigate={setActiveTab}
            onStartDailyChallenge={(bodyId) => {
              setSelectedBody(bodyId);
              setActiveTab('ar');
            }}
            onStartQuestAr={(bodyId) => {
              setSelectedBody(bodyId);
              setActiveTab('ar');
            }}
            onOpenBodyInAr={(bodyId) => {
              setSelectedBody(bodyId);
              setActiveTab('ar');
            }}
          />
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'dashboard' && (
            <SolarDashboard
              location={location}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              isLive={isLive}
              setIsLive={setIsLive}
              selectedBody={selectedBody}
              onSelectBody={setSelectedBody}
            />
          )}
          {activeTab === 'sky3d' && (
            <ThreeSkyExplorer
              location={location}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              isLive={isLive}
              setIsLive={setIsLive}
              selectedBody={selectedBody}
              onSelectBody={setSelectedBody}
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
              selectedBody={selectedBody}
              onSelectBody={setSelectedBody}
              onRequestGps={requestGpsLocation}
              gpsLoading={gpsLoading}
              onNavigateTo3DExplorer={(id) => {
                setSelectedBody(id);
                setActiveTab('sky3d');
              }}
            />
          )}
          {activeTab === 'cvlab' && <CVLab />}
        </main>
      )}

      <CalibrationDrawer
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        calibration={calibration}
        setCalibration={setCalibration}
        location={location}
        setLocation={handleManualLocation}
        onRequestGps={requestGpsLocation}
        gpsLoading={gpsLoading}
        manualYaw={manualYaw}
        setManualYaw={setManualYaw}
        manualPitch={manualPitch}
        setManualPitch={setManualPitch}
        manualRoll={manualRoll}
        setManualRoll={setManualRoll}
      />

      {activeTab !== 'welcome' && (
      <footer className="border-t border-slate-800/80 bg-slate-950/80 py-4 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SkyMap AR — Interactive Astronomy for Young Explorers</span>
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
      )}
    </div>
  );
}
