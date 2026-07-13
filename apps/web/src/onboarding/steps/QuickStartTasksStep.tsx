import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import type { OnboardingLanguage } from '../constants';
import { NavButtons } from '../ui/NavButtons';
import type { GameMode, Pillar } from '../state';
import { formatQuickStartTask, type QuickStartTask } from '../quickStart';
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
  selectedTasksByPillar?: Record<Pillar, string[]>;
  variant?: 'default' | 'onboarding2';
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
  const unit = task.inputAfter?.startsWith('minut') ? 'min' : task.inputAfter?.startsWith('hour') || task.inputAfter?.startsWith('hora') ? 'hrs' : task.inputAfter?.startsWith('meal') || task.inputAfter?.startsWith('comida') ? 'meals' : task.inputAfter?.startsWith('glass') || task.inputAfter?.startsWith('vaso') ? 'glasses' : task.inputAfter?.startsWith('person') || task.inputAfter?.startsWith('persona') ? 'people' : task.inputAfter?.startsWith('thing') || task.inputAfter?.startsWith('cosa') ? 'things' : '';
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
        className={`quickstart-task-row quickstart-task-row--foundation relative z-10 grid w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left text-white/85 transition ${selected ? 'quickstart-task-row--selected' : ''}`}
      >
        <span className="quickstart-task-icon grid h-9 w-9 place-items-center rounded-full border">
          {selected ? (
            <span className="text-sm font-semibold">✓</span>
          ) : (
            <TraitIcon size={20} trait={task.trait} />
          )}
        </span>

        <div className="min-w-0">
          <p className="quickstart-task-title">{task.inputBefore ? `${task.inputBefore} ${task.text}` : task.text}</p>
          <p className="quickstart-selected-trait mt-2 text-[0.66rem] font-semibold uppercase tracking-[0.2em]">{copy.traitLabel} {task.trait}</p>
          {selected && hasInput ? <p className="quickstart-task-resolved">{formatQuickStartTask(task, inputValue)}</p> : null}
        </div>

        {hasInput ? (
          <label className={`quickstart-quantity ${selected ? 'quickstart-quantity--selected' : ''}`} onClick={(event) => event.stopPropagation()}>
            <span><input value={inputValue} disabled={!selected} inputMode="numeric" onChange={(event) => onInputChange(event.target.value)} placeholder={copy.countPlaceholder} aria-label={`${copy.countPlaceholder} ${unit}`} /><Pencil size={14} aria-hidden /></span>
            {unit ? <small>{unit}</small> : null}
          </label>
        ) : task.suggestions?.length ? (
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
  selectedTasksByPillar,
  variant = 'default',
  onToggleTask,
  onInputChange,
  onBack,
  onConfirm,
}: QuickStartTasksStepProps) {
  const copy = language === 'en'
    ? {
        title: 'Build a rhythm you can keep.',
        subtitle: 'Start with three foundations. You can always add more later.',
        minimumRequired: 'Choose the minimum to unlock the next pillar.',
        continue: pillar === 'Body' ? 'Continue to Mind' : pillar === 'Mind' ? 'Continue to Soul' : 'Review my foundations',
        inputRequired: 'Complete the selected quantities before continuing.',
        back: 'Back',
        countPlaceholder: 'qty',
        traitLabel: 'TRAIT',
        taskHelpLabel: 'Open quick ideas for this task',
        bonusReady: 'Balanced: you are earning x1.5 GP',
        bonusPending: 'Balance Body, Mind and Soul to earn x1.5 GP',
      }
    : {
        title: 'Construí un ritmo que puedas sostener.',
        subtitle: 'Empezá con tres foundations. Después podés sumar más.',
        minimumRequired: 'Elegí el mínimo para desbloquear el siguiente pilar.',
        continue: pillar === 'Body' ? 'Continuar a Mente' : pillar === 'Mind' ? 'Continuar a Alma' : 'Revisar mis foundations',
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

  const pillarLabel = language === 'en' ? pillar : pillar === 'Body' ? 'Cuerpo' : pillar === 'Mind' ? 'Mente' : 'Alma';
  const pillarLabels = language === 'en' ? { Body: 'Body', Mind: 'Mind', Soul: 'Soul' } : { Body: 'Cuerpo', Mind: 'Mente', Soul: 'Alma' };
  const displayedSelections = selectedTasksByPillar ?? { Body: pillar === 'Body' ? selectedIds : [], Mind: pillar === 'Mind' ? selectedIds : [], Soul: pillar === 'Soul' ? selectedIds : [] };

  return (
    <section className={`quickstart-premium-card onboarding-flow-panel ${variant === 'onboarding2' ? 'onboarding2-foundations' : ''} mx-auto w-full max-w-3xl p-5 sm:p-7`}>
      <header className="quickstart-foundations-header mb-6">
        <p>Step 2 · {pillarLabel}</p>
        <h1>{copy.title}</h1>
        <span>{copy.subtitle}</span>
        <div className="quickstart-pillar-status" aria-label="Pillar progress">
          {(['Body', 'Mind', 'Soul'] as Pillar[]).map((item) => <span key={item} data-current={item === pillar}>{pillarLabels[item]} <small>{displayedSelections[item].length}/{minimum}</small></span>)}
        </div>
        <div className="quickstart-foundation-count" aria-live="polite"><span><strong>{selectedIds.length}</strong> / {minimum} foundations</span><span>{selectedIds.length * 3} GP ready</span></div>
        <div className="quickstart-foundation-progress" aria-hidden><span style={{ width: `${Math.min(100, (selectedIds.length / minimum) * 100)}%` }} /></div>
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
