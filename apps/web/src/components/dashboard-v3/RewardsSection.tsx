import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { useRequest } from '../../hooks/useRequest';
import { useCarouselSelection } from '../../hooks/useCarouselSelection';
import {
  decideTaskHabitAchievement,
  getTaskInsights,
  getRewardsHistory,
  type TaskInsightsResponse,
  toggleTaskHabitAchievementMaintained,
  type HabitAchievementShelfItem,
  type MonthlyWrappedRecord,
  type RewardsHistorySummary,
  type WeeklyWrappedRecord,
} from '../../lib/api';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';
import { emitHabitAchievementUpdated } from '../../lib/habitAchievementEvents';
import { subscribeToMediaQuery } from '../../lib/mediaQuery';
import { HabitAchievementSeal } from './HabitAchievementSeal';
import { PreviewAchievementCard } from './PreviewAchievementCard';

const REWARDS_PILLAR_ORDER = [
  { code: 'BODY', name: 'Body' },
  { code: 'MIND', name: 'Mind' },
  { code: 'SOUL', name: 'Soul' },
] as const;

type AchievementViewMode = 'shelves' | 'carousel';

const REWARDS_VIEW_MODE_STORAGE_KEY = 'ib.rewards.achievementsViewMode';

interface RewardsSectionProps {
  userId: string;
  onOpenWeeklyWrapped?: (record?: WeeklyWrappedRecord | null) => void;
  initialData?: RewardsHistorySummary;
  onPendingCountChange?: (count: number) => void;
  disableRemote?: boolean;
  mockPreviewAchievementByTaskId?: Record<string, NonNullable<TaskInsightsResponse['previewAchievement']>>;
  demoAnchors?: {
    shelves?: string;
    achievedCard?: string;
    achievedCardTaskId?: string;
    blockedCard?: string;
    blockedCardTaskId?: string;
    sealPath?: string;
    achievementFront?: string;
    achievementBack?: string;
    achievementCard?: string;
    weekly?: string;
    monthly?: string;
  };
  demoConfig?: {
    disableRemote?: boolean;
    mockPreviewAchievementByTaskId?: Record<string, NonNullable<TaskInsightsResponse['previewAchievement']>>;
    anchors?: RewardsSectionProps['demoAnchors'];
    controls?: {
      onReady?: (controls: RewardsSectionDemoControls) => void;
    };
  };
  demoStepId?: string | null;
}

export type RewardsSectionDemoControls = {
  openAchievedCard: () => void;
  openBlockedCard: () => void;
  focusBlockedShelfCard: () => void;
  flipAchievementCard: () => void;
  ensureAchievementBackFace: () => void;
  closeAchievementOverlay: () => void;
  closeSealPathOverlay: () => void;
  closeAllOverlays: () => void;
};

