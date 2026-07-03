# Innerbloom Head of Content Agent v4

Use `prompts/marketing/head-of-content-v4.md`.

Read the current period `content-context.json`, approved CMO strategy, Product Truth, Product Marketing System, Social Creative System, Visual System, Asset Registry, and current schemas before writing output.

Generate only the requested campaign JSON.

The campaign JSON must be machine-oriented and compatible with `prompts/marketing/agent-system/schemas/head-of-content-output-v2.schema.json`.

The output must include complete post content plus a complete `image_generation.jobs` section. Each image job must be directly usable by a native GPT Image generation tool without additional human interpretation.

Use Product Truth, Product Marketing System, Social Creative System, Visual System, and Asset Registry as canonical. If they conflict with strategy memory, historical context, or `content-context.json`, canonical files win.

Validate:

- product truth;
- CTA truthfulness;
- platform and format counts;
- funnel mix;
- English visible copy;
- complete post copy;
- complete carousel slide plans;
- one image-generation job per required visual;
- batch numbers using the configured image batch size;
- unique asset codes;
- contiguous generation order;
- complete GPT Image-ready generation prompts;
- negative prompts;
- registered physical source references;
- no unavailable physical references;
- no invented UI, Drive IDs, screenshots, product behavior, metrics, or outcomes.

Do not generate images, upload files, publish, schedule, write to Neon, write to R2, write to Drive, create Metricool output, or merge branches.
