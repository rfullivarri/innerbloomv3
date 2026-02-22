import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  changePlan,
  subscribe,
  type PlanCode,
  type SubscriptionData,
} from '../lib/api/subscriptionMock';

interface PlanInfo {
  code: PlanCode;
  title: string;
  price: string;
  description: string;
}

const PLANS: PlanInfo[] = [
  { code: 'FREE', title: 'FREE', price: '$0', description: 'Plan base para empezar sin costo.' },
  { code: 'MONTH', title: 'MONTH', price: '$9.99', description: 'Suscripción mensual flexible.' },
  { code: 'SIX_MONTHS', title: 'SIX_MONTHS', price: '$49.99', description: 'Ahorro para compromiso de 6 meses.' },
  { code: 'YEAR', title: 'YEAR', price: '$89.99', description: 'Mejor precio anual para acceso completo.' },
];

export default function PricingPage() {
  const [result, setResult] = useState<SubscriptionData | null>(null);
  const [message, setMessage] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const handleSubscribe = useCallback(async (plan: PlanCode) => {
    const response = await subscribe(plan);
    if (!response.ok && response.error.code === 'subscription_inactive') {
      setIsLocked(true);
      setMessage('Tu cuenta está inactiva. Reactivá para continuar.');
      return;
    }

    if (response.ok) {
      setResult(response.data);
      setMessage(`Suscripción creada en /subscribe con plan ${plan}.`);
    }
  }, []);

  const handleChangePlan = useCallback(async (plan: PlanCode) => {
    const response = await changePlan(plan);
    if (!response.ok && response.error.code === 'subscription_inactive') {
      setIsLocked(true);
      setMessage('Tu cuenta está inactiva. Reactivá para continuar.');
      return;
    }

    if (response.ok) {
      setResult(response.data);
      setMessage(`Plan actualizado en /change-plan a ${plan}.`);
    }
  }, []);

  if (isLocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center text-white">
        <h1 className="text-3xl font-semibold">Suscripción inactiva</h1>
        <p className="max-w-xl text-white/70">No podés operar cambios hasta reactivar tu suscripción.</p>
        <Link
          to="/pricing"
          className="rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-300"
        >
          Reintentar en pricing
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12 text-white">
      <h1 className="text-3xl font-semibold">Pricing</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan) => (
          <article key={plan.code} className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <h2 className="text-xl font-semibold">{plan.title}</h2>
            <p className="mt-2 text-3xl font-bold">{plan.price}</p>
            <p className="mt-3 text-sm text-white/70">{plan.description}</p>
            <div className="mt-5 space-y-2">
              <button
                type="button"
                onClick={() => {
                  void handleSubscribe(plan.code);
                }}
                className="w-full rounded-xl bg-emerald-400 px-4 py-2 font-semibold text-emerald-950 transition hover:bg-emerald-300"
              >
                CTA /subscribe
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleChangePlan(plan.code);
                }}
                className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-2 font-semibold text-white transition hover:bg-white/20"
              >
                CTA /change-plan
              </button>
            </div>
          </article>
        ))}
      </div>
      {message ? <p className="mt-6 text-sm text-emerald-100">{message}</p> : null}
      {result ? (
        <p className="mt-2 text-sm text-white/80">
          Estado actual: {result.status} · Plan: {result.plan}
        </p>
      ) : null}
    </div>
  );
}
