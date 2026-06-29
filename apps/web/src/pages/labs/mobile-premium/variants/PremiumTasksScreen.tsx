import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useRequest } from '../../../../hooks/useRequest';
import { useCreateTask } from '../../../../hooks/useUserTasks';
import { QUICK_START_TASKS, type QuickStartTask } from '../../../../onboarding/quickStart';
import { usePostLoginLanguage } from '../../../../i18n/postLoginLanguage';
import {
  fetchCatalogDifficulties,
  fetchCatalogPillars,
  fetchCatalogTraits,
  type Difficulty,
  type Pillar,
  type Trait,
} from '../../../../lib/api/catalogs';
import {
  getUserStreakPanel,
  type StreakPanelPillar,
  type StreakPanelTask,
  type UserTask,
} from '../../../../lib/api';
import { normalizeGameModeValue, type GameMode } from '../../../../lib/gameMode';
import { TraitIcon } from '../MobilePremiumPrimitives';
import { useMobilePremiumBasePath } from '../mobilePremiumRouting';

const STREAK_PILLARS: StreakPanelPillar[] = ['Body', 'Mind', 'Soul'];
const MODE_TIERS: Record<GameMode, number> = {
  Low: 1,
  Chill: 2,
  Flow: 3,
  Evolve: 4,
};

type TaskListFilter = 'all' | 'streak' | 'hide-achieved';
type PillarFilter = StreakPanelPillar | null;

export type PremiumTaskRow = {
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
  latestRecalibrationAction?: 'up' | 'keep' | 'down' | null;
  achievementSealVisible?: boolean;
  lifecycleStatus?: string | null;
};

type TaskDraft = {
  difficultyLabel: NonNullable<PremiumTaskRow['difficultyLabel']>;
  name: string;
  pillar: StreakPanelPillar;
  stat: string;
};

type SuggestedTask = TaskDraft & {
  id: string;
  difficultyCode: string;
  reason: string;
  traitCode: string;
};

const QUICK_START_SELECTED_MOCK = new Set([
  'Body-SUENO',
  'Body-HIDRATACION',
  'Body-MOVILIDAD',
  'Mind-ENFOQUE',
  'Mind-APRENDIZAJE',
  'Soul-GRATITUD',
]);

const TASK_SUGGESTIONS: SuggestedTask[] = (['Body', 'Mind', 'Soul'] as StreakPanelPillar[]).flatMap((pillar) =>
  QUICK_START_TASKS.es[pillar]
    .filter((task) => !QUICK_START_SELECTED_MOCK.has(`${pillar}-${task.id}`))
    .map((task) => buildQuickStartSuggestion(pillar, task)),
);

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
    monthlyCount: 8,
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
    monthlyCount: 8,
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
    monthlyCount: 0,
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
    monthlyCount: 8,
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
    monthlyCount: 4,
  },
  {
    id: 'premium-focus',
    name: 'Planificar el día',
    stat: 'Enfoque',
    pillar: 'Mind',
    difficultyLabel: 'Media',
    weeklyDone: 3,
    weeklyGoal: 3,
    streakDays: 9,
    monthWeeks: [3, 3, 3, 0, 0],
    monthlyCount: 12,
    achievementSealVisible: true,
    lifecycleStatus: 'maintained',
  },
  {
    id: 'premium-gratitude',
    name: 'Escribir gratitud',
    stat: 'Gratitud',
    pillar: 'Soul',
    difficultyLabel: 'Fácil',
    weeklyDone: 3,
    weeklyGoal: 3,
    streakDays: 14,
    monthWeeks: [3, 3, 3, 0, 0],
    monthlyCount: 12,
    achievementSealVisible: true,
    lifecycleStatus: 'maintained',
  },
];

