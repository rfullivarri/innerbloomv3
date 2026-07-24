# Marketing documentation maintenance

Applies to all files under `Docs/marketing` and to implementation work affecting the marketing system.

The canonical architecture document is:

- `Docs/marketing/automated-marketing-system.md`

When changing any of the following, update that document in the same pull request:

- marketing GitHub Actions or schedules;
- marketing agents, prompts or handoffs;
- campaign, creative-direction or asset schemas;
- renderer or quality gates;
- Cloudflare R2 upload, verification or lifecycle;
- Neon campaign import or persistence;
- Admin marketing review behavior;
- Metricool CSV generation or publication handoff.

The update must keep current:

1. the current production flow;
2. the target automated flow;
3. agent vs automation vs human responsibilities;
4. failure and recovery behavior;
5. asset compatibility rules;
6. backlog and `Last verified` date.

A PR that touches these areas but does not alter architecture should state explicitly in its description: `Marketing architecture unchanged`.
