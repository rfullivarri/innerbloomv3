# Phase 3A — Head of Content to campaign draft

**Status:** implementation proposed in this branch  
**Scope:** only the Head of Content output boundary. Creative Director context and agent are not implemented here.

## Audited inputs

The active deterministic input is:

`marketing/agent-inputs/<YYYY-MM>/content-context.json`

validated by:

`prompts/marketing/agent-system/schemas/head-of-content-input-v1.schema.json`

It provides:

1. **Period contract**
   - period key;
   - canonical campaign code;
   - timezone;
   - target post count;
   - publishing window.
2. **Validated CMO handoff**
   - pipeline authority and timestamp;
   - original CMO review status;
   - canonical context and strategy paths;
   - SHA-256 identities;
   - complete CMO output.
3. **Brand context**
   - objective;
   - positioning;
   - content rules;
   - language;
   - final human-review policy.
4. **Product context**
   - product stage;
   - known product changes;
   - product pages and totals;
   - approved claim source.
5. **Available assets**
   - current asset registry and source evidence inherited from CMO context.
6. **Operational constraints**
   - supported platforms and editorial formats;
   - carousel and asset limits;
   - publishing method and public storage;
   - calendar and review rules.
7. **Tracking defaults**
   - base URL;
   - UTM source and medium;
   - campaign code;
   - additional identifiers.
8. **Source manifest**
   - traceable evidence used to construct the context.

The immutable original CMO artifact remains an independent input:

`marketing/agent-outputs/<YYYY-MM>/cmo-strategy.json`

The agent must verify period and strategic consistency. It must not mutate or approve it.

## Problems in the previous output contract

The prior `head-of-content-output-v1.schema.json` was too permissive and mixed responsibilities:

- major nested objects allowed unspecified structures;
- post visual briefs were not structurally defined;
- carousel narrative and slide ownership were not guaranteed;
- provenance and source SHA identities were absent;
- cross-field counts and tracking uniqueness were not validated;
- asset ownership and requirement references were not validated;
- it allowed the Head of Content artifact to be confused with renderer-ready `campaign.json`;
- it did not prohibit fields later manually added for the renderer.

The successful July `campaign.json` contains renderer-owned enrichment such as exact asset selections, layout variants, creative direction and art direction. Those decisions do not belong to Head of Content.

## New successful output

Canonical path:

`marketing/agent-outputs/<YYYY-MM>/campaign-draft.json`

Structural schema:

`prompts/marketing/agent-system/schemas/campaign-draft-v1.schema.json`

Business validator:

`apps/api/scripts/validate-marketing-campaign-draft.ts`

The output is editorially complete and contains:

- source provenance;
- campaign metadata and publishing window;
- exact post count and summaries;
- complete post copy, strategy mapping, hypotheses, metrics and tracking;
- visible copy plans;
- semantic visual strategies;
- accessibility;
- stable asset slots;
- complete carousel narratives and slides;
- conditional asset-source requirements;
- explicit quality checks and known risks.

## Explicit non-output

The Head of Content must not produce:

- production `campaign.json`;
- exact registered asset selection;
- renderer layout variants;
- creative or art direction objects;
- renderer visual-family, device, palette or treatment enums;
- generation ordering, batching or staging paths;
- binary output metadata;
- claims that an asset was produced.

## Validation model

A successful output must pass two independent layers.

### JSON Schema

Checks all required sections, field types, enums, ownership shape, carousel conditional structure and absence of undeclared properties.

### Business validator

Checks:

- canonical branch, paths, period and campaign code;
- exact target post count;
- unique post codes and contiguous sequence numbers;
- schedule inside publishing window;
- campaign/post status;
- UTM consistency and uniqueness;
- unique global asset slots and slot ownership;
- one slot per carousel slide;
- summary counts against source arrays;
- valid asset-requirement references;
- absence of renderer-owned keys anywhere in the document;
- named quality checks all true.

## Compatibility policy

The existing `head-of-content-output-v1.schema.json` is not deleted in this change because current renderer/Asset Producer history may still reference it. It becomes a legacy production-campaign schema and is no longer authoritative for Head of Content.

No workflow is changed to render `campaign-draft.json`. That would be unsafe. The next Phase 3 block must create the deterministic Creative Director context and later the Creative Director agent that produces the production `campaign.json`.

## Definition of done

This phase is complete when:

- Head of Content instructions reference only `campaign-draft.json`;
- the strict schema exists;
- the cross-field validator exists;
- documentation reflects the ownership boundary;
- CI confirms TypeScript and schema validity;
- a representative draft fixture passes both validators before Codex scheduling is enabled.
