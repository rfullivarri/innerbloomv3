import { SignIn } from '@clerk/clerk-react';
import { useLocation } from 'react-router-dom';
import { GoogleOAuthButton } from '../components/auth/GoogleOAuthButton';
import { AuthLayout } from '../components/layout/AuthLayout';
import { BrandWordmark } from '../components/layout/BrandWordmark';
import { DASHBOARD_PATH } from '../config/auth';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import {
  AUTH_CLERK_FORM_SHELL_CLASS,
  AUTH_DIVIDER_CLASS,
  AUTH_STACK_CLASS,
  createAuthAppearance,
} from '../lib/clerkAppearance';
import { usePageMeta } from '../lib/seo';
import {
  isNativeCapacitorPlatform,
  openUrlInCapacitorBrowser,
} from '../mobile/capacitor';
import { buildNativeMobileAuthUrl } from '../mobile/mobileAuthSession';

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
    const mobileAuthUrl = buildNativeMobileAuthUrl('sign-in', language);

    return (
      <AuthLayout
        title={language === 'en' ? 'Sign in' : 'Iniciar sesión'}
        secondaryActionLabel={language === 'en' ? 'Back to app' : 'Volver a la app'}
        secondaryActionHref="/"
      >
        <div className="mx-auto max-w-xl rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] p-8 text-center text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] backdrop-blur-2xl">
          <div className="flex items-center justify-center text-[11px] font-semibold uppercase tracking-[0.38em] text-white/56">
            <BrandWordmark className="gap-2.5" textClassName="tracking-[0.38em]" iconClassName="h-[1.85em]" />
          </div>
          <p className="mt-6 text-sm leading-7 text-white/76">
            {language === 'en'
              ? 'Continue in the secure browser and return to Innerbloom with your active session.'
              : 'Continúa en el navegador seguro y vuelve a Innerbloom con tu sesión activa.'}
          </p>
          <button
            type="button"
            onClick={() => void openUrlInCapacitorBrowser(mobileAuthUrl)}
            className="mt-7 inline-flex w-full items-center justify-center rounded-full bg-[#7c3aed] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(124,58,237,0.34)] transition hover:bg-[#8b5cf6]"
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
      <div className={AUTH_STACK_CLASS}>
        <GoogleOAuthButton language={language} mode="sign-in" redirectUrlComplete={`${location.pathname}${location.search}${location.hash}`} />
        <div className={AUTH_DIVIDER_CLASS}>
          <span className="h-px flex-1 bg-white/12" aria-hidden />
          <span>{language === 'en' ? 'or continue with email' : 'o continúa con email'}</span>
          <span className="h-px flex-1 bg-white/12" aria-hidden />
        </div>
        <div className={AUTH_CLERK_FORM_SHELL_CLASS}>
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
        </div>
      </div>
    </AuthLayout>
  );
}
