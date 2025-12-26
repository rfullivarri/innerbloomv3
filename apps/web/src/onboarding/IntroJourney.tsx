import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { STEP_XP, FORM_LABELS, CHECKLIST_LIMITS, OPEN_TEXT_XP } from './constants';
import { buildPayload } from './payload';
import { useOnboarding } from './state';
import type { GameMode, StepId } from './state';
import { ClerkGate } from './steps/ClerkGate';
import { ChecklistStep } from './steps/ChecklistStep';
import { ChoiceStep } from './steps/ChoiceStep';
import { GameModeStep } from './steps/GameModeStep';
import { OpenTextStep } from './steps/OpenTextStep';
import { SummaryStep } from './steps/SummaryStep';
import { HUD } from './ui/HUD';
import { Snack } from './ui/Snack';

interface IntroJourneyProps {
  onFinish?: (payload: ReturnType<typeof buildPayload>) => void;
}

const OPEN_TEXT_FIELDS: Partial<Record<StepId, 'bodyOpen' | 'soulOpen' | 'mindOpen'>> = {
  'low-body': 'bodyOpen',
  'low-soul': 'soulOpen',
  'low-mind': 'mindOpen',
  'foundations-body': 'bodyOpen',
  'foundations-soul': 'soulOpen',
  'foundations-mind': 'mindOpen',
};

