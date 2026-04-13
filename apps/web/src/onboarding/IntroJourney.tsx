import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/runtimeAuth';
import { isNativeCapacitorPlatform } from '../mobile/capacitor';
import { clearMobileAuthSession, setForceNativeWelcome, useMobileAuthSession } from '../mobile/mobileAuthSession';
import { STEP_XP, CHECKLIST_LIMITS, OPEN_TEXT_XP, getFormLabels, type OnboardingLanguage } from './constants';
import { buildPayload } from './payload';
import { useOnboarding } from './state';
import type { GameMode, StepId } from './state';
import { ClerkGate } from './steps/ClerkGate';
import { ChecklistStep } from './steps/ChecklistStep';
import { ChoiceStep } from './steps/ChoiceStep';
import { GameModeStep } from './steps/GameModeStep';
import { OpenTextStep } from './steps/OpenTextStep';
import { PathSelectStep } from './steps/PathSelectStep';
import { AvatarStep } from './steps/AvatarStep';
import { IntegratedQuickStartFlow } from './IntegratedQuickStartFlow';
import { SummaryStep } from './steps/SummaryStep';
import { GpExplainerOverlay } from './ui/GpExplainerOverlay';
import { HUD } from './ui/HUD';
import { Snack } from './ui/Snack';
import { resolveFirstQuestionStep } from './firstQuestionStep';
import { QUICK_START_MINIMUMS, QUICK_START_TASKS, computeQuickStartGp } from './quickStart';
import { changeCurrentUserAvatar, markOnboardingProgress } from '../lib/api';

interface IntroJourneyProps {
  language?: OnboardingLanguage;
  onFinish?: (payload: ReturnType<typeof buildPayload>) => Promise<void> | void;
  isSubmitting?: boolean;
  submitError?: string | null;
}

const OPEN_TEXT_FIELDS: Partial<Record<StepId, 'bodyOpen' | 'soulOpen' | 'mindOpen'>> = {
  'low-body': 'bodyOpen',
  'low-soul': 'soulOpen',
  'low-mind': 'mindOpen',
  'foundations-body': 'bodyOpen',
  'foundations-soul': 'soulOpen',
  'foundations-mind': 'mindOpen',
};

