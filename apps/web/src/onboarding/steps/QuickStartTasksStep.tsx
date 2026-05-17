import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { OnboardingLanguage } from '../constants';
import { NavButtons } from '../ui/NavButtons';
import type { GameMode, Pillar } from '../state';
import { getQuickStartSuggestedRule, type QuickStartTask } from '../quickStart';

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
        <div className="quickstart-task-row__back pointer-events-none absolute inset-x-0 top-0 h-8 rounded-t-2xl border px-4 pt-1.5" aria-hidden>
          <span className="quickstart-task-trait-band block text-[10px] font-semibold uppercase leading-none tracking-[0.16em]">
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
        className={`quickstart-task-row onboarding-surface-inner relative z-10 w-full rounded-2xl border px-4 py-3.5 text-left text-white/85 transition ${selected ? 'quickstart-task-row--selected' : ''}`}
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
                className="quickstart-task-input h-6 w-12 rounded-md border px-1.5 text-center text-xs focus:outline-none focus-visible:ring-2 disabled:opacity-40 sm:h-7 sm:w-14"
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
              className="quickstart-task-help relative z-20 ml-auto inline-flex h-5 w-5 shrink-0 items-center justify-center self-start rounded-md border transition"
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
          className="quickstart-suggestions-panel absolute right-3 bottom-[calc(100%+0.35rem)] z-30 w-[min(18.5rem,calc(100%-1.5rem))] rounded-xl border p-3 text-xs backdrop-blur"
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
        suggestedRule: getQuickStartSuggestedRule(gameMode, language),
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
        suggestedRule: getQuickStartSuggestedRule(gameMode, language),
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

  return (
    <section className="onboarding-premium-root quickstart-premium-card onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl p-5 sm:p-7">
      <header className="mb-5 border-b border-white/10 pb-4">
        <p className="text-xs uppercase tracking-[0.25em] text-white/55">{gameMode} · Quick Start</p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h1>
        <p className="mt-2 text-sm text-white/70">{copy.subtitle}</p>
        <div
          className="quickstart-min-rule mt-3 inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold"
        >
          <span className="whitespace-nowrap">{copy.minRule}</span>
          <span className="quickstart-min-rule__dot" aria-hidden>·</span>
          <span className="whitespace-nowrap">{copy.suggestedRule}</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`quickstart-bonus-pill inline-flex text-[0.68rem] font-medium sm:text-[0.72rem] ${
              balancedBonusActive ? 'quickstart-bonus-pill--ready' : 'quickstart-bonus-pill--pending'
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
