# Codex Desktop Run Prompt — Asset Producer V4 Real UI

Use this in a fresh Codex Desktop thread with image generation enabled.

```txt
Run Innerbloom Asset Producer V4 for period 2026-07, batch 1.

Critical correction: generated UI is not allowed.

Use image generation only for brand backgrounds, depth, atmosphere, abstract signal shapes, and non-product decorative elements.

For any product screen, app UI, phone screen, dashboard, task list, Daily Quest, chart, pills, progress row, or product proof, use only approved real source screenshots from the registry and batch JSON.

Do not create, redraw, reinterpret, or hallucinate Innerbloom product UI with image generation.

Final images may be assembled from:
- generated brand background or atmosphere;
- approved real screenshots;
- approved logo;
- exact visible copy;
- clean layout composition.

Read only:
- prompts/marketing/asset-producer-v4-brand-overrides.md
- prompts/marketing/agent-system/brand/innerbloom-asset-registry-v1.json
- marketing/agent-outputs/2026-07/image-batches/batch-01.json

Do not read the full campaign.json.
Do not read content-context.json.
Do not read cmo-strategy.json.
Do not read upstream strategy/context/memory files.
Do not download all Drive assets.
Only fetch source assets listed in source_asset_keys_needed for this batch.

Use batch-01.json as the production queue.
Use asset-producer-v4-brand-overrides.md as hard brand direction.
Use the registry only to resolve the source asset keys needed by this batch.

Typography:
- Use Sora Bold or Sora ExtraBold for headlines.
- Use Manrope Regular, Medium, or Semibold for supporting copy, labels, and CTA text.
- Do not use serif fonts.
- Do not use editorial serif typography.
- Do not use Didot, Playfair, Bodoni, Times, Garamond, or similar fonts.

Brand:
- Use Innerbloom palette aggressively and visibly.
- Dark mode: #06060B, #0D0C14, #141320, #F3F0FA, #8E63FF, #9B7CFF, #C88DFF, #F2AE9B.
- Use gradient #8E63FF -> #C88DFF -> #F2AE9B when useful.
- Light mode may use #F1E9DE and #FBF8F3 but must still feel violet/lilac/peach Innerbloom.
- Use current approved logo assets only: approved_logo_primary_png / IB_NEW_LOGO1.png, or approved_logo_primary_512_png / IB_NEW_LOGO1 512.png.
- Do not use apps/web/public/IB-B-cont-logo.png.
- Avoid beige/green wellness styling, botanical stationery, generic SaaS cards, generic Canva cards, fake UI, and background-only assets.

Layout variety:
- Do not repeat the same left-text/right-phone composition for every asset.
- Use a mix of composition families: text-first poster, UI crop hero, split proof, signal/chart concept, floating cards, mechanism explainer, minimal light-mode poster, and phone hero.
- A phone mockup is allowed, but the phone screen content must be a real approved screenshot, not generated UI.
- Some assets should use cropped product modules rather than a full phone.
- Some assets should have no phone at all.

Process jobs[] in generation_order.

For each job:
1. Read the job carefully.
2. Decide the composition family first.
3. Identify which source_assets are required.
4. If a job needs product proof, fetch the approved real source asset from the registry.
5. Generate only the background/atmosphere if useful.
6. Place real approved product screenshot or crop as the UI proof.
7. Place exact visible_copy inside the final image using Sora/Manrope rules.
8. Use approved logo only.
9. Inspect the final image.
10. Reject and regenerate or revise if it contains fake UI, generated product screens, wrong typography, missing copy, wrong logo, repeated-template look, beige/green wellness style, or unfinished output.
11. Save the accepted image exactly to expected_output.local_staging_path using expected_output.filename.

Do not modify campaign.json.
Do not write to DB.
Do not upload to Drive or R2.
Do not create PRs.
Do not commit generated image binaries.

At the end, print:
PERIOD: 2026-07
BATCH: 1
OUTPUT_FOLDER: <resolved generated-assets folder>
TOTAL_JOBS: <number>
PRODUCED_JOBS: <number>
BLOCKED_JOBS: <number>

Then print one line per job:
PRODUCED <asset_code> -> <local_path>
BLOCKED <asset_code> -> <reason>
```
