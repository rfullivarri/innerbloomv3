import type { Theme } from '@clerk/types';

// Allow the auth card to stretch edge-to-edge on small screens while keeping a comfortable max width on larger ones.
export const AUTH_LOGIN_MAX_WIDTH = 'max-w-full sm:max-w-[480px]';

const baseLayout = {
  logoPlacement: 'none' as const,
  socialButtonsVariant: 'blockButton' as const,
  unsafe_disableDevelopmentModeWarnings: true
};

const baseVariables = {
  colorPrimary: '#7c3aed',
  colorBackground: 'transparent',
  colorInputBackground: 'rgba(255, 255, 255, 0.14)',
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
    'mt-2 w-full max-w-none rounded-xl border border-white/10 bg-white/5 !px-2 !py-1 shadow-none',

  // 1) CONTENEDOR 1 (cl-footerAction__signIn): reducir alto y aumentar ancho
  footerAction:
    '!flex !w-full !max-w-none items-center justify-start gap-1 !px-2 !py-0 text-[10px] !leading-[12px] text-white/55',
  footerActionText:
    '!whitespace-nowrap text-white/55',
  footerActionLink:
    '!whitespace-nowrap font-semibold text-white/80 underline underline-offset-2 hover:text-white',

  // 2) CONTENEDOR 2 (“Secured by clerk”): reducir alto y aumentar ancho
  footerPages:
    '!mt-0.5 !flex !w-full !max-w-none items-center justify-center gap-1 !px-2 !py-0 text-[9px] !leading-[11px] text-white/40',
  footerPageLink:
    'inline-flex items-center gap-1 text-white/40 hover:text-white/60',

  // Fallbacks
  footerTitle: 'hidden',
  footerSubtitle: 'hidden',
  formResendCodeLink: 'text-[7px] text-white hover:text-white/80',
  identityPreview: 'rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl text-white/80',
  identityPreviewTitle: 'text-white',
  identityPreviewSubtitle: 'text-white/70',
  identityPreviewEditButton: 'text-white hover:text-white/80',

  

  
  //footer:  'mt-3 w-full max-w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-1.5 text-center text-[9px] leading-4 text-white/60 shadow-none',
  //footerTitle: 'inline text-white/70',
  //footerSubtitle: 'hidden',
  //footerActionText: 'inline text-white/60',
  //footerActionLink: 'inline whitespace-nowrap font-semibold text-white/80 hover:text-white underline-offset-4',
  //formResendCodeLink: 'text-sm text-white hover:text-white/80',
  //identityPreview: 'rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl text-white/80',
  //identityPreviewTitle: 'text-white',
  //identityPreviewSubtitle: 'text-white/70',
  //identityPreviewEditButton: 'text-white hover:text-white/80''
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
