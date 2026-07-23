#!/usr/bin/env node
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { applyReferenceSpecification, loadLayoutSpecifications, resolveReferenceCandidates } from "./layout-reference-resolver.mjs";

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const repoRoot=path.resolve(__dirname,"../..");
const phase1Renderer=path.join(__dirname,"render-campaign-phase1.mjs");
const defaultSpecPath=path.join(repoRoot,"marketing/layout-references/innerbloom-layout-specifications-v1.json");
const [campaignArg,...args]=process.argv.slice(2);
if(!campaignArg)throw new Error("Usage: render-campaign-reference-v1 <campaign.json> --asset-dir <dir> --out <dir> [--post-limit N] [--reference-pilot] [--layout-spec <json>]");
function arg(name,fallback){const i=args.indexOf(name);return i===-1?fallback:args[i+1];}
const has=name=>args.includes(name);
function withoutPair(values,name){const result=[];for(let i=0;i<values.length;i+=1){if(values[i]===name){i+=1;continue}result.push(values[i]);}return result;}
function run(command,commandArgs){return new Promise((resolve,reject)=>{const child=spawn(command,commandArgs,{cwd:repoRoot,env:process.env,stdio:"inherit"});child.on("error",reject);child.on("close",code=>code===0?resolve():reject(new Error(`${command} exited with ${code}`)));});}
const isMobile=key=>String(key||"").startsWith("mobile_");
const unique=values=>[...new Set(values.filter(Boolean))];
function postKey(job){return job.post_code||job.asset_code;}
function allRegisteredMobileKeys(jobs){return unique(jobs.flatMap(job=>(job.source_assets||[]).map(asset=>asset.asset_key).filter(isMobile).concat((job.creative_direction?.selected_asset_keys||[]).filter(isMobile))));}
function representativeIndexes(jobs){const seen=new Set(),indexes=[];jobs.forEach((job,index)=>{const key=postKey(job);if(!seen.has(key)){seen.add(key);indexes.push(index);}});return indexes;}
function chooseCompatible(specifications,key){return specifications.layouts.get(key)||null;}

async function main(){
 const campaignPath=path.resolve(campaignArg);const specificationPath=path.resolve(arg("--layout-spec",defaultSpecPath));const specifications=await loadLayoutSpecifications(specificationPath);const campaign=JSON.parse(await fs.readFile(campaignPath,"utf8"));const jobs=campaign.image_generation?.jobs||[];if(!jobs.length)throw new Error("Campaign has no image jobs");
 const mobileCatalog=allRegisteredMobileKeys(jobs);const usage=new Map();const referencePilot=has("--reference-pilot");const representativeSet=new Set(representativeIndexes(jobs));const pilotSequence=["editorial_scene_3q","flat_lay_patterns","multi_device_mood_grid","feature_callout_card","centered_product_hero","edge_crop_storefront_ad"];
 let representativeOrder=0;
 const compiledJobs=jobs.map((job,index)=>{
   const cloned=structuredClone(job);cloned.visible_copy=structuredClone(job.visible_copy||{});
   let selected=null;
   if(referencePilot&&representativeSet.has(index)&&representativeOrder<pilotSequence.length){selected=chooseCompatible(specifications,pilotSequence[representativeOrder]);representativeOrder+=1;}
   if(!selected){const candidates=resolveReferenceCandidates(job,specifications);selected=[...candidates].sort((a,b)=>((usage.get(a.layout_key)||0)-(usage.get(b.layout_key)||0))||a.layout_key.localeCompare(b.layout_key))[0]||null;}
   if(!selected)return cloned;
   const pose=specifications.poses.get(selected.device_pose)||null;cloned.creative_direction=applyReferenceSpecification(job.creative_direction,selected,pose);
   if(selected.layout_key==="multi_device_mood_grid"){
     const existing=(cloned.creative_direction.selected_asset_keys||[]).filter(isMobile);cloned.creative_direction.selected_asset_keys=unique([...existing,...mobileCatalog]).slice(0,5);
     if(cloned.creative_direction.selected_asset_keys.length<4){const fallback=specifications.layouts.get("centered_product_hero");cloned.creative_direction=applyReferenceSpecification(job.creative_direction,fallback,specifications.poses.get(fallback.device_pose));selected=fallback;}
   }
   if(selected.layout_key==="flat_lay_patterns"){
     cloned.creative_direction.art_direction={...(cloned.creative_direction.art_direction||{}),scene_asset_key:"scene_ivory_plaster_steps_01",readability_veil:"none"};
   }
   if(selected.layout_key==="edge_crop_storefront_ad")cloned.creative_direction.cta_label="Explore Innerbloom";
   usage.set(selected.layout_key,(usage.get(selected.layout_key)||0)+1);
   cloned.creative_direction.reference_contract={specification_version:specifications.document.schema_version,layout_key:selected.layout_key,reference_key:selected.reference_key,status:selected.status,copy_locked:true,real_ui_required:true};
   return cloned;
 });
 const compiledCampaign={...campaign,image_generation:{...(campaign.image_generation||{}),jobs:compiledJobs},layout_reference_plan:{specification_key:specifications.document.spec_key,specification_path:path.relative(repoRoot,specificationPath),compiled_at:new Date().toISOString(),copy_preserved:true,real_innerbloom_assets_only:true,reference_pilot:referencePilot,selected_layout_counts:Object.fromEntries(usage)}};
 const tempDir=await fs.mkdtemp(path.join(os.tmpdir(),"innerbloom-layout-reference-"));const tempCampaignPath=path.join(tempDir,"campaign.reference-compiled.json");
 try{await fs.writeFile(tempCampaignPath,`${JSON.stringify(compiledCampaign,null,2)}\n`);let forwarded=withoutPair(args,"--layout-spec").filter(value=>value!=="--reference-pilot");await run(process.execPath,[phase1Renderer,tempCampaignPath,...forwarded]);const outputArg=arg("--out",null);if(outputArg){const outputDir=path.resolve(outputArg);await fs.writeFile(path.join(outputDir,"layout-reference-plan-v1.json"),`${JSON.stringify(compiledCampaign.layout_reference_plan,null,2)}\n`);}}
 finally{await fs.rm(tempDir,{recursive:true,force:true});}
}
main().catch(error=>{console.error(error);process.exit(1)});
