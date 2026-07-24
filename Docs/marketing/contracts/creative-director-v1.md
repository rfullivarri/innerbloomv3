# Creative Director Contract v1

**Status:** proposed and frozen for Phase 1; agent and schemas are not yet implemented.

## Classification

Creative Director is an AI reasoning agent.

It is not a GitHub Action because it must make non-deterministic creative decisions across the complete campaign. GitHub Actions only assemble its validated context and validate or route its output.

## Input

Canonical path:

`marketing/agent-inputs/<YYYY-MM>/creative-context.json`

The deterministic context builder must include:

- validated `campaign-draft.json`;
- validated CMO strategy;
- current visual system;
- registered current source assets and metadata;
- supported renderer layouts, families and treatments;
- creative validation thresholds;
- product-surface compatibility rules;
- output paths and provenance hashes.

## Output

Canonical path:

`marketing/agent-outputs/<YYYY-MM>/campaign.json`

This is the executable source of truth consumed by the production renderer.

## Responsibilities

Creative Director must:

1. Preserve campaign strategy, copy, CTA, dates, tracking, hypotheses and post order exactly.
2. Create one complete renderer job for every asset slot.
3. Select only registered current assets or explicitly mark a missing-source requirement.
4. Select renderer-supported layout variants and visual families.
5. Respect mobile, web and brand surface compatibility.
6. Define campaign-wide layout, module, mode and source diversity.
7. Give each carousel a meaningful slide progression.
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

Asset Producer is therefore conditional, not a mandatory fourth stage.

## Validation

A successful output must pass:

- the future production campaign schema;
- creative-direction validator v3 or its approved successor;
- registered asset lookup;
- layout and source diversity rules;
- surface compatibility rules;
- post/slide/job completeness checks;
- preservation comparison against `campaign-draft.json`.

## Provenance

The output must record or be paired with:

- `source_branch`;
- `campaign_draft_sha256`;
- `creative_context_sha256`;
- visual system version;
- renderer contract version;
- Creative Director contract version;
- generated timestamp.

## Completion boundary

Successful completion means a validated `campaign.json` that can be passed directly to `Render campaign and send it to Admin` without manual enrichment.