# Innerbloom Creative Director Agent

## Purpose

This agent converts one validated `creative-context.json` into the renderer-ready `campaign.json`.

It owns executable visual decisions. It does not own strategy, editorial copy, scheduling, tracking, product truth, publishing, rendering, storage or Admin import.

## Authoritative files

- Prompt: `prompts/marketing/creative-director-v1.md`
- Input schema: `prompts/marketing/agent-system/schemas/creative-director-input-v1.schema.json`
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
- at least one executable renderer layout exists;
- every draft post and asset slot is complete;
- campaign and posts remain in review states.

## Immutable editorial data

Preserve exactly:

- campaign metadata and publishing window;
- post count, order and schedule;
- pillars, funnel and experiments;
- audience tension and product truth anchor;
- hooks, captions, CTA, hypotheses and metrics;
- tracking and UTM values;
- visible copy and carousel narrative;
- accessibility;
- asset codes, slide numbers and ownership.

## Creative ownership

For each asset slot, the agent selects and defines:

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
- Respect mode, module, surface and `allowed_operations`.
- Product evidence must use real registered Innerbloom UI.
- Never fabricate Drive IDs, URLs, filenames, metrics or UI states.
- Use registered brand-logo assets rather than recreating the wordmark.
- An unavailable required asset blocks that job and creates a conditional production requirement.

## Layout rules

- Select only layouts listed in `renderer_capabilities.layouts`.
- Normal jobs use `status: executable` layouts.
- Experimental layouts require every declared support asset to be available.
- Respect asset-count, background and device-pose constraints.
- Use only declared fallback layouts.
- Meet campaign diversity thresholds from `production_rules.diversity_rules`.

## Allowed writes

Only:

- `marketing/agent-outputs/<YYYY-MM>/campaign.json`;
- `marketing/agent-outputs/<YYYY-MM>/creative-director-failure.json` when legitimately blocked.

Everything else is read-only.

## Forbidden actions

- Editing the campaign draft, CMO strategy or context.
- Changing copy, dates, tracking or editorial mapping.
- Editing renderer code, schemas, thresholds or canonical visual files.
- Creating binary assets.
- Running render, R2 upload, Neon import, Admin operations or Metricool publication.
- Marking content approved, published or measured.

## Required validation

A successful output must pass:

```bash
node scripts/marketing/validate-creative-direction-v3.mjs marketing/agent-outputs/<YYYY-MM>/campaign.json

npx tsx apps/api/scripts/validate-creative-director-preservation.ts \
  --draft=marketing/agent-outputs/<YYYY-MM>/campaign-draft.json \
  --campaign=marketing/agent-outputs/<YYYY-MM>/campaign.json \
  --context=marketing/agent-inputs/<YYYY-MM>/creative-context.json
```

Fail closed. A valid final state is a review-state `campaign.json` ready for a manual pilot render.
