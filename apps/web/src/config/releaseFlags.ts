export const SHOW_BILLING_UI = import.meta.env.VITE_SHOW_BILLING_UI === 'true';

export const SHOW_LANDING_PRICING = import.meta.env.VITE_SHOW_LANDING_PRICING === 'true';

export const SHOW_LANDING_BACKGROUND_SELECTOR =
  import.meta.env.VITE_SHOW_LANDING_BACKGROUND_SELECTOR !== 'false';

export const SHOW_NATIVE_TEST_NOTIFICATION =
  Boolean(import.meta.env.DEV) && import.meta.env.VITE_SHOW_NATIVE_TEST_NOTIFICATION !== 'false';
