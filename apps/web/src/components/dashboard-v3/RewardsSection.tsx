import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Card } from '../ui/Card';
import { useRequest } from '../../hooks/useRequest';
import {
  decideTaskHabitAchievement,
  getRewardsHistory,
  toggleTaskHabitAchievementMaintained,
  type HabitAchievementShelfItem,
  type MonthlyWrappedRecord,
  type RewardsHistorySummary,
  type WeeklyWrappedRecord,
} from '../../lib/api';
import { usePostLoginLanguage } from '../../i18n/postLoginLanguage';
import { emitHabitAchievementUpdated } from '../../lib/habitAchievementEvents';

const REWARDS_PILLAR_ORDER = [
  { code: 'BODY', name: 'Body' },
  { code: 'MIND', name: 'Mind' },
  { code: 'SOUL', name: 'Soul' },
] as const;

const DEFAULT_PLACEHOLDER_SLOTS = 10;

type AchievementShelfEntry =
  | { kind: 'habit'; habit: HabitAchievementShelfItem }
  | { kind: 'placeholder'; key: string; label: string };

interface RewardsSectionProps {
  userId: string;
  onOpenWeeklyWrapped?: (record?: WeeklyWrappedRecord | null) => void;
  initialData?: RewardsHistorySummary;
  onPendingCountChange?: (count: number) => void;
}

