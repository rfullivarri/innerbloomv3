import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
  type SyntheticEvent,
  type UIEvent as ReactUIEvent,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCards, Navigation } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import type { NavigationOptions } from 'swiper/types';
import {
  claimMissionsV2Mission,
  getMissionsV2Board,
  linkMissionsV2Daily,
  onDevUserOverrideChange,
  postMissionsV2Heartbeat,
  type MissionsV2Action,
  type MissionsV2BoardResponse,
  type MissionsV2Communication,
  type MissionsV2MarketProposal,
  type MissionsV2MarketSlot,
  type MissionsV2MissionTask,
  type MissionsV2Slot,
} from '../../lib/api';
import { useRequest } from '../../hooks/useRequest';
import { Card } from '../ui/Card';
import { ProgressBar } from '../common/ProgressBar';
import { ToastBanner } from '../common/ToastBanner';
import {
  emitMissionsV2Event,
  getUserAgentHash,
  getViewportSnapshot,
} from '../../lib/telemetry';
import { FEATURE_MISSIONS_V2 } from '../../lib/featureFlags';
import { normalizeGameModeValue, type GameMode } from '../../lib/gameMode';
import 'swiper/css';
import 'swiper/css/effect-cards';

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

type MissionsWindow = Window &
  typeof globalThis & {
    __IB_DISABLE_MARKET_SWIPER__?: boolean;
    __IB_MARKET_SWIPER_REF__?: MutableRefObject<SwiperType | null>;
  };


const SLOT_ORDER: Array<MissionsV2Slot['slot']> = ['main', 'hunt', 'skill'];
const DEFAULT_MARKET_INDEX = SLOT_ORDER.length > 2 ? 1 : 0;

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

const DEMO_SLOT_CONTENT: Record<
  MissionsV2Slot['slot'],
  {
    name: string;
    summary: string;
    requirements: string;
    objective: string;
    objectives?: string[];
    reward: { xp: number; currency?: number; items?: string[] };
    tasks: Array<{ name: string; tag: string }>;
    tags?: string[];
  }
> = {
  main: {
    name: 'Demo Main Quest',
    summary: 'Probá el carrusel completando pasos simulados de la Main Quest.',
    requirements: 'Solo necesitás habilitar el modo demo.',
    objective: 'Recorrer el carrusel hasta el final y volver al inicio.',
    reward: { xp: 150, currency: 10, items: ['Token de Prueba'] },
    tasks: [
      { name: 'Registrar un heartbeat ficticio', tag: 'heartbeat' },
      { name: 'Contar qué viste en el carrusel', tag: 'reflection' },
    ],
    tags: ['demo', 'main'],
  },
  hunt: {
    name: 'Demo Hunt',
    summary: 'Explorá la navegación lateral del carrusel con una Hunt inventada.',
    requirements: 'Mantener el foco en modo prueba.',
    objective: 'Moverte entre las tarjetas y validar animaciones.',
    reward: { xp: 120, currency: 8, items: ['Cofre Fantasma'] },
    tasks: [
      { name: 'Mover el carrusel hacia la Hunt', tag: 'session' },
      { name: 'Confirmar que la posición marca 2/3', tag: 'check' },
    ],
    tags: ['demo', 'hunt'],
  },
  skill: {
    name: 'Demo Skill Route',
    summary: 'Simulá la Skill Route para ver el estado 3/3 del carrusel.',
    requirements: 'Seguir en entorno demo con datos inventados.',
    objective: 'Chequear textos y estilos finales de la tarjeta.',
    objectives: [
      'Revisar el CTA principal deshabilitado.',
      'Validar que el indicador marque 3/3.',
      'Confirmar que la UI reacciona al volver a 1/3.',
    ],
    reward: { xp: 140, currency: 9, items: ['Cristal Placeholder'] },
    tasks: [
      { name: 'Navegar al último slide', tag: 'navigation' },
      { name: 'Compartir feedback de estilos', tag: 'feedback' },
    ],
    tags: ['demo', 'skill'],
  },
};

function makeDemoSlot(slotKey: MissionsV2Slot['slot'], position: number): MissionsV2Slot {
  const content = DEMO_SLOT_CONTENT[slotKey];
  const slotId = `demo-${slotKey}-slot-${position}`;
  const missionId = `${slotId}-mission`;
  const totalPetals = 3;
  const completedPetals = Math.min(position - 1, totalPetals);
  const percent = Math.round((completedPetals / totalPetals) * 100);

  return {
    id: slotId,
    slot: slotKey,
    mission: {
      id: missionId,
      type: slotKey,
      name: content.name,
      summary: content.summary,
      requirements: content.requirements,
      objective: content.objective,
      objectives: content.objectives,
      reward: content.reward,
      tasks: content.tasks.map((task, taskIndex) => ({
        id: `${missionId}-task-${taskIndex + 1}`,
        name: task.name,
        tag: task.tag,
      })),
      tags: content.tags,
    },
    state: 'active',
    petals: { total: totalPetals, remaining: Math.max(totalPetals - completedPetals, 0) },
    heartbeat_today: false,
    progress: { current: completedPetals, target: totalPetals, percent },
    countdown: { ends_at: null, label: 'Demo listo' },
    actions: [
      {
        id: `${slotId}-heartbeat`,
        type: 'heartbeat',
        label: 'Demo heartbeat',
        enabled: false,
      },
      {
        id: `${slotId}-claim`,
        type: 'claim',
        label: 'Demo claim',
        enabled: false,
      },
    ],
    claim: { available: false, enabled: false, cooldown_until: null },
  };
}

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

type MarketProposalTransition = 'forward' | 'backward' | null;

const DEFAULT_MISSION_ART_MODE: GameMode = 'Flow';


type PrimaryAction = {
  key: string;
  label: string;
  onClick?: () => void;
  disabled: boolean;
  tone: 'primary' | 'neutral';
};

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
      .map((rawValue: string) => rawValue.trim())
      .filter((value: string): value is string => value.length > 0)
      .forEach((value: string) => chips.add(value));
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

type RealMarketProposal = MissionsV2MarketProposal;

type MockMissionProposal = {
  id: string;
  title: string;
  summary: string;
  reward: string;
  difficulty: string;
  objective: string;
  objectives: string[];
  requirement: string;
  features: string[];
  durationLabel: string;
  state: 'active' | 'available';
};

type MarketProposalDisplay = RealMarketProposal | MockMissionProposal;

