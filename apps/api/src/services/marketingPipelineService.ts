import { pool } from '../db.js';

export type MarketingPipelineStageStatus =
  | 'not_started'
  | 'waiting'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'skipped';

export type MarketingPipelineStagePayload = {
  stageKey: string;
  position: number;
  status: MarketingPipelineStageStatus;
  attempt: number;
  executionKind: 'github_action' | 'codex_agent' | 'human_review';
  executionReference: string | null;
  inputPath: string | null;
  outputPath: string | null;
  inputSha256: string | null;
  outputSha256: string | null;
  summary: string;
  errorMessage: string;
  logExcerpt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

export type MarketingPipelineRunPayload = {
  id: string;
  periodKey: string;
  branchName: string;
  status: MarketingPipelineStageStatus;
  attempt: number;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  stages: MarketingPipelineStagePayload[];
};

type RunRow = {
  marketing_pipeline_run_id: string;
  period_key: string;
  branch_name: string;
  status: MarketingPipelineStageStatus;
  attempt: number;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  updated_at: Date | string;
};

type StageRow = {
  marketing_pipeline_run_id: string;
  stage_key: string;
  position: number;
  status: MarketingPipelineStageStatus;
  attempt: number;
  execution_kind: 'github_action' | 'codex_agent' | 'human_review';
  execution_reference: string | null;
  input_path: string | null;
  output_path: string | null;
  input_sha256: string | null;
  output_sha256: string | null;
  summary: string;
  error_message: string;
  log_excerpt: string;
  started_at: Date | string | null;
  completed_at: Date | string | null;
  updated_at: Date | string;
};

export async function listMarketingPipelineRuns(limit = 12): Promise<MarketingPipelineRunPayload[]> {
  const safeLimit = Math.max(1, Math.min(24, Math.trunc(limit)));
  const runs = await pool.query<RunRow>(
    `SELECT marketing_pipeline_run_id, period_key, branch_name, status, attempt,
            started_at, completed_at, updated_at
       FROM marketing_pipeline_runs
      ORDER BY period_key DESC, attempt DESC
      LIMIT $1`,
    [safeLimit],
  );

  if (runs.rows.length === 0) return [];

  const runIds = runs.rows.map((row) => row.marketing_pipeline_run_id);
  const stages = await pool.query<StageRow>(
    `SELECT marketing_pipeline_run_id, stage_key, position, status, attempt,
            execution_kind, execution_reference, input_path, output_path,
            input_sha256, output_sha256, summary, error_message, log_excerpt,
            started_at, completed_at, updated_at
       FROM marketing_pipeline_stages
      WHERE marketing_pipeline_run_id = ANY($1::uuid[])
      ORDER BY marketing_pipeline_run_id, position, attempt DESC`,
    [runIds],
  );

  const stagesByRun = new Map<string, MarketingPipelineStagePayload[]>();
  for (const row of stages.rows) {
    const items = stagesByRun.get(row.marketing_pipeline_run_id) ?? [];
    if (!items.some((item) => item.stageKey === row.stage_key)) {
      items.push({
        stageKey: row.stage_key,
        position: row.position,
        status: row.status,
        attempt: row.attempt,
        executionKind: row.execution_kind,
        executionReference: row.execution_reference,
        inputPath: row.input_path,
        outputPath: row.output_path,
        inputSha256: row.input_sha256,
        outputSha256: row.output_sha256,
        summary: row.summary,
        errorMessage: row.error_message,
        logExcerpt: row.log_excerpt,
        startedAt: toIso(row.started_at),
        completedAt: toIso(row.completed_at),
        updatedAt: toIso(row.updated_at)!,
      });
      stagesByRun.set(row.marketing_pipeline_run_id, items);
    }
  }

  return runs.rows.map((row) => ({
    id: row.marketing_pipeline_run_id,
    periodKey: row.period_key,
    branchName: row.branch_name,
    status: row.status,
    attempt: row.attempt,
    startedAt: toIso(row.started_at),
    completedAt: toIso(row.completed_at),
    updatedAt: toIso(row.updated_at)!,
    stages: (stagesByRun.get(row.marketing_pipeline_run_id) ?? []).sort((a, b) => a.position - b.position),
  }));
}

function toIso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}
