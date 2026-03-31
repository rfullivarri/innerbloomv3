import { SignUp } from '@clerk/clerk-react';
import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AuthLayout } from '../components/layout/AuthLayout';
import { BrandWordmark } from '../components/layout/BrandWordmark';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import { createAuthAppearance } from '../lib/clerkAppearance';
import {
  isNativeCapacitorPlatform,
  openUrlInCapacitorBrowser,
} from '../mobile/capacitor';
import { buildNativeMobileAuthUrl } from '../mobile/mobileAuthSession';

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
    const mobileAuthUrl = buildNativeMobileAuthUrl('sign-up', language);

    return (
      <AuthLayout
        title={language === 'en' ? 'Create your account' : 'Crear tu cuenta'}
        secondaryActionLabel={language === 'en' ? 'Back to app' : 'Volver a la app'}
        secondaryActionHref="/"
      >
        <div className="mx-auto max-w-xl rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-8 text-center text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
          <div className="flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.38em] text-white/56">
            <BrandWordmark className="gap-2.5" textClassName="tracking-[0.38em]" iconClassName="h-[1.85em]" />
          </div>
          <p className="mt-6 text-sm leading-7 text-white/76">
            {language === 'en'
              ? 'Create your account in the secure browser and return to the app to continue onboarding.'
              : 'Crea tu cuenta en el navegador seguro y vuelve a la app para continuar el onboarding.'}
          </p>
          <button
            type="button"
            onClick={() => void openUrlInCapacitorBrowser(mobileAuthUrl)}
            className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-[#7c3aed] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(124,58,237,0.34)] transition hover:bg-[#8b5cf6]"
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
