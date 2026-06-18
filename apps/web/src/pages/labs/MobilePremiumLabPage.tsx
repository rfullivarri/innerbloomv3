import { Children, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useBackendUser } from '../../hooks/useBackendUser';
import { useOnboardingProgress } from '../../hooks/useOnboardingProgress';
import { useRequest } from '../../hooks/useRequest';
import { useUserTasks } from '../../hooks/useUserTasks';
import { useWeeklyWrapped } from '../../hooks/useWeeklyWrapped';
import { useAuth, useClerk, useUser } from '../../auth/runtimeAuth';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';
import {
  getDailyQuestDefinition,
  getDailyQuestStatus,
  getEmotions,
  getGameModeUpgradeSuggestion,
  getDevUserOverride,
  getModerationState,
  getRewardsHistory,
  getTaskInsights,
  getUserStreakPanel,
  getUserXpByTrait,
  acceptGameModeUpgradeSuggestion,
  dismissGameModeUpgradeSuggestion,
  submitDailyQuest,
  updateModerationConfig,
  updateModerationStatus,
  type DailyQuestDefinitionResponse,
  type DailyQuestEmotionOption,
  type DailyQuestTaskDefinition,
  type EmotionSnapshot,
  type GameModeUpgradeSuggestion,
  type HabitAchievementPillarGroup,
  type HabitAchievementShelfItem,
  type MonthlyWrappedRecord,
  type ModerationStateResponse,
  type ModerationStatus,
  type ModerationTracker,
  type ModerationTrackerType,
  type RewardsHistorySummary,
  type StreakPanelPillar,
  type StreakPanelTask,
  type SubmitDailyQuestFeedbackEvent,
  type SubmitDailyQuestResponse,
  type TaskInsightsResponse,
  type WeeklyWrappedRecord,
} from '../../lib/api';
import { ModerationTrackerIcon, moderationTrackerMeta } from '../../components/moderation/trackerMeta';
import { HabitAchievementSeal } from '../../components/dashboard-v3/HabitAchievementSeal';
import { mobilePremiumDemoTasks } from './mobilePremiumLabMockData';
import {
  MobilePremiumShell,
  MobileSectionHeader,
  SemanticChip,
  ThinSeparator,
  TraitIcon,
  WeeklyProgressRingCompact,
  type PremiumNavItem,
} from './mobile-premium/MobilePremiumPrimitives';
import { PremiumDailyQuest } from './mobile-premium/variants/PremiumDailyQuest';
import { PremiumDashboard } from './mobile-premium/variants/PremiumDashboard';
import { PremiumBalanceCard } from './mobile-premium/variants/PremiumBalanceCard';
import { PremiumInteractionOverlays, type PremiumOverlayKind } from './mobile-premium/variants/PremiumInteractionOverlays';
import { buildActiveOnboardingBanners, PremiumOnboardingBannersLab } from './mobile-premium/variants/PremiumOnboardingBannersLab';
import { PremiumRewardsSection, PremiumWeeklyWrappedStory } from './mobile-premium/variants/PremiumRewardsSection';
import {
  LAB_FALLBACK_UPGRADE_SUGGESTION,
  hasActivePremiumRhythmSuggestion,
  PremiumRhythmRecommendationBanner,
} from './mobile-premium/variants/PremiumRhythmRecommendation';
import { PremiumTaskDetail, type TaskEditDraft } from './mobile-premium/variants/PremiumTaskDetail';
import { PremiumTasksScreen, type PremiumTaskRow as PremiumTasksScreenRow } from './mobile-premium/variants/PremiumTasksScreen';
import type { MobilePremiumTheme } from './mobile-premium/mobilePremiumTokens';
import {
  buildPremiumRowsFromLocalOnboarding,
  buildTraitXpFromLocalOnboarding,
  markLocalOnboardingStep,
  readLocalOnboardingSnapshot,
  recordLocalDailyQuest,
  updateLocalOnboardingTask,
  type LocalOnboardingSnapshot,
} from './mobile-premium/localOnboardingBridge';
import {
  DEFAULT_MOBILE_PREMIUM_BASE,
  MobilePremiumBasePathProvider,
  normalizeMobilePremiumBasePath,
  useMobilePremiumBasePath,
} from './mobile-premium/mobilePremiumRouting';

const LAB_BASE = DEFAULT_MOBILE_PREMIUM_BASE;
const LAB_THEME_STORAGE_KEY = 'innerbloom.mobilePremiumLab.theme';
const LAB_ONBOARDING_PREVIEW_STORAGE_KEY = 'innerbloom.mobilePremiumLab.onboardingPreview';

const LAB_ROUTES = [
  { path: 'dashboard', label: 'Dashboard', trait: 'focus' },
  { path: 'tareas', label: 'Tareas', trait: 'mobility' },
  { path: 'dquest', label: 'DQuest', trait: 'calm' },
  { path: 'logros', label: 'Logros', trait: 'creativity' },
  { path: 'task-detail', label: 'Detalle', trait: 'learning' },
  { path: 'emotion-chart', label: 'Emoción', trait: 'calm' },
  { path: 'balance', label: 'Balance', trait: 'energy' },
  { path: 'vision-general', label: 'Visión', trait: 'connection' },
  { path: 'onboarding-banners', label: 'Onboarding', trait: 'gratitude' },
] as const;

type LabRoute = (typeof LAB_ROUTES)[number]['path'];

const ROUTE_LABELS: Record<LabRoute, string> = {
  dashboard: 'Dashboard',
  tareas: 'Tareas',
  dquest: 'DQuest',
  logros: 'Logros',
  'task-detail': 'Detalle de tarea',
  'emotion-chart': 'Emotion Chart',
  balance: 'Equilibrio',
  'vision-general': 'Visión general',
  'onboarding-banners': 'Onboarding banners',
};

const NAV_ROUTES: LabRoute[] = ['dquest', 'dashboard', 'tareas', 'logros'];
const STREAK_PILLARS: StreakPanelPillar[] = ['Body', 'Mind', 'Soul'];
type DQuestPillarCode = 'BODY' | 'MIND' | 'SOUL';
type RewardsPillarCode = 'BODY' | 'MIND' | 'SOUL';
type ActivityScope = 'W' | 'M' | '3M';
type PremiumDailyCompleteSummary = {
  emotionColor: string;
  emotionName: string;
  gpTotal: number;
  response: SubmitDailyQuestResponse;
  selectedTaskIds: string[];
  selectedTasks: number;
  totalTasks: number;
};

type PremiumTaskRow = {
  id: string;
  name: string;
  stat: string;
  pillar: StreakPanelPillar;
  difficultyLabel: string | null;
  weeklyDone: number;
  weeklyGoal: number;
  streakDays: number;
  monthWeeks: number[];
  monthlyCount?: number;
  monthlyXp?: number;
  quarterlyCount?: number;
  latestRecalibrationAction?: 'up' | 'keep' | 'down' | null;
  achievementSealVisible?: boolean;
  lifecycleStatus?: string | null;
};

type VisionTaskRow = PremiumTaskRow & {
  insights: TaskInsightsResponse | null;
};

type PremiumTaskDetail = PremiumTaskRow & {
  score: number;
  lifecycleLabel: string;
  insight: string;
  activeWindow: Array<{ month: string; percent: number }>;
  activityByScope: Record<ActivityScope, number[]>;
  difficultyAdjustments: Array<{
    date: string;
    action: 'up' | 'keep' | 'down';
    label: string;
  }>;
};

const FALLBACK_PREMIUM_TASK_ROWS: PremiumTaskRow[] = [
  {
    id: 'premium-sleep',
    name: 'Dormir 8hs',
    stat: 'Sueño',
    pillar: 'Body',
    difficultyLabel: 'Media',
    weeklyDone: 2,
    weeklyGoal: 3,
    streakDays: 12,
    monthWeeks: [3, 3, 0, 0, 0],
  },
  {
    id: 'premium-water',
    name: '2L de agua',
    stat: 'Hidratación',
    pillar: 'Body',
    difficultyLabel: 'Fácil',
    weeklyDone: 2,
    weeklyGoal: 3,
    streakDays: 4,
    monthWeeks: [3, 3, 0, 0, 0],
  },
  {
    id: 'premium-sugar',
    name: 'No dulces',
    stat: 'Nutrición',
    pillar: 'Body',
    difficultyLabel: 'Difícil',
    weeklyDone: 0,
    weeklyGoal: 3,
    streakDays: 0,
    monthWeeks: [0, 0, 0, 0, 0],
    latestRecalibrationAction: 'up',
  },
  {
    id: 'premium-run',
    name: '10.000 pasos / Correr',
    stat: 'Movilidad',
    pillar: 'Body',
    difficultyLabel: 'Difícil',
    weeklyDone: 2,
    weeklyGoal: 3,
    streakDays: 5,
    monthWeeks: [3, 3, 0, 0, 0],
  },
  {
    id: 'premium-read',
    name: 'Leer 20 min',
    stat: 'Aprendizaje',
    pillar: 'Mind',
    difficultyLabel: 'Fácil',
    weeklyDone: 1,
    weeklyGoal: 3,
    streakDays: 2,
    monthWeeks: [3, 0, 0, 0, 0],
  },
];

const FALLBACK_TASK_DETAIL: PremiumTaskDetail = {
  ...FALLBACK_PREMIUM_TASK_ROWS[0],
  latestRecalibrationAction: 'keep',
  score: 72,
  lifecycleLabel: 'Hábito en construcción',
  insight: 'Estás avanzando de forma constante.',
  activeWindow: [
    { month: 'Feb', percent: 38 },
    { month: 'Mar', percent: 63 },
    { month: 'Abr', percent: 82 },
    { month: 'May', percent: 86 },
  ],
  activityByScope: {
    W: [3, 2, 3, 1, 2],
    M: [3, 2, 3, 1, 2],
    '3M': [2, 3, 2, 3, 1],
  },
  difficultyAdjustments: [
    { date: '4 may', action: 'keep', label: 'Se mantuvo en Media' },
    { date: '7 abr', action: 'down', label: 'Bajó de Difícil a Media' },
    { date: '3 mar', action: 'up', label: 'Subió de Fácil a Difícil' },
  ],
};

const FALLBACK_DQUEST_DEFINITION: DailyQuestDefinitionResponse = {
  date: new Date().toISOString().slice(0, 10),
  submitted: false,
  submitted_at: null,
  emotionOptions: [
    { emotion_id: 1, code: 'calm', name: 'Calma' },
    { emotion_id: 2, code: 'happy', name: 'Felicidad' },
    { emotion_id: 3, code: 'motivation', name: 'Motivación' },
    { emotion_id: 4, code: 'sad', name: 'Tristeza' },
    { emotion_id: 5, code: 'anxiety', name: 'Ansiedad' },
    { emotion_id: 6, code: 'frustration', name: 'Frustración' },
    { emotion_id: 7, code: 'tired', name: 'Cansancio' },
  ],
  pillars: [
    {
      pillar_code: 'BODY',
      tasks: [
        { task_id: 'dq-premium-sleep', name: 'Dormir 8hs', trait_id: null, difficulty: 'Medium', difficulty_id: 2, xp: 3 },
        { task_id: 'dq-premium-mobility', name: 'Movilidad', trait_id: null, difficulty: 'Easy', difficulty_id: 1, xp: 1 },
        { task_id: 'dq-premium-run', name: '10.000 pasos / Correr', trait_id: null, difficulty: 'Hard', difficulty_id: 3, xp: 7 },
      ],
    },
  ],
};

const FALLBACK_DQUEST_COMPLETED_TASKS = new Set(['dq-premium-sleep', 'dq-premium-run']);
const FALLBACK_DQUEST_MODERATION: ModerationTracker = {
  type: 'sugar',
  is_enabled: true,
  is_paused: false,
  not_logged_tolerance_days: 2,
  current_streak_days: 6,
  statusToday: 'on_track',
};

const FALLBACK_PREMIUM_MODERATION_STATE: ModerationStateResponse = {
  dayKey: new Date().toISOString().slice(0, 10),
  dailyQuestCompleted: false,
  trackers: [
    { type: 'alcohol', is_enabled: true, is_paused: false, not_logged_tolerance_days: 2, current_streak_days: 0, statusToday: 'not_logged' },
    { type: 'sugar', is_enabled: true, is_paused: false, not_logged_tolerance_days: 2, current_streak_days: 6, statusToday: 'not_logged' },
    { type: 'tobacco', is_enabled: true, is_paused: false, not_logged_tolerance_days: 1, current_streak_days: 1, statusToday: 'on_track' },
  ],
};

function buildFallbackDailyCompleteSummary(): PremiumDailyCompleteSummary {
  return {
    emotionColor: '#64E86E',
    emotionName: 'Calma',
    gpTotal: 10,
    response: {
      ok: true,
      saved: {
        emotion: { emotion_id: 1, date: new Date().toISOString().slice(0, 10), notes: null },
        tasks: { date: new Date().toISOString().slice(0, 10), completed: ['dq-premium-sleep', 'dq-premium-run'] },
      },
      xp_delta: 10,
      xp_total_today: 134,
      streaks: { daily: 11, weekly: 3 },
      missions_v2: { bonus_ready: false, redirect_url: '/dashboard-v3/missions-v3', tasks: [] },
      feedback_events: [
        {
          type: 'level_up',
          notificationKey: 'inapp_level_up_popup',
          payload: { level: 24, previousLevel: 23 },
        },
        {
          type: 'streak_milestone',
          notificationKey: 'inapp_streak_fire_popup',
          payload: {
            threshold: 7,
            tasks: [
              { id: 'dq-premium-sleep', name: 'Dormir 8hs', streakDays: 12 },
              { id: 'dq-premium-run', name: '10.000 pasos / Correr', streakDays: 7 },
            ],
          },
        },
      ],
    },
    selectedTaskIds: ['dq-premium-sleep', 'dq-premium-run'],
    selectedTasks: 2,
    totalTasks: 3,
  };
}

