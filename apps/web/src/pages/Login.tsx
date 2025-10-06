import { SignIn } from '@clerk/clerk-react';
import { DASHBOARD_PATH } from '../config/auth';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#040b1a] px-6 py-16 text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.28),transparent_58%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(56,189,248,0.24),transparent_60%)]" />
        <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-accent-purple/35 blur-[140px]" />
        <div className="absolute bottom-10 right-0 h-80 w-80 rounded-full bg-accent-blue/30 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(148,163,184,0.12),transparent_65%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_40%)]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="pointer-events-none absolute inset-0 rounded-[36px] bg-gradient-to-br from-accent-purple/50 via-transparent to-accent-blue/50 opacity-70 blur-2xl" />

        <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-surface-elevated/80 shadow-[0_35px_120px_-45px_rgba(56,189,248,0.85)] backdrop-blur-3xl">
          <div className="pointer-events-none absolute -inset-px rounded-[30px] border border-white/20" />
          <div className="pointer-events-none absolute inset-x-10 -top-24 h-48 rounded-full bg-accent-purple/30 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-14 bottom-[-5rem] h-56 rounded-full bg-accent-blue/30 blur-3xl" />

          <SignIn
            appearance={{
              layout: {
                logoPlacement: 'none',
                socialButtonsVariant: 'iconButton',
                showOptionalFields: false
              },
              variables: {
                colorPrimary: '#8b5cf6',
                colorBackground: 'rgba(24, 38, 64, 0.75)',
                colorInputBackground: 'rgba(15, 23, 42, 0.7)',
                colorInputText: '#f8fafc',
                colorText: '#f8fafc',
                colorTextSecondary: '#cbd5f5',
                borderRadius: '24px',
                fontSize: '16px',
                fontFamily: '"Manrope", "Inter", system-ui, sans-serif'
              },
              elements: {
                rootBox:
                  'relative z-10 flex w-full flex-col gap-8 px-10 py-12 max-[420px]:px-6 max-[420px]:py-8',
                card: 'bg-transparent shadow-none border-none p-0 gap-6',
                headerTitle: 'text-3xl font-semibold text-white tracking-tight',
                headerSubtitle: 'text-base text-text-muted',
                socialButtons: 'grid grid-cols-2 gap-4',
                socialButtonsIconButton:
                  'bg-surface-muted/80 border border-white/10 text-white transition-all duration-200 hover:border-white/20 hover:bg-surface-muted hover:shadow-lg hover:shadow-accent-blue/20',
                dividerLine: 'bg-white/10',
                dividerText: 'text-xs font-medium uppercase tracking-[0.4em] text-text-muted',
                formFieldLabel: 'text-sm font-medium text-text-muted',
                formFieldInput:
                  'bg-surface-muted/70 border border-white/10 text-white placeholder:text-text-subtle focus:border-accent-purple/60 focus:ring-0 focus-visible:ring-0 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)]',
                formButtonPrimary:
                  'mt-2 bg-gradient-to-r from-accent-purple via-accent-purple/90 to-accent-blue text-sm font-semibold uppercase tracking-[0.2em] transition-all duration-200 hover:from-accent-purple hover:to-accent-blue/90 hover:shadow-[0_18px_40px_-15px_rgba(139,92,246,0.75)]',
                footerActionText: 'text-text-muted',
                footerActionLink: 'text-accent-purple hover:text-accent-blue transition-colors',
                identityPreviewTitle: 'text-text-muted',
                identityPreviewEditButton: 'text-accent-purple hover:text-accent-blue transition-colors'
              }
            }}
            routing="path"
            path="/login"
            signUpUrl="/sign-up"
            fallbackRedirectUrl={DASHBOARD_PATH}
          />
        </div>
      </div>
    </div>
  );
}
