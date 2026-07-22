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

async function fontCss() {
  const faces = [
    ["Sora",700,"@fontsource/sora/files/sora-latin-700-normal.woff2"],
    ["Sora",800,"@fontsource/sora/files/sora-latin-800-normal.woff2"],
    ["Manrope",400,"@fontsource/manrope/files/manrope-latin-400-normal.woff2"],
    ["Manrope",700,"@fontsource/manrope/files/manrope-latin-700-normal.woff2"]
  ];
  return (await Promise.all(faces.map(async ([family,weight,module]) => {
    const bytes = await fs.readFile(requireFromWeb.resolve(module));
    return `@font-face{font-family:${family};font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${bytes.toString("base64")}) format("woff2")}`;
  }))).join("\n");
}

const css = `
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
.device{position:absolute;z-index:8;width:342px;height:704px;padding:10px;border-radius:61px;background:linear-gradient(118deg,#97949d 0%,#48464e 8%,#141318 27%,#050507 58%,#46434c 84%,#aaa6af 100%);box-shadow:0 55px 120px rgba(18,10,35,.38),0 18px 36px rgba(18,10,35,.2),inset 0 0 0 1px rgba(255,255,255,.78),inset 0 0 0 3px rgba(0,0,0,.7)}
.device:before{content:"";position:absolute;left:-5px;top:144px;width:5px;height:44px;border-radius:6px 0 0 6px;background:linear-gradient(#77737c,#252329);box-shadow:0 67px 0 #39363d,0 139px 0 #39363d}.device:after{content:"";position:absolute;right:-5px;top:190px;width:5px;height:130px;border-radius:0 6px 6px 0;background:linear-gradient(#77737c,#252329)}
.metal-rim{position:absolute;inset:4px;border-radius:57px;border:1px solid rgba(255,255,255,.32);box-shadow:inset 0 0 0 1px rgba(0,0,0,.75);pointer-events:none;z-index:5}.screen{position:relative;width:100%;height:100%;overflow:hidden;padding:10px;border:1px solid rgba(255,255,255,.16);border-radius:51px;background:#09090d;box-shadow:inset 0 0 0 2px #020204}.screen.light{background:#f4ede5}.screen.dark{background:#07070a}.screen img{display:block;width:100%;height:100%;object-fit:contain;object-position:center center;border-radius:41px}.screen:after{content:"";position:absolute;inset:8px;border-radius:42px;background:linear-gradient(118deg,rgba(255,255,255,.08),transparent 21%,transparent 78%,rgba(255,255,255,.035));pointer-events:none}.island{position:absolute;z-index:6;top:18px;left:50%;transform:translateX(-50%);width:108px;height:30px;border-radius:22px;background:linear-gradient(#050507,#000);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 2px 5px rgba(0,0,0,.45)}.camera{position:absolute;right:9px;top:8px;width:12px;height:12px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#3a4b78 0 12%,#11172b 27%,#020205 66%);box-shadow:0 0 0 1px rgba(255,255,255,.06)}.shine{position:absolute;z-index:4;inset:3px;border-radius:58px;background:linear-gradient(112deg,rgba(255,255,255,.22),transparent 18%,transparent 72%,rgba(255,255,255,.08));pointer-events:none}
.device.small{width:276px;height:568px;padding:9px;border-radius:50px}.device.small .metal-rim{border-radius:46px}.device.small .screen{border-radius:43px;padding:8px}.device.small .screen img{border-radius:35px}.device.small .island{width:84px;height:23px;top:15px}.device.small .camera{width:9px;height:9px;top:7px;right:7px}
.proof-chip{position:absolute;z-index:18;display:flex;align-items:center;gap:12px;max-width:470px;padding:19px 24px;border-radius:24px;background:rgba(255,255,255,.88);border:1px solid rgba(255,255,255,.8);box-shadow:0 22px 60px rgba(25,17,40,.2);backdrop-filter:blur(18px);color:#17151b;font:700 20px/1.2 Manrope}.proof-chip:before{content:"✓";display:grid;place-items:center;flex:0 0 32px;height:32px;border-radius:50%;background:#17151b;color:#fff;font-size:16px}.dark .proof-chip,.ink .proof-chip{background:rgba(27,25,32,.88);border-color:rgba(255,255,255,.12);color:#fff}.dark .proof-chip:before,.ink .proof-chip:before{background:var(--violet)}
.product-fade{position:absolute;z-index:11;left:0;right:0;height:180px;background:linear-gradient(transparent,var(--paper) 72%);pointer-events:none}.dark .product-fade{background:linear-gradient(transparent,#111015 72%)}.ink .product-fade{background:linear-gradient(transparent,#251c35 72%)}
.product-card{position:absolute;overflow:hidden;border-radius:34px;background:#ece4da;box-shadow:var(--shadow);border:1px solid rgba(255,255,255,.3)}.product-card img{display:block;width:100%;height:100%;object-fit:cover;object-position:center}.product-card.landscape img,.product-card.mobile img{object-fit:contain;background:#0b0a0e}
.glass{position:absolute;z-index:4;border:1px solid rgba(255,255,255,.42);background:rgba(255,255,255,.13);backdrop-filter:blur(15px);border-radius:30px;box-shadow:0 24px 64px rgba(28,15,48,.16)}
.orbit{position:absolute;border:1px solid var(--line);border-radius:999px}.orb{position:absolute;border-radius:999px;background:var(--violet);box-shadow:0 0 0 18px rgba(139,99,246,.12)}
.signal{position:absolute;z-index:3;display:flex;align-items:flex-end;gap:14px}.signal i{display:block;width:13px;border-radius:10px;background:linear-gradient(var(--violet2),var(--violet));opacity:.9}
.number{position:absolute;font:800 280px/.8 Sora;color:rgba(139,99,246,.12);letter-spacing:-.09em}
.quote{position:absolute;font:800 220px/.5 Georgia;color:rgba(139,99,246,.2)}

/* Campaign JSON drives these slots; the scene plate supplies the photographic art direction. */
.editorial-material{background:#e9ded1}.editorial-material>.brand,.editorial-material>.mesh,.editorial-material>.grain,.editorial-material>.rule,.editorial-material>.meta,.editorial-material>.counter{display:none}
.material-scene{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:-3}.material-veil{position:absolute;inset:0;z-index:-2;background:linear-gradient(90deg,rgba(247,241,233,.97) 0%,rgba(247,241,233,.88) 37%,rgba(247,241,233,.23) 63%,rgba(247,241,233,0) 82%)}
.material-brand{position:absolute;left:64px;top:58px;z-index:20}.material-brand img{display:block;width:38px;height:38px;object-fit:contain}.editorial-material .copy{left:64px;top:214px;width:590px}.editorial-material .copy h1{font-size:72px;line-height:.96;letter-spacing:-.065em;max-width:590px}.editorial-material .copy h1 .accent{display:block;color:#7651de}.editorial-material .support{width:475px;margin-top:30px;color:#5d5661;font-size:22px;line-height:1.42}
.material-annotation{position:absolute;left:64px;bottom:62px;z-index:15;display:grid;grid-template-columns:38px 300px;gap:17px;align-items:start;color:#554e59;font-size:13px;line-height:1.42}.material-annotation:before{content:"↗";display:grid;place-items:center;width:38px;height:38px;border:1px solid rgba(25,22,29,.24);border-radius:50%;font-weight:700;color:#211d25}.material-annotation strong{display:block;color:#211d25;margin-bottom:3px;font-weight:700}
.editorial-material .device{right:48px;top:330px;width:356px;transform:perspective(1200px) rotateX(1.5deg) rotateY(-8deg) rotateZ(var(--device-angle,6deg));transform-origin:50% 75%;box-shadow:0 44px 70px rgba(42,28,25,.42),0 12px 22px rgba(42,28,25,.22),inset 0 0 0 1px rgba(255,255,255,.78),inset 0 0 0 3px rgba(0,0,0,.68)}
.material-contact-shadow{position:absolute;right:15px;bottom:62px;width:450px;height:210px;border-radius:50%;background:radial-gradient(ellipse,rgba(48,34,29,.44),rgba(48,34,29,.15) 48%,transparent 72%);filter:blur(17px);transform:rotate(8deg);z-index:2}.material-bottom-rule{position:absolute;left:64px;right:64px;bottom:43px;height:1px;background:rgba(25,22,29,.16)}
.editorial-material.copy-right .copy{left:auto;right:64px;width:540px}.editorial-material.copy-right .material-annotation{left:auto;right:64px}.editorial-material.product-lower_left .device{right:auto;left:48px;transform:perspective(1200px) rotateX(1.5deg) rotateY(8deg) rotateZ(var(--device-angle,-6deg))}.editorial-material.product-lower_left .material-contact-shadow{right:auto;left:15px;transform:rotate(-8deg)}
.editorial-material.veil-right_dark .material-veil{background:linear-gradient(270deg,rgba(18,12,21,.96) 0%,rgba(18,12,21,.86) 42%,rgba(18,12,21,.18) 68%,rgba(18,12,21,0) 86%)}.editorial-material.veil-right_dark .copy h1{color:#fffdfc}.editorial-material.veil-right_dark .support,.editorial-material.veil-right_dark .material-annotation{color:#d5cbd6}.editorial-material.veil-right_dark .material-annotation strong{color:#fff}.editorial-material.veil-right_dark .material-annotation:before{border-color:rgba(255,255,255,.38);color:#fff}.editorial-material.veil-right_dark .material-bottom-rule{background:rgba(255,255,255,.2)}

/* Product compositions */
.split-right .copy{left:68px;top:250px;width:540px}.split-right h1{font-size:62px}.split-right .device{right:62px;top:200px}.split-right .halo{position:absolute;right:-90px;top:130px;width:640px;height:640px;border-radius:50%;background:radial-gradient(circle,#d8c9ff 0,#eee8ff 48%,transparent 69%);z-index:0}
.split-left .copy{right:68px;top:250px;width:500px}.split-left h1{font-size:60px}.split-left .device{left:88px;top:202px;transform:rotate(-5deg)}
.center-stage .copy{left:70px;top:120px;width:940px;text-align:center}.center-stage .copy .support{margin:20px auto 0}.center-stage h1{font-size:59px}.center-stage .device{left:50%;top:370px;transform:translateX(-50%);width:285px;height:590px}.center-stage .orbit.o1{width:620px;height:620px;left:230px;top:340px}.center-stage .orbit.o2{width:820px;height:820px;left:130px;top:240px}
.diagonal-crop .copy{left:68px;top:175px;width:520px}.diagonal-crop .device{right:-36px;top:178px;width:455px;height:890px;transform:perspective(1300px) rotateY(-13deg) rotateZ(6deg)}.diagonal-crop .copy h1{font-size:66px}
.layered-depth .copy{left:68px;top:240px;width:420px}.layered-depth .copy h1{font-size:56px}.layered-depth .device.main{right:66px;top:180px}.layered-depth .device.back{right:310px;top:320px;transform:rotate(-12deg);opacity:.66;filter:saturate(.75);z-index:5}.layered-depth .glass{right:250px;top:185px;width:260px;height:170px}
.floating-orbit .copy{left:68px;top:680px;width:850px}.floating-orbit .copy h1{font-size:61px}.floating-orbit .device{right:145px;top:86px;width:270px;height:558px;transform:rotate(7deg)}.floating-orbit .orb.a{left:120px;top:210px;width:72px;height:72px}.floating-orbit .orb.b{right:90px;top:530px;width:42px;height:42px;background:#f6b77d}.floating-orbit .orbit{width:700px;height:440px;left:175px;top:135px;transform:rotate(-12deg)}
.macro .copy{left:68px;top:690px;width:880px}.macro .copy h1{font-size:62px}.feature-crop{position:absolute;left:68px;right:68px;top:120px;height:510px;overflow:hidden;border-radius:34px;background:#17151b;box-shadow:var(--shadow);border:1px solid rgba(255,255,255,.4)}.feature-crop img{position:absolute;left:0;top:var(--focus,-420px);width:100%;height:auto;display:block}
.bento .copy{left:68px;top:160px;width:470px}.bento .copy h1{font-size:58px}.bento .device{right:76px;top:145px;width:286px;height:592px}.bento .product-card.a{left:92px;bottom:108px;width:310px;height:220px}.bento .product-card.b{left:425px;bottom:108px;width:295px;height:220px}.bento .meta,.bento .rule{display:none}

/* 2026 storefront-inspired product skeletons. These borrow composition grammar,
   never competitor branding or UI. The device may crop at the canvas edge;
   the registered screenshot inside it always remains contained. */
.storefront-stage .copy{left:92px;right:92px;top:116px;text-align:center}.storefront-stage h1{font-size:58px}.storefront-stage .support{margin:18px auto 0}.storefront-stage .device{left:50%;top:350px;transform:translateX(-50%);width:410px;height:846px}.storefront-stage .proof-chip{left:50%;top:625px;transform:translateX(-50%);width:520px}.storefront-stage .product-fade{bottom:0}.storefront-stage .meta,.storefront-stage .rule,.storefront-stage .counter{z-index:20}
.storefront-dual .copy{left:68px;top:145px;width:610px}.storefront-dual h1{font-size:60px}.storefront-dual .device.front{right:98px;top:265px;transform:rotate(2deg)}.storefront-dual .device.back{right:372px;top:385px;transform:rotate(-7deg);opacity:.78;filter:saturate(.82);z-index:5}.storefront-dual .proof-chip{left:285px;top:640px;width:430px}
.storefront-overlay .copy{left:68px;top:150px;width:490px}.storefront-overlay h1{font-size:61px}.storefront-overlay .device{right:92px;top:185px;width:390px;height:806px}.storefront-overlay .proof-chip{right:55px;top:555px;width:485px}.storefront-overlay .halo{position:absolute;right:-110px;top:80px;width:650px;height:770px;border-radius:48%;background:radial-gradient(circle,rgba(185,140,255,.3),transparent 68%)}
.storefront-edge .copy{left:68px;top:670px;width:870px}.storefront-edge h1{font-size:61px}.storefront-edge .device{right:82px;top:48px;width:286px;height:602px;transform:perspective(1200px) rotateY(-11deg) rotateZ(5deg)}.storefront-edge .orbit{width:690px;height:470px;left:160px;top:105px;transform:rotate(-10deg)}.storefront-edge .orb.a{left:105px;top:190px;width:68px;height:68px}.storefront-edge .orb.b{right:90px;top:535px;width:42px;height:42px;background:#f1ae6d}
.storefront-cards .copy{left:68px;top:145px;width:560px}.storefront-cards h1{font-size:60px}.storefront-cards .device{right:76px;top:205px}.storefront-cards .product-card.a{left:68px;bottom:128px;width:330px;height:215px;transform:rotate(-3deg)}.storefront-cards .product-card.b{left:370px;bottom:90px;width:330px;height:215px;transform:rotate(4deg)}.storefront-cards .proof-chip{right:55px;top:600px;width:430px}
.storefront-monolith .copy{left:68px;top:160px;width:480px}.storefront-monolith h1{font-size:65px}.storefront-monolith .device{right:64px;top:135px;width:405px;height:836px}.storefront-monolith .proof-chip{left:68px;bottom:165px;width:445px}.storefront-monolith:after{content:"";position:absolute;right:-110px;top:80px;width:680px;height:820px;border-radius:50%;background:radial-gradient(circle,rgba(139,99,246,.25),transparent 68%);z-index:-1}
.storefront-module .copy{left:68px;top:680px;width:840px}.storefront-module h1{font-size:61px}.storefront-module .device{left:50%;top:50px;transform:translateX(-50%);width:390px;height:805px}.storefront-module .proof-chip{left:50%;top:430px;transform:translateX(-50%);width:520px}.storefront-module .product-fade{bottom:310px}
/* Registered UI details are treated as editorial focus crops, never as a second device. */
.focus-crop{position:absolute;z-index:14;overflow:hidden;border-radius:20px;background:transparent;border:0;padding:0;box-shadow:none;filter:drop-shadow(0 24px 30px rgba(20,14,34,.22));isolation:isolate}
.focus-crop img{display:block;width:100%;height:100%;object-fit:contain;border-radius:inherit;background:transparent}
.focus-crop.landscape{border-radius:18px}.focus-crop.portrait{border-radius:24px}.focus-crop.square{border-radius:22px}
.storefront-stage .focus-crop{left:50%;top:610px;transform:translateX(-50%)}
.storefront-overlay .focus-crop{right:46px;top:565px}
.storefront-cards .focus-crop{left:64px;bottom:118px;transform:rotate(-1.5deg)}
.storefront-monolith .focus-crop{left:68px;bottom:158px}
.storefront-module .focus-crop{left:50%;top:418px;transform:translateX(-50%)}
.storefront-dual .focus-crop{left:250px;top:610px;transform:rotate(-1.5deg)}
.metric-badge{position:absolute;z-index:18;display:grid;gap:7px;min-width:250px;padding:22px 24px;border-radius:22px;background:rgba(255,255,255,.9);box-shadow:0 18px 44px rgba(25,17,40,.18);backdrop-filter:blur(20px);color:#17151b}
.metric-badge b{font:800 38px/1 Sora;letter-spacing:-.04em}.metric-badge span{font:650 16px/1.25 Manrope;color:#6d6873}
.dark .metric-badge,.ink .metric-badge{background:rgba(24,22,29,.9);color:#fff}.dark .metric-badge span,.ink .metric-badge span{color:#c5becb}
.storefront-overlay .metric-badge{right:62px;top:595px}.storefront-monolith .metric-badge{left:68px;bottom:170px}


/* Editorial compositions */
.type-monument .copy{left:68px;top:205px;width:900px}.type-monument h1{font-size:88px;line-height:.98}.type-monument .support{font-size:27px}.type-monument .number{right:40px;bottom:90px}
.signal-line .copy{left:68px;top:195px;width:760px}.signal-line h1{font-size:76px}.signal-line .signal{left:72px;bottom:170px}.signal-line .signal i:nth-child(1){height:42px}.signal-line .signal i:nth-child(2){height:80px}.signal-line .signal i:nth-child(3){height:118px}.signal-line .signal i:nth-child(4){height:72px}.signal-line .signal i:nth-child(5){height:145px}.signal-line .signal i:nth-child(6){height:185px}
.steps .copy{left:68px;top:170px;width:820px}.steps h1{font-size:69px}.step-row{position:absolute;left:68px;right:68px;bottom:155px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.step{padding:25px 22px 28px;border-radius:24px;background:rgba(139,99,246,.1);border:1px solid rgba(139,99,246,.12)}.step b{display:block;font:700 14px Sora;color:var(--violet);margin-bottom:30px}.step span{font:700 22px Sora}
.quote-frame .copy{left:145px;top:250px;width:790px}.quote-frame h1{font-size:76px}.quote-frame .quote{left:60px;top:180px}.quote-frame:before{content:"";position:absolute;inset:110px 58px 125px;border:1px solid var(--line);border-radius:48px}

/* Carousel chapters */
.chapter .brand{top:58px}.chapter .copy{left:68px;top:190px;width:720px}.chapter h1{font-size:74px}.chapter .chapter-no{position:absolute;right:58px;top:56px;font:800 170px/.8 Sora;color:rgba(139,99,246,.15)}.chapter .product-card{right:68px;bottom:118px;width:390px;height:270px;transform:rotate(-3deg)}.chapter .device{right:92px;bottom:90px;top:auto}
.proof-focus .copy{left:68px;top:170px;width:465px}.proof-focus h1{font-size:59px}.proof-focus .device{right:78px;top:155px}.proof-focus .badge{position:absolute;left:68px;bottom:180px;padding:15px 20px;border:1px solid var(--line);border-radius:999px;color:var(--muted);font-weight:700}
.transition .copy{left:180px;top:170px;width:720px;text-align:center}.transition h1{font-size:68px}.transition .support{margin:22px auto}.transition .orbit{width:760px;height:760px;left:160px;top:140px}.transition .orb{left:505px;top:735px;width:64px;height:64px}.contrast{position:absolute;left:170px;right:170px;bottom:230px;display:grid;grid-template-columns:1fr 80px 1fr;align-items:center;gap:14px}.contrast span{display:flex;min-height:112px;padding:20px;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:26px;background:rgba(255,255,255,.08);font:700 22px/1.15 Sora;text-align:center}.contrast b{font:700 58px Sora;color:var(--violet)}
.cta-close .copy{left:68px;top:210px;width:680px}.cta-close h1{font-size:74px}.cta-close .product-card{right:-20px;bottom:-10px;width:500px;height:350px;transform:rotate(-5deg)}.cta-close .device{right:90px;bottom:70px;top:auto}
`;

