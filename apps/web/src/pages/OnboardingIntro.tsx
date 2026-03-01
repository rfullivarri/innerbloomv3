import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IntroJourney } from '../onboarding/IntroJourney';
import { type JourneyPayload } from '../onboarding/payload';
import { JourneyGeneratingScreen } from '../onboarding/screens/JourneyGeneratingScreen';
import { OnboardingProvider } from '../onboarding/state';
import { ApiError, apiAuthorizedFetch, buildApiUrl } from '../lib/api';
import { setJourneyGenerationPending } from '../lib/journeyGeneration';
import { emitOnboardingEvent } from '../lib/telemetry';
import { resolveOnboardingLanguage } from '../onboarding/i18n';

async function parseErrorMessage(response: Response) {
  const payload = await response.json().catch(() => ({}));
  if (payload && typeof payload === 'object') {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return response.statusText || 'Error desconocido';
}

export default function OnboardingIntroPage() {
  const navigate = useNavigate();
  const language = typeof window !== 'undefined' ? resolveOnboardingLanguage(window.location.search) : 'es';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<string | null>(null);

  const handleFinish = useCallback(
    async (payload: JourneyPayload) => {
      if (isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      setSubmitError(null);

      try {
        const introResponse = await apiAuthorizedFetch('/onboarding/intro', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!introResponse.ok) {
          const message = await parseErrorMessage(introResponse);
          throw new ApiError(introResponse.status, { message }, buildApiUrl('/onboarding/intro'));
        }

        await introResponse.json().catch(() => ({}));

        emitOnboardingEvent('onboarding_completed', {
          mode: payload.mode,
          plan: 'FREE',
          xpTotal: payload.xp.total,
        });

        setJourneyGenerationPending({
          clerkUserId: payload.meta.user_id,
          gameMode: payload.mode,
        });
        setGenerationMode(payload.mode);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error inesperado';
        const prefix = language === 'en' ? 'We could not save your onboarding.' : 'No pudimos guardar tu onboarding.';
        const suffix = language === 'en' ? 'Try again in a few seconds.' : 'Reintentá en unos segundos.';
        setSubmitError(`${prefix} ${message}. ${suffix}`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, language],
  );

  if (generationMode) {
    return <JourneyGeneratingScreen gameMode={generationMode} onGoToDashboard={() => navigate('/dashboard-v3')} />;
  }

  return (
    <OnboardingProvider>
      <IntroJourney language={language} onFinish={handleFinish} isSubmitting={isSubmitting} submitError={submitError} />
    </OnboardingProvider>
  );
}
