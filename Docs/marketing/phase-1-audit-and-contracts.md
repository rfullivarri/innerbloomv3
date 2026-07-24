# Phase 1 — Marketing agent audit and contract freeze

**Status:** completed audit; implementation not started  
**Verified against:** `main` at `84c4f9e451230033e136f77bca0d97c423e69e07`  
**Purpose:** freeze the responsibilities, artifacts, active consumers, and migration boundaries required before changing production workflows.

## 1. Executive decision

The target system has three reasoning agents and deterministic GitHub handoffs:

```text
CMO agent
cmo-context.json -> cmo-strategy.json

Head of Content agent
content-context.json -> campaign-draft.json

Creative Director agent
creative-context.json -> campaign.json

GitHub renderer pipeline
campaign.json -> rendered media -> R2 -> Neon -> Admin
```

The final production `campaign.json` is not merely a content calendar. It is the executable creative contract consumed by the renderer and its validators. Therefore Head of Content must not own its renderer-specific fields.

## 2. Current artifact reality

### CMO

Current contract is coherent:

- input: `marketing/agent-inputs/<PERIOD>/cmo-context.json`;
- output: `marketing/agent-outputs/<PERIOD>/cmo-strategy.json`;
- responsibility: evidence analysis and monthly strategy;
- does not create posts or renderer instructions.

### Head of Content

Current declared output is `campaign.json`, but the declared schema and agent instructions describe an editorial campaign artifact rather than the full executable renderer contract.

The current Head of Content output schema requires:

- campaign identity and publishing window;
- posts, captions, CTA, tracking and hypotheses;
- visual briefs;
- semantic asset requirements;
- an optional asset production queue.

It does not define the complete renderer fields proven necessary by the July production campaign.

### July production campaign

`marketing/agent-outputs/2026-07/campaign.json` contains two layers mixed into one file:

1. editorial/content decisions;
2. renderer-specific creative direction.

Renderer-specific data includes, among other fields:

- `image_generation.jobs`;
- canvas and expected output information;
- exact source asset records;
- `creative_direction.status`;
- `visual_family`;
- `layout_variant`;
- `selected_asset_keys`;
- mode and palette;
- device presentation;
- supporting treatments;
- optional material-scene art direction;
- acceptance criteria used by the creative validator.

The July file therefore exceeds the current Head of Content output schema and reflects later creative enrichment.

## 3. Active consumer map

### Production-critical

| Artifact or field | Active consumer | Classification |
|---|---|---|
| `cmo-context.json` | CMO agent | active |
| `cmo-strategy.json` | content-context builder and Head of Content | active |
| `content-context.json` | Head of Content | active, currently human-gated |
| post copy, tracking, dates and asset codes | import and Admin pipeline | active |
| `image_generation.jobs` | staging, renderer and validators | active |
| `creative_direction` | renderer v3 and creative validator v3 | active |
| registered `source_assets` | Drive staging and renderer | active |
| rendered files and `r2-manifest.json` | R2 verification and Neon importer | active |

### Optional or recovery

| Component | Decision |
|---|---|
| Asset Producer agent | optional exception path only when a required source binary does not already exist |
| R2 repair workflows | emergency recovery only |
| manual workflow dispatch | recovery and test override only |

### Legacy candidates — do not delete during Phase 1

- earlier renderer/reference scripts without a confirmed production consumer;
- inline/base64 import paths superseded by verified R2 manifest import;
- documentation that describes manual Upload R2 as the normal path;
- Asset Producer assumptions that it is mandatory for every campaign;
- contracts that allow Head of Content to be interpreted as the renderer-level Creative Director.

Deletion requires a separate reference audit and an end-to-end replacement test.

## 4. Contract boundary: Head of Content

Head of Content owns editorial intent and campaign structure.

It must produce `campaign-draft.json` containing:

- campaign identity, objective, language and publishing window;
- complete ordered post list;
- format, schedule and status;
- pillar, funnel stage and experiment mapping;
- audience tension and product truth anchor;
- hook, caption and CTA;
- hypothesis, primary metric and tracking;
- visible copy plan;
- carousel narrative and slide-level copy where applicable;
- semantic visual strategy;
- asset slots and production needs;
- accessibility requirements;
- quality and data-gap reports;
- source manifest and provenance hashes.

