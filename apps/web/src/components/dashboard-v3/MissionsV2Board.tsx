import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  activateMissionsV2PhaseTwo,
  claimMissionsV2Slot,
  getMissionsV2Board,
  linkMissionsV2Daily,
  rerollMissionsV2Slot,
  saveMissionsV2FutureNote,
  selectMissionsV2Proposal,
  submitMissionsV2Evidence,
  triggerMissionsV2SpecialStrike,
  type MissionsV2Action,
  type MissionsV2BoardResponse,
  type MissionsV2Proposal,
  type MissionsV2Slot,
  type MissionsV2SlotKey,
} from '../../lib/api';
import { useRequest } from '../../hooks/useRequest';
import { Card } from '../ui/Card';
import { ProgressBar } from '../common/ProgressBar';
import { ToastBanner } from '../common/ToastBanner';
import { emitMissionsV2Event } from '../../lib/telemetry';

interface MissionsV2BoardProps {
  userId: string;
}

function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

const SLOT_ORDER: MissionsV2SlotKey[] = ['main', 'hunt', 'skill'];

const SLOT_EMOJIS: Record<MissionsV2SlotKey, string> = {
  main: '🎯',
  hunt: '🕵️',
  skill: '🛠️',
};

const SLOT_NAMES: Record<MissionsV2SlotKey, string> = {
  main: 'Main',
  hunt: 'Hunt',
  skill: 'Skill',
};

const COMMUNICATION_TONE: Record<string, 'success' | 'info' | 'error'> = {
  daily: 'success',
  weekly: 'info',
  biweekly: 'info',
  seasonal: 'info',
};