const FALLBACK_REWARDS_HISTORY: RewardsHistorySummary = {
  weeklyWrapups: [
    {
      id: 'premium-weekly-1',
      userId: 'labs',
      weekStart: '2026-05-12',
      weekEnd: '2026-05-18',
      createdAt: '2026-05-18T00:00:00.000Z',
      updatedAt: '2026-05-18T00:00:00.000Z',
      seen: true,
      completionDays: ['2026-05-12', '2026-05-13', '2026-05-14', '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18'],
      payload: {
        emotions: { weekly: { label: 'Calma', color: '#64E86E' } },
        summary: { pillarDominant: 'BODY' },
      } as WeeklyWrappedRecord['payload'],
    },
  ],
  weeklyUnseenCount: 0,
  monthlyWrapups: [
    {
      id: 'premium-monthly-1',
      userId: 'labs',
      periodKey: '2026-05',
      createdAt: '2026-05-20T00:00:00.000Z',
      updatedAt: '2026-05-20T00:00:00.000Z',
      completionDays: ['2026-05-01', '2026-05-02', '2026-05-08', '2026-05-09', '2026-05-15'],
      payload: {},
      summary: { weeks: ['done', 'done', 'partial', 'empty', 'empty'] },
    },
  ],
  growthCalibration: {
    countdownDays: 12,
    latestPeriodLabel: '2026-04-30',
    summary: { up: 1, keep: 27, down: 3, total: 31 },
    latestResults: [],
  },
  habitAchievements: {
    pendingCount: 2,
    achievedByPillar: [
      {
        pillar: { id: 'body', code: 'BODY', name: 'Cuerpo' },
        habits: [
          createFallbackHabit({
            id: 'sleep-achieved',
            taskId: 'sleep',
            taskName: 'Dormir 8hs',
            traitCode: 'SLEEP',
            traitName: 'Sueño',
            status: 'maintained',
            achievedAt: '2026-03-28',
            gpBeforeAchievement: 142,
          }),
          createFallbackHabit({
            id: 'hydration-achieved',
            taskId: 'hydration',
            taskName: '2L de agua',
            traitCode: 'HYDRATION',
            traitName: 'Hidratación',
            status: 'maintained',
            achievedAt: '2026-04-02',
            gpBeforeAchievement: 158,
          }),
          createFallbackHabit({
            id: 'mobility-achieved',
            taskId: 'mobility',
            taskName: '10.000 pasos',
            traitCode: 'MOBILITY',
            traitName: 'Movilidad',
            status: 'maintained',
            achievedAt: '2026-04-11',
            gpBeforeAchievement: 121,
          }),
          createFallbackHabit({
            id: 'nutrition-locked',
            taskId: 'nutrition',
            taskName: 'No dulces',
            traitCode: 'NUTRITION',
            traitName: 'Nutrición',
            status: 'not_achieved',
            achievedAt: null,
            gpBeforeAchievement: 0,
          }),
        ],
      },
      {
        pillar: { id: 'mind', code: 'MIND', name: 'Mente' },
        habits: [
          createFallbackHabit({
            id: 'learning-achieved',
            taskId: 'learning',
            taskName: 'Leer 20 min',
            traitCode: 'LEARNING',
            traitName: 'Aprendizaje',
            status: 'maintained',
            achievedAt: '2026-04-08',
            gpBeforeAchievement: 104,
            pillar: 'MIND',
          }),
        ],
      },
      {
        pillar: { id: 'soul', code: 'SOUL', name: 'Alma' },
        habits: [],
      },
    ],
  },
};

function createFallbackHabit({
  id,
  taskId,
  taskName,
  traitCode,
  traitName,
  status,
  achievedAt,
  gpBeforeAchievement,
  pillar = 'BODY',
}: {
  id: string;
  taskId: string;
  taskName: string;
  traitCode: string;
  traitName: string;
  status: HabitAchievementShelfItem['status'];
  achievedAt: string | null;
  gpBeforeAchievement: number;
  pillar?: RewardsPillarCode;
}): HabitAchievementShelfItem {
  return {
    id,
    taskId,
    taskName,
    pillar,
    trait: { id: traitCode.toLowerCase(), code: traitCode, name: traitName },
    seal: { visible: status !== 'not_achieved' },
    status,
    achievedAt,
    decisionMadeAt: achievedAt,
    gpBeforeAchievement,
    gpSinceMaintain: 0,
    maintainEnabled: status !== 'not_achieved',
  };
}

export default function MobilePremiumLabPage({ basePath }: { basePath?: string } = {}) {
  return (
    <MobilePremiumBasePathProvider basePath={basePath}>
      <MobilePremiumLabPageInner />
    </MobilePremiumBasePathProvider>
  );
}