function device(src, classes = "", tone = "dark") { return `<div class="device ${classes}"><div class="metal-rim"></div><div class="shine"></div><div class="screen ${tone}"><span class="island"><i class="camera"></i></span><img src="${src}" alt=""/></div></div>`; }
function card(src, classes = "") { return `<div class="product-card ${classes}"><img src="${src}" alt=""/></div>`; }
function feature(src, focus = 42) { return `<div class="feature-crop" style="--focus:-${Math.max(0,Math.min(80,focus))*10}px"><img src="${src}" alt=""/></div>`; }
function focusCrop(src, key = "") { if (!key.startsWith("module_")) return ""; return `<div class="focus-crop" data-asset-key="${esc(key)}"><img src="${src}" alt="Registered Innerbloom product detail"/></div>`; }
function proofChip(job) {
  const text = job.creative_direction?.insight_callout || job.creative_direction?.feature_callout || "";
  return text && !text.startsWith("Use the registered") ? `<div class="proof-chip">${esc(text)}</div>` : "";
}
function metricBadge(job) {
  const value=job.creative_direction?.metric_value || ""; const label=job.creative_direction?.metric_label || "";
  return value && label ? `<div class="metric-badge"><b>${esc(value)}</b><span>${esc(label)}</span></div>` : "";
}
function supportVisual(job, src, key = "") {
  const treatment=job.creative_direction?.supporting_treatment || (key.startsWith("module_") ? "focus_crop" : "none");
  if(treatment==="insight_callout") return proofChip(job);
  if(treatment==="metric_badge") return metricBadge(job);
  if(treatment==="none") return "";
  return focusCrop(src,key);
}
function visualFamily(key = "") {
  const normalized = key.toLowerCase();
  if (normalized.includes("emotion_balance")) return "emotion-balance";
  if (normalized.includes("daily_energy") || normalized.includes("energy_balance")) return "daily-energy";
  if (normalized.includes("emotion_chart") || normalized.includes("grid_dominant")) return "emotion-chart";
  if (normalized.includes("dailyquest") || normalized.includes("dquest") || normalized.includes("emotion_moderation")) return "daily-quest";
  if (normalized.includes("overview_streaks")) return "overview-streaks";
  return normalized;
}
function assertDistinctSupportVisual(job, keyA, keyB) {
  const treatment = job.creative_direction?.supporting_treatment;
  if (treatment === "focus_crop" && keyA && keyB && visualFamily(keyA) === visualFamily(keyB)) {
    throw new Error(`Duplicate primary/detail visual family in ${job.asset_code || job.post_code}: ${keyA} and ${keyB}`);
  }
}
function copy(job) {
  const headline = job.visible_copy?.headline || ""; const support = job.visible_copy?.supporting_text || "";
  return `<div class="copy"><div class="eyebrow">${esc(job.post_code?.replace("post_", "Innerbloom · ") || "Innerbloom")}</div><h1>${esc(headline)}</h1>${support ? `<p class="support">${esc(support)}</p>` : ""}</div>`;
}
function emphasizedHeadline(headline, emphasis) {
  if (!emphasis) return esc(headline);
  const at = headline.toLowerCase().indexOf(emphasis.toLowerCase());
  if (at < 0) return esc(headline);
  return `${esc(headline.slice(0, at))}<span class="accent">${esc(headline.slice(at, at + emphasis.length))}</span>${esc(headline.slice(at + emphasis.length))}`;
}
function materialCopy(job) {
  const headline = job.visible_copy?.headline || "", support = job.visible_copy?.supporting_text || "";
  const emphasis = job.creative_direction?.art_direction?.headline_emphasis;
  return `<div class="copy"><div class="eyebrow">Innerbloom</div><h1>${emphasizedHeadline(headline, emphasis)}</h1>${support ? `<p class="support">${esc(support)}</p>` : ""}</div>`;
}
function chrome(job, logo, index, total) {
  const slide = job.slide_number ? `${String(job.slide_number).padStart(2,"0")} / 05` : `${String(index + 1).padStart(2,"0")} / ${String(total).padStart(2,"0")}`;
  return `<div class="mesh"></div><div class="grain"></div><div class="brand"><img src="${logo}" alt="Innerbloom"/></div><div class="rule"></div><div class="meta">innerbloom.app</div><div class="counter">${slide}</div>`;
}
function composition(job, sources, scene, brandMark) {
  const variant = job.creative_direction?.layout_variant || "split_device_right";
  const a = sources[0], b = sources[1] || sources[0];
  const keyA = job.creative_direction?.selected_asset_keys?.[0] || "";
  const keyB = job.creative_direction?.selected_asset_keys?.[1] || keyA;
  assertDistinctSupportVisual(job, keyA, keyB);
  const mobile = keyA.startsWith("mobile_");
  const toneA = keyA.includes("_light_") || keyA.includes("dquest_light") || keyA.includes("rhythm_light") ? "light" : "dark";
  const toneB = keyB.includes("_light_") || keyB.includes("dquest_light") || keyB.includes("rhythm_light") ? "light" : "dark";
  const labels = job.creative_direction?.sequence_labels || ["Notice the signal","Read the context","Choose the next step"];
  const contrast = job.creative_direction?.contrast_pair || ["One setback","The whole story"];
  switch (variant) {
    case "editorial_material_scene": {
      if (!scene) throw new Error(`${job.asset_code}: editorial_material_scene requires art_direction.scene_asset_key`);
      const art = job.creative_direction?.art_direction || {};
      const angle = Math.max(-10, Math.min(10, Number(art.device_angle_deg) || 0));
      const annotation = job.creative_direction?.insight_callout || "";
      const placement = `copy-${art.copy_zone || "left"} product-${art.product_zone || "lower_right"} veil-${art.readability_veil || "left_soft"}`;
      return {cls:`editorial-material ${placement}`,body:`<img class="material-scene" src="${scene}" alt=""/><div class="material-veil"></div><div class="material-brand"><img src="${brandMark}" alt="Innerbloom"/></div>${materialCopy(job)}<div class="material-contact-shadow"></div><div style="--device-angle:${angle}deg">${device(a,"",toneA)}</div>${annotation?`<div class="material-annotation"><div><strong>Progress, in context</strong>${esc(annotation)}</div></div>`:""}<div class="material-bottom-rule"></div>`};
    }
    case "split_device_left": return { cls:"split-left", body:copy(job)+device(a,"",toneA) };
    case "cinematic_device_center": return { cls:"center-stage", body:copy(job)+`<div class="orbit o1"></div><div class="orbit o2"></div>`+device(a,"",toneA) };
    case "device_diagonal_crop": return { cls:"diagonal-crop", body:copy(job)+device(a,"",toneA) };
    case "layered_product_depth": return { cls:"layered-depth", body:copy(job)+`<div class="glass"></div>`+device(b,"small back",toneB)+device(a,"main",toneA) };
    case "floating_device_orbit": return { cls:"floating-orbit", body:copy(job)+`<div class="orbit"></div><div class="orb a"></div><div class="orb b"></div>`+device(a,"small",toneA) };
    case "module_macro_crop": return { cls:"macro", body:copy(job)+feature(a,job.creative_direction?.focus_y || 42) };
    case "bento_product_proof": return { cls:"bento", body:copy(job)+card(b,`a ${mobile?"mobile":""}`)+card(a,`b ${mobile?"mobile":""}`)+device(a,"",toneA) };
    case "storefront_feature_stage": return { cls:"storefront-stage", body:copy(job)+device(a,"",toneA)+supportVisual(job,b,keyB) };
    case "storefront_dual_device": return { cls:"storefront-dual", body:copy(job)+(keyB.startsWith("module_")?device(a,"front",toneA)+supportVisual(job,b,keyB):device(b,"small back",toneB)+device(a,"front",toneA)) };
    case "storefront_metric_overlay": return { cls:"storefront-overlay", body:`<div class="halo"></div>`+copy(job)+device(a,"",toneA)+supportVisual(job,b,keyB) };
    case "storefront_edge_editorial": return { cls:"storefront-edge", body:copy(job)+`<div class="orbit"></div><div class="orb a"></div><div class="orb b"></div>`+device(a,"",toneA) };
    case "storefront_product_cards": return { cls:"storefront-cards", body:copy(job)+device(a,"",toneA)+(keyB.startsWith("module_")?supportVisual(job,b,keyB):card(a,`a ${mobile?"mobile":""}`)+card(b,`b ${keyB.startsWith("mobile_")?"mobile":""}`)) };
    case "storefront_dark_monolith": return { cls:"storefront-monolith", body:copy(job)+device(a,"",toneA)+supportVisual(job,b,keyB) };
    case "storefront_module_spotlight": return { cls:"storefront-module", body:copy(job)+device(a,"",toneA)+supportVisual(job,b,keyB) };
    case "editorial_type_monument": return { cls:"type-monument", body:copy(job)+`<div class="number">${String(job.slide_number || "01").padStart(2,"0")}</div>` };
    case "editorial_signal_line": return { cls:"signal-line", body:copy(job)+`<div class="signal"><i></i><i></i><i></i><i></i><i></i><i></i></div>` };
    case "editorial_numbered_steps": return { cls:"steps", body:copy(job)+`<div class="step-row"><div class="step"><b>01</b><span>${esc(labels[0])}</span></div><div class="step"><b>02</b><span>${esc(labels[1])}</span></div><div class="step"><b>03</b><span>${esc(labels[2])}</span></div></div>` };
    case "editorial_quote_frame": return { cls:"quote-frame", body:copy(job)+`<div class="quote">“</div>` };
    case "carousel_chapter_cover": return { cls:"chapter", body:copy(job)+`<div class="chapter-no">${String(job.slide_number || 1).padStart(2,"0")}</div>`+(mobile?device(a,"small",toneA):card(a)) };
    case "carousel_proof_focus": return { cls:"proof-focus", body:copy(job)+device(a,"",toneA) };
    case "carousel_transition": return { cls:"transition", body:copy(job)+`<div class="orbit"></div><div class="contrast"><span>${esc(contrast[0])}</span><b>≠</b><span>${esc(contrast[1])}</span></div>` };
    case "carousel_cta_close": return { cls:"cta-close", body:copy(job)+(mobile?device(a,"small",toneA):card(a,"landscape")) };
    default: return { cls:"split-right", body:`<div class="halo"></div>`+copy(job)+device(a,"",toneA) };
  }
}

