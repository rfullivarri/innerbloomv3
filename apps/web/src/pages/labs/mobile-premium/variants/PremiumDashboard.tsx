import { useEffect, useMemo, useRef, useState, type RefObject, type SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { useRequest } from '../../../../hooks/useRequest';
import {
  getEmotions,
  getUserDailyEnergy,
  getUserLevel,
  getUserStateTimeseries,
  getUserStreakPanel,
  getUserXpByTrait,
  type DailyEnergySnapshot,
  type EnergyTimeseriesPoint,
  type EmotionSnapshot,
  type ModerationStatus,
  type ModerationTracker,
  type ModerationTrackerType,
  type StreakPanelPillar,
  type StreakPanelTask,
  type TraitXpEntry,
} from '../../../../lib/api';
import { PremiumModerationCards } from './PremiumModerationCards';
import { buildPremiumRowsFromLocalOnboarding, type LocalOnboardingSnapshot } from '../localOnboardingBridge';
import { useMobilePremiumBasePath } from '../mobilePremiumRouting';
import { usePostLoginLanguage } from '../../../../i18n/postLoginLanguage';

const STREAK_PILLARS: StreakPanelPillar[] = ['Body', 'Mind', 'Soul'];

type DashboardTask = {
  id: string;
  name: string;
  stat: string;
  streakDays: number;
  weeklyDone: number;
  weeklyGoal: number;
  monthlyCount: number;
  monthWeeks: number[];
};

const FALLBACK_TASKS: DashboardTask[] = [
  { id: 'sleep', name: 'Dormir 8hs', stat: 'Sueño', streakDays: 12, weeklyDone: 2, weeklyGoal: 3, monthlyCount: 10, monthWeeks: [3, 3, 2, 1, 1] },
  { id: 'sugar', name: 'No dulces', stat: 'Nutrición', streakDays: 0, weeklyDone: 0, weeklyGoal: 3, monthlyCount: 0, monthWeeks: [0, 0, 0, 0, 0] },
  { id: 'water', name: 'Tomar agua', stat: 'Hidratación', streakDays: 4, weeklyDone: 2, weeklyGoal: 3, monthlyCount: 8, monthWeeks: [3, 3, 2, 0, 0] },
];

const FALLBACK_EMOTIONS: EmotionSnapshot[] = [
  ['2026-05-07', 'Calma'],
  ['2026-05-08', 'Felicidad'],
  ['2026-05-09', 'Motivación'],
  ['2026-05-10', 'Tristeza'],
  ['2026-05-11', 'Calma'],
  ['2026-05-12', 'Ansiedad'],
  ['2026-05-13', 'Motivación'],
  ['2026-05-14', 'Calma'],
  ['2026-05-15', 'Cansancio'],
  ['2026-05-16', 'Felicidad'],
  ['2026-05-17', 'Motivación'],
  ['2026-05-18', 'Calma'],
  ['2026-05-19', 'Frustración'],
  ['2026-05-20', 'Calma'],
  ['2026-05-21', 'Calma'],
].map(([date, mood]) => ({ date, mood }));

const FALLBACK_ENERGY_SERIES: EnergyTimeseriesPoint[] = [
  { date: '2026-05-20', Body: 76, Soul: 36, Mind: 51 },
  { date: '2026-05-21', Body: 70, Soul: 42, Mind: 48 },
  { date: '2026-05-22', Body: 78, Soul: 39, Mind: 56 },
  { date: '2026-05-23', Body: 73, Soul: 47, Mind: 52 },
  { date: '2026-05-24', Body: 68, Soul: 44, Mind: 49 },
  { date: '2026-05-25', Body: 80, Soul: 51, Mind: 46 },
  { date: '2026-05-26', Body: 77, Soul: 62, Mind: 45 },
  { date: '2026-05-27', Body: 74, Soul: 56, Mind: 42 },
];

const EMOTION_COLORS: Record<string, string> = {
  calma: '#5ee178',
  felicidad: '#f8c842',
  motivación: '#a463f2',
  motivacion: '#a463f2',
  tristeza: '#5d8df6',
  ansiedad: '#f05252',
  frustración: '#a89188',
  frustracion: '#a89188',
  cansancio: '#35b7ad',
};

const OVERVIEW_ICON = {
  streak: FlameIcon,
  attention: AttentionIcon,
  close: HabitCloseIcon,
} as const;

export function PremiumDashboard({
  backendUserId,
  gameMode,
  localXpTotal,
  localSnapshot,
  moderationTrackers,
  onboardingPreview = false,
  moderationPendingType,
  onCycleModeration,
  onModerationOpen,
  onModerationDetail,
  weeklyTarget,
}: {
  backendUserId: string | null;
  gameMode: string | null;
  localXpTotal?: number | null;
  localSnapshot?: LocalOnboardingSnapshot | null;
  weeklyTarget: number | null;
  moderationTrackers: ModerationTracker[];
  onboardingPreview?: boolean;
  moderationPendingType?: ModerationTrackerType | null;
  onCycleModeration: (type: ModerationTrackerType, status: ModerationStatus) => void;
  onModerationOpen?: () => void;
  onModerationDetail?: (tracker: ModerationTracker) => void;
}) {
  const { t } = usePostLoginLanguage();
  const labBase = useMobilePremiumBasePath();
  const weeklyGoal = Math.max(1, Math.round(weeklyTarget ?? 3));
  const { data: streakData } = useRequest(
    async () => {
      if (!backendUserId) return null;
      return Promise.all(
        STREAK_PILLARS.map(async (pillar) => ({
          pillar,
          response: await getUserStreakPanel(backendUserId, {
            pillar,
            range: 'month',
            mode: gameMode ?? undefined,
          }),
        })),
      );
    },
    [backendUserId, gameMode],
    { enabled: Boolean(backendUserId) },
  );
  const { data: emotionData } = useRequest(
    () => getEmotions(backendUserId ?? '', { days: 15 }),
    [backendUserId],
    { enabled: Boolean(backendUserId) },
  );
  const { data: levelData } = useRequest(
    () => getUserLevel(backendUserId ?? ''),
    [backendUserId],
    { enabled: Boolean(backendUserId) },
  );
  const { data: energyData } = useRequest(
    () => getUserDailyEnergy(backendUserId ?? ''),
    [backendUserId],
    { enabled: Boolean(backendUserId) },
  );
  const energyEndDate = energyData?.trend?.currentDate ?? formatDateKey(new Date());
  const energyStartDate = shiftDateKey(energyEndDate, -6);
  const { data: energySeriesData } = useRequest(
    () => getUserStateTimeseries(backendUserId ?? '', { from: energyStartDate, to: energyEndDate }),
    [backendUserId, energyStartDate, energyEndDate],
    { enabled: Boolean(backendUserId) },
  );
  const { data: balanceData } = useRequest(
    () => getUserXpByTrait(backendUserId ?? ''),
    [backendUserId],
    { enabled: Boolean(backendUserId) },
  );
  const tasks = useMemo(() => (
    onboardingPreview
      ? buildLocalDashboardTasks(localSnapshot, weeklyGoal)
      : normalizeDashboardTasks(streakData, weeklyGoal)
  ), [localSnapshot, onboardingPreview, streakData, weeklyGoal]);
  const overview = useMemo(
    () => buildOverview(tasks, onboardingPreview ? localSnapshot : null),
    [localSnapshot, onboardingPreview, tasks],
  );
  const localEmotions = useMemo(() => buildLocalEmotionSnapshots(localSnapshot), [localSnapshot]);
  const localBalanceTraits = useMemo(() => buildLocalBalanceTraits(localSnapshot), [localSnapshot]);
  const localEnergy = useMemo(() => buildLocalEnergyData(localSnapshot), [localSnapshot]);
  const emotionSummary = useMemo(
    () => buildEmotionSummary(onboardingPreview ? localEmotions : emotionData, !onboardingPreview),
    [emotionData, localEmotions, onboardingPreview],
  );
  const balance = useMemo(
    () => buildBalanceSummary(onboardingPreview ? localBalanceTraits : balanceData?.traits, !onboardingPreview),
    [balanceData?.traits, localBalanceTraits, onboardingPreview],
  );
  const energy = useMemo(
    () => buildEnergySummary(
      onboardingPreview ? localEnergy.snapshot : energyData,
      onboardingPreview ? localEnergy.series : energySeriesData,
      !onboardingPreview,
    ),
    [energyData, energySeriesData, localEnergy, onboardingPreview],
  );
  const level = levelData ?? (
    onboardingPreview
      ? {
          xp_total: localXpTotal ?? 0,
          current_level: Math.floor((localXpTotal ?? 0) / 100),
          xp_to_next: Math.max(0, 100 - ((localXpTotal ?? 0) % 100)),
          progress_percent: (localXpTotal ?? 0) % 100,
        }
      : localXpTotal != null
      ? {
          xp_total: localXpTotal,
          current_level: Math.floor(localXpTotal / 100),
          xp_to_next: Math.max(0, 100 - (localXpTotal % 100)),
          progress_percent: localXpTotal % 100,
        }
      : { xp_total: 6248, current_level: 24, xp_to_next: 318, progress_percent: 55 }
  );
  const emotionCardRef = useRef<HTMLAnchorElement | null>(null);
  const balanceCardRef = useRef<HTMLAnchorElement | null>(null);
  const emotionVisible = useInViewOnce(emotionCardRef);
  const balanceVisible = useInViewOnce(balanceCardRef);

  return (
    <section className="space-y-8">
      <DashboardMotionStyles />
      <section className="border-b border-[color:var(--mp-border)] pb-6">
        <div className="grid grid-cols-[minmax(0,1fr)_92px] items-center gap-4">
          <div>
            <p className="text-[1.28rem] font-medium leading-tight text-[color:var(--mp-text)]">{t('mobilePremium.dashboard.dquestTitle')}</p>
            <p className="mt-2 max-w-[17rem] text-sm leading-5 text-[color:var(--mp-text-secondary)]">
              {t('mobilePremium.dashboard.dquestBody')}
            </p>
            <Link
              className="mt-5 inline-flex h-10 items-center gap-3 rounded-full bg-violet-500 px-5 text-sm font-medium text-white shadow-[0_10px_22px_rgba(124,58,237,0.2)]"
              to={`${labBase}/dquest`}
            >
              {t('mobilePremium.dashboard.start')}
              <span aria-hidden="true" className="text-base">›</span>
            </Link>
          </div>
          <div className="relative h-24 opacity-55" aria-hidden="true">
            <span className="absolute right-0 top-2 h-20 w-20 rounded-full border border-violet-200/18" />
            <span className="absolute right-5 top-7 h-10 w-10 rounded-full border border-violet-200/24" />
            <span className="absolute bottom-5 right-3 h-5 w-5 rounded-full bg-violet-300/35 blur-[1px]" />
          </div>
        </div>
        <div className="mt-6 border-t border-[color:var(--mp-border)] pt-4">
          <div className="flex items-baseline justify-between gap-3 text-xs text-[color:var(--mp-text-secondary)]">
            <p><span className="text-[color:var(--mp-text)]">{t('mobilePremium.dashboard.level', { level: level.current_level })}</span> · {formatNumber(level.xp_total)} GP</p>
            <p>{t('mobilePremium.dashboard.gpRemaining', { gp: level.xp_to_next ?? 0 })}</p>
          </div>
          <div className="mt-3 h-px overflow-hidden bg-white/10">
            <div className="mp-level-progress-load h-full origin-left bg-[color:var(--mp-violet)] shadow-[0_0_14px_rgba(167,139,250,0.62)]" style={{ width: `${Math.max(4, Math.min(100, level.progress_percent))}%` }} />
          </div>
        </div>
      </section>

      {!onboardingPreview || moderationTrackers.length ? (
        <PremiumModerationCards
          compact
          onCycle={onCycleModeration}
          onManage={onModerationOpen}
          onOpenDetail={onModerationDetail}
          pendingType={moderationPendingType}
          trackers={moderationTrackers}
        />
      ) : null}

      <PremiumDailyEnergy energy={energy} />

      <div className="grid grid-cols-2 border-y border-[color:var(--mp-border)]">
        <Link
          className={`min-h-[12rem] border-r border-[color:var(--mp-border)] py-5 pr-4 ${emotionVisible ? 'mp-dashboard-card-in' : 'opacity-0'}`}
          ref={emotionCardRef}
          to={`${labBase}/emotion-chart`}
        >
          <MiniHeading heading={t('mobilePremium.dashboard.emotionHeading')} label={t('mobilePremium.dashboard.last15Days')} />
          <EmotionSummaryDots active={emotionVisible} summary={emotionSummary} />
        </Link>
        <Link
          className={`group min-h-[12rem] py-5 pl-4 ${balanceVisible ? 'mp-dashboard-card-in' : 'opacity-0'}`}
          ref={balanceCardRef}
          to={`${labBase}/balance`}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-[color:var(--mp-text)]">{t('mobilePremium.dashboard.balance')}</p>
            <span className="text-xl text-[color:var(--mp-text-muted)] transition-transform group-hover:translate-x-0.5">›</span>
          </div>
          <PremiumBalanceCompact active={balanceVisible} balance={balance} />
        </Link>
      </div>

      <Link className="block" to={`${labBase}/vision-general`}>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-medium text-[color:var(--mp-text)]">{t('mobilePremium.dashboard.overview')}</h2>
          <span className="text-xl text-[color:var(--mp-text-secondary)]">›</span>
        </div>
        <div className="mt-3">
          {overview.streak ? <OverviewRow accent="green" icon="streak" label={t('mobilePremium.dashboard.bestStreak')} task={overview.streak} value={`${overview.streak.streakDays}d`} /> : null}
          {overview.attention ? <OverviewRow accent="red" icon="attention" label={t('mobilePremium.dashboard.needsAttention')} task={overview.attention} value={`${overview.attention.monthlyCount}/${overview.attention.weeklyGoal * 4} ${t('mobilePremium.dashboard.monthSuffix')}`} /> : null}
          {overview.close ? <OverviewRow accent="amber" icon="close" label={t('mobilePremium.dashboard.closeToHabit')} task={overview.close} value={`${overview.close.weeklyDone}/${overview.close.weeklyGoal}`} withDots /> : null}
          {!overview.streak && !overview.attention && !overview.close ? (
            <p className="border-b border-[color:var(--mp-border)] py-5 text-sm leading-6 text-[color:var(--mp-text-secondary)]">
              {t('mobilePremium.dashboard.noSignals')}
            </p>
          ) : null}
        </div>
      </Link>
    </section>
  );
}

function useInViewOnce<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return undefined;
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.24 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, visible]);

  return visible;
}

