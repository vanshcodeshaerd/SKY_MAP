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
import { getStargazerLevelProgress } from '../data/stargazerLevels';
import {
  getDailyQuests,
  isDailyQuestComplete as isQuestCompleteForProgress,
  type DailyQuest,
} from '../services/dailyQuests';
import {
  applyBodyLockRewards,
  awardMissionCompleteXp,
  completeDailyQuest,
  addStargazerXp,
  passSafetyQuiz as storeSafetyQuizPassed,
  type XpGainEvent,
} from '../services/stargazerGamification';
import { getMissionById } from '../data/missions';

export interface MissionProgressContextValue {
  progress: MissionProgressState;
  rank: { id: string; title: string };
  xpLevelProgress: ReturnType<typeof getStargazerLevelProgress>;
  snapshot: MissionAppSnapshot;
  evaluations: MissionEvaluationResult[];
  nextMissionId: MissionId | null;
  completedCount: number;
  totalMissions: number;
  dailyChallenge: DailyChallenge | null;
  isDailyChallengeDoneToday: boolean;
  dailyQuests: DailyQuest[];
  isDailyQuestComplete: (questId: string) => boolean;
  alignmentHoldProgress: number;
  resetProgress: () => void;
  markLocationConfigured: () => void;
  markVisitedDashboard: () => void;
  markVisitedSky3d: () => void;
  markCvLabProcessed: () => void;
  setServerCompareState: (active: boolean, deltaDeg: number | null) => void;
  setArBodyLocked: (
    locked: boolean,
    bodyId?: CelestialBodyId | null,
    meta?: { moonPhaseName?: string; sunAltitudeDeg?: number }
  ) => void;
  reportArAlignmentHold: (bodyId: CelestialBodyId, isLocked: boolean, deltaSec: number) => void;
  recordBodyDiscovery: (bodyId: CelestialBodyId) => void;
  exportProgressCsv: () => void;
  passSafetyQuiz: () => void;
  lastNewlyCompleted: MissionId[];
  clearLastNewlyCompleted: () => void;
  lastXpGain: XpGainEvent | null;
  clearLastXpGain: () => void;
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
  const [lastXpGain, setLastXpGain] = useState<XpGainEvent | null>(null);
  const [alignmentHoldProgress, setAlignmentHoldProgress] = useState(0);
  const dashboardTickRef = useRef<number | null>(null);
  const dailyQuestsRef = useRef<DailyQuest[]>([]);
  const holdRef = useRef<{ bodyId: CelestialBodyId | null; seconds: number }>({
    bodyId: null,
    seconds: 0,
  });

  const pushXpEvents = useCallback((events: XpGainEvent[]) => {
    if (events.length === 0) return;
    setLastXpGain(events[events.length - 1]);
  }, []);

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

  const dailyQuests = useMemo(
    () => getDailyQuests(location, currentDate),
    [location.latitude, location.longitude, location.elevationM, currentDate.getTime()]
  );
  dailyQuestsRef.current = dailyQuests;

  const dateKey = localDateKey(currentDate);

  const isDailyQuestComplete = useCallback(
    (questId: string) => isQuestCompleteForProgress(progress, questId, dateKey),
    [progress.dailyQuestDate, progress.completedDailyQuestIds, dateKey]
  );