export function RewardsSection({
  userId,
  onOpenWeeklyWrapped,
  initialData,
  onPendingCountChange,
  disableRemote = false,
  mockPreviewAchievementByTaskId,
  demoAnchors,
  demoConfig,
  demoStepId,
}: RewardsSectionProps) {
  const { language } = usePostLoginLanguage();
  const resolvedDisableRemote = demoConfig?.disableRemote ?? disableRemote;
  const resolvedMockPreviewAchievementByTaskId = demoConfig?.mockPreviewAchievementByTaskId ?? mockPreviewAchievementByTaskId;
  const resolvedDemoAnchors = demoConfig?.anchors ?? demoAnchors;

  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [decisionIndex, setDecisionIndex] = useState(0);
  const [celebrating, setCelebrating] = useState<null | HabitAchievementShelfItem[]>(null);
  const [educationBannerVisible, setEducationBannerVisible] = useState(false);
  const [isTransitioningDecision, setIsTransitioningDecision] = useState(false);
  const [isGrowthCalibrationModalOpen, setIsGrowthCalibrationModalOpen] = useState(false);
  const [achievementsViewMode, setAchievementsViewMode] = useState<AchievementViewMode>('shelves');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const savedMode = window.localStorage.getItem(REWARDS_VIEW_MODE_STORAGE_KEY);
    if (savedMode === 'carousel' || savedMode === 'shelves') {
      setAchievementsViewMode(savedMode);
    }
  }, []);

  const handleChangeAchievementsViewMode = useCallback((nextMode: AchievementViewMode) => {
    setAchievementsViewMode(nextMode);
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(REWARDS_VIEW_MODE_STORAGE_KEY, nextMode);
  }, []);

  const { data, status, error, reload } = useRequest(() => getRewardsHistory(userId), [userId], {
    enabled: !resolvedDisableRemote && Boolean(userId),
  });
  const effectiveData = data ?? initialData;

  const pendingItems = useMemo(
    () =>
      (effectiveData?.habitAchievements.achievedByPillar ?? [])
        .flatMap((group) => group.habits)
        .filter((habit) => habit.status === 'pending_decision'),
    [effectiveData],
  );

  const pendingCount = effectiveData?.habitAchievements.pendingCount ?? 0;
  useEffect(() => {
    onPendingCountChange?.(pendingCount);
  }, [onPendingCountChange, pendingCount]);
  useEffect(() => {
    if (decisionIndex >= pendingItems.length) {
      setDecisionIndex(0);
    }
  }, [decisionIndex, pendingItems.length]);

  const weeklyItems = effectiveData?.weeklyWrapups ?? [];
  const monthlyItems = effectiveData?.monthlyWrapups ?? [];
  const growthCalibration = effectiveData?.growthCalibration ?? {
    countdownDays: getDaysUntilNextMonthWrapup(),
    latestPeriodLabel: null,
    summary: { up: 0, keep: 0, down: 0, total: 0 },
    latestResults: [],
  };

  const handleDecision = async (habit: HabitAchievementShelfItem, decision: 'maintain' | 'store') => {
    if (resolvedDisableRemote) {
      return;
    }
    await decideTaskHabitAchievement(habit.taskId, decision);
    emitHabitAchievementUpdated();
    const isLast = decisionIndex >= pendingItems.length - 1;
    if (isLast) {
      setCelebrating([...pendingItems]);
      setIsDecisionOpen(false);
      setDecisionIndex(0);
      setEducationBannerVisible(true);
      setTimeout(() => {
        setCelebrating(null);
      }, 2200);
    } else {
      setIsTransitioningDecision(true);
      window.setTimeout(() => {
        setDecisionIndex((value) => value + 1);
        setIsTransitioningDecision(false);
      }, 180);
    }
    await reload();
  };

  const handleOpenPendingDecision = async () => {
    if (resolvedDisableRemote) {
      return;
    }
    if (pendingItems.length > 0) {
      setDecisionIndex(0);
      setIsDecisionOpen(true);
      return;
    }
    await reload();
    setDecisionIndex(0);
    setIsDecisionOpen(true);
  };

  return (
    <Card
      rightSlot={(
        <div className="flex items-center gap-2">
          {!resolvedDisableRemote ? (
            <a
              href="/labs/logros"
              title={language === 'es' ? 'Ver demo guiada de Logros' : 'View guided Achievements demo'}
              aria-label={language === 'es' ? 'Ver demo guiada de Logros' : 'View guided Achievements demo'}
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/45 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-100 transition hover:border-violet-200/70 hover:bg-violet-500/16 hover:text-white"
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{language === 'es' ? 'Ver guía' : 'View guide'}</span>
            </a>
          ) : null}
          <div
            className="inline-flex items-center rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] p-0.5"
            role="tablist"
            aria-label={language === 'es' ? 'Modo de visualización de logros' : 'Achievement view mode'}
          >
            {([
              { id: 'carousel', label: language === 'es' ? 'Carrusel' : 'Carousel' },
              { id: 'shelves', label: language === 'es' ? 'Estantes' : 'Shelves' },
            ] as const).map((option) => {
              const isSelected = achievementsViewMode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => handleChangeAchievementsViewMode(option.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    isSelected
                      ? 'border border-violet-300/70 bg-violet-500/85 text-white shadow-[0_6px_18px_rgba(124,58,237,0.35)] dark:border-violet-300/55 dark:bg-violet-500/35 dark:text-violet-50'
                      : 'text-[color:var(--color-text-muted)] hover:bg-[color:var(--color-overlay-2)] hover:text-[color:var(--color-text)]'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
      bodyClassName="gap-5"
    >
      {!resolvedDisableRemote && pendingCount > 0 ? (
        <button
          type="button"
          onClick={() => {
            void handleOpenPendingDecision();
          }}
          className="ib-card-contour-shadow w-full rounded-2xl border border-amber-300/50 bg-gradient-to-r from-amber-400/15 via-orange-400/10 to-fuchsia-500/10 p-4 text-left"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-100">{language === 'es' ? 'Pendiente' : 'Pending'}</p>
          <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">
            {language === 'es' ? 'Tienes hábitos logrados para revisar' : 'You have achieved habits to review'}
          </p>
        </button>
      ) : null}

      {!resolvedDisableRemote && educationBannerVisible ? (
        <div className="rounded-2xl border border-emerald-300/40 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          {language === 'es'
            ? 'Tus hábitos logrados ahora viven en Logros. Puedes mantenerlos o guardarlos desde los estantes.'
            : 'Your achieved habits now live in Achievements. You can maintain or store them from the shelves.'}
        </div>
      ) : null}

      {status === 'error' ? <p className="text-sm text-rose-200">{error?.message ?? (language === 'es' ? 'Error al cargar Logros.' : 'Error loading Achievements.')}</p> : null}

      <AchievedShelf
        language={language}
        groups={effectiveData?.habitAchievements.achievedByPillar ?? []}
        demoAnchors={resolvedDemoAnchors}
        demoStepId={demoStepId}
        viewMode={achievementsViewMode}
        disableRemote={resolvedDisableRemote}
        mockPreviewAchievementByTaskId={resolvedMockPreviewAchievementByTaskId}
        onDemoControlsReady={demoConfig?.controls?.onReady}
        onToggleMaintained={async (habit, enabled) => {
          if (resolvedDisableRemote) {
            return;
          }
          await toggleTaskHabitAchievementMaintained(habit.taskId, enabled);
          await reload();
        }}
      />

      <GrowthCalibrationShelf
        language={language}
        growthCalibration={growthCalibration}
        onOpenResults={() => setIsGrowthCalibrationModalOpen(true)}
      />

      <WeeklyWrapupShelf items={weeklyItems} onOpen={onOpenWeeklyWrapped} language={language} anchor={resolvedDemoAnchors?.weekly} />

      <MonthlyWrapupShelf items={monthlyItems} language={language} anchor={resolvedDemoAnchors?.monthly} />

      {!resolvedDisableRemote && isDecisionOpen && pendingItems[decisionIndex] ? (
        <DecisionModal
          language={language}
          currentIndex={decisionIndex}
          total={pendingItems.length}
          habit={pendingItems[decisionIndex]}
          transitioning={isTransitioningDecision}
          onClose={() => setIsDecisionOpen(false)}
          onMaintain={() => handleDecision(pendingItems[decisionIndex], 'maintain')}
          onStore={() => handleDecision(pendingItems[decisionIndex], 'store')}
        />
      ) : null}

      {!resolvedDisableRemote && celebrating ? <CelebrationOverlay language={language} habits={celebrating} onSkip={() => setCelebrating(null)} /> : null}

      <GrowthCalibrationResultsModal
        language={language}
        isOpen={isGrowthCalibrationModalOpen}
        growthCalibration={growthCalibration}
        onClose={() => setIsGrowthCalibrationModalOpen(false)}
      />
    </Card>
  );
}

function GrowthCalibrationShelf({
  language,
  growthCalibration,
  onOpenResults,
}: {
  language: 'es' | 'en';
  growthCalibration: RewardsHistorySummary['growthCalibration'];
  onOpenResults: () => void;
}) {
  const hasResults = growthCalibration.latestResults.length > 0;
  return (
    <div className="ib-card-contour-shadow rounded-2xl border border-[color:var(--color-border-subtle)] bg-gradient-to-br from-rose-500/15 via-fuchsia-500/10 to-amber-500/10 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-dim)]">Growth Calibration Results</p>
          <p className="mt-1 text-xs text-[color:var(--color-text-muted)]">
            {language === 'es' ? 'Últimos ajustes automáticos de dificultad' : 'Latest automatic difficulty adjustments'}
          </p>
        </div>
        <InlineCountdown days={growthCalibration.countdownDays} language={language} />
      </div>

      {hasResults ? (
        <div className="mt-3 rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3">
          <p className="text-sm font-semibold text-[color:var(--color-text)]">
            <span className="text-rose-300">↑ {growthCalibration.summary.up}</span>
            <span className="mx-2 text-amber-300">• {growthCalibration.summary.keep}</span>
            <span className="text-emerald-300">↓ {growthCalibration.summary.down}</span>
          </p>
          {growthCalibration.latestPeriodLabel ? (
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[color:var(--color-slate-400)]">{growthCalibration.latestPeriodLabel}</p>
          ) : null}
          <button
            type="button"
            onClick={onOpenResults}
            className="mt-3 inline-flex rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-2)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-text)] transition hover:border-[color:var(--color-border-strong)]"
          >
            {language === 'es' ? 'Ver resultados' : 'View results'}
          </button>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4 text-sm text-[color:var(--color-text-muted)]">
          {language === 'es'
            ? 'Todavía no hay resultados de Growth Calibration. Tus próximos ajustes aparecerán aquí.'
            : 'There are no Growth Calibration results yet. Your next adjustments will appear here.'}
        </div>
      )}
    </div>
  );
}

function MonthlyWrapupShelf({ items, language, anchor }: { items: MonthlyWrappedRecord[]; language: 'es' | 'en'; anchor?: string }) {
  const monthlyCountdownDays = useDailyWrapupCountdown(getDaysUntilNextMonthWrapup);
  const compactItems = useMemo(() => items.slice(0, 2), [items]);
  const latest = compactItems[0] ?? null;
  const previous = compactItems[1] ?? null;

  return (
    <div data-demo-anchor={anchor} className="ib-card-contour-shadow rounded-2xl border border-[color:var(--color-border-subtle)] bg-gradient-to-br from-indigo-500/15 via-fuchsia-500/10 to-sky-500/10 p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-dim)]">{language === 'es' ? 'Monthly Wrap-Up' : 'Monthly Wrap-Up'}</p>
        <InlineCountdown days={monthlyCountdownDays} language={language} />
      </div>
      {latest ? (
        <div className="mt-3 space-y-2">
          <div className="w-full rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3 text-left">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-slate-400)]">{latest.periodKey}</p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--color-text)]">{language === 'es' ? 'Resumen mensual más reciente' : 'Most recent monthly summary'}</p>
            <CompletionDots completionDays={latest.completionDays ?? []} range={resolveMonthRange(latest.periodKey)} language={language} />
          </div>
          {previous ? (
            <div className="w-full rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)]/70 p-3 text-left">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-slate-400)]">{previous.periodKey}</p>
              <p className="mt-1 text-xs font-semibold text-[color:var(--color-text-muted)]">{language === 'es' ? 'Periodo anterior' : 'Previous period'}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4 text-sm text-[color:var(--color-text-muted)]">
          {language === 'es'
            ? 'Aún no tienes Wrap-Ups mensuales. Tus próximos resúmenes aparecerán aquí.'
            : "You don't have monthly wrap-ups yet. Your next summaries will appear here."}
        </div>
      )}
    </div>
  );
}

function WeeklyWrapupShelf({ items, onOpen, language, anchor }: { items: WeeklyWrappedRecord[]; onOpen?: (record?: WeeklyWrappedRecord | null) => void; language: 'es' | 'en'; anchor?: string }) {
  const weeklyCountdownDays = useDailyWrapupCountdown(getDaysUntilNextWeeklyWrapup);
  const compactItems = useMemo(() => items.slice(0, 2), [items]);
  return (
    <div data-demo-anchor={anchor} className="ib-card-contour-shadow rounded-2xl border border-[color:var(--color-border-subtle)] bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-indigo-500/10 p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-dim)]">{language === 'es' ? 'Weekly Wrap-Up' : 'Weekly Wrap-Up'}</p>
        <InlineCountdown days={weeklyCountdownDays} language={language} />
      </div>
      {compactItems.length ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {compactItems.map((item) => {
            const weeklyEmotion = item.payload.emotions.weekly ?? item.payload.emotions.biweekly;
            const dominantPillar = item.payload.summary.pillarDominant;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpen?.(item)}
                className="rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-3 text-left"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-slate-400)]">{item.weekStart} → {item.weekEnd}</p>
                <div className="mt-2 flex min-h-6 items-center gap-2">
                  <EmotionDot color={weeklyEmotion?.color} />
                  <span className="text-base leading-none" aria-label={language === 'es' ? 'Pilar dominante en GP' : 'Dominant pillar by GP'}>
                    {resolvePillarEmoji(dominantPillar)}
                  </span>
                </div>
                <CompletionDots completionDays={item.completionDays ?? []} range={{ start: item.weekStart, end: item.weekEnd }} language={language} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4 text-sm text-[color:var(--color-text-muted)]">
          {language === 'es'
            ? 'Aún no tienes Weekly Wrap-Ups. Tus próximos resúmenes semanales aparecerán aquí.'
            : "You don't have weekly wrap-ups yet. Your next weekly summaries will appear here."}
        </div>
      )}
    </div>
  );
}

function InlineCountdown({ days, language }: { days: number; language: 'es' | 'en' }) {
  return (
    <p className="whitespace-nowrap text-right text-xs font-semibold tracking-[0.03em] text-[color:var(--color-text-dim)]">
      {language === 'es' ? 'Próximo en ' : 'Next in '}
      <span className="text-lg font-black leading-none text-[color:var(--color-text-strong)]">{days}d</span>
    </p>
  );
}

function GrowthCalibrationResultsModal({
  language,
  isOpen,
  growthCalibration,
  onClose,
}: {
  language: 'es' | 'en';
  isOpen: boolean;
  growthCalibration: RewardsHistorySummary['growthCalibration'];
  onClose: () => void;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === 'undefined') {
    return null;
  }

  const resultTone: Record<'up' | 'keep' | 'down', string> = {
    up: 'text-rose-300',
    keep: 'text-amber-300',
    down: 'text-emerald-300',
  };
  const resultSymbol: Record<'up' | 'keep' | 'down', string> = {
    up: '↑',
    keep: '•',
    down: '↓',
  };

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-end justify-center bg-slate-950/75 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-4xl overflow-hidden rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-elevated)] shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[color:var(--color-border-subtle)] px-4 py-3 sm:px-5">
          <div>
            <p className="text-sm font-semibold text-[color:var(--color-text-strong)]">
              {language === 'es' ? 'Resultados de Growth Calibration' : 'Growth Calibration Results'}
            </p>
            {growthCalibration.latestPeriodLabel ? (
              <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-slate-400)]">{growthCalibration.latestPeriodLabel}</p>
            ) : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-[color:var(--color-border-subtle)] px-2 py-1 text-xs">✕</button>
        </div>

        <div className="max-h-[70vh] overflow-auto p-3 sm:p-4">
          {growthCalibration.latestResults.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4 text-sm text-[color:var(--color-text-muted)]">
              {language === 'es'
                ? 'Todavía no hay resultados de Growth Calibration. Tus próximos ajustes aparecerán aquí.'
                : 'There are no Growth Calibration results yet. Your next adjustments will appear here.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-text-dim)]">
                  <tr>
                    <th className="px-2 py-2">{language === 'es' ? 'Tarea' : 'Task'}</th>
                    <th className="px-2 py-2">{language === 'es' ? 'Resultado' : 'Result'}</th>
                    <th className="px-2 py-2">{language === 'es' ? 'Progreso' : 'Progress'}</th>
                    <th className="px-2 py-2">{language === 'es' ? 'Tasa' : 'Rate'}</th>
                    <th className="px-2 py-2">{language === 'es' ? 'Detalle' : 'Detail'}</th>
                  </tr>
                </thead>
                <tbody>
                  {growthCalibration.latestResults.map((row) => (
                    <tr key={`${row.taskId}-${row.evaluatedAt}`} className="border-t border-[color:var(--color-border-subtle)] align-top">
                      <td className="px-2 py-2">
                        <p className="font-semibold text-[color:var(--color-text)]">{row.taskTitle}</p>
                        {(row.difficultyBefore || row.difficultyAfter) ? (
                          <p className="mt-0.5 text-[11px] text-[color:var(--color-text-muted)]">{row.difficultyBefore ?? '—'} → {row.difficultyAfter ?? '—'}</p>
                        ) : null}
                      </td>
                      <td className={`px-2 py-2 text-base font-bold ${resultTone[row.finalAction]}`}>{resultSymbol[row.finalAction]}</td>
                      <td className="px-2 py-2 text-[color:var(--color-text)]">{row.actualCompletions} / {row.expectedTarget}</td>
                      <td className="px-2 py-2 text-[color:var(--color-text)]">{Math.round(row.completionRatePct)}%</td>
                      <td className="px-2 py-2 text-[color:var(--color-text)]">
                        <p>{row.reason}</p>
                        {row.clampApplied && row.clampReason ? (
                          <p className="mt-1 text-[11px] text-[color:var(--color-text-muted)]">{row.clampReason}</p>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function EmotionDot({ color }: { color?: string }) {
  const dotColor = color && color.trim().length ? color : 'rgba(255,255,255,0.45)';
  return (
    <span
      className="inline-flex h-3 w-3 shrink-0 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.2)]"
      style={{ backgroundColor: dotColor }}
      aria-label="dominant-emotion-dot"
    />
  );
}

function resolvePillarEmoji(pillar: string | null | undefined): string {
  if (!pillar) return '•';
  const normalized = pillar.toString().trim().toUpperCase();
  if (normalized === 'BODY' || normalized === 'CUERPO') return '🫀';
  if (normalized === 'MIND' || normalized === 'MENTE') return '🧠';
  if (normalized === 'SOUL' || normalized === 'ALMA') return '🏵️';
  return '•';
}

function resolvePillarHeader(pillar: { code?: string | null; name?: string | null }, language: 'es' | 'en'): string {
  const code = (pillar.code ?? '').trim().toUpperCase();
  if (code === 'BODY') return `${language === 'es' ? 'Cuerpo' : 'Body'} 🫀`;
  if (code === 'MIND') return `${language === 'es' ? 'Mente' : 'Mind'} 🧠`;
  if (code === 'SOUL') return `${language === 'es' ? 'Alma' : 'Soul'} 🏵️`;
  return `${pillar.name ?? 'Pillar'} ${resolvePillarEmoji(pillar.code)}`;
}

function getAchievementStatusLabel(status: string | null | undefined, language: 'es' | 'en'): string {
  const normalized = String(status ?? '').trim().toLowerCase();
  if (normalized === 'strong') return language === 'es' ? 'fuerte' : 'strong';
  if (normalized === 'building') return language === 'es' ? 'en construcción' : 'building';
  return language === 'es' ? 'frágil' : 'fragile';
}

function formatActiveWindowSummary(
  slots: NonNullable<NonNullable<TaskInsightsResponse['previewAchievement']>['windowProximity']>['slots'],
  language: 'es' | 'en',
): string {
  if (!Array.isArray(slots) || slots.length === 0) {
    return language === 'es' ? 'Sin datos' : 'No data';
  }
  const validCount = slots.filter((slot) => {
    if (typeof slot === 'object' && slot && 'state' in slot) {
      const state = String(slot.state ?? '').toLowerCase();
      return state === 'valid' || state === 'achieved';
    }
    const raw = String(slot ?? '').toLowerCase();
    return raw === 'valid' || raw === 'projected_valid';
  }).length;
  return language === 'es'
    ? `${validCount}/${slots.length} válidos`
    : `${validCount}/${slots.length} valid`;
}

function getCompactMonthTone(state: string | null | undefined): string {
  const normalized = String(state ?? '').toLowerCase();
  if (normalized === 'strong' || normalized === 'valid' || normalized === 'achieved') return 'bg-emerald-300/85 text-emerald-950';
  if (normalized === 'building' || normalized === 'weak' || normalized === 'floor_only') return 'bg-amber-300/85 text-amber-950';
  if (normalized === 'locked' || normalized === 'invalid') return 'bg-rose-300/80 text-rose-950';
  return 'bg-[color:var(--color-overlay-3)] text-[color:var(--color-text-muted)]';
}

function resolveCompactMonthLabel(periodKey: string | null | undefined, language: 'es' | 'en'): string {
  const value = (periodKey ?? '').trim();
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return language === 'es' ? 'N/A' : 'N/A';
  }
  const parsed = new Date(`${value}-01T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(5, 7);
  }
  return new Intl.DateTimeFormat(language === 'es' ? 'es-AR' : 'en-US', { month: 'short' }).format(parsed);
}

function CompletionDots({
  completionDays,
  range,
  language,
}: {
  completionDays: string[];
  range: { start: string; end: string };
  language: 'es' | 'en';
}) {
  const dayLabels = language === 'es' ? ['L', 'M', 'X', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const completed = useMemo(() => new Set(completionDays), [completionDays]);
  const weekDates = useMemo(() => getWeekDatesFromRange(range), [range.end, range.start]);
  return (
    <div className="mt-3 flex w-full items-center justify-center gap-1.5">
      {weekDates.map((dateKey, index) => {
        const isDone = completed.has(dateKey);
        return (
          <div
            key={`${dateKey}-${index}`}
            className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-semibold ${
              isDone
                ? 'border-[#d8b4fe] bg-[#e9d5ff] text-[#7c3aed] shadow-sm dark:border-violet-300/50 dark:bg-violet-500/45 dark:text-violet-100'
                : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] text-[color:var(--color-text-muted)]'
            }`}
          >
            {dayLabels[index]}
          </div>
        );
      })}
    </div>
  );
}

function getWeekDatesFromRange(range: { start: string; end: string }): string[] {
  const start = new Date(`${range.start}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) {
    return [];
  }
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date.toISOString().slice(0, 10);
  });
}

function resolveMonthRange(periodKey: string): { start: string; end: string } {
  const [yearRaw, monthRaw] = periodKey.split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return { start: periodKey, end: periodKey };
  }
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 0));
  const rangeStart = new Date(monthEnd);
  rangeStart.setUTCDate(monthEnd.getUTCDate() - 6);
  if (rangeStart < monthStart) {
    return { start: monthStart.toISOString().slice(0, 10), end: monthEnd.toISOString().slice(0, 10) };
  }
  return { start: rangeStart.toISOString().slice(0, 10), end: monthEnd.toISOString().slice(0, 10) };
}

function getDaysUntilNextWeeklyWrapup(referenceDate = new Date()): number {
  const nowUtc = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
  const dayOfWeek = nowUtc.getUTCDay();
  const daysToNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  return Math.max(0, daysToNextMonday);
}

function getDaysUntilNextMonthWrapup(referenceDate = new Date()): number {
  const nowUtc = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate()));
  const nextMonthStart = new Date(Date.UTC(nowUtc.getUTCFullYear(), nowUtc.getUTCMonth() + 1, 1));
  const diffMs = nextMonthStart.getTime() - nowUtc.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function useDailyWrapupCountdown(getter: (referenceDate?: Date) => number): number {
  const [days, setDays] = useState(() => getter(new Date()));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const refresh = () => setDays(getter(new Date()));
    refresh();

    const now = new Date();
    const nextUtcMidnight = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 3));
    const firstTickDelay = Math.max(5_000, nextUtcMidnight.getTime() - now.getTime());
    let intervalId: number | null = null;

    const timeoutId = window.setTimeout(() => {
      refresh();
      intervalId = window.setInterval(refresh, 24 * 60 * 60 * 1000);
    }, firstTickDelay);

    return () => {
      window.clearTimeout(timeoutId);
      if (intervalId != null) {
        window.clearInterval(intervalId);
      }
    };
  }, [getter]);

  return days;
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();

    return subscribeToMediaQuery(mediaQuery, update);
  }, []);

  return prefersReducedMotion;
}

function AchievedShelf({
  groups,
  language,
  viewMode,
  onToggleMaintained,
  disableRemote,
  mockPreviewAchievementByTaskId,
  demoAnchors,
  onDemoControlsReady,
  demoStepId,
}: {
  groups: RewardsHistorySummary['habitAchievements']['achievedByPillar'];
  language: 'es' | 'en';
  viewMode: AchievementViewMode;
  onToggleMaintained: (habit: HabitAchievementShelfItem, enabled: boolean) => Promise<void>;
  disableRemote: boolean;
  mockPreviewAchievementByTaskId?: Record<string, NonNullable<TaskInsightsResponse['previewAchievement']>>;
  demoAnchors?: RewardsSectionProps['demoAnchors'];
  onDemoControlsReady?: (controls: RewardsSectionDemoControls) => void;
  demoStepId?: string | null;
}) {
  const [activeHabitId, setActiveHabitId] = useState<string | null>(null);
  const [previewHabit, setPreviewHabit] = useState<HabitAchievementShelfItem | null>(null);
  const [showBackFace, setShowBackFace] = useState(false);
  const [activePillarCode, setActivePillarCode] = useState<(typeof REWARDS_PILLAR_ORDER)[number]['code']>(REWARDS_PILLAR_ORDER[0].code);
  const [flippedCardByHabitId, setFlippedCardByHabitId] = useState<Record<string, boolean>>({});
  const [maintainPendingHabitId, setMaintainPendingHabitId] = useState<string | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const normalizedGroups = useMemo(() => {
    const byCode = new Map(groups.map((group) => [group.pillar.code.toUpperCase(), group]));
    return REWARDS_PILLAR_ORDER.map((pillar) => {
      const existing = byCode.get(pillar.code);
      return {
        pillar: existing?.pillar ?? { id: null, code: pillar.code, name: pillar.name },
        habits: existing?.habits ?? [],
      };
    });
  }, [groups]);

  const habitsById = useMemo(() => {
    const map = new Map<string, HabitAchievementShelfItem>();
    normalizedGroups.forEach((group) => {
      group.habits.forEach((habit) => {
        map.set(habit.id, habit);
      });
    });
    return map;
  }, [normalizedGroups]);

  const activeHabit = activeHabitId ? habitsById.get(activeHabitId) ?? null : null;
  const activePillarHabits = useMemo(() => {
    const group = normalizedGroups.find((entry) => entry.pillar.code.toUpperCase() === activePillarCode);
    return group?.habits ?? [];
  }, [activePillarCode, normalizedGroups]);
  const {
    activeIndex: activeCarouselIndex,
    setActiveIndex: setActiveCarouselIndex,
    trackRef: carouselTrackRef,
    handleTrackScroll: handleCarouselTrackScroll,
  } = useCarouselSelection<HTMLDivElement>({
    itemAttribute: 'data-achievement-carousel-index',
    initialIndex: 0,
  });
  const resolvedAchievedTaskId = demoAnchors?.achievedCardTaskId;
  const resolvedBlockedTaskId = demoAnchors?.blockedCardTaskId;
  const isShelfFocusStep = demoStepId === 'logros-shelves';
  const isDemoExperience = Boolean(demoStepId);

  useEffect(() => {
    if (viewMode !== 'shelves') {
      setActiveHabitId(null);
      setPreviewHabit(null);
      setShowBackFace(false);
    }
  }, [viewMode]);

  useEffect(() => {
    setFlippedCardByHabitId({});
    setActiveCarouselIndex(0);
    if (carouselTrackRef.current) {
      carouselTrackRef.current.scrollTo({ left: 0, behavior: 'auto' });
    }
  }, [activePillarCode, carouselTrackRef, setActiveCarouselIndex]);

  const focusBlockedShelfCard = useCallback(() => {
    const target = document.querySelector('[data-demo-anchor="logros-blocked-card"]') as HTMLElement | null;
    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'center' });
    const horizontalContainer = target.closest('.ib-rewards-shelf-scroll') as HTMLElement | null;
    if (horizontalContainer) {
      const itemLeft = target.offsetLeft;
      const centeredLeft = itemLeft - (horizontalContainer.clientWidth - target.clientWidth) / 2;
      horizontalContainer.scrollTo({ left: Math.max(0, centeredLeft), behavior: 'auto' });
    }
  }, []);

  const openAchievedCard = useCallback(() => {
    const target = normalizedGroups
      .flatMap((group) => group.habits)
      .find((habit) => habit.taskId === resolvedAchievedTaskId && habit.status !== 'not_achieved');
    if (!target) {
      return;
    }
    setPreviewHabit(null);
    setShowBackFace(false);
    setActiveHabitId(target.id);
  }, [normalizedGroups, resolvedAchievedTaskId]);

  const openBlockedCard = useCallback(() => {
    const target = normalizedGroups
      .flatMap((group) => group.habits)
      .find((habit) => habit.taskId === resolvedBlockedTaskId && habit.status === 'not_achieved');
    if (!target) {
      return;
    }
    setActiveHabitId(null);
    setShowBackFace(false);
    setPreviewHabit(target);
  }, [normalizedGroups, resolvedBlockedTaskId]);

  useEffect(() => {
    onDemoControlsReady?.({
      openAchievedCard,
      openBlockedCard,
      focusBlockedShelfCard,
      flipAchievementCard: () => {
        if (activeHabitId) {
          setShowBackFace((current) => !current);
          return;
        }
        openAchievedCard();
        window.setTimeout(() => {
          setShowBackFace(true);
        }, 80);
      },
      ensureAchievementBackFace: () => {
        if (activeHabitId) {
          setShowBackFace(true);
          return;
        }
        openAchievedCard();
        window.setTimeout(() => {
          setShowBackFace(true);
        }, 80);
      },
      closeAchievementOverlay: () => {
        setActiveHabitId(null);
        setShowBackFace(false);
      },
      closeSealPathOverlay: () => setPreviewHabit(null),
      closeAllOverlays: () => {
        setActiveHabitId(null);
        setShowBackFace(false);
        setPreviewHabit(null);
      },
    });
  }, [activeHabitId, focusBlockedShelfCard, onDemoControlsReady, openAchievedCard, openBlockedCard]);

  const getSealBadge = (habit: HabitAchievementShelfItem) => {
    const pillarCode = (habit.pillar ?? 'X').slice(0, 1).toUpperCase();
    const traitCode = habit.trait?.code?.slice(0, 3).toUpperCase() ?? '---';
    return `${pillarCode}-${traitCode}`;
  };

  const scrollCarouselToIndex = useCallback((targetIndex: number) => {
    const track = carouselTrackRef.current;
    if (!track) {
      return;
    }
    const clampedIndex = Math.max(0, Math.min(targetIndex, Math.max(activePillarHabits.length - 1, 0)));
    const targetCard = track.querySelector<HTMLElement>(`[data-achievement-carousel-index="${clampedIndex}"]`);
    if (!targetCard) {
      return;
    }
    targetCard.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    setActiveCarouselIndex(clampedIndex);
  }, [activePillarHabits.length, carouselTrackRef, prefersReducedMotion, setActiveCarouselIndex]);

  const toggleCarouselCardFlip = useCallback((habitId: string) => {
    setFlippedCardByHabitId((current) => ({
      ...current,
      [habitId]: !current[habitId],
    }));
  }, []);

  const handleToggleMaintained = useCallback(async (habit: HabitAchievementShelfItem, enabled: boolean) => {
    setMaintainPendingHabitId(habit.id);
    try {
      await onToggleMaintained(habit, enabled);
    } finally {
      setMaintainPendingHabitId(null);
    }
  }, [onToggleMaintained]);

  const isCarouselView = viewMode === 'carousel';
  const pillarChipLabels: Record<(typeof REWARDS_PILLAR_ORDER)[number]['code'], string> = {
    BODY: language === 'es' ? 'Cuerpo' : 'Body',
    MIND: language === 'es' ? 'Mente' : 'Mind',
    SOUL: language === 'es' ? 'Alma' : 'Soul',
  };

  return (
    <div className="space-y-4" data-demo-anchor={demoAnchors?.shelves}>
      <div>
        <h2 className="text-lg font-semibold text-[color:var(--color-text-strong)]">
          {language === 'es' ? 'Logros' : 'Achievements'}
        </h2>
      </div>
      {!isCarouselView && isShelfFocusStep ? (
        <div
          data-demo-anchor="logros-shelves-pillars"
          className="rounded-2xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)]/95 p-3 shadow-[0_16px_32px_rgba(0,0,0,0.2)] ring-1 ring-[color:var(--color-accent-primary)]/35"
        >
          <div className="grid grid-cols-3 gap-2">
            {normalizedGroups.map((group) => (
              <div
                key={`${group.pillar.code}-demo-column`}
                className="rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-2 py-3 text-center"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text)]">
                  {resolvePillarHeader(group.pillar, language)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {isCarouselView ? (
        <div className="space-y-3">
          <div
            className="inline-flex w-full rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] p-1 shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-border-subtle)_62%,transparent)]"
            role="tablist"
            aria-label={language === 'es' ? 'Seleccionar pilar' : 'Select pillar'}
          >
            {REWARDS_PILLAR_ORDER.map((pillar) => {
              const isSelected = activePillarCode === pillar.code;
              return (
                <button
                  key={pillar.code}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => setActivePillarCode(pillar.code)}
                  className={`flex-1 rounded-full px-2 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] transition ${
                    isSelected
                      ? 'border border-violet-300/70 bg-violet-500/85 text-white shadow-[0_6px_18px_rgba(124,58,237,0.35)] dark:border-violet-300/55 dark:bg-violet-500/35 dark:text-violet-50'
                      : 'text-[color:var(--color-text-dim)] hover:bg-[color:var(--color-overlay-2)] hover:text-[color:var(--color-text)]'
                  }`}
                >
                  {pillarChipLabels[pillar.code]}
                </button>
              );
            })}
          </div>
          {activePillarHabits.length > 0 ? (
            <>
              <div
                ref={carouselTrackRef}
                onScroll={handleCarouselTrackScroll}
                className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1"
              >
                {activePillarHabits.map((habit, index) => {
                  const isFlipped = Boolean(flippedCardByHabitId[habit.id]);
                  const isAchieved = habit.status !== 'not_achieved';
                  const slotLabel = getSealBadge(habit);
                  return (
                    <button
                      key={habit.id}
                      type="button"
                      data-achievement-carousel-index={index}
                      onClick={() => toggleCarouselCardFlip(habit.id)}
                      className={`ib-card-contour-shadow relative h-[23rem] w-[78%] shrink-0 snap-center overflow-hidden rounded-3xl border p-5 text-left transition sm:w-[22rem] ${
                        isAchieved
                          ? 'border-[color:var(--color-border-soft)] bg-[color:var(--color-surface-elevated)] shadow-[0_16px_30px_rgba(2,8,23,0.14)] dark:shadow-[0_16px_30px_rgba(2,8,23,0.34)]'
                          : 'border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-overlay-1)]/82 shadow-[0_12px_24px_rgba(2,8,23,0.1)] dark:border-[color:var(--color-border-subtle)] dark:shadow-[0_12px_24px_rgba(2,8,23,0.22)]'
                      }`}
                    >
                      {!isFlipped ? (
                        <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                          {!isAchieved ? (
                            <span className="rounded-full border border-amber-300/55 bg-amber-200/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-900 dark:border-[color:var(--color-border-subtle)] dark:bg-[color:var(--color-overlay-1)] dark:text-[color:var(--color-text-dim)]">
                              {language === 'es' ? 'Bloqueado' : 'Locked'}
                            </span>
                          ) : null}
                          <HabitAchievementSeal
                            pillar={habit.pillar ?? activePillarCode}
                            traitCode={habit.trait?.code}
                            traitName={habit.trait?.name}
                            alt={`${habit.taskName} seal`}
                            disabled={!isAchieved}
                            className={`h-44 min-h-44 w-44 min-w-44 overflow-hidden rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] shadow-[0_20px_50px_rgba(0,0,0,0.24)] ${isAchieved ? '' : 'opacity-55'}`}
                            imgClassName="h-full w-full object-cover"
                            fallback={(
                              <span className="text-5xl font-semibold leading-none text-[color:var(--color-text-muted)]">
                                {isAchieved ? (habit.seal.visible ? '🏅' : slotLabel) : slotLabel}
                              </span>
                            )}
                          />
                          <p className="text-lg font-semibold text-[color:var(--color-text-strong)]">{habit.taskName}</p>
                          <p className="text-sm text-[color:var(--color-text-muted)]">
                            {language === 'es'
                              ? 'Toca para ver más'
                              : 'Tap to see more'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex h-full flex-col gap-3 overflow-hidden">
                          <p className="text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-text-dim)]">
                            {isAchieved ? (language === 'es' ? 'Logro desbloqueado' : 'Achievement unlocked') : (language === 'es' ? 'Logro bloqueado' : 'Achievement locked')}
                          </p>
                          <h3 className="text-lg font-semibold leading-tight text-[color:var(--color-text-strong)]">{habit.taskName}</h3>
                          <p className="text-sm leading-tight text-[color:var(--color-text-muted)]">
                            {habit.trait?.name || habit.trait?.code || (language === 'es' ? 'Sin rasgo visible' : 'No visible trait')}
                          </p>
                          {isAchieved ? (
                            <>
                              <p className="text-sm text-[color:var(--color-text)]">
                                {language === 'es' ? 'Logrado el' : 'Achieved on'} {habit.achievedAt?.slice(0, 10) ?? '—'}
                              </p>
                              <div className="mt-1 rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-3 py-2">
                                <MaintainToggleRow
                                  language={language}
                                  checked={habit.maintainEnabled}
                                  disabled={disableRemote || maintainPendingHabitId === habit.id}
                                  onToggle={() => {
                                    void handleToggleMaintained(habit, !habit.maintainEnabled);
                                  }}
                                />
                              </div>
                            </>
                          ) : (
                            <LockedAchievementHabitDevelopment
                              habit={habit}
                              language={language}
                              disableRemote={disableRemote}
                              mockPreviewAchievementByTaskId={mockPreviewAchievementByTaskId}
                              loadOnVisible={isFlipped}
                            />
                          )}
                          <p className="mt-auto text-xs text-[color:var(--color-text-dim)]">
                            {language === 'es' ? 'Toca otra vez para volver al frente' : 'Tap again to return to front'}
                          </p>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => scrollCarouselToIndex(activeCarouselIndex - 1)}
                  disabled={activeCarouselIndex <= 0}
                  className="rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] px-3 py-1 text-xs font-semibold text-[color:var(--color-text)] shadow-[0_6px_14px_rgba(15,23,42,0.08)] transition hover:bg-[color:var(--color-overlay-2)] disabled:opacity-50"
                >
                  {language === 'es' ? 'Anterior' : 'Previous'}
                </button>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-text-dim)]">
                  {Math.min(activeCarouselIndex + 1, activePillarHabits.length)} / {activePillarHabits.length}
                </p>
                <button
                  type="button"
                  onClick={() => scrollCarouselToIndex(activeCarouselIndex + 1)}
                  disabled={activeCarouselIndex >= activePillarHabits.length - 1}
                  className="rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] px-3 py-1 text-xs font-semibold text-[color:var(--color-text)] shadow-[0_6px_14px_rgba(15,23,42,0.08)] transition hover:bg-[color:var(--color-overlay-2)] disabled:opacity-50"
                >
                  {language === 'es' ? 'Siguiente' : 'Next'}
                </button>
              </div>
            </>
          ) : (
            <p className="rounded-2xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4 text-sm text-[color:var(--color-text-muted)]">
              {language === 'es' ? 'Sin tareas seguidas en este pilar todavía.' : 'No tracked tasks in this pillar yet.'}
            </p>
          )}
        </div>
      ) : (
        normalizedGroups.map((group) => (
          <section key={group.pillar.code} className={`space-y-2 transition ${isShelfFocusStep ? 'space-y-1.5' : ''}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-dim)]">{resolvePillarHeader(group.pillar, language)}</p>
            <div className={`ib-rewards-shelf-scroll flex overflow-x-auto pb-1 transition ${isShelfFocusStep ? 'gap-2.5' : 'gap-3'} ${isDemoExperience ? 'pt-0.5' : ''}`}>
              {group.habits.map((habit) => {
                const isAchieved = habit.status !== 'not_achieved';
                const active = habit.id === activeHabitId;
                const traitCode = habit.trait?.code?.slice(0, 3).toUpperCase() ?? '---';
                const slotLabel = `${(habit.pillar ?? group.pillar.code ?? 'X').slice(0, 1).toUpperCase()}-${traitCode}`;

                if (!isAchieved) {
                  const blockedAnchor = demoAnchors?.blockedCardTaskId === habit.taskId ? demoAnchors?.blockedCard : undefined;
                  return (
                    <button
                      key={habit.id}
                      type="button"
                      data-demo-anchor={blockedAnchor}
                      onClick={() => setPreviewHabit(habit)}
                      className={`flex shrink-0 flex-col items-center justify-center rounded-2xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)]/55 px-3 text-center opacity-80 transition hover:border-[color:var(--color-border-strong)] hover:opacity-100 ${isShelfFocusStep ? 'h-32 w-24 py-3' : 'h-40 w-32 py-4'}`}
                    >
                      <HabitAchievementSeal
                        pillar={habit.pillar ?? group.pillar.code}
                        traitCode={habit.trait?.code}
                        traitName={habit.trait?.name}
                        alt={`${habit.taskName} seal`}
                        disabled
                        className={`flex items-center justify-center overflow-hidden rounded-full border border-dashed border-[color:var(--color-border-subtle)] bg-transparent ${isShelfFocusStep ? 'h-16 min-h-16 w-16 min-w-16 max-h-16 max-w-16' : 'h-20 min-h-20 w-20 min-w-20 max-h-20 max-w-20'}`}
                        imgClassName="h-full w-full object-cover"
                        fallback={(
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold tracking-[0.12em] text-[color:var(--color-text-dim)]">
                            {slotLabel}
                          </div>
                        )}
                      />
                      <p className={`mt-2 w-full truncate font-semibold text-[color:var(--color-text-muted)] ${isShelfFocusStep ? 'text-xs' : 'text-sm'}`}>{habit.taskName}</p>
                    </button>
                  );
                }

                const achievedAnchor = demoAnchors?.achievedCardTaskId === habit.taskId ? demoAnchors?.achievedCard : undefined;
                return (
                  <button
                    key={habit.id}
                    type="button"
                    data-demo-anchor={achievedAnchor}
                    onClick={() => {
                      setActiveHabitId(habit.id);
                      setShowBackFace(false);
                    }}
                    className={`flex shrink-0 flex-col items-center justify-center rounded-2xl border px-3 text-center transition ${isShelfFocusStep ? 'h-32 w-24 py-3' : 'h-40 w-32 py-4'} ${active ? 'border-violet-300/60 bg-violet-500/10' : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] hover:border-[color:var(--color-border-strong)]'}`}
                  >
                    <HabitAchievementSeal
                      pillar={habit.pillar ?? group.pillar.code}
                      traitCode={habit.trait?.code}
                      traitName={habit.trait?.name}
                      alt={`${habit.taskName} seal`}
                      className={`flex items-center justify-center overflow-hidden rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] shadow-[0_10px_30px_rgba(0,0,0,0.22)] ${isShelfFocusStep ? 'h-16 min-h-16 w-16 min-w-16 max-h-16 max-w-16' : 'h-20 min-h-20 w-20 min-w-20 max-h-20 max-w-20'}`}
                      imgClassName="h-full w-full object-cover"
                      fallback={(
                        <span className="text-3xl leading-none">
                          {habit.seal.visible ? '🏅' : getSealBadge(habit)}
                        </span>
                      )}
                    />
                    <p className={`mt-2 w-full truncate font-semibold text-[color:var(--color-text)] ${isShelfFocusStep ? 'text-xs' : 'text-sm'}`}>{habit.taskName}</p>
                  </button>
                );
              })}
              {group.habits.length === 0 ? (
                <p className="py-6 text-sm text-[color:var(--color-text-muted)]">
                  {language === 'es' ? 'Sin tareas seguidas en este pilar todavía.' : 'No tracked tasks in this pillar yet.'}
                </p>
              ) : null}
            </div>
          </section>
        ))
      )}

      {!isCarouselView ? (
        <>
          <AchievementFocusOverlay
            habit={activeHabit}
            language={language}
            showBackFace={showBackFace}
            disableRemote={disableRemote}
            demoAnchors={demoAnchors}
            onFlip={() => setShowBackFace((current) => !current)}
            onClose={() => {
              setActiveHabitId(null);
              setShowBackFace(false);
            }}
            onToggleMaintainedWithPending={handleToggleMaintained}
            maintainPendingHabitId={maintainPendingHabitId}
          />

          <NotAchievedPreviewOverlay
            habit={previewHabit}
            language={language}
            disableRemote={disableRemote}
            mockPreviewAchievementByTaskId={mockPreviewAchievementByTaskId}
            demoAnchors={demoAnchors}
            onClose={() => setPreviewHabit(null)}
          />
        </>
      ) : null}
    </div>
  );
}