function OverviewRow({
  accent,
  icon,
  label,
  task,
  value,
  withDots = false,
}: {
  accent: 'green' | 'amber' | 'red';
  icon: keyof typeof OVERVIEW_ICON;
  label: string;
  task: DashboardTask;
  value: string;
  withDots?: boolean;
}) {
  const Icon = OVERVIEW_ICON[icon];
  return (
    <div className="grid grid-cols-[34px_1fr_auto] items-center gap-3 border-b border-[color:var(--mp-border)] py-3.5 last:border-b-0">
      <Icon className="text-[color:var(--mp-violet)] opacity-90" width={25} height={25} strokeWidth={1.35} />
      <div className="min-w-0">
        <p className="text-xs text-[color:var(--mp-text-secondary)]">{label}</p>
        <p className="mt-1 truncate text-sm text-[color:var(--mp-text)]">{task.name}</p>
      </div>
      <div className={`text-right text-sm ${accent === 'red' ? 'text-[color:var(--mp-red)]' : 'text-[color:var(--mp-text)]'}`}>
        <span>{value}</span>
        {withDots ? <WeekDots weeks={task.monthWeeks} goal={task.weeklyGoal} /> : null}
      </div>
    </div>
  );
}

function WeekDots({ weeks, goal }: { weeks: number[]; goal: number }) {
  const normalized = Array.from({ length: 3 }, (_, index) => weeks[index] ?? 0);
  return (
    <span className="ml-4 inline-flex gap-2 align-middle">
      {normalized.map((value, index) => {
        const color = value >= goal ? 'var(--mp-green)' : value > 0 ? 'var(--mp-amber)' : 'var(--mp-track-strong)';
        return <i className="h-3.5 w-3.5 rounded-full" key={index} style={{ backgroundColor: color }} />;
      })}
    </span>
  );
}

