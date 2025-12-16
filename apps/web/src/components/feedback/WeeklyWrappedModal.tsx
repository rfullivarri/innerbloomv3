import { type MutableRefObject, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { WeeklyWrappedPayload, WeeklyWrappedSection } from '../../lib/weeklyWrapped';

const ANIMATION_DELAY = 80;
const PILLAR_ICONS: Record<string, string> = {
  Body: '🫀',
  Mind: '🧠',
  Soul: '🏵️',
};

const HABIT_ICON_SETS: Record<string, string[]> = {
  Body: ['🏃‍♂️', '💪', '🥗', '🔥'],
  Mind: ['📚', '🎯', '✍️', '🧩'],
  Soul: ['🌱', '🧘', '✨', '🌙'],
};

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

const ENERGY_METRIC_BY_PILLAR: Record<string, { label: 'HP' | 'FOCUS' | 'MOOD'; color: string }> = {
  Body: { label: 'HP', color: '#22c55e' },
  Mind: { label: 'FOCUS', color: '#38bdf8' },
  Soul: { label: 'MOOD', color: '#e879f9' },
};

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

  const sectionsByKey = useMemo(() => {
    const map: Record<string, WeeklyWrappedSection> = {};
    for (const section of payload.sections) {
      map[section.key] = section;
    }
    return map;
  }, [payload.sections]);

  const achievementsMetrics = extractSummaryMetrics(sectionsByKey.achievements?.body);

  const completions = payload.summary?.completions ?? achievementsMetrics?.completions ?? 0;
  const xpTotal = payload.summary?.xpTotal ?? achievementsMetrics?.xpTotal ?? 0;
  const hasAchievementStats = completions > 0 || xpTotal > 0 || Boolean(achievementsMetrics);

  const habitsItems = (sectionsByKey.habits?.items ?? [])
    .map((item, idx) => {
      const daysMatch = item.body?.match(/(\d+)\/7/);
      const daysActive = daysMatch ? Number.parseInt(daysMatch[1] ?? '0', 10) : undefined;
      return {
        ...item,
        icon: getHabitIcon(item.pillar, idx),
        daysActive,
      };
    })
    .slice(0, 5);
  const topHabitTitle = habitsItems[0]?.title;
  const topHabitPillarIcon = habitsItems[0]?.pillar ? getPillarIcon(habitsItems[0]?.pillar) : null;
  const pillarDominant = payload.summary.pillarDominant;
  const emotionHighlight = payload.emotions;
  const weeklyEmotion = emotionHighlight.weekly ?? emotionHighlight.biweekly;
  const levelUp = payload.levelUp;
  const showLevelUp = levelUp?.happened;
  const habitsStartIndex = showLevelUp ? 2 : 1;
  const progressIndex = habitsStartIndex + 1;
  const emotionIndex = progressIndex + 1;
  const closingIndex = emotionIndex + 1;

  const summaryChips = useMemo(
    () => [
      {
        id: 'range',
        label: formatRange(payload.weekRange),
        active: true,
        icon: '📅',
      },
      {
        id: 'mode',
        label: 'DATOS REALES',
        active: payload.dataSource === 'real',
      },
      weeklyEmotion
        ? {
            id: 'emotion',
            label: '',
            dotColor: weeklyEmotion.color,
            active: true,
            dotOnly: true,
          }
        : {
            id: 'emotion-empty',
            label: '',
            dotColor: '#94a3b8',
            active: false,
            dotOnly: true,
          },
      topHabitTitle || pillarDominant
        ? {
            id: 'streak',
            label: `🔥${topHabitPillarIcon || getPillarIcon(pillarDominant) || '🫀'}`,
            active: true,
          }
        : {
            id: 'streak-empty',
            label: '🔥🫀',
            active: false,
          },
    ],
    [payload.dataSource, payload.weekRange, topHabitPillarIcon, pillarDominant, topHabitTitle, weeklyEmotion],
  );

  const heroLine = useMemo(() => {
    const formattedCompletions = completions.toLocaleString('es-AR');
    const formattedXp = xpTotal.toLocaleString('es-AR');
    return `Esta semana completaste ${formattedCompletions} tareas y sumaste ${formattedXp} XP.`;
  }, [completions, xpTotal]);

  return (
    <div className="fixed inset-0 z-50 flex bg-slate-950/95 backdrop-blur" role="dialog" aria-modal>
      <div className="absolute inset-0" onClick={onClose} aria-hidden />

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 left-6 h-64 w-64 animate-[spin_22s_linear_infinite] bg-[radial-gradient(circle_at_center,_rgba(99,179,237,0.18),_transparent_55%)] blur-2xl" />
        <div className="absolute bottom-6 right-10 h-80 w-80 animate-[spin_26s_linear_reverse_infinite] bg-[radial-gradient(circle_at_center,_rgba(236,72,153,0.18),_transparent_55%)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_20%_10%,rgba(110,231,183,0.16),transparent),radial-gradient(90%_80%_at_80%_20%,rgba(94,234,212,0.12),transparent),radial-gradient(80%_120%_at_40%_80%,rgba(192,132,252,0.14),transparent)]" />
      </div>

      <div className="relative z-10 flex h-[100dvh] w-full flex-col">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-20 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-emerald-50 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:border-emerald-300/60 hover:bg-emerald-400/30 hover:text-slate-950"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
        >
          Cerrar
        </button>

        <div className="relative h-full w-full overflow-hidden">
          <div
            className="relative h-[100dvh] w-full snap-y snap-mandatory overflow-y-auto scroll-smooth"
            ref={containerRef}
          >
            <SectionBlock
              label={sectionsByKey.intro?.title ?? 'Weekly Wrapped · Preview'}
              headline={sectionsByKey.intro?.body ?? 'Tu semana, en movimiento'}
              badges={summaryChips}
              heroLine={heroLine}
              description={
                hasAchievementStats
                  ? undefined
                  : sectionsByKey.achievements?.body ??
                    'Completaste 0 tareas y sumaste 0 XP esta semana.'
              }
              kicker={sectionsByKey.achievements?.accent}
              stats={{
                completions,
                xpTotal,
                pillar: pillarDominant,
              }}
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
              title={sectionsByKey.habits?.title ?? 'Ritmo que se sostiene'}
              description={sectionsByKey.habits?.body ?? 'Estos hábitos aparecieron de forma consistente y mantuvieron tu semana en movimiento.'}
              items={habitsItems.map((item, idx) => ({
                ...item,
                icon: item.icon || getHabitIcon(item.pillar, idx),
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
              completions={completions}
              xpTotal={xpTotal}
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

/**
 * Layout contract
 * - WeeklyWrappedModal locks the viewport height with a scroll-snap stack (100dvh).
 * - Each SectionShell is full-bleed (100vw x 100dvh) with overflow hidden and an internal content scroller.
 * - Safe areas are handled in the content container to avoid clipping on devices with notches.
 */
function SectionShell({ children, index, entered, active = false, auraIndex = 0, registerSectionRef }: SectionShellProps) {
  const delay = `${ANIMATION_DELAY * index}ms`;
  const auraClasses = GRADIENT_RING_CLASSES[auraIndex % GRADIENT_RING_CLASSES.length];
  const safeAreaStyle = {
    paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)',
    paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
  };

  return (
    <section
      className="relative flex h-[100dvh] min-h-[100dvh] w-[100vw] flex-none snap-start overflow-hidden"
      aria-live="polite"
      data-index={index}
      ref={registerSectionRef}
    >
      <div className="absolute inset-0 bg-slate-950" aria-hidden />
      <div className={`pointer-events-none absolute inset-[-15%] bg-gradient-to-br opacity-80 blur-3xl ${auraClasses}`} aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_120%_at_30%_20%,rgba(16,185,129,0.14),transparent),radial-gradient(110%_110%_at_70%_80%,rgba(79,70,229,0.12),transparent)]" aria-hidden />

      <div
        className={`relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col px-5 transition duration-700 sm:px-10 ${
          entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        } ${active ? 'scale-[1.01]' : 'opacity-95'}`}
        style={{ transitionDelay: delay, ...safeAreaStyle }}
      >
        <div className="relative flex h-full flex-col overflow-hidden">
          <div className="relative flex flex-1 flex-col gap-6 overflow-y-auto">{children}</div>
        </div>
      </div>
    </section>
  );
}

type SectionBlockProps = {
  label: string;
  headline: string;
  badges: {
    id: string;
    label: string;
    icon?: string;
    dotColor?: string;
    active?: boolean;
    dotOnly?: boolean;
  }[];
  description?: string;
  kicker?: string;
  highlightText?: string;
  stats?: { completions: number; xpTotal: number; pillar: string | null };
  heroLine: string;
  entered: boolean;
  index: number;
  active?: boolean;
  registerSectionRef?: (el: HTMLDivElement | null) => void;
};

function SectionBlock({
  label,
  headline,
  badges,
  description,
  kicker,
  highlightText,
  stats,
  heroLine,
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
      <div className="flex h-full flex-col gap-8">
        <header className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-100">{label}</p>
          <div className="space-y-3">
            <h2 className="text-4xl font-semibold leading-tight text-slate-50 drop-shadow-[0_0_28px_rgba(16,185,129,0.35)] sm:text-5xl">
              {headline}
            </h2>
              <p className="text-lg text-emerald-50 sm:text-xl">{heroLine}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-emerald-50/90">
            {badges.map((badge) => (
              <span
                key={badge.id}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-semibold shadow-[0_0_0_1px_rgba(16,185,129,0.2),0_10px_30px_rgba(16,185,129,0.18)] ${
                  badge.active ? 'border border-emerald-300/40 bg-emerald-500/25 text-emerald-50' : 'border border-white/10 bg-white/5 text-slate-200'
                }`}
              >
                {badge.dotColor ? (
                  <span
                    className={`rounded-full ${badge.dotOnly ? 'h-4 w-4' : 'h-2.5 w-2.5'}`}
                    style={{ backgroundColor: badge.dotColor }}
                    aria-hidden
                  />
                ) : null}
                {badge.icon ? <span aria-hidden>{badge.icon}</span> : null}
                {badge.label ? <span>{badge.label}</span> : null}
              </span>
            ))}
          </div>
        </header>

          <div className="flex flex-1 flex-col justify-center gap-4 text-lg leading-relaxed text-slate-100">
            {stats ? (
              <WeeklyKPIHighlight completions={stats.completions} xpTotal={stats.xpTotal} pillar={stats.pillar} />
            ) : (
              <>
              {kicker ? <p className="text-sm uppercase tracking-[0.2em] text-emerald-100">{kicker}</p> : null}
              <p className="max-w-3xl text-lg text-slate-200 sm:text-xl">{description}</p>
              {highlightText ? (
                <p className="max-w-3xl text-lg font-semibold text-emerald-50 sm:text-xl">{highlightText}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </SectionShell>
  );
}

function WeeklyKPIHighlight({
  completions,
  xpTotal,
  pillar,
}: {
  completions: number;
  xpTotal: number;
  pillar: string | null;
}) {
  const formatter = new Intl.NumberFormat('es-AR');
  const pillarLabel = pillar ? formatPillarLabel(pillar) : 'modo mixto';
  const pillarNarrative = `Tu energía se movió principalmente en ${pillarLabel}.`;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/15 bg-gradient-to-br from-white/10 via-emerald-500/10 to-indigo-500/10 p-5 shadow-[0_20px_60px_rgba(8,47,73,0.42)] backdrop-blur">
        <div className="relative flex items-center gap-3 text-sm text-emerald-50">
          <p className="text-base font-semibold leading-snug text-slate-50">{pillarNarrative}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <KPIStat label="Tareas" value={formatter.format(completions)} suffix="completadas" />
        <KPIStat label="XP" value={formatter.format(xpTotal)} suffix="esta semana" highlight />
      </div>
    </div>
  );
}

function extractSummaryMetrics(
  text?: string | null,
): { completions: number; xpTotal: number } | null {
  if (!text) return null;

  const match = text.match(/Completaste\s+([\d\.]+)\s+tareas.*?sumaste\s+([\d\.]+)\s*XP/i);
  if (!match) return null;

  const completions = Number.parseInt(match[1]?.replace(/\./g, '') ?? '', 10);
  const xpTotal = Number.parseInt(match[2]?.replace(/\./g, '') ?? '', 10);

  if (!Number.isFinite(completions) || !Number.isFinite(xpTotal)) {
    return null;
  }

  return { completions, xpTotal };
}

function KPIStat({
  label,
  value,
  suffix,
  highlight = false,
}: {
  label: string;
  value: string;
  suffix?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 shadow-[0_20px_50px_rgba(12,74,110,0.35)] transition duration-500 ${
        highlight ? 'ring-1 ring-emerald-300/40' : ''
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-white/5 to-transparent opacity-80" aria-hidden />
      <div className="relative flex items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">{label}</p>
          <p className="text-4xl font-semibold leading-tight text-white sm:text-[44px]">
            {value}
            <span className="ml-2 text-base font-medium text-emerald-100">{suffix}</span>
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-2 py-1 text-lg" aria-hidden>
          {highlight ? '⚡️' : '✅'}
        </span>
      </div>
    </div>
  );
}

type HabitItem = { title: string; body: string; badge?: string; icon?: string; pillar?: string | null; daysActive?: number };

type HabitsBlockProps = {
  title: string;
  description: string;
  items: HabitItem[];
  entered: boolean;
  startIndex: number;
  activeIndex: number;
  registerSectionRef: MutableRefObject<(HTMLDivElement | null)[]>;
};

function getStreakCopy(daysActive?: number) {
  if (!daysActive || daysActive <= 0) return 'Hábito frágil';
  if (daysActive <= 2) return 'Hábito frágil';
  if (daysActive <= 5) return 'Hábito en construcción';
  return 'Hábito fuerte';
}

function HabitsBlock({ title, description, items, entered, startIndex, activeIndex, registerSectionRef }: HabitsBlockProps) {
  const slideLabel = 'CONSTANCIA';
  const headline = 'Constancia';
  const subline = description || 'Tus hábitos más firmes sostuvieron el ritmo.';
  return (
    <SectionShell
      index={startIndex}
      entered={entered}
      auraIndex={1}
      active={activeIndex === startIndex}
      registerSectionRef={(el) => (registerSectionRef.current[startIndex] = el)}
    >
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">{slideLabel}</p>
        <h3 className="text-2xl font-semibold text-slate-50 drop-shadow-[0_0_18px_rgba(56,189,248,0.3)]">{headline}</h3>
        <p className="text-sm text-emerald-50">{subline}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {items.length > 0 ? (
          items.map((item, idx) => (
            <div
              key={item.title}
              className="group rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-emerald-500/10 to-indigo-500/10 p-4 shadow-lg shadow-emerald-500/15 transition duration-700"
              style={{ transitionDelay: `${ANIMATION_DELAY * (startIndex + idx)}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 text-slate-50">
                  {item.icon ? <span className="text-xl" aria-hidden>{item.icon}</span> : null}
                  <p className="text-sm font-semibold leading-snug">{item.title}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2 text-[11px] uppercase tracking-[0.14em]">
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/30 bg-emerald-500/20 px-2 py-1 text-emerald-50 shadow-[0_0_0_1px_rgba(16,185,129,0.25)]">
                    🔥{getPillarIcon(item.pillar) || '🫀'} {item.daysActive ?? '–'}/7
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2 py-1 text-lg text-slate-100">
                    {getPillarIcon(item.pillar) || '🫀'}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-100">{getStreakCopy(item.daysActive)}</p>
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
  completions?: number;
  xpTotal?: number;
  entered: boolean;
  index: number;
  active?: boolean;
  registerSectionRef?: (el: HTMLDivElement | null) => void;
};

function ProgressBlock({
  improvement,
  pillar,
  pillarDominant,
  completions = 0,
  xpTotal = 0,
  entered,
  index,
  active,
  registerSectionRef,
}: ProgressBlockProps) {
  const pillarAura =
    pillarDominant && PILLAR_GRADIENTS[pillarDominant]
      ? PILLAR_GRADIENTS[pillarDominant]
      : 'from-emerald-400/25 via-cyan-400/10 to-indigo-500/20';
  const pillarTone = pillarDominant && PILLAR_TEXT_TONES[pillarDominant] ? PILLAR_TEXT_TONES[pillarDominant] : 'text-slate-50';
  const slideLabel = 'PROGRESO Y FOCO';
  const improvementStory = (improvement?.body ?? 'Mini mejora registrada. Seguís afinando tu ritmo.').split('. ')[0];
  const pillarLine = pillarDominant ? `${pillarDominant} mantuvo el pulso.` : 'Semana balanceada.';
  const energySnapshot = computeEnergySnapshot(pillarDominant, completions, xpTotal);
  const hasDelta = typeof energySnapshot.delta === 'number';
  const energyHeadline = hasDelta
    ? `${energySnapshot.metric.label} +${energySnapshot.delta}% vs semana anterior`
    : `Energía destacada: ${energySnapshot.metric.label} (${energySnapshot.current}%)`;

  return (
    <SectionShell
      index={index}
      entered={entered}
      auraIndex={2}
      active={active}
      registerSectionRef={registerSectionRef}
    >
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">{slideLabel}</p>
        <h3 className="text-2xl font-semibold text-slate-50 drop-shadow-[0_0_18px_rgba(56,189,248,0.3)]">Pequeños avances</h3>
        <p className="text-sm text-emerald-50">Tu semana avanzó con pasos cortos que sostienen tu energía.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-3 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-slate-900/80 to-indigo-500/10 p-5 shadow-lg shadow-emerald-500/25">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-50">Avance clave</p>
          <p className="text-lg font-semibold text-slate-50">{improvementStory}</p>
          <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-emerald-50">{pillarLine}</p>
          <div className={`rounded-2xl border border-white/10 bg-gradient-to-br ${pillarAura} px-4 py-3 text-sm shadow-inner shadow-emerald-500/20`}>
            <div className="flex items-center gap-2 text-base font-semibold">
              <span className={pillarTone}>{pillar?.accent ?? pillarDominant ?? 'Body / Mind / Soul'}</span>
            </div>
            <p className="mt-1 text-slate-100">{pillar?.body ?? 'El foco de la semana te sostuvo. Seguimos apoyándonos ahí.'}</p>
          </div>
        </div>

        <div className="space-y-3 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-emerald-500/15 p-5 shadow-lg shadow-emerald-400/20">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-emerald-100">
            <span>Daily Energy</span>
            <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-emerald-50">Energía que más creció</span>
          </div>
          <p className="text-sm font-semibold text-slate-50">{energyHeadline}</p>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="relative h-10 w-20 overflow-hidden rounded-xl border border-white/20 bg-slate-900/60">
              <div
                className="absolute inset-y-1 left-1 rounded-lg bg-gradient-to-r from-white/70 via-white/90 to-white"
                style={{
                  width: `${Math.max(12, Math.min(100, energySnapshot.current))}%`,
                  backgroundColor: `${energySnapshot.metric.color}dd`,
                }}
              />
              <div className="absolute inset-0 animate-pulse bg-white/5" aria-hidden />
            </div>
            <div className="flex flex-col text-sm text-emerald-50">
              <span className="font-semibold">{energySnapshot.metric.label}</span>
              <span className="text-xs text-emerald-100">Pulso diario en alza</span>
            </div>
          </div>
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
  const slideLabel = 'EMOCIÓN EN FOCO';

  return (
    <SectionShell
      index={index}
      entered={entered}
      auraIndex={1}
      active={active}
      registerSectionRef={registerSectionRef}
    >
      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-100">{slideLabel}</p>
        <h3 className="text-2xl font-semibold text-slate-50 drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]">Emoción en foco</h3>
        <p className="text-sm text-emerald-50">Movimiento emocional de la semana en un vistazo.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-br from-amber-200/15 via-amber-400/10 to-rose-400/15 p-5 shadow-lg shadow-amber-300/25">
          <div className="flex items-center gap-3">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold"
              style={{ backgroundColor: `${weeklyColor}33`, color: weeklyColor }}
              aria-hidden
            >
              ●
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-amber-50">Emoción dominante (7 días)</p>
              <p className="text-2xl font-semibold text-slate-900 drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]">{weeklyLabel}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/80 p-3 text-sm text-amber-900 shadow-inner shadow-amber-500/10">
            {weeklyMessage}
          </div>
        </div>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/80 via-slate-900/70 to-emerald-500/15 p-5 shadow-lg shadow-emerald-400/20">
          <div className="flex items-center gap-3">
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-semibold"
              style={{ backgroundColor: `${biweeklyColor}33`, color: biweeklyColor }}
              aria-hidden
            >
              ●
            </span>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-100">Tendencia emocional (15 días)</p>
              <p className="text-2xl font-semibold text-slate-50">{biweeklyLabel}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/5 p-3 text-sm text-slate-50 shadow-inner shadow-emerald-400/10">
            {biweeklyEmotion
              ? `En las últimas dos semanas tu energía se inclinó hacia ${biweeklyLabel.toLowerCase()}. Aprovechá ese envión.`
              : biweeklyContext}
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
  const slideLabel = 'CIERRE';
  return (
    <SectionShell
      index={index}
      entered={entered}
      auraIndex={0}
      active={active}
      registerSectionRef={registerSectionRef}
    >
      <div className="flex h-full flex-col items-center justify-center gap-10 text-center text-slate-50">
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-100">{slideLabel}</p>
          <h3 className="text-4xl font-semibold leading-tight drop-shadow-[0_0_28px_rgba(16,185,129,0.35)] sm:text-5xl">{accent}</h3>
          <p className="max-w-3xl text-xl leading-relaxed text-slate-100 sm:text-[22px]">{message}</p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-w-[220px] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 px-6 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:-translate-y-0.5 sm:w-auto"
          >
            Ir al Daily Quest
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full min-w-[220px] rounded-full border border-white/25 bg-white/10 px-6 py-3 text-base font-semibold text-emerald-50 transition hover:-translate-y-0.5 hover:border-emerald-300/50 hover:bg-emerald-400/20 hover:text-slate-950 sm:w-auto"
          >
            Cerrar
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

function getHabitIcon(pillar?: string | null, index = 0): string {
  if (!pillar) return HABIT_ICON_SETS.Body[index % HABIT_ICON_SETS.Body.length];
  const set = HABIT_ICON_SETS[pillar];
  if (!set || set.length === 0) {
    return HABIT_ICON_SETS.Body[index % HABIT_ICON_SETS.Body.length];
  }
  return set[index % set.length];
}

function getPillarIcon(pillar?: string | null): string {
  if (!pillar) return '';
  return PILLAR_ICONS[pillar] ?? '';
}

function formatPillarLabel(pillar: string): string {
  const icon = getPillarIcon(pillar);
  return icon ? `${icon} ${pillar}` : pillar;
}

function computeEnergySnapshot(pillarDominant: string | null, completions: number, xpTotal: number) {
  const metric = pillarDominant && ENERGY_METRIC_BY_PILLAR[pillarDominant]
    ? ENERGY_METRIC_BY_PILLAR[pillarDominant]
    : ENERGY_METRIC_BY_PILLAR.Body;
  const normalizedCompletionScore = Math.min(100, Math.round((completions / 14) * 100));
  const xpScore = Math.min(100, Math.round(xpTotal / 10));
  const current = Math.max(12, normalizedCompletionScore || xpScore || 0);

  return {
    metric,
    delta: null as number | null,
    current,
  };
}
