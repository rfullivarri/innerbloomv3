import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';

export default function SsoCallbackPage() {
  return (
    <>
      <div id="clerk-captcha" className="sr-only" />
      <AuthenticateWithRedirectCallback />
    </>
  );
}
