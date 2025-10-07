import { SignIn } from '@clerk/clerk-react';
import { AuthLayout } from '../components/layout/AuthLayout';
import { DASHBOARD_PATH } from '../config/auth';

export default function LoginPage() {
  return (
    <AuthLayout
      title={
        <div className="flex flex-col items-center gap-3 text-center text-3xl font-semibold uppercase tracking-[0.32em] text-white sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:text-left sm:text-4xl md:text-5xl">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 sm:h-3 sm:w-3 md:h-4 md:w-4" />
          dashboard
        </div>
      }
      secondaryActionLabel="Volver al inicio"
      secondaryActionHref="/"
    >
      <div className="w-full max-w-md">
        <SignIn
          appearance={{
            layout: {
              logoPlacement: 'none',
              socialButtonsVariant: 'blockButton',
              showOptionalFields: false
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
              card: 'flex w-full flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_25px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-8',
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
                'mt-3 inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#0ea5e9] text-sm font-semibold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:from-[#8b5cf6] hover:to-[#0ea5e9]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-auto',
              footer:
                'mt-6 flex flex-col items-center gap-1 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center text-xs text-white/60 backdrop-blur-xl shadow-none',
              footerTitle: 'text-white/70',
              footerSubtitle: 'text-white/50',
              footerActionText: 'text-white/50',
              footerActionLink: 'font-semibold text-white/70 hover:text-white underline-offset-4',
              formResendCodeLink: 'text-sm text-white hover:text-white/80',
              identityPreview: 'rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl text-white/80',
              identityPreviewTitle: 'text-white',
              identityPreviewSubtitle: 'text-white/70',
              identityPreviewEditButton: 'text-white hover:text-white/80'
            }
          }}
          routing="path"
          path="/login"
          signUpUrl="/sign-up"
          fallbackRedirectUrl={DASHBOARD_PATH}
        />
      </div>
    </AuthLayout>
  );
}
