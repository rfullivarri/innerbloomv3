import { type MutableRefObject, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { WeeklyWrappedPayload, WeeklyWrappedSection } from '../../lib/weeklyWrapped';

const ANIMATION_DELAY = 80;
const PILLAR_ICONS: Record<string, string> = {
  Body: '🫀',
  Mind: '🧠',
  Soul: '🏵️',
};

const HABIT_ICONS = ['🔥', '✨', '🌿', '⚡️'];

const PILLAR_GRADIENTS: Record<string, string> = {
  Mind: 'from-sky-400/30 via-sky-500/10 to-indigo-500/20',
  Body: 'from-emerald-400/30 via-lime-400/10 to-cyan-500/20',
  Soul: 'from-fuchsia-400/30 via-rose-400/10 to-amber-400/20',
};

const PILLAR_TEXT_TONES: Record<string, string> = {
  Mind: 'text-sky-50',
  Body: 'text-emerald-50',
  Soul: 'text-fuchsia-50',
};

type WeeklyWrappedModalProps = {
  payload: WeeklyWrappedPayload;
  onClose: () => void;
};

const GRADIENT_RING_CLASSES = [
  'from-emerald-400/40 via-cyan-400/10 to-indigo-500/40',
  'from-amber-400/40 via-rose-400/20 to-fuchsia-500/40',
  'from-sky-400/40 via-emerald-400/20 to-violet-500/40',
];

export function WeeklyWrappedModal({ payload, onClose }: WeeklyWrappedModalProps) {
  const [entered, setEntered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let bestMatch: { index: number; ratio: number } | null = null;

        for (const entry of entries) {
          const indexAttr = entry.target.getAttribute('data-index');
          if (!indexAttr) continue;
          const index = Number(indexAttr);
          const ratio = entry.intersectionRatio;

          if (!bestMatch || ratio > bestMatch.ratio) {
            bestMatch = { index, ratio };
          }
        }

        if (bestMatch) {
          setActiveIndex(bestMatch.index);
        }
      },
      {
        root: containerRef.current,
        threshold: [0.4, 0.55, 0.7],
      },
    );

    sectionRefs.current.forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const badges = useMemo(() => {
    const base = [
      payload.dataSource === 'mock' ? 'mock data' : 'datos reales',
      payload.variant === 'light' ? 'semana liviana' : 'semana completa',
    ];
    if (payload.summary.pillarDominant) {
      base.push(formatPillarLabel(payload.summary.pillarDominant));
    }
    return base;
  }, [payload]);

  const sectionsByKey = useMemo(() => {
    const map: Record<string, WeeklyWrappedSection> = {};
    for (const section of payload.sections) {
      map[section.key] = section;
    }
    return map;
  }, [payload.sections]);

  const habitsItems = (sectionsByKey.habits?.items ?? []).map((item) => ({
    ...item,
    icon: getPillarIcon(item.pillar),
  }));
  const pillarDominant = payload.summary.pillarDominant;
  const emotionHighlight = payload.emotions;
  const levelUp = payload.levelUp;
  const showLevelUp = levelUp?.happened;
  const habitsStartIndex = showLevelUp ? 2 : 1;
  const progressIndex = habitsStartIndex + 1;
  const emotionIndex = progressIndex + 1;
  const closingIndex = emotionIndex + 1;

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950/95 backdrop-blur" role="dialog" aria-modal>
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 left-6 h-64 w-64 animate-[spin_22s_linear_infinite] bg-[radial-gradient(circle_at_center,_rgba(99,179,237,0.18),_transparent_55%)] blur-2xl" />
        <div className="absolute bottom-12 right-10 h-72 w-72 animate-[spin_26s_linear_reverse_infinite] bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.16),_transparent_55%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_10%,rgba(110,231,183,0.12),transparent),radial-gradient(90%_80%_at_80%_20%,rgba(94,234,212,0.08),transparent),radial-gradient(80%_120%_at_40%_80%,rgba(192,132,252,0.12),transparent)]" />
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col px-2 py-4 sm:px-4 sm:py-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-50 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:border-emerald-300/60 hover:bg-emerald-400/30 hover:text-slate-950"
        >
          Cerrar
        </button>

        <div className="relative flex-1 overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/80 shadow-2xl shadow-emerald-500/15">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-emerald-500/5 to-slate-900/50" aria-hidden />
          <div
            className="relative h-full snap-y snap-mandatory overflow-y-auto scroll-smooth"
            ref={containerRef}
          >
            <SectionBlock
              title="Weekly Wrapped · Preview"
              accent={formatRange(payload.weekRange)}
              badges={badges}
              description={sectionsByKey.intro?.body ?? 'Tu semana está lista. Respirá y recorré tus logros.'}
              kicker={sectionsByKey.achievements?.accent ?? 'Impulso sostenido'}
              highlightText={sectionsByKey.achievements?.body}
              entered={entered}
              index={0}
              active={activeIndex === 0}
              registerSectionRef={(el) => (sectionRefs.current[0] = el)}
            />

            {showLevelUp ? (
              <LevelUpBlock
                levelUp={levelUp}
                index={1}
                entered={entered}
                active={activeIndex === 1}
                registerSectionRef={(el) => (sectionRefs.current[1] = el)}
              />
            ) : null}

            <HabitsBlock
              title={sectionsByKey.habits?.title ?? 'Hábitos constantes'}
              description={sectionsByKey.habits?.body ?? 'Estos hábitos mantuvieron tu semana.'}
              items={habitsItems.map((item, idx) => ({
                ...item,
                icon: item.icon || HABIT_ICONS[idx % HABIT_ICONS.length],
              }))}
              entered={entered}
              startIndex={habitsStartIndex}
              activeIndex={activeIndex}
              registerSectionRef={sectionRefs}
            />

            <ProgressBlock
              improvement={sectionsByKey.improvement}
              pillar={sectionsByKey.pillar}
              pillarDominant={pillarDominant}
              entered={entered}
              index={progressIndex}
              active={activeIndex === progressIndex}
              registerSectionRef={(el) => (sectionRefs.current[progressIndex] = el)}
            />

            <EmotionHighlightBlock
              emotionHighlight={emotionHighlight}
              entered={entered}
              index={emotionIndex}
              active={activeIndex === emotionIndex}
              registerSectionRef={(el) => (sectionRefs.current[emotionIndex] = el)}
            />

            <ClosingBlock
              message={sectionsByKey.closing?.body ?? 'Seguimos sumando: mañana vuelve el Daily Quest.'}
              accent={sectionsByKey.closing?.accent ?? 'Mañana hay más'}
              onClose={onClose}
              entered={entered}
              index={closingIndex}
              active={activeIndex === closingIndex}
              registerSectionRef={(el) => (sectionRefs.current[closingIndex] = el)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type SectionShellProps = {
  children: ReactNode;
  index: number;
  entered: boolean;
  active?: boolean;
  auraIndex?: number;
  registerSectionRef?: (el: HTMLDivElement | null) => void;
};

function SectionShell({ children, index, entered, active = false, auraIndex = 0, registerSectionRef }: SectionShellProps) {
  const delay = `${ANIMATION_DELAY * index}ms`;
  const auraClasses = GRADIENT_RING_CLASSES[auraIndex % GRADIENT_RING_CLASSES.length];
  return (
    <section
      className="relative flex min-h-[100dvh] snap-start items-center px-3 py-12 sm:px-8 sm:py-16"
      aria-live="polite"
      data-index={index}
      ref={registerSectionRef}
    >
      <div
        className={`relative w-full overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/60 p-7 shadow-xl shadow-emerald-500/15 transition duration-700 sm:p-10 ${
          entered ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
        } ${active ? 'scale-[1.01] shadow-emerald-500/30 ring-1 ring-emerald-300/50' : 'opacity-90'}`}
        style={{ transitionDelay: delay }}
      >
        <div className={`pointer-events-none absolute inset-0 opacity-70 blur-3xl ${`bg-gradient-to-br ${auraClasses}`}`} aria-hidden />
        <div className="relative z-10 space-y-5 sm:space-y-6">{children}</div>
      </div>
    </section>
  );
}

type SectionBlockProps = {
  title: string;
  accent: string;
  badges: string[];
  description: string;
  kicker: string;
  highlightText?: string;
  entered: boolean;
  index: number;
  active?: boolean;
  registerSectionRef?: (el: HTMLDivElement | null) => void;
};

function SectionBlock({
  title,
  accent,
  badges,
  description,
  kicker,
  highlightText,
  entered,
  index,
  active,
  registerSectionRef,
}: SectionBlockProps) {
  return (
    <SectionShell
      index={index}
      entered={entered}
      auraIndex={0}
      active={active}
      registerSectionRef={registerSectionRef}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">{title}</p>
          <h2 className="mt-1 text-3xl font-semibold text-slate-50 drop-shadow-[0_0_22px_rgba(16,185,129,0.4)]">{accent}</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-100">
            {badges.map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3 py-1 text-[10px] font-semibold text-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_10px_30px_rgba(16,185,129,0.25)]"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
        <div className="rounded-full border border-emerald-300/30 bg-emerald-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_10px_30px_rgba(16,185,129,0.25)]">
          Apertura
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[1.2fr,0.9fr] md:items-center">
        <div className="space-y-3 text-lg leading-relaxed text-slate-100">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-100">{kicker}</p>
          <p className="text-lg md:text-xl">{highlightText ?? 'Impulso listo para recorrer la semana.'}</p>
          <p className="text-base text-slate-200">{description}</p>
        </div>
        <div className="relative rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-400/20 via-cyan-400/10 to-indigo-500/20 p-5 text-slate-50 shadow-[0_20px_70px_rgba(16,185,129,0.25)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-50">Portada / bienvenida</p>
          <p className="mt-2 text-2xl font-semibold">Semana lista para celebrar 🎧</p>
          <p className="mt-3 text-sm text-emerald-50/90">Scrolleá para recorrer la historia completa.</p>
        </div>
      </div>
    </SectionShell>
  );
}

type HabitItem = { title: string; body: string; badge?: string; icon?: string; pillar?: string | null };

type HabitsBlockProps = {
  title: string;
  description: string;
  items: HabitItem[];
  entered: boolean;
  startIndex: number;
  activeIndex: number;
  registerSectionRef: MutableRefObject<(HTMLDivElement | null)[]>;
};

function HabitsBlock({ title, description, items, entered, startIndex, activeIndex, registerSectionRef }: HabitsBlockProps) {
  const slideLabel = `Slide ${startIndex + 1} · Ritmo constante`;
  return (
    <SectionShell
      index={startIndex}
      entered={entered}
      auraIndex={1}
      active={activeIndex === startIndex}
      registerSectionRef={(el) => (registerSectionRef.current[startIndex] = el)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">{slideLabel}</p>
          <h3 className="text-2xl font-semibold text-slate-50 drop-shadow-[0_0_18px_rgba(56,189,248,0.3)]">{title}</h3>
          <p className="mt-2 text-sm text-slate-200">{description}</p>
        </div>
        <span className="rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]">
          Hábitos constantes
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.length > 0 ? (
          items.map((item, idx) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/70 via-emerald-500/10 to-indigo-500/10 p-4 shadow-lg shadow-emerald-500/15 transition duration-700"
              style={{ transitionDelay: `${ANIMATION_DELAY * (startIndex + idx)}ms` }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-slate-50">
                  {item.icon ? <span className="text-xl" aria-hidden>{item.icon}</span> : null}
                  <p className="text-sm font-semibold">{item.title}</p>
                </div>
                {item.badge ? (
                  <span className="rounded-full border border-emerald-300/40 bg-emerald-500/25 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-slate-100">{item.body}</p>
            </div>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-white/15 bg-slate-900/70 p-4 text-sm text-slate-300">
            Sin hábitos destacados aún, pero la pista está lista para vos.
          </p>
        )}
      </div>
    </SectionShell>
  );
}

type LevelUpBlockProps = {
  levelUp: WeeklyWrappedPayload['levelUp'];
  entered: boolean;
  index: number;
  active?: boolean;
  registerSectionRef?: (el: HTMLDivElement | null) => void;
};

function LevelUpBlock({ levelUp, entered, index, active, registerSectionRef }: LevelUpBlockProps) {
  const levelLabel = levelUp.currentLevel ?? 'nuevo';
  const previousLabel = levelUp.previousLevel ?? Math.max(0, Number(levelLabel) - 1);

  return (
    <SectionShell
      index={index}
      entered={entered}
      auraIndex={2}
      active={active}
      registerSectionRef={registerSectionRef}
    >
      <div className="relative overflow-hidden rounded-3xl border border-transparent bg-slate-950/70 p-[2px]">
        <div className="absolute inset-0 animate-pulse bg-[conic-gradient(at_30%_40%,#a855f7,#22d3ee,#22c55e,#f59e0b,#f472b6,#22d3ee)] opacity-70 blur" />
        <div className="relative rounded-[26px] border border-white/10 bg-gradient-to-br from-slate-950/80 via-emerald-950/50 to-indigo-950/60 p-6 shadow-[0_20px_60px_rgba(34,197,94,0.2)]">
          <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-emerald-400/20 blur-3xl" aria-hidden />
          <div className="absolute -left-10 -bottom-10 h-36 w-36 rounded-full bg-sky-400/15 blur-3xl" aria-hidden />
          <div className="flex flex-col gap-4 text-slate-50 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-emerald-100">Slide especial · Level Up</p>
              <h3 className="text-3xl font-semibold drop-shadow-[0_0_30px_rgba(16,185,129,0.45)]">Subiste a Nivel {levelLabel}</h3>
              <p className="max-w-2xl text-sm text-emerald-50/90">
                {levelUp.forced
                  ? 'Mock activado para validar la celebración sin afectar métricas.'
                  : 'Semana con salto real: cada misión empujó tu progreso.'}
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-slate-200">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-semibold uppercase tracking-[0.18em] text-emerald-50">
                  +{levelUp.xpGained.toLocaleString('es-AR')} XP esta semana
                </span>
                <span className="rounded-full border border-white/15 bg-emerald-500/20 px-3 py-1 font-semibold uppercase tracking-[0.18em] text-emerald-50">
                  {previousLabel} → {levelLabel}
                </span>
              </div>
            </div>
            <div className="relative flex h-32 w-full max-w-xs items-center justify-center">
              <div className="absolute h-28 w-28 animate-[ping_2.4s_ease-out_infinite] rounded-full bg-emerald-400/30" aria-hidden />
              <div className="absolute h-24 w-24 animate-[pulse_3s_ease-in-out_infinite] rounded-full bg-sky-400/20" aria-hidden />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 text-center text-3xl font-bold leading-none text-slate-950 shadow-[0_0_40px_rgba(56,189,248,0.4)]">
                {levelLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

type ProgressBlockProps = {
  improvement?: WeeklyWrappedSection;
  pillar?: WeeklyWrappedSection;
  pillarDominant: string | null;
  entered: boolean;
  index: number;
  active?: boolean;
  registerSectionRef?: (el: HTMLDivElement | null) => void;
};

function ProgressBlock({ improvement, pillar, pillarDominant, entered, index, active, registerSectionRef }: ProgressBlockProps) {
  const pillarAura =
    pillarDominant && PILLAR_GRADIENTS[pillarDominant]
      ? PILLAR_GRADIENTS[pillarDominant]
      : 'from-emerald-400/25 via-cyan-400/10 to-indigo-500/20';
  const pillarTone = pillarDominant && PILLAR_TEXT_TONES[pillarDominant] ? PILLAR_TEXT_TONES[pillarDominant] : 'text-slate-50';
  const pillarIcon = getPillarIcon(pillarDominant);
  const slideLabel = `Slide ${index + 1} · Progreso y foco`;

  return (
    <SectionShell
      index={index}
      entered={entered}
      auraIndex={2}
      active={active}
      registerSectionRef={registerSectionRef}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">{slideLabel}</p>
          <h3 className="text-2xl font-semibold text-slate-50 drop-shadow-[0_0_18px_rgba(56,189,248,0.3)]">Progreso y foco</h3>
        </div>
        <span className="rounded-full border border-emerald-300/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]">
          Momentum 🔥
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/20 via-slate-900/80 to-indigo-500/10 p-4 shadow-lg shadow-emerald-500/20">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-50">Level up suave</p>
          <p className="mt-2 text-lg font-semibold text-slate-50">{improvement?.body ?? 'Mini mejora registrada. Seguís afinando tu ritmo.'}</p>
        </div>

        <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${pillarAura} p-4 shadow-lg shadow-emerald-500/20`}>
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-50">Pilar dominante</p>
          <div className="mt-2 flex items-center gap-2 text-lg font-semibold">
            {pillarIcon ? <span aria-hidden>{pillarIcon}</span> : null}
            <span className={pillarTone}>{pillar?.accent ?? pillarDominant ?? 'Mind / Body / Soul'}</span>
          </div>
          <p className="mt-1 text-sm text-slate-100">{pillar?.body ?? 'El foco de la semana te sostuvo. Seguimos apoyándonos ahí.'}</p>
        </div>
      </div>
    </SectionShell>
  );
}

type EmotionHighlightBlockProps = {
  emotionHighlight: WeeklyWrappedPayload['emotions'];
  entered: boolean;
  index: number;
  active?: boolean;
  registerSectionRef?: (el: HTMLDivElement | null) => void;
};

function EmotionHighlightBlock({ emotionHighlight, entered, index, active, registerSectionRef }: EmotionHighlightBlockProps) {
  const weeklyEmotion = emotionHighlight.weekly;
  const biweeklyEmotion = emotionHighlight.biweekly ?? weeklyEmotion;
  const weeklyColor = weeklyEmotion?.color ?? '#fbbf24';
  const biweeklyColor = biweeklyEmotion?.color ?? weeklyColor;
  const weeklyLabel = weeklyEmotion?.label ?? 'Sin emoción dominante';
  const weeklyMessage =
    weeklyEmotion?.weeklyMessage ?? 'Registrá tus emociones para detectar cuál lideró la semana.';
  const biweeklyLabel = biweeklyEmotion?.label ?? 'Seguimos observando';
  const biweeklyContext =
    biweeklyEmotion?.biweeklyContext ?? 'Con más registros vamos a mostrar la tendencia de los últimos 15 días.';
  const slideLabel = `Slide ${index + 1} · Highlight emocional`;

  return (
    <SectionShell
      index={index}
      entered={entered}
      auraIndex={1}
      active={active}
      registerSectionRef={registerSectionRef}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">{slideLabel}</p>
          <h3 className="text-2xl font-semibold text-slate-50 drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]">Emoción en foco</h3>
          <p className="mt-2 text-sm text-slate-200">Movimiento semanal y tendencia de los últimos 15 días.</p>
        </div>
        <span className="rounded-full border border-amber-200/40 bg-amber-400/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-900 shadow-[0_0_0_1px_rgba(251,191,36,0.35)]">
          Highlight
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-amber-400/25 via-orange-400/10 to-rose-500/20 p-4 shadow-lg shadow-amber-400/20">
          <p className="text-[11px] uppercase tracking-[0.2em] text-amber-50">Emoción que lideró la semana</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className="h-3 w-3 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.14)]"
              style={{ backgroundColor: weeklyColor }}
            />
            <p className="text-xl font-semibold text-slate-950 drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]">{weeklyLabel}</p>
            <span className="rounded-full bg-white/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-900">
              Semana · 7d
            </span>
          </div>
          <p className="mt-4 rounded-xl border border-white/10 bg-white/80 p-3 text-sm text-amber-900 shadow-inner shadow-amber-500/10">
            {weeklyMessage}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-emerald-500/10 p-4 shadow-lg shadow-emerald-500/15">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12">
              <span
                className="absolute inset-0 animate-ping rounded-full opacity-40"
                style={{ backgroundColor: biweeklyColor }}
                aria-hidden
              />
              <span
                className="absolute inset-2 rounded-full opacity-60"
                style={{ backgroundColor: `${biweeklyColor}66` }}
                aria-hidden
              />
              <span
                className="relative flex h-full w-full items-center justify-center rounded-full bg-white/90 text-xs font-semibold text-slate-900"
                style={{ color: biweeklyColor }}
              >
                15d
              </span>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-100">Emoción 15 días</p>
              <p className="text-lg font-semibold text-slate-50">{biweeklyLabel}</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-100">{biweeklyContext}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-200">
            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1">Semana actual</span>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-500/10 px-2 py-1">Últimos 15 días</span>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}

type ClosingBlockProps = {
  message: string;
  accent: string;
  onClose: () => void;
  entered: boolean;
  index: number;
  active?: boolean;
  registerSectionRef?: (el: HTMLDivElement | null) => void;
};

function ClosingBlock({ message, accent, onClose, entered, index, active, registerSectionRef }: ClosingBlockProps) {
  const slideLabel = `Slide ${index + 1} · Cierre`;
  return (
    <SectionShell
      index={index}
      entered={entered}
      auraIndex={0}
      active={active}
      registerSectionRef={registerSectionRef}
    >
      <div className="flex flex-col items-start gap-4 text-slate-50">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">{slideLabel}</p>
        <h3 className="text-3xl font-semibold drop-shadow-[0_0_22px_rgba(16,185,129,0.35)]">{accent}</h3>
        <p className="max-w-2xl text-lg leading-relaxed text-slate-100">{message}</p>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gradient-to-r from-emerald-400/90 to-cyan-400/90 px-5 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5"
          >
            Cerrar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/25 bg-white/10 px-5 py-2 text-sm font-semibold text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-300/50 hover:bg-emerald-400/20 hover:text-slate-950"
          >
            Seguir
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-emerald-300/30 bg-emerald-500/20 px-5 py-2 text-sm font-semibold text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-200/60 hover:bg-emerald-400/30 hover:text-slate-950"
          >
            Ir al Daily Quest
          </button>
        </div>
      </div>
    </SectionShell>
  );
}

function formatRange(range: WeeklyWrappedPayload['weekRange']): string {
  const start = new Date(range.start);
  const end = new Date(range.end);
  return `${start.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('es-AR', { month: 'short', day: 'numeric' })}`;
}

function getPillarIcon(pillar?: string | null): string {
  if (!pillar) return '';
  return PILLAR_ICONS[pillar] ?? '';
}

function formatPillarLabel(pillar: string): string {
  const icon = getPillarIcon(pillar);
  return icon ? `${icon} ${pillar}` : pillar;
}
