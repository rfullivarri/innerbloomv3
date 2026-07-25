import { apiAuthorizedFetch } from './api';

export type MarketingPipelineStatus =
  | 'not_started'
  | 'waiting'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'skipped';

export type MarketingPipelineStageRecord = {
  stageKey: string;
  position: number;
  status: MarketingPipelineStatus;
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

export type MarketingPipelineRunRecord = {
  id: string;
  periodKey: string;
  branchName: string;
  status: MarketingPipelineStatus;
  attempt: number;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
  stages: MarketingPipelineStageRecord[];
};

export async function fetchMarketingPipelineRuns(limit = 12) {
  const response = await apiAuthorizedFetch(`/admin/marketing/pipeline/runs?limit=${encodeURIComponent(String(limit))}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Marketing pipeline request failed with HTTP ${response.status}`);
  return response.json() as Promise<{ ok: boolean; runs: MarketingPipelineRunRecord[] }>;
}
