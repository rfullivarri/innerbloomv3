import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type TouchEvent,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import {
  OFFICIAL_LANDING_CSS_VARIABLES,
} from "../content/officialDesignTokens";
import {
  OFFICIAL_LANDING_CONTENT,
  type LandingCopy,
  type Language,
} from "../content/officialLandingContent";
import {
  buildLocalizedAuthPath,
  resolveAuthLanguage,
} from "../lib/authLanguage";
import { buildDemoModeSelectUrl } from "../lib/demoEntry";
import PremiumTimeline from "../components/PremiumTimeline";
import { AdaptiveText } from "../components/landing/AdaptiveText";
import { CookieConsentBanner } from "../components/landing/CookieConsentBanner";
import { useLandingAnalytics } from "../components/landing/useLandingAnalytics";
import { HeroPhoneShowcase } from "../components/landing/HeroPhoneShowcase";
import WeatherCycleOrb from "../components/landing/WeatherCycleOrb";
import { LabsWeeklyRhythmSystemSection } from "../components/labs/LabsWeeklyRhythmSystemSection";
import { buildOnboardingPath } from "../onboarding/i18n";
import { usePostLoginLanguage } from "../i18n/postLoginLanguage";
import {
  persistCookieConsentState,
  readCookieConsentState,
} from "../lib/cookieConsent";
import {
  SHOW_LANDING_PRICING,
} from "../config/releaseFlags";
import {
  type LandingThemeMode,
  getLandingThemeStyle,
  readLandingThemeMode,
} from "../lib/landingTheme";
import { useThemePreference } from "../theme/ThemePreferenceProvider";
import "./Landing.css";
import "./LandingThemeContrastPatch.css";

type ModeVisual = {
  avatarVideo: string;
  avatarImage: string;
  thumbImage: string;
  avatarAlt: string;
  avatarLabel: string;
};

const MODE_VISUALS: Record<
  Language,
  Record<"low" | "chill" | "flow" | "evolve", ModeVisual>
> = {
  en: {
    low: {
      avatarVideo: "/avatars/low-basic.mp4",
      avatarImage: "/LowMood.jpg",
      thumbImage: "/LowVertical.png",
      avatarAlt: "Red Cat avatar in Innerbloom.",
      avatarLabel: "Aligned with your energy",
    },
    chill: {
      avatarVideo: "/avatars/chill-basic.mp4",
      avatarImage: "/Chill-Mood.jpg",
      thumbImage: "/ChillVertical.png",
      avatarAlt: "Green Bear avatar in Innerbloom.",
      avatarLabel: "Aligned with your energy",
    },
    flow: {
      avatarVideo: "/avatars/flow-basic.mp4",
      avatarImage: "/FlowMood.jpg",
      thumbImage: "/FlowVertical.png",
      avatarAlt: "Blue Amphibian avatar in Innerbloom.",
      avatarLabel: "Aligned with your energy",
    },
    evolve: {
      avatarVideo: "/avatars/evolve-basic.mp4",
      avatarImage: "/Evolve-Mood.jpg",
      thumbImage: "/EvolveVertical.png",
      avatarAlt: "Violet Owl avatar in Innerbloom.",
      avatarLabel: "Aligned with your energy",
    },
  },
  es: {
    low: {
      avatarVideo: "/avatars/low-basic.mp4",
      avatarImage: "/LowMood.jpg",
      thumbImage: "/LowVertical.png",
      avatarAlt: "Avatar Red Cat dentro de Innerbloom.",
      avatarLabel: "Alineado a tu energía",
    },
    chill: {
      avatarVideo: "/avatars/chill-basic.mp4",
      avatarImage: "/Chill-Mood.jpg",
      thumbImage: "/ChillVertical.png",
      avatarAlt: "Avatar Green Bear dentro de Innerbloom.",
      avatarLabel: "Alineado a tu energía",
    },
    flow: {
      avatarVideo: "/avatars/flow-basic.mp4",
      avatarImage: "/FlowMood.jpg",
      thumbImage: "/FlowVertical.png",
      avatarAlt: "Avatar Blue Amphibian dentro de Innerbloom.",
      avatarLabel: "Alineado a tu energía",
    },
    evolve: {
      avatarVideo: "/avatars/evolve-basic.mp4",
      avatarImage: "/Evolve-Mood.jpg",
      thumbImage: "/EvolveVertical.png",
      avatarAlt: "Avatar Violet Owl dentro de Innerbloom.",
      avatarLabel: "Alineado a tu energía",
    },
  },
};

