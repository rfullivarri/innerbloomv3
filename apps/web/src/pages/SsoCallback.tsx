import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';
import { readOAuthRedirectIntent } from '../components/auth/GoogleOAuthButton';

export default function SsoCallbackPage() {
  const redirectIntent = readOAuthRedirectIntent();
  const signInFallbackRedirectUrl =
    redirectIntent?.mode === 'sign-in' ? redirectIntent.redirectUrlComplete : undefined;
  const signUpFallbackRedirectUrl =
    redirectIntent?.mode === 'sign-up' ? redirectIntent.redirectUrlComplete : undefined;

  return (
    <>
      <div id="clerk-captcha" className="sr-only" />
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl={signInFallbackRedirectUrl}
        signUpFallbackRedirectUrl={signUpFallbackRedirectUrl}
      />
    </>
  );
}
