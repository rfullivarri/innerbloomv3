import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { OFFICIAL_LANDING_CONTENT } from '../content/officialLandingContent';
import { getSubscriptionWithFallback } from '../lib/api/subscription';
import { changePlan, type PlanCode, type SubscriptionData } from '../lib/api/subscriptionMock';

const PLANS = OFFICIAL_LANDING_CONTENT.es.pricing.plans;

const PLAN_BUTTON_LABELS: Record<PlanCode, string> = {
  FREE: 'Seleccionar free trial',
  MONTH: 'Seleccionar mensual',
  SIX_MONTHS: 'Seleccionar semestral',
  YEAR: 'Seleccionar anual',
  SUPERUSER: 'Seleccionar plan',
};

export default function PricingPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPlan, setPendingPlan] = useState<PlanCode | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const loadSubscription = useCallback(async () => {
    setIsLoading(true);
    const response = await getSubscriptionWithFallback();
    if (response.ok) {
      setSubscription(response.data);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  const selectedPlan = useMemo<PlanCode | null>(() => {
    if (!subscription) {
      return null;
    }
    return subscription.plan;
  }, [subscription]);

  const handleSelectPlan = useCallback(
    async (planId: PlanCode) => {
      if (pendingPlan || selectedPlan === planId) {
        return;
      }

      setPendingPlan(planId);
      setFeedbackMessage(null);

      const response = await changePlan(planId);
      if (response.ok) {
        setSubscription(response.data);
        setFeedbackMessage(`Plan actualizado a ${planId.replace('_', ' ')}.`);
      } else {
        setFeedbackMessage('No se pudo actualizar el plan. Intentá nuevamente.');
      }

      setPendingPlan(null);
    },
    [pendingPlan, selectedPlan]
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,rgba(76,145,196,0.5),rgba(7,26,68,0.96)_45%,rgba(3,10,35,1))] px-6 py-16 text-text">
      <div className="mx-auto w-full max-w-7xl">
        <h1 className="text-center text-4xl font-semibold md:text-6xl">Planes y pricing</h1>
        <p className="mx-auto mt-4 max-w-3xl text-center text-lg text-text-muted md:text-2xl">
          Elegí tu plan desde el dashboard. El plan activo se resalta para que identifiques tu suscripción actual.
        </p>
        <p className="mt-6 text-center text-base text-text-muted">Precios finales para cliente (impuestos incluidos).</p>

        {feedbackMessage ? (
          <p className="mx-auto mt-6 max-w-xl rounded-xl border border-accent-purple/40 bg-accent-purple/15 px-4 py-3 text-center text-sm text-white">
            {feedbackMessage}
          </p>
        ) : null}

        <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => {
            const isSelected = selectedPlan === plan.id;
            const isPending = pendingPlan === plan.id;
            const isDisabled = isLoading || isPending;

            return (
              <article
                key={plan.id}
                className={[
                  'group relative rounded-3xl border border-white/10 bg-[linear-gradient(155deg,rgba(28,46,81,0.94),rgba(15,27,62,0.97))] p-7 shadow-[0_20px_60px_rgba(3,10,35,0.38)] transition-all duration-300',
                  isSelected
                    ? 'ring-2 ring-accent-purple/70 shadow-[0_0_0_1px_rgba(167,139,250,0.4),0_25px_65px_rgba(109,40,217,0.35)]'
                    : 'opacity-70 saturate-75 hover:scale-[1.02] hover:opacity-100 hover:saturate-100 hover:ring-1 hover:ring-white/35',
                ].join(' ')}
              >
                {isSelected ? (
                  <span className="absolute right-4 top-4 rounded-full border border-emerald-300/45 bg-emerald-400/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100">
                    Seleccionado
                  </span>
                ) : null}

                <p className="text-3xl tracking-[0.2em] text-white/80">{plan.name}</p>
                <p className="mt-4 text-5xl font-semibold leading-tight text-white">{plan.price}</p>
                <p className="mt-5 min-h-[84px] text-2xl leading-relaxed text-white/75">{plan.detail}</p>

                <button
                  type="button"
                  disabled={isDisabled || isSelected}
                  onClick={() => void handleSelectPlan(plan.id)}
                  className={[
                    'mt-8 w-full rounded-full px-6 py-4 text-xl font-semibold transition',
                    isSelected
                      ? 'cursor-default border border-white/25 bg-white/10 text-white/85'
                      : 'bg-accent-purple text-white shadow-glow hover:bg-accent-purple/90 disabled:cursor-not-allowed disabled:opacity-70',
                  ].join(' ')}
                >
                  {isPending ? 'Actualizando...' : isSelected ? 'Seleccionado' : PLAN_BUTTON_LABELS[plan.id]}
                </button>
              </article>
            );
          })}
        </section>

        <div className="mt-8 flex justify-center">
          <Link
            to="/"
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-text transition hover:bg-white/5"
          >
            Volver / Back
          </Link>
        </div>
      </div>
    </main>
  );
}
