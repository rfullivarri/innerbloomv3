import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from '../../lib/lucide-react';
import {
  fetchMarketingPipelineRuns,
  type MarketingPipelineRunRecord,
  type MarketingPipelineStageRecord,
  type MarketingPipelineStatus,
} from '../../lib/marketingPipeline';

const stageLabels: Record<string, string> = {
  cmo_context: 'CMO context',
  cmo_agent: 'CMO agent',
  content_context: 'Head of Content context',
  head_of_content_agent: 'Head of Content agent',
  creative_context: 'Creative Director context',
  creative_director_agent: 'Creative Director agent',
  preview_render: 'Preview render',
  full_render_admin: 'Full render and Admin import',
};

const statusLabels: Record<MarketingPipelineStatus, string> = {
  not_started: 'Not started',
  waiting: 'Waiting',
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  blocked: 'Blocked',
  skipped: 'Skipped',
};

export function MarketingPipelinePage() {
  const [runs, setRuns] = useState<MarketingPipelineRunRecord[]>([]);
  const [selectedRunId, setSelectedRunId] = useState('');
  const [expandedStages, setExpandedStages] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedRun = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? runs[0] ?? null,
    [runs, selectedRunId],
  );

  useEffect(() => { void loadRuns(); }, []);

  async function loadRuns() {
    setLoading(true);
    try {
      const result = await fetchMarketingPipelineRuns();
      setRuns(result.runs);
      setSelectedRunId((current) => current || result.runs[0]?.id || '');
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load marketing pipeline.');
    } finally {
      setLoading(false);
    }
  }

  function toggleStage(stageKey: string) {
    setExpandedStages((current) => {
      const next = new Set(current);
      next.has(stageKey) ? next.delete(stageKey) : next.add(stageKey);
      return next;
    });
  }

  return <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 pb-16">
    <header className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--admin-muted)]">Marketing operations</p>
          <h2 className="mt-1 text-2xl font-semibold">Automation pipeline</h2>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--admin-muted)]">Stages, attempts, artifacts and concise failure details for each monthly marketing run.</p>
        </div>
        <div className="flex items-center gap-2">
          {runs.length ? <select value={selectedRun?.id ?? ''} onChange={(event) => { setSelectedRunId(event.target.value); setExpandedStages(new Set()); }} className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-sm">
            {runs.map((run) => <option key={run.id} value={run.id}>{run.periodKey} · attempt {run.attempt}</option>)}
          </select> : null}
          <button className="admin2-btn admin2-btn--ghost" onClick={() => void loadRuns()} disabled={loading}>{loading ? 'Loading' : 'Refresh'}</button>
        </div>
      </div>
      {error ? <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
    </header>

    {loading ? <LoadingPanel/> : !selectedRun ? <EmptyPanel/> : <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Period" value={selectedRun.periodKey}/>
        <Stat label="Run status" value={statusLabels[selectedRun.status]}/>
        <Stat label="Attempt" value={selectedRun.attempt}/>
        <Stat label="Updated" value={formatDate(selectedRun.updatedAt)}/>
      </section>

      <section className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-5">
        <div className="mb-5">
          <h3 className="font-semibold">{selectedRun.branchName}</h3>
          <p className="mt-1 text-sm text-[color:var(--admin-muted)]">Expand a stage to inspect inputs, outputs, hashes and the concise error excerpt.</p>
        </div>
        <div className="space-y-0">
          {selectedRun.stages.map((stage, index) => <StageRow
            key={stage.stageKey}
            stage={stage}
            expanded={expandedStages.has(stage.stageKey)}
            last={index === selectedRun.stages.length - 1}
            onToggle={() => toggleStage(stage.stageKey)}
          />)}
        </div>
      </section>
    </>}
  </div>;
}