function MiniHeading({ heading, label }: { heading: string; label: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-sm font-medium text-[color:var(--mp-text)]">{heading}</p>
        <p className="mt-2 text-xs text-[color:var(--mp-text-secondary)]">{label}</p>
      </div>
      <span className="text-xl text-[color:var(--mp-text-secondary)]">›</span>
    </div>
  );
}

function EmotionSummaryDots({ active, summary }: { active: boolean; summary: ReturnType<typeof buildEmotionSummary> }) {
  const compactDays = summary.days.slice(-15);
  return (
    <div className="mt-5 space-y-3">
      <div className="flex items-center gap-3">
        <div
          className={`${active ? 'mp-emotion-orb-live' : 'opacity-0'} h-14 w-14 shrink-0 rounded-full shadow-[0_0_24px_rgba(67,217,119,0.22)]`}
          style={{ backgroundColor: summary.color }}
        />
        <div className="min-w-0">
          <p className="text-[1.35rem] font-light leading-tight text-[color:var(--mp-text)]">{summary.label}</p>
        </div>
      </div>
      <div className="flex max-w-[10.5rem] flex-wrap gap-1.5">
        {compactDays.map((day, index) => <EmotionDayDot active={active} day={day} index={index} key={day.date} />)}
      </div>
    </div>
  );
}

