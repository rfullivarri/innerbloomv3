import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import './LandingV2.css';

type Language = 'en' | 'es';

type NavItem = {
  href: string;
  label: string;
};

type Highlight = {
  id: string;
  title: string;
  description: string;
  visual: 'heatmap' | 'kpis' | 'wrap';
};

type Mode = {
  id: string;
  title: string;
  benefit: string;
  bullets: string[];
};

type Pillar = {
  id: string;
  title: string;
  description: string;
  emoji: string;
};

type Testimonial = {
  quote: string;
  author: string;
};

type Faq = {
  q: string;
  a: string;
};

const BUTTON_BASE =
  'inline-flex items-center justify-center whitespace-nowrap rounded-2xl px-5 py-3 font-display text-sm font-semibold tracking-tight transition duration-150 ease-out active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

const BUTTON_VARIANTS = {
  primary: `${BUTTON_BASE} bg-accent-purple text-white shadow-glow hover:bg-accent-purple/90`,
  ghost: `${BUTTON_BASE} border border-white/20 bg-white/5 text-text-subtle hover:bg-white/10 hover:text-white`
};

const t = {
  en: {
    nav: [
      { href: '#hero', label: 'Overview' },
      { href: '#highlights', label: 'Dashboards' },
      { href: '#modes', label: 'Modes' },
      { href: '#pillars', label: 'Pillars' },
      { href: '#testimonials', label: 'Testimonials' },
      { href: '#faq', label: 'FAQ' }
    ] satisfies NavItem[],
    hero: {
      title: 'Turn habits into a dashboarded journey',
      subtitle: 'Mobile-first heatmaps, streaks, and KPIs that adapt to your energy.',
      cta: 'Start free',
      secondary: 'See the product',
      supporting: 'Your base is generated in under 3 minutes with AI.'
    },
    highlights: {
      title: 'What you track in Innerbloom',
      description: 'Visual, lightweight snapshots that keep you moving forward.',
      items: [
        {
          id: 'heatmap',
          title: 'Emotion heatmap',
          description: 'Log mood in seconds and spot weekly trends.',
          visual: 'heatmap'
        },
        {
          id: 'kpis',
          title: 'Streaks & KPIs',
          description: 'Consistency, XP, and daily focus areas in one view.',
          visual: 'kpis'
        },
        {
          id: 'wrap',
          title: 'Weekly wrap',
          description: 'Auto-summary of wins, misses, and next steps.',
          visual: 'wrap'
        }
      ] satisfies Highlight[]
    },
    modes: {
      title: 'Match the app to your energy',
      description: 'Four modes so you can move, even on low days.',
      items: [
        {
          id: 'low',
          title: '🪫 Low',
          benefit: 'Protect energy with tiny, winnable steps.',
          bullets: ['1–2 minute tasks', 'Recovery-first', 'No guilt rest']
        },
        {
          id: 'chill',
          title: '🍃 Chill',
          benefit: 'Stay steady with balanced routines.',
          bullets: ['Light planning', 'Evening reflection', 'Gentle streaks']
        },
        {
          id: 'flow',
          title: '🌊 Flow',
          benefit: 'Ride momentum with focused blocks.',
          bullets: ['Goal-linked tasks', 'Focus timers', 'Progress tags']
        },
        {
          id: 'evolve',
          title: '🧬 Evolve',
          benefit: 'Push limits with missions and rewards.',
          bullets: ['Atomic habits', 'XP ladders', 'Weekly challenges']
        }
      ] satisfies Mode[]
    },
    pillars: {
      title: 'Built around Body, Mind, Soul',
      description: 'Balance inputs so consistency actually sticks.',
      items: [
        {
          id: 'body',
          title: 'Body',
          emoji: '🫀',
          description: 'Sleep, nutrition, and movement drive daily energy.'
        },
        {
          id: 'mind',
          title: 'Mind',
          emoji: '🧠',
          description: 'Focus and learning rituals keep momentum clean.'
        },
        {
          id: 'soul',
          title: 'Soul',
          emoji: '🏵️',
          description: 'Emotions and purpose stabilize long-term habits.'
        }
      ] satisfies Pillar[]
    },
    testimonials: {
      title: 'Users who stayed consistent',
      description: 'Short shifts, visible progress.',
      items: [
        { quote: '“The heatmap made me see energy patterns. I stopped overcommitting.”', author: 'Diego • Dev' },
        { quote: '“Six weeks of habits, first time ever. Missions kept me honest.”', author: 'Lucía • Designer' },
        { quote: '“Low to Flow without burnout. The weekly wrap is gold.”', author: 'Caro • Student' }
      ] satisfies Testimonial[]
    },
    faq: {
      title: 'FAQ',
      items: [
        {
          q: 'Do I need discipline to start?',
          a: 'No. Begin in Low mode and the app keeps tasks tiny until you have momentum.'
        },
        {
          q: 'Where do I see my metrics?',
          a: 'In your dashboard: heatmap, streaks, XP, and weekly wrap.'
        },
        {
          q: 'Can I switch modes?',
          a: 'Yes, swap between Low, Chill, Flow, and Evolve anytime.'
        }
      ] satisfies Faq[]
    },
    next: {
      title: 'Ready to see your data?',
      description: 'Start free, switch languages anytime.',
      primary: 'Start free',
      secondary: 'View sample dashboard'
    },
    langLabel: 'Language'
  },
  es: {
    nav: [
      { href: '#hero', label: 'Overview' },
      { href: '#highlights', label: 'Dashboards' },
      { href: '#modes', label: 'Modos' },
      { href: '#pillars', label: 'Pilares' },
      { href: '#testimonials', label: 'Testimonios' },
      { href: '#faq', label: 'FAQ' }
    ] satisfies NavItem[],
    hero: {
      title: 'Convierte tus hábitos en un dashboard claro',
      subtitle: 'Heatmaps, rachas y KPIs mobile-first que se adaptan a tu energía.',
      cta: 'Empezar gratis',
      secondary: 'Ver el producto',
      supporting: 'Generamos tu base en menos de 3 minutos con IA.'
    },
    highlights: {
      title: 'Lo que ves en Innerbloom',
      description: 'Snapshots visuales y ligeros para seguir avanzando.',
      items: [
        {
          id: 'heatmap',
          title: 'Heatmap emocional',
          description: 'Registra tu ánimo en segundos y ve tendencias semanales.',
          visual: 'heatmap'
        },
        {
          id: 'kpis',
          title: 'Rachas y KPIs',
          description: 'Constancia, XP y focos diarios en una sola vista.',
          visual: 'kpis'
        },
        {
          id: 'wrap',
          title: 'Weekly wrap',
          description: 'Resumen automático de logros, pendientes y próximos pasos.',
          visual: 'wrap'
        }
      ] satisfies Highlight[]
    },
    modes: {
      title: 'Ajusta el modo a tu energía',
      description: 'Cuatro modos para moverte incluso en días bajos.',
      items: [
        {
          id: 'low',
          title: '🪫 Low',
          benefit: 'Protegé energía con pasos mínimos.',
          bullets: ['Tareas de 1–2 minutos', 'Recuperación primero', 'Descanso sin culpa']
        },
        {
          id: 'chill',
          title: '🍃 Chill',
          benefit: 'Mantén estabilidad con rutinas balanceadas.',
          bullets: ['Plan liviano', 'Reflexión nocturna', 'Rachas suaves']
        },
        {
          id: 'flow',
          title: '🌊 Flow',
          benefit: 'Aprovechá el impulso con bloques enfocados.',
          bullets: ['Tareas ligadas a metas', 'Timers de foco', 'Tags de progreso']
        },
        {
          id: 'evolve',
          title: '🧬 Evolve',
          benefit: 'Subí la vara con misiones y recompensas.',
          bullets: ['Hábitos atómicos', 'Escalera de XP', 'Retos semanales']
        }
      ] satisfies Mode[]
    },
    pillars: {
      title: 'Cuerpo, Mente, Alma',
      description: 'Equilibrá insumos para que la constancia se sostenga.',
      items: [
        {
          id: 'body',
          title: 'Cuerpo',
          emoji: '🫀',
          description: 'Sueño, nutrición y movimiento sostienen tu energía diaria.'
        },
        {
          id: 'mind',
          title: 'Mente',
          emoji: '🧠',
          description: 'Rituales de foco y aprendizaje mantienen el impulso.'
        },
        {
          id: 'soul',
          title: 'Alma',
          emoji: '🏵️',
          description: 'Emociones y propósito estabilizan hábitos a largo plazo.'
        }
      ] satisfies Pillar[]
    },
    testimonials: {
      title: 'Personas que sostuvieron hábitos',
      description: 'Cambios cortos, progreso visible.',
      items: [
        { quote: '“El heatmap me mostró patrones de energía. Dejé de sobrecargarme.”', author: 'Diego • Dev' },
        { quote: '“Seis semanas de hábitos por primera vez. Las misiones me ordenaron.”', author: 'Lucía • Diseñadora' },
        { quote: '“De Low a Flow sin quemarme. El weekly wrap es oro.”', author: 'Caro • Estudiante' }
      ] satisfies Testimonial[]
    },
    faq: {
      title: 'FAQ',
      items: [
        {
          q: '¿Necesito disciplina para empezar?',
          a: 'No. Arrancás en Low y la app mantiene tareas mínimas hasta generar impulso.'
        },
        {
          q: '¿Dónde veo mis métricas?',
          a: 'En tu dashboard: heatmap, rachas, XP y weekly wrap.'
        },
        {
          q: '¿Puedo cambiar de modo?',
          a: 'Sí, podés alternar entre Low, Chill, Flow y Evolve en cualquier momento.'
        }
      ] satisfies Faq[]
    },
    next: {
      title: 'Listo para ver tus datos?',
      description: 'Empezá gratis y cambiá de idioma cuando quieras.',
      primary: 'Empezar gratis',
      secondary: 'Ver dashboard de muestra'
    },
    langLabel: 'Idioma'
  }
} as const;

