import { useMemo } from 'react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../common/ProgressBar';
import { useRequest } from '../../hooks/useRequest';
import { getAchievements, type Achievement, type WeeklyWrappedRecord } from '../../lib/api';
import type { WeeklyWrappedPayload } from '../../lib/weeklyWrapped';

interface RewardsSectionProps {
  userId: string;
  weeklyWrappedCurrent?: WeeklyWrappedRecord | null;
  weeklyWrappedPrevious?: WeeklyWrappedRecord | null;
  onOpenWeeklyWrapped?: (record?: WeeklyWrappedRecord | null) => void;
}

export function RewardsSection({
  userId,
  weeklyWrappedCurrent,
  weeklyWrappedPrevious,
  onOpenWeeklyWrapped,
}: RewardsSectionProps) {
  const { data, status, error, reload } = useRequest(() => getAchievements(userId), [userId], {
    enabled: Boolean(userId),
  });

  const achievements = data?.achievements ?? [];

  const weeklyWrappedItems = useMemo(() => {
    const items: { label: string; record: WeeklyWrappedRecord }[] = [];
    if (weeklyWrappedCurrent) {
      items.push({ label: 'Semana en curso', record: weeklyWrappedCurrent });
    }
    if (weeklyWrappedPrevious) {
      items.push({ label: 'Semana anterior', record: weeklyWrappedPrevious });
    }
    return items;
  }, [weeklyWrappedCurrent, weeklyWrappedPrevious]);

  const { unlockedCount, inProgressCount } = useMemo(() => {
    let unlocked = 0;
    let inProgress = 0;

    for (const achievement of achievements) {
      const target = Math.max(0, achievement.progress.target ?? 0);
      const current = Math.max(0, achievement.progress.current ?? 0);
      const isUnlocked = target === 0 ? current > 0 : current >= target;
      if (isUnlocked) {
        unlocked += 1;
      } else {
        inProgress += 1;
      }
    }

    return { unlockedCount: unlocked, inProgressCount: inProgress };
  }, [achievements]);

  const showSkeleton = status === 'idle' || status === 'loading';
  const showError = status === 'error';
  const showContent = status === 'success';

  return (
    <Card
      title="🎁 Rewards"
      subtitle="Seguimiento de logros, badges y recompensas desbloqueadas"
      rightSlot={
        <button
          type="button"
          onClick={reload}
          disabled={status === 'loading'}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/30 hover:text-white disabled:opacity-60"
        >
          Actualizar
        </button>
      }
      bodyClassName="gap-5"
    >
      {showSkeleton && <RewardsSkeleton />}

      {showError && (
        <div className="space-y-3 text-sm text-rose-200">
          <p>No pudimos cargar tus recompensas.</p>
          <button
            type="button"
            onClick={reload}
            className="inline-flex items-center gap-2 rounded-full border border-rose-300/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-100 transition hover:border-rose-200/70 hover:text-rose-50"
          >
            Reintentar
          </button>
          {error?.message && <p className="text-xs text-rose-200/70">{error.message}</p>}
        </div>
      )}

      {showContent && (
        <div className="space-y-5">
          <WeeklyWrappedShelf
            items={weeklyWrappedItems}
            onOpen={onOpenWeeklyWrapped}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <RewardsSummaryCard label="Completados" value={unlockedCount} accent="emerald" />
            <RewardsSummaryCard label="En progreso" value={inProgressCount} accent="sky" />
          </div>

          {achievements.length > 0 ? (
            <ul className="space-y-4">
              {achievements.map((achievement) => (
                <RewardsAchievementItem key={achievement.id} achievement={achievement} />
              ))}
            </ul>
          ) : (
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-300">
              <p>Todavía no desbloqueaste recompensas.</p>
              <p className="text-xs text-slate-400">
                Completá misiones y mantené tus streaks activos para sumar XP y alcanzar nuevos hitos.
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function RewardsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((key) => (
          <div key={key} className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-20 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
        ))}
      </div>
    </div>
  );
}

type WeeklyWrappedShelfProps = {
  items: { label: string; record: WeeklyWrappedRecord }[];
  onOpen?: (record?: WeeklyWrappedRecord | null) => void;
};

function WeeklyWrappedShelf({ items, onOpen }: WeeklyWrappedShelfProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_1px_12px_rgba(15,23,42,0.45)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">Weekly Wrapped</p>
          <p className="text-sm text-slate-200">Tus últimos resúmenes semanales</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <WeeklyWrappedCard key={item.record.id} label={item.label} record={item.record} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function WeeklyWrappedCard({
  label,
  record,
  onOpen,
}: {
  label: string;
  record: WeeklyWrappedRecord;
  onOpen?: (record?: WeeklyWrappedRecord | null) => void;
}) {
  const weeklyEmotion = record.payload.emotions.weekly ?? record.payload.emotions.biweekly;
  const pillarDominant = record.payload.summary.pillarDominant;
  const weekRangeLabel = formatWeekRange(record.payload).toUpperCase();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            {label}
          </p>
          <div className="shrink-0">
            <WeeklyChip icon="📅" label={weekRangeLabel} variant="accent" size="small" />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <WeeklyChip
            color={weeklyEmotion?.color}
            srLabel={weeklyEmotion?.label ?? 'Sin emoción dominante'}
          />
          {pillarDominant ? <WeeklyChip icon={getPillarIcon(pillarDominant)} variant="outline" /> : null}
        </div>
      </div>
      <button
        type="button"
        onClick={() => onOpen?.(record)}
        className="inline-flex items-center justify-center rounded-full border border-white/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition hover:-translate-y-0.5 hover:border-emerald-300/50 hover:bg-emerald-400/10 hover:text-emerald-50"
      >
        Ver detalles
      </button>
    </div>
  );
}

function WeeklyChip({
  icon,
  label,
  color,
  variant = 'neutral',
  size = 'default',
  srLabel,
}: {
  icon?: string | null;
  label?: string;
  color?: string;
  variant?: 'neutral' | 'accent' | 'outline';
  size?: 'default' | 'small';
  srLabel?: string;
}) {
  const palette =
    variant === 'accent'
      ? 'border-emerald-300/60 bg-emerald-400/10 text-emerald-50'
      : variant === 'outline'
        ? 'border-white/25 bg-white/5 text-white'
        : 'border-white/15 bg-white/5 text-white/80';

  const sizeClasses =
    size === 'small' ? 'gap-1 px-2 py-0.5 text-[8.5px]' : 'gap-2 px-3 py-1 text-[11px]';
  const iconClasses = size === 'small' ? 'text-[12px] leading-none' : 'text-base leading-none';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-[0.18em] ${palette} ${sizeClasses}`}
    >
      {icon ? (
        <span aria-hidden className={iconClasses}>
          {icon}
        </span>
      ) : null}
      {color ? <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /> : null}
      {label ? <span className="leading-none">{label}</span> : null}
      {srLabel ? <span className="sr-only">{srLabel}</span> : null}
    </span>
  );
}

function getEmotionEmoji(key?: string | null): string {
  if (!key) return '✨';
  const map: Record<string, string> = {
    felicidad: '✨',
    motivacion: '🔥',
    calma: '🧘',
    cansancio: '😴',
    ansiedad: '😰',
    tristeza: '😢',
    frustracion: '😤',
  };
  return map[key.toLowerCase()] ?? '✨';
}

function getPillarIcon(pillar?: string | null): string {
  const normalized = normalizePillar(pillar);
  if (!normalized) return '';
  const icons: Record<'Body' | 'Mind' | 'Soul', string> = {
    Body: '🫀',
    Mind: '🧠',
    Soul: '🌿',
  };
  return icons[normalized] ?? '';
}

function normalizePillar(value?: string | null): 'Body' | 'Mind' | 'Soul' | null {
  if (!value) return null;
  const normalized = value.toString().trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === 'body' || normalized === 'cuerpo' || normalized === '1') return 'Body';
  if (normalized === 'mind' || normalized === 'mente' || normalized === '2') return 'Mind';
  if (normalized === 'soul' || normalized === 'alma' || normalized === '3') return 'Soul';
  return null;
}

function formatWeekRange(payload: WeeklyWrappedPayload): string {
  const start = new Date(payload.weekRange.start);
  const end = new Date(payload.weekRange.end);
  return `${start.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })}`;
}

function RewardsAchievementItem({ achievement }: { achievement: Achievement }) {
  const { progress } = achievement;
  const target = Math.max(0, progress.target ?? 0);
  const current = Math.max(0, progress.current ?? 0);
  const pct = Math.min(100, Math.max(0, progress.pct ?? 0));
  const isUnlocked = target === 0 ? current > 0 : current >= target;
  const statusLabel = isUnlocked ? 'Desbloqueado' : 'En progreso';
  const unlockedDate = formatAchievementDate(achievement.earnedAt ?? achievement.unlockedAt ?? null);
  const detailLabel = isUnlocked
    ? unlockedDate
      ? `Alcanzado el ${unlockedDate}`
      : 'Nuevo logro desbloqueado'
    : `${Math.round(current)} / ${target} completado`;

  return (
    <li className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-[0_1px_12px_rgba(15,23,42,0.45)] md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span
            className={`flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl shadow-[0_0_12px_rgba(148,163,184,0.25)] ${
              isUnlocked ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100' : 'text-slate-200'
            }`}
          >
            {achievement.icon ? (
              <img
                src={achievement.icon}
                alt=""
                className="h-8 w-8 object-contain"
                loading="lazy"
              />
            ) : (
              <span role="img" aria-hidden>
                {isUnlocked ? '🏅' : '🎯'}
              </span>
            )}
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{achievement.name}</p>
            <p className="text-xs text-slate-400">{detailLabel}</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
            isUnlocked
              ? 'border-emerald-300/40 bg-emerald-400/15 text-emerald-100'
              : 'border-slate-500/40 bg-slate-800/60 text-slate-300'
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <ProgressBar value={pct} />

      {achievement.description ? (
        <p className="text-xs text-slate-400">{achievement.description}</p>
      ) : null}
    </li>
  );
}

const DATE_FORMATTER = new Intl.DateTimeFormat('es-AR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatAchievementDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return DATE_FORMATTER.format(parsed);
}

interface RewardsSummaryCardProps {
  label: string;
  value: number;
  accent: 'emerald' | 'sky';
}

function RewardsSummaryCard({ label, value, accent }: RewardsSummaryCardProps) {
  const accentClasses =
    accent === 'emerald'
      ? 'border-emerald-300/50 bg-emerald-400/10 text-emerald-100'
      : 'border-sky-400/40 bg-sky-400/10 text-sky-100';

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border ${accentClasses} p-4 shadow-[0_0_20px_rgba(8,47,73,0.35)] backdrop-blur`}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/70">{label}</span>
      <span className="text-2xl font-semibold text-white">{value}</span>
    </div>
  );
}