export function IntroJourney({ language = 'es', onFinish, isSubmitting = false, submitError = null }: IntroJourneyProps) {
  const {
    state,
    setMode,
    setAvatarId,
    goNext,
    goPrevious,
    goToStep,
    toggleChecklist,
    setTextValue,
    setEvolveAtt,
    awardChecklist,
    awardOpen,
    reset,
    setOnboardingPath,
    toggleQuickStartTask,
    setQuickStartTaskInput,
    toggleQuickStartModeration,
  } = useOnboarding();
  const { route, currentStepIndex, answers, xp, awardedChecklists, awardedOpen, onboardingPath } = state;
  const labels = getFormLabels(language);
  const stepId = route[currentStepIndex] ?? 'clerk-gate';
  const totalSteps = route.length;
  const isClerkGateStep = stepId === 'clerk-gate';
  const [snack, setSnack] = useState<string | null>(null);
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const mobileAuthSession = useMobileAuthSession();
  const navigate = useNavigate();
  const hasRecordedSession = useRef(false);
  const [shouldAutoAdvance, setShouldAutoAdvance] = useState(false);
  const [isGpExplainerOpen, setIsGpExplainerOpen] = useState(false);
  const [hasDismissedGpExplainer, setHasDismissedGpExplainer] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [avatarStepError, setAvatarStepError] = useState<string | null>(null);
  const firstQuestionStep = resolveFirstQuestionStep(answers.mode, onboardingPath);
  const quickStartGp = computeQuickStartGp(answers.quickStart.selectedTasksByPillar);
  const hudXp = onboardingPath === 'quick_start' ? quickStartGp.xp : xp;
  const isQuickStartFlowActive = onboardingPath === 'quick_start' && stepId.startsWith('quick-start');
  const isNativeApp = isNativeCapacitorPlatform();
  const hasNativeSession = isNativeApp && Boolean(mobileAuthSession?.token);
  const hasEffectiveSession = isSignedIn || hasNativeSession;
  const authReady = authLoaded || hasNativeSession;

  useEffect(() => {
    if (!hasRecordedSession.current && authReady) {
      hasRecordedSession.current = true;
      setShouldAutoAdvance(Boolean(hasEffectiveSession));
    }
  }, [authReady, hasEffectiveSession]);

  const showSnack = (amount?: number) => {
    if (!amount || amount <= 0) return;
    setSnack(`+${amount} GP`);
  };

  const copy = language === 'en'
    ? {
        lowBodyTitle: 'LOW · Reset your body',
        lowBodySubtitle: 'Choose up to 5 simple actions that would help you right now.',
        lowBodyOpen: 'What physical anchor would you add?',
        lowSoulTitle: 'LOW · Reconnect with your soul',
        lowSoulSubtitle: 'Choose up to 5 simple things that reconnect you with yourself.',
        lowSoulOpen: 'What detail would help you feel fulfilled?',
        lowMindTitle: 'LOW · Calm your mind',
        lowMindSubtitle: 'Choose up to 5 mental actions that can help you today.',
        lowMindOpen: 'What idea do you want to reinforce?',
        lowNoteTitle: 'LOW · Add your personal note',
        lowNoteSubtitle: 'Writing it unlocks +21 GP and helps close your plan.',
        chillOpenTitle: 'CHILL · What matters most right now?',
        chillOpenSubtitle: 'Define a clear intention to track your habits.',
        chillOpenPlaceholder: 'I want to focus on…',
        chillMotivTitle: 'CHILL · What motivates you most?',
        chillMotivSubtitle: 'Choose what helps you keep momentum.',
        flowGoalTitle: 'FLOW · What is your goal?',
        flowGoalSubtitle: 'Name it so your adventure starts with focus.',
        flowGoalPlaceholder: 'I want to achieve…',
        flowImpedTitle: 'FLOW · What has been holding you back?',
        flowImpedSubtitle: 'Choose what you want to unblock to enter flow.',
        evolveGoalTitle: 'EVOLVE · What do you want to transform?',
        evolveGoalSubtitle: 'Put your challenge into words to level up.',
        evolveGoalPlaceholder: 'I am going to evolve in…',
        evolveTradeTitle: 'EVOLVE · What are you willing to adjust?',
        evolveTradeSubtitle: 'Select the trade-offs you accept to grow.',
        evolveAttTitle: 'EVOLVE · How are you approaching this mission?',
        evolveAttSubtitle: 'Choose the mindset that best represents you now.',
        foundationsBodyTitle: 'Body · 🫀',
        foundationsBodySubtitle: 'Your physical base supports everything. Choose up to 5 anchors.',
        foundationsSoulTitle: 'Soul · 🏵️',
        foundationsSoulSubtitle: 'Without center, there is no arrival. Choose up to 5 practices.',
        foundationsMindTitle: 'Mind · 🧠',
        foundationsMindSubtitle: 'It is not doing more, it is doing better. Choose up to 5 focus points.',
        pillarsBadge: 'Pillars',
      }
    : {
        lowBodyTitle: 'LOW · Reinicia tu cuerpo',
        lowBodySubtitle: 'Elegí hasta 5 acciones simples que te harían bien ahora.',
        lowBodyOpen: '¿Qué ancla física sumarías?',
        lowSoulTitle: 'LOW · Reconectá tu alma',
        lowSoulSubtitle: 'Elegí hasta 5 cosas simples que te conectan con vos.',
        lowSoulOpen: '¿Qué detalle te haría sentir pleno?',
        lowMindTitle: 'LOW · Calmá tu mente',
        lowMindSubtitle: 'Elegí hasta 5 acciones mentales que te ayuden hoy.',
        lowMindOpen: '¿Qué idea querés reforzar?',
        lowNoteTitle: 'LOW · Anotá tu nota personal',
        lowNoteSubtitle: 'Escribirlo desbloquea +21 GP y ayuda a cerrar el plan.',
        chillOpenTitle: 'CHILL · ¿Qué es lo más importante ahora?',
        chillOpenSubtitle: 'Definí una intención clara para trackear tus hábitos.',
        chillOpenPlaceholder: 'Quiero enfocarme en…',
        chillMotivTitle: 'CHILL · ¿Qué te impulsa más?',
        chillMotivSubtitle: 'Elegí lo que te motiva mantener el ritmo.',
        flowGoalTitle: 'FLOW · ¿Cuál es tu objetivo?',
        flowGoalSubtitle: 'Nombralo para que la aventura empiece con foco.',
        flowGoalPlaceholder: 'Quiero lograr…',
        flowImpedTitle: 'FLOW · ¿Qué te viene frenando?',
        flowImpedSubtitle: 'Elegí lo que querés destrabar para entrar en flujo.',
        evolveGoalTitle: 'EVOLVE · ¿Qué querés transformar?',
        evolveGoalSubtitle: 'Poné en palabras tu desafío para subir de nivel.',
        evolveGoalPlaceholder: 'Voy a evolucionar en…',
        evolveTradeTitle: 'EVOLVE · ¿Qué estás dispuesto a ajustar?',
        evolveTradeSubtitle: 'Marcá los trade-offs que aceptás para crecer.',
        evolveAttTitle: 'EVOLVE · ¿Cómo encarás esta misión?',
        evolveAttSubtitle: 'Elegí la actitud que mejor te representa ahora.',
        foundationsBodyTitle: 'Cuerpo · 🫀',
        foundationsBodySubtitle: 'Tu base física sostiene todo. Elegí hasta 5 anclas.',
        foundationsSoulTitle: 'Alma · 🏵️',
        foundationsSoulSubtitle: 'Sin centro no hay llegada. Elegí hasta 5 prácticas.',
        foundationsMindTitle: 'Mente · 🧠',
        foundationsMindSubtitle: 'No es hacer más: es hacer mejor. Elegí hasta 5 focos.',
        pillarsBadge: 'Pilares',
      };

  useEffect(() => {
    if (!snack) {
      return;
    }
    const timer = setTimeout(() => setSnack(null), 1300);
    return () => clearTimeout(timer);
  }, [snack]);

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [stepId]);

  useEffect(() => {
    if (!firstQuestionStep || stepId !== firstQuestionStep || hasDismissedGpExplainer) {
      return;
    }
    setIsGpExplainerOpen(true);
  }, [firstQuestionStep, hasDismissedGpExplainer, stepId]);

  useEffect(() => {
    if (!isGpExplainerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isGpExplainerOpen]);

  useEffect(() => {
    if (stepId !== 'avatar-select' && answers.mode && answers.avatarId == null) {
      console.warn('[onboarding] missing avatar selection after rhythm step', { stepId, mode: answers.mode });
    }
  }, [answers.avatarId, answers.mode, stepId]);

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

  const handleFinish = async () => {
    const payload = buildPayload(answers, onboardingPath === 'quick_start' ? quickStartGp.xp : xp, onboardingPath);
    await onFinish?.(payload);
  };

  const handleRestart = () => {
    reset();
    setShouldAutoAdvance(Boolean(hasEffectiveSession));
    setSnack(null);
  };

  const handleExit = () => {
    handleRestart();
    if (isNativeApp) {
      setForceNativeWelcome(true);
      clearMobileAuthSession('native-onboarding-exit', {
        stepId,
        authMode: mobileAuthSession?.authMode ?? null,
      });
    }
    navigate('/', { replace: true });
  };

  const handleCloseGpExplainer = () => {
    setIsGpExplainerOpen(false);
    setHasDismissedGpExplainer(true);
  };

  const renderStep = () => {
    switch (stepId) {
      case 'clerk-gate':
        return <ClerkGate language={language} onContinue={goNext} autoAdvance={shouldAutoAdvance} />;
      case 'mode-select':
        return (
          <GameModeStep
            language={language}
            selected={answers.mode}
            onSelect={(mode: GameMode) => setMode(mode)}
            onConfirm={() => {
              if (!answers.mode) return;
              goNext();
            }}
            onBack={() => goToStep('clerk-gate')}
          />
        );
      case 'path-select':
        return (
          <PathSelectStep
            language={language}
            onBack={() => goToStep('avatar-select')}
            onSelectTraditional={() => {
              setOnboardingPath('traditional');
              goNext();
            }}
            onSelectQuickStart={() => {
              setOnboardingPath('quick_start');
              goNext();
            }}
          />
        );
      case 'avatar-select':
        return (
          <>
            <AvatarStep
              language={language}
              rhythm={answers.mode}
              selectedAvatarId={answers.avatarId}
              onSelectAvatar={(avatarId) => {
                setAvatarId(avatarId);
                setAvatarStepError(null);
              }}
              onBack={() => goToStep('mode-select')}
              onConfirm={() => {
                if (!answers.avatarId || isSavingAvatar) return;
                const selectedAvatarId = answers.avatarId;
                void (async () => {
                  try {
                    setIsSavingAvatar(true);
                    setAvatarStepError(null);
                    await changeCurrentUserAvatar(selectedAvatarId);
                    await markOnboardingProgress('avatar_selected', { trigger: 'intro_journey' });
                    goNext();
                  } catch (error) {
                    console.error('[onboarding] avatar select failed', error);
                    setAvatarStepError(language === 'en' ? 'Could not save avatar. Try again.' : 'No pudimos guardar tu avatar. Intentá de nuevo.');
                  } finally {
                    setIsSavingAvatar(false);
                  }
                })();
              }}
            />
            {avatarStepError ? <p className="text-center text-sm text-rose-200">{avatarStepError}</p> : null}
          </>
        );
      case 'low-body':
        return (
          <ChecklistStep
            language={language}
            title={copy.lowBodyTitle}
            subtitle={copy.lowBodySubtitle}
            xpAmount={13}
            items={labels.lowBody}
            selected={answers.low.body}
            onToggle={(value) => toggleChecklist('low-body', value)}
            onConfirm={() => handleChecklistConfirm('low-body')}
            onBack={goPrevious}
            limit={CHECKLIST_LIMITS['low-body']}
            openValue={answers.foundations.bodyOpen}
            onOpenChange={(value) => setTextValue('foundations.bodyOpen', value)}
            openLabel={copy.lowBodyOpen}
          />
        );
      case 'low-soul':
        return (
          <ChecklistStep
            language={language}
            title={copy.lowSoulTitle}
            subtitle={copy.lowSoulSubtitle}
            xpAmount={13}
            items={labels.lowSoul}
            selected={answers.low.soul}
            onToggle={(value) => toggleChecklist('low-soul', value)}
            onConfirm={() => handleChecklistConfirm('low-soul')}
            onBack={goPrevious}
            limit={CHECKLIST_LIMITS['low-soul']}
            openValue={answers.foundations.soulOpen}
            onOpenChange={(value) => setTextValue('foundations.soulOpen', value)}
            openLabel={copy.lowSoulOpen}
          />
        );
      case 'low-mind':
        return (
          <ChecklistStep
            language={language}
            title={copy.lowMindTitle}
            subtitle={copy.lowMindSubtitle}
            xpAmount={13}
            items={labels.lowMind}
            selected={answers.low.mind}
            onToggle={(value) => toggleChecklist('low-mind', value)}
            onConfirm={() => handleChecklistConfirm('low-mind')}
            onBack={goPrevious}
            limit={CHECKLIST_LIMITS['low-mind']}
            openValue={answers.foundations.mindOpen}
            onOpenChange={(value) => setTextValue('foundations.mindOpen', value)}
            openLabel={copy.lowMindOpen}
          />
        );
      case 'low-note':
        return (
          <OpenTextStep
            language={language}
            title={copy.lowNoteTitle}
            subtitle={copy.lowNoteSubtitle}
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
            language={language}
            title={copy.chillOpenTitle}
            subtitle={copy.chillOpenSubtitle}
            value={answers.chill.oneThing}
            onChange={(value) => setTextValue('chill.oneThing', value)}
            onConfirm={() => handleOpenConfirm('chill-open', answers.chill.oneThing)}
            onBack={goPrevious}
            xpAmount={21}
            multiline={false}
            placeholder={copy.chillOpenPlaceholder}
          />
        );
      case 'chill-motiv':
        return (
          <ChecklistStep
            language={language}
            title={copy.chillMotivTitle}
            subtitle={copy.chillMotivSubtitle}
            xpAmount={13}
            items={labels.chillMotiv}
            selected={answers.chill.motiv}
            onToggle={(value) => toggleChecklist('chill-motiv', value)}
            onConfirm={() => handleChecklistConfirm('chill-motiv')}
            onBack={goPrevious}
          />
        );
      case 'flow-goal':
        return (
          <OpenTextStep
            language={language}
            title={copy.flowGoalTitle}
            subtitle={copy.flowGoalSubtitle}
            value={answers.flow.goal}
            onChange={(value) => setTextValue('flow.goal', value)}
            onConfirm={() => handleOpenConfirm('flow-goal', answers.flow.goal)}
            onBack={goPrevious}
            xpAmount={21}
            multiline={false}
            placeholder={copy.flowGoalPlaceholder}
          />
        );
      case 'flow-imped':
        return (
          <ChecklistStep
            language={language}
            title={copy.flowImpedTitle}
            subtitle={copy.flowImpedSubtitle}
            xpAmount={13}
            items={labels.flowObstacles}
            selected={answers.flow.imped}
            onToggle={(value) => toggleChecklist('flow-imped', value)}
            onConfirm={() => handleChecklistConfirm('flow-imped')}
            onBack={goPrevious}
          />
        );
      case 'evolve-goal':
        return (
          <OpenTextStep
            language={language}
            title={copy.evolveGoalTitle}
            subtitle={copy.evolveGoalSubtitle}
            value={answers.evolve.goal}
            onChange={(value) => setTextValue('evolve.goal', value)}
            onConfirm={() => handleOpenConfirm('evolve-goal', answers.evolve.goal)}
            onBack={goPrevious}
            xpAmount={21}
            multiline={false}
            placeholder={copy.evolveGoalPlaceholder}
          />
        );
      case 'evolve-trade':
        return (
          <ChecklistStep
            language={language}
            title={copy.evolveTradeTitle}
            subtitle={copy.evolveTradeSubtitle}
            xpAmount={13}
            items={labels.evolveCommit}
            selected={answers.evolve.trade}
            onToggle={(value) => toggleChecklist('evolve-trade', value)}
            onConfirm={() => handleChecklistConfirm('evolve-trade')}
            onBack={goPrevious}
          />
        );
      case 'evolve-att':
        return (
          <ChoiceStep
            language={language}
            title={copy.evolveAttTitle}
            subtitle={copy.evolveAttSubtitle}
            choices={labels.evolveAtt}
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
            language={language}
            title={copy.foundationsBodyTitle}
            subtitle={copy.foundationsBodySubtitle}
            xpAmount={13}
            badgeLabel={copy.pillarsBadge}
            items={labels.fBody}
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
            language={language}
            title={copy.foundationsSoulTitle}
            subtitle={copy.foundationsSoulSubtitle}
            xpAmount={13}
            badgeLabel={copy.pillarsBadge}
            items={labels.fSoul}
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
            language={language}
            title={copy.foundationsMindTitle}
            subtitle={copy.foundationsMindSubtitle}
            xpAmount={13}
            badgeLabel={copy.pillarsBadge}
            items={labels.fMind}
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
        return (
          <SummaryStep
            language={language}
            answers={answers}
            selectedAvatarId={answers.avatarId}
            xp={xp}
            onBack={goPrevious}
            onFinish={handleFinish}
            isSubmitting={isSubmitting}
            submitError={submitError}
          />
        );
      default:
        return null;
    }
  };

  if (isQuickStartFlowActive) {
    return (
      <IntegratedQuickStartFlow
        language={language}
        gameMode={answers.mode ?? 'CHILL'}
        avatarId={answers.avatarId}
        onBackToPathSelect={() => goToStep('path-select')}
        onExit={handleExit}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className="onboarding-force-white relative flex min-h-screen min-h-dvh flex-col overflow-hidden bg-[#000c40] pb-16">
      <HUD
        language={language}
        mode={answers.mode}
        stepIndex={currentStepIndex}
        totalSteps={totalSteps}
        xp={hudXp}
        onRestart={handleRestart}
        onExit={handleExit}
        highlighted={isGpExplainerOpen}
      />
      <main
        className={`relative z-10 mx-auto w-full max-w-5xl flex-1 min-w-0 pb-16 pt-44 transition duration-200 sm:px-6 sm:pt-48 ${
          isClerkGateStep ? 'px-2.5' : 'px-4'
        } ${isGpExplainerOpen ? 'blur-[2px]' : ''}`}
      >
        <div className="space-y-8" key={stepId}>
          {renderStep()}
        </div>
      </main>
      {isGpExplainerOpen ? <GpExplainerOverlay language={language} onClose={handleCloseGpExplainer} /> : null}
      <Snack message={snack} />
    </div>
  );
}
