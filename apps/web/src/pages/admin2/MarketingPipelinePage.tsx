import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from '../../lib/lucide-react';
import {
  fetchMarketingPipelineRuns,
  type MarketingPipelineRunRecord,
  type MarketingPipelineStageRecord,
  type MarketingPipelineStatus,
} from '../../lib/marketingPipeline';

const stageLabels: Record<string, string> = {
  cmo_context: 'Generate CMO context',
  cmo_agent: 'Run CMO agent',
  content_context: 'Generate Head of Content context',
  head_of_content_agent: 'Run Head of Content agent',
  creative_context: 'Generate Creative Director context',
  creative_director_agent: 'Run Creative Director agent',
  preview_render: 'Render preview campaign',
  full_render_admin: 'Render full campaign and import to Admin',
};

const statusLabels: Record<MarketingPipelineStatus, string> = {
  not_started: 'Not started',
  waiting: 'Waiting',
  running: 'In progress',
  completed: 'Succeeded',
  failed: 'Failed',
  blocked: 'Blocked',
  skipped: 'Skipped',
};

export function MarketingPipelinePage() {
  return <div className="mx-auto w-full max-w-[1500px] pb-16"><MarketingPipelinePanel /></div>;
}

export function MarketingPipelinePanel() {
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

  if (loading) return <LoadingPanel/>;

  return <section className="overflow-hidden rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)]">
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--admin-border)] px-5 py-4">
      <div>
        <h3 className="text-lg font-semibold">Marketing workflow runs</h3>
        <p className="mt-1 text-sm text-[color:var(--admin-muted)]">A GitHub Actions-style view of each deterministic Action and agent handoff.</p>
      </div>
      <div className="flex items-center gap-2">
        {runs.length ? <select value={selectedRun?.id ?? ''} onChange={(event) => { setSelectedRunId(event.target.value); setExpandedStages(new Set()); }} className="rounded-xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-3 py-2 text-sm">
          {runs.map((run) => <option key={run.id} value={run.id}>{run.periodKey} · attempt {run.attempt}</option>)}
        </select> : null}
        <button className="admin2-btn admin2-btn--ghost" onClick={() => void loadRuns()}>Refresh</button>
      </div>
    </div>

    {error ? <p className="m-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

    {!selectedRun ? <EmptyPanel/> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color:var(--admin-border)] bg-[color:var(--admin-surface-muted)] px-5 py-4">
        <div>
          <div className="flex items-center gap-2"><StatusIcon status={selectedRun.status}/><p className="font-semibold">{selectedRun.periodKey} marketing cycle</p></div>
          <p className="mt-1 text-xs text-[color:var(--admin-muted)]">{selectedRun.branchName} · attempt {selectedRun.attempt}</p>
        </div>
        <div className="text-right"><p className="text-sm font-semibold">{statusLabels[selectedRun.status]}</p><p className="mt-1 text-xs text-[color:var(--admin-muted)]">Updated {formatDate(selectedRun.updatedAt)}</p></div>
      </div>

      <div className="divide-y divide-[color:var(--admin-border)]">
        {selectedRun.stages.map((stage) => <StageRow
          key={stage.stageKey}
          stage={stage}
          expanded={expandedStages.has(stage.stageKey)}
          onToggle={() => toggleStage(stage.stageKey)}
        />)}
      </div>
    </>}
  </section>;
}

