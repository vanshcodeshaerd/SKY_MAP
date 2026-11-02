import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { MISSIONS } from '../data/missions';
import type { CelestialBodyId, GeodeticLocation } from '../types/astronomy';
import type {
  MissionAppSnapshot,
  MissionEvaluationResult,
  MissionId,
  MissionProgressState,
} from '../types/missions';
import {
  countCompletedMissions,
  evaluateAllMissions,
  evaluateMission,
  getNextMission,
  getRank,
  loadProgress,
  markDailyChallengeComplete,
  resetProgress as resetStoredProgress,
  recordDiscoveredBody,
  saveProgress,
} from '../services/missionEngine';
import {
  getDailyChallenge,
  isDailyChallengeCompleteToday,
  localDateKey,
  type DailyChallenge,
} from '../services/dailyChallenge';
import { buildProgressCsv, downloadTextFile } from '../services/telemetryExport';

export interface MissionProgressContextValue {
  progress: MissionProgressState;
  rank: { id: string; title: string };
  snapshot: MissionAppSnapshot;
  evaluations: MissionEvaluationResult[];
  nextMissionId: MissionId | null;
  completedCount: number;
  totalMissions: number;
  dailyChallenge: DailyChallenge | null;
  isDailyChallengeDoneToday: boolean;
  resetProgress: () => void;
  markLocationConfigured: () => void;
  markVisitedDashboard: () => void;
  markVisitedSky3d: () => void;
  markCvLabProcessed: () => void;
  setServerCompareState: (active: boolean, deltaDeg: number | null) => void;
  setArBodyLocked: (locked: boolean, bodyId?: CelestialBodyId | null) => void;
  recordBodyDiscovery: (bodyId: CelestialBodyId) => void;
  exportProgressCsv: () => void;
  /** Missions completed on the latest evaluation pass (for toasts in Step 2+) */
  lastNewlyCompleted: MissionId[];
  clearLastNewlyCompleted: () => void;
}

const MissionProgressContext = createContext<MissionProgressContextValue | null>(null);

export function useMissionProgressContext(): MissionProgressContextValue {
  const ctx = useContext(MissionProgressContext);
  if (!ctx) {
    throw new Error('useMissionProgressContext must be used within MissionProgressProvider');
  }
  return ctx;
}

interface SessionFlags {
  locationConfigured: boolean;
  visitedDashboard: boolean;
  dashboardLiveSeconds: number;
  visitedSky3d: boolean;
  cvLabProcessedImage: boolean;
  serverCompareActive: boolean;
  serverCompareDeltaDeg: number | null;
  arBodyLocked: boolean;
  arLockedBodyId: CelestialBodyId | null;
}

const defaultSession: SessionFlags = {
  locationConfigured: false,
  visitedDashboard: false,
  dashboardLiveSeconds: 0,
  visitedSky3d: false,
  cvLabProcessedImage: false,
  serverCompareActive: false,
  serverCompareDeltaDeg: null,
  arBodyLocked: false,
  arLockedBodyId: null,
};

interface MissionProgressProviderProps {
  children: ReactNode;
  /** Parent reports live dashboard tab + clock for Mission 1 */
  dashboardLiveActive: boolean;
  /** GPS fix acquired */
  isLiveGps: boolean;
  location: GeodeticLocation;
  currentDate: Date;
}

