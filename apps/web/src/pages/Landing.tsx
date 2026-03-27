import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type TouchEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { OFFICIAL_DESIGN_TOKENS, OFFICIAL_LANDING_CSS_VARIABLES } from '../content/officialDesignTokens';
import { OFFICIAL_LANDING_CONTENT, type Language } from '../content/officialLandingContent';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import { buildDemoModeSelectUrl } from '../lib/demoEntry';
import PremiumTimeline, { type TimelineStep } from '../components/PremiumTimeline';
import { AdaptiveText } from '../components/landing/AdaptiveText';
import { CookieConsentBanner } from '../components/landing/CookieConsentBanner';
import { useLandingAnalytics } from '../components/landing/useLandingAnalytics';
import { buildOnboardingPath } from '../onboarding/i18n';
import { usePostLoginLanguage } from '../i18n/postLoginLanguage';
import { persistCookieConsentState, readCookieConsentState } from '../lib/cookieConsent';
import './Landing.css';

type LandingGradientOption = {
  id: string;
  label: { es: string; en: string };
  angle: string;
  a: string;
  b: string;
};

const GRADIENT_LABELS: Record<string, { es: string; en: string }> = {
  curiosity_blue: { es: 'Curiosity Blue', en: 'Curiosity Blue' },
  endless_river: { es: 'Endless River', en: 'Endless River' },
  amethyst: { es: 'Amethyst', en: 'Amethyst' },
  dirty_fog: { es: 'Dirty Fog', en: 'Dirty Fog' },
  purple_paradise: { es: 'Purple Paradise', en: 'Purple Paradise' },
  color_1: { es: 'Color 1', en: 'Color 1' },
  color_2: { es: 'Color 2', en: 'Color 2' },
  purple_love: { es: 'Purple Love', en: 'Purple Love' },
  afternoon: { es: 'Afternoon', en: 'Afternoon' },
  purple_afternoon: { es: 'Purple Afternoon', en: 'Purple Afternoon' },
};

const LANDING_GRADIENTS: LandingGradientOption[] = OFFICIAL_DESIGN_TOKENS.gradients
  .filter((gradient) => gradient.type === 'linear' && gradient.stops.length >= 2)
  .map((gradient) => {
    const label = GRADIENT_LABELS[gradient.name]
      ?? { es: gradient.name.replace(/_/g, ' '), en: gradient.name.replace(/_/g, ' ') };

    return {
      id: gradient.name,
      label,
      angle: gradient.angle,
      a: gradient.stops[0],
      b: gradient.stops[1],
    };
  });

const LANDING_GRADIENT_STORAGE_KEY = 'ib:official-landing-gradient';
const OFFICIAL_DEFAULT_GRADIENT_ID = 'purple_afternoon';
const SHOW_GRADIENT_SELECTOR = false;

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
  primary: 'ib-primary-button',
  ghost: `${buttonBaseClasses} border border-transparent bg-transparent text-text-subtle hover:bg-white/10 hover:text-white`
};

const buttonClasses = (variant: keyof typeof buttonVariants = 'primary') => buttonVariants[variant];

const PILLAR_EXAMPLES_LABEL: Record<Language, string> = {
  es: 'Tareas sugeridas:',
  en: 'Suggested tasks:'
};