export default function LandingV2Page() {
  const { userId } = useAuth();
  const isSignedIn = Boolean(userId);
  const [language, setLanguage] = useState<Language>('en');
  const copy = t[language];

  const primaryCta = useMemo(
    () => (isSignedIn ? { label: 'Go to dashboard', to: '/dashboard' } : { label: copy.hero.cta, to: '/intro-journey' }),
    [copy.hero.cta, isSignedIn]
  );

  return (
    <div className="landing-v2">
      <header className="lv2-nav">
        <Link className="lv2-brand" to="/landing-v2" aria-label="Innerbloom — Landing V2">
          <span className="lv2-mark" aria-hidden="true">
            ⧉
          </span>
          <span className="lv2-brand-text">Innerbloom</span>
        </Link>
        <nav className="lv2-links">
          {copy.nav.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="lv2-actions">
          <label className="lv2-lang">
            <span>{copy.langLabel}</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </label>
          <Link className={BUTTON_VARIANTS.primary} to={primaryCta.to}>
            {primaryCta.label}
          </Link>
        </div>
      </header>

      <main>
        <section className="lv2-hero" id="hero">
          <div className="lv2-container lv2-hero-grid">
            <div className="lv2-hero-copy">
              <p className="lv2-kicker">Mobile-first • Dashboards</p>
              <h1>{copy.hero.title}</h1>
              <p className="lv2-sub">{copy.hero.subtitle}</p>
              <div className="lv2-cta-row">
                <Link className={BUTTON_VARIANTS.primary} to={primaryCta.to}>
                  {primaryCta.label}
                </Link>
                <a className={BUTTON_VARIANTS.ghost} href="#highlights">
                  {copy.hero.secondary}
                </a>
              </div>
              <p className="lv2-support">{copy.hero.supporting}</p>
            </div>
            <div className="lv2-hero-visual">
              <div className="lv2-hero-card lv2-heatmap-card">
                <div className="lv2-card-header">
                  <span className="dot green" />
                  <span className="dot amber" />
                  <span className="dot purple" />
                </div>
                <div className="lv2-heatmap-grid">
                  {Array.from({ length: 24 }).map((_, index) => (
                    <span key={index} className={`cell cell-${(index % 5) + 1}`} />
                  ))}
                </div>
                <div className="lv2-legend">
                  <span>Calm</span>
                  <span>Focus</span>
                  <span>Peak</span>
                </div>
              </div>
              <div className="lv2-hero-card lv2-kpi-card">
                <div className="lv2-kpi-row">
                  <div>
                    <p className="label">Streak</p>
                    <p className="value">18</p>
                  </div>
                  <div>
                    <p className="label">XP</p>
                    <p className="value">12,430</p>
                  </div>
                </div>
                <div className="lv2-progress">
                  <span style={{ width: '72%' }} />
                </div>
                <div className="lv2-tags">
                  <span>Body</span>
                  <span>Mind</span>
                  <span>Soul</span>
                </div>
              </div>
              <div className="lv2-hero-card lv2-wrap-card">
                <p className="label">Weekly wrap</p>
                <div className="lv2-wrap-bar">
                  <span className="win" style={{ width: '64%' }} />
                  <span className="miss" style={{ width: '24%' }} />
                </div>
                <p className="lv2-wrap-text">Top win: AM focus • Next: earlier sleep</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lv2-section" id="highlights">
          <div className="lv2-container">
            <div className="lv2-section-head">
              <p className="lv2-kicker">Product</p>
              <h2>{copy.highlights.title}</h2>
              <p className="lv2-sub">{copy.highlights.description}</p>
            </div>
            <div className="lv2-grid lv2-grid-3">
              {copy.highlights.items.map((item) => (
                <article key={item.id} className="lv2-card">
                  <header className="lv2-card-head">
                    <p className="lv2-card-title">{item.title}</p>
                    <p className="lv2-card-sub">{item.description}</p>
                  </header>
                  {item.visual === 'heatmap' ? (
                    <div className="lv2-mini-heatmap">
                      {Array.from({ length: 20 }).map((_, index) => (
                        <span key={index} className={`cell cell-${(index % 5) + 1}`} />
                      ))}
                    </div>
                  ) : null}
                  {item.visual === 'kpis' ? (
                    <div className="lv2-mini-kpis">
                      <div className="tile">
                        <p className="label">Streak</p>
                        <p className="value">24</p>
                      </div>
                      <div className="tile">
                        <p className="label">Focus</p>
                        <p className="value">82%</p>
                      </div>
                      <div className="tile">
                        <p className="label">XP</p>
                        <p className="value">14k</p>
                      </div>
                    </div>
                  ) : null}
                  {item.visual === 'wrap' ? (
                    <div className="lv2-mini-wrap">
                      <div className="slide">
                        <p className="label">Wins</p>
                        <p className="value">4</p>
                      </div>
                      <div className="slide">
                        <p className="label">Next</p>
                        <p className="value">Sleep</p>
                      </div>
                      <div className="slide ghost">
                        <p className="label">Share</p>
                        <p className="value">PNG</p>
                      </div>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lv2-section" id="modes">
          <div className="lv2-container">
            <div className="lv2-section-head">
              <p className="lv2-kicker">Adaptive</p>
              <h2>{copy.modes.title}</h2>
              <p className="lv2-sub">{copy.modes.description}</p>
            </div>
            <div className="lv2-grid lv2-grid-2">
              {copy.modes.items.map((mode) => (
                <article key={mode.id} className={`lv2-card mode-${mode.id}`}>
                  <div className="lv2-mode-title">{mode.title}</div>
                  <p className="lv2-card-sub">{mode.benefit}</p>
                  <ul className="lv2-bullets">
                    {mode.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lv2-section" id="pillars">
          <div className="lv2-container">
            <div className="lv2-section-head">
              <p className="lv2-kicker">Balance</p>
              <h2>{copy.pillars.title}</h2>
              <p className="lv2-sub">{copy.pillars.description}</p>
            </div>
            <div className="lv2-grid lv2-grid-3">
              {copy.pillars.items.map((pillar) => (
                <article key={pillar.id} className="lv2-card lv2-pillar">
                  <div className="lv2-pillar-head">
                    <span className="emoji">{pillar.emoji}</span>
                    <p className="lv2-card-title">{pillar.title}</p>
                  </div>
                  <p className="lv2-card-sub">{pillar.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lv2-section" id="testimonials">
          <div className="lv2-container">
            <div className="lv2-section-head">
              <p className="lv2-kicker">Social proof</p>
              <h2>{copy.testimonials.title}</h2>
              <p className="lv2-sub">{copy.testimonials.description}</p>
            </div>
            <div className="lv2-grid lv2-grid-2">
              {copy.testimonials.items.map((testimonial) => (
                <figure key={testimonial.quote} className="lv2-card lv2-quote">
                  <blockquote>{testimonial.quote}</blockquote>
                  <figcaption>{testimonial.author}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="lv2-section" id="faq">
          <div className="lv2-container lv2-container-narrow">
            <div className="lv2-section-head">
              <p className="lv2-kicker">Clarity</p>
              <h2>{copy.faq.title}</h2>
            </div>
            <div className="lv2-faq">
              {copy.faq.items.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lv2-section lv2-next">
          <div className="lv2-container lv2-container-narrow">
            <h2>{copy.next.title}</h2>
            <p className="lv2-sub">{copy.next.description}</p>
            <div className="lv2-cta-row center">
              <Link className={BUTTON_VARIANTS.primary} to={primaryCta.to}>
                {copy.next.primary}
              </Link>
              <a className={BUTTON_VARIANTS.ghost} href="#highlights">
                {copy.next.secondary}
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
