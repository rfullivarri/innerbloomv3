# Innerbloom Marketing Strategy Memory

> Canonical strategy memory for the monthly marketing cycle.
>
> **This is the only strategy-memory file read or updated by the marketing workflow.**
> It is intentionally a living record: keep current operating rules near the top and append validated learnings to the changelog below.

Last updated: 2026-07-21

## Purpose

This file is the first read for every monthly marketing generation run. The run should update this file before generating new posts, so future agents can see the latest positioning, experiments, results, and operating rules.

## Current Objective

Acquire early adopter users for Innerbloom 2.0 with lightweight, measurable Instagram content. The system should minimize manual marketing operations while keeping final approval under human control.

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

Every traffic-oriented post must include:

- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `ib_post`

## Current Operating Flow

1. Code collects and persists analytics context.
2. CMO reads this memory plus the validated context and writes strategy.
3. A human approves strategy.
4. Head of Content writes one final `campaign.json`.
5. Asset production reads only that `campaign.json`.
6. Code renders, stores, and imports produced files.
7. Human review happens in Admin Marketing.
8. Code uploads approved assets to R2 and exports Metricool CSV.

## Campaign Defaults

- Default platform: Instagram
- Default language: English
- Default monthly post count: 20
- Current campaign contract: `marketing/agent-outputs/<YYYY-MM>/campaign.json`, schema v2
- Current tested formats: static + carousel

## Baseline: 2026-06 MVP

The first operational MVP proved that:

- Metricool CSV import works.
- Metricool can ingest image URLs from Cloudflare R2 URLs.
- Instagram posts published successfully from the generated CSV.
- Cloudflare R2 is the publishing asset store for CSV exports.
- Google Drive remains the human-readable marketing library.
- GA4 and Search Console snapshots can be synced into Neon and shown in `/admin/marketing`.

The first content batch was a technical proof. Its performance should not be treated as a strategic signal yet.

## Data Interpretation Rules

GA4 active users are anonymous, cookie/device-based users. They are not the same as registered users in Neon.

For marketing decisions:

- Treat landing page views as acquisition signal.
- Treat `/innerbloom2/...` pages as product usage signal.
- Exclude auth redirects such as `accounts.google.com`.
- Exclude internal/admin emails before reading registered-user growth.
- Search Console is sparse until Google has more impressions.

## Creative Rules

- Prefer real current Innerbloom screenshots over generic lifestyle imagery.
- Use both dark-mode and light-mode product assets when available.
- Keep carousel slides readable on mobile.
- Use R2 URLs in Metricool CSV output.
- Store source assets and planning context in the current `Innerbloom Marketing` Drive root.
- Generate a net-new visual only when the asset registry cannot support the post.

## Known Gaps

- Monthly agent execution is not automated yet.
- Metricool performance data is manual export for now.
- The renderer/layout system is not implemented yet.
- The current 2026-07 campaign must be reviewed before production.

## Next Run Instructions

1. Keep the number of configurable knobs small.
2. Prefer strong hooks and measurable hypotheses over generic motivational posts.
3. Reuse visual patterns that remain readable on mobile.
4. Generate new visual material only when the current asset library cannot support the post.
5. Preserve every decision and result in the changelog below.

## Strategic Changelog

### 2026-06-29 | 2026-06 MVP baseline

- **Period analyzed:** 2026-06-01 -> 2026-06-28
- **Insights detected:** Instagram/social is the top acquisition source after hygiene filters; product dashboard pages are receiving more views than the landing page; Search Console has very low click volume and should not drive messaging decisions yet.
- **Hypotheses:** Adaptive rhythm and real-week positioning can differentiate Innerbloom from rigid streak-based habit apps; product screenshots should make the promise more concrete.
- **Decisions taken:** Keep the 2026-06 MVP campaign as a small validation loop; export only approved posts to Metricool; separate post approval work from analytics and source configuration.
- **What worked:** Clear anti-perfect-days hook; explicit tracking URLs per post; reusable campaign assets.
- **What did not work:** Ambiguous internal shorthand such as “Cost of Safe”; stacking GA4 and Search Console in one low-hierarchy column.
- **Learnings:** Keep post operations, strategic interpretation, and data-source health in separate views; every post should map to a measurable funnel event.
- **Next experiments:** Test dashboard walkthrough carousel; compare product-mechanism hooks against general habit advice; add Metricool results after publishing.

### 2026-07-21 | Canonicalization before visual-production rebuild

- **Decision:** One strategy memory only: this file.
- **Decision:** The final campaign contract is one schema-v2 `campaign.json` per period.
- **Decision:** Asset production must select from the current Drive registry first; code handles file movement and rendering, while agents make only strategic or creative decisions.
- **Open work:** Build the asset registry and review four renderer-produced pilot posts before scaling to the full 20-post monthly batch.
