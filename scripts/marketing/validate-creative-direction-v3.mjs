#!/usr/bin/env node
import fs from "node:fs/promises";

const input=process.argv[2];
if(!input)throw new Error("Usage: validate-creative-direction-v3 <campaign.json>");
const campaign=JSON.parse(await fs.readFile(input,"utf8"));
const layouts=new Set(["split_device_right","split_device_left","cinematic_device_center","device_diagonal_crop","layered_product_depth","floating_device_orbit","module_macro_crop","bento_product_proof","editorial_type_monument","editorial_signal_line","editorial_numbered_steps","editorial_quote_frame","carousel_chapter_cover","carousel_proof_focus","carousel_transition","carousel_cta_close","storefront_feature_stage","storefront_dual_device","storefront_metric_overlay","storefront_edge_editorial","storefront_product_cards","storefront_dark_monolith","storefront_module_spotlight"]);
const families=new Set(["product_hero_scene","product_angle","product_depth","module_spotlight","editorial_statement","proof_sequence","supporting_visual_scene"]);
const palettes=new Set(["light","dark","lilac","warm","ink"]),modes=new Set(["light","dark"]),errors=[];
const jobs=campaign.image_generation?.jobs||[],layoutCounts=new Map(),assetKeys=new Set(),postLayouts=new Map();
for(const job of jobs){
 const d=job.creative_direction;
 if(!d){errors.push(`${job.asset_code}: missing creative_direction`);continue}
 if(!families.has(d.visual_family))errors.push(`${job.asset_code}: unknown visual_family`);
 if(!layouts.has(d.layout_variant))errors.push(`${job.asset_code}: unknown layout_variant`);
 if(!modes.has(d.mode))errors.push(`${job.asset_code}: unknown mode`);
 if(!palettes.has(d.palette))errors.push(`${job.asset_code}: unknown palette`);
 if(d.wordmark_treatment!=="canonical_innerbloom_lockup")errors.push(`${job.asset_code}: must use canonical wordmark`);
 const allowed=new Set((job.source_assets||[]).map(a=>a.asset_key));
 if(!d.selected_asset_keys?.length)errors.push(`${job.asset_code}: selected_asset_keys is empty`);
 for(const key of d.selected_asset_keys||[]){assetKeys.add(key);if(!allowed.has(key))errors.push(`${job.asset_code}: ${key} is not an approved source asset`) }
 if(!Array.isArray(d.acceptance_criteria)||d.acceptance_criteria.length<4)errors.push(`${job.asset_code}: needs four acceptance criteria`);
 if(d.zoom_relationship){
   const [contextKey,detailKey]=d.selected_asset_keys||[];
   if(!contextKey?.startsWith("mobile_"))errors.push(`${job.asset_code}: zoom context must be a mobile_* screen`);
   if(!detailKey?.startsWith("module_"))errors.push(`${job.asset_code}: zoom detail must be a module_* crop`);
   if(d.zoom_relationship.context_asset_key!==contextKey||d.zoom_relationship.detail_asset_key!==detailKey)errors.push(`${job.asset_code}: zoom_relationship must match selected_asset_keys order`);
   const zoomLayouts=new Set(["storefront_feature_stage","storefront_dual_device","storefront_metric_overlay","storefront_product_cards","storefront_dark_monolith","storefront_module_spotlight"]);
   if(!zoomLayouts.has(d.layout_variant))errors.push(`${job.asset_code}: ${d.layout_variant} cannot render a real module zoom`);
 }
 layoutCounts.set(d.layout_variant,(layoutCounts.get(d.layout_variant)||0)+1);
 const list=postLayouts.get(job.post_code)||[];list.push(d.layout_variant);postLayouts.set(job.post_code,list);
}
if(!jobs.length)errors.push("campaign has no image jobs");
if(layoutCounts.size<12)errors.push(`campaign needs at least 12 unique layouts; found ${layoutCounts.size}`);
if(assetKeys.size<14)errors.push(`campaign needs at least 14 distinct source assets; found ${assetKeys.size}`);
for(const [layout,count] of layoutCounts)if(count/jobs.length>.2)errors.push(`${layout} exceeds 20% of campaign jobs (${count}/${jobs.length})`);
for(const [post,list] of postLayouts){if(list.length>1&&new Set(list).size<4)errors.push(`${post}: carousel needs at least four distinct layouts`)}
for(let i=2;i<jobs.length;i++){const a=jobs[i-2].creative_direction?.layout_variant,b=jobs[i-1].creative_direction?.layout_variant,c=jobs[i].creative_direction?.layout_variant;if(a&&a===b&&b===c)errors.push(`${jobs[i].asset_code}: same layout appears three times consecutively`)}
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`Creative v3 passed: ${jobs.length} jobs, ${layoutCounts.size} layouts, ${assetKeys.size} real assets.`);