function MobilePremiumLabPageInner() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = usePostLoginLanguage();
  const labBase = useMobilePremiumBasePath();
  const backendUser = useBackendUser();
  const { signOut } = useAuth();
  const clerk = useClerk();
  const runtimeUser = useUser();
  const [onboardingPreview] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('onboardingPreview') === '1'
      || window.sessionStorage.getItem(LAB_ONBOARDING_PREVIEW_STORAGE_KEY) === '1';
  });
  const effectiveBackendUserId = onboardingPreview ? null : backendUser.backendUserId ?? getDevUserOverride();
  const tasksState = useUserTasks(effectiveBackendUserId);
  const onboardingProgressRequest = useOnboardingProgress({ enabled: Boolean(effectiveBackendUserId) });
  const route = resolveLabRoute(location.pathname, labBase);
  const [theme, setTheme] = useState<MobilePremiumTheme>(() => {
    if (typeof window === 'undefined') return 'dark';
    return window.localStorage.getItem(LAB_THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark';
  });
  const [activeOverlay, setActiveOverlay] = useState<PremiumOverlayKind>(null);
  const [dailyCompleteSummary, setDailyCompleteSummary] = useState<PremiumDailyCompleteSummary | null>(null);
  const [activeFeedbackEvent, setActiveFeedbackEvent] = useState<SubmitDailyQuestFeedbackEvent | null>(null);
  const [feedbackEventQueue, setFeedbackEventQueue] = useState<SubmitDailyQuestFeedbackEvent[]>([]);
  const [activeFeedbackIndex, setActiveFeedbackIndex] = useState(0);
  const [premiumModerationState, setPremiumModerationState] = useState<ModerationStateResponse>(
    onboardingPreview
      ? { dayKey: new Date().toISOString().slice(0, 10), dailyQuestCompleted: false, trackers: [] }
      : FALLBACK_PREMIUM_MODERATION_STATE,
  );
  const [premiumAddedTasks, setPremiumAddedTasks] = useState<PremiumTasksScreenRow[]>([]);
  const [localOnboardingSnapshot, setLocalOnboardingSnapshot] = useState<LocalOnboardingSnapshot | null>(() => readLocalOnboardingSnapshot());
  const [moderationPendingType, setModerationPendingType] = useState<ModerationTrackerType | null>(null);
  const [selectedModerationType, setSelectedModerationType] = useState<ModerationTrackerType>('sugar');
  const [localRhythmSuggestion, setLocalRhythmSuggestion] = useState<GameModeUpgradeSuggestion>(LAB_FALLBACK_UPGRADE_SUGGESTION);
  const [rhythmSuggestionSubmitting, setRhythmSuggestionSubmitting] = useState(false);
  const [localGameModeOverride, setLocalGameModeOverride] = useState<string | null>(null);
  const moderationRequest = useRequest(() => getModerationState(), [effectiveBackendUserId], {
    enabled: Boolean(effectiveBackendUserId),
  });
  const rhythmSuggestionRequest = useRequest(() => getGameModeUpgradeSuggestion(), [effectiveBackendUserId], {
    enabled: Boolean(effectiveBackendUserId),
  });
  const weeklyWrapped = useWeeklyWrapped(effectiveBackendUserId);
  const weeklyWrappedRadarRequest = useRequest(
    () => getUserXpByTrait(effectiveBackendUserId ?? ''),
    [effectiveBackendUserId],
    { enabled: Boolean(effectiveBackendUserId) },
  );

  useEffect(() => {
    const selector = 'meta[name="robots"][data-innerbloom-labs="mobile-premium"]';
    let meta = document.querySelector<HTMLMetaElement>(selector);
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      meta.dataset.innerbloomLabs = 'mobile-premium';
      document.head.appendChild(meta);
    }
    meta.content = 'noindex,nofollow';

    return () => {
      meta?.remove();
    };
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LAB_THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (onboardingPreview) {
      window.sessionStorage.setItem(LAB_ONBOARDING_PREVIEW_STORAGE_KEY, '1');
    }
  }, [onboardingPreview]);

  useEffect(() => {
    if (route === 'dashboard' && new URLSearchParams(location.search).get('onboardingAction') === 'reminder') {
      setActiveOverlay('reminders');
    }
  }, [location.search, route]);

  useEffect(() => {
    const refresh = () => setLocalOnboardingSnapshot(readLocalOnboardingSnapshot());
    window.addEventListener('storage', refresh);
    window.addEventListener('innerbloom:mobile-premium-onboarding-updated', refresh);
    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('innerbloom:mobile-premium-onboarding-updated', refresh);
    };
  }, []);

  useEffect(() => {
    if (
      !effectiveBackendUserId ||
      !onboardingProgressRequest.progress?.onboarding_started_at ||
      onboardingProgressRequest.progress.tasks_generated_at
    ) {
      return;
    }

    const refreshGeneration = () => {
      void Promise.all([
        onboardingProgressRequest.reload(),
        tasksState.reload(),
      ]);
    };
    refreshGeneration();
    const timer = window.setInterval(refreshGeneration, 2500);
    return () => window.clearInterval(timer);
  }, [
    effectiveBackendUserId,
    onboardingProgressRequest.progress?.onboarding_started_at,
    onboardingProgressRequest.progress?.tasks_generated_at,
    onboardingProgressRequest.reload,
    tasksState.reload,
  ]);

  useEffect(() => {
    if (moderationRequest.data) {
      setPremiumModerationState(moderationRequest.data);
    }
  }, [moderationRequest.data]);

  const effectiveOnboardingProgress = effectiveBackendUserId
    ? onboardingProgressRequest.progress
    : localOnboardingSnapshot?.progress ?? null;
  const shouldGuideTaskEdit = Boolean(effectiveOnboardingProgress?.tasks_generated_at && !effectiveOnboardingProgress.first_task_edited_at);
  const shouldGuideDailyQuest = Boolean(effectiveOnboardingProgress?.first_task_edited_at && !effectiveOnboardingProgress.first_daily_quest_completed_at);
  const shouldShowOnboardingGuide = Boolean(
    effectiveOnboardingProgress?.onboarding_started_at ||
    effectiveOnboardingProgress?.tasks_generated_at,
  );

  useEffect(() => {
    if (
      route !== 'dashboard' ||
      !effectiveOnboardingProgress?.first_task_edited_at ||
      effectiveOnboardingProgress.returned_to_dashboard_after_first_edit_at
    ) {
      return;
    }

    if (effectiveBackendUserId) {
      void onboardingProgressRequest.markStep('returned_to_dashboard_after_first_edit', {
        trigger: 'mobile_premium_dashboard_after_first_edit',
      });
      return;
    }
    setLocalOnboardingSnapshot(markLocalOnboardingStep('returned_to_dashboard_after_first_edit'));
  }, [
    effectiveBackendUserId,
    effectiveOnboardingProgress?.first_task_edited_at,
    effectiveOnboardingProgress?.returned_to_dashboard_after_first_edit_at,
    route,
  ]);

  useEffect(() => {
    if (
      route !== 'dquest' ||
      !shouldGuideDailyQuest ||
      effectiveOnboardingProgress?.first_daily_quest_prompted_at
    ) {
      return;
    }

    if (effectiveBackendUserId) {
      void onboardingProgressRequest.markStep('first_daily_quest_prompted', {
        trigger: 'mobile_premium_dquest_opened',
      });
      return;
    }
    setLocalOnboardingSnapshot(markLocalOnboardingStep('first_daily_quest_prompted'));
  }, [
    effectiveBackendUserId,
    effectiveOnboardingProgress?.first_daily_quest_prompted_at,
    route,
    shouldGuideDailyQuest,
  ]);

  if (!route) {
    return <Navigate to={`${labBase}/dashboard`} replace />;
  }

  const localWeeklyGoal = resolveWeeklyGoal(localOnboardingSnapshot?.gameMode ?? backendUser.profile?.game_mode ?? null, backendUser.profile?.weekly_target ?? null);
  const localOnboardingTasks = buildPremiumRowsFromLocalOnboarding(localOnboardingSnapshot, localWeeklyGoal);
  const hasRealTasks = tasksState.status === 'success' && tasksState.tasks.length > 0;
  const bridgeTasks = hasRealTasks ? premiumAddedTasks : [...localOnboardingTasks, ...premiumAddedTasks];
  const tasks = hasRealTasks ? tasksState.tasks : mobilePremiumDemoTasks;
  const userName = backendUser.profile?.full_name || backendUser.profile?.email_primary || 'Innerbloom';
  const userEmail = backendUser.profile?.email_primary ?? null;
  const effectiveGameMode = localGameModeOverride ?? localOnboardingSnapshot?.gameMode ?? backendUser.profile?.game_mode ?? null;
  const rhythmSuggestion = effectiveBackendUserId ? (rhythmSuggestionRequest.data ?? null) : localRhythmSuggestion;
  const hasRhythmSuggestion = !onboardingPreview && hasActivePremiumRhythmSuggestion(rhythmSuggestion);
  const overlayRhythmSuggestion = rhythmSuggestion;
  const navItems = buildNavItems(route, {
    dquest: shouldGuideDailyQuest,
    tareas: shouldGuideTaskEdit,
  }, labBase, t);
  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  const selectedModerationTracker =
    premiumModerationState.trackers.find((tracker) => tracker.type === selectedModerationType) ??
    premiumModerationState.trackers.find((tracker) => tracker.is_enabled && !tracker.is_paused) ??
    null;
  const goToDashboard = () => {
    setActiveOverlay(null);
    navigate(`${labBase}/dashboard`);
  };
  const openFeedbackEvent = useCallback((event: SubmitDailyQuestFeedbackEvent, index: number) => {
    setActiveFeedbackIndex(index);
    setActiveFeedbackEvent(event);
    setActiveOverlay(event.type === 'level_up' ? 'level-feedback' : 'streak-feedback');
  }, []);
  const handleReviewDailyProgress = useCallback(() => {
    const events = feedbackEventQueue.length
      ? feedbackEventQueue
      : dailyCompleteSummary?.response.feedback_events ?? [];
    const firstEvent = events[0] ?? null;

    if (!firstEvent) {
      setActiveFeedbackEvent(null);
      setActiveOverlay('dquest-completed');
      return;
    }

    setFeedbackEventQueue(events);
    openFeedbackEvent(firstEvent, 0);
  }, [dailyCompleteSummary?.response.feedback_events, feedbackEventQueue, openFeedbackEvent]);
  const handleShowFeedbackEvent = useCallback((event: SubmitDailyQuestFeedbackEvent) => {
    const eventIndex = feedbackEventQueue.findIndex((candidate) => candidate === event);
    openFeedbackEvent(event, eventIndex >= 0 ? eventIndex : 0);
  }, [feedbackEventQueue, openFeedbackEvent]);
  const handleCloseActiveOverlay = useCallback(() => {
    if (activeOverlay === 'level-feedback' || activeOverlay === 'streak-feedback') {
      const nextIndex = activeFeedbackIndex + 1;
      const nextEvent = feedbackEventQueue[nextIndex] ?? null;

      if (nextEvent) {
        openFeedbackEvent(nextEvent, nextIndex);
        return;
      }

      setActiveFeedbackEvent(null);
      setFeedbackEventQueue([]);
      setActiveFeedbackIndex(0);
    }

    setActiveOverlay(null);
  }, [activeFeedbackIndex, activeOverlay, feedbackEventQueue, openFeedbackEvent]);
  const handleWeeklyWrappedClose = useCallback(() => {
    void weeklyWrapped.completeModal();
  }, [weeklyWrapped.completeModal]);
  const handleRhythmSuggestionDismiss = async () => {
    if (!rhythmSuggestion || rhythmSuggestionSubmitting) return;

    if (!effectiveBackendUserId) {
      setLocalRhythmSuggestion((current) => ({ ...current, dismissed_at: new Date().toISOString() }));
      return;
    }

    setRhythmSuggestionSubmitting(true);
    try {
      await dismissGameModeUpgradeSuggestion();
      await rhythmSuggestionRequest.reload();
    } catch (error) {
      console.error('Failed to dismiss premium rhythm suggestion', error);
    } finally {
      setRhythmSuggestionSubmitting(false);
    }
  };
  const handleRhythmSuggestionConfirm = async () => {
    if (!rhythmSuggestion || rhythmSuggestionSubmitting) return;

    setRhythmSuggestionSubmitting(true);
    try {
      if (rhythmSuggestion.suggested_mode) {
        setLocalGameModeOverride(rhythmSuggestion.suggested_mode);
      }

      if (!effectiveBackendUserId) {
        setLocalRhythmSuggestion((current) => ({ ...current, accepted_at: new Date().toISOString() }));
        return;
      }

      await acceptGameModeUpgradeSuggestion();
      backendUser.reload();
      await rhythmSuggestionRequest.reload();
    } catch (error) {
      console.error('Failed to accept premium rhythm suggestion', error);
      throw error;
    } finally {
      setRhythmSuggestionSubmitting(false);
    }
  };
  const handleManualRhythmChange = (mode: string) => {
    setLocalGameModeOverride(mode);
  };
  const handleTaskSaved = async (draft?: TaskEditDraft, taskId?: string) => {
    if (effectiveBackendUserId) {
      await onboardingProgressRequest.reload();
      return;
    }
    if (onboardingPreview && draft) {
      const selectedTaskId = taskId ?? new URLSearchParams(location.search).get('taskId');
      if (selectedTaskId) {
        setLocalOnboardingSnapshot(updateLocalOnboardingTask(selectedTaskId, {
          name: draft.name.trim(),
          pillar: draft.pillar,
          trait: draft.stat,
          difficultyLabel: draft.difficultyLabel,
        }));
      }
    }
    setLocalOnboardingSnapshot(markLocalOnboardingStep('first_task_edited'));
  };
  const handleModerationDetailOpen = (tracker: ModerationTracker) => {
    setSelectedModerationType(tracker.type);
    setActiveOverlay('moderation');
  };
  const handleModerationCycle = async (type: ModerationTrackerType, status: ModerationStatus) => {
    if (!effectiveBackendUserId) {
      setPremiumModerationState((current) => ({
        ...current,
        trackers: current.trackers.map((tracker) => {
          if (tracker.type !== type) return tracker;
          const completedToday = tracker.statusToday === 'not_logged' && status === 'on_track';
          const trackerWithGrace = tracker as ModerationTracker & { remaining_grace_days?: number };
          const currentGrace = trackerWithGrace.remaining_grace_days ?? tracker.not_logged_tolerance_days;
          const remainingGrace = status === 'off_track' ? Math.max(0, currentGrace - 1) : currentGrace;
          const consumesLastGrace = status === 'off_track' && currentGrace === 0;
          return {
            ...tracker,
            statusToday: status,
            remaining_grace_days: remainingGrace,
            current_streak_days: consumesLastGrace
              ? 0
              : completedToday
                ? tracker.current_streak_days + 1
                : tracker.current_streak_days,
          };
        }),
      }));
      return;
    }

    setModerationPendingType(type);
    try {
      const updated = await updateModerationStatus(type, { dayKey: premiumModerationState.dayKey, status });
      setPremiumModerationState(updated);
    } catch (error) {
      console.error('Failed to update premium moderation status', error);
    } finally {
      setModerationPendingType(null);
    }
  };
  const handleModerationPause = async (tracker: ModerationTracker, shouldPause: boolean) => {
    if (!effectiveBackendUserId) {
      setPremiumModerationState((current) => ({
        ...current,
        trackers: current.trackers.map((item) => (
          item.type === tracker.type ? { ...item, is_paused: shouldPause } : item
        )),
      }));
      return;
    }

    setModerationPendingType(tracker.type);
    try {
      const updated = await updateModerationConfig(tracker.type, { isPaused: shouldPause });
      setPremiumModerationState(updated);
    } catch (error) {
      console.error('Failed to update premium moderation pause state', error);
    } finally {
      setModerationPendingType(null);
    }
  };
  const handleModerationEnabled = async (type: ModerationTrackerType, enabled: boolean) => {
    if (!effectiveBackendUserId) {
      setPremiumModerationState((current) => ({
        ...current,
        trackers: current.trackers.map((tracker) => (
          tracker.type === type ? { ...tracker, is_enabled: enabled } : tracker
        )),
      }));
      return;
    }

    setModerationPendingType(type);
    try {
      const updated = await updateModerationConfig(type, { isEnabled: enabled });
      setPremiumModerationState(updated);
    } catch (error) {
      console.error('Failed to update premium moderation widget state', error);
    } finally {
      setModerationPendingType(null);
    }
  };
  const handleModerationTolerance = async (tracker: ModerationTracker, days: number) => {
    const tolerance = Math.max(0, Math.min(7, Math.round(days)));
    if (!effectiveBackendUserId) {
      setPremiumModerationState((current) => ({
        ...current,
        trackers: current.trackers.map((item) => (
          item.type === tracker.type ? { ...item, not_logged_tolerance_days: tolerance } : item
        )),
      }));
      return;
    }

    setModerationPendingType(tracker.type);
    try {
      const updated = await updateModerationConfig(tracker.type, { notLoggedToleranceDays: tolerance });
      setPremiumModerationState(updated);
    } catch (error) {
      console.error('Failed to update premium moderation tolerance', error);
    } finally {
      setModerationPendingType(null);
    }
  };

  return (
    <MobilePremiumShell
      navItems={navItems}
      onMenuOpen={() => setActiveOverlay('menu')}
      onThemeToggle={toggleTheme}
      theme={theme}
      title={resolveRouteLabel(route, t)}
    >
      <section className="space-y-7">
        {shouldShowOnboardingGuide && effectiveOnboardingProgress && ['dashboard', 'tareas', 'logros'].includes(route) ? (
          <PremiumOnboardingBannersLab
            banners={buildActiveOnboardingBanners(effectiveOnboardingProgress, labBase)}
            compact
            welcomeStorageKey={
              onboardingPreview && effectiveOnboardingProgress.onboarding_session_id
                ? `innerbloom.mobilePremiumLab.welcomeSeen:${effectiveOnboardingProgress.onboarding_session_id}`
                : undefined
            }
          />
        ) : null}
        {route === 'dashboard' ? (
          <>
            {hasRhythmSuggestion && rhythmSuggestion ? (
              <PremiumRhythmRecommendationBanner
                onDismiss={() => {
                  void handleRhythmSuggestionDismiss();
                }}
                onOpen={() => {
                  setActiveOverlay('rhythm');
                }}
                suggestion={rhythmSuggestion}
              />
            ) : null}
            <PremiumDashboard
              backendUserId={effectiveBackendUserId}
              gameMode={effectiveGameMode}
              localXpTotal={hasRealTasks ? null : localOnboardingSnapshot?.xp.total ?? null}
              localSnapshot={onboardingPreview ? localOnboardingSnapshot : null}
              moderationPendingType={moderationPendingType}
              moderationTrackers={premiumModerationState.trackers}
              onboardingPreview={onboardingPreview}
              onCycleModeration={handleModerationCycle}
              onModerationDetail={handleModerationDetailOpen}
              onModerationOpen={() => setActiveOverlay('widgets')}
              weeklyTarget={backendUser.profile?.weekly_target ?? null}
            />
          </>
        ) : null}
        {route === 'tareas' ? (
          <PremiumTasksScreen
            addedTasks={bridgeTasks}
            backendUserId={effectiveBackendUserId}
            gameMode={effectiveGameMode}
            onAddSuggestedTasks={(createdTasks) => {
              setPremiumAddedTasks((current) => {
                const existingIds = new Set(current.map((task) => task.id));
                return [...createdTasks.filter((task) => !existingIds.has(task.id)), ...current];
              });
            }}
            onNewTask={() => {
              setActiveOverlay('ai-task');
            }}
            onboardingEditCue={shouldGuideTaskEdit}
            onboardingPreview={onboardingPreview}
            weeklyTarget={backendUser.profile?.weekly_target ?? null}
          />
        ) : null}
        {route === 'dquest' ? (
          <PremiumDailyQuest
            extraTasks={bridgeTasks}
            hasSession={Boolean(effectiveBackendUserId)}
            onboardingPreview={onboardingPreview}
            previewAlreadyCompleted={Boolean(
              onboardingPreview
              && localOnboardingSnapshot?.dquestHistory.some((record) => record.date === new Date().toISOString().slice(0, 10)),
            )}
            moderationPendingType={moderationPendingType}
            moderationTrackers={premiumModerationState.trackers}
            onConfirmFeedback={(summary) => {
              if (effectiveBackendUserId) {
                void onboardingProgressRequest.reload();
                weeklyWrapped.reload();
              } else {
                recordLocalDailyQuest({
                  emotionColor: summary.emotionColor,
                  emotionName: summary.emotionName,
                  gpEarned: summary.gpTotal,
                  completedTaskIds: summary.selectedTaskIds,
                });
                setLocalOnboardingSnapshot(markLocalOnboardingStep('first_daily_quest_completed'));
              }
              const feedbackEvents = summary.response.feedback_events ?? [];
              setDailyCompleteSummary(summary);
              setFeedbackEventQueue(feedbackEvents);
              setActiveFeedbackIndex(0);
              setActiveFeedbackEvent(feedbackEvents[0] ?? null);
              setActiveOverlay('daily-complete');
            }}
            onCycleModeration={handleModerationCycle}
            onModerationDetail={handleModerationDetailOpen}
            onModerationOpen={() => setActiveOverlay('widgets')}
            onSnooze={goToDashboard}
          />
        ) : null}
        {route === 'logros' ? (
          <PremiumRewardsSection
            backendUserId={effectiveBackendUserId}
            localSnapshot={onboardingPreview ? localOnboardingSnapshot : null}
            onboardingPreview={onboardingPreview}
          />
        ) : null}
        {route === 'task-detail' ? (
          <PremiumTaskDetail
            backendUserId={effectiveBackendUserId}
            gameMode={effectiveGameMode}
            onboardingEditCue={shouldGuideTaskEdit}
            onboardingPreview={onboardingPreview}
            onTaskSaved={handleTaskSaved}
            previewTasks={onboardingPreview ? bridgeTasks : []}
            weeklyTarget={backendUser.profile?.weekly_target ?? null}
          />
        ) : null}
        {route === 'emotion-chart' ? (
          <EmotionChartPanel
            backendUserId={effectiveBackendUserId}
            localSnapshot={onboardingPreview ? localOnboardingSnapshot : null}
          />
        ) : null}
        {route === 'balance' ? (
          <BalancePanel
            backendUserId={effectiveBackendUserId}
            gameMode={effectiveGameMode}
            localSnapshot={onboardingPreview ? localOnboardingSnapshot : null}
            weeklyTarget={backendUser.profile?.weekly_target ?? null}
          />
        ) : null}
        {route === 'vision-general' ? (
          <VisionPanel
            backendUserId={effectiveBackendUserId}
            gameMode={effectiveGameMode}
            localSnapshot={onboardingPreview ? localOnboardingSnapshot : null}
            weeklyTarget={backendUser.profile?.weekly_target ?? null}
          />
        ) : null}
        {route === 'onboarding-banners' ? <PremiumOnboardingBannersLab /> : null}
      </section>
      <PremiumInteractionOverlays
        activeOverlay={activeOverlay}
        activeFeedbackEvent={activeFeedbackEvent}
        backendUserId={effectiveBackendUserId}
        dailyCompleteSummary={dailyCompleteSummary ?? undefined}
        gameMode={effectiveGameMode}
        moderationPendingType={moderationPendingType}
        moderationTracker={selectedModerationTracker}
        moderationTrackers={premiumModerationState.trackers}
        onModerationDetail={handleModerationDetailOpen}
        onModerationToleranceChange={handleModerationTolerance}
        onToggleModerationEnabled={handleModerationEnabled}
        onToggleModerationPause={handleModerationPause}
        onManualRhythmChange={handleManualRhythmChange}
        onClose={handleCloseActiveOverlay}
        onGoDashboard={goToDashboard}
        onOpen={(overlay) => setActiveOverlay(overlay)}
        onOpenUserProfile={() => clerk.openUserProfile()}
        onSignOut={() => {
          void signOut({ redirectUrl: '/login2' });
        }}
        onReminderSaved={async () => {
          if (effectiveBackendUserId) {
            await onboardingProgressRequest.reload();
          } else {
            setLocalOnboardingSnapshot(markLocalOnboardingStep('daily_quest_scheduled'));
          }
          navigate(`${labBase}/dashboard`, { replace: true });
        }}
        onReviewProgress={handleReviewDailyProgress}
        onShowFeedbackEvent={handleShowFeedbackEvent}
        onThemeToggle={toggleTheme}
        onUpgradeRhythmConfirm={handleRhythmSuggestionConfirm}
        rhythmSuggestion={overlayRhythmSuggestion}
        rhythmSuggestionSubmitting={rhythmSuggestionSubmitting}
        theme={theme}
        userEmail={userEmail}
        userImageUrl={runtimeUser.user?.imageUrl ?? null}
        userName={userName}
      />
      {weeklyWrapped.isModalOpen && weeklyWrapped.activeRecord && !activeOverlay ? (
        <PremiumWeeklyWrappedStory
          onClose={handleWeeklyWrappedClose}
          radarTraits={weeklyWrappedRadarRequest.data?.traits ?? []}
          weekly={weeklyWrapped.activeRecord}
        />
      ) : null}
    </MobilePremiumShell>
  );
}

function resolveLabRoute(pathname: string, basePath = LAB_BASE): LabRoute | null {
  const labBase = normalizeMobilePremiumBasePath(basePath);
  if (pathname === labBase || pathname === `${labBase}/`) {
    return 'dashboard';
  }

  const segment = pathname.replace(`${labBase}/`, '').split('/')[0];
  return LAB_ROUTES.some((item) => item.path === segment) ? (segment as LabRoute) : null;
}

function resolveRouteLabel(route: LabRoute, t: (key: string) => string): string {
  switch (route) {
    case 'dashboard':
      return t('mobilePremium.route.dashboard');
    case 'tareas':
      return t('mobilePremium.route.tasks');
    case 'dquest':
      return t('mobilePremium.route.dquest');
    case 'logros':
      return t('mobilePremium.route.rewards');
    case 'task-detail':
      return t('mobilePremium.route.taskDetail');
    case 'emotion-chart':
      return t('mobilePremium.route.emotionChart');
    case 'balance':
      return t('mobilePremium.route.balance');
    case 'vision-general':
      return t('mobilePremium.route.vision');
    case 'onboarding-banners':
      return t('mobilePremium.route.onboardingBanners');
    default:
      return ROUTE_LABELS[route];
  }
}

function buildNavItems(
  activeRoute: LabRoute,
  onboardingCues: { dquest: boolean; tareas: boolean },
  basePath = LAB_BASE,
  t: (key: string) => string = (key) => key,
): PremiumNavItem[] {
  const labBase = normalizeMobilePremiumBasePath(basePath);
  const dashboardActiveRoutes: LabRoute[] = ['dashboard', 'emotion-chart', 'balance', 'vision-general'];
  const tasksActiveRoutes: LabRoute[] = ['tareas', 'task-detail'];
  return NAV_ROUTES.map((route) => {
    const item = LAB_ROUTES.find((candidate) => candidate.path === route)!;
    return {
      to: `${labBase}/${item.path}`,
      label: resolveRouteLabel(route, t),
      icon: <PremiumNavIcon route={route} />,
      end: item.path === 'dashboard',
      onboardingCue: item.path === 'dquest' ? onboardingCues.dquest : item.path === 'tareas' ? onboardingCues.tareas : false,
      active:
        item.path === 'dashboard'
          ? dashboardActiveRoutes.includes(activeRoute)
          : item.path === 'tareas'
            ? tasksActiveRoutes.includes(activeRoute)
            : activeRoute === item.path,
    };
  });
}

