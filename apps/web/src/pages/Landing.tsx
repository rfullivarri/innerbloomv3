import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type TouchEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { OFFICIAL_LANDING_CSS_VARIABLES } from '../content/officialDesignTokens';
import { OFFICIAL_LANDING_CONTENT, type Language } from '../content/officialLandingContent';
import PremiumTimeline, { type TimelineStep } from '../components/PremiumTimeline';
import { usePageMeta } from '../lib/seo';
import './Landing.css';

type LandingGradientId = 'curiosity' | 'endless' | 'amethyst' | 'dirty';

type LandingGradientOption = {
  id: LandingGradientId;
  label: { es: string; en: string };
  angle: string;
  a: string;
  b: string;
};

const LANDING_GRADIENTS: LandingGradientOption[] = [
  { id: 'curiosity', label: { es: 'Curiosity Blue', en: 'Curiosity Blue' }, angle: '135deg', a: '#525252', b: '#3D72B4' },
  { id: 'endless', label: { es: 'Endless River', en: 'Endless River' }, angle: '135deg', a: '#43CEA2', b: '#185A9D' },
  { id: 'amethyst', label: { es: 'Amethyst', en: 'Amethyst' }, angle: '135deg', a: '#9D50BB', b: '#6E48AA' },
  { id: 'dirty', label: { es: 'Dirty Fog', en: 'Dirty Fog' }, angle: '135deg', a: '#B993D6', b: '#8CA6DB' },
];

const LANDING_GRADIENT_STORAGE_KEY = 'ib:official-landing-gradient';

type ModeVisual = {
  avatarVideo: string;
  avatarImage: string;
  avatarAlt: string;
  avatarLabel: string;
};

const MODE_VISUALS: Record<Language, Record<'low' | 'chill' | 'flow' | 'evolve', ModeVisual>> = {
  en: {
    low: {
      avatarVideo: '/avatars/low-basic.mp4',
      avatarImage: '/LowMood.jpg',
      avatarAlt: 'Low mode avatar with a resting facial expression.',
      avatarLabel: 'Aligned with your energy'
    },
    chill: {
      avatarVideo: '/avatars/chill-basic.mp4',
      avatarImage: '/Chill-Mood.jpg',
      avatarAlt: 'Chill mode avatar with a calm expression.',
      avatarLabel: 'Aligned with your energy'
    },
    flow: {
      avatarVideo: '/avatars/flow-basic.mp4',
      avatarImage: '/FlowMood.jpg',
      avatarAlt: 'Flow mode avatar in action with a focused expression.',
      avatarLabel: 'Aligned with your energy'
    },
    evolve: {
      avatarVideo: '/avatars/evolve-basic.mp4',
      avatarImage: '/Evolve-Mood.jpg',
      avatarAlt: 'Evolve mode avatar with a determined expression.',
      avatarLabel: 'Aligned with your energy'
    }
  },
  es: {
    low: {
      avatarVideo: '/avatars/low-basic.mp4',
      avatarImage: '/LowMood.jpg',
      avatarAlt: 'Avatar del modo Low con expresión de descanso.',
      avatarLabel: 'Alineado a tu energía'
    },
    chill: {
      avatarVideo: '/avatars/chill-basic.mp4',
      avatarImage: '/Chill-Mood.jpg',
      avatarAlt: 'Avatar del modo Chill con expresión de calma.',
      avatarLabel: 'Alineado a tu energía'
    },
    flow: {
      avatarVideo: '/avatars/flow-basic.mp4',
      avatarImage: '/FlowMood.jpg',
      avatarAlt: 'Avatar del modo Flow en movimiento y enfocado.',
      avatarLabel: 'Alineado a tu energía'
    },
    evolve: {
      avatarVideo: '/avatars/evolve-basic.mp4',
      avatarImage: '/Evolve-Mood.jpg',
      avatarAlt: 'Avatar del modo Evolve con expresión determinada.',
      avatarLabel: 'Alineado a tu energía'
    }
  }
};

const buttonBaseClasses =
  'inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-3 font-display text-sm font-semibold tracking-tight transition duration-150 ease-out active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

const buttonVariants = {
  primary: `${buttonBaseClasses} bg-accent-purple text-white shadow-glow hover:bg-accent-purple/90`,
  ghost: `${buttonBaseClasses} border border-transparent bg-transparent text-text-subtle hover:bg-white/10 hover:text-white`
};

const buttonClasses = (variant: keyof typeof buttonVariants = 'primary') => buttonVariants[variant];

const PILLAR_EXAMPLES_LABEL: Record<Language, string> = {
  es: 'Tareas sugeridas:',
  en: 'Suggested tasks:'
};

