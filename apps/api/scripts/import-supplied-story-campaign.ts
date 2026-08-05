import { endPool } from '../src/db.js';
import { importSuppliedStoryCampaign, readSuppliedStoryCampaign } from '../src/services/marketingSuppliedStoryCampaignImportService.js';

const [campaignPath] = process.argv.slice(2);
if (!campaignPath) throw new Error('Usage: import-supplied-story-campaign.ts <campaign.json>');

try {
  const result = await importSuppliedStoryCampaign(await readSuppliedStoryCampaign(campaignPath));
  console.log(result.imported ? `Imported ${result.storyCount} supplied Stories into Admin.` : 'Campaign already exists in Admin.');
} finally {
  await endPool();
}
