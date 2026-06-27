# Innerbloom Marketing Strategy Memory

Last updated: 2026-06-27

## Purpose

This file is the first read for every monthly marketing generation run. The run should update this file before generating new posts, so future agents can see the latest positioning, experiments, results, and operating rules.

## Current Objective

Acquire early adopter users for Innerbloom 2.0 with lightweight, measurable social content. The system should minimize manual marketing operations while keeping final approval under human control.

## Current Positioning

Innerbloom helps people build sustainable habits that adapt to real life instead of forcing rigid streaks or perfect-day productivity.

Core message:

- adaptive habits
- real-life rhythm
- recalibration instead of restart
- visible progress without perfection pressure
- early product, feedback welcome

## Current Funnel

Primary destination:

`https://innerbloomjourney.org/`

Tracked app path:

`/innerbloom2/dashboard`

Minimum funnel to monitor:

`page_view -> landing_cta_clicked -> auth_started -> auth_completed -> dashboard_view`

Every post must include:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `ib_post`

## Current Operating Flow

1. Read this strategy memory.
2. Read the latest GA4/Search Console/Metricool data available.
3. Summarize what changed since the last run.
4. Update this strategy memory with the new learning.
5. Generate campaign drafts.
6. Save draft copy, assets, tracking URLs, and scheduling metadata.
7. Show drafts in `/admin/marketing`.
8. Wait for human approval or regeneration requests.
9. Export a Metricool CSV only for approved posts.

## Campaign Defaults

- Default platform: Instagram
- Default language: English
- Default monthly post count: 20
- Current MVP campaign code: `ib20_mvp`
- Current tested format: square static + square carousel

## What Worked So Far

The first two-post MVP proved that:

- Metricool CSV import works.
- Metricool can ingest image URLs from GitHub raw URLs.
- Instagram posts published successfully from the generated CSV.
- The creative format is acceptable for the first acquisition experiment.

## Known Gaps

- Google Drive should replace GitHub raw URLs for marketing asset storage if Metricool accepts Drive-hosted links reliably.
- GA4 and Search Console data are not connected to the admin yet.
- Metricool performance data is manual export for now.
- The admin marketing approval board is still MVP/static until backend persistence is added.
- Image generation is template-based; new visual assets should be generated only when needed.

## Next Run Instructions

For the next monthly run:

1. Keep the number of configurable knobs small.
2. Prefer strong hooks and measurable hypotheses over generic motivational posts.
3. Reuse visual patterns that remain readable on mobile.
4. Generate only new visuals when the existing asset library cannot support the post.
5. Preserve every decision and result in this strategy memory.
