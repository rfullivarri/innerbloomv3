import { SignIn } from '@clerk/clerk-react';
import { useLocation } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { DASHBOARD_PATH } from '../config/auth';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import { createAuthAppearance } from '../lib/clerkAppearance';
import { usePageMeta } from '../lib/seo';
import { buildWebAbsoluteUrl } from '../lib/siteUrl';
import {
  buildNativeAppUrl,
  CAPACITOR_CALLBACK_HOST,
  isNativeCapacitorPlatform,
  openUrlInCapacitorBrowser,
} from '../mobile/capacitor';

export default function LoginPage() {
  const location = useLocation();
  const language = resolveAuthLanguage(location.search);
  const isNativeApp = isNativeCapacitorPlatform();

  usePageMeta({
    title: 'Innerbloom',
    description:
      language === 'en'
        ? 'Observe yourself in third person for the first time and take control of your actions and habits.'
        : 'Obsérvate por primera vez en tercera persona y toma el control de tus acciones y hábitos.',
    image: 'https://innerbloomjourney.org/og/neneOGP.png',
    imageAlt: 'Innerbloom',
    ogImageSecureUrl: 'https://innerbloomjourney.org/og/neneOGP.png',
    ogImageType: 'image/png',
    ogImageWidth: '1200',
    ogImageHeight: '630',
    twitterImage: 'https://innerbloomjourney.org/og/neneOGP.png',
    url: 'https://innerbloomjourney.org/login'
  });

  if (isNativeApp) {
    const params = new URLSearchParams();
    params.set('mode', 'sign-in');
    params.set('return_to', buildNativeAppUrl(CAPACITOR_CALLBACK_HOST));
    const mobileAuthUrl = buildWebAbsoluteUrl(`${buildLocalizedAuthPath('/mobile-auth', language)}?${params.toString()}`);

    return (
      <AuthLayout
        title={language === 'en' ? 'Sign in' : 'Iniciar sesión'}
        secondaryActionLabel={language === 'en' ? 'Back to app' : 'Volver a la app'}
        secondaryActionHref="/"
      >
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8 text-center text-white backdrop-blur-2xl">
          <p className="text-sm leading-6 text-white/72">
            {language === 'en'
              ? 'Continue in the secure browser and return to Innerbloom with your active session.'
              : 'Continúa en el navegador seguro y vuelve a Innerbloom con tu sesión activa.'}
          </p>
          <button
            type="button"
            onClick={() => void openUrlInCapacitorBrowser(mobileAuthUrl)}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            {language === 'en' ? 'Open secure login' : 'Abrir login seguro'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={language === 'en' ? 'Sign in' : 'Iniciar sesión'}
      secondaryActionLabel={language === 'en' ? 'Back to home' : 'Volver al inicio'}
      secondaryActionHref={`/?lang=${language}`}
    >
      <SignIn
        appearance={createAuthAppearance({
          elements: {
            footerActionText: 'text-white/50',
            footerActionLink: 'font-semibold text-white/70 hover:text-white underline-offset-4'
          }
        })}
        routing="path"
        path="/login"
        signUpUrl={buildLocalizedAuthPath('/sign-up', language)}
        fallbackRedirectUrl={DASHBOARD_PATH}
      />
    </AuthLayout>
  );
}
