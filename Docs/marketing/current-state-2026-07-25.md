# Marketing automation current state

**Audit date:** 2026-07-25  
**Repository baseline:** `main` after PRs #2327, #2329, #2331, #2333 and #2335  
**Purpose:** record the implemented artifact chain, distinguish merged code from proven runtime behavior, and identify the next release gates.

## 1. Intended end-to-end chain

```text
raw analytics, product context and history
→ GitHub Action: Generate marketing CMO context
→ cmo-context.json
→ Codex Cloud agent: CMO
→ cmo-strategy.json
→ GitHub Action: Generate Head of Content context
→ content-context.json
→ Codex Cloud agent: Head of Content
→ campaign-draft.json
→ GitHub Action: Generate Creative Director context
→ creative-context.json
→ Codex Cloud agent: Creative Director
→ campaign.json
→ GitHub Action: Render campaign and send it to Admin
→ verified R2 assets + Neon/Admin needs_review campaign
→ human review and publication workflow
```

The architectural separation is coherent: GitHub Actions perform deterministic collection, validation, handoff and rendering; the three agents perform strategy, editorial and creative reasoning.

## 2. Implemented repository stages

| Stage | Status | Evidence / output |
|---|---|---|
| Generate CMO context | Implemented and scheduled | `.github/workflows/marketing-cmo-context.yml` writes `marketing/agent-inputs/<period>/cmo-context.json` on `automation/marketing-cycle-<period>` |
| CMO agent contract | Implemented in repository | prompt, `AGENTS.md`, input/output schemas and canonical output path exist |
| CMO → Head of Content handoff | Implemented | push of `cmo-strategy.json` triggers `.github/workflows/marketing-content-context.yml` |
| Generate Head of Content context | Implemented | validates CMO artifacts and writes `content-context.json` |
| Head of Content contract | Implemented | produces strict `campaign-draft.json`; renderer-owned fields are forbidden |
| Draft strategy/product fidelity | Implemented | draft validator checks period, objective, pillars, experiments, product truth refs, assets and claims against source artifacts |
| Draft → Creative Director handoff | Implemented | push of `campaign-draft.json` triggers `.github/workflows/marketing-creative-context.yml` |
| Generate Creative Director context | Implemented | packages immutable draft, strategy, product truths, visual system, asset registry, layouts, renderer capabilities and hashes |
| Creative Director contract | Implemented | prompt and schemas require renderer-ready `campaign.json` with `image_generation.jobs[]` |
| Creative output preservation | Implemented | validator requires one renderer job per draft asset slot and exact editorial preservation |
| Renderer compatibility contract | Implemented in CI | Creative output schema and existing `validate-creative-direction-v3.mjs` are exercised by contract CI |
| Render → R2 → Admin | Existing and unchanged | manual workflow renders, quality-gates, uploads/verifies R2 and imports full campaigns to Admin as `needs_review` |

## 3. What is not yet proven or automated

### 3.1 Codex Cloud schedules are not repository behavior

The repository contains contracts for the CMO, Head of Content and Creative Director, but account-level Codex Cloud schedules still need to be configured and tested. Until those schedules exist, the reasoning stages do not run automatically.

Each scheduled agent must:

1. discover pending work on `automation/marketing-cycle-*` branches;
2. validate its input before reasoning;
3. skip work whose output already matches the current input;
4. avoid concurrent duplicate work per period;
5. validate output before commit;
6. commit to the exact monthly branch and canonical path;
7. write a failure artifact rather than partial success when blocked.

### 3.2 The renderer workflow remains manual

`Render campaign and send it to Admin` is currently `workflow_dispatch` only. A valid Creative Director commit does not automatically start rendering.

This is a deliberate safety boundary today, but it means the full monthly chain is not yet hands-free. The future automatic trigger must react only to a validated production `campaign.json` on the matching monthly branch and must preserve manual dispatch for recovery and pilot runs.

### 3.3 No full shadow run has demonstrated the complete chain

Contract CI proves representative structures and validators. It does not prove an actual monthly run across:

```text
scheduled CMO
→ scheduled Head of Content
→ scheduled Creative Director
→ preview render
→ full render
→ R2 public verification
→ Neon import
→ Admin review state
```

A shadow run is the next major release gate.

### 3.4 Pipeline persistence, observability and notifications are not implemented

There is no persistent per-period pipeline model recording all stages, attempts, hashes, failures and recovery actions in Neon/Admin. GitHub summaries and artifacts exist, but they are not a unified operational control plane.

Missing capabilities include:

- pipeline run and stage records;
- append-only transition/error events;
- Admin status timeline;
- links to GitHub/Codex executions;
- idempotency and retry visibility;
- failure and ready-for-review notifications.

## 4. Errors and incongruences found

### 4.1 CMO output schema remains materially under-specified

`cmo-output-v1.schema.json` requires `strategy.content_pillars` and `experiments`, but their items are generic objects. It does not structurally require the fields consumed downstream, including stable pillar codes, experiment codes, experiment-to-pillar mappings and primary metrics.

