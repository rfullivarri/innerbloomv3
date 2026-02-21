import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import './LandingV2.css';
import '../styles/panel-rachas.overrides.css';
import { Card } from '../components/ui/Card';
import { FluidGradientBackground } from '../components/ui/FluidGradientBackground';

type Language = 'en' | 'es';

type NavItem = {
  href: string;
  label: string;
};

type Highlight = {
  id: string;
  title: string;
  description: string;
  visual: 'xp' | 'energy' | 'emotion' | 'missions';
};

type Mode = {
  id: string;
  title: string;
  benefit: string;
  bullets: string[];
  cta: string;
};

type ModeVisual = {
  avatarVideo: string;
  avatarImage: string;
  avatarAlt: string;
  avatarLabel: string;
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
      title: 'Turn experience into habits. Turn habits into your path.',
      subtitle:
        'Your habits are the map. Consistency is the level you reach. A gamified self-improvement journey balanced between Body, Mind and Soul.',
      cta: 'Start my Journey',
      secondary: 'See the dashboard',
      supporting: 'In under 3 minutes we generate your AI base so you can play with real data.'
    },
    highlights: {
      title: 'See the real dashboard',
      description: 'Same bars and heatmaps you use daily: Daily Quest, XP, streaks, missions and emotions.',
      items: [
        {
          id: 'xp',
          title: 'XP, level and streaks',
          description: 'Progress bar with missing XP and active rewards.',
          visual: 'xp'
        },
        {
          id: 'energy',
          title: 'Daily Energy',
          description: 'Balance HP, Mood and Focus to sustain consistency.',
          visual: 'energy'
        },
        {
          id: 'emotion',
          title: 'Emotion heatmap',
          description: 'Mood check-ins visualized exactly like in the app.',
          visual: 'emotion'
        },
        {
          id: 'missions',
          title: 'Missions & rewards',
          description: 'Quests tied to streaks with XP bonuses and clear steps.',
          visual: 'missions'
        }
      ] satisfies Highlight[]
    },
    modes: {
      title: 'Modulate your game mode',
      description: 'Swap modes to match your energy. The system adapts to keep you moving.',
      items: [
        {
          id: 'low',
          title: '🪫 Low',
          benefit: 'Low energy day. Minimum viable routine.',
          bullets: ['1–2 minute tasks', 'Recovery-first', 'Zero-guilt rest'],
          cta: 'Try Low mode'
        },
        {
          id: 'chill',
          title: '🍃 Chill',
          benefit: 'Stable energy. Soft routines to sustain well-being.',
          bullets: ['Light planning', 'Evening reflection', 'Gentle streaks'],
          cta: 'Try Chill mode'
        },
        {
          id: 'flow',
          title: '🌊 Flow',
          benefit: 'Focused and in motion. Ride momentum with aligned goals.',
          bullets: ['Goal-linked tasks', 'Focus timers', 'Progress tags'],
          cta: 'Try Flow mode'
        },
        {
          id: 'evolve',
          title: '🧬 Evolve',
          benefit: 'Ambitious and determined. Atomic habits, missions and rewards.',
          bullets: ['Atomic habits', 'XP ladders', 'Weekly challenges'],
          cta: 'Try Evolve mode'
        }
      ] satisfies Mode[]
    },
    pillars: {
      title: 'Body, Mind, Soul',
      description: 'Sustainable progress needs balance. When one drops, the other two support you.',
      items: [
        {
          id: 'body',
          title: 'Body',
          emoji: '🫀',
          description: 'Sleep, nutrition and movement set your daily energy (HP).'
        },
        {
          id: 'mind',
          title: 'Mind',
          emoji: '🧠',
          description: 'Focus rituals keep attention, learning and creativity alive.'
        },
        {
          id: 'soul',
          title: 'Soul',
          emoji: '🏵️',
          description: 'Emotions, relationships and purpose stabilize the system.'
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
          q: 'Do I need a lot of discipline to start?',
          a: 'No. Start in Low so we keep actions tiny while you regain momentum.'
        },
        {
          q: 'Can I switch modes?',
          a: 'Yes. Swap between Low, Chill, Flow and Evolve whenever you need.'
        },
        {
          q: 'Where do I see my metrics?',
          a: 'In the dashboard: XP, level, streaks and the emotion heatmap.'
        },
        {
          q: 'What happens if I stop logging?',
          a: 'You do not lose progress. Resume anytime and we adjust goals to your current energy.'
        }
      ] satisfies Faq[]
    },
    next: {
      title: 'Ready to play with your own data?',
      description: 'We guide you step by step. Start free and change language anytime.',
      primary: 'Start my Journey',
      secondary: 'View the dashboard'
    },
    langLabel: 'Language'
  },
  es: {
    nav: [
      { href: '#hero', label: 'Overview' },
      { href: '#highlights', label: 'Producto' },
      { href: '#modes', label: 'Modos' },
      { href: '#pillars', label: 'Pilares' },
      { href: '#testimonials', label: 'Testimonios' },
      { href: '#faq', label: 'FAQ' }
    ] satisfies NavItem[],
    hero: {
      title: 'Convierte la experiencia en hábitos. Convierte los hábitos en camino.',
      subtitle:
        'Tus hábitos son el mapa. Tu constancia, el nivel que alcanzas. Es tu self-improvement journey con equilibrio entre 🫀 Cuerpo, 🧠 Mente y 🏵️ Alma.',
      cta: 'Comenzar mi Journey',
      secondary: 'Ver el dashboard',
      supporting: 'En menos de 3 minutos generamos tu base con IA y la conectamos al juego.'
    },
    highlights: {
      title: 'Muestra del producto real',
      description: 'Las mismas barras y heatmaps del dashboard: Daily Quest, XP, rachas, misiones y emociones.',
      items: [
        {
          id: 'xp',
          title: 'XP, nivel y rachas',
          description: 'Barra de nivel con XP faltante y recompensas activas.',
          visual: 'xp'
        },
        {
          id: 'energy',
          title: 'Daily Energy (HP/Mood/Focus)',
          description: 'Equilibrio de pilares para sostener la constancia.',
          visual: 'energy'
        },
        {
          id: 'emotion',
          title: 'Mapa emocional',
          description: 'Heatmap exacto del dashboard para ver patrones reales.',
          visual: 'emotion'
        },
        {
          id: 'missions',
          title: 'Misiones + Rewards',
          description: 'Misiones ligadas a rachas con bonos de XP y próximos pasos.',
          visual: 'missions'
        }
      ] satisfies Highlight[]
    },
    modes: {
      title: 'Modula tu modo de juego',
      description: 'Cambia según tu momento. El sistema se adapta a tu energía.',
      items: [
        {
          id: 'low',
          title: '🪫 Low',
          benefit: 'Energía baja, abrumado. Activá tu mínimo vital con acciones cortas.',
          bullets: ['Tareas de 1–2 minutos', 'Recuperación primero', 'Descanso sin culpa'],
          cta: 'Activar modo Low'
        },
        {
          id: 'chill',
          title: '🍃 Chill',
          benefit: 'Energía estable. Rutinas suaves y balanceadas para sostenerte.',
          bullets: ['Plan liviano', 'Reflexión nocturna', 'Rachas suaves'],
          cta: 'Activar modo Chill'
        },
        {
          id: 'flow',
          title: '🌊 Flow',
          benefit: 'Enfocado y en movimiento. Aprovechá el impulso con metas alineadas.',
          bullets: ['Tareas ligadas a metas', 'Timers de foco', 'Tags de progreso'],
          cta: 'Activar modo Flow'
        },
        {
          id: 'evolve',
          title: '🧬 Evolve',
          benefit: 'Ambicioso y determinado. Sistema retador con Hábitos Atómicos, misiones y recompensas.',
          bullets: ['Hábitos atómicos', 'Escalera de XP', 'Retos semanales'],
          cta: 'Activar modo Evolve'
        }
      ] satisfies Mode[]
    },
    pillars: {
      title: 'Cuerpo, Mente, Alma',
      description:
        'El progreso sostenible necesita equilibrio. Cuerpo para la energía y la salud, Mente para el foco y el aprendizaje, y Alma para el bienestar emocional y el sentido.',
      items: [
        {
          id: 'body',
          title: 'Cuerpo',
          emoji: '🫀',
          description:
            'Tu cuerpo es el sustrato del hábito: sueño, nutrición y movimiento marcan tu disponibilidad de energía diaria (HP).'
        },
        {
          id: 'mind',
          title: 'Mente',
          emoji: '🧠',
          description:
            'La mente filtra y prioriza. Sin foco, no hay consistencia. Diseñamos sesiones simples para sostener la atención, el aprendizaje y la creatividad.'
        },
        {
          id: 'soul',
          title: 'Alma',
          emoji: '🏵️',
          description:
            'Las emociones, los vínculos y el propósito estabilizan el sistema. Sin esto, los hábitos no atraviesan semanas ni meses.'
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
          a: 'No. Si estás con poca energía, empezás en Low para activar el mínimo vital. El sistema ajusta el ritmo.'
        },
        {
          q: '¿Puedo cambiar de modo?',
          a: 'Sí. Podés cambiar entre Low, Chill, Flow y Evolve según tu momento.'
        },
        {
          q: '¿Dónde veo mis métricas?',
          a: 'En tu dashboard: XP, nivel, rachas y mapa emocional.'
        },
        {
          q: '¿Qué pasa si dejo de registrar?',
          a: 'No perdés progreso. Retomás cuando quieras y ajustamos objetivos según tu energía.'
        }
      ] satisfies Faq[]
    },
    next: {
      title: '¿Listo para ver tus datos reales?',
      description: 'Te guiamos paso a paso. Empezá gratis y cambiá de idioma cuando quieras.',
      primary: 'Comenzar mi Journey',
      secondary: 'Ver el dashboard'
    },
    langLabel: 'Idioma'
  }
} as const;