const buttonBaseClasses =
  "inline-flex items-center justify-center whitespace-nowrap rounded-full px-6 py-3 font-display text-sm font-semibold tracking-tight transition duration-150 ease-out active:translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

const buttonVariants = {
  primary: "ib-primary-button",
  ghost: `${buttonBaseClasses} border border-transparent bg-transparent text-text-subtle hover:bg-white/10 hover:text-white`,
};

const buttonClasses = (variant: keyof typeof buttonVariants = "primary") =>
  buttonVariants[variant];

const PILLAR_EXAMPLES_LABEL: Record<Language, string> = {
  es: "Tareas sugeridas:",
  en: "Suggested tasks:",
};

function renderMultilineText(text: string) {
  return text.split("\n").map((line, index) => (
    <Fragment key={`${line}-${index}`}>
      {index > 0 ? <br /> : null}
      {line}
    </Fragment>
  ));
}

function splitPillarCopy(copy: string, language: Language) {
  const examplesLabel = PILLAR_EXAMPLES_LABEL[language];
  const [definitionPart, examplesPart] = copy.split(examplesLabel);
  const definition = definitionPart?.trim() ?? copy;
  const examples = (examplesPart ?? "")
    .split("•")
    .map((item) => item.trim())
    .filter(Boolean);

  return { definition, examples };
}

const EMOTION_HEATMAP_ROWS: Array<
  Array<"calm" | "happy" | "focus" | "stress" | "neutral">
> = [
  [
    "calm",
    "happy",
    "calm",
    "happy",
    "neutral",
    "calm",
    "focus",
    "calm",
    "happy",
    "calm",
    "neutral",
    "focus",
    "calm",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
  ],
  [
    "calm",
    "focus",
    "calm",
    "neutral",
    "happy",
    "neutral",
    "calm",
    "focus",
    "calm",
    "happy",
    "focus",
    "stress",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
  ],
  [
    "calm",
    "focus",
    "neutral",
    "happy",
    "happy",
    "neutral",
    "focus",
    "calm",
    "focus",
    "calm",
    "focus",
    "stress",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
  ],
  [
    "calm",
    "focus",
    "neutral",
    "focus",
    "neutral",
    "neutral",
    "focus",
    "focus",
    "focus",
    "focus",
    "calm",
    "stress",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
  ],
  [
    "focus",
    "neutral",
    "neutral",
    "neutral",
    "calm",
    "happy",
    "focus",
    "neutral",
    "focus",
    "focus",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
  ],
  [
    "focus",
    "calm",
    "neutral",
    "calm",
    "focus",
    "neutral",
    "focus",
    "happy",
    "focus",
    "calm",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
  ],
  [
    "calm",
    "calm",
    "neutral",
    "neutral",
    "focus",
    "focus",
    "happy",
    "focus",
    "calm",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
    "neutral",
  ],
];

