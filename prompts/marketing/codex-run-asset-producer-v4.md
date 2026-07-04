# Codex Desktop Run Prompt — Asset Producer V4

Copy this prompt into Codex Desktop while your local repo is checked out on the monthly marketing branch.

```txt
STOP any current Asset Producer run before starting this.
Delete or ignore any files already generated in marketing/agent-outputs/2026-07/generated-assets/ from the previous run.

Run Innerbloom Asset Producer V4 for period 2026-07.

Your task is to generate final local image files, not to compose placeholder cards.

Read:
- prompts/marketing/asset-producer-v4.md
- prompts/marketing/agent-system/asset-producer/AGENTS-v4.md
- marketing/agent-outputs/2026-07/campaign.json

Use only marketing/agent-outputs/2026-07/campaign.json as the campaign source of truth.

Do not read content-context.json.
Do not read cmo-strategy.json.
Do not read upstream strategy/context/memory files.

Process image_generation.jobs[] in generation_order.

Critical visual rules:
- Use actual image generation/editing capability. Do not substitute Python/Pillow/SVG/HTML/Canvas composition for image generation.
- If only programmatic composition is available, stop and report BLOCKED instead of creating images.
- Do not create background-only assets for later text overlay. Each output must be the final complete social image.
- Do not use the old outlined flower logo.
- Do not use apps/web/public/IB-B-cont-logo.png.
- Use the current approved logo asset only when a logo is needed: approved_logo_primary_png / IB_NEW_LOGO1.png, or approved_logo_primary_512_png / IB_NEW_LOGO1 512.png.
- Do not use beige/green wellness-card styling.
- Do not use generic botanical stationery styling.
- Use Innerbloom v2 direction: premium product-led, violet/lilac/peach accents, dark/lilac/violet feeling when possible, warm ivory only as a secondary light-mode base.

For each job:
- use generation_prompt as the main image-generation prompt;
- apply negative_prompt as exclusions;
- preserve visible_copy exactly;
- follow composition_spec;
- respect product_truth_anchor, source_assets, must_show, must_preserve, must_avoid, and acceptance_criteria;
- generate a real final image;
- inspect the result visually;
- regenerate or repair if it is generic, ugly, off-brand, unreadable, misleading, fake, low-quality, old-logo, beige/green, botanical-template, or background-only;
- save the final accepted image exactly to expected_output.local_staging_path using expected_output.filename.

Do not modify campaign.json.
Do not modify copy, captions, hooks, CTAs, tracking URLs, UTMs, dates, statuses, or campaign structure.
Do not write to DB.
Do not upload to Drive.
Do not upload to R2.
Do not create Metricool CSV.
Do not publish.
Do not schedule.
Do not create a PR.
Do not merge anything.
Do not commit generated image binaries.

At the end, print:
PERIOD: 2026-07
OUTPUT_FOLDER: <resolved generated-assets folder>
TOTAL_JOBS: <number>
PRODUCED_JOBS: <number>
BLOCKED_JOBS: <number>

Then print one line per job:
PRODUCED <asset_code> -> <local_path>
BLOCKED <asset_code> -> <reason>
```
