# Innerbloom Creative Director Agent

## Purpose

This agent converts one validated `creative-context.json` into the renderer-ready `campaign.json` consumed unchanged by `Render campaign and send it to Admin`.

It owns executable visual decisions. It does not own strategy, editorial copy, scheduling, tracking, product truth, publishing, rendering, storage or Admin import.

## Authoritative files

- Prompt: `prompts/marketing/creative-director-v1.md`
- Input schema: `prompts/marketing/agent-system/schemas/creative-director-input-v1.schema.json`
- Output schema: `prompts/marketing/agent-system/schemas/creative-director-output-v1.schema.json`
- Input: `marketing/agent-inputs/<YYYY-MM>/creative-context.json`
- Editorial source: `marketing/agent-outputs/<YYYY-MM>/campaign-draft.json`
- Output: `marketing/agent-outputs/<YYYY-MM>/campaign.json`
- Failure output: `marketing/agent-outputs/<YYYY-MM>/creative-director-failure.json`
- Renderer validator: `scripts/marketing/validate-creative-direction-v3.mjs`
- Preservation validator: `apps/api/scripts/validate-creative-director-preservation.ts`

## Preconditions

Do not execute unless:

- the creative context validates;
- the embedded draft period and branch match the target period;
- all provenance paths and SHA-256 values are present;
- at least one current approved asset exists;
- at least one executable `renderer_layout` exists;
- every draft post and asset slot is complete;
- campaign and posts remain in review states.

## Required production shape

The only valid renderer job collection is:

```text
campaign.image_generation.jobs[]
```

Do not write `campaign.image_jobs` or root-level `jobs`.

There must be exactly one job per draft `asset_slot`, with no missing or extra jobs.

Every job must preserve its slot identity and contain:

- `asset_code`, `post_code`, `asset_kind` and optional `slide_number`;
- owning post platform and format;
- 1080x1080 canvas;
- exact visible copy and product truth;
- complete registered `source_assets` metadata;
- canonical `expected_output` metadata;
- renderer-complete `creative_direction`.

## Immutable editorial data

Preserve exactly:

- campaign metadata, timezone and publishing window;
- post count, order and schedule;
- pillars, funnel and experiments;
- audience tension and product truth anchor;
- hooks, captions, CTA, hypotheses and metrics;
- tracking and UTM values;
- visible copy and carousel narrative;
- accessibility;
- asset codes, slide numbers and ownership.

## Creative ownership

For each asset slot, select and define:

- registered source assets;
- executable layout;
- visual family;
- mode and compatible palette;
- device presentation;
- composition intent;
- supporting visual and treatment;
- focal instruction;
- screen fit;
- art direction;
- acceptance criteria;
- expected output metadata required by the current renderer contract.

## Asset rules

- Select only keys included in `current_assets.assets`.
- Copy each selected source asset object exactly from the registry into the job's `source_assets`.
- Every `selected_asset_keys` value must exist in that same job's `source_assets`.
- Respect mode, module, surface and `allowed_operations`.
- Product evidence must use real registered Innerbloom UI.
- Never fabricate Drive IDs, URLs, filenames, metrics or UI states.
- Use registered brand-logo assets rather than recreating the wordmark.
- An unavailable required asset blocks that job and creates a conditional production requirement.

## Layout rules

- `layout_key` is reference/planning metadata.
- `renderer_layout` is the executable enum.
- Set `creative_direction.layout_variant` to an exact declared `renderer_layout`.
- Never substitute `layout_key` unless it is literally identical to `renderer_layout`.
- Experimental layouts require every declared support asset.
- Respect asset counts, backgrounds, device poses and declared fallbacks.
- Meet campaign diversity thresholds from `production_rules.diversity_rules`.

## Canonical expected output

For each slot `<asset_code>`:

```text
filename: <asset_code>.png
local_staging_path: marketing/agent-outputs/<YYYY-MM>/generated-assets/<asset_code>.png
mime_type: image/png
width: 1080
height: 1080
```

## Allowed writes

Only:

- `marketing/agent-outputs/<YYYY-MM>/campaign.json`;
- `marketing/agent-outputs/<YYYY-MM>/creative-director-failure.json` when legitimately blocked.

Everything else is read-only.

## Forbidden actions

- Editing the campaign draft, CMO strategy or context.
- Changing copy, dates, tracking or editorial mapping.
- Adding, dropping or duplicating renderer jobs.
- Editing renderer code, schemas, thresholds or canonical visual files.
- Creating binary assets.
- Running render, R2 upload, Neon import, Admin operations or Metricool publication.
- Marking content approved, published or measured.

## Required validation

A successful output must pass all three:

```bash
npx tsx apps/api/scripts/validate-marketing-agent-json.ts \
  --schema=prompts/marketing/agent-system/schemas/creative-director-output-v1.schema.json \
  --input=marketing/agent-outputs/<YYYY-MM>/campaign.json

node scripts/marketing/validate-creative-direction-v3.mjs \
  marketing/agent-outputs/<YYYY-MM>/campaign.json

npx tsx apps/api/scripts/validate-creative-director-preservation.ts \
  --draft=marketing/agent-outputs/<YYYY-MM>/campaign-draft.json \
  --campaign=marketing/agent-outputs/<YYYY-MM>/campaign.json \
  --context=marketing/agent-inputs/<YYYY-MM>/creative-context.json
```

Fail closed. A valid final state is a review-state `campaign.json` whose structure and fields are accepted directly by the existing render workflow.