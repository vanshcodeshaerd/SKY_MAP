import { Home, Sun, Compass, Camera, Sparkles } from 'lucide-react';
import { BottomNavBar } from '@/components/ui/bottom-nav-bar';

interface MobileBottomNavProps {
  activeTab: 'welcome' | 'dashboard' | 'sky3d' | 'ar' | 'cvlab';
  setActiveTab: (tab: 'welcome' | 'dashboard' | 'sky3d' | 'ar' | 'cvlab') => void;
}

const TAB_ORDER = ['welcome', 'dashboard', 'sky3d', 'ar', 'cvlab'] as const;

const NAV_ITEMS = [
  { id: 'welcome' as const, label: 'Home', icon: Home },
  { id: 'dashboard' as const, label: 'Dashboard', icon: Sun },
  { id: 'sky3d' as const, label: '3D Map', icon: Compass },
  { id: 'ar' as const, label: 'AR Sky', icon: Camera },
  { id: 'cvlab' as const, label: 'CV Lab', icon: Sparkles },
];

export function MobileBottomNav({ activeTab, setActiveTab }: MobileBottomNavProps) {
  const activeIndex = TAB_ORDER.indexOf(activeTab);

  return (
    <div className="md:hidden pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[env(safe-area-inset-bottom,0px)]">
      <BottomNavBar
        stickyBottom={false}
        className="pointer-events-auto mb-3 mx-2 shadow-2xl border-orbit-border"
        items={NAV_ITEMS.map(({ label, icon }) => ({ label, icon }))}
        activeIndex={activeIndex >= 0 ? activeIndex : 0}
        onActiveIndexChange={(index) => {
          const tab = TAB_ORDER[index];
          if (tab) setActiveTab(tab);
        }}
      />
    </div>
  );
}