function StageRow({ stage, expanded, last, onToggle }: { stage: MarketingPipelineStageRecord; expanded: boolean; last: boolean; onToggle: () => void }) {
  const hasDetails = Boolean(stage.summary || stage.errorMessage || stage.logExcerpt || stage.inputPath || stage.outputPath || stage.executionReference);
  return <div className="relative pl-10">
    {!last ? <div className="absolute left-[11px] top-7 h-full w-px bg-[color:var(--admin-border)]"/> : null}
    <span className={`absolute left-0 top-4 h-6 w-6 rounded-full border-4 border-[color:var(--admin-surface)] ${dotClass(stage.status)}`}/>
    <button type="button" onClick={onToggle} disabled={!hasDetails} className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-4 text-left hover:bg-[color:var(--admin-hover)] disabled:cursor-default disabled:hover:bg-transparent">
      <div>
        <p className="font-semibold">{stageLabels[stage.stageKey] ?? stage.stageKey}</p>
        <p className="mt-1 text-xs text-[color:var(--admin-muted)]">{stage.executionKind.replace(/_/g, ' ')} · attempt {stage.attempt}{stage.startedAt ? ` · ${formatDate(stage.startedAt)}` : ''}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(stage.status)}`}>{statusLabels[stage.status]}</span>
        {hasDetails ? expanded ? <ChevronUp size={17}/> : <ChevronDown size={17}/> : null}
      </div>
    </button>
    {expanded ? <div className="mb-4 ml-3 space-y-3 rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] p-4 text-sm">
      {stage.summary ? <Detail label="Summary" value={stage.summary}/> : null}
      {stage.inputPath ? <Detail label="Input" value={stage.inputPath}/> : null}
      {stage.outputPath ? <Detail label="Output" value={stage.outputPath}/> : null}
      {stage.inputSha256 ? <Detail label="Input hash" value={stage.inputSha256}/> : null}
      {stage.outputSha256 ? <Detail label="Output hash" value={stage.outputSha256}/> : null}
      {stage.executionReference ? <Detail label="Execution" value={stage.executionReference}/> : null}
      {stage.errorMessage ? <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200"><p className="text-xs font-semibold uppercase tracking-wider">Error</p><p className="mt-1 whitespace-pre-wrap">{stage.errorMessage}</p></div> : null}
      {stage.logExcerpt ? <div><p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Log excerpt</p><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-xs">{stage.logExcerpt}</pre></div> : null}
    </div> : null}
  </div>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{label}</p><p className="mt-1 break-all">{value}</p></div>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-4"><p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{label}</p><p className="mt-2 text-lg font-semibold">{value}</p></div>; }
function LoadingPanel() { return <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)]"><p className="text-sm text-[color:var(--admin-muted)]">Loading pipeline runs…</p></div>; }
function EmptyPanel() { return <div className="rounded-2xl border border-dashed border-[color:var(--admin-border)] bg-[color:var(--admin-surface)] p-10 text-center"><h3 className="font-semibold">No marketing pipeline runs recorded yet</h3><p className="mx-auto mt-2 max-w-xl text-sm text-[color:var(--admin-muted)]">The next instrumentation PR will connect GitHub Actions and agent handoffs to this timeline. No status is inferred from partial files, so the Admin does not invent progress.</p></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function dotClass(status: MarketingPipelineStatus) { return status === 'completed' ? 'bg-emerald-400' : status === 'running' ? 'bg-blue-400 animate-pulse' : status === 'failed' ? 'bg-red-400' : status === 'blocked' ? 'bg-amber-400' : status === 'skipped' ? 'bg-slate-500' : 'bg-[color:var(--admin-border)]'; }
function badgeClass(status: MarketingPipelineStatus) { return status === 'completed' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : status === 'running' ? 'border-blue-500/40 bg-blue-500/10 text-blue-300' : status === 'failed' ? 'border-red-500/40 bg-red-500/10 text-red-300' : status === 'blocked' ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-[color:var(--admin-border)] text-[color:var(--admin-muted)]'; }
