import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { FeatureShowcaseSection } from '../components/landing/FeatureShowcaseSection';
import { usePageMeta } from '../lib/seo';
import './Landing.css';

type Language = 'es' | 'en';
type NavLink = { href: string; label: string };
type Pillar = { emoji: string; title: string; copy: string };
type Mode = { id: 'low' | 'chill' | 'flow' | 'evolve'; title: string; state: string; goal: string };
type HowStep = { title: string; copy: string };
type Testimonial = { quote: string; author: string };
type Faq = { question: string; answer: string };
type AuthCopy = {
  dashboard: string;
  signup: string;
  login: string;
  startJourney: string;
};

const content: Record<Language, {
  navLinks: NavLink[];
  hero: {
    titleLead: string;
    titleHighlight: string;
    subtitle: string;
    note: string;
    alt: string;
  };
  pillars: { title: string; intro: string; highlight: string; items: Pillar[] };
  modes: { title: string; intro: string; items: Mode[] };
  how: { title: string; intro: string; steps: HowStep[] };
  testimonials: { title: string; intro: string; items: Testimonial[]; prev: string; next: string; groupLabel: string };
  faq: { title: string; items: Faq[] };
  next: { title: string; intro: string };
  auth: AuthCopy;
  footer: { copyright: string; faq: string };
}> = {
  es: {
    navLinks: [],
    hero: {
      titleLead: 'Convierte la experiencia en hábitos.',
      titleHighlight: 'Convierte los hábitos en camino',
      subtitle:
        'Tus hábitos son el mapa. Tu constancia, el nivel que alcanzas. Es tu self-improvement journey con equilibrio entre 🫀 Cuerpo, 🧠 Mente y 🏵️ Alma.',
      note: 'En menos de 3 minutos generamos tu base personalizada con IA.',
      alt: 'Niño mirando una esfera de energía violeta en el cielo nocturno — Gamification Journey'
    },
    pillars: {
      title: 'Nuestros pilares fundamentales',
      intro:
        'El progreso sostenible necesita equilibrio. 🫀 Cuerpo para la energía y la salud, 🧠 Mente para el foco y el aprendizaje, y 🏵️ Alma para el bienestar emocional y el sentido. Cuando uno cae, los otros dos lo sostienen. Cuando se alinean, tu progreso se acelera.',
      highlight: 'Observate por primera vez en tercera persona y toma el control de tus acciones y hábitos.',
      items: [
        {
          emoji: '🫀',
          title: 'Cuerpo',
          copy: 'Tu cuerpo es el sustrato del hábito: sueño, nutrición y movimiento marcan tu disponibilidad de energía diaria (HP).'
        },
        {
          emoji: '🧠',
          title: 'Mente',
          copy: 'La mente filtra y prioriza. Sin foco, no hay consistencia. Diseñamos sesiones simples para sostener la atención, el aprendizaje y la creatividad.'
        },
        {
          emoji: '🏵️',
          title: 'Alma',
          copy: 'Las emociones, los vínculos y el propósito estabilizan el sistema. Sin esto, los hábitos no atraviesan semanas ni meses.'
        }
      ]
    },
    modes: {
      title: 'Modula tu modo de juego',
      intro: 'Cambia según tu momento. El sistema se adapta a tu energía.',
      items: [
        {
          id: 'low',
          title: '🪫 LOW MOOD',
          state: 'sin energía, abrumado.',
          goal: 'activar tu mínimo vital con acciones pequeñas y sostenibles.'
        },
        {
          id: 'chill',
          title: '🍃 CHILL MOOD',
          state: 'relajado y estable.',
          goal: 'sostener bienestar con rutinas suaves y balanceadas.'
        },
        {
          id: 'flow',
          title: '🌊 FLOW MOOD',
          state: 'enfocado y en movimiento.',
          goal: 'aprovechar el impulso con un plan alineado a metas concretas.'
        },
        {
          id: 'evolve',
          title: '🧬 EVOLVE MOOD',
          state: 'ambicioso y determinado.',
          goal: 'sistema retador con Hábitos Atómicos, misiones y recompensas.'
        }
      ]
    },
    how: {
      title: 'Cómo funciona',
      intro: 'Un flujo claro, de la activación a la constancia.',
      steps: [
        {
          title: 'Define tu camino',
          copy: 'Responde una serie de preguntas, setea tu modo de juego; nosotros generaremos tu base (Body/Mind/Soul) con IA.'
        },
        { title: 'Activa tu base', copy: 'Recibís tu “pergamino digital” por mail y editás/confirmás tu base.' },
        {
          title: 'Daily Quest + Emociones',
          copy: 'Con tu quest diaria vas a poder hacer una retrospectiva de tu día anterior; pensarás en qué emoción prevaleció más durante tu día.'
        },
        {
          title: 'XP, Rachas y Recompensas',
          copy: 'Seguís tu crecimiento acumulando experiencia (XP), moviendo tu constancia semanal, desafiándote a nuevas misiones y obteniendo recompensas.'
        }
      ]
    },
    testimonials: {
      title: 'Testimonios',
      intro: 'Lo que dicen quienes ya empezaron su Journey.',
      items: [
        { quote: '“Por primera vez sostuve hábitos 6 semanas. El mapa y las misiones me ordenaron.”', author: 'Lucía • Diseñadora' },
        { quote: '“El heatmap emocional me cambió la mirada. Ajusto tareas por energía real.”', author: 'Diego • Dev' },
        { quote: '“Empecé en Low y pasé a Flow con objetivos claros, sin culpa.”', author: 'Caro • Estudiante' }
      ],
      prev: 'Anterior',
      next: 'Siguiente',
      groupLabel: 'Seleccionar testimonio'
    },
    faq: {
      title: 'Preguntas frecuentes',
      items: [
        {
          question: '¿Necesito mucha disciplina para empezar?',
          answer: 'No. Si estás con poca energía, empezás en Low para activar el mínimo vital. El sistema ajusta el ritmo.'
        },
        { question: '¿Puedo cambiar de modo de juego?', answer: 'Sí. Podés cambiar entre Low, Chill, Flow y Evolve según tu momento.' },
        { question: '¿Dónde veo mis métricas?', answer: 'En tu archivo y en el Dashboard: XP, nivel, rachas y mapa emocional.' },
        {
          question: '¿Qué pasa si dejo de registrar?',
          answer: 'No perdés progreso. Retomas cuando quieras y ajustamos objetivos a tu energía actual.'
        }
      ]
    },
    next: {
      title: 'Listo para empezar',
      intro: 'Te guiamos paso a paso. Empezá ahora.'
    },
    auth: {
      dashboard: 'Ir al dashboard',
      signup: 'Crear cuenta',
      login: 'Iniciar sesión',
      startJourney: 'Comenzar mi Journey'
    },
    footer: { copyright: '©️ Gamification Journey', faq: 'FAQ' }
  },
  en: {
    navLinks: [],
    hero: {
      titleLead: 'Turn experience into habits.',
      titleHighlight: 'Turn habits into your path',
      subtitle:
        'Your habits are the map. Consistency is the level you reach. A self-improvement journey balanced between 🫀 Body, 🧠 Mind and 🏵️ Soul.',
      note: 'In under 3 minutes we generate your personalized base with AI.',
      alt: 'Kid looking at a violet energy sphere in the night sky — Gamification Journey'
    },
    pillars: {
      title: 'Our core pillars',
      intro:
        'Sustainable progress needs balance. 🫀 Body for energy and health, 🧠 Mind for focus and learning, and 🏵️ Soul for emotional well-being and meaning. When one drops, the other two support it. When they align, your progress accelerates.',
      highlight: 'See yourself in third person for the first time and take control of your actions and habits.',
      items: [
        {
          emoji: '🫀',
          title: 'Body',
          copy: 'Your body is the substrate of the habit: sleep, nutrition and movement set your daily energy (HP).'
        },
        {
          emoji: '🧠',
          title: 'Mind',
          copy: 'The mind filters and prioritizes. Without focus, there is no consistency. We design simple sessions to sustain attention, learning and creativity.'
        },
        {
          emoji: '🏵️',
          title: 'Soul',
          copy: 'Emotions, relationships and purpose stabilize the system. Without them, habits don’t last weeks or months.'
        }
      ]
    },
    modes: {
      title: 'Modulate your game mode',
      intro: 'Switch based on your moment. The system adapts to your energy.',
      items: [
        {
          id: 'low',
          title: '🪫 LOW MOOD',
          state: 'low energy, overwhelmed.',
          goal: 'activate your vital minimum with small, sustainable actions.'
        },
        {
          id: 'chill',
          title: '🍃 CHILL MOOD',
          state: 'relaxed and stable.',
          goal: 'sustain well-being with smooth, balanced routines.'
        },
        {
          id: 'flow',
          title: '🌊 FLOW MOOD',
          state: 'focused and moving.',
          goal: 'leverage momentum with a plan aligned to concrete goals.'
        },
        {
          id: 'evolve',
          title: '🧬 EVOLVE MOOD',
          state: 'ambitious and determined.',
          goal: 'challenging system with Atomic Habits, missions and rewards.'
        }
      ]
    },
    how: {
      title: 'How it works',
      intro: 'A clear flow: from activation to consistency.',
      steps: [
        {
          title: 'Define your path',
          copy: 'Answer a few questions, set your game mode; we generate your Body/Mind/Soul base with AI.'
        },
        { title: 'Activate your base', copy: 'You receive your “digital scroll” by email and edit/confirm your base.' },
        {
          title: 'Daily Quest + Emotions',
          copy: 'With your daily quest you can review yesterday and notice which emotion was most present.'
        },
        {
          title: 'XP, Streaks and Rewards',
          copy: 'Track growth by accumulating XP, moving your weekly consistency, challenging new missions and earning rewards.'
        }
      ]
    },
    testimonials: {
      title: 'Testimonials',
      intro: 'What people say after starting their Journey.',
      items: [
        { quote: '“First time keeping habits for 6 weeks. The map and missions kept me on track.”', author: 'Lucía • Designer' },
        { quote: '“The emotion heatmap changed my view. I plan tasks around real energy.”', author: 'Diego • Dev' },
        { quote: '“Started in Low and moved to Flow with clear goals, no guilt.”', author: 'Caro • Student' }
      ],
      prev: 'Previous',
      next: 'Next',
      groupLabel: 'Select testimonial'
    },
    faq: {
      title: 'Frequently asked questions',
      items: [
        {
          question: 'Do I need strong discipline to start?',
          answer: 'No. If your energy is low, start in Low to activate the vital minimum. The system adjusts the pace.'
        },
        { question: 'Can I switch game modes?', answer: 'Yes. Swap between Low, Chill, Flow and Evolve whenever you need.' },
        { question: 'Where do I see my metrics?', answer: 'In your file and dashboard: XP, level, streaks and emotion map.' },
        { question: 'What happens if I stop logging?', answer: 'You do not lose progress. Resume anytime and we adjust goals to your current energy.' }
      ]
    },
    next: {
      title: 'Ready to start',
      intro: 'We guide you step by step. Start now.'
    },
    auth: {
      dashboard: 'Go to dashboard',
      signup: 'Create account',
      login: 'Log in',
      startJourney: 'Start my Journey'
    },
    footer: { copyright: '©️ Gamification Journey', faq: 'FAQ' }
  }
};