export function IntroJourney({ onFinish }: IntroJourneyProps) {
  const {
    state,
    setMode,
    goNext,
    goPrevious,
    goToStep,
    toggleChecklist,
    setTextValue,
    setEvolveAtt,
    awardChecklist,
    awardOpen,
    reset,
  } = useOnboarding();
  const { route, currentStepIndex, answers, xp, awardedChecklists, awardedOpen } = state;
  const stepId = route[currentStepIndex] ?? 'clerk-gate';
  const totalSteps = route.length;
  const [snack, setSnack] = useState<string | null>(null);
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const hasRecordedSession = useRef(false);
  const [shouldAutoAdvance, setShouldAutoAdvance] = useState(false);

  useEffect(() => {
    if (!hasRecordedSession.current && authLoaded) {
      hasRecordedSession.current = true;
      setShouldAutoAdvance(Boolean(isSignedIn));
    }
  }, [authLoaded, isSignedIn]);

  const showSnack = (amount?: number) => {
    if (!amount || amount <= 0) return;
    setSnack(`+${amount} XP`);
  };

  useEffect(() => {
    if (!snack) {
      return;
    }
    const timer = setTimeout(() => setSnack(null), 1300);
    return () => clearTimeout(timer);
  }, [snack]);

  const handleChecklistConfirm = (target: StepId) => {
    const hadChecklist = awardedChecklists[target];
    awardChecklist(target);
    if (!hadChecklist) {
      showSnack(STEP_XP[target]);
    }

    const openKey = OPEN_TEXT_FIELDS[target];
    if (openKey) {
      const value =
        openKey === 'bodyOpen'
          ? answers.foundations.bodyOpen
          : openKey === 'soulOpen'
            ? answers.foundations.soulOpen
            : answers.foundations.mindOpen;
      if (value.trim().length > 0 && !awardedOpen[target]) {
        awardOpen(target);
        showSnack(OPEN_TEXT_XP[target]);
      }
    }

    goNext();
  };

  const handleOpenConfirm = (target: StepId, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }
    const hadAward = awardedOpen[target];
    awardOpen(target);
    if (!hadAward) {
      showSnack(STEP_XP[target]);
    }
    goNext();
  };

  const handleFinish = () => {
    const payload = buildPayload(answers, xp);
    console.log('[onboarding] payload', payload);
    onFinish?.(payload);
  };

  const handleRestart = () => {
    reset();
    setShouldAutoAdvance(Boolean(isSignedIn));
    setSnack(null);
  };

  const handleExit = () => {
    handleRestart();
    navigate('/');
  };

  const renderStep = () => {
    switch (stepId) {
      case 'clerk-gate':
        return <ClerkGate onContinue={goNext} autoAdvance={shouldAutoAdvance} />;
      case 'mode-select':
        return (
          <GameModeStep
            selected={answers.mode}
            onSelect={(mode: GameMode) => setMode(mode)}
            onConfirm={() => {
              if (!answers.mode) return;
              goNext();
            }}
            onBack={() => goToStep('clerk-gate')}
          />
        );
      case 'low-body':
        return (
          <ChecklistStep
            title="LOW · Reinicia tu Body"
            subtitle="Elegí hasta 5 acciones simples que te harían bien ahora."
            xpAmount={13}
            items={FORM_LABELS.lowBody}
            selected={answers.low.body}
            onToggle={(value) => toggleChecklist('low-body', value)}
            onConfirm={() => handleChecklistConfirm('low-body')}
            onBack={goPrevious}
            limit={CHECKLIST_LIMITS['low-body']}
            openValue={answers.foundations.bodyOpen}
            onOpenChange={(value) => setTextValue('foundations.bodyOpen', value)}
            openLabel="¿Qué ancla física sumarías?"
          />
        );
      case 'low-soul':
        return (
          <ChecklistStep
            title="LOW · Reconectá tu Soul"
            subtitle="Elegí hasta 5 cosas simples que te conectan con vos."
            xpAmount={13}
            items={FORM_LABELS.lowSoul}
            selected={answers.low.soul}
            onToggle={(value) => toggleChecklist('low-soul', value)}
            onConfirm={() => handleChecklistConfirm('low-soul')}
            onBack={goPrevious}
            limit={CHECKLIST_LIMITS['low-soul']}
            openValue={answers.foundations.soulOpen}
            onOpenChange={(value) => setTextValue('foundations.soulOpen', value)}
            openLabel="¿Qué detalle te haría sentir pleno?"
          />
        );
      case 'low-mind':
        return (
          <ChecklistStep
            title="LOW · Calmá tu Mind"
            subtitle="Elegí hasta 5 acciones mentales que te ayuden hoy."
            xpAmount={13}
            items={FORM_LABELS.lowMind}
            selected={answers.low.mind}
            onToggle={(value) => toggleChecklist('low-mind', value)}
            onConfirm={() => handleChecklistConfirm('low-mind')}
            onBack={goPrevious}
            limit={CHECKLIST_LIMITS['low-mind']}
            openValue={answers.foundations.mindOpen}
            onOpenChange={(value) => setTextValue('foundations.mindOpen', value)}
            openLabel="¿Qué idea querés reforzar?"
          />
        );
      case 'low-note':
        return (
          <OpenTextStep
            title="LOW · Anotá tu nota personal"
            subtitle="Escribirlo desbloquea +21 XP y ayuda a cerrar el plan."
            value={answers.low.note}
            onChange={(value) => setTextValue('low.note', value)}
            onConfirm={() => handleOpenConfirm('low-note', answers.low.note)}
            onBack={goPrevious}
            xpAmount={21}
          />
        );
      case 'chill-open':
        return (
          <OpenTextStep
            title="CHILL · ¿Qué es lo más importante ahora?"
            subtitle="Definí una intención clara para trackear tus hábitos."
            value={answers.chill.oneThing}
            onChange={(value) => setTextValue('chill.oneThing', value)}
            onConfirm={() => handleOpenConfirm('chill-open', answers.chill.oneThing)}
            onBack={goPrevious}
            xpAmount={21}
            multiline={false}
            placeholder="Quiero enfocarme en…"
          />
        );
      case 'chill-motiv':
        return (
          <ChecklistStep
            title="CHILL · ¿Qué te impulsa más?"
            subtitle="Elegí lo que te motiva mantener el ritmo."
            xpAmount={13}
            items={FORM_LABELS.chillMotiv}
            selected={answers.chill.motiv}
            onToggle={(value) => toggleChecklist('chill-motiv', value)}
            onConfirm={() => handleChecklistConfirm('chill-motiv')}
            onBack={goPrevious}
          />
        );
      case 'flow-goal':
        return (
          <OpenTextStep
            title="FLOW · ¿Cuál es tu objetivo?"
            subtitle="Nombralo para que la aventura empiece con foco."
            value={answers.flow.goal}
            onChange={(value) => setTextValue('flow.goal', value)}
            onConfirm={() => handleOpenConfirm('flow-goal', answers.flow.goal)}
            onBack={goPrevious}
            xpAmount={21}
            multiline={false}
            placeholder="Quiero lograr…"
          />
        );
      case 'flow-imped':
        return (
          <ChecklistStep
            title="FLOW · ¿Qué te viene frenando?"
            subtitle="Elegí lo que querés destrabar para entrar en flujo."
            xpAmount={13}
            items={FORM_LABELS.flowObstacles}
            selected={answers.flow.imped}
            onToggle={(value) => toggleChecklist('flow-imped', value)}
            onConfirm={() => handleChecklistConfirm('flow-imped')}
            onBack={goPrevious}
          />
        );
      case 'evolve-goal':
        return (
          <OpenTextStep
            title="EVOLVE · ¿Qué querés transformar?"
            subtitle="Poné en palabras tu desafío para subir de nivel."
            value={answers.evolve.goal}
            onChange={(value) => setTextValue('evolve.goal', value)}
            onConfirm={() => handleOpenConfirm('evolve-goal', answers.evolve.goal)}
            onBack={goPrevious}
            xpAmount={21}
            multiline={false}
            placeholder="Voy a evolucionar en…"
          />
        );
      case 'evolve-trade':
        return (
          <ChecklistStep
            title="EVOLVE · ¿Qué estás dispuesto a ajustar?"
            subtitle="Marcá los trade-offs que aceptás para crecer."
            xpAmount={13}
            items={FORM_LABELS.evolveCommit}
            selected={answers.evolve.trade}
            onToggle={(value) => toggleChecklist('evolve-trade', value)}
            onConfirm={() => handleChecklistConfirm('evolve-trade')}
            onBack={goPrevious}
          />
        );
      case 'evolve-att':
        return (
          <ChoiceStep
            title="EVOLVE · ¿Cómo encarás esta misión?"
            subtitle="Elegí la actitud que mejor te representa ahora."
            choices={FORM_LABELS.evolveAtt}
            value={answers.evolve.att}
            onChange={(value) => setEvolveAtt(value)}
            onConfirm={() => {
              if (!answers.evolve.att) return;
              const hadAward = awardedOpen['evolve-att'];
              awardOpen('evolve-att');
              if (!hadAward) {
                showSnack(STEP_XP['evolve-att']);
              }
              goNext();
            }}
            onBack={goPrevious}
            xpAmount={21}
          />
        );
      case 'foundations-body':
        return (
          <ChecklistStep
            title="Foundations · Body"
            subtitle="Tu base física sostiene todo. Elegí hasta 5 anclas."
            xpAmount={13}
            items={FORM_LABELS.fBody}
            selected={answers.foundations.body}
            onToggle={(value) => toggleChecklist('foundations-body', value)}
            onConfirm={() => handleChecklistConfirm('foundations-body')}
            onBack={goPrevious}
            limit={CHECKLIST_LIMITS['foundations-body']}
            openValue={answers.foundations.bodyOpen}
            onOpenChange={(value) => setTextValue('foundations.bodyOpen', value)}
          />
        );
      case 'foundations-soul':
        return (
          <ChecklistStep
            title="Foundations · Soul"
            subtitle="Sin centro no hay llegada. Elegí hasta 5 prácticas."
            xpAmount={13}
            items={FORM_LABELS.fSoul}
            selected={answers.foundations.soul}
            onToggle={(value) => toggleChecklist('foundations-soul', value)}
            onConfirm={() => handleChecklistConfirm('foundations-soul')}
            onBack={goPrevious}
            limit={CHECKLIST_LIMITS['foundations-soul']}
            openValue={answers.foundations.soulOpen}
            onOpenChange={(value) => setTextValue('foundations.soulOpen', value)}
          />
        );
      case 'foundations-mind':
        return (
          <ChecklistStep
            title="Foundations · Mind"
            subtitle="No es hacer más: es hacer mejor. Elegí hasta 5 focos."
            xpAmount={13}
            items={FORM_LABELS.fMind}
            selected={answers.foundations.mind}
            onToggle={(value) => toggleChecklist('foundations-mind', value)}
            onConfirm={() => handleChecklistConfirm('foundations-mind')}
            onBack={goPrevious}
            limit={CHECKLIST_LIMITS['foundations-mind']}
            openValue={answers.foundations.mindOpen}
            onOpenChange={(value) => setTextValue('foundations.mindOpen', value)}
          />
        );
      case 'summary':
        return <SummaryStep answers={answers} xp={xp} onBack={goPrevious} onFinish={handleFinish} />;
      default:
        return null;
    }
  };

  return (
    <div className="relative flex min-h-screen min-h-dvh flex-col overflow-hidden bg-[#040313] pb-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(79,70,229,0.18),transparent_55%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.15),transparent_60%),radial-gradient(circle_at_bottom_right,_rgba(217,70,239,0.1),transparent_65%)]" />
        <div className="absolute -left-24 top-32 h-72 w-72 rounded-full bg-[#a855f7]/30 blur-[140px]" />
        <div className="absolute -right-32 bottom-10 h-80 w-80 rounded-full bg-[#0ea5e9]/30 blur-[160px]" />
      </div>
      <HUD
        mode={answers.mode}
        stepIndex={currentStepIndex}
        totalSteps={totalSteps}
        xp={xp}
        onRestart={handleRestart}
        onExit={handleExit}
      />
      <main className="relative z-10 mx-auto w-full max-w-5xl flex-1 min-w-0 px-4 pb-16 pt-44 sm:px-6 sm:pt-48">
        <div className="space-y-8" key={stepId}>
          {renderStep()}
        </div>
      </main>
      <Snack message={snack} />
    </div>
  );
}
