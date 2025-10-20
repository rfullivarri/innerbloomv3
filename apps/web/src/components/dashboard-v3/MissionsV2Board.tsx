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

interface MissionsV2BoardProps {
  userId: string;
}

const SLOT_ORDER: Array<MissionsV2Slot['slot']> = ['main', 'hunt', 'skill'];

const SLOT_EMOJIS: Record<MissionsV2Slot['slot'], string> = {
  main: '🎯',
  hunt: '🕵️',
  skill: '🛠️',
};

const SLOT_LABELS: Record<MissionsV2Slot['slot'], string> = {
  main: 'Main Quest',
  hunt: 'Hunt',
  skill: 'Skill Route',
};

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function MissionsV2Board({ userId }: MissionsV2BoardProps) {
  const location = useLocation();
  const { data, status, error, reload } = useRequest(() => getMissionsV2Board(), []);
  const [board, setBoard] = useState<MissionsV2BoardResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});
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

  const isOnMissionsRoute = useMemo(() => location.pathname.endsWith('/missions-v2'), [location.pathname]);

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

  const renderPetals = (slot: MissionsV2Slot) => {
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: slot.petals.total }).map((_, index) => {
          const remaining = slot.petals.remaining;
          const filled = index < remaining;
          return (
            <span
              key={`${slot.id}-petal-${index}`}
              className={classNames(
                'inline-flex h-6 w-6 items-center justify-center rounded-full border text-sm transition',
                filled ? 'border-pink-400/70 bg-pink-500/20 text-pink-100' : 'border-white/15 bg-white/5 text-white/40',
              )}
            >
              {filled ? '🌸' : '◇'}
            </span>
          );
        })}
      </div>
    );
  };

  const renderSlotCard = (slot: MissionsV2Slot) => {
    const mission = slot.mission;
    const busy = Boolean(busyMap[slot.id]);
    const canClaim =
      Boolean(mission) &&
      FEATURE_MISSIONS_V2 &&
      isOnMissionsRoute &&
      slot.claim.available &&
      slot.claim.enabled;

    const rewardText = mission
      ? `${mission.reward.xp} XP · ${mission.reward.currency ?? 0} Monedas`
      : 'Recompensa disponible próximamente';

    return (
      <Card
        key={slot.id}
        title={`${SLOT_EMOJIS[slot.slot]} ${SLOT_LABELS[slot.slot]}`}
        subtitle={mission?.name ?? 'Misión no disponible'}
        rightSlot={
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
            {slot.state === 'succeeded'
              ? 'Completada'
              : slot.state === 'claimed'
              ? 'Claim realizado'
              : slot.state === 'active'
              ? 'En progreso'
              : slot.state === 'failed'
              ? 'Fallida'
              : slot.state === 'cooldown'
              ? 'Cooldown'
              : 'Pendiente'}
          </span>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-slate-100">
              {mission?.summary ?? 'Todavía no hay una misión asignada a este slot.'}
            </p>
            <p className="text-xs text-slate-300">
              Requisitos: {mission?.requirements ?? 'A confirmar'}
            </p>
            <p className="text-xs text-slate-300">Objetivo: {mission?.objective ?? 'A confirmar'}</p>
            <p className="text-xs text-slate-400">Recompensa: {rewardText}</p>
            <p className="text-xs text-slate-400">{slot.countdown.label}</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Progreso</span>
              <span>
                {slot.progress.current}/{slot.progress.target} · {slot.progress.percent}%
              </span>
            </div>
            <ProgressBar value={slot.progress.percent} />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">{renderPetals(slot)}</div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
              Heartbeat {slot.heartbeat_today ? 'marcado hoy' : 'pendiente'}
            </span>
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
                      'inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition',
                      !isDisabled
                        ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                        : 'cursor-not-allowed border-white/10 bg-white/5 text-white/40',
                    )}
                  >
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
                      'inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition',
                      !isDisabled
                        ? 'border-sky-400/60 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30'
                        : 'cursor-not-allowed border-white/10 bg-white/5 text-white/40',
                    )}
                  >
                    {action.label}
                  </button>
                );
              }

              return (
                <button
                  key={action.id}
                  type="button"
                  disabled
                  onClick={() => handleUnavailableAction(action)}
                  className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/40"
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
                'inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition',
                canClaim && !busy
                  ? 'border-amber-400/60 bg-amber-500/20 text-amber-100 hover:bg-amber-500/30'
                  : 'cursor-not-allowed border-white/10 bg-white/5 text-white/40',
              )}
            >
              Claim
            </button>
          </div>
        </div>
      </Card>
    );
  };

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="space-y-5">
        <Card title="Misiones v2" subtitle="Cargando tablero">
          <div className="h-32 animate-pulse rounded-2xl bg-white/10" />
        </Card>
      </div>
    );
  }

  if (status === 'error' || !board) {
    return (
      <div className="space-y-4">
        <ToastBanner tone="error" message="No pudimos cargar Misiones v2. Recargá la página para reintentar." />
        {error && (
          <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">{String(error)}</pre>
        )}
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const orderedSlots = [...board.slots].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot),
  );

  return (
    <div className="space-y-5">
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

      <Card title="Boss quincenal" subtitle={board.boss.name}>
        <div className="space-y-2 text-sm text-slate-100">
          <p>{board.boss.description}</p>
          <p className="text-xs text-slate-300">{board.boss.countdown.label}</p>
          <div className="flex flex-wrap items-center gap-2">
            {board.boss.actions.map((action) => (
              <span
                key={action.id}
                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200"
              >
                {action.label} {action.enabled ? '· pronto' : '· bloqueado'}
              </span>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {orderedSlots.map((slot) => renderSlotCard(slot))}
      </div>
    </div>
  );
}
