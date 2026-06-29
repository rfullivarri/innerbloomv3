# Innerbloom 2.0 Marketing MVP - English Test

Goal: Validate the full acquisition loop with two simple posts before planning a monthly 20-post system.

Campaign code: `ib20_mvp`

Primary URL:
`https://innerbloomjourney.org/`

## Tracking Links

Post 001 carousel:
`https://innerbloomjourney.org/?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_001&ib_post=001`

Post 002 static:
`https://innerbloomjourney.org/?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_002&ib_post=002`

## Post 001 - Product Carousel

Format: Instagram carousel, 4 square slides.

Assets:

1. `assets/post-001-carousel-01.png`
2. `assets/post-001-carousel-02.png`
3. `assets/post-001-carousel-03.png`
4. `assets/post-001-carousel-04.png`

Caption:

```text
Your habits should adapt to your real life.

Most habit apps assume every day is the same.

Then a busy week hits, your streak breaks, and the whole plan starts feeling useless.

Innerbloom is built around adaptive rhythm:

- lower the intensity when life gets heavy
- keep visible progress
- recalibrate instead of starting over
- build a Journey that can survive real weeks

Early version is live.

Try it here:
https://innerbloomjourney.org/?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_001&ib_post=001

#habits #habitbuilding #selfimprovement #productivity #personalgrowth #wellbeing #buildinpublic
```

Hypothesis:
People who have failed with streak-based apps will respond to "adaptive rhythm" and "real weeks".

Metric to watch:
`page_view -> landing_cta_clicked -> auth_started -> auth_completed -> dashboard_view`

## Post 002 - Pain / Proposal Static

Format: Instagram single square post.

Asset:

`assets/post-002-static-pain-proposal.png`

Caption:

```text
If your plan only works on perfect days, it is not a plan.

Most people do not fail habits because they are lazy.

They fail because the system expects the same output from them every day, even when their energy, stress, sleep, and schedule change.

Innerbloom is an adaptive habit app.

It helps you keep direction without forcing the same rhythm all the time.

Start small. Recalibrate. Keep moving.

Try it here:
https://innerbloomjourney.org/?utm_source=instagram&utm_medium=social&utm_campaign=ib20_mvp&utm_content=post_002&ib_post=002

#habits #selfimprovement #wellbeing #productivity #mentalclarity #habittracker #buildinpublic
```

Hypothesis:
A direct anti-perfect-days message will perform better for people tired of rigid productivity systems.

Metric to watch:
`page_view`, scroll depth, `landing_cta_clicked`, and `dashboard_view`.

## Publishing Checklist

Preferred path:

1. Merge this PR so the image URLs in `metricool-calendar-import.csv` point to public `main` branch files.
2. In Metricool Planner, use the CSV import option and upload `metricool-calendar-import.csv`.
3. Review the imported Instagram posts, dates, captions, and carousel/static assets before confirming.
4. After publishing, open GA4 Realtime and confirm page activity.
5. After 24 hours, check GA4 acquisition reports by session source/medium/campaign.

Fallback path:

1. Upload Post 001 as a carousel to Instagram.
2. Put the Post 001 tracking link in the caption or bio/link target available through the account.
3. Upload Post 002 as a static post.
4. Put the Post 002 tracking link in the caption or bio/link target available through the account.

## Decision Rule

After both posts have at least a small number of impressions:

- If clicks happen but no CTA/auth: landing message or CTA needs work.
- If CTA/auth happens but no dashboard: onboarding/auth flow friction needs work.
- If no clicks happen: post creative/hook/channel is the first thing to change.
