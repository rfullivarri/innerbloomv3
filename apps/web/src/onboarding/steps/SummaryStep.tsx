import { motion } from 'framer-motion';
import type { Answers, XP } from '../state';
import { NavButtons } from '../ui/NavButtons';

interface SummaryStepProps {
  answers: Answers;
  xp: XP;
  onBack?: () => void;
  onFinish: () => void;
}

function formatList(values: readonly string[]) {
  return values.length > 0 ? values.join(', ') : '—';
}

export function SummaryStep({ answers, xp, onBack, onFinish }: SummaryStepProps) {
  const { mode } = answers;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="glass-card mx-auto max-w-3xl rounded-3xl border border-white/5 bg-slate-900/70 p-6">
        <header className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Summary</p>
          <h2 className="text-3xl font-semibold text-white">Tu recorrido</h2>
          <p className="text-sm text-white/70">Revisá tu plan antes de enviarlo. Podés volver atrás para ajustar.</p>
        </header>
        <div className="mt-6 space-y-4 text-sm text-white/80">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Datos base</p>
            <p><strong>Email:</strong> {answers.email || '—'}</p>
            <p><strong>Game Mode:</strong> {mode ?? '—'}</p>
          </div>
          {mode === 'LOW' ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">LOW</p>
              <p><strong>Body:</strong> {formatList(answers.low.body)}</p>
              <p><strong>Soul:</strong> {formatList(answers.low.soul)}</p>
              <p><strong>Mind:</strong> {formatList(answers.low.mind)}</p>
              {answers.low.note ? <p><strong>Nota:</strong> {answers.low.note}</p> : null}
            </div>
          ) : null}
          {mode === 'CHILL' ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">CHILL</p>
              <p><strong>Objetivo:</strong> {answers.chill.oneThing || '—'}</p>
              <p><strong>Motivaciones:</strong> {formatList(answers.chill.motiv)}</p>
            </div>
          ) : null}
          {mode === 'FLOW' ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">FLOW</p>
              <p><strong>Objetivo:</strong> {answers.flow.goal || '—'}</p>
              <p><strong>Impedimentos:</strong> {formatList(answers.flow.imped)}</p>
            </div>
          ) : null}
          {mode === 'EVOLVE' ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">EVOLVE</p>
              <p><strong>Objetivo:</strong> {answers.evolve.goal || '—'}</p>
              <p><strong>Ajustes:</strong> {formatList(answers.evolve.trade)}</p>
              <p><strong>Actitud:</strong> {answers.evolve.att || '—'}</p>
            </div>
          ) : null}
          {mode && mode !== 'LOW' ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Foundations</p>
              <p><strong>Body:</strong> {formatList(answers.foundations.body)}</p>
              <p><strong>Soul:</strong> {formatList(answers.foundations.soul)}</p>
              <p><strong>Mind:</strong> {formatList(answers.foundations.mind)}</p>
            </div>
          ) : null}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">XP</p>
            <p><strong>Body:</strong> {Math.round(xp.Body)} XP</p>
            <p><strong>Mind:</strong> {Math.round(xp.Mind)} XP</p>
            <p><strong>Soul:</strong> {Math.round(xp.Soul)} XP</p>
            <p className="mt-2 text-base font-semibold">Total: {Math.round(xp.total)} XP</p>
          </div>
        </div>
        <NavButtons onBack={onBack} onConfirm={onFinish} confirmLabel="Generar plan" />
      </div>
    </motion.div>
  );
}
