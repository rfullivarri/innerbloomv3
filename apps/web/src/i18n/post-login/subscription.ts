import type { PostLoginTranslations } from './types';

export const subscriptionTranslations = {
  'subscription.page.title': { es: 'Suscripción', en: 'Subscription' },
  'subscription.loading': { es: 'Cargando suscripción...', en: 'Loading subscription...' },
  'subscription.locked.title': { es: 'Tu suscripción está inactiva', en: 'Your subscription is inactive' },
  'subscription.locked.description': { es: 'Activá un plan para volver a acceder a las funciones premium.', en: 'Activate a plan to regain access to premium features.' },
  'subscription.action.close': { es: 'Cerrar', en: 'Close' },
  'subscription.action.viewPricing': { es: 'Ver pricing', en: 'See pricing' },
  'subscription.action.changePlan': { es: 'Cambiar plan', en: 'Change plan' },
  'subscription.action.cancel': { es: 'Cancelar suscripción', en: 'Cancel subscription' },
  'subscription.label.currentPlan': { es: 'Plan actual', en: 'Current plan' },
  'subscription.label.status': { es: 'Estado', en: 'Status' },
  'subscription.value.notAvailable': { es: 'No disponible', en: 'Not available' },
  'subscription.value.noPlan': { es: 'Sin plan', en: 'No plan' },
  'subscription.value.undefined': { es: 'No definido', en: 'Undefined' },
  'subscription.value.trialEnds': { es: 'Fin de trial', en: 'Trial ends' },
  'subscription.value.nextRenewal': { es: 'Próxima renovación', en: 'Next renewal' },
} satisfies PostLoginTranslations;