function LockedAchievementHabitDevelopment({
  habit,
  language,
  disableRemote,
  mockPreviewAchievementByTaskId,
  loadOnVisible,
}: {
  habit: HabitAchievementShelfItem;
  language: 'es' | 'en';
  disableRemote: boolean;
  mockPreviewAchievementByTaskId?: Record<string, NonNullable<TaskInsightsResponse['previewAchievement']>>;
  loadOnVisible: boolean;
}) {
  const taskId = habit.taskId;
  const mockPreviewAchievement = mockPreviewAchievementByTaskId?.[taskId] ?? null;
  const { data, status, error } = useRequest(
    () => getTaskInsights(taskId),
    [taskId],
    { enabled: loadOnVisible && !disableRemote && !mockPreviewAchievement },
  );
  const previewAchievement = mockPreviewAchievement ?? data?.previewAchievement ?? null;
  const showLoading = loadOnVisible && status === 'loading' && !mockPreviewAchievement;
  const showError = loadOnVisible && status === 'error';
  const showEmpty = loadOnVisible && !showLoading && !showError && !previewAchievement;
  const compactRecentMonths = (previewAchievement?.recentMonths ?? []).slice(-4);
  const scoreValue = previewAchievement ? Math.max(0, Math.min(100, Math.round(Number(previewAchievement.score ?? 0)))) : 0;
  const statusLabel = getAchievementStatusLabel(previewAchievement?.status, language);
  const activeWindowSlots = previewAchievement?.windowProximity?.slots ?? [];

  if (showLoading) {
    return (
      <p className="rounded-xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-2.5 text-xs text-[color:var(--color-text-muted)]">
        {language === 'es' ? 'Cargando desarrollo del hábito…' : 'Loading habit development…'}
      </p>
    );
  }

  if (showError) {
    return (
      <p className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-2.5 text-xs text-rose-100">
        {error?.message ?? (language === 'es' ? 'No pudimos cargar el desarrollo del hábito.' : "We couldn't load habit development.")}
      </p>
    );
  }

  if (previewAchievement) {
    return (
      <div className="rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[color:var(--color-text-dim)]">
          {language === 'es' ? 'Desarrollo del hábito' : 'Habit development'}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <StatPill label="Score" value={`${scoreValue}%`} />
          <StatPill label={language === 'es' ? 'Estado' : 'Status'} value={statusLabel} />
        </div>
        <div className="mt-2 rounded-lg border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-2)] px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">{language === 'es' ? 'Ventana activa' : 'Active window'}</p>
          <p className="mt-0.5 text-xs text-[color:var(--color-text)]">{formatActiveWindowSummary(activeWindowSlots, language)}</p>
        </div>
        <div className="mt-2 rounded-lg border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-2)] px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">{language === 'es' ? 'Últimos meses' : 'Recent months'}</p>
          <div className="mt-1 flex gap-1 overflow-hidden">
            {compactRecentMonths.length > 0 ? compactRecentMonths.map((month, index) => (
              <span key={`${month.periodKey ?? month.month ?? 'month'}-${index}`} className={`inline-flex min-w-0 flex-1 items-center justify-center rounded-md px-1 py-1 text-[10px] font-semibold ${getCompactMonthTone(month.state)}`}>
                {resolveCompactMonthLabel(month.periodKey ?? month.month, language)}
              </span>
            )) : (
              <span className="text-[11px] text-[color:var(--color-text-muted)]">{language === 'es' ? 'Sin datos todavía' : 'No data yet'}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showEmpty) {
    return (
      <p className="rounded-xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-2.5 text-xs text-[color:var(--color-text-muted)]">
        {language === 'es'
          ? 'Aún no hay datos suficientes de desarrollo del hábito para esta tarea.'
          : 'There is not enough habit development data for this task yet.'}
      </p>
    );
  }

  return null;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-2)] px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-[0.1em] text-[color:var(--color-text-dim)]">{label}</p>
      <p className="truncate text-xs font-semibold text-[color:var(--color-text)]">{value}</p>
    </div>
  );
}

