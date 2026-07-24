# Head of Content Context Builder

## Purpose

The builder converts a validated monthly CMO strategy and its original CMO context into the deterministic input for the Head of Content agent.

Output:

`marketing/agent-inputs/<YYYY-MM>/content-context.json`

It does not execute the Head of Content agent, generate campaign posts, upload assets, write to Neon, or publish content.

## Automated handoff model

Human approval is not required between the CMO and Head of Content during the routine monthly pipeline.

The builder accepts a CMO strategy only after both source artifacts exist, match the same period, and validate against their schemas. The generated Head of Content input records:

- `strategy.handoff_status: validated`;
- `strategy.handoff_authority: automated_marketing_pipeline`;
- the complete original CMO output under `strategy.cmo_output`;
- SHA-256 checksums for `cmo-context.json` and `cmo-strategy.json`;
- a source-manifest entry for the automated pipeline handoff.

The immutable source strategy is never rewritten or automatically marked approved. Its original `review_status` is preserved as evidence.

## CLI

From the repository root:

```bash
npx tsx apps/api/scripts/export-marketing-content-context.ts \
  --period=2026-07 \
  --force
```

Required inputs:

- `marketing/agent-inputs/<PERIOD>/cmo-context.json`
- `marketing/agent-outputs/<PERIOD>/cmo-strategy.json`

The CLI fails closed when an input is missing, malformed, belongs to another period, or has an ineligible CMO review status.

## GitHub Actions

Workflow:

`.github/workflows/marketing-content-context.yml`

Normal automatic flow:

1. Codex commits `marketing/agent-outputs/<PERIOD>/cmo-strategy.json` to `automation/marketing-cycle-<PERIOD>`.
2. The path-filtered GitHub workflow starts automatically.
3. It derives the period from the changed path and requires it to match the branch name.
4. It validates `cmo-context.json` and `cmo-strategy.json`.
5. It generates and validates `content-context.json`.
6. It commits and pushes the file to the same monthly branch.

Manual recovery remains available through `workflow_dispatch` with `period_key` and optional `force`. It does not represent human strategy approval; it only reruns the deterministic handoff.

The workflow does not open or merge a pull request.

The monthly branch is then ready for the scheduled Codex Head of Content agent.

## Derived configuration

- Campaign code: `ib_YYYYMM`
- Publishing window: full target calendar month
- Default tracking source: `instagram`
- Default tracking medium: `social`
- Base URL: approved `primaryUrl` from the asset/context manifest, falling back to `https://innerbloomjourney.org/`
- Formats: normalized from the CMO operational constraints
- Assets: copied from the validated CMO context

## Safety

- The builder does not invent analytics, assets, strategy decisions, or approval state.
- The source strategy and CMO context are read-only.
- Both source documents must validate before the handoff.
- Period and branch identity must agree.
- Input checksums are recorded for traceability and later idempotency.
- The output is validated against `head-of-content-input-v1.schema.json` before it is committed.
- Human review remains mandatory in Admin before publication.
- No PR to `main` is opened at this stage.
