import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IntroJourney } from '../onboarding/IntroJourney';
import { type JourneyPayload } from '../onboarding/payload';
import { JourneyGeneratingScreen } from '../onboarding/screens/JourneyGeneratingScreen';
import { QuickStartGeneratingScreen } from '../onboarding/screens/QuickStartGeneratingScreen';
import { OnboardingProvider } from '../onboarding/state';
import { ApiError, apiAuthorizedFetch, buildApiUrl, markOnboardingProgress } from '../lib/api';
import { setJourneyGenerationPending } from '../lib/journeyGeneration';
import { emitOnboardingEvent } from '../lib/telemetry';
import { resolveOnboardingLanguage } from '../onboarding/i18n';
import { POSTLOGIN_LANGUAGE_STORAGE_KEY } from '../i18n/postLoginLanguage';
import { buildDemoUrl } from '../lib/demoEntry';
import {
  hasModerationSelection,
  writeModerationOnboardingIntentFlag,
} from '../lib/moderationOnboarding';
import { type OnboardingOverlayScope } from '../lib/onboardingOverlayStorage';

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

function buildOverlayScope(userId: string, onboardingSessionId: string | null | undefined): OnboardingOverlayScope | null {
  const normalizedUserId = userId.trim();
  const normalizedSessionId = onboardingSessionId?.trim();

  if (!normalizedUserId || !normalizedSessionId) {
    return null;
  }

  return {
    userId: normalizedUserId,
    onboardingSessionId: normalizedSessionId,
  };
}

export default function OnboardingIntroPage() {
  const navigate = useNavigate();
  const language = typeof window !== 'undefined' ? resolveOnboardingLanguage(window.location.search) : 'es';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [generationMode, setGenerationMode] = useState<string | null>(null);
  const [generationPath, setGenerationPath] = useState<'traditional' | 'quick_start' | null>(null);

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

        const introJson = (await introResponse.json().catch(() => ({}))) as {
          ok?: boolean;
          session_id?: string;
          taskgen_correlation_id?: string | null;
        };

        emitOnboardingEvent('onboarding_completed', {
          mode: payload.mode,
          plan: 'FREE',
          xpTotal: payload.xp.total,
        });

        const hasModerationIntent = hasModerationSelection(payload.data.foundations.body);
        const overlayScope = buildOverlayScope(payload.meta.user_id, introJson.session_id);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(POSTLOGIN_LANGUAGE_STORAGE_KEY, language);
          window.localStorage.setItem('innerbloom.postlogin.language.source', 'locale');
          writeModerationOnboardingIntentFlag(hasModerationIntent, overlayScope);
        }

        if (hasModerationIntent) {
          void markOnboardingProgress('moderation_selected', { trigger: 'onboarding_intro_client' });
        }

        setJourneyGenerationPending({
          clerkUserId: payload.meta.user_id,
          gameMode: payload.mode,
        });
        setGenerationMode(payload.mode);
        setGenerationPath(payload.meta.onboarding_path ?? 'traditional');
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
    if (generationPath === 'quick_start') {
      return (
        <QuickStartGeneratingScreen
          language={language}
          isSubmitting={isSubmitting}
          submitCompleted={!isSubmitting}
          submitError={submitError}
          onOpenGuidedDemo={() => navigate(buildDemoUrl({ language, source: 'onboarding', mode: 'onboarding' }))}
        />
      );
    }

    return (
      <JourneyGeneratingScreen
        gameMode={generationMode}
        language={language}
        onGoToDashboard={() => navigate('/dashboard-v3')}
        onOpenGuidedDemo={() => navigate(buildDemoUrl({ language, source: 'onboarding', mode: 'onboarding' }))}
      />
    );
  }

  return (
    <OnboardingProvider>
      <IntroJourney language={language} onFinish={handleFinish} isSubmitting={isSubmitting} submitError={submitError} />
    </OnboardingProvider>
  );
}
