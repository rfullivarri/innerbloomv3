import { SignIn } from '@clerk/clerk-react';
import { DASHBOARD_PATH } from '../config/auth';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: '#7d3cff',
            colorBackground: 'rgba(15, 23, 42, 0.95)',
            colorInputBackground: 'rgba(15, 23, 42, 0.6)'
          }
        }}
        routing="path"
        path="/login"
        signUpUrl="/sign-up"
        fallbackRedirectUrl={DASHBOARD_PATH}
      />
    </div>
  );
}