export function MissionsV2Board({ userId }: MissionsV2BoardProps) {
  const { data, status, error, reload } = useRequest(() => getMissionsV2Board(userId), [userId]);
  const [board, setBoard] = useState<MissionsV2BoardResponse | null>(null);
  const [weeklyModalDismissed, setWeeklyModalDismissed] = useState(false);
  const [isWeeklyModalOpen, setWeeklyModalOpen] = useState(false);
  const [weeklyBusy, setWeeklyBusy] = useState<Partial<Record<MissionsV2SlotKey, boolean>>>({});
  const [slotBusy, setSlotBusy] = useState<Partial<Record<MissionsV2SlotKey, boolean>>>({});
  const [phaseBusy, setPhaseBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notePrompt, setNotePrompt] = useState<{
    friction_id: string;
    label: string;
    prompt: string;
    saved_note: string | null;
  } | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const hasTrackedViewRef = useRef(false);

  useEffect(() => {
    if (status === 'success' && data) {
      setBoard(data);
    }
  }, [status, data]);

  useEffect(() => {
    if (!hasTrackedViewRef.current && status === 'success' && data) {
      emitMissionsV2Event('missions_v2_view', { userId, source: 'board' });
      hasTrackedViewRef.current = true;
    }
  }, [status, data, userId]);

  useEffect(() => {
    if (board?.weekly_selection?.status === 'pending' && !weeklyModalDismissed) {
      setWeeklyModalOpen(true);
    } else {
      setWeeklyModalOpen(false);
      if (board?.weekly_selection?.status !== 'pending') {
        setWeeklyModalDismissed(false);
      }
    }
  }, [board?.weekly_selection?.status, weeklyModalDismissed]);

  useEffect(() => {
    if (notePrompt) {
      setNoteValue(notePrompt.saved_note ?? '');
    }
  }, [notePrompt]);

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  const handleSelectProposal = async (slot: MissionsV2SlotKey, missionId: string) => {
    setWeeklyBusy((prev) => ({ ...prev, [slot]: true }));
    setActionError(null);
    try {
      emitMissionsV2Event('missions_v2_select_open', { userId, slot, source: 'board' });
      const nextBoard = await selectMissionsV2Proposal(userId, slot, missionId);
      setBoard(nextBoard);
    } catch (err) {
      console.error('Failed to select mission proposal', err);
      setActionError('No pudimos asignar la misión. Intentá nuevamente.');
    } finally {
      setWeeklyBusy((prev) => ({ ...prev, [slot]: false }));
    }
  };

  const handleRerollSlot = async (slot: MissionsV2SlotKey) => {
    setWeeklyBusy((prev) => ({ ...prev, [slot]: true }));
    setActionError(null);
    try {
      const nextBoard = await rerollMissionsV2Slot(userId, slot);
      setBoard(nextBoard);
    } catch (err) {
      console.error('Failed to reroll proposals', err);
      setActionError('No pudimos actualizar las propuestas de este slot.');
    } finally {
      setWeeklyBusy((prev) => ({ ...prev, [slot]: false }));
    }
  };

  const handleContextAction = async (slot: MissionsV2SlotKey, action: MissionsV2Action) => {
    setSlotBusy((prev) => ({ ...prev, [slot]: true }));
    setActionError(null);
    try {
      let nextBoard: MissionsV2BoardResponse;
      if (action.type === 'link_daily') {
        nextBoard = await linkMissionsV2Daily(userId, slot);
      } else if (action.type === 'special_strike') {
        nextBoard = await triggerMissionsV2SpecialStrike(userId, slot);
      } else {
        nextBoard = await submitMissionsV2Evidence(userId, slot);
      }
      setBoard(nextBoard);
    } catch (err) {
      console.error('Failed to execute mission action', err);
      setActionError('No pudimos ejecutar la acción contextual.');
    } finally {
      setSlotBusy((prev) => ({ ...prev, [slot]: false }));
    }
  };

  const handleClaim = async (slot: MissionsV2SlotKey) => {
    setSlotBusy((prev) => ({ ...prev, [slot]: true }));
    setActionError(null);
    try {
      emitMissionsV2Event('missions_v2_claim_open', { userId, slot, source: 'board' });
      const result = await claimMissionsV2Slot(userId, slot);
      setBoard(result.board);
      if (result.future_note_prompt) {
        setNotePrompt(result.future_note_prompt);
      }
    } catch (err) {
      console.error('Failed to claim mission', err);
      setActionError('No pudimos reclamar la misión. Probá de nuevo en unos minutos.');
    } finally {
      setSlotBusy((prev) => ({ ...prev, [slot]: false }));
    }
  };

  const handlePhaseTwo = async () => {
    setPhaseBusy(true);
    setActionError(null);
    try {
      const nextBoard = await activateMissionsV2PhaseTwo(userId);
      setBoard(nextBoard);
    } catch (err) {
      console.error('Failed to activate phase two', err);
      setActionError('La fase 2 todavía no está disponible.');
    } finally {
      setPhaseBusy(false);
    }
  };

  const handleSaveNote = async () => {
    if (!notePrompt) {
      return;
    }
    setIsSavingNote(true);
    setActionError(null);
    try {
      const response = await saveMissionsV2FutureNote(userId, notePrompt.friction_id, noteValue.trim().length > 0 ? noteValue : null);
      setBoard((current) => {
        if (!current) return current;
        const nextSlots = current.slots.map((slot) =>
          slot.future_note?.friction_id === response.friction_id
            ? {
                ...slot,
                future_note: slot.future_note
                  ? {
                      ...slot.future_note,
                      saved_note: response.note,
                    }
                  : slot.future_note,
              }
            : slot,
        );
        return { ...current, slots: nextSlots };
      });
      setNotePrompt(null);
      setNoteValue('');
    } catch (err) {
      console.error('Failed to save future note', err);
      setActionError('No pudimos guardar tu nota. Intentá nuevamente.');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDismissNote = () => {
    setNotePrompt(null);
    setNoteValue('');
  };

  const weeklySelection = useMemo(() => {
    if (!board || !board.weekly_selection || board.weekly_selection.status !== 'pending') {
      return null;
    }
    return board.weekly_selection;
  }, [board]);

  const renderProgress = (slot: MissionsV2Slot) => {
    if (!slot.progress) {
      return null;
    }
    if (slot.progress.type === 'bar') {
      return <ProgressBar value={slot.progress.percent} />;
    }

    const total = slot.progress.target;
    const current = slot.progress.current;
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: total }).map((_, index) => {
          const filled = index < current;
          return (
            <span
              key={`${slot.slot}-progress-${index}`}
              className={classNames(
                'flex h-6 w-6 items-center justify-center rounded-full border text-sm transition',
                filled ? 'border-emerald-300/70 bg-emerald-400/20 text-emerald-100' : 'border-white/15 bg-white/5 text-white/40',
              )}
            >
              {filled ? '●' : '○'}
            </span>
          );
        })}
      </div>
    );
  };

  const renderSlotCard = (slot: MissionsV2Slot) => {
    const busy = Boolean(slotBusy[slot.slot]);
    const canClaim = slot.claim.enabled && slot.claim.available;

    return (
      <Card
        key={slot.slot}
        title={`${SLOT_EMOJIS[slot.slot]} ${SLOT_NAMES[slot.slot]}`}
        subtitle={slot.meta}
        rightSlot={
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
            {slot.status === 'claimable'
              ? 'Listo para claim'
              : slot.status === 'active'
              ? 'En progreso'
              : slot.status === 'cooldown'
              ? 'Cooldown'
              : 'Vacío'}
          </span>
        }
      >
        {slot.mission ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-100">{slot.mission.title}</p>
              <p className="text-xs text-slate-300">{slot.mission.summary}</p>
              <p className="text-xs text-slate-400">{slot.mission.meta}</p>
              <p className="text-xs text-slate-400">
                {slot.mission.difficulty === 'hard' ? 'Dificultad Alta' : 'Dificultad Media'} · {slot.mission.xp_reward} XP
              </p>
            </div>
            {renderProgress(slot)}
            <div className="flex flex-wrap items-center gap-2">
              {slot.actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={!action.enabled || busy}
                  onClick={() => handleContextAction(slot.slot, action)}
                  className={classNames(
                    'inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition',
                    action.enabled && !busy
                      ? 'bg-white/10 hover:bg-white/20'
                      : 'cursor-not-allowed bg-white/5 text-white/40',
                  )}
                >
                  {action.label}
                </button>
              ))}
              <button
                type="button"
                disabled={!canClaim || busy}
                onClick={() => handleClaim(slot.slot)}
                className={classNames(
                  'inline-flex items-center justify-center rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition',
                  canClaim && !busy
                    ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/30'
                    : 'cursor-not-allowed border-white/10 bg-white/5 text-white/40',
                )}
              >
                {slot.claim.label}
              </button>
            </div>
            {!slot.claim.enabled && slot.claim.blocked_reason && (
              <p className="text-xs text-slate-400">{slot.claim.blocked_reason}</p>
            )}
            {slot.future_note?.saved_note && (
              <div className="space-y-1 rounded-2xl border border-white/10 bg-white/5 p-3 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">{slot.future_note.label}</p>
                <p className="text-sm text-slate-200">{slot.future_note.saved_note}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-300">Seleccioná tu misión semanal cuando se habilite el modal.</p>
        )}
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
          <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-400">
            {String(error)}
          </pre>
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

  return (
    <div className="space-y-5">
      {board.communications.length > 0 && (
        <div className="space-y-3">
          {board.communications.map((comm) => (
            <ToastBanner key={comm.id} tone={COMMUNICATION_TONE[comm.type] ?? 'info'} message={comm.message} />
          ))}
        </div>
      )}

      {actionError && <ToastBanner tone="error" message={actionError} />}

      {board.weekly_selection?.status === 'pending' && (
        <div className="flex items-center justify-between rounded-2xl border border-sky-400/40 bg-sky-500/10 p-4 text-sm text-sky-100">
          <div>
            <p className="font-semibold text-white">Tenés misiones por elegir</p>
            <p className="text-xs text-sky-100/80">Abrí el modal para seleccionar las propuestas de cada slot.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setWeeklyModalDismissed(false);
              setWeeklyModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-sky-200/40 bg-sky-200/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white"
          >
            Configurar misiones
          </button>
        </div>
      )}

      <Card
        title="⚔️ Boss Raid"
        subtitle={board.boss.description}
        rightSlot={
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
              Escudo {board.boss.shield.current}/{board.boss.shield.max}
            </span>
            <button
              type="button"
              onClick={handlePhaseTwo}
              disabled={!board.boss.phase_two.enabled || phaseBusy}
              className={classNames(
                'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition',
                board.boss.phase_two.enabled && !phaseBusy
                  ? 'border-amber-400/60 bg-amber-400/20 text-amber-100 hover:bg-amber-400/30'
                  : 'cursor-not-allowed border-white/10 bg-white/5 text-white/40',
              )}
            >
              {phaseBusy ? 'Cargando…' : board.boss.phase_two.label}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-200">
          Mantén la squad alineada y prepará el golpe especial. La fase 2 se habilita cuando el escudo cae a cero.
        </p>
      </Card>

      {board.campfire && (
        <Card title="🔥 Fogata post-raid" subtitle="Disponible por 24 h">
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-200">{board.campfire.message}</p>
            <div className="flex items-center gap-2 text-xl">{board.campfire.emotes.join(' ')}</div>
            {board.campfire.expires_at && (
              <p className="text-xs text-slate-400">Expira: {new Date(board.campfire.expires_at).toLocaleString()}</p>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {board.slots.map((slot) => renderSlotCard(slot))}
      </div>

      {portalTarget && isWeeklyModalOpen && weeklySelection &&
        createPortal(
          <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/80 p-4">
            <div className="w-full max-w-5xl">
              <Card
                title="🗓️ Selección semanal"
                subtitle="Elegí la misión para cada slot. Tenés 1 reroll por slot."
                bodyClassName="space-y-5"
              >
                {weeklySelection.slots.map((entry) => {
                  const busy = Boolean(weeklyBusy[entry.slot]);
                  return (
                    <div key={entry.slot} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">
                          {SLOT_EMOJIS[entry.slot]} {SLOT_NAMES[entry.slot]}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleRerollSlot(entry.slot)}
                          disabled={entry.rerolls_remaining <= 0 || busy}
                          className={classNames(
                            'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]',
                            entry.rerolls_remaining > 0 && !busy
                              ? 'border-indigo-300/60 bg-indigo-400/20 text-indigo-100 hover:bg-indigo-400/30'
                              : 'cursor-not-allowed border-white/10 bg-white/5 text-white/40',
                          )}
                        >
                          Reroll ({entry.rerolls_remaining})
                        </button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        {entry.proposals.map((proposal) => renderProposalCard(entry.slot, proposal, busy))}
                      </div>
                    </div>
                  );
                })}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setWeeklyModalDismissed(true);
                      setWeeklyModalOpen(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100"
                  >
                    Cerrar
                  </button>
                </div>
              </Card>
            </div>
          </div>,
          portalTarget,
        )}

      {portalTarget && notePrompt &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4">
            <div className="w-full max-w-xl">
              <Card
                title={`📝 Yo del futuro · ${notePrompt.label}`}
                subtitle="Guardá un recordatorio para cuando esta fricción vuelva a aparecer"
                bodyClassName="space-y-4"
              >
                <p className="text-sm text-slate-200">{notePrompt.prompt}</p>
                <textarea
                  value={noteValue}
                  onChange={(event) => setNoteValue(event.target.value)}
                  maxLength={280}
                  rows={4}
                  className="w-full rounded-2xl border border-white/15 bg-slate-900/60 p-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60"
                  placeholder="Escribí una nota breve (máx. 280 caracteres)"
                />
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{noteValue.trim().length} / 280</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleDismissNote}
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 font-semibold uppercase tracking-[0.18em] text-white"
                    >
                      Omitir
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      disabled={isSavingNote}
                      className={classNames(
                        'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-semibold uppercase tracking-[0.18em]',
                        !isSavingNote
                          ? 'border-emerald-300/60 bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30'
                          : 'cursor-not-allowed border-white/10 bg-white/5 text-white/40',
                      )}
                    >
                      {isSavingNote ? 'Guardando…' : 'Guardar nota'}
                    </button>
                  </div>
                </div>
              </Card>
            </div>
          </div>,
          portalTarget,
        )}
    </div>
  );

  function renderProposalCard(slot: MissionsV2SlotKey, proposal: MissionsV2Proposal, busy: boolean) {
    const isLoading = busy || Boolean(slotBusy[slot]);
    return (
      <button
        key={proposal.id}
        type="button"
        disabled={isLoading}
        onClick={() => handleSelectProposal(slot, proposal.id)}
        className={classNames(
          'h-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70',
          isLoading && 'cursor-not-allowed opacity-70',
        )}
      >
        <p className="text-sm font-semibold text-white">{proposal.title}</p>
        <p className="mt-1 text-xs text-slate-300">{proposal.summary}</p>
        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-200">
          {proposal.difficulty === 'hard' ? 'Difícil' : 'Normal'} · {proposal.xp_reward} XP
        </p>
      </button>
    );
  }
}
