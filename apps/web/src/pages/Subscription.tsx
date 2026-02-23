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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 text-white backdrop-blur-md">
        Cargando suscripción...
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6 text-white backdrop-blur-md">
        <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-indigo-950/70 p-6 text-center shadow-[0_30px_120px_rgba(15,23,42,0.55)] backdrop-blur-xl">
          <h1 className="text-3xl font-semibold">Tu suscripción está inactiva</h1>
          <p className="mx-auto mt-3 max-w-xl text-text-muted">Activá un plan para volver a acceder a las funciones premium.</p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/20"
            >
              Cerrar
            </button>
            <Link
              to="/pricing"
              className="rounded-2xl border border-emerald-300/30 bg-emerald-400/90 px-6 py-3 font-semibold text-emerald-950 shadow-[0_12px_30px_rgba(16,185,129,0.3)] transition hover:bg-emerald-300"
            >
              Ver pricing
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6 text-white backdrop-blur-md">
      <div className="w-full max-w-3xl rounded-3xl border border-white/15 bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-indigo-950/70 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.55)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">Suscripción</h1>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white/90 transition hover:border-white/40 hover:bg-white/20"
          >
            Cerrar
          </button>
        </div>

        <div className="mt-6 space-y-4 rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur">
          <p className="flex items-center gap-2">
            <span className="text-text-muted">Plan actual:</span>
            <strong>{subscription?.plan ?? 'No definido'}</strong>
            <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-200">
              {subscription?.plan ?? 'Sin plan'}
            </span>
          </p>
          <p>
            <span className="text-text-muted">Estado:</span> <strong>{subscription?.status ?? 'No definido'}</strong>
          </p>
          <p className="text-white/85">{nextDateLabel}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/pricing"
            className="rounded-2xl border border-emerald-300/30 bg-emerald-400/90 px-5 py-3 font-semibold text-emerald-950 shadow-[0_12px_30px_rgba(16,185,129,0.3)] transition hover:bg-emerald-300"
          >
            Cambiar plan
          </Link>
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-2xl border border-rose-300/35 bg-rose-500/10 px-5 py-3 font-semibold text-rose-100 transition hover:border-rose-300/55 hover:bg-rose-500/20"
          >
            Cancelar suscripción
          </button>
        </div>
      </div>
    </div>
  );
}
