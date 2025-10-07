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

      <SignIn
        appearance={{
          layout: {
            logoPlacement: 'none',
            socialButtonsVariant: 'iconButton',
            showOptionalFields: false
          },
          variables: {
            colorPrimary: '#8b5cf6',
            colorBackground: 'transparent',
            colorInputBackground: 'rgba(15, 23, 42, 0.65)',
            colorInputText: '#f8fafc',
            colorText: '#f8fafc',
            colorTextSecondary: '#cbd5f5',
            borderRadius: '26px',
            fontSize: '16px',
            fontFamily: '"Manrope", "Inter", system-ui, sans-serif'
          },
          elements: {
            rootBox:
              'relative z-10 mx-auto w-full max-w-lg overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(150deg,rgba(17,24,39,0.94),rgba(12,19,38,0.82))] px-10 py-12 text-left shadow-[0_35px_120px_-45px_rgba(56,189,248,0.85)] backdrop-blur-3xl max-[420px]:px-6 max-[420px]:py-8 before:pointer-events-none before:absolute before:inset-x-12 before:-top-24 before:h-48 before:rounded-full before:bg-accent-purple/30 before:blur-3xl before:content-[""] before:z-0 after:pointer-events-none after:absolute after:inset-x-16 after:-bottom-32 after:h-56 after:rounded-full after:bg-accent-blue/25 after:blur-[120px] after:content-[""] after:z-0',
            card: 'relative z-10 flex w-full flex-col gap-6 bg-transparent p-0 shadow-none backdrop-blur-0',
            header: 'relative z-10 flex flex-col gap-2',
            headerTitle: 'text-3xl font-semibold text-white tracking-tight',
            headerSubtitle: 'text-base text-text-muted',
            socialButtons: 'relative z-10 grid grid-cols-2 gap-4',
            socialButtonsIconButton:
              'bg-surface-muted/80 border border-white/10 text-white transition-all duration-200 hover:border-white/20 hover:bg-surface-muted hover:shadow-lg hover:shadow-accent-blue/20',
            divider: 'relative z-10 flex items-center gap-3 text-text-muted',
            dividerLine: 'flex-1 bg-white/10',
            dividerText: 'text-xs font-medium uppercase tracking-[0.4em] text-text-muted',
            form: 'relative z-10 flex flex-col gap-4',
            formField: 'flex flex-col gap-2',
            formFieldLabel: 'text-sm font-medium text-text-muted',
            formFieldInput:
              'bg-surface-muted/70 border border-white/10 text-white placeholder:text-text-subtle focus:border-accent-purple/60 focus:ring-0 focus-visible:ring-0 focus:shadow-[0_0_0_3px_rgba(139,92,246,0.15)]',
            formButtonPrimary:
              'relative z-10 mt-2 w-full bg-gradient-to-r from-accent-purple via-accent-purple/90 to-accent-blue text-sm font-semibold uppercase tracking-[0.2em] transition-all duration-200 hover:from-accent-purple hover:to-accent-blue/90 hover:shadow-[0_18px_40px_-15px_rgba(139,92,246,0.75)]',
            footer: 'relative z-10 flex flex-col items-center gap-2 text-center',
            footerActionText: 'text-text-muted',
            footerActionLink: 'text-accent-purple hover:text-accent-blue transition-colors',
            identityPreview: 'relative z-10 rounded-3xl border border-white/10 bg-surface-muted/60 backdrop-blur-xl',
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
  );
}