export function PremiumTasksScreen({
  addedTasks,
  backendUserId,
  gameMode,
  onAddSuggestedTasks,
  weeklyTarget,
  onNewTask,
  onboardingEditCue = false,
  onboardingPreview = false,
}: {
  addedTasks?: PremiumTaskRow[];
  backendUserId: string | null;
  gameMode: string | null;
  onAddSuggestedTasks?: (tasks: PremiumTaskRow[]) => void;
  weeklyTarget: number | null;
  onNewTask?: () => void;
  onboardingEditCue?: boolean;
  onboardingPreview?: boolean;
}) {
  const { language, t } = usePostLoginLanguage();
  const [listFilter, setListFilter] = useState<TaskListFilter>('all');
  const [pillarFilter, setPillarFilter] = useState<PillarFilter>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [internalAddedTasks, setInternalAddedTasks] = useState<PremiumTaskRow[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);
  const createTaskMutation = useCreateTask();
  const localTasks = addedTasks ?? internalAddedTasks;
  const weeklyGoal = resolveWeeklyGoal(gameMode, weeklyTarget);
  const normalizedMode = normalizeGameModeValue(gameMode) ?? 'Flow';
  const catalogsRequest = useRequest(
    async () => {
      const [pillars, difficulties] = await Promise.all([
        fetchCatalogPillars(),
        fetchCatalogDifficulties(),
      ]);
      const traitsByPillar = await Promise.all(
        pillars.map(async (pillar) => ({
          pillar,
          traits: await fetchCatalogTraits(pillar.id),
        })),
      );
      return {
        difficulties,
        pillars,
        traits: traitsByPillar.flatMap((entry) => entry.traits),
      };
    },
    [],
    { enabled: Boolean(backendUserId) },
  );
  const { data } = useRequest(
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

  const rows = useMemo(() => {
    const sourceRows = data ? normalizePremiumTaskRows(data, weeklyGoal) : backendUserId || onboardingPreview ? [] : FALLBACK_PREMIUM_TASK_ROWS;
    const mergedRows = backendUserId ? sourceRows : [...localTasks, ...sourceRows];
    const seen = new Set<string>();
    const uniqueRows = mergedRows.filter((row) => {
      const key = `${row.pillar}-${row.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return uniqueRows.filter((row) => {
      if (pillarFilter && row.pillar !== pillarFilter) return false;
      if (listFilter === 'streak' && !hasActiveStreak(row)) return false;
      if (listFilter === 'hide-achieved' && isAchievedHabit(row)) return false;
      return true;
    });
  }, [backendUserId, data, listFilter, localTasks, onboardingPreview, pillarFilter, weeklyGoal]);

  const handleApplySuggestions = async (suggestions: SuggestedTask[]) => {
    setSuggestionsError(null);

    let created: PremiumTaskRow[];
    if (backendUserId) {
      try {
        const persisted = await Promise.all(
          suggestions.map(async (suggestion) => {
            const payload = buildSuggestedTaskCreatePayload(suggestion, catalogsRequest.data);
            if (!payload) {
              throw new Error(language === 'es' ? 'No se pudo resolver la categoría de la tarea.' : 'Could not resolve the task category.');
            }

            return {
              suggestion,
              task: await createTaskMutation.createTask(backendUserId, payload),
            };
          }),
        );
        created = persisted.map(({ suggestion, task }) => buildTaskRowFromUserTask(task, suggestion, weeklyGoal));
      } catch (error) {
        const message = error instanceof Error ? error.message : language === 'es' ? 'No se pudieron crear las tareas.' : 'Could not create the tasks.';
        setSuggestionsError(message);
        return;
      }
    } else {
      created = suggestions.map((suggestion) =>
        buildLocalTaskFromDraft(suggestion, weeklyGoal, `premium-${suggestion.id}`),
      );
    }

    if (onAddSuggestedTasks) {
      onAddSuggestedTasks(created);
    } else {
      setInternalAddedTasks((current) => [...created, ...current]);
    }
    setSuggestionsOpen(false);
  };

  return (
    <section className="space-y-6">
      <style>
        {`
          @keyframes mpTasksWeekRise {
            from { opacity: 0.24; transform: scaleY(0.08); }
            to { opacity: 1; transform: scaleY(1); }
          }
          @keyframes mpTasksRingLoad {
            from { stroke-dashoffset: var(--mp-ring-length); }
            to { stroke-dashoffset: var(--mp-ring-offset); }
          }
          @keyframes mpOnboardingTaskCue {
            0%, 100% { box-shadow: 0 0 0 0 rgba(167,139,250,.08); }
            50% { box-shadow: 0 0 0 5px rgba(167,139,250,.2), 0 0 34px rgba(167,139,250,.18); }
          }
          .mp-onboarding-task-cue { animation: mpOnboardingTaskCue 1.8s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .mp-tasks-week-bar, .mp-tasks-ring-progress, .mp-onboarding-task-cue { animation: none !important; }
          }
        `}
      </style>
      {onboardingEditCue ? (
        <div className="rounded-[1.25rem] border border-[color:var(--mp-violet)] bg-violet-400/10 px-4 py-3 shadow-[0_0_30px_rgba(167,139,250,0.14)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--mp-violet)]">{t('mobilePremium.tasks.nextStep')}</p>
          <p className="mt-1 text-sm font-semibold text-[color:var(--mp-text)]">{t('mobilePremium.tasks.nextStepBody')}</p>
        </div>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <button
          aria-label={t('mobilePremium.tasks.suggestionsA11y')}
          className="grid h-11 w-11 place-items-center rounded-full border border-[color:var(--mp-border)] bg-transparent text-lg text-[color:var(--mp-violet)]"
          onClick={() => setSuggestionsOpen(true)}
          type="button"
        >
          ✦
        </button>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-violet-400 px-4 text-sm font-semibold text-[#11091c] shadow-[0_14px_34px_rgba(167,139,250,0.24)]"
          onClick={onNewTask}
          type="button"
        >
          <span className="text-xl leading-none">+</span>
          {t('mobilePremium.tasks.new')}
        </button>
      </div>

      <div className="flex items-center gap-3 pb-1">
        <div className="relative shrink-0">
          <button
            aria-expanded={filterMenuOpen}
            aria-label={t('mobilePremium.tasks.filterA11y')}
            className={`grid min-h-11 w-11 place-items-center rounded-full border transition ${
              listFilter !== 'all' || filterMenuOpen
                ? 'border-[color:var(--mp-violet-strong)] bg-[color:var(--mp-toggle-active-bg)] text-[color:var(--mp-violet-strong)] shadow-[inset_0_0_0_1px_var(--mp-violet-strong)]'
                : 'border-[color:var(--mp-border)] text-[color:var(--mp-text-secondary)]'
            }`}
            onClick={() => setFilterMenuOpen((open) => !open)}
            type="button"
          >
            <FilterGlyph />
          </button>
          {filterMenuOpen ? (
            <TaskListFilterMenu
              activeFilter={listFilter}
              onSelect={(nextFilter) => {
                setListFilter(nextFilter);
                setFilterMenuOpen(false);
              }}
            />
          ) : null}
        </div>
        <div className="flex min-w-0 flex-1 gap-3 overflow-x-auto [scrollbar-width:none]">
          {STREAK_PILLARS.map((value) => (
            <button
              className={`min-h-11 shrink-0 rounded-full border px-6 text-sm font-semibold transition ${
                pillarFilter === value
                  ? 'border-[color:var(--mp-violet-strong)] bg-[color:var(--mp-toggle-active-bg)] text-[color:var(--mp-violet-strong)] shadow-[inset_0_0_0_1px_var(--mp-violet-strong)]'
                  : 'border-[color:var(--mp-border)] text-[color:var(--mp-text-secondary)]'
              }`}
              key={value}
              onClick={() => setPillarFilter((current) => current === value ? null : value as StreakPanelPillar)}
              type="button"
            >
              {translatePillar(value, t)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_64px_92px] gap-3 border-b border-[color:var(--mp-border)] pb-2 text-xs text-[color:var(--mp-text-muted)]">
        <span>{t('mobilePremium.tasks.task')}</span>
        <span className="text-center">{t('mobilePremium.tasks.weeks')}</span>
        <span className="text-right">{t('mobilePremium.tasks.progress')}</span>
      </div>

      <div>
        {rows.map((task, index) => (
          <PremiumTaskProgressRow key={`${task.pillar}-${task.id}`} onboardingCue={onboardingEditCue && index === 0} task={task} />
        ))}
      </div>
      {suggestionsOpen ? (
        <TaskSuggestionsSheet
          existingTaskKeys={new Set(localTasks.flatMap((task) => [task.id, normalizeTaskKey(task.name)]))}
          isApplying={createTaskMutation.status === 'loading'}
          error={suggestionsError}
          onApply={handleApplySuggestions}
          onClose={() => {
            setSuggestionsError(null);
            setSuggestionsOpen(false);
          }}
        />
      ) : null}
    </section>
  );
}

function FilterGlyph() {
  return (
    <span aria-hidden="true" className="flex h-5 w-5 flex-col items-center justify-center gap-[4px]">
      <span className="h-[2px] w-5 rounded-full bg-current" />
      <span className="h-[2px] w-3.5 rounded-full bg-current" />
      <span className="h-[2px] w-2 rounded-full bg-current" />
    </span>
  );
}

function TaskListFilterMenu({
  activeFilter,
  onSelect,
}: {
  activeFilter: TaskListFilter;
  onSelect: (filter: TaskListFilter) => void;
}) {
  const { t } = usePostLoginLanguage();
  const options: Array<{ label: string; value: TaskListFilter }> = [
    { label: t('mobilePremium.tasks.filter.all'), value: 'all' },
    { label: t('mobilePremium.tasks.filter.streak'), value: 'streak' },
    { label: t('mobilePremium.tasks.filter.hideAchieved'), value: 'hide-achieved' },
  ];

  return (
    <div className="absolute left-0 top-[calc(100%+0.6rem)] z-20 w-[14.5rem] overflow-hidden rounded-[1rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-bg-elevated)] p-1.5 shadow-[0_18px_46px_rgba(0,0,0,0.45)]">
      {options.map((option) => {
        const active = activeFilter === option.value;
        return (
          <button
            className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-[0.8rem] px-3 text-left text-sm font-semibold transition ${
              active
                ? 'bg-violet-400/12 text-[color:var(--mp-violet)]'
                : 'text-[color:var(--mp-text-secondary)] hover:bg-white/5 hover:text-[color:var(--mp-text)]'
            }`}
            key={option.value}
            onClick={() => onSelect(option.value)}
            type="button"
          >
            <span className="min-w-0 truncate">{option.label}</span>
            {active ? <span className="shrink-0 text-xs text-[color:var(--mp-violet)]">✓</span> : null}
          </button>
        );
      })}
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
        weeklyDone: task.metrics.week?.count ?? task.weekDone ?? 0,
        weeklyGoal,
        streakDays: task.streakDays,
        monthWeeks: task.metrics.month?.weeks ?? [],
        monthlyCount: task.metrics.month?.count ?? undefined,
        latestRecalibrationAction: normalizeRecalibrationAction(task.latestRecalibrationAction ?? task.recalibration?.latest?.action),
        achievementSealVisible: task.achievementSealVisible,
        lifecycleStatus: task.lifecycleStatus ?? null,
      });
    });
  });
  return Array.from(byId.values());
}

