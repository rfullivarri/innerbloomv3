# Codex Desktop Run Prompt — Asset Producer V4

Copy this prompt into Codex Desktop while your local repo is checked out on the monthly marketing branch.

```txt
Run Innerbloom Asset Producer V4 for period 2026-07.

You are only allowed to generate local image files.

Read:
- prompts/marketing/asset-producer-v4.md
- prompts/marketing/agent-system/asset-producer/AGENTS-v4.md
- marketing/agent-outputs/2026-07/campaign.json

Use only marketing/agent-outputs/2026-07/campaign.json as the campaign source of truth.

Do not read content-context.json.
Do not read cmo-strategy.json.
Do not read upstream strategy/context/memory files.

Process image_generation.jobs[] in generation_order.

For each job:
- use generation_prompt as the main image-generation prompt;
- apply negative_prompt as hard exclusions;
- preserve visible_copy exactly;
- follow composition_spec;
- respect product_truth_anchor, source_assets, must_show, must_preserve, must_avoid, and acceptance_criteria;
- generate a real image using the image-generation capability available in Codex Desktop;
- inspect the result visually;
- regenerate or repair if it is generic, ugly, off-brand, unreadable, misleading, fake, or low-quality;
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
