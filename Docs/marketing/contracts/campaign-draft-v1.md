# Campaign Draft Contract v1

**Status:** active Head of Content output contract  
**Schema:** `prompts/marketing/agent-system/schemas/campaign-draft-v1.schema.json`  
**Business validator:** `apps/api/scripts/validate-marketing-campaign-draft.ts`

## Producer

Innerbloom Head of Content agent.

## Canonical path

`marketing/agent-outputs/<YYYY-MM>/campaign-draft.json`

## Consumer

Deterministic Creative Director context builder, to be implemented in the next Phase 3 block.

The renderer, Asset Producer, R2 importer and Admin import must not consume this artifact directly.

## Purpose

Represent the complete editorial campaign without renderer-specific implementation decisions.

## Inputs

The Head of Content reads:

- validated `marketing/agent-inputs/<YYYY-MM>/content-context.json`;
- immutable `marketing/agent-outputs/<YYYY-MM>/cmo-strategy.json`;
- Head of Content input schema;
- canonical visual system;
- current product, brand and asset evidence referenced by the source manifest.

The validated content context supplies:

- period, campaign code, timezone, target count and publishing window;
- validated CMO handoff, source paths and SHA-256 identities;
- complete CMO output;
- brand positioning and content rules;
- product stage, changes, product evidence and approved claims;
- available asset registry/context;
- supported platforms and formats;
- publishing and review constraints;
- tracking base URL and UTM defaults.

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

- exact monthly `source_branch`;
- canonical content-context path and SHA-256;
- canonical CMO strategy path and SHA-256;
- `head_of_content_contract_version: campaign-draft-v1`.

## Campaign

Must contain:

- campaign code and title;
- objective;
- `status: review`;
- strategy summary;
- language and platforms;
- supported editorial formats;
- target post count;
- timezone;
- publishing start and end dates.

No human-approval field belongs in routine monthly output.

## Posts

Each post must include:

- unique `post_code` and contiguous `sequence_number`;
- platform and format;
- `status: needs_review`;
- scheduled time inside the campaign window;
- CMO-approved content pillar, funnel stage and experiment code;
- audience tension and product truth anchor;
- hook and caption;
- CTA;
- hypothesis and primary metric;
- tracking URL when applicable and complete UTM identity;
- visible copy plan;
- semantic visual strategy;
- accessibility requirements;
- one or more stable asset slots;
- complete carousel narrative and ordered slides when applicable.

## Semantic visual strategy

May specify:

- visual communication goal;
- proof type;
- semantic product module or evidence needed;
- whether a screenshot is required, optional or forbidden;
- informational hierarchy;
- desired emotional/editorial character;
- preferred dark/light/either mode;
- truthful transformation constraints;
- forbidden uses;
- acceptance criteria.

Must not specify:

- exact renderer `layout_variant`;
- exact registered `selected_asset_keys`;
- `creative_direction` or `art_direction`;
- renderer palette, visual-family or device-presentation enums;
- supporting treatment;
- generation order or batch number;
- local staging paths;
- expected binary output metadata;
- exact renderer composition fields.

## Asset slots

Each expected final visual or carousel slide has one stable slot with:

- globally unique `asset_code`;
- owning `post_code`;
- asset kind;
- slide number when applicable;
- semantic purpose;
- product-evidence requirement;
- whether existing sources are preferred;
- optional semantic source references;
- whether a new binary may conditionally be required;
- alt text;
- acceptance criteria.

A carousel must have exactly one asset slot per slide.

## Asset requirements

This section records unresolved source-production needs. It does not claim an asset exists.

Allowed kinds:

- `reuse_existing_source`;
- `edit_existing_source`;
- `compose_existing_sources`;
- `new_source_required`.

Every requirement must reference existing post and asset-slot codes.

## Validation layers

### Structural schema

```bash
npx tsx apps/api/scripts/validate-marketing-agent-json.ts \
  --schema=prompts/marketing/agent-system/schemas/campaign-draft-v1.schema.json \
  --input=marketing/agent-outputs/<YYYY-MM>/campaign-draft.json
```

### Cross-field business invariants

```bash
npx tsx apps/api/scripts/validate-marketing-campaign-draft.ts \
  --input=marketing/agent-outputs/<YYYY-MM>/campaign-draft.json
```

The business validator checks:

- target count and execution summaries;
- canonical period, campaign code, paths and branch;
- unique and contiguous post sequencing;
- publishing-window compliance;
- post and asset ownership;
- complete carousel structure;
- unique tracking identities;
- unique asset slots;
- requirement references;
- absence of renderer-owned fields;
- successful quality booleans.

## Invariants

- total posts equals campaign target;
- tracking identifiers are unique;
- all dates are within the publishing window;
- all pillars and experiments come from CMO strategy;
- every required visual output has a stable asset slot;
- all carousel slides have ordered narrative roles and visible copy;
- summaries equal the underlying posts and slots;
- no renderer-specific decisions are present;
- no unsupported claim or invented product capability is present;
- successful quality checks are all true.
