import { SignIn } from '@clerk/clerk-react';
import { DASHBOARD_PATH } from '../config/auth';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-white">
      <SignIn
        appearance={{
          layout: {
            logoPlacement: 'none',
            socialButtonsVariant: 'blockButton',
            showOptionalFields: false
          },
          variables: {
            colorPrimary: '#8b5cf6',
            colorBackground: 'transparent',
            colorInputBackground: 'rgba(15, 23, 42, 0.75)',
            colorInputText: '#f8fafc',
            colorText: '#f8fafc',
            colorTextSecondary: '#cbd5f5',
            borderRadius: '18px',
            fontSize: '16px',
            fontFamily: '"Manrope", "Inter", system-ui, sans-serif'
          },
          elements: {
            rootBox:
              'w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/70 px-8 py-10 shadow-xl backdrop-blur-sm max-[420px]:px-6 max-[420px]:py-8',
            card: 'flex w-full flex-col gap-6 bg-transparent p-0 shadow-none',
            header: 'flex flex-col gap-2 text-left',
            headerTitle: 'text-3xl font-semibold text-white',
            headerSubtitle: 'text-base text-slate-300',
            socialButtons: 'flex flex-col gap-3',
            socialButtonsIconButton:
              'bg-slate-800/80 border border-white/10 text-white transition-colors duration-200 hover:border-white/20 hover:bg-slate-800',
            divider: 'flex items-center gap-3 text-slate-400',
            dividerLine: 'flex-1 bg-white/10',
            dividerText: 'text-xs font-semibold uppercase tracking-[0.3em]',
            form: 'flex flex-col gap-4 text-left',
            formField: 'flex flex-col gap-2',
            formFieldLabel: 'text-sm font-medium text-slate-300',
            formFieldInput:
              'bg-slate-900/60 border border-white/10 text-white placeholder:text-slate-400 focus:border-accent-purple/70 focus:ring-0 focus-visible:ring-0',
            formButtonPrimary:
              'mt-2 w-full rounded-xl bg-gradient-to-r from-accent-purple to-accent-blue text-sm font-semibold tracking-wide transition-colors duration-200 hover:from-accent-purple hover:to-accent-blue/90',
            footer: 'flex flex-col items-center gap-2 text-center text-sm text-slate-300',
            footerActionLink: 'text-accent-purple hover:text-accent-blue transition-colors',
            identityPreview: 'rounded-xl border border-white/10 bg-slate-900/80',
            identityPreviewTitle: 'text-slate-300',
            identityPreviewEditButton: 'text-accent-purple hover:text-accent-blue transition-colors'
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
