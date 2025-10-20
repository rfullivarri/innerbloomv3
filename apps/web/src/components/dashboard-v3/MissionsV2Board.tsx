import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  claimMissionsV2Mission,
  getMissionsV2Board,
  linkMissionsV2Daily,
  postMissionsV2Heartbeat,
  type MissionsV2Action,
  type MissionsV2BoardResponse,
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

const MARKET_PREVIEWS: Array<{
  id: string;
  slot: MissionsV2Slot['slot'];
  title: string;
  summary: string;
  reward: string;
  requirements: string[];
  icon: string;
  rarity: Rarity;
}> = [
  {
    id: 'market-main-preview',
    slot: 'main',
    title: 'Juramento del Acto II',
    summary: 'Sellá tu compromiso público con evidencia narrada en 48h.',
    reward: '320 XP · Medalla de Acto',
    requirements: ['Requiere objetivo activo', 'Boss: Acto 2'],
    icon: '🛡️',
    rarity: 'legendary',
  },
  {
    id: 'market-hunt-preview',
    slot: 'hunt',
    title: 'Cadena Heroica',
    summary: '3 sesiones con booster activo. Sin Heartbeat = pétalo perdido.',
    reward: '200 XP · Cofre de Cacería',
    requirements: ['Booster activo mañana', 'Vinculá la Daily'],
    icon: '🔥',
    rarity: 'epic',
  },
  {
    id: 'market-skill-preview',
    slot: 'skill',
    title: 'Ruta Focus · Nodo 1',
    summary: 'Activa micro-nodos de Focus y compartí síntesis rápida.',
    reward: '140 XP · Aura +1 Focus',
    requirements: ['Heartbeat diario', 'Slot libre requerido'],
    icon: '🧠',
    rarity: 'rare',
  },
];

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

function getRewardCopy(slot: MissionsV2Slot): string {
  const reward = slot.mission?.reward;
  if (!reward) {
    return 'Botín en preparación';
  }
  const currency = reward.currency ?? 0;
  const items = reward.items?.length ? ` · ${reward.items.join(' + ')}` : '';
  return `${reward.xp} XP · ${currency} Monedas${items}`;
}

function formatCountdown(label: string): string {
  if (!label) {
    return 'Countdown pendiente';
  }
  return label;
}

function buildHeroLine(slot: MissionsV2Slot): string {
  if (slot.mission?.summary) {
    return slot.mission.summary;
  }
  const preview = MARKET_PREVIEWS.find((item) => item.slot === slot.slot);
  return preview?.summary ?? 'Slot vacío. Elegí tu reto.';
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
            <p className="text-sm text-slate-200">
              Tesoro protegido: XP, amuletos y monedas listos para tu vitrina.
            </p>
            <ul className="w-full space-y-2 text-left text-sm text-slate-100">
              <li className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                <span className="font-semibold">XP</span>
                <span>{state.rewards.xp}</span>
              </li>
              <li className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                <span className="font-semibold">Monedas</span>
                <span>{state.rewards.currency}</span>
              </li>
              <li className="rounded-xl border border-white/10 bg-white/5 px-4 py-2">
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

function MissionPetals({ slot, prefersReducedMotion }: { slot: MissionsV2Slot; prefersReducedMotion: boolean }) {
  return (
    <div className="missions-petals" aria-label={`Pétalos restantes: ${slot.petals.remaining} de ${slot.petals.total}`}>
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
            )}
            aria-hidden="true"
          />
        );
      })}
    </div>
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
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (status === 'success' && data) {
      setBoard(data);
    }
  }, [status, data]);

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

  const handleUnavailableAction = useCallback((action: MissionsV2Action) => {
    if (action.type === 'special_strike' || action.type === 'submit_evidence') {
      setActionError('Esta acción estará disponible en la próxima iteración del tablero.');
    } else if (action.type === 'abandon') {
      setActionError('El Abandono Honroso se habilitará cuando el flujo esté completo.');
    }
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
    const heroLine = buildHeroLine(slot);
    const rewardCopy = getRewardCopy(slot);

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
        )}
        data-rarity={rarity}
        data-slot={slot.slot}
        bodyClassName="gap-6"
        title={`${details.emoji} ${details.label}`}
        subtitle={mission?.name ?? 'Slot vacío. Elegí tu reto.'}
        rightSlot={
          <span className={classNames('missions-chip', `missions-chip--${stateConfig.tone}`)}>
            {stateConfig.label}
          </span>
        }
      >
        <p className="text-sm font-semibold text-slate-100">{heroLine}</p>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          {requirementChips.map((chip) => (
            <span key={`${slot.id}-req-${chip}`} className="missions-requirement">
              {chip}
            </span>
          ))}
        </div>
        <div className="space-y-3">
          <div className="flex flex-col gap-1 text-xs text-slate-300">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Objetivo</span>
            <p className="text-sm text-slate-100">{mission?.objective ?? 'Activa una misión del market para este slot.'}</p>
            <p className="text-xs text-slate-400">{formatCountdown(slot.countdown.label)}</p>
          </div>
          <MissionProgress slot={slot} prefersReducedMotion={prefersReducedMotion} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-200">
          <MissionPetals slot={slot} prefersReducedMotion={prefersReducedMotion} />
          <span
            className={classNames(
              'missions-heartbeat-chip',
              heartbeatPending ? 'missions-heartbeat-chip--pending' : 'missions-heartbeat-chip--done',
            )}
          >
            Heartbeat {heartbeatPending ? 'pendiente' : 'sellado hoy'}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Botín</p>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-100">
            {rewardCopy}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {slot.actions.map((action) => {
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

            if (action.type === 'claim') {
              return null;
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
          <button
            type="button"
            disabled={!canClaim || busy}
            onClick={() => handleClaim(slot)}
            className={classNames(
              'missions-claim-btn',
              (!canClaim || busy) && 'missions-claim-btn--disabled',
              prefersReducedMotion && 'missions-claim-btn--static',
            )}
          >
            <span aria-hidden="true" className="missions-claim-btn__icon" />
            Abrir cofre
          </button>
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

        {actionError && <ToastBanner tone="error" message={actionError} />}

        <Card
          className="missions-card missions-card--boss"
          title="Boss quincenal"
          subtitle={board.boss.name}
          bodyClassName="gap-6"
        >
          <div className="missions-boss-header">
            <div className="missions-boss-shield" role="img" aria-label={`Escudo del boss ${shield.current} de ${shield.max}`}>
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
          <p className="text-sm text-slate-200">
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
          bodyClassName="gap-5"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {MARKET_PREVIEWS.map((preview) => (
              <article key={preview.id} className="missions-market-card" data-rarity={preview.rarity}>
                <header className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{SLOT_DETAILS[preview.slot].label}</p>
                    <h4 className="text-base font-semibold text-slate-100">{preview.title}</h4>
                  </div>
                  <span className="missions-market-card__icon" aria-hidden="true">
                    {preview.icon}
                  </span>
                </header>
                <p className="text-sm text-slate-300">{preview.summary}</p>
                <div className="missions-market-card__reward">{preview.reward}</div>
                <ul className="missions-market-card__requirements">
                  {preview.requirements.map((item) => (
                    <li key={`${preview.id}-${item}`}>{item}</li>
                  ))}
                </ul>
                <button type="button" className="missions-market-card__cta" disabled>
                  Activar en slot {SLOT_DETAILS[preview.slot].label}
                </button>
              </article>
            ))}
          </div>
        </Card>
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