The Head of Content fidelity validator will fail closed later if these fields are missing, so data corruption is unlikely. However, a malformed CMO strategy can pass the CMO schema and fail only at a later stage. This should be hardened before treating the monthly run as reliable.

Recommended correction:

- define strict pillar and experiment schemas;
- introduce a stable objective code separate from human-readable objective text;
- validate experiment/pillar references inside the CMO artifact itself;
- add negative fixtures at the CMO contract boundary.

### 4.2 The implementation plan document is stale

`Docs/marketing/automation-implementation-plan.md` still states that only Phase 1 is complete and that no workflows, prompts or schemas have changed. That is no longer true. This audit supersedes its current-status sections; the phase plan itself remains useful as the intended rollout order.

### 4.3 GitHub Action pushes do not recursively trigger other Actions

The current design is safe only because an external agent commits each reasoning output:

- CMO commit triggers content context;
- Head of Content commit triggers creative context;
- Creative Director commit will eventually trigger render.

A context committed by a GitHub Action using `GITHUB_TOKEN` must not be expected to trigger the next GitHub workflow. Any future orchestration must preserve the external-agent boundary or explicitly use an approved alternative trigger mechanism.

### 4.4 Automatic render trigger requires stronger preflight than the current manual workflow

Before automatic rendering is enabled, the render workflow should validate:

- branch equals `automation/marketing-cycle-<period>`;
- file path period, JSON period and campaign code agree;
- Creative Director output schema passes;
- preservation validator passes against draft and creative context;
- source hashes correspond to the current monthly inputs;
- campaign status remains `review`;
- no prior successful full import exists for the same idempotency key.

The current renderer already validates the semantic creative contract and rendered quality, but the manual workflow does not currently execute the new output schema or preservation validator.

### 4.5 Asset Producer is optional but its runtime junction is not implemented

The architecture correctly keeps Asset Producer outside the happy path. The Creative Director may write a failure artifact when required source evidence is unavailable, but there is not yet a deterministic queue/manifest handoff that invokes Asset Producer and returns validated assets to the same monthly cycle.

This is not blocking for campaigns fully supported by the current registry. It becomes blocking when a campaign requires a genuinely missing asset.

### 4.6 Historical schema remains in the repository

`head-of-content-output-v1.schema.json` remains for compatibility/history while the active output is `campaign-draft-v1.schema.json`. This is acceptable during rollout, but active references should be audited after the shadow run and obsolete contracts archived or clearly marked to prevent accidental reuse.

## 5. Current phase assessment

| Phase | Assessment |
|---|---|
| Phase 1 — audit/contracts | Complete, but status documentation was stale |
| Phase 2 — automated CMO handoff | Implemented; real scheduled-agent run still unproven |
| Phase 3 — Head of Content draft | Implemented with strong fidelity validation |
| Phase 4 — Creative Director | Repository foundation and renderer contract implemented; real agent output and render compatibility still require a shadow run |
| Phase 5 — persistence/logs | Not implemented |
| Phase 6 — Admin observability | Not implemented |
| Phase 7 — notifications | Not implemented |
| Phase 8 — complete orchestration | Partially implemented; agent schedules and automatic validated render trigger missing |
| Phase 9 — shadow run | Not executed |
| Phase 10 — legacy cleanup | Must not begin yet |
| Phase 11 — Codex schedules | Not configured/proven |

## 6. Recommended next execution order

### Step 1 — Harden the CMO output contract

Small PR: strict pillars, experiments, stable objective code and fail-closed fixtures. This moves failures to the correct boundary.

### Step 2 — Configure the three Codex Cloud scheduled agents

Configure CMO, Head of Content and Creative Director discovery and commit behavior exactly as documented. Keep their schedules within a short monthly window and make every run idempotent.

### Step 3 — Run an isolated semantic shadow cycle

Use a non-production period/campaign code and prove:

```text
cmo-context → cmo-strategy → content-context → campaign-draft → creative-context → campaign.json
```

Validate every artifact and compare hashes/paths before rendering.

### Step 4 — Run a preview render

Invoke the existing renderer with a non-zero preview limit. Confirm asset staging, renderer compatibility, layout compilation and quality gate without modifying Admin.

### Step 5 — Run one full isolated import

Use a unique campaign code, render all jobs, verify R2, import into Admin as `needs_review`, and perform human inspection.

### Step 6 — Add automatic validated render handoff

Only after the shadow run passes, add a path-aware trigger for Creative Director `campaign.json`. Keep manual dispatch as recovery and preview entry point.

### Step 7 — Add persistence and Admin observability

Persist pipeline/stage/event records and expose truthful status before declaring the process production autonomous.

### Step 8 — Add notifications, then clean legacy

Notify failures and final readiness. Remove old contracts and unused paths only after observable production evidence confirms they are not needed.

## 7. Current verdict

The artifact architecture is coherent and the repository now contains the complete contractual path from CMO input through a renderer-compatible Creative Director output. The downstream renderer/Admin system remains intact.

The system is **contract-complete through Creative Director but not operationally autonomous or end-to-end proven**. The immediate engineering risk is no longer the renderer interface; it is orchestration reliability, the permissive CMO schema, missing operational observability and the absence of a real shadow run.