export function MissionProgressProvider({
  children,
  dashboardLiveActive,
  isLiveGps,
  location,
  currentDate,
}: MissionProgressProviderProps) {
  const [progress, setProgress] = useState<MissionProgressState>(() => loadProgress());
  const [session, setSession] = useState<SessionFlags>(defaultSession);
  const [lastNewlyCompleted, setLastNewlyCompleted] = useState<MissionId[]>([]);
  const dashboardTickRef = useRef<number | null>(null);

  useEffect(() => {
    if (isLiveGps) {
      setSession((s) => ({ ...s, locationConfigured: true }));
    }
  }, [isLiveGps]);

  useEffect(() => {
    if (!dashboardLiveActive) {
      if (dashboardTickRef.current !== null) {
        window.clearInterval(dashboardTickRef.current);
        dashboardTickRef.current = null;
      }
      return;
    }

    setSession((s) => ({ ...s, visitedDashboard: true }));

    dashboardTickRef.current = window.setInterval(() => {
      setSession((s) => ({
        ...s,
        visitedDashboard: true,
        dashboardLiveSeconds: s.dashboardLiveSeconds + 1,
      }));
    }, 1000);

    return () => {
      if (dashboardTickRef.current !== null) {
        window.clearInterval(dashboardTickRef.current);
        dashboardTickRef.current = null;
      }
    };
  }, [dashboardLiveActive]);

  const snapshot: MissionAppSnapshot = useMemo(
    () => ({
      locationConfigured: session.locationConfigured,
      visitedDashboard: session.visitedDashboard,
      dashboardLiveSeconds: session.dashboardLiveSeconds,
      serverCompareActive: session.serverCompareActive,
      serverCompareDeltaDeg: session.serverCompareDeltaDeg,
      arBodyLocked: session.arBodyLocked,
      arLockedBodyId: session.arLockedBodyId,
      visitedSky3d: session.visitedSky3d,
      cvLabProcessedImage: session.cvLabProcessedImage,
      discoveredBodyCount: progress.discoveredBodyIds.length,
    }),
    [session, progress.discoveredBodyIds.length]
  );

  const dailyChallenge = useMemo(
    () => getDailyChallenge(location, currentDate),
    [location.latitude, location.longitude, location.elevationM, currentDate.getTime()]
  );

  const isDailyChallengeDoneToday = useMemo(
    () =>
      dailyChallenge
        ? isDailyChallengeCompleteToday(progress, dailyChallenge.dateKey)
        : false,
    [progress.dailyChallengeDate, progress.dailyChallengeCompleted, dailyChallenge]
  );

  const dailyChallengeRef = useRef(dailyChallenge);
  dailyChallengeRef.current = dailyChallenge;

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('skygazer_location')) {
      setSession((s) => ({ ...s, locationConfigured: true }));
    }
  }, []);

  useEffect(() => {
    setProgress((prev) => {
      const { progress: next, newlyCompleted } = evaluateAllMissions(snapshot, prev);
      if (newlyCompleted.length > 0) {
        setLastNewlyCompleted(newlyCompleted);
      }
      const changed =
        next.completedMissionIds.length !== prev.completedMissionIds.length ||
        next.earnedBadgeIds.length !== prev.earnedBadgeIds.length ||
        next.discoveredBodyIds.length !== prev.discoveredBodyIds.length;
      return changed ? next : prev;
    });
  }, [snapshot]);

  const evaluations = useMemo(
    () => MISSIONS.map((m) => evaluateMission(m.id, snapshot, progress)),
    [snapshot, progress]
  );

  const markLocationConfigured = useCallback(() => {
    setSession((s) => ({ ...s, locationConfigured: true }));
  }, []);

  const markVisitedDashboard = useCallback(() => {
    setSession((s) => ({ ...s, visitedDashboard: true }));
  }, []);

  const markVisitedSky3d = useCallback(() => {
    setSession((s) => ({ ...s, visitedSky3d: true }));
  }, []);

  const markCvLabProcessed = useCallback(() => {
    setSession((s) => ({ ...s, cvLabProcessedImage: true }));
  }, []);

  const setServerCompareState = useCallback((active: boolean, deltaDeg: number | null) => {
    setSession((s) => ({
      ...s,
      serverCompareActive: active,
      serverCompareDeltaDeg: active ? deltaDeg : null,
    }));
  }, []);

  const setArBodyLocked = useCallback((locked: boolean, bodyId: CelestialBodyId | null = null) => {
    setSession((s) => ({
      ...s,
      arBodyLocked: locked,
      arLockedBodyId: locked ? bodyId : null,
    }));
    if (locked && bodyId) {
      setProgress((prev) => {
        let next = recordDiscoveredBody(prev, bodyId);
        const challenge = dailyChallengeRef.current;
        if (challenge && challenge.bodyId === bodyId) {
          next = markDailyChallengeComplete(next, challenge.dateKey);
        } else {
          saveProgress(next);
        }
        return next;
      });
    }
  }, []);

  const exportProgressCsv = useCallback(() => {
    const rank = getRank(progress);
    const csv = buildProgressCsv(progress, location, {
      rankTitle: rank.title,
      dailyChallengeDate: progress.dailyChallengeDate,
      dailyChallengeCompleted: progress.dailyChallengeCompleted,
    });
    downloadTextFile(`skygazer-progress-${localDateKey(currentDate)}.csv`, csv);
  }, [progress, location, currentDate]);

  const recordBodyDiscovery = useCallback((bodyId: CelestialBodyId) => {
    setProgress((prev) => {
      const next = recordDiscoveredBody(prev, bodyId);
      saveProgress(next);
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    const fresh = resetStoredProgress();
    setProgress(fresh);
    setSession({
      ...defaultSession,
      locationConfigured:
        typeof window !== 'undefined' && !!localStorage.getItem('skygazer_location'),
    });
    setLastNewlyCompleted([]);
  }, []);

  const clearLastNewlyCompleted = useCallback(() => {
    setLastNewlyCompleted([]);
  }, []);

  const value: MissionProgressContextValue = useMemo(
    () => ({
      progress,
      rank: getRank(progress),
      snapshot,
      evaluations,
      nextMissionId: getNextMission(progress),
      completedCount: countCompletedMissions(progress),
      totalMissions: MISSIONS.length,
      dailyChallenge,
      isDailyChallengeDoneToday,
      resetProgress,
      markLocationConfigured,
      markVisitedDashboard,
      markVisitedSky3d,
      markCvLabProcessed,
      setServerCompareState,
      setArBodyLocked,
      recordBodyDiscovery,
      exportProgressCsv,
      lastNewlyCompleted,
      clearLastNewlyCompleted,
    }),
    [
      progress,
      snapshot,
      evaluations,
      dailyChallenge,
      isDailyChallengeDoneToday,
      resetProgress,
      markLocationConfigured,
      markVisitedDashboard,
      markVisitedSky3d,
      markCvLabProcessed,
      setServerCompareState,
      setArBodyLocked,
      recordBodyDiscovery,
      exportProgressCsv,
      lastNewlyCompleted,
      clearLastNewlyCompleted,
    ]
  );

  return (
    <MissionProgressContext.Provider value={value}>{children}</MissionProgressContext.Provider>
  );
}

/** Read-only hook for components that may render outside provider during tests */
export function useMissionProgressOptional(): MissionProgressContextValue | null {
  return useContext(MissionProgressContext);
}