type EmotionName = 'Calma' | 'Felicidad' | 'Motivación' | 'Tristeza' | 'Ansiedad' | 'Frustración' | 'Cansancio' | 'Sin registro';

type EmotionPreviewColumn = {
  key: string;
  cells: EmotionName[];
};

const EMOTION_COLORS: Record<EmotionName, string> = {
  Calma: '#2ECC71',
  Felicidad: '#F1C40F',
  Motivación: '#9B59B6',
  Tristeza: '#3498DB',
  Ansiedad: '#E74C3C',
  Frustración: '#8D6E63',
  Cansancio: '#16A085',
  'Sin registro': '#555555'
};

const EMOTION_PREVIEW_COLUMNS: EmotionPreviewColumn[] = [
  { key: 'w1', cells: ['Calma', 'Motivación', 'Felicidad', 'Motivación', 'Cansancio', 'Felicidad', 'Sin registro'] },
  { key: 'w2', cells: ['Calma', 'Calma', 'Felicidad', 'Motivación', 'Calma', 'Cansancio', 'Sin registro'] },
  { key: 'w3', cells: ['Motivación', 'Motivación', 'Felicidad', 'Calma', 'Calma', 'Tristeza', 'Frustración'] },
  { key: 'w4', cells: ['Calma', 'Motivación', 'Felicidad', 'Motivación', 'Calma', 'Calma', 'Motivación'] },
  { key: 'w5', cells: ['Motivación', 'Calma', 'Calma', 'Felicidad', 'Motivación', 'Calma', 'Calma'] },
  { key: 'w6', cells: ['Calma', 'Motivación', 'Motivación', 'Felicidad', 'Motivación', 'Calma', 'Calma'] },
  { key: 'w7', cells: ['Motivación', 'Calma', 'Calma', 'Felicidad', 'Motivación', 'Calma', 'Calma'] },
  { key: 'w8', cells: ['Calma', 'Motivación', 'Felicidad', 'Motivación', 'Calma', 'Calma', 'Motivación'] }
];
const EMOTION_PREVIEW_TOTAL_COLUMNS = 18;
const EMOTION_PREVIEW_PADDED_COLUMNS: EmotionPreviewColumn[] = [
  ...EMOTION_PREVIEW_COLUMNS,
  ...Array.from({ length: Math.max(0, EMOTION_PREVIEW_TOTAL_COLUMNS - EMOTION_PREVIEW_COLUMNS.length) }, (_, index) => ({
    key: `empty-${index + 1}`,
    cells: Array.from({ length: 7 }, () => 'Sin registro' as const)
  }))
];

