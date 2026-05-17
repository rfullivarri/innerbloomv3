import { useCallback, useMemo, useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';

export type GoogleOAuthMode = 'sign-in' | 'sign-up';

type GoogleOAuthButtonProps = {
  language: 'es' | 'en';
  mode: GoogleOAuthMode;
  redirectUrlComplete: string;
  className?: string;
  forceAccountSelection?: boolean;
  allowCrossModeCompletion?: boolean;
};

const SSO_CALLBACK_PATH = '/sso-callback';

export function GoogleOAuthButton({
  language,
  mode,
  redirectUrlComplete,
  className = '',
  forceAccountSelection = false,
  allowCrossModeCompletion = false,
}: GoogleOAuthButtonProps) {
  const { isLoaded: isSignInLoaded, signIn } = useSignIn();
  const { isLoaded: isSignUpLoaded, signUp } = useSignUp();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const isLoaded = mode === 'sign-up' ? isSignUpLoaded : isSignInLoaded;
  const isDisabled = !isLoaded || isRedirecting;
  const shouldForceAccountSelection = forceAccountSelection || mode === 'sign-up';

  const copy = useMemo(
    () => {
      const isSignUp = mode === 'sign-up';

      return {
        cta:
          language === 'en'
            ? isSignUp
              ? 'Sign up with Google'
              : 'Log in with Google'
            : isSignUp
              ? 'Crear cuenta con Google'
              : 'Iniciar sesión con Google',
        loading: language === 'en' ? 'Connecting to Google…' : 'Conectando con Google…',
        iconLabel: language === 'en' ? 'Google logo' : 'Logo de Google',
      };
    },
    [language, mode],
  );

  const handleClick = useCallback(async () => {
    if (!isLoaded || isRedirecting) {
      return;
    }

    setIsRedirecting(true);

    try {
      if (mode === 'sign-up') {
        if (!signUp) {
          throw new Error('Clerk sign-up resource is not ready');
        }
        await signUp.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: SSO_CALLBACK_PATH,
          redirectUrlComplete,
          continueSignIn: allowCrossModeCompletion,
          continueSignUp: allowCrossModeCompletion,
          oidcPrompt: shouldForceAccountSelection ? 'select_account' : undefined,
        });
      } else {
        if (!signIn) {
          throw new Error('Clerk sign-in resource is not ready');
        }
        await signIn.authenticateWithRedirect({
          strategy: 'oauth_google',
          redirectUrl: SSO_CALLBACK_PATH,
          redirectUrlComplete,
          continueSignIn: allowCrossModeCompletion,
          continueSignUp: allowCrossModeCompletion,
          oidcPrompt: shouldForceAccountSelection ? 'select_account' : undefined,
        });
      }
    } catch (error) {
      console.error('[auth] Google OAuth redirect failed', error);
      setIsRedirecting(false);
    }
  }, [allowCrossModeCompletion, isLoaded, isRedirecting, mode, redirectUrlComplete, shouldForceAccountSelection, signIn, signUp]);

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={isDisabled}
      className={
        `auth-google-button group inline-flex h-12 w-full items-center justify-center gap-3 rounded-full border border-slate-200/90 ` +
        `bg-white px-4 text-sm font-semibold leading-none text-slate-800 shadow-[0_14px_34px_rgba(15,23,42,0.2)] ` +
        `transition-[background-color,box-shadow,border-color,color] duration-150 ` +
        `hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:shadow-[0_14px_34px_rgba(15,23,42,0.24)] ` +
        `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ` +
        `disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-600 disabled:shadow-[0_8px_20px_rgba(15,23,42,0.16)] ${className}`
      }
    >
      <svg
        viewBox="0 0 48 48"
        aria-hidden="true"
        role="img"
        className="h-[18px] w-[18px] shrink-0"
        focusable="false"
      >
        <title>{copy.iconLabel}</title>
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.655 32.657 29.239 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.959 3.041l5.657-5.657C34.053 6.053 29.281 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.65-.389-3.917Z" />
        <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.153 7.959 3.041l5.657-5.657C34.053 6.053 29.281 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z" />
        <path fill="#4CAF50" d="M24 44c5.179 0 9.868-1.977 13.409-5.192l-6.19-5.238C29.146 35.091 26.715 36 24 36c-5.218 0-9.621-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z" />
        <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.091 5.571l.003-.002 6.19 5.238C36.971 39.202 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z" />
      </svg>
      <span className="auth-google-button__label">{isRedirecting ? copy.loading : copy.cta}</span>
    </button>
  );
}
