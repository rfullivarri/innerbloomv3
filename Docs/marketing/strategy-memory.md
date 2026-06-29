# Innerbloom Marketing Strategy Memory

Last updated: 2026-06-29

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

## Baseline: 2026-06 MVP

The first operational MVP proved that:

- Metricool CSV import works.
- Metricool can ingest image URLs from Cloudflare R2 URLs.
- Instagram posts published successfully from the generated CSV.
- Cloudflare R2 is now the publishing asset store for CSV exports.
- Google Drive remains the human-readable marketing library.
- GA4 and Search Console snapshots can be synced into Neon and shown in `/admin/marketing`.

The first content batch was only a technical proof. Its performance should not be treated as a strategic signal yet.

## Data Interpretation Rules

GA4 active users are anonymous, cookie/device-based users. They are not the same as registered users in Neon.

For marketing decisions:

- Treat landing page views as acquisition signal.
- Treat `/innerbloom2/...` pages as product usage signal.
- Exclude auth redirects such as `accounts.google.com`.
- Exclude internal/admin emails before reading registered-user growth.
- Search Console is sparse until Google has more impressions.

## First 20-Post Strategy Proposal

This is the first real monthly plan once draft generation is wired.

Planned mix:

- 8 pain/friction posts: streak pressure, perfect-day planning, restarting from zero, habits collapsing during messy weeks.
- 5 product mechanism/demo posts: adaptive rhythm, weekly recalibration, dashboard progress, task intensity, visible momentum.
- 4 belief/differentiation posts: real weeks over perfect calendars, progress without shame, sustainable habit design, anti-all-or-nothing routines.
- 3 early-adopter CTA posts: try the early version, help shape the product, give feedback after using the dashboard.

Creative rules:

- Prefer real Innerbloom 2.0 screenshots over generic lifestyle imagery.
- Use both dark-mode and light-mode product assets when available.
- Keep carousel slides readable on mobile.
- Use R2 URLs in Metricool CSV output.
- Store source assets and planning context in Google Drive for browsing.

Measurement:

- Primary acquisition: landing views and CTA events from UTM-tagged links.
- Primary activation: `auth_started -> auth_completed -> dashboard_view`.
- Product-interest proxy: views of `/innerbloom2/dashboard`, `/innerbloom2/tareas`, `/innerbloom2/task-detail`, and `/innerbloom2/logros`.

## Known Gaps

- Monthly draft generation is not automated yet.
- The scheduled Codex prompt still needs to be created and tested.
- Metricool performance data is manual export for now.
- The admin marketing approval board is still seeded/local-storage based until backend post persistence is added.
- Image generation is template-based; new visual assets should be generated only when needed.

## Scheduled Codex Prompt Draft

When the monthly scheduled task runs, use this operating prompt:

1. Read `Docs/marketing/strategy-memory.md`.
2. Read the latest Neon marketing analytics snapshot and the `/admin/marketing` campaign state.
3. Separate acquisition evidence from product-usage evidence.
4. Ignore internal/admin users and auth/referral noise already configured in analytics settings.
5. Update this file with what changed, what was learned, and what will be attempted next.
6. Generate the configured number of post drafts for the next month.
7. For every post, include platform, format, scheduled date/time, hypothesis, metric, UTM tracking URL, caption, and required visual assets.
8. Reuse existing assets when they are sufficient. Generate new assets only when the current library does not support the post.
9. Save the drafts so `/admin/marketing` can render them for approval.
10. Do not export the Metricool CSV until posts are approved.

## Next Run Instructions

For the next monthly run:

1. Keep the number of configurable knobs small.
2. Prefer strong hooks and measurable hypotheses over generic motivational posts.
3. Reuse visual patterns that remain readable on mobile.
4. Generate only new visuals when the existing asset library cannot support the post.
5. Preserve every decision and result in this strategy memory.
