import type { Theme } from '@clerk/types';

// Slightly narrower auth card to keep the login UI compact on small screens.
export const AUTH_LOGIN_MAX_WIDTH = 'max-w-[450px]';

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
  rootBox: `w-full min-w-0 ${AUTH_LOGIN_MAX_WIDTH} mx-auto`,
  cardBox: `w-full min-w-0 ${AUTH_LOGIN_MAX_WIDTH} mx-auto flex justify-center`,
  card:
    `mx-auto flex w-full min-w-0 ${AUTH_LOGIN_MAX_WIDTH} flex-col gap-4 overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-3 shadow-[0_25px_80px_rgba(15,23,42,0.35)] backdrop-blur-2xl sm:rounded-[28px] sm:p-4 md:p-5`,
  header: 'hidden',
  socialButtons: 'hidden',
  divider: 'hidden',
  form: 'flex flex-col gap-3 text-left',
  formField: 'flex flex-col gap-1.5',
  formFieldLabel: 'text-[11px] font-medium text-white/75 sm:text-xs',
  formFieldInput:
    'rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-[15px] leading-6 text-white placeholder:text-white/40 shadow-[0_6px_20px_rgba(99,102,241,0.15)] focus:border-white/40 focus:outline-none focus-visible:ring-0',
  formFieldInputShowPasswordButton: 'text-sm text-white/60 hover:text-white',
  formButtonPrimary: `${gradientButtonClass} h-11 text-xs tracking-[0.16em] sm:h-12 sm:text-sm`,
  footer:
    'mt-4 w-full max-w-full flex flex-col items-center gap-1 rounded-2xl border border-white/15 bg-white/10 px-3 py-2.5 text-center text-[9px] text-white/60 backdrop-blur-xl shadow-none sm:px-4',
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