function hasActiveStreak(task: PremiumTaskRow) {
  return task.streakDays >= 2;
}

function isAchievedHabit(task: PremiumTaskRow) {
  return Boolean(task.achievementSealVisible || task.lifecycleStatus === 'achieved' || task.lifecycleStatus === 'maintained');
}

function PremiumTaskProgressRow({ onboardingCue = false, task }: { onboardingCue?: boolean; task: PremiumTaskRow }) {
  const { language, t } = usePostLoginLanguage();
  const labBase = useMobilePremiumBasePath();
  const difficultyTone = resolveDifficultyTone(task.difficultyLabel);
  const progress = `${task.weeklyDone}/${task.weeklyGoal}`;
  const progressValue = computeProgressPercent(task.weeklyDone, task.weeklyGoal);
  const shouldShowHabitLanguage = isAchievedHabit(task);
  const hasStreak = hasActiveStreak(task);

  return (
    <Link
      className={`grid w-full items-center gap-3 rounded-[1rem] border-b border-[color:var(--mp-border)] py-5 text-left last:border-b-0 ${
        onboardingCue ? 'mp-onboarding-task-cue bg-violet-400/8 px-2' : ''
      } grid-cols-[44px_minmax(0,1fr)_118px]`}
      to={`${labBase}/task-detail?taskId=${encodeURIComponent(task.id)}`}
    >
      <TaskLeadingBadge hasStreak={hasStreak} stat={task.stat} streakDays={task.streakDays} />
      <div className="min-w-0 overflow-hidden pr-1">
        <p className="truncate text-[1.1rem] leading-7 text-[color:var(--mp-text)]">{translateTaskText(task.name, language)}</p>
        <div className="mt-1 flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden text-xs text-[color:var(--mp-text-secondary)]">
          <span className="min-w-0 max-w-[7rem] truncate">{translateTaskText(task.stat, language)}</span>
          <span className="shrink-0 text-[color:var(--mp-text-muted)]">·</span>
          {task.difficultyLabel ? (
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${difficultyTone}`}>
              {translateDifficulty(task.difficultyLabel, t)}
            </span>
          ) : null}
          {task.achievementSealVisible ? (
            <span
              aria-label={t('mobilePremium.tasks.achievedHabit')}
              className="ml-0.5 shrink-0 text-[0.72rem] font-semibold text-[color:var(--mp-violet-strong)]"
              title={t('mobilePremium.tasks.achievedHabit')}
            >
              ✦
            </span>
          ) : null}
        </div>
        {shouldShowHabitLanguage ? (
          <p className="mt-1 text-xs font-medium text-[color:var(--mp-text-muted)]">{t('mobilePremium.tasks.habit')}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-[58px_42px_10px] items-center gap-2 justify-self-end">
        <CompactMonthWeeks weeks={task.monthWeeks} weeklyGoal={task.weeklyGoal} />
        <TinyProgressRing label={progress} value={progressValue} />
        <span className="text-2xl font-light text-[color:var(--mp-text-secondary)]">›</span>
      </div>
    </Link>
  );
}

function TaskSuggestionsSheet({
  error,
  existingTaskKeys,
  isApplying,
  onApply,
  onClose,
}: {
  error: string | null;
  existingTaskKeys: Set<string>;
  isApplying: boolean;
  onApply: (suggestions: SuggestedTask[]) => void | Promise<void>;
  onClose: () => void;
}) {
  const { language, t } = usePostLoginLanguage();
  const [selected, setSelected] = useState<string[]>([]);
  const [choosingDifficulty, setChoosingDifficulty] = useState<string | null>(null);
  const [confirmingTaskId, setConfirmingTaskId] = useState<string | null>(null);
  const [difficultyByTask, setDifficultyByTask] = useState<Record<string, TaskDraft['difficultyLabel']>>({});
  const selectedSuggestions = TASK_SUGGESTIONS.filter((task) => selected.includes(task.id));
  const visibleSuggestions = TASK_SUGGESTIONS.filter((task) => (
    !selected.includes(task.id) &&
    !existingTaskKeys.has(`premium-${task.id}`) &&
    !existingTaskKeys.has(normalizeTaskKey(task.name))
  ));
  const visibleByPillar = STREAK_PILLARS.map((pillar) => ({
    pillar,
    tasks: visibleSuggestions.filter((task) => task.pillar === pillar),
  })).filter((group) => group.tasks.length > 0);

  return (
    <TaskSheetFrame eyebrow={t('mobilePremium.tasks.suggestionsEyebrow')} onClose={onClose} title={t('mobilePremium.tasks.suggestionsTitle')}>
      <p className="text-sm leading-6 text-[color:var(--mp-text-secondary)]">
        {t('mobilePremium.tasks.suggestionsBody')}
      </p>

      {selectedSuggestions.length ? (
        <div className="mt-4 rounded-full border border-violet-300/25 bg-violet-400/10 px-4 py-2 text-center text-xs font-semibold text-[color:var(--mp-violet)]">
          {t('mobilePremium.tasks.selectedCount', { count: selectedSuggestions.length, plural: selectedSuggestions.length === 1 ? '' : 's' })}
        </div>
      ) : null}

      <div className="mt-5 max-h-[48vh] space-y-6 overflow-y-auto pr-1">
        {visibleByPillar.length ? (
          visibleByPillar.map((group) => (
            <section key={group.pillar}>
              <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-text-muted)]">
                {translatePillar(group.pillar, t)}
              </p>
              <div className="divide-y divide-[color:var(--mp-border)] border-y border-[color:var(--mp-border)]">
                {group.tasks.map((suggestion) => {
                  const picking = choosingDifficulty === suggestion.id;
                  const confirming = confirmingTaskId === suggestion.id;
                  return (
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3.5" key={suggestion.id}>
                      <div className="min-w-0">
                        <p className="truncate text-base font-medium text-[color:var(--mp-text)]">{translateTaskText(suggestion.name, language)}</p>
                        <div className="mt-1.5 flex items-center gap-2 text-xs text-[color:var(--mp-text-secondary)]">
                          <span className="font-semibold text-[color:var(--mp-violet)]">{translateTaskText(suggestion.stat, language)}</span>
                        </div>
                      </div>
                      <div className="flex min-w-[9.5rem] justify-end">
                        {picking ? (
                          <div className={`mp-suggest-difficulty-enter flex items-center gap-1.5 ${confirming ? 'mp-suggest-difficulty-exit' : ''}`}>
                            {(['Fácil', 'Media', 'Difícil'] as const).map((difficulty) => (
                              <button
                                className="min-h-9 rounded-full border border-[color:var(--mp-border)] px-2.5 text-xs font-semibold text-[color:var(--mp-text-secondary)] transition hover:border-[color:var(--mp-amber)] hover:text-[color:var(--mp-amber)]"
                                key={difficulty}
                                onClick={() => {
                                  setDifficultyByTask((current) => ({ ...current, [suggestion.id]: difficulty }));
                                  setConfirmingTaskId(suggestion.id);
                                  window.setTimeout(() => {
                                    setSelected((current) => current.includes(suggestion.id) ? current : [...current, suggestion.id]);
                                    setChoosingDifficulty(null);
                                    setConfirmingTaskId(null);
                                  }, 420);
                                }}
                                type="button"
                              >
                                {translateDifficulty(difficulty, t)}
                              </button>
                            ))}
                          </div>
                        ) : confirming ? (
                          <span className="mp-suggest-check grid h-9 w-9 place-items-center rounded-full border border-[color:var(--mp-green)] bg-emerald-400/10 text-sm font-semibold text-[color:var(--mp-green)]">
                            ✓
                          </span>
                        ) : (
                          <button
                            aria-label={t('mobilePremium.tasks.addSuggestionA11y', { name: translateTaskText(suggestion.name, language) })}
                            className="grid h-9 w-9 place-items-center rounded-full border border-[color:var(--mp-border)] text-lg font-semibold text-[color:var(--mp-violet)] transition"
                            onClick={() => setChoosingDifficulty((current) => current === suggestion.id ? null : suggestion.id)}
                            type="button"
                          >
                            +
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <p className="border-y border-[color:var(--mp-border)] py-6 text-sm leading-6 text-[color:var(--mp-text-secondary)]">
            {t('mobilePremium.tasks.emptySuggestions')}
          </p>
        )}
      </div>
      {error ? (
        <p className="mt-4 rounded-2xl border border-red-300/25 bg-red-400/10 px-4 py-3 text-sm leading-5 text-red-100">
          {error}
        </p>
      ) : null}
      <div className="mt-5 grid grid-cols-[0.9fr_1.1fr] gap-3">
        <button className="min-h-11 rounded-full border border-[color:var(--mp-border)] px-5 text-sm font-semibold text-[color:var(--mp-text-secondary)] disabled:opacity-45" disabled={isApplying} onClick={onClose} type="button">
          {t('mobilePremium.tasks.cancel')}
        </button>
        <button
          className="min-h-11 rounded-full bg-violet-500 px-5 text-sm font-semibold text-white disabled:opacity-45"
          disabled={!selectedSuggestions.length || isApplying}
          onClick={() => void onApply(selectedSuggestions.map((suggestion) => ({
            ...suggestion,
            difficultyLabel: difficultyByTask[suggestion.id] ?? suggestion.difficultyLabel,
          })))}
          type="button"
        >
          {isApplying ? t('mobilePremium.tasks.saving') : t('mobilePremium.tasks.addTasks', { count: selectedSuggestions.length || '', plural: selectedSuggestions.length === 1 ? '' : 's' })}
        </button>
      </div>
    </TaskSheetFrame>
  );
}

function TaskSheetFrame({
  children,
  eyebrow,
  onClose,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  onClose: () => void;
  title: string;
}) {
  const { t } = usePostLoginLanguage();
  return (
    <div className="fixed inset-0 z-50 mx-auto flex w-full max-w-[430px] items-end justify-center bg-black/42 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] backdrop-blur-xl">
      <style>{`
        @keyframes mpSuggestDifficultyEnter {
          from { opacity: 0; transform: translateY(-6px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes mpSuggestDifficultyExit {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(5px) scale(.96); }
        }
        @keyframes mpSuggestCheck {
          0% { opacity: 0; transform: scale(.72); }
          70% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        .mp-suggest-difficulty-enter { animation: mpSuggestDifficultyEnter .24s cubic-bezier(.2,.85,.25,1) both; }
        .mp-suggest-difficulty-exit { animation: mpSuggestDifficultyExit .22s ease-in both; }
        .mp-suggest-check { animation: mpSuggestCheck .24s cubic-bezier(.2,.85,.25,1) both; }
        @media (prefers-reduced-motion: reduce) { .mp-suggest-difficulty-enter, .mp-suggest-difficulty-exit, .mp-suggest-check { animation: none !important; } }
      `}</style>
      <section className="max-h-[88vh] w-full overflow-y-auto rounded-[1.8rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-bg-elevated)] p-5 text-[color:var(--mp-text)] shadow-[0_24px_72px_rgba(0,0,0,0.42)]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-[color:var(--mp-text-muted)]">{eyebrow}</p>
            <h2 className="mt-1 text-2xl font-semibold leading-tight text-[color:var(--mp-text)]">{title}</h2>
          </div>
          <button
            aria-label={t('mobilePremium.tasks.close')}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] text-2xl text-[color:var(--mp-text-secondary)]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </section>
    </div>
  );
}


function CompactMonthWeeks({ weeks, weeklyGoal }: { weeks: number[]; weeklyGoal: number }) {
  const { t } = usePostLoginLanguage();
  const normalized = Array.from({ length: 5 }, (_, index) => Number(weeks[index] ?? 0));
  const currentWeekIndex = normalized.reduce((latest, value, index) => (value > 0 ? index : latest), -1);
  return (
    <div className="grid w-[58px] grid-cols-5 gap-1">
      {normalized.map((value, index) => {
        const reached = weeklyGoal > 0 && value >= weeklyGoal;
        const inProgress = !reached && value > 0 && index === currentWeekIndex;
        const tone = reached ? 'var(--mp-green)' : inProgress ? 'var(--mp-amber)' : 'var(--mp-track-strong)';
        return (
          <span className="grid justify-items-center gap-1" key={index}>
            <span
              aria-label={t('mobilePremium.tasks.weekA11y', { week: index + 1, progress: Math.round(value), goal: weeklyGoal })}
              className="mp-tasks-week-bar h-7 w-1.5 origin-bottom rounded-full"
              style={{ backgroundColor: tone, animation: `mpTasksWeekRise 420ms ease-out ${80 + index * 70}ms both` }}
              title={t('mobilePremium.tasks.weekA11y', { week: index + 1, progress: Math.round(value), goal: weeklyGoal })}
            />
            <span className="text-[8px] font-medium leading-none text-[color:var(--mp-text-muted)]">{t('mobilePremium.tasks.weekShort', { week: index + 1 })}</span>
          </span>
        );
      })}
    </div>
  );
}

function TaskLeadingBadge({ hasStreak, stat, streakDays }: { hasStreak: boolean; stat: string; streakDays: number }) {
  const { t } = usePostLoginLanguage();
  if (hasStreak) {
    return (
      <div
        aria-label={t('mobilePremium.tasks.streakA11y', { days: streakDays })}
        className="grid h-11 w-11 place-items-center rounded-full border border-orange-300/35 bg-orange-300/[0.06] text-[color:var(--mp-amber)]"
        title={t('mobilePremium.tasks.streakTitle', { days: streakDays })}
      >
        <span className="flex flex-col items-center justify-center leading-none">
          <span className="text-[1rem]" aria-hidden="true">🔥</span>
          <span className="mt-0.5 text-[0.62rem] font-semibold tracking-[-0.02em]">{streakDays}{t('mobilePremium.tasks.daySuffix')}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="grid h-11 w-11 place-items-center rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface-strong)] text-[color:var(--mp-violet)]">
      <TraitIcon size={22} trait={stat} />
    </div>
  );
}

function TinyProgressRing({ value, label }: { value: number; label: string }) {
  const normalized = Math.max(0, Math.min(100, value));
  const radius = 18;
  const length = 2 * Math.PI * radius;
  const offset = length * (1 - normalized / 100);
  return (
    <div className="relative grid h-[42px] w-[42px] place-items-center rounded-full">
      <svg aria-hidden="true" className="absolute inset-0 -rotate-90" height="42" viewBox="0 0 42 42" width="42">
        <circle cx="21" cy="21" fill="none" r={radius} stroke="var(--mp-track-strong)" strokeWidth="5" />
        <circle
          className="mp-tasks-ring-progress"
          cx="21"
          cy="21"
          fill="none"
          r={radius}
          stroke="var(--mp-violet)"
          strokeDasharray={length}
          strokeLinecap="butt"
          strokeWidth="5"
          style={{
            '--mp-ring-length': length,
            '--mp-ring-offset': offset,
            animation: 'mpTasksRingLoad 650ms cubic-bezier(0.22, 1, 0.36, 1) 120ms both',
          } as CSSProperties}
        />
      </svg>
      <div className="relative grid h-8 w-8 place-items-center rounded-full bg-[color:var(--mp-bg)] text-[0.68rem] font-semibold text-[color:var(--mp-text)]">
        {label}
      </div>
    </div>
  );
}

function buildLocalTaskFromDraft(draft: TaskDraft, weeklyGoal: number, id: string): PremiumTaskRow {
  return {
    id,
    name: draft.name.trim() || 'Nueva tarea',
    stat: draft.stat.trim() || 'Enfoque',
    pillar: draft.pillar,
    difficultyLabel: draft.difficultyLabel,
    weeklyDone: 0,
    weeklyGoal,
    streakDays: 0,
    monthWeeks: [0, 0, 0, 0, 0],
    monthlyCount: 0,
  };
}

function buildTaskRowFromUserTask(task: UserTask, fallback: TaskDraft, weeklyGoal: number): PremiumTaskRow {
  return {
    id: task.id,
    name: task.title.trim() || fallback.name,
    stat: task.statId?.trim() || fallback.stat,
    pillar: resolveTaskPillar(task.pillarId, fallback.pillar),
    difficultyLabel: task.difficultyId?.trim() || fallback.difficultyLabel,
    weeklyDone: 0,
    weeklyGoal,
    streakDays: 0,
    monthWeeks: [0, 0, 0, 0, 0],
    monthlyCount: 0,
  };
}

function normalizeTaskKey(value: string): string {
  return value.trim().toLowerCase();
}

function resolveTaskPillar(value: string | null, fallback: StreakPanelPillar): StreakPanelPillar {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === '1' || normalized === 'body' || normalized === 'cuerpo') return 'Body';
  if (normalized === '2' || normalized === 'mind' || normalized === 'mente') return 'Mind';
  if (normalized === '3' || normalized === 'soul' || normalized === 'alma') return 'Soul';
  return fallback;
}

function buildQuickStartSuggestion(pillar: StreakPanelPillar, task: QuickStartTask): SuggestedTask {
  return {
    id: `quickstart-${pillar}-${task.id}`,
    difficultyCode: resolveQuickStartDifficultyCode(pillar),
    name: resolveQuickStartTaskName(task),
    stat: formatQuickStartTrait(task.trait),
    pillar,
    difficultyLabel: resolveQuickStartDifficulty(pillar),
    reason: '',
    traitCode: task.id.toUpperCase(),
  };
}

function resolveQuickStartTaskName(task: QuickStartTask) {
  const names: Record<string, string> = {
    AGILIDAD: 'Entrenar agilidad mental',
    ALTRUISMO: 'Hacer un gesto de ayuda',
    APRENDIZAJE: 'Leer o estudiar',
    AUTOESTIMA: 'Cuidar de mí',
    AUTOCONTROL: 'Observar impulsos',
    CONEXION: 'Conectar con alguien',
    CREATIVIDAD: 'Crear o escribir',
    ENERGIA: 'Caminar',
    ENFOQUE: 'Foco profundo',
    ESPIRITUALIDAD: 'Meditar o conectar',
    FINANZAS: 'Revisar finanzas',
    GESTION: 'Regularme',
    GOZO: 'Disfrutar sin culpa',
    HIGIENE: 'Rutina de higiene',
    HIDRATACION: 'Tomar agua',
    INSIGHT: 'Reflexionar cómo me siento',
    MODERACION: 'Moderar consumos',
    MOVILIDAD: 'Movilidad o estiramientos',
    NATURALEZA: 'Conectar con naturaleza',
    NUTRICION: 'Comida equilibrada',
    ORDEN: 'Ordenar espacio o mente',
    POSTURA: 'Cuidar postura',
    PROPOSITO: 'Acción con propósito',
    PROYECCION: 'Avanzar una meta',
    RECUPERACION: 'Pausa de recuperación',
    RESILIENCIA: 'Hacer algo desafiante',
    SUENO: 'Dormir 8hs',
    VALORES: 'Decisión alineada',
    VITALIDAD: 'Rutina activadora',
  };
  return names[task.id] ?? task.text;
}

function formatQuickStartTrait(value: string) {
  const labels: Record<string, string> = {
    AGILIDAD: 'Agilidad',
    ALTRUISMO: 'Altruismo',
    APRENDIZAJE: 'Aprendizaje',
    AUTOESTIMA: 'Autoestima',
    AUTOCONTROL: 'Autocontrol',
    CONEXION: 'Conexión',
    CREATIVIDAD: 'Creatividad',
    ENERGIA: 'Energía',
    ENFOQUE: 'Enfoque',
    ESPIRITUALIDAD: 'Espiritualidad',
    FINANZAS: 'Finanzas',
    GESTION: 'Gestión',
    GOZO: 'Gozo',
    HIDRATACION: 'Hidratación',
    HIGIENE: 'Higiene',
    INSIGHT: 'Insight',
    MODERACION: 'Moderación',
    MOVILIDAD: 'Movilidad',
    NATURALEZA: 'Naturaleza',
    NUTRICION: 'Nutrición',
    ORDEN: 'Orden',
    POSTURA: 'Postura',
    PROPOSITO: 'Propósito',
    PROYECCION: 'Proyección',
    RECUPERACION: 'Recuperación',
    RESILIENCIA: 'Resiliencia',
    SUENO: 'Sueño',
    VALORES: 'Valores',
    VITALIDAD: 'Vitalidad',
  };
  return labels[value] ?? value;
}

function resolveQuickStartDifficulty(pillar: StreakPanelPillar): TaskDraft['difficultyLabel'] {
  if (pillar === 'Mind') return 'Media';
  return 'Fácil';
}

function resolveQuickStartDifficultyCode(pillar: StreakPanelPillar): string {
  if (pillar === 'Mind') return 'Medium';
  return 'Easy';
}

function normalizeCatalogCode(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function resolveSuggestedPillarId(pillars: Pillar[], pillar: StreakPanelPillar): string | null {
  const expectedCode = pillar.toUpperCase();
  return pillars.find((candidate) => normalizeCatalogCode(candidate.code) === expectedCode)?.id ?? null;
}

function resolveSuggestedDifficultyId(difficulties: Difficulty[], suggestion: SuggestedTask): string | null {
  const expectedCode = normalizeCatalogCode(suggestion.difficultyCode);
  const expectedLabel = normalizeCatalogCode(suggestion.difficultyLabel);
  return difficulties.find((difficulty) => {
    const code = normalizeCatalogCode(difficulty.code);
    const name = normalizeCatalogCode(difficulty.name);
    return code === expectedCode || name === expectedLabel;
  })?.id ?? null;
}

function resolveSuggestedTraitId(traits: Trait[], suggestion: SuggestedTask, pillarId: string): string | null {
  const expectedCode = normalizeCatalogCode(suggestion.traitCode);
  return traits.find((trait) => (
    trait.pillarId === pillarId && normalizeCatalogCode(trait.code) === expectedCode
  ))?.id ?? null;
}

function buildSuggestedTaskCreatePayload(
  suggestion: SuggestedTask,
  catalogs: { difficulties: Difficulty[]; pillars: Pillar[]; traits: Trait[] } | null | undefined,
) {
  if (!catalogs) {
    return null;
  }

  const pillarId = resolveSuggestedPillarId(catalogs.pillars, suggestion.pillar);
  if (!pillarId) {
    return null;
  }

  const traitId = resolveSuggestedTraitId(catalogs.traits, suggestion, pillarId);
  const difficultyId = resolveSuggestedDifficultyId(catalogs.difficulties, suggestion);

  if (!traitId || !difficultyId) {
    return null;
  }

  return {
    title: suggestion.name,
    pillarId,
    traitId,
    difficultyId,
    isActive: true,
  };
}

function resolveWeeklyGoal(gameMode: string | null, weeklyTarget: number | null) {
  if (weeklyTarget && weeklyTarget > 0) return Math.max(1, Math.round(weeklyTarget));
  const mode = normalizeGameModeValue(gameMode) ?? 'Flow';
  return MODE_TIERS[mode];
}

function computeProgressPercent(done: number, goal: number) {
  if (goal <= 0) return 0;
  const pct = Math.round((done / goal) * 100);
  return Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0;
}

function normalizeRecalibrationAction(value: string | null | undefined): PremiumTaskRow['latestRecalibrationAction'] {
  const normalized = (value ?? '').trim().toLowerCase();
  if (normalized === 'up' || normalized === 'keep' || normalized === 'down') return normalized;
  return null;
}

function resolveDifficultyTone(difficulty: string | null): string {
  const normalized = (difficulty ?? '').toLowerCase();
  if (normalized.includes('fácil') || normalized.includes('facil') || normalized.includes('easy')) {
    return 'bg-emerald-400/12 text-[color:var(--mp-green)]';
  }
  if (normalized.includes('difícil') || normalized.includes('dificil') || normalized.includes('hard')) {
    return 'bg-red-400/12 text-[color:var(--mp-red)]';
  }
  return 'bg-amber-300/12 text-[color:var(--mp-amber)]';
}

function translatePillar(pillar: StreakPanelPillar, t: (key: string, params?: Record<string, string | number>) => string) {
  if (pillar === 'Body') return t('mobilePremium.pillar.body');
  if (pillar === 'Mind') return t('mobilePremium.pillar.mind');
  return t('mobilePremium.pillar.soul');
}

function translateDifficulty(value: string, t: (key: string, params?: Record<string, string | number>) => string) {
  const normalized = value.trim().toLowerCase();
  if (normalized.includes('fácil') || normalized.includes('facil') || normalized.includes('easy')) return t('mobilePremium.difficulty.easy');
  if (normalized.includes('difícil') || normalized.includes('dificil') || normalized.includes('hard')) return t('mobilePremium.difficulty.hard');
  if (normalized.includes('media') || normalized.includes('medium')) return t('mobilePremium.difficulty.medium');
  return value;
}

function translateTaskText(value: string, language: 'es' | 'en') {
  if (language === 'es') return value;
  const normalized = value.trim().toLowerCase();
  const labels: Record<string, string> = {
    '20` sin pantallas antes de dormir': 'No screens 20 min before bed',
    '20’ sin pantallas antes de dormir': 'No screens 20 min before bed',
    '20 min sin pantallas antes de dormir': 'No screens 20 min before bed',
    'sin pantallas antes de dormir': 'No screens before bed',
    '2l de agua': '2L of water',
    'ayuno hasta las 14': 'Fast until 2 PM',
    'cena antes de las': 'Dinner before the set time',
    'dormir 8hs': 'Sleep 8 hours',
    'no dulces': 'No sweets',
    'tomar agua': 'Drink water',
    '10.000 pasos / correr': '10,000 steps / run',
    'leer 20 min': 'Read 20 min',
    'planificar el día': 'Plan the day',
    'escribir gratitud': 'Write gratitude',
    'entrenar agilidad mental': 'Train mental agility',
    'hacer un gesto de ayuda': 'Do a helpful gesture',
    'leer o estudiar': 'Read or study',
    'cuidar de mí': 'Care for myself',
    'observar impulsos': 'Observe impulses',
    'conectar con alguien': 'Connect with someone',
    'crear o escribir': 'Create or write',
    'caminar': 'Walk',
    'foco profundo': 'Deep focus',
    'meditar o conectar': 'Meditate or connect',
    'revisar finanzas': 'Review finances',
    'regularme': 'Regulate myself',
    'disfrutar sin culpa': 'Enjoy without guilt',
    'rutina de higiene': 'Hygiene routine',
    'reflexionar cómo me siento': 'Reflect on how I feel',
    'moderar consumos': 'Moderate consumption',
    'movilidad o estiramientos': 'Mobility or stretching',
    'conectar con naturaleza': 'Connect with nature',
    'comida equilibrada': 'Balanced meal',
    'ordenar espacio o mente': 'Tidy space or mind',
    'cuidar postura': 'Care for posture',
    'acción con propósito': 'Purposeful action',
    'avanzar una meta': 'Move a goal forward',
    'pausa de recuperación': 'Recovery pause',
    'hacer algo desafiante': 'Do something challenging',
    'decisión alineada': 'Aligned decision',
    'rutina activadora': 'Activation routine',
    'sueño': 'Sleep',
    'nutrición': 'Nutrition',
    'hidratación': 'Hydration',
    'movilidad': 'Mobility',
    'aprendizaje': 'Learning',
    'enfoque': 'Focus',
    'gratitud': 'Gratitude',
    'recuperación': 'Recovery',
    'moderación': 'Moderation',
    'agilidad': 'Agility',
    'altruismo': 'Altruism',
    'autoestima': 'Self-esteem',
    'autocontrol': 'Self-control',
    'conexión': 'Connection',
    'creatividad': 'Creativity',
    'energía': 'Energy',
    'espiritualidad': 'Spirituality',
    'finanzas': 'Finances',
    'gestión': 'Regulation',
    'gozo': 'Joy',
    'higiene': 'Hygiene',
    'naturaleza': 'Nature',
    'orden': 'Order',
    'postura': 'Posture',
    'propósito': 'Purpose',
    'proyección': 'Projection',
    'resiliencia': 'Resilience',
    'valores': 'Values',
    'vitalidad': 'Vitality',
  };
  const direct = labels[normalized];
  if (direct) return direct;
  const partial = Object.entries(labels).find(([source]) => normalized.startsWith(source));
  return partial?.[1] ?? value;
}
