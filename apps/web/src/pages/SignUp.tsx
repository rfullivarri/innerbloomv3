import { SignUp } from '@clerk/clerk-react';
import { DASHBOARD_PATH } from '../config/auth';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <SignUp
        appearance={{
          variables: {
            colorPrimary: '#7d3cff',
            colorBackground: 'rgba(15, 23, 42, 0.95)',
            colorInputBackground: 'rgba(15, 23, 42, 0.6)'
          }
        }}
        routing="path"
        path="/sign-up"
        signInUrl="/login"
        fallbackRedirectUrl={DASHBOARD_PATH}
      />
    </div>
  );
}
