import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { OnboardingLanguage } from '../constants';
import { NavButtons } from '../ui/NavButtons';
import type { GameMode, Pillar } from '../state';
import { QUICK_START_MODE_SOFT_STYLES, type QuickStartTask } from '../quickStart';

interface QuickStartTasksStepProps {
  language?: OnboardingLanguage;
  pillar: Pillar;
  tasks: QuickStartTask[];
  selectedIds: string[];
  inputValues: Record<string, string>;
  minimum: number;
  gameMode: GameMode;
  balancedBonusActive: boolean;
  onToggleTask: (taskId: string) => void;
  onInputChange: (taskId: string, value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}

function InlineTaskRow({
  task,
  selected,
  inputValue,
  onToggle,
  onInputChange,
  copy,
}: {
  task: QuickStartTask;
  selected: boolean;
  inputValue: string;
  onToggle: () => void;
  onInputChange: (value: string) => void;
  copy: {
    traitLabel: string;
    taskHelpLabel: string;
    countPlaceholder: string;
  };
}) {
  const hasInput = Boolean(task.inputAfter || task.inputBefore);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const selectedFrontStyle = {
    borderColor: 'color-mix(in srgb, var(--color-accent-secondary) 42%, var(--onboarding-glass-border))',
    background: 'color-mix(in srgb, var(--color-surface-elevated) 82%, var(--color-accent-secondary) 18%)',
    boxShadow: '0 18px 40px color-mix(in srgb, var(--color-surface-elevated) 56%, rgba(8,12,28,0.66))',
  };
  const selectedBackStyle = {
    borderColor: 'color-mix(in srgb, var(--color-accent-secondary) 54%, var(--onboarding-glass-border-soft))',
    background: 'color-mix(in srgb, var(--color-accent-secondary) 62%, var(--color-surface-elevated) 38%)',
    boxShadow: '0 12px 24px color-mix(in srgb, var(--color-accent-secondary) 40%, rgba(8,12,28,0.64))',
  };

  useEffect(() => {
    if (!selected) {
      setShowSuggestions(false);
    }
  }, [selected]);

  useEffect(() => {
    if (!showSuggestions) {
      return undefined;
    }

    const handleOutsidePointer = (event: PointerEvent) => {
      if (!rowRef.current?.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
  }, [showSuggestions]);

  return (
    <div ref={rowRef} className={`relative ${selected ? 'pt-5 pb-1' : ''}`}>
      {selected ? (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 bottom-1 rounded-2xl border px-4 pt-1.5 pb-3"
          style={selectedBackStyle}
          aria-hidden
        >
          <span className="block text-[10px] font-semibold uppercase leading-none tracking-[0.16em] text-violet-100/90">
            {copy.traitLabel}: {task.trait}
          </span>
        </div>
      ) : null}

      <motion.div
        whileTap={{ scale: 0.985 }}
        onClick={onToggle}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onToggle();
          }
        }}
        role="button"
        tabIndex={0}
        data-selected={selected ? 'true' : undefined}
        className="onboarding-surface-inner relative z-10 w-full rounded-2xl border px-4 py-3.5 text-left text-white/85 shadow-[0_12px_24px_rgba(8,12,28,0.18)] transition hover:border-white/30 hover:bg-white/[0.12]"
        style={selected ? selectedFrontStyle : undefined}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-2 text-sm leading-relaxed sm:text-base">
            {task.inputBefore ? <span>{task.inputBefore}</span> : null}
            <span>{task.text}</span>
            {hasInput ? (
              <input
                value={inputValue}
                disabled={!selected}
                inputMode="numeric"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onInputChange(event.target.value)}
                className="h-6 w-12 rounded-md border border-violet-200/30 bg-violet-100/5 px-1.5 text-center text-xs text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70 disabled:opacity-40 sm:h-7 sm:w-14"
                placeholder={copy.countPlaceholder}
              />
            ) : null}
            {task.inputAfter ? <span>{task.inputAfter}</span> : null}
            {task.helper ? <span className="w-full text-xs text-white/55">{task.helper}</span> : null}
          </div>

