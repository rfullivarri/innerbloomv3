# Codex Desktop Run Prompt — Asset Producer V4 Balanced

Use this in a fresh Codex Desktop thread with image generation enabled.

```txt
Run Innerbloom Asset Producer V4 for period 2026-07, batch 1.

Goal: produce final campaign images with a balanced workflow.

Do not generate fake product UI.
Do not make sterile programmed templates.
Do not make generic AI SaaS posters.

Use this split:
- Image generation is for atmosphere, premium background, lighting, depth, abstract shapes, and emotional brand energy.
- Real approved screenshots are for all product UI proof.
- Final composition can combine generated atmosphere + real screenshot crops + approved logo + exact visible copy.

Read only:
- prompts/marketing/asset-producer-v4-brand-overrides.md
- prompts/marketing/agent-system/brand/innerbloom-asset-registry-v1.json
- marketing/agent-outputs/2026-07/image-batches/batch-01.json

Do not read full campaign.json or upstream strategy/context files.
Only fetch source assets listed in source_asset_keys_needed for this batch.

Use batch-01.json as the queue. Process jobs[] in generation_order.

Typography:
- Use Sora Bold or Sora ExtraBold for headlines.
- Use Manrope Regular, Medium, or Semibold for supporting copy and labels.
- Do not use serif fonts.
- Do not use sterile default system-font template styling.

Brand:
- Use Innerbloom v2: premium, product-led, calm, adaptive, violet/lilac/peach, atmospheric depth.
- Dark palette: #06060B, #0D0C14, #141320, #F3F0FA, #8E63FF, #9B7CFF, #C88DFF, #F2AE9B.
- Use gradient #8E63FF -> #C88DFF -> #F2AE9B when useful.
- Light mode may use #F1E9DE and #FBF8F3 but still needs violet/lilac/peach identity.
- Use approved logo only: approved_logo_primary_png / IB_NEW_LOGO1.png, or approved_logo_primary_512_png / IB_NEW_LOGO1 512.png.
- Avoid old logo, beige/green wellness, botanical stationery, fake UI, bland programmatic cards, generic Canva, and repeated left-text/right-device templates.

Visual quality target:
- The final images should feel more like premium product marketing art direction than code-generated templates.
- Keep real UI screenshots clean and readable, but integrate them with depth, glow, shadow, masks, angled crops, cards, reflections, or product-led atmosphere.
- Avoid raw rectangular screenshot dumps.
- Avoid tiny unreadable UI fragments.
- Avoid oversized empty whitespace.
- Avoid identical arcs and identical layouts in every asset.

Layout variety:
Use a mix across the batch:
- cinematic phone hero with real screenshot inside
- cropped UI module hero
- floating UI cards over generated atmosphere
- text-first poster with subtle product proof
- split proof layout
- signal or rhythm concept with small real UI crop
- mechanism explainer using real UI snippets
- minimal light-mode poster only when the job calls for a calmer visual

For each job:
1. Read the job.
2. Decide a composition family before generating.
3. Identify required source_assets.
4. Use approved real screenshots for product UI. Never generate the app screen.
5. Use image generation to create a premium Innerbloom atmosphere or scene around the real product proof.
6. Add exact visible_copy in Sora/Manrope.
7. Use the approved logo.
8. Preserve product_truth_anchor, must_show, must_preserve, must_avoid, and acceptance_criteria.
9. Inspect the final image.
10. Reject and revise if it has fake UI, missing copy, wrong font, old logo, sterile programmed-card look, generic AI SaaS look, repeated layout, beige/green wellness look, unreadable screenshot, or unfinished composition.
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
