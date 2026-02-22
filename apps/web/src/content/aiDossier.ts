import { OFFICIAL_DESIGN_TOKENS } from './officialDesignTokens';
import { OFFICIAL_LANDING_CONTENT } from './officialLandingContent';

const LINKS = {
  landing: 'https://innerbloomjourney.org/',
  intro_journey: 'https://innerbloomjourney.org/intro-journey',
  signup: 'https://innerbloomjourney.org/sign-up',
  login: 'https://innerbloomjourney.org/login',
  ai_page: 'https://innerbloomjourney.org/ai',
  llms: 'https://innerbloomjourney.org/llms.txt'
};

export type BuildVersioning = {
  version: string;
  lastUpdated: string;
};

export function buildAiJson(versioning: BuildVersioning) {
  const es = OFFICIAL_LANDING_CONTENT.es;

  return {
    brand: {
      name: 'Innerbloom',
      website: LINKS.landing,
      product: 'Innerbloom Journey',
      category: 'Self-improvement gamificado'
    },
    source_of_truth: {
      sourceModule: 'apps/web/src/content/officialLandingContent.ts',
      sections: ['tagline', 'hero', 'value_proposition', 'pillars', 'modes', 'how_it_works', 'faq', 'ctas']
    },
    copy: {
      tagline: `${es.hero.titleLead} ${es.hero.titleHighlight}.`,
      short: 'Innerbloom transforma hábitos diarios en progreso visible con equilibrio entre Body, Mind y Soul.',
      long: 'Innerbloom es una experiencia web de self-improvement gamificada. La persona define su camino inicial, activa una base personalizada asistida por IA y sostiene su proceso con un loop diario de quest, emociones y métricas de progreso (XP, rachas, nivel, consistencia y misiones).',
      hero: es.hero,
      value_proposition: es.pillars.highlight
    },
    features: es.modes.items.map((mode) => `${mode.title}: ${mode.goal}`),
    onboarding_steps: es.how.steps.map((step) => `${step.title}: ${step.copy}`),
    faq: es.faq.items,
    links: LINKS,
    versioning,
    design_tokens: OFFICIAL_DESIGN_TOKENS
  };
}

export function buildAiHtml(versioning: BuildVersioning) {
  const es = OFFICIAL_LANDING_CONTENT.es;
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Innerbloom — AI Pack oficial</title>
    <meta name="description" content="Canal oficial AI/LLM de Innerbloom: contenido sincronizado con la landing oficial." />
    <link rel="canonical" href="https://innerbloomjourney.org/ai" />
    <style>body{font-family:Inter,system-ui,sans-serif;background:#0b1220;color:#eaf1ff;margin:0;padding:32px;line-height:1.6}main{max-width:960px;margin:0 auto}code{background:#111f35;padding:2px 6px;border-radius:6px}.card{background:#111f35;border:1px solid #22314f;border-radius:12px;padding:20px;margin:16px 0}.muted{color:#9fb6e3}</style>
  </head>
  <body>
    <main>
      <h1>Innerbloom — AI Pack oficial</h1>
      <p>Este documento usa la misma fuente de verdad que la landing OFICIAL (<a href="https://innerbloomjourney.org/">innerbloomjourney.org</a>) y no toma contenido de <code>/landing-v2</code>.</p>
      <p class="muted">Version: <code>${versioning.version}</code> · lastUpdated: <code>${versioning.lastUpdated}</code> · JSON: <a href="/ai.json">/ai.json</a>.</p>
      <section class="card"><h2>Tagline + Hero</h2><p><strong>${es.hero.titleLead} ${es.hero.titleHighlight}</strong></p><p>${es.hero.subtitle}</p><p class="muted">${es.hero.note}</p></section>
      <section class="card"><h2>Value Proposition</h2><p>${es.pillars.highlight}</p></section>
      <section class="card"><h2>Features (source: modos oficiales)</h2><ul>${es.modes.items.map((mode) => `<li><strong>${mode.title}</strong>: ${mode.goal}</li>`).join('')}</ul></section>
      <section class="card"><h2>Cómo funciona (onboarding)</h2><ol>${es.how.steps.map((step) => `<li><strong>${step.title}</strong>: ${step.copy}</li>`).join('')}</ol></section>
      <section class="card"><h2>FAQ oficial</h2><ul>${es.faq.items.map((item) => `<li><strong>${item.question}</strong> — ${item.answer}</li>`).join('')}</ul></section>
      <section class="card"><h2>Design Dossier (derivado de tokens)</h2><p>Palette bg: <code>${OFFICIAL_DESIGN_TOKENS.palette.bg}</code>, primary: <code>${OFFICIAL_DESIGN_TOKENS.palette.primary}</code>, secondary: <code>${OFFICIAL_DESIGN_TOKENS.palette.secondary}</code>.</p><p>Typography heading: <code>${OFFICIAL_DESIGN_TOKENS.typography.headingFamily}</code> · body: <code>${OFFICIAL_DESIGN_TOKENS.typography.bodyFamily}</code>.</p><p>CSS vars mapeadas: ${OFFICIAL_DESIGN_TOKENS.cssVariablesMapped.map((token) => `<code>${token}</code>`).join(', ')}</p></section>
    </main>
  </body>
</html>`;
}
