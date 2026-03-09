import type { PostLoginTranslations } from './types';

export const subscriptionTranslations = {
  'subscription.page.title': { es: 'Suscripción', en: 'Subscription' },
  'subscription.loading': { es: 'Cargando suscripción...', en: 'Loading subscription...' },
  'subscription.inactive.title': { es: 'Tu suscripción está inactiva', en: 'Your subscription is inactive' },
  'subscription.inactive.body': { es: 'Activá un plan para volver a acceder a las funciones premium.', en: 'Activate a plan to regain access to premium features.' },
  'subscription.actions.close': { es: 'Cerrar', en: 'Close' },
  'subscription.actions.viewPricing': { es: 'Ver pricing', en: 'See pricing' },
  'subscription.actions.changePlan': { es: 'Cambiar plan', en: 'Change plan' },
  'subscription.actions.cancel': { es: 'Cancelar suscripción', en: 'Cancel subscription' },
  'subscription.renewalDate': { es: 'Próxima renovación', en: 'Next renewal' },
  'subscription.error.load': { es: 'No pudimos cargar tu suscripción. Intentá nuevamente.', en: 'We could not load your subscription. Please try again.' },
  'subscription.error.cancel': { es: 'No pudimos cancelar tu suscripción. Intentá nuevamente.', en: 'We could not cancel your subscription. Please try again.' },
  'subscription.success.cancel': { es: 'Tu suscripción fue cancelada correctamente.', en: 'Your subscription was cancelled successfully.' },

  // Legacy keys kept for backwards compatibility.
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