export function RewardsSection({ userId, onOpenWeeklyWrapped, initialData, onPendingCountChange }: RewardsSectionProps) {
  const { language } = usePostLoginLanguage();
  const [isDecisionOpen, setIsDecisionOpen] = useState(false);
  const [decisionIndex, setDecisionIndex] = useState(0);
  const [celebrating, setCelebrating] = useState<null | HabitAchievementShelfItem[]>(null);
  const [educationBannerVisible, setEducationBannerVisible] = useState(false);
  const [isTransitioningDecision, setIsTransitioningDecision] = useState(false);

  const { data, status, error, reload } = useRequest(() => getRewardsHistory(userId), [userId], {
    enabled: Boolean(userId),
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
      rightSlot={
        <button
          type="button"
          onClick={reload}
          disabled={status === 'loading'}
          className="rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-muted)] transition hover:border-[color:var(--color-border-strong)] hover:text-[color:var(--color-text)] disabled:opacity-60"
        >
          {language === 'es' ? 'Actualizar' : 'Refresh'}
        </button>
      }
      bodyClassName="gap-5"
    >
      {pendingCount > 0 ? (
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

      {educationBannerVisible ? (
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
        onToggleMaintained={async (habit, enabled) => {
          await toggleTaskHabitAchievementMaintained(habit.taskId, enabled);
          await reload();
        }}
      />

      <WeeklyWrapupShelf items={weeklyItems} onOpen={onOpenWeeklyWrapped} language={language} />

      <MonthlyWrapupShelf items={monthlyItems} language={language} />

      {isDecisionOpen && pendingItems[decisionIndex] ? (
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

      {celebrating ? <CelebrationOverlay language={language} habits={celebrating} onSkip={() => setCelebrating(null)} /> : null}
    </Card>
  );
}

function MonthlyWrapupShelf({ items, language }: { items: MonthlyWrappedRecord[]; language: 'es' | 'en' }) {
  const monthlyCountdownDays = useMemo(() => getDaysUntilNextMonthWrapup(), []);
  const compactItems = useMemo(() => items.slice(0, 2), [items]);
  const latest = compactItems[0] ?? null;
  const previous = compactItems[1] ?? null;

  return (
    <div className="ib-card-contour-shadow rounded-2xl border border-[color:var(--color-border-subtle)] bg-gradient-to-br from-indigo-500/15 via-fuchsia-500/10 to-sky-500/10 p-4">
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

function WeeklyWrapupShelf({ items, onOpen, language }: { items: WeeklyWrappedRecord[]; onOpen?: (record?: WeeklyWrappedRecord | null) => void; language: 'es' | 'en' }) {
  const weeklyCountdownDays = useMemo(() => getDaysUntilNextWeeklyWrapup(), []);
  const compactItems = useMemo(() => items.slice(0, 2), [items]);
  return (
    <div className="ib-card-contour-shadow rounded-2xl border border-[color:var(--color-border-subtle)] bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-indigo-500/10 p-4">
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

function AchievedShelf({
  groups,
  language,
  onToggleMaintained,
}: {
  groups: RewardsHistorySummary['habitAchievements']['achievedByPillar'];
  language: 'es' | 'en';
  onToggleMaintained: (habit: HabitAchievementShelfItem, enabled: boolean) => Promise<void>;
}) {
  const [activeHabitId, setActiveHabitId] = useState<string | null>(null);
  const [showBackFace, setShowBackFace] = useState(false);
  const normalizedGroups = useMemo(() => {
    const byCode = new Map(groups.map((group) => [group.pillar.code.toUpperCase(), group]));
    return REWARDS_PILLAR_ORDER.map((pillar) => {
      const existing = byCode.get(pillar.code);
      const habits = existing?.habits ?? [];
      const entries: AchievementShelfEntry[] = habits.map((habit) => ({ kind: 'habit', habit }));
      const placeholdersNeeded = Math.max(0, DEFAULT_PLACEHOLDER_SLOTS - habits.length);
      for (let index = 0; index < placeholdersNeeded; index += 1) {
        entries.push({
          kind: 'placeholder',
          key: `${pillar.code}-placeholder-${index + 1}`,
          label: `${pillar.code.slice(0, 1)}-${String(index + 1).padStart(2, '0')}`,
        });
      }
      return {
        pillar: existing?.pillar ?? { id: null, code: pillar.code, name: pillar.name },
        entries,
      };
    });
  }, [groups]);

  const habitsById = useMemo(() => {
    const map = new Map<string, HabitAchievementShelfItem>();
    normalizedGroups.forEach((group) => {
      group.entries.forEach((entry) => {
        if (entry.kind === 'habit') {
          map.set(entry.habit.id, entry.habit);
        }
      });
    });
    return map;
  }, [normalizedGroups]);

  const activeHabit = activeHabitId ? habitsById.get(activeHabitId) ?? null : null;

  const getSealBadge = (habit: HabitAchievementShelfItem) => {
    const pillarCode = (habit.pillar ?? 'X').slice(0, 1).toUpperCase();
    const traitCode = habit.trait?.code?.slice(0, 3).toUpperCase() ?? '---';
    return `${pillarCode}-${traitCode}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[color:var(--color-text-strong)]">
          {language === 'es' ? 'Estantes de Logros' : 'Achievement Shelves'}
        </h2>
      </div>
      {normalizedGroups.map((group) => (
        <section key={group.pillar.code} className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-text-dim)]">{group.pillar.name}</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {group.entries.map((entry) => {
              if (entry.kind === 'placeholder') {
                return (
                  <div key={entry.key} className="w-32 shrink-0 rounded-2xl border border-dashed border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)]/60 p-3 text-left">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-[color:var(--color-border-subtle)] text-[11px] font-semibold text-[color:var(--color-text-muted)]">
                      {entry.label}
                    </div>
                    <p className="mt-2 text-xs font-medium text-[color:var(--color-text-muted)]">{language === 'es' ? 'Sello futuro' : 'Future seal'}</p>
                    <p className="text-[11px] text-[color:var(--color-slate-400)]">{language === 'es' ? 'Espacio reservado' : 'Reserved slot'}</p>
                  </div>
                );
              }

              const { habit } = entry;
              const active = habit.id === activeHabitId;
              return (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => {
                    setActiveHabitId(habit.id);
                    setShowBackFace(false);
                  }}
                  className={`flex h-40 w-32 shrink-0 flex-col items-center justify-center rounded-2xl border px-3 py-4 text-center transition ${active ? 'border-violet-300/60 bg-violet-500/10' : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] hover:border-[color:var(--color-border-strong)]'}`}
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] text-3xl shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
                    {habit.seal.visible ? '🏅' : getSealBadge(habit)}
                  </div>
                  <p className="mt-3 line-clamp-2 text-sm font-semibold text-[color:var(--color-text)]">{habit.taskName}</p>
                  <p className="mt-1 text-[11px] text-[color:var(--color-slate-400)]">{habit.status === 'maintained'
                    ? (language === 'es' ? 'Mantenido' : 'Maintained')
                    : habit.status === 'pending_decision'
                      ? (language === 'es' ? 'Pendiente' : 'Pending')
                      : (language === 'es' ? 'Guardado' : 'Stored')}</p>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <AchievementFocusOverlay
        habit={activeHabit}
        language={language}
        showBackFace={showBackFace}
        onFlip={() => setShowBackFace((current) => !current)}
        onClose={() => {
          setActiveHabitId(null);
          setShowBackFace(false);
        }}
        onToggleMaintained={onToggleMaintained}
      />
    </div>
  );
}

function AchievementFocusOverlay({
  habit,
  language,
  showBackFace,
  onFlip,
  onClose,
  onToggleMaintained,
}: {
  habit: HabitAchievementShelfItem | null;
  language: 'es' | 'en';
  showBackFace: boolean;
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

  return createPortal(
    <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-950/70 p-4" onClick={onClose}>
      <div className="relative w-full max-w-sm" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 right-0 z-10 rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface)] px-2 py-1 text-xs text-[color:var(--color-text)]"
          aria-label={language === 'es' ? 'Cerrar logro activo' : 'Close active achievement'}
        >
          ✕
        </button>
        <button
          type="button"
          onClick={onFlip}
          className="ib-card-contour-shadow flex h-[min(78vh,34rem)] w-full flex-col rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-surface-elevated)] p-5 text-left"
        >
          {!showBackFace ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <div className="flex h-[75%] max-h-72 min-h-56 w-[75%] max-w-72 min-w-56 items-center justify-center rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] text-7xl shadow-[0_20px_50px_rgba(0,0,0,0.24)] sm:text-8xl">
                <span className="leading-none">{habit.seal.visible ? '🏅' : '✨'}</span>
              </div>
              <p className="text-base font-semibold text-[color:var(--color-text-strong)] sm:text-lg">{habit.taskName}</p>
              <p className="text-sm text-[color:var(--color-text-muted)]">
                {language === 'es' ? 'Toque nuevamente para ver el reverso' : 'Tap again to view the back side'}
              </p>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-lg font-semibold text-[color:var(--color-text-strong)]">{habit.taskName}</p>
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
