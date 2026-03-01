import { motion } from 'framer-motion';
import { type ReactNode } from 'react';
import type { OnboardingLanguage } from '../constants';
import type { Answers, GameMode, XP } from '../state';
import { MODE_CARD_CONTENT } from './GameModeStep';
import { NavButtons } from '../ui/NavButtons';
import { GameModeChip as SharedGameModeChip, buildGameModeChip } from '../../components/common/GameModeChip';

interface SummaryStepProps {
  language?: OnboardingLanguage;
  answers: Answers;
  xp: XP;
  onBack?: () => void;
  onFinish: () => Promise<void> | void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

function SummarySection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <header className="border-b border-white/5 pb-3">
        <p className="text-xs uppercase tracking-[0.35em] text-white/50">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-white/60">{subtitle}</p> : null}
      </header>
      <div className="mt-4 space-y-3 text-sm text-white/80">{children}</div>
    </section>
  );
}

function PillList({ label, values }: { label: string; values: readonly string[] }) {
  const hasValues = values.length > 0;
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-white/50">{label}</p>
      {hasValues ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <li
              key={value}
              className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-white"
            >
              {value}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-white/50">—</p>
      )}
    </div>
  );
}

function TextRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p>
      <span className="font-semibold text-white">{label}:</span> {value || '—'}
    </p>
  );
}

function ModeChip({ mode }: { mode: GameMode | null }) {
  if (!mode) {
    return <span className="text-white/70">—</span>;
  }

  const chipStyle = buildGameModeChip(mode);
  return (
    <span className="inline-flex origin-left scale-75">
      <SharedGameModeChip {...chipStyle} />
    </span>
  );
}

function getModeState(mode: GameMode | null): string {
  if (!mode) {
    return '—';
  }

  return MODE_CARD_CONTENT[mode].state;
}

function extractTrait(value: string): string {
  const matches = value.match(/\(([^()]+)\)\s*$/);
  if (!matches?.[1]) {
    return value.trim();
  }

  return matches[1].trim();
}

