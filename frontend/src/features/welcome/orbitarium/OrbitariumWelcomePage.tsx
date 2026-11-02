import { useState } from 'react';
import {
  Camera,
  ChevronRight,
  Compass,
  LayoutGrid,
  Rocket,
  Sparkles,
  Sun as SunIcon,
  X,
} from 'lucide-react';
import type { CelestialBodyId } from '../../../types/astronomy';
import { MissionProgressStrip } from '../../../components/MissionProgressStrip';
import { StargazerXpStrip } from '../../../components/StargazerXpStrip';
import { SafetyQuizCard } from '../../../components/SafetyQuizCard';
import { DailyChallengeCard } from '../../../components/DailyChallengeCard';
import { DailyQuestsCard } from '../../../components/DailyQuestsCard';
import { MissionControlPanel } from '../../../components/MissionControlPanel';
import { CollectionBook } from '../../../components/CollectionBook';
import { OrbitariumSolarViewport } from './OrbitariumSolarViewport';
import type { OrbitariumInfo } from './planets';

type AppTab = 'dashboard' | 'sky3d' | 'ar' | 'cvlab';

const TRACKABLE = new Set<string>([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
]);

interface OrbitariumWelcomePageProps {
  onNavigate: (tab: AppTab) => void;
  onOpenBodyInAr: (bodyId: CelestialBodyId) => void;
  onStartDailyChallenge: (bodyId: CelestialBodyId) => void;
  onStartQuestAr: (bodyId: CelestialBodyId) => void;
}

export function OrbitariumWelcomePage({
  onNavigate,
  onOpenBodyInAr,
  onStartDailyChallenge,
  onStartQuestAr,
}: OrbitariumWelcomePageProps) {
  const [missionHubOpen, setMissionHubOpen] = useState(false);
  const [selected, setSelected] = useState<OrbitariumInfo | null>(null);
  const [speed, setSpeed] = useState(1);

  return (
    <>
      <div className="orbitarium-root flex flex-col lg:flex-row h-[100dvh] w-full overflow-hidden bg-orbit-background text-orbit-foreground">
        {/* Left: SkyMap welcome */}
        <section className="flex flex-col lg:w-[min(100%,480px)] xl:w-[540px] shrink-0 border-b lg:border-b-0 lg:border-r border-orbit-border overflow-y-auto">
          <div className="p-6 md:p-8 flex flex-col gap-5 min-h-0 flex-1">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-orbit-primary">Explore</p>
              <h1 className="font-orbitarium-display text-3xl md:text-4xl text-orbit-foreground mt-1">
                SkyMap AR
              </h1>
              <p className="mt-2 text-sm text-orbit-muted-foreground leading-relaxed">
                Your interactive observatory for live sky math, augmented reality, 3D orbits, and
                space missions. Pick a world on the right to learn more.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMissionHubOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-orbit-border bg-orbit-card-80 px-4 py-2 text-xs backdrop-blur hover:border-orbit-primary"
              >
                <Sparkles className="w-3.5 h-3.5 text-orbit-primary" />
                Missions
              </button>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center gap-1.5 rounded-full border border-orbit-primary bg-orbit-primary px-4 py-2 text-xs font-semibold text-orbit-primary-foreground"
              >
                Enter observatory
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <QuickLaunch icon={SunIcon} label="Dashboard" onClick={() => onNavigate('dashboard')} />
              <QuickLaunch icon={Camera} label="AR Sky" onClick={() => onNavigate('ar')} />
              <QuickLaunch icon={Compass} label="3D Map" onClick={() => onNavigate('sky3d')} />
              <QuickLaunch icon={LayoutGrid} label="CV Lab" onClick={() => onNavigate('cvlab')} />
            </div>

            {selected ? (
              <div className="rounded-2xl border border-orbit-border bg-orbit-card-80 p-5 animate-fade-in">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="float-right text-lg text-orbit-muted-foreground hover:text-orbit-foreground"
                  aria-label="Clear selection"
                >
                  ×
                </button>
                <p className="text-xs uppercase tracking-[0.3em] text-orbit-primary">{selected.type}</p>
                <h2 className="font-orbitarium-display text-3xl text-orbit-card-foreground clear-left">
                  {selected.name}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-orbit-muted-foreground">
                  {selected.description}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-2">
                  {selected.facts.slice(0, 4).map((f) => (
                    <div
                      key={f.label}
                      className="rounded-lg border border-orbit-border bg-orbit-background-40 p-2.5"
                    >
                      <dt className="text-[9px] uppercase tracking-wider text-orbit-muted-foreground">
                        {f.label}
                      </dt>
                      <dd className="mt-0.5 text-xs font-medium text-orbit-card-foreground">
                        {f.value}
                      </dd>
                    </div>
                  ))}
                </dl>
                {TRACKABLE.has(selected.name) && (
                  <button
                    type="button"
                    onClick={() => onOpenBodyInAr(selected.name as CelestialBodyId)}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orbit-primary-90 text-orbit-primary-foreground text-sm font-medium"
                  >
                    <Camera className="w-4 h-4" />
                    Track in AR
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-orbit-muted-foreground italic border border-dashed border-orbit-border rounded-xl p-4 text-center">
                Drag and zoom the solar system on the right, or tap a planet to see facts here.
              </p>
            )}
          </div>
        </section>

        {/* Right: Orbitarium 3D */}
        <section className="flex-1 min-h-[42vh] lg:min-h-0 relative">
          <OrbitariumSolarViewport
            selected={selected}
            onSelect={setSelected}
            speed={speed}
            onSpeedChange={setSpeed}
          />
        </section>
      </div>

      {missionHubOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close mission hub"
            onClick={() => setMissionHubOpen(false)}
          />
          <div className="relative w-full max-w-lg h-full bg-[#090d14] border-l border-slate-800 shadow-2xl overflow-y-auto p-4 pt-14">
            <button
              type="button"
              onClick={() => setMissionHubOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-slate-800 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Rocket className="w-5 h-5 text-amber-400" />
              Mission hub
            </h2>
            <MissionProgressStrip />
            <StargazerXpStrip />
            <SafetyQuizCard />
            <DailyChallengeCard onStartChallenge={onStartDailyChallenge} />
            <DailyQuestsCard
              onStartQuestAr={onStartQuestAr}
              onOpenDashboard={() => onNavigate('dashboard')}
            />
            <MissionControlPanel onNavigate={onNavigate} />
            <CollectionBook />
          </div>
        </div>
      )}
    </>
  );
}

function QuickLaunch({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof SunIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-orbit-border bg-orbit-background-50 text-[11px] hover:border-orbit-primary"
    >
      <Icon className="w-3.5 h-3.5 text-orbit-primary" />
      {label}
    </button>
  );
}
