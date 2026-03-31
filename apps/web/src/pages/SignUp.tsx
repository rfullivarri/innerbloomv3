import { SignUp } from '@clerk/clerk-react';
import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import { createAuthAppearance } from '../lib/clerkAppearance';
import { buildWebAbsoluteUrl } from '../lib/siteUrl';
import {
  buildNativeAppUrl,
  CAPACITOR_CALLBACK_HOST,
  isNativeCapacitorPlatform,
  openUrlInCapacitorBrowser,
} from '../mobile/capacitor';

export default function SignUpPage() {
  const signUpContainerRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const language = resolveAuthLanguage(location.search);
  const isNativeApp = isNativeCapacitorPlatform();

  const appearance = createAuthAppearance({
    layout: {
      showOptionalFields: true
    },
    elements: {
      footerActionText: 'text-white/50',
      footerActionLink: 'font-semibold text-white/70 hover:text-white underline-offset-4',
      formFieldSuccessText: 'text-sm text-emerald-200'
    }
  });

  if (isNativeApp) {
    const params = new URLSearchParams();
    params.set('mode', 'sign-up');
    params.set('return_to', buildNativeAppUrl(CAPACITOR_CALLBACK_HOST));
    const mobileAuthUrl = buildWebAbsoluteUrl(`${buildLocalizedAuthPath('/mobile-auth', language)}?${params.toString()}`);

    return (
      <AuthLayout
        title={language === 'en' ? 'Create your account' : 'Crear tu cuenta'}
        secondaryActionLabel={language === 'en' ? 'Back to app' : 'Volver a la app'}
        secondaryActionHref="/"
      >
        <div className="mx-auto max-w-xl rounded-3xl border border-white/10 bg-white/10 p-8 text-center text-white backdrop-blur-2xl">
          <p className="text-sm leading-6 text-white/72">
            {language === 'en'
              ? 'Create your account in the secure browser and return to the app to continue onboarding.'
              : 'Crea tu cuenta en el navegador seguro y vuelve a la app para continuar el onboarding.'}
          </p>
          <button
            type="button"
            onClick={() => void openUrlInCapacitorBrowser(mobileAuthUrl)}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            {language === 'en' ? 'Open secure sign up' : 'Abrir registro seguro'}
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={language === 'en' ? 'Create your account' : 'Crear tu cuenta'}
      secondaryActionLabel={language === 'en' ? 'Back to home' : 'Volver al inicio'}
      secondaryActionHref={`/?lang=${language}`}
    >
      <div
        ref={signUpContainerRef}
        className="mx-auto w-full min-w-0 max-w-full px-1 sm:px-0"
      >
        <SignUp
          appearance={appearance}
          routing="path"
          path="/sign-up"
          signInUrl={buildLocalizedAuthPath('/login', language)}
          // post-signup must continue onboarding
          fallbackRedirectUrl="/intro-journey"
        />
      </div>
    </AuthLayout>
  );
}
