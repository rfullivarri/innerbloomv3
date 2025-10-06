import { SignIn } from '@clerk/clerk-react';
import { DASHBOARD_PATH } from '../config/auth';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-surface px-6 py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-12 h-80 w-80 rounded-full bg-accent-purple/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-accent-blue/20 blur-[140px]" />
        <div className="absolute left-1/2 top-1/2 h-40 w-72 -translate-x-1/2 -translate-y-1/2 rotate-12 rounded-3xl border border-white/10 bg-gradient-to-r from-white/5 via-white/0 to-white/5" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="pointer-events-none absolute -inset-[1px] rounded-[26px] bg-gradient-to-br from-accent-purple/40 via-transparent to-accent-blue/40 blur" />

        <SignIn
          appearance={{
            layout: {
              logoPlacement: 'none',
              socialButtonsVariant: 'iconButton',
              showOptionalFields: false
            },
            variables: {
              colorPrimary: '#8b5cf6',
              colorBackground: 'rgba(24, 38, 64, 0.9)',
              colorInputBackground: 'rgba(15, 23, 42, 0.65)',
              colorInputText: '#f8fafc',
              colorText: '#f8fafc',
              colorTextSecondary: '#cbd5f5',
              borderRadius: '24px',
              fontSize: '16px',
              fontFamily: '"Manrope", "Inter", system-ui, sans-serif'
            },
            elements: {
              rootBox: 'glass-card border border-white/10 bg-surface-elevated/80 backdrop-blur-2xl',
              card: 'bg-transparent shadow-[0_25px_80px_-32px_rgba(56,189,248,0.35)]',
              headerTitle: 'text-2xl font-semibold text-white',
              headerSubtitle: 'text-sm text-text-muted',
              socialButtons: 'grid grid-cols-2 gap-3',
              socialButtonsIconButton: 'bg-surface-muted/70 border border-white/10 text-white hover:border-white/20 hover:bg-surface-muted/90 transition',
              dividerLine: 'bg-white/10',
              dividerText: 'text-xs uppercase tracking-[0.2em] text-text-muted',
              formFieldInput:
                'bg-surface-muted/70 border border-white/10 text-white placeholder:text-text-subtle focus:border-accent-purple/60 focus:ring-0 focus-visible:ring-0',
              formFieldLabel: 'text-sm font-medium text-text-muted',
              formButtonPrimary:
                'bg-gradient-to-r from-accent-purple to-accent-blue text-sm font-semibold tracking-wide uppercase hover:opacity-90 transition',
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
  );
}
