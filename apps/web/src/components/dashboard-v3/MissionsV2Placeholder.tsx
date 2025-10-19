import { useCallback, useEffect } from 'react';
import { Card } from '../ui/Card';
import { MISSIONS_V2_EMPTY_BOARD_STUB } from '../../features/missions-v2/stub';
import { emitMissionsV2Event } from '../../lib/telemetry';

interface MissionsV2PlaceholderProps {
  userId: string;
}

export function MissionsV2Placeholder({ userId }: MissionsV2PlaceholderProps) {
  useEffect(() => {
    emitMissionsV2Event('missions_v2_view', { userId, source: 'placeholder' });
  }, [userId]);

  const { slots, boss } = MISSIONS_V2_EMPTY_BOARD_STUB;

  const handleSlotPreview = useCallback(
    (slotKey: string) => {
      emitMissionsV2Event('missions_v2_select_open', { userId, slot: slotKey, source: 'placeholder' });
    },
    [userId],
  );

  const handleClaimIntent = useCallback(() => {
    emitMissionsV2Event('missions_v2_claim_open', { userId, source: 'placeholder' });
  }, [userId]);

  return (
    <div className="space-y-5">
      <Card
        title="Boss Raid"
        subtitle={boss.description}
        rightSlot={
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-200">
            {boss.status === 'upcoming' ? 'Próximamente' : 'Bloqueado'}
          </span>
        }
      >
        <div className="flex flex-col gap-3 text-sm text-slate-300">
          <p>
            Preparamos la nueva raid cooperativa. El boss aparecerá acá en cuanto definamos la progresión de Misiones v2.
          </p>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {slots.map((slot) => (
          <Card
            key={slot.key}
            title={`${slot.label} Slot`}
            subtitle="Espacio reservado"
            rightSlot={
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">
                Vacío
              </span>
            }
          >
            <p className="text-xs text-slate-400">
              Este slot se completa cuando definamos los contratos de board y selección. Elige el tipo de misión desde acá en la
              siguiente iteración.
            </p>
            <button
              type="button"
              onClick={() => handleSlotPreview(slot.key)}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              Configurar (WIP)
            </button>
          </Card>
        ))}
      </div>

      <Card title="Claim pendiente" subtitle="Anclamos la interacción para la próxima fase">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:justify-between">
          <p className="max-w-xl text-sm text-slate-300">
            Dejamos el botón deshabilitado hasta conectar con el endpoint de claim. Usaremos este espacio para mostrar el resumen
            de recompensas.
          </p>
          <div
            role="presentation"
            onPointerDown={handleClaimIntent}
            className="rounded-full border border-white/10 bg-white/5 p-0.5"
          >
            <button
              type="button"
              disabled
              onClick={handleClaimIntent}
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-slate-400 transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              Claim
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
