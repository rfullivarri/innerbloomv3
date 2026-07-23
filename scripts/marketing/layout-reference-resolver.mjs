import fs from "node:fs/promises";
import path from "node:path";

export async function loadLayoutSpecifications(specPath) {
  const resolved = path.resolve(specPath);
  const document = JSON.parse(await fs.readFile(resolved, "utf8"));
  const layouts = new Map((document.layouts || []).map(layout => [layout.layout_key, layout]));
  const poses = new Map(Object.entries(document.device_pose_presets || {}));
  return { document, layouts, poses, path: resolved };
}

function isMobileKey(key = "") { return key.startsWith("mobile_"); }
function isModuleKey(key = "") { return key.startsWith("module_"); }
function copyWeight(job) {
  return String(job.visible_copy?.headline || "").length * 1.8
    + String(job.visible_copy?.supporting_text || "").length;
}

export function resolveReferenceCandidates(job, specifications, options = {}) {
  const keys = job.creative_direction?.selected_asset_keys || [];
  const mobileCount = keys.filter(isMobileKey).length;
  const moduleCount = keys.filter(isModuleKey).length;
  const slide = Number(job.slide_number || 0);
  const weight = copyWeight(job);
  const candidates = [];

  if (options.forcedReferenceKey) candidates.push(options.forcedReferenceKey);
  const requested = job.creative_direction?.layout_reference_key;
  if (requested) candidates.push(requested);

  if (mobileCount >= 4) candidates.push("multi_device_mood_grid");
  if (moduleCount >= 1 && mobileCount >= 1) candidates.push("feature_callout_card");
  if (slide >= 5) candidates.push("centered_product_hero");
  if (mobileCount >= 1 && weight <= 125) candidates.push("centered_product_hero");
  if (mobileCount >= 1 && weight > 125) candidates.push("edge_crop_storefront_ad");
  if (mobileCount >= 1) candidates.push("editorial_scene_3q", "flat_lay_patterns");

  return [...new Set(candidates)]
    .map(key => specifications.layouts.get(key))
    .filter(Boolean)
    .filter(spec => spec.status === "executable" || spec.status === "executable_with_approximation");
}

export function applyReferenceSpecification(direction, specification, pose, sceneAssetKey = null) {
  const result = structuredClone(direction || {});
  result.layout_reference_key = specification.layout_key;
  result.layout_reference_source = specification.reference_key;
  result.layout_variant = specification.renderer_layout;
  result.screen_fit = "contain";
  result.copy_zone = specification.copy_zone;
  result.product_zone = specification.product_zone;
  result.device_pose_preset = specification.device_pose;
  result.device_pose = pose || null;
  delete result.device_presentation;
  delete result.focus_y;

  result.art_direction = {
    ...(result.art_direction || {}),
    profile: `layout_reference_${specification.layout_key}_v1`,
    copy_zone: specification.copy_zone,
    product_zone: specification.product_zone,
    device_grounding: pose?.grounding || result.art_direction?.device_grounding || "floating_soft_shadow",
    device_angle_deg: Array.isArray(pose?.rotation_deg)
      ? (pose.rotation_deg[0] + pose.rotation_deg[1]) / 2
      : Number(result.art_direction?.device_angle_deg || 0),
    scene_asset_key: sceneAssetKey || result.art_direction?.scene_asset_key || null,
    scene_crop: result.art_direction?.scene_crop || "center",
    readability_veil: result.art_direction?.readability_veil || "auto",
    reference_pose: specification.device_pose,
    reference_family: specification.layout_key,
  };

  return result;
}
