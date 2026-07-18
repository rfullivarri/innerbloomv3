import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { readOAuthRedirectIntent } from '../components/auth/GoogleOAuthButton';

export default function SsoCallbackPage() {
  const redirectIntent = readOAuthRedirectIntent();
  const signInFallbackRedirectUrl =
    redirectIntent?.mode === 'sign-in' ? redirectIntent.redirectUrlComplete : undefined;
  const signUpFallbackRedirectUrl =
    redirectIntent?.mode === 'sign-up' ? redirectIntent.redirectUrlComplete : undefined;

  return (
    <main className="flex min-h-screen min-h-dvh items-center justify-center bg-black px-5 py-10 text-white">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        <span
          className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white"
          aria-hidden="true"
        />
        <p className="mt-4 text-sm leading-6 text-white/75" role="status">
          Completing secure sign-in…
        </p>

        {/* Clerk can promote its smart bot check to an interactive Turnstile challenge.
            This mount must remain visible so a legitimate user can complete that check. */}
        <div
          id="clerk-captcha"
          data-cl-theme="dark"
          data-cl-size="flexible"
          data-cl-language="auto"
          className="mt-6 min-h-[65px] w-full max-w-sm overflow-visible"
        />

        <AuthenticateWithRedirectCallback
          signInFallbackRedirectUrl={signInFallbackRedirectUrl}
          signUpFallbackRedirectUrl={signUpFallbackRedirectUrl}
        />
      </div>
    </main>
  );
}
