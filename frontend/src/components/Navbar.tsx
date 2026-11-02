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
    <header className="sticky top-0 z-30 border-b border-orbit-border bg-orbit-background/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div
          onClick={() => setActiveTab('welcome')}
          className="flex items-center gap-3 shrink-0 cursor-pointer group"
          title="Go to SkyMap AR Welcome Page"
        >
          <div className="w-8 h-8 rounded-md bg-orbit-elevated border border-orbit-border group-hover:border-orbit-primary/50 flex items-center justify-center transition-colors">
            <Sun className="w-4 h-4 text-orbit-primary stroke-[2.2] group-hover:rotate-45 transition-transform" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm tracking-tight text-orbit-foreground group-hover:text-orbit-primary transition-colors">
                SkyMap
              </span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-orbit-primary/10 text-orbit-primary border border-orbit-primary/30">
                AR
              </span>
            </div>
            <span className="text-[10px] text-orbit-muted-foreground block tracking-normal">
              Solar System Explorer &bull; Astronomy for Kids
            </span>
          </div>
        </div>

        <nav
          className="hidden md:flex items-center bg-orbit-card/80 p-1 rounded-md border border-orbit-border"
          aria-label="Main Navigation"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[38px] sm:min-h-[36px] flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-orbit-elevated text-orbit-primary border border-orbit-primary/40 font-semibold shadow-sm'
                    : 'text-orbit-muted-foreground hover:text-orbit-foreground hover:bg-orbit-card'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isActive ? 'text-orbit-primary stroke-[2.2]' : 'text-orbit-muted-foreground'}`}
                />
                <span className="inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRequestGps}
            title={isLiveGps ? 'Live GPS Active (Click to refresh)' : 'Click to acquire precise GPS coordinates'}
            className="min-h-[38px] flex items-center gap-2 text-xs text-orbit-foreground bg-orbit-card hover:bg-orbit-elevated px-3 py-1.5 rounded-md border border-orbit-border transition"
          >
            <MapPin className={`w-3.5 h-3.5 shrink-0 ${isLiveGps ? 'text-emerald-400' : 'text-orbit-primary'}`} />
            <span className="font-mono tabular-nums text-[11px] hidden lg:inline">
              {location.latitude >= 0 ? `${location.latitude.toFixed(2)}°N` : `${Math.abs(location.latitude).toFixed(2)}°S`},{' '}
              {location.longitude >= 0 ? `${location.longitude.toFixed(2)}°E` : `${Math.abs(location.longitude).toFixed(2)}°W`}
            </span>
            {gpsLoading ? (
              <RefreshCw className="w-3 h-3 text-orbit-primary animate-spin" />
            ) : (
              <span
                className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-semibold ${
                  isLiveGps
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-orbit-elevated text-orbit-muted-foreground'
                }`}
              >
                {isLiveGps ? 'GPS' : 'Fix'}
              </span>
            )}
          </button>

          <div
            className="hidden sm:flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-md border border-violet-500/25 bg-violet-500/5 text-violet-200 font-medium"
            title={`${xpLevelProgress.level.title} — Stargazer XP`}
          >
            <Award className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden lg:inline">{xpLevelProgress.level.title}</span>
          </div>

          <div
            className="hidden sm:flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-md border border-orbit-primary/25 bg-orbit-primary/5 text-orbit-foreground font-medium"
            title={`${completedCount} missions completed`}
          >
            <Award className="w-3.5 h-3.5 text-orbit-primary" />
            <span>{rank.title}</span>
          </div>

          <div
            className={`min-h-[38px] flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md border font-mono bg-orbit-card text-orbit-muted-foreground border-orbit-border`}
            title={
              serverOnline
                ? 'Backend API (NASA JPL DE421) Connected'
                : 'Local VSOP87 Engine active (Backend verification offline)'
            }
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${serverOnline ? 'bg-emerald-400' : 'bg-orbit-muted-foreground'}`} />
            <span className="hidden xl:inline text-[10px]">
              {serverOnline ? 'JPL DE421' : 'Local VSOP87'}
            </span>
          </div>

          <button
            onClick={onOpenCalibration}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-md bg-orbit-card hover:bg-orbit-elevated border border-orbit-border text-orbit-muted-foreground hover:text-orbit-primary transition"
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
