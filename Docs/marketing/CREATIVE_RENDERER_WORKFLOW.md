# Innerbloom Creative Rendering Workflow

## What this adds

The campaign remains a single file:

`marketing/agent-outputs/<YYYY-MM>/campaign.json`

The Head of Content creates the campaign, its copy, truthful product anchors and source assets. The Creative Director then adds `creative_direction` to every image job inside that same file. No second campaign plan exists.

The renderer reads only the completed campaign and staged approved assets. It has no creative discretion.

## Monthly sequence

1. GitHub Action exports CMO context.
2. CMO and Head of Content create the monthly `campaign.json`.
3. Creative Director enriches every image job with `creative_direction`.
4. Deterministic Drive staging downloads the approved real assets by registered asset key.
5. `npm run marketing:render-v2 -- <campaign.json> --asset-dir <staged-assets> --out <generated-assets>` produces PNGs.
6. Generated assets are imported into Admin Marketing for human approval.
7. Approved assets upload to R2 and code produces the Metricool CSV.
8. The CSV is imported in Metricool. API publishing is a later optional replacement.

## The Creative Director may decide

- a reusable creative family;
- light or dark mode;
- front, angled, layered or close-cropped device treatment;
- exact registered assets;
- visual focal instruction;
- whether a non-UI generated supporting visual is necessary;
- acceptance criteria.

## The Creative Director may never decide

- visible text;
- logo or wordmark recreation;
- fake product UI;
- files, folders, Drive, R2, Metricool or Admin actions;
- campaign strategy, captions, schedules, CTA destinations or analytics.

## Brand and truth rules

- Render the canonical Innerbloom flower and wordmark using the established landing brand implementation.
- Sora is the headline / wordmark family and Manrope is body copy, matching the web product's font setup.
- Screenshots are real proof. They can be placed inside a deterministic phone shell, transformed in perspective or layered with other real screens; the UI itself is never generated.
- Supporting image generation is allowed only for non-UI atmosphere or objects. It cannot contain visible copy, logo, phone UI or fake device screens.

## Current boundary

The v2 renderer is ready to consume a completed visual contract. A deterministic Drive-staging step and the Admin/R2 import step still need to be connected before a full monthly batch can run unattended.