function EmotionDayDot({ active, day, index }: { active: boolean; day: ReturnType<typeof buildEmotionSummary>['days'][number]; index: number }) {
  return (
    <span
      className={`${active ? 'mp-emotion-dot-in' : 'opacity-0'} h-2.5 w-2.5 rounded-full`}
      style={{ animationDelay: `${90 + index * 34}ms`, backgroundColor: day.color }}
      title={`${day.date}: ${day.label}`}
    />
  );
}

function PremiumBalanceCompact({ active, balance }: { active: boolean; balance: ReturnType<typeof buildBalanceSummary> }) {
  const bars = [balance.body, balance.mind, balance.soul];
  const tone = balance.dominant.label === 'Cuerpo'
    ? 'var(--mp-body)'
    : balance.dominant.label === 'Mente'
      ? 'var(--mp-violet)'
      : 'var(--mp-amber)';
  const softTone = balance.dominant.label === 'Cuerpo'
    ? 'var(--mp-body-soft)'
    : balance.dominant.label === 'Mente'
      ? 'rgba(167,139,250,0.12)'
      : 'rgba(245,197,107,0.11)';

  return (
    <div className="mt-4">
      <p
        className="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{
          borderColor: tone,
          color: tone,
          backgroundColor: softTone,
        }}
      >
        Predominio {balance.dominant.label}
      </p>
      <div className="mt-4 flex items-baseline gap-2">
        <p className="text-[1.8rem] font-light tracking-tight" style={{ color: tone }}>
          <AnimatedBalancePercent active={active} value={balance.dominant.percent} />
        </p>
        <p className="text-sm text-[color:var(--mp-text)]">del GP</p>
      </div>
      <p className="text-xs text-[color:var(--mp-text-muted)]">
        {balance.dominant.label} lidera la distribución
      </p>
      <div className={`mp-balance-track ${active ? 'mp-balance-track-active' : ''} mt-5 flex h-2.5 overflow-hidden rounded-full bg-[color:var(--mp-track)]`} aria-hidden="true">
        {bars.map((bar, index) => (
          <span
            className="mp-balance-segment block h-full"
            key={bar.label}
            style={{
              animationDelay: `${index * 120}ms`,
              backgroundColor: bar.label === 'Cuerpo' ? 'var(--mp-body)' : bar.label === 'Mente' ? 'var(--mp-violet)' : 'var(--mp-amber)',
              opacity: bar.label === balance.dominant.label ? 1 : 0.56,
              width: `${bar.percent}%`,
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-[color:var(--mp-text-secondary)]">
        {bars.map((bar) => (
          <span key={bar.label} style={{ color: bar.label === balance.dominant.label ? tone : undefined }}>
            {bar.label.slice(0, 1)} {bar.percent}%
          </span>
        ))}
      </div>
    </div>
  );
}

function AnimatedBalancePercent({ active, value }: { active: boolean; value: number }) {
  const [current, setCurrent] = useState(active ? 0 : value);

  useEffect(() => {
    if (!active) return undefined;
    const duration = 1050;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(value * eased));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active, value]);

  return <>{current}%</>;
}

function DashboardMotionStyles() {
  return (
    <style>{`
      @keyframes mpDashboardCardIn {
        from { opacity: 0; transform: translateY(22px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes mpLevelProgressLoad {
        from { transform: scaleX(0); opacity: 0.35; }
        to { transform: scaleX(1); opacity: 1; }
      }
      @keyframes mpEmotionOrbLoad {
        0% { opacity: 0.35; transform: scale(0.72); box-shadow: 0 0 0 rgba(67,217,119,0); }
        72% { opacity: 1; transform: scale(1.05); }
        100% { opacity: 1; transform: scale(1); box-shadow: 0 0 24px rgba(67,217,119,0.22); }
      }
      @keyframes mpEmotionOrbBreathe {
        0%, 100% { transform: scale(1); filter: saturate(1); }
        50% { transform: scale(1.07); filter: saturate(1.14); }
      }
      @keyframes mpEmotionDotIn {
        from { opacity: 0; transform: translateY(10px) scale(.5); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @keyframes mpBalanceSweep {
        0% { transform: translateX(-115%); opacity: 0; }
        18% { opacity: 1; }
        78% { opacity: 1; }
        100% { transform: translateX(115%); opacity: 0; }
      }
      @keyframes mpBalanceSettle {
        from { transform: scaleX(.08); filter: saturate(1.55); }
        to { transform: scaleX(1); filter: saturate(1); }
      }
      .mp-level-progress-load {
        animation: mpLevelProgressLoad 850ms cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      .mp-dashboard-card-in {
        animation: mpDashboardCardIn 560ms cubic-bezier(.2,.85,.25,1) both;
      }
      .mp-emotion-orb-live {
        animation: mpEmotionOrbLoad 720ms cubic-bezier(.2,.85,.25,1) both, mpEmotionOrbBreathe 2.4s 780ms ease-in-out infinite;
      }
      .mp-emotion-dot-in {
        animation: mpEmotionDotIn 430ms cubic-bezier(.2,.85,.25,1) both;
      }
      .mp-balance-track {
        position: relative;
      }
      .mp-balance-track::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, var(--mp-body) 0%, var(--mp-violet) 34%, var(--mp-amber) 68%, var(--mp-body) 100%);
        opacity: 0;
        transform: translateX(-115%);
      }
      .mp-balance-track-active::after {
        animation: mpBalanceSweep 1080ms cubic-bezier(.2,.85,.25,1) both;
      }
      .mp-balance-track-active .mp-balance-segment {
        transform-origin: left;
        animation: mpBalanceSettle 760ms 640ms cubic-bezier(.2,.85,.25,1) both;
      }
      @keyframes mpEnergyLineReveal {
        from { stroke-dashoffset: 1; opacity: .15; }
        to { stroke-dashoffset: 0; opacity: 1; }
      }
      .mp-energy-line {
        stroke-dasharray: 1;
        stroke-dashoffset: 1;
        opacity: .15;
      }
      .mp-energy-line-reveal {
        animation: mpEnergyLineReveal 980ms cubic-bezier(.2,.85,.25,1) both;
      }
      .mp-energy-line-group:focus {
        outline: none;
      }
      .mp-energy-line-selected {
        filter: drop-shadow(0 0 7px currentColor) drop-shadow(0 0 14px currentColor);
      }
      @media (prefers-reduced-motion: reduce) {
        .mp-level-progress-load,
        .mp-dashboard-card-in,
        .mp-emotion-orb-live,
        .mp-emotion-dot-in,
        .mp-balance-track-active::after,
        .mp-balance-track-active .mp-balance-segment,
        .mp-energy-line,
        .mp-energy-line-reveal { animation: none !important; transform: none !important; opacity: inherit !important; stroke-dashoffset: 0 !important; }
      }
    `}</style>
  );
}

function PremiumDailyEnergy({ energy }: { energy: ReturnType<typeof buildEnergySummary> }) {
  const { t } = usePostLoginLanguage();
  const chartRef = useRef<HTMLElement | null>(null);
  const chartVisible = useInViewOnce(chartRef);
  const [activeMetricLabel, setActiveMetricLabel] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const lowest = energy.metrics.reduce((current, metric) => metric.percent < current.percent ? metric : current);
  const chart = buildEnergyChart(energy.metrics);
  const activeMetric = activeMetricLabel
    ? energy.metrics.find((metric) => metric.label === activeMetricLabel) ?? null
    : null;

  return (
    <section
      ref={chartRef}
      className="pb-3 pt-2"
      onPointerDownCapture={(event) => {
        if (!activeMetricLabel) return;
        const target = event.target as Element;
        if (!target.closest('[data-energy-interactive="true"]')) {
          setActiveMetricLabel(null);
        }
      }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-medium text-[color:var(--mp-text)]">{t('mobilePremium.dashboard.dailyEnergy')}</h2>
          <button
            aria-expanded={infoOpen}
            aria-label={t('mobilePremium.dashboard.dailyEnergyA11y')}
            className="grid h-6 w-6 place-items-center rounded-full border border-[color:var(--mp-border)] text-xs font-semibold text-[color:var(--mp-text-secondary)] transition hover:text-[color:var(--mp-text)] focus:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--mp-violet)]/70"
            data-energy-interactive="true"
            onClick={() => {
              setInfoOpen((open) => !open);
              setActiveMetricLabel(null);
            }}
            type="button"
          >
            i
          </button>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--mp-text-muted)]">{t('mobilePremium.dashboard.sevenDays')}</p>
      </div>

      {infoOpen ? (
        <div className="mt-3 rounded-[0.9rem] border border-[color:var(--mp-border)] bg-[color:var(--mp-surface)] px-4 py-3 text-xs leading-5 text-[color:var(--mp-text-secondary)]">
          <p className="font-semibold text-[color:var(--mp-text)]">Daily Energy mide tres señales diarias:</p>
          <p className="mt-2"><span className="font-semibold text-[color:var(--mp-body)]">HP · Cuerpo</span> mide tu energía física.</p>
          <p><span className="font-semibold text-[#f5c56b]">Mood · Alma</span> mide tu estado emocional.</p>
          <p><span className="font-semibold text-[#a78bfa]">Focus · Mente</span> mide tu claridad mental.</p>
        </div>
      ) : null}

      {activeMetric && !infoOpen ? (
        <div
          className="mt-3 inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold"
          data-energy-interactive="true"
          style={{ borderColor: activeMetric.color, color: activeMetric.color }}
        >
          {activeMetric.label} · {activeMetric.pillar}
        </div>
      ) : null}

      <svg
        aria-label={`Evolución de energía: ${energy.metrics.map((metric) => `${metric.label} ${metric.percent}%, ${metric.pillar}`).join(', ')}`}
        className="mt-5 block w-full overflow-visible"
        role="img"
        viewBox="0 0 390 190"
      >
        <defs>
          <linearGradient id="energy-risk-fade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={lowest.color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={lowest.color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((value) => (
          <line
            key={value}
            stroke="var(--mp-chart-grid)"
            strokeDasharray="2 7"
            x1="4"
            x2="282"
            y1={energyY(value)}
            y2={energyY(value)}
          />
        ))}
        <text fill="var(--mp-text-muted)" fontSize="10" letterSpacing="1.2" x="4" y="184">HACE 7 DÍAS</text>
        <text fill="var(--mp-text-muted)" fontSize="10" letterSpacing="1.2" textAnchor="end" x="282" y="184">HOY</text>
        <path d={chart.riskArea} fill="url(#energy-risk-fade)" />
        {chart.lines.map((line, index) => {
          const isSelected = activeMetricLabel === line.metric.label;
          const hasSelection = Boolean(activeMetricLabel);
          const isDimmed = hasSelection && !isSelected;
          const baseOpacity = line.metric === lowest ? 1 : 0.68;
          return (
          <g
            aria-label={`${line.metric.label} · ${line.metric.pillar}`}
            aria-pressed={isSelected}
            className="mp-energy-line-group cursor-pointer"
            data-energy-interactive="true"
            key={line.metric.label}
            onClick={() => {
              setActiveMetricLabel((label) => label === line.metric.label ? null : line.metric.label);
              setInfoOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setActiveMetricLabel((label) => label === line.metric.label ? null : line.metric.label);
                setInfoOpen(false);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <path
              d={line.path}
              fill="none"
              opacity="0"
              pointerEvents="stroke"
              stroke="transparent"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="18"
            />
            <path
              className={`mp-energy-line ${chartVisible ? 'mp-energy-line-reveal' : ''} ${isSelected ? 'mp-energy-line-selected' : ''}`}
              d={line.path}
              fill="none"
              opacity={isDimmed ? 0.28 : isSelected ? 1 : baseOpacity}
              pathLength={1}
              stroke={line.metric.color}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={isSelected ? 4 : line.metric === lowest ? 2.8 : 1.8}
              style={{ animationDelay: `${index * 110}ms` }}
            />
            <line
              opacity={isDimmed ? 0.22 : isSelected ? 0.78 : 0.48}
              stroke={line.metric.color}
              strokeWidth={isSelected ? 1.5 : 1}
              x1="282"
              x2="294"
              y1={line.endY}
              y2={line.labelY}
            />
            <circle
              cx="282"
              cy={line.endY}
              fill={line.metric.color}
              opacity={isDimmed ? 0.42 : 1}
              r={isSelected ? 5.4 : line.metric === lowest ? 4.5 : 3.5}
            />
            <text
              fill={line.metric.color}
              fontSize="12"
              fontWeight={isSelected || line.metric === lowest ? 600 : 400}
              opacity={isDimmed ? 0.5 : 1}
              x="300"
              y={line.labelY + 4}
            >
              {line.metric.label}
              <tspan dx="5" fill="var(--mp-data-value)" fontWeight="600">{line.metric.percent}%</tspan>
            </text>
          </g>
          );
        })}
      </svg>
    </section>
  );
}

function FlameIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12.4 21c3.5 0 5.8-2.3 5.8-5.6 0-2.5-1.3-4.6-3.9-6.5-.2 2-1 3.3-2.4 4.1.3-3-.7-5.5-3.1-7.5-.1 3.5-3 5.6-3 9.6C5.8 18.5 8.4 21 12.4 21Z" />
      <path d="M11.9 20.7c1.5-.9 2.2-2 2.2-3.4 0-1-.5-1.9-1.5-2.8-.2 1-.7 1.7-1.4 2.1.1-1.3-.3-2.4-1.2-3.3-.7 1.1-1.1 2.2-1.1 3.3 0 2 1.1 3.4 3 4.1Z" opacity="0.7" />
    </svg>
  );
}

function AttentionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M12 4.8 19.2 18a1.2 1.2 0 0 1-1.1 1.8H5.9A1.2 1.2 0 0 1 4.8 18L12 4.8Z" />
      <path d="M12 9.1v4.7" />
      <path d="M12 16.9h.01" />
    </svg>
  );
}

function HabitCloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M5.2 13.4a7.1 7.1 0 0 0 7 6.1 7.1 7.1 0 0 0 6.9-5.7" />
      <path d="M5.1 13.4a7.1 7.1 0 0 1 11.8-5.2" opacity="0.55" />
      <path d="M12.1 15.2c0-3.4 1.7-5.8 5.1-7.1.1 3.5-1.6 5.8-5.1 7.1Z" />
      <path d="M12.1 15.2c-.4-2.3-1.8-3.7-4.1-4.2-.1 2.5 1.2 3.9 4.1 4.2Z" />
    </svg>
  );
}

