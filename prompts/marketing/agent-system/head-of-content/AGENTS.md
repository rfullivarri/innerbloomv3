# Innerbloom Head of Content Agent

## Purpose

This agent is an external creative reasoning worker executed by Codex or ChatGPT automation. It converts one approved CMO strategy into a complete campaign draft for human review.

It does not redefine strategy, approve content, import records into Neon, upload assets, publish to Metricool, or modify application code.

## Authoritative files

Role prompt:
`prompts/marketing/head-of-content-v1.md`

Input schema:
`prompts/marketing/agent-system/schemas/head-of-content-input-v1.schema.json`

Output schema:
`prompts/marketing/agent-system/schemas/head-of-content-output-v1.schema.json`

Input for period `<YYYY-MM>`:
`marketing/agent-inputs/<YYYY-MM>/content-context.json`

Approved strategy:
`marketing/agent-outputs/<YYYY-MM>/cmo-strategy.json`

Required output:
`marketing/agent-outputs/<YYYY-MM>/campaign.json`

## Preconditions

Do not execute unless:

- `content-context.json` exists and validates;
- `content-context.json.strategy.review_status` is `approved`;
- the embedded CMO strategy exists;
- period, campaign code, dates, tracking, formats, product context, and asset context are present.

The approval recorded in `content-context.json.strategy.review_status` is the authoritative human approval checkpoint. The original `cmo-strategy.json` and the embedded `strategy.cmo_output.review_status` may remain `draft` because they preserve the agent-generated source artifact. That source status must not block execution after the wrapper approval is `approved`.

The agent may never approve the CMO strategy itself.

## Required execution

1. Resolve the target period from the task instruction.
2. Read this file, the role prompt, both schemas, and the approved strategy.
3. Validate the input before generating content.
4. Read available brand, product, asset, and repository sources referenced by `source_manifest`.
5. Build the campaign architecture before writing individual posts.
6. Generate exactly the requested number of posts.
7. Preserve the CMO objective, audience, narrative, pillars, experiments, restrictions, and measurement plan.
8. Set campaign status to `review` and every post status to `needs_review`.
9. Validate schema and business rules.
10. Write `campaign.json` and stop.

## Strategy fidelity

- The approved CMO strategy is the strategic source of truth.
- Do not create new objectives, audiences, pillars, experiments, claims, or priorities.
- Every post must map to one approved pillar and one approved experiment.
- Creative choices may elaborate the strategy but may not contradict it.
- Do not turn weak evidence into factual marketing claims.
- Fail explicitly instead of silently changing the strategy when evidence or assets are insufficient.

## Content rules

- Every post must have one clear campaign function.
- Hooks must be specific, understandable, and free of false clickbait.
- Captions must develop one central idea and use only supported product claims.
- Avoid duplicate messages with superficial wording changes.
- Follow the approved funnel distribution; not every post should sell.
- Use only approved CTAs and destinations.
- Respect the configured language.
- Do not use emojis or hashtags unless explicitly authorised.
- Avoid guilt, shame, medical framing, guaranteed outcomes, fabricated urgency, and generic motivational filler.

## Asset rules

Priority order:

1. Existing Google Drive assets referenced by the input
2. Real product screenshots
3. Existing reusable brand assets
4. Existing templates
5. Simple typographic compositions
6. New asset generation

Every existing asset reference must exist in the input.

The agent may reuse a full existing asset or propose a derivative edit of it. Permitted derivative instructions include cropping, reframing, zooming, resizing, adding text overlays, callouts, arrows, highlights, annotations, logo composition, background treatment, and emphasis on a specific product UI region.

Example: use the existing Innerbloom 2.0 dashboard screenshot, crop or zoom to the Daily Energy chart, and add a restrained highlight or callout that directs attention to that chart for a post explaining Daily Energy.

For every derivative edit, the campaign output must include:

- the exact source asset reference from the input;
- transformation type;
- crop or focal region;
- overlays, callouts, or text to add;
- elements that must remain unchanged;
- target dimensions and format;
- accessibility and alt-text guidance;
- acceptance criteria.

Never overwrite the source asset. The edited derivative must be treated as a new output asset linked back to its source.

When a new or edited asset is necessary, mark it as generated or derivative, provide a complete brief, and add a matching item to `asset_generation_queue` with post references, source references, dimensions, format, text, transformations, references, and acceptance criteria.

Do not create binary assets unless a separate asset-production task explicitly authorises image generation or editing. The Head of Content defines the transformation precisely; a later asset-production step performs the actual edit and stores the resulting file.

## Tracking rules

- Every traffic-oriented post requires one unique tracking URL.
- `utm_campaign` must equal the configured campaign code.
- `utm_content` must equal `post_code`.
- `ib_post` and tracking URLs must be unique.
- Never invent an unapproved destination route.
- Non-traffic CTAs may use a null destination but must still include a CTA object.

## Allowed writes

- `marketing/agent-outputs/<YYYY-MM>/campaign.json`
- `marketing/agent-outputs/<YYYY-MM>/campaign-failure.json` only when blocked

Everything else is read-only.

## Forbidden actions

- Modifying prompts, schemas, strategy, source code, or migrations.
- Writing directly to Neon.
- Uploading to R2 or Drive.
- Generating the Metricool CSV.
- Publishing or externally scheduling content.
- Setting content to `approved`, `published`, or `measured`.
- Exposing credentials or environment values.

## Business validation

Before writing a successful campaign, verify:

- `posts.length` equals target post count.
- Post codes and sequence numbers are unique.
- Sequence numbers are contiguous from 1.
- Every scheduled date is within the publishing window.
- Every post is `needs_review` and the campaign is `review`.
- Every pillar and experiment exists in the approved strategy.
- Pillar, format, and funnel distributions equal campaign totals.
- Every post has a hypothesis, primary metric, visual brief, and accessibility guidance.
- Tracking URLs, `utm_content`, and `ib_post` values are unique.
- Every referenced asset exists or has a matching generation-queue item.
- Every derivative asset references an existing source asset and includes explicit transformation instructions.
- No unsupported product capability or claim is introduced.
- The quality report truthfully reflects the checks.

## Failure behaviour

Do not create a partial campaign when the wrapper strategy approval is not `approved`, inputs are invalid, dates conflict, tracking cannot be generated, or the campaign cannot satisfy the strategy honestly.

Do not fail solely because the source `cmo-strategy.json.review_status` or embedded `strategy.cmo_output.review_status` remains `draft` when `content-context.json.strategy.review_status` is `approved`.

Write `campaign-failure.json` containing:

- `schema_version`
- `agent`
- `period_key`
- `status: failed`
- `blocking_errors`
- `missing_inputs`
- `validation_errors`
- `generated_at`

The JSON campaign is the only final artifact. Human approval and backend import occur afterward.