const PREMIUM_TIMELINE_COPY: Record<Language, { title: string; closingLine: string; steps: TimelineStep[] }> = {
  es: {
    title: 'Start, Grow and Bloom',
    closingLine: 'Empiezas realista, avanzas por semanas, calibras por mes y conviertes progreso en hábitos duraderos.',
    steps: [
      {
        title: 'Empieza pequeño, no perfecto ✨',
        badge: 'ONBOARDING PERSONALIZADO',
        bullets: [
          'Empieza desde tu capacidad actual con una base simple y sostenible.',
          'Sostener importa más que empezar fuerte.',
        ],
        chips: ['ONBOARDING · BASE REALISTA'],
      },
      {
        title: 'Crece en ciclos reales ⚖️',
        badge: 'RITMO SEMANAL',
        bullets: [
          'Mira tus semanas, no un solo día.',
          'Registra tu estado emocional y detecta patrones.',
        ],
        chips: ['RITMO SEMANAL · PATRONES EMOCIONALES'],
      },
      {
        title: 'Calibra con perspectiva 📅',
        badge: 'CALIBRACIÓN MENSUAL',
        bullets: [
          'Revisa tu progreso por ciclos mensuales.',
          'Ajusta el ritmo sin romper la constancia.',
        ],
        chips: ['REVISIÓN MENSUAL · AJUSTE SOSTENIBLE'],
      },
      {
        title: 'Haz visible tu progreso 🌱',
        badge: 'HISTORIAL DE CRECIMIENTO',
        bullets: [
          'Haz visible tu evolución en constancia, emoción y balance.',
          'Así entiendes mejor lo que sí te funciona.',
        ],
        chips: ['PROGRESO VISIBLE · CLARIDAD DE PATRONES'],
      },
      {
        title: 'Florece en hábitos duraderos 🌸',
        badge: 'HÁBITOS DURADEROS',
        bullets: [
          'Con el tiempo, los hábitos estables pasan a formar parte de tu base.',
          'Ahí el progreso deja de sentirse temporal.',
        ],
        chips: ['HÁBITO CONSOLIDADO · BASE ESTABLE'],
      },
    ],
  },
  en: {
    title: 'Start, Grow and Bloom',
    closingLine: 'Start realistic, move weekly, calibrate monthly, and turn progress into lasting habits.',
    steps: [
      {
        title: 'Start small, not perfect ✨',
        badge: 'PERSONALIZED ONBOARDING',
        bullets: [
          'Start from your current capacity with a simple, sustainable base.',
          'Consistency matters more than a strong start.',
        ],
        chips: ['ONBOARDING · REALISTIC BASE'],
      },
      {
        title: 'Grow through real cycles ⚖️',
        badge: 'WEEKLY RHYTHM',
        bullets: [
          'Track your weeks, not one single day.',
          'Log your emotional state and spot patterns.',
        ],
        chips: ['WEEKLY RHYTHM · EMOTIONAL PATTERNS'],
      },
      {
        title: 'Calibrate with perspective 📅',
        badge: 'MONTHLY CALIBRATION',
        bullets: [
          'Review progress in monthly cycles.',
          'Adjust pace without breaking consistency.',
        ],
        chips: ['MONTHLY REVIEW · SUSTAINABLE ADJUSTMENT'],
      },
      {
        title: 'Make progress visible 🌱',
        badge: 'GROWTH HISTORY',
        bullets: [
          'Make your progress visible across consistency, emotion, and balance.',
          'That clarity shows what truly works for you.',
        ],
        chips: ['VISIBLE PROGRESS · PATTERN CLARITY'],
      },
      {
        title: 'Bloom into lasting habits 🌸',
        badge: 'LASTING HABITS',
        bullets: [
          'Over time, stable habits become part of your foundation.',
          'That is when progress stops feeling temporary.',
        ],
        chips: ['HABIT BLOOMED · STABLE BASE'],
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

const EMOTION_HEATMAP_ROWS: Array<Array<'calm' | 'happy' | 'focus' | 'stress' | 'neutral'>> = [
  ['calm', 'happy', 'calm', 'happy', 'neutral', 'calm', 'focus', 'calm', 'happy', 'calm', 'neutral', 'focus', 'calm', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral'],
  ['calm', 'focus', 'calm', 'neutral', 'happy', 'neutral', 'calm', 'focus', 'calm', 'happy', 'focus', 'stress', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral'],
  ['calm', 'focus', 'neutral', 'happy', 'happy', 'neutral', 'focus', 'calm', 'focus', 'calm', 'focus', 'stress', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral'],
  ['calm', 'focus', 'neutral', 'focus', 'neutral', 'neutral', 'focus', 'focus', 'focus', 'focus', 'calm', 'stress', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral'],
  ['focus', 'neutral', 'neutral', 'neutral', 'calm', 'happy', 'focus', 'neutral', 'focus', 'focus', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral'],
  ['focus', 'calm', 'neutral', 'calm', 'focus', 'neutral', 'focus', 'happy', 'focus', 'calm', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral'],
  ['calm', 'calm', 'neutral', 'neutral', 'focus', 'focus', 'happy', 'focus', 'calm', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral', 'neutral'],
];

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
  const { setManualLanguage, syncLocaleLanguage } = usePostLoginLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isSignedIn = Boolean(userId);
  const [language, setLanguage] = useState<Language>(() =>
    typeof window !== 'undefined' ? resolveAuthLanguage(window.location.search) : 'es'
  );
  const [gradientId, setGradientId] = useState<string>(() => {
    const fallbackGradientId = LANDING_GRADIENTS[0]?.id ?? '';
    const officialGradient = LANDING_GRADIENTS.find((option) => option.id === OFFICIAL_DEFAULT_GRADIENT_ID);
    const officialGradientId = officialGradient?.id ?? fallbackGradientId;

    if (typeof window === 'undefined') return officialGradientId;

    if (!SHOW_GRADIENT_SELECTOR) {
      return officialGradientId;
    }

    const storedGradientId = window.localStorage.getItem(LANDING_GRADIENT_STORAGE_KEY);
    const storedGradient = LANDING_GRADIENTS.find((option) => option.id === storedGradientId);
    return storedGradient?.id ?? officialGradientId;
  });
  const copy = OFFICIAL_LANDING_CONTENT[language];
  const visibleNavLinks = copy.navLinks.filter((link) => !/^\/demo$/i.test(link.href) && !/^#?demo$/i.test(link.href));
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
  const initialCookieConsentStateRef = useRef(readCookieConsentState());
  const [analyticsConsent, setAnalyticsConsent] = useState(() => initialCookieConsentStateRef.current.analytics);
  const [isCookiePanelOpen, setIsCookiePanelOpen] = useState(
    () => initialCookieConsentStateRef.current.analytics === 'unset'
  );
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
    console.info('[landing][ga4-debug] cookie consent read on load', initialCookieConsentStateRef.current);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LANDING_GRADIENT_STORAGE_KEY, gradientId);
  }, [gradientId]);

  useEffect(() => {
    const resolvedLanguage = resolveAuthLanguage(location.search);
    setLanguage(resolvedLanguage);
    syncLocaleLanguage(resolvedLanguage);
  }, [location.search, syncLocaleLanguage]);

  useLandingAnalytics({
    consent: analyticsConsent,
    pathname: location.pathname,
  });

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setManualLanguage(nextLanguage);
  };

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

  const handleAnalyticsConsent = (nextDecision: 'accepted' | 'rejected') => {
    const nextState = persistCookieConsentState(nextDecision);
    console.info('[landing][ga4-debug] cookie consent updated', {
      nextDecision,
      persistedState: nextState,
    });
    setAnalyticsConsent(nextState.analytics);
    setIsCookiePanelOpen(false);
  };


  return (
    <div className="landing" style={landingStyle}>
      <header className="nav">
        <Link
          className="brand"
          to={buildLocalizedAuthPath('/', language)}
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
        {visibleNavLinks.length > 0 ? (
          <nav className="nav-links">
            {visibleNavLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        ) : null}
        <div className="nav-actions">
          {SHOW_GRADIENT_SELECTOR ? (
            <label className="gradient-select-wrapper">
              <span className="visually-hidden">{language === 'es' ? 'Seleccionar fondo' : 'Select background'}</span>
              <select
                className="gradient-select"
                value={gradientId}
                onChange={(event) => setGradientId(event.target.value)}
                aria-label={language === 'es' ? 'Selector de fondo' : 'Background selector'}
              >
                {LANDING_GRADIENTS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label[language]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <LanguageDropdown value={language} onChange={handleLanguageChange} />
          {isSignedIn ? (
            <Link className={buttonClasses()} to="/dashboard">
              {copy.auth.dashboard}
            </Link>
          ) : (
            <>
              <Link
                className={`${buttonClasses('ghost')} nav-auth-button`}
                data-analytics-cta="create_account"
                data-analytics-location="nav"
                to={buildLocalizedAuthPath('/sign-up', language)}
              >
                {copy.auth.signup}
              </Link>
              <Link
                className={`${buttonClasses()} nav-auth-button`}
                data-analytics-cta="login"
                data-analytics-location="nav"
                to={buildLocalizedAuthPath('/login', language)}
              >
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
                    <Link
                      className={`${buttonClasses()} journey-cta`}
                      data-analytics-cta="start_journey"
                      data-analytics-location="hero"
                      to={buildOnboardingPath(language)}
                    >
                      {copy.auth.startJourney}
                    </Link>
                    <Link
                      className="hero-demo-cta"
                      data-analytics-cta="guided_demo"
                      data-analytics-location="hero"
                      to={buildDemoModeSelectUrl({ language, source: 'landing' })}
                    >
                      <span className="hero-demo-cta-icon" aria-hidden>
                        ▶
                      </span>
                      <span>{copy.auth.guidedDemo}</span>
                    </Link>
                  </>
                )}
              </div>
              <p className="tiny hero-cta-note">{copy.hero.note}</p>
            </div>
            <div className="hero-media">
              <img
                src="/nene.png"
                alt={copy.hero.alt}
                className="hero-img"
                width={1200}
                height={1200}
                loading="eager"
              />
            </div>
          </div>
        </section>

        <section className="truth-problem section-pad reveal-on-scroll" id="why">
          <div className="container narrow truth-problem-section">
            <p className="truth-problem-kicker">
              {language === 'es' ? 'EL PROBLEMA REAL' : 'THE REAL PROBLEM'}
            </p>

            <div className="truth-problem-shell">
              <AdaptiveText as="h2" className="truth-problem-title">{copy.problem.title}</AdaptiveText>
              <AdaptiveText as="p" className="section-sub truth-problem-body">{copy.problem.body}</AdaptiveText>
            </div>
          </div>
        </section>

        <section className="how section-pad reveal-on-scroll" id="how">
          <div className="container narrow">
            <div className="how-heading">
              <p className="how-kicker">{copy.how.kicker}</p>
              <AdaptiveText as="h2">{copy.how.title}</AdaptiveText>
              <AdaptiveText as="p" className="section-sub how-intro">{copy.how.intro}</AdaptiveText>
            </div>
            <PremiumTimeline
              steps={PREMIUM_TIMELINE_COPY[language].steps}
              closingLine={PREMIUM_TIMELINE_COPY[language].closingLine}
              className="mt-2"
            />
          </div>
        </section>

        <section className="feature-showcase section-pad reveal-on-scroll" id="demo">
          <div className="container narrow">
            <div className="visible-progress-top">
              <div className="visible-progress-copy">
                <AdaptiveText as="h2" className="demo-title">{copy.demo.title}</AdaptiveText>
                <AdaptiveText as="p" className="demo-sub">{copy.demo.text}</AdaptiveText>
              </div>

              <div className="visible-progress-module" aria-hidden>
                <div className="visible-progress-viewport">
                  <div className="visible-progress-scene">
                    <div className="visible-scene-region visible-scene-region--balance">
                      <div className="visible-canvas-header">
                        <p className="visible-canvas-title">BALANCE</p>
                        <span className="visible-canvas-chip">Predominio Body</span>
                        <span className="visible-canvas-info">i</span>
                      </div>
                      <div className="visible-balance-radar-wrap">
                        <svg className="visible-balance-radar" viewBox="0 0 420 420" aria-hidden>
                          <circle className="visible-balance-radar-glow" cx="210" cy="210" r="182" />
                          <circle className="visible-balance-radar-ring visible-balance-radar-ring--outer" cx="210" cy="210" r="170" />
                          <circle className="visible-balance-radar-ring" cx="210" cy="210" r="130" />
                          <circle className="visible-balance-radar-ring" cx="210" cy="210" r="90" />
                          <circle className="visible-balance-radar-ring" cx="210" cy="210" r="50" />
                          <line className="visible-balance-radar-axis" x1="210" y1="36" x2="210" y2="384" />
                          <line className="visible-balance-radar-axis" x1="48" y1="114" x2="372" y2="306" />
                          <line className="visible-balance-radar-axis" x1="48" y1="306" x2="372" y2="114" />
                          <polygon className="visible-balance-radar-shape visible-balance-radar-shape--outer" points="210,94 258,138 300,178 294,224 252,256 270,316 220,350 170,260 128,282 88,238 96,182 146,152" />
                          <polygon className="visible-balance-radar-shape visible-balance-radar-shape--inner" points="210,140 246,168 268,202 250,232 222,248 228,282 206,302 182,250 154,258 130,226 136,194 172,170" />
                          <circle className="visible-balance-radar-core" cx="210" cy="210" r="10" />
                        </svg>
                        <span className="visible-radar-value visible-radar-value--one">777</span>
                        <span className="visible-radar-value visible-radar-value--two">483</span>
                        <span className="visible-radar-value visible-radar-value--three">517</span>
                        <span className="visible-radar-value visible-radar-value--four">251</span>
                      </div>
                      <div className="visible-radar-pillars">
                        <span>ALMA 32%</span>
                        <span>CUERPO 45%</span>
                        <span>MENTE 23%</span>
                      </div>
                    </div>

                    <div className="visible-scene-region visible-scene-region--emotion">
                      <div className="visible-canvas-header visible-canvas-header--emotion">
                        <p className="visible-canvas-title">EMOTION CHART</p>
                        <span className="visible-canvas-info">i</span>
                      </div>
                      <div className="visible-emotion-legend">
                        <span>Calma</span>
                        <span className="visible-emotion-pill">Felicidad</span>
                        <span>Foco</span>
                      </div>
                      <div className="visible-emotion-grid-months">
                        <span>FEB</span>
                        <span>MAR</span>
                        <span>ABR</span>
                        <span>MAY</span>
                      </div>
                      <div className="visible-emotion-grid">
                        {EMOTION_HEATMAP_ROWS.map((row, rowIndex) => (
                          <div className="visible-emotion-grid-row" key={`emotion-row-${rowIndex}`}>
                            {row.map((emotion, cellIndex) => (
                              <span
                                key={`emotion-cell-${rowIndex}-${cellIndex}`}
                                className={`visible-emotion-cell visible-emotion-cell--${emotion}`}
                                style={{ '--emotion-order': rowIndex * 19 + cellIndex } as CSSProperties}
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="visible-scene-region visible-scene-region--streaks">
                      <div className="visible-canvas-header visible-canvas-header--streaks">
                        <p className="visible-canvas-title">STREAKS</p>
                        <span className="visible-canvas-info">i</span>
                        <span className="visible-canvas-chip visible-canvas-chip--flow">FLOW · 3M</span>
                      </div>
                      <div className="visible-streak-pillars" role="tablist" aria-label="Pilares">
                        <span className="is-active">🫀 BODY</span>
                        <span>🧠 MIND</span>
                        <span>🏵️ SOUL</span>
                      </div>
                      <p className="visible-streak-heading">Top streaks</p>
                      <div className="visible-streak-row">
                        <div className="visible-streak-row-head">
                          <p>Minoxidil noche</p>
                          <span>5/3</span>
                        </div>
                        <p className="visible-streak-row-meta">Recuperación</p>
                        <div className="visible-streak-bar">
                          <span className="visible-streak-fill visible-streak-fill--first" />
                        </div>
                      </div>
                      <div className="visible-streak-row">
                        <div className="visible-streak-row-head">
                          <p>Ayuno hasta las 14hs</p>
                          <span>5/3</span>
                        </div>
                        <p className="visible-streak-row-meta">Nutrición</p>
                        <div className="visible-streak-bar">
                          <span className="visible-streak-fill visible-streak-fill--second" />
                        </div>
                      </div>
                      <div className="visible-streak-row">
                        <div className="visible-streak-row-head">
                          <p>Dormir 8hs</p>
                          <span>4/3</span>
                        </div>
                        <p className="visible-streak-row-meta">Sueño</p>
                        <div className="visible-streak-bar">
                          <span className="visible-streak-fill visible-streak-fill--third" />
                        </div>
                      </div>
                      <div className="visible-streak-periods">
                        <span>SEM</span>
                        <span className="is-active">MES</span>
                        <span>3M</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="demo-bridge">
              <p className="demo-bridge-copy">{copy.demo.banner}</p>
              <div className="demo-actions">
                <Link
                  className={buttonClasses()}
                  data-analytics-cta="guided_demo"
                  data-analytics-location="feature"
                  to={buildDemoModeSelectUrl({ language, source: 'landing' })}
                >
                  {copy.demo.cta}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="why section-pad reveal-on-scroll" id="pillars">
          <div className="container narrow">
            <AdaptiveText as="h2" className="pillars-title">{copy.pillars.title}</AdaptiveText>
            <AdaptiveText as="p" className="section-sub pillars-intro">{copy.pillars.intro}</AdaptiveText>
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
            <AdaptiveText as="p" className="section-sub highlight">{copy.pillars.highlight}</AdaptiveText>
          </div>
        </section>

        <section ref={modesSectionRef} className="modes section-pad reveal-on-scroll" id="modes">
          <div className="container">
            <AdaptiveText as="h2">{copy.modes.title}</AdaptiveText>
            <AdaptiveText as="p" className="section-sub">{copy.modes.intro}</AdaptiveText>
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

        <section className="testimonials section-pad reveal-on-scroll" id="testimonials">
          <div className="container">
            <AdaptiveText as="h2">{copy.testimonials.title}</AdaptiveText>
            <AdaptiveText as="p" className="section-sub">{copy.testimonials.intro}</AdaptiveText>
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
            <AdaptiveText as="h2">{copy.faq.title}</AdaptiveText>
            {copy.faq.items.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="pricing section-pad reveal-on-scroll" id="pricing">
          <div className="container">
            <AdaptiveText as="h2">{copy.pricing.title}</AdaptiveText>
            <AdaptiveText as="p" className="section-sub">{copy.pricing.intro}</AdaptiveText>
            <p className="pricing-trial-highlight">{copy.pricing.trialHighlight}</p>
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
                  <p className="pricing-plan-detail">{plan.detail}</p>
                  <p className="pricing-plan-price">{plan.price}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="next section-pad reveal-on-scroll">
          <div className="container narrow center">
            <AdaptiveText as="h2">{copy.next.title}</AdaptiveText>
            <AdaptiveText as="p" className="section-sub">{copy.next.intro}</AdaptiveText>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {isSignedIn ? (
                <Link className={buttonClasses()} to="/dashboard">
                  {copy.auth.dashboard}
                </Link>
              ) : (
                <>
                  <Link
                    className={`${buttonClasses()} journey-cta`}
                    data-analytics-cta="start_journey"
                    data-analytics-location="footer"
                    to={buildOnboardingPath(language)}
                  >
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
              <Link data-analytics-cta="login" data-analytics-location="footer" to={buildLocalizedAuthPath('/login', language)}>
                {copy.auth.login}
              </Link>
              <Link data-analytics-cta="create_account" data-analytics-location="footer" to={buildLocalizedAuthPath('/sign-up', language)}>
                {copy.auth.signup}
              </Link>
            </>
          )}
          <a href="#faq">{copy.footer.faq}</a>
          <button
            type="button"
            className="footer-cookies-link"
            onClick={() => setIsCookiePanelOpen(true)}
          >
            {language === 'es' ? 'Cookies' : 'Cookies'}
          </button>
          <a
            className="footer-community-link"
            data-analytics-cta="join_subreddit"
            data-analytics-location="footer"
            href="https://www.reddit.com/r/InnerbloomJourney/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M20.6 13.4a2.4 2.4 0 0 0-3.95-2.66 9.2 9.2 0 0 0-4.2-1.1l.72-3.38 2.36.5a1.8 1.8 0 1 0 .3-1.1l-3.06-.66a.56.56 0 0 0-.66.43l-.86 4.02a9.33 9.33 0 0 0-4.45 1.13 2.4 2.4 0 1 0-1.32 4.4q-.03.3-.03.63c0 3.04 3.05 5.5 6.81 5.5s6.8-2.46 6.8-5.5q0-.3-.03-.58a2.4 2.4 0 0 0 1.57-2.23Zm-11.82 1.2a1.13 1.13 0 1 1 0-2.26 1.13 1.13 0 0 1 0 2.26Zm6.46 3.1c-.8.78-2.34 1.04-3.23 1.04s-2.43-.26-3.23-1.04a.56.56 0 1 1 .78-.8c.47.46 1.56.72 2.45.72s1.98-.26 2.45-.72a.56.56 0 1 1 .78.8Zm-.03-3.1a1.13 1.13 0 1 1 0-2.26 1.13 1.13 0 0 1 0 2.26Z"
                fill="currentColor"
              />
            </svg>
            <span>Join our subreddit</span>
          </a>
        </nav>
      </footer>
      <CookieConsentBanner
        language={language}
        isOpen={isCookiePanelOpen}
        hasDecision={analyticsConsent !== 'unset'}
        onAccept={() => handleAnalyticsConsent('accepted')}
        onReject={() => handleAnalyticsConsent('rejected')}
        onClose={() => setIsCookiePanelOpen(false)}
      />
    </div>
  );
}
