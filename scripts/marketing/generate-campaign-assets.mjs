#!/usr/bin/env node

import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const requireFromWebWorkspace = createRequire(path.join(repoRoot, "apps/web/package.json"));
const { chromium } = requireFromWebWorkspace("@playwright/test");
const defaultConfigPath = path.join(
  repoRoot,
  "Docs/marketing/campaigns/2026-06-mvp/campaign.json"
);

const configPath = path.resolve(process.argv[2] || defaultConfigPath);
const campaignDir = path.dirname(configPath);
const assetsDir = path.join(campaignDir, "assets");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function trackingUrl(campaign, post) {
  const url = new URL(campaign.primaryUrl);
  url.searchParams.set("utm_source", campaign.source);
  url.searchParams.set("utm_medium", campaign.medium);
  url.searchParams.set("utm_campaign", campaign.campaignCode);
  url.searchParams.set("utm_content", post.id);
  url.searchParams.set("ib_post", post.number);
  return url.toString();
}

async function dataUri(repoRelativePath) {
  const absolutePath = path.join(repoRoot, repoRelativePath);
  const buffer = await fs.readFile(absolutePath);
  const extension = path.extname(repoRelativePath).toLowerCase();
  const mime =
    extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".webp"
        ? "image/webp"
        : "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function baseStyles() {
  return `
    :root {
      color-scheme: light;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f7f1e7;
      color: #131125;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      width: 1080px;
      height: 1080px;
      overflow: hidden;
      background:
        radial-gradient(circle at 78% 18%, rgba(151, 84, 255, 0.22), transparent 28%),
        radial-gradient(circle at 24% 84%, rgba(255, 164, 184, 0.24), transparent 32%),
        linear-gradient(135deg, #fffaf2 0%, #f2ecdf 54%, #efe5ee 100%);
    }

    .frame {
      position: relative;
      width: 1080px;
      height: 1080px;
      padding: 76px;
      overflow: hidden;
    }

    .brand {
      position: absolute;
      top: 52px;
      left: 66px;
      z-index: 4;
      display: flex;
      align-items: center;
      gap: 14px;
      color: #141125;
      font-size: 24px;
      font-weight: 900;
      letter-spacing: 6px;
    }

    .brand img {
      width: 48px;
      height: 48px;
      object-fit: contain;
    }

    .flower-bg {
      position: absolute;
      right: -52px;
      bottom: -64px;
      width: 360px;
      opacity: 0.09;
      z-index: 1;
    }

    .eyebrow {
      margin: 0 0 28px;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 0;
      color: #7047e8;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-size: 76px;
      line-height: 0.98;
      letter-spacing: 0;
      max-width: 760px;
    }

    p {
      margin: 30px 0 0;
      font-size: 36px;
      line-height: 1.22;
      color: #57506c;
      max-width: 760px;
    }

    .image-panel {
      position: absolute;
      right: 64px;
      bottom: 78px;
      width: 410px;
      height: 520px;
      border-radius: 42px;
      overflow: hidden;
      box-shadow: 0 34px 78px rgba(34, 25, 65, 0.26);
      z-index: 2;
      background: #211b2d;
    }

    .image-panel img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .content {
      position: relative;
      z-index: 3;
      padding-top: 154px;
    }

    .cta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-top: 46px;
      min-width: 268px;
      height: 78px;
      border-radius: 999px;
      background: #8154f6;
      color: white;
      font-size: 27px;
      font-weight: 800;
      box-shadow: 0 20px 48px rgba(129, 84, 246, 0.32);
    }

    .split-grid {
      display: grid;
      grid-template-columns: 1fr 390px;
      gap: 54px;
      align-items: center;
      height: 100%;
      padding-top: 90px;
    }

    .split-grid .image-panel {
      position: relative;
      inset: auto;
      width: 390px;
      height: 560px;
    }

    .static-card {
      position: absolute;
      inset: 76px;
      border-radius: 44px;
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid rgba(42, 31, 72, 0.1);
      box-shadow: 0 30px 82px rgba(42, 31, 72, 0.12);
      overflow: hidden;
    }

    .static-card .content {
      padding: 142px 72px 0;
    }

    .static-card .image-panel {
      right: 58px;
      bottom: 58px;
      width: 330px;
      height: 330px;
      border-radius: 34px;
    }

    .brand-slide {
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
      padding-top: 56px;
    }

    .brand-slide h1 {
      max-width: 820px;
      font-size: 82px;
    }
  `;
}