const PREMIUM_TIMELINE_COPY: Record<Language, { title: string; closingLine: string; steps: TimelineStep[] }> = {
  es: {
    title: 'Cómo funciona Innerbloom',
    closingLine: 'Innerbloom combina gestión de hábitos con registro emocional para construir constancia con un plan realista.',
    steps: [
      {
        title: 'Comienzas tu camino ✨',
        badge: 'ONBOARDING PERSONALIZADO',
        bullets: [
          'Elegís tu modo de juego y respondés unas preguntas sobre energía, prioridades y tu momento actual (2–3 min).',
          'Innerbloom entiende lo que estás buscando y arma un punto de partida claro para empezar con foco (sin presión).',
        ],
        chips: ['onboarding · energía diaria'],
      },
      {
        title: 'Tu primer plan equilibrado ⚖️',
        badge: 'PLAN EQUILIBRADO',
        bullets: [
          'Recibís un plan ordenado en Cuerpo, Mente y Alma, con microacciones realistas.',
          'Te queda una rutina simple y sostenible para avanzar incluso en días de baja energía.',
        ],
        chips: ['micro hábitos · rutina diaria'],
      },
      {
        title: 'Hazlo a tu medida 🧩',
        badge: 'FLEXIBLE',
        bullets: [
          'Editás, cambiás o descartás tareas; ajustás modo y avatar según cómo estés hoy.',
          'La IA propone y vos decidís: el plan se adapta a tu vida (no al revés).',
        ],
        chips: ['hábitos flexibles · personalización'],
      },
      {
        title: 'Retrospectiva diaria + progreso visible 📅📈',
        badge: 'PROGRESO SEMANAL',
        bullets: [
          'Completás microacciones y registrás tu emoción/estado en minutos (simple y realista).',
          'Ves progreso semana a semana y recibís sugerencias para sostener constancia sin saturarte.',
        ],
        chips: ['seguimiento de hábitos · mood tracking'],
      },
    ],
  },
  en: {
    title: 'How Innerbloom works',
    closingLine: 'Innerbloom combines habit tracking with mood tracking to build consistency through a realistic plan.',
    steps: [
      {
        title: 'You start your journey ✨',
        badge: 'PERSONALIZED ONBOARDING',
        bullets: [
          'You choose your play mode and answer a few questions about energy, priorities, and your current moment (2–3 min).',
          'Innerbloom understands what you are looking for and builds a clear starting point so you can begin with focus (without pressure).',
        ],
        chips: ['onboarding · daily energy'],
      },
      {
        title: 'Your first balanced plan ⚖️',
        badge: 'BALANCED PLAN',
        bullets: [
          'You receive a plan organized across Body, Mind, and Soul, with realistic micro-habits.',
          'You get a simple, sustainable routine to keep moving forward even on low-energy days.',
        ],
        chips: ['micro-habits · daily routine'],
      },
      {
        title: 'Make it your own 🧩',
        badge: 'FLEXIBLE',
        bullets: [
          'You edit, swap, or remove tasks; you adjust your mode and avatar based on how you feel today.',
          'AI suggests and you decide: the plan adapts to your life (not the other way around).',
        ],
        chips: ['flexible habits · personalization'],
      },
      {
        title: 'Daily reflection + visible progress 📅📈',
        badge: 'WEEKLY PROGRESS',
        bullets: [
          'You complete micro-habits and log your emotion/state in minutes (simple and realistic).',
          'You see weekly progress and get suggestions to sustain consistency without overload.',
        ],
        chips: ['habit tracking · mood tracking'],
      },
    ],
  },
};

