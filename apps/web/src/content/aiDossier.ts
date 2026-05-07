import { OFFICIAL_DESIGN_TOKENS } from './officialDesignTokens';
import { OFFICIAL_LANDING_CONTENT } from './officialLandingContent';

const LINKS = {
  landing: 'https://innerbloom.org',
  intro_journey: 'https://innerbloom.org/intro-journey',
  signup: 'https://innerbloom.org/sign-up',
  login: 'https://innerbloom.org/login',
  ai_page: 'https://innerbloom.org/ai',
  llms: 'https://innerbloom.org/llms.txt'
};

export type BuildVersioning = {
  version: string;
  lastUpdated: string;
};

export function buildAiJson(versioning: BuildVersioning) {
  const es = OFFICIAL_LANDING_CONTENT.es;

  return {
    schema_version: 'ai_dossier_v2',
    brand: {
      name: 'Innerbloom',
      website: LINKS.landing,
      product: 'Innerbloom Journey',
      category: 'Self-improvement gamificado'
    },
    source_of_truth: {
      sourceModule: 'apps/web/src/content/officialLandingContent.ts',
      sections: ['hero', 'pillars', 'modes', 'how', 'faq', 'testimonials', 'auth'],
      policy: 'Este AI Dossier se mantiene fiel a la landing oficial. No inventa features ni claims no presentes en la landing.'
    },
    positioning: {
      one_liner:
        'Innerbloom es una app de hábitos adaptativa y gamificada que ajusta tu Journey a tu energía real.',
      one_paragraph:
        'Innerbloom Journey es una experiencia de self-improvement donde cada persona recibe una base personalizada en menos de 3 minutos y sostiene el avance con acciones, registro emocional y métricas de progreso (GP, nivel, rachas y consistencia). Su diferencial es la adaptación: el ritmo Low, Chill, Flow o Evolve define la intensidad sostenible de la semana, mientras el avatar define la identidad visual del usuario.',
      five_bullets: [
        'IA para activar rápido una base personalizada Body/Mind/Soul.',
        '4 ritmos adaptativos (Low, Chill, Flow, Evolve) para ajustar intensidad a tu energía actual.',
        'Avatar independiente del ritmo: Red Cat, Green Bear, Blue Amphibian o Violet Owl pueden convivir con cualquier ritmo.',
        'Loop diario de Daily Quest + emociones para transformar reflexión en acción.',
        'Dashboard con métricas de progreso visibles: GP, nivel, rachas y mapa emocional.'
      ]
    },
    icp: {
      for_who: [
        'Personas que quieren mejorar hábitos con estructura clara y feedback diario.',
        'Usuarios que alternan energía/estado y necesitan adaptar intensidad sin abandonar.',
        'Perfiles que valoran ver progreso en métricas gamificadas (GP, nivel, rachas).',
        'Quienes buscan un enfoque integral Body/Mind/Soul, no solo productividad.'
      ],
      not_for_who: [
        'Personas que buscan resultados instantáneos sin práctica diaria.',
        'Usuarios que no quieren registrar retrospectivas o seguimiento de hábitos.',
        'Equipos/empresas que necesitan funciones B2B, colaboración o paneles multiusuario (no se describen en la landing oficial).'
      ]
    },
    jobs_to_be_done: [
      'Cuando me siento sin energía o abrumado, quiero un punto de partida simple para activar mi mínimo vital.',
      'Cuando tengo impulso, quiero un sistema que me ayude a sostener consistencia y convertirla en progreso acumulado.',
      'Cuando no entiendo mis altibajos, quiero observar emociones y hábitos juntos para decidir mejor mi siguiente día.',
      'Cuando pierdo ritmo, quiero retomar sin perder progreso y reajustar objetivos a mi energía actual.'
    ],
    measurable_benefits: {
      available: true,
      items: [
        'Tiempo de activación inicial: base personalizada con IA en menos de 3 minutos.',
        'Métricas visibles de avance: GP, nivel, rachas, consistencia semanal y mapa emocional.'
      ],
      note: 'No se publican porcentajes de mejora ni benchmarks clínicos en la landing oficial.'
    },
    features: [
      {
        feature: 'Base personalizada con IA (Body/Mind/Soul)',
        what_it_does: 'Genera una base inicial personalizada después de responder preguntas sobre contexto, objetivos y energía.',
        why_it_matters: 'Reduce fricción de arranque y transforma intención difusa en plan accionable.'
      },
      {
        feature: 'Ritmos adaptativos: Low, Chill, Flow, Evolve',
        what_it_does: 'Define la intensidad semanal del Journey: Low 1x/semana, Chill 2x/semana, Flow 3x/semana y Evolve 4x/semana.',
        why_it_matters: 'El sistema no exige la misma carga todos los días: adapta tareas, objetivos y crecimiento a la capacidad real del usuario.'
      },
      {
        feature: 'Avatar visual independiente',
        what_it_does: 'Permite elegir una identidad visual como Red Cat, Green Bear, Blue Amphibian o Violet Owl sin fijar el ritmo.',
        why_it_matters: 'Hace que Innerbloom sea más personal sin confundir apariencia con intensidad: Red Cat puede estar en Low, Chill, Flow o Evolve.'
      },
      {
        feature: 'Regla de producto: ritmo conduce comportamiento, avatar conduce apariencia',
        what_it_does: 'El ritmo controla frecuencia, task generation, calibración y sugerencias; el avatar controla color, glow, media e identidad visual.',
        why_it_matters: 'Evita una lectura errónea del producto: cambiar avatar no cambia la dificultad, y cambiar ritmo no debería cambiar quién sos visualmente.'
      },
      {
        feature: 'Daily Quest + registro emocional',
        what_it_does: 'Guía una retrospectiva diaria para identificar la emoción predominante y cerrar el día con conciencia.',
        why_it_matters: 'Conecta hábitos con estado interno para decisiones más sostenibles.'
      },
      {
        feature: 'Dashboard gamificado de progreso',
        what_it_does: 'Muestra GP, nivel, rachas, consistencia y progreso en acciones/recompensas.',
        why_it_matters: 'Hace visible el avance y fortalece motivación por evidencia, no por impulso momentáneo.'
      },
      {
        feature: 'Retomar sin perder progreso',
        what_it_does: 'Permite volver luego de pausas y ajustar objetivos al estado actual.',
        why_it_matters: 'Sostiene continuidad realista y evita el ciclo de culpa + abandono.'
      }
    ],
    onboarding_narrative: es.how.steps.map((step, index) => ({
      step: index + 1,
      title: step.title,
      experience: step.bullets.join(' '),
      outcome:
        index === 0
          ? 'Entrás con dirección y un ritmo alineado a tu energía.'
          : index === 1
            ? 'Salís con una base concreta para comenzar hoy.'
            : index === 2
              ? 'Convertís tu día en aprendizaje práctico y señal accionable.'
              : 'Visualizás progreso acumulado y próximos desafíos.'
    })),
    objections_faq: es.faq.items.map((item) => ({
      objection: item.question,
      answer: item.answer
    })),
    design_dossier: {
      unique_look: [
        'Estética nocturna/espacial con gradientes fríos y acentos violeta-cyan que comunican introspección + progreso.',
        'Lenguaje visual de juego (ritmos, GP, progreso y recompensas) aplicado a self-improvement adaptativo, con tono emocional y no punitivo.',
        'Combinación tipográfica Sora (titulares) + Manrope (cuerpo) para balance entre personalidad y legibilidad.'
      ],
      do_not_change: [
        'No romper la narrativa de equilibrio Body/Mind/Soul: es el núcleo estratégico del producto.',
        'No eliminar ni diluir los 4 ritmos (Low, Chill, Flow, Evolve): explican la adaptación por energía.',
        'No volver a mezclar avatar y ritmo: avatar es apariencia; ritmo es intensidad/comportamiento.',
        'No sustituir la base oscura ni los acentos brand (primary/secondary): son parte central del reconocimiento visual.',
        'No mover el foco de constancia progresiva hacia promesas de resultados instantáneos.'
      ],
      spacing_and_contrast: [
        'Mantener jerarquía de secciones amplias (sectionVertical 64px) para lectura respirable en storytelling largo.',
        'Usar superficies elevadas y bordes con contraste suficiente para distinguir cards sobre fondo oscuro.',
        'Conservar texto principal claro sobre fondo #0B1220 y reservar muted para soporte, no para contenido crítico.'
      ],
      component_library: {
        applies: true,
        guidance: [
          'Tratar los tokens oficiales como API visual estable (palette, typography, spacing, radius, shadows).',
          'Priorizar variables CSS ya mapeadas para color/tipografía antes de agregar nuevas constantes.',
          'Usar semántica de componentes consistente: cards, secciones narrativas, listas de pasos, bloques FAQ.'
        ]
      },
      suggested_improvements: [
        'Agregar un bloque comparativo por ritmo (cuándo usar cada uno) para reducir duda de entrada.',
        'Incluir microcopy contextual en onboarding que anticipe “retomar sin culpa” antes del primer corte de racha.',
        'Incorporar casos de uso técnicos (ej. estudiante/dev/creativo) reutilizando testimonios ya existentes.',
        'Explicar visualmente que Red Cat es un avatar elegible y no un ritmo.'
      ]
    },
    provenance_note: {
      derived_from_official_landing: [
        'Propuesta de valor general, pilares Body/Mind/Soul, modos, flujo de onboarding y FAQs.',
        'Métricas visibles mencionadas: GP, nivel, rachas, consistencia, mapa emocional y recompensas.',
        'Claim temporal explícito: base personalizada con IA en menos de 3 minutos.'
      ],
      recommendations: [
        'Estructura AI-first para LLM (ICP, JTBD, what/why de features, design guardrails).',
        'Suggested improvements de UX/copy señaladas explícitamente como recomendaciones opcionales.'
      ]
    },
    links: LINKS,
    versioning,
    design_tokens: OFFICIAL_DESIGN_TOKENS
  };
}

