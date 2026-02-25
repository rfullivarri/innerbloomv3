import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IntroJourney } from '../onboarding/IntroJourney';
import { type JourneyPayload } from '../onboarding/payload';
import { OnboardingProvider } from '../onboarding/state';
import { ApiError, apiAuthorizedFetch, buildApiUrl } from '../lib/api';
import { emitOnboardingEvent } from '../lib/telemetry';
import { buildWebAbsoluteUrl } from '../lib/siteUrl';

type BillingPlan = 'MONTH' | 'SIX_MONTHS' | 'YEAR';

const BILLING_PLANS = new Set<BillingPlan>(['MONTH', 'SIX_MONTHS', 'YEAR']);

function parsePlan(plan: string | null): BillingPlan | null {
  if (!plan) {
    return null;
  }

  const normalizedPlan = plan.trim().toUpperCase();
  return BILLING_PLANS.has(normalizedPlan as BillingPlan) ? (normalizedPlan as BillingPlan) : null;
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedPlan = useMemo(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    const fromSearch = new URLSearchParams(window.location.search).get('plan');
    if (fromSearch) {
      return parsePlan(fromSearch);
    }

    const fromStorage = window.localStorage.getItem('selected_plan');
    return parsePlan(fromStorage);
  }, []);

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
          plan: selectedPlan,
          xpTotal: payload.xp.total,
        });

        if (selectedPlan) {
          const checkoutResponse = await apiAuthorizedFetch('/billing/checkout-session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              plan: selectedPlan,
              successUrl: buildWebAbsoluteUrl('/billing/success'),
              cancelUrl: buildWebAbsoluteUrl('/billing/cancel'),
            }),
          });

          if (!checkoutResponse.ok) {
            const checkoutMessage = await parseErrorMessage(checkoutResponse);
            throw new Error(checkoutMessage);
          }

          const checkoutPayload = (await checkoutResponse.json().catch(() => ({}))) as {
            checkoutUrl?: string;
          };

          if (checkoutPayload.checkoutUrl) {
            window.location.assign(checkoutPayload.checkoutUrl);
            return;
          }
        }

        navigate('/pricing');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error inesperado';
        setSubmitError(`No pudimos guardar tu onboarding. ${message}. Reintentá en unos segundos.`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, navigate, selectedPlan],
  );

  return (
    <OnboardingProvider>
      <IntroJourney onFinish={handleFinish} isSubmitting={isSubmitting} submitError={submitError} />
    </OnboardingProvider>
  );
}
