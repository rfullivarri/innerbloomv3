import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { useLocation } from 'react-router-dom';
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

export function MissionsV2Board({ userId }: { userId: string }) {
  const location = useLocation();
  const prefersReducedMotion = usePrefersReducedMotion();
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
  const hasTrackedView = useRef(false);
  const slotRefs = useRef<Record<string, HTMLElement | null>>({});
  const marketRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    if (status === 'success' && data) {
      setBoard(data);
    }
  }, [status, data]);

  useEffect(() => {
    if (!board || !expandedSlotId) {
      return;
    }
    if (!board.slots.some((slot) => slot.id === expandedSlotId)) {
      setExpandedSlotId(null);
    }
  }, [board, expandedSlotId]);

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

  const handleActivateProposal = useCallback(
    (slotKey: MissionsV2Slot['slot'], proposal: MissionsV2MarketProposal) => {
      if (!board) {
        setActionError('No pudimos preparar el tablero.');
        return;
      }

      const slotIndex = board.slots.findIndex((slot) => slot.slot === slotKey);
      if (slotIndex === -1) {
        setActionError('No encontramos un slot compatible para esta misión.');
        return;
      }

      const slot = board.slots[slotIndex];

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
      nextSlots[slotIndex] = nextSlot;

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

      setActionError(null);
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
    [board, setBoard, setActionError, setExpandedSlotId, userId],
  );

  const toggleMarketCard = useCallback((cardKey: string) => {
    setFlippedMarketCards((prev) => ({
      ...prev,
      [cardKey]: !prev[cardKey],
    }));
  }, []);

  const handleMarketCardKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, cardKey: string) => {
      if (event.defaultPrevented || event.target !== event.currentTarget) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleMarketCard(cardKey);
      }
    },
    [toggleMarketCard],
  );

  const handleUnavailableAction = useCallback((action: MissionsV2Action) => {
    if (action.type === 'special_strike' || action.type === 'submit_evidence') {
      setActionError('Esta acción estará disponible en la próxima iteración del tablero.');
    } else if (action.type === 'abandon') {
      setActionError('El Abandono Honroso se habilitará cuando el flujo esté completo.');
    }
  }, []);

  const scrollToMarket = useCallback(() => {
    marketRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const focusSlot = useCallback(
    (slot: MissionsV2Slot) => {
      const element = slotRefs.current[slot.id];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setExpandedSlotId(slot.id);
    },
    [],
  );

  const registerSlotRef = useCallback(
    (slotId: string) => (element: HTMLElement | null) => {
      slotRefs.current[slotId] = element;
    },
    [],
  );

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
    const isExpanded = expandedSlotId === slot.id;
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

    return (
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

  const orderedSlots = [...board.slots].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot),
  );

  const shield = parseShieldLabel(board.boss.countdown.label) ?? { current: 6, max: 6 };

  const orderedMarketSlots: MissionsV2MarketSlot[] = SLOT_ORDER.map((slotKey) => {
    const entry = board.market.find((marketSlot) => marketSlot.slot === slotKey);
    return entry ?? ({ slot: slotKey, proposals: [] as MissionsV2MarketProposal[] } as MissionsV2MarketSlot);
  });

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

        <Card
          className="missions-card missions-card--boss"
          title="Boss quincenal"
          subtitle={<p className="missions-card__subtitle">{board.boss.name}</p>}
          bodyClassName="missions-card__body missions-card__body--boss"
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

        <div className="missions-slots">
          {orderedSlots.map((slot) => renderSlotCard(slot))}
        </div>

        <Card
          className="missions-card missions-card--market"
          title="Market de misiones"
          subtitle="Activa propuestas cuando liberes un slot"
          bodyClassName="missions-card__body missions-card__body--market"
          ref={marketRef}
        >
          <div className="missions-market">
            {orderedMarketSlots.flatMap((entry) =>
              entry.proposals.map((proposal, index) => {
                const details = SLOT_DETAILS[entry.slot];
                const rewardPreview = formatProposalReward(proposal);
                const metadataEntries = extractProposalMetadata(proposal);
                const objectives = proposal.objectives.length > 0 ? proposal.objectives : [proposal.objective];
                const tags = proposal.tags.length > 0 ? proposal.tags : [];
                const rarity = getMarketRarity(entry.slot);
                const slotState = board?.slots.find((slot) => slot.slot === entry.slot);
                const canActivate = Boolean(slotState && !slotState.mission && slotState.state === 'idle');
                const cardKey = `${entry.slot}-${proposal.id}`;
                const isFlipped = Boolean(flippedMarketCards[cardKey]);

                return (
                  <article
                    key={`${entry.slot}-${proposal.id}`}
                    className="missions-market-card"
                    data-rarity={rarity}
                    data-flipped={isFlipped}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isFlipped}
                    aria-label={`${proposal.name}. ${proposal.summary}`}
                    onClick={() => {
                      toggleMarketCard(cardKey);
                    }}
                    onKeyDown={(event) => {
                      handleMarketCardKeyDown(event, cardKey);
                    }}
                  >
                    <div className="missions-market-card__front" aria-hidden={isFlipped}>
                      <img
                        src="/mainflow2.png"
                        alt="Carta de tarot Main"
                        className="missions-market-card__cover"
                        draggable={false}
                      />
                    </div>
                    <div className="missions-market-card__back" aria-hidden={!isFlipped}>
                      <div className="missions-market-card__details">
                        <header className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{details.label}</p>
                            <h4 className="text-base font-semibold text-slate-100">
                              #{index + 1} · {proposal.name}
                            </h4>
                          </div>
                          <span className="missions-market-card__icon" aria-hidden="true">
                            {details.emoji}
                          </span>
                        </header>
                        <p className="missions-market-card__summary">{proposal.summary}</p>
                        {tags.length > 0 && (
                          <div className="missions-market-card__tags">
                            {tags.map((tag) => (
                              <span key={`${proposal.id}-tag-${tag}`}>{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="missions-market-card__reward">{rewardPreview}</div>
                        <ul className="missions-market-card__requirements">
                          {objectives.map((item) => (
                            <li key={`${proposal.id}-objective-${item}`}>{item}</li>
                          ))}
                        </ul>
                        {metadataEntries.length > 0 && (
                          <ul className="missions-market-card__meta">
                            {metadataEntries.map((entryLabel) => (
                              <li key={`${proposal.id}-meta-${entryLabel}`}>{entryLabel}</li>
                            ))}
                          </ul>
                        )}
                        <button
                          type="button"
                          className="missions-market-card__cta"
                          disabled={!canActivate}
                          onClick={(event) => {
                            event.stopPropagation();
                            if (canActivate) {
                              handleActivateProposal(entry.slot, proposal);
                            }
                          }}
                        >
                          Activar en slot {details.label}
                        </button>
                      </div>
                      <div className="missions-market-card__insight">
                        <p className="missions-market-card__back-label">Dificultad</p>
                        <p className="missions-market-card__back-value">{proposal.difficulty}</p>
                        <p className="missions-market-card__back-label">Recompensa</p>
                        <p className="missions-market-card__back-value">{rewardPreview}</p>
                      </div>
                    </div>
                  </article>
                );
              }),
            )}
          </div>
        </Card>
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