type MarketCardItem = {
  slot: MissionsV2Slot['slot'];
  proposals: MarketProposalDisplay[];
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

function missionToMarketProposal(slot: MissionsV2Slot): RealMarketProposal | null {
  const mission = slot.mission;
  if (!mission) {
    return null;
  }

  const reward = mission.reward ?? { xp: 0 };
  const objectives = mission.objectives ?? mission.tasks.map((task: MissionsV2MissionTask) => task.name);

  return {
    id: mission.id,
    slot: slot.slot,
    name: mission.name,
    summary: mission.summary,
    requirements: mission.requirements,
    objective: mission.objective,
    objectives: objectives.length > 0 ? objectives : [mission.objective],
    reward: {
      xp: reward.xp,
      currency: reward.currency ?? 0,
      items: reward.items ? [...reward.items] : [],
    },
    difficulty: 'medium',
    tags: mission.tags ?? [],
    metadata: mission.metadata ?? {},
    duration_days: 0,
    locked: true,
    isActive: true,
    available_at: null,
  };
}

function formatProposalReward(proposal: RealMarketProposal): string {
  const { reward } = proposal;
  const currency = reward.currency ?? 0;
  const items = reward.items.length > 0 ? ` · ${reward.items.join(' + ')}` : '';
  return `${reward.xp} XP · ${currency} Monedas${items}`;
}

function humanizeMetadataValue(value: string): string {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((segment: string) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatDurationDays(days: number | null | undefined): string {
  if (!days || days <= 0) {
    return 'Flexible';
  }
  if (days === 1) {
    return '1 día';
  }
  return `${days} días`;
}

function formatMultiplier(multiplier: number): string {
  if (Number.isInteger(multiplier)) {
    return `x${multiplier}`;
  }
  return `x${multiplier.toFixed(1)}`;
}

function buildProposalFeatureChips(proposal: RealMarketProposal): string[] {
  const chips: string[] = [];
  const metadata = proposal.metadata ?? {};

  if (proposal.slot === 'main') {
    const spotlight = metadata.spotlight;
    if (typeof spotlight === 'string' && spotlight.trim()) {
      chips.push(`Spotlight · ${humanizeMetadataValue(spotlight)}`);
    }
  }

  if (proposal.slot === 'hunt') {
    const multiplier = metadata.boosterMultiplier;
    if (typeof multiplier === 'number' && Number.isFinite(multiplier)) {
      chips.push(`Booster ${formatMultiplier(multiplier)}`);
    }
  }

  if (proposal.slot === 'skill') {
    const stat = metadata.stat;
    if (typeof stat === 'string' && stat.trim()) {
      chips.push(`Stat · ${stat}`);
    }
  }

  return chips;
}

const MOCK_MISSION_TITLES = [
  'Acto 2: Mensaje',
  'Cadena de Fricción',
  'Prueba de Ruta',
  'Bloque de Focus',
  'Pulso de Sesión',
  'Enlace de Evidencia',
];

function makeMockProposals(slot: MissionsV2Slot['slot']): MockMissionProposal[] {
  return Array.from({ length: 6 }).map((_, index) => ({
    id: `${slot}-${index}`,
    title: MOCK_MISSION_TITLES[index % MOCK_MISSION_TITLES.length]!,
    summary: 'Brief one-sentence mission summary.',
    reward: `${(index + 1) * 50} XP • ${8 + index} Coins`,
    difficulty: ['easy', 'medium', 'high'][index % 3]!,
    objective: 'Complete the core objective for this mock mission.',
    objectives: ['Primer entregable', 'Segundo entregable'],
    requirement: 'Requisito de elegibilidad para la misión.',
    features: ['Chip destacado', 'Boost x1.5'].slice(0, 1 + (index % 2)),
    durationLabel: `${7 + index} días`,
    state: index === 0 ? 'active' : 'available',
  }));
}

function formatCountdown(label: string): string {
  if (!label) {
    return 'Countdown pendiente';
  }
  return label;
}

type MarketBySlot = Partial<Record<MissionsV2Slot['slot'], RealMarketProposal[]>>;

type MarketDisplayBySlot = Partial<Record<MissionsV2Slot['slot'], MarketProposalDisplay[]>>;

type CarouselTrackStyle = CSSProperties & {
  '--missions-active-carousel-height'?: string;
  '--missions-market-carousel-height'?: string;
};

// Extra vertical room we add to the carousel tracks so cards never feel cramped.
// We subtract this padding from measured heights to avoid feedback loops where
// stretched flex items artificially grow the track on every measurement.
const CAROUSEL_HEIGHT_PADDING = 64;

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
  const rawGradientId = useId();
  const gradientId = `missions-heartbeat-gradient-${rawGradientId.replace(/:/g, '')}`;

  return (
    <span
      className={classNames(
        'missions-heartbeat-indicator',
        pending ? 'missions-heartbeat-indicator--pending' : 'missions-heartbeat-indicator--done',
        highlight && 'missions-heartbeat-indicator--pulse',
      )}
    >
      <span aria-hidden="true" className="missions-heartbeat-indicator__dot">
        <svg viewBox="0 0 24 24" role="presentation" focusable="false" className="missions-heartbeat-indicator__icon">
          <defs>
            <linearGradient id={gradientId} x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--missions-heartbeat-fill-start)" />
              <stop offset="100%" stopColor="var(--missions-heartbeat-fill-end)" />
            </linearGradient>
          </defs>
          <path
            d="M12 21.35 10.55 20.03C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54Z"
            fill={`url(#${gradientId})`}
            stroke="var(--missions-heartbeat-stroke)"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {pending ? 'Heartbeat pendiente' : 'Heartbeat sellado'}
    </span>
  );
}

type ActiveMissionCardProps = {
  slot: MissionsV2Slot;
  heroLine: string;
  requirementChips: string[];
  rewardCopy: string;
  primaryAction: PrimaryAction;
  secondaryActions: MissionsV2Action[];
  heartbeatActionId?: string;
  heartbeatHighlight: boolean;
  heartbeatPending: boolean;
  prefersReducedMotion: boolean;
  busy: boolean;
  onHeartbeat: (slot: MissionsV2Slot) => void;
  onLinkDaily: (slot: MissionsV2Slot) => void;
  onUnavailableAction: (action: MissionsV2Action) => void;
  expanded: boolean;
  onToggle: (slot: MissionsV2Slot) => void;
};

function ActiveMissionCard({
  slot,
  heroLine,
  requirementChips,
  rewardCopy,
  primaryAction,
  secondaryActions,
  heartbeatActionId,
  heartbeatHighlight,
  heartbeatPending,
  prefersReducedMotion,
  busy,
  onHeartbeat,
  onLinkDaily,
  onUnavailableAction,
  expanded,
  onToggle,
}: ActiveMissionCardProps) {
  const countdownCopy = formatCountdown(slot.countdown.label);

  return (
    <div className={classNames('missions-active-card', !expanded && 'missions-active-card--collapsed')}>
      <button
        type="button"
        className="missions-active-card__header missions-active-card__header-button"
        aria-expanded={expanded}
        onClick={() => onToggle(slot)}
      >
        <div className="missions-active-card__header-row">
          <div className="missions-active-card__primary">
            <p className="missions-active-card__hero">{heroLine}</p>
            {expanded && (
              <div className="missions-active-card__chips">
                {requirementChips.map((chip) => (
                  <span key={`${slot.id}-req-${chip}`} className="missions-requirement">
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="missions-active-card__toggle" aria-hidden="true">
            <svg
              className={classNames(
                'missions-active-card__toggle-icon',
                expanded && 'missions-active-card__toggle-icon--expanded',
              )}
              viewBox="0 0 16 16"
            >
              <path
                d="M3.22 5.97a.75.75 0 0 1 1.06 0L8 9.69l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L3.22 7.03a.75.75 0 0 1 0-1.06Z"
                fill="currentColor"
              />
            </svg>
          </span>
        </div>
      </button>
      <div className="missions-active-card__progress">
        <MissionProgress slot={slot} prefersReducedMotion={prefersReducedMotion} />
        {expanded && (
          <MissionPetals
            slot={slot}
            prefersReducedMotion={prefersReducedMotion}
            highlight={heartbeatHighlight}
          />
        )}
      </div>
      {expanded ? (
        <>
          <div className="missions-active-card__details">
            <div className="missions-active-card__objective">
              <span className="missions-active-card__section-label">Objetivo</span>
              <p>{slot.mission?.objective ?? 'Activa una misión del market para este slot.'}</p>
              <p className="missions-active-card__countdown">{countdownCopy}</p>
            </div>
            <div className="missions-active-card__reward">
              <span className="missions-active-card__section-label">Botín base</span>
              <div className="missions-active-card__reward-pill">{rewardCopy}</div>
            </div>
          </div>
          <div className="missions-active-card__footer">
            <div className="missions-active-card__rail">
              <div className="missions-active-card__meta">
                <MissionPetalsMini slot={slot} highlight={heartbeatHighlight} />
                <MissionHeartbeatStatus pending={heartbeatPending} highlight={heartbeatHighlight} />
              </div>
              {secondaryActions.length > 0 && (
                <div className="missions-active-card__secondary-actions">
                  {secondaryActions.map((action) => {
                    const isHeartbeat = action.type === 'heartbeat';
                    const isLinkDaily = action.type === 'link_daily';
                    const isDisabled = !action.enabled || busy || !slot.mission;

                    if (isHeartbeat) {
                      return (
                        <button
                          key={action.id}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => onHeartbeat(slot)}
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
                          onClick={() => onLinkDaily(slot)}
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
                        onClick={() => onUnavailableAction(action)}
                        className="missions-action-btn missions-action-btn--disabled"
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="missions-active-card__cta">
              <button
                type="button"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className={classNames(
                  'missions-active-card__cta-btn',
                  primaryAction.tone === 'primary'
                    ? 'missions-active-card__cta-btn--primary'
                    : 'missions-active-card__cta-btn--neutral',
                  (primaryAction.disabled || busy) && 'missions-active-card__cta-btn--disabled',
                  heartbeatActionId && primaryAction.key === heartbeatActionId && 'missions-active-card__cta-btn--heartbeat',
                )}
                data-highlight={
                  heartbeatActionId && primaryAction.key === heartbeatActionId && heartbeatHighlight ? 'true' : undefined
                }
              >
                {primaryAction.label}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="missions-active-card__summary">
          <span className="missions-active-card__summary-label">Tiempo restante</span>
          <p className="missions-active-card__countdown">{countdownCopy}</p>
        </div>
      )}
    </div>
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
  const [heartbeatFeedback, setHeartbeatFeedback] = useState<{ slotId: string; at: number } | null>(null);
  const [showHeartbeatToast, setShowHeartbeatToast] = useState(false);
  const [heartbeatToastKey, setHeartbeatToastKey] = useState<number | null>(null);
  const [flippedMarketCards, setFlippedMarketCards] = useState<Record<string, boolean>>({});
  const [marketCoverAspect, setMarketCoverAspect] = useState<Record<string, string>>({});
  const isMarketSwiperCardsEnabled = true;
  const missionsWindow =
    typeof window === 'undefined' ? null : (window as unknown as MissionsWindow | null);
  const shouldDisableMarketSwiper = Boolean(prefersReducedMotion || missionsWindow?.__IB_DISABLE_MARKET_SWIPER__);
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
  const [activeMarketIndex, setActiveMarketIndex] = useState(DEFAULT_MARKET_INDEX);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [activeMarketProposalBySlot, setActiveMarketProposalBySlot] = useState<
    Record<MissionsV2Slot['slot'], number>
  >(() => ({
    main: 0,
    hunt: 0,
    skill: 0,
  }));
  const [marketProposalTransitionBySlot, setMarketProposalTransitionBySlot] = useState<
    Record<MissionsV2Slot['slot'], MarketProposalTransition>
  >({
    main: null,
    hunt: null,
    skill: null,
  });
  const [marketProposalRevisionBySlot, setMarketProposalRevisionBySlot] = useState<
    Record<MissionsV2Slot['slot'], number>
  >({
    main: 0,
    hunt: 0,
    skill: 0,
  });
  const [marketStackFadeBySlot, setMarketStackFadeBySlot] = useState<
    Record<MissionsV2Slot['slot'], { atTop: boolean; atBottom: boolean }>
  >({
    main: { atTop: true, atBottom: true },
    hunt: { atTop: true, atBottom: true },
    skill: { atTop: true, atBottom: true },
  });
  const [activeSlotStackBySlot, setActiveSlotStackBySlot] = useState<Record<string, number>>({});
  const [activeSlotCardHeight, setActiveSlotCardHeight] = useState<number | null>(null);
  const [marketCardHeightBySlot, setMarketCardHeightBySlot] = useState<Record<string, number>>({});
  const [expandedSlots, setExpandedSlots] = useState<Record<string, boolean>>({});
  const [userAgentHash, setUserAgentHash] = useState<string | null>(null);
  const [marketCarouselElement, setMarketCarouselElement] = useState<HTMLDivElement | null>(null);
  const hasTrackedView = useRef(false);
  const hasTrackedMarketView = useRef(false);
  const slotRefs = useRef<Record<string, HTMLElement | null>>({});
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const marketSwiperRef = useRef<SwiperType | null>(null);
  const marketSwiperInstance = marketSwiperRef.current;
  const marketSwiperPrevRef = useRef<HTMLButtonElement | null>(null);
  const marketSwiperNextRef = useRef<HTMLButtonElement | null>(null);
  const previousMarketSwiperIndexRef = useRef(DEFAULT_MARKET_INDEX);
  const pendingMarketFlipRef = useRef<MissionsV2Slot['slot'] | null>(null);
  const slotCarouselRef = useRef<HTMLDivElement | null>(null);
  const marketStackRefs = useRef<Record<MissionsV2Slot['slot'], HTMLDivElement | null>>({
    main: null,
    hunt: null,
    skill: null,
  });
  const hasTrackedMarketInnerScrollRef = useRef<Record<MissionsV2Slot['slot'], boolean>>({
    main: false,
    hunt: false,
    skill: false,
  });
  const marketStackHeaderRefs = useRef<Record<MissionsV2Slot['slot'], HTMLElement | null>>({
    main: null,
    hunt: null,
    skill: null,
  });
  const marketStackHeaderObservers = useRef<Record<MissionsV2Slot['slot'], ResizeObserver | null>>({
    main: null,
    hunt: null,
    skill: null,
  });
  const previousActiveProposalBySlotRef = useRef<Record<MissionsV2Slot['slot'], number>>({
    main: 0,
    hunt: 0,
    skill: 0,
  });
  const slotStackWheelDelta = useRef<Record<string, number>>({});
  const previousActiveSlotIdRef = useRef<string | null>(null);
  const hasInitializedActiveSnapRef = useRef(false);
  const previousActiveSnapIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const missionsWindow = window as unknown as MissionsWindow;
    missionsWindow.__IB_MARKET_SWIPER_REF__ = marketSwiperRef;
    return () => {
      if (missionsWindow.__IB_MARKET_SWIPER_REF__ === marketSwiperRef) {
        delete missionsWindow.__IB_MARKET_SWIPER_REF__;
      }
    };
  }, []);

  const marketBySlot = useMemo<MarketBySlot>(() => {
    const map: MarketBySlot = {};
    if (!board) {
      return map;
    }

    const activeBySlot = new Map<MissionsV2Slot['slot'], RealMarketProposal>();
    for (const slot of board.slots ?? []) {
      const proposal = missionToMarketProposal(slot);
      if (proposal) {
        activeBySlot.set(slot.slot, proposal);
      }
    }

    for (const slotKey of SLOT_ORDER) {
      const entry = board.market?.find((marketSlot: MissionsV2MarketSlot) => marketSlot.slot === slotKey);
      const proposals: RealMarketProposal[] = (entry?.proposals ?? []).map((proposal: MissionsV2MarketProposal) => ({
        ...proposal,
      }));
      const activeProposal = activeBySlot.get(slotKey);
      if (activeProposal) {
        const deduped = proposals.filter((proposal: RealMarketProposal) => proposal.id !== activeProposal.id);
        map[slotKey] = [activeProposal, ...deduped];
      } else {
        map[slotKey] = proposals;
      }
    }

    return map;
  }, [board]);

  const renderMarketBySlot = useMemo<MarketDisplayBySlot>(() => {
    const map: MarketDisplayBySlot = {};
    for (const slotKey of SLOT_ORDER) {
      const proposals = marketBySlot[slotKey] ?? [];
      map[slotKey] = proposals.length > 0 ? proposals : makeMockProposals(slotKey);
    }
    return map;
  }, [marketBySlot]);

  const orderedSlots = useMemo(() => {
    if (!board) {
      return [] as MissionsV2Slot[];
    }

    const sorted = [...board.slots].sort(
      (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot),
    );

    const hasAllSlots = SLOT_ORDER.every((slotKey) =>
      sorted.some((slot) => slot.slot === slotKey),
    );

    if (hasAllSlots) {
      return sorted;
    }

    return SLOT_ORDER.map((slotKey, index) => {
      const existingSlot = sorted.find((slot) => slot.slot === slotKey);
      return existingSlot ?? makeDemoSlot(slotKey, index + 1);
    });
  }, [board]);

  const slotIndexById = useMemo(() => {
    const map = new Map<string, number>();
    orderedSlots.forEach((slot: MissionsV2Slot, index) => {
      map.set(slot.id, index);
    });
    return map;
  }, [orderedSlots]);

  const orderedMarketSlots = useMemo(() => {
    return SLOT_ORDER.map((slotKey) => {
      return {
        slot: slotKey,
        proposals: renderMarketBySlot[slotKey] ?? [],
      };
    });
  }, [renderMarketBySlot]);

  const marketCards = useMemo<MarketCardItem[]>(() => {
    return orderedMarketSlots.map((entry) => ({
      slot: entry.slot,
      proposals: entry.proposals,
      key: entry.slot,
    }));
  }, [orderedMarketSlots]);

  const slotCarouselStyle = useMemo<CarouselTrackStyle | undefined>(() => {
    if (prefersReducedMotion || viewMode !== 'active') {
      return undefined;
    }
    if (activeSlotCardHeight == null) {
      return undefined;
    }
    const baseHeight = Math.round(activeSlotCardHeight + CAROUSEL_HEIGHT_PADDING);
    const minimumHeight = 360;
    const paddedHeight = Math.max(baseHeight, minimumHeight);
    return {
      '--missions-active-carousel-height': `${paddedHeight}px`,
    };
  }, [activeSlotCardHeight, prefersReducedMotion, viewMode]);

  const marketCarouselStyle = useMemo<CarouselTrackStyle | undefined>(() => {
    if (prefersReducedMotion || viewMode !== 'market') {
      return undefined;
    }
    const activeCard = marketCards[activeMarketIndex];
    if (!activeCard) {
      return undefined;
    }
    const normalizedHeight = marketCardHeightBySlot[activeCard.key];
    if (normalizedHeight == null) {
      return undefined;
    }
    const baseHeight = Math.round(normalizedHeight + CAROUSEL_HEIGHT_PADDING);
    const minimumHeight = 360;
    const paddedHeight = Math.max(baseHeight, minimumHeight);
    return {
      '--missions-market-carousel-height': `${paddedHeight}px`,
    };
  }, [
    activeMarketIndex,
    marketCardHeightBySlot,
    marketCards,
    prefersReducedMotion,
    viewMode,
  ]);

  useEffect(() => {
    const nextView = getViewModeFromLocation(location);
    setViewModeState((current) => (current === nextView ? current : nextView));
  }, [getViewModeFromLocation, location]);

  useEffect(() => {
    setUserAgentHash(getUserAgentHash());
  }, []);

  useLayoutEffect(() => {
    if (prefersReducedMotion || viewMode !== 'market') {
      return;
    }
    const activeCard = marketCards[activeMarketIndex];
    if (!activeCard) {
      return;
    }
    const carouselNode = marketCarouselElement;
    if (!carouselNode) {
      return;
    }
    const cardNode = carouselNode.querySelector<HTMLElement>(
      `[data-carousel-index='${activeMarketIndex}'] article.missions-market-card`,
    );
    if (!cardNode) {
      return;
    }
    const height = cardNode.scrollHeight || cardNode.offsetHeight || cardNode.clientHeight;
    if (!height || !Number.isFinite(height) || height <= 0) {
      return;
    }
    const normalizedHeight = Math.max(0, height - CAROUSEL_HEIGHT_PADDING);
    const nextHeight = Math.round(normalizedHeight);
    setMarketCardHeightBySlot((prev) => {
      if (prev[activeCard.key] === nextHeight) {
        return prev;
      }
      return { ...prev, [activeCard.key]: nextHeight };
    });
  }, [
    activeMarketIndex,
    activeMarketProposalBySlot,
    flippedMarketCards,
    marketCards,
    marketCarouselElement,
    marketProposalRevisionBySlot,
    prefersReducedMotion,
    viewMode,
  ]);

  useEffect(() => {
    if (viewMode !== 'market' || hasTrackedMarketView.current) {
      return;
    }

    const activeCard = marketCards[activeMarketIndex] ?? null;
    emitMissionsV2Event('missions_v2_market_view', {
      userId,
      slot: activeCard?.slot ?? null,
    });
    hasTrackedMarketView.current = true;
  }, [activeMarketIndex, marketCards, userId, viewMode]);

  const collapseMarketProposalExpansions = useCallback(
    (slotKey: MissionsV2Slot['slot']) => {
      const container = marketStackRefs.current[slotKey];
      if (!container) {
        return;
      }

      const collapsibleSelectors =
        '[data-proposal-collapsible][aria-expanded="true"], [data-proposal-collapsible][data-expanded="true"], [data-market-collapse-on-swap="true"][aria-expanded="true"], [data-market-collapse-on-swap="true"][data-expanded="true"]';
      const expandedElements = container.querySelectorAll<HTMLElement>(collapsibleSelectors);
      expandedElements.forEach((element) => {
        element.setAttribute('aria-expanded', 'false');
        if (element.dataset.expanded === 'true') {
          element.dataset.expanded = 'false';
        }
      });

      const openDetails = container.querySelectorAll('details[open]');
      openDetails.forEach((detailsElement) => {
        detailsElement.removeAttribute('open');
      });
    },
    [],
  );

  useEffect(() => {
    setActiveMarketProposalBySlot((prev) => {
      let changed = false;
      const updatedSlots: MissionsV2Slot['slot'][] = [];
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
          updatedSlots.push(entry.slot);
          changed = true;
        }
      }
      if (!changed) {
        return prev;
      }
      updatedSlots.forEach((slotKey) => {
        collapseMarketProposalExpansions(slotKey);
        previousActiveProposalBySlotRef.current[slotKey] = next[slotKey] ?? 0;
      });
      return next;
    });
  }, [orderedMarketSlots, collapseMarketProposalExpansions]);

  useEffect(() => {
    const activeCard = marketCards[activeMarketIndex] ?? null;
    setFlippedMarketCards((prev) => {
      if (!activeCard) {
        if (Object.keys(prev).length === 0) {
          return prev;
        }
        return {};
      }

      const activeKey = activeCard.key;
      const hasActiveKey = Object.prototype.hasOwnProperty.call(prev, activeKey);
      if (!hasActiveKey) {
        if (Object.keys(prev).length === 0) {
          return prev;
        }
        return {};
      }

      const next: Record<string, boolean> = { [activeKey]: prev[activeKey] ?? false };
      const prevKeys = Object.keys(prev);
      if (prevKeys.length === 1 && prevKeys[0] === activeKey) {
        const prevValue = prev[activeKey] ?? false;
        if (prevValue === next[activeKey]) {
          return prev;
        }
      }

      return next;
    });
  }, [activeMarketIndex, marketCards]);

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
      const proposals = renderMarketBySlot[slotKey] ?? [];
      setActiveMarketProposalBySlot((prev) => {
        const total = proposals.length;
        if (total <= 1 || delta === 0) {
          return prev;
        }

        const current = prev[slotKey] ?? 0;
        const next = ((current + delta) % total + total) % total;
        if (next === current) {
          return prev;
        }

        setMarketProposalTransitionBySlot((transitionPrev) => ({
          ...transitionPrev,
          [slotKey]: delta > 0 ? 'forward' : 'backward',
        }));

        setMarketProposalRevisionBySlot((revisionPrev) => ({
          ...revisionPrev,
          [slotKey]: (revisionPrev[slotKey] ?? 0) + 1,
        }));

        emitMissionsV2Event('missions_v2_market_proposal_select', {
          userId,
          slot: slotKey,
          proposalId: proposals[next]?.id ?? null,
        });

        collapseMarketProposalExpansions(slotKey);
        previousActiveProposalBySlotRef.current[slotKey] = next;

        return { ...prev, [slotKey]: next };
      });
    },
    [
      renderMarketBySlot,
      setMarketProposalTransitionBySlot,
      setMarketProposalRevisionBySlot,
      collapseMarketProposalExpansions,
      userId,
    ],
  );

  const updateMarketStackHeaderOffset = useCallback(
    (slotKey: MissionsV2Slot['slot']) => {
      const stack = marketStackRefs.current[slotKey];
      if (!stack) {
        return;
      }

      const header = marketStackHeaderRefs.current[slotKey];
      const headerHeight = header ? header.getBoundingClientRect().height : 0;
      stack.style.setProperty('--market-stack-header-height', `${headerHeight}px`);
    },
    [],
  );

  const registerMarketStackHeader = useCallback(
    (slotKey: MissionsV2Slot['slot'], node: HTMLElement | null) => {
      const previousObserver = marketStackHeaderObservers.current[slotKey];
      if (previousObserver) {
        previousObserver.disconnect();
        marketStackHeaderObservers.current[slotKey] = null;
      }

      marketStackHeaderRefs.current[slotKey] = node;

      if (node) {
        if (typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver(() => {
            updateMarketStackHeaderOffset(slotKey);
          });
          observer.observe(node);
          marketStackHeaderObservers.current[slotKey] = observer;
        }

        updateMarketStackHeaderOffset(slotKey);
      } else {
        const stack = marketStackRefs.current[slotKey];
        if (stack) {
          stack.style.removeProperty('--market-stack-header-height');
        }
      }
    },
    [updateMarketStackHeaderOffset],
  );

  const updateMarketStackFade = useCallback(
    (slotKey: MissionsV2Slot['slot'], element: HTMLDivElement | null) => {
      if (!element) {
        return;
      }

      const atTop = element.scrollTop <= 1;
      const atBottom = element.scrollTop + element.clientHeight >= element.scrollHeight - 1;

      setMarketStackFadeBySlot((prev) => {
        const current = prev[slotKey];
        if (current && current.atTop === atTop && current.atBottom === atBottom) {
          return prev;
        }
        return { ...prev, [slotKey]: { atTop, atBottom } };
      });
    },
    [],
  );

  useEffect(() => {
    return () => {
      (Object.keys(marketStackHeaderObservers.current) as MissionsV2Slot['slot'][]).forEach(
        (slotKey) => {
          const observer = marketStackHeaderObservers.current[slotKey];
          if (observer) {
            observer.disconnect();
            marketStackHeaderObservers.current[slotKey] = null;
          }
        },
      );
    };
  }, []);

  const handleMarketStackScroll = useCallback(
    (slotKey: MissionsV2Slot['slot'], event: ReactUIEvent<HTMLDivElement>) => {
      const proposals = renderMarketBySlot[slotKey] ?? [];
      const container = event.currentTarget;
      updateMarketStackFade(slotKey, container);
      if (proposals.length <= 1) {
        return;
      }
      const isTrusted = event.nativeEvent.isTrusted;
      let containerPaddingTop = 0;
      let containerHeaderOffset = 0;
      if (typeof window !== 'undefined') {
        const style = window.getComputedStyle(container);
        containerPaddingTop = Number.parseFloat(style.paddingTop) || 0;
        const headerHeightValue = Number.parseFloat(
          style.getPropertyValue('--market-stack-header-height'),
        );
        if (Number.isFinite(headerHeightValue)) {
          containerHeaderOffset = headerHeightValue;
        }
      }
      const targetPosition = container.scrollTop + containerPaddingTop + containerHeaderOffset;
      const children = Array.from(container.children) as HTMLElement[];
      if (children.length === 0) {
        return;
      }

      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;

      for (let index = 0; index < children.length; index += 1) {
        const child = children[index];
        const itemTop = child.offsetTop;
        const distance = Math.abs(itemTop - targetPosition);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
      }

      if (isTrusted && !hasTrackedMarketInnerScrollRef.current[slotKey]) {
        hasTrackedMarketInnerScrollRef.current[slotKey] = true;
        emitMissionsV2Event('missions_v2_market_inner_scroll', {
          userId,
          slot: slotKey,
        });
      }

      setActiveMarketProposalBySlot((prev) => {
        const currentIndex = prev[slotKey] ?? 0;
        if (closestIndex === currentIndex) {
          return prev;
        }

        setMarketProposalTransitionBySlot((transitionPrev) => ({
          ...transitionPrev,
          [slotKey]: closestIndex > currentIndex ? 'forward' : 'backward',
        }));

        setMarketProposalRevisionBySlot((revisionPrev) => ({
          ...revisionPrev,
          [slotKey]: (revisionPrev[slotKey] ?? 0) + 1,
        }));

        if (isTrusted) {
          emitMissionsV2Event('missions_v2_market_proposal_select', {
            userId,
            slot: slotKey,
            proposalId: proposals[closestIndex]?.id ?? null,
          });
        }

        collapseMarketProposalExpansions(slotKey);
        previousActiveProposalBySlotRef.current[slotKey] = closestIndex;

        return { ...prev, [slotKey]: closestIndex };
      });
    },
    [
      renderMarketBySlot,
      setMarketProposalRevisionBySlot,
      setMarketProposalTransitionBySlot,
      updateMarketStackFade,
      collapseMarketProposalExpansions,
      userId,
    ],
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

  useEffect(() => {
    SLOT_ORDER.forEach((slotKey) => {
      const container = marketStackRefs.current[slotKey];
      if (!container) {
        return;
      }

      const proposals = renderMarketBySlot[slotKey] ?? [];
      if (proposals.length === 0) {
        if (container.scrollTop !== 0) {
          container.scrollTop = 0;
        }
        updateMarketStackFade(slotKey, container);
        return;
      }

      const targetIndex = activeMarketProposalBySlot[slotKey] ?? 0;
      previousActiveProposalBySlotRef.current[slotKey] = targetIndex;
      const targetChild = container.children.item(targetIndex) as HTMLElement | null;
      if (!targetChild) {
        updateMarketStackFade(slotKey, container);
        return;
      }

      let paddingTop = 0;
      let headerOffset = 0;
      if (typeof window !== 'undefined') {
        const containerStyle = window.getComputedStyle(container);
        paddingTop = Number.parseFloat(containerStyle.paddingTop) || 0;
        const headerOffsetValue = Number.parseFloat(
          containerStyle.getPropertyValue('--market-stack-header-height'),
        );
        if (Number.isFinite(headerOffsetValue)) {
          headerOffset = headerOffsetValue;
        }
      }
      const targetTop = Math.max(targetChild.offsetTop - paddingTop - headerOffset, 0);
      if (Math.abs(container.scrollTop - targetTop) <= 1) {
        updateMarketStackFade(slotKey, container);
        return;
      }

      if (typeof container.scrollTo === 'function') {
        container.scrollTo({
          top: targetTop,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      } else {
        container.scrollTop = targetTop;
      }
      updateMarketStackFade(slotKey, container);
    });
  }, [
    activeMarketProposalBySlot,
    prefersReducedMotion,
    renderMarketBySlot,
    updateMarketStackFade,
  ]);

  const bossEnabled = useMemo(() => {
    if (!board) {
      return false;
    }
    const mainSlotState = board.slots.find(
      (slot: MissionsV2Slot) => slot.slot === 'main',
    );
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
      orderedSlots.forEach((slot: MissionsV2Slot) => {
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

    slotStackWheelDelta.current = orderedSlots.reduce<Record<string, number>>((acc, slot: MissionsV2Slot) => {
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
      const container = slotCarouselRef.current;
      if (!container) {
        return;
      }

      const element = container.querySelector<HTMLElement>(
        `[data-slot-carousel-index='${index}']`,
      );
      const behavior = prefersReducedMotion ? 'auto' : 'smooth';
      element?.scrollIntoView({ behavior, block: 'nearest', inline: 'center' });
    },
    [prefersReducedMotion],
  );

  const handleActivateProposal = useCallback(
    (slotKey: MissionsV2Slot['slot'], proposal: RealMarketProposal) => {
      if (!board) {
        setActionError('No pudimos preparar el tablero.');
        return;
      }

      if (proposal.locked) {
        setActionError('Esta misión ya está en curso.');
        return;
      }

      const slotIndexInBoard = board.slots.findIndex((slot: MissionsV2Slot) => slot.slot === slotKey);
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

      const nextMarket = board.market.map((entry: MissionsV2MarketSlot): MissionsV2MarketSlot =>
        entry.slot === slotKey
          ? {
              ...entry,
              proposals: entry.proposals.filter((item: MissionsV2MarketProposal) => item.id !== proposal.id),
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
      slotIndexById,
      scrollSlotCarouselToIndex,
      setActiveSlotIndex,
      userId,
    ],
  );

  const scrollCarouselToIndex = useCallback((index: number) => {
    const instance = marketSwiperRef.current;
    if (!instance) {
      return;
    }

    if (instance.params.loop) {
      instance.slideToLoop(index);
      return;
    }

    instance.slideTo(index);
  }, []);

  const stepMarketCarousel = useCallback(
    (delta: number) => {
      if (marketCards.length === 0 || delta === 0) {
        return;
      }

      if (delta > 0) {
        marketSwiperRef.current?.slideNext();
      } else {
        marketSwiperRef.current?.slidePrev();
      }
    },
    [
      marketCards,
    ],
  );

  const handleCarouselStep = useCallback(
    (direction: 'next' | 'prev') => {
      const delta = direction === 'next' ? 1 : -1;
      stepMarketCarousel(delta);
    },
    [stepMarketCarousel],
  );

  const handleMarketSwiperChange = useCallback(
    (instance: SwiperType) => {
      const total = marketCards.length;
      const nextIndex = Number.isFinite(instance.realIndex)
        ? instance.realIndex
        : instance.activeIndex ?? 0;
      const previousIndex = previousMarketSwiperIndexRef.current;

      if (total > 0 && nextIndex !== previousIndex) {
        let delta = nextIndex - previousIndex;
        if (Math.abs(delta) > total / 2) {
          delta = delta > 0 ? delta - total : delta + total;
        }
        const directionEvent =
          delta > 0 ? 'missions_v2_market_nav_next' : 'missions_v2_market_nav_prev';
        const nextCard = marketCards[nextIndex] ?? null;
        emitMissionsV2Event(directionEvent, {
          userId,
          slot: nextCard?.slot ?? null,
        });
      }

      previousMarketSwiperIndexRef.current = nextIndex;

      const openSlot = Object.keys(flippedMarketCards)[0] ?? null;
      if (openSlot) {
        const nextCard = marketCards[nextIndex] ?? null;
        if (!nextCard || nextCard.slot !== openSlot) {
          setFlippedMarketCards({});
          emitMissionsV2Event('missions_v2_market_flip_close', {
            userId,
            slot: openSlot,
          });
        }
      }

      setActiveMarketIndex((current) => (current === nextIndex ? current : nextIndex));

      const pendingSlot = pendingMarketFlipRef.current;
      if (pendingSlot) {
        const nextCard = marketCards[nextIndex] ?? null;
        if (nextCard && nextCard.slot === pendingSlot) {
          pendingMarketFlipRef.current = null;
          setFlippedMarketCards({ [pendingSlot]: true });
          emitMissionsV2Event('missions_v2_market_flip_open', {
            userId,
            slot: pendingSlot,
          });
          setActiveMarketProposalBySlot((prev) => {
            if ((prev[pendingSlot] ?? 0) === 0) {
              return prev;
            }
            collapseMarketProposalExpansions(pendingSlot);
            previousActiveProposalBySlotRef.current[pendingSlot] = 0;
            return { ...prev, [pendingSlot]: 0 };
          });
        }
      }
    },
    [
      emitMissionsV2Event,
      flippedMarketCards,
      collapseMarketProposalExpansions,
      marketCards,
      setActiveMarketProposalBySlot,
      userId,
    ],
  );

  useEffect(() => {
    previousMarketSwiperIndexRef.current = activeMarketIndex;
  }, [activeMarketIndex]);

  useEffect(() => {
    const swiper = marketSwiperRef.current;
    if (!swiper) {
      return;
    }
    const prevEl = marketSwiperPrevRef.current;
    const nextEl = marketSwiperNextRef.current;
    if (!prevEl || !nextEl) {
      return;
    }

    const navigationParams: NavigationOptions = {
      enabled: true,
      prevEl,
      nextEl,
    };
    swiper.params.navigation = navigationParams;
    if (swiper.navigation) {
      swiper.navigation.destroy();
      swiper.navigation.init();
      swiper.navigation.update();
    }
  }, [marketCards.length, viewMode]);

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

  const handleSlotCardClick = useCallback(
    (index: number) => {
      handleSlotCardSelect(index);
    },
    [handleSlotCardSelect],
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
      }
    },
    [bossEnabled, handleSlotCarouselStep, handleSlotCardSelect, handleSlotStackStep, orderedSlots],
  );

  const handleMarketCardToggle = useCallback(
    (slotKey: MissionsV2Slot['slot'], index: number) => {
      if (index !== activeMarketIndex) {
        const openSlot = Object.keys(flippedMarketCards)[0] ?? null;
        if (openSlot) {
          setFlippedMarketCards({});
          emitMissionsV2Event('missions_v2_market_flip_close', {
            userId,
            slot: openSlot,
          });
        }
        const swiper = marketSwiperRef.current;
        if (swiper) {
          pendingMarketFlipRef.current = slotKey;
          scrollCarouselToIndex(index);
          return;
        }

        const nextCard = marketCards[index] ?? null;
        setActiveMarketIndex((current) => (current === index ? current : index));
        pendingMarketFlipRef.current = null;

        if (!nextCard || nextCard.slot !== slotKey) {
          return;
        }

        setFlippedMarketCards({ [slotKey]: true });

        emitMissionsV2Event('missions_v2_market_flip_open', {
          userId,
          slot: slotKey,
        });

        setActiveMarketProposalBySlot((prev) => {
          if ((prev[slotKey] ?? 0) === 0) {
            return prev;
          }
          collapseMarketProposalExpansions(slotKey);
          previousActiveProposalBySlotRef.current[slotKey] = 0;
          return { ...prev, [slotKey]: 0 };
        });
        return;
      }

      pendingMarketFlipRef.current = null;
      const wasOpen = Boolean(flippedMarketCards[slotKey]);

      setFlippedMarketCards((prev) => {
        const next: Record<string, boolean> = { ...prev };
        for (const key of Object.keys(next)) {
          if (key !== slotKey) {
            delete next[key];
          }
        }

        if (wasOpen) {
          delete next[slotKey];
        } else {
          next[slotKey] = true;
        }

        return next;
      });

      if (wasOpen) {
        emitMissionsV2Event('missions_v2_market_flip_close', {
          userId,
          slot: slotKey,
        });
        return;
      }

      emitMissionsV2Event('missions_v2_market_flip_open', {
        userId,
        slot: slotKey,
      });

      setActiveMarketProposalBySlot((prev) => {
        if ((prev[slotKey] ?? 0) === 0) {
          return prev;
        }
        collapseMarketProposalExpansions(slotKey);
        previousActiveProposalBySlotRef.current[slotKey] = 0;
        return { ...prev, [slotKey]: 0 };
      });
    },
    [
      activeMarketIndex,
      collapseMarketProposalExpansions,
      flippedMarketCards,
      marketCards,
      scrollCarouselToIndex,
      userId,
    ],
  );

  const handleMarketCardClick = useCallback(
    (slotKey: MissionsV2Slot['slot'], index: number) => {
      handleMarketCardToggle(slotKey, index);
    },
    [handleMarketCardToggle],
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
        const proposals = renderMarketBySlot[slotKey] ?? [];
        if (proposals.length <= 1) {
          return;
        }
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        handleMarketProposalStep(slotKey, direction);
      }
    },
    [
      handleMarketCardToggle,
      handleCarouselStep,
      handleMarketProposalStep,
      renderMarketBySlot,
    ],
  );

  const handleMarketCoverLoad = useCallback(
    (cardKey: MissionsV2Slot['slot'], cardIndex: number, event: SyntheticEvent<HTMLImageElement>) => {
      const image = event.currentTarget;
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        const ratio = image.naturalWidth / image.naturalHeight;
        if (Number.isFinite(ratio) && ratio > 0) {
          const clamped = Math.min(Math.max(ratio, 0.56), 0.75);
          const value = clamped.toFixed(4);
          setMarketCoverAspect((prev) => {
            if (prev[cardKey] === value) {
              return prev;
            }
            return { ...prev, [cardKey]: value };
          });
        }
      }

      if (cardIndex !== activeMarketIndex) {
        return;
      }

      const cardElement = image.closest<HTMLElement>('.missions-market-card');
      if (!cardElement) {
        return;
      }
      const height =
        cardElement.scrollHeight || cardElement.offsetHeight || cardElement.clientHeight;
      if (!height || !Number.isFinite(height) || height <= 0) {
        return;
      }
      const normalizedHeight = Math.max(0, height - CAROUSEL_HEIGHT_PADDING);
      const nextHeight = Math.round(normalizedHeight);
      setMarketCardHeightBySlot((prev) => {
        if (prev[cardKey] === nextHeight) {
          return prev;
        }
        return { ...prev, [cardKey]: nextHeight };
      });
    },
    [activeMarketIndex],
  );

  const renderMarketCard = useCallback(
    (item: MarketCardItem, index: number) => {
      const { slot, proposals, key: cardKey } = item;
      const details = SLOT_DETAILS[slot];
      const rarity = getMarketRarity(slot);
      const slotState = board?.slots.find((slotEntry: MissionsV2Slot) => slotEntry.slot === slot);
      const slotMetrics = slotState ?? makeDemoSlot(slot, index + 1);
      const canActivate = Boolean(slotState && !slotState.mission && slotState.state === 'idle');
      const isFlipped = Boolean(flippedMarketCards[cardKey]);
      const isActiveCard = index === activeMarketIndex;
      const coverSrc = getMissionArt(slot, normalizedGameMode);
      const activeProposalIndex = activeMarketProposalBySlot[slot] ?? 0;
      const proposalList = proposals;
      const totalProposals = proposalList.length;
      const hasMultipleProposals = totalProposals > 1;
      const stackFade = marketStackFadeBySlot[slot] ?? { atTop: true, atBottom: true };
      const canScrollUp = !stackFade.atTop;
      const canScrollDown = !stackFade.atBottom;
      const activeProposal = proposalList[activeProposalIndex] ?? proposalList[0] ?? null;
      const proposalRevision = marketProposalRevisionBySlot[slot] ?? 0;
      const transitionDirection = marketProposalTransitionBySlot[slot];
      const activeProposalTitle =
        activeProposal && 'name' in activeProposal
          ? activeProposal.name
          : activeProposal && 'title' in activeProposal
          ? activeProposal.title
          : null;
      const activeSummary = activeProposal?.summary ?? '';
      const cardLabel = activeProposalTitle
        ? `${activeProposalTitle}${activeSummary ? `. ${activeSummary}` : ''}`
        : `Sin propuestas disponibles para ${details.label}`;
      const canActivateThisCard = canActivate && isActiveCard;
      const cardNode = (
        <div className="missions-active-carousel__card">
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
            style={{ '--market-card-aspect': marketCoverAspect[cardKey] ?? '3 / 4' } as CSSProperties}
            onClick={() => handleMarketCardClick(slot, index)}
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
                onLoad={(event) => handleMarketCoverLoad(slot, index, event)}
              />
            </div>
            <div className="missions-market-card__back" aria-hidden={!isFlipped}>
              <header className="missions-market-card__back-header" ref={(node) => registerMarketStackHeader(slot, node)}>
                <div className="missions-market-card__back-title">
                  <p className="missions-market-card__back-label">{details.label}</p>
                </div>
                <div className="missions-market-card__back-meta">
                  {totalProposals > 0 ? (
                    <span className="missions-market-card__stack-counter">
                      {activeProposalIndex + 1} / {totalProposals}
                    </span>
                  ) : null}
                  {hasMultipleProposals ? (
                    <span className="missions-market-card__scroll-hint">Deslizá para ver más</span>
                  ) : null}
                  <span className="missions-market-card__icon" aria-hidden="true">
                    {details.emoji}
                  </span>
                </div>
              </header>
              <div
                className="missions-market-card__stack"
                role="group"
                aria-label={`Propuestas para ${details.label}`}
                data-has-prev={canScrollUp ? 'true' : undefined}
                data-has-next={canScrollDown ? 'true' : undefined}
                data-transition={transitionDirection ?? undefined}
                onClick={(event) => event.stopPropagation()}
                onScroll={(event) => handleMarketStackScroll(slot, event)}
                ref={(node) => {
                  marketStackRefs.current[slot] = node;
                  updateMarketStackFade(slot, node);
                  updateMarketStackHeaderOffset(slot);
                }}
              >
                {proposalList.map((proposal, proposalIndex) => {
                  const isRealProposal = 'name' in proposal;
                  const rewardPreview = isRealProposal ? formatProposalReward(proposal) : proposal.reward;
                  const primaryObjective = proposal.objective;
                  const objectiveDetails = (proposal.objectives ?? []).filter(Boolean);
                  const requirementText = isRealProposal ? proposal.requirements : proposal.requirement;
                  const durationLabel = isRealProposal
                    ? formatDurationDays(proposal.duration_days)
                    : proposal.durationLabel;
                  const featureChips = isRealProposal
                    ? buildProposalFeatureChips(proposal)
                    : proposal.features;
                  const chipLabels = [
                    ...(durationLabel ? [`Duración · ${durationLabel}`] : []),
                    ...featureChips,
                  ];
                  const inlineMetaItems: Array<{ key: string; label: string; value: string }> = [];

                  if (slot === 'main') {
                    const normalizedRequirement = requirementText?.trim();
                    const requirementValue = normalizedRequirement?.length
                      ? normalizedRequirement
                      : 'Revisión manual';
                    inlineMetaItems.push({
                      key: 'requirement',
                      label: 'Requisito',
                      value: requirementValue,
                    });
                  }
                  const difficultyValue = isRealProposal
                    ? proposal.difficulty ?? '—'
                    : proposal.difficulty
                    ? `${proposal.difficulty.slice(0, 1).toUpperCase()}${proposal.difficulty.slice(1)}`
                    : '—';
                  const normalizedDifficulty =
                    difficultyValue && difficultyValue !== '—' ? difficultyValue.toLowerCase() : null;
                  const difficultyChipLabel = difficultyValue || '—';
                  const isActiveProposal = proposalIndex === activeProposalIndex;
                  const isProposalLocked = isRealProposal
                    ? Boolean(proposal.locked ?? proposal.isActive)
                    : proposal.state !== 'available';
                  const showActiveBadge = isRealProposal
                    ? Boolean(proposal.isActive)
                    : proposal.state === 'active';
                  const showAvailableBadge = !isRealProposal && proposal.state === 'available';
                  const canActivateThisProposal =
                    isRealProposal && canActivateThisCard && isActiveProposal && !isProposalLocked;
                  const proposalKey = `${slot}-${proposal.id}-${isActiveProposal ? proposalRevision : 'static'}`;
                  const summaryText = proposal.summary ?? '—';
                  const buttonLabel = isProposalLocked ? 'Misión en progreso' : `Activar en slot ${details.label}`;
                  return (
                    <article
                      key={proposalKey}
                      className="mission-proposal-card missions-market-card__proposal"
                      data-active={isActiveProposal ? 'true' : 'false'}
                      data-locked={isProposalLocked ? 'true' : undefined}
                      role="group"
                    >
                      <div className="mission-proposal-card__content">
                        <div className="mission-proposal-card__body">
                          <header className="mpc-header">
                            <span className="mpc-index">#{proposalIndex + 1}</span>
                            <div className="mpc-heading">
                              <h5>{isRealProposal ? proposal.name : proposal.title}</h5>
                              {(showActiveBadge || isProposalLocked || showAvailableBadge) && (
                                <div className="mpc-badges">
                                  {showActiveBadge ? <span className="mpc-badge mpc-badge--active">Activa</span> : null}
                                  {isProposalLocked && !showActiveBadge ? (
                                    <span className="mpc-badge">En progreso</span>
                                  ) : null}
                                  {showAvailableBadge ? <span className="mpc-badge">Disponible</span> : null}
                                </div>
                              )}
                            </div>
                          </header>
                          <div className="mpc-summary">
                            <p className="mpc-summary__text">{summaryText}</p>
                            <span
                              className="mpc-difficulty-chip"
                              data-difficulty={normalizedDifficulty ?? undefined}
                              aria-label={`Dificultad: ${difficultyChipLabel}`}
                            >
                              {difficultyChipLabel}
                            </span>
                          </div>
                          <div className="mpc-reward">
                            <span className="mpc-reward__label">Recompensa</span>
                            <span className="mpc-reward__value">{rewardPreview ?? '—'}</span>
                          </div>
                          <div className="mpc-objective">
                            <span className="mpc-objective__label">Objetivo</span>
                            <p className="mpc-objective__text">{primaryObjective || '—'}</p>
                          </div>
                          {objectiveDetails.length > 0 && (
                            <ul className="mpc-objective-list">
                              {objectiveDetails.map((detail: string) => (
                                <li key={`${proposal.id}-objective-${detail}`}>{detail}</li>
                              ))}
                            </ul>
                          )}
                          {(inlineMetaItems.length > 0 || chipLabels.length > 0) && (
                            <ul className="mpc-inline-meta">
                              {inlineMetaItems.map((item: { key: string; label: string; value: string }) => (
                                <li key={`${proposal.id}-${item.key}`}>
                                  <span className="mpc-inline-meta__label">{item.label}</span>
                                  <span className="mpc-inline-meta__value">{item.value}</span>
                                </li>
                              ))}
                              {chipLabels.map((chipLabel: string) => (
                                <li key={`${proposal.id}-chip-${chipLabel}`} className="mpc-inline-meta__chip">
                                  <span className="mpc-chip">{chipLabel}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <footer className="mission-proposal-card__footer">
                          <button
                            type="button"
                            className="mission-proposal-card__cta"
                            data-variant={canActivateThisProposal ? 'primary' : 'ghost'}
                            disabled={!canActivateThisProposal}
                            onClick={(event) => {
                              event.stopPropagation();
                              if (canActivateThisProposal && isRealProposal) {
                                handleActivateProposal(slot, proposal);
                              }
                            }}
                          >
                            {buttonLabel}
                          </button>
                        </footer>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </article>
        </div>
      );

      return (
        <SwiperSlide key={cardKey}>
          <div
            className="missions-market-carousel__item missions-active-carousel__item"
            data-carousel-index={index}
            data-active={isActiveCard ? 'true' : 'false'}
          >
            {cardNode}
          </div>
        </SwiperSlide>
      );
    },
    [
      board,
      flippedMarketCards,
      activeMarketIndex,
      normalizedGameMode,
      activeMarketProposalBySlot,
      marketStackFadeBySlot,
      marketProposalRevisionBySlot,
      marketProposalTransitionBySlot,
      marketCoverAspect,
      handleMarketCardClick,
      handleMarketCardKeyDown,
      handleMarketCoverLoad,
      handleActivateProposal,
      handleMarketStackScroll,
      registerMarketStackHeader,
      updateMarketStackFade,
      updateMarketStackHeaderOffset,
    ],
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

  const registerSlotRef = useCallback(
    (slotId: string) => (element: HTMLElement | null) => {
      if (element) {
        slotRefs.current[slotId] = element;
      } else {
        delete slotRefs.current[slotId];
      }
    },
    [],
  );

  useLayoutEffect(() => {
    if (viewMode !== 'active' || prefersReducedMotion) {
      setActiveSlotCardHeight(null);
      return;
    }

    const activeSlot = orderedSlots[activeSlotIndex];
    if (!activeSlot) {
      setActiveSlotCardHeight(null);
      return;
    }

    const element = slotRefs.current[activeSlot.id] ?? null;
    if (!element) {
      setActiveSlotCardHeight(null);
      return;
    }

    let frame = 0;
    const updateHeight = () => {
      frame = 0;
      const height = element.scrollHeight || element.offsetHeight || element.clientHeight;
      if (!height || !Number.isFinite(height) || height <= 0) {
        return;
      }
      const normalizedHeight = Math.max(0, height - CAROUSEL_HEIGHT_PADDING);
      setActiveSlotCardHeight((current) => {
        if (current != null && Math.abs(current - normalizedHeight) < 1) {
          return current;
        }
        return normalizedHeight;
      });
    };

    updateHeight();

    const win = typeof window !== 'undefined' ? window : null;
    if (!win) {
      return;
    }

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        if (frame) {
          win.cancelAnimationFrame(frame);
        }
        frame = win.requestAnimationFrame(updateHeight);
      });
      observer.observe(element);
      return () => {
        observer.disconnect();
        if (frame) {
          win.cancelAnimationFrame(frame);
        }
      };
    }

    const handleResize = () => {
      if (frame) {
        win.cancelAnimationFrame(frame);
      }
      frame = win.requestAnimationFrame(updateHeight);
    };

    win.addEventListener('resize', handleResize);

    return () => {
      win.removeEventListener('resize', handleResize);
      if (frame) {
        win.cancelAnimationFrame(frame);
      }
    };
  }, [activeSlotIndex, orderedSlots, prefersReducedMotion, viewMode]);

  useEffect(() => {
    const previousSlotId = previousActiveSlotIdRef.current;
    const nextSlot = orderedSlots[activeSlotIndex] ?? null;

    if (previousSlotId && previousSlotId !== nextSlot?.id) {
      setActiveSlotStackBySlot((prev) => {
        if ((prev[previousSlotId] ?? 0) === 0) {
          return prev;
        }
        return { ...prev, [previousSlotId]: 0 };
      });
    }

    previousActiveSlotIdRef.current = nextSlot?.id ?? null;
  }, [activeSlotIndex, orderedSlots]);

  useEffect(() => {
    setExpandedSlots((prev) => {
      if (Object.keys(prev).length === 0) {
        return prev;
      }
      return {};
    });
  }, [activeSlotIndex]);

  useEffect(() => {
    setExpandedSlots((prev) => {
      if (Object.keys(prev).length === 0) {
        return prev;
      }
      return {};
    });
  }, [activeMarketIndex]);

  useEffect(() => {
    if (viewMode !== 'active') {
      return;
    }

    const container = slotCarouselRef.current;
    if (!container) {
      return;
    }

    let raf = 0;
    const updateActive = () => {
      const items = container.querySelectorAll<HTMLElement>('[data-slot-carousel-index]');
      if (items.length === 0) {
        return;
      }

      const { left, width } = container.getBoundingClientRect();
      const center = left + width / 2;
      let closestIndex = activeSlotIndex;
      let closestDistance = Number.POSITIVE_INFINITY;

      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.left + rect.width / 2;
        const distance = Math.abs(center - itemCenter);
        if (distance < closestDistance - 0.5) {
          const raw = item.getAttribute('data-slot-carousel-index');
          const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
          if (!Number.isNaN(parsed)) {
            closestDistance = distance;
            closestIndex = parsed;
          }
        }
      });

      setActiveSlotIndex((current) => (current === closestIndex ? current : closestIndex));
    };

    updateActive();

    const handleScroll = () => {
      if (raf) {
        cancelAnimationFrame(raf);
      }
      raf = window.requestAnimationFrame(() => updateActive());
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, [activeSlotIndex, orderedSlots.length, viewMode]);

  useEffect(() => {
    if (viewMode !== 'market') {
      return;
    }
    if (marketCards.length === 0) {
      return;
    }
    if (!shouldDisableMarketSwiper && marketSwiperInstance) {
      return;
    }

    const container = marketCarouselElement;
    if (!container) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }

    let raf = 0;

    const updateActive = () => {
      const items = container.querySelectorAll<HTMLElement>('[data-carousel-index]');
      if (items.length === 0) {
        return;
      }

      const { left, width } = container.getBoundingClientRect();
      const center = left + width / 2;
      let closestIndex = activeMarketIndex;
      let closestDistance = Number.POSITIVE_INFINITY;

      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.left + rect.width / 2;
        const distance = Math.abs(center - itemCenter);

        if (distance < closestDistance - 0.5) {
          const raw = item.getAttribute('data-carousel-index');
          const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

          if (!Number.isNaN(parsed)) {
            closestDistance = distance;
            closestIndex = parsed;
          }
        }
      });

      setActiveMarketIndex((current) => (current === closestIndex ? current : closestIndex));
    };

    const handleScroll = () => {
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
      raf = window.requestAnimationFrame(updateActive);
    };

    updateActive();

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (raf) {
        window.cancelAnimationFrame(raf);
      }
    };
  }, [
    activeMarketIndex,
    marketCards.length,
    marketCarouselElement,
    marketSwiperInstance,
    shouldDisableMarketSwiper,
    viewMode,
  ]);

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
    if (viewMode !== 'active') {
      return;
    }

    if (!hasInitializedActiveSnapRef.current) {
      hasInitializedActiveSnapRef.current = true;
      previousActiveSnapIndexRef.current = activeSlotIndex;
      return;
    }

    if (previousActiveSnapIndexRef.current === activeSlotIndex) {
      return;
    }

    previousActiveSnapIndexRef.current = activeSlotIndex;

    const viewport = getViewportSnapshot();
    emitMissionsV2Event('missions_v2_scroll_active_snap', {
      track: 'active',
      cardIndex: activeSlotIndex,
      viewport: viewport ?? null,
      userAgentHash: userAgentHash ?? null,
    });
  }, [activeSlotIndex, userAgentHash, viewMode]);

  const toggleSlotExpansion = useCallback((slot: MissionsV2Slot) => {
    setExpandedSlots((prev) => {
      const isExpanded = Boolean(prev[slot.id]);
      if (isExpanded) {
        const next = { ...prev };
        delete next[slot.id];
        return next;
      }
      return { [slot.id]: true };
    });
  }, []);

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
    const heartbeatAction = slot.actions.find((action: MissionsV2Action) => action.type === 'heartbeat');
    const linkAction = slot.actions.find((action: MissionsV2Action) => action.type === 'link_daily');
    const slotIndex = slotIndexById.get(slot.id) ?? -1;
    const isActiveSlot = slotIndex === activeSlotIndex;
    const heartbeatHighlight = heartbeatFeedback?.slotId === slot.id;

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
      const [firstAction] = slot.actions.filter((action: MissionsV2Action) => action.type !== 'claim');
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

    const secondaryActions = slot.actions.filter((action: MissionsV2Action) => {
      if (action.type === 'claim') {
        return false;
      }
      if (primaryActionId && action.id === primaryActionId) {
        return false;
      }
      return true;
    });

    const heartbeatActionId = heartbeatAction?.id;
    const resolvedPrimaryAction = primaryAction!;

    const slotCardStyle: MissionCardStyle = {
      ...buildMissionCardStyle(slot.slot, normalizedGameMode),
      ...(viewMode === 'active'
        ? {
            '--missions-card-art': 'none',
            '--missions-card-art-opacity': '0',
          }
        : {}),
    };
    const hasMission = Boolean(mission);
    const isExpanded = expandedSlots[slot.id] ?? false;

    const card = (
      <Card
        key={slot.id}
        variant="plain"
        className={classNames(
          'missions-card missions-active-card',
          details.gradient,
          details.aura,
          !prefersReducedMotion && 'transition-transform duration-200 ease-out hover:-translate-y-0.5',
          slot.state === 'cooldown' && 'missions-card--frozen',
          slot.state === 'succeeded' && canClaim && 'missions-card--claim-ready',
          heartbeatHighlight && 'missions-card--heartbeat',
          !hasMission && 'missions-card--empty',
        )}
        data-rarity={rarity}
        data-slot={slot.slot}
        style={slotCardStyle}
        bodyClassName={classNames(
          'missions-card__body missions-card__body--slot',
          !isExpanded && 'missions-card__body--slot-collapsed',
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
        {hasMission ? (
          <ActiveMissionCard
            slot={slot}
            heroLine={heroLine}
            requirementChips={requirementChips}
            rewardCopy={rewardCopy}
            primaryAction={resolvedPrimaryAction}
            secondaryActions={secondaryActions}
            heartbeatActionId={heartbeatActionId}
            heartbeatHighlight={Boolean(heartbeatHighlight)}
            heartbeatPending={heartbeatPending}
            prefersReducedMotion={prefersReducedMotion}
            busy={busy}
            onHeartbeat={handleHeartbeat}
            onLinkDaily={handleLinkDaily}
            onUnavailableAction={handleUnavailableAction}
            expanded={isExpanded}
            onToggle={toggleSlotExpansion}
          />
        ) : (
          <div className="missions-slot-card__empty-shell" aria-hidden="true" />
        )}
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
              <button type="button" className="missions-slot-empty__cta" onClick={scrollToMarket}>
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

  return (
    <div className="missions-board" data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}>
      <div className="missions-board__background" aria-hidden="true" />
      <PetalField disabled={prefersReducedMotion} />
      <div className="missions-board__content">
        {board.communications.length > 0 && (
          <div className="space-y-3">
            {board.communications.map((comm: MissionsV2Communication) => (
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
                  style={slotCarouselStyle}
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
                    const translateY = (1 - depth) * 48;
                    const distance = Math.abs(limitedOffset);
                    const scale = Math.max(0.72, 1 - 0.18 * distance);
                    const opacity = Math.max(0.4, 1 - 0.45 * distance);
                    const tiltX = Math.sin(angle) * 4.5;
                    const zIndex = Math.round((depth + 1) * 40) + (isActiveCard ? 80 : 0);
                    const itemStyle: CSSProperties = prefersReducedMotion
                      ? {
                          transform: 'none',
                          opacity: 1,
                          zIndex: isActiveCard ? 2 : 1,
                        }
                      : {
                          transform: `translateY(${translateY}px) scale(${scale}) rotateX(${tiltX}deg)`,
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
                        onClick={() => handleSlotCardClick(index)}
                        onKeyDown={(event) => handleSlotCardKeyDown(event, slot.id, index)}
                      >
                        <div
                          className="missions-active-carousel__card"
                          ref={registerSlotRef(slot.id)}
                        >
                          {renderSlotCard(slot)}
                        </div>
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
          <div className="missions-market-view">
            <header className="missions-market-view__intro">
              <h3 className="missions-market-view__title">Market de misiones</h3>
              <p className="missions-market-view__subtitle">
                Deslizá, elegí y activá tu próxima propuesta
              </p>
            </header>
            <div className="missions-market-carousel">
              <div className="missions-market-carousel__controls">
                <p className="missions-market-carousel__hint">
                  Deslizá las cartas para ver propuestas disponibles por slot.
                </p>
                <div className="missions-market-carousel__buttons">
                  <button
                    type="button"
                    className="missions-market-carousel__button"
                    ref={marketSwiperPrevRef}
                    onClick={() => handleCarouselStep('prev')}
                    aria-label="Ver propuesta anterior"
                    disabled={marketCards.length === 0}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className="missions-market-carousel__button"
                    ref={marketSwiperNextRef}
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
                  <Swiper
                    className="missions-market-carousel__track missions-active-carousel__track"
                    modules={[EffectCards, Navigation]}
                    effect="cards"
                    loop={false}
                    rewind
                    grabCursor
                    preventClicks={false}
                    preventClicksPropagation={false}
                    initialSlide={Math.min(DEFAULT_MARKET_INDEX, Math.max(marketCards.length - 1, 0))}
                    role="listbox"
                    aria-label="Marketplace de misiones disponibles"
                    style={marketCarouselStyle}
                    data-feature={isMarketSwiperCardsEnabled ? 'swiper-cards' : undefined}
                    onSwiper={(instance: SwiperType) => {
                      if (shouldDisableMarketSwiper) {
                        marketSwiperRef.current = null;
                      } else {
                        marketSwiperRef.current = instance;
                      }
                      const element = instance.el as HTMLDivElement;
                      carouselRef.current = element;
                      setMarketCarouselElement(element);
                      const resolvedIndex = Number.isFinite(instance.realIndex)
                        ? instance.realIndex
                        : instance.activeIndex ?? DEFAULT_MARKET_INDEX;
                      previousMarketSwiperIndexRef.current = resolvedIndex;
                      setActiveMarketIndex((current) =>
                        current === resolvedIndex ? current : resolvedIndex,
                      );
                    }}
                    onSlideChange={handleMarketSwiperChange}
                    navigation={false}
                    cardsEffect={{ slideShadows: false }}
                  >
                    {marketCards.map(renderMarketCard)}
                  </Swiper>
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
          </div>
        </div>
      </div>

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
