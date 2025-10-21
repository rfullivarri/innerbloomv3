import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type SyntheticEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  claimMissionsV2Mission,
  getMissionsV2Board,
  linkMissionsV2Daily,
  onDevUserOverrideChange,
  postMissionsV2Heartbeat,
  type MissionsV2Action,
  type MissionsV2BoardResponse,
  type MissionsV2MarketProposal,
  type MissionsV2MarketSlot,
  type MissionsV2Slot,
} from '../../lib/api';
import { useRequest } from '../../hooks/useRequest';
import { Card } from '../ui/Card';
import { ProgressBar } from '../common/ProgressBar';
import { ToastBanner } from '../common/ToastBanner';
import { emitMissionsV2Event } from '../../lib/telemetry';
import { FEATURE_MISSIONS_V2 } from '../../lib/featureFlags';
import { normalizeGameModeValue, type GameMode } from '../../lib/gameMode';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

type ClaimModalState = {
  missionName: string;
  slot: MissionsV2Slot['slot'];
  rewards: {
    xp: number;
    currency: number;
    items: string[];
  };
};

const SLOT_ORDER: Array<MissionsV2Slot['slot']> = ['main', 'hunt', 'skill'];

const SLOT_DETAILS: Record<
  MissionsV2Slot['slot'],
  {
    emoji: string;
    label: string;
    accent: string;
    aura: string;
    gradient: string;
  }> = {
  main: {
    emoji: '🎯',
    label: 'Main Quest',
    accent: 'text-amber-200',
    aura: 'shadow-[0_0_24px_rgba(251,191,36,0.28)]',
    gradient: 'bg-[linear-gradient(140deg,rgba(251,191,36,0.18),rgba(59,7,100,0.25))]',
  },
  hunt: {
    emoji: '🕵️',
    label: 'Hunt',
    accent: 'text-emerald-200',
    aura: 'shadow-[0_0_24px_rgba(16,185,129,0.32)]',
    gradient: 'bg-[linear-gradient(140deg,rgba(16,185,129,0.16),rgba(8,47,73,0.3))]',
  },
  skill: {
    emoji: '🛠️',
    label: 'Skill Route',
    accent: 'text-sky-200',
    aura: 'shadow-[0_0_24px_rgba(56,189,248,0.28)]',
    gradient: 'bg-[linear-gradient(140deg,rgba(56,189,248,0.16),rgba(30,64,175,0.28))]',
  },
};

const STATE_LABELS: Record<MissionsV2Slot['state'], { label: string; tone: 'neutral' | 'active' | 'success' | 'error' | 'cooldown' | 'claimed' }>
  = {
    idle: { label: 'PENDIENTE', tone: 'neutral' },
    active: { label: 'ACTIVA', tone: 'active' },
    succeeded: { label: 'COMPLETADA', tone: 'success' },
    failed: { label: 'FALLIDA', tone: 'error' },
    cooldown: { label: 'ENFRIAMIENTO', tone: 'cooldown' },
    claimed: { label: 'CLAIM LISTO', tone: 'claimed' },
  };

const PETAL_FIELD = [
  { top: '8%', left: '12%', delay: '0s', scale: 1 },
  { top: '18%', left: '78%', delay: '1.4s', scale: 0.85 },
  { top: '56%', left: '6%', delay: '2.2s', scale: 0.7 },
  { top: '72%', left: '86%', delay: '0.8s', scale: 1.05 },
  { top: '42%', left: '52%', delay: '1.8s', scale: 0.9 },
  { top: '88%', left: '28%', delay: '2.9s', scale: 0.75 },
];

type MissionArtSlot = MissionsV2Slot['slot'] | 'boss';

type MissionCardStyle = CSSProperties & {
  '--missions-card-art'?: string;
  '--missions-card-art-opacity'?: string;
};

const DEFAULT_MISSION_ART_MODE: GameMode = 'Flow';

const MISSION_ART_BY_SLOT_AND_MODE: Record<MissionArtSlot, Record<GameMode, string>> = {
  main: {
    Flow: '/missions/missions_main_flow.png',
    Chill: '/missions/missions_main_chill.png',
    Low: '/missions/missions_main_low.png',
    Evolve: '/missions/missions_main_evolve.png',
  },
  hunt: {
    Flow: '/missions/missions_hunt_flow.png',
    Chill: '/missions/missions_hunt_chill.png',
    Low: '/missions/missions_hunt_low.png',
    Evolve: '/missions/missions_hunt_evolve.png',
  },
  skill: {
    Flow: '/missions/missions_skill_flow.png',
    Chill: '/missions/missions_skill_chill.png',
    Low: '/missions/missions_skill_low.png',
    Evolve: '/missions/missions_skill_evolve.png',
  },
  boss: {
    Flow: '/missions/missions_boss_flow.png',
    Chill: '/missions/missions_boss_chill.png',
    Low: '/missions/missions_boss_low.png',
    Evolve: '/missions/missions_boss_evolve.png',
  },
};

function getMissionArt(slot: MissionArtSlot, gameMode: GameMode | null): string {
  const normalizedMode = gameMode ?? DEFAULT_MISSION_ART_MODE;
  const artByMode = MISSION_ART_BY_SLOT_AND_MODE[slot];
  return artByMode?.[normalizedMode] ?? artByMode[DEFAULT_MISSION_ART_MODE];
}

function buildMissionCardStyle(slot: MissionArtSlot, gameMode: GameMode | null): MissionCardStyle {
  return {
    '--missions-card-art': `url(${getMissionArt(slot, gameMode)})`,
    '--missions-card-art-opacity': slot === 'boss' ? '0.55' : '0.7',
  };
}

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

function parseShieldLabel(label: string): { current: number; max: number } | null {
  const match = /Escudo\s+(\d+)\/(\d+)/i.exec(label);
  if (match) {
    return { current: Number.parseInt(match[1] ?? '0', 10), max: Number.parseInt(match[2] ?? '6', 10) };
  }
  if (/escudo\s+roto/i.test(label)) {
    return { current: 0, max: 6 };
  }
  return null;
}

function buildRequirementChips(slot: MissionsV2Slot): string[] {
  const mission = slot.mission;
  const chips = new Set<string>();

  if (mission?.requirements) {
    mission.requirements
      .split(/[·\n]/)
      .map((value) => value.trim())
      .filter(Boolean)
      .forEach((value) => chips.add(value));
  }

  if (slot.slot === 'main') {
    chips.add('Boss: Acto 2');
    chips.add('Requiere objetivo activo');
  }

  if (slot.slot === 'hunt') {
    chips.add('Booster mañana activo con Heartbeat');
  }

  if (slot.slot === 'skill') {
    chips.add('Stat asignada');
  }

  if (chips.size === 0) {
    chips.add('Requisitos a confirmar');
  }

  return Array.from(chips).slice(0, 4);
}

function getSlotRarity(slot: MissionsV2Slot): Rarity {
  if (!slot.mission) {
    return 'common';
  }

  if (slot.slot === 'main') {
    return 'legendary';
  }

  if (slot.slot === 'hunt') {
    return 'epic';
  }

  if (slot.slot === 'skill') {
    return 'rare';
  }

  return 'common';
}

function getMarketRarity(slot: MissionsV2Slot['slot']): Rarity {
  if (slot === 'main') {
    return 'legendary';
  }
  if (slot === 'hunt') {
    return 'epic';
  }
  if (slot === 'skill') {
    return 'rare';
  }
  return 'common';
}

type MarketCardItem = {
  slot: MissionsV2Slot['slot'];
  proposals: MissionsV2MarketProposal[];
  key: MissionsV2Slot['slot'];
};

function getRewardCopy(slot: MissionsV2Slot): string {
  const reward = slot.mission?.reward;
  if (!reward) {
    return 'Botín en preparación';
  }
  const currency = reward.currency ?? 0;
  const items = reward.items?.length ? ` · ${reward.items.join(' + ')}` : '';
  return `${reward.xp} XP · ${currency} Monedas${items}`;
}

function formatProposalReward(proposal: MissionsV2MarketProposal): string {
  const { reward } = proposal;
  const currency = reward.currency ?? 0;
  const items = reward.items.length > 0 ? ` · ${reward.items.join(' + ')}` : '';
  return `${reward.xp} XP · ${currency} Monedas${items}`;
}

function extractProposalMetadata(proposal: MissionsV2MarketProposal): string[] {
  const metadataEntries: string[] = [];
  const metadata = proposal.metadata ?? {};

  for (const [rawKey, rawValue] of Object.entries(metadata)) {
    if (rawValue === null || rawValue === undefined || rawValue === '') {
      continue;
    }

    const keyLabel = rawKey
      .split(/[_-]/)
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ');

    if (typeof rawValue === 'number') {
      if (rawKey.toLowerCase().includes('multiplier')) {
        metadataEntries.push(`${keyLabel}: x${rawValue}`);
      } else {
        metadataEntries.push(`${keyLabel}: ${rawValue}`);
      }
      continue;
    }

    if (typeof rawValue === 'string' || typeof rawValue === 'boolean') {
      metadataEntries.push(`${keyLabel}: ${rawValue}`);
    }
  }

  return metadataEntries;
}

function formatCountdown(label: string): string {
  if (!label) {
    return 'Countdown pendiente';
  }
  return label;
}

type MarketBySlot = Partial<Record<MissionsV2Slot['slot'], MissionsV2MarketProposal[]>>;

