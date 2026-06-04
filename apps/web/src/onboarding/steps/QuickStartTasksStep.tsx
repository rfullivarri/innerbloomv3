import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { OnboardingLanguage } from '../constants';
import { NavButtons } from '../ui/NavButtons';
import type { GameMode, Pillar } from '../state';
import { getQuickStartSuggestedRule, type QuickStartTask } from '../quickStart';
import { TraitIcon } from '../../pages/labs/mobile-premium/MobilePremiumPrimitives';

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
    <div ref={rowRef} className="relative">
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
        className={`quickstart-task-row onboarding-surface-inner relative z-10 grid w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.15rem] px-3 py-3.5 text-left text-white/85 transition ${selected ? 'quickstart-task-row--selected' : ''}`}
      >
        <span className="quickstart-task-icon grid h-9 w-9 place-items-center rounded-full border">
          {selected ? (
            <span className="text-sm font-semibold">✓</span>
          ) : (
            <TraitIcon size={20} trait={task.trait} />
          )}
        </span>

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5 text-[0.98rem] leading-6 text-white/90">
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
          {selected ? (
            <p className="quickstart-selected-trait mt-2 text-[0.66rem] font-semibold uppercase tracking-[0.2em]">
              <span className="mr-1.5 text-white/38">{copy.traitLabel}</span>
              {task.trait}
            </p>
          ) : null}
        </div>

        {task.suggestions?.length ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowSuggestions((prev) => !prev);
              }}
              className="quickstart-task-help relative z-20 ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center self-start rounded-full border transition"
              aria-label={copy.taskHelpLabel}
              aria-expanded={showSuggestions}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                <path d="M9 18h6" />
                <path d="M10 22h4" />
                <path d="M8.5 14.3a6 6 0 1 1 7 0c-.7.53-1.17 1.35-1.3 2.2l-.08.5H9.88l-.08-.5a3.5 3.5 0 0 0-1.3-2.2Z" />
              </svg>
            </button>
        ) : <span aria-hidden className="h-5 w-5" />}
      </motion.div>

      {task.suggestions?.length && showSuggestions ? (
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
        inputRequired: 'Complete the selected quantities before continuing.',
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
        inputRequired: 'Completá las cantidades seleccionadas antes de continuar.',
        back: 'Volver',
        countPlaceholder: 'n',
        traitLabel: 'RASGO',
        taskHelpLabel: 'Abrir ideas rápidas de la tarea',
        bonusReady: 'Balanceado: estás sumando x1.5 GP',
        bonusPending: 'Balanceá Cuerpo, Mente y Alma para sumar x1.5 GP',
  };

  const selectedTasks = tasks.filter((task) => selectedIds.includes(task.id));
  const hasMissingInput = selectedTasks.some((task) => {
    if (!task.inputAfter && !task.inputBefore) {
      return false;
    }
    return !String(inputValues[`${pillar}-${task.id}`] ?? '').trim();
  });
  const canContinue = selectedIds.length >= minimum && !hasMissingInput;

  return (
    <section className="onboarding-premium-root quickstart-premium-card onboarding-flow-panel mx-auto w-full max-w-3xl p-5 sm:p-7">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-[0.25em] text-white/55">{gameMode} · Quick Start</p>
        <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h1>
        <p className="mt-2 text-sm text-white/70">{copy.subtitle}</p>
        <div
          className="quickstart-min-rule mt-4 inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold"
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

      <div className="space-y-2.5">
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

      {selectedIds.length < minimum ? <p className="mt-4 text-xs text-amber-200">{copy.minimumRequired}</p> : null}
      {selectedIds.length >= minimum && hasMissingInput ? <p className="mt-4 text-xs text-amber-200">{copy.inputRequired}</p> : null}

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