function splitPillarCopy(copy: string, language: Language) {
  const examplesLabel = PILLAR_EXAMPLES_LABEL[language];
  const [definitionPart, examplesPart] = copy.split(examplesLabel);
  const definition = definitionPart?.trim() ?? copy;
  const examples = (examplesPart ?? '')
    .split('•')
    .map((item) => item.trim())
    .filter(Boolean);

  return { definition, examples };
}

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
  const navigate = useNavigate();
  const isSignedIn = Boolean(userId);
  const [language, setLanguage] = useState<Language>('es');
  const [gradientId, setGradientId] = useState<LandingGradientId>(() => {
    if (typeof window === 'undefined') return 'curiosity';
    const storedGradientId = window.localStorage.getItem(LANDING_GRADIENT_STORAGE_KEY);
    const storedGradient = LANDING_GRADIENTS.find((option) => option.id === storedGradientId);
    return storedGradient?.id ?? 'curiosity';
  });
  const copy = OFFICIAL_LANDING_CONTENT[language];
  const selectedGradient = LANDING_GRADIENTS.find((option) => option.id === gradientId) ?? LANDING_GRADIENTS[0];
  const landingStyle = {
    ...(OFFICIAL_LANDING_CSS_VARIABLES as CSSProperties),
    '--bg-angle': selectedGradient.angle,
    '--bg-a': selectedGradient.a,
    '--bg-b': selectedGradient.b,
  } as CSSProperties;
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeModeIndex, setActiveModeIndex] = useState(0);
  const [isModesInView, setIsModesInView] = useState(false);
  const [hasModeInteracted, setHasModeInteracted] = useState(false);
  const modesSectionRef = useRef<HTMLElement | null>(null);
  const modeThumbTouchStartXRef = useRef<number | null>(null);

  const testimonialCount = copy.testimonials.items.length;
  const modeCount = copy.modes.items.length;
  const activeMode = copy.modes.items[activeModeIndex] ?? copy.modes.items[0];
  const activeVisual = MODE_VISUALS[language][activeMode.id];
  const frequencyByMode: Record<Language, Record<typeof activeMode.id, string>> = {
    es: {
      low: '1×/semana',
      chill: '2×/semana',
      flow: '3×/semana',
      evolve: '4×/semana'
    },
    en: {
      low: '1×/week',
      chill: '2×/week',
      flow: '3×/week',
      evolve: '4×/week'
    }
  };
  const modeFrequency = frequencyByMode[language][activeMode.id];
  const modeStateLabel = language === 'es' ? 'Estado' : 'State';
  const modeObjectiveLabel = language === 'es' ? 'Objetivo' : 'Objective';

  useEffect(() => {
    window.localStorage.setItem(LANDING_GRADIENT_STORAGE_KEY, gradientId);
  }, [gradientId]);

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

  useEffect(() => {
    const sectionElement = modesSectionRef.current;

    if (!sectionElement) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsModesInView(entry.isIntersecting);
      },
      { threshold: 0.35 }
    );

    observer.observe(sectionElement);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || hasModeInteracted || !isModesInView || modeCount <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveModeIndex((current) => (current + 1) % modeCount);
    }, 2500);

    return () => window.clearInterval(timer);
  }, [hasModeInteracted, isModesInView, modeCount]);

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

  const selectMode = (index: number) => {
    setActiveModeIndex((index + modeCount) % modeCount);
  };

  const stopModesAutoplay = () => {
    setHasModeInteracted(true);
  };

  const handleModeSelect = (index: number) => {
    stopModesAutoplay();
    selectMode(index);
  };

  const handleModeThumbKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const { key } = event;

    if (key === 'Enter' || key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      handleModeSelect(index);
      return;
    }

    if (key === 'ArrowUp' || key === 'ArrowLeft') {
      event.preventDefault();
      stopModesAutoplay();
      selectMode(index - 1);
      return;
    }

    if (key === 'ArrowDown' || key === 'ArrowRight') {
      event.preventDefault();
      stopModesAutoplay();
      selectMode(index + 1);
    }
  };

  const handleModeThumbTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    modeThumbTouchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleModeThumbTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startX = modeThumbTouchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX;

    if (startX === null || endX === undefined) {
      modeThumbTouchStartXRef.current = null;
      return;
    }

    if (Math.abs(endX - startX) > 18) {
      stopModesAutoplay();
    }

    modeThumbTouchStartXRef.current = null;
  };

  const handlePricingCta = () => {
    if (isSignedIn) {
      navigate('/pricing');
      return;
    }

    navigate('/sign-up');
  };
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: language,
    mainEntity: copy.faq.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  };


  return (
    <div className="landing" style={landingStyle}>
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
          <label className="gradient-select-wrapper">
            <span className="visually-hidden">{language === 'es' ? 'Seleccionar fondo' : 'Select background'}</span>
            <select
              className="gradient-select"
              value={gradientId}
              onChange={(event) => setGradientId(event.target.value as LandingGradientId)}
              aria-label={language === 'es' ? 'Selector de fondo' : 'Background selector'}
            >
              {LANDING_GRADIENTS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label[language]}
                </option>
              ))}
            </select>
          </label>
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
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
            <h2 className="pillars-title">{copy.pillars.title}</h2>
            <p className="section-sub pillars-intro">{copy.pillars.intro}</p>
            <div className="pillars-constellation" aria-hidden />
            <div className="cards grid-3">
              {copy.pillars.items.map((pillar, index) => {
                const { definition, examples } = splitPillarCopy(pillar.copy, language);
                return (
                  <article
                    className="card pillar-card fade-item"
                    key={pillar.title}
                    style={{ '--delay': `${index * 90}ms` } as CSSProperties}
                  >
                    <h3 className="pillar-heading">
                      <span className="pillar-emoji" aria-hidden>{pillar.emoji}</span>
                      <span>{pillar.title}</span>
                    </h3>
                    <p className="pillar-definition">{definition}</p>
                    {examples.length > 0 ? (
                      <div className="pillar-examples" aria-label={PILLAR_EXAMPLES_LABEL[language]}>
                        <span className="pillar-examples-label">{PILLAR_EXAMPLES_LABEL[language]}</span>
                        <div className="pillar-chips" role="list">
                          {examples.map((example) => (
                            <span key={example} className="pillar-chip" role="listitem">
                              {example}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
            <p className="section-sub highlight">{copy.pillars.highlight}</p>
          </div>
        </section>

        <section ref={modesSectionRef} className="modes section-pad reveal-on-scroll" id="modes">
          <div className="container">
            <h2>{copy.modes.title}</h2>
            <p className="section-sub">{copy.modes.intro}</p>
            <div
              className="modes-carousel"
              aria-live="polite"
              style={{ '--mode-count': copy.modes.items.length } as CSSProperties}
            >
              <div
                className="mode-thumbs"
                role="listbox"
                aria-label={language === 'es' ? 'Elegir modo' : 'Choose mode'}
                onTouchStart={handleModeThumbTouchStart}
                onTouchEnd={handleModeThumbTouchEnd}
              >
                {copy.modes.items.map((mode, index) => {
                  const visual = MODE_VISUALS[language][mode.id];
                  const isActive = index === activeModeIndex;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      role="option"
                      aria-label={mode.title}
                      aria-selected={isActive}
                      className={`mode-thumb ${isActive ? 'is-active' : ''}`}
                      onClick={() => handleModeSelect(index)}
                      onKeyDown={(event) => handleModeThumbKeyDown(event, index)}
                    >
                      <img src={visual.avatarImage} alt="" aria-hidden />
                    </button>
                  );
                })}
              </div>

              <article className={`card mode mode-main mode-${activeMode.id} fade-item`}>
                <header className="mode-header">
                  <div className="mode-title">{activeMode.title}</div>
                  <div className="mode-meta">
                    <p className="mode-meta-item">
                      <span className="mode-meta-label">{modeStateLabel}</span>
                      <span className="mode-meta-copy">{activeMode.state}</span>
                    </p>
                    <span className="mode-frequency-chip">{modeFrequency}</span>
                  </div>
                </header>
                <figure className="mode-media">
                  <video
                    className="mode-video"
                    src={activeVisual.avatarVideo}
                    poster={activeVisual.avatarImage}
                    autoPlay
                    muted
                    loop
                    playsInline
                    aria-label={activeVisual.avatarAlt}
                  />
                  <figcaption className="mode-media-caption">{activeVisual.avatarLabel}</figcaption>
                </figure>
                <div className="mode-goal-block">
                  <p className="mode-goal-label">{modeObjectiveLabel}</p>
                  <p className="mode-goal-copy">{activeMode.goal}</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="how section-pad reveal-on-scroll" id="how">
          <div className="container narrow">
            <h2>{PREMIUM_TIMELINE_COPY[language].title}</h2>
            <PremiumTimeline
              steps={PREMIUM_TIMELINE_COPY[language].steps}
              closingLine={PREMIUM_TIMELINE_COPY[language].closingLine}
              className="mt-2"
            />
          </div>
        </section>

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

        <section className="pricing section-pad reveal-on-scroll" id="pricing">
          <div className="container">
            <h2>{copy.pricing.title}</h2>
            <p className="section-sub">{copy.pricing.intro}</p>
            <p className="pricing-tax-note">{copy.pricing.taxNote}</p>
            <div className="pricing-grid">
              {copy.pricing.plans.map((plan, index) => (
                <article
                  className="card pricing-card fade-item"
                  key={plan.id}
                  style={{ '--delay': `${index * 90}ms` } as CSSProperties}
                >
                  {plan.id === 'YEAR' ? <span className="pricing-best-deal-chip">best deal</span> : null}
                  <p className="pricing-plan-name">{plan.name}</p>
                  <p className="pricing-plan-price">{plan.price}</p>
                  <p className="pricing-plan-detail">{plan.detail}</p>
                  {isSignedIn ? (
                    <button type="button" className={`${buttonClasses()} pricing-plan-action`} onClick={handlePricingCta}>
                      {copy.pricing.actionLabel}
                    </button>
                  ) : (
                    <Link className={`${buttonClasses()} pricing-plan-action`} to="/sign-up">
                      {copy.pricing.actionLabel}
                    </Link>
                  )}
                </article>
              ))}
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
