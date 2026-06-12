import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { decideTaskHabitAchievement, getRewardsHistory, getTaskInsights, getUserXpByTrait, toggleTaskHabitAchievementMaintained, type HabitAchievementPillarGroup, type HabitAchievementShelfItem, type MonthlyWrappedRecord, type RewardsGrowthCalibrationRow, type RewardsHistorySummary, type TaskInsightsResponse, type TraitXpEntry, type WeeklyWrappedRecord } from '../../../../lib/api';
import { useRequest } from '../../../../hooks/useRequest';
import { HabitAchievementSeal } from '../../../../components/dashboard-v3/HabitAchievementSeal';
import { InnerbloomBrand, TraitIcon } from '../MobilePremiumPrimitives';
import { habitDevelopmentStatusLabel, HabitStatusChip, PremiumScoreRing } from '../PremiumHabitDevelopment';
import { emitHabitAchievementUpdated } from '../../../../lib/habitAchievementEvents';
import type { LocalOnboardingSnapshot } from '../localOnboardingBridge';

type RewardsPillarCode = 'BODY' | 'MIND' | 'SOUL';
type WeeklyStoryVisualMode = 'dark' | 'light';
type CalibrationFilter = RewardsGrowthCalibrationRow['finalAction'];

const WEEKLY_PILLAR_ORDER: RewardsPillarCode[] = ['BODY', 'MIND', 'SOUL'];
const STORY_MODAL_LAYER_CLASS = 'fixed bottom-0 left-0 right-0 top-0 isolate z-[9999] h-screen h-[100dvh] w-screen overflow-hidden bg-black';

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
        mode: 'preview',
        dataSource: 'mock',
        variant: 'full',
        weekRange: { start: '2026-05-12T00:00:00.000Z', end: '2026-05-18T00:00:00.000Z' },
        summary: {
          pillarDominant: 'Body',
          pillarDominantStats: { xp: 188, completions: 8 },
          highlight: '2L de agua',
          completions: 14,
          xpTotal: 438,
          energyHighlight: { metric: 'HP', value: 74, deltaPct: 5.1, hasHistory: true },
          effortBalance: {
            easy: 7,
            medium: 5,
            hard: 2,
            total: 14,
            topTask: { title: 'Dormir 8hs', completions: 6, difficulty: 'medium' },
            topHardTask: { title: 'No dulces', completions: 2 },
          },
        },
        emotions: {
          weekly: {
            key: 'calma',
            label: 'Calma',
            tone: 'estable',
            color: '#64E86E',
            weeklyMessage: 'La semana cerró con calma como emoción dominante.',
            biweeklyContext: 'En los últimos 15 días la calma se sostuvo como base emocional.',
          },
          biweekly: {
            key: 'calma',
            label: 'Calma',
            tone: 'estable',
            color: '#64E86E',
            weeklyMessage: 'La semana cerró con calma como emoción dominante.',
            biweeklyContext: 'En los últimos 15 días la calma se sostuvo como base emocional.',
          },
        },
        levelUp: { happened: false, currentLevel: 24, previousLevel: 24, xpGained: 438, forced: false },
        sections: [
          { key: 'intro', title: 'Weekly Wrapped', body: 'Tus últimos 7 días en Innerbloom.', accent: '12 may → 18 may' },
          { key: 'achievements', title: 'Resumen 7 días', body: 'Completaste 14 tareas en los últimos 7 días.', accent: 'Datos reales' },
          {
            key: 'habits',
            title: 'Ritmo que se sostiene',
            body: 'Estos hábitos fueron los que más empujaron tu constancia.',
            items: [
              { title: 'Dormir 8hs', body: '6/7 días. Sostuviste el compromiso.', badge: 'racha 12d', pillar: 'Body', daysActive: 6 },
              { title: '2L de agua', body: '7/7 días. Sostuviste el compromiso.', badge: 'cerca del hábito', pillar: 'Body', daysActive: 7 },
              { title: 'Planificar el día', body: '4/7 días. Ordenó el foco de la semana.', badge: 'foco', pillar: 'Mind', daysActive: 4 },
            ],
          },
          { key: 'improvement', title: 'Progreso y foco', body: '2L de agua fue el avance más claro de la semana.', accent: 'Momentum' },
          { key: 'pillar', title: 'Pilar dominante', body: 'Body lideró tu energía estos días.', accent: 'Body' },
          { key: 'highlight', title: 'Highlight emocional', body: 'Calma fue la emoción predominante.', accent: 'Calma' },
          { key: 'closing', title: 'Cierre', body: 'Una semana sólida para sostener hábitos.', accent: 'Seguimos' },
        ],
      } as WeeklyWrappedRecord['payload'],
    },
    {
      id: 'premium-weekly-2',
      userId: 'labs',
      weekStart: '2026-05-05',
      weekEnd: '2026-05-11',
      createdAt: '2026-05-11T00:00:00.000Z',
      updatedAt: '2026-05-11T00:00:00.000Z',
      seen: true,
      completionDays: ['2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08', '2026-05-09'],
      payload: {
        mode: 'preview',
        dataSource: 'mock',
        variant: 'full',
        weekRange: { start: '2026-05-05T00:00:00.000Z', end: '2026-05-11T00:00:00.000Z' },
        summary: {
          pillarDominant: 'Mind',
          pillarDominantStats: { xp: 162, completions: 6 },
          highlight: 'Planificar el día',
          completions: 10,
          xpTotal: 312,
          energyHighlight: { metric: 'FOCUS', value: 68, deltaPct: 12.4, hasHistory: true },
          effortBalance: {
            easy: 4,
            medium: 5,
            hard: 1,
            total: 10,
            topTask: { title: 'Planificar el día', completions: 5, difficulty: 'medium' },
            topHardTask: { title: 'Leer 20 min', completions: 1 },
          },
        },
        emotions: {
          weekly: {
            key: 'motivacion',
            label: 'Motivación',
            tone: 'impulso',
            color: '#A05AC8',
            weeklyMessage: 'Motivación marcó el pulso de la semana.',
            biweeklyContext: 'El foco mental tuvo más presencia en los últimos 15 días.',
          },
          biweekly: {
            key: 'motivacion',
            label: 'Motivación',
            tone: 'impulso',
            color: '#A05AC8',
            weeklyMessage: 'Motivación marcó el pulso de la semana.',
            biweeklyContext: 'El foco mental tuvo más presencia en los últimos 15 días.',
          },
        },
        levelUp: { happened: true, currentLevel: 24, previousLevel: 23, xpGained: 312, forced: false },
        sections: [
          { key: 'intro', title: 'Weekly Wrapped', body: 'Tus últimos 7 días en Innerbloom.', accent: '5 may → 11 may' },
          { key: 'level-up', title: 'Subida de nivel', body: 'Llegaste al nivel 24.', accent: 'Level Up' },
          { key: 'achievements', title: 'Resumen 7 días', body: 'Completaste 10 tareas en los últimos 7 días.', accent: 'Datos reales' },
          {
            key: 'habits',
            title: 'Ritmo que se sostiene',
            body: 'Estos hábitos sostuvieron tu semana.',
            items: [
              { title: 'Planificar el día', body: '5/7 días. Ordenó el foco de la semana.', badge: 'foco', pillar: 'Mind', daysActive: 5 },
              { title: 'Leer 20 min', body: '3/7 días. Aprendizaje activo.', badge: 'mente', pillar: 'Mind', daysActive: 3 },
              { title: 'Respirar 4 minutos', body: '4/7 días. Regulación emocional.', badge: 'calma', pillar: 'Soul', daysActive: 4 },
            ],
          },
          { key: 'improvement', title: 'Progreso y foco', body: 'Planificar el día fue el avance más claro de la semana.', accent: 'Momentum' },
          { key: 'pillar', title: 'Pilar dominante', body: 'Mind lideró tu energía estos días.', accent: 'Mind' },
          { key: 'highlight', title: 'Highlight emocional', body: 'Motivación fue la emoción predominante.', accent: 'Motivación' },
          { key: 'closing', title: 'Cierre', body: 'Una semana con foco para seguir cultivando.', accent: 'Seguimos' },
        ],
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
      completionDays: [
        '2026-05-01', '2026-05-02', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06',
        '2026-05-08', '2026-05-09', '2026-05-10', '2026-05-11', '2026-05-12', '2026-05-13',
        '2026-05-15', '2026-05-16', '2026-05-17', '2026-05-18', '2026-05-19', '2026-05-20',
        '2026-05-22', '2026-05-23', '2026-05-24', '2026-05-25', '2026-05-27', '2026-05-28',
      ],
      payload: {},
      summary: { weeks: ['done', 'done', 'done', 'partial', 'done'] },
    },
  ],
  growthCalibration: {
    countdownDays: 12,
    latestPeriodLabel: '2026-04-30',
    summary: { up: 1, keep: 27, down: 3, total: 31 },
    latestResults: [
      buildFallbackCalibrationRow('premium-cooking', 'Cocinar una receta nueva', 'Media', 'Difícil', 2, 11.14, 18, 'up', 'Completion rate 18.0% was below 50%, difficulty increased.'),
      buildFallbackCalibrationRow('premium-reading', 'Leer 10 o + páginas de un libro de conocimiento', 'Hard', 'Hard', 0, 11.14, 0, 'keep', 'Completion rate 0.0% was below 50%, attempted increase but already at max difficulty, clamped.', 'attempted_increase_at_max_difficulty'),
      buildFallbackCalibrationRow('premium-minoxidil', 'Minoxidil noche', 'Difícil', 'Media', 26, 11.14, 233, 'down', 'Completion rate 233.0% was at or above 80%, difficulty decreased.'),
      buildFallbackCalibrationRow('premium-board-games', 'Jugar juegos de mesa', 'Hard', 'Hard', 1, 11.14, 9, 'keep', 'Completion rate 9.0% was below 50%, attempted increase but already at max difficulty, clamped.', 'attempted_increase_at_max_difficulty'),
      buildFallbackCalibrationRow('premium-painting', 'Pintar', 'Hard', 'Hard', 0, 11.14, 0, 'keep', 'Completion rate 0.0% was below 50%, attempted increase but already at max difficulty, clamped.', 'attempted_increase_at_max_difficulty'),
    ],
  },
  habitAchievements: {
    pendingCount: 2,
    achievedByPillar: [
      {
        pillar: { id: 'body', code: 'BODY', name: 'Cuerpo' },
        habits: [
          buildFallbackHabit('premium-sleep-seal', 'Dormir 8hs', 'Sueño', 'sleep', 'BODY', 'maintained'),
          buildFallbackHabit('premium-water-seal', '2L de agua', 'Hidratación', 'hydration', 'BODY', 'maintained'),
          buildFallbackHabit('premium-run-seal', '10.000 pasos', 'Movilidad', 'mobility', 'BODY', 'maintained'),
        ],
      },
      {
        pillar: { id: 'mind', code: 'MIND', name: 'Mente' },
        habits: [
          buildFallbackHabit('premium-focus-seal', 'Planificar el día', 'Enfoque', 'focus', 'MIND', 'pending_decision'),
          buildFallbackHabit('premium-read-seal', 'Leer 20 min', 'Aprendizaje', 'learning', 'MIND', 'not_achieved'),
        ],
      },
      {
        pillar: { id: 'soul', code: 'SOUL', name: 'Alma' },
        habits: [
          buildFallbackHabit('premium-gratitude-seal', 'Escribir gratitud', 'Gratitud', 'gratitude', 'SOUL', 'pending_decision'),
          buildFallbackHabit('premium-calm-seal', 'Meditar', 'Calma', 'calm', 'SOUL', 'not_achieved'),
        ],
      },
    ],
  },
};

const EMPTY_REWARDS_HISTORY: RewardsHistorySummary = {
  weeklyWrapups: [],
  weeklyUnseenCount: 0,
  monthlyWrapups: [],
  growthCalibration: {
    countdownDays: 0,
    latestPeriodLabel: null,
    summary: { up: 0, keep: 0, down: 0, total: 0 },
    latestResults: [],
  },
  habitAchievements: {
    pendingCount: 0,
    achievedByPillar: [],
  },
};

export function PremiumRewardsSection({
  backendUserId,
  localSnapshot,
  onboardingPreview = false,
}: {
  backendUserId: string | null;
  localSnapshot?: LocalOnboardingSnapshot | null;
  onboardingPreview?: boolean;
}) {
  const [activePillar, setActivePillar] = useState<RewardsPillarCode>('BODY');
  const [activeIndex, setActiveIndex] = useState(1);
  const [flippedHabitId, setFlippedHabitId] = useState<string | null>(null);
  const [showCalibrationDetail, setShowCalibrationDetail] = useState(false);
  const [localRewards, setLocalRewards] = useState<RewardsHistorySummary | null>(null);
  const [showPendingReview, setShowPendingReview] = useState(false);
  const [pendingDecisionIndex, setPendingDecisionIndex] = useState(0);
  const [pendingActionHabitId, setPendingActionHabitId] = useState<string | null>(null);
  const [maintainActionHabitId, setMaintainActionHabitId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeWeeklyWrapped, setActiveWeeklyWrapped] = useState<WeeklyWrappedRecord | null>(null);
  const [activeMonthlyWrapped, setActiveMonthlyWrapped] = useState<MonthlyWrappedRecord | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const scrollFrameRef = useRef<number | null>(null);
  const { data, reload } = useRequest(
    () => getRewardsHistory(backendUserId ?? ''),
    [backendUserId],
    { enabled: Boolean(backendUserId) },
  );
  const { data: radarData } = useRequest(
    () => getUserXpByTrait(backendUserId ?? ''),
    [backendUserId],
    { enabled: Boolean(backendUserId) },
  );
  const previewRewards = onboardingPreview && localSnapshot ? buildLocalPreviewRewards(localSnapshot) : EMPTY_REWARDS_HISTORY;
  const rewards = localRewards ?? data ?? (onboardingPreview ? previewRewards : FALLBACK_REWARDS_HISTORY);
  const hasRealRewards = Boolean(localRewards ?? data) || onboardingPreview;
  const groups = normalizeRewardGroups(rewards.habitAchievements.achievedByPillar);
  const activeGroup = groups.find((group) => group.pillar.code === activePillar) ?? groups[0];
  const habits = activeGroup?.habits ?? [];
  const pendingReviewItems = getPendingAchievementItems(rewards);
  const pendingReviewCount = pendingReviewItems.length;
  const currentPendingReview = pendingReviewItems[pendingDecisionIndex] ?? pendingReviewItems[0] ?? null;
  const safeActiveIndex = Math.min(Math.max(activeIndex, 0), Math.max(habits.length - 1, 0));
  const growth = rewards.growthCalibration;
  const weeklyItems = rewards.weeklyWrapups.length
    ? rewards.weeklyWrapups.slice(0, 2)
    : hasRealRewards
      ? []
      : FALLBACK_REWARDS_HISTORY.weeklyWrapups.slice(0, 2);
  const monthly = rewards.monthlyWrapups[0] ?? (hasRealRewards ? null : FALLBACK_REWARDS_HISTORY.monthlyWrapups[0]);

  useEffect(() => {
    const initialIndex = Math.min(1, Math.max(0, habits.length - 1));
    setActiveIndex(initialIndex);
    setFlippedHabitId(null);
    const carousel = carouselRef.current;
    const selected = carousel?.children.item(initialIndex) as HTMLElement | null;
    if (!carousel || !selected) return;
    carousel.scrollTo({
      behavior: 'auto',
      left: selected.offsetLeft - (carousel.clientWidth - selected.clientWidth) / 2,
    });
  }, [activePillar, habits.length]);

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) window.cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  useEffect(() => {
    setLocalRewards(null);
    setActionError(null);
  }, [backendUserId]);

  useEffect(() => {
    if (pendingDecisionIndex >= pendingReviewItems.length) {
      setPendingDecisionIndex(0);
    }
  }, [pendingDecisionIndex, pendingReviewItems.length]);

  const moveToHabit = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), habits.length - 1);
    const carousel = carouselRef.current;
    const selected = carousel?.children.item(nextIndex) as HTMLElement | null;
    setActiveIndex(nextIndex);
    setFlippedHabitId(null);
    if (!carousel || !selected) return;
    carousel.scrollTo({
      behavior: 'smooth',
      left: selected.offsetLeft - (carousel.clientWidth - selected.clientWidth) / 2,
    });
  };

  const syncActiveCardFromScroll = () => {
    const carousel = carouselRef.current;
    if (!carousel || scrollFrameRef.current !== null) return;
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      const center = carousel.scrollLeft + carousel.clientWidth / 2;
      const nextIndex = Array.from(carousel.children).reduce((closest, child, index) => {
        const card = child as HTMLElement;
        const distance = Math.abs(card.offsetLeft + card.clientWidth / 2 - center);
        return distance < closest.distance ? { index, distance } : closest;
      }, { index: safeActiveIndex, distance: Number.POSITIVE_INFINITY }).index;
      if (nextIndex !== safeActiveIndex) {
        setActiveIndex(nextIndex);
        setFlippedHabitId(null);
      }
    });
  };

  const updateLocalHabit = (
    taskId: string,
    updater: (habit: HabitAchievementShelfItem) => HabitAchievementShelfItem,
  ) => {
    setLocalRewards((current) => updateHabitInRewards(current ?? rewards, taskId, updater));
  };

  const handlePendingDecision = async (
    habit: HabitAchievementShelfItem,
    decision: 'maintain' | 'store',
  ) => {
    setPendingActionHabitId(habit.id);
    setActionError(null);
    const nextPendingCount = Math.max(0, pendingReviewCount - 1);
    try {
      if (backendUserId) {
        await decideTaskHabitAchievement(habit.taskId, decision);
        emitHabitAchievementUpdated();
        reload();
      }
      updateLocalHabit(habit.taskId, (item) => ({
        ...item,
        status: decision === 'maintain' ? 'maintained' : 'stored',
        achievedAt: item.achievedAt ?? new Date().toISOString(),
        decisionMadeAt: new Date().toISOString(),
        seal: { visible: true },
        maintainEnabled: decision === 'maintain',
      }));
      if (nextPendingCount === 0) {
        setShowPendingReview(false);
        setPendingDecisionIndex(0);
      } else {
        setPendingDecisionIndex((index) => Math.min(index, nextPendingCount - 1));
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No pudimos guardar la decisión.');
    } finally {
      setPendingActionHabitId(null);
    }
  };

  const handleToggleMaintained = async (habit: HabitAchievementShelfItem, enabled: boolean) => {
    setMaintainActionHabitId(habit.id);
    setActionError(null);
    try {
      if (backendUserId) {
        await toggleTaskHabitAchievementMaintained(habit.taskId, enabled);
        emitHabitAchievementUpdated();
        reload();
      }
      updateLocalHabit(habit.taskId, (item) => ({
        ...item,
        status: enabled ? 'maintained' : 'stored',
        decisionMadeAt: new Date().toISOString(),
        maintainEnabled: enabled,
      }));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No pudimos actualizar el tracking.');
    } finally {
      setMaintainActionHabitId(null);
    }
  };

  if (showCalibrationDetail) {
    return (
      <GrowthCalibrationDetailView
        growth={growth}
        onClose={() => setShowCalibrationDetail(false)}
      />
    );
  }

  return (
    <section className="space-y-7">
      <style>
        {`
          @keyframes mpAchievementMonthIn {
            from { opacity: 0; transform: translateY(8px) scale(0.84); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes mpAchievementCheckIn {
            0% { opacity: 0; transform: scale(0.52) rotate(-18deg); }
            70% { opacity: 1; transform: scale(1.08) rotate(0deg); }
            100% { opacity: 1; transform: scale(1) rotate(0deg); }
          }
          @media (prefers-reduced-motion: reduce) {
            .mp-achievement-month, .mp-achievement-check { animation: none !important; opacity: 1 !important; }
          }
        `}
      </style>
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
        {habits.length ? (
          <div className="space-y-4">
            <div
              aria-label="Carrusel de hábitos logrados"
              className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden px-[12%] py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              onScroll={syncActiveCardFromScroll}
              ref={carouselRef}
            >
              {habits.map((habit, index) => (
                <AchievementCarouselCard
                  habit={habit}
                  backendUserId={backendUserId}
                  isActive={index === safeActiveIndex}
                  isFlipped={flippedHabitId === habit.id}
                  key={habit.id}
                  maintainPending={maintainActionHabitId === habit.id}
                  onClick={() => {
                    if (index !== safeActiveIndex) {
                      moveToHabit(index);
                      return;
                    }
                    setFlippedHabitId((current) => (current === habit.id ? null : habit.id));
                  }}
                  onToggleMaintained={handleToggleMaintained}
                />
              ))}
            </div>
            <CarouselProgressIndicator activeIndex={safeActiveIndex} total={habits.length} />
          </div>
        ) : (
          <p className="rounded-[1.25rem] border border-[color:var(--mp-border)] p-6 text-center text-sm text-[color:var(--mp-text-secondary)]">
            Todavía no hay hábitos para mostrar.
          </p>
        )}
      </section>

      <button
        className="flex w-full items-center gap-4 border-y border-[color:var(--mp-border)] py-4 text-left disabled:opacity-45"
        disabled={pendingReviewCount === 0}
        onClick={() => {
          setPendingDecisionIndex(0);
          setActionError(null);
          setShowPendingReview(true);
        }}
        type="button"
      >
        <span className="text-[color:var(--mp-violet)]">
          <TraitIcon size={22} trait="logros" />
        </span>
        <span className="flex-1 text-base text-[color:var(--mp-text)]">Pendientes de revisar: {pendingReviewCount}</span>
        <span className="text-3xl font-light text-[color:var(--mp-text-secondary)]">›</span>
      </button>
      {actionError ? (
        <p className="-mt-4 text-sm text-[color:var(--mp-red)]">{actionError}</p>
      ) : null}

      <GrowthCalibrationPremium
        growth={growth}
        onOpen={() => setShowCalibrationDetail(true)}
      />
      <WeeklyWrappedPremium
        onOpenWeekly={setActiveWeeklyWrapped}
        weeklyItems={weeklyItems}
      />
      {monthly ? (
        <MonthlyWrappedPremium monthly={monthly} onOpenMonthly={setActiveMonthlyWrapped} />
      ) : (
        <WrappedEmptySection
          countdownDays={getMonthlyCountdownDays()}
          subtitle="Todavía no hay resumen mensual real"
          title="Monthly Wrapped"
        />
      )}

      {showPendingReview && currentPendingReview ? (
        <PendingAchievementReviewSheet
          actionPending={pendingActionHabitId === currentPendingReview.id}
          currentIndex={pendingDecisionIndex}
          habit={currentPendingReview}
          onClose={() => setShowPendingReview(false)}
          onMaintain={() => void handlePendingDecision(currentPendingReview, 'maintain')}
          onStore={() => void handlePendingDecision(currentPendingReview, 'store')}
          total={pendingReviewCount}
        />
      ) : null}
      {activeWeeklyWrapped
        ? renderStoryPortal(
            <PremiumWeeklyWrappedStory
              onClose={() => setActiveWeeklyWrapped(null)}
              radarTraits={radarData?.traits ?? []}
              weekly={activeWeeklyWrapped}
            />,
          )
        : null}
      {activeMonthlyWrapped
        ? renderStoryPortal(
            <PremiumMonthlyWrappedStory
              monthly={activeMonthlyWrapped}
              onClose={() => setActiveMonthlyWrapped(null)}
              rewards={rewards}
            />,
          )
        : null}
    </section>
  );
}

function renderStoryPortal(children: ReactNode) {
  if (typeof document === 'undefined') return children;
  return createPortal(children, document.body);
}

function CarouselProgressIndicator({ activeIndex, total }: { activeIndex: number; total: number }) {
  return (
    <div className="flex min-w-0 flex-col items-center justify-center gap-2 px-1">
      <p className="text-sm font-semibold text-[color:var(--mp-text-secondary)]">
        {total ? `${activeIndex + 1} / ${total}` : '0 / 0'}
      </p>
      <div className="flex gap-2">
        {Array.from({ length: total }, (_, index) => (
          <span
            className={`h-2.5 w-2.5 rounded-full ${index === activeIndex ? 'bg-[color:var(--mp-violet)]' : 'bg-[color:var(--mp-border)]'}`}
            key={`achievement-progress-${index}`}
          />
        ))}
      </div>
    </div>
  );
}