function PremiumNavIcon({ route }: { route: LabRoute }) {
  const common = { className: 'h-[22px] w-[22px]', fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.55, viewBox: '0 0 24 24' };
  if (route === 'dquest') {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m14.7 9.3-2 5.1-5.1 2 2-5.1 5.1-2Z" />
      </svg>
    );
  }
  if (route === 'dashboard') {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="8" cy="8" r="3.1" />
        <circle cx="16" cy="8" r="3.1" />
        <circle cx="8" cy="16" r="3.1" />
        <circle cx="16" cy="16" r="3.1" />
      </svg>
    );
  }
  if (route === 'tareas') {
    return (
      <svg aria-hidden="true" {...common}>
        <circle cx="5.5" cy="6.5" r="1.3" />
        <circle cx="5.5" cy="12" r="1.3" />
        <circle cx="5.5" cy="17.5" r="1.3" />
        <path d="M9 6.5h10M9 12h10M9 17.5h10" />
      </svg>
    );
  }
  if (route === 'logros') {
    return (
      <svg aria-hidden="true" {...common}>
        <path d="M8 4.5h8v5.3a4 4 0 0 1-8 0V4.5Z" />
        <path d="M8 6H5v2.5a3 3 0 0 0 3.1 3M16 6h3v2.5a3 3 0 0 1-3.1 3M12 13.8v3.1M9 20h6M9.5 16.9h5" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" {...common}>
      <path d="m5 19 1.2-4.3L16.9 4a2 2 0 0 1 2.8 2.8L9 17.5 5 19Z" />
      <path d="m14.8 6.1 3 3M6.2 14.7l2.9 2.9" />
    </svg>
  );
}

function DashboardPanel({
  tasks,
  userName,
}: {
  tasks: Array<{ title: string; xp: number | null; traitId?: string | null; statId?: string | null }>;
  userName: string;
}) {
  const labBase = useMobilePremiumBasePath();
  return (
    <>
      <section className="space-y-5">
        <div className="relative min-h-[260px] overflow-hidden border-b border-[color:var(--mp-border)] pb-7">
          <div className="absolute right-[-42px] top-[-8px] h-56 w-56 rounded-full border border-violet-300/12">
            <div className="absolute inset-12 rounded-full border border-violet-300/18" />
            <div className="absolute bottom-10 right-10 h-10 w-10 rounded-full bg-violet-300/35 shadow-[0_0_34px_rgba(167,139,250,0.8)]" />
          </div>
          <div className="relative max-w-[17.5rem]">
            <p className="text-[color:var(--mp-text-secondary)]">Retrospectiva de ayer</p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--mp-text-secondary)]">
              Registra tu emoción predominante y marca las tareas que completaste.
            </p>
            <a
              className="mt-7 inline-flex min-h-12 items-center gap-5 rounded-full bg-violet-500 px-7 text-base font-semibold text-white shadow-[0_14px_34px_rgba(124,58,237,0.34)]"
              href={`${labBase}/dquest`}
            >
              Comenzar
              <span aria-hidden="true" className="text-xl">›</span>
            </a>
          </div>
        </div>

        <div>
          <p className="text-sm text-[color:var(--mp-text-secondary)]">GP 6.248 · Nivel 24 · 318 GP para el próximo nivel</p>
          <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[55%] rounded-full bg-[color:var(--mp-violet)] shadow-[0_0_18px_rgba(167,139,250,0.72)]" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <MobileSectionHeader action="Ver" title="Visión general" to={`${labBase}/vision-general`} />
        <div className="space-y-0">
          <OverviewRow accent="green" label="Mejor racha actual" title={tasks[0]?.title ?? 'Dormir 8hs'} value="12d" />
          <OverviewRow accent="red" label="Necesita atención" title={tasks[1]?.title ?? 'No dulces'} value="0/12 mes" />
          <OverviewRow accent="amber" label="Cerca del hábito" title={tasks[2]?.title ?? 'Tomar agua'} value="2/3" withDots />
        </div>
      </section>

      <div className="grid grid-cols-2 border-y border-[color:var(--mp-border)]">
        <MiniInsight
          href={`${labBase}/emotion-chart`}
          label="15 días"
          title="Calma"
          heading="Emoción predominante"
          visual={<EmotionDots />}
        />
        <MiniInsight
          href={`${labBase}/balance`}
          label="Predominio Alma"
          title="76"
          heading="Equilibrio"
          visual={<WeeklyProgressRingCompact label="Alma" value={76} />}
        />
      </div>

      <section className="space-y-4">
        <MobileSectionHeader title="Energía diaria" />
        <div className="grid grid-cols-3 gap-6">
          <EnergyMetric label="HP" tone="green" value="5.1%" />
          <EnergyMetric label="Mood" tone="amber" value="16%" />
          <EnergyMetric label="Focus" tone="red" value="-21.8%" />
        </div>
      </section>

      <ThinSeparator />
      <a className="flex items-center justify-between gap-4 py-1 text-[color:var(--mp-text-secondary)]" href={`${labBase}/logros`}>
        <span className="flex items-center gap-4">
          <TraitIcon className="text-[color:var(--mp-text-muted)]" trait="creativity" />
          Pendientes en Logros: 2
        </span>
        <span aria-hidden="true">›</span>
      </a>
      <p className="sr-only">Hola, {userName.split('@')[0]}</p>
    </>
  );
}

