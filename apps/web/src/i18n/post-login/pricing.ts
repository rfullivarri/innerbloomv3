import type { PostLoginTranslations } from './types';

export const pricingTranslations = {
  'pricing.page.title': { es: 'Planes y pricing', en: 'Plans & pricing' },
  'pricing.page.subtitle': {
    es: 'Elegí tu plan desde el dashboard. Todos los planes comienzan con 2 meses gratis y luego se aplica el importe del plan elegido.',
    en: 'Pick your plan from the dashboard. Every plan starts with a 2-month free trial and then applies the selected plan price.',
  },
  'pricing.plan.select': { es: 'Seleccionar', en: 'Select' },
  'pricing.plan.selected': { es: 'Seleccionado', en: 'Selected' },
  'pricing.feedback.updateSuccess': { es: 'Plan actualizado a {{planId}}.', en: 'Plan updated to {{planId}}.' },
  'pricing.feedback.updateError': { es: 'No se pudo actualizar el plan. Intentá nuevamente.', en: 'Could not update plan. Try again.' },
} satisfies PostLoginTranslations;