async function assetHtml(campaign, asset) {
  const flower = await dataUri(campaign.brand.flower);
  const sourceImage = asset.sourceImage ? await dataUri(asset.sourceImage) : null;
  const imagePanel = sourceImage
    ? `<div class="image-panel"><img src="${sourceImage}" alt="" /></div>`
    : "";
  const brand = `<div class="brand"><img src="${flower}" alt="" /><span>INNERBLOOM</span></div>`;

  if (asset.type === "split") {
    return `
      <html>
        <head><style>${baseStyles()}</style></head>
        <body>
          <main class="frame">
            ${brand}
            <img class="flower-bg" src="${flower}" alt="" />
            <section class="split-grid">
              <div>
                <h1>${escapeHtml(asset.title)}</h1>
                <p>${escapeHtml(asset.body)}</p>
              </div>
              ${imagePanel}
            </section>
          </main>
        </body>
      </html>
    `;
  }

  if (asset.type === "brand") {
    return `
      <html>
        <head><style>${baseStyles()}</style></head>
        <body>
          <main class="frame">
            ${brand}
            <img class="flower-bg" src="${flower}" alt="" />
            <section class="brand-slide">
              <p class="eyebrow">INNERBLOOM 2.0</p>
              <h1>${escapeHtml(asset.title)}</h1>
              <p>${escapeHtml(asset.body)}</p>
              <div class="cta">${escapeHtml(asset.cta)}</div>
            </section>
          </main>
        </body>
      </html>
    `;
  }

  if (asset.type === "static") {
    return `
      <html>
        <head><style>${baseStyles()}</style></head>
        <body>
          <main class="frame">
            <img class="flower-bg" src="${flower}" alt="" />
            <section class="static-card">
              ${brand}
              <div class="content">
                <h1>${escapeHtml(asset.title)}</h1>
                <p>${escapeHtml(asset.body)}</p>
              </div>
              ${imagePanel}
            </section>
          </main>
        </body>
      </html>
    `;
  }

  return `
      <html>
        <head><style>${baseStyles()}</style></head>
        <body>
          <main class="frame">
          ${brand}
          <img class="flower-bg" src="${flower}" alt="" />
          <section class="content">
            ${asset.eyebrow ? `<p class="eyebrow">${escapeHtml(asset.eyebrow)}</p>` : ""}
            <h1>${escapeHtml(asset.title)}</h1>
            <p>${escapeHtml(asset.body)}</p>
          </section>
          ${imagePanel}
        </main>
      </body>
    </html>
  `;
}

