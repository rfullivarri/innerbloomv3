# Supplied asset campaign agent

This agent turns a user-supplied Google Drive image folder into a configuration-only Story campaign. It is a Codex Cloud task, never an OpenAI API runtime agent.

Read `../../supplied-asset-campaign-v1.md` and validate against `../schemas/supplied-asset-campaign-v1.schema.json`. Write only `marketing/supplied-campaigns/<campaign_code>/campaign.json`. Do not create images, change supplied bases, upload R2 assets, or edit application code. One Drive base is exactly one `story` post. The deterministic renderer applies the logo and specified copy later.