function OverviewRow({
  accent,
  label,
  title,
  value,
  withDots = false,
}: {
  accent: 'green' | 'amber' | 'red';
  label: string;
  title: string;
  value: string;
  withDots?: boolean;
}) {
  const trait = accent === 'green' ? 'sleep' : accent === 'amber' ? 'hydration' : 'energy';
  return (
    <div className="grid grid-cols-[44px_1fr_auto] items-center gap-4 border-b border-[color:var(--mp-border)] py-4 last:border-b-0">
      <TraitIcon className={`text-[color:var(--mp-${accent})]`} trait={trait} />
      <div className="min-w-0">
        <p className="text-sm text-[color:var(--mp-text-secondary)]">{label}</p>
        <p className="truncate text-[1.08rem] text-[color:var(--mp-text)]">{title}</p>
      </div>
      <div className={`text-right text-lg ${accent === 'red' ? 'text-[color:var(--mp-red)]' : 'text-[color:var(--mp-text)]'}`}>
        <span>{value}</span>
        {withDots ? (
          <span className="ml-4 inline-flex gap-3 align-middle">
            <i className="h-3.5 w-3.5 rounded-full bg-[color:var(--mp-green)]" />
            <i className="h-3.5 w-3.5 rounded-full bg-[color:var(--mp-green)]" />
            <i className="h-3.5 w-3.5 rounded-full bg-[color:var(--mp-amber)]" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

function MiniInsight({
  heading,
  label,
  title,
  visual,
  href,
}: {
  heading: string;
  label: string;
  title: string;
  visual: React.ReactNode;
  href: string;
}) {
  return (
    <a className="min-h-56 border-r border-[color:var(--mp-border)] py-5 pr-4 last:border-r-0 last:pl-4 last:pr-0" href={href}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base text-[color:var(--mp-text)]">{heading}</p>
          <p className="mt-2 text-sm text-[color:var(--mp-text-secondary)]">{label}</p>
        </div>
        <span className="text-xl text-[color:var(--mp-text-secondary)]">›</span>
      </div>
      <p className="mt-5 text-3xl font-light text-[color:var(--mp-text)]">{title}</p>
      <div className="mt-5">{visual}</div>
    </a>
  );
}

function EmotionDots() {
  const colors = ['#6ee76d', '#f7ca45', '#f7ca45', '#ff5b61', '#a855f7', '#8b5cf6', '#74a4ff', '#a89087'];
  return (
    <div className="flex items-center gap-5">
      <div className="h-20 w-20 rounded-full bg-emerald-400/35 shadow-[inset_0_0_18px_rgba(255,255,255,0.12),0_0_30px_rgba(110,231,109,0.7)] ring-2 ring-emerald-300" />
      <div className="grid grid-cols-4 gap-3">
        {[...colors, ...colors].map((color, index) => (
          <span className="h-3.5 w-3.5 rounded-full" key={`${color}-${index}`} style={{ backgroundColor: color }} />
        ))}
      </div>
    </div>
  );
}

function EnergyMetric({ label, value, tone }: { label: string; value: string; tone: 'green' | 'amber' | 'red' }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-[color:var(--mp-text-secondary)]">{label}</p>
        <p className={`text-sm text-[color:var(--mp-${tone})]`}>{value}</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white/12">
        <div className={`h-full w-1/4 rounded-full bg-[color:var(--mp-${tone})]`} />
      </div>
    </div>
  );
}

function normalizePremiumTaskRows(
  groups: Array<{ pillar: StreakPanelPillar; response: { tasks: StreakPanelTask[] } }>,
  weeklyGoal: number,
): PremiumTaskRow[] {
  const byId = new Map<string, PremiumTaskRow>();
  groups.forEach(({ pillar, response }) => {
    response.tasks.forEach((task) => {
      if (byId.has(task.id)) return;
      byId.set(task.id, {
        id: task.id,
        name: task.name,
        stat: task.stat,
        pillar,
        difficultyLabel: task.difficultyLabel ?? null,
        weeklyDone: task.weekDone,
        weeklyGoal,
        streakDays: task.streakDays,
        monthWeeks: task.metrics.month?.weeks ?? [],
        monthlyCount: task.metrics.month?.count,
        monthlyXp: task.metrics.month?.xp,
        quarterlyCount: task.metrics.qtr?.count,
        latestRecalibrationAction: (task.latestRecalibrationAction ?? task.recalibration?.latest?.action ?? null) as PremiumTaskRow['latestRecalibrationAction'],
        achievementSealVisible: task.achievementSealVisible,
        lifecycleStatus: task.lifecycleStatus ?? null,
      });
    });
  });
  return Array.from(byId.values());
}

function resolveDifficultyTone(difficulty: string | null): string {
  const normalized = (difficulty ?? '').toLowerCase();
  if (normalized.includes('fácil') || normalized.includes('facil') || normalized.includes('easy')) {
    return 'bg-emerald-400/12 text-[color:var(--mp-green)]';
  }
  if (normalized.includes('dif') || normalized.includes('hard')) {
    return 'bg-red-400/12 text-[color:var(--mp-red)]';
  }
  return 'bg-amber-300/12 text-[color:var(--mp-amber)]';
}

function DQuestPanel({ hasSession }: { hasSession: boolean }) {
  const [selectedEmotion, setSelectedEmotion] = useState<number | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [snoozed, setSnoozed] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');

  const statusRequest = useRequest(() => getDailyQuestStatus(), [hasSession], { enabled: hasSession });
  const definitionRequest = useRequest(
    () => getDailyQuestDefinition({ date: statusRequest.data?.date }),
    [hasSession, statusRequest.data?.date],
    { enabled: Boolean(hasSession && statusRequest.data?.date) },
  );
  const moderationRequest = useRequest(() => getModerationState(), [hasSession], { enabled: hasSession });

  const definition = definitionRequest.data ?? FALLBACK_DQUEST_DEFINITION;
  const isFallback = !hasSession || definitionRequest.status === 'error';
  const activeModeration =
    moderationRequest.data?.trackers.find((tracker) => tracker.is_enabled && !tracker.is_paused) ??
    (isFallback ? FALLBACK_DQUEST_MODERATION : null);
  const selectedTaskSet = useMemo(() => new Set(selectedTasks), [selectedTasks]);
  const gpTotal = useMemo(() => {
    return definition.pillars.reduce((total, pillar) => {
      return total + pillar.tasks.reduce((pillarTotal, task) => {
        return pillarTotal + (selectedTaskSet.has(task.task_id) ? task.xp ?? 0 : 0);
      }, 0);
    }, 0);
  }, [definition, selectedTaskSet]);

  useEffect(() => {
    const calmOption = definition.emotionOptions.find((option) => normalizeDQuestEmotion(option).key === 'calm');
    setSelectedEmotion(isFallback ? calmOption?.emotion_id ?? definition.emotionOptions[0]?.emotion_id ?? null : null);
    setSelectedTasks(isFallback ? Array.from(FALLBACK_DQUEST_COMPLETED_TASKS) : []);
    setSnoozed(false);
    setSubmitState('idle');
  }, [definition.date, isFallback]);

  const toggleTask = (taskId: string) => {
    setSelectedTasks((current) =>
      current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId],
    );
  };

  const handleConfirm = async () => {
    if (selectedEmotion == null || submitState === 'submitting') return;

    if (isFallback) {
      setSubmitState('submitted');
      return;
    }

    setSubmitState('submitting');
    try {
      await submitDailyQuest({
        date: definition.date,
        emotion_id: selectedEmotion,
        tasks_done: selectedTasks,
        notes: null,
      });
      setSubmitState('submitted');
      statusRequest.reload();
      definitionRequest.reload();
    } catch (error) {
      console.error('Failed to submit Labs DQuest', error);
      setSubmitState('error');
    }
  };

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <p className="text-[1.55rem] leading-tight text-[color:var(--mp-text)]">Retrospectiva de ayer</p>
        <p className="max-w-[20rem] text-base leading-7 text-[color:var(--mp-text-secondary)]">
          Elegí la emoción predominante y marcá las tareas que completaste.
        </p>
      </div>

      <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Emoción predominante">
        {definition.emotionOptions.map((option) => {
          const emotion = normalizeDQuestEmotion(option);
          const selected = selectedEmotion === option.emotion_id;
          return (
            <button
              aria-pressed={selected}
              className={`inline-flex min-h-11 items-center gap-3 rounded-full border px-4 text-sm font-medium transition ${
                selected
                  ? 'border-[color:var(--emotion-color)] bg-[color:var(--emotion-soft)] text-[color:var(--mp-text)]'
                  : 'border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-[color:var(--mp-text-secondary)]'
              }`}
              key={option.emotion_id}
              onClick={() => setSelectedEmotion(option.emotion_id)}
              style={{
                '--emotion-color': emotion.color,
                '--emotion-soft': emotion.soft,
              } as CSSProperties}
              type="button"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: emotion.color }} />
              {option.name}
            </button>
          );
        })}
      </div>

      {activeModeration ? <DQuestModerationRow tracker={activeModeration} /> : null}

      <div className="space-y-4">
        {definition.pillars.map((pillar) => (
          <section className="space-y-2" key={pillar.pillar_code}>
            <h2 className="text-[1.35rem] font-semibold text-[color:var(--mp-text)]">
              {resolveDQuestPillarLabel(pillar.pillar_code)}
            </h2>
            <div>
              {pillar.tasks.map((task) => (
                <DQuestTaskRow
                  key={task.task_id}
                  onToggle={() => toggleTask(task.task_id)}
                  selected={selectedTaskSet.has(task.task_id)}
                  task={task}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="space-y-6 border-t border-[color:var(--mp-border)] pt-5">
        <div className="flex items-center gap-2 text-base text-[color:var(--mp-text)]">
          <span>GP total:</span>
          <span className="font-semibold text-[color:var(--mp-violet)]">{gpTotal} GP</span>
        </div>
        <div className="flex items-center justify-end gap-3">
          <button
            className="min-h-12 rounded-full px-7 text-sm font-semibold text-[color:var(--mp-violet)]"
            onClick={() => setSnoozed(true)}
            type="button"
          >
            Más tarde
          </button>
          <button
            className="min-h-12 rounded-full bg-violet-500 px-8 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(124,58,237,0.26)] disabled:opacity-45"
            disabled={selectedEmotion == null || submitState === 'submitting'}
            onClick={handleConfirm}
            type="button"
          >
            {submitState === 'submitting' ? 'Confirmando' : 'Confirmar'}
          </button>
        </div>
        {snoozed ? <p className="text-sm text-[color:var(--mp-text-muted)]">Más tarde queda pendiente para esta retrospectiva.</p> : null}
        {submitState === 'submitted' ? <p className="text-sm text-[color:var(--mp-green)]">DQuest confirmada.</p> : null}
        {submitState === 'error' ? <p className="text-sm text-[color:var(--mp-red)]">No se pudo confirmar. Probá nuevamente.</p> : null}
      </footer>
    </section>
  );
}

function DQuestModerationRow({ tracker }: { tracker: ModerationTracker }) {
  const meta = moderationTrackerMeta[tracker.type];
  const days = `${tracker.current_streak_days}D`;
  return (
    <section className="space-y-4">
      <h2 className="text-[1.35rem] font-semibold text-[color:var(--mp-text)]">Moderación</h2>
      <button
        className="flex w-full items-center gap-4 border-b border-[color:var(--mp-border)] pb-5 text-left"
        type="button"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-[color:var(--mp-violet)]">
          {ModerationTrackerIcon({ type: tracker.type, className: 'h-5 w-5' })}
        </span>
        <span className="min-w-0 flex-1 text-base text-[color:var(--mp-text-secondary)]">
          {meta.label}
          <span className="px-2 text-[color:var(--mp-text-muted)]">·</span>
          <span className="text-xl font-semibold text-[color:var(--mp-text)]">{days}</span>
        </span>
        <span className="text-3xl font-light text-[color:var(--mp-text-secondary)]">›</span>
      </button>
    </section>
  );
}

function DQuestTaskRow({
  task,
  selected,
  onToggle,
}: {
  task: DailyQuestTaskDefinition;
  selected: boolean;
  onToggle: () => void;
}) {
  const difficulty = resolveDQuestDifficulty(task.difficulty);
  return (
    <button
      className="grid w-full grid-cols-[42px_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-[color:var(--mp-border)] py-4 text-left last:border-b-0"
      onClick={onToggle}
      type="button"
    >
      <span
        aria-hidden="true"
        className={`grid h-8 w-8 place-items-center rounded-full border ${
          selected
            ? 'border-violet-300 bg-violet-500 text-white'
            : 'border-[color:var(--mp-border-strong)] bg-transparent text-transparent'
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 16 16">
          <path d="m3.3 8.2 3 3 6.4-6.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </span>
      <span className="min-w-0 truncate text-[1.08rem] text-[color:var(--mp-text)]">{task.name}</span>
      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${difficulty.className}`}>{difficulty.label}</span>
      <span className="rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] px-3 py-1 text-xs font-semibold text-[color:var(--mp-text-secondary)]">
        {task.xp ?? 0} GP
      </span>
    </button>
  );
}

function normalizeDQuestEmotion(option: DailyQuestEmotionOption) {
  const key = (option.code || option.name).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (key.includes('happy') || key.includes('felic')) return { key: 'happy', color: '#F6C945', soft: 'rgba(246,201,69,0.12)' };
  if (key.includes('motivation') || key.includes('motiv')) return { key: 'motivation', color: '#8F7BFF', soft: 'rgba(143,123,255,0.14)' };
  if (key.includes('sad') || key.includes('triste')) return { key: 'sad', color: '#5D82F4', soft: 'rgba(93,130,244,0.12)' };
  if (key.includes('anxiety') || key.includes('ansiedad')) return { key: 'anxiety', color: '#F05252', soft: 'rgba(240,82,82,0.12)' };
  if (key.includes('frustration') || key.includes('frustr')) return { key: 'frustration', color: '#E58A45', soft: 'rgba(229,138,69,0.12)' };
  if (key.includes('tired') || key.includes('cans')) return { key: 'tired', color: '#63C7C9', soft: 'rgba(99,199,201,0.12)' };
  return { key: 'calm', color: '#64E86E', soft: 'rgba(100,232,110,0.12)' };
}

function resolveDQuestPillarLabel(value: string) {
  const normalized = value.toUpperCase() as DQuestPillarCode;
  if (normalized === 'MIND') return 'Mente';
  if (normalized === 'SOUL') return 'Alma';
  return 'Cuerpo';
}

function resolveDQuestDifficulty(difficulty: string | null) {
  const normalized = (difficulty ?? '').toLowerCase();
  if (normalized.includes('easy') || normalized.includes('fácil') || normalized.includes('facil')) {
    return { label: 'Fácil', className: 'bg-emerald-400/12 text-[color:var(--mp-green)]' };
  }
  if (normalized.includes('hard') || normalized.includes('dif')) {
    return { label: 'Difícil', className: 'bg-red-400/12 text-[color:var(--mp-red)]' };
  }
  return { label: 'Media', className: 'bg-amber-300/12 text-[color:var(--mp-amber)]' };
}

function AchievementsPanel({ backendUserId }: { backendUserId: string | null }) {
  const [activePillar, setActivePillar] = useState<RewardsPillarCode>('BODY');
  const [activeIndex, setActiveIndex] = useState(1);
  const [flippedHabitId, setFlippedHabitId] = useState<string | null>(null);
  const { data } = useRequest(
    () => getRewardsHistory(backendUserId ?? ''),
    [backendUserId],
    { enabled: Boolean(backendUserId) },
  );
  const rewards = data ?? FALLBACK_REWARDS_HISTORY;
  const groups = normalizeRewardGroups(rewards.habitAchievements.achievedByPillar);
  const activeGroup = groups.find((group) => group.pillar.code === activePillar) ?? groups[0];
  const habits = activeGroup?.habits ?? [];
  const growth = rewards.growthCalibration;
  const weekly = rewards.weeklyWrapups[0] ?? FALLBACK_REWARDS_HISTORY.weeklyWrapups[0];
  const monthly = rewards.monthlyWrapups[0] ?? FALLBACK_REWARDS_HISTORY.monthlyWrapups[0];

  useEffect(() => {
    setActiveIndex(Math.min(1, Math.max(0, habits.length - 1)));
    setFlippedHabitId(null);
  }, [activePillar, habits.length]);

  return (
    <section className="space-y-7">
      <div className="grid grid-cols-3 rounded-[1.35rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-1">
        {groups.map((group) => {
          const code = group.pillar.code as RewardsPillarCode;
          const selected = activePillar === code;
          return (
            <button
              className={`min-h-12 rounded-[1.05rem] text-sm font-semibold transition ${
                selected
                  ? 'bg-violet-500/22 text-[color:var(--mp-text)] shadow-[inset_0_0_0_1px_rgba(167,139,250,0.28)]'
                  : 'text-[color:var(--mp-text-secondary)]'
              }`}
              key={code}
              onClick={() => setActivePillar(code)}
              type="button"
            >
              {resolveRewardsPillarLabel(code)}
            </button>
          );
        })}
      </div>

      <section className="space-y-4">
        <h2 className="text-[1.35rem] font-semibold text-[color:var(--mp-text)]">Hábitos logrados</h2>
        <div className="-mx-5 overflow-hidden px-5">
          <div className="flex items-stretch justify-center gap-4">
            {habits.slice(0, 3).map((habit, index) => {
              const realIndex = index;
              const isActive = realIndex === activeIndex;
              return (
                <AchievementSealCard
                  habit={habit}
                  isActive={isActive}
                  isFlipped={flippedHabitId === habit.id}
                  key={habit.id}
                  onClick={() => {
                    if (realIndex !== activeIndex) {
                      setActiveIndex(realIndex);
                      setFlippedHabitId(null);
                      return;
                    }
                    if (isHabitAchieved(habit)) {
                      setFlippedHabitId((current) => (current === habit.id ? null : habit.id));
                    }
                  }}
                />
              );
            })}
          </div>
          <div className="mt-4 flex justify-center gap-2">
            {habits.slice(0, 3).map((habit, index) => (
              <span
                className={`h-2.5 w-2.5 rounded-full ${index === activeIndex ? 'bg-[color:var(--mp-violet)]' : 'bg-white/18'}`}
                key={`${habit.id}-dot`}
              />
            ))}
          </div>
        </div>
      </section>

      <button className="flex w-full items-center gap-4 border-y border-[color:var(--mp-border)] py-4 text-left" type="button">
        <span className="text-[color:var(--mp-violet)]">
          <TraitIcon size={22} trait="logros" />
        </span>
        <span className="flex-1 text-base text-[color:var(--mp-text)]">Pendientes de revisar: {rewards.habitAchievements.pendingCount}</span>
        <span className="text-3xl font-light text-[color:var(--mp-text-secondary)]">›</span>
      </button>

      <GrowthCalibrationPremium growth={growth} />
      <WeeklyWrappedPremium weekly={weekly} />
      <MonthlyWrappedPremium monthly={monthly} />
    </section>
  );
}

function AchievementSealCard({
  habit,
  isActive,
  isFlipped,
  onClick,
}: {
  habit: HabitAchievementShelfItem;
  isActive: boolean;
  isFlipped: boolean;
  onClick: () => void;
}) {
  const achieved = isHabitAchieved(habit);
  const sizeClass = isActive ? 'w-[13rem] min-h-[17.75rem]' : 'w-[8rem] min-h-[15.25rem]';
  return (
    <button
      aria-pressed={isFlipped}
      className={`relative shrink-0 rounded-[1.55rem] border p-4 text-center transition ${
        sizeClass
      } ${
        achieved
          ? isActive
            ? 'border-violet-300/65 bg-[color:var(--mp-surface)] shadow-[0_0_0_1px_rgba(167,139,250,0.18)]'
            : 'border-[color:var(--mp-border)] bg-[color:var(--mp-surface)]'
          : 'border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] opacity-70 grayscale'
      }`}
      onClick={onClick}
      type="button"
    >
      {isFlipped && achieved ? (
        <div className="flex h-full flex-col justify-center text-left">
          <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--mp-amber)]">Logro desbloqueado</p>
          <h3 className="mt-7 text-center text-2xl font-semibold text-[color:var(--mp-text)]">{habit.taskName}</h3>
          <p className="mt-2 text-center text-lg text-[color:var(--mp-text-secondary)]">{habit.trait?.name ?? 'Rasgo'}</p>
          <div className="mt-8 space-y-4 border-y border-[color:var(--mp-border)] py-5 text-base">
            <div className="flex justify-between gap-4">
              <span className="text-[color:var(--mp-text-secondary)]">Logrado</span>
              <span className="font-semibold text-[color:var(--mp-text)]">{formatCompactDate(habit.achievedAt)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[color:var(--mp-text-secondary)]">GP antes</span>
              <span className="font-semibold text-[color:var(--mp-text)]">{habit.gpBeforeAchievement} GP</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[color:var(--mp-text-secondary)]">GP mantenido</span>
              <span className="font-semibold text-[color:var(--mp-text)]">{habit.gpSinceMaintain} GP</span>
            </div>
          </div>
          <p className="mt-auto text-xs text-[color:var(--mp-text-muted)]">Toca otra vez para volver al frente</p>
        </div>
      ) : (
        <>
          <HabitAchievementSeal
            alt={`${habit.taskName} seal`}
            disabled={!achieved}
            fallback={<TraitIcon size={isActive ? 92 : 66} trait={habit.trait?.name} />}
            imgClassName="h-full w-full object-contain"
            className={`mx-auto grid place-items-center ${isActive ? 'h-28 w-28' : 'h-20 w-20'}`}
            pillar={habit.pillar}
            traitCode={habit.trait?.code}
            traitName={habit.trait?.name}
          />
          <h3 className={`${isActive ? 'mt-3 text-xl' : 'mt-2 text-sm'} font-semibold leading-tight text-[color:var(--mp-text)]`}>
            {habit.taskName}
          </h3>
          <p className="mt-1 text-sm text-[color:var(--mp-text-secondary)]">{habit.trait?.name ?? 'Rasgo'}</p>
          <p className={`mt-2 text-xs font-semibold ${achieved ? 'text-[color:var(--mp-violet)]' : 'text-[color:var(--mp-text-muted)]'}`}>
            {achieved ? 'Hábito logrado' : 'Hábito por lograr'}
          </p>
          {achieved ? (
            <span className="mt-3 inline-flex rounded-full border border-[color:var(--mp-border)] px-4 py-2 text-xs font-semibold text-[color:var(--mp-text)]">
              Compartir
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}

function GrowthCalibrationPremium({ growth }: { growth: RewardsHistorySummary['growthCalibration'] }) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--mp-text)]">Resultados de calibración</h2>
          <p className="mt-1 text-sm text-[color:var(--mp-text-secondary)]">Últimos ajustes automáticos de dificultad</p>
        </div>
        <p className="whitespace-nowrap text-sm text-[color:var(--mp-text-secondary)]">
          Próxima: <span className="font-semibold text-[color:var(--mp-violet)]">{growth.countdownDays}d</span>
        </p>
      </div>
      <div className="grid grid-cols-3 rounded-[0.9rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] py-3 text-center">
        <CalibrationStat label="Subió dificultad" tone="red" value={`↑ ${growth.summary.up}`} />
        <CalibrationStat label="Se mantuvo" tone="amber" value={`• ${growth.summary.keep}`} />
        <CalibrationStat label="Bajó dificultad" tone="green" value={`↓ ${growth.summary.down}`} />
      </div>
    </section>
  );
}

function CalibrationStat({ value, label, tone }: { value: string; label: string; tone: 'red' | 'amber' | 'green' }) {
  return (
    <div className="border-r border-[color:var(--mp-border)] px-2 last:border-r-0">
      <p className={`text-2xl font-semibold text-[color:var(--mp-${tone})]`}>{value}</p>
      <p className={`mt-1 text-xs text-[color:var(--mp-${tone})]`}>{label}</p>
    </div>
  );
}

function WeeklyWrappedPremium({ weekly }: { weekly: WeeklyWrappedRecord }) {
  const days = enumerateDateRange(weekly.weekStart, weekly.weekEnd).slice(0, 7);
  const completed = new Set(weekly.completionDays ?? []);
  const emotion = weekly.payload.emotions?.weekly ?? weekly.payload.emotions?.biweekly;
  const dominantPillar = weekly.payload.summary?.pillarDominant;
  return (
    <section className="rounded-[0.9rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--mp-text)]">Weekly Wrapped</h2>
          <p className="text-sm text-[color:var(--mp-text-secondary)]">{formatDateShort(weekly.weekStart)} → {formatDateShort(weekly.weekEnd)}</p>
        </div>
        <p className="text-sm font-semibold text-[color:var(--mp-violet)]">{completed.size}/7 días</p>
      </div>
      <div className="mt-4 grid grid-cols-[1fr_82px_96px] items-center gap-3">
        <div className="flex justify-between">
          {days.map((day) => (
            <span className={`h-4 w-4 rounded-full ${completed.has(day) ? 'bg-[color:var(--mp-green)]' : 'bg-white/14'}`} key={day} />
          ))}
        </div>
        <div className="border-l border-[color:var(--mp-border)] pl-3 text-center text-xs text-[color:var(--mp-text-secondary)]">
          <span className="mx-auto mb-1 block h-3 w-3 rounded-full" style={{ backgroundColor: emotion?.color ?? 'var(--mp-violet)' }} />
          {emotion?.label ?? 'Calma'}
        </div>
        <div className="border-l border-[color:var(--mp-border)] pl-3 text-center text-xs text-[color:var(--mp-text-secondary)]">
          <TraitIcon size={24} trait={dominantPillar ?? 'body'} />
          <span className="mt-1 block">Pilar dominante</span>
        </div>
      </div>
    </section>
  );
}

function MonthlyWrappedPremium({ monthly }: { monthly: MonthlyWrappedRecord }) {
  const states = resolveMonthlyWeekStates(monthly);
  return (
    <section className="rounded-[0.9rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-4">
      <div className="grid grid-cols-[1fr_auto] items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--mp-text)]">Monthly Wrapped</h2>
          <p className="text-sm text-[color:var(--mp-text-secondary)]">{monthly.periodKey}</p>
          <p className="mt-1 text-sm text-[color:var(--mp-text-secondary)]">Resumen mensual más reciente</p>
        </div>
        <div className="flex items-center gap-3">
          {states.map((state, index) => (
            <span className="text-center text-xs text-[color:var(--mp-text-secondary)]" key={`month-week-${index}`}>
              <span className={`mx-auto mb-1 block h-4 w-4 rounded-full ${
                state === 'done' ? 'bg-[color:var(--mp-green)]' : state === 'partial' ? 'bg-[color:var(--mp-amber)]' : 'bg-white/14'
              }`} />
              S{index + 1}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function normalizeRewardGroups(groups: HabitAchievementPillarGroup[]): HabitAchievementPillarGroup[] {
  const byCode = new Map(groups.map((group) => [group.pillar.code.toUpperCase(), group]));
  return (['BODY', 'MIND', 'SOUL'] as RewardsPillarCode[]).map((code) => {
    const existing = byCode.get(code);
    return {
      pillar: existing?.pillar ?? { id: code.toLowerCase(), code, name: resolveRewardsPillarLabel(code) },
      habits: existing?.habits ?? [],
    };
  });
}

function resolveRewardsPillarLabel(code: RewardsPillarCode) {
  if (code === 'MIND') return 'Mente';
  if (code === 'SOUL') return 'Alma';
  return 'Cuerpo';
}

function isHabitAchieved(habit: HabitAchievementShelfItem) {
  return habit.status !== 'not_achieved';
}

function formatCompactDate(value: string | null) {
  if (!value) return 'Pendiente';
  return value.slice(0, 10);
}

function formatDateShort(value: string, language: 'es' | 'en' = 'es') {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(language, { day: 'numeric', month: 'short' }).format(date).replace('.', '');
}

function enumerateDateRange(start: string, end: string) {
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return [];
  const days: string[] = [];
  for (const cursor = new Date(from); cursor <= to; cursor.setDate(cursor.getDate() + 1)) {
    days.push(cursor.toISOString().slice(0, 10));
  }
  return days;
}

function resolveMonthlyWeekStates(monthly: MonthlyWrappedRecord): Array<'done' | 'partial' | 'empty'> {
  const summaryWeeks = (monthly.summary as { weeks?: unknown } | null)?.weeks;
  if (Array.isArray(summaryWeeks)) {
    return Array.from({ length: 5 }, (_, index) => {
      const value = summaryWeeks[index];
      return value === 'done' || value === 'partial' ? value : 'empty';
    });
  }

  const completed = monthly.completionDays ?? [];
  return Array.from({ length: 5 }, (_, index) => {
    const weekNumber = index + 1;
    const count = completed.filter((day) => {
      const dayNumber = Number(day.slice(8, 10));
      return Math.ceil(dayNumber / 7) === weekNumber;
    }).length;
    if (count >= 5) return 'done';
    if (count > 0) return 'partial';
    return 'empty';
  });
}

function TaskDetailPanel({
  backendUserId,
  gameMode,
  weeklyTarget,
}: {
  backendUserId: string | null;
  gameMode: string | null;
  weeklyTarget: number | null;
}) {
  const labBase = useMobilePremiumBasePath();
  const [scope, setScope] = useState<ActivityScope>('M');
  const weeklyGoal = Math.max(1, Math.round(weeklyTarget ?? FALLBACK_TASK_DETAIL.weeklyGoal));
  const { data } = useRequest(
    async () => {
      if (!backendUserId) return null;
      const responses = await Promise.all(
        STREAK_PILLARS.map(async (pillar) => ({
          pillar,
          response: await getUserStreakPanel(backendUserId, {
            pillar,
            range: 'month',
            mode: gameMode ?? undefined,
          }),
        })),
      );
      return responses;
    },
    [backendUserId, gameMode],
    { enabled: Boolean(backendUserId) },
  );
  const detail = useMemo(() => {
    if (!data) return FALLBACK_TASK_DETAIL;
    const rows = normalizePremiumTaskRows(data, weeklyGoal);
    const sleep = rows.find((row) => row.stat.toLowerCase().includes('sue') || row.name.toLowerCase().includes('dorm'));
    return buildPremiumTaskDetail(sleep ?? rows[0], weeklyGoal) ?? FALLBACK_TASK_DETAIL;
  }, [data, weeklyGoal]);
  const activity = detail.activityByScope[scope] ?? detail.activityByScope.M;

  return (
    <section className="space-y-7">
      <header className="space-y-5">
        <div className="grid grid-cols-[44px_1fr_44px] items-center">
          <Link
            aria-label="Volver a tareas"
            className="grid h-11 w-11 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-2xl text-[color:var(--mp-text)]"
            to={`${labBase}/tareas`}
          >
            ‹
          </Link>
          <p className="text-center text-lg font-semibold text-[color:var(--mp-text)]">Detalle de tarea</p>
          <span />
        </div>
        <div className="grid grid-cols-[64px_minmax(0,1fr)_16px] items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full border border-[color:var(--mp-border)] bg-violet-400/10 text-[color:var(--mp-violet)]">
            <TraitIcon size={30} trait={detail.stat} />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-4xl font-semibold leading-tight text-[color:var(--mp-text)]">{detail.name}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-violet-400/12 px-3 text-sm font-semibold text-[color:var(--mp-violet)]">
                <span className="h-2 w-2 rounded-full bg-[color:var(--mp-violet)]" />
                {detail.stat}
              </span>
              <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 text-sm font-semibold ${resolveDifficultyTone(detail.difficultyLabel)}`}>
                {detail.difficultyLabel ?? 'Media'}
              </span>
            </div>
          </div>
          <span className="text-3xl font-light text-[color:var(--mp-text-secondary)]">›</span>
        </div>
      </header>

      <section className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--mp-violet)]">Desarrollo del hábito</p>
        <div className="rounded-[1.25rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-5">
          <div className="grid grid-cols-[112px_1fr] items-start gap-5">
            <ScoreRing score={detail.score} />
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-400/16 text-[color:var(--mp-violet)]">
                  <TraitIcon size={19} trait="growth" />
                </span>
                <div>
                  <p className="text-lg font-semibold text-[color:var(--mp-text)]">{detail.lifecycleLabel}</p>
                  <p className="mt-1 text-sm leading-5 text-[color:var(--mp-text-secondary)]">{detail.insight}</p>
                </div>
              </div>
              <div className="mt-4 border-t border-[color:var(--mp-border)] pt-3">
                <p className="mb-3 text-sm text-[color:var(--mp-text-secondary)]">Ventana activa</p>
                <div className="grid grid-cols-4 gap-3">
                  {detail.activeWindow.map((month) => (
                    <MonthHealthDot key={month.month} month={month.month} percent={month.percent} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--mp-violet)]">Completos por semana</p>
          <div className="grid grid-cols-3 rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-0.5">
            {(['W', 'M', '3M'] as ActivityScope[]).map((item) => (
              <button
                className={`min-h-8 rounded-full px-3 text-xs font-semibold ${scope === item ? 'bg-violet-500/28 text-[color:var(--mp-text)]' : 'text-[color:var(--mp-text-secondary)]'}`}
                key={item}
                onClick={() => setScope(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-5 text-sm text-[color:var(--mp-text-secondary)]">
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[color:var(--mp-green)]" />Completos</span>
          <span className="inline-flex items-center gap-2"><span className="h-0.5 w-4 rounded-full bg-white/20" />Objetivo</span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {activity.map((value, index) => (
            <WeeklyCompletionBar completed={value} index={index} key={`${scope}-${index}`} target={detail.weeklyGoal} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--mp-violet)]">Ajustes de dificultad</p>
        <div className="rounded-[1rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)]">
          {detail.difficultyAdjustments.map((adjustment) => (
            <DifficultyAdjustmentRow adjustment={adjustment} key={`${adjustment.date}-${adjustment.label}`} />
          ))}
        </div>
      </section>

      <div className="flex justify-center">
        <button className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--mp-violet)]" type="button">
          <span className="grid h-5 w-5 place-items-center rounded-full border border-violet-300/45 text-xs">◷</span>
          Ver historial completo
        </button>
      </div>

    </section>
  );
}

function buildPremiumTaskDetail(row: PremiumTaskRow | undefined, weeklyGoal: number): PremiumTaskDetail | null {
  if (!row) return null;
  const monthWeeks = Array.from({ length: 5 }, (_, index) => row.monthWeeks[index] ?? 0);
  const score = Math.min(100, Math.max(0, Math.round((monthWeeks.reduce((sum, value) => sum + value, 0) / Math.max(weeklyGoal * monthWeeks.length, 1)) * 100)));
  return {
    ...row,
    weeklyGoal,
    score: score || FALLBACK_TASK_DETAIL.score,
    lifecycleLabel: formatLifecycleStatus(row.lifecycleStatus),
    insight: 'Estás avanzando de forma constante.',
    activeWindow: FALLBACK_TASK_DETAIL.activeWindow,
    activityByScope: {
      W: monthWeeks,
      M: monthWeeks,
      '3M': monthWeeks,
    },
    difficultyAdjustments: buildDifficultyAdjustments(row),
  };
}

function ScoreRing({ score }: { score: number }) {
  const color = getScoreTone(score).color;
  return (
    <div className="grid place-items-center">
      <div
        className="grid h-24 w-24 place-items-center rounded-full"
        style={{ background: `conic-gradient(${color} ${score}%, rgba(255,248,236,0.11) 0)` }}
      >
        <div className="grid h-[76px] w-[76px] place-items-center rounded-full bg-[color:var(--mp-bg)]">
          <div className="text-center">
            <p className="text-4xl font-semibold leading-none" style={{ color }}>{score}</p>
            <p className="mt-2 text-xs font-semibold tracking-[0.04em] text-[color:var(--mp-text-secondary)]">Score</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthHealthDot({ month, percent }: { month: string; percent: number }) {
  const tone = getScoreTone(percent);
  return (
    <div className="text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border-2 bg-transparent text-xs font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.24)]" style={{ borderColor: tone.color, color: tone.color }}>
        {percent}%
      </div>
      <p className="mt-2 text-xs text-[color:var(--mp-text-secondary)]">{month}</p>
    </div>
  );
}

function WeeklyCompletionBar({ completed, target, index }: { completed: number; target: number; index: number }) {
  const pct = Math.min(100, Math.max(0, (completed / Math.max(target, 1)) * 100));
  return (
    <div className="text-center">
      <div className="mx-auto flex h-24 w-3 items-end rounded-full bg-white/12">
        <div className="w-full rounded-full bg-[color:var(--mp-green)]" style={{ height: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-[color:var(--mp-text-secondary)]">sem {index + 1}</p>
      <p className="text-sm font-semibold text-[color:var(--mp-green)]">{completed}/{target}</p>
    </div>
  );
}

function DifficultyAdjustmentRow({
  adjustment,
}: {
  adjustment: PremiumTaskDetail['difficultyAdjustments'][number];
}) {
  const tone = adjustment.action === 'up' ? 'red' : adjustment.action === 'down' ? 'green' : 'amber';
  return (
    <div className="grid grid-cols-[52px_1fr_16px] items-center gap-3 border-b border-[color:var(--mp-border)] px-4 py-3 last:border-b-0">
      <span className={`text-sm font-semibold text-[color:var(--mp-${tone})]`}>{adjustment.date}</span>
      <span className="text-sm text-[color:var(--mp-text-secondary)]">{adjustment.label}</span>
      <span className="text-2xl font-light text-[color:var(--mp-text-secondary)]">›</span>
    </div>
  );
}

function resolveTaskDetailRecalibrationChip(detail: PremiumTaskDetail) {
  if (detail.latestRecalibrationAction === 'up') {
    return { label: '↑ Subió', className: 'bg-red-400/12 text-[color:var(--mp-red)]' };
  }
  if (detail.latestRecalibrationAction === 'down') {
    return { label: '↓ Bajó', className: 'bg-emerald-400/12 text-[color:var(--mp-green)]' };
  }
  if (detail.latestRecalibrationAction === 'keep') {
    return { label: '• Se mantuvo', className: 'bg-amber-300/12 text-[color:var(--mp-amber)]' };
  }
  return { label: detail.difficultyLabel ?? 'Media', className: resolveDifficultyTone(detail.difficultyLabel) };
}

function getScoreTone(score: number) {
  if (score < 50) return { color: 'var(--mp-red)' };
  if (score < 80) return { color: 'var(--mp-amber)' };
  return { color: 'var(--mp-green)' };
}

function formatLifecycleStatus(value: string | null | undefined) {
  if (value === 'achieved' || value === 'maintained') return 'Hábito logrado';
  if (value === 'stored') return 'Hábito guardado';
  return 'Hábito en construcción';
}

function buildDifficultyAdjustments(row: PremiumTaskRow): PremiumTaskDetail['difficultyAdjustments'] {
  const first = row.latestRecalibrationAction ?? 'keep';
  const firstLabel =
    first === 'up'
      ? `Subió de ${row.difficultyLabel ?? 'Media'} a Difícil`
      : first === 'down'
        ? 'Bajó de Difícil a Media'
        : `Se mantuvo en ${row.difficultyLabel ?? 'Media'}`;
  return [
    { date: '4 may', action: first, label: firstLabel },
    ...FALLBACK_TASK_DETAIL.difficultyAdjustments.slice(1),
  ];
}

const EMOTION_LEGEND = [
  { key: 'calm', label: 'Calma', color: '#43D977' },
  { key: 'happy', label: 'Felicidad', color: '#F6C945' },
  { key: 'motivation', label: 'Motivación', color: '#A463F2' },
  { key: 'sad', label: 'Tristeza', color: '#4F83F1' },
  { key: 'anxiety', label: 'Ansiedad', color: '#EF4444' },
  { key: 'frustration', label: 'Frustración', color: '#A58B82' },
  { key: 'tired', label: 'Cansancio', color: '#35B7AD' },
] as const;

function EmotionChartPanel({
  backendUserId,
  localSnapshot,
}: {
  backendUserId: string | null;
  localSnapshot?: LocalOnboardingSnapshot | null;
}) {
  const { language, t } = usePostLoginLanguage();
  const [activeEmotionCell, setActiveEmotionCell] = useState<{ date: string; label: string; color?: string } | null>(null);
  const heatmapScrollRef = useRef<HTMLDivElement | null>(null);
  const { data } = useRequest(
    async () => {
      if (!backendUserId) return [];
      return getEmotions(backendUserId, { days: 183 });
    },
    [backendUserId],
    { enabled: Boolean(backendUserId) },
  );

  const snapshots = useMemo(() => {
    const localEmotions = (localSnapshot?.dquestHistory ?? []).map((record) => ({
      date: record.date,
      mood: record.emotionName,
    }));
    const source = localSnapshot ? localEmotions : data ?? [];
    return source
      .filter((snapshot) => snapshot.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-183);
  }, [data, localSnapshot]);
  const heatmap = useMemo(() => buildEmotionWeekHeatmap(snapshots), [snapshots]);
  const frequent = useMemo(() => resolveMostFrequentEmotion(snapshots.slice(-15)), [snapshots]);
  const periodStart = heatmap.periodStart;
  const periodEnd = heatmap.periodEnd;
  const latestEmotionDate = useMemo(() => {
    for (let index = snapshots.length - 1; index >= 0; index -= 1) {
      if (snapshots[index]?.mood) return snapshots[index].date;
    }
    return null;
  }, [snapshots]);

  useEffect(() => {
    const node = heatmapScrollRef.current;
    if (!node || heatmap.columns.length <= 0) return undefined;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
    if (maxScroll <= 0) return undefined;

    node.scrollLeft = 0;
    if (reduceMotion) {
      node.scrollLeft = maxScroll;
      return undefined;
    }

    let frame = 0;
    let start: number | null = null;
    const timeout = window.setTimeout(() => {
      const duration = 1700;
      const tick = (timestamp: number) => {
        start ??= timestamp;
        const progress = Math.min(1, (timestamp - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.scrollLeft = maxScroll * eased;
        if (progress < 1) {
          frame = window.requestAnimationFrame(tick);
        }
      };
      frame = window.requestAnimationFrame(tick);
    }, 260);

    return () => {
      window.clearTimeout(timeout);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [heatmap.columns.length]);

  return (
    <section className="space-y-5">
      <style>{`
        @keyframes mpEmotionChartGridSweep {
          from { opacity: 0; transform: translateX(-1.4rem); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes mpEmotionChartDotIn {
          0% { background-color: transparent; opacity: 0; transform: scale(.45); filter: saturate(.65); }
          62% { background-color: var(--mp-emotion-dot-color); opacity: 1; transform: scale(1.16); filter: saturate(1.25); }
          100% { background-color: var(--mp-emotion-dot-color); opacity: 1; transform: scale(1); filter: saturate(1); }
        }
        @keyframes mpEmotionChartLatestPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); transform: scale(1); }
          45% { box-shadow: 0 0 0 .36rem rgba(255,255,255,.16); transform: scale(1.18); }
        }
        .mp-emotion-chart-grid-in {
          animation: mpEmotionChartGridSweep 680ms cubic-bezier(.2,.85,.25,1) both;
        }
        .mp-emotion-chart-dot-in {
          background-color: transparent;
          opacity: 0;
          animation: mpEmotionChartDotIn 520ms cubic-bezier(.2,.85,.25,1) both;
        }
        .mp-emotion-chart-dot-latest {
          animation:
            mpEmotionChartDotIn 520ms cubic-bezier(.2,.85,.25,1) both,
            mpEmotionChartLatestPulse 720ms cubic-bezier(.2,.85,.25,1) 1180ms 1;
          outline: 1px solid rgba(255,255,255,.42);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .mp-emotion-chart-grid-in,
          .mp-emotion-chart-dot-in,
          .mp-emotion-chart-dot-latest {
            animation: none !important;
            background-color: var(--mp-emotion-dot-color) !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
      <LabBackHeader />
      <p className="text-base text-[color:var(--mp-text-secondary)]">{t('mobilePremium.emotionChart.description')}</p>

      <div className="flex flex-wrap gap-x-6 gap-y-4">
        {EMOTION_LEGEND.map((emotion) => (
          <span className="inline-flex items-center gap-2 text-sm text-[color:var(--mp-text-secondary)]" key={emotion.key}>
            <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: emotion.color }} />
            {translateEmotionLegendLabel(emotion.key, t)}
          </span>
        ))}
      </div>

      {periodStart && periodEnd ? (
        <p className="flex items-center gap-2 text-sm text-[color:var(--mp-text-secondary)]">
          <span className="text-[color:var(--mp-text-muted)]">▣</span>
          {t('mobilePremium.emotionChart.period')}: {formatDateShort(periodStart, language)} – {formatDateShort(periodEnd, language)}
        </p>
      ) : null}

      <div ref={heatmapScrollRef} className="-mx-5 overflow-x-auto px-5 pb-2 [scrollbar-width:none]">
        <div className="min-w-max rounded-[1.35rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-3">
          <div
            className="mb-3 grid"
            style={{ columnGap: '0.5rem', gridTemplateColumns: `repeat(${heatmap.columns.length}, 1rem)` }}
          >
            {heatmap.monthSegments.map((segment) => (
              <span
                className="text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--mp-text-muted)]"
                key={segment.key}
                style={{ gridColumn: `${segment.startIndex + 1} / span ${segment.span}` }}
              >
                {formatEmotionMonthLabel(segment.monthKey, language)}
              </span>
            ))}
          </div>
          <div
            className="mp-emotion-chart-grid-in grid"
            style={{ columnGap: '0.5rem', gridTemplateColumns: `repeat(${heatmap.columns.length}, 1rem)` }}
          >
            {heatmap.columns.map((column, columnIndex) => (
              <div className="grid grid-rows-7 gap-1.5" key={column.key}>
                {column.cells.map((cell, rowIndex) => {
                  if (!cell.inPeriod) {
                    return <span aria-hidden="true" className="h-4 w-4 opacity-0" key={cell.date} />;
                  }
                  const emotion = cell.mood ? resolveEmotionVisual(cell.mood) : null;
                  const label = emotion
                    ? `${translateEmotionLegendLabel(emotion.key, t)} · ${formatDateShort(cell.date, language)}`
                    : `${formatDateShort(cell.date, language)} · ${t('mobilePremium.emotionChart.noRecord')}`;
                  const isLatestEmotion = Boolean(emotion && latestEmotionDate === cell.date);
                  const delayMs = 120 + columnIndex * 26 + ((columnIndex * 17 + rowIndex * 29) % 150);
                  return (
                    <button
                      aria-label={label}
                      className={`h-4 w-4 rounded-full ${isLatestEmotion ? 'mp-emotion-chart-dot-latest' : 'mp-emotion-chart-dot-in'}`}
                      onClick={() => setActiveEmotionCell({ date: cell.date, label, color: emotion?.color })}
                      key={cell.date}
                      style={{
                        '--mp-emotion-dot-delay': `${delayMs}ms`,
                        '--mp-emotion-dot-color': emotion?.color ?? 'rgba(120,116,128,0.55)',
                        animationDelay: isLatestEmotion ? `${delayMs}ms, ${Math.max(delayMs + 460, 1180)}ms` : `${delayMs}ms`,
                      } as CSSProperties}
                      title={label}
                      type="button"
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeEmotionCell ? (
        <div className="rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] px-4 py-2 text-sm text-[color:var(--mp-text-secondary)]">
          <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ backgroundColor: activeEmotionCell.color ?? 'rgba(120,116,128,0.75)' }} />
          {activeEmotionCell.label}
        </div>
      ) : null}

      <ThinSeparator />

      <div className="flex items-center gap-7 pb-3">
        <span
          className="h-20 w-20 rounded-full shadow-[0_0_34px_rgba(164,99,242,0.3)]"
          style={{ backgroundColor: frequent.color }}
        />
        <div>
          <p className="text-2xl font-light text-[color:var(--mp-text)]">{translateEmotionLegendLabel(frequent.key, t)}</p>
          <p className="mt-1 text-sm text-[color:var(--mp-text-secondary)]">{t('mobilePremium.emotionChart.mostFrequent')}</p>
        </div>
      </div>
    </section>
  );
}

function BalancePanel({
  backendUserId,
  localSnapshot,
}: {
  backendUserId: string | null;
  gameMode: string | null;
  localSnapshot?: LocalOnboardingSnapshot | null;
  weeklyTarget: number | null;
}) {
  return (
    <section className="space-y-3">
      <LabBackHeader />
      <PremiumBalanceCard
        backendUserId={backendUserId}
        localTraits={localSnapshot ? buildTraitXpFromLocalOnboarding(localSnapshot) : undefined}
      />
    </section>
  );
}

function VisionPanel({
  backendUserId,
  gameMode,
  localSnapshot,
  weeklyTarget,
}: {
  backendUserId: string | null;
  gameMode: string | null;
  localSnapshot?: LocalOnboardingSnapshot | null;
  weeklyTarget: number | null;
}) {
  const weeklyGoal = Math.max(1, Math.round(weeklyTarget ?? 3));
  const { data, status } = useRequest(
    async () => {
      if (!backendUserId) return null;
      const groups = await Promise.all(
        STREAK_PILLARS.map(async (pillar) => ({
          pillar,
          response: await getUserStreakPanel(backendUserId, {
            pillar,
            range: 'month',
            mode: gameMode ?? undefined,
          }),
        })),
      );
      const rows = normalizePremiumTaskRows(groups, weeklyGoal);
      const insights = await Promise.all(
        rows.map(async (row) => {
          try {
            return await getTaskInsights(row.id, { range: 'month', mode: gameMode ?? undefined, weeklyGoal });
          } catch {
            return null;
          }
        }),
      );
      return rows.map((row, index) => ({ ...row, insights: insights[index] ?? null }));
    },
    [backendUserId, gameMode, weeklyGoal],
    { enabled: Boolean(backendUserId) },
  );

  const rows: VisionTaskRow[] = useMemo(
    () => (
      localSnapshot
        ? buildPremiumRowsFromLocalOnboarding(localSnapshot, weeklyGoal).map((row) => ({ ...row, insights: null }))
        : data ?? (backendUserId ? [] : FALLBACK_PREMIUM_TASK_ROWS.map((row) => ({ ...row, insights: null })))
    ),
    [backendUserId, data, localSnapshot, weeklyGoal],
  );
  const isLoading = Boolean(backendUserId && status === 'loading' && !data);
  const localHistoryDays = new Set(localSnapshot?.dquestHistory.map((record) => record.date) ?? []).size;
  const hasEnoughHistory = localSnapshot
    ? localHistoryDays >= 7
    : rows.some((row) => resolveMonthlyTaskCount(row) >= 2 || row.streakDays >= 2);
  const streakRows = rows
    .filter((row) => row.streakDays >= 2)
    .sort((a, b) => b.streakDays - a.streakDays);
  const nearHabitRows = rows
    .filter((row) => !localSnapshot && isNearHabit(row))
    .sort((a, b) => resolveHabitWindowScore(b) - resolveHabitWindowScore(a));
  const excludedAttentionIds = new Set([...streakRows, ...nearHabitRows].map((row) => row.id));
  const attentionRows = rows
    .filter((row) => hasEnoughHistory && !excludedAttentionIds.has(row.id))
    .sort((a, b) => resolveMonthlyTaskCount(a) - resolveMonthlyTaskCount(b));

  return (
    <section className="space-y-8">
      <LabBackHeader />

      {isLoading ? (
        <VisionLoadingState />
      ) : (
        <>
          <VisionListSection empty="No hay tareas en racha." title="En racha">
            {streakRows.map((row) => (
              <VisionStreakRow key={`streak-${row.id}`} row={row} />
            ))}
          </VisionListSection>

          <VisionListSection empty={hasEnoughHistory ? 'No hay tareas que necesiten atención todavía.' : 'A partir de la primera semana podremos revisar qué tareas necesitan más atención.'} title="Necesitan atención">
            {attentionRows.map((row) => (
              <VisionAttentionRow key={`attention-${row.id}`} row={row} />
            ))}
          </VisionListSection>

          <VisionListSection empty="No hay tareas cerca del hábito." title="Cerca del hábito">
            {nearHabitRows.map((row) => (
              <VisionNearHabitRow key={`near-${row.id}`} row={row} />
            ))}
          </VisionListSection>
        </>
      )}
    </section>
  );
}

function LabBackHeader() {
  const labBase = useMobilePremiumBasePath();
  return (
    <div className="flex items-center justify-between gap-4">
      <Link
        aria-label="Volver al Dashboard"
        className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-[color:var(--mp-text)]"
        to={`${labBase}/dashboard`}
      >
        ‹
      </Link>
      <span />
    </div>
  );
}

function buildLabsEmotionFallback(): EmotionSnapshot[] {
  const moods = ['Calma', 'Motivación', 'Felicidad', 'Cansancio', 'Tristeza', 'Calma', 'Frustración', 'Motivación', 'Ansiedad'];
  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 182);
  return Array.from({ length: 183 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date: date.toISOString().slice(0, 10),
      mood: index % 9 === 4 ? undefined : moods[index % moods.length],
    };
  });
}

function resolveEmotionVisual(mood: string | null | undefined) {
  const normalized = normalizeTextKey(mood);
  if (normalized.includes('felic') || normalized.includes('happy') || normalized.includes('happiness')) return EMOTION_LEGEND[1];
  if (normalized.includes('motiv')) return EMOTION_LEGEND[2];
  if (normalized.includes('trist') || normalized.includes('sad')) return EMOTION_LEGEND[3];
  if (normalized.includes('ansiedad') || normalized.includes('anxiety')) return EMOTION_LEGEND[4];
  if (normalized.includes('frustr')) return EMOTION_LEGEND[5];
  if (normalized.includes('cans') || normalized.includes('tired')) return EMOTION_LEGEND[6];
  return EMOTION_LEGEND[0];
}

function resolveMostFrequentEmotion(snapshots: EmotionSnapshot[]) {
  const counts = new Map<string, { count: number; visual: (typeof EMOTION_LEGEND)[number] }>();
  snapshots.forEach((snapshot) => {
    if (!snapshot.mood) return;
    const visual = resolveEmotionVisual(snapshot.mood);
    const existing = counts.get(visual.key);
    counts.set(visual.key, { count: (existing?.count ?? 0) + 1, visual });
  });
  return Array.from(counts.values()).sort((a, b) => b.count - a.count)[0]?.visual ?? EMOTION_LEGEND[0];
}

function buildEmotionWeekHeatmap(snapshots: EmotionSnapshot[]) {
  const byDate = new Map(snapshots.map((snapshot) => [snapshot.date, snapshot.mood ?? null]));
  const today = startOfLocalDay(new Date());
  const latestSnapshotDate = snapshots[snapshots.length - 1]?.date
    ? startOfLocalDay(new Date(`${snapshots[snapshots.length - 1].date}T00:00:00`))
    : today;
  const anchorDate = latestSnapshotDate > today ? latestSnapshotDate : today;
  const totalDays = 26 * 7;
  const historicalDays = Math.floor(totalDays * 0.75);
  const periodStartDate = addLocalDays(anchorDate, -(historicalDays - 1));
  const periodEndDate = addLocalDays(periodStartDate, totalDays - 1);
  const periodStart = toLocalIsoDate(periodStartDate);
  const periodEnd = toLocalIsoDate(periodEndDate);
  const startMonday = startOfMondayWeek(periodStartDate);
  const endMonday = startOfMondayWeek(periodEndDate);
  const columns: Array<{
    key: string;
    cells: Array<{ date: string; mood: string | null; inPeriod: boolean }>;
  }> = [];

  for (let monday = new Date(startMonday); monday <= endMonday; monday = addLocalDays(monday, 7)) {
    const cells = Array.from({ length: 7 }, (_, dayIndex) => {
      const date = addLocalDays(monday, dayIndex);
      const iso = toLocalIsoDate(date);
      const inPeriod = date >= periodStartDate && date <= periodEndDate;
      return {
        date: iso,
        mood: inPeriod ? byDate.get(iso) ?? null : null,
        inPeriod,
      };
    });
    columns.push({ key: toLocalIsoDate(monday), cells });
  }

  return {
    columns,
    monthSegments: buildEmotionMonthSegments(columns),
    periodStart,
    periodEnd,
  };
}

function buildEmotionMonthSegments(columns: Array<{ cells: Array<{ date: string; inPeriod: boolean }> }>) {
  const assignments: string[] = [];
  let activeMonthKey = columns[0]?.cells.find((cell) => cell.inPeriod)?.date.slice(0, 7) ?? '';

  columns.forEach((column, columnIndex) => {
    const firstOfMonth = column.cells.find((cell) => cell.inPeriod && cell.date.endsWith('-01'));
    if (firstOfMonth) {
      activeMonthKey = firstOfMonth.date.slice(0, 7);
    }
    assignments[columnIndex] = activeMonthKey;
  });

  const segments: Array<{ key: string; monthKey: string; startIndex: number; span: number }> = [];
  let currentKey = assignments[0] ?? '';
  let segmentStart = 0;

  for (let index = 0; index <= assignments.length; index += 1) {
    const key = assignments[index] ?? '';
    if (index === assignments.length || key !== currentKey) {
      const span = index - segmentStart;
      if (currentKey && span > 0) {
        const [year, month] = currentKey.split('-').map(Number);
        segments.push({
          key: `${currentKey}-${segmentStart}`,
          monthKey: `${year}-${String(month).padStart(2, '0')}`,
          startIndex: segmentStart,
          span,
        });
      }
      segmentStart = index;
      currentKey = key;
    }
  }

  return segments;
}

function translateEmotionLegendLabel(
  key: (typeof EMOTION_LEGEND)[number]['key'],
  t: (translationKey: string, params?: Record<string, string | number>) => string,
) {
  switch (key) {
    case 'happy':
      return t('mobilePremium.dquest.happy');
    case 'motivation':
      return t('mobilePremium.dquest.motivation');
    case 'sad':
      return t('mobilePremium.dquest.sad');
    case 'anxiety':
      return t('mobilePremium.dquest.anxiety');
    case 'frustration':
      return t('mobilePremium.dquest.frustration');
    case 'tired':
      return t('mobilePremium.dquest.tired');
    case 'calm':
    default:
      return t('mobilePremium.dquest.calm');
  }
}

function formatEmotionMonthLabel(monthKey: string, language: 'es' | 'en') {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  if (Number.isNaN(date.getTime())) return monthKey.toUpperCase();
  return new Intl.DateTimeFormat(language, { month: 'short' }).format(date).replace('.', '').toUpperCase();
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addLocalDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return startOfLocalDay(next);
}

function startOfMondayWeek(date: Date) {
  const normalized = startOfLocalDay(date);
  const day = normalized.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addLocalDays(normalized, diff);
}

function toLocalIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeTextKey(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

type BalanceItem = {
  pillar: StreakPanelPillar;
  label: string;
  trait: string;
  color: string;
  value: number;
  percent: number;
};

const BALANCE_META: Array<Omit<BalanceItem, 'value' | 'percent'>> = [
  { pillar: 'Body', label: 'Cuerpo', trait: 'mobility', color: '#4AD7F3' },
  { pillar: 'Mind', label: 'Mente', trait: 'focus', color: '#5D82F4' },
  { pillar: 'Soul', label: 'Alma', trait: 'calm', color: '#A463F2' },
];

const FALLBACK_BALANCE_VALUES: Record<StreakPanelPillar, number> = {
  Body: 1462,
  Mind: 771,
  Soul: 1586,
};

function buildBalanceItems(
  groups: Array<{ pillar: StreakPanelPillar; response: { tasks: StreakPanelTask[] } }> | null,
  weeklyGoal: number,
): BalanceItem[] {
  const rawValues = BALANCE_META.map((meta) => {
    const group = groups?.find((candidate) => candidate.pillar === meta.pillar);
    const xp = group?.response.tasks.reduce((sum, task) => sum + (task.metrics.month?.xp ?? 0), 0) ?? 0;
    const count = group?.response.tasks.reduce((sum, task) => sum + (task.metrics.month?.count ?? 0), 0) ?? 0;
    return {
      ...meta,
      value: xp > 0 ? xp : count * weeklyGoal,
    };
  });
  const hasRealValues = rawValues.some((item) => item.value > 0);
  const resolved = hasRealValues
    ? rawValues
    : BALANCE_META.map((meta) => ({ ...meta, value: FALLBACK_BALANCE_VALUES[meta.pillar] }));
  const total = resolved.reduce((sum, item) => sum + item.value, 0) || 1;
  return resolved.map((item) => ({ ...item, percent: Math.round((item.value / total) * 100) }));
}

function BalanceRadar({ items }: { items: BalanceItem[] }) {
  const dominant = items.reduce((current, item) => (item.value > current.value ? item : current), items[0]);
  const ordered = [dominant, ...items.filter((item) => item.pillar !== dominant.pillar)];
  const angles = [-90, 30, 150];
  const center = 160;
  const maxRadius = 92;
  const maxValue = Math.max(...items.map((item) => item.value), 1);
  const points = ordered.map((item, index) => polarPoint(center, center, Math.max(26, (item.value / maxValue) * maxRadius), angles[index]));
  const polygonPoints = points.map((point) => `${point.x},${point.y}`).join(' ');
  let arcOffset = 0;

  return (
    <div className="relative mx-auto w-full max-w-[350px]">
      <svg className="h-auto w-full overflow-visible" viewBox="0 0 320 320">
        {[42, 72, 102].map((radius) => (
          <circle
            cx={center}
            cy={center}
            fill="none"
            key={radius}
            r={radius}
            stroke="rgba(255,248,236,0.07)"
            strokeWidth="1"
          />
        ))}
        {angles.map((angle) => {
          const end = polarPoint(center, center, 112, angle);
          return <line key={angle} stroke="rgba(255,248,236,0.08)" strokeWidth="1" x1={center} x2={end.x} y1={center} y2={end.y} />;
        })}
        {items.map((item) => {
          const dashOffset = -arcOffset;
          arcOffset += item.percent;
          return (
            <circle
              cx={center}
              cy={center}
              fill="none"
              key={item.pillar}
              pathLength={100}
              r={124}
              stroke={item.color}
              strokeDasharray={`${Math.max(item.percent - 1, 1)} ${101 - Math.max(item.percent - 1, 1)}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              strokeWidth="4"
              transform={`rotate(-90 ${center} ${center})`}
            />
          );
        })}
        <polygon fill="rgba(164,99,242,0.22)" points={polygonPoints} stroke="rgba(196,157,255,0.95)" strokeWidth="2" />
        {points.map((point, index) => (
          <circle cx={point.x} cy={point.y} fill="#F8F2FF" key={ordered[index].pillar} r="6" />
        ))}
        {ordered.map((item, index) => {
          const labelPoint = polarPoint(center, center, 138, angles[index]);
          const anchor = index === 0 ? 'middle' : index === 1 ? 'start' : 'end';
          return (
            <text fill={item.color} fontSize="15" key={item.pillar} textAnchor={anchor} x={labelPoint.x} y={labelPoint.y}>
              <tspan fontWeight="600" x={labelPoint.x}>
                {item.label}
              </tspan>
              <tspan dy="18" fontSize="13" x={labelPoint.x}>
                {formatGp(item.value)}
              </tspan>
            </text>
          );
        })}
      </svg>
      <p className="absolute left-1/2 top-5 -translate-x-1/2 text-[12px] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-violet)]">
        {dominant.label} {dominant.percent}%
      </p>
    </div>
  );
}

function polarPoint(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function formatGp(value: number) {
  return new Intl.NumberFormat('es', { maximumFractionDigits: 0 }).format(value);
}

function VisionLoadingState() {
  return (
    <section className="grid min-h-[18rem] place-items-center border-b border-[color:var(--mp-border)] py-12">
      <div className="grid justify-items-center gap-4 text-[color:var(--mp-text-secondary)]">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-[color:var(--mp-border)] border-t-[color:var(--mp-violet)]" />
        <p className="text-sm font-medium">Cargando visión general...</p>
      </div>
    </section>
  );
}

function VisionListSection({ title, empty, children }: { title: string; empty: string; children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children);
  const count = items.length;
  const visibleItems = expanded ? items : items.slice(0, 3);
  const hiddenCount = Math.max(0, count - 3);
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-[color:var(--mp-text)]">{title}</h2>
      <div>
        {count > 0 ? (
          <>
            {visibleItems}
            {hiddenCount > 0 ? (
              <button
                className="mt-3 min-h-10 rounded-full border border-[color:var(--mp-border)] px-4 text-sm font-semibold text-[color:var(--mp-violet)] transition hover:bg-violet-400/10"
                onClick={() => setExpanded((current) => !current)}
                type="button"
              >
                {expanded ? 'Ver menos' : `Ver ${hiddenCount} más`}
              </button>
            ) : null}
          </>
        ) : (
          <p className="border-b border-[color:var(--mp-border)] py-4 text-sm text-[color:var(--mp-text-secondary)]">{empty}</p>
        )}
      </div>
    </section>
  );
}

function VisionStreakRow({ row }: { row: PremiumTaskRow }) {
  return (
    <VisionBaseRow
      metric={
        <span className="inline-flex items-center gap-1.5 text-base font-semibold text-[color:var(--mp-text)]">
          <VisionFlameIcon className="text-[#ff8a2a]" />
          {row.streakDays}d
        </span>
      }
      row={row}
    />
  );
}

function VisionAttentionRow({ row }: { row: PremiumTaskRow }) {
  const done = resolveMonthlyTaskCount(row);
  const goal = Math.max(1, row.weeklyGoal * 4);
  const tone = done / goal <= 0.25 ? 'text-[color:var(--mp-red)]' : 'text-[color:var(--mp-amber)]';
  return (
    <VisionBaseRow
      metric={<span className={`text-base font-semibold ${tone}`}>{done}/{goal} mes</span>}
      row={row}
    />
  );
}

function VisionFlameIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={`h-4 w-4 ${className ?? ''}`} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" viewBox="0 0 24 24">
      <path d="M12.4 21c3.5 0 5.8-2.3 5.8-5.6 0-2.5-1.3-4.6-3.9-6.5-.2 2-1 3.3-2.4 4.1.3-3-.7-5.5-3.1-7.5-.1 3.5-3 5.6-3 9.6C5.8 18.5 8.4 21 12.4 21Z" />
      <path d="M11.9 20.7c1.5-.9 2.2-2 2.2-3.4 0-1-.5-1.9-1.5-2.8-.2 1-.7 1.7-1.4 2.1.1-1.3-.3-2.4-1.2-3.3-.7 1.1-1.1 2.2-1.1 3.3 0 2 1.1 3.4 3 4.1Z" opacity="0.75" />
    </svg>
  );
}

function VisionNearHabitRow({ row }: { row: VisionTaskRow }) {
  const slots = row.insights?.previewAchievement?.windowProximity?.slots ?? [];
  const valid = slots.filter(isValidHabitSlot).length;
  return (
    <VisionBaseRow
      metric={
        <span className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[color:var(--mp-text)]">{valid}/3</span>
          <VisionHabitMonthDots row={row} />
        </span>
      }
      row={row}
    />
  );
}

function VisionBaseRow({ row, metric }: { row: PremiumTaskRow; metric: ReactNode }) {
  const labBase = useMobilePremiumBasePath();
  return (
    <Link
      className="grid grid-cols-[44px_minmax(0,1fr)_auto_16px] items-center gap-3 border-b border-[color:var(--mp-border)] py-4"
      to={`${labBase}/task-detail?taskId=${encodeURIComponent(row.id)}`}
    >
      <span className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-[color:var(--mp-violet)]">
        <TraitIcon size={20} trait={row.stat} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold text-[color:var(--mp-text)]">{row.name}</span>
        <span className="mt-1 block truncate text-xs text-[color:var(--mp-text-secondary)]">{row.stat}</span>
      </span>
      <span className="shrink-0">{metric}</span>
      <span className="text-2xl font-light text-[color:var(--mp-text-secondary)]">›</span>
    </Link>
  );
}

function VisionHabitMonthDots({ row }: { row: VisionTaskRow }) {
  const months = (row.insights?.previewAchievement?.windowProximity?.slots ?? []).map(resolveHabitSlotColor);
  return (
    <span className="inline-flex items-center gap-1.5">
      {months.map((color, index) => (
        <span className="h-2.5 w-2.5 rounded-full" key={`${row.id}-${index}`} style={{ backgroundColor: color }} />
      ))}
    </span>
  );
}

function resolveHabitSlotColor(slot: unknown) {
  if (typeof slot !== 'string') return 'var(--mp-track-strong)';
  if (isValidHabitSlot(slot)) return 'var(--mp-green)';
  if (slot.includes('floor_only')) return 'var(--mp-amber)';
  if (slot === 'empty') return 'var(--mp-track-strong)';
  return 'var(--mp-red)';
}

function isValidHabitSlot(slot: unknown) {
  return slot === 'valid' || slot === 'projected_valid';
}

function isNearHabit(row: VisionTaskRow) {
  if (isTaskAchievedHabit(row)) return false;
  const slots = row.insights?.previewAchievement?.windowProximity?.slots ?? [];
  return slots.filter(isValidHabitSlot).length >= 2 && slots.length === 3;
}

function isTaskAchievedHabit(row: Pick<PremiumTaskRow, 'achievementSealVisible' | 'lifecycleStatus'>) {
  const status = (row.lifecycleStatus ?? '').trim().toLowerCase();
  return Boolean(
    row.achievementSealVisible ||
    status === 'achieved' ||
    status === 'maintained' ||
    status === 'stored' ||
    status === 'achievement_pending' ||
    status === 'achievement_maintained' ||
    status === 'achievement_stored',
  );
}

function resolveHabitWindowScore(row: VisionTaskRow) {
  return Number(row.insights?.previewAchievement?.score ?? 0);
}

function resolveMonthlyTaskCount(row: PremiumTaskRow) {
  return row.monthlyCount ?? row.monthWeeks.reduce((sum, value) => sum + value, 0);
}

function resolveWeeklyGoal(mode: string | null, weeklyTarget: number | null) {
  if (weeklyTarget && Number.isFinite(weeklyTarget)) {
    return Math.max(1, Math.round(weeklyTarget));
  }

  switch ((mode ?? '').toUpperCase()) {
    case 'LOW':
      return 1;
    case 'CHILL':
      return 2;
    case 'EVOLVE':
      return 4;
    case 'FLOW':
    default:
      return 3;
  }
}
