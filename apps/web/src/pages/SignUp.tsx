import { SignUp } from '@clerk/clerk-react';
import { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { GoogleOAuthButton } from '../components/auth/GoogleOAuthButton';
import { AuthLayout } from '../components/layout/AuthLayout';
import { buildLocalizedAuthPath, resolveAuthLanguage } from '../lib/authLanguage';
import {
  AUTH_CLERK_FORM_SHELL_CLASS,
  AUTH_DIVIDER_CLASS,
  AUTH_STACK_CLASS,
  createAuthAppearance,
} from '../lib/clerkAppearance';
import { readLandingThemeMode } from '../lib/landingTheme';
import {
  isNativeCapacitorPlatform,
  openUrlInCapacitorBrowser,
} from '../mobile/capacitor';
import { buildNativeMobileAuthUrl } from '../mobile/mobileAuthSession';

export default function SignUpPage() {
  const signUpContainerRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const language = resolveAuthLanguage(location.search);
  const themeMode = readLandingThemeMode('dark');
  const isLightTheme = themeMode === 'light';
  const isNativeApp = isNativeCapacitorPlatform();

  const appearance = createAuthAppearance({
    mode: themeMode,
    layout: {
      showOptionalFields: true,
    },
    elements: {
      footerActionText: isLightTheme
        ? 'text-[#51456f]/72'
        : 'text-white/50',
      footerActionLink: isLightTheme
        ? 'font-semibold text-[#3a2b68] hover:text-[#171126] underline-offset-4'
        : 'font-semibold text-white/70 hover:text-white underline-offset-4',
      formFieldSuccessText: isLightTheme
        ? 'text-sm text-emerald-700'
        : 'text-sm text-emerald-200',
    },
  });

  if (isNativeApp) {
    const googleAuthUrl = buildNativeMobileAuthUrl('sign-up', language, { provider: 'google' });

    return (
      <AuthLayout
        title={language === 'en' ? 'Create your account' : 'Crear tu cuenta'}
        secondaryActionLabel={language === 'en' ? 'Back to app' : 'Volver a la app'}
        secondaryActionHref="/"
        themeMode={themeMode}
      >
        <div className={AUTH_STACK_CLASS}>
          <button
            type="button"
            onClick={() => void openUrlInCapacitorBrowser(googleAuthUrl)}
            className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-full border border-slate-200/90 bg-white px-4 text-sm font-semibold leading-none text-slate-900 shadow-[0_14px_34px_rgba(15,23,42,0.2)] transition hover:bg-slate-50"
          >
            <svg
              viewBox="0 0 48 48"
              aria-hidden="true"
              role="img"
              className="h-[18px] w-[18px] shrink-0"
              focusable="false"
            >
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.655 32.657 29.239 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.959 3.041l5.657-5.657C34.053 6.053 29.281 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.65-.389-3.917Z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.153 7.959 3.041l5.657-5.657C34.053 6.053 29.281 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z" />
              <path fill="#4CAF50" d="M24 44c5.179 0 9.868-1.977 13.409-5.192l-6.19-5.238C29.146 35.091 26.715 36 24 36c-5.218 0-9.621-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.091 5.571l.003-.002 6.19 5.238C36.971 39.202 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z" />
            </svg>
            {language === 'en' ? 'Sign up with Google' : 'Crear cuenta con Google'}
          </button>
          <div className={`${AUTH_DIVIDER_CLASS} ${isLightTheme ? '!text-[#3b305f]/76' : ''}`}>
            <span className={`h-px flex-1 ${isLightTheme ? 'bg-[#5a478f]/28' : 'bg-white/12'}`} aria-hidden />
            <span>{language === 'en' ? 'or continue with email' : 'o continúa con email'}</span>
            <span className={`h-px flex-1 ${isLightTheme ? 'bg-[#5a478f]/28' : 'bg-white/12'}`} aria-hidden />
          </div>
          <div
            ref={signUpContainerRef}
            className={AUTH_CLERK_FORM_SHELL_CLASS}
          >
            <SignUp
              appearance={appearance}
              routing="path"
              path="/sign-up"
              signInUrl={buildLocalizedAuthPath('/login', language)}
              fallbackRedirectUrl="/intro-journey"
            />
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={language === 'en' ? 'Create your account' : 'Crear tu cuenta'}
      secondaryActionLabel={language === 'en' ? 'Back to home' : 'Volver al inicio'}
      secondaryActionHref={`/?lang=${language}`}
      themeMode={themeMode}
    >
      <div className={AUTH_STACK_CLASS}>
        <GoogleOAuthButton language={language} mode="sign-up" redirectUrlComplete={`${location.pathname}${location.search}${location.hash}`} />
        <div className={`${AUTH_DIVIDER_CLASS} ${isLightTheme ? '!text-[#3b305f]/52' : ''}`}>
          <span className={`h-px flex-1 ${isLightTheme ? 'bg-[#5a478f]/20' : 'bg-white/12'}`} aria-hidden />
          <span>{language === 'en' ? 'or continue with email' : 'o continúa con email'}</span>
          <span className={`h-px flex-1 ${isLightTheme ? 'bg-[#5a478f]/20' : 'bg-white/12'}`} aria-hidden />
        </div>
        <div
          ref={signUpContainerRef}
          className={AUTH_CLERK_FORM_SHELL_CLASS}
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
      </div>
    </AuthLayout>
  );
}