function buildHeroLine(slot: MissionsV2Slot, market: MarketBySlot): string {
  if (slot.mission?.summary) {
    return slot.mission.summary;
  }
  const proposals = market[slot.slot] ?? [];
  if (proposals.length > 0) {
    const [first] = proposals;
    if (first.summary) {
      return first.summary;
    }
    if (first.objectives.length > 0) {
      return first.objectives[0] ?? 'Slot vacío. Elegí tu reto.';
    }
  }
  return 'Slot vacío. Elegí tu reto.';
}

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setPrefersReducedMotion(mediaQuery.matches);
    update();

    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return prefersReducedMotion;
}

function PetalField({ disabled }: { disabled: boolean }) {
  if (disabled) {
    return null;
  }

  return (
    <div className="missions-bg-petals" aria-hidden="true">
      {PETAL_FIELD.map((petal, index) => (
        <span
          key={`petal-${index}`}
          className="missions-bg-petal"
          style={{
            top: petal.top,
            left: petal.left,
            animationDelay: petal.delay,
            transform: `scale(${petal.scale})`,
          }}
        />
      ))}
    </div>
  );
}

function ClaimModal({
  state,
  onClose,
  prefersReducedMotion,
}: {
  state: ClaimModalState;
  onClose: () => void;
  prefersReducedMotion: boolean;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="missions-claim-modal" role="dialog" aria-modal="true" aria-label="Recompensa obtenida">
      <div className="missions-claim-modal__backdrop" aria-hidden="true" />
      <div className="missions-claim-modal__content">
        <Card
          className="missions-card missions-card--claim"
          title="Botín obtenido"
          subtitle={state.missionName}
          bodyClassName="gap-5"
        >
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className={classNames(
                'missions-claim-chest',
                prefersReducedMotion && 'missions-claim-chest--static',
              )}
              aria-hidden="true"
            >
              <span className="missions-claim-chest__lid" />
              <span className="missions-claim-chest__base" />
            </div>
            {!prefersReducedMotion && <span className="missions-claim-confetti" aria-hidden="true" />}
            <p className="text-sm text-slate-200">
              Tesoro protegido: XP, amuletos y monedas listos para tu vitrina.
            </p>
            <ul className="missions-claim-loot">
              <li className="missions-claim-loot__item">
                <span className="font-semibold">XP</span>
                <span>{state.rewards.xp}</span>
              </li>
              <li className="missions-claim-loot__item">
                <span className="font-semibold">Monedas</span>
                <span>{state.rewards.currency}</span>
              </li>
              <li className="missions-claim-loot__item missions-claim-loot__item--stacked">
                <span className="font-semibold">Loot</span>
                <p className="mt-1 text-xs text-slate-300">
                  {state.rewards.items.length > 0
                    ? state.rewards.items.join(' · ')
                    : 'Aura en preparación — pronto desbloqueamos tu trofeo.'}
                </p>
              </li>
            </ul>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-white/40 hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:w-auto"
            >
              Ver en trofeos
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300 sm:w-auto"
            >
              Cerrar
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MissionProgress({ slot, prefersReducedMotion }: { slot: MissionsV2Slot; prefersReducedMotion: boolean }) {
  const totalNodes = Math.max(3, Math.min(slot.progress.target || 0, slot.slot === 'hunt' ? 6 : 5));
  const ratio = slot.progress.target > 0 ? slot.progress.current / slot.progress.target : 0;

  return (
    <div className="missions-progress relative">
      <ProgressBar value={slot.progress.percent} />
      <div className="missions-progress__nodes" aria-hidden="true">
        {Array.from({ length: totalNodes }).map((_, index) => {
          const progress = totalNodes <= 1 ? 1 : index / (totalNodes - 1);
          const lit = ratio >= progress - 1e-3;
          const nodeClass = classNames(
            'missions-progress__node',
            lit && 'missions-progress__node--lit',
            slot.slot === 'hunt' && 'missions-progress__node--hunt',
            index === totalNodes - 1 && 'missions-progress__node--final',
            prefersReducedMotion && 'missions-progress__node--static',
          );
          return <span key={`${slot.id}-node-${index}`} className={nodeClass} />;
        })}
      </div>
    </div>
  );
}

function MissionPetals({
  slot,
  prefersReducedMotion,
  highlight,
}: {
  slot: MissionsV2Slot;
  prefersReducedMotion: boolean;
  highlight: boolean;
}) {
  return (
    <div
      className={classNames('missions-petals', highlight && 'missions-petals--highlight')}
      aria-label={`Pétalos restantes: ${slot.petals.remaining} de ${slot.petals.total}`}
    >
      {Array.from({ length: slot.petals.total }).map((_, index) => {
        const remaining = slot.petals.remaining;
        const alive = index < remaining;
        return (
          <span
            key={`${slot.id}-petal-${index}`}
            className={classNames(
              'missions-petal',
              alive ? 'missions-petal--alive' : 'missions-petal--withered',
              prefersReducedMotion && 'missions-petal--static',
              highlight && alive && 'missions-petal--bloom',
            )}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}

function MissionPetalsMini({ slot, highlight }: { slot: MissionsV2Slot; highlight: boolean }) {
  const total = slot.petals.total || 0;
  const ratio = total > 0 ? slot.petals.remaining / total : 0;
  const lit = Math.round(ratio * 3);

  return (
    <div
      className={classNames('missions-petals-mini', highlight && 'missions-petals-mini--highlight')}
      aria-label={`Pétalos protegidos: ${slot.petals.remaining} de ${slot.petals.total}`}
    >
      {Array.from({ length: 3 }).map((_, index) => (
        <span
          key={`${slot.id}-petal-mini-${index}`}
          className={classNames(
            'missions-petals-mini__dot',
            index < lit ? 'missions-petals-mini__dot--alive' : 'missions-petals-mini__dot--lost',
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function MissionHeartbeatStatus({ pending, highlight }: { pending: boolean; highlight: boolean }) {
  return (
    <span
      className={classNames(
        'missions-heartbeat-indicator',
        pending ? 'missions-heartbeat-indicator--pending' : 'missions-heartbeat-indicator--done',
        highlight && 'missions-heartbeat-indicator--pulse',
      )}
    >
      <span aria-hidden="true" className="missions-heartbeat-indicator__dot" />
      {pending ? 'Heartbeat pendiente' : 'Heartbeat sellado'}
    </span>
  );
}

export function MissionsV2Board({
  userId,
  gameMode,
}: {
  userId: string;
  gameMode?: GameMode | string | null;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const prefersReducedMotion = usePrefersReducedMotion();
  const normalizedGameMode = useMemo(() => normalizeGameModeValue(gameMode ?? null), [gameMode]);
  const { data, status, error, reload } = useRequest(() => getMissionsV2Board(), []);
  const [board, setBoard] = useState<MissionsV2BoardResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
  const [claimModal, setClaimModal] = useState<ClaimModalState | null>(null);
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);
  const [heartbeatFeedback, setHeartbeatFeedback] = useState<{ slotId: string; at: number } | null>(null);
  const [showHeartbeatToast, setShowHeartbeatToast] = useState(false);
  const [heartbeatToastKey, setHeartbeatToastKey] = useState<number | null>(null);
  const [flippedMarketCards, setFlippedMarketCards] = useState<Record<string, boolean>>({});
  const [marketCoverAspect, setMarketCoverAspect] = useState<Record<string, string>>({});
  const getViewModeFromLocation = useCallback(
    (loc: typeof location): 'active' | 'market' => {
      if (loc.hash.replace('#', '') === 'market') {
        return 'market';
      }
      const params = new URLSearchParams(loc.search);
      return params.get('tab') === 'market' ? 'market' : 'active';
    },
    [],
  );
  const [viewMode, setViewModeState] = useState<'active' | 'market'>(() => getViewModeFromLocation(location));
  const [activeMarketIndex, setActiveMarketIndex] = useState(0);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [activeMarketProposalBySlot, setActiveMarketProposalBySlot] = useState<
    Record<MissionsV2Slot['slot'], number>
  >(() => ({
    main: 0,
    hunt: 0,
    skill: 0,
  }));
  const [activeSlotStackBySlot, setActiveSlotStackBySlot] = useState<Record<string, number>>({});
  const hasTrackedView = useRef(false);
  const slotRefs = useRef<Record<string, HTMLElement | null>>({});
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const slotCarouselRef = useRef<HTMLDivElement | null>(null);
  const marketWheelDelta = useRef<Record<MissionsV2Slot['slot'], number>>({
    main: 0,
    hunt: 0,
    skill: 0,
  });
  const slotStackWheelDelta = useRef<Record<string, number>>({});

  const marketBySlot = useMemo<MarketBySlot>(() => {
    const map: MarketBySlot = {};
    if (!board) {
      return map;
    }

    for (const entry of board.market ?? []) {
      map[entry.slot] = entry.proposals;
    }

    return map;
  }, [board]);

  const orderedSlots = useMemo(() => {
    if (!board) {
      return [] as MissionsV2Slot[];
    }
    return [...board.slots].sort(
      (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot),
    );
  }, [board]);

  const slotIndexById = useMemo(() => {
    const map = new Map<string, number>();
    orderedSlots.forEach((slot, index) => {
      map.set(slot.id, index);
    });
    return map;
  }, [orderedSlots]);

  const orderedMarketSlots = useMemo(() => {
    return SLOT_ORDER.map((slotKey) => {
      const entry = board?.market.find((marketSlot) => marketSlot.slot === slotKey);
      return (
        entry ?? ({ slot: slotKey, proposals: [] as MissionsV2MarketProposal[] } as MissionsV2MarketSlot)
      );
    });
  }, [board]);

  const marketCards = useMemo<MarketCardItem[]>(() => {
    return orderedMarketSlots.map((entry) => ({
      slot: entry.slot,
      proposals: entry.proposals,
      key: entry.slot,
    }));
  }, [orderedMarketSlots]);

  useEffect(() => {
    const nextView = getViewModeFromLocation(location);
    setViewModeState((current) => (current === nextView ? current : nextView));
  }, [getViewModeFromLocation, location]);

  useEffect(() => {
    setActiveMarketProposalBySlot((prev) => {
      let changed = false;
      const next: Record<MissionsV2Slot['slot'], number> = {
        main: prev.main ?? 0,
        hunt: prev.hunt ?? 0,
        skill: prev.skill ?? 0,
      };
      for (const entry of orderedMarketSlots) {
        const proposals = entry.proposals ?? [];
        const current = next[entry.slot] ?? 0;
        const safeIndex = proposals.length > 0 ? Math.min(current, proposals.length - 1) : 0;
        if (safeIndex !== current) {
          next[entry.slot] = safeIndex;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [orderedMarketSlots]);

  const updateViewMode = useCallback(
    (mode: 'active' | 'market', options?: { replace?: boolean }) => {
      setViewModeState((current) => (current === mode ? current : mode));

      if (typeof window === 'undefined') {
        return;
      }

      const params = new URLSearchParams(location.search);
      if (mode === 'market') {
        params.set('tab', 'market');
      } else {
        params.delete('tab');
      }
      const searchString = params.toString();
      const nextSearch = searchString ? `?${searchString}` : '';
      const nextHash = mode === 'market' ? '#market' : '';

      if (location.search === nextSearch && location.hash === nextHash) {
        return;
      }

      navigate(
        {
          pathname: location.pathname,
          search: nextSearch,
          hash: mode === 'market' ? 'market' : '',
        },
        { replace: options?.replace ?? false },
      );
    },
    [location.hash, location.pathname, location.search, navigate],
  );

  const handleMarketProposalStep = useCallback(
    (slotKey: MissionsV2Slot['slot'], delta: number) => {
      setActiveMarketProposalBySlot((prev) => {
        const proposals = marketBySlot[slotKey] ?? [];
        const total = proposals.length;
        if (total === 0) {
          return prev;
        }
        const current = prev[slotKey] ?? 0;
        const next = Math.min(Math.max(current + delta, 0), total - 1);
        if (next === current) {
          return prev;
        }
        return { ...prev, [slotKey]: next };
      });
    },
    [marketBySlot],
  );

  const handleMarketStackWheel = useCallback(
    (slotKey: MissionsV2Slot['slot'], event: React.WheelEvent<HTMLDivElement>) => {
      const proposals = marketBySlot[slotKey] ?? [];
      if (proposals.length <= 1) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const threshold = 40;
      const pending = (marketWheelDelta.current[slotKey] ?? 0) + event.deltaY;
      if (Math.abs(pending) >= threshold) {
        const direction = pending > 0 ? 1 : -1;
        marketWheelDelta.current[slotKey] = pending - direction * threshold;
        handleMarketProposalStep(slotKey, direction);
      } else {
        marketWheelDelta.current[slotKey] = pending;
      }
    },
    [handleMarketProposalStep, marketBySlot],
  );

  const handleSlotStackStep = useCallback((slotId: string, delta: number, totalPanels: number) => {
    if (totalPanels <= 1) {
      return;
    }

    setActiveSlotStackBySlot((prev) => {
      const current = prev[slotId] ?? 0;
      const next = Math.min(Math.max(current + delta, 0), totalPanels - 1);
      if (next === current) {
        return prev;
      }
      return { ...prev, [slotId]: next };
    });
  }, []);

  const handleSlotStackWheel = useCallback(
    (slotId: string, totalPanels: number, event: React.WheelEvent<HTMLDivElement>) => {
      if (totalPanels <= 1) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const threshold = 40;
      const pending = (slotStackWheelDelta.current[slotId] ?? 0) + event.deltaY;
      if (Math.abs(pending) >= threshold) {
        const direction = pending > 0 ? 1 : -1;
        slotStackWheelDelta.current[slotId] = pending - direction * threshold;
        handleSlotStackStep(slotId, direction, totalPanels);
      } else {
        slotStackWheelDelta.current[slotId] = pending;
      }
    },
    [handleSlotStackStep],
  );

  const bossEnabled = useMemo(() => {
    if (!board) {
      return false;
    }
    const mainSlotState = board.slots.find((slot) => slot.slot === 'main');
    if (!mainSlotState || !mainSlotState.mission) {
      return false;
    }
    if (mainSlotState.state !== 'active') {
      return false;
    }
    return board.boss.status !== 'locked';
  }, [board]);

  useEffect(() => {
    setActiveSlotStackBySlot((prev) => {
      const next: Record<string, number> = {};
      let changed = false;
      orderedSlots.forEach((slot) => {
        const panelCount = slot.slot === 'main' && bossEnabled ? 2 : 1;
        const current = prev[slot.id] ?? 0;
        const clamped = Math.min(Math.max(current, 0), Math.max(0, panelCount - 1));
        next[slot.id] = clamped;
        if (clamped !== current) {
          changed = true;
        }
      });
      return changed ? next : prev;
    });

    slotStackWheelDelta.current = orderedSlots.reduce<Record<string, number>>((acc, slot) => {
      acc[slot.id] = slotStackWheelDelta.current[slot.id] ?? 0;
      return acc;
    }, {});
  }, [orderedSlots, bossEnabled]);

  const renderBossCard = useCallback(() => {
    if (!board) {
      return null;
    }

    const shield = parseShieldLabel(board.boss.countdown.label) ?? { current: 6, max: 6 };
    const bossCardStyle = buildMissionCardStyle('boss', normalizedGameMode);

    return (
      <Card
        className="missions-card missions-card--boss"
        title="Boss quincenal"
        subtitle={<p className="missions-card__subtitle">{board.boss.name}</p>}
        bodyClassName="missions-card__body missions-card__body--boss"
        style={bossCardStyle}
      >
        <div className="missions-boss-header">
          <div
            key={`shield-${shield.current}`}
            className="missions-boss-shield"
            role="img"
            aria-label={`Escudo del boss ${shield.current} de ${shield.max}`}
            data-crack-level={shield.max - shield.current}
          >
            {Array.from({ length: shield.max }).map((_, index) => {
              const cracked = index >= shield.current;
              return (
                <span
                  key={`shield-${index}`}
                  className={classNames(
                    'missions-boss-shield__segment',
                    cracked && 'missions-boss-shield__segment--cracked',
                  )}
                  aria-hidden="true"
                />
              );
            })}
          </div>
          <div className="missions-boss-countdown" aria-live="polite">
            <span className="missions-boss-countdown__label">Escudo</span>
            <span className="missions-boss-countdown__value">{board.boss.countdown.label}</span>
          </div>
        </div>
        <p className="missions-boss-copy">
          Derribá el escudo sosteniendo Heartbeat y prepará el golpe final. El Boss sólo responde si tu Main llegó al Acto 2.
        </p>
        <div className="missions-boss-actions">
          <button
            type="button"
            className="missions-boss-cta"
            disabled
            aria-disabled="true"
          >
            GOLPE ESPECIAL (ACTO 2 REQUERIDO)
          </button>
        </div>
      </Card>
    );
  }, [board]);

  useEffect(() => {
    if (status === 'success' && data) {
      setBoard(data);
    }
  }, [status, data]);

  useEffect(() => {
    if (orderedSlots.length === 0) {
      setActiveSlotIndex(0);
      return;
    }
    setActiveSlotIndex((current) => {
      if (current < orderedSlots.length) {
        return current;
      }
      return Math.max(0, orderedSlots.length - 1);
    });
  }, [orderedSlots]);

  useEffect(() => {
    if (marketCards.length === 0) {
      setActiveMarketIndex(0);
      return;
    }
    setActiveMarketIndex((current) => {
      if (current < marketCards.length) {
        return current;
      }
      return Math.max(0, marketCards.length - 1);
    });
  }, [marketCards]);

  useEffect(() => {
    setFlippedMarketCards((prev) => {
      const validKeys = new Set(marketCards.map((card) => card.key));
      const next: Record<string, boolean> = {};
      validKeys.forEach((key) => {
        if (prev[key]) {
          next[key] = true;
        }
      });
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length && nextKeys.every((key) => prev[key])) {
        return prev;
      }
      return next;
    });
  }, [marketCards]);

  useEffect(() => {
    setMarketCoverAspect((prev) => {
      const validKeys = new Set(marketCards.map((card) => card.key));
      const next: Record<string, string> = {};
      validKeys.forEach((key) => {
        const value = prev[key];
        if (value) {
          next[key] = value;
        }
      });
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (
        prevKeys.length === nextKeys.length &&
        nextKeys.every((key) => prev[key] === next[key])
      ) {
        return prev;
      }
      return next;
    });
  }, [marketCards]);

  useEffect(() => {
    if (!board || !expandedSlotId) {
      return;
    }
    if (!board.slots.some((slot) => slot.id === expandedSlotId)) {
      setExpandedSlotId(null);
    }
  }, [board, expandedSlotId]);

  useEffect(() => {
    if (!expandedSlotId) {
      return;
    }
    const slotIndex = slotIndexById.get(expandedSlotId);
    if (slotIndex == null) {
      setExpandedSlotId(null);
      return;
    }
    if (slotIndex !== activeSlotIndex) {
      setExpandedSlotId(null);
    }
  }, [activeSlotIndex, expandedSlotId, slotIndexById]);

  useEffect(() => {
    if (viewMode === 'active' || !expandedSlotId) {
      return;
    }
    setExpandedSlotId(null);
  }, [expandedSlotId, viewMode]);

  useEffect(() => {
    if (!heartbeatFeedback) {
      return;
    }

    setHeartbeatToastKey(heartbeatFeedback.at);
    if (typeof window === 'undefined') {
      setShowHeartbeatToast(true);
      return;
    }

    setShowHeartbeatToast(false);
    const raf = window.requestAnimationFrame(() => setShowHeartbeatToast(true));
    return () => window.cancelAnimationFrame(raf);
  }, [heartbeatFeedback]);

  useEffect(() => {
    if (!heartbeatFeedback) {
      return;
    }

    if (prefersReducedMotion || typeof window === 'undefined') {
      setHeartbeatFeedback(null);
      return;
    }

    const timeout = window.setTimeout(() => setHeartbeatFeedback(null), 900);
    return () => window.clearTimeout(timeout);
  }, [heartbeatFeedback, prefersReducedMotion]);

  useEffect(() => {
    if (!showHeartbeatToast) {
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const timeout = window.setTimeout(() => setShowHeartbeatToast(false), 3200);
    return () => window.clearTimeout(timeout);
  }, [showHeartbeatToast]);

  useEffect(() => {
    const unsubscribe = onDevUserOverrideChange(() => {
      setBoard(null);
      setBusyMap({});
      setExpandedSlotId(null);
      reload();
    });
    return unsubscribe;
  }, [reload]);

  useEffect(() => {
    if (!hasTrackedView.current && status === 'success' && data) {
      emitMissionsV2Event('missions_v2_view', { userId, source: 'board' });
      hasTrackedView.current = true;
    }
  }, [status, data, userId]);

  const refreshBoard = useCallback(async () => {
    const nextBoard = await getMissionsV2Board();
    setBoard(nextBoard);
  }, []);

  const isOnMissionsRoute = useMemo(
    () => location.pathname.endsWith('/missions-v2'),
    [location.pathname],
  );

  const setSlotBusy = useCallback((slotId: string, value: boolean) => {
    setBusyMap((current) => ({ ...current, [slotId]: value }));
  }, []);

  const handleHeartbeat = useCallback(
    async (slot: MissionsV2Slot) => {
      const missionId = slot.mission?.id;

      if (!missionId) {
        setActionError('Esta misión no está disponible en este momento.');
        return;
      }

      setSlotBusy(slot.id, true);
      setActionError(null);
      try {
        await postMissionsV2Heartbeat(missionId);
        emitMissionsV2Event('missions_v2_heartbeat', {
          userId,
          slot: slot.slot,
          missionId,
        });
        setHeartbeatFeedback({ slotId: slot.id, at: Date.now() });
        await refreshBoard();
      } catch (err) {
        console.error('Failed to mark heartbeat', err);
        setActionError('No pudimos registrar el Heartbeat. Intentá nuevamente.');
      } finally {
        setSlotBusy(slot.id, false);
      }
    },
    [refreshBoard, setSlotBusy, userId],
  );

  const handleLinkDaily = useCallback(
    async (slot: MissionsV2Slot) => {
      const mission = slot.mission;

      if (!mission) {
        setActionError('Esta misión no está disponible en este momento.');
        return;
      }

      const missionId = mission.id;
      setSlotBusy(slot.id, true);
      setActionError(null);
      const [firstTask] = mission.tasks;

      if (!firstTask) {
        setActionError('No hay tareas vinculables para esta misión.');
        setSlotBusy(slot.id, false);
        return;
      }

      try {
        const response = await linkMissionsV2Daily(missionId, firstTask.id);
        setBoard(response.board);
        emitMissionsV2Event('missions_v2_select_open', {
          userId,
          slot: slot.slot,
          missionId,
          source: 'link_daily',
        });
      } catch (err) {
        console.error('Failed to link daily task', err);
        setActionError('No pudimos vincular la Daily con esta misión.');
      } finally {
        setSlotBusy(slot.id, false);
      }
    },
    [setSlotBusy, userId],
  );

  const handleClaim = useCallback(
    async (slot: MissionsV2Slot) => {
      const missionId = slot.mission?.id;

      if (!missionId) {
        setActionError('Esta misión no está disponible en este momento.');
        return;
      }

      setSlotBusy(slot.id, true);
      setActionError(null);
      try {
        const response = await claimMissionsV2Mission(missionId);
        setBoard(response.board);
        setClaimModal({
          missionName: slot.mission?.name ?? 'Recompensa de misión',
          slot: slot.slot,
          rewards: {
            xp: response.rewards.xp,
            currency: response.rewards.currency,
            items: [...response.rewards.items],
          },
        });
        emitMissionsV2Event('missions_v2_reward_claimed', {
          userId,
          slot: slot.slot,
          missionId,
          reward: response.rewards,
        });
      } catch (err) {
        console.error('Failed to claim mission reward', err);
        setActionError('No pudimos procesar el claim. Intentá más tarde.');
      } finally {
        setSlotBusy(slot.id, false);
      }
    },
    [userId, setSlotBusy],
  );

  const scrollSlotCarouselToIndex = useCallback(
    (index: number) => {
      if (!prefersReducedMotion) {
        return;
      }

      const container = slotCarouselRef.current;
      if (!container) {
        return;
      }

      const element = container.querySelector<HTMLElement>(
        `[data-slot-carousel-index='${index}']`,
      );
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    },
    [prefersReducedMotion],
  );

  const handleActivateProposal = useCallback(
    (slotKey: MissionsV2Slot['slot'], proposal: MissionsV2MarketProposal) => {
      if (!board) {
        setActionError('No pudimos preparar el tablero.');
        return;
      }

      const slotIndexInBoard = board.slots.findIndex((slot) => slot.slot === slotKey);
      if (slotIndexInBoard === -1) {
        setActionError('No encontramos un slot compatible para esta misión.');
        return;
      }

      const slot = board.slots[slotIndexInBoard];

      if (slot.mission) {
        setActionError('Este slot ya tiene una misión activa.');
        return;
      }

      if (slot.state !== 'idle') {
        setActionError('Liberá el slot antes de activar una nueva misión.');
        return;
      }

      const missionId = `market-${proposal.id}`;
      const objectives = proposal.objectives.length > 0 ? proposal.objectives : [proposal.objective];
      const progressTarget = Math.max(objectives.length, 3);
      const countdownDays = proposal.duration_days ?? 0;
      const countdownLabel = countdownDays > 0 ? `Termina en ${countdownDays}d` : 'Sin límite';
      const endsAt = countdownDays > 0 ? new Date(Date.now() + countdownDays * 86_400_000).toISOString() : null;

      const nextSlot: MissionsV2Slot = {
        ...slot,
        mission: {
          id: missionId,
          name: proposal.name,
          type: slotKey,
          summary: proposal.summary,
          requirements: proposal.requirements,
          objective: proposal.objective,
          objectives,
          reward: {
            xp: proposal.reward.xp,
            currency: proposal.reward.currency,
            items: [...proposal.reward.items],
          },
          tasks: [],
          tags: proposal.tags,
          metadata: proposal.metadata,
        },
        state: 'active',
        heartbeat_today: false,
        progress: {
          current: 0,
          target: progressTarget,
          percent: 0,
        },
        countdown: {
          ...slot.countdown,
          ends_at: endsAt,
          label: countdownLabel,
        },
        actions: [
          {
            id: `${missionId}:heartbeat`,
            type: 'heartbeat',
            label: 'Registrar Heartbeat',
            enabled: true,
          },
          {
            id: `${missionId}:link_daily`,
            type: 'link_daily',
            label: 'Vincular Daily',
            enabled: true,
          },
          {
            id: `${missionId}:claim`,
            type: 'claim',
            label: 'Reclamar botín',
            enabled: false,
          },
        ],
        claim: {
          ...slot.claim,
          available: false,
          enabled: false,
        },
      };

      const nextSlots = [...board.slots];
      nextSlots[slotIndexInBoard] = nextSlot;

      const nextMarket = board.market.map((entry): MissionsV2MarketSlot =>
        entry.slot === slotKey
          ? {
              ...entry,
              proposals: entry.proposals.filter((item) => item.id !== proposal.id),
            }
          : entry,
      );

      setBoard({
        ...board,
        slots: nextSlots,
        market: nextMarket,
      });

      setFlippedMarketCards({});
      updateViewMode('active');

      setActionError(null);
      const nextSlotIndex = slotIndexById.get(nextSlot.id);
      if (nextSlotIndex != null) {
        setActiveSlotIndex(nextSlotIndex);
        scrollSlotCarouselToIndex(nextSlotIndex);
      }
      setExpandedSlotId(nextSlot.id);
      if (typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          const element = slotRefs.current[nextSlot.id] ?? null;
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      } else {
        const element = slotRefs.current[nextSlot.id] ?? null;
        element?.scrollIntoView({ block: 'center' });
      }
      emitMissionsV2Event('missions_v2_market_activate', {
        userId,
        slot: nextSlot.slot,
        missionId: nextSlot.mission?.id ?? null,
        proposalId: proposal.id,
      });
    },
    [
      board,
      setBoard,
      setActionError,
      setExpandedSlotId,
      slotIndexById,
      scrollSlotCarouselToIndex,
      setActiveSlotIndex,
      userId,
    ],
  );

  const scrollCarouselToIndex = useCallback(
    (index: number) => {
      if (!prefersReducedMotion) {
        return;
      }

      const container = carouselRef.current;
      if (!container) {
        return;
      }

      const element = container.querySelector<HTMLElement>(`[data-carousel-index='${index}']`);
      element?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    },
    [prefersReducedMotion],
  );

  const handleCarouselStep = useCallback(
    (direction: 'next' | 'prev') => {
      if (marketCards.length === 0) {
        return;
      }
      const delta = direction === 'next' ? 1 : -1;
      const nextIndex = (activeMarketIndex + delta + marketCards.length) % marketCards.length;
      setActiveMarketIndex(nextIndex);
      scrollCarouselToIndex(nextIndex);
    },
    [activeMarketIndex, marketCards.length, scrollCarouselToIndex],
  );

  const handleSlotCarouselStep = useCallback(
    (direction: 'next' | 'prev') => {
      if (orderedSlots.length === 0) {
        return;
      }
      const delta = direction === 'next' ? 1 : -1;
      const nextIndex = (activeSlotIndex + delta + orderedSlots.length) % orderedSlots.length;
      setActiveSlotIndex(nextIndex);
      scrollSlotCarouselToIndex(nextIndex);
    },
    [activeSlotIndex, orderedSlots.length, scrollSlotCarouselToIndex],
  );

  const handleSlotCardSelect = useCallback(
    (index: number) => {
      if (index === activeSlotIndex) {
        return;
      }
      setActiveSlotIndex(index);
      scrollSlotCarouselToIndex(index);
    },
    [activeSlotIndex, scrollSlotCarouselToIndex],
  );

  const handleSlotCardKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, slotId: string, index: number) => {
      if (event.defaultPrevented || event.target !== event.currentTarget) {
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleSlotCarouselStep('next');
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleSlotCarouselStep('prev');
        return;
      }

      const slot = orderedSlots.find((item) => item.id === slotId);
      if (slot?.slot === 'main' && bossEnabled) {
        const totalPanels = 2;
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          handleSlotStackStep(slotId, -1, totalPanels);
          return;
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          handleSlotStackStep(slotId, 1, totalPanels);
          return;
        }
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSlotCardSelect(index);
        setExpandedSlotId((current) => (current === slotId ? null : slotId));
      }
    },
    [
      bossEnabled,
      handleSlotCarouselStep,
      handleSlotCardSelect,
      handleSlotStackStep,
      orderedSlots,
      setExpandedSlotId,
    ],
  );

  const handleMarketCardToggle = useCallback(
    (slotKey: MissionsV2Slot['slot'], index: number) => {
      if (index !== activeMarketIndex) {
        setActiveMarketIndex(index);
        scrollCarouselToIndex(index);
        return;
      }

      const wasOpen = Boolean(flippedMarketCards[slotKey]);

      setFlippedMarketCards((prev) => {
        const isOpen = Boolean(prev[slotKey]);
        if (isOpen) {
          return {};
        }
        return { [slotKey]: true };
      });

      if (wasOpen) {
        return;
      }

      setActiveMarketProposalBySlot((prev) => {
        if ((prev[slotKey] ?? 0) === 0) {
          return prev;
        }
        return { ...prev, [slotKey]: 0 };
      });

      marketWheelDelta.current[slotKey] = 0;
    },
    [activeMarketIndex, flippedMarketCards, scrollCarouselToIndex],
  );

  const handleMarketCardKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, slotKey: MissionsV2Slot['slot'], index: number) => {
      if (event.defaultPrevented || event.target !== event.currentTarget) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleMarketCardToggle(slotKey, index);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleCarouselStep('next');
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleCarouselStep('prev');
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const proposals = marketBySlot[slotKey] ?? [];
        if (proposals.length <= 1) {
          return;
        }
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        handleMarketProposalStep(slotKey, direction);
      }
    },
    [handleMarketCardToggle, handleCarouselStep, handleMarketProposalStep, marketBySlot],
  );

  const handleMarketCoverLoad = useCallback(
    (cardKey: MissionsV2Slot['slot'], event: SyntheticEvent<HTMLImageElement>) => {
      const image = event.currentTarget;
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        const ratio = image.naturalWidth / image.naturalHeight;
        if (!Number.isFinite(ratio) || ratio <= 0) {
          return;
        }
        const clamped = Math.min(Math.max(ratio, 0.56), 0.75);
        const value = clamped.toFixed(4);
        setMarketCoverAspect((prev) => {
          if (prev[cardKey] === value) {
            return prev;
          }
          return { ...prev, [cardKey]: value };
        });
      }
    },
    [],
  );

  const handleUnavailableAction = useCallback((action: MissionsV2Action) => {
    if (action.type === 'special_strike' || action.type === 'submit_evidence') {
      setActionError('Esta acción estará disponible en la próxima iteración del tablero.');
    } else if (action.type === 'abandon') {
      setActionError('El Abandono Honroso se habilitará cuando el flujo esté completo.');
    }
  }, []);

  const scrollToMarket = useCallback(() => {
    updateViewMode('market');
    if (marketCards.length === 0) {
      return;
    }
    if (typeof window === 'undefined') {
      scrollCarouselToIndex(activeMarketIndex);
      return;
    }
    window.requestAnimationFrame(() => {
      scrollCarouselToIndex(activeMarketIndex);
      const element = carouselRef.current?.querySelector<HTMLElement>(
        `[data-carousel-index='${activeMarketIndex}'] article`,
      );
      element?.focus({ preventScroll: true });
    });
  }, [activeMarketIndex, marketCards.length, scrollCarouselToIndex, updateViewMode]);

  const focusSlot = useCallback(
    (slot: MissionsV2Slot) => {
      const slotIndex = slotIndexById.get(slot.id);
      if (slotIndex != null) {
        setActiveSlotIndex(slotIndex);
        scrollSlotCarouselToIndex(slotIndex);
      }

      const element = slotRefs.current[slot.id];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setExpandedSlotId(slot.id);
    },
    [scrollSlotCarouselToIndex, setActiveSlotIndex, slotIndexById],
  );

  const registerSlotRef = useCallback(
    (slotId: string) => (element: HTMLElement | null) => {
      slotRefs.current[slotId] = element;
    },
    [],
  );

  useEffect(() => {
    if (viewMode !== 'market') {
      return;
    }
    const container = carouselRef.current;
    if (!container) {
      return;
    }

    let raf = 0;
    const updateActive = () => {
      const items = container.querySelectorAll<HTMLElement>('[data-carousel-index]');
      if (items.length === 0) {
        return;
      }
      const nodes = Array.from(items);
      const { left, width } = container.getBoundingClientRect();
      const center = left + width / 2;
      let closestIndex = activeMarketIndex;
      let closestDistance = Number.POSITIVE_INFINITY;
      nodes.forEach((node) => {
        const rect = node.getBoundingClientRect();
        const nodeCenter = rect.left + rect.width / 2;
        const distance = Math.abs(center - nodeCenter);
        if (distance < closestDistance - 0.5) {
          closestDistance = distance;
          const value = node.getAttribute('data-carousel-index');
          closestIndex = value ? Number.parseInt(value, 10) : 0;
        }
      });
      setActiveMarketIndex((current) => (current === closestIndex ? current : closestIndex));
    };

    updateActive();

    const handleScroll = () => {
      if (raf) {
        cancelAnimationFrame(raf);
      }
      raf = window.requestAnimationFrame(updateActive);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, [activeMarketIndex, viewMode, marketCards]);

  useEffect(() => {
    if (viewMode !== 'market') {
      return;
    }
    if (marketCards.length === 0) {
      return;
    }

    if (typeof window === 'undefined') {
      scrollCarouselToIndex(activeMarketIndex);
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      scrollCarouselToIndex(activeMarketIndex);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [viewMode, activeMarketIndex, marketCards.length, scrollCarouselToIndex]);

  useEffect(() => {
    if (viewMode !== 'active') {
      return;
    }
    if (orderedSlots.length === 0) {
      return;
    }

    if (typeof window === 'undefined') {
      scrollSlotCarouselToIndex(activeSlotIndex);
      return;
    }

    const raf = window.requestAnimationFrame(() => {
      scrollSlotCarouselToIndex(activeSlotIndex);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [viewMode, activeSlotIndex, orderedSlots.length, scrollSlotCarouselToIndex]);

  useEffect(() => {
    if (!expandedSlotId) {
      return;
    }
    const slotIndex = slotIndexById.get(expandedSlotId);
    if (slotIndex != null) {
      setActiveSlotIndex((current) => (current === slotIndex ? current : slotIndex));
      scrollSlotCarouselToIndex(slotIndex);
    }
  }, [expandedSlotId, slotIndexById, scrollSlotCarouselToIndex]);

  const renderSlotCard = (slot: MissionsV2Slot) => {
    const mission = slot.mission;
    const busy = Boolean(busyMap[slot.id]);
    const rarity = getSlotRarity(slot);
    const canClaim =
      Boolean(mission) && FEATURE_MISSIONS_V2 && isOnMissionsRoute && slot.claim.available && slot.claim.enabled;
    const details = SLOT_DETAILS[slot.slot];
    const stateConfig = STATE_LABELS[slot.state];
    const requirementChips = buildRequirementChips(slot);
    const heartbeatPending = !slot.heartbeat_today;
    const heroLine = buildHeroLine(slot, marketBySlot);
    const rewardCopy = getRewardCopy(slot);
    const heartbeatAction = slot.actions.find((action) => action.type === 'heartbeat');
    const linkAction = slot.actions.find((action) => action.type === 'link_daily');
    const expandable = Boolean(mission);
    const slotIndex = slotIndexById.get(slot.id) ?? -1;
    const isActiveSlot = slotIndex === activeSlotIndex;
    const isExpanded = isActiveSlot && expandedSlotId === slot.id;
    const detailsId = `${slot.id}-details`;
    const heartbeatHighlight = heartbeatFeedback?.slotId === slot.id;

    type PrimaryAction = {
      key: string;
      label: string;
      onClick?: () => void;
      disabled: boolean;
      tone: 'primary' | 'neutral';
    };

    let primaryAction: PrimaryAction | null = null;
    let primaryActionId: string | null = null;

    if (canClaim) {
      primaryAction = {
        key: 'claim',
        label: 'Abrir cofre',
        onClick: () => handleClaim(slot),
        disabled: busy,
        tone: 'primary',
      };
      primaryActionId = 'claim';
    } else if (heartbeatAction) {
      primaryAction = {
        key: heartbeatAction.id,
        label: heartbeatAction.label,
        onClick: () => handleHeartbeat(slot),
        disabled: busy || !heartbeatAction.enabled || !mission,
        tone: 'primary',
      };
      primaryActionId = heartbeatAction.id;
    } else if (linkAction) {
      primaryAction = {
        key: linkAction.id,
        label: 'Vincular Daily',
        onClick: () => handleLinkDaily(slot),
        disabled: busy || !linkAction.enabled || !mission,
        tone: 'primary',
      };
      primaryActionId = linkAction.id;
    } else if (mission && slot.actions.length > 0) {
      const [firstAction] = slot.actions.filter((action) => action.type !== 'claim');
      if (firstAction) {
        primaryAction = {
          key: firstAction.id,
          label: firstAction.label,
          onClick: firstAction.enabled ? () => handleUnavailableAction(firstAction) : undefined,
          disabled: !firstAction.enabled || busy,
          tone: 'neutral',
        };
        primaryActionId = firstAction.id;
      }
    }

    if (!primaryAction) {
      primaryAction = {
        key: 'market',
        label: 'Ir al market',
        onClick: scrollToMarket,
        disabled: false,
        tone: 'neutral',
      };
      primaryActionId = 'market';
    }

    const secondaryActions = slot.actions.filter((action) => {
      if (action.type === 'claim') {
        return false;
      }
      if (primaryActionId && action.id === primaryActionId) {
        return false;
      }
      return true;
    });

    const slotCardStyle = buildMissionCardStyle(slot.slot, normalizedGameMode);

    const card = (
      <Card
        key={slot.id}
        className={classNames(
          'missions-card',
          details.gradient,
          details.aura,
          !prefersReducedMotion && 'transition-transform duration-200 ease-out hover:-translate-y-0.5',
          slot.state === 'cooldown' && 'missions-card--frozen',
          slot.state === 'succeeded' && canClaim && 'missions-card--claim-ready',
          heartbeatHighlight && 'missions-card--heartbeat',
        )}
        data-rarity={rarity}
        data-slot={slot.slot}
        style={slotCardStyle}
        ref={registerSlotRef(slot.id)}
        bodyClassName={classNames(
          'missions-card__body missions-card__body--slot',
          isExpanded && 'missions-card__body--expanded',
        )}
        title={`${details.emoji} ${details.label}`}
        subtitle={
          <p className="missions-card__subtitle">{mission?.name ?? 'Slot vacío. Elegí tu reto.'}</p>
        }
        rightSlot={
          <span className={classNames('missions-chip', `missions-chip--${stateConfig.tone}`)}>
            {stateConfig.label}
          </span>
        }
      >
        <div className="missions-slot-card__summary">
          <button
            type="button"
            className="missions-slot-card__toggle"
            onClick={() => (expandable ? setExpandedSlotId(isExpanded ? null : slot.id) : null)}
            aria-expanded={isExpanded}
            aria-controls={detailsId}
            disabled={!expandable}
          >
            <p className="missions-slot-card__hero">{heroLine}</p>
            <div className="missions-slot-card__progress">
              <MissionProgress slot={slot} prefersReducedMotion={prefersReducedMotion} />
            </div>
          </button>
          <div className="missions-slot-card__status">
            <MissionPetalsMini slot={slot} highlight={Boolean(heartbeatHighlight)} />
            <MissionHeartbeatStatus pending={heartbeatPending} highlight={Boolean(heartbeatHighlight)} />
          </div>
          <div className="missions-slot-card__cta">
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled}
              className={classNames(
                'missions-slot-card__cta-btn',
                primaryAction.tone === 'primary'
                  ? 'missions-slot-card__cta-btn--primary'
                  : 'missions-slot-card__cta-btn--neutral',
                (primaryAction.disabled || busy) && 'missions-slot-card__cta-btn--disabled',
                heartbeatAction && primaryAction.key === heartbeatAction.id && 'missions-slot-card__cta-btn--heartbeat',
              )}
              data-highlight={
                heartbeatAction && primaryAction.key === heartbeatAction.id && heartbeatHighlight ? 'true' : undefined
              }
            >
              {primaryAction.label}
            </button>
          </div>
        </div>
        <div
          id={detailsId}
          className="missions-slot-card__details"
          data-open={isExpanded ? 'true' : 'false'}
        >
          <div className="missions-slot-card__chips">
            {requirementChips.map((chip) => (
              <span key={`${slot.id}-req-${chip}`} className="missions-requirement">
                {chip}
              </span>
            ))}
          </div>
          <div className="missions-slot-card__objective">
            <span className="missions-slot-card__section-label">Objetivo</span>
            <p>{mission?.objective ?? 'Activa una misión del market para este slot.'}</p>
            <p className="missions-slot-card__countdown">{formatCountdown(slot.countdown.label)}</p>
          </div>
          <div className="missions-slot-card__progress-expanded">
            <MissionProgress slot={slot} prefersReducedMotion={prefersReducedMotion} />
            <MissionPetals
              slot={slot}
              prefersReducedMotion={prefersReducedMotion}
              highlight={Boolean(heartbeatHighlight)}
            />
          </div>
          <div className="missions-slot-card__reward">
            <span className="missions-slot-card__section-label">Botín base</span>
            <div className="missions-slot-card__reward-pill">{rewardCopy}</div>
          </div>
          {secondaryActions.length > 0 && (
            <div className="missions-slot-card__secondary-actions">
              {secondaryActions.map((action) => {
                const isHeartbeat = action.type === 'heartbeat';
                const isLinkDaily = action.type === 'link_daily';
                const isDisabled = !action.enabled || busy || !mission;

                if (isHeartbeat) {
                  return (
                    <button
                      key={action.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleHeartbeat(slot)}
                      className={classNames(
                        'missions-heartbeat-btn',
                        isDisabled && 'missions-heartbeat-btn--disabled',
                        prefersReducedMotion && 'missions-heartbeat-btn--static',
                      )}
                      data-highlight={heartbeatHighlight ? 'true' : undefined}
                    >
                      <span aria-hidden="true">💓</span>
                      {action.label}
                    </button>
                  );
                }

                if (isLinkDaily) {
                  return (
                    <button
                      key={action.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleLinkDaily(slot)}
                      className={classNames(
                        'missions-action-btn missions-action-btn--link',
                        isDisabled && 'missions-action-btn--disabled',
                      )}
                    >
                      Vincular Daily
                    </button>
                  );
                }

                return (
                  <button
                    key={action.id}
                    type="button"
                    disabled
                    onClick={() => handleUnavailableAction(action)}
                    className="missions-action-btn missions-action-btn--disabled"
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {slot.state === 'cooldown' && (
          <div className="missions-cooldown-overlay" aria-live="polite">
            <span>{slot.countdown.label || 'Enfriamiento 15D'}</span>
          </div>
        )}
        {!mission && (
          <div className="missions-slot-empty">
            <div className="missions-slot-empty__content">
              <p className="text-sm font-semibold text-slate-100">Slot vacío. Elegí tu reto.</p>
              <p className="text-xs text-slate-300">
                Explorá el market para activar esta misión y proteger los pétalos.
              </p>
              <button type="button" className="missions-slot-empty__cta" disabled>
                Activar en slot {details.label}
              </button>
            </div>
          </div>
        )}
      </Card>
    );

    if (slot.slot === 'main' && bossEnabled) {
      const totalPanels = 2;
      const stackIndex = Math.min(activeSlotStackBySlot[slot.id] ?? 0, totalPanels - 1);
      const hasPrev = stackIndex > 0;
      const hasNext = stackIndex < totalPanels - 1;

      return (
        <div
          className="missions-slot-stack"
          data-active={isActiveSlot ? 'true' : 'false'}
          data-has-prev={hasPrev ? 'true' : undefined}
          data-has-next={hasNext ? 'true' : undefined}
          onWheel={isActiveSlot ? (event) => handleSlotStackWheel(slot.id, totalPanels, event) : undefined}
        >
          <div
            className="missions-slot-stack__inner"
            style={{ transform: `translateY(${stackIndex * -100}%)` }}
          >
            <div className="missions-slot-stack__panel missions-slot-stack__panel--main">{card}</div>
            <div className="missions-slot-stack__panel missions-slot-stack__panel--boss">{renderBossCard()}</div>
          </div>
          <div className="missions-slot-stack__controls" aria-hidden={!isActiveSlot}>
            <button
              type="button"
              className="missions-slot-stack__control"
              onClick={(event) => {
                event.stopPropagation();
                handleSlotStackStep(slot.id, -1, totalPanels);
              }}
              disabled={!hasPrev}
              aria-label="Ver misión principal"
            >
              ↑
            </button>
            <span className="missions-slot-stack__counter">{stackIndex + 1} / {totalPanels}</span>
            <button
              type="button"
              className="missions-slot-stack__control"
              onClick={(event) => {
                event.stopPropagation();
                handleSlotStackStep(slot.id, 1, totalPanels);
              }}
              disabled={!hasNext}
              aria-label="Ver misión del boss"
            >
              ↓
            </button>
          </div>
        </div>
      );
    }

    return card;
  };

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="missions-board" data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}>
        <div className="missions-board__background" aria-hidden="true" />
        <PetalField disabled={prefersReducedMotion} />
        <div className="missions-board__content">
          <Card title="Misiones v2" subtitle="Cargando tablero" className="missions-card" bodyClassName="gap-6">
            <div className="missions-skeleton" />
            <div className="missions-skeleton missions-skeleton--thin" />
            <div className="missions-skeleton missions-skeleton--thin" />
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'error' || !board) {
    return (
      <div className="missions-board" data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}>
        <div className="missions-board__background" aria-hidden="true" />
        <PetalField disabled={prefersReducedMotion} />
        <div className="missions-board__content space-y-4">
          <ToastBanner tone="error" message="No pudimos cargar Misiones v2. Recargá la página para reintentar." />
          {error && (
            <pre className="missions-error-log">{String(error)}</pre>
          )}
          <button
            type="button"
            onClick={reload}
            className="missions-action-btn missions-action-btn--retry"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const activeMarketCard = marketCards[activeMarketIndex] ?? null;
  const activeSlotCard = orderedSlots[activeSlotIndex] ?? null;

  const firstClaimableSlot = orderedSlots.find((slot) => {
    if (!slot.mission) {
      return false;
    }
    const canClaim =
      FEATURE_MISSIONS_V2 &&
      isOnMissionsRoute &&
      slot.claim.available &&
      slot.claim.enabled;
    return canClaim && !busyMap[slot.id];
  });

  const firstHeartbeatSlot = orderedSlots.find((slot) => {
    if (!slot.mission || busyMap[slot.id]) {
      return false;
    }
    const heartbeatAction = slot.actions.find((action) => action.type === 'heartbeat');
    return Boolean(heartbeatAction && heartbeatAction.enabled);
  });

  const showStickyBar = Boolean(firstClaimableSlot || firstHeartbeatSlot);

  return (
    <div className="missions-board" data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}>
      <div className="missions-board__background" aria-hidden="true" />
      <PetalField disabled={prefersReducedMotion} />
      <div className="missions-board__content">
        {board.communications.length > 0 && (
          <div className="space-y-3">
            {board.communications.map((comm) => (
              <ToastBanner
                key={comm.id}
                tone={comm.type === 'daily' ? 'success' : 'info'}
                message={comm.message}
              />
            ))}
          </div>
        )}

        {showHeartbeatToast && (
          <ToastBanner
            key={heartbeatToastKey ?? 'missions-heartbeat-toast'}
            tone="success"
            message="Latido registrado"
            className="missions-toast missions-toast--heartbeat"
          />
        )}

        {actionError && <ToastBanner tone="error" message={actionError} />}

        <div
          className="missions-view-toggle"
          role="tablist"
          aria-label="Secciones del tablero de misiones"
        >
          <button
            type="button"
            role="tab"
            id="missions-v2-tab-active"
            aria-selected={viewMode === 'active'}
            aria-controls="missions-v2-panel-active"
            className={classNames(
              'missions-view-toggle__chip',
              viewMode === 'active' && 'missions-view-toggle__chip--active',
            )}
            onClick={() => updateViewMode('active')}
          >
            Misiones activas
          </button>
          <button
            type="button"
            role="tab"
            id="missions-v2-tab-market"
            aria-selected={viewMode === 'market'}
            aria-controls="missions-v2-panel-market"
            className={classNames(
              'missions-view-toggle__chip',
              viewMode === 'market' && 'missions-view-toggle__chip--active',
            )}
            onClick={() => updateViewMode('market')}
          >
            Market de misiones
          </button>
        </div>

        <div
          id="missions-v2-panel-active"
          role="tabpanel"
          aria-labelledby="missions-v2-tab-active"
          hidden={viewMode !== 'active'}
          className="missions-board__panel"
        >
          <div className="missions-active-carousel">
            <div className="missions-active-carousel__controls">
              <p className="missions-active-carousel__hint">
                Deslizá para navegar tus slots activos.
              </p>
              <div className="missions-active-carousel__buttons">
                <button
                  type="button"
                  className="missions-active-carousel__button"
                  onClick={() => handleSlotCarouselStep('prev')}
                  aria-label="Ver slot anterior"
                  disabled={orderedSlots.length === 0}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="missions-active-carousel__button"
                  onClick={() => handleSlotCarouselStep('next')}
                  aria-label="Ver siguiente slot"
                  disabled={orderedSlots.length === 0}
                >
                  →
                </button>
              </div>
            </div>

            {orderedSlots.length === 0 ? (
              <div className="missions-active-carousel__empty">
                <p className="missions-active-carousel__empty-title">Sin misiones activas</p>
                <p className="missions-active-carousel__empty-copy">
                  Activá una propuesta desde el market para ver tu progreso acá.
                </p>
              </div>
            ) : (
              <>
                <div
                  className="missions-active-carousel__track"
                  ref={slotCarouselRef}
                  role="listbox"
                  aria-label="Slots de misiones activas"
                >
                  {orderedSlots.map((slot, index) => {
                    const isActiveCard = index === activeSlotIndex;
                    const totalSlots = orderedSlots.length;
                    let relativeOffset = index - activeSlotIndex;
                    if (totalSlots > 1) {
                      const half = totalSlots / 2;
                      if (relativeOffset > half) {
                        relativeOffset -= totalSlots;
                      } else if (relativeOffset < -half) {
                        relativeOffset += totalSlots;
                      }
                    }
                    const maxVisibleOffset = Math.min(2, Math.max(totalSlots - 1, 1));
                    const limitedOffset = Math.max(
                      Math.min(relativeOffset, maxVisibleOffset),
                      -maxVisibleOffset,
                    );
                    const angle = (Math.PI / 8) * limitedOffset;
                    const depth = Math.cos(angle);
                    const translateX = Math.sin(angle) * 34;
                    const translateY = (1 - depth) * 60;
                    const scale = 0.82 + 0.14 * depth;
                    const opacity = 0.5 + 0.5 * depth;
                    const rotate = Math.sin(angle) * -4.5;
                    const zIndex = Math.round((depth + 1) * 40) + (isActiveCard ? 80 : 0);
                    const itemStyle: CSSProperties = prefersReducedMotion
                      ? {
                          transform: 'none',
                          opacity: 1,
                          zIndex: isActiveCard ? 2 : 1,
                        }
                      : {
                          transform: `translateX(${translateX}%) translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
                          opacity,
                          zIndex,
                        };

                    return (
                      <div
                        key={slot.id}
                        className="missions-active-carousel__item"
                        data-slot-carousel-index={index}
                        data-active={isActiveCard ? 'true' : 'false'}
                        style={itemStyle}
                        role="option"
                        aria-selected={isActiveCard}
                        tabIndex={isActiveCard ? 0 : -1}
                        onClick={() => handleSlotCardSelect(index)}
                        onKeyDown={(event) => handleSlotCardKeyDown(event, slot.id, index)}
                      >
                        <div className="missions-active-carousel__card">{renderSlotCard(slot)}</div>
                      </div>
                    );
                  })}
                </div>
                {activeSlotCard && (
                  <div className="missions-active-carousel__status" aria-live="polite">
                    <span className="missions-active-carousel__status-slot">
                      {SLOT_DETAILS[activeSlotCard.slot].emoji}{' '}
                      {SLOT_DETAILS[activeSlotCard.slot].label}
                    </span>
                    <span className="missions-active-carousel__status-count">
                      {activeSlotIndex + 1} / {orderedSlots.length}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div
          id="missions-v2-panel-market"
          role="tabpanel"
          aria-labelledby="missions-v2-tab-market"
          hidden={viewMode !== 'market'}
          className="missions-board__panel"
        >
          <Card
            className="missions-card missions-card--market"
            title="Market de misiones"
            subtitle="Deslizá, elegí y activá tu próxima propuesta"
            bodyClassName="missions-card__body missions-card__body--market"
          >
            <div className="missions-market-carousel">
              <div className="missions-market-carousel__controls">
                <p className="missions-market-carousel__hint">
                  Deslizá las cartas para ver propuestas disponibles por slot.
                </p>
                <div className="missions-market-carousel__buttons">
                  <button
                    type="button"
                    className="missions-market-carousel__button"
                    onClick={() => handleCarouselStep('prev')}
                    aria-label="Ver propuesta anterior"
                    disabled={marketCards.length === 0}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="missions-market-carousel__button"
                    onClick={() => handleCarouselStep('next')}
                    aria-label="Ver propuesta siguiente"
                    disabled={marketCards.length === 0}
                  >
                    →
                  </button>
                </div>
              </div>

              {marketCards.length === 0 ? (
                <div className="missions-market-carousel__empty">
                  <p className="missions-market-carousel__empty-title">Sin propuestas disponibles</p>
                  <p className="missions-market-carousel__empty-copy">
                    Liberá un slot activo para que aparezcan nuevas cartas en el market.
                  </p>
                </div>
              ) : (
                <>
                  <div
                    className="missions-market-carousel__track"
                    ref={carouselRef}
                    role="listbox"
                    aria-label="Marketplace de misiones disponibles"
                  >
                    {marketCards.map((item, index) => {
                      const { slot, proposals, key: cardKey } = item;
                      const details = SLOT_DETAILS[slot];
                      const rarity = getMarketRarity(slot);
                      const slotState = board.slots.find((slotEntry) => slotEntry.slot === slot);
                      const canActivate = Boolean(slotState && !slotState.mission && slotState.state === 'idle');
                      const isFlipped = Boolean(flippedMarketCards[cardKey]);
                      const isActiveCard = index === activeMarketIndex;
                      const coverSrc = getMissionArt(slot, normalizedGameMode);
                      const activeProposalIndex = activeMarketProposalBySlot[slot] ?? 0;
                      const activeProposal = proposals[activeProposalIndex] ?? null;
                      const activeRewardPreview = activeProposal
                        ? formatProposalReward(activeProposal)
                        : null;
                      const hasPrevProposal = activeProposalIndex > 0;
                      const hasNextProposal = activeProposalIndex < proposals.length - 1;
                      const activeObjectives = activeProposal
                        ? activeProposal.objectives.length > 0
                          ? activeProposal.objectives
                          : [activeProposal.objective]
                        : [];
                      const activeMetadataEntries = activeProposal
                        ? extractProposalMetadata(activeProposal)
                        : [];
                      const cardLabel = activeProposal
                        ? `${activeProposal.name}. ${activeProposal.summary}`
                        : `Sin propuestas disponibles para ${details.label}`;
                      const canActivateThisCard = canActivate && isActiveCard;
                      const totalCards = marketCards.length;
                      let relativeOffset = index - activeMarketIndex;
                      if (totalCards > 1) {
                        const half = totalCards / 2;
                        if (relativeOffset > half) {
                          relativeOffset -= totalCards;
                        } else if (relativeOffset < -half) {
                          relativeOffset += totalCards;
                        }
                      }
                      const maxVisibleOffset = 3;
                      const limitedOffset = Math.max(
                        Math.min(relativeOffset, maxVisibleOffset),
                        -maxVisibleOffset,
                      );
                      const angle = (Math.PI / 6) * limitedOffset;
                      const depth = Math.cos(angle);
                      const translateX = Math.sin(angle) * 40;
                      const translateY = (1 - depth) * 80;
                      const scale = 0.82 + 0.12 * depth;
                      const opacity = 0.45 + 0.55 * depth;
                      const rotate = Math.sin(angle) * -6;
                      const zIndex = Math.round((depth + 1) * 50) + (isActiveCard ? 100 : 0);
                      const itemStyle: CSSProperties = prefersReducedMotion
                        ? {
                            transform: 'none',
                            opacity: 1,
                            zIndex: isActiveCard ? 2 : 1,
                          }
                        : {
                            transform: `translateX(${translateX}%) translateY(${translateY}px) scale(${scale}) rotate(${rotate}deg)`,
                            opacity,
                            zIndex,
                          };

                      return (
                        <div
                          key={cardKey}
                          className="missions-market-carousel__item"
                          data-carousel-index={index}
                          data-active={isActiveCard ? 'true' : 'false'}
                          style={itemStyle}
                        >
                          <article
                            className="missions-market-card"
                            data-rarity={rarity}
                            data-flipped={isFlipped}
                            data-active={isActiveCard ? 'true' : 'false'}
                            role="option"
                            aria-selected={isActiveCard}
                            aria-expanded={isFlipped}
                            tabIndex={isActiveCard ? 0 : -1}
                            aria-label={cardLabel}
                            style={{
                              '--market-card-aspect': marketCoverAspect[cardKey] ?? '3 / 4',
                            } as CSSProperties}
                            onClick={() => handleMarketCardToggle(slot, index)}
                            onKeyDown={(event) => handleMarketCardKeyDown(event, slot, index)}
                          >
                            <div className="missions-market-card__front" aria-hidden={isFlipped}>
                              <span className="missions-market-card__slot-chip" data-slot={slot}>
                                {details.label}
                              </span>
                              <img
                                src={coverSrc}
                                alt={`Carta de ${details.label}`}
                                className="missions-market-card__cover"
                                draggable={false}
                                loading="lazy"
                                onLoad={(event) => handleMarketCoverLoad(slot, event)}
                              />
                            </div>
                            <div className="missions-market-card__back" aria-hidden={!isFlipped}>
                              <div className="missions-market-card__details">
                                <header className="flex items-start justify-between gap-2">
                                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                                    {details.label}
                                  </p>
                                  <span className="missions-market-card__icon" aria-hidden="true">
                                    {details.emoji}
                                  </span>
                                </header>
                                <div
                                  className="missions-market-card__stack"
                                  role="group"
                                  aria-label={`Propuestas para ${details.label}`}
                                  data-has-prev={hasPrevProposal ? 'true' : undefined}
                                  data-has-next={hasNextProposal ? 'true' : undefined}
                                  onClick={(event) => event.stopPropagation()}
                                  onWheel={(event) => handleMarketStackWheel(slot, event)}
                                >
                                  {activeProposal ? (
                                    <article
                                      key={`${slot}-${activeProposal.id}`}
                                      className="missions-market-card__proposal"
                                      data-active="true"
                                      role="group"
                                    >
                                      <header className="missions-market-card__proposal-header">
                                        <span className="missions-market-card__proposal-index">
                                          #{activeProposalIndex + 1}
                                        </span>
                                        <div className="missions-market-card__proposal-heading">
                                          <h5>{activeProposal.name}</h5>
                                          {activeRewardPreview && (
                                            <div className="missions-market-card__reward-badge">
                                              {activeRewardPreview}
                                            </div>
                                          )}
                                        </div>
                                      </header>
                                      <p className="missions-market-card__proposal-summary">
                                        {activeProposal.summary}
                                      </p>
                                      {activeProposal.tags.length > 0 && (
                                        <div className="missions-market-card__tags">
                                          {activeProposal.tags.map((tag) => (
                                            <span key={`${activeProposal.id}-tag-${tag}`}>{tag}</span>
                                          ))}
                                        </div>
                                      )}
                                      <ul className="missions-market-card__requirements">
                                        {activeObjectives.map((itemLabel) => (
                                          <li key={`${activeProposal.id}-objective-${itemLabel}`}>{itemLabel}</li>
                                        ))}
                                      </ul>
                                      {activeMetadataEntries.length > 0 && (
                                        <ul className="missions-market-card__meta">
                                          {activeMetadataEntries.map((entryLabel) => (
                                            <li key={`${activeProposal.id}-meta-${entryLabel}`}>{entryLabel}</li>
                                          ))}
                                        </ul>
                                      )}
                                      <button
                                        type="button"
                                        className="missions-market-card__cta"
                                        disabled={!canActivateThisCard}
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          if (canActivateThisCard) {
                                            handleActivateProposal(slot, activeProposal);
                                          }
                                        }}
                                      >
                                        Activar en slot {details.label}
                                      </button>
                                    </article>
                                  ) : (
                                    <div className="missions-market-card__proposal missions-market-card__proposal--empty">
                                      <p>Sin propuestas disponibles. Volvé pronto.</p>
                                    </div>
                                  )}
                                </div>
                                {proposals.length > 1 && (
                                  <div className="missions-market-card__stack-controls">
                                    <button
                                      type="button"
                                      className="missions-market-card__stack-button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleMarketProposalStep(slot, -1);
                                      }}
                                      disabled={!hasPrevProposal}
                                      aria-label="Ver propuesta anterior"
                                    >
                                      ↑
                                    </button>
                                    <span className="missions-market-card__stack-counter">
                                      {activeProposalIndex + 1} / {proposals.length}
                                    </span>
                                    <button
                                      type="button"
                                      className="missions-market-card__stack-button"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        handleMarketProposalStep(slot, 1);
                                      }}
                                      disabled={!hasNextProposal}
                                      aria-label="Ver propuesta siguiente"
                                    >
                                      ↓
                                    </button>
                                  </div>
                                )}
                              </div>
                              <div className="missions-market-card__insight">
                                <p className="missions-market-card__back-label">Dificultad</p>
                                <p className="missions-market-card__back-value">{activeProposal?.difficulty ?? '—'}</p>
                                <p className="missions-market-card__back-label">Recompensa</p>
                                <p className="missions-market-card__back-value">{activeRewardPreview ?? '—'}</p>
                              </div>
                            </div>
                          </article>
                        </div>
                      );
                    })}
                  </div>
                  {activeMarketCard && (
                    <div className="missions-market-carousel__status" aria-live="polite">
                      <span className="missions-market-carousel__status-slot">
                        {SLOT_DETAILS[activeMarketCard.slot].emoji}{' '}
                        {SLOT_DETAILS[activeMarketCard.slot].label}
                      </span>
                      <span className="missions-market-carousel__status-count">
                        {activeMarketIndex + 1} / {marketCards.length}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      </div>

      {showStickyBar && (
        <div className="missions-sticky-cta" role="toolbar" aria-label="Acciones rápidas de misiones">
          <button
            type="button"
            className="missions-sticky-cta__btn missions-sticky-cta__btn--claim"
            disabled={!firstClaimableSlot}
            onClick={() => {
              if (!firstClaimableSlot) {
                return;
              }
              focusSlot(firstClaimableSlot);
              handleClaim(firstClaimableSlot);
            }}
          >
            Claim
          </button>
          <button
            type="button"
            className="missions-sticky-cta__btn missions-sticky-cta__btn--heartbeat"
            disabled={!firstHeartbeatSlot}
            onClick={() => {
              if (!firstHeartbeatSlot) {
                return;
              }
              focusSlot(firstHeartbeatSlot);
              handleHeartbeat(firstHeartbeatSlot);
            }}
          >
            Heartbeat
          </button>
          <button
            type="button"
            className="missions-sticky-cta__btn missions-sticky-cta__btn--market"
            onClick={() => {
              scrollToMarket();
            }}
          >
            Market
          </button>
        </div>
      )}

      {claimModal ? (
        <ClaimModal
          state={claimModal}
          onClose={() => setClaimModal(null)}
          prefersReducedMotion={prefersReducedMotion}
        />
      ) : null}
    </div>
  );
}
