import type { CelestialBodyId } from '../../types/astronomy';
import { OrbitariumWelcomePage } from './orbitarium/OrbitariumWelcomePage';

interface WelcomeViewProps {
  onNavigate: (tab: 'dashboard' | 'sky3d' | 'ar' | 'cvlab') => void;
  onStartDailyChallenge: (bodyId: CelestialBodyId) => void;
  onStartQuestAr: (bodyId: CelestialBodyId) => void;
  onOpenBodyInAr: (bodyId: CelestialBodyId) => void;
}

/** Landing experience: Orbitarium 3D solar system (imported atlas) + links into SkyMap AR tools. */
export function WelcomeView({
  onNavigate,
  onStartDailyChallenge,
  onStartQuestAr,
  onOpenBodyInAr,
}: WelcomeViewProps) {
  return (
    <OrbitariumWelcomePage
      onNavigate={onNavigate}
      onOpenBodyInAr={onOpenBodyInAr}
      onStartDailyChallenge={onStartDailyChallenge}
      onStartQuestAr={onStartQuestAr}
    />
  );
}