function buildLocalDashboardTasks(snapshot: LocalOnboardingSnapshot | null | undefined, weeklyGoal: number): DashboardTask[] {
  return buildPremiumRowsFromLocalOnboarding(snapshot ?? null, weeklyGoal).map((task) => ({
    id: task.id,
    name: task.name,
    stat: task.stat,
    streakDays: task.streakDays,
    weeklyDone: task.weeklyDone,
    weeklyGoal,
    monthlyCount: task.monthlyCount,
    monthWeeks: task.monthWeeks,
  }));
}

function buildLocalEmotionSnapshots(snapshot: LocalOnboardingSnapshot | null | undefined): EmotionSnapshot[] {
  return (snapshot?.dquestHistory ?? []).map((record) => ({
    date: record.date,
    mood: record.emotionName,
  }));
}

function buildLocalBalanceTraits(snapshot: LocalOnboardingSnapshot | null | undefined): TraitXpEntry[] {
  if (!snapshot) return [];
  return (['Body', 'Mind', 'Soul'] as const).map((pillar) => ({
    trait: pillar.toLowerCase(),
    pillar,
    xp: snapshot.xp[pillar],
  }));
}

function buildLocalEnergyData(snapshot: LocalOnboardingSnapshot | null | undefined): {
  snapshot: DailyEnergySnapshot | null;
  series: EnergyTimeseriesPoint[];
} {
  if (!snapshot?.dquestHistory.length) {
    return { snapshot: null, series: [] };
  }

  const totals = countTasksByPillar(snapshot);
  const series = snapshot.dquestHistory.map((record) => {
    const completed = countCompletedTasksByPillar(snapshot, record.completedTaskIds);
    return {
      date: record.date,
      Body: completionPercent(completed.Body, totals.Body),
      Mind: completionPercent(completed.Mind, totals.Mind),
      Soul: completionPercent(completed.Soul, totals.Soul),
    };
  });
  const current = series.at(-1) ?? { date: formatDateKey(new Date()), Body: 0, Mind: 0, Soul: 0 };
  const previous = series.at(-2) ?? null;
  const hasHistory = Boolean(previous);

  return {
    snapshot: {
      user_id: snapshot.progress.user_id,
      hp_pct: current.Body,
      mood_pct: current.Soul,
      focus_pct: current.Mind,
      hp_norm: current.Body / 100,
      mood_norm: current.Soul / 100,
      focus_norm: current.Mind / 100,
      trend: {
        currentDate: current.date,
        previousDate: previous?.date ?? current.date,
        hasHistory,
        pillars: {
          Body: buildLocalEnergyTrend(current.Body, previous?.Body),
          Mind: buildLocalEnergyTrend(current.Mind, previous?.Mind),
          Soul: buildLocalEnergyTrend(current.Soul, previous?.Soul),
        },
      },
    },
    series,
  };
}

