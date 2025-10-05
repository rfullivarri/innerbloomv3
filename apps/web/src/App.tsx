import { useCallback, useEffect, useMemo, useState } from 'react';
import { awardXp, fetchPlayer, type Player } from './api';
import './index.css';

const XP_CHOICES = [5, 10, 25, 50];

type UiState =
  | { status: 'loading' }
  | { status: 'ready'; player: Player }
  | { status: 'error'; message: string };

export default function App() {
  const [state, setState] = useState<UiState>({ status: 'loading' });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(XP_CHOICES[0]);

  const loadPlayer = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const player = await fetchPlayer();
      setState({ status: 'ready', player });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No pudimos cargar al jugador';
      setState({ status: 'error', message });
    }
  }, []);

  useEffect(() => {
    void loadPlayer();
  }, [loadPlayer]);

  const player = state.status === 'ready' ? state.player : null;
  const xpText = useMemo(() => {
    if (!player) return '—';
    return new Intl.NumberFormat('es-AR').format(player.totalXp);
  }, [player]);

  const handleAward = useCallback(
    async (amount: number) => {
      if (state.status !== 'ready' || isSaving) return;
      setIsSaving(true);
      try {
        const updated = await awardXp(amount);
        setState({ status: 'ready', player: updated });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No pudimos sumar XP. Intentá de nuevo.';
        setState({ status: 'error', message });
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, state.status],
  );

  const content = (() => {
    if (state.status === 'loading') {
      return <p className="status">Cargando energía chill…</p>;
    }

    if (state.status === 'error') {
      return (
        <div className="status error">
          <p>{state.message}</p>
          <button type="button" onClick={() => loadPlayer()} className="button">
            Reintentar
          </button>
        </div>
      );
    }

    return (
      <>
        <p className="subtitle">{player?.nickname ?? 'Chill Player'}</p>
        <p className="xp">{xpText} XP</p>
        <p className="hint">Sumá un poco de XP para mantener la racha tranquila.</p>
        <div className="xp-buttons">
          {XP_CHOICES.map((value) => (
            <button
              key={value}
              type="button"
              className="button"
              onClick={() => setSelectedAmount(value)}
              aria-pressed={selectedAmount === value}
            >
              +{value}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="button primary"
          disabled={isSaving}
          onClick={() => handleAward(selectedAmount)}
        >
          {isSaving ? 'Guardando…' : `Sumar +${selectedAmount} XP`}
        </button>
      </>
    );
  })();

  return (
    <div className="app-shell">
      <header>
        <h1>Innerbloom · Chill Mode</h1>
        <p className="tagline">Un solo jugador, XP acumulada y cero estrés.</p>
      </header>
      <main>{content}</main>
    </div>
  );
}
