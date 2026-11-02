import { useEffect, useState } from 'react';
import { Camera, Compass, Rocket, Telescope, X } from 'lucide-react';
import type { CelestialBodyId } from '../../../types/astronomy';
import { MissionProgressStrip } from '../../../components/MissionProgressStrip';
import { StargazerXpStrip } from '../../../components/StargazerXpStrip';
import { SafetyQuizCard } from '../../../components/SafetyQuizCard';
import { DailyChallengeCard } from '../../../components/DailyChallengeCard';
import { DailyQuestsCard } from '../../../components/DailyQuestsCard';
import { MissionControlPanel } from '../../../components/MissionControlPanel';
import { CollectionBook } from '../../../components/CollectionBook';
import { OrbitalHeroSection } from '@/components/ui/orbital-hero-section';
import { getWelcomeHeroPlanets } from './heroPlanets';
import {
  ORBITARIUM_PLANETS,
  ORBITARIUM_SUN,
  type OrbitariumInfo,
} from './planets';

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

function useNarrow(query = '(max-width: 767px)') {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = window.matchMedia(query);
    const sync = () => setNarrow(m.matches);
    sync();
    m.addEventListener('change', sync);
    return () => m.removeEventListener('change', sync);
  }, [query]);
  return narrow;
}

function infoForPlanetName(name: string): OrbitariumInfo | null {
  if (name === 'Sun') return ORBITARIUM_SUN;
  const p = ORBITARIUM_PLANETS.find((x) => x.name === name);
  if (!p) return null;
  return {
    name: p.name,
    type: p.type,
    description: p.description,
    facts: p.facts,
  };
}

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
  const narrow = useNarrow();
  const heroPlanets = getWelcomeHeroPlanets();

  return (
    <>
      <section className="orbitarium-root relative h-[100dvh] min-h-[100dvh] w-full font-welcome-body text-orbit-foreground">
        <OrbitalHeroSection
          className="absolute inset-0"
          planets={heroPlanets}
          yearSeconds={14}
          viewRadius={narrow ? 2.2 : 3.2}
          scrim={narrow ? 'top' : 'left'}
          scrimStrength={narrow ? 0.92 : 0.9}
          starCount={narrow ? 700 : 1400}
          onPlanetSelect={(name) => setSelected(infoForPlanetName(name))}
        >
          <div className="flex h-full min-h-[100dvh] items-start px-4 pt-8 sm:px-8 md:items-center md:pt-0 lg:px-12 pointer-events-none">
            <div className="welcome-copy-slot max-w-[34rem] pointer-events-auto overflow-y-auto max-h-[100dvh] overscroll-y-contain touch-pan-y py-6 md:py-10 space-y-6">
              <header className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-[11px] font-mono uppercase tracking-[0.35em] text-amber-400 font-semibold shrink-0">
                    SkyMap AR
                  </p>
                  <span className="welcome-brand-rule hidden sm:block" aria-hidden />
                </div>

                <h1 className="font-bold tracking-tight text-white leading-[1.06] text-[clamp(1.75rem,5vw,3.5rem)]">
                  Explore the
                  {!narrow && (
                    <>
                      <br />
                      <span className="welcome-hero-accent">Solar System</span>
                      <br />
                      in Augmented Reality
                    </>
                  )}
                  {narrow && (
                    <>
                      {' '}
                      <span className="welcome-hero-accent">Solar System</span> in AR
                    </>
                  )}
                </h1>

                {!narrow && (
                  <p className="max-w-md text-[15px] leading-relaxed text-slate-300">
                    A next-gen AR observatory. Tap a planet in the helix to see distance, facts, and
                    more — same worlds and textures as the 3D map.
                  </p>
                )}
              </header>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="welcome-cta-primary inline-flex items-center gap-2 rounded-full px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold min-h-[44px] shadow-lg shadow-amber-500/20"
                >
                  <Telescope className="w-4 h-4 shrink-0" strokeWidth={2.25} />
                  Enter Observatory
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('sky3d')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-300 min-h-[44px]"
                >
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  3D Map
                </button>
                <button
                  type="button"
                  onClick={() => setMissionHubOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-3.5 py-2 text-xs font-medium min-h-[44px]"
                >
                  <Rocket className="w-3.5 h-3.5 shrink-0 text-orbit-primary" />
                  Missions
                </button>
              </div>

              {selected ? (
                <section className="space-y-3 animate-fade-in">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-orbit-primary">{selected.type}</p>
                  <h2 className="font-bold text-white text-xl sm:text-2xl">{selected.name}</h2>
                  <p className="text-sm text-orbit-muted-foreground leading-relaxed">{selected.description}</p>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs sm:text-sm">
                    {selected.facts.map((f) => (
                      <div key={f.label}>
                        <dt className="text-orbit-muted-foreground text-[10px]">{f.label}</dt>
                        <dd className="font-medium tabular-nums mt-0.5">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {TRACKABLE.has(selected.name) && (
                    <button
                      type="button"
                      onClick={() => onOpenBodyInAr(selected.name as CelestialBodyId)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm min-h-[44px]"
                    >
                      <Camera className="w-4 h-4" />
                      Track in AR
                    </button>
                  )}
                </section>
              ) : (
                <p className="text-xs text-orbit-muted-foreground/80 max-w-sm">
                  Tap a planet in the solar helix to read facts here.
                </p>
              )}
            </div>
          </div>
        </OrbitalHeroSection>
      </section>

      {missionHubOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close mission hub"
            onClick={() => setMissionHubOpen(false)}
          />
          <div className="relative w-full max-w-lg h-full bg-orbit-background border-l border-orbit-border shadow-2xl overflow-y-auto p-4 pt-14">
            <button
              type="button"
              onClick={() => setMissionHubOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-orbit-elevated text-orbit-muted-foreground"
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
