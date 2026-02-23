import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  cancelSubscriptionWithFallback,
  getSubscriptionWithFallback,
} from '../lib/api/subscription';
import {
  type SubscriptionData,
} from '../lib/api/subscriptionMock';

function formatDate(value: string | null): string {
  if (!value) {
    return 'No disponible';
  }
  return new Date(value).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);

  const loadSubscription = useCallback(async () => {
    setIsLoading(true);
    const response = await getSubscriptionWithFallback();
    if (!response.ok && response.error.code === 'subscription_inactive') {
      setIsLocked(true);
      setIsLoading(false);
      return;
    }

    if (response.ok) {
      setSubscription(response.data);
      setIsLocked(response.data.status === 'inactive');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  const nextDateLabel = useMemo(() => {
    if (!subscription) {
      return 'No disponible';
    }

    if (subscription.status === 'trialing') {
      return `Fin de trial: ${formatDate(subscription.trialEndsAt)}`;
    }

    return `Próxima renovación: ${formatDate(subscription.nextRenewalAt)}`;
  }, [subscription]);

  const handleCancel = useCallback(async () => {
    const response = await cancelSubscriptionWithFallback();
    if (response.ok) {
      setSubscription(response.data);
      setIsLocked(true);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 text-white backdrop-blur-sm">
        Cargando suscripción...
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 text-white backdrop-blur-sm">
        <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-900/95 p-6 text-center shadow-2xl">
          <h1 className="text-3xl font-semibold">Tu suscripción está inactiva</h1>
          <p className="mx-auto mt-3 max-w-xl text-white/70">Activá un plan para volver a acceder a las funciones premium.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-xl border border-white/20 px-5 py-3 font-semibold text-white/90 transition hover:bg-white/10"
            >
              Cerrar
            </button>
            <Link
              to="/pricing"
              className="rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-300"
            >
              Ver pricing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-6 text-white backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0b1b44]/95 p-6 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Suscripción</h1>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-semibold text-white/90 transition hover:bg-white/10"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="flex items-center gap-2">
            <span className="text-white/70">Plan actual:</span>
            <strong>{subscription?.plan ?? 'No definido'}</strong>
            <span className="rounded-full border border-emerald-300/50 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-200">
              {subscription?.plan ?? 'Sin plan'}
            </span>
          </p>
          <p>
            <span className="text-white/70">Estado:</span> <strong>{subscription?.status ?? 'No definido'}</strong>
          </p>
          <p className="text-white/90">{nextDateLabel}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/pricing"
            className="rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-emerald-950 transition hover:bg-emerald-300"
          >
            Cambiar plan
          </Link>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-red-300/30 bg-red-500/10 px-5 py-3 font-semibold text-red-100 transition hover:bg-red-500/20"
          >
            Cancelar suscripción
          </button>
        </div>
      </div>
    </div>
  );
}