function NotAchievedPreviewOverlay({
  habit,
  language,
  disableRemote,
  mockPreviewAchievementByTaskId,
  demoAnchors,
  onClose,
}: {
  habit: HabitAchievementShelfItem | null;
  language: 'es' | 'en';
  disableRemote: boolean;
  mockPreviewAchievementByTaskId?: Record<string, NonNullable<TaskInsightsResponse['previewAchievement']>>;
  demoAnchors?: RewardsSectionProps['demoAnchors'];
  onClose: () => void;
}) {
  const taskId = habit?.taskId;
  const mockPreviewAchievement = taskId ? mockPreviewAchievementByTaskId?.[taskId] : null;
  const { data, status, error } = useRequest(
    () => getTaskInsights(taskId ?? ''),
    [taskId],
    { enabled: Boolean(taskId) && !disableRemote && !mockPreviewAchievement },
  );

  useEffect(() => {
    if (!habit) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [habit, onClose]);

  if (!habit || typeof document === 'undefined') {
    return null;
  }

  const previewAchievement = mockPreviewAchievement ?? data?.previewAchievement ?? null;
  const isLocalPreview = Boolean(mockPreviewAchievement);

  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-end justify-center bg-slate-950/70 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:items-center" data-achievement-overlay="seal-path" onClick={onClose}>
      <div className="relative w-full max-w-sm overflow-y-auto rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface-elevated)] p-4 max-h-[calc(100vh-2rem)]" onClick={(event) => event.stopPropagation()} data-demo-anchor={demoAnchors?.sealPath}>
        <button
          type="button"
          onClick={onClose}
          data-achievement-action="close-overlay"
          className="absolute right-4 top-4 rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] px-2 py-1 text-xs text-[color:var(--color-text)]"
          aria-label={language === 'es' ? 'Cerrar vista de sello' : 'Close seal preview'}
        >
          ✕
        </button>
        <div className="pr-9">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-dim)]">
            {language === 'es' ? 'Ruta del sello' : 'Seal path'}
          </p>
          <h3 className="mt-1 text-base font-semibold text-[color:var(--color-text-strong)]">{habit.taskName}</h3>
        </div>

        <div className="mt-4">
          {status === 'loading' && !isLocalPreview ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4 text-sm text-[color:var(--color-text-muted)]">
              {language === 'es' ? 'Cargando vista previa del logro…' : 'Loading achievement preview…'}
            </div>
          ) : null}
          {status === 'error' ? (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-100">
              {error?.message ?? (language === 'es' ? 'No pudimos cargar el estado del sello.' : "Couldn't load seal state.")}
            </div>
          ) : null}
          {(status === 'success' || isLocalPreview) && previewAchievement ? (
            <PreviewAchievementCard previewAchievement={previewAchievement} language={language} />
          ) : null}
          {(status === 'success' || isLocalPreview) && !previewAchievement ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] p-4 text-sm text-[color:var(--color-text-muted)]">
              {language === 'es' ? 'Sigue registrando esta tarea para desbloquear el sello.' : 'Keep logging this task to unlock the seal.'}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function AchievementFocusOverlay({
  habit,
  language,
  showBackFace,
  disableRemote,
  demoAnchors,
  onFlip,
  onClose,
  onToggleMaintainedWithPending,
  maintainPendingHabitId,
}: {
  habit: HabitAchievementShelfItem | null;
  language: 'es' | 'en';
  showBackFace: boolean;
  disableRemote: boolean;
  demoAnchors?: RewardsSectionProps['demoAnchors'];
  onFlip: () => void;
  onClose: () => void;
  onToggleMaintainedWithPending: (habit: HabitAchievementShelfItem, enabled: boolean) => Promise<void>;
  maintainPendingHabitId: string | null;
}) {
  useEffect(() => {
    if (!habit) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [habit, onClose]);

  if (!habit || typeof document === 'undefined') {
    return null;
  }

  const backFaceTrait =
    habit.trait?.name?.trim() ||
    habit.trait?.code?.trim() ||
    habit.pillar?.trim() ||
    (language === 'es' ? 'Sin rasgo' : 'No trait');

  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-end justify-center bg-slate-950/70 p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:items-center" data-achievement-overlay="focus-card" onClick={onClose}>
      <div className="relative w-full max-w-sm" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          data-achievement-action="close-overlay"
          className="absolute -top-3 right-0 z-10 rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] px-2 py-1 text-xs text-[color:var(--color-text)]"
          aria-label={language === 'es' ? 'Cerrar logro activo' : 'Close active achievement'}
        >
          ✕
        </button>
        <button
          type="button"
          onClick={onFlip}
          data-achievement-action="flip-card"
          data-demo-anchor={demoAnchors?.achievementCard}
          className="ib-card-contour-shadow flex h-[min(82vh,34rem)] min-h-[24rem] w-full flex-col rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface-elevated)] p-5 text-left"
        >
          {!showBackFace ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center" data-demo-anchor={demoAnchors?.achievementFront}>
              <div className="flex h-[min(60vw,18rem)] min-h-44 w-[min(60vw,18rem)] min-w-44 items-center justify-center rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] text-7xl shadow-[0_20px_50px_rgba(0,0,0,0.24)] sm:h-[75%] sm:max-h-72 sm:min-h-56 sm:w-[75%] sm:max-w-72 sm:min-w-56 sm:text-8xl">
                <HabitAchievementSeal
                  pillar={habit.pillar}
                  traitCode={habit.trait?.code}
                  traitName={habit.trait?.name}
                  alt={`${habit.taskName} seal`}
                  className="h-full w-full overflow-hidden rounded-full"
                  imgClassName="h-full w-full object-cover"
                  fallback={<span className="leading-none">{habit.seal.visible ? '🏅' : '✨'}</span>}
                />
              </div>
              <p className="text-base font-semibold text-[color:var(--color-text-strong)] sm:text-lg">{habit.taskName}</p>
              <p className="text-sm text-[color:var(--color-text-muted)]">
                {language === 'es' ? 'Toque nuevamente para ver el reverso' : 'Tap again to view the back side'}
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center" data-demo-anchor={demoAnchors?.achievementBack}>
              <p className="text-lg font-semibold text-[color:var(--color-text-strong)]">{habit.taskName}</p>
              <p className="text-sm text-[color:var(--color-text-muted)]">{backFaceTrait}</p>
              <p className="text-xs text-[color:var(--color-text-muted)]">
                {language === 'es' ? 'Logrado el' : 'Achieved on'} {habit.achievedAt?.slice(0, 10) ?? '—'}
              </p>
              <MaintainToggleRow
                language={language}
                checked={habit.maintainEnabled}
                disabled={disableRemote || maintainPendingHabitId === habit.id}
                onToggle={() => {
                  void onToggleMaintainedWithPending(habit, !habit.maintainEnabled);
                }}
              />
              <p className="text-xs text-[color:var(--color-text-dim)]">
                {language === 'es' ? 'Toque nuevamente para volver al frente' : 'Tap again to return to the front'}
              </p>
            </div>
          )}
        </button>
      </div>
    </div>,
    document.body,
  );
}

