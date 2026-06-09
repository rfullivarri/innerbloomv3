import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useRequest } from '../../../../hooks/useRequest';
import { useDifficulties, usePillars, useTraits } from '../../../../hooks/useCatalogs';
import {
  getTaskInsights,
  getUserStreakPanel,
  deleteUserTask,
  updateUserTask,
  type StreakPanelPillar,
  type StreakPanelTask,
  type TaskInsightsResponse,
} from '../../../../lib/api';
import { normalizeGameModeValue, type GameMode } from '../../../../lib/gameMode';
import { TraitIcon } from '../MobilePremiumPrimitives';
import { habitDevelopmentStatusLabel, HabitStatusChip, PremiumScoreRing } from '../PremiumHabitDevelopment';
import { useMobilePremiumBasePath } from '../mobilePremiumRouting';

const STREAK_PILLARS: StreakPanelPillar[] = ['Body', 'Mind', 'Soul'];
const MODE_TIERS: Record<GameMode, number> = {
  Low: 1,
  Chill: 2,
  Flow: 3,
  Evolve: 4,
};

type ActivityScope = 'W' | 'M' | '3M';
type RecalibrationAction = 'up' | 'keep' | 'down';

type PremiumTaskSummary = {
  id: string;
  name: string;
  pillar: StreakPanelPillar;
  stat: string;
  difficultyLabel: string | null;
  weeklyGoal: number;
  streakDays: number;
  latestRecalibrationAction: RecalibrationAction | null;
  lifecycleStatus: string | null;
  monthWeeks: number[];
};

export type TaskEditDraft = {
  difficultyLabel: NonNullable<PremiumTaskSummary['difficultyLabel']>;
  difficultyId: string | null;
  name: string;
  pillar: StreakPanelPillar;
  pillarId: string | null;
  stat: string;
  traitId: string | null;
};

type ActiveWindowMonth = {
  month: string;
  periodKey?: string | null;
  percent: number;
  projected?: boolean;
};

type ActivityBar = {
  label: string;
  value: number;
  target: number;
  complete: boolean;
  caption?: string;
  empty?: boolean;
  projected?: boolean;
};

const FALLBACK_TASK: PremiumTaskSummary = {
  id: 'premium-sleep',
  name: 'Dormir 8hs',
  pillar: 'Body',
  stat: 'Sueño',
  difficultyLabel: 'Media',
  weeklyGoal: 3,
  streakDays: 12,
  latestRecalibrationAction: 'keep',
  lifecycleStatus: 'building',
  monthWeeks: [3, 2, 3, 1, 2],
};

const FALLBACK_TASKS: PremiumTaskSummary[] = [
  FALLBACK_TASK,
  {
    id: 'premium-sugar',
    name: 'No dulces',
    pillar: 'Body',
    stat: 'Nutrición',
    difficultyLabel: 'Difícil',
    weeklyGoal: 3,
    streakDays: 0,
    latestRecalibrationAction: 'up',
    lifecycleStatus: 'fragile',
    monthWeeks: [0, 0, 0, 0, 0],
  },
  {
    id: 'premium-run',
    name: '10.000 pasos / Correr',
    pillar: 'Body',
    stat: 'Movilidad',
    difficultyLabel: 'Media',
    weeklyGoal: 3,
    streakDays: 5,
    latestRecalibrationAction: 'down',
    lifecycleStatus: 'building',
    monthWeeks: [3, 2, 3, 1, 2],
  },
];

const PILLAR_LABELS: Record<StreakPanelPillar, string> = {
  Body: 'Cuerpo',
  Mind: 'Mente',
  Soul: 'Alma',
};

const TRAITS_BY_PILLAR: Record<StreakPanelPillar, string[]> = {
  Body: ['Energía', 'Nutrición', 'Sueño', 'Recuperación', 'Hidratación', 'Higiene', 'Vitalidad', 'Postura', 'Movilidad', 'Moderación'],
  Mind: ['Enfoque', 'Aprendizaje', 'Creatividad', 'Gestión', 'Autocontrol', 'Resiliencia', 'Orden', 'Proyección', 'Finanzas', 'Agilidad'],
  Soul: ['Conexión', 'Espiritualidad', 'Propósito', 'Valores', 'Altruismo', 'Insight', 'Gratitud', 'Naturaleza', 'Gozo', 'Autoestima'],
};

function normalizeCatalogPillar(value: string | null | undefined): StreakPanelPillar | null {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'body':
    case 'cuerpo':
      return 'Body';
    case 'mind':
    case 'mente':
      return 'Mind';
    case 'soul':
    case 'alma':
      return 'Soul';
    default:
      return null;
  }
}

function normalizeDifficultyLabel(value: string | null | undefined) {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'easy':
    case 'fácil':
    case 'facil':
      return 'Fácil';
    case 'medium':
    case 'media':
      return 'Media';
    case 'hard':
    case 'difícil':
    case 'dificil':
      return 'Difícil';
    default:
      return null;
  }
}