const EMOTION_PREVIEW_SUMMARY = { emotion: 'Motivación' as const, count: 6 };
const EMOTION_PREVIEW_LEGEND: EmotionName[] = ['Calma', 'Felicidad', 'Motivación', 'Tristeza', 'Ansiedad', 'Frustración', 'Cansancio'];

const ENERGY_PREVIEW = [
  { label: 'HP', percent: 76, delta: 8 },
  { label: 'Mood', percent: 64, delta: 3 },
  { label: 'Focus', percent: 88, delta: 6 }
] as const;

const MISSION_PREVIEW_ITEMS = [
  { title: 'Daily Quest: Dormir 7h', tag: 'Body', reward: '+120 XP', status: { es: 'En progreso', en: 'In progress' } },
  { title: 'Reflexión nocturna', tag: 'Soul', reward: '+80 XP', status: { es: 'Checklist', en: 'Checklist' } },
  { title: 'Boss: Focus AM', tag: 'Mind', reward: '+160 XP', status: { es: '2/3 completado', en: '2/3 complete' } }
] as const;

const TASKS_PREVIEW_ITEMS = [
  { title: 'Dormir 8hs', tag: 'Sueño', progress: 2, total: 3 },
  { title: 'Cena antes de las 22hs', tag: 'Nutrición', progress: 2, total: 3 },
  { title: '10.000 pasos / Correr', tag: 'Movilidad', progress: 1, total: 3 }
] as const;

const AVATAR_MODES = [
  { src: '/LowMood.jpg', label: 'Low' },
  { src: '/Chill-Mood.jpg', label: 'Chill' },
  { src: '/FlowMood.jpg', label: 'Flow' },
  { src: '/Evolve-Mood.jpg', label: 'Evolve' }
] as const;


const MODE_VISUALS: Record<Language, Record<Mode['id'], ModeVisual>> = {
  en: {
    low: {
      avatarVideo: '/avatars/low-basic.mp4',
      avatarImage: '/LowMood.jpg',
      avatarAlt: 'Low mode avatar with a resting facial expression.',
      avatarLabel: 'Your avatar mirrors your energy'
    },
    chill: {
      avatarVideo: '/avatars/chill-basic.mp4',
      avatarImage: '/Chill-Mood.jpg',
      avatarAlt: 'Chill mode avatar with a calm expression.',
      avatarLabel: 'Your avatar mirrors your energy'
    },
    flow: {
      avatarVideo: '/avatars/flow-basic.mp4',
      avatarImage: '/FlowMood.jpg',
      avatarAlt: 'Flow mode avatar in action with a focused expression.',
      avatarLabel: 'Your avatar mirrors your energy'
    },
    evolve: {
      avatarVideo: '/avatars/evolve-basic.mp4',
      avatarImage: '/Evolve-Mood.jpg',
      avatarAlt: 'Evolve mode avatar with a determined expression.',
      avatarLabel: 'Your avatar mirrors your energy'
    }
  },
  es: {
    low: {
      avatarVideo: '/avatars/low-basic.mp4',
      avatarImage: '/LowMood.jpg',
      avatarAlt: 'Avatar del modo Low con expresión de descanso.',
      avatarLabel: 'Tu avatar refleja cómo estás hoy'
    },
    chill: {
      avatarVideo: '/avatars/chill-basic.mp4',
      avatarImage: '/Chill-Mood.jpg',
      avatarAlt: 'Avatar del modo Chill con expresión de calma.',
      avatarLabel: 'Tu avatar refleja cómo estás hoy'
    },
    flow: {
      avatarVideo: '/avatars/flow-basic.mp4',
      avatarImage: '/FlowMood.jpg',
      avatarAlt: 'Avatar del modo Flow en movimiento y enfocado.',
      avatarLabel: 'Tu avatar refleja cómo estás hoy'
    },
    evolve: {
      avatarVideo: '/avatars/evolve-basic.mp4',
      avatarImage: '/Evolve-Mood.jpg',
      avatarAlt: 'Avatar del modo Evolve con expresión determinada.',
      avatarLabel: 'Tu avatar refleja cómo estás hoy'
    }
  }
};

