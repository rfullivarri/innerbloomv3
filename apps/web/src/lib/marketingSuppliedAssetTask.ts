import type { MarketingCampaignRecord } from './marketingCampaigns';

export type SuppliedDriveAsset = { id: string; name: string; mimeType: string; webViewLink?: string; thumbnailLink?: string };
export type SuppliedAssetTaskInput = {
  campaignCode: string;
  title: string;
  driveFolderId: string;
  format: 'story';
  scheduleStart: string;
  strategyCampaign: MarketingCampaignRecord;
  assets: SuppliedDriveAsset[];
};

export function extractDriveFolderId(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/folders\/([a-zA-Z0-9_-]{10,})/);
  return match?.[1] ?? (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed) ? trimmed : '');
}

export function buildSuppliedAssetCodexTask(input: SuppliedAssetTaskInput) {
  const strategy = {
    campaign_code: input.strategyCampaign.campaignCode,
    title: input.strategyCampaign.title,
    objective: input.strategyCampaign.objective,
    strategy_summary: input.strategyCampaign.strategySummary,
    source_context: input.strategyCampaign.sourceContext,
    approved_examples: input.strategyCampaign.posts.map(({ postCode, hook, caption, hypothesis, targetMetric }) => ({ postCode, hook, caption, hypothesis, targetMetric })),
  };
  return `# Innerbloom supplied-asset Story campaign\n\nYou are working in the Innerbloom v3 repository. Read and obey:\n- prompts/marketing/agent-system/supplied-asset-campaign/AGENTS.md\n- prompts/marketing/supplied-asset-campaign-v1.md\n- prompts/marketing/agent-system/schemas/supplied-asset-campaign-v1.schema.json\n\nCreate exactly one new configuration file: marketing/supplied-campaigns/${input.campaignCode}/campaign.json. Do not modify application code, renderers, workflow files, brand assets, or existing campaigns. Do not upload to R2.\n\nCampaign request:\n- campaign_code: ${input.campaignCode}\n- title: ${input.title}\n- format: Instagram Story (1080x1920), one supplied base per post\n- schedule_start: ${input.scheduleStart}\n- Google Drive folder ID: ${input.driveFolderId}\n- supplied assets (${input.assets.length}):\n${input.assets.map((asset) => `  - ${asset.id} | ${asset.name} | ${asset.mimeType}`).join('\n')}\n\nStrategy snapshot to reuse (this is the source of truth; do not invent a different campaign strategy):\n\`\`\`json\n${JSON.stringify(strategy, null, 2)}\n\`\`\`\n\nRequirements:\n1. Inspect the listed Drive files and map each used source file ID to one Story post. Do not create, alter, crop, or regenerate the supplied base image.\n2. Decide hook, caption, CTA, schedule, hypothesis, metric, and concise on-image copy for every Story from the strategy snapshot. Keep Innerbloom tone warm, intelligent, premium and hopeful; never mystical or corporate-hype.\n3. Use the canonical Drive brand logo asset ID 1s7psZ57aam7Azg9eOqy-jQkfwIkNWYH0.\n4. Validate the JSON against the provided schema and run the supplied Story renderer in preview mode. Fix contract errors before committing.\n5. Commit only the new campaign configuration on a new branch and open a PR. In the PR explain that merge enables a deterministic preview only; Admin approval is required before R2 upload and Metricool CSV export.\n`;
}
