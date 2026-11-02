import { Home, Sun, Compass, Camera, Sparkles } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: 'welcome' | 'dashboard' | 'sky3d' | 'ar' | 'cvlab';
  setActiveTab: (tab: 'welcome' | 'dashboard' | 'sky3d' | 'ar' | 'cvlab') => void;
}

export function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  const tabs = [
    { id: 'welcome', label: 'Home', icon: Home },
    { id: 'dashboard', label: 'Dashboard', icon: Sun },
    { id: 'sky3d', label: '3D Map', icon: Compass },
    { id: 'ar', label: 'AR Sky', icon: Camera },
    { id: 'cvlab', label: 'CV Lab', icon: Sparkles },
  ] as const;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#090d14]/95 backdrop-blur-lg border-t border-[#1e283c] px-2 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)+0.35rem)] shadow-2xl"
      aria-label="Mobile Bottom Navigation"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 min-h-[50px] flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all duration-150 select-none active:scale-95 ${
                isActive
                  ? 'text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 active:text-slate-100'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={`relative p-1 rounded-lg transition-colors ${
                  isActive ? 'bg-amber-500/15' : 'bg-transparent'
                }`}
              >
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'
                  }`}
                />
                {isActive && (
                  <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400 ring-2 ring-[#090d14]" />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5 leading-none font-medium">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
