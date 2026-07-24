# Campaign Draft Contract v1

**Status:** proposed and frozen for Phase 1; not yet enforced by production schema.

## Producer

Innerbloom Head of Content agent.

## Canonical path

`marketing/agent-outputs/<YYYY-MM>/campaign-draft.json`

## Consumer

Deterministic Creative Director context builder.

## Purpose

Represent the complete editorial campaign without renderer-specific implementation decisions.

## Required top-level sections

- `schema_version`;
- `agent`;
- `period_key`;
- `generated_at`;
- `provenance`;
- `campaign`;
- `campaign_execution_summary`;
- `posts`;
- `asset_requirements`;
- `campaign_quality_report`;
- `source_manifest`.

## Provenance

Must include:

- `source_branch`;
- `content_context_sha256`;
- `cmo_strategy_sha256`;
- `head_of_content_contract_version`.

## Campaign

Must contain:

- campaign code and title;
- objective;
- `status: review`;
- strategy summary;
- language and platforms;
- supported editorial formats;
- target post count;
- publishing start and end dates.

It must not contain a human-approval requirement for routine monthly generation.

## Posts

Each post must include:

- unique `post_code` and contiguous `sequence_number`;
- platform and format;
- `status: needs_review`;
- scheduled time;
- approved content pillar, funnel stage and experiment code;
- audience tension;
- product truth anchor;
- hook and caption;
- CTA;
- hypothesis and primary metric;
- tracking URL and UTM values;
- visible copy plan;
- semantic visual strategy;
- accessibility requirements;
- asset slots;
- carousel narrative and slide records when applicable.

## Semantic visual strategy

May specify:

- visual communication goal;
- proof type;
- product module or evidence needed;
- whether a screenshot is required, optional or forbidden;
- informational hierarchy;
- desired emotional/editorial character;
- truthful transformation constraints;
- forbidden uses;
- acceptance criteria.

Must not specify:

- exact renderer `layout_variant`;
- exact registered `selected_asset_keys`;
- palette enums owned by the renderer;
- exact device presentation;
- renderer visual-family enum;
- art-direction profile;
- generation order or batch number;
- local staging paths;
- exact renderer composition fields.

## Asset slots

Each planned final image or carousel slide must have one stable asset slot with:

- `asset_code`;
- owning `post_code`;
- asset kind;
- slide number when applicable;
- semantic purpose;
- product-evidence requirement;
- whether existing sources are preferred;
- whether new binary production may be required;
- alt text;
- acceptance criteria.

## Asset requirements

This section records unresolved production needs. It does not claim an asset exists.

Allowed requirement kinds:

- `reuse_existing_source`;
- `edit_existing_source`;
- `compose_existing_sources`;
- `new_source_required`.

A `new_source_required` entry is only a conditional request. It does not trigger or prove successful Asset Producer execution.

## Invariants

- total posts equals campaign target;
- tracking identifiers are unique;
- all dates are within the publishing window;
- all pillars and experiments come from the CMO strategy;
- every required visual output has a stable asset slot;
- all carousel slides have ordered narrative roles and visible copy;
- no renderer-specific decisions are present;
- no unsupported claim or invented product capability is present.