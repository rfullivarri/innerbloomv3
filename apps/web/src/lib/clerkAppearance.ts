import type { Theme } from '@clerk/types';

const baseLayout = {
  logoPlacement: 'none' as const,
  socialButtonsVariant: 'blockButton' as const,
  unsafe_disableDevelopmentModeWarnings: true
};

const baseVariables = {
  colorPrimary: '#7c3aed',
  colorBackground: 'transparent',
  colorInputBackground: 'rgba(15, 23, 42, 0.55)',
  colorInputText: '#f8fafc',
  colorText: '#f8fafc',
  colorTextSecondary: 'rgba(226, 232, 240, 0.8)',
  borderRadius: '18px',
  fontSize: '16px',
  fontFamily: '"Manrope", "Inter", system-ui, sans-serif'
};

const gradientButtonClass =
  'mt-3 inline-flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#8b5cf6] via-[#6366f1] to-[#0ea5e9] text-sm font-semibold uppercase tracking-[0.18em] text-white transition-all duration-200 hover:from-[#8b5cf6] hover:to-[#0ea5e9]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 sm:w-auto';

const baseElements = {
  rootBox: '!w-full !min-w-0 !max-w-full w-full min-w-0 max-w-full',
  card:
    'mx-auto flex !w-full !min-w-0 !max-w-full w-full min-w-0 max-w-full flex-col gap-6 overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-4 shadow-[0_25px_80px_rgba(15,23,42,0.35)] backdrop-blur-2xl md:!max-w-[420px] sm:rounded-[28px] sm:p-6 md:p-8',
  header: 'hidden',
  socialButtons: 'hidden',
  divider: 'hidden',
  form: 'flex flex-col gap-4 text-left',
  formField: 'flex flex-col gap-2',
  formFieldLabel: 'text-xs font-medium text-white/75 sm:text-sm',
  formFieldInput:
    'rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-[16px] leading-6 text-white placeholder:text-white/40 shadow-[0_6px_20px_rgba(99,102,241,0.15)] focus:border-white/40 focus:outline-none focus-visible:ring-0',
  formFieldInputShowPasswordButton: 'text-sm text-white/60 hover:text-white',
  formButtonPrimary: gradientButtonClass,
  footer:
    'mt-6 w-full max-w-full flex flex-col items-center gap-1 rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center text-xs text-white/60 backdrop-blur-xl shadow-none sm:px-4',
  footerTitle: 'text-white/70',
  footerSubtitle: 'text-white/50',
  footerActionText: 'text-white/50',
  footerActionLink: 'font-semibold text-white/70 hover:text-white underline-offset-4',
  formResendCodeLink: 'text-sm text-white hover:text-white/80',
  identityPreview: 'rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl text-white/80',
  identityPreviewTitle: 'text-white',
  identityPreviewSubtitle: 'text-white/70',
  identityPreviewEditButton: 'text-white hover:text-white/80'
};

type AppearanceOverrides = {
  layout?: Record<string, unknown>;
  variables?: Record<string, string>;
  elements?: Record<string, string>;
};

export function createAuthAppearance(overrides: AppearanceOverrides = {}): Theme {
  return {
    layout: { ...baseLayout, ...overrides.layout },
    variables: { ...baseVariables, ...overrides.variables },
    elements: { ...baseElements, ...overrides.elements }
  } as Theme;
}

export function getGradientButtonClass() {
  return gradientButtonClass;
}