function MaintainToggleRow({
  language,
  checked,
  disabled,
  onToggle,
}: {
  language: 'es' | 'en';
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-[color:var(--color-text)]">
      <span>{language === 'es' ? 'Mantener activo' : 'Keep maintained'}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={language === 'es' ? 'Mantener activo' : 'Keep maintained'}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-65 ${checked
          ? 'border-emerald-300/70 bg-emerald-500/80'
          : 'border-[color:var(--color-border-strong)] bg-[color:var(--color-overlay-3)]'}`}
      >
        <span
          className={`block h-6 w-6 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.35)] transition-transform duration-300 ${checked ? 'translate-x-7' : 'translate-x-1'}`}
        />
      </button>
    </label>
  );
}

function DecisionModal({
  habit,
  language,
  total,
  currentIndex,
  transitioning,
  onClose,
  onMaintain,
  onStore,
}: {
  habit: HabitAchievementShelfItem;
  language: 'es' | 'en';
  total: number;
  currentIndex: number;
  transitioning: boolean;
  onClose: () => void;
  onMaintain: () => void;
  onStore: () => void;
}) {
  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-950/85 p-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" onClick={onClose}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={habit.id}
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: transitioning ? 0.55 : 1, y: 0, scale: transitioning ? 0.985 : 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-3xl rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] p-4 sm:p-6"
          onClick={(event) => event.stopPropagation()}
        >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--color-text-dim)]">{language === 'es' ? 'Hábito logrado' : 'Achieved habit'} {currentIndex + 1}/{total}</p>
          <button type="button" onClick={onClose} className="rounded-full border border-[color:var(--color-border-subtle)] px-2 py-1 text-xs">✕</button>
        </div>
        <p className="mb-4 text-lg font-semibold">{habit.taskName}</p>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-300/50 bg-emerald-400/10 p-4">
            <p className="font-semibold">{language === 'es' ? 'Mantener hábito' : 'Maintain habit'}</p>
            <ul className="mt-2 space-y-1 text-sm text-[color:var(--color-text-muted)]">
              <li>• {language === 'es' ? 'Vuelve a Daily Quest' : 'Returns to Daily Quest'}</li>
              <li>• {language === 'es' ? 'Sello visible en tareas activas' : 'Seal shown in active tasks'}</li>
              <li>• {language === 'es' ? 'Genera 1 GP' : 'Generates 1 GP'}</li>
            </ul>
            <button type="button" onClick={onMaintain} className="mt-3 w-full rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">{language === 'es' ? 'Mantener hábito' : 'Maintain habit'}</button>
          </div>
          <div className="rounded-2xl border border-violet-300/40 bg-violet-500/10 p-4">
            <p className="font-semibold">{language === 'es' ? 'Guardar en Logros' : 'Store in Achievements'}</p>
            <ul className="mt-2 space-y-1 text-sm text-[color:var(--color-text-muted)]">
              <li>• {language === 'es' ? 'Sale de seguimiento activo' : 'Leaves active tracking'}</li>
              <li>• {language === 'es' ? 'Permanece en la estantería' : 'Stays in shelf forever'}</li>
              <li>• {language === 'es' ? 'Sin generación de GP' : 'No GP generation'}</li>
            </ul>
            <button type="button" onClick={onStore} className="mt-3 w-full rounded-full border border-violet-300/50 bg-violet-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">{language === 'es' ? 'Guardar en Logros' : 'Store in Achievements'}</button>
          </div>
        </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body,
  );
}

function CelebrationOverlay({ habits, language, onSkip }: { habits: HabitAchievementShelfItem[]; language: 'es' | 'en'; onSkip: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-slate-950/85">
      <button type="button" onClick={onSkip} className="absolute right-5 top-5 rounded-full border border-white/30 px-3 py-1 text-xs text-white">✕</button>
      <p className="text-sm uppercase tracking-[0.2em] text-amber-100">{language === 'es' ? 'Celebrando' : 'Celebrating'}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {habits.map((habit) => (
          <div key={habit.id} className="rounded-full border border-amber-300/40 bg-amber-400/10 px-4 py-2 text-white">🏅 {habit.taskName}</div>
        ))}
      </div>
      <p className="text-xs text-[color:var(--color-slate-300)]">{language === 'es' ? 'Tus sellos ahora viven en tus estantes de Logros' : 'Your seals now live in your Achievement Shelves'}</p>
    </div>
  );
}
