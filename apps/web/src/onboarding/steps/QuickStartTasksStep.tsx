import { motion } from 'framer-motion';
import type { OnboardingLanguage } from '../constants';
import { NavButtons } from '../ui/NavButtons';
import type { GameMode, Pillar } from '../state';
import type { QuickStartTask } from '../quickStart';

interface QuickStartTasksStepProps {
  language?: OnboardingLanguage;
  pillar: Pillar;
  tasks: QuickStartTask[];
  selectedIds: string[];
  inputValues: Record<string, string>;
  minimum: number;
  gameMode: GameMode;
  onToggleTask: (taskId: string) => void;
  onInputChange: (taskId: string, value: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}

export function QuickStartTasksStep({
  language = 'es',
  pillar,
  tasks,
  selectedIds,
  inputValues,
  minimum,
  gameMode,
  onToggleTask,
  onInputChange,
  onBack,
  onConfirm,
}: QuickStartTasksStepProps) {
  const copy = language === 'en'
    ? {
        title: `Quick Start · ${pillar}`,
        subtitle: `Choose your base tasks for ${pillar}.`,
        minimum: `Minimum: ${minimum} tasks`,
        continue: 'Continue',
        back: 'Back',
        countPlaceholder: 'n',
      }
    : {
        title: `Inicio rápido · ${pillar === 'Body' ? 'Cuerpo 🫀' : pillar === 'Mind' ? 'Mente 🧠' : 'Alma 🏵️'}`,
        subtitle: `Elegí tu base de tareas para ${pillar === 'Body' ? 'Cuerpo' : pillar === 'Mind' ? 'Mente' : 'Alma'}.`,
        minimum: `Mínimo: ${minimum} tareas`,
        continue: 'Continuar',
        back: 'Volver',
        countPlaceholder: 'n',
      };

  const canContinue = selectedIds.length >= minimum;

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="onboarding-surface-base mx-auto w-full max-w-3xl rounded-3xl p-5 sm:p-7"
    >
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">{gameMode} · Quick Start</p>
      <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{copy.title}</h2>
      <p className="mt-2 text-sm text-white/70">{copy.subtitle}</p>
      <p className="mt-3 text-xs text-white/60">{copy.minimum}</p>

      <div className="mt-5 space-y-3">
        {tasks.map((task) => {
          const selected = selectedIds.includes(task.id);
          const taskKey = `${pillar}-${task.id}`;
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onToggleTask(task.id)}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${selected ? 'border-violet-200/45 bg-violet-400/18' : 'border-white/20 bg-white/6'}`}
            >
              <div className="flex flex-wrap items-center gap-2 text-sm text-white/90">
                {task.inputBefore ? <span>{task.inputBefore}</span> : null}
                <span>{task.text}</span>
                {task.inputAfter ? (
                  <>
                    <input
                      value={inputValues[taskKey] ?? ''}
                      disabled={!selected}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => onInputChange(task.id, event.target.value)}
                      className="h-6 w-12 rounded-md border border-violet-200/30 bg-violet-100/5 px-1.5 text-center text-xs text-white"
                      placeholder={copy.countPlaceholder}
                    />
                    <span>{task.inputAfter}</span>
                  </>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>

      {!canContinue ? <p className="mt-4 text-xs text-amber-200">{copy.minimum}</p> : null}

      <NavButtons
        language={language}
        onBack={onBack}
        onConfirm={onConfirm}
        backLabel={copy.back}
        confirmLabel={copy.continue}
        disabled={!canContinue}
      />
    </motion.section>
  );
}