  const xpLevelProgress = useMemo(
    () => getStargazerLevelProgress(progress.stargazerXp),
    [progress.stargazerXp]
  );

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
        let withXp = next;
        const xpEvents: XpGainEvent[] = [];
        for (const id of newlyCompleted) {
          const mission = getMissionById(id);
          if (mission) {
            const r = awardMissionCompleteXp(withXp, mission.title);
            withXp = r.progress;
            xpEvents.push(r.xpEvent);
          }
        }
        pushXpEvents(xpEvents);
        const changed =
          withXp.completedMissionIds.length !== prev.completedMissionIds.length ||
          withXp.earnedBadgeIds.length !== prev.earnedBadgeIds.length ||
          withXp.discoveredBodyIds.length !== prev.discoveredBodyIds.length ||
          withXp.stargazerXp !== prev.stargazerXp;
        return changed ? withXp : prev;
      }
      const changed =
        next.completedMissionIds.length !== prev.completedMissionIds.length ||
        next.earnedBadgeIds.length !== prev.earnedBadgeIds.length ||
        next.discoveredBodyIds.length !== prev.discoveredBodyIds.length;
      return changed ? next : prev;
    });
  }, [snapshot, pushXpEvents]);

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

  const setServerCompareState = useCallback(
    (active: boolean, deltaDeg: number | null) => {
      setSession((s) => ({
        ...s,
        serverCompareActive: active,
        serverCompareDeltaDeg: active ? deltaDeg : null,
      }));
      if (!active || deltaDeg === null) return;
      setProgress((prev) => {
        let next = prev;
        const xpEvents: XpGainEvent[] = [];
        for (const quest of dailyQuestsRef.current) {
          if (quest.kind !== 'compare_math') continue;
          if (deltaDeg >= (quest.compareMaxDeltaDeg ?? 0.15)) continue;
          const result = completeDailyQuest(next, quest);
          if (result.xpEvent) {
            xpEvents.push(result.xpEvent);
            next = result.progress;
          }
        }
        pushXpEvents(xpEvents);
        return next;
      });
    },
    [pushXpEvents]
  );

  const setArBodyLocked = useCallback(
    (
      locked: boolean,
      bodyId: CelestialBodyId | null = null,
      meta?: { moonPhaseName?: string; sunAltitudeDeg?: number }
    ) => {
      setSession((s) => ({
        ...s,
        arBodyLocked: locked,
        arLockedBodyId: locked ? bodyId : null,
      }));
      if (locked && bodyId) {
        setProgress((prev) => {
          const dk = localDateKey(currentDate);
          let next = recordDiscoveredBody(prev, bodyId);
          const xpEvents: XpGainEvent[] = [];
          const challenge = dailyChallengeRef.current;
          const wasChallengeDone =
            prev.dailyChallengeDate === challenge?.dateKey && prev.dailyChallengeCompleted;
          if (challenge && challenge.bodyId === bodyId && !wasChallengeDone) {
            next = markDailyChallengeComplete(next, challenge.dateKey);
            next = addStargazerXp(next, 120, false);
            xpEvents.push({ amount: 120, reason: "Today's sky challenge" });
          }
          const rewards = applyBodyLockRewards(next, bodyId, {
            dateKey: dk,
            moonPhaseName: meta?.moonPhaseName,
            sunAltitudeDeg: meta?.sunAltitudeDeg,
          });
          next = rewards.progress;
          xpEvents.push(...rewards.xpEvents);
          pushXpEvents(xpEvents);
          return next;
        });
      }
    },
    [currentDate, pushXpEvents]
  );

  const reportArAlignmentHold = useCallback(
    (bodyId: CelestialBodyId, isLocked: boolean, deltaSec: number) => {
      if (!isLocked) {
        holdRef.current = { bodyId: null, seconds: 0 };
        setAlignmentHoldProgress(0);
        return;
      }
      if (holdRef.current.bodyId !== bodyId) {
        holdRef.current = { bodyId, seconds: 0 };
      }
      holdRef.current.seconds += deltaSec;
      const held = holdRef.current.seconds;
      setAlignmentHoldProgress(Math.min(1, held / 3));

      if (held < 3) return;

      setProgress((prev) => {
        let next = prev;
        const xpEvents: XpGainEvent[] = [];
        for (const quest of dailyQuestsRef.current) {
          if (quest.kind !== 'align_hold') continue;
          if (quest.bodyId !== bodyId) continue;
          const result = completeDailyQuest(next, quest);
          if (result.xpEvent) {
            xpEvents.push(result.xpEvent);
            next = result.progress;
          }
        }
        pushXpEvents(xpEvents);
        return next;
      });
    },
    [pushXpEvents]
  );

  const passSafetyQuiz = useCallback(() => {
    setProgress((prev) => storeSafetyQuizPassed(prev));
  }, []);

  const clearLastXpGain = useCallback(() => {
    setLastXpGain(null);
  }, []);

  const exportProgressCsv = useCallback(() => {
    const rank = getRank(progress);
    const csv = buildProgressCsv(progress, location, {
      rankTitle: rank.title,
      stargazerLevel: xpLevelProgress.level.title,
      dailyChallengeDate: progress.dailyChallengeDate,
      dailyChallengeCompleted: progress.dailyChallengeCompleted,
    });
    downloadTextFile(`skygazer-progress-${localDateKey(currentDate)}.csv`, csv);
  }, [progress, location, currentDate, xpLevelProgress.level.title]);

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
    setLastXpGain(null);
    setAlignmentHoldProgress(0);
  }, []);

  const clearLastNewlyCompleted = useCallback(() => {
    setLastNewlyCompleted([]);
  }, []);

  const value: MissionProgressContextValue = useMemo(
    () => ({
      progress,
      rank: getRank(progress),
      xpLevelProgress,
      snapshot,
      evaluations,
      nextMissionId: getNextMission(progress),
      completedCount: countCompletedMissions(progress),
      totalMissions: MISSIONS.length,
      dailyChallenge,
      isDailyChallengeDoneToday,
      dailyQuests,
      isDailyQuestComplete,
      alignmentHoldProgress,
      resetProgress,
      markLocationConfigured,
      markVisitedDashboard,
      markVisitedSky3d,
      markCvLabProcessed,
      setServerCompareState,
      setArBodyLocked,
      reportArAlignmentHold,
      recordBodyDiscovery,
      exportProgressCsv,
      passSafetyQuiz,
      lastNewlyCompleted,
      clearLastNewlyCompleted,
      lastXpGain,
      clearLastXpGain,
    }),
    [
      progress,
      xpLevelProgress,
      snapshot,
      evaluations,
      dailyChallenge,
      isDailyChallengeDoneToday,
      dailyQuests,
      isDailyQuestComplete,
      alignmentHoldProgress,
      resetProgress,
      markLocationConfigured,
      markVisitedDashboard,
      markVisitedSky3d,
      markCvLabProcessed,
      setServerCompareState,
      setArBodyLocked,
      reportArAlignmentHold,
      recordBodyDiscovery,
      exportProgressCsv,
      passSafetyQuiz,
      lastNewlyCompleted,
      clearLastNewlyCompleted,
      lastXpGain,
      clearLastXpGain,
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
