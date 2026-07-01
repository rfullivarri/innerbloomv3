# CMO Context Exporter

## Purpose

The CMO context exporter builds the deterministic input file for the marketing CMO agent:

`marketing/agent-inputs/<YYYY-MM>/cmo-context.json`

It does not call OpenAI, Codex, GA4, Search Console, R2, Drive, Metricool, or any other external service. It only reads persisted repository files and database state, normalizes the context, validates it with AJV, and writes the JSON atomically.

## Architecture

- Service: `apps/api/src/services/marketingCmoContextService.ts`
- CLI: `apps/api/scripts/export-marketing-cmo-context.ts`
- Admin endpoint: `POST /admin/marketing/agents/cmo/context`
- Status endpoint: `GET /admin/marketing/agents/cmo/context/status?periodKey=YYYY-MM`
- Schema: `prompts/marketing/agent-system/schemas/cmo-input-v1.schema.json`

The reusable service is the source of truth. The CLI and admin handler only parse inputs and call the service.

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

The service validates the generated object with AJV against:

`prompts/marketing/agent-system/schemas/cmo-input-v1.schema.json`

If validation fails, the final file is not written. The error includes AJV paths and messages, without dumping the full context.

## Expected Errors

- `invalid_period_key`: the requested period is not `YYYY-MM`.
- `marketing_analytics_run_missing`: no completed persisted analytics run exists for the previous period.
- `marketing_analytics_run_not_completed`: a run exists for the previous period but is still running or failed.
- `cmo_context_schema_invalid`: generated context failed schema validation.
- `already_exists`: not an error; the file already exists and `force` was false.

## Next Work

- Add richer structured business configuration if marketing objectives, product stage, and audience move out of docs/campaign records into a dedicated table.
- Add Metricool performance ingestion once it is no longer manual.
- Add an explicit audience field to strategy memory or structured marketing settings when audience targeting becomes stable enough to encode.
