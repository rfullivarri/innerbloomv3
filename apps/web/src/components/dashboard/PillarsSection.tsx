import { Card } from '../common/Card';
import { Skeleton } from '../common/Skeleton';
import { useRequest } from '../../hooks/useRequest';
import { getPillars } from '../../lib/api';
import { PillarCard } from './PillarCard';

export function PillarsSection() {
  const { data, status, error, reload } = useRequest(getPillars, []);

  return (
    <Card
      title="Body · Mind · Soul"
      subtitle="Balance your efforts across the three pillars"
      action={
        <button
          type="button"
          onClick={reload}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-text hover:bg-white/10"
        >
          Refresh
        </button>
      }
    >
      {status === 'loading' && (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <Skeleton key={idx} className="h-40 w-full" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3 text-sm text-rose-300">
          <p>Couldn’t load your pillars. Balance will be back soon.</p>
          <button
            type="button"
            onClick={reload}
            className="rounded-md border border-rose-400/40 px-3 py-1 text-xs font-semibold text-rose-200 hover:border-rose-200/70"
          >
            Try again
          </button>
          <p className="text-xs text-text-subtle">{error?.message}</p>
        </div>
      )}

      {status === 'success' && data && data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {data.map((pillar) => (
            <PillarCard key={pillar.id} pillar={pillar} />
          ))}
        </div>
      )}

      {status === 'success' && (!data || data.length === 0) && (
        <div className="space-y-2 text-sm text-text-subtle">
          <p>Pillars are configuring for this account.</p>
          <p className="text-xs text-text-muted">Once your base is confirmed we will show Body · Mind · Soul insights.</p>
        </div>
      )}
    </Card>
  );
}
