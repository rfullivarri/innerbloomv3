import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { FeatureShowcaseSection } from '../components/landing/FeatureShowcaseSection';
import { OFFICIAL_LANDING_CSS_VARIABLES } from '../content/officialDesignTokens';
import { OFFICIAL_LANDING_CONTENT, type Language } from '../content/officialLandingContent';
import { usePageMeta } from '../lib/seo';
import './Landing.css';

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

const PILLAR_EXAMPLES_LABEL = 'Ejemplos:';

function splitPillarCopy(copy: string) {
  const [definitionPart, examplesPart] = copy.split(PILLAR_EXAMPLES_LABEL);
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
  const isSignedIn = Boolean(userId);
  const [language, setLanguage] = useState<Language>('es');
  const copy = OFFICIAL_LANDING_CONTENT[language];
  const landingStyle = OFFICIAL_LANDING_CSS_VARIABLES as CSSProperties;
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeModeIndex, setActiveModeIndex] = useState(0);

  const testimonialCount = copy.testimonials.items.length;
  const modeCount = copy.modes.items.length;
  const activeMode = copy.modes.items[activeModeIndex] ?? copy.modes.items[0];
  const prevModeIndex = (activeModeIndex - 1 + modeCount) % modeCount;
  const nextModeIndex = (activeModeIndex + 1) % modeCount;
  const activeVisual = MODE_VISUALS[language][activeMode.id];

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

  const selectMode = (index: number) => {
    setActiveModeIndex((index + modeCount) % modeCount);
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
              {copy.pillars.items.map((pillar, index) => {
                const { definition, examples } = splitPillarCopy(pillar.copy);
                return (
                  <article
                    className="card pillar-card fade-item"
                    key={pillar.title}
                    style={{ '--delay': `${index * 90}ms` } as CSSProperties}
                  >
                    <h3>
                      {pillar.emoji} {pillar.title}
                    </h3>
                    <p className="pillar-definition">{definition}</p>
                    {examples.length > 0 ? (
                      <div className="pillar-examples" aria-label="Ejemplos">
                        <span className="pillar-examples-label">{PILLAR_EXAMPLES_LABEL}</span>
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

        <section className="modes section-pad reveal-on-scroll" id="modes">
          <div className="container">
            <h2>{copy.modes.title}</h2>
            <p className="section-sub">{copy.modes.intro}</p>
            <div className="modes-carousel" aria-live="polite">
              <button type="button" className="mode-mini mode-mini-left" onClick={() => selectMode(prevModeIndex)}>
                <img src={MODE_VISUALS[language][copy.modes.items[prevModeIndex].id].avatarImage} alt="" aria-hidden />
                <span>{copy.modes.items[prevModeIndex].title}</span>
              </button>

              <article className={`card mode mode-main mode-${activeMode.id} fade-item`}>
                <header className="mode-header">
                  <div className="mode-title">{activeMode.title}</div>
                  <p className="muted">
                    <strong>{language === 'es' ? 'Estado:' : 'State:'}</strong> {activeMode.state}
                  </p>
                  <p>
                    <strong>{language === 'es' ? 'Objetivo:' : 'Goal:'}</strong> {activeMode.goal}
                  </p>
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
              </article>

              <button type="button" className="mode-mini mode-mini-right" onClick={() => selectMode(nextModeIndex)}>
                <img src={MODE_VISUALS[language][copy.modes.items[nextModeIndex].id].avatarImage} alt="" aria-hidden />
                <span>{copy.modes.items[nextModeIndex].title}</span>
              </button>
            </div>

            <div className="mode-thumbs" role="tablist" aria-label={language === 'es' ? 'Elegir modo' : 'Choose mode'}>
              {copy.modes.items.map((mode, index) => (
                <button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeModeIndex}
                  className={`mode-thumb ${index === activeModeIndex ? 'is-active' : ''}`}
                  onClick={() => selectMode(index)}
                >
                  {mode.title}
                </button>
              ))}
            </div>

            <div className="modes-dots" role="tablist" aria-label={language === 'es' ? 'Modo activo' : 'Active mode'}>
              {copy.modes.items.map((mode, index) => (
                <button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeModeIndex}
                  aria-label={`${mode.title} (${index + 1}/${modeCount})`}
                  className={`modes-dot ${index === activeModeIndex ? 'is-active' : ''}`}
                  onClick={() => selectMode(index)}
                />
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