function captionText(campaign, post) {
  const url = trackingUrl(campaign, post);
  return post.caption.map((line) => line.replaceAll("{{trackingUrl}}", url)).join("\n");
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function renderContentPlan(campaign) {
  const lines = [
    `# ${campaign.title}`,
    "",
    `Goal: ${campaign.goal}`,
    "",
    `Campaign code: \`${campaign.campaignCode}\``,
    "",
    "Primary URL:",
    `\`${campaign.primaryUrl}\``,
    "",
    "## Tracking Links",
    ""
  ];

  for (const post of campaign.posts) {
    const label = post.format === "carousel" ? "carousel" : "static";
    lines.push(
      `${post.id.replace("_", " ").replace("post", "Post")} ${label}:`,
      `\`${trackingUrl(campaign, post)}\``,
      ""
    );
  }

  for (const post of campaign.posts) {
    const title =
      post.format === "carousel"
        ? `Post ${post.number} - Product Carousel`
        : `Post ${post.number} - Pain / Proposal Static`;
    lines.push(
      `## ${title}`,
      "",
      `Format: Instagram ${post.format === "carousel" ? "carousel, 4 square slides" : "single square post"}.`,
      "",
      post.assets.length > 1 ? "Assets:" : "Asset:",
      ""
    );

    if (post.assets.length > 1) {
      post.assets.forEach((asset, index) => lines.push(`${index + 1}. \`${asset.file}\``));
    } else {
      lines.push(`\`${post.assets[0].file}\``);
    }

    lines.push(
      "",
      "Caption:",
      "",
      "```text",
      captionText(campaign, post),
      "```",
      "",
      "Hypothesis:",
      post.hypothesis,
      "",
      "Metric to watch:",
      post.metric,
      ""
    );
  }

  lines.push(
    "## Publishing Checklist",
    "",
    "Preferred path:",
    "",
    "1. Merge this PR so the image URLs in `metricool-calendar-import.csv` point to public `main` branch files.",
    "2. In Metricool Planner, use the CSV import option and upload `metricool-calendar-import.csv`.",
    "3. Review the imported Instagram posts, dates, captions, and carousel/static assets before confirming.",
    "4. After publishing, open GA4 Realtime and confirm page activity.",
    "5. After 24 hours, check GA4 acquisition reports by session source/medium/campaign.",
    "",
    "Fallback path:",
    "",
    "1. Upload Post 001 as a carousel to Instagram.",
    "2. Put the Post 001 tracking link in the caption or bio/link target available through the account.",
    "3. Upload Post 002 as a static post.",
    "4. Put the Post 002 tracking link in the caption or bio/link target available through the account.",
    "",
    "## Decision Rule",
    "",
    "After both posts have at least a small number of impressions:",
    "",
    "- If clicks happen but no CTA/auth: landing message or CTA needs work.",
    "- If CTA/auth happens but no dashboard: onboarding/auth flow friction needs work.",
    "- If no clicks happen: post creative/hook/channel is the first thing to change.",
    ""
  );

  return lines.join("\n");
}

function renderMetricoolCsv(campaign) {
  const rows = [
    [
      "post_id",
      "platform",
      "format",
      "status",
      "asset_files",
      "caption_file_or_source",
      "tracking_url",
      "notes"
    ],
    ...campaign.posts.map((post) => [
      post.id,
      post.platform,
      post.format,
      post.status,
      post.assets.map((asset) => asset.file).join("; "),
      "content-plan.md",
      trackingUrl(campaign, post),
      post.notes
    ])
  ];

  return `${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function assetPublicUrl(campaign, asset) {
  if (!campaign.publicAssetBaseUrl) {
    return "";
  }

  return `${campaign.publicAssetBaseUrl.replace(/\/$/, "")}/${encodeURIComponent(path.basename(asset.file))}`;
}

function renderMetricoolCalendarImportCsv(campaign) {
  const pictureColumns = Array.from({ length: 10 }, (_, index) => `Picture Url ${index + 1}`);
  const altTextColumns = Array.from({ length: 10 }, (_, index) => `Alt text picture ${index + 1}`);
  const columns = [
    "Text",
    "Date",
    "Time",
    "Draft",
    "Facebook",
    "Twitter/X",
    "LinkedIn",
    "GBP",
    "Instagram",
    "Pinterest",
    "TikTok",
    "YouTube",
    "Threads",
    "Bluesky",
    ...pictureColumns,
    ...altTextColumns,
    "Shortener",
    "Instagram Post Type",
    "Brand name"
  ];

  const rows = campaign.posts.map((post) => {
    const row = Object.fromEntries(columns.map((column) => [column, ""]));
    row.Text = captionText(campaign, post);
    row.Date = post.scheduledDate;
    row.Time = post.scheduledTime;
    row.Draft = "FALSE";
    row.Facebook = "FALSE";
    row["Twitter/X"] = "FALSE";
    row.LinkedIn = "FALSE";
    row.GBP = "FALSE";
    row.Instagram = "TRUE";
    row.Pinterest = "FALSE";
    row.TikTok = "FALSE";
    row.YouTube = "FALSE";
    row.Threads = "FALSE";
    row.Bluesky = "FALSE";
    row.Shortener = "FALSE";
    row["Instagram Post Type"] = "POST";

    post.assets.slice(0, 10).forEach((asset, index) => {
      row[`Picture Url ${index + 1}`] = assetPublicUrl(campaign, asset);
      row[`Alt text picture ${index + 1}`] = asset.title;
    });

    return columns.map((column) => row[column]);
  });

  return `${[columns, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")}\n`;
}

function renderManifest(campaign) {
  return `${JSON.stringify(
    campaign.posts.flatMap((post) =>
      post.assets.map((asset) => ({
        file: path.basename(asset.file),
        title: asset.title,
        type: asset.type
      }))
    ),
    null,
    2
  )}\n`;
}

async function renderAssets(campaign) {
  await fs.mkdir(assetsDir, { recursive: true });

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });

    for (const post of campaign.posts) {
      for (const asset of post.assets) {
        await page.setContent(await assetHtml(campaign, asset), { waitUntil: "networkidle" });
        await page.screenshot({ path: path.join(campaignDir, asset.file), fullPage: false });
      }
    }
  } finally {
    await browser.close();
  }
}

async function main() {
  const campaign = JSON.parse(await fs.readFile(configPath, "utf8"));

  await renderAssets(campaign);
  await fs.writeFile(path.join(campaignDir, "content-plan.md"), renderContentPlan(campaign));
  await fs.writeFile(path.join(campaignDir, "metricool-upload.csv"), renderMetricoolCsv(campaign));
  await fs.writeFile(
    path.join(campaignDir, "metricool-calendar-import.csv"),
    renderMetricoolCalendarImportCsv(campaign)
  );
  await fs.writeFile(path.join(assetsDir, "asset-manifest.json"), renderManifest(campaign));

  console.log(`Generated campaign assets in ${path.relative(repoRoot, campaignDir)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
