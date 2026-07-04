# Asset Producer V4 Brand Overrides

Read this before running Asset Producer V4.

Required brand sources:

1. `prompts/marketing/agent-system/brand/innerbloom-visual-system-v1.json`
2. `prompts/marketing/agent-system/brand/innerbloom-visual-system-v2.md`
3. `prompts/marketing/agent-system/brand/innerbloom-asset-registry-v1.json`
4. `marketing/agent-outputs/<YYYY-MM>/campaign.json`

`campaign.json` controls the production queue, visible copy, filenames, and image jobs. The visual system files and registry control palette, logo, typography, source assets, and brand style.

## Palette

Use the Innerbloom palette strongly and visibly.

Dark mode values:

- `#06060B`
- `#0D0C14`
- `#141320`
- `#F3F0FA`
- `#A8A2B8`
- `#8E63FF`
- `#9B7CFF`
- `#C88DFF`
- `#F2AE9B`
- gradient `#8E63FF -> #C88DFF -> #F2AE9B`
- ambient depth from `#8E63FF`, `#4B3DB8`, `#173A63`

Light mode values:

- `#F1E9DE`
- `#FBF8F3`
- `#F4EFE8`
- `#211C2B`
- `#666171`
- `#8E63FF`
- `#9B7CFF`
- `#C88DFF`
- `#F2AE9B`
- gradient `#8E63FF -> #C88DFF -> #F2AE9B`

Functional colors belong only to product UI meaning, not to the brand look.

Target style: Innerbloom v2, premium, product-led, violet, lilac, peach, atmospheric depth, strong mobile-readable typography, and real product evidence.

## Logo

Use current approved logo assets from the registry:

- `approved_logo_primary_png` / `IB_NEW_LOGO1.png`
- `approved_logo_primary_512_png` / `IB_NEW_LOGO1 512.png`

Avoid old outlined flower identity, `IB-B-cont-logo.png`, plain text substitutes, and drawn logo approximations.

## Visual quality

Output should not look like old brand, beige/green wellness branding, botanical stationery, generic Canva card, background-only asset, fake product UI, low-resolution screenshot dump, or generic SaaS template.

Every output must be a final complete social image with exact visible copy already placed.

## Tooling

Use actual image generation or image editing. If only Python/Pillow/SVG/HTML/Canvas composition is available, stop and report blocked.