function LanguageSwitch({ value, onChange }: { value: Language; onChange: (language: Language) => void }) {
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
    <div ref={dropdownRef} className="lv2-lang-toggle" role="group" aria-label="Language selector">
      <button
        type="button"
        className="lv2-lang-button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="lv2-lang-button-label">{currentOption.label}</span>
        <span className="lv2-lang-caret" aria-hidden>▾</span>
      </button>

      <div className="lv2-lang-menu" role="listbox" hidden={!isOpen}>
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

function DashboardXpVisual({ compact = false, language = 'es' }: { compact?: boolean; language?: Language }) {
  const progressPercent = 57;
  const progressLabel = `${progressPercent}%`;
  const levelLabel = '16';
  const xpTotalLabel = '3.177';
  const xpToNextMessage =
    language === 'es' ? '✨ Te faltan 101 XP para el próximo nivel' : '✨ You need 101 XP for the next level';
  const ariaValueText = language === 'es' ? `${progressLabel} completado` : `${progressLabel} complete`;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-5'}>
      <div className={`lv2-xp-row ${compact ? 'lv2-xp-row--compact' : ''}`}>
        <div className="lv2-xp-metric">
          <span className={`leading-none ${compact ? 'text-[1.24em]' : 'text-[2.1em]'}`}>🏆</span>
          <div className="flex flex-col">
            <span className={`font-semibold text-slate-50 ${compact ? 'text-[0.86rem]' : 'text-4xl sm:text-5xl'}`}>{xpTotalLabel}</span>
            <span className={`font-semibold uppercase tracking-[0.18em] text-slate-400 ${compact ? 'text-[7.15px]' : 'text-[11px]'}`}>
              Total XP
            </span>
          </div>
        </div>
        <div className="lv2-xp-metric">
          <span className={`leading-none ${compact ? 'text-[1.24em]' : 'text-[2.1em]'}`}>🎯</span>
          <div className="flex flex-col">
            <span className={`font-semibold text-slate-50 ${compact ? 'text-[0.86rem]' : 'text-4xl sm:text-5xl'}`}>{levelLabel}</span>
            <span className={`font-semibold uppercase tracking-[0.18em] text-slate-400 ${compact ? 'text-[7.15px]' : 'text-[11px]'}`}>
              Nivel
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <p className={`font-semibold uppercase tracking-[0.18em] text-slate-400 ${compact ? 'text-[7.15px]' : 'text-[11px]'}`}>
          Progreso
        </p>
        <div
          className={`relative ${compact ? 'h-[20px]' : 'h-6 sm:h-[30px]'} w-full overflow-hidden rounded-full border border-white/5 bg-slate-950/60 shadow-[inset_0_2px_8px_rgba(8,15,40,0.6)]`}
          role="progressbar"
          aria-label="Progreso hacia el próximo nivel"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
          aria-valuetext={ariaValueText}
        >
          <div className="absolute inset-0" aria-hidden>
            <div className="h-full bg-gradient-to-r from-indigo-400/20 via-fuchsia-400/25 to-amber-300/20" />
          </div>
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-amber-300 transition-[width] duration-500 ease-out progress-fill--typing"
            style={{ width: `${progressPercent}%` }}
          />
          <span
            className={`absolute inset-0 flex items-center justify-center font-semibold uppercase tracking-[0.18em] text-slate-950 drop-shadow-[0_1px_2px_rgba(255,255,255,0.45)] ${
              compact ? 'text-[7.15px]' : 'text-[11px]'
            }`}
          >
            {progressLabel}
          </span>
        </div>
        {!compact && <p className="text-sm text-slate-300">{xpToNextMessage}</p>}
      </div>
    </div>
  );
}

function EnergyMeterPreview({
  label,
  percent,
  deltaPct,
  highlight = false,
  compact = false
}: {
  label: 'HP' | 'Mood' | 'Focus';
  percent: number;
  deltaPct?: number;
  highlight?: boolean;
  compact?: boolean;
}) {
  const clamped = Math.max(0, Math.min(percent, 100));
  const width = clamped <= 4 ? 4 : clamped;
  const hasDelta = typeof deltaPct === 'number';
  const deltaLabel = hasDelta ? `${deltaPct >= 0 ? '+' : ''}${deltaPct}%` : null;
  const deltaColor =
    typeof deltaPct === 'number'
      ? deltaPct < 0
        ? 'text-rose-300'
        : deltaPct > 0
          ? 'text-emerald-200'
          : 'text-slate-200'
      : 'text-slate-200';
  const gradient =
    label === 'HP'
      ? 'from-cyan-200 via-sky-300 to-blue-400'
      : label === 'Mood'
        ? 'from-rose-200 via-pink-300 to-fuchsia-400'
        : 'from-indigo-200 via-violet-300 to-purple-400';

  return (
    <div className={`space-y-2 ${compact ? 'text-xs' : ''}`}>
      <div className="flex items-center justify-between">
        <span
          className={`text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 ${highlight ? 'drop-shadow-[0_0_6px_rgba(16,185,129,0.45)]' : ''}`}
        >
          {label}
        </span>
        <span className="rounded-full bg-slate-950/90 px-2 py-0.5 text-[11px] font-semibold text-slate-100 shadow-sm">
          {clamped}%
        </span>
      </div>
      <div className="relative h-4 w-full overflow-hidden rounded-full border border-white/5 bg-slate-900/40 shadow-[inset_0_1px_1px_rgba(15,23,42,0.45)] sm:h-5">
        <div
          className={`relative h-full rounded-full bg-gradient-to-r ${gradient} transition-[width] duration-500 ease-out progress-fill--typing`}
          style={{ width: `${width}%`, minWidth: clamped === 0 ? '1.5rem' : undefined }}
        />
      </div>
      {deltaLabel ? (
        <p className={`text-[12px] font-medium leading-tight ${deltaColor}`}>{deltaLabel}</p>
      ) : null}
    </div>
  );
}

