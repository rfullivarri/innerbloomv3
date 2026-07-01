# Head of Content Context Builder

## Purpose

The builder converts an approved monthly CMO strategy and its original CMO context into the deterministic input for the Head of Content agent.

Output:

`marketing/agent-inputs/<YYYY-MM>/content-context.json`

It does not execute the Head of Content agent, generate campaign posts, upload assets, write to Neon, or publish content.

## Human approval model

The CMO strategy remains `review_status: draft` in its source artifact. Human approval is recorded by manually running the `Generate Head of Content context` workflow and checking the approval confirmation input.

The generated Head of Content input contains:

- `strategy.review_status: approved`;
- the complete original CMO output under `strategy.cmo_output`;
- a source-manifest entry for the workflow-dispatch approval.

The source strategy is never modified automatically.

## CLI

From the repository root:

```bash
npx tsx apps/api/scripts/export-marketing-content-context.ts \
  --period=2026-07 \
  --approve-strategy \
  --force
```

Required inputs:

- `marketing/agent-inputs/<PERIOD>/cmo-context.json`
- `marketing/agent-outputs/<PERIOD>/cmo-strategy.json`

The CLI refuses to run without `--approve-strategy`.

## GitHub Actions

Workflow:

`.github/workflows/marketing-content-context.yml`

Manual flow:

1. Open **Actions**.
2. Select **Generate Head of Content context**.
3. Enter the approved strategy period.
4. Check the strategy-approval confirmation.
5. Run the workflow.

The workflow:

1. checks out `automation/marketing-cycle-<PERIOD>`;
2. merges the current `main` into the monthly branch;
3. validates the CMO strategy;
4. generates and validates `content-context.json`;
5. commits and pushes the file to the same monthly branch;
6. does not open or merge a pull request.

The monthly branch is then ready for Codex Head of Content.

## Derived configuration

- Campaign code: `ib_YYYYMM`
- Publishing window: full target calendar month
- Default tracking source: `instagram`
- Default tracking medium: `social`
- Base URL: approved `primaryUrl` from the asset/context manifest, falling back to `https://innerbloomjourney.org/`
- Formats: normalized from the CMO operational constraints
- Assets: copied from the validated CMO context

## Safety

- The builder does not invent analytics or assets.
- The source strategy and CMO context are read-only.
- Human approval is mandatory.
- The output is validated against `head-of-content-input-v1.schema.json` before it is committed.
- No PR to `main` is opened at this stage.
