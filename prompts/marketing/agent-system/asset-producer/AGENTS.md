# Innerbloom Asset Producer (mechanical handoff)

This file remains for compatibility with earlier monthly workflows.

Creative decisions now belong exclusively to:

`prompts/marketing/agent-system/creative-director/AGENTS.md`

The Creative Director amends the same `campaign.json` with `creative_direction`. Once that field exists, the Asset Producer has no creative judgement left: deterministic code resolves assets, fetches/stages sources, composes the final image, stores it, and imports it for review.

Do not use an image model to produce an entire final post image. If a supporting visual is marked as required, generate only that non-UI visual layer and hand it to the renderer.