function countTasksByPillar(snapshot: LocalOnboardingSnapshot) {
  return snapshot.tasks.reduce(
    (counts, task) => ({ ...counts, [task.pillar]: counts[task.pillar] + 1 }),
    { Body: 0, Mind: 0, Soul: 0 },
  );
}

function countCompletedTasksByPillar(snapshot: LocalOnboardingSnapshot, completedTaskIds: string[]) {
  const completed = new Set(completedTaskIds.map((id) => id.replace(/^onboarding-(body|mind|soul)-/i, '').toLowerCase()));
  return snapshot.tasks.reduce(
    (counts, task) => (
      completed.has(task.id.toLowerCase())
        ? { ...counts, [task.pillar]: counts[task.pillar] + 1 }
        : counts
    ),
    { Body: 0, Mind: 0, Soul: 0 },
  );
}

function completionPercent(completed: number, total: number) {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

function buildLocalEnergyTrend(current: number, previous?: number) {
  return {
    current,
    previous: previous ?? null,
    deltaPct: typeof previous === 'number' && previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null,
  };
}

function normalizeDashboardTasks(
  groups: Array<{ pillar: StreakPanelPillar; response: { tasks: StreakPanelTask[] } }> | null | undefined,
  weeklyGoal: number,
): DashboardTask[] {
  if (!groups) return FALLBACK_TASKS;
  const byId = new Map<string, DashboardTask>();
  groups.forEach(({ response }) => {
    response.tasks.forEach((task) => {
      if (byId.has(task.id)) return;
      byId.set(task.id, {
        id: task.id,
        name: task.name,
        stat: task.stat,
        streakDays: task.streakDays,
        weeklyDone: task.metrics.week?.count ?? task.weekDone ?? 0,
        weeklyGoal,
        monthlyCount: task.metrics.month?.count ?? 0,
        monthWeeks: task.metrics.month?.weeks ?? [],
      });
    });
  });
  return Array.from(byId.values()).length ? Array.from(byId.values()) : FALLBACK_TASKS;
}

function buildOverview(tasks: DashboardTask[], localSnapshot?: LocalOnboardingSnapshot | null) {
  if (localSnapshot) {
    const historyDates = [...new Set(localSnapshot.dquestHistory.map((record) => record.date))].sort();
    const hasWeekOfHistory = historyDates.length >= 7;
    const firstHistoryDate = historyDates[0] ? new Date(`${historyDates[0]}T12:00:00`) : null;
    const hasTwoMonthsOfHistory = Boolean(firstHistoryDate && Date.now() - firstHistoryDate.getTime() >= 60 * 24 * 60 * 60 * 1000);
    return {
      streak: [...tasks].filter((task) => task.streakDays >= 2).sort((a, b) => b.streakDays - a.streakDays)[0] ?? null,
      attention: hasWeekOfHistory
        ? [...tasks].sort((a, b) => a.monthlyCount - b.monthlyCount)[0] ?? null
        : null,
      close: hasTwoMonthsOfHistory
        ? [...tasks]
            .filter((task) => task.weeklyDone > 0 && task.weeklyDone < task.weeklyGoal)
            .sort((a, b) => b.weeklyDone / b.weeklyGoal - a.weeklyDone / a.weeklyGoal)[0] ?? null
        : null,
    };
  }
  const streak = [...tasks].sort((a, b) => b.streakDays - a.streakDays)[0] ?? FALLBACK_TASKS[0];
  const attention = [...tasks].sort((a, b) => a.monthlyCount - b.monthlyCount)[0] ?? FALLBACK_TASKS[1];
  const close =
    [...tasks]
      .filter((task) => task.id !== streak.id && task.id !== attention.id)
      .filter((task) => task.weeklyDone > 0 && task.weeklyDone < task.weeklyGoal)
      .sort((a, b) => b.weeklyDone / b.weeklyGoal - a.weeklyDone / a.weeklyGoal)[0] ??
    tasks.find((task) => task.id !== streak.id && task.id !== attention.id) ??
    tasks.find((task) => task.id !== streak.id) ??
    FALLBACK_TASKS[2];
  return { streak, attention, close };
}

function buildEmotionSummary(data: EmotionSnapshot[] | null | undefined, allowFallback = true) {
  const source = (data && data.length ? data : allowFallback ? FALLBACK_EMOTIONS : [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-15);
  const days = source.map((item) => {
    const label = normalizeEmotionLabel(item.mood);
    return { date: item.date, label, color: resolveEmotionColor(label) };
  });
  const counts = new Map<string, number>();
  days.forEach((day) => counts.set(day.label, (counts.get(day.label) ?? 0) + 1));
  const label = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Sin registros';
  return { label, color: label === 'Sin registros' ? 'var(--mp-track-strong)' : resolveEmotionColor(label), days };
}

function buildBalanceSummary(traits: TraitXpEntry[] | null | undefined, allowFallback = true) {
  const values = allowFallback ? { body: 1757, mind: 1102, soul: 1106 } : { body: 0, mind: 0, soul: 0 };
  if (traits?.length) {
    values.body = 0;
    values.mind = 0;
    values.soul = 0;
    traits.forEach((trait) => {
      const pillar = (trait.pillar ?? '').toLowerCase();
      if (pillar.includes('body')) values.body += trait.xp;
      else if (pillar.includes('mind')) values.mind += trait.xp;
      else if (pillar.includes('soul')) values.soul += trait.xp;
    });
  }
  const total = Math.max(values.body + values.mind + values.soul, 1);
  const body = { label: 'Cuerpo', value: values.body, percent: Math.round((values.body / total) * 100) };
  const mind = { label: 'Mente', value: values.mind, percent: Math.round((values.mind / total) * 100) };
  const soul = { label: 'Alma', value: values.soul, percent: Math.max(0, 100 - body.percent - mind.percent) };
  const dominant = [body, mind, soul].sort((a, b) => b.value - a.value)[0];
  return { body, mind, soul, dominant };
}

function buildEnergySummary(
  data: Awaited<ReturnType<typeof getUserDailyEnergy>> | null | undefined,
  series: EnergyTimeseriesPoint[] | null | undefined,
  allowFallback = true,
) {
  const hasRealData = Boolean(data);
  const normalizedSeries = normalizeEnergySeries(series);
  const hasMatureSeries = normalizedSeries.length >= 7;
  const hasHistory = hasRealData ? hasMatureSeries : allowFallback;
  const trend = data?.trend?.pillars;
  const points = hasRealData ? normalizedSeries : allowFallback ? FALLBACK_ENERGY_SERIES.slice(-7) : [];
  const latestSeriesPoint = points.at(-1) ?? null;
  const bodyPercent = latestSeriesPoint ? latestSeriesPoint.Body : hasRealData ? data?.hp_pct : allowFallback ? 74 : 0;
  const soulPercent = latestSeriesPoint ? latestSeriesPoint.Soul : hasRealData ? data?.mood_pct : allowFallback ? 56 : 0;
  const mindPercent = latestSeriesPoint ? latestSeriesPoint.Mind : hasRealData ? data?.focus_pct : allowFallback ? 42 : 0;

  return {
    hasHistory,
    metrics: [
      {
        label: 'HP',
        pillar: 'Cuerpo',
        percent: clampEnergyLevel(bodyPercent),
        deltaPct: hasHistory ? (hasRealData ? trend?.Body.deltaPct ?? null : -2.8) : null,
        points: buildEnergyPoints(points, 'Body', bodyPercent),
        color: 'var(--mp-body)',
      },
      {
        label: 'Mood',
        pillar: 'Alma',
        percent: clampEnergyLevel(soulPercent),
        deltaPct: hasHistory ? (hasRealData ? trend?.Soul.deltaPct ?? null : 53.7) : null,
        points: buildEnergyPoints(points, 'Soul', soulPercent),
        color: '#f5c56b',
      },
      {
        label: 'Focus',
        pillar: 'Mente',
        percent: clampEnergyLevel(mindPercent),
        deltaPct: hasHistory ? (hasRealData ? trend?.Mind.deltaPct ?? null : -18.2) : null,
        points: buildEnergyPoints(points, 'Mind', mindPercent),
        color: '#a78bfa',
      },
    ],
  };
}

function normalizeEnergySeries(series: EnergyTimeseriesPoint[] | null | undefined) {
  return (series ?? [])
    .filter((point) => point?.date)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7);
}

function buildEnergyPoints(
  series: EnergyTimeseriesPoint[],
  pillar: 'Body' | 'Mind' | 'Soul',
  current: number | null | undefined,
) {
  const currentValue = clampEnergyLevel(current);
  if (series.length > 0) {
    return series.map((point) => clampEnergyLevel(point[pillar]));
  }

  return [currentValue, currentValue];
}

function buildEnergyChart(metrics: ReturnType<typeof buildEnergySummary>['metrics']) {
  const lowest = metrics.reduce((current, metric) => metric.percent < current.percent ? metric : current);
  const lines = metrics.map((metric) => ({
    metric,
    path: buildEnergyPath(metric.points),
    endY: energyY(metric.percent),
    labelY: energyY(metric.percent),
  }));
  const sorted = [...lines].sort((first, second) => first.endY - second.endY);

  sorted.forEach((line, index) => {
    const previous = sorted[index - 1];
    line.labelY = previous ? Math.max(line.endY, previous.labelY + 22) : Math.max(15, line.endY);
  });
  const overflow = Math.max(0, (sorted[sorted.length - 1]?.labelY ?? 0) - 155);
  if (overflow > 0) {
    sorted.forEach((line) => {
      line.labelY -= overflow;
    });
  }

  return {
    lines,
    riskArea: `${buildEnergyPath(lowest.points)} L 282 164 L 4 164 Z`,
  };
}

function buildEnergyPath(points: number[]) {
  const plotted = points.length > 1 ? points : [points[0] ?? 0, points[0] ?? 0];
  const coordinates = plotted.map((point, index) => ({
    x: 4 + (278 * index) / (plotted.length - 1),
    y: energyY(point),
  }));
  let path = `M ${coordinates[0].x} ${coordinates[0].y}`;

  for (let index = 1; index < coordinates.length; index += 1) {
    const previous = coordinates[index - 1];
    const point = coordinates[index];
    const middle = (previous.x + point.x) / 2;
    path += ` C ${middle} ${previous.y}, ${middle} ${point.y}, ${point.x} ${point.y}`;
  }

  return path;
}

function energyY(value: number) {
  return 10 + ((100 - clampEnergyLevel(value)) / 100) * 150;
}

function normalizeEmotionLabel(value: string | null | undefined) {
  const raw = (value ?? 'Calma').trim();
  const lower = raw.toLowerCase();
  if (lower.includes('happy') || lower.includes('felic')) return 'Felicidad';
  if (lower.includes('motiv')) return 'Motivación';
  if (lower.includes('sad') || lower.includes('triste')) return 'Tristeza';
  if (lower.includes('anx') || lower.includes('ansiedad')) return 'Ansiedad';
  if (lower.includes('frustr')) return 'Frustración';
  if (lower.includes('tired') || lower.includes('cans')) return 'Cansancio';
  return 'Calma';
}

function resolveEmotionColor(label: string) {
  return EMOTION_COLORS[label.toLowerCase()] ?? '#5ee178';
}

function clampEnergyLevel(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.round(Math.max(0, Math.min(100, value)));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-AR').format(value);
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDateKey(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
}
