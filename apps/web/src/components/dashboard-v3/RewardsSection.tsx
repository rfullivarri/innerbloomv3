import { useMemo } from 'react';
import { Card } from '../ui/Card';
import { ProgressBar } from '../common/ProgressBar';
import { useRequest } from '../../hooks/useRequest';
import { getAchievements, type Achievement } from '../../lib/api';

interface RewardsSectionProps {
  userId: string;
}

export function RewardsSection({ userId }: RewardsSectionProps) {
  const { data, status, error, reload } = useRequest(() => getAchievements(userId), [userId], {
    enabled: Boolean(userId),
  });

  const achievements = data?.achievements ?? [];

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