function PillarTraits({ label, traits }: { label: string; traits: readonly string[] }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-semibold text-white">{label}</p>
      {traits.length > 0 ? (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-white/85">
          {traits.map((trait, index) => (
            <span key={`${label}-${trait}`}>
              {trait}
              {index < traits.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/50">—</p>
      )}
    </div>
  );
}

function ChillMotivations({ values, language = 'es' }: { values: readonly string[]; language?: OnboardingLanguage }) {
  if (!values.length) {
    return <p className="text-sm text-white/50">—</p>;
  }

  const visible = values.slice(0, 3);
  const hidden = values.slice(3);

  return (
    <div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-white/85 marker:text-white/70">
        {visible.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {hidden.length ? (
        <details className="mt-2">
          <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-sky-200 transition hover:text-sky-100">
            {language === 'en' ? `See ${hidden.length} more` : `Ver ${hidden.length} más`}
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/75 marker:text-white/60">
            {hidden.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function SummaryStep({
  language = 'es',
  answers,
  xp,
  onBack,
  onFinish,
  isSubmitting = false,
  submitError = null,
}: SummaryStepProps) {
  const copy = language === 'en'
    ? {
        summary: 'Summary',
        title: 'Your journey',
        subtitle: 'Review your plan before submitting. You can go back to adjust.',
        baseData: 'Base data',
        email: 'Email',
        gameMode: 'Game mode',
        state: 'State',
        lowSubtitle: 'Your plan to restore energy',
        body: 'Body',
        soul: 'Soul',
        mind: 'Mind',
        personalNote: 'Personal note',
        chillSubtitle: 'Balance with clear intention',
        objective: 'Objective',
        motivations: 'Motivations',
        viewMore: 'See',
        flowSubtitle: 'Get into sustainable rhythm',
        blockers: 'What blocks you',
        evolveSubtitle: 'Expert-level transformation',
        adjustments: 'Adjustments',
        attitude: 'Mindset',
        pillars: 'Pillars',
        pillarsSubtitle: 'Balanced setup across Body, Mind, and Soul',
        xpTitle: 'XP',
        xpSubtitle: 'How your progress is distributed',
        total: 'Total',
        start: 'Start your Journey',
      }
    : {
        summary: 'Resumen',
        title: 'Tu recorrido',
        subtitle: 'Revisá tu plan antes de enviarlo. Podés volver atrás para ajustar.',
        baseData: 'Datos base',
        email: 'Email',
        gameMode: 'Modo de juego',
        state: 'Estado',
        lowSubtitle: 'Tu plan para recuperar energía',
        body: 'Cuerpo',
        soul: 'Alma',
        mind: 'Mente',
        personalNote: 'Nota personal',
        chillSubtitle: 'Equilibrio con intención clara',
        objective: 'Objetivo',
        motivations: 'Motivaciones',
        viewMore: 'Ver',
        flowSubtitle: 'Entrá en ritmo sostenido',
        blockers: 'Lo que bloquea',
        evolveSubtitle: 'Transformación nivel experto',
        adjustments: 'Ajustes',
        attitude: 'Actitud',
        pillars: 'Pilares',
        pillarsSubtitle: 'Configuración equilibrada en Cuerpo, Mente y Alma',
        xpTitle: 'XP',
        xpSubtitle: 'Cómo se reparte tu progreso',
        total: 'Total',
        start: 'Comienza tu Journey',
      };
  const { mode } = answers;
  const isDisabled = isSubmitting;

  const bodyTraits = answers.foundations.body.map(extractTrait);
  const soulTraits = answers.foundations.soul.map(extractTrait);
  const mindTraits = answers.foundations.mind.map(extractTrait);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <div className="glass-card onboarding-surface-base mx-auto max-w-5xl rounded-3xl p-6 sm:p-8">
        <header className="flex flex-col gap-2 border-b border-white/5 pb-4">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">{copy.summary}</p>
          <h2 className="text-3xl font-semibold text-white">{copy.title}</h2>
          <p className="text-sm text-white/70">{copy.subtitle}</p>
        </header>
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <SummarySection title={copy.baseData}>
              <TextRow label={copy.email} value={answers.email} />
              <TextRow label={copy.gameMode} value={<ModeChip mode={mode} />} />
              <TextRow label={copy.state} value={getModeState(mode)} />
            </SummarySection>
            {mode === 'LOW' ? (
              <SummarySection title="LOW" subtitle={copy.lowSubtitle}>
                <PillList label={copy.body} values={answers.low.body} />
                <PillList label={copy.soul} values={answers.low.soul} />
                <PillList label={copy.mind} values={answers.low.mind} />
                {answers.low.note ? (
                  <p className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
                    <span className="font-semibold text-white">{copy.personalNote}:</span> {answers.low.note}
                  </p>
                ) : null}
              </SummarySection>
            ) : null}
            {mode === 'CHILL' ? (
              <SummarySection title="CHILL" subtitle={copy.chillSubtitle}>
                <TextRow label={copy.objective} value={answers.chill.oneThing} />
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">{copy.motivations}</p>
                  <div className="mt-2">
                    <ChillMotivations values={answers.chill.motiv} language={language} />
                  </div>
                </div>
              </SummarySection>
            ) : null}
            {mode === 'FLOW' ? (
              <SummarySection title="FLOW" subtitle={copy.flowSubtitle}>
                <TextRow label={copy.objective} value={answers.flow.goal} />
                <PillList label={copy.blockers} values={answers.flow.imped} />
              </SummarySection>
            ) : null}
            {mode === 'EVOLVE' ? (
              <SummarySection title="EVOLVE" subtitle={copy.evolveSubtitle}>
                <TextRow label={copy.objective} value={answers.evolve.goal} />
                <PillList label={copy.adjustments} values={answers.evolve.trade} />
                <TextRow label={copy.attitude} value={answers.evolve.att} />
              </SummarySection>
            ) : null}
            {mode && mode !== 'LOW' ? (
              <SummarySection title={copy.pillars} subtitle={copy.pillarsSubtitle}>
                <PillarTraits label={`${copy.body} 🫀`} traits={bodyTraits} />
                <PillarTraits label={`${copy.soul} 🏵️`} traits={soulTraits} />
                <PillarTraits label={`${copy.mind} 🧠`} traits={mindTraits} />
              </SummarySection>
            ) : null}
          </div>
          <aside className="space-y-5">
            <SummarySection title={copy.xpTitle} subtitle={copy.xpSubtitle}>
              <div className="space-y-2 text-sm text-white">
                <p>
                  <span className="font-semibold text-white">{copy.body}:</span> {Math.round(xp.Body)} XP
                </p>
                <p>
                  <span className="font-semibold text-white">{copy.mind}:</span> {Math.round(xp.Mind)} XP
                </p>
                <p>
                  <span className="font-semibold text-white">{copy.soul}:</span> {Math.round(xp.Soul)} XP
                </p>
                <p className="mt-3 text-base font-semibold text-white">{copy.total}: {Math.round(xp.total)} XP</p>
              </div>
            </SummarySection>
          </aside>
        </div>
        <NavButtons
          language={language}
          onBack={onBack}
          onConfirm={onFinish}
          confirmLabel={copy.start}
          loading={isSubmitting}
          disabled={isDisabled}
          showBack
        />
        {submitError ? (
          <p className="mt-3 rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-100">
            {submitError}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}
