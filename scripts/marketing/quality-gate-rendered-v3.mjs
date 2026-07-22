#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const manifestArg=process.argv[2];
if(!manifestArg)throw new Error("Usage: quality-gate-rendered-v3 <render-manifest-v3.json>");
const manifestPath=path.resolve(manifestArg),outputDir=path.dirname(manifestPath);
const manifest=JSON.parse(await fs.readFile(manifestPath,"utf8"));
const assets=manifest.assets||[],errors=[],checks=[];
if(!assets.length)errors.push("render manifest contains no assets");

const seenHashes=new Map();
for(const asset of assets){
  const code=asset.asset_code||"unknown",pngPath=path.join(outputDir,`${code}.png`);
  let bytes;
  try{bytes=await fs.readFile(pngPath)}catch{errors.push(`${code}: PNG is missing`);continue}
  const png=bytes.length>=24&&bytes.subarray(1,4).toString()==="PNG";
  const width=png?bytes.readUInt32BE(16):0,height=png?bytes.readUInt32BE(20):0;
  const hash=crypto.createHash("sha256").update(bytes).digest("hex");
  if(seenHashes.has(hash))errors.push(`${code}: exact visual duplicate of ${seenHashes.get(hash)}`);else seenHashes.set(hash,code);
  if(!png||width!==1080||height!==1080)errors.push(`${code}: expected a 1080×1080 PNG, got ${width}×${height}`);
  if(bytes.length<45_000)errors.push(`${code}: PNG is suspiciously small (${bytes.length} bytes)`);
  const q=asset.quality||{};
  if(q.copy_exact!==true)errors.push(`${code}: rendered copy differs from campaign JSON`);
  if(q.support_safe_area!==true)errors.push(`${code}: supporting visual failed safe area`);
  if(q.copy_safe_area!==true)errors.push(`${code}: copy failed safe area`);
  if((q.copy_support_overlap_px||0)>1200)errors.push(`${code}: supporting visual overlaps copy`);
  if((q.copy_product_overlap_px||0)>1200)errors.push(`${code}: product overlaps copy`);
  if(q.clipped_text!==false)errors.push(`${code}: visible copy is clipped`);
  if(q.material_scene_present!==true)errors.push(`${code}: registered scene plate did not render`);
  if(q.brand_present!==true)errors.push(`${code}: approved brand asset did not render`);
  if(q.screen_fit_contain!==true)errors.push(`${code}: registered UI is cropped inside the device`);
  checks.push({asset_code:code,png:path.basename(pngPath),bytes:bytes.length,width,height,sha256:hash,quality:q,passed:!errors.some(error=>error.startsWith(`${code}:`))});
}

if(assets.length>=6){
  const layouts=new Set(assets.map(asset=>asset.layout_variant));
  const families=new Set(assets.map(asset=>asset.visual_family));
  if(layouts.size<5)errors.push(`campaign output needs at least five layouts; found ${layouts.size}`);
  if(families.size<3)errors.push(`campaign output needs at least three visual families; found ${families.size}`);
}

const report={schema_version:"1.0",gate:"rendered_creative_v3",passed:errors.length===0,asset_count:assets.length,checks,errors};
await fs.writeFile(path.join(outputDir,"quality-report-v3.json"),JSON.stringify(report,null,2)+"\n");
if(errors.length){console.error(errors.join("\n"));process.exit(1)}
console.log(`Rendered creative quality passed: ${assets.length} PNG${assets.length===1?"":"s"}.`);
