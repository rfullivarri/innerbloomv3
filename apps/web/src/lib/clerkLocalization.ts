import type { LocalizationResource } from '@clerk/types';
import type { AuthLanguage } from './authLanguage';

const clerkLocalizationByLanguage: Record<AuthLanguage, LocalizationResource> = {
  en: {
    locale: 'en-US'
  },
  es: {
    locale: 'es-ES',
    formFieldLabel__firstName: 'Nombre',
    formFieldLabel__lastName: 'Apellido',
    formFieldLabel__emailAddress: 'Correo electrónico',
    formFieldLabel__password: 'Contraseña',
    formFieldHintText__optional: 'Opcional',
    formFieldInputPlaceholder__firstName: 'Nombre',
    formFieldInputPlaceholder__lastName: 'Apellido',
    formFieldInputPlaceholder__emailAddress: 'Ingresá tu correo electrónico',
    formFieldInputPlaceholder__password: 'Ingresá tu contraseña',
    formButtonPrimary: 'Continuar',
    signUp: {
      start: {
        actionText: '¿Ya tenés una cuenta?',
        actionLink: 'Iniciá sesión'
      }
    },
    signIn: {
      start: {
        actionText: '¿No tenés una cuenta?',
        actionLink: 'Creá tu cuenta'
      }
    }
  }
};

export function getClerkLocalization(language: AuthLanguage): LocalizationResource {
  return clerkLocalizationByLanguage[language];
}
