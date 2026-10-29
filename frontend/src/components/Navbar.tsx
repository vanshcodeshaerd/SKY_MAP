import { Sun, Compass, Camera, Sparkles, Sliders, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { GeodeticLocation } from '../types/astronomy';

interface NavbarProps {
  activeTab: 'dashboard' | 'sky3d' | 'ar' | 'cvlab';
  setActiveTab: (tab: 'dashboard' | 'sky3d' | 'ar' | 'cvlab') => void;
  location: GeodeticLocation;
  onOpenCalibration: () => void;
  serverOnline: boolean;
}

export function Navbar({
  activeTab,
  setActiveTab,
  location,
  onOpenCalibration,
  serverOnline,
}: NavbarProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Sun },
    { id: 'sky3d', label: '3D Explorer', icon: Compass },
    { id: 'ar', label: 'AR Sky View', icon: Camera },
    { id: 'cvlab', label: 'CV Lab', icon: Sparkles },
  ] as const;

  return (
    <header className="sticky top-0 z-30 bg-[#0B0F19]/90 border-b border-slate-800/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Sun className="w-5 h-5 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-100">SkyGazer</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                AR
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block -mt-0.5">CGIP Celestial Engine</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800/80">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Status badges & controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Location badge */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono">
              {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
            </span>
          </div>

          {/* Backend server indicator */}
          <div
            className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border font-mono ${
              serverOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
            }`}
            title={serverOnline ? 'Backend API (FastAPI) Online' : 'Backend API Disconnected'}
          >
            {serverOnline ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3 h-3 text-rose-400" />
            )}
            <span className="hidden lg:inline">{serverOnline ? 'API 200' : 'API Offline'}</span>
          </div>

          {/* Calibration button */}
          <button
            onClick={onOpenCalibration}
            className="p-2 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-400 transition"
            title="Open Calibration & Coordinate Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