function AchievementCarouselCard({
  backendUserId,
  habit,
  isActive,
  isFlipped,
  maintainPending,
  onClick,
  onToggleMaintained,
}: {
  backendUserId: string | null;
  habit: HabitAchievementShelfItem;
  isActive: boolean;
  isFlipped: boolean;
  maintainPending: boolean;
  onClick: () => void;
  onToggleMaintained: (habit: HabitAchievementShelfItem, enabled: boolean) => Promise<void>;
}) {
  const achieved = isHabitAchieved(habit);
  const sizeClass = 'w-[15.25rem] min-h-[21rem]';
  const borderClass = achieved
    ? isActive
      ? 'border-violet-300/65 bg-[color:var(--mp-surface)] shadow-[0_0_0_1px_rgba(167,139,250,0.18)]'
      : 'border-[color:var(--mp-border)] bg-[color:var(--mp-surface)]'
    : isActive
      ? 'border-amber-300/55 bg-[color:var(--mp-surface)]'
      : 'border-[color:var(--mp-border)] bg-[color:var(--mp-surface)]';

  return (
    <div
      aria-pressed={isFlipped}
      className={`relative shrink-0 snap-center cursor-pointer transition-[transform,opacity] duration-300 [perspective:1100px] ${sizeClass} ${
        isActive ? 'scale-100 opacity-100' : 'scale-[0.92] opacity-50'
      }`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div
        className={`relative h-full min-h-[21rem] rounded-[1.55rem] transition-transform duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}
      >
        <div className={`absolute inset-0 rounded-[1.55rem] border p-4 text-center [backface-visibility:hidden] ${borderClass} ${achieved ? '' : 'opacity-70 grayscale'}`}>
          <AchievementFrontFace habit={habit} isActive={isActive} />
        </div>
        <div className={`absolute inset-0 rounded-[1.55rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-4 [backface-visibility:hidden] [transform:rotateY(180deg)] ${achieved ? '' : 'border-amber-300/55'}`}>
          {achieved ? (
            <AchievementBackFace
              habit={habit}
              maintainPending={maintainPending}
              onToggleMaintained={onToggleMaintained}
            />
          ) : (
            <LockedHabitBackFace backendUserId={backendUserId} habit={habit} isFlipped={isFlipped} />
          )}
        </div>
      </div>
    </div>
  );
}

function AchievementFrontFace({ habit }: { habit: HabitAchievementShelfItem; isActive: boolean }) {
  const achieved = isHabitAchieved(habit);

  return (
    <div className="relative flex h-full flex-col items-center text-center">
      <HabitAchievementSeal
        alt={`${habit.taskName} seal`}
        disabled={!achieved}
        fallback={<TraitIcon size={140} trait={habit.trait?.name} />}
        imgClassName="h-full w-full object-contain"
        className={`mx-auto grid h-40 w-40 shrink-0 place-items-center ${
          achieved ? '' : 'opacity-50 grayscale'
        }`}
        pillar={habit.pillar}
        traitCode={habit.trait?.code}
        traitName={habit.trait?.name}
      />

      <h3 className="mt-3 line-clamp-3 text-[1.08rem] font-semibold leading-[1.12] text-[color:var(--mp-text)]">
        {habit.taskName}
      </h3>

      <p className="mt-2 flex max-w-full items-center justify-center gap-2 overflow-hidden text-sm leading-none">
        <span className="min-w-0 truncate text-[color:var(--mp-text-secondary)]">
          {habit.trait?.name ?? 'Rasgo'}
        </span>
        <span className="shrink-0 text-[color:var(--mp-text-muted)]">·</span>
        <span
          className={`shrink-0 font-semibold ${
            achieved
              ? 'text-[color:var(--mp-violet-strong)]'
              : 'text-[color:var(--mp-text-muted)]'
          }`}
        >
          {achieved ? 'Logrado' : 'Bloqueado'}
        </span>
      </p>

      {achieved ? (
        <button
          className="mt-auto inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold text-[color:var(--mp-violet-strong)]"
          onClick={(event) => {
            event.stopPropagation();
            shareAchievement(habit);
          }}
          type="button"
        >
          <span aria-hidden="true" className="text-sm leading-none">⇧</span>
          Compartir
        </button>
      ) : null}

      <span
        aria-hidden="true"
        className="absolute bottom-2.5 right-2.5 text-base leading-none text-[color:var(--mp-text-muted)] opacity-45"
      >
        ↘
      </span>
    </div>
  );
}

function AchievementBackFace({
  habit,
  maintainPending,
  onToggleMaintained,
}: {
  habit: HabitAchievementShelfItem;
  maintainPending: boolean;
  onToggleMaintained: (habit: HabitAchievementShelfItem, enabled: boolean) => Promise<void>;
}) {
  return (
    <div className="flex h-full flex-col justify-center text-left">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--mp-amber)]">Logro desbloqueado</p>
      <h3 className="mt-6 text-center text-2xl font-semibold leading-tight text-[color:var(--mp-text)]">{habit.taskName}</h3>
      <p className="mt-2 text-center text-lg text-[color:var(--mp-text-secondary)]">{habit.trait?.name ?? 'Rasgo'}</p>
      <div className="mt-7 space-y-4 border-y border-[color:var(--mp-border)] py-5 text-base">
        <AchievementDetailRow label="Logrado" value={formatCompactDate(habit.achievedAt)} />
        <AchievementDetailRow label="GP antes" value={`${habit.gpBeforeAchievement} GP`} />
        <div className="flex items-center justify-between gap-4">
          <span className="text-[color:var(--mp-text-secondary)]">Mantener</span>
          <MaintainAchievementToggle
            checked={habit.maintainEnabled}
            disabled={maintainPending}
            onToggle={() => void onToggleMaintained(habit, !habit.maintainEnabled)}
          />
        </div>
      </div>
      <p className="mt-auto text-center text-[10px] text-[color:var(--mp-text-muted)] opacity-60">
        Toca para volver
      </p>
    </div>
  );
}

function MaintainAchievementToggle({
  checked,
  disabled,
  onToggle,
}: {
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center">
      <button
        aria-checked={checked}
        aria-label="Mantener activo"
        className={`relative h-7 w-[3.15rem] shrink-0 rounded-full border transition disabled:opacity-50 ${
          checked
            ? 'border-violet-300/75 bg-violet-500/70'
            : 'border-[color:var(--mp-border)] bg-white/[0.08]'
        }`}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        role="switch"
        type="button"
      >
        <span
          className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-[color:var(--mp-text)] shadow-[0_8px_22px_rgba(0,0,0,0.32)] transition-transform ${
            checked ? 'translate-x-[1.45rem]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function LockedHabitBackFace({ backendUserId, habit, isFlipped }: { backendUserId: string | null; habit: HabitAchievementShelfItem; isFlipped: boolean }) {
  const { data: insights } = useRequest(
    () => getTaskInsights(habit.taskId, { range: 'month' }),
    [habit.taskId, backendUserId],
    { enabled: Boolean(backendUserId && habit.taskId) },
  );
  const development = insights
    ? buildHabitDevelopmentFromInsights(insights)
    : habit.gpBeforeAchievement === -1
      ? buildHabitDevelopmentPreview(habit)
      : null;

  if (!development) {
    return (
      <div className="flex h-full flex-col justify-between text-center">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--mp-violet)]">Desarrollo del hábito</p>
          <p className="mt-5 inline-flex rounded-full border border-[color:var(--mp-border)] px-4 py-2 text-sm font-semibold text-[color:var(--mp-amber)]">Bloqueado</p>
        </div>

        <p className="mx-auto max-w-[13rem] text-sm leading-6 text-[color:var(--mp-text-secondary)]">
          Todavía no hay suficiente evidencia real para mostrar el desarrollo de este hábito.
        </p>

        <p className="text-xs text-[color:var(--mp-text-muted)]">Se desbloquea con la revisión mensual.</p>
      </div>
    );
  }
  const visibleMonths = resolveHabitDevelopmentMonths(development.months);
  const activeWindowStartIndex = Math.max(0, visibleMonths.length - 3);
  return (
    <div className="flex h-full flex-col justify-between text-center">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--mp-violet)]">Desarrollo del hábito</p>
        <div className="mt-4">
          <HabitStatusChip compact label={development.status} score={development.score} />
        </div>
      </div>

      <div className="grid place-items-center">
        <PremiumScoreRing animateKey={`${habit.id}-${isFlipped}`} score={development.score} size="sm" />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-center gap-1.5 text-[9px] font-medium text-[color:var(--mp-text-muted)]">
          <span className="text-[color:var(--mp-red)]">Frágil &lt;50</span>
          <span>·</span>
          <span className="text-[color:var(--mp-amber)]">50-79</span>
          <span>·</span>
          <span className="text-[color:var(--mp-green)]">Fuerte ≥80</span>
        </div>
        <div
          className="grid items-start gap-1"
          style={{ gridTemplateColumns: `repeat(${Math.max(visibleMonths.length, 3)}, minmax(0, 1fr))` }}
        >
          <div
            className="mb-2 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[color:var(--mp-text-muted)]"
            style={{ gridColumn: `${activeWindowStartIndex + 1} / ${Math.max(visibleMonths.length, 3) + 1}` }}
          >
            <span className="h-px flex-1 bg-[color:var(--mp-border)]" />
            <span>Ventana activa</span>
            <span className="h-px flex-1 bg-[color:var(--mp-border)]" />
          </div>
          <div
            className="grid items-start gap-2"
            style={{ gridColumn: `1 / ${Math.max(visibleMonths.length, 3) + 1}`, gridTemplateColumns: `repeat(${Math.max(visibleMonths.length, 3)}, minmax(0, 1fr))` }}
          >
            {visibleMonths.map((month, index) => (
              <MonthHealthDot
                active={index >= activeWindowStartIndex}
                key={`${habit.id}-active-${month.periodKey ?? month.month}`}
                month={month.month}
                percent={month.percent}
                projected={month.projected}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PendingAchievementReviewSheet({
  habit,
  currentIndex,
  total,
  actionPending,
  onClose,
  onMaintain,
  onStore,
}: {
  habit: HabitAchievementShelfItem;
  currentIndex: number;
  total: number;
  actionPending: boolean;
  onClose: () => void;
  onMaintain: () => void;
  onStore: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/62 px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[25rem] overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_18%_6%,rgba(167,139,250,0.16),transparent_34%),linear-gradient(180deg,rgba(18,18,21,0.98),rgba(8,8,10,0.98))] p-5 shadow-[0_-24px_70px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--mp-text-muted)]">
              Hábito logrado {currentIndex + 1}/{total}
            </p>
            <h3 className="mt-2 text-3xl font-semibold leading-tight text-[color:var(--mp-text)]">
              {habit.taskName}
            </h3>
          </div>
          <button
            aria-label="Cerrar revisión"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[color:var(--mp-border)] bg-white/5 text-2xl text-[color:var(--mp-text-secondary)]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-7 grid grid-cols-[5.7rem_1fr] items-center gap-5">
          <div className="grid h-[5.7rem] w-[5.7rem] place-items-center rounded-[1.35rem] bg-violet-400/[0.06] shadow-[0_0_34px_rgba(167,139,250,0.18)]">
            <HabitAchievementSeal
              alt={`${habit.taskName} seal`}
              fallback={<TraitIcon size={72} trait={habit.trait?.name} />}
              imgClassName="h-full w-full object-contain"
              className="h-[5rem] w-[5rem]"
              pillar={habit.pillar}
              traitCode={habit.trait?.code}
              traitName={habit.trait?.name}
            />
          </div>
          <div className="min-w-0">
            <p className="text-base text-[color:var(--mp-text-secondary)]">
              {habit.trait?.name ?? 'Rasgo'} · {resolvePillarShortLabel(habit.pillar)}
            </p>
          </div>
        </div>

        <div className="mt-7 border-y border-[color:var(--mp-border)] py-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--mp-text-muted)]">Ventana activa</p>
            <span className="mp-achievement-check grid h-7 w-7 place-items-center rounded-full bg-[color:var(--mp-green)] text-sm font-black text-[#06120b]" style={{ animation: 'mpAchievementCheckIn 520ms cubic-bezier(0.22, 1, 0.36, 1) 880ms both' }}>✓</span>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {getAchievementWindowMonths(habit).map((month, index) => (
              <div
                className="mp-achievement-month text-center"
                key={`${habit.id}-${month.label}`}
                style={{ animation: `mpAchievementMonthIn 420ms cubic-bezier(0.22, 1, 0.36, 1) ${index * 170}ms both` }}
              >
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-[color:var(--mp-green)] bg-[color:var(--mp-green)]/10 text-sm font-semibold text-[color:var(--mp-green)]">
                  {month.percent}%
                </div>
                <p className="mt-1 text-[11px] font-medium text-[color:var(--mp-text-muted)]">{month.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <button
            className="rounded-full bg-[color:var(--mp-violet)] px-5 py-4 text-base font-semibold text-white shadow-[0_14px_34px_rgba(139,92,246,0.28)] disabled:opacity-60"
            disabled={actionPending}
            onClick={onMaintain}
            type="button"
          >
            Mantener en seguimiento
          </button>
          <button
            className="rounded-full border border-[color:var(--mp-border)] bg-white/[0.03] px-5 py-4 text-base font-semibold text-[color:var(--mp-text)] disabled:opacity-60"
            disabled={actionPending}
            onClick={onStore}
            type="button"
          >
            Guardar como logrado
          </button>
        </div>
      </div>
    </div>
  );
}

function AchievementDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[color:var(--mp-text-secondary)]">{label}</span>
      <span className="font-semibold text-[color:var(--mp-text)]">{value}</span>
    </div>
  );
}

function MonthHealthDot({ active = true, month, percent, projected }: { active?: boolean; month: string; percent: number; projected?: boolean }) {
  const tone = getScoreTone(percent);
  return (
    <div className={`text-center ${active ? '' : 'opacity-55'}`}>
      <div
        className={`relative mx-auto grid h-10 w-10 place-items-center rounded-full border-2 bg-transparent text-[11px] font-semibold ${projected ? 'shadow-[0_0_22px_rgba(245,197,89,0.12)]' : ''}`}
        style={{ borderColor: tone.color, color: tone.color }}
      >
        {projected ? (
          <span
            aria-hidden="true"
            className="absolute -inset-1 rounded-full border border-dashed opacity-70 motion-safe:animate-spin"
            style={{ borderColor: tone.color, animationDuration: '5s' }}
          />
        ) : null}
        {percent}%
      </div>
      <p className="mt-1 text-[11px] text-[color:var(--mp-text-secondary)]">{month}</p>
      {projected ? <p className="-mt-0.5 text-[8px] text-[color:var(--mp-text-muted)]">proy.</p> : null}
    </div>
  );
}

function resolveHabitDevelopmentMonths(months: Array<{ month: string; percent: number; projected?: boolean; periodKey?: string | null }>) {
  return [...months]
    .sort((a, b) => resolveHabitDevelopmentMonthSortKey(a) - resolveHabitDevelopmentMonthSortKey(b))
    .slice(-4);
}

function resolveHabitDevelopmentMonthSortKey(month: { month: string; periodKey?: string | null }) {
  if (month.periodKey && /^\d{4}-\d{2}/.test(month.periodKey)) {
    const [year, rawMonth] = month.periodKey.split('-').map(Number);
    return year * 12 + rawMonth;
  }
  const normalized = month.month.trim().toLowerCase().replace('.', '');
  const monthIndexByLabel: Record<string, number> = {
    ene: 1,
    feb: 2,
    mar: 3,
    abr: 4,
    may: 5,
    jun: 6,
    jul: 7,
    ago: 8,
    sep: 9,
    sept: 9,
    oct: 10,
    nov: 11,
    dic: 12,
  };
  const monthIndex = monthIndexByLabel[normalized];
  if (monthIndex) {
    return new Date().getFullYear() * 12 + monthIndex;
  }
  const parsed = new Date(`${month.month} 1, ${new Date().getFullYear()}`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getFullYear() * 12 + parsed.getMonth() + 1;
}

function buildHabitDevelopmentPreview(habit: HabitAchievementShelfItem) {
  const score = Math.max(0, Math.min(100, Math.round(habit.gpSinceMaintain)));
  const now = new Date();
  const periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return {
    score,
    status: habitDevelopmentStatusLabel(score),
    previousMonths: [],
    months: [
      { month: new Intl.DateTimeFormat('es', { month: 'short' }).format(now), percent: score, projected: true, periodKey },
    ],
  };
}

function buildLocalPreviewRewards(snapshot: LocalOnboardingSnapshot): RewardsHistorySummary {
  const pillarMeta = {
    Body: { code: 'BODY', name: 'Cuerpo' },
    Mind: { code: 'MIND', name: 'Mente' },
    Soul: { code: 'SOUL', name: 'Alma' },
  } as const;
  return {
    ...EMPTY_REWARDS_HISTORY,
    habitAchievements: {
      pendingCount: 0,
      achievedByPillar: (Object.keys(pillarMeta) as Array<keyof typeof pillarMeta>).map((pillar) => ({
        pillar: { id: pillar.toLowerCase(), ...pillarMeta[pillar] },
        habits: snapshot.tasks
          .filter((task) => task.pillar === pillar)
          .map((task) => ({
            id: `local-${task.id}`,
            taskId: task.id,
            taskName: task.name,
            pillar: pillarMeta[pillar].code,
            trait: { id: null, code: null, name: task.trait },
            seal: { visible: false },
            status: 'not_achieved' as const,
            achievedAt: null,
            decisionMadeAt: null,
            gpBeforeAchievement: -1,
            gpSinceMaintain: Math.min(100, Math.round((task.completionDates.length / 3) * 100)),
            maintainEnabled: false,
          })),
      })),
    },
  };
}

function buildHabitDevelopmentFromInsights(insights: TaskInsightsResponse) {
  const preview = insights.previewAchievement;
  const recentMonths = preview?.recentMonths ?? [];
  if (!preview || recentMonths.length === 0) return null;
  const rawScore = Number(preview.score ?? 0);
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(100, Math.round(rawScore))) : 0;
  const months = recentMonths
    .map((entry) => {
      const raw = entry.projectedCompletionRate ?? entry.completionRate ?? entry.value ?? 0;
      const normalized = normalizeCompletionPercent(raw);
      return {
        month: entry.month ?? formatMonthFromPeriod(entry.periodKey) ?? 'Mes',
        percent: Math.max(0, Math.min(100, Math.round(normalized))),
        periodKey: entry.periodKey ?? null,
        projected: entry.closed === false || entry.projectedCompletionRate != null,
      };
    })
    .filter((entry) => entry.month);
  if (months.length === 0) return null;
  return {
    score,
    status: habitDevelopmentStatusLabel(score),
    previousMonths: [],
    months: resolveHabitDevelopmentMonths(months),
  };
}

function normalizeCompletionPercent(rawValue: number) {
  const raw = Number(rawValue);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return raw <= 2 ? raw * 100 : raw;
}

function getScoreTone(score: number) {
  if (score < 50) return { color: 'var(--mp-red)', soft: 'rgba(255,107,107,0.22)' };
  if (score < 80) return { color: 'var(--mp-amber)', soft: 'rgba(245,197,89,0.2)' };
  return { color: 'var(--mp-green)', soft: 'rgba(91,220,132,0.18)' };
}

function GrowthCalibrationPremium({
  growth,
  onOpen,
}: {
  growth: RewardsHistorySummary['growthCalibration'];
  onOpen: () => void;
}) {
  return (
    <section className="space-y-3">
      <button
        className="w-full text-left"
        onClick={onOpen}
        type="button"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[color:var(--mp-text)]">Resultados de calibración</h2>
            <p className="mt-1 text-sm text-[color:var(--mp-text-secondary)]">Últimos ajustes automáticos de dificultad</p>
          </div>
          <p className="whitespace-nowrap text-sm text-[color:var(--mp-text-secondary)]">
            Próxima: <span className="font-semibold text-[color:var(--mp-violet)]">{growth.countdownDays}d</span>
          </p>
        </div>
        <div className="mt-3 grid grid-cols-3 rounded-[0.9rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] py-3">
          <CalibrationStat icon="↑" label="Subió dificultad" tone="red" value={growth.summary.up} />
          <CalibrationStat icon="•" label="Se mantuvo" tone="amber" value={growth.summary.keep} />
          <CalibrationStat icon="↓" label="Bajó dificultad" tone="green" value={growth.summary.down} />
        </div>
      </button>
    </section>
  );
}

function GrowthCalibrationDetailView({
  growth,
  onClose,
}: {
  growth: RewardsHistorySummary['growthCalibration'];
  onClose: () => void;
}) {
  const [activeFilter, setActiveFilter] = useState<CalibrationFilter | null>(null);
  const results = resolveCalibrationResults(growth);
  const visibleResults = activeFilter ? results.filter((row) => row.finalAction === activeFilter) : results;
  const activeFilterEmptyLabel = activeFilter === 'up' ? 'subido dificultad' : activeFilter === 'down' ? 'bajado dificultad' : 'se hayan mantenido';

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0, behavior: 'auto' });
  }, []);

  return (
    <section className="space-y-6" onClick={() => setActiveFilter(null)}>
      <style>{`
        @keyframes mpCalibrationRowIn {
          from { opacity: 0; transform: translateY(-.75rem); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mpCalibrationIconIn {
          from { opacity: 0; transform: scale(.58); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes mpCalibrationBarLoad {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
        .mp-calibration-row-in {
          animation: mpCalibrationRowIn 520ms cubic-bezier(.2,.85,.25,1) both;
        }
        .mp-calibration-icon-in {
          animation: mpCalibrationIconIn 480ms cubic-bezier(.2,.85,.25,1) both;
        }
        .mp-calibration-bar-load {
          transform-origin: left center;
          animation: mpCalibrationBarLoad 780ms cubic-bezier(.2,.85,.25,1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .mp-calibration-row-in,
          .mp-calibration-icon-in,
          .mp-calibration-bar-load {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
          }
        }
      `}</style>
      <header className="flex items-start justify-between gap-4" onClick={(event) => event.stopPropagation()}>
        <div>
          <button
            className="mb-5 grid h-11 w-11 place-items-center rounded-full border border-[color:var(--mp-border)] text-2xl text-[color:var(--mp-text)]"
            onClick={onClose}
            type="button"
          >
            ‹
          </button>
          <h2 className="text-3xl font-semibold leading-tight text-[color:var(--mp-text)]">Detalle de calibración</h2>
          <p className="mt-2 text-sm uppercase tracking-[0.18em] text-[color:var(--mp-text-muted)]">{growth.latestPeriodLabel ?? 'Último período'}</p>
        </div>
      </header>

      <div className="grid grid-cols-3 border-y border-[color:var(--mp-border)] py-4" onClick={(event) => event.stopPropagation()}>
        <CalibrationStat active={activeFilter === 'up'} icon="↑" label="Subió dificultad" onSelect={() => setActiveFilter((filter) => filter === 'up' ? null : 'up')} tone="red" value={growth.summary.up} />
        <CalibrationStat active={activeFilter === 'keep'} icon="•" label="Se mantuvo" onSelect={() => setActiveFilter((filter) => filter === 'keep' ? null : 'keep')} tone="amber" value={growth.summary.keep} />
        <CalibrationStat active={activeFilter === 'down'} icon="↓" label="Bajó dificultad" onSelect={() => setActiveFilter((filter) => filter === 'down' ? null : 'down')} tone="green" value={growth.summary.down} />
      </div>

      {results.length ? (
        <div className="space-y-0 border-y border-[color:var(--mp-border)]" onClick={(event) => event.stopPropagation()}>
          {visibleResults.length ? (
            visibleResults.map((row, index) => (
              <CalibrationResultRow animationIndex={index} key={`${activeFilter ?? 'all'}-${row.taskId}-${row.evaluatedAt}`} row={row} />
            ))
          ) : (
            <div className="py-8 text-center">
              <p className="text-base font-semibold text-[color:var(--mp-text)]">No hay tareas que hayan {activeFilterEmptyLabel}.</p>
              <p className="mx-auto mt-2 max-w-[18rem] text-sm leading-6 text-[color:var(--mp-text-secondary)]">
                Tocá fuera del listado para volver a ver todos los resultados.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="border-y border-[color:var(--mp-border)] py-8 text-center" onClick={(event) => event.stopPropagation()}>
          <p className="text-base font-semibold text-[color:var(--mp-text)]">Todavía no hay calibraciones reales.</p>
          <p className="mx-auto mt-2 max-w-[18rem] text-sm leading-6 text-[color:var(--mp-text-secondary)]">
            Cuando cierre el período mensual, acá van a aparecer los ajustes reales de dificultad.
          </p>
        </div>
      )}
    </section>
  );
}

function CalibrationResultRow({ row, animationIndex }: { row: RewardsGrowthCalibrationRow; animationIndex: number }) {
  const tone = getCalibrationTone(row.finalAction);
  const progressPercent = Math.min(100, Math.max(0, row.completionRatePct));
  const delayMs = 90 + animationIndex * 95;
  return (
    <article
      className="mp-calibration-row-in border-b border-[color:var(--mp-border)] py-4 last:border-b-0"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-semibold text-[color:var(--mp-text)]">{row.taskTitle}</h4>
          <p className="mt-1 text-xs text-[color:var(--mp-text-secondary)]">
            {row.difficultyBefore ?? '—'} → {row.difficultyAfter ?? '—'}
          </p>
        </div>
        <span className="mp-calibration-icon-in grid h-10 w-10 place-items-center rounded-full border text-xl" style={{ animationDelay: `${delayMs + 120}ms`, borderColor: tone.color, color: tone.color }}>
          {tone.icon}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-[1fr_auto_auto] items-end gap-3">
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-[color:var(--mp-border)]">
            <div className="mp-calibration-bar-load h-full rounded-full" style={{ animationDelay: `${delayMs + 230}ms`, width: `${progressPercent}%`, backgroundColor: tone.color }} />
          </div>
          <p className="mt-1 text-[11px] text-[color:var(--mp-text-muted)]">{cleanCalibrationReason(row)}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-[color:var(--mp-text)]">{formatNumber(row.actualCompletions)} / {formatNumber(row.expectedTarget)}</p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--mp-text-muted)]">progreso</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold" style={{ color: tone.color }}>
            <CountUpNumber delayMs={delayMs + 260} suffix="%" value={Math.round(row.completionRatePct)} />
          </p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-[color:var(--mp-text-muted)]">tasa</p>
        </div>
      </div>
    </article>
  );
}

function CalibrationStat({
  active = false,
  icon,
  value,
  label,
  onSelect,
  tone,
}: {
  active?: boolean;
  icon: string;
  value: number;
  label: string;
  onSelect?: () => void;
  tone: 'red' | 'amber' | 'green';
}) {
  const content = (
    <>
      <span
        className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border text-2xl leading-none text-[color:var(--mp-${tone})]`}
        style={{ borderColor: `var(--mp-${tone})` }}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-semibold leading-none text-[color:var(--mp-text)]">{value}</span>
        <span className="mt-1 block text-xs leading-tight text-[color:var(--mp-text-secondary)]">{label}</span>
      </span>
    </>
  );

  if (onSelect) {
    return (
      <button
        className={`flex items-center gap-3 border-r border-[color:var(--mp-border)] px-3 text-left transition last:border-r-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--mp-violet)]/60 ${active ? 'bg-white/[0.045]' : 'hover:bg-white/[0.025]'}`}
        onClick={(event) => {
          event.currentTarget.blur();
          onSelect();
        }}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 border-r border-[color:var(--mp-border)] px-3 last:border-r-0">
      {content}
    </div>
  );
}

function CountUpNumber({ value, suffix = '', delayMs = 0 }: { value: number; suffix?: string; delayMs?: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    let start: number | null = null;
    const timeout = window.setTimeout(() => {
      const duration = 720;
      const tick = (timestamp: number) => {
        start ??= timestamp;
        const progress = Math.min(1, (timestamp - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(value * eased));
        if (progress < 1) {
          frame = window.requestAnimationFrame(tick);
        }
      };
      frame = window.requestAnimationFrame(tick);
    }, delayMs);

    return () => {
      window.clearTimeout(timeout);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [delayMs, value]);

  return <>{displayValue}{suffix}</>;
}

function getCalibrationTone(action: RewardsGrowthCalibrationRow['finalAction']) {
  if (action === 'up') return { icon: '↑', label: 'Subió dificultad', color: 'var(--mp-red)' };
  if (action === 'down') return { icon: '↓', label: 'Bajó dificultad', color: 'var(--mp-green)' };
  return { icon: '•', label: 'Se mantuvo', color: 'var(--mp-amber)' };
}

function resolveCalibrationResults(growth: RewardsHistorySummary['growthCalibration']) {
  return growth.latestResults;
}

function cleanCalibrationReason(row: RewardsGrowthCalibrationRow) {
  if (row.clampReason?.includes('max')) {
    return 'Sin cambio: ya estaba en dificultad máxima.';
  }
  if (row.clampReason?.includes('min')) {
    return 'Sin cambio: ya estaba en dificultad mínima.';
  }
  if (row.finalAction === 'up') return 'Baja adherencia: el sistema marcó esta tarea como más difícil.';
  if (row.finalAction === 'down') return 'Alta adherencia: el sistema la marcó como más fácil.';
  if (row.completionRatePct >= 50 && row.completionRatePct < 80) {
    return 'Ritmo estable: se conservó la dificultad.';
  }
  return row.reason.replace(/\[.*?\]\s*/g, '').replace(/Completion rate/i, 'Tasa de completado').slice(0, 110);
}

function formatNumber(value: number) {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function normalizePillarCode(value: unknown): RewardsPillarCode | null {
  if (typeof value !== 'string') return null;
  const normalized = value.toUpperCase();
  if (normalized === 'BODY' || normalized === 'CUERPO') return 'BODY';
  if (normalized === 'MIND' || normalized === 'MENTE') return 'MIND';
  if (normalized === 'SOUL' || normalized === 'ALMA') return 'SOUL';
  return null;
}

function PillarSymbol({ pillar }: { pillar: RewardsPillarCode }) {
  if (pillar === 'MIND') {
    return <span aria-label="Mente" className="text-lg leading-none">🧠</span>;
  }
  if (pillar === 'SOUL') {
    return <span aria-label="Alma" className="text-lg leading-none">🌼</span>;
  }
  return <span aria-label="Cuerpo" className="text-lg leading-none">🫀</span>;
}

function WeeklyWrappedPremium({
  onOpenWeekly,
  weeklyItems,
}: {
  onOpenWeekly: (weekly: WeeklyWrappedRecord) => void;
  weeklyItems: WeeklyWrappedRecord[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--mp-text)]">Weekly Wrapped</h2>
          <p className="mt-1 text-sm text-[color:var(--mp-text-secondary)]">Resumen semanal más reciente</p>
        </div>
        <p className="whitespace-nowrap text-sm text-[color:var(--mp-text-secondary)]">
          Próximo en <span className="font-semibold text-[color:var(--mp-violet)]">{getWeeklyCountdownDays()}d</span>
        </p>
      </div>
      <div className="space-y-3">
        {weeklyItems.slice(0, 2).map((weekly) => (
          <WeeklyWrappedRow
            key={weekly.id}
            onOpen={() => onOpenWeekly(weekly)}
            weekly={weekly}
          />
        ))}
      </div>
    </section>
  );
}

function WrappedEmptySection({
  countdownDays,
  subtitle,
  title,
}: {
  countdownDays: number;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--mp-text)]">{title}</h2>
          <p className="mt-1 text-sm text-[color:var(--mp-text-secondary)]">{subtitle}</p>
        </div>
        <p className="whitespace-nowrap text-sm text-[color:var(--mp-text-secondary)]">
          Próximo en <span className="font-semibold text-[color:var(--mp-violet)]">{countdownDays}d</span>
        </p>
      </div>
    </section>
  );
}

function MonthlyWrappedPremium({
  monthly,
  onOpenMonthly,
}: {
  monthly: MonthlyWrappedRecord;
  onOpenMonthly: (monthly: MonthlyWrappedRecord) => void;
}) {
  const states = resolveMonthlyWeekStates(monthly);
  const emotion = resolveMonthlyEmotion(monthly);
  const insight = resolveMonthlyInsight(states);
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[color:var(--mp-text)]">Monthly Wrapped</h2>
          <p className="mt-1 text-sm text-[color:var(--mp-text-secondary)]">{monthly.periodKey}</p>
        </div>
        <p className="whitespace-nowrap text-sm text-[color:var(--mp-text-secondary)]">
          Próximo en <span className="font-semibold text-[color:var(--mp-violet)]">{getMonthlyCountdownDays()}d</span>
        </p>
      </div>
      <button
        className="w-full rounded-[0.9rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-4 text-left transition hover:border-[color:var(--mp-violet)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--mp-violet)]/70"
        onClick={() => onOpenMonthly(monthly)}
        type="button"
      >
        <div className="grid grid-cols-[1fr_auto] items-start gap-4">
          <div>
            <p className="text-base font-semibold text-[color:var(--mp-text)]">{insight}</p>
            <p className="mt-3 inline-flex items-center gap-2 text-sm text-[color:var(--mp-text-secondary)]">
              <span className="h-4 w-4 rounded-full" style={{ backgroundColor: emotion.color }} />
              {emotion.label}
            </p>
          </div>
          <div className="flex items-center justify-end gap-3">
          {states.map((state, index) => (
            <span className="text-center text-xs text-[color:var(--mp-text-secondary)]" key={`month-week-${index}`}>
              <span className={`mx-auto mb-1 block h-4 w-4 rounded-full ${
                state === 'done' ? 'bg-[color:var(--mp-green)]' : state === 'partial' ? 'bg-[color:var(--mp-amber)]' : 'bg-[color:var(--mp-border)]'
              }`} />
              S{index + 1}
            </span>
          ))}
          </div>
        </div>
      </button>
    </section>
  );
}

function WeeklyWrappedRow({ onOpen, weekly }: { onOpen: () => void; weekly: WeeklyWrappedRecord }) {
  const days = enumerateDateRange(weekly.weekStart, weekly.weekEnd).slice(0, 7);
  const completed = new Set(weekly.completionDays ?? []);
  const emotion = weekly.payload.emotions?.weekly ?? weekly.payload.emotions?.biweekly;
  const dominantPillar = normalizePillarCode(weekly.payload.summary?.pillarDominant) ?? 'BODY';
  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  return (
    <button
      className="w-full rounded-[0.9rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] p-4 text-left transition hover:border-[color:var(--mp-violet)]/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--mp-violet)]/70"
      onClick={onOpen}
      type="button"
    >
      <p className="mb-3 text-sm text-[color:var(--mp-text-secondary)]">{formatDateShort(weekly.weekStart)} → {formatDateShort(weekly.weekEnd)}</p>
      <div className="grid grid-cols-[1fr_76px_76px] items-center gap-3">
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((day, index) => (
            <span className="text-center text-[10px] font-semibold text-[color:var(--mp-text-muted)]" key={day}>
              <span className={`mx-auto mb-1 block h-4 w-4 rounded-full ${completed.has(day) ? 'bg-[color:var(--mp-green)]' : 'bg-[color:var(--mp-border)]'}`} />
              {dayLabels[index] ?? ''}
            </span>
          ))}
        </div>
        <div className="border-l border-[color:var(--mp-border)] pl-3 text-center text-xs text-[color:var(--mp-text-secondary)]">
          <span className="mx-auto mb-1 block h-9 w-9 rounded-full shadow-[0_0_24px_rgba(167,139,250,0.24)]" style={{ backgroundColor: emotion?.color ?? 'var(--mp-violet)' }} />
          {emotion?.label ?? 'Calma'}
        </div>
        <div className="border-l border-[color:var(--mp-border)] pl-3">
          <span className="mx-auto grid h-9 w-9 place-items-center rounded-full bg-violet-300/16 text-[color:var(--mp-violet)]">
            <PillarSymbol pillar={dominantPillar} />
          </span>
        </div>
      </div>
    </button>
  );
}

function PremiumWeeklyWrappedStory({
  onClose,
  radarTraits,
  weekly,
}: {
  onClose: () => void;
  radarTraits?: TraitXpEntry[];
  weekly: WeeklyWrappedRecord;
}) {
  const payload = weekly.payload;
  const sectionsByKey = new Map((payload.sections ?? []).map((section) => [section.key, section]));
  const days = enumerateDateRange(weekly.weekStart, weekly.weekEnd).slice(0, 7);
  const completed = new Set(weekly.completionDays ?? []);
  const completedCount = days.filter((day) => completed.has(day)).length;
  const emotion = payload.emotions?.weekly ?? payload.emotions?.biweekly;
  const biweeklyEmotion = payload.emotions?.biweekly ?? emotion;
  const dominantPillar = normalizePillarCode(payload.summary?.pillarDominant) ?? 'BODY';
  const dominantLabel = resolveRewardsPillarLabel(dominantPillar);
  const dominantColor = getWeeklyPillarColor(dominantPillar);
  const habits = (sectionsByKey.get('habits')?.items ?? []).slice(0, 3);
  const energy = payload.summary?.energyHighlight;
  const effort = payload.summary?.effortBalance;
  const effortTotal = effort?.total ?? 0;
  const easyCount = effort?.easy ?? 0;
  const mediumCount = effort?.medium ?? 0;
  const hardCount = effort?.hard ?? 0;
  const easyPct = effortTotal ? Math.round(((effort?.easy ?? 0) / effortTotal) * 100) : 0;
  const mediumPct = effortTotal ? Math.round(((effort?.medium ?? 0) / effortTotal) * 100) : 0;
  const hardPct = effortTotal ? Math.max(0, 100 - easyPct - mediumPct) : 0;
  const weekRange = `${formatDateShort(weekly.weekStart)} → ${formatDateShort(weekly.weekEnd)}`;
  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  const completions = payload.summary?.completions ?? completedCount;
  const xpTotal = payload.summary?.xpTotal ?? 0;
  const dominantPct = resolvePillarDominancePct(payload.summary?.pillarDominantStats?.completions, payload.summary?.completions);
  const storyHabits = habits.length
    ? habits
    : [{ title: payload.summary?.highlight ?? 'Daily Quest', body: `${completedCount}/7 días activos`, pillar: dominantLabel, daysActive: completedCount }];
  const storyScrollRef = useRef<HTMLDivElement | null>(null);
  const storySlideRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeStorySlide, setActiveStorySlide] = useState(0);
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [storyVisualMode, setStoryVisualMode] = useState<WeeklyStoryVisualMode>('dark');
  const hasLevelUp = Boolean(payload.levelUp?.happened);
  const habitsSlideIndex = hasLevelUp ? 3 : 2;
  const pillarSlideIndex = habitsSlideIndex + 1;
  const energySlideIndex = pillarSlideIndex + 1;
  const emotionSlideIndex = energySlideIndex + 1;
  const closingSlideIndex = emotionSlideIndex + 1;

  useBodyScrollLock();

  useEffect(() => {
    const themeNode = document.querySelector('[data-mp-theme]');
    const theme = themeNode?.getAttribute('data-mp-theme');
    setStoryVisualMode(theme === 'light' ? 'light' : 'dark');
  }, []);

  useEffect(() => {
    const root = storyScrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let strongest: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          const index = Number(entry.target.getAttribute('data-weekly-slide') ?? 0);
          if (!strongest || entry.intersectionRatio > strongest.ratio) {
            strongest = { index, ratio: entry.intersectionRatio };
          }
        }
        if (strongest && strongest.ratio > 0.42) {
          setActiveStorySlide(strongest.index);
        }
      },
      { root, threshold: [0.42, 0.58, 0.74] },
    );
    storySlideRefs.current.forEach((slide) => {
      if (slide) observer.observe(slide);
    });
    return () => observer.disconnect();
  }, [hasLevelUp]);

  return (
    <div
      aria-modal="true"
      className={STORY_MODAL_LAYER_CLASS}
      role="dialog"
    >
      <style>
        {`
          @keyframes mpWeeklyStoryIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes mpWeeklyStoryGlow {
            0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .5; }
            50% { transform: translate3d(18px, -16px, 0) scale(1.12); opacity: .88; }
          }
          @keyframes mpWeeklyEmotionPulse {
            0%, 100% { transform: scale(1); filter: saturate(1) brightness(1); box-shadow: 0 0 70px currentColor; }
            50% { transform: scale(1.075); filter: saturate(1.16) brightness(1.05); box-shadow: 0 0 115px currentColor; }
          }
          @keyframes mpWeeklyRadarBreathe {
            0% { transform: scale(.74); opacity: .28; }
            34% { transform: scale(1.08); opacity: .92; }
            66% { transform: scale(.9); opacity: .78; }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes mpWeeklyCheckIn {
            0% { opacity: 0; transform: scale(.78); }
            70% { opacity: 1; transform: scale(1.06); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes mpWeeklyArcDrift {
            0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .48; }
            50% { transform: translate3d(-10px, 18px, 0) scale(1.03); opacity: .88; }
          }
          .mp-weekly-story-root {
            --mp-text: var(--weekly-text);
            --mp-text-secondary: var(--weekly-muted);
            --mp-text-muted: var(--weekly-subtle);
            --mp-border: var(--weekly-line);
            --weekly-text: #fff8ec;
            --weekly-title: #fff8ec;
            --weekly-muted: rgba(255,248,236,.66);
            --weekly-subtle: rgba(255,248,236,.38);
            --weekly-line: rgba(255,248,236,.13);
            --weekly-panel: rgba(255,255,255,.055);
            --weekly-panel-border: rgba(255,255,255,.1);
            --weekly-bg-base: #040508;
            --weekly-bg-a: rgba(95, 70, 190, .26);
            --weekly-bg-b: rgba(86, 221, 245, .12);
            --weekly-bg-c: rgba(255, 142, 111, .14);
            --weekly-arc-a: rgba(154, 103, 255, .82);
            --weekly-arc-b: rgba(255, 181, 126, .7);
            --weekly-arc-soft: rgba(167,139,250,.25);
            --weekly-brand: #bb8cff;
            --weekly-grid: rgba(255,248,236,.1);
            --weekly-empty-dot: rgba(255,248,236,.18);
            --weekly-soft-shadow: rgba(0,0,0,.24);
            --weekly-habit-dot: #a78bfa;
          }
          .mp-weekly-story-root[data-weekly-mode="light"] {
            --weekly-text: #101338;
            --weekly-title: #111437;
            --weekly-muted: rgba(17,20,55,.62);
            --weekly-subtle: rgba(17,20,55,.42);
            --weekly-line: rgba(17,20,55,.13);
            --weekly-panel: rgba(255,255,255,.62);
            --weekly-panel-border: rgba(17,20,55,.11);
            --weekly-bg-base: #fffaf2;
            --weekly-bg-a: rgba(180, 107, 255, .22);
            --weekly-bg-b: rgba(255, 196, 138, .2);
            --weekly-bg-c: rgba(255, 130, 176, .12);
            --weekly-arc-a: rgba(167, 139, 250, .34);
            --weekly-arc-b: rgba(255, 168, 116, .34);
            --weekly-arc-soft: rgba(167,139,250,.18);
            --weekly-brand: #8b5cf6;
            --weekly-grid: rgba(17,20,55,.12);
            --weekly-empty-dot: rgba(17,20,55,.13);
            --weekly-soft-shadow: rgba(126,87,194,.12);
            --weekly-habit-dot: #8b5cf6;
          }
          .mp-weekly-slide-shell {
            background:
              radial-gradient(circle at 88% 4%, var(--weekly-bg-a), transparent 34%),
              radial-gradient(circle at 2% 100%, var(--weekly-bg-c), transparent 34%),
              radial-gradient(circle at 30% 18%, var(--weekly-bg-b), transparent 32%),
              var(--weekly-bg-base);
          }
          .mp-weekly-arc-svg {
            opacity: 0;
            transform: translate3d(10px, -18px, 0) scale(1.04);
            transition: opacity 900ms ease, transform 1200ms cubic-bezier(.2,.8,.2,1);
            animation: mpWeeklyArcDrift 10s ease-in-out infinite;
          }
          .mp-weekly-slide-active .mp-weekly-arc-svg {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
          .mp-weekly-arc-path {
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
            transition: stroke-dashoffset 1800ms 120ms cubic-bezier(.16,.82,.18,1);
          }
          .mp-weekly-slide-active .mp-weekly-arc-path {
            stroke-dashoffset: 0;
          }
          .mp-weekly-gradient-text {
            background: linear-gradient(115deg, #a78bfa 0%, #ec6fc1 52%, #ffb879 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .mp-weekly-dark-gradient-text {
            background: linear-gradient(115deg, #ffffff 0%, #f7d9ff 52%, #ffb879 100%);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }
          .mp-weekly-panel {
            background: var(--weekly-panel);
            border: 1px solid var(--weekly-panel-border);
            box-shadow: 0 22px 70px var(--weekly-soft-shadow);
          }
          .mp-weekly-fragment {
            opacity: 0;
            transform: translateY(16px);
            transition: opacity 560ms cubic-bezier(.2,.8,.2,1), transform 560ms cubic-bezier(.2,.8,.2,1);
          }
          .mp-weekly-slide-active .mp-weekly-fragment {
            opacity: 1;
            transform: translateY(0);
          }
          .mp-weekly-bar {
            transition: width 920ms cubic-bezier(.2,.8,.2,1);
          }
          .mp-weekly-race-line {
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
            transition: stroke-dashoffset 2200ms cubic-bezier(.16,.82,.18,1);
          }
          .mp-weekly-slide-active .mp-weekly-race-line {
            stroke-dashoffset: 0;
          }
          .mp-weekly-race-late {
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 640ms 2200ms ease, transform 640ms 2200ms ease;
          }
          .mp-weekly-slide-active .mp-weekly-race-late {
            opacity: 1;
            transform: translateY(0);
          }
          .mp-weekly-radar-polygon {
            stroke-dasharray: 1;
            stroke-dashoffset: 1;
            fill: none;
            opacity: 0;
            transform-box: fill-box;
            transform-origin: center;
            transform: scale(.92);
            transition: stroke-dashoffset 2300ms cubic-bezier(.16,.82,.18,1), opacity 360ms ease, transform 2300ms cubic-bezier(.2,.8,.2,1);
          }
          .mp-weekly-slide-active .mp-weekly-radar-polygon {
            stroke-dashoffset: 0;
            opacity: 1;
            transform: scale(1);
          }
          .mp-weekly-radar-area {
            opacity: 0;
            transform-box: fill-box;
            transform-origin: center;
            transform: scale(.96);
            transition: opacity 760ms 2300ms ease, transform 900ms 2300ms cubic-bezier(.2,.8,.2,1);
          }
          .mp-weekly-slide-active .mp-weekly-radar-area {
            opacity: 1;
            transform: scale(1);
            animation: mpWeeklyRadarBreathe 2400ms 2450ms cubic-bezier(.2,.8,.2,1) both;
          }
          .mp-weekly-radar-percent {
            opacity: 0;
            transform: translateY(8px) scale(.94);
            transition: opacity 620ms 3900ms ease, transform 620ms 3900ms cubic-bezier(.2,.8,.2,1);
          }
          .mp-weekly-slide-active .mp-weekly-radar-percent {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          .mp-weekly-radar-grid,
          .mp-weekly-radar-axis,
          .mp-weekly-radar-reveal {
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 720ms 2550ms ease, transform 720ms 2550ms ease;
          }
          .mp-weekly-slide-active .mp-weekly-radar-grid,
          .mp-weekly-slide-active .mp-weekly-radar-axis,
          .mp-weekly-slide-active .mp-weekly-radar-reveal {
            opacity: 1;
            transform: translateY(0);
          }
          .mp-weekly-radar-final,
          .mp-weekly-radar-label {
            opacity: 0;
            transform: translateY(14px);
            transition: opacity 700ms 4200ms ease, transform 700ms 4200ms cubic-bezier(.2,.8,.2,1);
          }

          .mp-weekly-slide-active .mp-weekly-radar-final,
          .mp-weekly-slide-active .mp-weekly-radar-label {
            opacity: 1;
            transform: translateY(0);
          }
          .mp-weekly-radar-dominant-fill {
            opacity: 0;
            transition: opacity 780ms 3300ms ease;
          }
          .mp-weekly-slide-active .mp-weekly-radar-dominant-fill {
            opacity: 1;
          }
          .mp-weekly-radar-glow {
            opacity: 0;
            transition: opacity 780ms 3550ms ease;
          }
          .mp-weekly-slide-active .mp-weekly-radar-glow {
            opacity: 1;
          }
          .mp-weekly-radar-ring,
          .mp-weekly-radar-center {
            opacity: 0;
            transition: opacity 680ms 2850ms ease;
          }
          .mp-weekly-slide-active .mp-weekly-radar-ring,
          .mp-weekly-slide-active .mp-weekly-radar-center {
            opacity: 1;
          }
          .mp-weekly-radar-ring-selected {
            transition: opacity 680ms 2850ms ease, stroke-opacity 620ms 3550ms ease, stroke-width 620ms 3550ms ease, filter 620ms 3550ms ease;
            stroke-opacity: .34;
            stroke-width: 4.5;
            filter: none;
          }
          .mp-weekly-slide-active .mp-weekly-radar-ring-selected {
            stroke-opacity: 1;
            stroke-width: 8;
            filter: drop-shadow(0 0 14px currentColor);
          }
          .mp-weekly-radar-stage {
            flex: 1;
            display: grid;
            place-items: center;
            transform: translateY(clamp(1.5rem, 6dvh, 3.8rem));
            transition: transform 820ms 3100ms cubic-bezier(.2,.8,.2,1);
          }
          .mp-weekly-slide-active .mp-weekly-radar-stage {
            transform: translateY(0);
          }
          .mp-weekly-late-text {
            opacity: 0;
            transform: translateY(12px);
            transition: opacity 700ms 2800ms ease, transform 700ms 2800ms cubic-bezier(.2,.8,.2,1);
          }
          .mp-weekly-slide-active .mp-weekly-late-text {
            opacity: 1;
            transform: translateY(0);
          }
          .mp-weekly-emotion-orb {
            opacity: 0;
            transform: translateY(28px) scale(.42);
            transition: opacity 1200ms cubic-bezier(.2,.8,.2,1), transform 1500ms cubic-bezier(.16,.86,.18,1);
          }
          .mp-weekly-slide-active .mp-weekly-emotion-orb {
            opacity: 1;
            transform: scale(1);
          }
          .mp-weekly-check-in {
            animation: mpWeeklyCheckIn 620ms 220ms cubic-bezier(.2,.8,.2,1) both;
          }
          .mp-weekly-story-in { animation: mpWeeklyStoryIn 560ms cubic-bezier(.2,.8,.2,1) both; }
          .mp-weekly-story-glow { animation: mpWeeklyStoryGlow 8s ease-in-out infinite; }
          .mp-weekly-emotion-active { animation: mpWeeklyEmotionPulse 2.8s ease-in-out infinite; color: inherit; }
          @media (prefers-reduced-motion: reduce) {
            .mp-weekly-story-in, .mp-weekly-story-glow, .mp-weekly-emotion-active, .mp-weekly-check-in, .mp-weekly-radar-polygon, .mp-weekly-arc-svg { animation: none !important; }
            .mp-weekly-fragment, .mp-weekly-race-late, .mp-weekly-radar-reveal, .mp-weekly-radar-stage, .mp-weekly-radar-final, .mp-weekly-radar-label, .mp-weekly-radar-dominant-fill, .mp-weekly-radar-glow, .mp-weekly-late-text, .mp-weekly-radar-percent, .mp-weekly-emotion-orb { opacity: 1 !important;  transform: none !important;  transition: none !important;}
            .mp-weekly-bar, .mp-weekly-race-line, .mp-weekly-radar-polygon, .mp-weekly-arc-path { transition: none !important; stroke-dashoffset: 0 !important; }
          }
        `}
      </style>
      <div
        className="mp-weekly-story-root relative h-screen h-[100dvh] min-h-screen min-h-[100svh] w-screen overflow-hidden [--weekly-safe-bottom:max(env(safe-area-inset-bottom),1rem)] [--weekly-safe-top:max(env(safe-area-inset-top),1rem)]"
        data-weekly-mode={storyVisualMode}
      >
        <button
          aria-label="Cerrar Weekly Wrapped"
          className="absolute right-5 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/10 text-2xl text-[color:var(--weekly-muted)] backdrop-blur-md"
          onClick={onClose}
          style={{ top: 'calc(var(--weekly-safe-top) + 0.25rem)' }}
          type="button"
        >
          ×
        </button>

        <div className={`h-full snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${showSharePicker ? 'overflow-hidden' : 'overflow-y-auto'}`} ref={storyScrollRef}>
          <WeeklyStorySlide
            accent={dominantColor}
            active={activeStorySlide === 0}
            eyebrow="WEEKLY WRAPPED"
            index={0}
            registerSlide={(el) => (storySlideRefs.current[0] = el)}
            title="Tu semana en movimiento"
          >
            <div className="flex min-h-0 flex-1 flex-col justify-between gap-[clamp(2rem,6dvh,3rem)]">
              <p className="mp-weekly-fragment text-sm uppercase tracking-[0.28em] text-[color:var(--weekly-muted)]" style={{ transitionDelay: '120ms' }}>
                {weekRange}
              </p>
              <div className="mp-weekly-fragment relative grid flex-1 place-items-center" style={{ transitionDelay: '220ms' }}>
                <span
                  className="mp-weekly-story-glow absolute h-64 w-64 rounded-full blur-3xl"
                  style={{ background: `radial-gradient(circle, ${dominantColor}66, transparent 68%)` }}
                />
                <div className="relative text-center">
                  <p className="mp-weekly-gradient-text text-[clamp(6.6rem,30vw,9.5rem)] font-semibold leading-none tracking-[-0.08em]">
                    <AnimatedWeeklyNumber active={activeStorySlide === 0} value={completedCount} />/7
                  </p>
                  <p className="mt-4 text-sm uppercase tracking-[0.34em] text-[color:var(--weekly-muted)]">días activos</p>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 pb-[clamp(1.25rem,5dvh,2.6rem)]">
                {days.map((day, index) => (
                  <span
                    className="mp-weekly-fragment text-center text-[11px] font-semibold text-[color:var(--weekly-subtle)]"
                    key={`weekly-story-day-${day}`}
                    style={{ transitionDelay: `${260 + index * 45}ms` }}
                  >
                    <span
                      className="mx-auto mb-2 block h-5 w-5 rounded-full"
                      style={{ backgroundColor: completed.has(day) ? '#5BE282' : 'var(--weekly-empty-dot)', boxShadow: completed.has(day) ? '0 0 18px rgba(91,226,130,.28)' : undefined }}
                    />
                    {dayLabels[index]}
                  </span>
                ))}
              </div>
            </div>
          </WeeklyStorySlide>

          <WeeklyStorySlide
            accent="#A78BFA"
            active={activeStorySlide === 1}
            eyebrow={sectionsByKey.get('achievements')?.accent ?? 'RESUMEN 7 DÍAS'}
            index={1}
            registerSlide={(el) => (storySlideRefs.current[1] = el)}
            title="Tareas realizadas"
          >
            <div className="flex flex-1 flex-col justify-between gap-[clamp(1.4rem,4dvh,2.4rem)]">
              <p className="mp-weekly-fragment text-xl leading-relaxed text-[color:var(--weekly-muted)]" style={{ transitionDelay: '100ms' }}>
                Completaste <span className="font-semibold text-[#EC6FC1]">{completions}</span> tareas en los últimos <span className="font-semibold text-[#FFB879]">7</span> días.
              </p>
              <div className="space-y-[clamp(1.6rem,4dvh,2.2rem)]">
                <div className="mp-weekly-fragment text-center" style={{ transitionDelay: '210ms' }}>
                  <p className="mp-weekly-gradient-text text-[clamp(7rem,34vw,10rem)] font-semibold leading-none tracking-[-0.08em]">
                    <AnimatedWeeklyNumber active={activeStorySlide === 1} value={completions} />
                  </p>
                  <p className="mt-2 text-sm uppercase tracking-[0.34em] text-[color:var(--weekly-muted)]">tareas completadas</p>
                </div>
                <WeeklyDifficultyConstellation
                  active={activeStorySlide === 1}
                  easyCount={easyCount}
                  easyPct={easyPct}
                  hardCount={hardCount}
                  hardPct={hardPct}
                  mediumCount={mediumCount}
                  mediumPct={mediumPct}
                  total={effortTotal || completions}
                />
                <div className="mp-weekly-fragment flex items-center justify-center gap-2 pt-1 text-[color:var(--weekly-muted)]" style={{ transitionDelay: '860ms' }}>
                  <span className="h-px w-8 bg-[color:var(--weekly-line)]" />
                  <p className="text-xs uppercase tracking-[0.22em]">
                    <AnimatedWeeklyNumber active={activeStorySlide === 1} duration={900} value={xpTotal} />
                    {' '}GP generados
                  </p>
                  <span className="h-px w-8 bg-[color:var(--weekly-line)]" />
                </div>
              </div>
            </div>
          </WeeklyStorySlide>

          {payload.levelUp?.happened ? (
            <WeeklyStorySlide
              accent="#F7C86A"
              active={activeStorySlide === 2}
              eyebrow="LEVEL UP"
              index={2}
              registerSlide={(el) => (storySlideRefs.current[2] = el)}
              title={`Llegaste al nivel ${payload.levelUp.currentLevel ?? 'nuevo'}`}
            >
              <div className="flex flex-1 flex-col justify-center gap-8">
                <p className="mp-weekly-fragment text-xl leading-relaxed text-[color:var(--weekly-muted)]" style={{ transitionDelay: '90ms' }}>
                  {sectionsByKey.get('level-up')?.body ?? 'Tu progreso de la semana empujó un nuevo nivel.'}
                </p>
                <div className="mp-weekly-fragment relative" style={{ transitionDelay: '210ms' }}>
                  <span className="mp-weekly-story-glow absolute inset-0 rounded-full bg-amber-300/30 blur-3xl" />
                  <p className="relative text-[clamp(5.6rem,25vw,8rem)] font-semibold leading-none text-[color:var(--weekly-title)]">
                    <AnimatedWeeklyNumber active={activeStorySlide === 2} value={payload.levelUp.currentLevel ?? 0} />
                  </p>
                  <p className="relative mt-3 text-sm uppercase tracking-[0.3em] text-[#F7C86A]">+{payload.levelUp.xpGained} GP</p>
                </div>
              </div>
            </WeeklyStorySlide>
          ) : null}

          <WeeklyStorySlide
            accent={dominantColor}
            active={activeStorySlide === habitsSlideIndex}
            eyebrow="HÁBITOS"
            index={habitsSlideIndex}
            registerSlide={(el) => (storySlideRefs.current[habitsSlideIndex] = el)}
            title={sectionsByKey.get('habits')?.title ?? 'Ritmo que se sostiene'}
          >
            <div className="flex flex-1 flex-col justify-between gap-8">
              <p className="mp-weekly-fragment text-base leading-7 text-[color:var(--weekly-muted)]" style={{ transitionDelay: '80ms' }}>
                {sectionsByKey.get('habits')?.body ?? 'Estos hábitos aparecieron de forma consistente y mantuvieron tus últimos 7 días en movimiento.'}
              </p>
              <div className="space-y-6">
                {storyHabits.map((habit, index) => {
                  const score = getWeeklyHabitScore(habit);
                  return (
                  <div className="mp-weekly-fragment space-y-3 border-b border-[color:var(--weekly-line)] pb-5 last:border-b-0" key={`weekly-story-habit-${habit.title}-${index}`} style={{ transitionDelay: `${260 + index * 260}ms` }}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-2xl font-semibold leading-tight text-[color:var(--weekly-text)]">{habit.title}</p>
                        <p className="mt-1 text-sm text-[color:var(--weekly-muted)]">{habit.body}</p>
                      </div>
                      <span className="text-lg font-semibold text-[color:var(--weekly-brand)]">{formatHabitDays(habit)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <WeeklyStoryHabitChip score={score} />
                      <div className="flex gap-1.5">
                        {Array.from({ length: 7 }, (_, dotIndex) => (
                          <span
                            key={`weekly-habit-dot-${habit.title}-${dotIndex}`}
                            className="h-2 w-2 rounded-full transition-transform duration-500"
                            style={{
                              backgroundColor: dotIndex < getWeeklyHabitDays(habit) ? 'var(--weekly-habit-dot)' : 'var(--weekly-empty-dot)',
                              transform: activeStorySlide === habitsSlideIndex ? 'scale(1)' : 'scale(0.55)',
                              transitionDelay: `${520 + index * 260 + dotIndex * 80}ms`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );})}
              </div>
            </div>
          </WeeklyStorySlide>

          <WeeklyStorySlide
            accent={dominantColor}
            active={activeStorySlide === pillarSlideIndex}
            eyebrow="PILAR DOMINANTE"
            index={pillarSlideIndex}
            registerSlide={(el) => (storySlideRefs.current[pillarSlideIndex] = el)}
            title="Balance semanal"
          >
            <div className="flex flex-1 flex-col justify-between gap-8">
              <WeeklyRadarAnalysisChart
                active={activeStorySlide === pillarSlideIndex}
                dominant={dominantPillar}
                dominantPct={dominantPct}
                message={sectionsByKey.get('pillar')?.body ?? `${dominantLabel} lideró tu energía estos días.`}
                radarTraits={radarTraits}
                xp={payload.summary?.pillarDominantStats?.xp ?? 0}
                completions={payload.summary?.pillarDominantStats?.completions ?? 0}
              />
            </div>
          </WeeklyStorySlide>

          <WeeklyStorySlide
            accent="#56DDF5"
            active={activeStorySlide === energySlideIndex}
            eyebrow="DAILY ENERGY"
            index={energySlideIndex}
            registerSlide={(el) => (storySlideRefs.current[energySlideIndex] = el)}
            title="Energía diaria"
          >
            <div className="flex flex-1 flex-col justify-between gap-8">
              <p className="mp-weekly-late-text text-xl leading-relaxed text-[color:var(--weekly-muted)]">
                {energy?.deltaPct === undefined || energy?.deltaPct === null
                  ? 'El Weekly toma la energía real de tus pilares y la convierte en lectura semanal.'
                  : `${formatSignedPct(energy.deltaPct)} frente a la semana anterior.`}
              </p>
              <WeeklyEnergyRaceChart
                active={activeStorySlide === energySlideIndex}
                energy={energy}
              />
            </div>
          </WeeklyStorySlide>

          <WeeklyStorySlide
            accent={emotion?.color ?? dominantColor}
            active={activeStorySlide === emotionSlideIndex}
            eyebrow="EMOCIÓN"
            index={emotionSlideIndex}
            registerSlide={(el) => (storySlideRefs.current[emotionSlideIndex] = el)}
            title={emotion?.label ?? 'Pulso semanal'}
            titleDelay="2800ms"
          >
            <div className="flex flex-1 flex-col justify-between gap-8">
              <div className="mp-weekly-fragment relative grid flex-1 place-items-center py-[clamp(1rem,4dvh,2.5rem)]" style={{ transitionDelay: '120ms' }}>
                <span
                  className="mp-weekly-story-glow absolute h-[clamp(13rem,52vw,18rem)] w-[clamp(13rem,52vw,18rem)] rounded-full blur-3xl"
                  style={{ background: `radial-gradient(circle, ${(emotion?.color ?? dominantColor)}66, transparent 70%)` }}
                />
                <span className="mp-weekly-emotion-orb relative grid h-[clamp(9.5rem,42vw,11rem)] w-[clamp(9.5rem,42vw,11rem)] place-items-center rounded-full">
                  <span
                    className={`h-full w-full rounded-full ${activeStorySlide === emotionSlideIndex ? 'mp-weekly-emotion-active' : ''}`}
                    style={{
                      backgroundColor: emotion?.color ?? dominantColor,
                      boxShadow: `0 0 80px ${(emotion?.color ?? dominantColor)}55`,
                      color: emotion?.color ?? dominantColor,
                    }}
                  />
                </span>
              </div>
              <div className="space-y-4">
                <p className="mp-weekly-late-text text-xl font-semibold leading-relaxed text-[color:var(--weekly-text)]">
                  {emotion?.weeklyMessage ?? sectionsByKey.get('highlight')?.body ?? 'Tu semana tuvo un pulso emocional claro.'}
                </p>
                <p className="mp-weekly-late-text text-sm leading-relaxed text-[color:var(--weekly-muted)]" style={{ transitionDelay: '3000ms' }}>
                  {biweeklyEmotion?.biweeklyContext ?? 'El contexto de 15 días ayuda a leer si esta emoción fue aislada o tendencia.'}
                </p>
              </div>
            </div>
          </WeeklyStorySlide>

          <WeeklyStorySlide
            accent="#F7C86A"
            active={activeStorySlide === closingSlideIndex}
            eyebrow="CIERRE"
            index={closingSlideIndex}
            registerSlide={(el) => (storySlideRefs.current[closingSlideIndex] = el)}
            title={sectionsByKey.get('closing')?.accent ?? 'Seguimos'}
          >
            <div className="flex flex-1 flex-col justify-between gap-[clamp(2rem,7dvh,2.5rem)]">
              <div className="space-y-[clamp(1.5rem,5dvh,2rem)]">
                <p className="mp-weekly-fragment text-3xl font-semibold leading-tight text-[color:var(--weekly-text)]" style={{ transitionDelay: '120ms' }}>
                  {sectionsByKey.get('closing')?.body ?? 'Seguimos. Mañana vuelve el Daily Quest para sumar otro paso.'}
                </p>
                <div className="mp-weekly-fragment h-1.5 w-24 rounded-full bg-gradient-to-r from-[#F7C86A] to-[color:var(--mp-violet)] shadow-[0_0_28px_rgba(247,200,106,0.28)]" style={{ transitionDelay: '260ms' }} />
              </div>
              <div className="space-y-7 pb-[max(env(safe-area-inset-bottom),0px)]">
                <button
                  className="mp-weekly-fragment w-full rounded-full bg-[color:var(--mp-violet)] px-6 py-4 text-base font-semibold text-white shadow-[0_0_32px_rgba(167,139,250,0.22)]"
                  onClick={() => setShowSharePicker(true)}
                  style={{ transitionDelay: '420ms' }}
                  type="button"
                >
                  Compartir
                </button>
              </div>
            </div>
          </WeeklyStorySlide>
        </div>
        {showSharePicker ? (
          <WeeklySharePicker
            dominantColor={dominantColor}
            dominantLabel={dominantLabel}
            energy={energy}
            emotion={emotion}
            mode={storyVisualMode}
            onClose={() => setShowSharePicker(false)}
            onModeChange={setStoryVisualMode}
            storyHabits={storyHabits}
          />
        ) : null}
      </div>
    </div>
  );
}

function PremiumMonthlyWrappedStory({
  monthly,
  onClose,
  rewards,
}: {
  monthly: MonthlyWrappedRecord;
  onClose: () => void;
  rewards: RewardsHistorySummary;
}) {
  const monthlyData = buildMonthlyStoryData(monthly, rewards);
  const storyScrollRef = useRef<HTMLDivElement | null>(null);
  const storySlideRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeStorySlide, setActiveStorySlide] = useState(0);
  const [showSharePicker, setShowSharePicker] = useState(false);
  const [storyVisualMode, setStoryVisualMode] = useState<WeeklyStoryVisualMode>('dark');

  useBodyScrollLock();

  useEffect(() => {
    const themeNode = document.querySelector('[data-mp-theme]');
    const theme = themeNode?.getAttribute('data-mp-theme');
    setStoryVisualMode(theme === 'light' ? 'light' : 'dark');
  }, []);

  useEffect(() => {
    const root = storyScrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let strongest: { index: number; ratio: number } | null = null;
        for (const entry of entries) {
          const index = Number(entry.target.getAttribute('data-weekly-slide') ?? 0);
          if (!strongest || entry.intersectionRatio > strongest.ratio) {
            strongest = { index, ratio: entry.intersectionRatio };
          }
        }
        if (strongest && strongest.ratio > 0.42) {
          setActiveStorySlide(strongest.index);
        }
      },
      { root, threshold: [0.42, 0.58, 0.74] },
    );
    storySlideRefs.current.forEach((slide) => {
      if (slide) observer.observe(slide);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-modal="true"
      className={STORY_MODAL_LAYER_CLASS}
      role="dialog"
    >
      <MonthlyStoryStyles />
      <div
        className="mp-weekly-story-root relative h-screen h-[100dvh] min-h-screen min-h-[100svh] w-screen overflow-hidden [--weekly-safe-bottom:max(env(safe-area-inset-bottom),1rem)] [--weekly-safe-top:max(env(safe-area-inset-top),1rem)]"
        data-weekly-mode={storyVisualMode}
      >
        <button
          aria-label="Cerrar Monthly Wrapped"
          className="absolute right-5 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/10 text-2xl text-[color:var(--weekly-muted)] backdrop-blur-md"
          onClick={onClose}
          style={{ top: 'calc(var(--weekly-safe-top) + 0.25rem)' }}
          type="button"
        >
          ×
        </button>

        <div className={`h-full snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${showSharePicker ? 'overflow-hidden' : 'overflow-y-auto'}`} ref={storyScrollRef}>
          <WeeklyStorySlide
            accent="#A78BFA"
            active={activeStorySlide === 0}
            eyebrow="MONTHLY WRAPPED"
            index={0}
            registerSlide={(el) => (storySlideRefs.current[0] = el)}
            title="Tu mes en movimiento"
          >
            <div className="flex min-h-0 flex-1 flex-col gap-[clamp(1.2rem,4dvh,2.2rem)]">
              <p className="mp-weekly-fragment text-sm uppercase tracking-[0.28em] text-[color:var(--weekly-muted)]" style={{ transitionDelay: '120ms' }}>
                {monthlyData.periodLabel}
              </p>
              <div className="mp-weekly-fragment relative grid flex-[0.85] place-items-center" style={{ transitionDelay: '220ms' }}>
                <span className="mp-weekly-story-glow absolute h-72 w-72 rounded-full bg-violet-400/20 blur-3xl" />
                <div className="relative text-center">
                  <p className="mp-weekly-gradient-text text-[clamp(6.4rem,29vw,9rem)] font-semibold leading-none tracking-[-0.08em]">
                    <AnimatedWeeklyNumber active={activeStorySlide === 0} value={monthlyData.trackedDays} />/{monthlyData.totalDays}
                  </p>
                  <p className="mt-4 text-sm uppercase tracking-[0.34em] text-[color:var(--weekly-muted)]">días trackeados</p>
                </div>
              </div>
              <div className="pb-[clamp(.75rem,3dvh,1.6rem)]">
                <MonthlyCalendarStrip active={activeStorySlide === 0} days={monthlyData.calendarDays} />
              </div>
            </div>
          </WeeklyStorySlide>

          <WeeklyStorySlide
            accent="#A78BFA"
            active={activeStorySlide === 1}
            eyebrow="DATOS REALES"
            index={1}
            registerSlide={(el) => (storySlideRefs.current[1] = el)}
            title="Tareas realizadas"
          >
            <div className="flex flex-1 flex-col justify-between gap-[clamp(1.5rem,4dvh,2.5rem)]">
              <p className="mp-weekly-fragment text-xl leading-relaxed text-[color:var(--weekly-muted)]" style={{ transitionDelay: '100ms' }}>
                Completaste <span className="font-semibold text-[#EC6FC1]">{monthlyData.completedTasks}</span> tareas durante el mes.
              </p>
              <div className="space-y-[clamp(1.8rem,4.5dvh,2.8rem)]">
                <div className="mp-weekly-fragment text-center" style={{ transitionDelay: '210ms' }}>
                  <p className="mp-weekly-gradient-text text-[clamp(7rem,34vw,10rem)] font-semibold leading-none tracking-[-0.08em]">
                    <AnimatedWeeklyNumber active={activeStorySlide === 1} value={monthlyData.completedTasks} />
                  </p>
                  <p className="mt-2 text-sm uppercase tracking-[0.34em] text-[color:var(--weekly-muted)]">tareas completadas</p>
                </div>
                <WeeklyDifficultyConstellation
                  active={activeStorySlide === 1}
                  easyCount={monthlyData.difficulty.easy}
                  easyPct={monthlyData.difficulty.easyPct}
                  hardCount={monthlyData.difficulty.hard}
                  hardPct={monthlyData.difficulty.hardPct}
                  mediumCount={monthlyData.difficulty.medium}
                  mediumPct={monthlyData.difficulty.mediumPct}
                  total={monthlyData.completedTasks}
                />
                <p className="mp-weekly-fragment text-center text-xs uppercase tracking-[0.24em] text-[color:var(--weekly-muted)]" style={{ transitionDelay: '900ms' }}>
                  <AnimatedWeeklyNumber active={activeStorySlide === 1} duration={900} value={monthlyData.gpTotal} /> GP generados
                </p>
              </div>
            </div>
          </WeeklyStorySlide>

          <WeeklyStorySlide
            accent="#F7C86A"
            active={activeStorySlide === 2}
            eyebrow="CALIBRACIÓN"
            index={2}
            registerSlide={(el) => (storySlideRefs.current[2] = el)}
            title="Ajustes del mes"
          >
            <MonthlyCalibrationStory
              active={activeStorySlide === 2}
              downTasks={monthlyData.calibration.downTasks}
              keep={monthlyData.calibration.keep}
              upTasks={monthlyData.calibration.upTasks}
            />
          </WeeklyStorySlide>

          <WeeklyStorySlide
            accent="#A78BFA"
            active={activeStorySlide === 3}
            eyebrow="HÁBITOS"
            index={3}
            registerSlide={(el) => (storySlideRefs.current[3] = el)}
            title="Más cerca de lograrlo"
          >
            <MonthlyNearHabitsStory
              active={activeStorySlide === 3}
              habits={monthlyData.nearHabits}
              unlockedHabits={monthlyData.unlockedHabits}
            />
          </WeeklyStorySlide>

          <WeeklyStorySlide
            accent="#5BE282"
            active={activeStorySlide === 4}
            eyebrow="RITMO"
            index={4}
            registerSlide={(el) => (storySlideRefs.current[4] = el)}
            title="Cerca del próximo ritmo"
          >
            <MonthlyRhythmReadinessStory
              active={activeStorySlide === 4}
              currentMode={monthlyData.rhythm.currentMode}
              nextMode={monthlyData.rhythm.nextMode}
              readiness={monthlyData.rhythm.readiness}
              threshold={monthlyData.rhythm.threshold}
              totalTasks={monthlyData.rhythm.totalTasks}
              strongTasks={monthlyData.rhythm.strongTasks}
            />
          </WeeklyStorySlide>

          <WeeklyStorySlide
            accent={monthlyData.emotion.color}
            active={activeStorySlide === 5}
            eyebrow="EMOCIÓN"
            index={5}
            registerSlide={(el) => (storySlideRefs.current[5] = el)}
            title={monthlyData.emotion.label}
          >
            <MonthlyEmotionJourneyStory active={activeStorySlide === 5} emotion={monthlyData.emotion} />
          </WeeklyStorySlide>

          <WeeklyStorySlide
            accent="#A78BFA"
            active={activeStorySlide === 6}
            eyebrow="CIERRE"
            index={6}
            registerSlide={(el) => (storySlideRefs.current[6] = el)}
            title="Seguimos"
          >
            <div className="flex flex-1 flex-col justify-between gap-[clamp(2rem,7dvh,3rem)]">
              <div className="space-y-8">
                <p className="mp-weekly-fragment text-[clamp(2.25rem,10vw,3.7rem)] font-semibold leading-tight text-[color:var(--weekly-title)]" style={{ transitionDelay: '140ms' }}>
                  Un mes de señales claras para ajustar tu Journey.
                </p>
                <p className="mp-weekly-fragment text-xl leading-relaxed text-[color:var(--weekly-muted)]" style={{ transitionDelay: '280ms' }}>
                  Tareas, hábitos, ritmo y emoción. Un mes a la vez.
                </p>
              </div>
              <button
                className="mp-weekly-fragment w-full rounded-full bg-[color:var(--mp-violet)] px-6 py-4 text-lg font-semibold text-white shadow-[0_18px_70px_rgba(167,139,250,0.34)]"
                onClick={() => setShowSharePicker(true)}
                style={{ transitionDelay: '520ms' }}
                type="button"
              >
                Compartir
              </button>
            </div>
          </WeeklyStorySlide>
        </div>

        {showSharePicker ? (
          <MonthlySharePicker
            data={monthlyData}
            mode={storyVisualMode}
            onClose={() => setShowSharePicker(false)}
            onModeChange={setStoryVisualMode}
          />
        ) : null}
      </div>
    </div>
  );
}

function useBodyScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyPosition = body.style.position;
    const previousBodyWidth = body.style.width;
    const previousBodyTop = body.style.top;
    const scrollY = window.scrollY;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.width = '100%';
    body.style.top = `-${scrollY}px`;

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.position = previousBodyPosition;
      body.style.width = previousBodyWidth;
      body.style.top = previousBodyTop;
      window.scrollTo(0, scrollY);
    };
  }, []);
}

function MonthlyStoryStyles() {
  return (
    <style>
      {`
        @keyframes mpWeeklyStoryIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mpWeeklyStoryGlow {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: .5; }
          50% { transform: translate3d(18px, -16px, 0) scale(1.12); opacity: .88; }
        }
        @keyframes mpMonthlyPulse {
          0%, 100% { transform: scale(1); opacity: .86; }
          50% { transform: scale(1.07); opacity: 1; }
        }
        .mp-weekly-story-root {
          --mp-text: var(--weekly-text);
          --mp-text-secondary: var(--weekly-muted);
          --mp-text-muted: var(--weekly-subtle);
          --mp-border: var(--weekly-line);
          --weekly-text: #fff8ec;
          --weekly-title: #fff8ec;
          --weekly-muted: rgba(255,248,236,.66);
          --weekly-subtle: rgba(255,248,236,.38);
          --weekly-line: rgba(255,248,236,.13);
          --weekly-panel: rgba(255,255,255,.055);
          --weekly-panel-border: rgba(255,255,255,.1);
          --weekly-bg-base: #040508;
          --weekly-bg-a: rgba(95, 70, 190, .26);
          --weekly-bg-b: rgba(86, 221, 245, .12);
          --weekly-bg-c: rgba(255, 142, 111, .14);
          --weekly-arc-a: rgba(154, 103, 255, .82);
          --weekly-arc-b: rgba(255, 181, 126, .7);
          --weekly-arc-soft: rgba(167,139,250,.25);
          --weekly-brand: #bb8cff;
          --weekly-grid: rgba(255,248,236,.1);
          --weekly-empty-dot: rgba(255,248,236,.18);
          --weekly-soft-shadow: rgba(0,0,0,.24);
          --weekly-habit-dot: #a78bfa;
        }
        .mp-weekly-story-root[data-weekly-mode="light"] {
          --weekly-text: #101338;
          --weekly-title: #111437;
          --weekly-muted: rgba(17,20,55,.62);
          --weekly-subtle: rgba(17,20,55,.42);
          --weekly-line: rgba(17,20,55,.13);
          --weekly-panel: rgba(255,255,255,.62);
          --weekly-panel-border: rgba(17,20,55,.11);
          --weekly-bg-base: #fffaf2;
          --weekly-bg-a: rgba(180, 107, 255, .22);
          --weekly-bg-b: rgba(255, 196, 138, .2);
          --weekly-bg-c: rgba(255, 130, 176, .12);
          --weekly-arc-a: rgba(167, 139, 250, .34);
          --weekly-arc-b: rgba(255, 168, 116, .34);
          --weekly-arc-soft: rgba(167,139,250,.18);
          --weekly-brand: #8b5cf6;
          --weekly-grid: rgba(17,20,55,.12);
          --weekly-empty-dot: rgba(17,20,55,.13);
          --weekly-soft-shadow: rgba(126,87,194,.12);
          --weekly-habit-dot: #8b5cf6;
        }
        .mp-weekly-slide-shell {
          background:
            radial-gradient(circle at 88% 4%, var(--weekly-bg-a), transparent 34%),
            radial-gradient(circle at 2% 100%, var(--weekly-bg-c), transparent 34%),
            radial-gradient(circle at 30% 18%, var(--weekly-bg-b), transparent 32%),
            var(--weekly-bg-base);
        }
        .mp-weekly-arc-svg {
          opacity: 0;
          transform: translate3d(10px, -18px, 0) scale(1.04);
          transition: opacity 900ms ease, transform 1200ms cubic-bezier(.2,.8,.2,1);
        }
        .mp-weekly-slide-active .mp-weekly-arc-svg {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
        .mp-weekly-arc-path {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          transition: stroke-dashoffset 1800ms 120ms cubic-bezier(.16,.82,.18,1);
        }
        .mp-weekly-slide-active .mp-weekly-arc-path { stroke-dashoffset: 0; }
        .mp-weekly-gradient-text {
          background: linear-gradient(115deg, #a78bfa 0%, #ec6fc1 52%, #ffb879 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .mp-weekly-fragment {
          opacity: 0;
          transform: translateY(16px);
          transition: opacity 560ms cubic-bezier(.2,.8,.2,1), transform 560ms cubic-bezier(.2,.8,.2,1);
        }
        .mp-weekly-slide-active .mp-weekly-fragment {
          opacity: 1;
          transform: translateY(0);
        }
        .mp-weekly-bar { transition: width 920ms cubic-bezier(.2,.8,.2,1); }
        .mp-weekly-race-line {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          transition: stroke-dashoffset 2200ms cubic-bezier(.16,.82,.18,1);
        }
        .mp-weekly-slide-active .mp-weekly-race-line { stroke-dashoffset: 0; }
        .mp-weekly-race-late {
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 640ms 2200ms ease, transform 640ms 2200ms ease;
        }
        .mp-weekly-slide-active .mp-weekly-race-late {
          opacity: 1;
          transform: translateY(0);
        }
        .mp-weekly-story-in { animation: mpWeeklyStoryIn 560ms cubic-bezier(.2,.8,.2,1) both; }
        .mp-weekly-story-glow { animation: mpWeeklyStoryGlow 8s ease-in-out infinite; }
        .mp-monthly-pulse { animation: mpMonthlyPulse 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .mp-weekly-story-in, .mp-weekly-story-glow, .mp-monthly-pulse { animation: none !important; }
          .mp-weekly-fragment, .mp-weekly-race-late { opacity: 1 !important; transform: none !important; transition: none !important; }
          .mp-weekly-bar, .mp-weekly-race-line, .mp-weekly-arc-path { transition: none !important; stroke-dashoffset: 0 !important; }
        }
      `}
    </style>
  );
}

type MonthlyCalendarDay = {
  day: number;
  active: boolean;
};

type MonthlyStoryData = {
  calendarDays: MonthlyCalendarDay[];
  calibration: {
    downTasks: string[];
    keep: number;
    upTasks: string[];
  };
  completedTasks: number;
  difficulty: {
    easy: number;
    easyPct: number;
    hard: number;
    hardPct: number;
    medium: number;
    mediumPct: number;
  };
  emotion: {
    color: string;
    counts: Array<{ color: string; count: number; label: string }>;
    journey: Array<{ color: string; label: string; x: number; y: number }>;
    label: string;
  };
  gpTotal: number;
  unlockedHabits: Array<{
    label: string;
    monthLabel: string;
    percent: number;
    title: string;
  }>;
  nearHabits: Array<{
    label: string;
    months: Array<{ label: string; percent: number | null }>;
    percent: number;
    title: string;
  }>;
  periodLabel: string;
  rhythm: {
    currentMode: string;
    nextMode: string;
    readiness: number;
    strongTasks: number;
    threshold: number;
    totalTasks: number;
  };
  totalDays: number;
  trackedDays: number;
};

type MonthlyWrappedPayloadView = {
  completedTasks?: number;
  completions?: number;
  difficulty?: { easy?: number; hard?: number; medium?: number };
  effortBalance?: { easy?: number; hard?: number; medium?: number };
  eligible_for_upgrade?: boolean;
  gpTotal?: number;
  live_mode_context?: {
    current_mode?: string | null;
    current_weekly_target?: number | string | null;
    next_mode?: string | null;
    next_weekly_target?: number | string | null;
  } | null;
  mode_weekly_target?: number;
  monthly_kpis?: {
    dominantPillar?: string | null;
    dominantPillarTasksCompleted?: number;
    tasksCompleted?: number;
    xpGained?: number;
  };
  summary?: {
    completedTasks?: number;
    completions?: number;
    effortBalance?: { easy?: number; hard?: number; medium?: number };
    gpTotal?: number;
    totalXp?: number;
  };
  suggested_next_mode?: string | null;
  task_pass_rate?: number;
  tasks_meeting_goal?: number;
  tasks_total_evaluated?: number;
  totalXp?: number;
  xpTotal?: number;
};

type MonthlyWrappedSummaryView = {
  eligible_for_upgrade?: boolean;
  suggested_next_mode?: string | null;
  tasks_completed?: number;
  xp_gained?: number;
  weeks?: unknown;
};

function MonthlyCalendarStrip({ active, days }: { active: boolean; days: MonthlyCalendarDay[] }) {
  return (
    <div className="grid grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5">
      {days.map((day, index) => (
        <span
          aria-label={`Día ${day.day}${day.active ? ' trackeado' : ''}`}
          className="mp-weekly-fragment h-2.5 rounded-full"
          key={`monthly-calendar-day-${day.day}`}
          style={{
            backgroundColor: day.active ? '#A78BFA' : 'var(--weekly-empty-dot)',
            boxShadow: day.active ? '0 0 16px rgba(167,139,250,.32)' : undefined,
            opacity: active ? 1 : 0,
            transitionDelay: `${130 + index * 18}ms`,
          }}
        />
      ))}
    </div>
  );
}

function MonthlyCalibrationStory({
  active,
  downTasks,
  keep,
  upTasks,
}: {
  active: boolean;
  downTasks: string[];
  keep: number;
  upTasks: string[];
}) {
  const groups = [
    { key: 'up', count: upTasks.length, label: 'Subieron', color: '#FF6B6B', icon: '↑', tasks: upTasks },
    { key: 'down', count: downTasks.length, label: 'Bajaron', color: '#5BE282', icon: '↓', tasks: downTasks },
    { key: 'keep', count: keep, label: 'Se mantuvieron', color: '#F7C86A', icon: '•', tasks: [] },
  ];

  return (
    <div className="flex flex-1 flex-col justify-between gap-[clamp(2rem,7dvh,3.25rem)]">
      <p className="mp-weekly-fragment text-xl leading-relaxed text-[color:var(--weekly-muted)]" style={{ transitionDelay: '120ms' }}>
        El sistema ajustó dificultad según el ritmo real del mes.
      </p>
      <div className="grid grid-cols-3 gap-4">
        {groups.map((group, index) => (
          <div className="mp-weekly-fragment text-center" key={`monthly-calibration-${group.key}`} style={{ transitionDelay: `${230 + index * 130}ms` }}>
            <span
              className="mx-auto grid h-16 w-16 place-items-center rounded-full text-4xl font-light"
              style={{
                background: `color-mix(in srgb, ${group.color} 18%, transparent)`,
                color: group.color,
                boxShadow: `0 0 34px color-mix(in srgb, ${group.color} 22%, transparent)`,
              }}
            >
              {group.icon}
            </span>
            <p className="mt-4 text-5xl font-semibold leading-none text-[color:var(--weekly-title)]">
              <AnimatedWeeklyNumber active={active} duration={900 + index * 100} value={group.count} />
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.22em]" style={{ color: group.color }}>{group.label}</p>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {[...upTasks.map((task) => ({ color: '#FF6B6B', icon: '↑', task })), ...downTasks.map((task) => ({ color: '#5BE282', icon: '↓', task }))].slice(0, 4).map((item, index) => (
          <div className="mp-weekly-fragment flex items-center gap-3 border-t border-[color:var(--weekly-line)] pt-4" key={`monthly-calibration-task-${item.task}`} style={{ transitionDelay: `${680 + index * 90}ms` }}>
            <span className="text-2xl" style={{ color: item.color }}>{item.icon}</span>
            <p className="min-w-0 flex-1 truncate text-lg font-semibold text-[color:var(--weekly-title)]">{item.task}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyNearHabitsStory({
  active,
  habits,
  unlockedHabits,
}: {
  active: boolean;
  habits: MonthlyStoryData['nearHabits'];
  unlockedHabits: MonthlyStoryData['unlockedHabits'];
}) {
  return (
    <div className="flex flex-1 flex-col justify-between gap-[clamp(1rem,3dvh,1.6rem)]">
      <p className="mp-weekly-fragment text-sm leading-relaxed text-[color:var(--weekly-muted)]" style={{ transitionDelay: '120ms' }}>
        Nuevos logros del mes y hábitos que quedaron cerca de desbloquearse.
      </p>
      <div className="space-y-[clamp(.75rem,2.1dvh,1.05rem)]">
        {unlockedHabits.length ? (
          <div className="mp-weekly-fragment rounded-[1.15rem] border border-[#5BE282]/35 bg-[#5BE282]/[0.07] px-4 py-3" style={{ transitionDelay: '200ms' }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#5BE282]">Nuevo logro desbloqueado</p>
            <div className="mt-3 space-y-2.5">
              {unlockedHabits.map((habit) => (
                <div className="flex items-start justify-between gap-3" key={`monthly-unlocked-habit-${habit.title}`}>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold leading-tight text-[color:var(--weekly-title)]">{habit.title}</p>
                    <p className="mt-0.5 text-xs text-[color:var(--weekly-muted)]">{habit.label} · {habit.monthLabel}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#5BE282]">OK</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        {habits.length ? habits.map((habit, index) => (
          <div className="mp-weekly-fragment border-t border-[color:var(--weekly-line)] pt-3.5" key={`monthly-near-habit-${habit.title}`} style={{ transitionDelay: `${260 + index * 130}ms` }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold leading-tight text-[color:var(--weekly-title)]">{habit.title}</p>
                <p className="mt-1 text-sm text-[color:var(--weekly-muted)]">{habit.label}</p>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: getMonthlyScoreTone(habit.percent).color }}>
                {getMonthlyScoreTone(habit.percent).label}
              </p>
            </div>
            <div className="mt-4 grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(1, habit.months.length)}, minmax(0, 1fr))` }}>
              {habit.months.map((month, monthIndex) => {
                const tone = getMonthlyScoreTone(month.percent ?? 0);
                return (
                  <div className="min-w-0" key={`monthly-near-habit-${habit.title}-${month.label}`}>
                    <span className="mb-2 flex items-baseline justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--weekly-subtle)]">{month.label}</span>
                      <span className="text-base font-semibold leading-none" style={{ color: month.percent === null ? 'var(--weekly-subtle)' : tone.color }}>
                        {month.percent === null ? 's/d' : <><AnimatedWeeklyNumber active={active} duration={760 + monthIndex * 90} value={month.percent} />%</>}
                      </span>
                    </span>
                  <span className="block h-2 overflow-hidden rounded-full bg-[color:var(--weekly-line)]">
                    <span
                      className="mp-weekly-bar block h-full rounded-full bg-[#A78BFA]"
                      style={{
                        backgroundColor: tone.color,
                        transitionDelay: `${620 + monthIndex * 120}ms`,
                        opacity: month.percent === null ? 0 : 1,
                        width: active ? `${month.percent ?? 0}%` : '0%',
                      }}
                    />
                  </span>
                </div>
                );
              })}
            </div>
          </div>
        )) : (
          <div className="mp-weekly-fragment border-t border-[color:var(--weekly-line)] pt-6" style={{ transitionDelay: '220ms' }}>
            <p className="text-xl font-semibold leading-tight text-[color:var(--weekly-title)]">Sin hábitos cerca</p>
            <p className="mt-2 text-sm leading-relaxed text-[color:var(--weekly-muted)]">No quedaron hábitos entre 50% y 99% para este periodo.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function MonthlyRhythmReadinessStory({
  active,
  currentMode,
  nextMode,
  readiness,
  strongTasks,
  threshold,
  totalTasks,
}: {
  active: boolean;
  currentMode: string;
  nextMode: string;
  readiness: number;
  strongTasks: number;
  threshold: number;
  totalTasks: number;
}) {
  const remaining = Math.max(0, threshold - readiness);
  return (
    <div className="flex flex-1 flex-col justify-between gap-[clamp(2rem,7dvh,3rem)]">
      <div className="mp-weekly-fragment space-y-3" style={{ transitionDelay: '120ms' }}>
        <p className="text-xl leading-relaxed text-[color:var(--weekly-muted)]">
          Cuando el ritmo global supera el {threshold}%, se habilita la sugerencia de subir ritmo.
        </p>
        <div className="inline-flex items-center gap-3 rounded-full border border-[color:var(--weekly-line)] px-4 py-2 text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--weekly-title)]">
          <span>{currentMode}</span>
          <span className="text-[#5BE282]">→</span>
          <span>{nextMode}</span>
        </div>
      </div>
      <div className="mp-weekly-fragment relative grid place-items-center" style={{ transitionDelay: '220ms' }}>
        <span className="mp-weekly-story-glow absolute h-72 w-72 rounded-full bg-green-400/10 blur-3xl" />
        <div className="relative text-center">
          <p className="text-[clamp(7rem,32vw,9.8rem)] font-semibold leading-none tracking-[-0.08em] text-[color:var(--weekly-title)]">
            <AnimatedWeeklyNumber active={active} value={readiness} />%
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.32em] text-[#5BE282]">{strongTasks}/{totalTasks} tareas sobre objetivo</p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="mp-weekly-fragment relative h-3 rounded-full bg-[color:var(--weekly-line)]" style={{ transitionDelay: '520ms' }}>
          <span
            className="mp-weekly-bar absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-[#A78BFA] to-[#5BE282]"
            style={{ width: active ? `${readiness}%` : '0%' }}
          />
          <span className="absolute top-1/2 h-7 w-px -translate-y-1/2 bg-[#F7C86A]" style={{ left: `${threshold}%` }} />
          <span className="absolute -top-8 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.16em] text-[#F7C86A]" style={{ left: `${threshold}%` }}>
            {threshold}% objetivo
          </span>
        </div>
        <p className="mp-weekly-race-late text-center text-base text-[color:var(--weekly-muted)]">
          {remaining > 0 ? `Faltan ${remaining} puntos para desbloquear subida de ritmo.` : 'Ritmo listo para subir.'}
        </p>
      </div>
    </div>
  );
}

function MonthlyEmotionJourneyStory({
  active,
  emotion,
}: {
  active: boolean;
  emotion: MonthlyStoryData['emotion'];
}) {
  const path = buildMonthlyEmotionPath(emotion.journey);
  return (
    <div className="flex flex-1 flex-col justify-between gap-[clamp(1.6rem,5dvh,2.6rem)]">
      <div className="mp-weekly-fragment relative grid flex-1 place-items-center" style={{ transitionDelay: '160ms' }}>
        <span
          className="mp-monthly-pulse absolute h-[clamp(10rem,48vw,13rem)] w-[clamp(10rem,48vw,13rem)] rounded-full blur-3xl"
          style={{ backgroundColor: emotion.color, opacity: 0.18 }}
        />
        <svg aria-label="Recorrido emocional mensual" className="relative block w-full overflow-visible" role="img" viewBox="0 0 360 260">
          <defs>
            <linearGradient id="monthly-emotion-gradient" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#5BE282" />
              <stop offset="35%" stopColor="#F7C86A" />
              <stop offset="70%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#56DDF5" />
            </linearGradient>
          </defs>
          {[70, 130, 190].map((y) => (
            <line key={`monthly-emotion-grid-${y}`} stroke="var(--weekly-grid)" strokeDasharray="2 9" x1="12" x2="348" y1={y} y2={y} />
          ))}
          <path
            className="mp-weekly-race-line"
            d={path}
            fill="none"
            pathLength={1}
            stroke="url(#monthly-emotion-gradient)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
          />
          {emotion.journey.map((point, index) => (
            <circle
              className="mp-weekly-race-late"
              cx={point.x}
              cy={point.y}
              fill={point.color}
              key={`monthly-emotion-point-${index}`}
              r={index === emotion.journey.length - 1 ? 6 : 4.5}
              style={{ transitionDelay: `${980 + index * 70}ms` }}
            />
          ))}
        </svg>
      </div>
      <div className="space-y-6">
        <p className="mp-weekly-race-late text-2xl font-semibold leading-tight text-[color:var(--weekly-title)]">
          {emotion.label} fue la emoción que más se repitió.
        </p>
        <div className="grid grid-cols-4 gap-3">
          {emotion.counts.map((item, index) => (
            <div className="mp-weekly-race-late text-center" key={`monthly-emotion-count-${item.label}`} style={{ transitionDelay: `${1650 + index * 90}ms` }}>
              <span className="mx-auto mb-2 block h-4 w-4 rounded-full" style={{ backgroundColor: item.color, boxShadow: `0 0 18px ${item.color}55` }} />
              <p className="text-2xl font-semibold leading-none text-[color:var(--weekly-title)]">{item.count}</p>
              <p className="mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-[color:var(--weekly-muted)]">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeeklyStorySlide({
  accent,
  active,
  children,
  eyebrow,
  index,
  registerSlide,
  title,
  titleDelay = '95ms',
}: {
  accent: string;
  active: boolean;
  children: ReactNode;
  eyebrow: string;
  index: number;
  registerSlide: (el: HTMLElement | null) => void;
  title: string;
  titleDelay?: string;
}) {
  return (
    <section
      className={`mp-weekly-slide-shell relative flex min-h-[100dvh] snap-start justify-center overflow-hidden px-7 ${active ? 'mp-weekly-slide-active' : ''}`}
      data-weekly-slide={index}
      ref={registerSlide}
      style={{
        paddingBottom: 'calc(var(--weekly-safe-bottom) + 1.25rem)',
        paddingTop: 'calc(var(--weekly-safe-top) + 2.35rem)',
      }}
    >
      <svg aria-hidden="true" className="mp-weekly-arc-svg pointer-events-none absolute -right-24 -top-14 h-[42rem] w-[32rem]" fill="none" viewBox="0 0 430 760">
        <path className="mp-weekly-arc-path" d="M355 -18C265 126 325 244 430 342C536 441 515 629 358 742" pathLength={1} stroke="var(--weekly-arc-a)" strokeLinecap="round" strokeWidth="1.4" />
        <path className="mp-weekly-arc-path" d="M306 -28C230 117 289 250 403 369C502 472 478 638 324 746" pathLength={1} stroke="var(--weekly-arc-soft)" strokeLinecap="round" strokeWidth="1" />
      </svg>
      <svg aria-hidden="true" className="mp-weekly-arc-svg pointer-events-none absolute -bottom-28 -left-36 h-[34rem] w-[35rem]" fill="none" viewBox="0 0 520 520">
        <path className="mp-weekly-arc-path" d="M-32 370C94 492 275 538 416 437C540 348 538 151 416 52" pathLength={1} stroke="var(--weekly-arc-b)" strokeLinecap="round" strokeWidth="1.25" />
        <path className="mp-weekly-arc-path" d="M-18 322C114 435 257 462 386 373C494 298 493 147 390 65" pathLength={1} stroke="var(--weekly-arc-soft)" strokeLinecap="round" strokeWidth="1" />
      </svg>
      <div className="mp-weekly-story-in relative z-10 flex min-h-0 w-full max-w-[430px] flex-col">
        <div className="mb-[clamp(.85rem,3.2dvh,1.35rem)]">
          <InnerbloomBrand
            className="mp-weekly-fragment"
            markClassName="h-5 w-5"
            textClassName="text-[10px] tracking-[0.46em]"
            style={{ color: 'var(--weekly-brand)', transitionDelay: '0ms' }}
          />
          <p className="mp-weekly-fragment mt-[clamp(.9rem,2.4dvh,1.25rem)] text-xs font-semibold uppercase tracking-[0.34em]" style={{ color: accent, transitionDelay: '40ms' }}>{eyebrow}</p>
          <h2 className="mp-weekly-fragment mt-3 text-[clamp(2.45rem,10.5vw,3.35rem)] font-semibold leading-[0.96] tracking-[-0.035em] text-[color:var(--weekly-title)]" style={{ transitionDelay: titleDelay }}>{title}</h2>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </section>
  );
}

function WeeklyTextMetric({ active, label, value }: { active: boolean; label: string; value: number }) {
  return (
    <div>
      <p className="text-3xl font-semibold leading-none text-[color:var(--mp-text)]">
        <AnimatedWeeklyNumber active={active} value={value} />%
      </p>
      <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-[color:var(--weekly-subtle)]">{label}</p>
    </div>
  );
}

function WeeklyStoryHabitChip({ score }: { score: number }) {
  const isStrong = score >= 80;
  const isBuilding = score >= 50 && score < 80;
  const label = getWeeklyHabitStatusLabel(score);
  const styles = isStrong
    ? {
        background: 'color-mix(in srgb, #5BE282 22%, transparent)',
        color: '#39C86C',
      }
    : isBuilding
      ? {
          background: 'color-mix(in srgb, #F7C86A 28%, transparent)',
          color: '#B77A00',
        }
      : {
          background: 'color-mix(in srgb, #FF6B6B 22%, transparent)',
          color: '#FF6B6B',
        };

  return (
    <span
      className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
      style={styles}
    >
      {label}
    </span>
  );
}

function MiniWeeklyEnergyChart({
  energy,
}: {
  energy: WeeklyWrappedRecord['payload']['summary']['energyHighlight'] | undefined;
}) {
  const metrics = buildWeeklyEnergyRaceMetrics(energy);
  if (!metrics.length) {
    return <div className="h-24 rounded-[0.75rem] border border-[color:var(--weekly-line)] bg-white/[0.035]" />;
  }
  const lines = buildWeeklyEnergyRaceLines(metrics);

  return (
    <svg aria-hidden="true" className="h-24 w-full overflow-visible" viewBox="0 0 180 98">
      {[35, 60, 85].map((value) => (
        <line
          key={`weekly-mini-energy-grid-${value}`}
          stroke="var(--weekly-grid)"
          strokeDasharray="2 8"
          x1="2"
          x2="130"
          y1={weeklyMiniEnergyY(value)}
          y2={weeklyMiniEnergyY(value)}
        />
      ))}
      {lines.map((line, index) => (
        <g key={`weekly-mini-energy-${line.metric.key}`}>
          <path
            d={buildWeeklyMiniEnergyPath(line.metric.points)}
            fill="none"
            pathLength={1}
            stroke={line.metric.color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={index === 0 ? 2.4 : 2}
          />
          <circle cx="130" cy={weeklyMiniEnergyY(line.metric.percent)} fill={line.metric.color} r="3.2" />
        </g>
      ))}
    </svg>
  );
}

function WeeklyEnergyRaceChart({
  active,
  energy,
}: {
  active: boolean;
  energy: WeeklyWrappedRecord['payload']['summary']['energyHighlight'] | undefined;
}) {
  const metrics = buildWeeklyEnergyRaceMetrics(energy);
  if (!metrics.length) {
    return (
      <div className="mp-weekly-fragment flex min-h-0 flex-1 flex-col justify-center gap-5" style={{ transitionDelay: '180ms' }}>
        <div className="rounded-[1.3rem] border border-[color:var(--weekly-line)] bg-white/[0.045] px-5 py-6">
          <p className="text-xs uppercase tracking-[0.28em] text-[#56DDF5]">Datos reales</p>
          <p className="mt-4 text-2xl font-semibold leading-tight text-[color:var(--weekly-text)]">Este Weekly todavía no tiene serie real guardada.</p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--weekly-muted)]">
            Los próximos Wrapped van a usar HP, Mood y Focus reales de Daily Energy para mostrar la variación semanal.
          </p>
        </div>
      </div>
    );
  }
  const lines = buildWeeklyEnergyRaceLines(metrics);
  const leader = resolveWeeklyEnergyLeader(metrics);
  const variationLeader = resolveWeeklyEnergyVariationLeader(metrics);

  return (
    <div className="mp-weekly-fragment flex min-h-0 flex-1 flex-col justify-center gap-[clamp(1rem,3dvh,1.35rem)]" style={{ transitionDelay: '180ms' }}>
      <svg
        aria-label={`Energía diaria semanal: ${metrics.map((metric) => `${metric.label} ${metric.percent}%`).join(', ')}`}
        className="block max-h-[44dvh] w-full overflow-visible"
        role="img"
        viewBox="0 0 360 250"
      >
        <defs>
          <linearGradient id="weekly-energy-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#56DDF5" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#A78BFA" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((value) => (
          <line
            key={`weekly-energy-grid-${value}`}
            stroke="var(--weekly-grid)"
            strokeDasharray="2 8"
            x1="8"
            x2="260"
            y1={weeklyEnergyY(value)}
            y2={weeklyEnergyY(value)}
          />
        ))}
        <path d={`${lines[2]?.path ?? ''} L 260 186 L 8 186 Z`} fill="url(#weekly-energy-area)" opacity={active ? 1 : 0} />
        {lines.map((line, index) => (
          <g key={`weekly-energy-line-${line.metric.key}`}>
            <path
              className="mp-weekly-race-line"
              d={line.path}
              fill="none"
              pathLength={1}
              stroke={line.metric.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={line.metric.key === variationLeader.key ? 4.2 : 2.5}
              style={{
                filter: line.metric.key === variationLeader.key ? `drop-shadow(0 0 10px ${line.metric.color}66)` : undefined,
                transitionDelay: `${index * 95}ms`,
              }}
            />
            <path
              d={line.path}
              fill="none"
              opacity={line.metric.key === variationLeader.key ? 0.18 : 0}
              stroke={line.metric.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="12"
              style={{ transitionDelay: `${index * 95}ms` }}
            />
            <g className="mp-weekly-race-late" style={{ transitionDelay: `${1110 + index * 70}ms` }}>
              <line opacity="0.46" stroke={line.metric.color} strokeWidth="1.2" x1="260" x2="278" y1={line.endY} y2={line.labelY} />
              <circle cx="260" cy={line.endY} fill={line.metric.color} r="4.4" />
              <text fill={line.metric.color} fontSize="13" fontWeight="600" x="286" y={line.labelY + 4}>
                {line.metric.label}
                <tspan dx="6" fill="var(--weekly-text)" fontWeight="500">{line.metric.percent}%</tspan>
              </text>
            </g>
          </g>
        ))}
        <text fill="var(--weekly-subtle)" fontSize="10" letterSpacing="1.4" x="8" y="222">HACE 7 DÍAS</text>
        <text fill="var(--weekly-subtle)" fontSize="10" letterSpacing="1.4" textAnchor="end" x="260" y="222">HOY</text>
        <g className="mp-weekly-race-late" style={{ transitionDelay: '2520ms' }}>
          <text fill="var(--weekly-muted)" fontSize="13" x="8" y="246">
            <tspan fill={leader.color} fontWeight="700">{leader.label}</tspan>
            <tspan> lideró </tspan>
            <tspan fill="var(--weekly-text)" fontWeight="700">{leader.days}/7</tspan>
            <tspan> días</tspan>
          </text>
        </g>
      </svg>
      <div className="mp-weekly-race-late space-y-3" style={{ transitionDelay: '2620ms' }}>
        <div className="rounded-[1.1rem] border border-[color:var(--weekly-line)] bg-white/[0.045] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--weekly-subtle)]">Mayor variación</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold leading-none" style={{ color: variationLeader.color }}>{variationLeader.label}</p>
              <p className="mt-1 text-xs text-[color:var(--weekly-muted)]">{variationLeader.pillar}</p>
            </div>
            <p className="text-3xl font-semibold leading-none" style={{ color: variationLeader.color }}>{formatSignedPct(variationLeader.deltaPct ?? 0)}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {metrics.map((metric) => (
            <div className="rounded-[0.85rem] border border-[color:var(--weekly-line)] bg-white/[0.035] px-3 py-2" key={`weekly-energy-delta-${metric.key}`}>
              <p className="text-sm font-semibold" style={{ color: metric.color }}>{metric.label}</p>
              <p className="mt-1 text-xs text-[color:var(--weekly-muted)]">{formatSignedPct(metric.deltaPct ?? 0)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WeeklyDifficultyConstellation({
  active,
  easyCount,
  easyPct,
  hardCount,
  hardPct,
  mediumCount,
  mediumPct,
  total,
}: {
  active: boolean;
  easyCount: number;
  easyPct: number;
  hardCount: number;
  hardPct: number;
  mediumCount: number;
  mediumPct: number;
  total: number;
}) {
  const segments = [
    { key: 'easy', label: 'Fácil', count: easyCount, percent: easyPct, color: '#5BE282' },
    { key: 'medium', label: 'Media', count: mediumCount, percent: mediumPct, color: '#F7C86A' },
    { key: 'hard', label: 'Difícil', count: hardCount, percent: hardPct, color: '#FF6B6B' },
  ];
  const safeTotal = Math.max(1, total);

  return (
    <div className="mp-weekly-fragment space-y-6" style={{ transitionDelay: '520ms' }}>
      <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--weekly-muted)]">Dificultad de las tareas</p>
      <div className="flex h-3 overflow-hidden rounded-full bg-[color:var(--weekly-line)]">
        {segments.map((segment, index) => {
          const width = Math.max(segment.count > 0 ? 7 : 0, Math.round((segment.count / safeTotal) * 100));
          return (
            <span
              aria-hidden="true"
              className="h-full transition-all duration-700"
              key={`weekly-difficulty-segment-${segment.key}`}
              style={{
                backgroundColor: segment.color,
                opacity: active ? 1 : 0,
                transform: active ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: index === 0 ? 'left' : 'center',
                transitionDelay: `${620 + index * 140}ms`,
                width: `${width}%`,
              }}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {segments.map((segment, index) => (
          <div className="min-w-0 text-center" key={`weekly-difficulty-count-${segment.key}`} style={{ color: segment.color }}>
            <p className="text-4xl font-semibold leading-none text-[color:var(--weekly-title)]">
              <AnimatedWeeklyNumber active={active} duration={820 + index * 120} value={segment.count} />
            </p>
            <p className="mt-2 text-[10px] uppercase tracking-[0.24em]" style={{ color: segment.color }}>{segment.label}</p>
            <p className="mt-1 text-xs font-semibold" style={{ color: segment.color }}>
              <AnimatedWeeklyNumber active={active} duration={720 + index * 120} value={segment.percent} />%
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeeklyRadarAnalysisChart({
  active,
  completions,
  dominant,
  dominantPct,
  message,
  radarTraits,
  xp,
}: {
  active: boolean;
  completions: number;
  dominant: RewardsPillarCode;
  dominantPct: number;
  message: string;
  radarTraits?: TraitXpEntry[];
  xp: number;
}) {
  const uniqueId = useId().replace(/:/g, '_');
  const size = 340;
  const center = size / 2;
  const radius = 108;
  const ringRadius = 122;
  const axes = buildWeeklyRadarAxes(dominant, radarTraits);
  const maxValue = Math.max(1, ...axes.map((axis) => axis.value));
  const pillarPercentages = resolveWeeklyRadarPillarPercentages(axes, dominant, dominantPct);
  const effectiveDominant = resolveWeeklyRadarDominant(pillarPercentages);
  const effectiveDominantIndex = WEEKLY_PILLAR_ORDER.indexOf(effectiveDominant);
  const hasRealRadarTraits = (radarTraits ?? []).some((trait) => normalizePillarCode(trait.pillar) && Number.isFinite(trait.xp) && trait.xp > 0);
  const effectiveMessage = hasRealRadarTraits
    ? `${resolveRewardsPillarLabel(effectiveDominant)} lideró tu energía estos días. Seguí apoyándote en ese foco.`
    : message || `${resolveRewardsPillarLabel(effectiveDominant)} lideró tu energía estos días. Seguí apoyándote en ese foco.`;
  const points = axes.map((axis, index) => {
    const distance = radius * (axis.value / maxValue);
    const point = weeklyPolarPoint(center, center, distance, weeklyRadarAngle(index, axes.length));
    return `${point.x},${point.y}`;
  }).join(' ');
  const ranges = buildWeeklyRadarRanges(axes);
  const dominantRange = ranges[effectiveDominantIndex] ?? { start: 0, end: Math.PI * 2 };

  return (
    <div className="mp-weekly-fragment flex min-h-0 flex-1 flex-col space-y-[clamp(1rem,3dvh,1.5rem)]" style={{ transitionDelay: '170ms' }}>
      <div className="mp-weekly-radar-stage">
        <svg aria-label="Radar de pilar dominante semanal" className="mx-auto block max-h-[39dvh] w-full max-w-[21rem] overflow-visible" role="img" viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="weekly-radar-shape" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(86,221,245,0.32)" />
              <stop offset="55%" stopColor="rgba(167,139,250,0.32)" />
              <stop offset="100%" stopColor="rgba(247,200,106,0.2)" />
            </linearGradient>
            <radialGradient id="weekly-radar-dominant">
              <stop offset="0%" stopColor={`${getWeeklyPillarColor(effectiveDominant)}44`} />
              <stop offset="100%" stopColor={`${getWeeklyPillarColor(effectiveDominant)}00`} />
            </radialGradient>
            {ranges.map((range, index) => (
              <path
                d={weeklyArcPath(center, center, ringRadius + 17, range.start, range.end)}
                fill="none"
                id={`${uniqueId}-weekly-radar-label-path-${WEEKLY_PILLAR_ORDER[index]}`}
                key={`weekly-radar-label-path-${WEEKLY_PILLAR_ORDER[index]}`}
              />
            ))}
          </defs>
          <circle className="mp-weekly-radar-glow" cx={center} cy={center} fill="url(#weekly-radar-dominant)" r="150" />
          {[0.25, 0.5, 0.75, 1].map((level) => (
            <polygon
              className="mp-weekly-radar-grid"
              fill="none"
              key={`weekly-radar-grid-${level}`}
              points={axes.map((_, index) => {
                const point = weeklyPolarPoint(center, center, radius * level, weeklyRadarAngle(index, axes.length));
                return `${point.x},${point.y}`;
              }).join(' ')}
              stroke="var(--weekly-grid)"
              strokeWidth="1"
            />
          ))}
          {axes.map((axis, index) => {
            const end = weeklyPolarPoint(center, center, radius, weeklyRadarAngle(index, axes.length));
            const value = weeklyPolarPoint(center, center, radius * (axis.value / maxValue), weeklyRadarAngle(index, axes.length));
            return (
              <g key={`weekly-radar-axis-${axis.key}`}>
                <line className="mp-weekly-radar-axis" stroke="var(--weekly-grid)" x1={center} x2={end.x} y1={center} y2={end.y} />
                <circle className="mp-weekly-radar-reveal" cx={value.x} cy={value.y} fill="var(--weekly-title)" r="2.6" />
              </g>
            );
          })}
          <polygon
            className="mp-weekly-radar-area"
            fill="url(#weekly-radar-shape)"
            points={points}
          />
          <path
            className="mp-weekly-radar-dominant-fill"
            d={weeklySectorPath(center, center, radius, dominantRange.start, dominantRange.end)}
            fill={getWeeklyPillarColor(effectiveDominant)}
            fillOpacity="0.18"
          />
          <polygon
            className="mp-weekly-radar-polygon"
            pathLength={1}
            points={points}
            stroke="rgba(167,139,250,0.94)"
            strokeLinejoin="round"
            strokeWidth="3"
          />
          {ranges.map((range, index) => {
            const pillar = WEEKLY_PILLAR_ORDER[index];
            const selected = pillar === effectiveDominant;
            return (
              <path
                className={selected ? 'mp-weekly-radar-ring mp-weekly-radar-ring-selected' : 'mp-weekly-radar-ring'}
                d={weeklyArcPath(center, center, ringRadius, range.start, range.end)}
                fill="none"
                key={`weekly-radar-ring-${pillar}`}
                stroke={getWeeklyPillarColor(pillar)}
                strokeLinecap="round"
                strokeOpacity="0.34"
                strokeWidth="4.5"
                style={{ color: getWeeklyPillarColor(pillar) }}
              />
            );
          })}
          {WEEKLY_PILLAR_ORDER.map((pillar) => (
            <text
              className="mp-weekly-radar-label"
              fill={getWeeklyPillarColor(pillar)}
              fontSize="10"
              fontWeight="700"
              key={`weekly-radar-pillar-label-${pillar}`}
              letterSpacing="0.18em"
              textAnchor="middle"
            >
              <textPath href={`#${uniqueId}-weekly-radar-label-path-${pillar}`} startOffset="50%" textAnchor="middle">
                {resolveRewardsPillarLabel(pillar).toUpperCase()} {pillarPercentages[pillar]}%
              </textPath>
            </text>
          ))}
          <circle className="mp-weekly-radar-center" cx={center} cy={center} fill="var(--weekly-title)" r="4.4" />
        </svg>
      </div>

      <div className="mp-weekly-radar-final pt-[clamp(.75rem,2.5dvh,1.25rem)]">
        <p className="max-w-[21rem] text-lg leading-relaxed text-[color:var(--weekly-muted)]">{effectiveMessage}</p>
      </div>

      <div className="mp-weekly-radar-final grid grid-cols-3 items-end gap-2 pt-[clamp(.4rem,1.4dvh,.8rem)] text-center">
        {WEEKLY_PILLAR_ORDER.map((pillar, index) => {
          const percent = pillarPercentages[pillar];
          const selected = pillar === effectiveDominant;
          return (
            <div className="min-w-0" key={`weekly-radar-metric-${pillar}`} style={{ color: getWeeklyPillarColor(pillar) }}>
              <p className={`${selected ? 'text-[clamp(2.9rem,11vw,3.35rem)]' : 'text-[clamp(1.85rem,7.2vw,2.15rem)]'} font-semibold leading-none tracking-[-0.04em]`}>
                <AnimatedWeeklyNumber active={active} delay={3900} duration={selected ? 1450 : 820} value={percent} />%
              </p>
              <p className="mt-2 text-[10px] uppercase tracking-[0.24em] text-[color:var(--weekly-muted)]">{resolveRewardsPillarLabel(pillar)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklySharePicker({
  dominantColor,
  dominantLabel,
  energy,
  emotion,
  mode,
  onClose,
  onModeChange,
  storyHabits,
}: {
  dominantColor: string;
  dominantLabel: string;
  energy: WeeklyWrappedRecord['payload']['summary']['energyHighlight'] | undefined;
  emotion: WeeklyWrappedRecord['payload']['emotions']['weekly'] | WeeklyWrappedRecord['payload']['emotions']['biweekly'] | undefined;
  mode: WeeklyStoryVisualMode;
  onClose: () => void;
  onModeChange: (mode: WeeklyStoryVisualMode) => void;
  storyHabits: Array<{ title: string; body?: string; daysActive?: number; completionRate?: number | string | null }>;
}) {
  const [selected, setSelected] = useState<'tasks' | 'balance' | 'habits' | 'emotion'>('tasks');
  const [previewing, setPreviewing] = useState(false);
  const options: Array<{ key: typeof selected; label: string }> = [
    { key: 'tasks', label: 'Tareas' },
    { key: 'balance', label: 'Balance' },
    { key: 'habits', label: 'Hábitos' },
    { key: 'emotion', label: emotion?.label ?? 'Calma' },
  ];

  return (
    <div
      className="absolute inset-0 z-30 flex items-end bg-black/46 px-4 pb-[calc(var(--weekly-safe-bottom)+0.75rem)] backdrop-blur-md"
      onClick={onClose}
      onTouchMove={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        className="mp-weekly-panel flex max-h-[min(90dvh,45rem)] w-full flex-col overflow-hidden rounded-[1.65rem] p-3.5"
        onClick={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          {previewing ? (
            <button
              className="-ml-1 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-[color:var(--weekly-title)]"
              onClick={() => setPreviewing(false)}
              type="button"
            >
              <span className="text-xl leading-none">‹</span>
              Cambiar story
            </button>
          ) : (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--weekly-brand)]">Compartir story</p>
              <h3 className="mt-1 text-lg font-semibold text-[color:var(--weekly-title)]">Elegí una versión</h3>
            </div>
          )}
          <button
            aria-label="Cerrar selector"
            className="grid h-9 w-9 place-items-center rounded-full bg-black/10 text-xl text-[color:var(--weekly-muted)]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-full bg-black/10 p-1">
          {(['dark', 'light'] as WeeklyStoryVisualMode[]).map((item) => (
            <button
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${mode === item ? 'bg-[color:var(--weekly-brand)] text-white' : 'text-[color:var(--weekly-muted)]'}`}
              key={item}
              onClick={() => onModeChange(item)}
              type="button"
            >
              {item === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
        {previewing ? (
          <div className="mt-3 flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="mx-auto w-full max-w-[min(72vw,19.5rem)]">
                <WeeklySharePreview
                  dominantColor={dominantColor}
                  dominantLabel={dominantLabel}
                  energy={energy}
                  emotion={emotion}
                  full
                  mode={mode}
                  storyHabits={storyHabits}
                  type={selected}
                />
              </div>
            </div>
            <button
              className="mt-3 w-full shrink-0 rounded-full bg-[color:var(--mp-violet)] px-5 py-3 text-base font-semibold text-white"
              type="button"
            >
              Compartir
            </button>
          </div>
        ) : (
          <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {options.map((option) => (
              <button
                aria-pressed={selected === option.key}
                className={`group overflow-hidden rounded-[0.85rem] border p-1.5 text-left transition ${selected === option.key ? 'border-[color:var(--weekly-brand)] bg-white/[0.08] shadow-[0_0_22px_rgba(167,139,250,0.18)]' : 'border-[color:var(--weekly-line)] bg-white/[0.035]'}`}
                key={option.key}
                onClick={() => {
                  setSelected(option.key);
                  setPreviewing(true);
                }}
                type="button"
              >
                <WeeklySharePreview
                  dominantColor={dominantColor}
                  dominantLabel={dominantLabel}
                  energy={energy}
                  emotion={emotion}
                  mode={mode}
                  storyHabits={storyHabits}
                  type={option.key}
                />
                <span className="mt-1 block px-1 pb-0.5 text-[11px] font-semibold text-[color:var(--weekly-title)]">{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function WeeklySharePreview({
  dominantColor,
  dominantLabel,
  energy,
  emotion,
  full = false,
  mode,
  storyHabits,
  type,
}: {
  dominantColor: string;
  dominantLabel: string;
  energy: WeeklyWrappedRecord['payload']['summary']['energyHighlight'] | undefined;
  emotion: WeeklyWrappedRecord['payload']['emotions']['weekly'] | WeeklyWrappedRecord['payload']['emotions']['biweekly'] | undefined;
  full?: boolean;
  mode: WeeklyStoryVisualMode;
  storyHabits: Array<{ title: string; body?: string; daysActive?: number; completionRate?: number | string | null }>;
  type: 'tasks' | 'balance' | 'habits' | 'emotion';
}) {
  const isLight = mode === 'light';
  const text = isLight ? '#101332' : '#FFF8EF';
  const muted = isLight ? '#6E7078' : 'rgba(255,248,239,.66)';
  const violet = isLight ? '#8B5CF6' : '#A78BFA';
  const cyan = isLight ? '#7C3AED' : '#56DDF5';
  const bg = isLight
    ? 'radial-gradient(circle at 100% 0%, rgba(186,126,255,.26), transparent 35%), radial-gradient(circle at 0% 100%, rgba(255,184,121,.22), transparent 35%), #FFF8EF'
    : 'radial-gradient(circle at 100% 0%, rgba(128,92,255,.24), transparent 42%), radial-gradient(circle at 0% 100%, rgba(255,111,193,.18), transparent 38%), #05050A';
  const previewHabits = storyHabits.slice(0, 3);
  const emotionColor = emotion?.color ?? '#5BE282';

  return (
    <div
      className={`relative overflow-hidden border border-white/10 ${full ? 'aspect-[9/16] rounded-[1.25rem] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.28)]' : 'aspect-[9/12.7] rounded-[0.75rem] p-2'}`}
      style={{ background: bg, color: text }}
    >
      <svg aria-hidden="true" className={`absolute opacity-70 ${full ? '-right-20 -top-14 h-72 w-52' : '-right-8 -top-8 h-28 w-20'}`} fill="none" viewBox="0 0 120 180">
        <path d="M96 -8C54 52 72 93 122 132" stroke={isLight ? 'rgba(167,139,250,.22)' : 'rgba(167,139,250,.72)'} strokeWidth="1.2" />
      </svg>
      <p className={`relative font-semibold uppercase tracking-[0.34em] ${full ? 'text-[10px]' : 'text-[5px]'}`} style={{ color: type === 'emotion' ? emotionColor : violet }}>INNERBLOOM</p>

      {type === 'tasks' ? (
        <div className={`relative ${full ? 'mt-12' : 'mt-4'}`}>
          <p className={`${full ? 'text-[12px]' : 'text-[5px]'} font-semibold uppercase tracking-[0.28em] text-[#A78BFA]`}>Datos reales</p>
          <p className={`${full ? 'mt-4 text-[2.9rem]' : 'mt-1 text-[14px]'} font-semibold leading-[0.95]`}>Tareas realizadas</p>
          <p className={`${full ? 'mt-14 text-[8rem]' : 'mt-2 text-[38px]'} font-semibold leading-none text-transparent [background:linear-gradient(110deg,#A78BFA,#EC6FC1,#FFB879)] [background-clip:text]`}>14</p>
          <p className={`${full ? 'text-[14px]' : 'text-[5px]'} uppercase tracking-[0.26em]`} style={{ color: muted }}>Tareas completadas</p>
          <div className={`${full ? 'mt-16 h-3' : 'mt-4 h-1.5'} flex overflow-hidden rounded-full bg-black/10`}>
            <span className="w-1/2 bg-[#5BE282]" />
            <span className="w-[36%] bg-[#F7C86A]" />
            <span className="w-[14%] bg-[#FF6B6B]" />
          </div>
          <div className={`${full ? 'mt-8 text-[2rem]' : 'mt-2.5 text-[7px]'} grid grid-cols-3 text-center font-semibold`}>
            <span className="text-[#5BE282]">7{full ? <small className="ml-1 text-sm uppercase tracking-[0.22em]">Fácil</small> : null}</span>
            <span className="text-[#F7C86A]">5{full ? <small className="ml-1 text-sm uppercase tracking-[0.22em]">Media</small> : null}</span>
            <span className="text-[#FF6B6B]">2{full ? <small className="ml-1 text-sm uppercase tracking-[0.22em]">Difícil</small> : null}</span>
          </div>
        </div>
      ) : null}

      {type === 'balance' ? (
        <div className={`relative ${full ? 'mt-12' : 'mt-3'}`}>
          <p className={`${full ? 'text-[12px]' : 'text-[5px]'} font-semibold uppercase tracking-[0.28em]`} style={{ color: cyan }}>Pilar dominante</p>
          <p className={`${full ? 'mt-4 text-[2.9rem]' : 'mt-1 text-[14px]'} font-semibold leading-[0.95]`}>Balance semanal</p>
          <svg aria-hidden="true" className={`mx-auto overflow-visible ${full ? 'mt-14 h-64 w-64' : 'mt-3 h-20 w-20'}`} viewBox="0 0 120 120">
            <circle cx="60" cy="60" fill="none" r="48" stroke={isLight ? 'rgba(16,19,50,.14)' : 'rgba(255,255,255,.16)'} />
            <path d="M60 12A48 48 0 0 1 106 75" fill="none" stroke={cyan} strokeLinecap="round" strokeWidth="5" />
            <polygon fill="rgba(167,139,250,.22)" points="60,18 82,32 95,61 71,72 78,88 60,78 50,95 38,70 24,78 34,59 29,43 48,36" stroke="#A78BFA" strokeWidth="2" />
          </svg>
          <div className={`${full ? 'mt-14 text-[3rem]' : 'mt-2 text-[15px]'} grid grid-cols-3 gap-2 text-center`}>
            <span className="font-semibold" style={{ color: cyan }}>57%</span>
            <span className={`${full ? 'text-[2.4rem]' : 'text-[11px]'} font-semibold text-[#A78BFA]`}>22%</span>
            <span className={`${full ? 'text-[2.4rem]' : 'text-[11px]'} font-semibold text-[#F7C86A]`}>21%</span>
          </div>
        </div>
      ) : null}

      {type === 'habits' ? (
        <div className={`relative ${full ? 'mt-10' : 'mt-3'}`}>
          <p className={`${full ? 'text-[12px]' : 'text-[5px]'} font-semibold uppercase tracking-[0.28em]`} style={{ color: violet }}>Hábitos</p>
          <p className={`${full ? 'mt-4 text-[2.65rem]' : 'mt-1 text-[14px]'} font-semibold leading-[0.95]`}>Ritmo que se sostiene</p>
          <div className={`${full ? 'mt-10 space-y-7' : 'mt-2.5 space-y-1.5'}`}>
            {previewHabits.map((habit) => (
              <div key={`share-preview-habit-${habit.title}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`${full ? 'max-w-[13rem] text-2xl' : 'max-w-[5.6rem] text-[7.5px]'} truncate font-semibold`}>{habit.title}</p>
                  <p className={`${full ? 'text-xl' : 'text-[8px]'} font-semibold text-[#A78BFA]`}>{formatHabitDays(habit)}</p>
                </div>
                <div className={`${full ? 'mt-3 gap-2' : 'mt-1 gap-0.5'} flex justify-end`}>
                  {Array.from({ length: 7 }, (_, dot) => (
                    <span className={`${full ? 'h-3 w-3' : 'h-1.5 w-1.5'} rounded-full`} key={dot} style={{ backgroundColor: dot < getWeeklyHabitDays(habit) ? violet : 'rgba(150,150,160,.24)' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className={`${full ? 'mt-12 rounded-3xl p-5' : 'mt-2.5 rounded-lg p-1.5'} border border-white/10 bg-white/[0.06]`}>
            <p className={`${full ? 'text-[11px]' : 'text-[5px]'} uppercase tracking-[0.26em] text-[#A78BFA]`}>Energía diaria</p>
            <div className="grid grid-cols-[.72fr_1fr] items-center gap-2">
              <p className={`${full ? 'text-4xl' : 'text-[14px]'} font-semibold`}>{formatSignedPct(energy?.deltaPct ?? 0)}</p>
              <MiniWeeklyEnergyChart energy={energy} />
            </div>
          </div>
        </div>
      ) : null}

      {type === 'emotion' ? (
        <div className={`relative ${full ? 'mt-14' : 'mt-4'}`}>
          <p className={`${full ? 'text-[12px]' : 'text-[5px]'} font-semibold uppercase tracking-[0.28em]`} style={{ color: emotionColor }}>Emoción</p>
          <p className={`${full ? 'mt-4 text-[4.4rem]' : 'mt-1 text-[23px]'} font-semibold leading-none`}>{emotion?.label ?? 'Calma'}</p>
          <div className={`mx-auto rounded-full ${full ? 'mt-20 h-52 w-52' : 'mt-5 h-16 w-16'}`} style={{ backgroundColor: emotionColor, boxShadow: `0 0 ${full ? 90 : 38}px ${emotionColor}66` }} />
          <p className={`${full ? 'mt-20 text-2xl' : 'mt-5 text-[8px]'} font-semibold leading-tight`}>La semana cerró con {emotion?.label?.toLowerCase() ?? 'calma'}.</p>
        </div>
      ) : null}

      <span className="absolute bottom-2 left-3 text-[5px] uppercase tracking-[0.28em]" style={{ color: muted }}>{dominantLabel}</span>
    </div>
  );
}

type MonthlyShareOption = 'month' | 'tasks' | 'habits' | 'emotion';

function MonthlySharePicker({
  data,
  mode,
  onClose,
  onModeChange,
}: {
  data: MonthlyStoryData;
  mode: WeeklyStoryVisualMode;
  onClose: () => void;
  onModeChange: (mode: WeeklyStoryVisualMode) => void;
}) {
  const [selected, setSelected] = useState<MonthlyShareOption>('month');
  const [previewing, setPreviewing] = useState(false);
  const options: Array<{ key: MonthlyShareOption; label: string }> = [
    { key: 'month', label: 'Mes' },
    { key: 'tasks', label: 'Tareas' },
    { key: 'habits', label: 'Hábitos' },
    { key: 'emotion', label: data.emotion.label },
  ];

  return (
    <div
      className="absolute inset-0 z-30 flex items-end bg-black/46 px-4 pb-[calc(var(--weekly-safe-bottom)+0.75rem)] backdrop-blur-md"
      onClick={onClose}
      onTouchMove={(event) => event.stopPropagation()}
      onWheel={(event) => event.stopPropagation()}
    >
      <div
        className="mp-weekly-panel flex max-h-[min(90dvh,45rem)] w-full flex-col overflow-hidden rounded-[1.65rem] p-3.5"
        onClick={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
        onWheel={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          {previewing ? (
            <button
              className="-ml-1 inline-flex items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold text-[color:var(--weekly-title)]"
              onClick={() => setPreviewing(false)}
              type="button"
            >
              <span className="text-xl leading-none">‹</span>
              Cambiar story
            </button>
          ) : (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--weekly-brand)]">Compartir mes</p>
              <h3 className="mt-1 text-lg font-semibold text-[color:var(--weekly-title)]">Elegí una story</h3>
            </div>
          )}
          <button
            aria-label="Cerrar selector"
            className="grid h-9 w-9 place-items-center rounded-full bg-black/10 text-xl text-[color:var(--weekly-muted)]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-full bg-black/10 p-1">
          {(['dark', 'light'] as WeeklyStoryVisualMode[]).map((item) => (
            <button
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${mode === item ? 'bg-[color:var(--weekly-brand)] text-white' : 'text-[color:var(--weekly-muted)]'}`}
              key={item}
              onClick={() => onModeChange(item)}
              type="button"
            >
              {item === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
        {previewing ? (
          <div className="mt-3 flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="mx-auto w-full max-w-[min(72vw,19.5rem)]">
                <MonthlySharePreview data={data} full mode={mode} type={selected} />
              </div>
            </div>
            <button className="mt-3 w-full shrink-0 rounded-full bg-[color:var(--mp-violet)] px-5 py-3 text-base font-semibold text-white" type="button">
              Compartir
            </button>
          </div>
        ) : (
          <div className="mt-3 grid min-h-0 flex-1 grid-cols-2 gap-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {options.map((option) => (
              <button
                aria-pressed={selected === option.key}
                className={`group overflow-hidden rounded-[0.85rem] border p-1.5 text-left transition ${selected === option.key ? 'border-[color:var(--weekly-brand)] bg-white/[0.08] shadow-[0_0_22px_rgba(167,139,250,0.18)]' : 'border-[color:var(--weekly-line)] bg-white/[0.035]'}`}
                key={option.key}
                onClick={() => {
                  setSelected(option.key);
                  setPreviewing(true);
                }}
                type="button"
              >
                <MonthlySharePreview data={data} mode={mode} type={option.key} />
                <span className="mt-1 block px-1 pb-0.5 text-[11px] font-semibold text-[color:var(--weekly-title)]">{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MonthlySharePreview({
  data,
  full = false,
  mode,
  type,
}: {
  data: MonthlyStoryData;
  full?: boolean;
  mode: WeeklyStoryVisualMode;
  type: MonthlyShareOption;
}) {
  const isLight = mode === 'light';
  const text = isLight ? '#101338' : '#FFF8EF';
  const muted = isLight ? '#6E7078' : 'rgba(255,248,239,.66)';
  const violet = isLight ? '#7C3AED' : '#A78BFA';
  const bg = isLight
    ? 'radial-gradient(circle at 100% 0%, rgba(186,126,255,.24), transparent 35%), radial-gradient(circle at 0% 100%, rgba(255,184,121,.2), transparent 35%), #FFF8EF'
    : 'radial-gradient(circle at 100% 0%, rgba(128,92,255,.25), transparent 42%), radial-gradient(circle at 0% 100%, rgba(255,111,193,.16), transparent 38%), #05050A';

  return (
    <div
      className={`relative overflow-hidden border border-white/10 ${full ? 'aspect-[9/16] rounded-[1.25rem] p-6 shadow-[0_22px_80px_rgba(0,0,0,0.28)]' : 'aspect-[9/12.7] rounded-[0.75rem] p-2'}`}
      style={{ background: bg, color: text }}
    >
      <svg aria-hidden="true" className={`absolute opacity-70 ${full ? '-right-20 -top-14 h-72 w-52' : '-right-8 -top-8 h-28 w-20'}`} fill="none" viewBox="0 0 120 180">
        <path d="M96 -8C54 52 72 93 122 132" stroke={isLight ? 'rgba(167,139,250,.22)' : 'rgba(167,139,250,.72)'} strokeWidth="1.2" />
      </svg>
      <p className={`relative font-semibold uppercase tracking-[0.34em] ${full ? 'text-[10px]' : 'text-[5px]'}`} style={{ color: type === 'emotion' ? data.emotion.color : violet }}>INNERBLOOM</p>

      {type === 'month' ? (
        <div className={`relative ${full ? 'mt-12' : 'mt-4'}`}>
          <p className={`${full ? 'text-[12px]' : 'text-[5px]'} font-semibold uppercase tracking-[0.28em]`} style={{ color: violet }}>Monthly Wrapped</p>
          <p className={`${full ? 'mt-4 text-[2.8rem]' : 'mt-1 text-[14px]'} font-semibold leading-[0.95]`}>Tu mes en movimiento</p>
          <p className={`${full ? 'mt-8 text-[13px]' : 'mt-2 text-[5px]'} uppercase tracking-[0.24em]`} style={{ color: muted }}>{data.periodLabel}</p>
          <p className={`${full ? 'mt-20 text-[7.4rem]' : 'mt-7 text-[38px]'} font-semibold leading-none text-transparent [background:linear-gradient(110deg,#A78BFA,#EC6FC1,#FFB879)] [background-clip:text]`}>{data.trackedDays}/{data.totalDays}</p>
          <p className={`${full ? 'mt-3 text-[14px]' : 'mt-1 text-[5px]'} uppercase tracking-[0.28em]`} style={{ color: muted }}>días trackeados</p>
          <div className={`${full ? 'mt-16 gap-2' : 'mt-5 gap-1'} grid grid-cols-7`}>
            {data.calendarDays.slice(0, 28).map((day) => (
              <span className={`${full ? 'h-3.5' : 'h-1.5'} rounded-full`} key={`monthly-share-day-${day.day}`} style={{ backgroundColor: day.active ? '#5BE282' : 'rgba(150,150,160,.24)' }} />
            ))}
          </div>
        </div>
      ) : null}

      {type === 'tasks' ? (
        <div className={`relative ${full ? 'mt-12' : 'mt-4'}`}>
          <p className={`${full ? 'text-[12px]' : 'text-[5px]'} font-semibold uppercase tracking-[0.28em]`} style={{ color: violet }}>Datos reales</p>
          <p className={`${full ? 'mt-4 text-[2.8rem]' : 'mt-1 text-[14px]'} font-semibold leading-[0.95]`}>Tareas realizadas</p>
          <p className={`${full ? 'mt-16 text-[8rem]' : 'mt-5 text-[42px]'} font-semibold leading-none text-transparent [background:linear-gradient(110deg,#A78BFA,#EC6FC1,#FFB879)] [background-clip:text]`}>{data.completedTasks}</p>
          <p className={`${full ? 'text-[14px]' : 'text-[5px]'} uppercase tracking-[0.26em]`} style={{ color: muted }}>tareas completadas</p>
          <MonthlyShareDifficulty difficulty={data.difficulty} full={full} />
        </div>
      ) : null}

      {type === 'habits' ? (
        <div className={`relative ${full ? 'mt-10' : 'mt-3'}`}>
          <p className={`${full ? 'text-[12px]' : 'text-[5px]'} font-semibold uppercase tracking-[0.28em]`} style={{ color: violet }}>Hábitos</p>
          <p className={`${full ? 'mt-4 text-[2.45rem]' : 'mt-1 text-[13px]'} font-semibold leading-[0.95]`}>Más cerca de lograrlo</p>
          {data.unlockedHabits[0] ? (
            <div className={`${full ? 'mt-8 rounded-3xl p-4' : 'mt-2 rounded-lg p-1.5'} border border-[#5BE282]/30 bg-[#5BE282]/10`}>
              <p className={`${full ? 'text-[10px]' : 'text-[4px]'} uppercase tracking-[0.22em] text-[#5BE282]`}>Nuevo logro desbloqueado</p>
              <p className={`${full ? 'mt-2 text-xl' : 'mt-1 text-[7px]'} truncate font-semibold`}>{data.unlockedHabits[0].title}</p>
            </div>
          ) : null}
          <div className={`${full ? 'mt-8 space-y-7' : 'mt-2.5 space-y-2'}`}>
            {data.nearHabits.map((habit) => (
              <div key={`monthly-share-habit-${habit.title}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`${full ? 'text-2xl' : 'text-[8px]'} font-semibold`}>{habit.title}</p>
                    <p className={`${full ? 'mt-1 text-sm' : 'text-[5px]'}`} style={{ color: muted }}>{habit.label}</p>
                  </div>
                  <p className={`${full ? 'text-2xl' : 'text-[9px]'} font-semibold`} style={{ color: getMonthlyScoreTone(habit.percent).color }}>{habit.percent}%</p>
                </div>
                <div className={`${full ? 'mt-4 gap-3' : 'mt-1.5 gap-1'} grid grid-cols-3`}>
                  {habit.months.map((month) => (
                    <span className={`${full ? 'h-2' : 'h-1'} rounded-full bg-black/10`} key={`monthly-share-habit-${habit.title}-${month.label}`}>
                      <span className="block h-full rounded-full" style={{ backgroundColor: getMonthlyScoreTone(month.percent ?? 0).color, opacity: month.percent === null ? 0 : 1, width: `${month.percent ?? 0}%` }} />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {type === 'emotion' ? (
        <div className={`relative ${full ? 'mt-14' : 'mt-4'}`}>
          <p className={`${full ? 'text-[12px]' : 'text-[5px]'} font-semibold uppercase tracking-[0.28em]`} style={{ color: data.emotion.color }}>Emoción</p>
          <p className={`${full ? 'mt-4 text-[4.3rem]' : 'mt-1 text-[23px]'} font-semibold leading-none`}>{data.emotion.label}</p>
          <div className={`mx-auto rounded-full ${full ? 'mt-20 h-52 w-52' : 'mt-5 h-16 w-16'}`} style={{ backgroundColor: data.emotion.color, boxShadow: `0 0 ${full ? 90 : 38}px ${data.emotion.color}66` }} />
          <p className={`${full ? 'mt-20 text-2xl' : 'mt-5 text-[8px]'} font-semibold leading-tight`}>El mes cerró con {data.emotion.label.toLowerCase()}.</p>
        </div>
      ) : null}

      <span className="absolute bottom-2 left-3 text-[5px] uppercase tracking-[0.28em]" style={{ color: muted }}>INNERBLOOM JOURNEY</span>
    </div>
  );
}

function MonthlyShareDifficulty({
  difficulty,
  full,
}: {
  difficulty: MonthlyStoryData['difficulty'];
  full: boolean;
}) {
  const segments = [
    { key: 'easy', label: 'Fácil', count: difficulty.easy, pct: difficulty.easyPct, color: '#5BE282' },
    { key: 'medium', label: 'Media', count: difficulty.medium, pct: difficulty.mediumPct, color: '#F7C86A' },
    { key: 'hard', label: 'Difícil', count: difficulty.hard, pct: difficulty.hardPct, color: '#FF6B6B' },
  ];
  return (
    <div className={full ? 'mt-14' : 'mt-5'}>
      <div className={`${full ? 'h-3' : 'h-1.5'} flex overflow-hidden rounded-full bg-black/10`}>
        {segments.map((segment) => (
          <span key={`monthly-share-difficulty-bar-${segment.key}`} style={{ backgroundColor: segment.color, width: `${segment.pct}%` }} />
        ))}
      </div>
      <div className={`${full ? 'mt-8 text-3xl' : 'mt-3 text-[9px]'} grid grid-cols-3 gap-2 text-center font-semibold`}>
        {segments.map((segment) => (
          <div key={`monthly-share-difficulty-${segment.key}`} style={{ color: segment.color }}>
            <p>{segment.count}</p>
            <p className={`${full ? 'mt-2 text-[11px]' : 'mt-1 text-[4px]'} uppercase tracking-[0.22em]`}>{segment.label}</p>
            <p className={`${full ? 'mt-1 text-base' : 'text-[5px]'}`}>{segment.pct}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnimatedWeeklyNumber({
  active,
  delay = 0,
  value,
  duration = 820,
}: {
  active: boolean;
  delay?: number;
  value: number;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(active ? value : 0);

  useEffect(() => {
    if (!active) {
      setDisplayValue(0);
      return;
    }

    let frame = 0;
    let startTime: number | null = null;
    const target = Math.max(0, value);
    const step = (time: number) => {
      if (startTime === null) startTime = time;
      const progress = Math.min(1, (time - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(target * eased));
      if (progress < 1) {
        frame = window.requestAnimationFrame(step);
      }
    };

    const timeout = window.setTimeout(() => {
      frame = window.requestAnimationFrame(step);
    }, delay);
    return () => {
      window.clearTimeout(timeout);
      window.cancelAnimationFrame(frame);
    };
  }, [active, delay, duration, value]);

  return <>{displayValue.toLocaleString('es-AR')}</>;
}

function getWeeklyHabitDays(item: { body?: string; daysActive?: number }) {
  if (typeof item.daysActive === 'number') return Math.max(0, Math.min(7, Math.round(item.daysActive)));
  const match = item.body?.match(/(\d+)\/7/);
  return match?.[1] ? Math.max(0, Math.min(7, Number.parseInt(match[1], 10))) : 0;
}

function getWeeklyHabitScore(item: { body?: string; daysActive?: number; completionRate?: number | string | null }) {
  const rate = Number(item.completionRate);
  if (Number.isFinite(rate)) return Math.max(0, Math.min(100, Math.round(rate)));
  return Math.round((getWeeklyHabitDays(item) / 7) * 100);
}

function getWeeklyHabitStatusLabel(score: number) {
  if (score < 50) return 'Hábito frágil';
  if (score < 80) return 'Hábito en construcción';
  return 'Hábito fuerte';
}

function normalizeRewardGroups(groups: HabitAchievementPillarGroup[]): HabitAchievementPillarGroup[] {
  const byCode = new Map(groups.map((group) => [group.pillar.code.toUpperCase(), group]));
  return (['BODY', 'MIND', 'SOUL'] as RewardsPillarCode[]).map((code) => {
    const existing = byCode.get(code);
    return {
      pillar: existing?.pillar ?? { id: code.toLowerCase(), code, name: resolveRewardsPillarLabel(code) },
      habits: existing?.habits.filter((habit) => habit.status !== 'pending_decision') ?? [],
    };
  });
}

function getPendingAchievementItems(rewards: RewardsHistorySummary) {
  return rewards.habitAchievements.achievedByPillar
    .flatMap((group) => group.habits)
    .filter((habit) => habit.status === 'pending_decision');
}

function getAchievementWindowMonths(habit: HabitAchievementShelfItem) {
  const seed = habit.taskName.split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return ['Mar', 'Abr', 'May'].map((label, index) => ({
    label,
    percent: Math.min(96, 82 + ((seed + index * 7) % 13)),
  }));
}

function updateHabitInRewards(
  rewards: RewardsHistorySummary,
  taskId: string,
  updater: (habit: HabitAchievementShelfItem) => HabitAchievementShelfItem,
): RewardsHistorySummary {
  const achievedByPillar = rewards.habitAchievements.achievedByPillar.map((group) => ({
    ...group,
    habits: group.habits.map((habit) => (habit.taskId === taskId ? updater(habit) : habit)),
  }));
  const pendingCount = achievedByPillar
    .flatMap((group) => group.habits)
    .filter((habit) => habit.status === 'pending_decision').length;
  return {
    ...rewards,
    habitAchievements: {
      ...rewards.habitAchievements,
      pendingCount,
      achievedByPillar,
    },
  };
}

function resolveRewardsPillarLabel(code: RewardsPillarCode) {
  if (code === 'MIND') return 'Mente';
  if (code === 'SOUL') return 'Alma';
  return 'Cuerpo';
}

function resolvePillarShortLabel(value: string | null) {
  const code = normalizePillarCode(value);
  if (code === 'MIND') return 'Mente';
  if (code === 'SOUL') return 'Alma';
  return 'Cuerpo';
}

function getWeeklyPillarColor(pillar: RewardsPillarCode) {
  if (pillar === 'MIND') return '#A78BFA';
  if (pillar === 'SOUL') return '#F7C86A';
  return '#56DDF5';
}

type WeeklyEnergyHighlight = WeeklyWrappedRecord['payload']['summary']['energyHighlight'];
type WeeklyEnergyRaceMetric = {
  key: 'body' | 'soul' | 'mind';
  label: 'HP' | 'Mood' | 'Focus';
  pillar: 'Cuerpo' | 'Alma' | 'Mente';
  color: string;
  percent: number;
  deltaPct: number | null;
  points: number[];
};

function buildWeeklyEnergyRaceMetrics(energy: WeeklyEnergyHighlight | undefined): WeeklyEnergyRaceMetric[] {
  const realMetrics = energy?.metrics;
  if (realMetrics?.length) {
    const sourceByMetric = new Map(realMetrics.map((metric) => [metric.metric, metric]));
    return [
      {
        key: 'body',
        label: 'HP',
        pillar: 'Cuerpo',
        color: '#56DDF5',
        percent: clampWeeklyEnergyPercent(sourceByMetric.get('HP')?.value ?? energy?.value ?? 0),
        deltaPct: normalizeWeeklyDelta(sourceByMetric.get('HP')?.deltaPct),
        points: normalizeWeeklyEnergyPoints(sourceByMetric.get('HP')?.points, sourceByMetric.get('HP')?.value ?? energy?.value ?? 0),
      },
      {
        key: 'soul',
        label: 'Mood',
        pillar: 'Alma',
        color: '#F7C86A',
        percent: clampWeeklyEnergyPercent(sourceByMetric.get('MOOD')?.value ?? 0),
        deltaPct: normalizeWeeklyDelta(sourceByMetric.get('MOOD')?.deltaPct),
        points: normalizeWeeklyEnergyPoints(sourceByMetric.get('MOOD')?.points, sourceByMetric.get('MOOD')?.value ?? 0),
      },
      {
        key: 'mind',
        label: 'Focus',
        pillar: 'Mente',
        color: '#A78BFA',
        percent: clampWeeklyEnergyPercent(sourceByMetric.get('FOCUS')?.value ?? 0),
        deltaPct: normalizeWeeklyDelta(sourceByMetric.get('FOCUS')?.deltaPct),
        points: normalizeWeeklyEnergyPoints(sourceByMetric.get('FOCUS')?.points, sourceByMetric.get('FOCUS')?.value ?? 0),
      },
    ];
  }

  return [];
}

function buildWeeklyEnergyRaceLines(metrics: WeeklyEnergyRaceMetric[]) {
  const lines = metrics.map((metric) => ({
    metric,
    path: buildWeeklyEnergyPath(metric.points),
    endY: weeklyEnergyY(metric.percent),
    labelY: weeklyEnergyY(metric.percent),
  }));
  const sorted = [...lines].sort((first, second) => first.endY - second.endY);
  sorted.forEach((line, index) => {
    const previous = sorted[index - 1];
    line.labelY = previous ? Math.max(line.endY, previous.labelY + 24) : Math.max(18, line.endY);
  });
  const overflow = Math.max(0, (sorted[sorted.length - 1]?.labelY ?? 0) - 168);
  if (overflow > 0) {
    sorted.forEach((line) => {
      line.labelY -= overflow;
    });
  }
  return lines;
}

function resolveWeeklyEnergyLeader(metrics: WeeklyEnergyRaceMetric[]) {
  const days = Math.max(...metrics.map((metric) => metric.points.length), 0);
  const leaderCounts = new Map<string, number>();

  for (let index = 0; index < days; index += 1) {
    const leader = metrics.reduce((best, metric) => {
      const value = metric.points[index] ?? 0;
      const bestValue = best.points[index] ?? 0;
      return value > bestValue ? metric : best;
    }, metrics[0]);
    leaderCounts.set(leader.key, (leaderCounts.get(leader.key) ?? 0) + 1);
  }

  return metrics.reduce((best, metric) => {
    const count = leaderCounts.get(metric.key) ?? 0;
    return count > best.days ? { label: metric.label, pillar: metric.pillar, color: metric.color, days: count } : best;
  }, { label: metrics[0]?.label ?? 'HP', pillar: metrics[0]?.pillar ?? 'Cuerpo', color: metrics[0]?.color ?? '#56DDF5', days: 0 });
}

function resolveWeeklyEnergyVariationLeader(metrics: WeeklyEnergyRaceMetric[]) {
  return metrics.reduce((best, metric) => {
    const metricDelta = Math.abs(metric.deltaPct ?? 0);
    const bestDelta = Math.abs(best.deltaPct ?? 0);
    return metricDelta > bestDelta ? metric : best;
  }, metrics[0] ?? {
    key: 'body',
    label: 'HP',
    pillar: 'Cuerpo',
    color: '#56DDF5',
    percent: 0,
    deltaPct: 0,
    points: [0, 0],
  });
}

function clampWeeklyEnergyPercent(value: number | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeWeeklyDelta(value: number | null | undefined) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.round(numeric * 10) / 10;
}

function normalizeWeeklyEnergyPoints(points: number[] | null | undefined, fallback: number | null | undefined) {
  const normalized = (points ?? [])
    .map((point) => clampWeeklyEnergyPercent(point))
    .filter((point) => Number.isFinite(point));
  if (normalized.length > 0) return normalized.slice(-7);
  const fallbackValue = clampWeeklyEnergyPercent(fallback);
  return [fallbackValue, fallbackValue];
}

function buildWeeklyEnergyPath(points: number[]) {
  const coordinates = points.map((point, index) => ({
    x: 8 + (252 * index) / Math.max(1, points.length - 1),
    y: weeklyEnergyY(point),
  }));
  let path = `M ${coordinates[0].x} ${coordinates[0].y}`;
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const point = coordinates[index];
    const middle = (previous.x + point.x) / 2;
    path += ` C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }
  return path;
}

function weeklyEnergyY(value: number) {
  return 22 + ((100 - Math.max(0, Math.min(100, value))) / 100) * 150;
}

function buildWeeklyMiniEnergyPath(points: number[]) {
  const coordinates = points.map((point, index) => ({
    x: 2 + (128 * index) / Math.max(1, points.length - 1),
    y: weeklyMiniEnergyY(point),
  }));
  let path = `M ${coordinates[0].x} ${coordinates[0].y}`;
  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const point = coordinates[index];
    const middle = (previous.x + point.x) / 2;
    path += ` C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }
  return path;
}

function weeklyMiniEnergyY(value: number) {
  return 12 + ((100 - Math.max(0, Math.min(100, value))) / 100) * 64;
}

function buildWeeklyRadarAxes(dominant: RewardsPillarCode, traits: TraitXpEntry[] = []) {
  const realAxes = traits
    .map((trait, index) => {
      const pillar = normalizePillarCode(trait.pillar);
      const value = Number.isFinite(trait.xp) ? Math.max(0, trait.xp) : 0;
      if (!pillar || value <= 0) return null;
      return {
        key: `${trait.trait || trait.name || 'trait'}-${index}`,
        pillar,
        sortOrder: Number.isFinite(trait.sortOrder) ? trait.sortOrder ?? index : index,
        value,
      };
    })
    .filter((axis): axis is { key: string; pillar: RewardsPillarCode; sortOrder: number; value: number } => Boolean(axis))
    .sort((left, right) => {
      const pillarDiff = WEEKLY_PILLAR_ORDER.indexOf(left.pillar) - WEEKLY_PILLAR_ORDER.indexOf(right.pillar);
      return pillarDiff || left.sortOrder - right.sortOrder || left.key.localeCompare(right.key);
    });

  if (realAxes.length >= 3) {
    return realAxes;
  }

  const body = [
    { key: 'recovery', value: 517 },
    { key: 'movement', value: 437 },
    { key: 'nutrition', value: 375 },
    { key: 'discipline', value: 428 },
  ];
  const mind = [
    { key: 'focus', value: 312 },
    { key: 'learning', value: 397 },
    { key: 'reflection', value: 246 },
    { key: 'planning', value: 147 },
  ];
  const soul = [
    { key: 'breathing', value: 430 },
    { key: 'purpose', value: 223 },
    { key: 'connection', value: 245 },
    { key: 'play', value: 208 },
  ];
  const boost = (pillar: RewardsPillarCode) => (pillar === dominant ? 1.14 : 0.92);
  return [
    ...body.map((axis) => ({ ...axis, pillar: 'BODY' as RewardsPillarCode, value: Math.round(axis.value * boost('BODY')) })),
    ...mind.map((axis) => ({ ...axis, pillar: 'MIND' as RewardsPillarCode, value: Math.round(axis.value * boost('MIND')) })),
    ...soul.map((axis) => ({ ...axis, pillar: 'SOUL' as RewardsPillarCode, value: Math.round(axis.value * boost('SOUL')) })),
  ];
}

function buildWeeklyRadarRanges(axes: Array<{ pillar: RewardsPillarCode }>) {
  const axisCount = Math.max(1, axes.length);
  const step = (Math.PI * 2) / axisCount;
  return WEEKLY_PILLAR_ORDER.map((pillar, fallbackIndex) => {
    const indices = axes
      .map((axis, index) => (axis.pillar === pillar ? index : -1))
      .filter((index) => index >= 0);

    if (!indices.length) {
      const start = -Math.PI / 2 + fallbackIndex * ((Math.PI * 2) / WEEKLY_PILLAR_ORDER.length);
      return {
        start,
        end: start + (Math.PI * 2) / WEEKLY_PILLAR_ORDER.length,
      };
    }

    return {
      start: weeklyRadarAngle(indices[0], axisCount) - step / 2,
      end: weeklyRadarAngle(indices[indices.length - 1], axisCount) + step / 2,
    };
  });
}

function resolveWeeklyRadarPillarPercentages(axes: Array<{ pillar: RewardsPillarCode; value: number }>, dominant: RewardsPillarCode, dominantPct: number) {
  const totals: Record<RewardsPillarCode, number> = { BODY: 0, MIND: 0, SOUL: 0 };
  axes.forEach((axis) => {
    totals[axis.pillar] += Math.max(0, axis.value);
  });
  const total = totals.BODY + totals.MIND + totals.SOUL;
  if (total <= 0) {
    return WEEKLY_PILLAR_ORDER.reduce((acc, pillar) => {
      acc[pillar] = resolveWeeklyRadarPercent(pillar, dominant, dominantPct);
      return acc;
    }, { BODY: 0, MIND: 0, SOUL: 0 } as Record<RewardsPillarCode, number>);
  }

  const body = Math.round((totals.BODY / total) * 100);
  const mind = Math.round((totals.MIND / total) * 100);
  return {
    BODY: body,
    MIND: mind,
    SOUL: Math.max(0, 100 - body - mind),
  };
}

function resolveWeeklyRadarDominant(percentages: Record<RewardsPillarCode, number>) {
  return WEEKLY_PILLAR_ORDER.reduce((best, pillar) => (percentages[pillar] > percentages[best] ? pillar : best), 'BODY' as RewardsPillarCode);
}

function resolveWeeklyRadarPercent(pillar: RewardsPillarCode, dominant: RewardsPillarCode, dominantPct: number) {
  if (pillar === dominant) return dominantPct;
  const rest = Math.max(0, 100 - dominantPct);
  const otherPillars = WEEKLY_PILLAR_ORDER.filter((item) => item !== dominant);
  return pillar === otherPillars[0] ? Math.round(rest / 2) : Math.max(0, rest - Math.round(rest / 2));
}

function weeklyRadarAngle(index: number, total: number) {
  return -Math.PI / 2 + (index / total) * Math.PI * 2;
}

function weeklyPolarPoint(centerX: number, centerY: number, radius: number, angle: number) {
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
  };
}

function weeklyArcPath(centerX: number, centerY: number, radius: number, start: number, end: number) {
  const first = weeklyPolarPoint(centerX, centerY, radius, start);
  const last = weeklyPolarPoint(centerX, centerY, radius, end);
  return `M ${first.x} ${first.y} A ${radius} ${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${last.x} ${last.y}`;
}

function weeklySectorPath(centerX: number, centerY: number, radius: number, start: number, end: number) {
  const first = weeklyPolarPoint(centerX, centerY, radius, start);
  const last = weeklyPolarPoint(centerX, centerY, radius, end);
  return `M ${centerX} ${centerY} L ${first.x} ${first.y} A ${radius} ${radius} 0 ${end - start > Math.PI ? 1 : 0} 1 ${last.x} ${last.y} Z`;
}

function resolvePillarDominancePct(dominantCompletions?: number, totalCompletions?: number) {
  if (!dominantCompletions || !totalCompletions) return 44;
  return Math.max(1, Math.min(100, Math.round((dominantCompletions / totalCompletions) * 100)));
}

function formatSignedPct(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function formatHabitDays(item: { body?: string; daysActive?: number }) {
  if (typeof item.daysActive === 'number') return `${item.daysActive}/7`;
  const match = item.body?.match(/(\d+)\/7/);
  return match?.[0] ?? '';
}

function isHabitAchieved(habit: HabitAchievementShelfItem) {
  return habit.status === 'maintained' || habit.status === 'stored';
}

function formatCompactDate(value: string | null) {
  if (!value) return 'Pendiente';
  return value.slice(0, 10);
}

function formatDateShort(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(date).replace('.', '');
}

function getWeeklyCountdownDays() {
  const today = new Date();
  const day = today.getDay();
  return day === 0 ? 0 : 7 - day;
}

function getMonthlyCountdownDays() {
  const today = new Date();
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return Math.max(0, lastDayOfMonth - today.getDate());
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

function buildMonthlyStoryData(monthly: MonthlyWrappedRecord, rewards: RewardsHistorySummary): MonthlyStoryData {
  const totalDays = getDaysInMonthlyPeriod(monthly.periodKey);
  const completedDayNumbers = new Set(
    (monthly.completionDays ?? []).map((day) => Number(day.slice(8, 10))).filter((day) => Number.isFinite(day)),
  );
  const calendarDays = Array.from({ length: totalDays }, (_, index) => ({
    active: completedDayNumbers.has(index + 1),
    day: index + 1,
  }));
  const trackedDays = Math.max(0, completedDayNumbers.size);
  const gpTotal = resolveMonthlyGp(monthly);
  const completedTasks = resolveMonthlyCompletedTasks(monthly);
  const difficulty = resolveMonthlyDifficulty(monthly);
  const calibration = resolveMonthlyCalibrationStory(rewards.growthCalibration);
  const habitProgress = resolveMonthlyHabitProgress(rewards, monthly.periodKey);
  const emotion = resolveMonthlyEmotionStory(monthly);
  const rhythm = resolveMonthlyRhythmStory(monthly);

  return {
    calendarDays,
    calibration,
    completedTasks,
    difficulty,
    emotion,
    gpTotal,
    nearHabits: habitProgress.nearHabits,
    periodLabel: formatMonthlyPeriodLabel(monthly.periodKey),
    rhythm,
    totalDays,
    trackedDays,
    unlockedHabits: habitProgress.unlockedHabits,
  };
}

function getDaysInMonthlyPeriod(periodKey: string) {
  const [yearRaw, monthRaw] = periodKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return 31;
  return new Date(year, month, 0).getDate();
}

function formatMonthlyPeriodLabel(periodKey: string) {
  const [yearRaw, monthRaw] = periodKey.split('-');
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, 1);
  if (Number.isNaN(date.getTime())) return periodKey;
  return new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' }).format(date);
}

function formatMonthFromPeriod(periodKey: string | null | undefined) {
  if (!periodKey) return null;
  const [yearRaw, monthRaw] = periodKey.slice(0, 7).split('-');
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, 1);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es', { month: 'short' }).format(date).replace('.', '');
}

function resolveMonthlyCompletedTasks(monthly: MonthlyWrappedRecord) {
  const payload = monthly.payload as MonthlyWrappedPayloadView | null;
  const summary = monthly.summary as MonthlyWrappedSummaryView | null;
  const value = payload?.monthly_kpis?.tasksCompleted
    ?? summary?.tasks_completed
    ?? payload?.completedTasks
    ?? payload?.completions
    ?? payload?.summary?.completedTasks
    ?? payload?.summary?.completions;
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  return 0;
}

function resolveMonthlyDifficulty(monthly: MonthlyWrappedRecord) {
  const payload = monthly.payload as MonthlyWrappedPayloadView | null;
  const source = payload?.difficulty ?? payload?.effortBalance ?? payload?.summary?.effortBalance;
  const easy = typeof source?.easy === 'number' ? source.easy : 0;
  const medium = typeof source?.medium === 'number' ? source.medium : 0;
  const hard = typeof source?.hard === 'number' ? source.hard : 0;
  const total = Math.max(1, easy + medium + hard);
  const easyPct = Math.round((easy / total) * 100);
  const mediumPct = Math.round((medium / total) * 100);
  const hardPct = Math.max(0, 100 - easyPct - mediumPct);
  return { easy, easyPct, hard, hardPct, medium, mediumPct };
}

function resolveMonthlyCalibrationStory(growth: RewardsHistorySummary['growthCalibration']) {
  const rows = resolveCalibrationResults(growth);
  const upTasks = rows.filter((row) => row.finalAction === 'up').map((row) => row.taskTitle).slice(0, 3);
  const downTasks = rows.filter((row) => row.finalAction === 'down').map((row) => row.taskTitle).slice(0, 3);
  const keep = Math.max(growth.summary.keep, rows.filter((row) => row.finalAction === 'keep').length);
  return {
    downTasks,
    keep,
    upTasks,
  };
}

function resolveMonthlyHabitProgress(
  rewards: RewardsHistorySummary,
  periodKey: string,
): Pick<MonthlyStoryData, 'nearHabits' | 'unlockedHabits'> {
  const currentPeriod = periodKey.slice(0, 7);
  const rows = resolveCalibrationResults(rewards.growthCalibration)
    .filter((row) => Number.isFinite(row.completionRatePct))
    .filter((row) => {
      const rowPeriod = row.evaluationMonthLabel?.slice(0, 7);
      return !rowPeriod || rowPeriod === currentPeriod || rowPeriod === rewards.growthCalibration.latestPeriodLabel?.slice(0, 7);
    });
  const periodWindow = buildMonthlyPeriodWindow(currentPeriod);
  const unlockedHabits = rows
    .filter((row) => clampMonthlyScore(row.completionRatePct) >= 100)
    .sort((a, b) => a.taskTitle.localeCompare(b.taskTitle, 'es', { sensitivity: 'base' }))
    .slice(0, 2)
    .map((row) => ({
      label: row.pillar ?? 'Tarea',
      monthLabel: formatMonthFromPeriod(row.evaluationMonthLabel) ?? formatMonthFromPeriod(currentPeriod) ?? 'Mes',
      percent: 100,
      title: row.taskTitle,
    }));
  const nearHabits = rows
    .filter((row) => {
      const percent = clampMonthlyScore(row.completionRatePct);
      return percent >= 50 && percent < 100;
    })
    .sort((a, b) => b.completionRatePct - a.completionRatePct)
    .slice(0, 3)
    .map((row) => {
      const percent = clampMonthlyScore(row.completionRatePct);
      const rowPeriod = row.evaluationMonthLabel?.slice(0, 7) || currentPeriod;
      return {
        label: row.pillar ?? 'Tarea',
        months: periodWindow.map((period) => ({
          label: formatMonthFromPeriod(period) ?? 'Mes',
          percent: period === rowPeriod ? percent : null,
        })),
        percent,
        title: row.taskTitle,
      };
    });
  return { nearHabits, unlockedHabits };
}

function buildMonthlyPeriodWindow(periodKey: string) {
  const [yearRaw, monthRaw] = periodKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return [periodKey];
  return Array.from({ length: 3 }, (_, index) => {
    const date = new Date(year, month - 1 - (2 - index), 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
}

function resolveMonthlyRhythmStory(monthly: MonthlyWrappedRecord) {
  const payload = monthly.payload as MonthlyWrappedPayloadView | null;
  const liveMode = payload?.live_mode_context;
  const currentMode = normalizeMonthlyMode(liveMode?.current_mode ?? (payload as { current_mode?: string | null } | null)?.current_mode);
  const nextMode = normalizeMonthlyMode(liveMode?.next_mode ?? payload?.suggested_next_mode) ?? resolveNextMonthlyMode(currentMode);
  const totalTasks = resolveFiniteNumber(payload?.tasks_total_evaluated, 0);
  const strongTasks = resolveFiniteNumber(payload?.tasks_meeting_goal, 0);
  const rate = typeof payload?.task_pass_rate === 'number'
    ? payload.task_pass_rate
    : totalTasks > 0
      ? strongTasks / totalTasks
      : 0;
  const readiness = Math.max(0, Math.min(100, Math.round(rate * 100)));
  return {
    currentMode: currentMode ?? 'ACTUAL',
    readiness,
    nextMode: nextMode ?? 'SIGUIENTE',
    strongTasks,
    threshold: 80,
    totalTasks,
  };
}

function resolveFiniteNumber(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeMonthlyMode(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function resolveNextMonthlyMode(currentMode: string | null) {
  const order = ['LOW', 'CHILL', 'FLOW', 'EVOLVE'];
  const index = currentMode ? order.indexOf(currentMode) : -1;
  return index >= 0 && index < order.length - 1 ? order[index + 1] : null;
}

function clampMonthlyScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getMonthlyScoreTone(percent: number) {
  if (percent >= 100) return { color: '#5BE282', label: 'OK' };
  if (percent >= 80) return { color: '#5BE282', label: 'Cerca' };
  if (percent >= 50) return { color: '#F7C86A', label: 'En progreso' };
  return { color: '#FF6B6B', label: 'Frágil' };
}

function resolveMonthlyEmotionStory(monthly: MonthlyWrappedRecord): MonthlyStoryData['emotion'] {
  const dominant = resolveMonthlyEmotion(monthly);
  const counts = [
    { color: dominant.color, count: 12, label: dominant.label },
    { color: '#F7C86A', count: 7, label: 'Felicidad' },
    { color: '#A78BFA', count: 6, label: 'Motivación' },
    { color: '#56DDF5', count: 5, label: 'Cansancio' },
  ];
  const palette = counts.map((item) => item.color);
  const labels = counts.map((item) => item.label);
  const journey = Array.from({ length: 14 }, (_, index) => {
    const wave = Math.sin(index * 0.92) * 28 + Math.cos(index * 0.38) * 18;
    const colorIndex = index % palette.length;
    return {
      color: palette[colorIndex],
      label: labels[colorIndex],
      x: 18 + (324 * index) / 13,
      y: 132 + wave,
    };
  });
  return {
    color: dominant.color,
    counts,
    journey,
    label: dominant.label,
  };
}

function buildMonthlyEmotionPath(points: MonthlyStoryData['emotion']['journey']) {
  if (!points.length) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const middle = (previous.x + point.x) / 2;
    path += ` C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }
  return path;
}

function resolveMonthlyWeekStates(monthly: MonthlyWrappedRecord): Array<'done' | 'partial' | 'empty'> {
  const summaryWeeks = (monthly.summary as MonthlyWrappedSummaryView | null)?.weeks;
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
    if (count >= 7) return 'done';
    if (count >= 5) return 'partial';
    return 'empty';
  });
}

function resolveMonthlyEmotion(monthly: MonthlyWrappedRecord) {
  const payload = monthly.payload as {
    emotions?: {
      monthly?: { label?: string; color?: string };
      dominant?: { label?: string; color?: string };
    };
    emotion?: { label?: string; color?: string };
  } | null;
  const emotion = payload?.emotions?.monthly ?? payload?.emotions?.dominant ?? payload?.emotion;
  return {
    label: emotion?.label ?? 'Calma',
    color: emotion?.color ?? 'var(--mp-green)',
  };
}

function resolveMonthlyGp(monthly: MonthlyWrappedRecord) {
  const payload = monthly.payload as MonthlyWrappedPayloadView | null;
  const summary = monthly.summary as MonthlyWrappedSummaryView | null;
  const value = payload?.monthly_kpis?.xpGained
    ?? summary?.xp_gained
    ?? payload?.gpTotal
    ?? payload?.totalXp
    ?? payload?.xpTotal
    ?? payload?.summary?.gpTotal
    ?? payload?.summary?.totalXp
    ?? 0;
  return Math.round(Number(value) || 0);
}

function resolveMonthlyInsight(states: Array<'done' | 'partial' | 'empty'>) {
  const done = states.filter((state) => state === 'done').length;
  const partial = states.filter((state) => state === 'partial').length;
  if (done >= 4) return 'Mes fuerte';
  if (done >= 2 || partial >= 2) return 'Tendencia estable';
  return 'Mes frágil';
}

function buildFallbackHabit(
  id: string,
  taskName: string,
  traitName: string,
  traitCode: string,
  pillar: RewardsPillarCode,
  status: HabitAchievementShelfItem['status'],
): HabitAchievementShelfItem {
  const achievedAt = status === 'not_achieved' ? null : '2026-04-30';
  return {
    id,
    taskId: id.replace('-seal', ''),
    taskName,
    trait: { id: traitCode, code: traitCode, name: traitName },
    pillar,
    seal: { visible: status !== 'not_achieved' },
    status,
    achievedAt,
    decisionMadeAt: status === 'pending_decision' ? null : achievedAt,
    gpBeforeAchievement: status === 'not_achieved' ? 0 : 158,
    gpSinceMaintain: 0,
    maintainEnabled: status === 'maintained',
  };
}

function buildFallbackCalibrationRow(
  taskId: string,
  taskTitle: string,
  difficultyBefore: string,
  difficultyAfter: string,
  actualCompletions: number,
  expectedTarget: number,
  completionRatePct: number,
  finalAction: RewardsGrowthCalibrationRow['finalAction'],
  reason: string,
  clampReason: string | null = null,
): RewardsGrowthCalibrationRow {
  return {
    taskId,
    taskTitle,
    pillar: 'BODY',
    difficultyBefore,
    difficultyAfter,
    expectedTarget,
    actualCompletions,
    completionRatePct,
    finalAction,
    result: finalAction === 'up' ? 'increased' : finalAction === 'down' ? 'decreased' : 'kept',
    reason,
    clampApplied: Boolean(clampReason),
    clampReason,
    evaluatedAt: '2026-04-30T00:00:00.000Z',
    evaluationMonthLabel: '2026-04',
  };
}

function shareAchievement(habit: HabitAchievementShelfItem) {
  const text = `Innerbloom logro desbloqueado: ${habit.taskName}`;
  const browserNavigator = typeof navigator === 'undefined' ? null : navigator as Navigator & {
    share?: (data: { title?: string; text?: string }) => Promise<void>;
    clipboard?: { writeText: (value: string) => Promise<void> };
  };
  if (browserNavigator?.share) {
    void browserNavigator.share({ title: 'Innerbloom', text }).catch(() => undefined);
    return;
  }
  if (browserNavigator?.clipboard) {
    void browserNavigator.clipboard.writeText(text).catch(() => undefined);
  }
}
