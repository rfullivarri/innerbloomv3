import { motion } from 'framer-motion';
import { MODE_LABELS } from '../constants';
import type { GameMode } from '../state';
import { Card } from '../ui/Card';
import { NavButtons } from '../ui/NavButtons';

interface GameModeStepProps {
  selected: GameMode | null;
  onSelect: (mode: GameMode) => void;
  onConfirm: () => void;
  onBack?: () => void;
}

const MODE_DESCRIPTIONS: Record<GameMode, string> = {
  LOW: 'Reset rápido para cuando la energía está en rojo. Rutinas simples para volver al eje.',
  CHILL: 'Mantené la constancia sin estrés. Trackea hábitos y ajustá foundations livianas.',
  FLOW: 'Trazá tu objetivo y destrabá impedimentos puntuales para entrar en flujo.',
  EVOLVE: 'Subí la dificultad. Ajustes profundos y actitud enfocada para jugar en modo pro.',
};

const MODE_EMOJIS: Record<GameMode, string> = {
  LOW: '🪫',
  CHILL: '🌿',
  FLOW: '🌊',
  EVOLVE: '🧬',
};

export function GameModeStep({ selected, onSelect, onConfirm, onBack }: GameModeStepProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="glass-card mx-auto max-w-4xl rounded-3xl border border-white/5 bg-slate-900/70 p-6">
        <header className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Step 1 · Elegí tu modo</p>
          <h2 className="text-3xl font-semibold text-white">¿Cómo querés jugar hoy?</h2>
          <p className="text-sm text-white/70">
            Cada modo destraba preguntas distintas y suma XP específico. Elegí el mood que te representa ahora mismo.
          </p>
        </header>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {(Object.keys(MODE_LABELS) as GameMode[]).map((mode) => (
            <Card
              key={mode}
              active={selected === mode}
              subtitle={MODE_DESCRIPTIONS[mode]}
              onClick={() => onSelect(mode)}
            >
              <span className="flex items-center gap-2 text-lg">
                <span className="text-xl">{MODE_EMOJIS[mode]}</span>
                <span>{MODE_LABELS[mode]}</span>
              </span>
            </Card>
          ))}
        </div>
        <NavButtons
          showBack={Boolean(onBack)}
          onBack={onBack}
          onConfirm={onConfirm}
          confirmLabel={selected ? 'Entrar al modo' : 'Seleccioná un modo'}
          disabled={!selected}
        />
      </div>
    </motion.div>
  );
}
