import { useEffect, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import './Landing.css';

const NAV_LINKS = [
  { href: '#overview', label: 'Overview' },
  { href: '#why', label: 'Nuestros Pilares' },
  { href: '#modes', label: 'Modos' },
  { href: '#how', label: 'Cómo funciona' },
  { href: '#features', label: 'Features' },
  { href: '#testimonials', label: 'Testimonios' },
  { href: '#faq', label: 'FAQ' }
];

const PILLARS = [
  {
    emoji: '🫀',
    title: 'Cuerpo',
    copy:
      'Tu cuerpo es el sustrato del hábito: sueño, nutrición y movimiento marcan tu disponibilidad de energía diaria (HP).'
  },
  {
    emoji: '🧠',
    title: 'Mente',
    copy:
      'La mente filtra y prioriza. Sin foco, no hay consistencia. Diseñamos sesiones simples para sostener la atención, el aprendizaje y la creatividad.'
  },
  {
    emoji: '🏵️',
    title: 'Alma',
    copy:
      'Las emociones, los vínculos y el propósito estabilizan el sistema. Sin esto, los hábitos no atraviesan semanas ni meses.'
  }
];

const MODES = [
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
];

const HOW_STEPS = [
  {
    title: 'Define tu camino',
    copy:
      'Responde una serie de preguntas, setea tu modo de juego; nosotros generaremos tu base (Body/Mind/Soul) con IA.'
  },
  {
    title: 'Activa tu base',
    copy: 'Recibís tu “pergamino digital” por mail y editás/confirmás tu base.'
  },
  {
    title: 'Daily Quest + Emociones',
    copy:
      'Con tu quest diaria vas a poder hacer una retrospectiva de tu día anterior; pensarás en qué emoción prevaleció más durante tu día.'
  },
  {
    title: 'XP, Rachas y Recompensas',
    copy:
      'Seguís tu crecimiento acumulando experiencia (XP), moviendo tu constancia semanal, desafiándote a nuevas misiones y obteniendo recompensas.'
  }
];

const FEATURES = [
  { title: '📝 Daily Quest', copy: 'Seguimiento de tareas por pilar y emoción diaria. 100% conectado a tu board.' },
  { title: '⭐ XP & Nivel', copy: 'Progreso con datos reales. Barra de nivel y XP faltante al siguiente nivel.' },
  { title: '📆 Constancia semanal', copy: 'Rachas por tarea: cuántas semanas seguidas mantienes la constancia de tus actividades.' },
  { title: '🎯 Misiones & Rewards', copy: 'Misiones vinculadas a rachas. Bonos de XP al cumplir objetivos.' },
  { title: '🗺️ Emotion Heatmap', copy: 'Mapa visual de tu estado emocional a lo largo del tiempo.' },
  { title: '📱 App & Recordatorios', copy: 'Descarga nuestra app y recibe recordatorios para un mejor seguimiento.' }
];

const TESTIMONIALS = [
  { quote: '“Por primera vez sostuve hábitos 6 semanas. El mapa y las misiones me ordenaron.”', author: 'Lucía • Diseñadora' },
  { quote: '“El heatmap emocional me cambió la mirada. Ajusto tareas por energía real.”', author: 'Diego • Dev' },
  { quote: '“Empecé en Low y pasé a Flow con objetivos claros, sin culpa.”', author: 'Caro • Estudiante' }
];

const FAQS = [
  {
    question: '¿Necesito mucha disciplina para empezar?',
    answer:
      'No. Si estás con poca energía, empezás en Low para activar el mínimo vital. El sistema ajusta el ritmo.'
  },
  {
    question: '¿Puedo cambiar de modo de juego?',
    answer: 'Sí. Podés cambiar entre Low, Chill, Flow y Evolve según tu momento.'
  },
  {
    question: '¿Dónde veo mis métricas?',
    answer: 'En tu archivo y en el Dashboard: XP, nivel, rachas y mapa emocional.'
  },
  {
    question: '¿Qué pasa si dejo de registrar?',
    answer: 'No perdés progreso. Retomás cuando quieras y ajustamos objetivos según tu energía.'
  }
];

export default function LandingPage() {
  const { userId } = useAuth();
  const isSignedIn = Boolean(userId);
  const [activeSlide, setActiveSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [allowAutoplay, setAllowAutoplay] = useState(true);

  const testimonialCount = TESTIMONIALS.length;

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updatePreference = (event: MediaQueryListEvent | MediaQueryList) => {
      setAllowAutoplay(!event.matches);
    };

    updatePreference(mediaQuery);

    const handleChange = (event: MediaQueryListEvent) => updatePreference(event);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (paused || testimonialCount <= 1 || !allowAutoplay) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % testimonialCount);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [allowAutoplay, paused, testimonialCount]);

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
        <Link className="brand" to="/" aria-label="Innerbloom — inicio">
          <span className="brand-text">Innerbloom</span>
          <img
            src="https://i.ibb.co/RpyF590p/innerbloom-white.png"
            alt=""
            className="logo-mark"
            width={32}
            height={32}
          />
        </Link>
        <nav className="nav-links">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <nav className="nav-actions">
          {isSignedIn ? (
            <Link className="btn" to="/dashboard">
              Ir al dashboard
            </Link>
          ) : (
            <>
              <Link className="btn ghost" to="/sign-up">
                Crear cuenta
              </Link>
              <Link className="btn" to="/login">
                Ya tengo cuenta
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="hero" id="overview">
          <div className="hero-grid">
            <div className="hero-copy">
              <h1>
                Convierte la experiencia en hábitos.{' '}
                <span className="grad">Convierte los hábitos en camino</span>
              </h1>
              <p className="sub">
                Tus hábitos son el mapa. Tu constancia, el nivel que alcanzas. Es tu <strong>self-improvement journey</strong> con
                equilibrio entre <strong>🫀 Cuerpo</strong>, <strong>🧠 Mente</strong> y <strong>🏵️ Alma</strong>.
              </p>
              <div className="cta">
                {isSignedIn ? (
                  <Link className="btn" to="/dashboard">
                    Ir al dashboard
                  </Link>
                ) : (
                  <>
                    <Link className="btn" to="/sign-up">
                      Comenzar mi Journey
                    </Link>
                    <Link className="btn ghost" to="/login">
                      Ya tengo cuenta
                    </Link>
                  </>
                )}
              </div>
              <p className="tiny">En menos de 3 minutos generamos tu base personalizada con IA.</p>
            </div>
            <div className="hero-media">
              <img
                src="https://i.ibb.co/Gv7WTT7h/Whats-App-Image-2025-08-31-at-03-52-15.jpg"
                alt="Niño mirando una esfera de energía violeta en el cielo nocturno — Gamification Journey"
                className="hero-img"
                width={1200}
                height={1200}
                loading="eager"
              />
            </div>
          </div>
        </section>

        <section className="why section-pad" id="why">
          <div className="container narrow">
            <h2>Nuestros pilares fundamentales</h2>
            <p className="section-sub">
              El progreso sostenible necesita equilibrio. <strong>🫀 Cuerpo</strong> para la energía y la salud,{' '}
              <strong>🧠 Mente</strong> para el foco y el aprendizaje, y <strong>🏵️ Alma</strong> para el bienestar emocional y el sentido.
              Cuando uno cae, los otros dos lo sostienen. Cuando se alinean, tu progreso se acelera.
            </p>
            <div className="cards grid-3">
              {PILLARS.map((pillar) => (
                <article className="card" key={pillar.title}>
                  <h3>
                    {pillar.emoji} {pillar.title}
                  </h3>
                  <p>{pillar.copy}</p>
                </article>
              ))}
            </div>
            <p className="section-sub" style={{ marginTop: 24 }}>
              Observate por primera vez en tercera persona y toma el control de tus acciones y hábitos.
            </p>
          </div>
        </section>

        <section className="modes section-pad" id="modes">
          <div className="container">
            <h2>Modula tu modo de juego</h2>
            <p className="section-sub">Cambia según tu momento. El sistema se adapta a tu energía.</p>
            <div className="cards grid-2">
              {MODES.map((mode) => (
                <article className={`card mode ${mode.id}`} key={mode.id}>
                  <div className="mode-title">
                    {mode.title} <span className="dot" aria-hidden="true" />
                  </div>
                  <p className="muted">
                    <strong>Estado:</strong> {mode.state}
                  </p>
                  <p>
                    <strong>Objetivo:</strong> {mode.goal}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="how section-pad" id="how">
          <div className="container narrow">
            <h2>Cómo funciona</h2>
            <p className="section-sub">Un flujo claro, de la activación a la constancia.</p>
            <ol className="steps">
              {HOW_STEPS.map((step, index) => (
                <li key={step.title}>
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

        <section className="features section-pad" id="features">
          <div className="container">
            <h2>Lo que desbloqueás</h2>
            <p className="section-sub">Herramientas que te dan claridad y momentum.</p>
            <div className="cards grid-3">
              {FEATURES.map((feature) => (
                <article className="card" key={feature.title}>
                  <h3>{feature.title}</h3>
                  <p>{feature.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="testimonials section-pad" id="testimonials">
          <div className="container">
            <h2>Testimonios</h2>
            <p className="section-sub">Lo que dicen quienes ya empezaron su Journey.</p>
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
                {TESTIMONIALS.map((testimonial, index) => (
                  <figure
                    className="testi"
                    key={testimonial.author}
                    role="group"
                    id={`slide-${index + 1}`}
                    aria-label={`${index + 1} de ${testimonialCount}`}
                  >
                    <blockquote>{testimonial.quote}</blockquote>
                    <figcaption>{testimonial.author}</figcaption>
                  </figure>
                ))}
              </div>
              <button
                type="button"
                className="slider-btn prev"
                aria-label="Anterior"
                onClick={() => goToSlide(activeSlide - 1)}
              >
                ‹
              </button>
              <button
                type="button"
                className="slider-btn next"
                aria-label="Siguiente"
                onClick={() => goToSlide(activeSlide + 1)}
              >
                ›
              </button>
              <div className="slider-dots" role="tablist" aria-label="Seleccionar testimonio">
                {TESTIMONIALS.map((testimonial, index) => (
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

        <section className="faq section-pad" id="faq">
          <div className="container narrow">
            <h2>Preguntas frecuentes</h2>
            {FAQS.map((faq) => (
              <details key={faq.question}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="next section-pad">
          <div className="container narrow center">
            <h2>Listo para empezar</h2>
            <p className="section-sub">Te guiamos paso a paso. Empezá ahora.</p>
            <div className="cta center">
              {isSignedIn ? (
                <Link className="btn" to="/dashboard">
                  Ir al dashboard
                </Link>
              ) : (
                <>
                  <Link className="btn" to="/sign-up">
                    Comenzar mi Journey
                  </Link>
                  <Link className="btn ghost" to="/login">
                    Ya tengo cuenta
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <span>©️ Gamification Journey</span>
        <nav className="footer-links">
          {isSignedIn ? (
            <Link to="/dashboard">Dashboard</Link>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/sign-up">Crear cuenta</Link>
            </>
          )}
          <a href="#faq">FAQ</a>
        </nav>
      </footer>
    </div>
  );
}
