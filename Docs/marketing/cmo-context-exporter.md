# CMO Context Exporter

## Purpose

The CMO context exporter builds the deterministic input file for the marketing CMO agent:

`marketing/agent-inputs/<YYYY-MM>/cmo-context.json`

It does not call OpenAI, Codex, GA4, Search Console, R2, Drive, Metricool, or any other external service. It only reads persisted repository files and database state, normalizes the context, validates it with AJV, and writes the JSON atomically.

## Architecture

- Service: `apps/api/src/services/marketingCmoContextService.ts`
- CLI: `apps/api/scripts/export-marketing-cmo-context.ts`
- JSON validator: `apps/api/scripts/validate-marketing-agent-json.ts`
- Admin endpoint: `POST /admin/marketing/agents/cmo/context`
- Status endpoint: `GET /admin/marketing/agents/cmo/context/status?periodKey=YYYY-MM`
- Schema: `prompts/marketing/agent-system/schemas/cmo-input-v1.schema.json`
- GitHub workflow: `.github/workflows/marketing-cmo-context.yml`

The reusable service is the source of truth. The CLI, admin handler, and GitHub workflow call the same service.

## Sources

The exporter reads:

- Strategy memory from `Docs/marketing/strategy-memory.md` when present, otherwise `Docs/marketing/STRATEGY_MEMORY.md`.
- Recent persisted marketing campaigns and post metrics from Neon through `marketingCampaignService`.
- Persisted analytics from the real marketing analytics tables:
  - `marketing_analytics_sync_runs`
  - `marketing_insights`
  - `marketing_ga4_page_metrics`
  - `marketing_ga4_source_metrics`
  - `marketing_ga4_event_metrics`
  - `marketing_gsc_query_page_metrics`
  - `marketing_analytics_settings`
- Repository marketing assets under `Docs/marketing`, `apps/web/public/marketing`, and `assest visuales`.
- Documented service defaults such as Europe/Madrid timezone, a monthly capacity fallback of 20 posts, and a recent campaign limit of 12 campaigns.

The exporter uses `getPersistedMarketingAnalyticsContextForPeriod` from `apps/api/src/services/marketingAnalyticsService.ts`. It requires a completed persisted run that exactly matches the previous-period date window. It does not trigger a new GA4 or Search Console sync.

## CLI

From the repository root:

```bash
tsx apps/api/scripts/export-marketing-cmo-context.ts --period=2026-07
```

To overwrite an existing file:

```bash
tsx apps/api/scripts/export-marketing-cmo-context.ts --period=2026-07 --force
```

## Endpoint

```http
POST /admin/marketing/agents/cmo/context
Content-Type: application/json

{
  "periodKey": "2026-07",
  "force": false
}
```

The route is mounted under `/api` as well, so `/api/admin/marketing/agents/cmo/context` is also valid in the current app.

The response returns status, output path, periods, and source summaries. It does not return the full context.

## GitHub Actions workflow

The workflow is named `Generate marketing CMO context` and lives at:

`.github/workflows/marketing-cmo-context.yml`

It is the recommended production path because GitHub Actions checks out the complete repository, can read the strategy and schema files outside `apps/api`, can connect to Neon through a repository secret, and can version the generated context in a pull request.

### Required repository secret

Create an Actions repository secret named:

`DATABASE_URL`

Use the same Neon connection string consumed by the API. The workflow checks that the secret exists without printing its value.

### Manual execution

In GitHub, open:

`Actions` → `Generate marketing CMO context` → `Run workflow`

Inputs:

- `period_key`: required target period in `YYYY-MM` format.
- `force`: rebuild an existing context file.
- `open_pull_request`: create or update the period pull request. When false, the workflow still uploads the generated JSON as a temporary workflow artifact.

For `period_key = 2026-07`, the exporter analyses the completed persisted analytics run for June 2026.

### Scheduled execution

The workflow runs monthly on day 1 at `06:15 UTC`. It resolves the current month using the `Europe/Madrid` timezone and analyses the previous calendar month.

### Branch and pull request

The workflow never writes directly to `main`.

For `2026-07` it uses:

- Branch: `automation/marketing-cmo-context-2026-07`
- Pull request title: `chore(marketing): CMO context 2026-07`
- Commit message: `chore(marketing): generate CMO context for 2026-07`

Only files under `marketing/agent-inputs/2026-07/` are added to the automated commit. Re-running the workflow updates the same branch and pull request. If the generated file is unchanged, the workflow does not create an empty commit.

### Workflow validation

Before opening the pull request, the workflow:

1. installs dependencies with `npm ci`;
2. typechecks the API;
3. runs the focused analytics, exporter, and admin route tests;
4. generates the context from persisted Neon data;
5. verifies that the file exists;
6. validates it again with AJV using `validate-marketing-agent-json.ts`;
7. uploads the JSON as a 30-day workflow artifact;
8. opens or updates the review pull request.

No CMO or Head of Content agent is executed by this workflow.

## Period Handling

For `periodKey = 2026-07`:

- `current_period` is `2026-07`.
- `previous_period` is `2026-06`.
- The analytics window covers the full previous month in `Europe/Madrid`.
- The UTC bounds are calculated from Madrid local month boundaries, not from the server timezone.

## Force Behavior

If the output file already exists and `force` is false, the service returns `already_exists` and does not query or rewrite sources.

If `force` is true, the context is rebuilt, validated, serialized, written to a temporary file, and renamed to `cmo-context.json`.

## Validation

The service and reusable validator validate the generated object with AJV against:

`prompts/marketing/agent-system/schemas/cmo-input-v1.schema.json`

Manual validator example:

```bash
npx tsx apps/api/scripts/validate-marketing-agent-json.ts \
  --schema=prompts/marketing/agent-system/schemas/cmo-input-v1.schema.json \
  --input=marketing/agent-inputs/2026-07/cmo-context.json
```

If validation fails, the final file is not written. The error includes AJV paths and messages without dumping the complete context.

## Expected Errors

- `invalid_period_key`: the requested period is not `YYYY-MM`.
- `marketing_analytics_run_missing`: no completed persisted analytics run exists for the previous period.
- `marketing_analytics_run_not_completed`: a run exists for the previous period but is still running or failed.
- `cmo_context_schema_invalid`: generated context failed schema validation.
- `already_exists`: not an error; the file already exists and `force` was false.
- Missing `DATABASE_URL` secret: the GitHub workflow stops before dependency execution or database access.

## Next Work

- Add richer structured business configuration if marketing objectives, product stage, and audience move out of docs/campaign records into a dedicated table.
- Add Metricool performance ingestion once it is no longer manual.
- Add an explicit audience field to strategy memory or structured marketing settings when audience targeting becomes stable enough to encode.
- After reviewing and merging a generated context PR, configure the scheduled CMO agent task to consume the versioned JSON.
