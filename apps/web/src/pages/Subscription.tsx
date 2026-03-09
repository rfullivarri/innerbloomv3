import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  cancelSubscriptionWithFallback,
  getSubscriptionWithFallback,
} from '../lib/api/subscription';
import {
  type SubscriptionData,
} from '../lib/api/subscriptionMock';
import { usePostLoginLanguage, type PostLoginLanguage } from '../i18n/postLoginLanguage';

function resolveLocale(language: PostLoginLanguage): string {
  return language === 'es' ? 'es-AR' : 'en-US';
}

function formatDate(value: string | null, formatter: Intl.DateTimeFormat, fallbackLabel: string): string {
  if (!value) {
    return fallbackLabel;
  }

  return formatter.format(new Date(value));
}

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { language, t } = usePostLoginLanguage();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(resolveLocale(language), {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
    [language],
  );

  const tx = useCallback((key: string) => t(`subscription.${key}`), [t]);

  const loadSubscription = useCallback(async () => {
    setErrorMessage(null);
    setIsLoading(true);
    const response = await getSubscriptionWithFallback();
    if (!response.ok && response.error.code === 'subscription_inactive') {
      setIsLocked(true);
      setIsLoading(false);
      return;
    }

    if (!response.ok) {
      setErrorMessage(tx('error.load'));
      setIsLoading(false);
      return;
    }

    setSubscription(response.data);
    setIsLocked(response.data.status === 'inactive');

    setIsLoading(false);
  }, [tx]);

  useEffect(() => {
    void loadSubscription();
  }, [loadSubscription]);

  const nextDateLabel = useMemo(() => {
    if (!subscription) {
      return tx('value.notAvailable');
    }

    if (subscription.status === 'trialing') {
      return `${tx('value.trialEnds')}: ${formatDate(subscription.trialEndsAt, formatter, tx('value.notAvailable'))}`;
    }

    return `${tx('renewalDate')}: ${formatDate(subscription.nextRenewalAt, formatter, tx('value.notAvailable'))}`;
  }, [formatter, subscription, tx]);

  const handleCancel = useCallback(async () => {
    setActionMessage(null);
    setErrorMessage(null);
    const response = await cancelSubscriptionWithFallback();
    if (response.ok) {
      setSubscription(response.data);
      setIsLocked(true);
      setActionMessage(tx('success.cancel'));
      return;
    }

    setErrorMessage(tx('error.cancel'));
  }, [tx]);

  const overlayClassName =
    'fixed inset-0 z-50 flex items-center justify-center bg-[radial-gradient(circle_at_top,_color-mix(in_srgb,var(--color-accent-primary)_18%,transparent),_transparent_55%),radial-gradient(circle_at_bottom_right,_color-mix(in_srgb,var(--color-accent-secondary)_14%,transparent),_transparent_50%),color-mix(in_srgb,var(--color-surface)_76%,transparent)] px-6 text-[color:var(--color-text)] backdrop-blur-md';

  const panelClassName =
    'w-full max-w-3xl rounded-[2rem] border border-[color:var(--color-border-soft)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-surface-elevated)_92%,transparent),color-mix(in_srgb,var(--color-overlay-2)_68%,transparent))] p-6 shadow-[0_24px_64px_color-mix(in_srgb,var(--color-text)_12%,transparent),0_10px_26px_color-mix(in_srgb,var(--color-accent-primary)_12%,transparent)] dark:shadow-[var(--shadow-elev-2)]';

  const secondaryButtonClassName =
    'rounded-2xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] px-4 py-2 text-sm font-semibold text-[color:var(--color-text)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-overlay-2)]';

  const primaryActionClassName =
    'rounded-full border border-violet-400/45 bg-violet-500 px-7 py-3 font-semibold text-white shadow-[0_14px_35px_rgba(124,58,237,0.3)] transition hover:-translate-y-0.5 hover:bg-violet-400 hover:shadow-[0_18px_40px_rgba(124,58,237,0.35)]';

  const destructiveActionClassName =
    'rounded-full border border-rose-200 bg-rose-100/90 px-7 py-3 font-semibold text-rose-700 shadow-[0_8px_22px_rgba(244,63,94,0.12)] transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-200/85 hover:text-rose-800 hover:shadow-[0_14px_30px_rgba(244,63,94,0.18)] dark:border-rose-300/45 dark:bg-rose-500 dark:text-rose-50 dark:shadow-[0_14px_35px_rgba(244,63,94,0.28)] dark:hover:bg-rose-400 dark:hover:shadow-[0_18px_40px_rgba(244,63,94,0.34)]';

  if (isLoading) {
    return (
      <div className={overlayClassName}>
        {tx('loading')}
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className={overlayClassName}>
        <div className="w-full max-w-xl rounded-[2rem] border border-[color:var(--color-border-soft)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--color-surface-elevated)_94%,transparent),color-mix(in_srgb,var(--color-overlay-2)_66%,transparent))] p-6 text-center shadow-[var(--shadow-elev-2)]">
          <h1 className="text-3xl font-semibold">{tx('inactive.title')}</h1>
          <p className="mx-auto mt-3 max-w-xl text-text-muted">{tx('inactive.body')}</p>
          {actionMessage ? <p className="mt-4 text-sm font-medium text-emerald-600">{actionMessage}</p> : null}
          {errorMessage ? <p className="mt-4 text-sm font-medium text-rose-600">{errorMessage}</p> : null}
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={`${secondaryButtonClassName} px-5 py-3 text-base`}
            >
              {tx('actions.close')}
            </button>
            <Link
              to="/pricing"
              className="rounded-2xl border border-emerald-400/50 bg-emerald-400 px-6 py-3 font-semibold text-emerald-950 shadow-[0_12px_30px_rgba(16,185,129,0.24)] transition hover:bg-emerald-300"
            >
              {tx('actions.viewPricing')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={overlayClassName}>
      <div className={panelClassName}>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold uppercase tracking-[0.14em]">{t('subscription.page.title')}</h1>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={tx('actions.close')}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] text-xl font-semibold leading-none text-[color:var(--color-text)] transition hover:border-[color:var(--color-border-strong)] hover:bg-[color:var(--color-overlay-2)]"
          >
            ×
          </button>
        </div>

        <div className="mt-6 space-y-4 rounded-3xl border border-[color:var(--color-border-soft)] bg-[color:var(--color-overlay-1)] p-6 shadow-[0_20px_46px_color-mix(in_srgb,var(--color-text)_9%,transparent),0_8px_20px_color-mix(in_srgb,var(--color-accent-primary)_10%,transparent),inset_0_1px_0_color-mix(in_srgb,white_72%,transparent)] dark:shadow-none">
          <p className="flex items-center gap-2">
            <span className="text-[color:var(--color-text-dim)]">{tx('label.currentPlan')}:</span>
            <span className="rounded-full border border-emerald-400/60 bg-emerald-400 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-950 shadow-[0_8px_22px_rgba(16,185,129,0.24)] dark:border-emerald-300/45 dark:bg-emerald-400 dark:text-emerald-950">
              {subscription?.plan ?? tx('value.noPlan')}
            </span>
          </p>
          <p>
            <span className="text-[color:var(--color-text-dim)]">{tx('label.status')}:</span> <strong>{subscription?.status ?? tx('value.undefined')}</strong>
          </p>
          <p className="text-[color:var(--color-text-muted)]">{nextDateLabel}</p>
          {actionMessage ? <p className="text-sm font-medium text-emerald-600">{actionMessage}</p> : null}
          {errorMessage ? <p className="text-sm font-medium text-rose-600">{errorMessage}</p> : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/pricing"
            className={primaryActionClassName}
          >
            {tx('actions.changePlan')}
          </Link>
          <button
            type="button"
            onClick={handleCancel}
            className={destructiveActionClassName}
          >
            {tx('actions.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
