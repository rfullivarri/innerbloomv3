import type { Pillar } from '../../lib/api';

interface PillarCardProps {
  pillar: Pillar;
}

const pillarGlyph: Record<string, string> = {
  body: '🫀',
  mind: '🧠',
  soul: '🕊️'
};

export function PillarCard({ pillar }: PillarCardProps) {
  const key = pillar.name?.toLowerCase() ?? '';
  const emoji = pillarGlyph[key] ?? '✨';
  const score = pillar.score ?? pillar.progress ?? null;
  const xp = pillar.totalXp ?? pillar.xp ?? null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-surface-highlight/60 p-4">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{emoji}</span>
        {score != null ? (
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-text-muted">
            {Math.round(score)}% balanced
          </span>
        ) : (
          <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-text-muted">tracking</span>
        )}
      </div>
      <div>
        <h3 className="font-display text-lg text-white">{pillar.name}</h3>
        <p className="text-sm text-text-subtle">{pillar.description || 'Stay consistent to unlock insights.'}</p>
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2 text-xs text-text-muted">
        {xp != null ? <span className="rounded bg-white/5 px-2 py-1">{xp} XP</span> : <span className="rounded bg-white/5 px-2 py-1">XP syncing…</span>}
        {pillar.focusAreas?.length ? (
          <span className="truncate">Focus: {pillar.focusAreas.join(', ')}</span>
        ) : (
          <span className="truncate text-text-subtle">Focus calibrating…</span>
        )}
      </div>
    </div>
  );
}