function normalizeTraitKey(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

const FALLBACK_INSIGHTS: TaskInsightsResponse = {
  task: {
    id: 'premium-sleep',
    name: 'Dormir 8hs',
    stat: 'Sueño',
    description: null,
    difficultyLabel: 'Media',
    lifecycleStatus: 'building',
  },
  month: {
    totalCount: 11,
    totalXp: 330,
    days: [
      { date: '2026-05-01', count: 1 },
      { date: '2026-05-02', count: 1 },
      { date: '2026-05-04', count: 1 },
      { date: '2026-05-06', count: 1 },
      { date: '2026-05-07', count: 1 },
      { date: '2026-05-10', count: 1 },
      { date: '2026-05-12', count: 1 },
      { date: '2026-05-15', count: 1 },
      { date: '2026-05-18', count: 1 },
      { date: '2026-05-20', count: 1 },
      { date: '2026-05-21', count: 1 },
    ],
  },
  weeks: {
    weeklyGoal: 3,
    completionRate: 0.72,
    weeksSample: 5,
    currentStreak: 12,
    bestStreak: 21,
    timeline: [
      { weekStart: '2026-04-20', weekEnd: '2026-04-26', count: 3, hit: true },
      { weekStart: '2026-04-27', weekEnd: '2026-05-03', count: 2, hit: false },
      { weekStart: '2026-05-04', weekEnd: '2026-05-10', count: 3, hit: true },
      { weekStart: '2026-05-11', weekEnd: '2026-05-17', count: 1, hit: false },
      { weekStart: '2026-05-18', weekEnd: '2026-05-24', count: 2, hit: false },
    ],
  },
  previewAchievement: {
    score: 72,
    status: 'building',
    recentMonths: [
      { month: 'Feb', completionRate: 0.38, closed: true, state: 'weak' },
      { month: 'Mar', completionRate: 0.63, closed: true, state: 'building' },
      { month: 'Abr', completionRate: 0.82, closed: true, state: 'strong' },
      { month: 'May', projectedCompletionRate: 0.86, closed: false, state: 'strong' },
    ],
  },
  recalibration: {
    eligible: true,
    latest: {
      action: 'keep',
      periodStart: '2026-05-01',
      periodEnd: '2026-05-31',
      expectedTarget: 12,
      completions: 9,
      completionRate: 0.72,
      recalibratedAt: '2026-05-04T00:00:00.000Z',
      difficultyBefore: 'Media',
      difficultyAfter: 'Media',
      reason: 'Completion rate between 50% and 79%, difficulty kept.',
    },
    history: [
      {
        action: 'keep',
        periodStart: '2026-05-01',
        periodEnd: '2026-05-31',
        expectedTarget: 12,
        completions: 9,
        completionRate: 0.72,
        recalibratedAt: '2026-05-04T00:00:00.000Z',
        difficultyBefore: 'Media',
        difficultyAfter: 'Media',
        reason: 'Completion rate between 50% and 79%, difficulty kept.',
      },
      {
        action: 'down',
        periodStart: '2026-04-01',
        periodEnd: '2026-04-30',
        expectedTarget: 12,
        completions: 10,
        completionRate: 0.82,
        recalibratedAt: '2026-04-07T00:00:00.000Z',
        difficultyBefore: 'Difícil',
        difficultyAfter: 'Media',
        reason: 'Completion rate above 80%, decreasing difficulty.',
      },
      {
        action: 'up',
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        expectedTarget: 12,
        completions: 5,
        completionRate: 0.38,
        recalibratedAt: '2026-03-03T00:00:00.000Z',
        difficultyBefore: 'Fácil',
        difficultyAfter: 'Difícil',
        reason: 'Completion rate below 50%, increasing difficulty.',
      },
    ],
  },
};

function buildFallbackInsights(task: PremiumTaskSummary): TaskInsightsResponse {
  const action = task.latestRecalibrationAction ?? 'keep';
  const score = action === 'up' ? 48 : action === 'down' ? 86 : 72;
  const before = action === 'up' ? 'Media' : action === 'down' ? 'Difícil' : task.difficultyLabel ?? 'Media';
  const after = action === 'up' ? 'Difícil' : action === 'down' ? 'Media' : task.difficultyLabel ?? 'Media';
  const rate = score / 100;
  return {
    ...FALLBACK_INSIGHTS,
    task: {
      ...FALLBACK_INSIGHTS.task,
      id: task.id,
      name: task.name,
      stat: task.stat,
      difficultyLabel: task.difficultyLabel,
      lifecycleStatus: task.lifecycleStatus,
    },
    previewAchievement: {
      ...FALLBACK_INSIGHTS.previewAchievement,
      score,
      status: score < 50 ? 'fragile' : score >= 80 ? 'strong' : 'building',
      recentMonths: [
        { month: 'Feb', completionRate: 0.38, closed: true, state: 'weak' },
        { month: 'Mar', completionRate: 0.63, closed: true, state: 'building' },
        { month: 'Abr', completionRate: 0.82, closed: true, state: 'strong' },
        { month: 'May', projectedCompletionRate: score >= 80 ? 0.86 : score / 100, closed: false, state: score >= 80 ? 'strong' : score < 50 ? 'weak' : 'building' },
      ],
    },
    recalibration: {
      ...FALLBACK_INSIGHTS.recalibration,
      latest: {
        action,
        periodStart: '2026-05-01',
        periodEnd: '2026-05-31',
        expectedTarget: 12,
        completions: Math.round(rate * 12),
        completionRate: rate,
        recalibratedAt: '2026-05-04T00:00:00.000Z',
        difficultyBefore: before,
        difficultyAfter: after,
        reason: action === 'up'
          ? 'Completion rate below 50%, increasing difficulty.'
          : action === 'down'
            ? 'Completion rate above 80%, decreasing difficulty.'
            : 'Completion rate between 50% and 79%, difficulty kept.',
      },
      history: FALLBACK_INSIGHTS.recalibration.history,
    },
  };
}

function buildEmptyPreviewInsights(task: PremiumTaskSummary, weeklyGoal: number): TaskInsightsResponse {
  const now = new Date();
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const month = now.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  const completions = task.monthWeeks.reduce((total, value) => total + value, 0);
  const target = Math.max(weeklyGoal * Math.max(1, task.monthWeeks.length), 1);
  const completionRate = Math.min(1, completions / target);
  const score = Math.round(completionRate * 100);
  return {
    task: {
      id: task.id,
      name: task.name,
      stat: task.stat,
      description: null,
      difficultyLabel: task.difficultyLabel,
      lifecycleStatus: 'onboarding',
    },
    month: { totalCount: completions, totalXp: 0, days: [] },
    weeks: {
      weeklyGoal,
      completionRate,
      weeksSample: task.monthWeeks.length,
      currentStreak: task.streakDays,
      bestStreak: task.streakDays,
      timeline: task.monthWeeks.map((count, index) => ({ weekKey: `${periodKey}-w${index + 1}`, count })),
    },
    previewAchievement: {
      score,
      status: score < 50 ? 'fragile' : score < 80 ? 'building' : 'strong',
      currentMonth: {
        periodKey,
        completionRateSoFar: completionRate,
        projectedMonthEndRate: completionRate,
        expectedTargetSoFar: target,
        completionsDoneSoFar: completions,
        expectedTargetMonthEnd: target,
        projectedCompletionsMonthEnd: completions,
      },
      recentMonths: [
        { periodKey, month, projectedCompletionRate: completionRate, closed: false, state: score < 50 ? 'weak' : score < 80 ? 'building' : 'strong' },
      ],
    },
    recalibration: { latest: null, history: [] },
  };
}

export function PremiumTaskDetail({
  backendUserId,
  gameMode,
  onboardingEditCue = false,
  onboardingPreview = false,
  onTaskSaved,
  previewTasks = [],
  weeklyTarget,
}: {
  backendUserId: string | null;
  gameMode: string | null;
  onboardingEditCue?: boolean;
  onboardingPreview?: boolean;
  onTaskSaved?: (draft: TaskEditDraft, taskId: string) => void | Promise<void>;
  previewTasks?: Array<{
    id: string;
    name: string;
    pillar: StreakPanelPillar;
    stat: string;
    difficultyLabel: string | null;
    monthWeeks: number[];
    streakDays: number;
  }>;
  weeklyTarget: number | null;
}) {
  const labBase = useMobilePremiumBasePath();
  const [scope, setScope] = useState<ActivityScope>('M');
  const [editOpen, setEditOpen] = useState(false);
  const [localOverride, setLocalOverride] = useState<Partial<PremiumTaskSummary> | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedTaskId = searchParams.get('taskId');
  const weeklyGoal = resolveWeeklyGoal(gameMode, weeklyTarget);
  const normalizedMode = normalizeGameModeValue(gameMode) ?? 'Flow';
  const { data: panelData } = useRequest(
    async () => {
      if (!backendUserId) return null;
      return Promise.all(
        STREAK_PILLARS.map(async (pillar) => ({
          pillar,
          response: await getUserStreakPanel(backendUserId, {
            pillar,
            range: 'month',
            mode: normalizedMode,
          }),
        })),
      );
    },
    [backendUserId, normalizedMode],
    { enabled: Boolean(backendUserId) },
  );

  const baseTaskSummary = useMemo(() => {
    const previewRows: PremiumTaskSummary[] = previewTasks.map((task) => ({
      ...task,
      weeklyGoal,
      latestRecalibrationAction: null,
      lifecycleStatus: 'onboarding',
    }));
    const rows = panelData ? normalizeTaskSummaries(panelData, weeklyGoal) : previewRows.length ? previewRows : FALLBACK_TASKS;
    if (selectedTaskId) {
      const selected = rows.find((row) => row.id === selectedTaskId);
      if (selected) return selected;
    }
    return rows.find((row) => matchesSleep(row)) ?? rows[0] ?? FALLBACK_TASK;
  }, [panelData, previewTasks, selectedTaskId, weeklyGoal]);
  const taskSummary = useMemo(
    () => (localOverride ? { ...baseTaskSummary, ...localOverride } : baseTaskSummary),
    [baseTaskSummary, localOverride],
  );

  const { data: taskInsights } = useRequest(
    () => getTaskInsights(taskSummary.id, { mode: normalizedMode, weeklyGoal, range: scopeToRange(scope) }),
    [taskSummary.id, normalizedMode, weeklyGoal, scope],
    { enabled: Boolean(backendUserId && taskSummary.id) },
  );

  const insights = taskInsights ?? (
    onboardingPreview
      ? buildEmptyPreviewInsights(taskSummary, weeklyGoal)
      : buildFallbackInsights(taskSummary)
  );
  const detail = buildDetail(taskSummary, insights, weeklyGoal);
  const activity = buildActivity(scope, insights, weeklyGoal);
  const latestChip = resolveRecalibrationChip(detail.latestRecalibrationAction, detail.difficultyLabel);
  const activeWindowMonths = detail.activeWindow.slice(-4);

  return (
    <section className="space-y-7">
      <style>{`
        @keyframes mpOnboardingEditCue {
          0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(124,58,237,.26), 0 0 18px rgba(124,58,237,.2); }
          50% { transform: scale(1.1); box-shadow: 0 0 0 10px rgba(124,58,237,0), 0 0 38px rgba(124,58,237,.52); }
        }
        .mp-onboarding-edit-cue { animation: mpOnboardingEditCue 1.25s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .mp-onboarding-edit-cue { animation: none !important; } }
      `}</style>
      <header className="space-y-5">
        <div className="grid grid-cols-[44px_1fr_44px] items-center">
          <Link
            aria-label="Volver a tareas"
            className="grid h-11 w-11 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-2xl text-[color:var(--mp-text)]"
            to={`${labBase}/tareas`}
          >
            ‹
          </Link>
          <span />
          <span />
        </div>
        <div className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-4">
          <div className="grid h-14 w-14 place-items-center rounded-full border border-[color:var(--mp-border)] bg-violet-400/10 text-[color:var(--mp-violet)]">
            <TraitIcon size={26} trait={detail.stat} />
          </div>
          <div className="min-w-0">
            <h2 className="max-w-full break-words text-[1.38rem] font-semibold leading-[1.12] text-[color:var(--mp-text)]">{detail.name}</h2>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <span className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-violet-400/12 px-2.5 text-xs font-semibold text-[color:var(--mp-violet)]">
                <TraitIcon size={12} trait={detail.stat} />
                {detail.stat}
              </span>
              {detail.difficultyLabel ? (
                <span className="inline-flex min-h-7 items-center rounded-full border border-[color:var(--mp-border)] px-2.5 text-xs font-semibold text-[color:var(--mp-text-secondary)]">
                  {detail.difficultyLabel}
                </span>
              ) : null}
              {detail.latestRecalibrationAction ? <RecalibrationPulseChip action={detail.latestRecalibrationAction} chip={latestChip} /> : null}
            </div>
          </div>
          <button
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold text-[color:var(--mp-violet)] ${
              onboardingEditCue ? 'mp-onboarding-edit-cue border-violet-600 bg-violet-600 text-white' : 'border-[color:var(--mp-border)]'
            }`}
            onClick={() => setEditOpen(true)}
            type="button"
          >
            Editar
          </button>
        </div>
      </header>

      <section className="space-y-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--mp-violet)]">Desarrollo del hábito</p>
        <div className="rounded-[1.25rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-5">
          <div className="grid grid-cols-[104px_1fr] items-start gap-5">
            <PremiumScoreRing animateKey={`${detail.id}-${detail.score}`} score={detail.score} />
            <div className="min-w-0">
              <div>
                <HabitStatusChip label={detail.lifecycleLabel} score={detail.score} />
                <p className="mt-3 text-sm leading-5 text-[color:var(--mp-text-secondary)]">{detail.insight}</p>
              </div>
              <div className="mt-4 border-t border-[color:var(--mp-border)] pt-3">
                <div className="mb-3 flex items-center justify-center gap-2 text-[10px] font-medium text-[color:var(--mp-text-muted)]">
                  <span className="text-[color:var(--mp-red)]">Frágil &lt;50</span>
                  <span>·</span>
                  <span className="text-[color:var(--mp-amber)]">50-79</span>
                  <span>·</span>
                  <span className="text-[color:var(--mp-green)]">Fuerte ≥80</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[color:var(--mp-text-muted)]">
                    <span className="h-px flex-1 bg-[color:var(--mp-border)]" />
                    <span>Ventana activa</span>
                    <span className="h-px flex-1 bg-[color:var(--mp-border)]" />
                  </div>
                  <div className="flex items-start justify-center gap-3">
                    {activeWindowMonths.map((month) => (
                      <MonthHealthDot key={`${month.month}-${month.percent}`} month={month.month} percent={month.percent} projected={month.projected} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--mp-violet)]">Actividad</p>
            <p className="mt-1 text-xs text-[color:var(--mp-text-muted)]">{normalizedMode} · {weeklyGoal}/semana</p>
          </div>
          <div className="grid grid-cols-3 rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-0.5">
            {(['W', 'M', '3M'] as ActivityScope[]).map((item) => (
              <button
                className={`min-h-8 rounded-full px-3 text-xs font-semibold ${scope === item ? 'bg-violet-500/40 text-[color:var(--mp-text)]' : 'text-[color:var(--mp-text-secondary)]'}`}
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
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[color:var(--mp-green)]" />Logrado</span>
          <span className="inline-flex items-center gap-2"><span className="h-0.5 w-4 rounded-full bg-[color:var(--mp-track-strong)]" />Objetivo</span>
        </div>
        <ActivityBars activity={activity} />
      </section>

      {detail.streaks.current >= 2 || detail.streaks.best >= 2 ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--mp-violet)]">Rachas</p>
          <div className="grid grid-cols-2 gap-3">
            {detail.streaks.current >= 2 ? (
              <div className="rounded-[1rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-4">
                <p className="text-xs text-[color:var(--mp-text-muted)]">Racha actual</p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--mp-text)]">🔥 {detail.streaks.current} días</p>
              </div>
            ) : null}
            {detail.streaks.best >= 2 ? (
              <div className="rounded-[1rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-4">
                <p className="text-xs text-[color:var(--mp-text-muted)]">Mejor racha</p>
                <p className="mt-2 text-2xl font-semibold text-[color:var(--mp-text)]">{detail.streaks.best} días</p>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--mp-violet)]">Ajustes de dificultad</p>
        <div className="rounded-[1rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)]">
          {detail.difficultyAdjustments.length ? (
            detail.difficultyAdjustments.map((adjustment, index) => (
              <DifficultyAdjustmentRow adjustment={adjustment} key={`${adjustment.date}-${adjustment.label}-${index}`} />
            ))
          ) : (
            <p className="px-4 py-5 text-sm text-[color:var(--mp-text-secondary)]">
              Todavía no hay ajustes de dificultad registrados.
            </p>
          )}
        </div>
      </section>

      {editOpen ? (
        <TaskEditSheet
          backendUserId={backendUserId}
          onClose={() => setEditOpen(false)}
          onDeleted={() => navigate(`${labBase}/tareas`)}
          onSave={(draft) => {
            setLocalOverride({
              difficultyLabel: draft.difficultyLabel,
              name: draft.name.trim() || taskSummary.name,
              pillar: draft.pillar,
              stat: draft.stat,
            });
            setEditOpen(false);
            void onTaskSaved?.(draft, taskSummary.id);
          }}
          task={taskSummary}
        />
      ) : null}
    </section>
  );
}

function TaskEditSheet({
  backendUserId,
  onClose,
  onDeleted,
  onSave,
  task,
}: {
  backendUserId: string | null;
  onClose: () => void;
  onDeleted: () => void;
  onSave: (draft: TaskEditDraft) => void;
  task: PremiumTaskSummary;
}) {
  const initialPillar = task.pillar;
  const initialTraits = TRAITS_BY_PILLAR[initialPillar];
  const pillarsCatalog = usePillars({ enabled: Boolean(backendUserId) });
  const catalogPillar = pillarsCatalog.data.find((pillar) => normalizeCatalogPillar(pillar.code) === initialPillar || normalizeCatalogPillar(pillar.name) === initialPillar);
  const [draft, setDraft] = useState<TaskEditDraft>({
    difficultyLabel: (task.difficultyLabel ?? 'Media') as TaskEditDraft['difficultyLabel'],
    difficultyId: null,
    name: task.name,
    pillar: initialPillar,
    pillarId: catalogPillar?.id ?? null,
    stat: backendUserId
      ? task.stat
      : (initialTraits.find((trait) => normalizeTraitKey(trait) === normalizeTraitKey(task.stat)) ?? initialTraits[0]),
    traitId: null,
  });
  const selectedCatalogPillar = pillarsCatalog.data.find((pillar) => normalizeCatalogPillar(pillar.code) === draft.pillar || normalizeCatalogPillar(pillar.name) === draft.pillar);
  const traitsCatalog = useTraits(selectedCatalogPillar?.id ?? draft.pillarId);
  const difficultyCatalog = useDifficulties({ enabled: Boolean(backendUserId) });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const availableTraits = backendUserId
    ? traitsCatalog.data.map((trait) => ({ id: trait.id, name: trait.name }))
    : TRAITS_BY_PILLAR[draft.pillar].map((name) => ({ id: null, name }));
  const selectedTraitIndex = Math.max(0, availableTraits.findIndex((trait) => (
    (trait.id != null && trait.id === draft.traitId)
    || normalizeTraitKey(trait.name) === normalizeTraitKey(draft.stat)
  )));
  const selectedTrait = availableTraits[selectedTraitIndex];

  function selectPillar(pillar: StreakPanelPillar) {
    const traits = TRAITS_BY_PILLAR[pillar];
    const nextCatalogPillar = pillarsCatalog.data.find((item) => normalizeCatalogPillar(item.code) === pillar || normalizeCatalogPillar(item.name) === pillar);
    setDraft((current) => ({
      ...current,
      pillar,
      pillarId: nextCatalogPillar?.id ?? null,
      stat: backendUserId
        ? ''
        : (traits.find((trait) => normalizeTraitKey(trait) === normalizeTraitKey(current.stat)) ?? traits[0]),
      traitId: null,
    }));
  }

  function moveTrait(direction: -1 | 1) {
    if (!availableTraits.length) return;
    setDraft((current) => {
      const currentIndex = Math.max(0, availableTraits.findIndex((trait) => (
        (trait.id != null && trait.id === current.traitId)
        || normalizeTraitKey(trait.name) === normalizeTraitKey(current.stat)
      )));
      const nextIndex = (currentIndex + direction + availableTraits.length) % availableTraits.length;
      const nextTrait = availableTraits[nextIndex];
      return { ...current, stat: nextTrait.name, traitId: nextTrait.id };
    });
  }

  async function handleSave() {
    if (savePending) return;
    setSavePending(true);
    setSaveError(null);
    try {
      const selectedDifficulty = difficultyCatalog.data.find((difficulty) => normalizeDifficultyLabel(difficulty.name) === draft.difficultyLabel || normalizeDifficultyLabel(difficulty.code) === draft.difficultyLabel);
      const selectedTrait = availableTraits[selectedTraitIndex];
      const payload = {
        ...draft,
        difficultyId: selectedDifficulty?.id ?? draft.difficultyId,
        pillarId: selectedCatalogPillar?.id ?? draft.pillarId,
        traitId: selectedTrait?.id ?? draft.traitId,
        stat: selectedTrait?.name ?? draft.stat,
      };
      if (backendUserId) {
        const updatePayload: {
          title: string;
          difficultyId?: string;
          pillarId?: string;
          traitId?: string;
        } = {
          title: payload.name.trim() || task.name,
        };
        if (payload.difficultyId) updatePayload.difficultyId = payload.difficultyId;
        if (payload.pillarId) updatePayload.pillarId = payload.pillarId;
        if (payload.traitId) updatePayload.traitId = payload.traitId;
        await updateUserTask(backendUserId, task.id, updatePayload);
      }
      onSave(payload);
    } catch (error) {
      console.error('[mobile-premium] update task failed', error);
      setSaveError('No se pudieron guardar los cambios. Probá de nuevo.');
    } finally {
      setSavePending(false);
    }
  }

  async function handleDelete() {
    if (!backendUserId || deletePending) return;
    setDeletePending(true);
    setDeleteError(null);
    try {
      await deleteUserTask(backendUserId, task.id);
      onDeleted();
      onClose();
    } catch (error) {
      console.error('[mobile-premium] delete task failed', error);
      setDeleteError('No se pudo eliminar la tarea. Probá de nuevo.');
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-end justify-center bg-black/42 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] backdrop-blur-xl">
      <section className="max-h-[88vh] w-full overflow-y-auto rounded-[1.8rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-bg-elevated)] p-5 text-[color:var(--mp-text)] shadow-[0_24px_72px_rgba(0,0,0,0.42)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--mp-text-muted)]">Editar tarea</p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight text-[color:var(--mp-text)]">{task.name}</h2>
          </div>
          <button
            aria-label="Cerrar"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-2xl text-[color:var(--mp-text-secondary)]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-text-muted)]">Tarea</span>
            <input
              className="mt-3 h-12 w-full rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] px-5 text-base text-[color:var(--mp-text)] outline-none"
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              value={draft.name}
            />
          </label>

          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-text-muted)]">Pilar</p>
            <div className="mt-3 grid grid-cols-3 rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-1 text-sm font-semibold">
              {STREAK_PILLARS.map((pillar) => (
                <button
                  className={`min-h-10 rounded-full ${draft.pillar === pillar ? 'bg-violet-400/16 text-[color:var(--mp-violet)]' : 'text-[color:var(--mp-text-secondary)]'}`}
                  key={pillar}
                  onClick={() => selectPillar(pillar)}
                  type="button"
                >
                  {PILLAR_LABELS[pillar]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-text-muted)]">Rasgo</p>
            <div className="mt-3 rounded-[1.35rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-3">
              <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3">
                <button
                  aria-label="Rasgo anterior"
                  className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--mp-border)] text-xl text-[color:var(--mp-text-secondary)]"
                  disabled={!availableTraits.length}
                  onClick={() => moveTrait(-1)}
                  type="button"
                >
                  ‹
                </button>
                <div className="min-w-0 text-center">
                  <p className="truncate text-xl font-semibold text-[color:var(--mp-text)]">{(selectedTrait?.name ?? draft.stat) || 'Cargando catálogo...'}</p>
                  <p className="mt-1 text-xs font-medium text-[color:var(--mp-text-muted)]">
                    {PILLAR_LABELS[draft.pillar]} · {availableTraits.length ? selectedTraitIndex + 1 : 0}/{availableTraits.length}
                  </p>
                </div>
                <button
                  aria-label="Rasgo siguiente"
                  className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--mp-border)] text-xl text-[color:var(--mp-text-secondary)]"
                  disabled={!availableTraits.length}
                  onClick={() => moveTrait(1)}
                  type="button"
                >
                  ›
                </button>
              </div>
              <div className="mt-3 flex justify-center gap-1.5">
                {availableTraits.map((trait) => (
                  <button
                    aria-label={`Seleccionar ${trait.name}`}
                    className={`h-1.5 rounded-full transition-all ${(trait.id != null && draft.traitId === trait.id) || normalizeTraitKey(draft.stat) === normalizeTraitKey(trait.name) ? 'w-5 bg-[color:var(--mp-violet)]' : 'w-1.5 bg-[color:var(--mp-border-strong)]'}`}
                    key={trait.id ?? trait.name}
                    onClick={() => setDraft((current) => ({ ...current, stat: trait.name, traitId: trait.id }))}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-text-muted)]">Dificultad</p>
            <div className="mt-3 flex gap-2">
              {(['Fácil', 'Media', 'Difícil'] as const).map((difficulty) => (
                <button
                  className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${
                    draft.difficultyLabel === difficulty
                      ? 'border-[color:var(--mp-amber)] bg-amber-300/10 text-[color:var(--mp-amber)]'
                      : 'border-[color:var(--mp-border)] text-[color:var(--mp-text-secondary)]'
                  }`}
                  key={difficulty}
                  onClick={() => setDraft((current) => ({
                    ...current,
                    difficultyLabel: difficulty,
                    difficultyId: difficultyCatalog.data.find((item) => normalizeDifficultyLabel(item.name) === difficulty || normalizeDifficultyLabel(item.code) === difficulty)?.id ?? null,
                  }))}
                  type="button"
                >
                  {difficulty}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[0.9fr_1.1fr] gap-3 pt-1">
            <button className="min-h-11 rounded-full border border-[color:var(--mp-border)] px-5 text-sm font-semibold text-[color:var(--mp-text-secondary)]" onClick={onClose} type="button">
              Cancelar
            </button>
            <button className="min-h-11 rounded-full bg-violet-500 px-5 text-sm font-semibold text-white disabled:opacity-50" disabled={savePending} onClick={handleSave} type="button">
              {savePending ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
          {saveError ? <p className="text-xs text-[color:var(--mp-red)]">{saveError}</p> : null}

          {backendUserId ? (
            <div className="border-t border-[color:var(--mp-border)] pt-4">
              {deleteConfirmOpen ? (
                <div className="rounded-[1.1rem] border border-red-300/25 bg-red-400/8 p-4">
                  <p className="text-sm font-semibold text-[color:var(--mp-text)]">Eliminar esta tarea</p>
                  <p className="mt-1 text-xs leading-5 text-[color:var(--mp-text-secondary)]">
                    Se archivará con el flujo existente y dejará de aparecer en tareas activas.
                  </p>
                  {deleteError ? <p className="mt-3 text-xs text-[color:var(--mp-red)]">{deleteError}</p> : null}
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      className="min-h-10 rounded-full border border-[color:var(--mp-border)] px-4 text-sm font-semibold text-[color:var(--mp-text-secondary)]"
                      disabled={deletePending}
                      onClick={() => setDeleteConfirmOpen(false)}
                      type="button"
                    >
                      Cancelar
                    </button>
                    <button
                      className="min-h-10 rounded-full bg-red-400/90 px-4 text-sm font-semibold text-black disabled:opacity-50"
                      disabled={deletePending}
                      onClick={handleDelete}
                      type="button"
                    >
                      {deletePending ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="min-h-11 w-full rounded-full border border-red-300/35 px-5 text-sm font-semibold text-[color:var(--mp-red)]"
                  onClick={() => setDeleteConfirmOpen(true)}
                  type="button"
                >
                  Eliminar tarea
                </button>
              )}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function normalizeTaskSummaries(
  groups: Array<{ pillar: StreakPanelPillar; response: { tasks: StreakPanelTask[] } }>,
  weeklyGoal: number,
): PremiumTaskSummary[] {
  const byId = new Map<string, PremiumTaskSummary>();
  groups.forEach(({ pillar, response }) => {
    response.tasks.forEach((task) => {
      if (byId.has(task.id)) return;
      byId.set(task.id, {
        id: task.id,
        name: task.name,
        pillar,
        stat: task.stat,
        difficultyLabel: task.difficultyLabel ?? null,
        weeklyGoal,
        streakDays: task.streakDays,
        latestRecalibrationAction: normalizeRecalibrationAction(task.latestRecalibrationAction ?? task.recalibration?.latest?.action),
        lifecycleStatus: task.lifecycleStatus ?? null,
        monthWeeks: task.metrics.month?.weeks ?? [],
      });
    });
  });
  return Array.from(byId.values());
}

function buildDetail(task: PremiumTaskSummary, insights: TaskInsightsResponse, weeklyGoal: number) {
  const latest = insights.recalibration?.latest ?? insights.recalibration?.history?.[0] ?? null;
  const latestRecalibrationAction = normalizeRecalibrationAction(latest?.action) ?? task.latestRecalibrationAction;
  const difficultyLabel = insights.task.difficultyLabel ?? task.difficultyLabel;
  const score = resolveScore(insights, task, weeklyGoal);
  const rawCurrentStreak = Math.max(0, Math.round(task.streakDays || insights.weeks.currentStreak || 0));
  const rawBestStreak = Math.max(rawCurrentStreak, Math.round(insights.weeks.bestStreak || 0));
  const currentStreak = rawCurrentStreak >= 2 ? rawCurrentStreak : 0;
  const bestStreak = rawBestStreak >= 2 ? rawBestStreak : 0;
  return {
    id: task.id,
    name: insights.task.name ?? task.name,
    stat: insights.task.stat ?? task.stat,
    difficultyLabel,
    latestRecalibrationAction,
    score,
    lifecycleLabel: formatLifecycleStatus(insights.task.lifecycleStatus ?? task.lifecycleStatus, insights.previewAchievement?.status, score),
    insight: resolveInsight(score),
    activeWindow: resolveActiveWindow(insights),
    streaks: {
      current: currentStreak,
      best: bestStreak,
    },
    difficultyAdjustments: resolveDifficultyAdjustments(insights, difficultyLabel),
  };
}

function resolveScore(insights: TaskInsightsResponse, task: PremiumTaskSummary, weeklyGoal: number) {
  const previewScore = Number(insights.previewAchievement?.score);
  if (Number.isFinite(previewScore) && previewScore >= 0) {
    return Math.round(Math.min(100, previewScore));
  }
  const weeks = insights.weeks.timeline.length > 0 ? insights.weeks.timeline.map((week) => week.count) : task.monthWeeks;
  const total = weeks.reduce((sum, value) => sum + Number(value ?? 0), 0);
  return Math.round(Math.min(100, Math.max(0, (total / Math.max(weeks.length * weeklyGoal, 1)) * 100)));
}

function resolveActiveWindow(insights: TaskInsightsResponse): ActiveWindowMonth[] {
  const recent = insights.previewAchievement?.recentMonths ?? [];
  const months: ActiveWindowMonth[] = recent
    .map((entry): ActiveWindowMonth | null => {
      const raw = entry.projectedCompletionRate ?? entry.completionRate ?? entry.value ?? 0;
      const normalized = normalizeCompletionPercent(raw);
      const month = entry.month ?? formatMonthFromPeriod(entry.periodKey);
      if (!month) return null;
      return {
        periodKey: entry.periodKey ?? null,
        month,
        percent: Math.round(Math.max(0, Math.min(100, normalized))),
        projected: entry.closed === false || entry.projectedCompletionRate != null,
      };
    })
    .filter((entry): entry is ActiveWindowMonth => entry !== null);

  if (months.length > 0) {
    return months
      .sort((a, b) => resolveMonthSortKey(a) - resolveMonthSortKey(b))
      .slice(-4);
  }
  const currentPeriod = new Date().toISOString().slice(0, 7);
  return [{ periodKey: currentPeriod, month: formatMonthFromPeriod(currentPeriod) ?? 'Mes', percent: 0, projected: true }];
}

function buildActivity(scope: ActivityScope, insights: TaskInsightsResponse, weeklyGoal: number) {
  if (scope === 'W') {
    return {
      mode: 'day' as const,
      bars: buildLastSevenDays(insights.month.days).map((day) => ({
        label: day.label,
        value: day.value,
        target: 1,
        complete: day.value > 0,
      })),
    };
  }
  if (scope === '3M') {
    const months = buildThreeMonthActivity(insights, weeklyGoal);
    return {
      mode: 'month' as const,
      bars: months,
    };
  }
  const weeks = buildCurrentMonthWeeks(insights.month.days, weeklyGoal);
  return {
    mode: 'week' as const,
    bars: weeks,
  };
}

function ActivityBars({
  activity,
}: {
  activity: ReturnType<typeof buildActivity>;
}) {
  const height = activity.mode === 'day' ? 'h-20' : 'h-24';
  const columns = activity.mode === 'day' ? 'grid-cols-7' : activity.mode === 'month' ? 'grid-cols-3' : 'grid-cols-5';
  return (
    <div className={`mx-auto grid w-full max-w-[22rem] ${columns} items-end gap-2.5`}>
      {activity.bars.map((bar, index) => (
        <ActivityCompletionBar bar={bar} heightClass={height} key={`${bar.label}-${index}`} />
      ))}
    </div>
  );
}

function ActivityCompletionBar({ bar, heightClass }: { bar: ActivityBar; heightClass: string }) {
  const pct = bar.empty ? 0 : Math.min(100, Math.max(10, (bar.value / Math.max(bar.target, 1)) * 100));
  const color = bar.complete ? 'var(--mp-green)' : bar.projected ? 'var(--mp-amber)' : 'var(--mp-track-strong)';
  return (
    <div className="text-center">
      <div className={`relative mx-auto flex ${heightClass} w-6 items-end rounded-full bg-[color:var(--mp-track)]`}>
        <span className="absolute left-1/2 top-0 h-0.5 w-9 -translate-x-1/2 rounded-full bg-[color:var(--mp-track-strong)]" />
        {!bar.empty ? <div className="w-full rounded-full" style={{ height: `${pct}%`, backgroundColor: color }} /> : null}
      </div>
      <p className="mt-2 text-xs text-[color:var(--mp-text-secondary)]">{bar.label}</p>
      <p className="text-sm font-semibold" style={{ color }}>{bar.caption ?? `${bar.value}/${bar.target}`}</p>
    </div>
  );
}

function MonthHealthDot({ month, percent, projected }: ActiveWindowMonth) {
  const tone = getScoreTone(percent);
  return (
    <div className="text-center">
      <div
        className={`relative mx-auto grid h-12 w-12 place-items-center rounded-full border-2 bg-transparent text-xs font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.24)] ${projected ? 'shadow-[0_0_26px_rgba(245,197,89,0.12)]' : ''}`}
        style={{ borderColor: tone.color, color: tone.color }}
      >
        {projected ? (
          <span
            aria-hidden="true"
            className="absolute -inset-1.5 rounded-full border border-dashed opacity-70 motion-safe:animate-spin"
            style={{ borderColor: tone.color, animationDuration: '5s' }}
          />
        ) : null}
        {percent}%
      </div>
      <p className="mt-2 text-xs text-[color:var(--mp-text-secondary)]">{month}</p>
      {projected ? <p className="-mt-0.5 text-[9px] text-[color:var(--mp-text-muted)]">proyectado</p> : null}
    </div>
  );
}

function DifficultyAdjustmentRow({
  adjustment,
}: {
  adjustment: ReturnType<typeof resolveDifficultyAdjustments>[number];
}) {
  const tone = getActionTone(adjustment.action);
  return (
    <div className="grid grid-cols-[24px_68px_1fr_16px] items-center gap-3 border-b border-[color:var(--mp-border)] px-4 py-3 last:border-b-0">
      <span className="grid h-4 w-4 place-items-center rounded-full" style={{ color: tone.color }}>
        {adjustment.action === 'keep' ? '•' : adjustment.action === 'down' ? '↓' : '↑'}
      </span>
      <span className="text-sm font-semibold" style={{ color: tone.color }}>{adjustment.date}</span>
      <span className="text-sm text-[color:var(--mp-text-secondary)]">{adjustment.label}</span>
      <span className="text-2xl font-light text-[color:var(--mp-text-secondary)]">›</span>
    </div>
  );
}

function RecalibrationPulseChip({
  action,
  chip,
}: {
  action: RecalibrationAction | null;
  chip: ReturnType<typeof resolveRecalibrationChip>;
}) {
  const shouldAnimate = Boolean(action);
  return (
    <>
      <style>
        {`
          @keyframes mpRecalChipCollapse {
            0%, 68% { width: 9.5rem; padding-left: 0.45rem; padding-right: 0.8rem; }
            100% { width: 2rem; padding-left: 0; padding-right: 0; }
          }
          @keyframes mpRecalChipLabel {
            0%, 58% { opacity: 1; transform: translateX(0); }
            100% { opacity: 0; transform: translateX(-0.35rem); }
          }
        `}
      </style>
      <span
        className="relative inline-flex min-h-8 items-center overflow-hidden rounded-full border text-xs font-semibold shadow-[0_0_18px_rgba(245,197,89,0.12)]"
        style={{
          backgroundColor: chip.color,
          borderColor: chip.color,
          color: chip.text,
          width: shouldAnimate ? '9.5rem' : undefined,
          animation: shouldAnimate ? 'mpRecalChipCollapse 3.2s ease-in-out 0.25s forwards' : undefined,
        }}
      >
        <span className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full leading-none">
          <RecalibrationGlyph chip={chip} />
        </span>
        {shouldAnimate ? (
          <span
            className="ml-8 whitespace-nowrap pr-3"
            style={{ animation: 'mpRecalChipLabel 3.2s ease-in-out 0.25s forwards' }}
          >
            {chip.label}
          </span>
        ) : null}
      </span>
    </>
  );
}

function RecalibrationGlyph({ chip }: { chip: ReturnType<typeof resolveRecalibrationChip> }) {
  if (chip.collapsedLabel === '•') {
    return (
      <span
        className="block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: chip.marker ?? chip.text }}
      />
    );
  }

  return (
    <span
      className="text-xl font-semibold leading-none"
      style={{ color: chip.marker ?? chip.text }}
    >
      {chip.collapsedLabel}
    </span>
  );
}

function resolveDifficultyAdjustments(insights: TaskInsightsResponse, fallbackDifficulty: string | null) {
  const history = insights.recalibration?.history ?? [];
  if (history.length === 0) {
    return [];
  }
  return history.slice(0, 3).map((record) => {
    const action = normalizeRecalibrationAction(record.action) ?? 'keep';
    const before = record.difficultyBefore ?? fallbackDifficulty;
    const after = record.difficultyAfter ?? fallbackDifficulty;
    return {
      date: formatShortDate(record.recalibratedAt ?? record.periodEnd ?? record.periodStart),
      action,
      label: buildAdjustmentLabel(action, before, after),
    };
  });
}

function buildLastSevenDays(days: Array<{ date: string; count: number }>) {
  const byDate = new Map(days.map((day) => [day.date, day.count]));
  const latest = startOfLocalDate(new Date());
  const labels = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(latest);
    date.setDate(latest.getDate() - (6 - index));
    const key = toLocalDateKey(date);
    return {
      label: labels[date.getDay()] ?? '',
      value: byDate.get(key) ?? 0,
    };
  });
}

function buildCurrentMonthWeeks(days: Array<{ date: string; count: number }>, weeklyGoal: number): ActivityBar[] {
  const today = startOfLocalDate(new Date());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const weekCount = Math.ceil((monthEnd.getDate() + monthStart.getDay()) / 7);
  const byDate = new Map(days.map((day) => [day.date, day.count]));
  return Array.from({ length: weekCount }, (_, index) => {
    const startDay = 1 + index * 7 - monthStart.getDay();
    const endDay = Math.min(monthEnd.getDate(), startDay + 6);
    let value = 0;
    for (let day = Math.max(1, startDay); day <= endDay; day += 1) {
      const key = toLocalDateKey(new Date(today.getFullYear(), today.getMonth(), day));
      value += byDate.get(key) ?? 0;
    }
    return {
      label: `sem ${index + 1}`,
      value,
      target: weeklyGoal,
      complete: value >= weeklyGoal,
    };
  });
}

function startOfLocalDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toLocalDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function resolveMonthSortKey(month: ActiveWindowMonth) {
  if (month.periodKey && /^\d{4}-\d{2}/.test(month.periodKey)) {
    const [year, rawMonth] = month.periodKey.split('-').map(Number);
    return year * 12 + rawMonth;
  }
  const parsed = new Date(`${month.month} 1, ${new Date().getFullYear()}`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getFullYear() * 12 + parsed.getMonth() + 1;
}

function buildThreeMonthActivity(insights: TaskInsightsResponse, weeklyGoal: number): ActivityBar[] {
  const recentMonths = insights.previewAchievement?.recentMonths ?? [];
  const currentPeriodKey = insights.previewAchievement?.currentMonth?.periodKey ?? new Date().toISOString().slice(0, 7);
  if (recentMonths.length > 0 || currentPeriodKey) {
    const byPeriod = new Map(recentMonths.flatMap((entry) => (entry.periodKey ? [[entry.periodKey, entry] as const] : [])));
    return buildTrailingPeriodKeys(currentPeriodKey, 3).map((periodKey, index, periods) => {
      const entry = byPeriod.get(periodKey);
      const isCurrent = index === periods.length - 1;
      if (!entry) {
        return {
          label: formatMonthFromPeriod(periodKey) ?? 'Mes',
          value: 0,
          target: 5,
          complete: false,
          caption: isCurrent ? 'Sin registro' : 'Sin datos',
          empty: true,
          projected: isCurrent,
        };
      }
      const raw = isCurrent
        ? entry.projectedCompletionRate ?? entry.completionRate ?? entry.value ?? 0
        : entry.completionRate ?? entry.value ?? 0;
      const percent = Math.min(100, normalizeCompletionPercent(raw));
      const complete = percent >= 80;
      return {
        label: entry.month ?? formatMonthFromPeriod(periodKey) ?? 'Mes',
        value: Math.max(0, percent / 20),
        target: 5,
        complete,
        caption: `${Math.round(percent)}%${isCurrent ? ' proy.' : ''}`,
        projected: isCurrent,
      };
    });
  }

  const weeks = insights.weeks.timeline.slice(-13);
  const chunks = [weeks.slice(0, 4), weeks.slice(4, 8), weeks.slice(8, 13)];
  return chunks.map((chunk, index) => {
    const hitWeeks = chunk.filter((week) => week.count >= weeklyGoal || week.hit).length;
    const totalWeeks = Math.max(chunk.length, 1);
    return {
      label: resolveFallbackMonthLabel(index),
      value: hitWeeks,
      target: totalWeeks,
      complete: hitWeeks / totalWeeks >= 0.8,
      caption: `${hitWeeks}/${totalWeeks}`,
    };
  });
}

function buildTrailingPeriodKeys(currentPeriodKey: string, count: number) {
  const [yearValue, monthValue] = currentPeriodKey.split('-').map(Number);
  const current = Number.isFinite(yearValue) && Number.isFinite(monthValue)
    ? new Date(yearValue, monthValue - 1, 1)
    : new Date();
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(current.getFullYear(), current.getMonth() - (count - 1 - index), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
}

function normalizeCompletionPercent(rawValue: number) {
  const raw = Number(rawValue);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw <= 2 ? raw * 100 : raw;
}

function resolveFallbackMonthLabel(index: number) {
  return ['Mar', 'Abr', 'May'][index] ?? `M${index + 1}`;
}

function resolveRecalibrationChip(action: RecalibrationAction | null, difficultyLabel: string | null) {
  if (action === 'up') return { label: 'Subió dificultad', collapsedLabel: '↑', color: 'var(--mp-red)', text: '#220707', marker: '#220707' };
  if (action === 'down') return { label: 'Bajó dificultad', collapsedLabel: '↓', color: 'var(--mp-green)', text: '#04170b', marker: '#04170b' };
  if (action === 'keep') return { label: 'Se mantuvo', collapsedLabel: '•', color: 'var(--mp-amber)', text: '#201303', marker: '#201303' };
  const tone = resolveDifficultyToneVars(difficultyLabel);
  return { label: difficultyLabel ?? 'Media', collapsedLabel: difficultyLabel ?? 'Media', ...tone, text: 'var(--mp-text)', marker: 'var(--mp-text)' };
}

function buildAdjustmentLabel(action: RecalibrationAction, before: string | null | undefined, after: string | null | undefined) {
  const beforeLabel = before ?? 'Media';
  const afterLabel = after ?? beforeLabel;
  if (action === 'up') return `Subió de ${beforeLabel} a ${afterLabel}`;
  if (action === 'down') return `Bajó de ${beforeLabel} a ${afterLabel}`;
  return `Se mantuvo en ${afterLabel}`;
}

function resolveWeeklyGoal(gameMode: string | null, weeklyTarget: number | null) {
  if (weeklyTarget && weeklyTarget > 0) return Math.max(1, Math.round(weeklyTarget));
  const mode = normalizeGameModeValue(gameMode) ?? 'Flow';
  return MODE_TIERS[mode];
}

function scopeToRange(scope: ActivityScope) {
  if (scope === 'W') return 'week';
  if (scope === '3M') return 'qtr';
  return 'month';
}

function normalizeRecalibrationAction(value: string | null | undefined): RecalibrationAction | null {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'up' || normalized === 'keep' || normalized === 'down') return normalized;
  return null;
}

function formatLifecycleStatus(value: string | null | undefined, previewStatus: string | null | undefined, score: number) {
  const source = (value ?? previewStatus ?? '').toLowerCase();
  if (source === 'achieved' || source === 'maintained' || source === 'strong') return 'Hábito logrado';
  if (source === 'stored') return 'Hábito guardado';
  return habitDevelopmentStatusLabel(score);
}

function resolveInsight(score: number) {
  if (score >= 80) return 'Estás sosteniendo este hábito con mucha consistencia.';
  if (score >= 50) return 'Estás avanzando de forma constante.';
  return 'Necesita más consistencia durante la ventana activa.';
}

function getScoreTone(score: number) {
  if (score < 50) return { color: 'var(--mp-red)' };
  if (score < 80) return { color: 'var(--mp-amber)' };
  return { color: 'var(--mp-green)' };
}

function getActionTone(action: RecalibrationAction) {
  if (action === 'up') return { color: 'var(--mp-red)' };
  if (action === 'down') return { color: 'var(--mp-green)' };
  return { color: 'var(--mp-amber)' };
}

function resolveDifficultyToneVars(difficulty: string | null) {
  const normalized = (difficulty ?? '').toLowerCase();
  if (normalized.includes('fácil') || normalized.includes('facil') || normalized.includes('easy')) {
    return { color: 'var(--mp-green)', bg: 'rgba(74,222,128,0.12)' };
  }
  if (normalized.includes('difícil') || normalized.includes('dificil') || normalized.includes('hard')) {
    return { color: 'var(--mp-red)', bg: 'rgba(248,113,113,0.12)' };
  }
  return { color: 'var(--mp-amber)', bg: 'rgba(251,191,36,0.12)' };
}

function formatMonthFromPeriod(value: string | null | undefined) {
  if (!value) return null;
  const parsed = new Date(`${value.slice(0, 7)}-01T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('es', { month: 'short' }).format(parsed).replace('.', '');
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 6);
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(parsed).replace('.', '');
}

function matchesSleep(row: PremiumTaskSummary) {
  const text = `${row.name} ${row.stat}`.toLowerCase();
  return text.includes('sue') || text.includes('dorm') || text.includes('sleep');
}
