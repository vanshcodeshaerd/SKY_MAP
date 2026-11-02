import { Sun, Compass, Camera, Sparkles, Home, Sliders, MapPin, RefreshCw, Award } from 'lucide-react';
import { GeodeticLocation } from '../types/astronomy';
import { useMissionProgressContext } from '../hooks/useMissionProgress';

interface NavbarProps {
  activeTab: 'welcome' | 'dashboard' | 'sky3d' | 'ar' | 'cvlab';
  setActiveTab: (tab: 'welcome' | 'dashboard' | 'sky3d' | 'ar' | 'cvlab') => void;
  location: GeodeticLocation;
  onOpenCalibration: () => void;
  serverOnline: boolean;
  onRequestGps?: () => void;
  gpsLoading?: boolean;
  isLiveGps?: boolean;
}

export function Navbar({
  activeTab,
  setActiveTab,
  location,
  onOpenCalibration,
  serverOnline,
  onRequestGps,
  gpsLoading,
  isLiveGps,
}: NavbarProps) {
  const { rank, completedCount, xpLevelProgress } = useMissionProgressContext();
  const tabs = [
    { id: 'welcome', label: 'Welcome', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: Sun },
    { id: 'sky3d', label: '3D Explorer', icon: Compass },
    { id: 'ar', label: 'AR Sky View', icon: Camera },
    { id: 'cvlab', label: 'CV Lab', icon: Sparkles },
  ] as const;

  return (
    <header className="sticky top-0 z-30 bg-[#090d14] border-b border-[#1e283c]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Observatory Identity */}
        <div 
          onClick={() => setActiveTab('welcome')}
          className="flex items-center gap-3 shrink-0 cursor-pointer group"
          title="Go to SkyMap AR Welcome Page"
        >
          <div className="w-8 h-8 rounded-md bg-[#161d2c] border border-[#253147] group-hover:border-amber-500/50 flex items-center justify-center transition-colors">
            <Sun className="w-4 h-4 text-amber-400 stroke-[2.2] group-hover:rotate-45 transition-transform" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-slate-100 group-hover:text-amber-300 transition-colors">SkyMap</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                AR
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block tracking-normal">Solar System Explorer &bull; Astronomy for Kids</span>
          </div>
        </div>

        {/* Primary Destination Navigation (Desktop/Tablet) */}
        <nav className="hidden md:flex items-center bg-[#111622] p-1 rounded-md border border-[#1e283c]" aria-label="Main Navigation">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[38px] sm:min-h-[36px] flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1a2335] text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#161d2c]'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400 stroke-[2.2]' : 'text-slate-400'}`} />
                <span className="inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Telemetry, Status & Calibration Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Location Badge with Direct GPS Sync */}
          <button
            onClick={onRequestGps}
            title={isLiveGps ? 'Live GPS Active (Click to refresh)' : 'Click to acquire precise GPS coordinates'}
            className="min-h-[38px] flex items-center gap-2 text-xs text-slate-300 bg-[#111622] hover:bg-[#161d2c] px-3 py-1.5 rounded-md border border-[#1e283c] transition"
          >
            <MapPin className={`w-3.5 h-3.5 shrink-0 ${isLiveGps ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span className="font-mono tabular-nums text-[11px] hidden lg:inline">
              {location.latitude >= 0 ? `${location.latitude.toFixed(2)}°N` : `${Math.abs(location.latitude).toFixed(2)}°S`},{' '}
              {location.longitude >= 0 ? `${location.longitude.toFixed(2)}°E` : `${Math.abs(location.longitude).toFixed(2)}°W`}
            </span>
            {gpsLoading ? (
              <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
            ) : (
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-semibold ${
                isLiveGps ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-[#161d2c] text-slate-400'
              }`}>
                {isLiveGps ? 'GPS' : 'Fix'}
              </span>
            )}
          </button>

          {/* Mission rank (gamification) */}
          <div
            className="hidden sm:flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-md border border-violet-500/25 bg-violet-500/5 text-violet-200 font-medium"
            title={`${xpLevelProgress.level.title} — Stargazer XP`}
          >
            <Award className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden lg:inline">{xpLevelProgress.level.title}</span>
          </div>

          <div
            className="hidden sm:flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-md border border-amber-500/25 bg-amber-500/5 text-amber-200 font-medium"
            title={`${completedCount} missions completed`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>{rank.title}</span>
          </div>

          {/* Backend Verification Engine Status */}
          <div
            className={`min-h-[38px] flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md border font-mono ${
              serverOnline
                ? 'bg-[#111622] text-slate-300 border-[#1e283c]'
                : 'bg-[#111622] text-slate-400 border-[#1e283c]'
            }`}
            title={serverOnline ? 'Backend API (NASA JPL DE421) Connected' : 'Local VSOP87 Engine active (Backend verification offline)'}
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${serverOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
            <span className="hidden xl:inline text-[10px]">
              {serverOnline ? 'JPL DE421' : 'Local VSOP87'}
            </span>
          </div>

          {/* Precision Calibration Drawer Trigger */}
          <button
            onClick={onOpenCalibration}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-md bg-[#111622] hover:bg-[#161d2c] border border-[#1e283c] text-slate-300 hover:text-amber-400 transition"
            title="Open Calibration & Instrument Settings"
            aria-label="Calibration Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