const buttonBaseClasses =
  'inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-3 font-display text-sm font-semibold tracking-tight transition duration-150 ease-out active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

const buttonVariants = {
  primary: `${buttonBaseClasses} bg-accent-purple text-white shadow-glow hover:bg-accent-purple/90`,
  ghost: `${buttonBaseClasses} border border-transparent bg-transparent text-text-subtle hover:bg-white/10 hover:text-white`
};

const buttonClasses = (variant: keyof typeof buttonVariants = 'primary') => buttonVariants[variant];

function LanguageDropdown({ value, onChange }: { value: Language; onChange: (language: Language) => void }) {
  const options: { code: Language; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'es', label: 'ES' }
  ];

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentOption = options.find((option) => option.code === value) ?? options[0];

  function handleSelect(language: Language) {
    onChange(language);
    setIsOpen(false);
  }

  return (
    <div ref={dropdownRef} className="lang-toggle" role="group" aria-label="Language selector">
      <button
        type="button"
        className="lang-button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="lang-button-label">{currentOption.label}</span>
        <span className="lang-caret" aria-hidden>
          ▾
        </span>
      </button>

      <div className="lang-menu" role="listbox" hidden={!isOpen}>
        {options.map((option) => (
          <button
            key={option.code}
            type="button"
            role="option"
            aria-selected={value === option.code}
            className={value === option.code ? 'active' : ''}
            onClick={() => handleSelect(option.code)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const { userId } = useAuth();
  const isSignedIn = Boolean(userId);
  const [language, setLanguage] = useState<Language>('es');
  const copy = content[language];
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  const testimonialCount = copy.testimonials.items.length;

  usePageMeta({
    title: 'Innerbloom',
    description: 'Obsérvate por primera vez en tercera persona y toma el control de tus acciones y hábitos.',
    image: 'https://innerbloomjourney.org/og/neneOGP.png',
    imageAlt: 'Innerbloom',
    ogImageSecureUrl: 'https://innerbloomjourney.org/og/neneOGP.png',
    ogImageType: 'image/png',
    ogImageWidth: '1200',
    ogImageHeight: '630',
    twitterImage: 'https://innerbloomjourney.org/og/neneOGP.png',
    url: 'https://innerbloomjourney.org/'
  });

  useEffect(() => {
    if (paused || testimonialCount <= 1) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % testimonialCount);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [paused, testimonialCount]);

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('.reveal-on-scroll')
    );

    if (!elements.length) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      elements.forEach((element) => {
        element.classList.add('is-visible');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -10%' }
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  const goToSlide = (index: number) => {
    setActiveSlide((index + testimonialCount) % testimonialCount);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      goToSlide(activeSlide - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      goToSlide(activeSlide + 1);
    }
  };

  return (
    <div className="landing">
      <header className="nav">
        <Link
          className="brand"
          to="/"
          aria-label={language === 'es' ? 'Innerbloom — inicio' : 'Innerbloom — home'}
        >
          <span className="brand-text">Innerbloom</span>
          <img
            src="/IB-COLOR-LOGO.png"
            alt="Innerbloom"
            className="logo-mark"
            width={50}
            height={50}
          />
        </Link>
        {copy.navLinks.length > 0 ? (
          <nav className="nav-links">
            {copy.navLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
        <div className="nav-actions">
          <LanguageDropdown value={language} onChange={setLanguage} />
          {isSignedIn ? (
            <Link className={buttonClasses()} to="/dashboard">
              {copy.auth.dashboard}
            </Link>
          ) : (
            <>
              <Link className={`${buttonClasses('ghost')} nav-auth-button`} to="/sign-up">
                {copy.auth.signup}
              </Link>
              <Link className={`${buttonClasses()} nav-auth-button`} to="/login">
                {copy.auth.login}
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero reveal-on-scroll" id="overview">
          <div className="hero-grid">
            <div className="hero-copy">
              <h1>
                {copy.hero.titleLead}{' '}
                <span className="grad">{copy.hero.titleHighlight}</span>
              </h1>
              <p className="sub">
                {copy.hero.subtitle}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 hero-actions">
                {isSignedIn ? (
                  <Link className={buttonClasses()} to="/dashboard">
                    {copy.auth.dashboard}
                  </Link>
                ) : (
                  <>
                    <Link className={`${buttonClasses()} journey-cta`} to="/intro-journey">
                      {copy.auth.startJourney}
                    </Link>
                  </>
                )}
              </div>
              <p className="tiny">{copy.hero.note}</p>
            </div>
            <div className="hero-media">
              <img
                src="https://i.ibb.co/Gv7WTT7h/Whats-App-Image-2025-08-31-at-03-52-15.jpg"
                alt={copy.hero.alt}
                className="hero-img"
                width={1200}
                height={1200}
                loading="eager"
              />
            </div>
          </div>
        </section>

        <section className="why section-pad reveal-on-scroll" id="why">
          <div className="container narrow">
            <h2>{copy.pillars.title}</h2>
            <p className="section-sub">{copy.pillars.intro}</p>
            <div className="cards grid-3">
              {copy.pillars.items.map((pillar, index) => (
                <article
                  className="card fade-item"
                  key={pillar.title}
                  style={{ '--delay': `${index * 90}ms` } as CSSProperties}
                >
                  <h3>
                    {pillar.emoji} {pillar.title}
                  </h3>
                  <p>{pillar.copy}</p>
                </article>
              ))}
            </div>
            <p className="section-sub highlight">{copy.pillars.highlight}</p>
          </div>
        </section>

        <section className="modes section-pad reveal-on-scroll" id="modes">
          <div className="container">
            <h2>{copy.modes.title}</h2>
            <p className="section-sub">{copy.modes.intro}</p>
            <div className="cards grid-2">
              {copy.modes.items.map((mode, index) => (
                <article
                  className={`card mode ${mode.id} fade-item`}
                  key={mode.id}
                  style={{ '--delay': `${index * 90}ms` } as CSSProperties}
                >
                  <div className="mode-title">
                    {mode.title} <span className="dot" aria-hidden="true" />
                  </div>
                  <p className="muted">
                    <strong>{language === 'es' ? 'Estado:' : 'State:'}</strong> {mode.state}
                  </p>
                  <p>
                    <strong>{language === 'es' ? 'Objetivo:' : 'Goal:'}</strong> {mode.goal}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="how section-pad reveal-on-scroll" id="how">
          <div className="container narrow">
            <h2>{copy.how.title}</h2>
            <p className="section-sub">{copy.how.intro}</p>
            <ol className="steps">
              {copy.how.steps.map((step, index) => (
                <li
                  className="fade-item"
                  key={step.title}
                  style={{ '--delay': `${index * 80}ms` } as CSSProperties}
                >
                  <span className="step-badge">{index + 1}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.copy}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <FeatureShowcaseSection language={language} />

        <section className="testimonials section-pad reveal-on-scroll" id="testimonials">
          <div className="container">
            <h2>{copy.testimonials.title}</h2>
            <p className="section-sub">{copy.testimonials.intro}</p>
            <div
              className="slider"
              id="testi-slider"
              aria-roledescription="carousel"
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onMouseEnter={() => setPaused(true)}
              onMouseLeave={() => setPaused(false)}
              onFocus={() => setPaused(true)}
              onBlur={() => setPaused(false)}
            >
              <div className="slider-track" style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
                {copy.testimonials.items.map((testimonial, index) => (
                  <figure
                    className="testi"
                    key={testimonial.author}
                    role="group"
                    id={`slide-${index + 1}`}
                    aria-label={
                      language === 'es'
                        ? `${index + 1} de ${testimonialCount}`
                        : `${index + 1} of ${testimonialCount}`
                    }
                  >
                    <blockquote>{testimonial.quote}</blockquote>
                    <figcaption>{testimonial.author}</figcaption>
                  </figure>
                ))}
              </div>
              <button
                type="button"
                className="slider-btn prev"
                aria-label={copy.testimonials.prev}
                onClick={() => goToSlide(activeSlide - 1)}
              >
                ‹
              </button>
              <button
                type="button"
                className="slider-btn next"
                aria-label={copy.testimonials.next}
                onClick={() => goToSlide(activeSlide + 1)}
              >
                ›
              </button>
              <div className="slider-dots" role="tablist" aria-label={copy.testimonials.groupLabel}>
                {copy.testimonials.items.map((testimonial, index) => (
                  <button
                    key={testimonial.author}
                    className="dot"
                    role="tab"
                    aria-selected={index === activeSlide}
                    aria-controls={`slide-${index + 1}`}
                    onClick={() => goToSlide(index)}
                  >
                    <span className="visually-hidden">{index + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="faq section-pad reveal-on-scroll" id="faq">
          <div className="container narrow">
            <h2>{copy.faq.title}</h2>
            {copy.faq.items.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="next section-pad reveal-on-scroll">
          <div className="container narrow center">
            <h2>{copy.next.title}</h2>
            <p className="section-sub">{copy.next.intro}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {isSignedIn ? (
                <Link className={buttonClasses()} to="/dashboard">
                  {copy.auth.dashboard}
                </Link>
              ) : (
                <>
                  <Link className={`${buttonClasses()} journey-cta`} to="/intro-journey">
                    {copy.auth.startJourney}
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>{copy.footer.copyright}</span>
        <nav className="footer-links">
          {isSignedIn ? (
            <Link to="/dashboard">Dashboard</Link>
          ) : (
            <>
              <Link to="/login">{copy.auth.login}</Link>
              <Link to="/sign-up">{copy.auth.signup}</Link>
            </>
          )}
          <a href="#faq">{copy.footer.faq}</a>
        </nav>
      </footer>
    </div>
  );
}