export function buildAiHtml(versioning: BuildVersioning) {
  const ai = buildAiJson(versioning);
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Innerbloom — AI Dossier oficial</title>
    <meta name="description" content="AI Dossier oficial de Innerbloom: positioning, ICP, JTBD, features y design dossier fieles a la landing oficial." />
    <link rel="canonical" href="${ai.links.ai_page}" />
    <style>body{font-family:Inter,system-ui,sans-serif;background:#0b1220;color:#eaf1ff;margin:0;padding:32px;line-height:1.6}main{max-width:980px;margin:0 auto}code{background:#111f35;padding:2px 6px;border-radius:6px}.card{background:#111f35;border:1px solid #22314f;border-radius:12px;padding:20px;margin:16px 0}.muted{color:#9fb6e3}h1,h2{line-height:1.25}ul,ol{padding-left:1.2rem}</style>
  </head>
  <body>
    <main>
      <h1>Innerbloom — AI Dossier oficial</h1>
      <p>Documento AI-first sincronizado con la landing oficial de <a href="${ai.links.landing}">Innerbloom</a>. No inventa features ni claims externos.</p>
      <p class="muted">Version: <code>${versioning.version}</code> · lastUpdated: <code>${versioning.lastUpdated}</code> · JSON: <a href="/ai.json">/ai.json</a></p>

      <section class="card"><h2>Resumen del producto</h2><p><strong>1-línea:</strong> ${ai.positioning.one_liner}</p><p><strong>1-párrafo:</strong> ${ai.positioning.one_paragraph}</p><p><strong>5 bullets:</strong></p><ul>${ai.positioning.five_bullets.map((b) => `<li>${b}</li>`).join('')}</ul></section>

      <section class="card"><h2>ICP</h2><p><strong>Para quién es:</strong></p><ul>${ai.icp.for_who.map((b) => `<li>${b}</li>`).join('')}</ul><p><strong>Para quién NO es:</strong></p><ul>${ai.icp.not_for_who.map((b) => `<li>${b}</li>`).join('')}</ul></section>

      <section class="card"><h2>Jobs-to-be-done</h2><ul>${ai.jobs_to_be_done.map((job) => `<li>${job}</li>`).join('')}</ul></section>

      <section class="card"><h2>Beneficios medibles</h2><ul>${ai.measurable_benefits.items.map((item) => `<li>${item}</li>`).join('')}</ul><p class="muted">${ai.measurable_benefits.note}</p></section>

      <section class="card"><h2>Feature list (what it does + why it matters)</h2><ul>${ai.features
        .map((feature) => `<li><strong>${feature.feature}</strong><br/>What it does: ${feature.what_it_does}<br/>Why it matters: ${feature.why_it_matters}</li>`)
        .join('')}</ul></section>

      <section class="card"><h2>Onboarding narrado</h2><ol>${ai.onboarding_narrative
        .map((step) => `<li><strong>${step.title}</strong><br/>Experiencia: ${step.experience}<br/>Resultado: ${step.outcome}</li>`)
        .join('')}</ol></section>

      <section class="card"><h2>Objections / FAQ</h2><ul>${ai.objections_faq.map((item) => `<li><strong>${item.objection}</strong> — ${item.answer}</li>`).join('')}</ul></section>

      <section class="card"><h2>Design Dossier</h2><p><strong>Qué hace único el look:</strong></p><ul>${ai.design_dossier.unique_look.map((item) => `<li>${item}</li>`).join('')}</ul><p><strong>Qué no cambiar:</strong></p><ul>${ai.design_dossier.do_not_change.map((item) => `<li>${item}</li>`).join('')}</ul><p><strong>Espacios / contraste:</strong></p><ul>${ai.design_dossier.spacing_and_contrast.map((item) => `<li>${item}</li>`).join('')}</ul><p><strong>Component library:</strong></p><ul>${ai.design_dossier.component_library.guidance.map((item) => `<li>${item}</li>`).join('')}</ul><p><strong>Suggested improvements (opcionales):</strong></p><ul>${ai.design_dossier.suggested_improvements.map((item) => `<li>${item}</li>`).join('')}</ul></section>

      <section class="card"><h2>Nota de procedencia</h2><p><strong>Derivado de landing oficial:</strong></p><ul>${ai.provenance_note.derived_from_official_landing.map((item) => `<li>${item}</li>`).join('')}</ul><p><strong>Recomendaciones:</strong></p><ul>${ai.provenance_note.recommendations.map((item) => `<li>${item}</li>`).join('')}</ul></section>
    </main>
  </body>
</html>`;
}
