import { useCallback, useMemo, useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';

export type GoogleOAuthMode = 'sign-in' | 'sign-up';

type GoogleOAuthButtonProps = {
  language: 'es' | 'en';
  mode: GoogleOAuthMode;
  redirectUrlComplete: string;
  className?: string;
};

const SSO_CALLBACK_PATH = '/sso-callback';

export function GoogleOAuthButton({
  language,
  mode,
  redirectUrlComplete,
  className = '',
}: GoogleOAuthButtonProps) {
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isLoaded = mode === 'sign-up' ? isSignUpLoaded : isSignInLoaded;
  const isDisabled = !isLoaded || isRedirecting;

  const copy = useMemo(
    () => ({
      cta: language === 'en' ? 'Continue with Google' : 'Continuar con Google',
      loading: language === 'en' ? 'Connecting to Google…' : 'Conectando con Google…',
      iconLabel: language === 'en' ? 'Google logo' : 'Logo de Google',
    }),
    [language],
  );

  const handleClick = useCallback(async () => {
    if (!isLoaded || isRedirecting) {
      return;
    }

    setIsRedirecting(true);

    try {
      if (mode === 'sign-up') {
        await signUp.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: SSO_CALLBACK_PATH,
          redirectUrlComplete,
        });
      } else {
        await signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: SSO_CALLBACK_PATH,
          redirectUrlComplete,
        });
      }
    } catch (error) {
      console.error('[auth] Google OAuth redirect failed', error);
      setIsRedirecting(false);
    }
  }, [isLoaded, isRedirecting, mode, redirectUrlComplete, signIn, signUp]);

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={isDisabled}
      className={
        `flex h-12 w-full items-center justify-center gap-3 rounded-full border border-white/20 ` +
        `bg-white/95 px-4 text-sm font-semibold text-slate-900 shadow-[0_14px_34px_rgba(15,23,42,0.24)] ` +
        `transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70 ${className}`
      }
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" role="img" className="h-5 w-5" focusable="false">
        <title>{copy.iconLabel}</title>
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.4c-.2 1.2-1.4 3.5-5.4 3.5-3.2 0-5.9-2.7-5.9-6s2.6-6 5.9-6c1.8 0 3 .8 3.7 1.4l2.5-2.4C16.7 2.9 14.6 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.9 0 8.6-4.8 8.6-7.3 0-.5 0-.9-.1-1.3H12Z"
        />
        <path
          fill="#34A853"
          d="M2.8 11.2c0 1.6.6 3.1 1.6 4.2l3-2.4c-.2-.5-.4-1.1-.4-1.8s.1-1.2.4-1.8l-3-2.4c-1 1.1-1.6 2.6-1.6 4.2Z"
        />
        <path
          fill="#FBBC05"
          d="M12 20.4c2.6 0 4.8-.9 6.4-2.5l-3-2.5c-.8.6-1.9 1-3.4 1-2.5 0-4.6-1.7-5.4-4l-3 2.3c1.5 3 4.6 5.1 8.4 5.1Z"
        />
        <path
          fill="#4285F4"
          d="M18.4 17.9c1.8-1.6 2.9-4 2.9-6.7 0-.5 0-.9-.1-1.3H12v3.9h5.3c-.3 1.4-1.1 2.9-2.9 4.1l3 2.4Z"
        />
      </svg>
      <span>{isRedirecting ? copy.loading : copy.cta}</span>
    </button>
  );
}
