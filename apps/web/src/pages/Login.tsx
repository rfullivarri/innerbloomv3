import { SignIn } from '@clerk/clerk-react';
import { useLocation } from 'react-router-dom';
import { GoogleOAuthButton } from '../components/auth/GoogleOAuthButton';
import { AuthLayout } from '../components/layout/AuthLayout';
import { DASHBOARD_PATH } from '../config/auth';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import {
  AUTH_CLERK_FORM_SHELL_CLASS,
  AUTH_DIVIDER_CLASS,
  AUTH_STACK_CLASS,
  createAuthAppearance,
} from '../lib/clerkAppearance';
import { readLandingThemeMode } from '../lib/landingTheme';
import { usePageMeta } from '../lib/seo';
import {
  isNativeCapacitorPlatform,
} from '../mobile/capacitor';

export default function LoginPage() {
  const location = useLocation();
  const language = resolveAuthLanguage(location.search);
  const themeMode = readLandingThemeMode('dark');
  const isLightTheme = themeMode === 'light';
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
    return (
      <AuthLayout
        title={language === 'en' ? 'Sign in' : 'Iniciar sesión'}
        secondaryActionLabel={language === 'en' ? 'Back to app' : 'Volver a la app'}
        secondaryActionHref="/"
        themeMode={themeMode}
      >
        <div className={AUTH_STACK_CLASS}>
          <div className={AUTH_CLERK_FORM_SHELL_CLASS}>
            <SignIn
              appearance={createAuthAppearance({
                mode: themeMode,
                elements: {
                  footerActionText: isLightTheme
                    ? 'text-[#51456f]/72'
                    : 'text-white/50',
                footerActionLink: isLightTheme
                    ? 'font-semibold text-[#3a2b68] hover:text-[#171126] underline-offset-4'
                    : 'font-semibold text-white/70 hover:text-white underline-offset-4',
                },
              })}
              routing="path"
              path="/login"
              signUpUrl={buildLocalizedAuthPath('/sign-up', language)}
              fallbackRedirectUrl="/"
            />
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={language === 'en' ? 'Sign in' : 'Iniciar sesión'}
      secondaryActionLabel={language === 'en' ? 'Back to home' : 'Volver al inicio'}
      secondaryActionHref={`/?lang=${language}`}
      themeMode={themeMode}
    >
      <div className={AUTH_STACK_CLASS}>
        <GoogleOAuthButton language={language} mode="sign-in" redirectUrlComplete={`${location.pathname}${location.search}${location.hash}`} />
        <div className={`${AUTH_DIVIDER_CLASS} ${isLightTheme ? '!text-[#3b305f]/52' : ''}`}>
          <span className={`h-px flex-1 ${isLightTheme ? 'bg-[#5a478f]/20' : 'bg-white/12'}`} aria-hidden />
          <span>{language === 'en' ? 'or continue with email' : 'o continúa con email'}</span>
          <span className={`h-px flex-1 ${isLightTheme ? 'bg-[#5a478f]/20' : 'bg-white/12'}`} aria-hidden />
        </div>
        <div className={AUTH_CLERK_FORM_SHELL_CLASS}>
          <SignIn
            appearance={createAuthAppearance({
                mode: themeMode,
                elements: {
                  footerActionText: isLightTheme
                    ? 'text-[#51456f]/72'
                    : 'text-white/50',
                footerActionLink: isLightTheme
                    ? 'font-semibold text-[#3a2b68] hover:text-[#171126] underline-offset-4'
                    : 'font-semibold text-white/70 hover:text-white underline-offset-4',
                },
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
