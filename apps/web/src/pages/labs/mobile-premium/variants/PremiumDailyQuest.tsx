import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useRequest } from '../../../../hooks/useRequest';
import {
  getDailyQuestDefinition,
  getDailyQuestStatus,
  submitDailyQuest,
  type DailyQuestDefinitionResponse,
  type DailyQuestEmotionOption,
  type DailyQuestTaskDefinition,
  type ModerationStatus,
  type ModerationTracker,
  type ModerationTrackerType,
  type SubmitDailyQuestFeedbackEvent,
  type SubmitDailyQuestResponse,
} from '../../../../lib/api';
import { PremiumModerationCards } from './PremiumModerationCards';

type DQuestPillarCode = 'BODY' | 'MIND' | 'SOUL';
type DQuestExtraTask = {
  difficultyLabel: string | null;
  id: string;
  name: string;
  pillar: 'Body' | 'Mind' | 'Soul';
  stat: string;
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
    {
      pillar_code: 'MIND',
      tasks: [
        { task_id: 'dq-premium-focus', name: 'Planificar el día', trait_id: null, difficulty: 'Medium', difficulty_id: 2, xp: 3 },
        { task_id: 'dq-premium-read', name: 'Leer 20 min', trait_id: null, difficulty: 'Easy', difficulty_id: 1, xp: 1 },
      ],
    },
    {
      pillar_code: 'SOUL',
      tasks: [
        { task_id: 'dq-premium-gratitude', name: 'Escribir gratitud', trait_id: null, difficulty: 'Easy', difficulty_id: 1, xp: 1 },
        { task_id: 'dq-premium-calm', name: 'Meditar', trait_id: null, difficulty: 'Easy', difficulty_id: 1, xp: 1 },
      ],
    },
  ],
};

