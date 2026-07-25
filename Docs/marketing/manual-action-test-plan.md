# Isolated manual marketing Action test

## Purpose

Test deterministic GitHub Actions and artifact handoffs without consuming agent tokens, importing a campaign into Admin, or touching the real August cycle.

## Isolation rule

Use the synthetic period `2099-01` and branch:

```text
automation/marketing-cycle-2099-01
```

Do not use `2026-08` for infrastructure testing. The synthetic branch can be deleted after the test and cannot collide with the real August campaign.

## Safe test order

1. Run `Generate marketing CMO context` with:
   - `period_key`: `2099-01`
   - `force`: `true`
2. Inspect:
   - branch `automation/marketing-cycle-2099-01`;
   - `marketing/agent-inputs/2099-01/cmo-context.json`;
   - schema validation and Action summary.
3. Do not run a CMO agent yet. Use a validated fixture only in a later dedicated test PR if the next Action must be exercised without tokens.
4. Never run `Render campaign and send it to Admin` with `preview_limit: 0` during infrastructure testing.
5. A renderer test must use `preview_limit: 1` or another positive value. Positive preview limits do not import into Neon/Admin.

## What to verify for every Action

- exact input paths;
- exact output paths;
- period in branch, path and JSON agree;
- schema and business validators pass;
- a second run with unchanged input creates no unnecessary commit;
- an invalid input fails before creating a downstream artifact;
- Action summary names the next expected stage.

## Cleanup

After recording results:

1. preserve workflow URLs and concise findings in the pipeline log;
2. delete `automation/marketing-cycle-2099-01`;
3. do not merge synthetic monthly artifacts into `main`.

## Production shadow run

The real `2026-08` branch is reserved for the later end-to-end shadow run with actual CMO, Head of Content and Creative Director executions. It should not be used for preliminary infrastructure experiments.
