#!/usr/bin/env node
/**
 * Innerbloom deterministic campaign renderer v2.
 *
 * Usage:
 *   node scripts/marketing/render-campaign-v2.mjs \
 *     marketing/agent-outputs/2026-07/campaign.json \
 *     --asset-dir marketing/staging/2026-07 \
 *     --out marketing/generated/2026-07
 *
 * The Creative Director provides creative_direction in the same campaign JSON.
 * This script makes no creative decisions. It composes exact copy, canonical
 * Innerbloom branding and registered real assets into final social PNGs.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const requireFromWeb = createRequire(path.join(repoRoot, "apps/web/package.json"));
const { chromium } = requireFromWeb("@playwright/test");

const [campaignArg, ...args] = process.argv.slice(2);
if (!campaignArg) throw new Error("Usage: render-campaign-v2 <campaign.json> --asset-dir <directory> --out <directory>");

function arg(name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}
const campaignPath = path.resolve(campaignArg);
const assetDir = path.resolve(arg("--asset-dir", path.join(path.dirname(campaignPath), "staged-assets")));
const outputDir = path.resolve(arg("--out", path.join(repoRoot, "marketing/generated")));
const esc = (value) => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");

async function dataUri(file) {
  const bytes = await fs.readFile(file);
  const ext = path.extname(file).toLowerCase();
  const mime = ext === ".webp" ? "image/webp" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : "image/png";
  return "data:" + mime + ";base64," + bytes.toString("base64");
}

async function sourceUri(assetKey) {
  for (const ext of [".png", ".webp", ".jpg", ".jpeg"]) {
    const candidate = path.join(assetDir, assetKey + ext);
    try { return await dataUri(candidate); } catch {}
  }
  throw new Error("Missing staged asset for " + assetKey + ". Run the deterministic Drive staging step first.");
}

const css = `
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@600;700&display=swap");
*{box-sizing:border-box} body{margin:0;width:1080px;height:1080px;overflow:hidden;font-family:Manrope,system-ui,sans-serif}
:root{--ink:#17151b;--muted:#605b69;--accent:#8b63f6;--lilac:#eee9ff;--line:#e8e3ee}
.frame{position:relative;width:1080px;height:1080px;overflow:hidden;padding:70px;background:#fbfafc;color:var(--ink)}
.frame.dark{background:#121116;color:#faf9ff;--ink:#faf9ff;--muted:#c8c2d0;--lilac:#211d2c;--line:#37333f}
.brand{position:relative;z-index:4}.brand img{width:248px;height:44px;object-fit:contain;object-position:left center}
.eyebrow{margin:48px 0 15px;font-family:Sora,sans-serif;font-size:18px;font-weight:700;letter-spacing:.15em;color:var(--accent);text-transform:uppercase}
h1{margin:0;font-family:Sora,sans-serif;font-size:68px;line-height:1.02;letter-spacing:-.055em;max-width:590px} .support{margin:26px 0 0;font-size:27px;line-height:1.35;color:var(--muted);max-width:510px}
.cta{display:inline-flex;margin-top:34px;padding:16px 24px;border-radius:999px;background:var(--accent);color:white;font-size:19px;font-weight:800}.footer{position:absolute;left:70px;right:70px;bottom:58px;padding-top:20px;border-top:1px solid var(--line);font-size:15px;color:var(--muted);letter-spacing:.07em}
.phone{position:absolute;overflow:hidden;border-radius:48px;background:#101016;padding:12px;box-shadow:0 36px 80px rgba(11,8,22,.28),inset 0 0 0 1px rgba(255,255,255,.28)}.phone img{display:block;width:100%;height:100%;object-fit:cover;border-radius:37px}
.phone.front{right:100px;top:160px;width:340px;height:660px}.phone.angle{right:84px;top:185px;width:365px;height:640px;transform:perspective(1200px) rotateY(-14deg) rotateZ(3deg);transform-origin:center;box-shadow:30px 46px 100px rgba(11,8,22,.32)}
.depth .phone.primary{right:128px;top:170px;width:330px;height:650px;z-index:3}.depth .back-card{position:absolute;right:335px;top:300px;width:270px;height:410px;overflow:hidden;border-radius:30px;opacity:.74;transform:rotate(-8deg);box-shadow:0 24px 60px rgba(11,8,22,.18)}.depth .back-card img{width:100%;height:100%;object-fit:cover}
.spotlight .phone{left:50%;top:300px;width:370px;height:480px;transform:translateX(-50%);border-radius:34px}.spotlight .phone img{border-radius:26px}.spotlight h1{max-width:720px;font-size:60px}.statement h1{max-width:790px;font-size:82px}.statement .logic{display:flex;gap:16px;margin-top:54px}.statement .logic span{padding:16px 22px;border-radius:16px;background:var(--lilac);font-weight:800;color:#55459a}
`;

function brand(logo) { return '<div class="brand"><img src="'+logo+'" alt="Innerbloom"></div>'; }
function footer(job) { return '<div class="footer">INNERBLOOM · '+esc(job.asset_code)+'</div>'; }
function copy(job) {
  const c=job.visible_copy || {};
  return '<p class="eyebrow">'+esc(c.eyebrow || "Innerbloom")+'</p><h1>'+esc(c.headline)+'</h1>'+(c.supporting_text?'<p class="support">'+esc(c.supporting_text)+'</p>':"")+(c.microcopy?.[0]?'<span class="cta">'+esc(c.microcopy[0])+'</span>':"");
}
function html(job, logo, sources) {
  const d=job.creative_direction;
  const mode=d.mode==="dark"?"dark":"";
  const main=sources[0], second=sources[1];
  let scene="";
  if (d.visual_family==="product_angle") scene='<div class="phone angle"><img src="'+main+'" alt=""></div>';
  else if (d.visual_family==="product_depth" || d.visual_family==="product_hero_scene") scene='<div class="depth"><div class="back-card"><img src="'+(second||main)+'" alt=""></div><div class="phone primary"><img src="'+main+'" alt=""></div></div>';
  else if (d.visual_family==="module_spotlight") scene='<div class="spotlight"><div class="phone"><img src="'+main+'" alt=""></div></div>';
  else if (d.visual_family==="editorial_statement") scene='<div class="statement"><div class="logic"><span>Observe</span><span>Adjust</span><span>Continue</span></div></div>';
  else if (d.visual_family==="proof_sequence") scene='<div class="depth"><div class="back-card"><img src="'+(second||main)+'" alt=""></div><div class="phone primary"><img src="'+main+'" alt=""></div></div>';
  else scene='<div class="phone front"><img src="'+main+'" alt=""></div>';
  return '<html><head><style>'+css+'</style></head><body><main class="frame '+mode+'">'+brand(logo)+'<section>'+copy(job)+'</section>'+scene+footer(job)+'</main></body></html>';
}

async function main() {
  const campaign=JSON.parse(await fs.readFile(campaignPath,"utf8"));
  const logo=await sourceUri("brand_logo_full");
  const jobs=campaign.image_generation?.jobs || [];
  if (!jobs.length) throw new Error("campaign.json has no image_generation.jobs");
  await fs.mkdir(outputDir,{recursive:true});
  const browser=await chromium.launch();
  const manifest=[];
  try {
    const page=await browser.newPage({viewport:{width:1080,height:1080},deviceScaleFactor:1});
    for (const job of jobs) {
      const d=job.creative_direction;
      if (!d) throw new Error(job.asset_code+" is missing creative_direction. Run the Creative Director first.");
      if (d.status==="blocked") { manifest.push({asset_code:job.asset_code,status:"blocked",reason:d.blocking_reason}); continue; }
      const sources=await Promise.all(d.selected_asset_keys.map(sourceUri));
      await page.setContent(html(job,logo,sources),{waitUntil:"networkidle"});
      const file=path.join(outputDir,job.expected_output?.filename || job.asset_code+".png");
      await page.screenshot({path:file});
      manifest.push({asset_code:job.asset_code,status:"rendered",file:path.relative(repoRoot,file),creative_direction:d});
    }
  } finally { await browser.close(); }
  await fs.writeFile(path.join(outputDir,"render-manifest.json"),JSON.stringify(manifest,null,2)+"\n");
  console.log("Rendered "+manifest.filter(x=>x.status==="rendered").length+" assets to "+path.relative(repoRoot,outputDir));
}
main().catch(error=>{console.error(error);process.exit(1);});
