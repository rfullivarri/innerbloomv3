#!/usr/bin/env node
/**
 * Phase 1 campaign renderer.
 *
 * Production renders every image job. Preview mode selects one representative
 * job from each of N posts, rotates the approved scene pack, and never mutates
 * campaign.json or visible_copy.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const legacyRenderer = path.join(__dirname, "render-campaign-v3.mjs");
const [campaignArg, ...args] = process.argv.slice(2);
if (!campaignArg) throw new Error("Usage: render-campaign-phase1 <campaign.json> --asset-dir <dir> --out <dir> [--post-limit N] [--pilot-scenes]");

function arg(name, fallback) { const i = args.indexOf(name); return i === -1 ? fallback : args[i + 1]; }
const has = name => args.includes(name);
const campaignPath = path.resolve(campaignArg);
const assetDir = path.resolve(arg("--asset-dir", path.join(path.dirname(campaignPath), "staged-assets")));
const outputDir = path.resolve(arg("--out", path.join(repoRoot, "marketing/generated")));
const postLimit = Number.parseInt(arg("--post-limit", "0"), 10) || 0;
const pilotScenes = has("--pilot-scenes");

const APPROVED_LAYOUTS = new Set([
  "editorial_material_scene",
  "split_device_right",
  "split_device_left",
  "storefront_feature_stage",
  "storefront_metric_overlay",
  "carousel_proof_focus",
  "carousel_cta_close",
]);
const MAX_COPY_PRODUCT_OVERLAP_PX = 240;
const MAX_COPY_SUPPORT_OVERLAP_PX = 240;
const CURATED_SCENES = [
  { key:"scene_material_warm_textile_lavender_01", copy_zone:"left", product_zone:"lower_right", readability_veil:"left_soft", device_angle_deg:6 },
  { key:"scene_ivory_plaster_steps_01", copy_zone:"left", product_zone:"lower_right", readability_veil:"left_soft", device_angle_deg:4 },
  { key:"scene_aubergine_pedestal_01", copy_zone:"right", product_zone:"lower_left", readability_veil:"right_dark", device_angle_deg:-6 },
  { key:"scene_frosted_glass_mist_01", copy_zone:"left", product_zone:"lower_right", readability_veil:"left_soft", device_angle_deg:5 },
];

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd: repoRoot, env: process.env, stdio:["ignore","pipe","pipe"] });
    let stdout="", stderr="";
    child.stdout.on("data", c => { stdout += c; });
    child.stderr.on("data", c => { stderr += c; });
    child.on("error", reject);
    child.on("close", code => code === 0 ? resolve({stdout,stderr}) : reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with ${code}`)));
  });
}
function unique(values) { return [...new Set(values.filter(Boolean))]; }
function isMobileKey(key="") { return key.startsWith("mobile_"); }
function isModuleKey(key="") { return key.startsWith("module_"); }
function copyWeight(job) {
  return String(job.visible_copy?.headline || "").length * 1.8 + String(job.visible_copy?.supporting_text || "").length;
}
function selectRepresentativePosts(jobs, count) {
  if (!count) return jobs;
  const selected=[];
  const seen=new Set();
  for (const job of jobs) {
    const postKey=job.post_code || job.asset_code;
    if (seen.has(postKey)) continue;
    seen.add(postKey);
    selected.push(job);
    if (selected.length >= count) break;
  }
  return selected;
}
async function availableScenes() {
  const entries = new Set(await fs.readdir(assetDir));
  return CURATED_SCENES.filter(scene => [...entries].some(file => file.startsWith(scene.key + ".")));
}
function candidateLayouts(job, previousLayout, forcedScene) {
  const direction=job.creative_direction || {};
  const preferred=APPROVED_LAYOUTS.has(direction.layout_variant) ? direction.layout_variant : null;
  const keys=direction.selected_asset_keys || [];
  const primary=keys[0] || "";
  const detail=keys[1] || "";
  const heavyCopy=copyWeight(job)>165;
  const slide=Number(job.slide_number || 0);
  const candidates=[];
  if (forcedScene && isMobileKey(primary)) candidates.push("editorial_material_scene");
  if (!forcedScene && direction.art_direction?.scene_asset_key && isMobileKey(primary)) candidates.push("editorial_material_scene");
  if (preferred) candidates.push(preferred);
  if (slide>=5) candidates.push("carousel_cta_close");
  if (isModuleKey(detail)) candidates.push("storefront_metric_overlay");
  if (slide>1 && slide<5) candidates.push("carousel_proof_focus");
  if (!heavyCopy && isMobileKey(primary)) candidates.push("storefront_feature_stage");
  candidates.push("split_device_right","split_device_left");
  if (isMobileKey(primary)) candidates.push("carousel_proof_focus","storefront_feature_stage");
  else candidates.push("carousel_cta_close");
  const ordered=unique(candidates).filter(layout => APPROVED_LAYOUTS.has(layout));
  if (previousLayout && ordered[0]===previousLayout && ordered.length>1) ordered.push(ordered.shift());
  return ordered;
}
function normalizedDirection(job, layout, forcedScene) {
  const original=structuredClone(job.creative_direction || {});
  const keys=original.selected_asset_keys || [];
  const detailKey=keys[1] || "";
  original.layout_variant=layout;
  original.screen_fit="contain";
  delete original.device_presentation;
  delete original.focus_y;
  if (layout === "editorial_material_scene" && forcedScene) {
    original.visual_family="supporting_visual_scene";
    original.art_direction={
      profile:"material_editorial_v1",
      scene_asset_key:forcedScene.key,
      copy_zone:forcedScene.copy_zone,
      product_zone:forcedScene.product_zone,
      device_grounding:"resting",
      device_angle_deg:forcedScene.device_angle_deg,
      scene_crop:"center",
      readability_veil:forcedScene.readability_veil,
      headline_emphasis:original.art_direction?.headline_emphasis || "",
    };
  } else if (original.art_direction) {
    original.art_direction.device_angle_deg=Math.max(-6,Math.min(6,Number(original.art_direction.device_angle_deg || 0)));
  }
  if (layout === "storefront_metric_overlay" && isModuleKey(detailKey)) original.supporting_treatment="focus_crop";
  else if (layout !== "storefront_metric_overlay") original.supporting_treatment="none";
  return original;
}
function qualityPasses(record) {
  const q=record?.quality || {};
  return q.copy_safe_area===true && q.support_safe_area===true && q.clipped_text===false
    && Number(q.copy_product_overlap_px || 0)<=MAX_COPY_PRODUCT_OVERLAP_PX
    && Number(q.copy_support_overlap_px || 0)<=MAX_COPY_SUPPORT_OVERLAP_PX
    && q.screen_fit_contain===true && q.brand_present===true;
}
async function renderAttempt(campaign, job, layout, forcedScene, tempRoot, attemptIndex) {
  const attemptDir=path.join(tempRoot,`attempt-${attemptIndex}-${layout}`);
  await fs.mkdir(attemptDir,{recursive:true});
  const normalizedJob=structuredClone(job);
  normalizedJob.visible_copy=structuredClone(job.visible_copy || {});
  normalizedJob.creative_direction=normalizedDirection(job,layout,forcedScene);
  const attemptCampaign={...campaign,image_generation:{...(campaign.image_generation || {}),jobs:[normalizedJob]}};
  const tempCampaignPath=path.join(attemptDir,"campaign.json");
  await fs.writeFile(tempCampaignPath,`${JSON.stringify(attemptCampaign,null,2)}\n`);
  try {
    await run(process.execPath,[legacyRenderer,tempCampaignPath,"--asset-dir",assetDir,"--out",attemptDir,"--limit","1"]);
    const manifest=JSON.parse(await fs.readFile(path.join(attemptDir,"render-manifest-v3.json"),"utf8"));
    const record=manifest.assets?.[0];
    return {passed:qualityPasses(record),record,pngPath:path.join(attemptDir,`${job.asset_code}.png`),error:null};
  } catch(error) { return {passed:false,record:null,pngPath:null,error:error.message}; }
}

async function main() {
  const campaign=JSON.parse(await fs.readFile(campaignPath,"utf8"));
  const allJobs=campaign.image_generation?.jobs || [];
  const jobs=selectRepresentativePosts(allJobs,postLimit);
  if (!jobs.length) throw new Error("Campaign has no image jobs");
  await fs.rm(outputDir,{recursive:true,force:true});
  await fs.mkdir(outputDir,{recursive:true});
  const scenes=pilotScenes ? await availableScenes() : [];
  if (pilotScenes && scenes.length<4) throw new Error(`Phase 1 pilot expected four approved scene plates; found ${scenes.length}`);
  const tempRoot=await fs.mkdtemp(path.join(os.tmpdir(),"innerbloom-phase1-"));
  const records=[];
  let previousLayout=null;
  try {
    for (let jobIndex=0; jobIndex<jobs.length; jobIndex+=1) {
      const job=jobs[jobIndex];
      const keys=job.creative_direction?.selected_asset_keys || [];
      if (!keys.length) throw new Error(`${job.asset_code}: selected_asset_keys is empty`);
      const forcedScene=pilotScenes && jobIndex<scenes.length && isMobileKey(keys[0]) ? scenes[jobIndex] : null;
      const attempts=[];
      let accepted=null;
      const candidates=candidateLayouts(job,previousLayout,forcedScene);
      for (let index=0; index<candidates.length; index+=1) {
        const layout=candidates[index];
        const result=await renderAttempt(campaign,job,layout,layout==="editorial_material_scene"?forcedScene:null,tempRoot,index+1);
        attempts.push({layout,scene_asset_key:layout==="editorial_material_scene"?forcedScene?.key || null:null,passed:result.passed,error:result.error,quality:result.record?.quality || null});
        if (result.passed) { accepted={...result,layout,forcedScene:layout==="editorial_material_scene"?forcedScene:null}; break; }
      }
      if (!accepted) {
        const detail=attempts.map(item=>`${item.layout}: ${item.error || JSON.stringify(item.quality)}`).join("\n");
        throw new Error(`${job.asset_code}: no Phase 1 layout passed.\n${detail}`);
      }
      const filename=`${job.asset_code}.png`;
      await fs.copyFile(accepted.pngPath,path.join(outputDir,filename));
      previousLayout=accepted.layout;
      records.push({...accepted.record,filename,requested_layout_variant:job.creative_direction?.layout_variant || null,layout_variant:accepted.layout,pilot_scene_asset_key:accepted.forcedScene?.key || null,phase1_attempts:attempts,quality:{...(accepted.record?.quality || {}),phase1_collision_pass:true,max_copy_product_overlap_px:MAX_COPY_PRODUCT_OVERLAP_PX,max_copy_support_overlap_px:MAX_COPY_SUPPORT_OVERLAP_PX}});
      console.log(`${job.asset_code}: accepted ${accepted.layout}${accepted.forcedScene?` with ${accepted.forcedScene.key}`:""} after ${attempts.length} attempt(s)`);
    }
  } finally { await fs.rm(tempRoot,{recursive:true,force:true}); }
  const manifest={schema_version:"3.2-phase1",campaign_path:campaignPath,rendered_at:new Date().toISOString(),policy:{approved_layouts:[...APPROVED_LAYOUTS],copy_preserved:true,renderer_owns_geometry:true,collision_retry_enabled:true,preview_selects_one_visual_per_post:Boolean(postLimit),pilot_scene_rotation:pilotScenes},assets:records};
  await fs.writeFile(path.join(outputDir,"render-manifest-v3.json"),`${JSON.stringify(manifest,null,2)}\n`);
  console.log(`Rendered ${jobs.length} representative post visuals with the Phase 1 policy.`);
}
main().catch(error=>{console.error(error);process.exit(1)});