async function main() {
  const campaign = JSON.parse(await fs.readFile(campaignPath, "utf8"));
  const all = campaign.image_generation?.jobs || []; const jobs = limit ? all.slice(0, limit) : all;
  if (!jobs.length) throw new Error("Campaign has no image jobs");
  await fs.mkdir(outputDir, { recursive:true });
  const logo = await sourceUri("brand_logo_full");
  const brandMark = await dataUri(path.join(repoRoot,"apps/web/public/brand/innerbloom-2/flower-transparent.png"));
  const typography = await fontCss();
  const browser = await chromium.launch({ headless:true, executablePath:process.env.MARKETING_CHROMIUM_PATH || undefined }); const page = await browser.newPage({ viewport:{width:1080,height:1080}, deviceScaleFactor:1 });
  const renderRecords = [];
  try {
    for (let i=0;i<jobs.length;i++) {
      const job=jobs[i], d=job.creative_direction || {}, keys=d.selected_asset_keys || [];
      if (!keys.length) throw new Error(`${job.asset_code}: selected_asset_keys is empty`);
      const sources=await Promise.all(keys.slice(0,2).map(sourceUri));
      const sceneKey=d.art_direction?.scene_asset_key; const scene=sceneKey?await sourceUri(sceneKey):null;
      const comp=composition(job,sources,scene,brandMark);
      const palette=d.palette || (d.mode === "dark" ? "dark" : "light");
      const html=`<!doctype html><html><head><meta charset="utf-8"><style>${typography}${css}</style></head><body><main class="frame ${esc(palette)} ${comp.cls}">${chrome(job,logo,i,all.length)}${comp.body}</main></body></html>`;
      await page.setContent(html,{waitUntil:"load"}); await page.evaluate(()=>document.fonts.ready);
      await page.$$eval(".focus-crop", crops => crops.forEach(crop => {
        const image=crop.querySelector("img");
        if(!image?.naturalWidth || !image?.naturalHeight) return;
        const ratio=image.naturalWidth/image.naturalHeight;
        const kind=ratio>1.22?"landscape":ratio<.82?"portrait":"square";
        crop.classList.add(kind);
        let width,height;
        if(kind==="landscape"){width=500;height=Math.min(238,width/ratio);}
        else if(kind==="portrait"){height=330;width=Math.min(285,height*ratio);}
        else{width=330;height=width/ratio;}
        crop.style.width=`${Math.round(width)}px`;
        crop.style.height=`${Math.round(height)}px`;
      }));
      await page.$$eval(".device", devices => devices.forEach(device => {
        const image = device.querySelector(".screen img");
        if (!image?.naturalWidth || !image?.naturalHeight) return;
        const width = device.getBoundingClientRect().width;
        const screenRatio = image.naturalWidth / image.naturalHeight;
        // Build the physical chassis around the real registered screen ratio.
        // This avoids both screenshot cropping and oversized blank bands.
        const desiredRatio = Math.max(1.72, Math.min(2.15, 1 / screenRatio));
        device.style.height = `${Math.round(width * desiredRatio)}px`;
      }));
      const finishQuality = await page.evaluate(() => {
        const frame=document.querySelector(".frame"), copy=document.querySelector(".copy");
        const support=document.querySelector(".focus-crop,.proof-chip,.metric-badge");
        const product=document.querySelector(".device,.product-card,.feature-crop");
        const inside = el => {
          if(!el) return true; const r=el.getBoundingClientRect(), f=frame.getBoundingClientRect();
          return r.left>=f.left+24 && r.right<=f.right-24 && r.top>=f.top+24 && r.bottom<=f.bottom-24;
        };
        const overlap = (a,b) => {
          if(!a||!b) return 0; const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
          const w=Math.max(0,Math.min(x.right,y.right)-Math.max(x.left,y.left));
          const h=Math.max(0,Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top));
          return w*h;
        };
        const clippedText=[...document.querySelectorAll(".copy,.copy h1,.copy .support")].some(el=>el.scrollWidth>el.clientWidth+1||el.scrollHeight>el.clientHeight+1);
        return {inside:inside(support),copyInside:inside(copy),copyOverlap:overlap(copy,support),productOverlap:overlap(copy,product),clippedText,framed:[...document.querySelectorAll(".focus-crop")].some(el=> {
          const cs=getComputedStyle(el); return parseFloat(cs.padding)>0 || parseFloat(cs.borderTopWidth)>0 || cs.backgroundColor!=="rgba(0, 0, 0, 0)";
        })};
      });
      if(!finishQuality.inside) throw new Error(`${job.asset_code}: supporting visual leaves the 24px export safe area`);
      if(finishQuality.copyOverlap>1200) throw new Error(`${job.asset_code}: supporting visual collides with headline safe zone`);
      if(finishQuality.framed) throw new Error(`${job.asset_code}: focus crops must be borderless, padding-free and transparent`);
      const deviceScreensAreContained = await page.$$eval(".screen img", images => images.every(image => getComputedStyle(image).objectFit === "contain"));
      if (!deviceScreensAreContained) throw new Error(`${job.asset_code}: a device screenshot would be cropped; device screens must use object-fit contain`);
      const filename=`${job.asset_code}.png`; await page.screenshot({path:path.join(outputDir,filename),type:"png"});
      renderRecords.push({asset_code:job.asset_code,post_code:job.post_code,filename,layout_variant:d.layout_variant,visual_family:d.visual_family,scene_asset_key:sceneKey||null,quality:{copy_exact:true,support_safe_area:finishQuality.inside,copy_safe_area:finishQuality.copyInside,copy_support_overlap_px:finishQuality.copyOverlap,copy_product_overlap_px:finishQuality.productOverlap,clipped_text:finishQuality.clippedText,material_scene_present:!sceneKey||Boolean(scene),brand_present:true,screen_fit_contain:deviceScreensAreContained}});
    }
  } finally { await browser.close(); }
  await fs.writeFile(path.join(outputDir,"render-manifest-v3.json"),JSON.stringify({schema_version:"3.0",campaign_path:campaignPath,rendered_at:new Date().toISOString(),assets:renderRecords},null,2)+"\n");
  console.log(`Rendered ${jobs.length} campaign PNGs with renderer v3.`);
}
main().catch(e=>{console.error(e);process.exit(1)});
