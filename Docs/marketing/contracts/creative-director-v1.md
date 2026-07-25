# Creative Director Contract v1

**Status:** implemented foundation; context builder, input schema, agent prompt and preservation validator are active. Codex execution and production pilot remain pending.

## Classification

Creative Director is an AI reasoning agent. It is not a GitHub Action because it makes non-deterministic creative decisions across the complete campaign. GitHub Actions only assemble its validated context and validate or route its output.

## Canonical implementation

- Builder: `apps/api/scripts/export-marketing-creative-context.ts`
- Input schema: `prompts/marketing/agent-system/schemas/creative-director-input-v1.schema.json`
- Prompt: `prompts/marketing/creative-director-v1.md`
- Agent contract: `prompts/marketing/agent-system/creative-director/AGENTS.md`
- Handoff workflow: `.github/workflows/marketing-creative-context.yml`
- Preservation validator: `apps/api/scripts/validate-creative-director-preservation.ts`

## Input

Canonical path:

`marketing/agent-inputs/<YYYY-MM>/creative-context.json`

The deterministic context builder includes:

- validated `campaign-draft.json` as immutable editorial source;
- validated CMO strategy and approved product truths;
- current visual system;
- current registered source assets and metadata;
- supported renderer layouts, device poses and treatments;
- creative validation thresholds;
- output paths and provenance hashes.

## Output

Canonical path:

`marketing/agent-outputs/<YYYY-MM>/campaign.json`

This is the executable source of truth consumed by the production renderer.

## Responsibilities

Creative Director must:

1. Preserve campaign strategy, copy, CTA, dates, tracking, hypotheses and post order exactly.
2. Create one complete renderer job for every asset slot.
3. Select only current registered assets or explicitly report a missing-source requirement.
4. Select renderer-supported layout variants and visual families.
5. Respect mobile, web, brand and product-surface compatibility.
6. Define campaign-wide layout, module, mode and source diversity.
7. Give each carousel a meaningful visual progression.
8. Produce complete creative directions accepted by the production validator.
9. Keep campaign status `review` and every post `needs_review`.
10. Report blocking gaps rather than inventing assets, UI, data or capabilities.

## Renderer-level output requirements

Each image job must include:

- stable `asset_code` and owning post;
- slide number where applicable;
- canvas and safe area;
- exact visible copy inherited from the draft;
- product truth anchor;
- selected source assets with registered metadata;
- expected output metadata;
- complete `creative_direction`.

`creative_direction` must use current renderer enums and include, where applicable:

- status;
- visual family;
- layout variant;
- mode;
- palette;
- device presentation;
- wordmark treatment;
- composition intent;
- selected asset keys;
- focal instruction;
- supporting visual;
- supporting treatment;
- screen fit;
- art direction;
- zoom relationship;
- acceptance criteria.

## Forbidden changes

Creative Director must not change:

- CMO objectives or priorities;
- post count;
- copy, hooks or CTA;
- dates or tracking;
- pillar, funnel or experiment mapping;
- product truth anchors;
- post review statuses;
- registered source metadata;
- renderer code, prompts, schemas or validation thresholds.

## Asset Producer handoff

If all required source binaries exist, output `campaign.json` ready for render and do not invoke Asset Producer.

If a source binary is genuinely missing:

- mark the affected job blocked from final render;
- create a structured conditional production requirement;
- do not fabricate a Drive ID, URL or asset key;
- allow independent jobs to remain valid;
- stop before claiming the complete campaign is render-ready.

Asset Producer is conditional, not a mandatory fourth stage.

## Validation

A successful output must pass:

- `scripts/marketing/validate-creative-direction-v3.mjs`;
- `apps/api/scripts/validate-creative-director-preservation.ts`;
- registered asset lookup;
- layout and source diversity rules;
- surface compatibility rules;
- post, slide and job completeness checks.

## Provenance

The creative context records:

- source branch;
- campaign draft SHA-256;
- CMO strategy and content-context SHA-256;
- visual system SHA-256;
- asset registry SHA-256;
- layout specification SHA-256;
- Creative Director contract version;
- generated timestamp.

## Completion boundary

Foundation completion means the deterministic context and agent contract are ready for Codex configuration.

Agent completion means a validated `campaign.json` that can be passed to a manual `preview_limit: 1` render pilot. Automatic full rendering remains outside this change.