const FALLBACK_DQUEST_COMPLETED_TASKS = new Set(['dq-premium-sleep', 'dq-premium-run', 'dq-premium-focus', 'dq-premium-gratitude']);
export function PremiumDailyQuest({
  extraTasks = [],
  hasSession,
  onAlreadyCompleted,
  onConfirmFeedback,
  onModerationOpen,
  onModerationDetail,
  moderationTrackers,
  moderationPendingType,
  onSnooze,
  onCycleModeration,
  onboardingPreview = false,
  previewAlreadyCompleted = false,
}: {
  extraTasks?: DQuestExtraTask[];
  hasSession: boolean;
  onAlreadyCompleted?: () => void;
  onConfirmFeedback?: (summary: {
    emotionColor: string;
    emotionName: string;
    gpTotal: number;
    response: SubmitDailyQuestResponse;
    selectedTaskIds: string[];
    selectedTasks: number;
    totalTasks: number;
  }) => void;
  onModerationOpen?: () => void;
  onModerationDetail?: (tracker: ModerationTracker) => void;
  moderationTrackers: ModerationTracker[];
  moderationPendingType?: ModerationTrackerType | null;
  onSnooze?: () => void;
  onCycleModeration: (type: ModerationTrackerType, status: ModerationStatus) => void;
  onboardingPreview?: boolean;
  previewAlreadyCompleted?: boolean;
}) {
  const [selectedEmotion, setSelectedEmotion] = useState<number | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [snoozed, setSnoozed] = useState(false);
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  const [completedNoticeShown, setCompletedNoticeShown] = useState(false);

  const statusRequest = useRequest(() => getDailyQuestStatus(), [hasSession], { enabled: hasSession });
  const definitionRequest = useRequest(
    () => getDailyQuestDefinition({ date: statusRequest.data?.date }),
    [hasSession, statusRequest.data?.date],
    { enabled: Boolean(hasSession && statusRequest.data?.date) },
  );
  const baseDefinition = definitionRequest.data ?? (
    onboardingPreview
      ? { ...FALLBACK_DQUEST_DEFINITION, pillars: [] }
      : FALLBACK_DQUEST_DEFINITION
  );
  const definition = useMemo(
    () => mergeDQuestExtraTasks(baseDefinition, extraTasks),
    [baseDefinition, extraTasks],
  );
  const isFallback = !hasSession;
  const alreadyCompleted = definition.submitted || (onboardingPreview && previewAlreadyCompleted);
  const selectedTaskSet = useMemo(() => new Set(selectedTasks), [selectedTasks]);
  const gpTotal = useMemo(() => {
    return definition.pillars.reduce((total, pillar) => {
      return total + pillar.tasks.reduce((pillarTotal, task) => {
        return pillarTotal + (selectedTaskSet.has(task.task_id) ? task.xp ?? 0 : 0);
      }, 0);
    }, 0);
  }, [definition, selectedTaskSet]);
  const totalTasks = useMemo(() => definition.pillars.reduce((total, pillar) => total + pillar.tasks.length, 0), [definition]);

  useEffect(() => {
    const calmOption = definition.emotionOptions.find((option) => normalizeDQuestEmotion(option).key === 'calm');
    setSelectedEmotion(isFallback && !onboardingPreview ? calmOption?.emotion_id ?? definition.emotionOptions[0]?.emotion_id ?? null : null);
    setSelectedTasks(isFallback && !onboardingPreview ? Array.from(FALLBACK_DQUEST_COMPLETED_TASKS) : []);
    setSnoozed(false);
    setSubmitState('idle');
  }, [definition.date, definition.emotionOptions, isFallback, onboardingPreview]);

  useEffect(() => {
    if (alreadyCompleted && !completedNoticeShown) {
      setCompletedNoticeShown(true);
      onAlreadyCompleted?.();
    }
    if (!alreadyCompleted && completedNoticeShown) {
      setCompletedNoticeShown(false);
    }
  }, [alreadyCompleted, completedNoticeShown, onAlreadyCompleted]);

  const toggleTask = (taskId: string) => {
    setSelectedTasks((current) =>
      current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId],
    );
  };

  const handleConfirm = async () => {
    if (selectedEmotion == null || submitState === 'submitting') return;
    const selectedEmotionOption = definition.emotionOptions.find((option) => option.emotion_id === selectedEmotion);
    const selectedEmotionMeta = selectedEmotionOption ? normalizeDQuestEmotion(selectedEmotionOption) : { color: '#A78BFA' };

    if (isFallback) {
      setSubmitState('submitted');
      onConfirmFeedback?.({
        emotionColor: selectedEmotionMeta.color,
        emotionName: selectedEmotionOption?.name ?? 'Calma',
        gpTotal,
        response: buildFallbackSubmitResponse({
          date: definition.date,
          emotionId: selectedEmotion,
          gpTotal,
          selectedTasks,
          includeDemoFeedback: !onboardingPreview,
        }),
        selectedTaskIds: selectedTasks,
        selectedTasks: selectedTasks.length,
        totalTasks,
      });
      return;
    }

    setSubmitState('submitting');
    try {
      const response = await submitDailyQuest({
        date: definition.date,
        emotion_id: selectedEmotion,
        tasks_done: selectedTasks,
        notes: null,
      });
      setSubmitState('submitted');
      onConfirmFeedback?.({
        emotionColor: selectedEmotionMeta.color,
        emotionName: selectedEmotionOption?.name ?? 'Emoción',
        gpTotal,
        response,
        selectedTaskIds: selectedTasks,
        selectedTasks: selectedTasks.length,
        totalTasks,
      });
      statusRequest.reload();
      definitionRequest.reload();
    } catch (error) {
      console.error('Failed to submit Labs DQuest', error);
      setSubmitState('error');
    }
  };

  const handleSnooze = () => {
    setSnoozed(true);
    onSnooze?.();
  };

  if (hasSession && (statusRequest.status === 'error' || definitionRequest.status === 'error')) {
    return (
      <section className="space-y-7 pb-28">
        <div className="rounded-[1.5rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--mp-violet)]">DQuest</p>
          <h2 className="mt-3 text-2xl font-semibold text-[color:var(--mp-text)]">No pudimos cargar tu retrospectiva</h2>
          <p className="mt-3 text-sm leading-6 text-[color:var(--mp-text-secondary)]">
            No mostramos tareas de demostración cuando hay una sesión real. Reintentá para cargar tus datos.
          </p>
          <button
            className="mt-5 min-h-11 rounded-full bg-violet-500 px-5 text-sm font-semibold text-white"
            onClick={() => {
              void statusRequest.reload();
              void definitionRequest.reload();
            }}
            type="button"
          >
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  if (hasSession && (!statusRequest.data || !definitionRequest.data)) {
    return (
      <section className="space-y-4 pb-28">
        <div className="h-7 w-48 animate-pulse rounded-full bg-[color:var(--mp-track)]" />
        <div className="h-28 animate-pulse rounded-[1.5rem] bg-[color:var(--mp-surface)]" />
        <div className="h-40 animate-pulse rounded-[1.5rem] bg-[color:var(--mp-surface)]" />
      </section>
    );
  }

  if (alreadyCompleted) {
    return (
      <section className="space-y-7 pb-28">
        <div className="rounded-[1.5rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-5">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--mp-violet)]">DQuest</p>
          <h2 className="mt-3 text-2xl font-semibold text-[color:var(--mp-text)]">Ya completaste la retrospectiva</h2>
          <p className="mt-3 text-sm leading-6 text-[color:var(--mp-text-secondary)]">
            El registro de hoy ya quedó guardado.
          </p>
          <button
            className="mt-5 min-h-11 rounded-full bg-violet-500 px-5 text-sm font-semibold text-white"
            onClick={onSnooze}
            type="button"
          >
            Volver al dashboard
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-7 pb-28">
      <div className="space-y-3">
        <p className="text-[1.42rem] leading-tight text-[color:var(--mp-text)]">Retrospectiva de ayer</p>
        <p className="max-w-[21rem] text-[0.98rem] leading-7 text-[color:var(--mp-text-secondary)]">
          Elegí la emoción predominante y marcá las tareas que completaste.
        </p>
      </div>

      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label="Emoción predominante">
        {definition.emotionOptions.map((option) => {
          const emotion = normalizeDQuestEmotion(option);
          const selected = selectedEmotion === option.emotion_id;
          return (
            <button
              aria-pressed={selected}
              className={`inline-flex min-h-10 items-center gap-2.5 rounded-full border px-3.5 text-[0.92rem] font-medium transition ${
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

      {moderationTrackers.length ? (
        <PremiumModerationCards
          compact
          onCycle={onCycleModeration}
          onManage={onModerationOpen}
          onOpenDetail={onModerationDetail}
          pendingType={moderationPendingType}
          trackers={moderationTrackers}
        />
      ) : null}

      <div className="space-y-4">
        {definition.pillars.map((pillar) => (
          <section className="space-y-2" key={pillar.pillar_code}>
            <h2 className="text-[1.28rem] font-semibold text-[color:var(--mp-text)]">
              {resolveDQuestPillarLabel(pillar.pillar_code)}
            </h2>
            <div>
              {pillar.tasks.map((task) => (
                <PremiumDailyQuestTaskRow
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

      <footer className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 mx-auto w-full max-w-[430px] border-y border-[color:var(--mp-border)] bg-[color:var(--mp-bg)] px-5 py-3 shadow-[0_-18px_42px_rgba(0,0,0,0.16)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-[82px]">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-[color:var(--mp-text-muted)]">GP total</p>
            <p className="mt-0.5 text-[1.05rem] font-semibold leading-none text-[color:var(--mp-violet)]">{gpTotal} GP</p>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <button
              className="min-h-10 rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] px-4 text-sm font-semibold text-[color:var(--mp-text-secondary)]"
              onClick={handleSnooze}
              type="button"
            >
              Más tarde
            </button>
            <button
              className="min-h-10 rounded-full bg-violet-500 px-5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(124,58,237,0.24)] disabled:opacity-45"
              disabled={selectedEmotion == null || submitState === 'submitting'}
              onClick={handleConfirm}
              type="button"
            >
              {submitState === 'submitting' ? 'Confirmando' : 'Confirmar'}
            </button>
          </div>
        </div>
        {snoozed ? <p className="mt-2 text-xs text-[color:var(--mp-text-muted)]">Más tarde queda pendiente para esta retrospectiva.</p> : null}
        {submitState === 'submitted' ? <p className="mt-2 text-xs text-[color:var(--mp-green)]">DQuest confirmada.</p> : null}
        {submitState === 'error' ? <p className="mt-2 text-xs text-[color:var(--mp-red)]">No se pudo confirmar. Probá nuevamente.</p> : null}
      </footer>
    </section>
  );
}

function buildFallbackSubmitResponse({
  date,
  emotionId,
  gpTotal,
  selectedTasks,
  includeDemoFeedback = true,
}: {
  date: string;
  emotionId: number;
  gpTotal: number;
  selectedTasks: string[];
  includeDemoFeedback?: boolean;
}): SubmitDailyQuestResponse {
  const feedback_events: SubmitDailyQuestFeedbackEvent[] = includeDemoFeedback ? [
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
  ] : [];

  return {
    ok: true,
    saved: {
      emotion: { emotion_id: emotionId, date, notes: null },
      tasks: { date, completed: selectedTasks },
    },
    xp_delta: gpTotal,
    xp_total_today: gpTotal,
    streaks: includeDemoFeedback ? { daily: 11, weekly: 3 } : { daily: 0, weekly: 0 },
    missions_v2: {
      bonus_ready: false,
      redirect_url: '/dashboard-v3/missions-v3',
      tasks: [],
    },
    feedback_events,
  };
}

function mergeDQuestExtraTasks(
  definition: DailyQuestDefinitionResponse,
  extraTasks: DQuestExtraTask[],
): DailyQuestDefinitionResponse {
  if (!extraTasks.length) return definition;

  const pillars = definition.pillars.map((pillar) => ({
    ...pillar,
    tasks: [...pillar.tasks],
  }));
  const existingTaskIds = new Set(pillars.flatMap((pillar) => pillar.tasks.map((task) => task.task_id)));

  extraTasks.forEach((task) => {
    if (existingTaskIds.has(task.id)) return;
    const pillarCode = resolveDQuestPillarCode(task.pillar);
    let pillar = pillars.find((item) => item.pillar_code.toUpperCase() === pillarCode);
    if (!pillar) {
      pillar = { pillar_code: pillarCode, tasks: [] };
      pillars.push(pillar);
    }
    pillar.tasks.push({
      task_id: task.id,
      name: task.name,
      trait_id: null,
      difficulty: task.difficultyLabel,
      difficulty_id: resolveDifficultyId(task.difficultyLabel),
      xp: resolveDQuestTaskXp(task.difficultyLabel),
    });
    existingTaskIds.add(task.id);
  });

  return {
    ...definition,
    pillars,
  };
}

function resolveDQuestPillarCode(pillar: DQuestExtraTask['pillar']): DQuestPillarCode {
  if (pillar === 'Mind') return 'MIND';
  if (pillar === 'Soul') return 'SOUL';
  return 'BODY';
}

function resolveDifficultyId(difficulty: string | null): number | null {
  const normalized = (difficulty ?? '').toLowerCase();
  if (normalized.includes('fácil') || normalized.includes('facil') || normalized.includes('easy')) return 1;
  if (normalized.includes('dif') || normalized.includes('hard')) return 3;
  if (normalized) return 2;
  return null;
}

function resolveDQuestTaskXp(difficulty: string | null) {
  const difficultyId = resolveDifficultyId(difficulty);
  if (difficultyId === 1) return 1;
  if (difficultyId === 3) return 7;
  return 3;
}

function PremiumDailyQuestTaskRow({
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
      className="grid w-full grid-cols-[36px_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-[color:var(--mp-border)] py-3.5 text-left last:border-b-0"
      onClick={onToggle}
      type="button"
    >
      <span
        aria-hidden="true"
        className={`grid h-7 w-7 place-items-center rounded-full border ${
          selected
            ? 'border-violet-300 bg-violet-500 text-white shadow-[0_0_0_3px_rgba(167,139,250,0.13)]'
            : 'border-[color:var(--mp-border-strong)] bg-transparent text-transparent'
        }`}
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 16 16">
          <path d="m3.3 8.2 3 3 6.4-6.8" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </span>
      <span className="min-w-0 truncate text-[1.02rem] text-[color:var(--mp-text)]">{task.name}</span>
      <span className={`rounded-full px-2.5 py-1 text-[0.72rem] font-semibold ${difficulty.className}`}>{difficulty.label}</span>
      <span className="rounded-full border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] px-2.5 py-1 text-[0.72rem] font-semibold text-[color:var(--mp-text-secondary)]">
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
