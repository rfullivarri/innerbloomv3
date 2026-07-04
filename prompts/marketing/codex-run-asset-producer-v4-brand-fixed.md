# Codex Desktop Run Prompt — Asset Producer V4 Brand Fixed

```txt
Run Innerbloom Asset Producer V4 for period 2026-07.

Generate final local image files only.

Read these files first:
- prompts/marketing/asset-producer-v4.md
- prompts/marketing/asset-producer-v4-brand-overrides.md
- prompts/marketing/agent-system/asset-producer/AGENTS-v4.md
- prompts/marketing/agent-system/brand/innerbloom-visual-system-v1.json
- prompts/marketing/agent-system/brand/innerbloom-visual-system-v2.md
- prompts/marketing/agent-system/brand/innerbloom-asset-registry-v1.json
- marketing/agent-outputs/2026-07/campaign.json

Use campaign.json as the production queue. Use the visual system files and registry as the brand source.

Process image_generation.jobs[] in generation_order.

Visual rules:
- Use actual image generation/editing capability.
- If only Python/Pillow/SVG/HTML/Canvas composition is available, report BLOCKED.
- Each output must be a final complete social image, not a background for later overlay.
- Use the Innerbloom palette aggressively and visibly.
- Dark mode: #06060B, #0D0C14, #141320, #F3F0FA, #8E63FF, #9B7CFF, #C88DFF, #F2AE9B, violet/blue depth.
- Light mode: #F1E9DE and #FBF8F3 are allowed, but the result must still feel violet/lilac/peach Innerbloom rather than beige/green wellness.
- Use the hero gradient #8E63FF -> #C88DFF -> #F2AE9B when useful.
- Use product functional colors only for actual UI meaning.
- Use current approved logo assets only: approved_logo_primary_png / IB_NEW_LOGO1.png, or approved_logo_primary_512_png / IB_NEW_LOGO1 512.png.
- Avoid old outlined logo, apps/web/public/IB-B-cont-logo.png, beige/green wellness styling, generic botanical stationery, and generic Canva cards.
- Target Innerbloom v2: premium product-led, violet/lilac/peach accents, atmospheric depth, strong mobile-readable type, and real product evidence.

For each job:
- use generation_prompt as the main image-generation prompt;
- apply asset-producer-v4-brand-overrides.md as hard brand overrides;
- apply negative_prompt as exclusions;
- preserve visible_copy exactly;
- follow composition_spec;
- respect product_truth_anchor, source_assets, must_show, must_preserve, must_avoid, and acceptance_criteria;
- generate a real final image;
- inspect the result visually;
- regenerate or repair if it is generic, off-brand, unreadable, misleading, fake, low-quality, old-logo, beige/green, botanical-template, or background-only;
- save the accepted image exactly to expected_output.local_staging_path using expected_output.filename.

Keep campaign.json, copy, captions, hooks, CTAs, tracking URLs, UTMs, dates, statuses, campaign structure, DB, Drive, R2, Metricool, publishing, scheduling, PRs, merges, and commits unchanged.

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
