import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Sparkles } from 'lucide-react';
import { Card } from '../ui/Card';
import { useRequest } from '../../hooks/useRequest';
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
import { HabitAchievementSeal } from './HabitAchievementSeal';
import { PreviewAchievementCard } from './PreviewAchievementCard';

const REWARDS_PILLAR_ORDER = [
  { code: 'BODY', name: 'Body' },
  { code: 'MIND', name: 'Mind' },
  { code: 'SOUL', name: 'Soul' },
] as const;

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
      rightSlot={!resolvedDisableRemote ? (
        <div className="flex items-center gap-2">
          <a
            href="/labs/logros"
            title={language === 'es' ? 'Ver demo guiada de Logros' : 'View guided Achievements demo'}
            aria-label={language === 'es' ? 'Ver demo guiada de Logros' : 'View guided Achievements demo'}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-300/45 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-100 transition hover:border-violet-200/70 hover:bg-violet-500/16 hover:text-white"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{language === 'es' ? 'Ver guía' : 'View guide'}</span>
          </a>
          <button
            type="button"
            onClick={reload}
            disabled={status === 'loading'}
            className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text)] disabled:opacity-60"
          >
            {language === 'es' ? 'Actualizar' : 'Refresh'}
          </button>
        </div>
      ) : undefined}
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
    </Card>
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

function AchievedShelf({
  groups,
  language,
  onToggleMaintained,
  disableRemote,
  mockPreviewAchievementByTaskId,
  demoAnchors,
  onDemoControlsReady,
  demoStepId,
}: {
  groups: RewardsHistorySummary['habitAchievements']['achievedByPillar'];
  language: 'es' | 'en';
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
  const resolvedAchievedTaskId = demoAnchors?.achievedCardTaskId;
  const resolvedBlockedTaskId = demoAnchors?.blockedCardTaskId;
  const isShelfFocusStep = demoStepId === 'logros-shelves';
  const isDemoExperience = Boolean(demoStepId);

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

  return (
    <div className="space-y-4" data-demo-anchor={demoAnchors?.shelves}>
      <div>
        <h2 className="text-lg font-semibold text-[color:var(--color-text-strong)]">
          {language === 'es' ? 'Estantes de Logros' : 'Achievement Shelves'}
        </h2>
      </div>
      {isShelfFocusStep ? (
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
      {normalizedGroups.map((group) => (
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
      ))}

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
        onToggleMaintained={onToggleMaintained}
      />

      <NotAchievedPreviewOverlay
        habit={previewHabit}
        language={language}
        disableRemote={disableRemote}
        mockPreviewAchievementByTaskId={mockPreviewAchievementByTaskId}
        demoAnchors={demoAnchors}
        onClose={() => setPreviewHabit(null)}
      />
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
  onToggleMaintained,
}: {
  habit: HabitAchievementShelfItem | null;
  language: 'es' | 'en';
  showBackFace: boolean;
  disableRemote: boolean;
  demoAnchors?: RewardsSectionProps['demoAnchors'];
  onFlip: () => void;
  onClose: () => void;
  onToggleMaintained: (habit: HabitAchievementShelfItem, enabled: boolean) => Promise<void>;
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
              <p className="text-base font-semibold text-[color:var(--color-text)]">
                GP: {habit.gpBeforeAchievement}
              </p>
              <label className="mt-1 flex items-center gap-3 text-sm text-[color:var(--color-text)]">
                <button
                  type="button"
                  role="switch"
                  aria-checked={habit.maintainEnabled}
                  aria-label={language === 'es' ? 'Mantener activo' : 'Keep maintained'}
                  disabled={disableRemote}
                  onClick={() => void onToggleMaintained(habit, !habit.maintainEnabled)}
                  className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border transition-colors duration-300 ${habit.maintainEnabled
                    ? 'border-emerald-300/70 bg-emerald-500/80'
                    : 'border-[color:var(--color-border-strong)] bg-[color:var(--color-overlay-3)]'}`}
                >
                  <span
                    className={`block h-6 w-6 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.35)] transition-transform duration-300 ${habit.maintainEnabled ? 'translate-x-7' : 'translate-x-1'}`}
                  />
                </button>
                <span>{language === 'es' ? 'Mantener activo' : 'Keep maintained'}</span>
              </label>
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
