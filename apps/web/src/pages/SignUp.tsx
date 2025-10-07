import { SignUp } from '@clerk/clerk-react';
import { useRef } from 'react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { DASHBOARD_PATH } from '../config/auth';

export default function SignUpPage() {
  const signUpContainerRef = useRef<HTMLDivElement | null>(null);

  return (
    <AuthLayout
      title="Crear tu cuenta"
      description="Sumate a Innerbloom para comenzar a medir y automatizar tus flujos. Creamos tu cuenta en segundos y te guiamos paso a paso."
      primaryActionLabel="Crear cuenta"
      onPrimaryActionClick={() => {
        const input = signUpContainerRef.current?.querySelector<HTMLInputElement>('input');
        input?.focus();
      }}
      secondaryActionLabel="Volver al inicio"
      secondaryActionHref="/"
    >
      <div ref={signUpContainerRef} className="w-full max-w-md">
        <SignUp
          appearance={{
            layout: {
              logoPlacement: 'none',
              socialButtonsVariant: 'blockButton'
            },
            variables: {
              colorPrimary: '#7c3aed',
              colorBackground: 'transparent',
              colorInputBackground: 'rgba(15, 23, 42, 0.55)',
              colorInputText: '#f8fafc',
              colorText: '#f8fafc',
              colorTextSecondary: 'rgba(226, 232, 240, 0.8)',
              borderRadius: '18px',
              fontSize: '16px',
              fontFamily: '"Manrope", "Inter", system-ui, sans-serif'
            },
            elements: {
              rootBox: 'w-full',
              card: 'flex w-full flex-col gap-6 bg-white/5 p-8 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_25px_80px_rgba(15,23,42,0.35)]',
              header: 'hidden',
              socialButtons: 'hidden',
              divider: 'hidden',
              form: 'flex flex-col gap-4 text-left',
              formField: 'flex flex-col gap-2',
              formFieldLabel: 'text-sm font-medium text-white/80',
              formFieldInput:
                'rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-base text-white placeholder:text-white/40 shadow-[0_6px_20px_rgba(99,102,241,0.15)] focus:border-white/40 focus:outline-none focus-visible:ring-0',
              formFieldInputShowPasswordButton: 'text-sm text-white/60 hover:text-white',
              formButtonPrimary:
                'mt-3 inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#0ea5e9] text-sm font-semibold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:from-[#8b5cf6] hover:to-[#0ea5e9]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
              footer: 'flex flex-col items-center gap-2 text-center text-sm text-white/70',
              footerActionLink: 'font-semibold text-white hover:text-white/80 underline-offset-4',
              formFieldSuccessText: 'text-sm text-emerald-200',
              identityPreview: 'rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl text-white/80',
              identityPreviewTitle: 'text-white',
              identityPreviewSubtitle: 'text-white/70',
              identityPreviewEditButton: 'text-white hover:text-white/80'
            }
          }}
          routing="path"
          path="/sign-up"
          signInUrl="/login"
          fallbackRedirectUrl={DASHBOARD_PATH}
        />
      </div>
    </AuthLayout>
  );
}