Head of Content must not select:

- exact renderer layout variants;
- exact registered asset keys;
- exact palettes or device treatments;
- renderer-specific supporting treatments;
- art-direction profiles;
- batch numbers or generation order;
- local output paths;
- renderer prompts whose semantics duplicate executable layout configuration.

## 5. Contract boundary: Creative Director

Creative Director is a reasoning agent, not a GitHub Action.

It receives a deterministic `creative-context.json` built from:

- validated `campaign-draft.json`;
- current registered assets and their metadata;
- current visual system;
- renderer capabilities and supported layout catalog;
- creative validation limits;
- product surface compatibility rules;
- current CMO strategy and source provenance.

It produces the production `campaign.json` consumed without manual enrichment by the renderer.

Creative Director owns:

- one render job per required asset or slide;
- mapping between post asset slots and image jobs;
- exact approved source asset selection;
- surface-compatible presentation;
- layout and visual-family selection;
- mode, palette, framing and device treatment;
- focal instruction and supporting treatment;
- campaign-wide visual diversity;
- slide-to-slide progression;
- renderer acceptance criteria;
- conditional asset-production requirements.

It must preserve all Head of Content copy, strategy, dates, tracking and post structure.

## 6. Asset Producer decision

Asset Producer is not part of the default successful path.

Default path:

```text
campaign.json with approved existing sources
-> deterministic renderer
-> R2
-> Neon
```

Conditional path:

```text
Creative Director identifies a genuinely missing binary source
-> asset production request
-> Asset Producer or approved production mechanism
-> registered produced source
-> campaign render
```

The current Asset Producer contract is incompatible with this target in several ways:

- it assumes it always runs after Head of Content;
- it updates `campaign.json` directly;
- it stores final binaries in Drive before render;
- it creates a PR and expects a pre-merge human-era branch workflow.

It must be redesigned or archived later. It must not be deleted in Phase 1.

## 7. Approval boundary decision

Routine monthly production must not require human approval between agents.

Required future change:

- remove `approve_strategy` as an operational requirement;
- replace `human_workflow_dispatch` with a traceable automated pipeline authorization;
- retain fail-closed validation;
- keep all generated posts as `needs_review`;
- preserve the first mandatory human checkpoint in Admin before export/publication.

This change belongs to Phase 2, not Phase 1.

## 8. Provenance and idempotency requirements

Every agent artifact must record or be paired with:

- period key;
- source branch;
- input artifact SHA-256;
- relevant contract/schema version;
- generated timestamp;
- agent identity;
- output validation status.

A scheduled agent must do nothing when a valid output already exists for the same input hash.

## 9. Proposed artifacts

### `campaign-draft.json`

Canonical path:

`marketing/agent-outputs/<PERIOD>/campaign-draft.json`

Producer: Head of Content.

Consumer: deterministic creative-context builder.

### `creative-context.json`

Canonical path:

`marketing/agent-inputs/<PERIOD>/creative-context.json`

Producer: GitHub Action or deterministic repository script.

Consumer: Creative Director.

### `campaign.json`

Canonical path remains:

`marketing/agent-outputs/<PERIOD>/campaign.json`

Producer: Creative Director.

Consumer: `Render campaign and send it to Admin` and all production validators.

## 10. Phase 1 acceptance criteria

Phase 1 is complete when:

- the three-agent boundary is documented;
- July is recorded as an enriched executable campaign, not proof of the current Head of Content contract;
- active consumers are identified;
- Asset Producer is classified as conditional and incompatible with the default target path;
- the new artifact names and ownership are frozen;
- no production workflow, schema, prompt, database or renderer behavior has changed.

## 11. Next phase

Phase 2 removes the human strategy approval gate and introduces automated, traceable authorization for generating `content-context.json`.

No implementation of Phase 2 should begin until this audit is reviewed and merged.