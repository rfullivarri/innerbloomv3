import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil } from 'lucide-react';
import type { OnboardingLanguage } from '../constants';
import { NavButtons } from '../ui/NavButtons';
import type { GameMode, Pillar } from '../state';
import { QUICK_START_MINIMUMS, getQuickStartSuggestedRule, type QuickStartTask } from '../quickStart';
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

function formatTaskPreview(task: QuickStartTask, inputValue: string): string {
  const value = inputValue.trim();
  if (!value) return task.text;
  return [task.inputBefore, task.text, value, task.inputAfter].filter(Boolean).join(' ');
}

function resolveUnit(task: QuickStartTask): string {
  const suffix = task.inputAfter?.toLowerCase() ?? '';
  if (suffix.startsWith('minut')) return 'min';
  if (suffix.startsWith('hour') || suffix.startsWith('hora')) return 'hrs';
  if (suffix.startsWith('meal') || suffix.startsWith('comida')) return 'meals';
  if (suffix.startsWith('glass') || suffix.startsWith('vaso')) return 'glasses';
  if (suffix.startsWith('person') || suffix.startsWith('persona')) return 'people';
  if (suffix.startsWith('thing') || suffix.startsWith('cosa')) return 'things';
  return '';
}

function InlineTaskRow({
  task,
  selected,
  inputValue,
  variant,
  onToggle,
  onInputChange,
  copy,
}: {
  task: QuickStartTask;
  selected: boolean;
  inputValue: string;
  variant: 'default' | 'onboarding2';
  onToggle: () => void;
  onInputChange: (value: string) => void;
  copy: {
    traitLabel: string;
    taskHelpLabel: string;
    countPlaceholder: string;
  };
}) {
  const hasInput = Boolean(task.inputAfter || task.inputBefore);
  const unit = resolveUnit(task);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showSuggestions) return undefined;

    const handleOutsidePointer = (event: PointerEvent) => {
      if (!rowRef.current?.contains(event.target as Node)) setShowSuggestions(false);
    };

    document.addEventListener('pointerdown', handleOutsidePointer);
    return () => document.removeEventListener('pointerdown', handleOutsidePointer);
  }, [showSuggestions]);

  const visualOnly = variant === 'onboarding2';

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
        className={visualOnly
          ? `quickstart-task-row quickstart-task-row--foundation relative z-10 grid w-full grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-left text-white/85 transition ${selected ? 'quickstart-task-row--selected' : ''}`
          : `quickstart-task-row onboarding-surface-inner relative z-10 grid w-full grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.15rem] px-3 py-3.5 text-left text-white/85 transition ${selected ? 'quickstart-task-row--selected' : ''}`}
      >
        <span className="quickstart-task-icon grid h-9 w-9 place-items-center rounded-full border">
          {selected ? <span className="text-sm font-semibold">✓</span> : <TraitIcon size={20} trait={task.trait} />}
        </span>

        {visualOnly ? (
          <div className="min-w-0">
            <p className="quickstart-task-title">{task.inputBefore ? `${task.inputBefore} ${task.text}` : task.text}</p>
            <p className="quickstart-selected-trait mt-2 text-[0.66rem] font-semibold uppercase tracking-[0.2em]">
              {copy.traitLabel} {task.trait}
            </p>
            {selected && hasInput ? <p className="quickstart-task-resolved">{formatTaskPreview(task, inputValue)}</p> : null}
          </div>
        ) : (
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
        )}

        {visualOnly && hasInput ? (
          <label className={`quickstart-quantity ${selected ? 'quickstart-quantity--selected' : ''}`} onClick={(event) => event.stopPropagation()}>
            <span>
              <input
                value={inputValue}
                disabled={!selected}
                inputMode="numeric"
                onChange={(event) => onInputChange(event.target.value)}
                placeholder={copy.countPlaceholder}
                aria-label={`${copy.countPlaceholder} ${unit}`}
              />
              <Pencil size={14} aria-hidden />
            </span>
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
        <div className="quickstart-suggestions-panel absolute right-3 bottom-[calc(100%+0.35rem)] z-30 w-[min(18.5rem,calc(100%-1.5rem))] rounded-xl border p-3 text-xs backdrop-blur">
          <ul className="space-y-1.5">
            {task.suggestions.map((suggestion) => <li key={suggestion} className="leading-relaxed">• {suggestion}</li>)}
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
  const visualOnly = variant === 'onboarding2';
  const effectiveMinimum = QUICK_START_MINIMUMS[gameMode] ?? minimum;
  const defaultCopy = language === 'en'
    ? {
        title: `Quick Start · ${pillar === 'Body' ? 'Body 🫀' : pillar === 'Mind' ? 'Mind 🧠' : 'Soul 🏵️'}`,
        subtitle: pillar === 'Body'
          ? 'Review all 10 tasks and activate what you want to sustain.'
          : pillar === 'Mind'
            ? 'Tune your mental focus while keeping the current onboarding feel.'
            : 'Choose habits that support connection and inner alignment.',
        minRule: `Minimum: ${effectiveMinimum} tasks`,
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
        minRule: `Mínimo: ${effectiveMinimum} tareas`,
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

  const visualCopy = language === 'en'
    ? {
        ...defaultCopy,
        title: 'Build a rhythm you can keep.',
        subtitle: 'Choose a sustainable foundation. You can always add more later.',
        minimumRequired: 'Choose the minimum to unlock the next pillar.',
        continue: pillar === 'Body' ? 'Continue to Mind' : pillar === 'Mind' ? 'Continue to Soul' : 'Review my foundations',
      }
    : {
        ...defaultCopy,
        title: 'Construí un ritmo que puedas sostener.',
        subtitle: 'Elegí una base sostenible. Después podés sumar más.',
        minimumRequired: 'Elegí el mínimo para desbloquear el siguiente pilar.',
        continue: pillar === 'Body' ? 'Continuar a Mente' : pillar === 'Mind' ? 'Continuar a Alma' : 'Revisar mis foundations',
      };
  const copy = visualOnly ? visualCopy : defaultCopy;

  const selectedTasks = tasks.filter((task) => selectedIds.includes(task.id));
  const hasMissingInput = selectedTasks.some((task) => {
    if (!task.inputAfter && !task.inputBefore) return false;
    return !String(inputValues[`${pillar}-${task.id}`] ?? '').trim();
  });
  const canContinue = selectedIds.length >= effectiveMinimum && !hasMissingInput;

  const pillarLabel = language === 'en' ? pillar : pillar === 'Body' ? 'Cuerpo' : pillar === 'Mind' ? 'Mente' : 'Alma';
  const pillarLabels = language === 'en' ? { Body: 'Body', Mind: 'Mind', Soul: 'Soul' } : { Body: 'Cuerpo', Mind: 'Mente', Soul: 'Alma' };
  const displayedSelections = selectedTasksByPillar ?? { Body: pillar === 'Body' ? selectedIds : [], Mind: pillar === 'Mind' ? selectedIds : [], Soul: pillar === 'Soul' ? selectedIds : [] };

  return (
    <section className={`quickstart-premium-card onboarding-flow-panel ${visualOnly ? 'onboarding2-foundations' : 'onboarding-premium-root'} mx-auto w-full max-w-3xl p-5 sm:p-7`}>
      {visualOnly ? (
        <header className="quickstart-foundations-header mb-6">
          <p>{language === 'en' ? 'Step 2' : 'Paso 2'} · {pillarLabel}</p>
          <h1>{copy.title}</h1>
          <span>{copy.subtitle}</span>
          <div className="quickstart-pillar-status" aria-label="Pillar progress">
            {(['Body', 'Mind', 'Soul'] as Pillar[]).map((item) => (
              <span key={item} data-current={item === pillar}>{pillarLabels[item]} <small>{displayedSelections[item].length}/{effectiveMinimum}</small></span>
            ))}
          </div>
          <div className="quickstart-foundation-count" aria-live="polite">
            <span><strong>{selectedIds.length}</strong> / {effectiveMinimum} foundations</span>
            <span>{selectedIds.length * 3} GP ready</span>
          </div>
          <div className="quickstart-foundation-progress" aria-hidden>
            <span style={{ width: `${Math.min(100, (selectedIds.length / effectiveMinimum) * 100)}%` }} />
          </div>
        </header>
      ) : (
        <header className="mb-6">
          <p className="text-xs uppercase tracking-[0.25em] text-white/55">{gameMode} · Quick Start</p>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h1>
          <p className="mt-2 text-sm text-white/70">{copy.subtitle}</p>
          <div className="quickstart-min-rule mt-4 inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold">
            <span className="whitespace-nowrap">{copy.minRule}</span>
            <span className="quickstart-min-rule__dot" aria-hidden>·</span>
            <span className="whitespace-nowrap">{copy.suggestedRule}</span>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
            <span className={`quickstart-bonus-pill inline-flex text-[0.68rem] font-medium sm:text-[0.72rem] ${balancedBonusActive ? 'quickstart-bonus-pill--ready' : 'quickstart-bonus-pill--pending'}`}>
              {balancedBonusActive ? copy.bonusReady : copy.bonusPending}
            </span>
          </div>
        </header>
      )}

      <div className="space-y-2.5">
        {tasks.map((task) => (
          <InlineTaskRow
            key={task.id}
            task={task}
            selected={selectedIds.includes(task.id)}
            inputValue={inputValues[`${pillar}-${task.id}`] ?? ''}
            variant={variant}
            onToggle={() => onToggleTask(task.id)}
            onInputChange={(value) => onInputChange(task.id, value)}
            copy={copy}
          />
        ))}
      </div>

      {selectedIds.length < effectiveMinimum ? <p className="mt-4 text-xs text-amber-200">{copy.minimumRequired}</p> : null}
      {selectedIds.length >= effectiveMinimum && hasMissingInput ? <p className="mt-4 text-xs text-amber-200">{copy.inputRequired}</p> : null}

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
