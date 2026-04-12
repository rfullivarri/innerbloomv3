import type { Theme } from '@clerk/types';

// Keep auth widgets fluid across breakpoints so desktop side margins match the tighter mobile framing.
export const AUTH_LOGIN_MAX_WIDTH = 'max-w-full';

const baseLayout = {
  logoPlacement: 'none' as const,
  socialButtonsVariant: 'blockButton' as const,
  unsafe_disableDevelopmentModeWarnings: true
};

const baseVariables = {
  colorPrimary: '#7c3aed',
  colorBackground: 'transparent',
  colorInputBackground: 'rgba(255, 255, 255, 0.1)',
  colorInputText: '#f8fafc',
  colorText: '#f8fafc',
  colorTextSecondary: 'rgba(226, 232, 240, 0.8)',
  borderRadius: '18px',
  fontSize: '16px',
  fontFamily: '"Manrope", "Inter", system-ui, sans-serif'
};

const gradientButtonClass = 'ib-primary-button mt-3 h-12 w-full';

const baseElements = {
  rootBox: `w-full min-w-0 ${AUTH_LOGIN_MAX_WIDTH} mx-auto`,
  cardBox: `w-full min-w-0 ${AUTH_LOGIN_MAX_WIDTH} mx-auto flex justify-center`,
  card:
    `mx-auto flex w-full min-w-0 ${AUTH_LOGIN_MAX_WIDTH} flex-col gap-4 overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-3 shadow-[0_20px_50px_rgba(7,12,32,0.24)] backdrop-blur-[18px] sm:rounded-[30px] sm:p-4 md:p-5`,
  header: 'hidden',
  socialButtons: 'hidden',
  socialButtonsBlockButton: 'hidden',
  socialButtonsProviderIcon: 'hidden',
  dividerRow: 'hidden !my-0 !py-0 !h-0 !min-h-0',
  dividerLine: 'hidden',
  dividerText: 'hidden',
  divider: 'hidden',
  form: 'mt-0 pt-0 flex flex-col gap-3 text-left',
  formField: 'flex flex-col gap-1.5',
  formFieldLabel: 'text-[11px] font-medium text-white/72 sm:text-xs',
  formFieldInput:
    'rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.11),rgba(255,255,255,0.07))] px-3 py-2.5 text-base leading-6 text-white placeholder:text-white/36 shadow-[0_10px_28px_rgba(31,41,88,0.18)] focus:border-violet-300/45 focus:outline-none focus-visible:ring-0',
  otpCodeFieldInput:
    'h-9 w-9 rounded-full border-2 border-violet-200/50 bg-white/95 text-base font-semibold text-slate-900 shadow-[0_10px_24px_rgba(15,23,42,0.3)] focus:border-violet-300 focus:shadow-[0_0_0_3px_rgba(167,139,250,0.22)] sm:h-11 sm:w-11 sm:text-lg',
  otpCodeFieldInputs: 'flex w-full items-center justify-center gap-2 overflow-hidden px-1 sm:gap-3',
  formFieldInputShowPasswordButton: 'text-sm text-white/60 hover:text-white',
  formButtonPrimary:
    `${gradientButtonClass} w-full rounded-full font-display text-sm font-semibold ` +
    '!appearance-none !ring-0',

  footer:
    'mt-2 w-full max-w-none rounded-2xl bg-[linear-gradient(135deg,rgba(122,138,196,0.2),rgba(108,63,197,0.2))] !px-2 !py-1 shadow-[0_18px_40px_rgba(9,16,40,0.24)] backdrop-blur-md',

  // 1) CONTENEDOR 1 (cl-footerAction__signIn): reducir alto y aumentar ancho
  footerAction:
    '!flex !w-full !max-w-none items-center justify-start gap-1 rounded-xl bg-white/[0.06] !px-3 !py-1 text-[10px] !leading-[12px] text-white/60 backdrop-blur-sm',
  footerActionText:
    '!whitespace-nowrap text-white/55',
  footerActionLink:
    '!whitespace-nowrap font-semibold text-white/80 underline underline-offset-2 hover:text-white',

  // 2) CONTENEDOR 2 (“Secured by clerk”): reducir alto y aumentar ancho
  footerPages:
    '!mt-1 !flex !w-full !max-w-none items-center justify-center gap-1 rounded-xl bg-white/[0.06] !px-3 !py-1 text-[9px] !leading-[11px] text-white/45 backdrop-blur-sm',
  footerPageLink:
    'inline-flex items-center gap-1 text-white/40 hover:text-white/60',

  // Fallbacks
  footerTitle: 'hidden',
  footerSubtitle: 'hidden',
  formResendCodeLink: 'text-[7px] text-white hover:text-white/80',
  identityPreview: 'rounded-2xl border border-white/10 bg-white/[0.08] backdrop-blur-xl text-white/80',
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
