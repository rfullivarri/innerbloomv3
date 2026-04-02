import { useEffect, useMemo, useState } from 'react';
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
      setDecisionIndex((value) => value + 1);
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
      title="🎁 Rewards"
      subtitle={language === 'es' ? 'Wrap-Up semanal + mensual + hábitos logrados' : 'Weekly + monthly wrap-ups + achieved habits'}
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
            ? 'Tus hábitos logrados están en Rewards. Puedes mantenerlos o guardarlos desde la estantería.'
            : 'Your achieved habits now live in Rewards. You can maintain or store them from the shelf.'}
        </div>
      ) : null}

      {status === 'error' ? <p className="text-sm text-rose-200">{error?.message ?? 'Error loading rewards.'}</p> : null}

      <WeeklyWrapupShelf items={weeklyItems} onOpen={onOpenWeeklyWrapped} language={language} />

      <MonthlyWrapupShelf items={monthlyItems} language={language} />

      <AchievedShelf
        language={language}
        groups={effectiveData?.habitAchievements.achievedByPillar ?? []}
        onToggleMaintained={async (habit, enabled) => {
          await toggleTaskHabitAchievementMaintained(habit.taskId, enabled);
          await reload();
        }}
      />

      {isDecisionOpen && pendingItems[decisionIndex] ? (
        <DecisionModal
          language={language}
          currentIndex={decisionIndex}
          total={pendingItems.length}
          habit={pendingItems[decisionIndex]}
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
    <p className="whitespace-nowrap text-right text-xs font-semibold tracking-[0.03em] text-white/90 [text-shadow:0_0_10px_rgba(255,255,255,0.25)]">
      {language === 'es' ? 'Próximo en ' : 'Next in '}
      <span className="text-lg font-black leading-none text-white [text-shadow:0_0_18px_rgba(255,255,255,0.45)]">{days}d</span>
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
                ? 'border-white/60 bg-white/15 text-white shadow-[0_0_12px_rgba(255,255,255,0.26)]'
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

  const getSealBadge = (habit: HabitAchievementShelfItem) => {
    const pillarCode = (habit.pillar ?? 'X').slice(0, 1).toUpperCase();
    const traitCode = habit.trait?.code?.slice(0, 3).toUpperCase() ?? '---';
    return `${pillarCode}-${traitCode}`;
  };

  return (
    <div className="space-y-4">
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
                <div key={habit.id} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      if (active) {
                        setShowBackFace((v) => !v);
                        return;
                      }
                      setActiveHabitId(habit.id);
                      setShowBackFace(false);
                    }}
                    className={`w-32 shrink-0 rounded-2xl border p-3 text-left transition ${active ? 'scale-[1.02] border-amber-300/50 bg-amber-400/10' : 'border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)]'}`}
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--color-border-subtle)] bg-[color:var(--color-overlay-1)] text-[11px] font-semibold text-[color:var(--color-text-muted)]">
                      {habit.seal.visible ? '🏅' : getSealBadge(habit)}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold text-[color:var(--color-text)]">{habit.taskName}</p>
                    <p className="text-xs text-[color:var(--color-slate-400)]">{habit.status === 'maintained'
                      ? (language === 'es' ? 'Mantenido' : 'Maintained')
                      : habit.status === 'pending_decision'
                        ? (language === 'es' ? 'Pendiente' : 'Pending')
                        : (language === 'es' ? 'Guardado' : 'Stored')}</p>
                  </button>
                  {active && showBackFace ? (
                    <div className="absolute inset-0 z-10 rounded-2xl border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface)] p-3 text-xs">
                      <p className="font-semibold text-[color:var(--color-text)]">{language === 'es' ? 'Logrado' : 'Achieved'}: {habit.achievedAt?.slice(0, 10) ?? '—'}</p>
                      <p className="mt-1 text-[color:var(--color-slate-400)]">GP: {habit.gpBeforeAchievement}{habit.gpSinceMaintain > 0 ? ` (+${habit.gpSinceMaintain})` : ''}</p>
                      <label className="mt-2 flex items-center gap-2 text-[color:var(--color-text)]">
                        <input type="checkbox" checked={habit.maintainEnabled} onChange={(event) => void onToggleMaintained(habit, event.currentTarget.checked)} />
                        {language === 'es' ? 'Mantener activo' : 'Keep maintained'}
                      </label>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      {activeHabitId ? <button type="button" onClick={() => { setActiveHabitId(null); setShowBackFace(false); }} className="text-xs text-[color:var(--color-text-muted)]">{language === 'es' ? 'Tocar para cerrar detalle' : 'Tap to close detail'}</button> : null}
    </div>
  );
}

function DecisionModal({
  habit,
  language,
  total,
  currentIndex,
  onClose,
  onMaintain,
  onStore,
}: {
  habit: HabitAchievementShelfItem;
  language: 'es' | 'en';
  total: number;
  currentIndex: number;
  onClose: () => void;
  onMaintain: () => void;
  onStore: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/80 p-4" onClick={onClose}>
      <div className="w-full max-w-3xl rounded-3xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface)] p-4 sm:p-6" onClick={(event) => event.stopPropagation()}>
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
            <p className="font-semibold">{language === 'es' ? 'Guardar en logros' : 'Store in achievements'}</p>
            <ul className="mt-2 space-y-1 text-sm text-[color:var(--color-text-muted)]">
              <li>• {language === 'es' ? 'Sale de seguimiento activo' : 'Leaves active tracking'}</li>
              <li>• {language === 'es' ? 'Permanece en la estantería' : 'Stays in shelf forever'}</li>
              <li>• {language === 'es' ? 'Sin generación de GP' : 'No GP generation'}</li>
            </ul>
            <button type="button" onClick={onStore} className="mt-3 w-full rounded-full border border-violet-300/50 bg-violet-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white">{language === 'es' ? 'Guardar en logros' : 'Store in achievements'}</button>
          </div>
        </div>
      </div>
    </div>
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
      <p className="text-xs text-[color:var(--color-slate-300)]">{language === 'es' ? 'Tus sellos ahora viven en la estantería de Rewards' : 'Your seals now live in your Rewards shelf'}</p>
    </div>
  );
}