          {selected && task.suggestions?.length ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowSuggestions((prev) => !prev);
              }}
              className="relative z-20 ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center self-start rounded-md border border-violet-200/45 bg-violet-300/18 text-white/90 transition"
              aria-label={copy.taskHelpLabel}
              aria-expanded={showSuggestions}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3" aria-hidden>
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M8.5 14.3a6 6 0 1 1 7 0c-.7.53-1.17 1.35-1.3 2.2l-.08.5h-4.24l-.08-.5a3.5 3.5 0 0 0-1.3-2.2Z" />
              </svg>
            </button>
          ) : null}
        </div>
      </motion.div>

      {selected && task.suggestions?.length && showSuggestions ? (
        <div
          className="absolute right-3 bottom-[calc(100%+0.35rem)] z-30 w-[min(18.5rem,calc(100%-1.5rem))] rounded-xl border p-3 text-xs text-white/92 shadow-[0_10px_30px_rgba(43,25,96,0.45)] backdrop-blur"
          style={{ borderColor: 'rgba(196, 181, 253, 0.42)', backgroundColor: 'rgba(17, 24, 39, 0.93)' }}
        >
          <ul className="space-y-1.5">
            {task.suggestions.map((suggestion) => (
              <li key={suggestion} className="leading-relaxed">• {suggestion}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function QuickStartTasksStep({
  language = 'es',
  pillar,
  tasks,
  selectedIds,
  inputValues,
  minimum,
  gameMode,
  balancedBonusActive,
  onToggleTask,
  onInputChange,
  onBack,
  onConfirm,
}: QuickStartTasksStepProps) {
  const copy = language === 'en'
    ? {
        title: `Quick Start · ${pillar === 'Body' ? 'Body 🫀' : pillar === 'Mind' ? 'Mind 🧠' : 'Soul 🏵️'}`,
        subtitle: pillar === 'Body'
          ? 'Review all 10 tasks and activate what you want to sustain.'
          : pillar === 'Mind'
            ? 'Tune your mental focus while keeping the current onboarding feel.'
            : 'Choose habits that support connection and inner alignment.',
        minRule: `Minimum: ${minimum} tasks`,
        suggestedRule: 'Suggested: 9 to 12',
        minimumRequired: 'You need to select the minimum to continue.',
        continue: 'Continue',
        back: 'Back',
        countPlaceholder: 'qty',
        traitLabel: 'TRAIT',
        taskHelpLabel: 'Open quick ideas for this task',
        bonusReady: 'Balanced: you are earning x1.5 GP',
        bonusPending: 'Balance Body, Mind and Soul to earn x1.5 GP',
      }
    : {
        title: `Inicio rápido · ${pillar === 'Body' ? 'Cuerpo 🫀' : pillar === 'Mind' ? 'Mente 🧠' : 'Alma 🏵️'}`,
        subtitle: pillar === 'Body'
          ? 'Elegí 10 tareas visibles y activá las que querés sostener.'
          : pillar === 'Mind'
            ? 'Ajustá tu foco mental sin salir del ritmo del onboarding actual.'
            : 'Definí hábitos que te ayuden a mantener centro y conexión.',
        minRule: `Mínimo: ${minimum} tareas`,
        suggestedRule: 'Sugerido: 9 a 12',
        minimumRequired: 'Necesitás seleccionar el mínimo para continuar.',
        continue: 'Continuar',
        back: 'Volver',
        countPlaceholder: 'n',
        traitLabel: 'RASGO',
        taskHelpLabel: 'Abrir ideas rápidas de la tarea',
        bonusReady: 'Balanceado: estás sumando x1.5 GP',
        bonusPending: 'Balanceá Cuerpo, Mente y Alma para sumar x1.5 GP',
      };

  const canContinue = selectedIds.length >= minimum;
  const modeStyle = QUICK_START_MODE_SOFT_STYLES[gameMode];

  return (
    <section className="onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl p-5 sm:p-7">
      <header className="mb-5 border-b border-white/10 pb-4">
        <p className="text-xs uppercase tracking-[0.25em] text-white/55">{gameMode} · Quick Start</p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h1>
        <p className="mt-2 text-sm text-white/70">{copy.subtitle}</p>
        <div
          className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold text-violet-50/95"
          style={{
            borderColor: `color-mix(in srgb, ${modeStyle.border} 92%, rgba(255,255,255,0.14))`,
            background: `linear-gradient(135deg, color-mix(in srgb, ${modeStyle.tint} 90%, rgba(10,14,30,0.72)), color-mix(in srgb, ${modeStyle.tint} 66%, rgba(10,14,30,0.58)))`,
            boxShadow: `0 8px 20px ${modeStyle.glow}`,
          }}
        >
          <span className="whitespace-nowrap">{copy.minRule}</span>
          <span className="text-violet-100/60" aria-hidden>·</span>
          <span className="whitespace-nowrap">{copy.suggestedRule}</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`inline-flex rounded-lg border px-3.5 py-1.5 text-[0.68rem] font-medium sm:text-[0.72rem] ${
              balancedBonusActive ? 'border-cyan-200/30 bg-cyan-300/8 text-cyan-100/90' : 'border-sky-200/28 bg-sky-300/8 text-sky-100/85'
            }`}
          >
            {balancedBonusActive ? copy.bonusReady : copy.bonusPending}
          </span>
        </div>
      </header>

      <div className="space-y-3">
        {tasks.map((task) => {
          const selected = selectedIds.includes(task.id);
          return (
            <InlineTaskRow
              key={task.id}
              task={task}
              selected={selected}
              inputValue={inputValues[`${pillar}-${task.id}`] ?? ''}
              onToggle={() => onToggleTask(task.id)}
              onInputChange={(value) => onInputChange(task.id, value)}
              copy={copy}
            />
          );
        })}
      </div>

      {!canContinue ? <p className="mt-4 text-xs text-amber-200">{copy.minimumRequired}</p> : null}

      <NavButtons
        language={language}
        onBack={onBack}
        onConfirm={onConfirm}
        backLabel={copy.back}
        confirmLabel={copy.continue}
        disabled={!canContinue}
      />
    </section>
  );
}
