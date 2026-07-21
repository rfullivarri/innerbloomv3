#!/usr/bin/env node
/**
 * Innerbloom deterministic campaign renderer v3.
 * Creative choices come from campaign.json; this file only renders them.
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
if (!campaignArg) throw new Error("Usage: render-campaign-v3 <campaign.json> --asset-dir <directory> --out <directory> [--limit N]");
function arg(name, fallback) { const i = args.indexOf(name); return i === -1 ? fallback : args[i + 1]; }
const campaignPath = path.resolve(campaignArg);
const assetDir = path.resolve(arg("--asset-dir", path.join(path.dirname(campaignPath), "staged-assets")));
const outputDir = path.resolve(arg("--out", path.join(repoRoot, "marketing/generated")));
const limit = Number.parseInt(arg("--limit", "0"), 10) || 0;
const esc = (v) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

async function dataUri(file) {
  const bytes = await fs.readFile(file); const ext = path.extname(file).toLowerCase();
  const mime = ext === ".webp" ? "image/webp" : [".jpg", ".jpeg"].includes(ext) ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${bytes.toString("base64")}`;
}
async function sourceUri(key) {
  for (const ext of [".png", ".webp", ".jpg", ".jpeg"]) {
    try { return await dataUri(path.join(assetDir, key + ext)); } catch {}
  }
  throw new Error(`Missing staged asset for ${key}. Run Drive staging first.`);
}

const css = `
@import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap");
*{box-sizing:border-box}html,body{margin:0;width:1080px;height:1080px;overflow:hidden}body{font-family:Manrope,system-ui,sans-serif;background:#f7f4f1}
:root{--violet:#8b63f6;--violet2:#b98cff;--ink:#17151b;--muted:#645f69;--paper:#fbfafc;--line:rgba(33,25,45,.12);--shadow:0 38px 100px rgba(32,19,57,.23)}
.frame{position:relative;width:1080px;height:1080px;overflow:hidden;color:var(--ink);background:var(--paper);isolation:isolate}
.frame.dark{--ink:#fffdfc;--muted:#c8c2ce;--line:rgba(255,255,255,.13);background:#111015}
.frame.lilac{background:#eee8ff}.frame.warm{background:#f5ece1}.frame.ink{background:#251c35;color:#fffdfc;--ink:#fffdfc;--muted:#d8cede}
.mesh,.mesh:before,.mesh:after{position:absolute;content:"";border-radius:999px;filter:blur(3px);pointer-events:none;z-index:-1}.mesh{width:520px;height:520px;right:-170px;top:-170px;background:radial-gradient(circle,rgba(183,127,255,.42),transparent 68%)}.mesh:before{width:460px;height:460px;right:480px;top:640px;background:radial-gradient(circle,rgba(248,192,164,.3),transparent 68%)}.dark .mesh{opacity:.7}
.grain{position:absolute;inset:0;opacity:.035;z-index:9;pointer-events:none;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E")}
.brand{position:absolute;top:64px;left:68px;z-index:20}.brand img{display:block;width:238px;height:46px;object-fit:contain;object-position:left center}.dark .brand img,.ink .brand img{filter:brightness(0) invert(1)}.brand.mark img{width:52px;height:52px;object-position:center}
.copy{position:absolute;z-index:12}.eyebrow{margin:0 0 17px;font:700 17px/1 Sora,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--violet)}
h1{margin:0;font:700 64px/1.02 Sora,sans-serif;letter-spacing:-.057em;text-wrap:balance}.support{margin:25px 0 0;color:var(--muted);font-size:25px;line-height:1.34;max-width:520px;text-wrap:balance}.cta{display:inline-flex;align-items:center;gap:13px;margin-top:32px;padding:17px 24px;border-radius:999px;background:var(--violet);color:white;font-size:18px;font-weight:800;box-shadow:0 16px 38px rgba(139,99,246,.28)}.cta:after{content:"→"}
.meta{position:absolute;z-index:15;left:68px;bottom:52px;font-size:14px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}.counter{position:absolute;right:68px;bottom:52px;z-index:15;font:700 14px Sora;color:var(--muted)}
.rule{position:absolute;height:1px;background:var(--line);left:68px;right:68px;bottom:84px}
.device{position:absolute;z-index:8;width:332px;height:686px;padding:16px;border-radius:58px;background:linear-gradient(145deg,#77727d 0%,#252329 19%,#050507 52%,#5d5963 100%);box-shadow:0 48px 110px rgba(18,10,35,.35),inset 0 0 0 1px rgba(255,255,255,.5)}
.device:before{content:"";position:absolute;left:-4px;top:155px;width:4px;height:94px;border-radius:5px 0 0 5px;background:#39363d;box-shadow:0 115px 0 #39363d}.device:after{content:"";position:absolute;right:-4px;top:190px;width:4px;height:126px;border-radius:0 5px 5px 0;background:#39363d}
.screen{position:relative;width:100%;height:100%;overflow:hidden;padding:5px;border:1px solid rgba(255,255,255,.16);border-radius:45px;background:#09090d}.screen img{display:block;width:100%;height:100%;object-fit:cover;object-position:top center;border-radius:39px}.island{position:absolute;z-index:4;top:18px;left:50%;transform:translateX(-50%);width:105px;height:28px;border-radius:20px;background:#020204;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 1px 2px rgba(255,255,255,.08)}.shine{position:absolute;z-index:3;inset:3px;border-radius:54px;background:linear-gradient(112deg,rgba(255,255,255,.19),transparent 20%,transparent 72%,rgba(255,255,255,.07));pointer-events:none}
.device.small{width:270px;height:558px;padding:13px;border-radius:48px}.device.small .screen{border-radius:38px}.device.small .screen img{border-radius:33px}.device.small .island{width:82px;height:22px;top:16px}
.product-card{position:absolute;overflow:hidden;border-radius:34px;background:#ece4da;box-shadow:var(--shadow);border:1px solid rgba(255,255,255,.3)}.product-card img{display:block;width:100%;height:100%;object-fit:cover;object-position:center}.product-card.landscape img{object-fit:contain;background:#f5eee6}
.glass{position:absolute;z-index:4;border:1px solid rgba(255,255,255,.42);background:rgba(255,255,255,.13);backdrop-filter:blur(15px);border-radius:30px;box-shadow:0 24px 64px rgba(28,15,48,.16)}
.orbit{position:absolute;border:1px solid var(--line);border-radius:999px}.orb{position:absolute;border-radius:999px;background:var(--violet);box-shadow:0 0 0 18px rgba(139,99,246,.12)}
.signal{position:absolute;z-index:3;display:flex;align-items:flex-end;gap:14px}.signal i{display:block;width:13px;border-radius:10px;background:linear-gradient(var(--violet2),var(--violet));opacity:.9}
.number{position:absolute;font:800 280px/.8 Sora;color:rgba(139,99,246,.12);letter-spacing:-.09em}
.quote{position:absolute;font:800 220px/.5 Georgia;color:rgba(139,99,246,.2)}

/* Product compositions */
.split-right .copy{left:68px;top:250px;width:540px}.split-right h1{font-size:62px}.split-right .device{right:62px;top:200px}.split-right .halo{position:absolute;right:-90px;top:130px;width:640px;height:640px;border-radius:50%;background:radial-gradient(circle,#d8c9ff 0,#eee8ff 48%,transparent 69%);z-index:0}
.split-left .copy{right:68px;top:250px;width:500px}.split-left h1{font-size:60px}.split-left .device{left:88px;top:202px;transform:rotate(-5deg)}
.center-stage .copy{left:70px;top:120px;width:940px;text-align:center}.center-stage .copy .support{margin:20px auto 0}.center-stage h1{font-size:59px}.center-stage .device{left:50%;top:370px;transform:translateX(-50%);width:285px;height:590px}.center-stage .orbit.o1{width:620px;height:620px;left:230px;top:340px}.center-stage .orbit.o2{width:820px;height:820px;left:130px;top:240px}
.diagonal-crop .copy{left:68px;top:175px;width:520px}.diagonal-crop .device{right:-36px;top:178px;width:455px;height:890px;transform:perspective(1300px) rotateY(-13deg) rotateZ(6deg)}.diagonal-crop .copy h1{font-size:66px}
.layered-depth .copy{left:68px;top:240px;width:420px}.layered-depth .copy h1{font-size:56px}.layered-depth .device.main{right:66px;top:180px}.layered-depth .device.back{right:310px;top:320px;transform:rotate(-12deg);opacity:.66;filter:saturate(.75);z-index:5}.layered-depth .glass{right:250px;top:185px;width:260px;height:170px}
.floating-orbit .copy{left:68px;top:680px;width:850px}.floating-orbit .copy h1{font-size:61px}.floating-orbit .device{right:145px;top:86px;width:270px;height:558px;transform:rotate(7deg)}.floating-orbit .orb.a{left:120px;top:210px;width:72px;height:72px}.floating-orbit .orb.b{right:90px;top:530px;width:42px;height:42px;background:#f6b77d}.floating-orbit .orbit{width:700px;height:440px;left:175px;top:135px;transform:rotate(-12deg)}
.macro .copy{left:68px;top:690px;width:880px}.macro .copy h1{font-size:62px}.feature-crop{position:absolute;left:68px;right:68px;top:120px;height:510px;overflow:hidden;border-radius:34px;background:#17151b;box-shadow:var(--shadow);border:1px solid rgba(255,255,255,.4)}.feature-crop img{position:absolute;left:0;top:var(--focus,-420px);width:100%;height:auto;display:block}
.bento .copy{left:68px;top:160px;width:470px}.bento .copy h1{font-size:58px}.bento .device{right:76px;top:145px;width:286px;height:592px}.bento .product-card.a{left:92px;bottom:108px;width:310px;height:220px}.bento .product-card.b{left:425px;bottom:108px;width:295px;height:220px}.bento .meta,.bento .rule{display:none}

/* Editorial compositions */
.type-monument .copy{left:68px;top:205px;width:900px}.type-monument h1{font-size:88px;line-height:.98}.type-monument .support{font-size:27px}.type-monument .number{right:40px;bottom:90px}
.signal-line .copy{left:68px;top:195px;width:760px}.signal-line h1{font-size:76px}.signal-line .signal{left:72px;bottom:170px}.signal-line .signal i:nth-child(1){height:42px}.signal-line .signal i:nth-child(2){height:80px}.signal-line .signal i:nth-child(3){height:118px}.signal-line .signal i:nth-child(4){height:72px}.signal-line .signal i:nth-child(5){height:145px}.signal-line .signal i:nth-child(6){height:185px}
.steps .copy{left:68px;top:170px;width:820px}.steps h1{font-size:69px}.step-row{position:absolute;left:68px;right:68px;bottom:155px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.step{padding:25px 22px 28px;border-radius:24px;background:rgba(139,99,246,.1);border:1px solid rgba(139,99,246,.12)}.step b{display:block;font:700 14px Sora;color:var(--violet);margin-bottom:30px}.step span{font:700 22px Sora}
.quote-frame .copy{left:145px;top:250px;width:790px}.quote-frame h1{font-size:76px}.quote-frame .quote{left:60px;top:180px}.quote-frame:before{content:"";position:absolute;inset:110px 58px 125px;border:1px solid var(--line);border-radius:48px}

/* Carousel chapters */
.chapter .brand{top:58px}.chapter .copy{left:68px;top:190px;width:720px}.chapter h1{font-size:74px}.chapter .chapter-no{position:absolute;right:58px;top:56px;font:800 170px/.8 Sora;color:rgba(139,99,246,.15)}.chapter .product-card{right:68px;bottom:118px;width:390px;height:270px;transform:rotate(-3deg)}.chapter .device{right:92px;bottom:90px;top:auto}
.proof-focus .copy{left:68px;top:170px;width:465px}.proof-focus h1{font-size:59px}.proof-focus .device{right:78px;top:155px}.proof-focus .badge{position:absolute;left:68px;bottom:180px;padding:15px 20px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-weight:700}
.transition .copy{left:250px;top:260px;width:580px;text-align:center}.transition h1{font-size:75px}.transition .support{margin:25px auto}.transition .orbit{width:760px;height:760px;left:160px;top:140px}.transition .orb{left:505px;top:735px;width:64px;height:64px}
.cta-close .copy{left:68px;top:210px;width:680px}.cta-close h1{font-size:74px}.cta-close .product-card{right:-20px;bottom:-10px;width:500px;height:350px;transform:rotate(-5deg)}.cta-close .device{right:90px;bottom:70px;top:auto}
`;

function device(src, classes = "") { return `<div class="device ${classes}"><div class="shine"></div><div class="screen"><span class="island"></span><img src="${src}" alt=""/></div></div>`; }
function card(src, classes = "") { return `<div class="product-card ${classes}"><img src="${src}" alt=""/></div>`; }
function feature(src, focus = 42) { return `<div class="feature-crop" style="--focus:-${Math.max(0,Math.min(80,focus))*10}px"><img src="${src}" alt=""/></div>`; }
function copy(job) {
  const headline = job.visible_copy?.headline || ""; const support = job.visible_copy?.supporting_text || "";
  return `<div class="copy"><div class="eyebrow">${esc(job.post_code?.replace("post_", "Innerbloom · ") || "Innerbloom")}</div><h1>${esc(headline)}</h1>${support ? `<p class="support">${esc(support)}</p>` : ""}</div>`;
}
function chrome(job, logo, index, total) {
  const slide = job.slide_number ? `${String(job.slide_number).padStart(2,"0")} / 05` : `${String(index + 1).padStart(2,"0")} / ${String(total).padStart(2,"0")}`;
  return `<div class="mesh"></div><div class="grain"></div><div class="brand"><img src="${logo}" alt="Innerbloom"/></div><div class="rule"></div><div class="meta">innerbloom.app</div><div class="counter">${slide}</div>`;
}
function composition(job, sources) {
  const variant = job.creative_direction?.layout_variant || "split_device_right";
  const a = sources[0], b = sources[1] || sources[0];
  const mobile = (job.creative_direction?.selected_asset_keys?.[0] || "").startsWith("mobile_");
  const labels = job.creative_direction?.sequence_labels || ["Notice the signal","Read the context","Choose the next step"];
  switch (variant) {
    case "split_device_left": return { cls:"split-left", body:copy(job)+device(a) };
    case "cinematic_device_center": return { cls:"center-stage", body:copy(job)+`<div class="orbit o1"></div><div class="orbit o2"></div>`+device(a) };
    case "device_diagonal_crop": return { cls:"diagonal-crop", body:copy(job)+device(a) };
    case "layered_product_depth": return { cls:"layered-depth", body:copy(job)+`<div class="glass"></div>`+device(b,"small back")+device(a,"main") };
    case "floating_device_orbit": return { cls:"floating-orbit", body:copy(job)+`<div class="orbit"></div><div class="orb a"></div><div class="orb b"></div>`+device(a,"small") };
    case "module_macro_crop": return { cls:"macro", body:copy(job)+feature(a,job.creative_direction?.focus_y || 42) };
    case "bento_product_proof": return { cls:"bento", body:copy(job)+card(b,"a")+card(a,"b")+device(a) };
    case "editorial_type_monument": return { cls:"type-monument", body:copy(job)+`<div class="number">${String(job.slide_number || "01").padStart(2,"0")}</div>` };
    case "editorial_signal_line": return { cls:"signal-line", body:copy(job)+`<div class="signal"><i></i><i></i><i></i><i></i><i></i><i></i></div>` };
    case "editorial_numbered_steps": return { cls:"steps", body:copy(job)+`<div class="step-row"><div class="step"><b>01</b><span>${esc(labels[0])}</span></div><div class="step"><b>02</b><span>${esc(labels[1])}</span></div><div class="step"><b>03</b><span>${esc(labels[2])}</span></div></div>` };
    case "editorial_quote_frame": return { cls:"quote-frame", body:copy(job)+`<div class="quote">“</div>` };
    case "carousel_chapter_cover": return { cls:"chapter", body:copy(job)+`<div class="chapter-no">${String(job.slide_number || 1).padStart(2,"0")}</div>`+(mobile?device(a,"small"):card(a)) };
    case "carousel_proof_focus": return { cls:"proof-focus", body:copy(job)+device(a) };
    case "carousel_transition": return { cls:"transition", body:copy(job)+`<div class="orbit"></div><div class="orb"></div>` };
    case "carousel_cta_close": return { cls:"cta-close", body:copy(job)+(mobile?device(a,"small"):card(a,"landscape")) };
    default: return { cls:"split-right", body:`<div class="halo"></div>`+copy(job)+device(a) };
  }
}

async function main() {
  const campaign = JSON.parse(await fs.readFile(campaignPath, "utf8"));
  const all = campaign.image_generation?.jobs || []; const jobs = limit ? all.slice(0, limit) : all;
  if (!jobs.length) throw new Error("Campaign has no image jobs");
  await fs.mkdir(outputDir, { recursive:true });
  const logo = await sourceUri("brand_logo_full");
  const browser = await chromium.launch({ headless:true }); const page = await browser.newPage({ viewport:{width:1080,height:1080}, deviceScaleFactor:1 });
  try {
    for (let i=0;i<jobs.length;i++) {
      const job=jobs[i], d=job.creative_direction || {}, keys=d.selected_asset_keys || [];
      if (!keys.length) throw new Error(`${job.asset_code}: selected_asset_keys is empty`);
      const sources=await Promise.all(keys.slice(0,2).map(sourceUri)); const comp=composition(job,sources);
      const palette=d.palette || (d.mode === "dark" ? "dark" : "light");
      const html=`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><main class="frame ${esc(palette)} ${comp.cls}">${chrome(job,logo,i,all.length)}${comp.body}</main></body></html>`;
      await page.setContent(html,{waitUntil:"networkidle"}); await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:path.join(outputDir,`${job.asset_code}.png`),type:"png"});
    }
  } finally { await browser.close(); }
  console.log(`Rendered ${jobs.length} campaign PNGs with renderer v3.`);
}
main().catch(e=>{console.error(e);process.exit(1)});