function DailyEnergyPreview({ compact = false, language = 'es' }: { compact?: boolean; language?: Language }) {
  return (
    <div className="space-y-4">
      {!compact && (
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
          {language === 'es' ? 'Comparado con tu semana anterior' : 'Compared to your previous week'}
        </p>
      )}
      <EnergyMeterPreview label="HP" percent={ENERGY_PREVIEW[0].percent} deltaPct={ENERGY_PREVIEW[0].delta} highlight compact={compact} />
      <EnergyMeterPreview label="Mood" percent={ENERGY_PREVIEW[1].percent} deltaPct={ENERGY_PREVIEW[1].delta} compact={compact} />
      <EnergyMeterPreview label="Focus" percent={ENERGY_PREVIEW[2].percent} deltaPct={ENERGY_PREVIEW[2].delta} compact={compact} />
    </div>
  );
}

function EmotionHeatmapPreview({ compact = false, language = 'es' }: { compact?: boolean; language?: Language }) {
  const gridStyle = {
    '--column-count': EMOTION_PREVIEW_PADDED_COLUMNS.length,
    '--cell': compact ? '10px' : '12px',
    '--cell-gap': '5px'
  } as CSSProperties;

  return (
    <div className="space-y-3" data-emotion-card="heatmap">
      <div id="emotionChart">
        <div className="emotion-chart-surface">
          <div className="grid-box" style={gridStyle}>
            <div className="emotion-grid--weekcols">
              {EMOTION_PREVIEW_PADDED_COLUMNS.map((column, columnIndex) => (
                <div key={column.key} className="emotion-col" style={{ gridColumn: `${columnIndex + 1}` }}>
                  {column.cells.map((cell, cellIndex) => (
                    <div
                      key={`${column.key}-${cellIndex}`}
                      className="emotion-cell"
                      style={{ backgroundColor: EMOTION_COLORS[cell] }}
                      title={cell}
                      aria-label={`${cell} • día ${cellIndex + 1}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {!compact && (
        <div className="summary-inner w-full rounded-2xl border border-white/10 bg-white/5 p-3 text-left sm:p-4" data-emotion-card="summary">
          <div className="emotion-highlight-indicator h-10 w-10 shrink-0 rounded-full" style={{ backgroundColor: EMOTION_COLORS[EMOTION_PREVIEW_SUMMARY.emotion] }} />
          <div className="summary-content">
            <span className="summary-title text-slate-100">{EMOTION_PREVIEW_SUMMARY.emotion}</span>
            <span className="summary-description text-sm text-slate-100 opacity-70">
              {language === 'es'
                ? `Emoción más frecuente en las últimas semanas (${EMOTION_PREVIEW_SUMMARY.count} ${
                    EMOTION_PREVIEW_SUMMARY.count === 1 ? 'registro' : 'registros'
                  })`
                : `Most frequent emotion in recent weeks (${EMOTION_PREVIEW_SUMMARY.count} ${
                    EMOTION_PREVIEW_SUMMARY.count === 1 ? 'log' : 'logs'
                  })`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function MissionsPreview({ compact = false, language = 'es' }: { compact?: boolean; language?: Language }) {
  return (
    <div className="space-y-3">
      {!compact && (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          {language === 'es' ? 'Misiones activas' : 'Active missions'}
        </p>
      )}
      <div className="lv2-mission-list">
        {MISSION_PREVIEW_ITEMS.map((mission) => (
          <div key={mission.title} className="lv2-mission-chip">
            <div className="lv2-mission-main">
              <p className="lv2-mission-title">{mission.title}</p>
              <div className="lv2-mission-tags">
                <span className="lv2-pill">{mission.tag}</span>
                <span className="lv2-pill ghost">{mission.status[language]}</span>
              </div>
            </div>
            <div className="lv2-mission-reward">{mission.reward}</div>
          </div>
        ))}
      </div>
      {!compact && (
        <p className="text-xs text-slate-300">
          {language === 'es' ? 'Cada misión se conecta a tus rachas y XP real.' : 'Each mission ties into your streaks and real XP.'}
        </p>
      )}
    </div>
  );
}

function RadarChartPreview() {
  return (
    <div className="lv2-radar-chart">
      <svg viewBox="-10 -10 220 220" role="img" aria-label="Radar chart preview">
        <defs>
          <linearGradient id="lv2-radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.45" />
          </linearGradient>
        </defs>
        {[20, 40, 60, 80].map((radius) => (
          <circle key={radius} cx="100" cy="100" r={radius} className="lv2-radar-ring" />
        ))}
        {Array.from({ length: 8 }).map((_, index) => {
          const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2;
          return (
            <line
              key={index}
              x1="100"
              y1="100"
              x2={100 + Math.cos(angle) * 80}
              y2={100 + Math.sin(angle) * 80}
              className="lv2-radar-axis"
            />
          );
        })}
        <polygon
          points="100,36 134,64 158,100 138,136 100,150 70,132 46,100 70,66"
          fill="url(#lv2-radar-fill)"
          stroke="#93c5fd"
          strokeWidth="2"
        />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => {
          const angle = (Math.PI * 2 * index) / 8 - Math.PI / 2;
          return <circle key={index} cx={100 + Math.cos(angle) * 64} cy={100 + Math.sin(angle) * 64} r="4" className="lv2-radar-node" />;
        })}
      </svg>
    </div>
  );
}

function EmotionChartPreview({ language = 'es' }: { language?: Language }) {
  const gridStyle = {
    '--column-count': EMOTION_PREVIEW_PADDED_COLUMNS.length,
    '--cell': '10px',
    '--cell-gap': '5px'
  } as CSSProperties;

  return (
    <div className="lv2-emotion-card">
      <div className="lv2-emotion-legend lv2-emotion-legend--dashboard">
        {EMOTION_PREVIEW_LEGEND.map((emotion) => (
          <span key={emotion} className="lv2-emotion-legend-item">
            <span className="lv2-emotion-legend-swatch" style={{ backgroundColor: EMOTION_COLORS[emotion] }} />
            <span>{emotion}</span>
          </span>
        ))}
      </div>
      <div className="lv2-emotion-heatmap" data-emotion-card="heatmap">
        <div id="emotionChart">
          <div className="emotion-chart-surface">
            <div className="grid-box" style={gridStyle}>
              <div className="emotion-grid--weekcols">
                {EMOTION_PREVIEW_PADDED_COLUMNS.map((column, columnIndex) => (
                  <div key={column.key} className="emotion-col" style={{ gridColumn: `${columnIndex + 1}` }}>
                    {column.cells.map((cell, cellIndex) => (
                      <div
                        key={`${column.key}-${cellIndex}`}
                        className="emotion-cell"
                        style={{ backgroundColor: EMOTION_COLORS[cell] }}
                        title={cell}
                        aria-label={`${cell} • día ${cellIndex + 1}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StreaksPreview({ language = 'es' }: { language?: Language }) {
  return (
    <div className="lv2-streaks">
      <div className="lv2-streaks-tabs">
        <span className="active">🔥 Body</span>
        <span>🧠 Mind</span>
        <span>🏵️ Soul</span>
      </div>
      <div className="lv2-streaks-top">
        <p className="lv2-streaks-label">
          {language === 'es' ? 'Top streaks' : 'Top streaks'}
          <span className="lv2-streaks-label-sub">
            {language === 'es' ? '— días consecutivos sin cortar' : '— consecutive days without breaks'}
          </span>
        </p>
        <p className="lv2-streaks-empty">
          {language === 'es' ? 'Todavía no hay rachas destacadas.' : 'No highlighted streaks yet.'}
        </p>
      </div>
      <TasksPreview language={language} />
    </div>
  );
}

function TasksPreview({ language = 'es' }: { language?: Language }) {
  return (
    <div className="lv2-tasks">
      <div className="lv2-tasks-tabs">
        <span>SEM</span>
        <span className="active">MES</span>
        <span>3M</span>
      </div>
      <p className="lv2-tasks-label">{language === 'es' ? 'Todas las tareas' : 'All tasks'}</p>
      <div className="lv2-tasks-list">
        {TASKS_PREVIEW_ITEMS.map((task) => (
          <div key={task.title} className="lv2-task-item">
            <div>
              <p className="lv2-task-title">{task.title}</p>
              <span className="lv2-task-tag">{task.tag}</span>
            </div>
            <div className="lv2-task-progress">
              <span style={{ width: `${(task.progress / task.total) * 100}%` }} />
              <p>
                {task.progress}/{task.total}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HighlightVisual({ visual, language }: { visual: Highlight['visual']; language: Language }) {
  if (visual === 'xp') return <DashboardXpVisual compact language={language} />;
  if (visual === 'energy') return <DailyEnergyPreview compact language={language} />;
  if (visual === 'emotion') return <EmotionHeatmapPreview compact language={language} />;
  return <MissionsPreview compact language={language} />;
}

export default function LandingV2Page() {
  const { userId } = useAuth();
  const isSignedIn = Boolean(userId);
  const [language, setLanguage] = useState<Language>('en');
  const copy = t[language];
  const heroTitle =
    language === 'es'
      ? { lead: 'Convierte la experiencia en hábitos.', highlight: 'Convierte los hábitos en camino' }
      : { lead: 'Turn experience into habits.', highlight: 'Turn habits into your path' };
  const heroMeta = useMemo(
    () =>
      language === 'es'
        ? ['Setup <3 minutos', 'Dashboard real + XP', 'Modos Low / Chill / Flow / Evolve']
        : ['Setup <3 minutes', 'Live XP dashboard', 'Modes: Low · Chill · Flow · Evolve'],
    [language]
  );

  const primaryCta = useMemo(
    () => (isSignedIn ? { label: 'Go to dashboard', to: '/dashboard' } : { label: copy.hero.cta, to: '/intro-journey' }),
    [copy.hero.cta, isSignedIn]
  );
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [activeModeIndex, setActiveModeIndex] = useState(0);
  const modesTrackId = useId();
  const modesTrackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAvatarIndex((current) => (current + 1) % AVATAR_MODES.length);
    }, 2600);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('color-scheme', theme);
  }, [theme]);

  useEffect(() => {
    const track = modesTrackRef.current;
    if (!track) return;

    const cards = Array.from(track.querySelectorAll<HTMLElement>('.lv2-mode-mobile-slide'));
    if (!cards.length) return;

    const updateActiveMode = () => {
      const closestIndex = cards.reduce(
        (closest, card, index) => {
          const distance = Math.abs(card.offsetLeft - track.scrollLeft);
          return distance < closest.distance ? { index, distance } : closest;
        },
        { index: 0, distance: Number.POSITIVE_INFINITY }
      ).index;

      setActiveModeIndex((current) => (current === closestIndex ? current : closestIndex));
    };

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateActiveMode();
      });
    };

    track.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      track.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [language]);

  useEffect(() => {
    setActiveModeIndex(0);
    const track = modesTrackRef.current;
    if (!track) return;
    track.scrollTo({ left: 0, behavior: 'auto' });
  }, [language]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const modeCount = copy.modes.items.length;

  const selectMode = (index: number, options?: { syncMobile?: boolean }) => {
    setActiveModeIndex(index);

    if (!options?.syncMobile) return;

    const track = modesTrackRef.current;
    if (!track) return;

    const cards = track.querySelectorAll<HTMLElement>('.lv2-mode-mobile-slide');
    const target = cards[index];
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const getWrappedMode = (index: number) => (index + modeCount) % modeCount;
  const prevModeIndex = getWrappedMode(activeModeIndex - 1);
  const nextModeIndex = getWrappedMode(activeModeIndex + 1);
  const activeMode = copy.modes.items[activeModeIndex];
  const activeVisual = MODE_VISUALS[language][activeMode.id];

  return (
    <div className="landing-v2" data-theme={theme}>
      <header className="lv2-nav">
        <Link className="lv2-brand" to="/landing-v2" aria-label="Innerbloom — Landing V2">
          <img src="/IB-COLOR-LOGO.png" alt="Innerbloom" className="lv2-logo" width={40} height={40} loading="lazy" />
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
          <button type="button" className="lv2-theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
          <LanguageSwitch value={language} onChange={setLanguage} />
          <Link className={`${BUTTON_VARIANTS.primary} lv2-nav-cta`} to={primaryCta.to}>
            {primaryCta.label}
          </Link>
        </div>
      </header>

      <main>
        <section className="lv2-hero" id="hero">
          <FluidGradientBackground className="lv2-hero-fluid">
            <div className="lv2-hero-content">
              <div className="lv2-container lv2-hero-copy">
                <p className="lv2-kicker">Habits • Gamification</p>
                <h1>
                  {heroTitle.lead}{' '}
                  <span className="lv2-title-grad">{heroTitle.highlight}</span>
                </h1>
                <p className="lv2-sub">{copy.hero.subtitle}</p>
                <div className="lv2-hero-meta" aria-hidden="true">
                  {heroMeta.map((item) => (
                    <span key={item} className="lv2-meta-pill">
                      {item}
                    </span>
                  ))}
                </div>
                <div className="lv2-cta-row center">
                  <Link className={BUTTON_VARIANTS.primary} to={primaryCta.to}>
                    {primaryCta.label}
                  </Link>
                  <a className={BUTTON_VARIANTS.ghost} href="#highlights">
                    {copy.hero.secondary}
                  </a>
                </div>
                <p className="lv2-support">{copy.hero.supporting}</p>
                <p className="lv2-support">
                  {language === 'es'
                    ? 'No es solo un dashboard: es una herramienta de mejora de hábitos gamificada.'
                    : 'Not just a dashboard: a gamified habit-improvement system.'}
                </p>
              </div>
              <div className="lv2-hero-dashboard">
                <div className="lv2-dashboard-shell">
                  <div className="lv2-dashboard-grid lv2-dashboard-grid--hero" aria-label="Demo del dashboard">
                    <div className="lv2-dashboard-column">
                      <Card
                        className="lv2-dashboard-card lv2-dashboard-card--square"
                        bodyClassName="lv2-dashboard-card-body"
                        title={language === 'es' ? 'Progreso general' : 'Overall progress'}
                        subtitle={language === 'es' ? 'Resumen de tu aventura' : 'Adventure summary'}
                        rightSlot={
                          <div className="lv2-dashboard-meta">
                            <span className="lv2-card-chip">FLOW</span>
                            <span className="lv2-info-dot" aria-hidden>
                              i
                            </span>
                          </div>
                        }
                      >
                        <DashboardXpVisual language={language} />
                      </Card>
                      <Card
                        className="lv2-dashboard-card lv2-avatar-card"
                        bodyClassName="lv2-dashboard-card-body"
                        title={language === 'es' ? 'Tu avatar' : undefined}
                      >
                        <img
                          className="lv2-avatar-image"
                          src={AVATAR_MODES[avatarIndex].src}
                          alt={`Avatar ${AVATAR_MODES[avatarIndex].label}`}
                        />
                      </Card>
                    </div>
                    <div className="lv2-dashboard-column">
                      <Card
                        className="lv2-dashboard-card lv2-dashboard-card--square lv2-dashboard-card--radar"
                        bodyClassName="lv2-dashboard-card-body"
                        title="Radar Chart"
                        subtitle={language === 'es' ? 'XP · total acumulado' : 'XP · total accumulated'}
                        rightSlot={
                          <div className="lv2-dashboard-meta">
                            <span className="lv2-card-chip lv2-card-chip--muted">
                              {language === 'es' ? 'Rasgos clave' : 'Key traits'}
                            </span>
                            <span className="lv2-info-dot" aria-hidden>
                              i
                            </span>
                          </div>
                        }
                      >
                        <RadarChartPreview />
                      </Card>
                      <Card
                        className="lv2-dashboard-card lv2-dashboard-card--emotion"
                        bodyClassName="lv2-dashboard-card-body"
                        title="💗 Emotion Chart"
                        subtitle={language === 'es' ? 'Últimos 6 meses' : 'Last 6 months'}
                      >
                        <EmotionChartPreview language={language} />
                      </Card>
                    </div>
                    <div className="lv2-dashboard-column">
                      <Card
                        className="lv2-dashboard-card lv2-dashboard-card--streaks"
                        bodyClassName="lv2-dashboard-card-body"
                        title="🔥 Streaks"
                        rightSlot={
                          <div className="lv2-dashboard-meta">
                            <span className="lv2-card-chip lv2-card-chip--outline">FLOW · 3×/WEEK</span>
                            <span className="lv2-info-dot" aria-hidden>
                              i
                            </span>
                          </div>
                        }
                      >
                        <StreaksPreview language={language} />
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FluidGradientBackground>
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
                  <HighlightVisual visual={item.visual} language={language} />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="lv2-section lv2-modes-carousel-section" id="modes">
          <div className="lv2-container" id="game-modes-selector">
            <div className="lv2-section-head">
              <p className="lv2-kicker">Adaptive</p>
              <h2>{copy.modes.title}</h2>
              <p className="lv2-sub">{copy.modes.description}</p>
            </div>

            <div className="lv2-modes-selector-shell" aria-live="polite">
              <button
                type="button"
                className="lv2-mode-mini mode-mini-left"
                onClick={() => selectMode(prevModeIndex, { syncMobile: true })}
              >
                <img src={MODE_VISUALS[language][copy.modes.items[prevModeIndex].id].avatarImage} alt="" aria-hidden />
                <span>{copy.modes.items[prevModeIndex].title}</span>
              </button>

              <article className={`lv2-card lv2-mode-card is-active mode-${activeMode.id}`}>
                <header className="lv2-mode-header">
                  <div className="lv2-mode-title">{activeMode.title}</div>
                  <p className="lv2-card-sub">{activeMode.benefit}</p>
                </header>

                <div className="lv2-mode-media">
                  <video
                    className="lv2-mode-video"
                    src={activeVisual.avatarVideo}
                    poster={activeVisual.avatarImage}
                    autoPlay
                    muted
                    loop
                    playsInline
                    aria-label={activeVisual.avatarAlt}
                  />
                  <div className="lv2-mode-media-overlay" aria-hidden="true" />
                  <span className="lv2-mode-media-badge">{activeVisual.avatarLabel}</span>
                </div>

                <ul className="lv2-bullets">
                  {activeMode.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>

                <button type="button" className="lv2-mode-cta">
                  {language === 'es' ? 'Seleccionar modo' : 'Select mode'}
                </button>
              </article>

              <button
                type="button"
                className="lv2-mode-mini mode-mini-right"
                onClick={() => selectMode(nextModeIndex, { syncMobile: true })}
              >
                <img src={MODE_VISUALS[language][copy.modes.items[nextModeIndex].id].avatarImage} alt="" aria-hidden />
                <span>{copy.modes.items[nextModeIndex].title}</span>
              </button>
            </div>

            <div
              id={modesTrackId}
              ref={modesTrackRef}
              className="lv2-modes-mobile-track"
              role="list"
              aria-label={language === 'es' ? 'Selector mobile de modos de juego' : 'Mobile game mode selector'}
            >
              {copy.modes.items.map((mode, index) => {
                const visual = MODE_VISUALS[language][mode.id];

                return (
                  <article key={mode.id} className={`lv2-card lv2-mode-card lv2-mode-mobile-slide mode-${mode.id}`} role="listitem">
                    <header className="lv2-mode-header">
                      <div className="lv2-mode-title">{mode.title}</div>
                      <p className="lv2-card-sub">{mode.benefit}</p>
                    </header>

                    <div className="lv2-mode-media">
                      <video
                        className="lv2-mode-video"
                        src={visual.avatarVideo}
                        poster={visual.avatarImage}
                        autoPlay
                        muted
                        loop
                        playsInline
                        aria-label={visual.avatarAlt}
                      />
                      <div className="lv2-mode-media-overlay" aria-hidden="true" />
                      <span className="lv2-mode-media-badge">{visual.avatarLabel}</span>
                    </div>

                    <ul className="lv2-bullets">
                      {mode.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>

                    <button type="button" className="lv2-mode-cta" onClick={() => selectMode(index)}>
                      {language === 'es' ? 'Seleccionar modo' : 'Select mode'}
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="lv2-modes-thumbs" role="tablist" aria-label={language === 'es' ? 'Elegir modo' : 'Choose mode'}>
              {copy.modes.items.map((mode, index) => (
                <button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeModeIndex}
                  className={`lv2-mode-thumb ${index === activeModeIndex ? 'is-active' : ''}`}
                  onClick={() => selectMode(index, { syncMobile: true })}
                >
                  {mode.title}
                </button>
              ))}
            </div>

            <div className="lv2-modes-dots" role="tablist" aria-label={language === 'es' ? 'Modo activo' : 'Active mode'}>
              {copy.modes.items.map((mode, index) => (
                <button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeModeIndex}
                  aria-label={`${mode.title} (${index + 1}/${modeCount})`}
                  className={`lv2-modes-dot ${index === activeModeIndex ? 'is-active' : ''}`}
                  onClick={() => selectMode(index, { syncMobile: true })}
                />
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