function StageRow({ stage, expanded, onToggle }: { stage: MarketingPipelineStageRecord; expanded: boolean; onToggle: () => void }) {
  const hasDetails = Boolean(stage.summary || stage.errorMessage || stage.logExcerpt || stage.inputPath || stage.outputPath || stage.executionReference);
  return <div>
    <button type="button" onClick={onToggle} disabled={!hasDetails} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[color:var(--admin-hover)] disabled:cursor-default disabled:hover:bg-transparent">
      <div className="flex min-w-0 items-center gap-3">
        <StatusIcon status={stage.status}/>
        <div className="min-w-0">
          <p className="truncate font-semibold">{stageLabels[stage.stageKey] ?? stage.stageKey}</p>
          <p className="mt-1 truncate text-xs text-[color:var(--admin-muted)]">{stage.executionKind.replace(/_/g, ' ')} · attempt {stage.attempt}{stage.startedAt ? ` · ${formatDate(stage.startedAt)}` : ''}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className="text-sm text-[color:var(--admin-muted)]">{durationLabel(stage)}</span>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(stage.status)}`}>{statusLabels[stage.status]}</span>
        {hasDetails ? expanded ? <ChevronUp size={17}/> : <ChevronDown size={17}/> : null}
      </div>
    </button>

    {expanded ? <div className="border-t border-[color:var(--admin-border)] bg-[#090d14] px-5 py-4 text-sm">
      <div className="grid gap-3 md:grid-cols-2">
        {stage.summary ? <Detail label="Result" value={stage.summary}/> : null}
        {stage.inputPath ? <Detail label="Input" value={stage.inputPath}/> : null}
        {stage.outputPath ? <Detail label="Output" value={stage.outputPath}/> : null}
        {stage.executionReference ? <Detail label="Execution" value={stage.executionReference}/> : null}
        {stage.inputSha256 ? <Detail label="Input hash" value={stage.inputSha256}/> : null}
        {stage.outputSha256 ? <Detail label="Output hash" value={stage.outputSha256}/> : null}
      </div>
      {stage.errorMessage ? <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-red-200"><p className="text-xs font-semibold uppercase tracking-wider">Error</p><p className="mt-1 whitespace-pre-wrap">{stage.errorMessage}</p></div> : null}
      {stage.logExcerpt ? <div className="mt-4"><p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">Logs</p><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black p-4 font-mono text-xs leading-5 text-slate-200">{stage.logExcerpt}</pre></div> : null}
    </div> : null}
  </div>;
}

function StatusIcon({ status }: { status: MarketingPipelineStatus }) {
  const symbol = status === 'completed' ? '✓' : status === 'failed' ? '×' : status === 'running' ? '●' : status === 'blocked' ? '!' : status === 'skipped' ? '−' : '○';
  return <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${iconClass(status)}`}>{symbol}</span>;
}

function Detail({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--admin-muted)]">{label}</p><p className="mt-1 break-all font-mono text-xs text-slate-200">{value}</p></div>; }
function LoadingPanel() { return <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-[color:var(--admin-border)] bg-[color:var(--admin-surface)]"><p className="text-sm text-[color:var(--admin-muted)]">Loading pipeline runs…</p></div>; }
function EmptyPanel() { return <div className="p-10 text-center"><h3 className="font-semibold">No workflow runs recorded yet</h3><p className="mx-auto mt-2 max-w-xl text-sm text-[color:var(--admin-muted)]">The timeline is ready. The next instrumentation change will write each Action and agent result here; until then this view stays empty rather than inventing status.</p></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
function durationLabel(stage: MarketingPipelineStageRecord) { if (!stage.startedAt) return '—'; const end = stage.completedAt ? new Date(stage.completedAt).getTime() : Date.now(); const seconds = Math.max(0, Math.round((end - new Date(stage.startedAt).getTime()) / 1000)); return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`; }
function iconClass(status: MarketingPipelineStatus) { return status === 'completed' ? 'border-emerald-500 bg-emerald-500 text-black' : status === 'running' ? 'border-blue-400 bg-blue-400/20 text-blue-300 animate-pulse' : status === 'failed' ? 'border-red-500 bg-red-500 text-black' : status === 'blocked' ? 'border-amber-400 bg-amber-400/20 text-amber-300' : 'border-slate-500 text-slate-400'; }
function badgeClass(status: MarketingPipelineStatus) { return status === 'completed' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : status === 'running' ? 'border-blue-500/40 bg-blue-500/10 text-blue-300' : status === 'failed' ? 'border-red-500/40 bg-red-500/10 text-red-300' : status === 'blocked' ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-[color:var(--admin-border)] text-[color:var(--admin-muted)]'; }