function LanguageDropdown({
  value,
  onChange,
}: {
  value: Language;
  onChange: (language: Language) => void;
}) {
  const options: { code: Language; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "es", label: "ES" },
  ];

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentOption =
    options.find((option) => option.code === value) ?? options[0];

  function handleSelect(language: Language) {
    onChange(language);
    setIsOpen(false);
  }

  return (
    <div
      ref={dropdownRef}
      className="lang-toggle"
      role="group"
      aria-label="Language selector"
    >
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
            className={value === option.code ? "active" : ""}
            onClick={() => handleSelect(option.code)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

type LandingPageProps = {
  content?: Record<Language, LandingCopy>;
  className?: string;
};

export default function LandingPage({ content = OFFICIAL_LANDING_CONTENT, className }: LandingPageProps) {
  const { userId } = useAuth();
  const { setManualLanguage, syncLocaleLanguage } = usePostLoginLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const isSignedIn = Boolean(userId);
  const [language, setLanguage] = useState<Language>(() =>
    typeof window !== "undefined"
      ? resolveAuthLanguage(window.location.search)
      : "es",
  );
  const { theme, setPreference } = useThemePreference();
  const themeMode: LandingThemeMode = theme;
  const copy = content[language];
  const visibleNavLinks = copy.navLinks.filter(
    (link) => !/^\/demo$/i.test(link.href) && !/^#?demo$/i.test(link.href),
  );
  const landingStyle = {
    ...(OFFICIAL_LANDING_CSS_VARIABLES as CSSProperties),
    ...getLandingThemeStyle(themeMode),
  } as CSSProperties;
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeModeIndex, setActiveModeIndex] = useState(0);
  const [isModesInView, setIsModesInView] = useState(false);
  const [hasModeInteracted, setHasModeInteracted] = useState(false);
  const initialCookieConsentStateRef = useRef(readCookieConsentState());
  const [analyticsConsent, setAnalyticsConsent] = useState(
    () => initialCookieConsentStateRef.current.analytics,
  );
  const [isCookiePanelOpen, setIsCookiePanelOpen] = useState(
    () => initialCookieConsentStateRef.current.analytics === "unset",
  );
  const modesSectionRef = useRef<HTMLElement | null>(null);
  const modeThumbTouchStartXRef = useRef<number | null>(null);

  const testimonialCount = copy.testimonials.items.length;
  const modeCount = copy.modes.items.length;
  const activeMode = copy.modes.items[activeModeIndex] ?? copy.modes.items[0];
  const activeVisual = MODE_VISUALS[language][activeMode.id];
  useEffect(() => {
    console.info(
      "[landing][ga4-debug] cookie consent read on load",
      initialCookieConsentStateRef.current,
    );
  }, []);

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
  const toggleThemeMode = () => {
    setPreference(themeMode === "dark" ? "light" : "dark");
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
      document.querySelectorAll<HTMLElement>(".reveal-on-scroll"),
    );

    if (!elements.length) {
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      elements.forEach((element) => {
        element.classList.add("is-visible");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10%" },
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
      { threshold: 0.35 },
    );

    observer.observe(sectionElement);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (
      prefersReducedMotion ||
      hasModeInteracted ||
      !isModesInView ||
      modeCount <= 1
    ) {
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
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToSlide(activeSlide - 1);
    }
    if (event.key === "ArrowRight") {
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

  const handleModeThumbKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const { key } = event;

    if (key === "Enter" || key === " " || key === "Spacebar") {
      event.preventDefault();
      handleModeSelect(index);
      return;
    }

    if (key === "ArrowUp" || key === "ArrowLeft") {
      event.preventDefault();
      stopModesAutoplay();
      selectMode(index - 1);
      return;
    }

    if (key === "ArrowDown" || key === "ArrowRight") {
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
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: language,
    mainEntity: copy.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const handleAnalyticsConsent = (nextDecision: "accepted" | "rejected") => {
    const nextState = persistCookieConsentState(nextDecision);
    console.info("[landing][ga4-debug] cookie consent updated", {
      nextDecision,
      persistedState: nextState,
    });
    setAnalyticsConsent(nextState.analytics);
    setIsCookiePanelOpen(false);
  };

  return (
    <div
      className={className ? `landing ${className}` : "landing"}
      style={landingStyle}
      data-theme-mode={themeMode}
    >
      <div className="landing-background-layer" aria-hidden="true" />
      <header className="nav">
        <Link
          className="brand"
          to={buildLocalizedAuthPath("/", language)}
          aria-label={
            language === "es" ? "Innerbloom — inicio" : "Innerbloom — home"
          }
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
          <button
            type="button"
            onClick={toggleThemeMode}
            className="landing-theme-toggle"
            aria-label={
              themeMode === "dark"
                ? language === "es"
                  ? "Cambiar a modo claro"
                  : "Switch to light mode"
                : language === "es"
                  ? "Cambiar a modo oscuro"
                  : "Switch to dark mode"
            }
          >
            {themeMode === "dark" ? (
              <svg
                aria-hidden="true"
                className="h-[15px] w-[15px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z" />
              </svg>
            ) : (
              <svg
                aria-hidden="true"
                className="h-[15px] w-[15px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2.2M12 19.8V22M4.93 4.93l1.56 1.56M17.51 17.51l1.56 1.56M2 12h2.2M19.8 12H22M4.93 19.07l1.56-1.56M17.51 6.49l1.56-1.56" />
              </svg>
            )}
          </button>
          <LanguageDropdown value={language} onChange={handleLanguageChange} />
          {isSignedIn ? (
            <Link className={buttonClasses()} to="/dashboard">
              {copy.auth.dashboard}
            </Link>
          ) : (
            <>
              <Link
                className={`${buttonClasses("ghost")} nav-auth-button`}
                data-analytics-cta="login"
                data-analytics-location="nav"
                to={buildLocalizedAuthPath("/login", language)}
              >
                {copy.auth.login}
              </Link>
              <Link
                className={`${buttonClasses()} nav-auth-button`}
                data-analytics-cta="create_account"
                data-analytics-location="nav"
                to={buildLocalizedAuthPath("/sign-up", language)}
              >
                {copy.auth.signup}
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        <section className="hero reveal-on-scroll" id="overview">
          <div className="hero-grid">
            <div className="hero-copy">
              <h1>
                {copy.hero.titleLead}{" "}
                <span className="grad">{copy.hero.titleHighlight}</span>
              </h1>
              <p className="sub">{copy.hero.subtitle}</p>
              <div
                className={`mt-6 flex flex-wrap items-center justify-center gap-3 hero-actions ${
                  isSignedIn ? "hero-actions--single" : ""
                }`}
              >
                {isSignedIn ? (
                  <Link className={buttonClasses()} to="/dashboard">
                    {copy.auth.dashboard}
                  </Link>
                ) : (
                  <>
                    <Link
                      className={buttonClasses()}
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
                      to={buildDemoModeSelectUrl({
                        language,
                        source: "landing",
                      })}
                    >
                      <span>{copy.auth.guidedDemo}</span>
                    </Link>
                  </>
                )}
              </div>
              <p className="tiny hero-cta-note">{copy.hero.note}</p>
            </div>
            <div className="hero-media" aria-label={copy.hero.alt}>
              <HeroPhoneShowcase />
            </div>
          </div>
        </section>

        <section
          className="truth-problem section-pad reveal-on-scroll"
          id="why"
        >
          <div className="container narrow truth-problem-section">
            <p className="truth-problem-kicker">
              {language === "es" ? "EL PROBLEMA REAL" : "THE REAL PROBLEM"}
            </p>

            <div className="truth-problem-heading-wrap">
              <AdaptiveText
                as="h2"
                className="truth-problem-title truth-problem-title--outside"
              >
                {copy.problem.title}
              </AdaptiveText>
              <WeatherCycleOrb />
            </div>

            <div className="truth-problem-body">
              <div className="truth-problem-block truth-problem-block--left">
                <span className="truth-problem-icon truth-problem-icon--x" aria-hidden>
                  ×
                </span>
                <div className="truth-problem-copy">
                  <AdaptiveText as="p" className="truth-problem-primary">
                    {renderMultilineText(copy.problem.leftPrimary)}
                  </AdaptiveText>
                  <AdaptiveText as="p" className="truth-problem-secondary">
                    {renderMultilineText(copy.problem.leftSecondary)}
                  </AdaptiveText>
                </div>
              </div>
              <div className="truth-problem-divider" aria-hidden />
              <div className="truth-problem-block truth-problem-block--right">
                <span className="truth-problem-icon truth-problem-icon--check" aria-hidden>
                  ✓
                </span>
                <div className="truth-problem-copy">
                  <AdaptiveText as="p" className="truth-problem-primary">
                    {renderMultilineText(copy.problem.rightPrimary)}
                  </AdaptiveText>
                  <AdaptiveText as="p" className="truth-problem-secondary">
                    {renderMultilineText(copy.problem.rightSecondary)}
                  </AdaptiveText>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="how section-pad reveal-on-scroll" id="how">
          <div className="container narrow">
            <div className="how-heading">
              <p className="how-kicker">{copy.how.kicker}</p>
              <AdaptiveText as="h2">{copy.how.title}</AdaptiveText>
              <AdaptiveText as="p" className="section-sub how-intro">
                {copy.how.intro}
              </AdaptiveText>
            </div>
            <PremiumTimeline
              steps={copy.how.steps}
              closingLine={copy.how.closingLine}
              closingBody={copy.how.closingBody}
              className="mt-2"
            />
          </div>
        </section>

        <section
          className="feature-showcase section-pad reveal-on-scroll"
          id="demo"
        >
          <div className="container narrow">
            <div className="visible-progress-top">
              <div className="visible-progress-copy">
                <AdaptiveText as="h2" className="demo-title">
                  {copy.demo.title}
                </AdaptiveText>
                <AdaptiveText as="p" className="demo-sub">
                  {renderMultilineText(copy.demo.text)}
                </AdaptiveText>
              </div>

              <div className="visible-progress-module" aria-hidden>
                <div className="visible-progress-viewport">
                  <div className="visible-progress-scene">
                    <div className="visible-scene-region visible-scene-region--balance visible-scene-fragment visible-scene-fragment--radar">
                      <div className="visible-canvas-header">
                        <p className="visible-canvas-title">BALANCE</p>
                        <span className="visible-canvas-chip">
                          Predominio Body
                        </span>
                      </div>
                      <div className="visible-radar-shell">
                        <div className="visible-balance-radar-wrap">
                          <svg
                            className="visible-balance-radar"
                            viewBox="0 0 420 420"
                            aria-hidden
                          >
                            <defs>
                              <radialGradient
                                id="visible-balance-radar-shape-fill"
                                cx="42%"
                                cy="32%"
                                r="72%"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="rgba(243, 247, 255, 0.52)"
                                />
                                <stop
                                  offset="100%"
                                  stopColor="rgba(189, 205, 243, 0.18)"
                                />
                              </radialGradient>
                              <radialGradient
                                id="visible-balance-radar-inner-fill"
                                cx="50%"
                                cy="42%"
                                r="68%"
                              >
                                <stop
                                  offset="0%"
                                  stopColor="rgba(226, 236, 255, 0.3)"
                                />
                                <stop
                                  offset="100%"
                                  stopColor="rgba(179, 197, 240, 0.08)"
                                />
                              </radialGradient>
                            </defs>
                            <circle
                              className="visible-balance-radar-glow"
                              cx="210"
                              cy="210"
                              r="186"
                            />
                            <polygon
                              className="visible-balance-radar-ring"
                              points="210.0,40.0 295.0,62.8 357.2,125.0 380.0,210.0 357.2,295.0 295.0,357.2 210.0,380.0 125.0,357.2 62.8,295.0 40.0,210.0 62.8,125.0 125.0,62.8"
                            />
                            <polygon
                              className="visible-balance-radar-ring"
                              points="210.0,80.0 275.0,97.4 322.6,145.0 340.0,210.0 322.6,275.0 275.0,322.6 210.0,340.0 145.0,322.6 97.4,275.0 80.0,210.0 97.4,145.0 145.0,97.4"
                            />
                            <polygon
                              className="visible-balance-radar-ring"
                              points="210.0,118.0 256.0,130.3 289.7,164.0 302.0,210.0 289.7,256.0 256.0,289.7 210.0,302.0 164.0,289.7 130.3,256.0 118.0,210.0 130.3,164.0 164.0,130.3"
                            />
                            <polygon
                              className="visible-balance-radar-ring"
                              points="210.0,154.0 238.0,161.5 258.5,182.0 266.0,210.0 258.5,238.0 238.0,258.5 210.0,266.0 182.0,258.5 161.5,238.0 154.0,210.0 161.5,182.0 182.0,161.5"
                            />
                            <line
                              className="visible-balance-radar-axis"
                              x1="210"
                              y1="40"
                              x2="210"
                              y2="380"
                            />
                            <line
                              className="visible-balance-radar-axis"
                              x1="295"
                              y1="62.8"
                              x2="125"
                              y2="357.2"
                            />
                            <line
                              className="visible-balance-radar-axis"
                              x1="357.2"
                              y1="125"
                              x2="62.8"
                              y2="295"
                            />
                            <line
                              className="visible-balance-radar-axis"
                              x1="380"
                              y1="210"
                              x2="40"
                              y2="210"
                            />
                            <line
                              className="visible-balance-radar-axis"
                              x1="357.2"
                              y1="295"
                              x2="62.8"
                              y2="125"
                            />
                            <line
                              className="visible-balance-radar-axis"
                              x1="295"
                              y1="357.2"
                              x2="125"
                              y2="62.8"
                            />
                            <path
                              className="visible-balance-radar-pillar visible-balance-radar-pillar--soul"
                              d="M 323.1 344.8 A 176 176 0 0 1 50.5 284.4"
                            />
                            <path
                              className="visible-balance-radar-pillar visible-balance-radar-pillar--mind"
                              d="M 50.5 284.4 A 176 176 0 0 1 104.1 69.4"
                            />
                            <path
                              className="visible-balance-radar-pillar visible-balance-radar-pillar--body"
                              d="M 104.1 69.4 A 176 176 0 0 1 323.1 344.8"
                            />
                            <polygon
                              className="visible-balance-radar-shape visible-balance-radar-shape--outer"
                              points="210.0,144.3 264.4,115.8 321.9,145.4 309.7,210.0 284.6,253.1 280.8,332.7 210.0,280.3 170.3,278.7 159.0,239.5 40.0,210.0 133.4,165.8 157.9,119.7"
                            />
                            <polygon
                              className="visible-balance-radar-shape visible-balance-radar-shape--inner"
                              points="210.0,159.7 251.6,137.9 295.6,160.6 286.3,210.0 267.0,242.9 264.2,303.8 210.0,263.7 179.7,262.5 171.0,232.5 80.0,210.0 151.5,176.2 170.1,140.9"
                            />
                            <circle
                              className="visible-balance-radar-core"
                              cx="210"
                              cy="210"
                              r="9"
                            />
                            <text
                              className="visible-balance-radar-value"
                              x="28"
                              y="208"
                            >
                              777
                            </text>
                            <text
                              className="visible-balance-radar-value"
                              x="252"
                              y="84"
                            >
                              483
                            </text>
                            <text
                              className="visible-balance-radar-value"
                              x="286"
                              y="336"
                            >
                              517
                            </text>
                            <text
                              className="visible-balance-radar-value"
                              x="132"
                              y="236"
                            >
                              251
                            </text>
                            <text
                              className="visible-balance-radar-value"
                              x="141"
                              y="122"
                            >
                              456
                            </text>
                            <text
                              className="visible-balance-radar-value"
                              x="270"
                              y="158"
                            >
                              414
                            </text>
                            <text
                              className="visible-balance-radar-value"
                              x="288"
                              y="192"
                            >
                              378
                            </text>
                            <text
                              className="visible-balance-radar-value"
                              x="118"
                              y="172"
                            >
                              252
                            </text>
                          </svg>
                        </div>
                      </div>
                      <div className="visible-radar-pillars">
                        <span>ALMA 32%</span>
                        <span>CUERPO 45%</span>
                        <span>MENTE 23%</span>
                      </div>
                    </div>

                    <div className="visible-scene-region visible-scene-region--emotion visible-scene-fragment visible-scene-fragment--emotion">
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
                          <div
                            className="visible-emotion-grid-row"
                            key={`emotion-row-${rowIndex}`}
                          >
                            {row.map((emotion, cellIndex) => (
                              <span
                                key={`emotion-cell-${rowIndex}-${cellIndex}`}
                                className={`visible-emotion-cell visible-emotion-cell--${emotion}`}
                                style={
                                  {
                                    "--emotion-order":
                                      rowIndex * 19 + cellIndex,
                                  } as CSSProperties
                                }
                              />
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="visible-scene-inner-contours" aria-hidden>
                      <span className="visible-inner-contour visible-inner-contour--emotion" />
                    </div>

                    <div className="visible-scene-region visible-scene-region--streaks visible-scene-fragment visible-scene-fragment--streaks">
                      <div className="visible-canvas-header visible-canvas-header--streaks">
                        <p className="visible-canvas-title">STREAKS</p>
                        <span className="visible-canvas-info">i</span>
                        <span className="visible-canvas-chip visible-canvas-chip--flow">
                          FLOW · 3M
                        </span>
                      </div>
                      <div
                        className="visible-streak-pillars"
                        role="tablist"
                        aria-label="Pilares"
                      >
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
                  to={buildDemoModeSelectUrl({ language, source: "landing" })}
                >
                  {copy.demo.cta}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="why section-pad reveal-on-scroll" id="pillars">
          <div className="container narrow">
            <p className="section-kicker">{copy.pillars.kicker}</p>
            <AdaptiveText as="h2" className="pillars-title">
              {copy.pillars.title}
            </AdaptiveText>
            <AdaptiveText as="p" className="section-sub pillars-intro">
              {copy.pillars.intro}
            </AdaptiveText>
            <div className="cards grid-3">
              {copy.pillars.items.map((pillar, index) => {
                const { definition, examples } = splitPillarCopy(
                  pillar.copy,
                  language,
                );
                return (
                  <article
                    className="card card--hero-glass pillar-card fade-item"
                    key={pillar.title}
                    style={{ "--delay": `${index * 90}ms` } as CSSProperties}
                  >
                    <h3 className="pillar-heading">
                      <span className="pillar-emoji" aria-hidden>
                        {pillar.emoji}
                      </span>
                      <span className="concept-term concept-term--pillar">
                        {pillar.title}
                      </span>
                    </h3>
                    <p className="pillar-definition">{definition}</p>
                    {examples.length > 0 ? (
                      <div
                        className="pillar-examples"
                        aria-label={PILLAR_EXAMPLES_LABEL[language]}
                      >
                        <span className="pillar-examples-label">
                          {PILLAR_EXAMPLES_LABEL[language]}
                        </span>
                        <div className="pillar-chips" role="list">
                          {examples.map((example) => (
                            <span
                              key={example}
                              className="pillar-chip"
                              role="listitem"
                            >
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
            <AdaptiveText as="p" className="section-sub highlight">
              {copy.pillars.highlight}
            </AdaptiveText>
          </div>
        </section>

        <section className="section-pad reveal-on-scroll" id="rhythms">
          <div className="container">
            <LabsWeeklyRhythmSystemSection
              language={language}
              headingAlignment="center"
            />
          </div>
        </section>

        <section
          ref={modesSectionRef}
          className="modes section-pad reveal-on-scroll"
          id="modes"
        >
          <div className="container">
            <p className="section-kicker">{copy.modes.kicker}</p>
            <AdaptiveText as="h2" className="modes-title">
              {copy.modes.title}
            </AdaptiveText>
            <AdaptiveText as="p" className="section-sub modes-intro">
              {copy.modes.intro}
            </AdaptiveText>
            <div
              className="modes-carousel"
              aria-live="polite"
              style={
                { "--mode-count": copy.modes.items.length } as CSSProperties
              }
            >
              <div
                className="mode-thumbs"
                role="listbox"
                aria-label={
                  language === "es" ? "Elegir avatar" : "Choose avatar"
                }
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
                      className={`mode-thumb ${isActive ? "is-active" : ""}`}
                      onClick={() => handleModeSelect(index)}
                      onKeyDown={(event) =>
                        handleModeThumbKeyDown(event, index)
                      }
                    >
                      <img src={visual.thumbImage} alt="" aria-hidden />
                    </button>
                  );
                })}
              </div>

              <article
                className={`card card--hero-glass mode mode-main mode-${activeMode.id} fade-item`}
              >
                <header className="mode-header">
                  <div className="mode-title">{activeMode.title}</div>
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
                  <figcaption className="mode-media-caption">
                    {activeVisual.avatarLabel}
                  </figcaption>
                </figure>
                <p className="mode-avatar-copy">{activeMode.goal}</p>
              </article>
            </div>
          </div>
        </section>

        <section
          className="testimonials section-pad reveal-on-scroll"
          id="testimonials"
        >
          <div className="container">
            <AdaptiveText as="h2">{copy.testimonials.title}</AdaptiveText>
            <AdaptiveText as="p" className="section-sub">
              {copy.testimonials.intro}
            </AdaptiveText>
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
              <div
                className="slider-track"
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {copy.testimonials.items.map((testimonial, index) => (
                  <figure
                    className="testi"
                    key={testimonial.author}
                    role="group"
                    id={`slide-${index + 1}`}
                    aria-label={
                      language === "es"
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
              <div
                className="slider-dots"
                role="tablist"
                aria-label={copy.testimonials.groupLabel}
              >
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

        {SHOW_LANDING_PRICING ? (
          <section
            className="pricing section-pad reveal-on-scroll"
            id="pricing"
          >
            <div className="container">
              <AdaptiveText as="h2">{copy.pricing.title}</AdaptiveText>
              <AdaptiveText as="p" className="section-sub">
                {copy.pricing.intro}
              </AdaptiveText>
              <p className="pricing-trial-highlight">
                {copy.pricing.trialHighlight}
              </p>
              <p className="pricing-tax-note">{copy.pricing.taxNote}</p>
              <div className="pricing-grid">
                {copy.pricing.plans.map((plan, index) => (
                  <article
                    className="card pricing-card fade-item"
                    key={plan.id}
                    style={{ "--delay": `${index * 90}ms` } as CSSProperties}
                  >
                    {plan.id === "YEAR" ? (
                      <span className="pricing-best-deal-chip">best deal</span>
                    ) : null}
                    <p className="pricing-plan-name">{plan.name}</p>
                    <p className="pricing-plan-detail">{plan.detail}</p>
                    <p className="pricing-plan-price">{plan.price}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section className="next section-pad reveal-on-scroll">
          <div className="container narrow center">
            <AdaptiveText as="h2">{copy.next.title}</AdaptiveText>
            <AdaptiveText as="p" className="section-sub">
              {copy.next.intro}
            </AdaptiveText>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              {isSignedIn ? (
                <Link className={buttonClasses()} to="/dashboard">
                  {copy.auth.dashboard}
                </Link>
              ) : (
                <>
                  <Link
                    className={buttonClasses()}
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
              <Link
                data-analytics-cta="login"
                data-analytics-location="footer"
                to={buildLocalizedAuthPath("/login", language)}
              >
                {copy.auth.login}
              </Link>
              <Link
                data-analytics-cta="create_account"
                data-analytics-location="footer"
                to={buildLocalizedAuthPath("/sign-up", language)}
              >
                {copy.auth.signup}
              </Link>
            </>
          )}
          <a href="#faq">{copy.footer.faq}</a>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/support">Support</Link>
          <button
            type="button"
            className="footer-cookies-link"
            onClick={() => setIsCookiePanelOpen(true)}
          >
            {language === "es" ? "Cookies" : "Cookies"}
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
        hasDecision={analyticsConsent !== "unset"}
        onAccept={() => handleAnalyticsConsent("accepted")}
        onReject={() => handleAnalyticsConsent("rejected")}
        onClose={() => setIsCookiePanelOpen(false)}
      />
    </div>
  );
}
