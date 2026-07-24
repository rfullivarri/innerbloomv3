#!/usr/bin/env node
import fs from "node:fs/promises";

const input=process.argv[2];
if(!input)throw new Error("Usage: validate-creative-direction-v3 <campaign.json>");
const campaign=JSON.parse(await fs.readFile(input,"utf8"));
const layouts=new Set(["split_device_right","split_device_left","cinematic_device_center","device_diagonal_crop","layered_product_depth","floating_device_orbit","module_macro_crop","bento_product_proof","editorial_type_monument","editorial_signal_line","editorial_numbered_steps","editorial_quote_frame","carousel_chapter_cover","carousel_proof_focus","carousel_transition","carousel_cta_close","storefront_feature_stage","storefront_dual_device","storefront_metric_overlay","storefront_edge_editorial","storefront_product_cards","storefront_dark_monolith","storefront_module_spotlight","editorial_material_scene"]);
const families=new Set(["product_hero_scene","product_angle","product_depth","module_spotlight","editorial_statement","proof_sequence","supporting_visual_scene"]);
const palettes=new Set(["light","dark","lilac","warm","ink"]),modes=new Set(["light","dark"]),treatments=new Set(["focus_crop","insight_callout","metric_badge","none"]),errors=[];
const profile=campaign.validation_profile||{};
const isDerivedTest=profile.kind==="derived_test";
const minimumUniqueLayouts=isDerivedTest?Number(profile.minimum_unique_layouts):12;
const minimumDistinctAssets=isDerivedTest?Number(profile.minimum_distinct_assets):14;
const carouselMinimumUniqueLayouts=isDerivedTest?Number(profile.carousel_minimum_unique_layouts):4;
const maximumLayoutShare=isDerivedTest?Number(profile.maximum_layout_share):.2;
if(isDerivedTest){
 if(!Number.isInteger(minimumUniqueLayouts)||minimumUniqueLayouts<1)errors.push("derived test validation_profile.minimum_unique_layouts must be a positive integer");
 if(!Number.isInteger(minimumDistinctAssets)||minimumDistinctAssets<1)errors.push("derived test validation_profile.minimum_distinct_assets must be a positive integer");
 if(!Number.isInteger(carouselMinimumUniqueLayouts)||carouselMinimumUniqueLayouts<1)errors.push("derived test validation_profile.carousel_minimum_unique_layouts must be a positive integer");
 if(!Number.isFinite(maximumLayoutShare)||maximumLayoutShare<=0||maximumLayoutShare>1)errors.push("derived test validation_profile.maximum_layout_share must be between 0 and 1");
}
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
 if(d.supporting_treatment&&!treatments.has(d.supporting_treatment))errors.push(`${job.asset_code}: unknown supporting_treatment`);
 if(d.supporting_treatment==="focus_crop"&&!d.zoom_relationship)errors.push(`${job.asset_code}: focus_crop requires zoom_relationship`);
 if(d.supporting_treatment==="insight_callout"&&!d.insight_callout?.trim())errors.push(`${job.asset_code}: insight_callout treatment requires copy`);
 if(d.supporting_treatment==="metric_badge"&&(!d.metric_value?.trim()||!d.metric_label?.trim()))errors.push(`${job.asset_code}: metric_badge requires metric_value and metric_label`);
 if(d.supporting_treatment!=="focus_crop"&&d.zoom_relationship)errors.push(`${job.asset_code}: zoom_relationship is only valid with focus_crop`);
 if(d.layout_variant==="editorial_material_scene"){
  const art=d.art_direction;
  if(!art)errors.push(`${job.asset_code}: editorial_material_scene requires art_direction`);
  else{
   if(art.profile!=="material_editorial_v1")errors.push(`${job.asset_code}: unsupported art_direction.profile`);
   if(!art.scene_asset_key?.startsWith("scene_"))errors.push(`${job.asset_code}: material scene requires a registered scene_asset_key`);
   if(!allowed.has(art.scene_asset_key))errors.push(`${job.asset_code}: scene_asset_key is not approved in source_assets`);
   if(!["left","right"].includes(art.copy_zone))errors.push(`${job.asset_code}: art_direction.copy_zone must be left or right`);
   if(!["lower_left","lower_right"].includes(art.product_zone))errors.push(`${job.asset_code}: art_direction.product_zone must be lower_left or lower_right`);
   if(!["resting","leaning"].includes(art.device_grounding))errors.push(`${job.asset_code}: art_direction.device_grounding must be resting or leaning`);
   if(art.scene_crop!=="center")errors.push(`${job.asset_code}: unsupported art_direction.scene_crop`);
   if(!["left_soft","right_dark"].includes(art.readability_veil))errors.push(`${job.asset_code}: unsupported art_direction.readability_veil`);
   if(!Number.isFinite(art.device_angle_deg)||Math.abs(art.device_angle_deg)>10)errors.push(`${job.asset_code}: device angle must stay within 10 degrees`);
   if(art.headline_emphasis&&!job.visible_copy?.headline?.toLowerCase().includes(art.headline_emphasis.toLowerCase()))errors.push(`${job.asset_code}: headline_emphasis must be exact campaign copy`);
  }
 }
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
if(layoutCounts.size<minimumUniqueLayouts)errors.push(`campaign needs at least ${minimumUniqueLayouts} unique layouts; found ${layoutCounts.size}`);
if(assetKeys.size<minimumDistinctAssets)errors.push(`campaign needs at least ${minimumDistinctAssets} distinct source assets; found ${assetKeys.size}`);
for(const [layout,count] of layoutCounts)if(count/jobs.length>maximumLayoutShare)errors.push(`${layout} exceeds ${Math.round(maximumLayoutShare*100)}% of campaign jobs (${count}/${jobs.length})`);
for(const [post,list] of postLayouts){if(list.length>1&&new Set(list).size<carouselMinimumUniqueLayouts)errors.push(`${post}: carousel needs at least ${carouselMinimumUniqueLayouts} distinct layouts`)}
for(let i=2;i<jobs.length;i++){const a=jobs[i-2].creative_direction?.layout_variant,b=jobs[i-1].creative_direction?.layout_variant,c=jobs[i].creative_direction?.layout_variant;if(a&&a===b&&b===c)errors.push(`${jobs[i].asset_code}: same layout appears three times consecutively`)}
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`Creative v3 passed: ${jobs.length} jobs, ${layoutCounts.size} layouts, ${assetKeys.size} real assets${isDerivedTest?" (derived test profile)":""}.`);
