import { useEffect, useState } from 'react';
import { type Language } from '../../content/officialLandingContent';

type CookieConsentBannerProps = {
  language: Language;
  isOpen: boolean;
  hasDecision: boolean;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
};

const COPY: Record<Language, {
  title: string;
  summary: string;
  configureIntro: string;
  alwaysOnLabel: string;
  alwaysOnDescription: string;
  analyticsLabel: string;
  analyticsDescription: string;
  acceptAll: string;
  rejectNonEssential: string;
  configure: string;
  closePreferences: string;
}> = {
  en: {
    title: 'Cookies',
    summary: 'We use cookies to make this site work and to understand how people use the landing.',
    configureIntro: 'You can accept all, reject non-essential cookies, or customize your choice.',
    alwaysOnLabel: 'Necessary cookies',
    alwaysOnDescription: 'Always active. Required for core site functionality and security.',
    analyticsLabel: 'Analytics cookies',
    analyticsDescription: 'Optional. They help us measure visits, scroll behavior, and CTA interactions.',
    acceptAll: 'Accept all',
    rejectNonEssential: 'Reject non-essential',
    configure: 'Configure cookies',
    closePreferences: 'Close preferences',
  },
  es: {
    title: 'Cookies',
    summary: 'Usamos cookies para que el sitio funcione correctamente y para entender cómo se usa esta landing.',
    configureIntro: 'Puedes aceptar todas, rechazar las no esenciales o configurar tu elección.',
    alwaysOnLabel: 'Cookies necesarias',
    alwaysOnDescription: 'Siempre activas. Son requeridas para funcionalidades base y seguridad del sitio.',
    analyticsLabel: 'Cookies analíticas',
    analyticsDescription: 'Opcionales. Nos ayudan a medir visitas, scroll y clics en botones clave.',
    acceptAll: 'Aceptar todas',
    rejectNonEssential: 'Rechazar no esenciales',
    configure: 'Configurar cookies',
    closePreferences: 'Cerrar preferencias',
  },
};

export function CookieConsentBanner({ language, isOpen, hasDecision, onAccept, onReject, onClose }: CookieConsentBannerProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsConfigOpen(false);
      return;
    }

    if (!hasDecision) {
      setIsConfigOpen(false);
    }
  }, [hasDecision, isOpen]);

  if (!isOpen) {
    return null;
  }

  const copy = COPY[language];

  return (
    <aside className="cookie-consent" role="dialog" aria-live="polite" aria-label={copy.title}>
      <div className="cookie-consent__header">
        <h2>{copy.title}</h2>
        {hasDecision || isConfigOpen ? (
          <button
            type="button"
            className="cookie-consent__close"
            onClick={onClose}
            aria-label={copy.closePreferences}
          >
            ✕
          </button>
        ) : null}
      </div>

      <p className="cookie-consent__summary">{copy.summary}</p>
      <p className="cookie-consent__summary">{copy.configureIntro}</p>

      {isConfigOpen ? (
        <div className="cookie-consent__categories">
          <div className="cookie-consent__category">
            <div>
              <p className="cookie-consent__category-title">{copy.alwaysOnLabel}</p>
              <p className="cookie-consent__category-copy">{copy.alwaysOnDescription}</p>
            </div>
            <span className="cookie-consent__badge">Always on</span>
          </div>

          <div className="cookie-consent__category">
            <div>
              <p className="cookie-consent__category-title">{copy.analyticsLabel}</p>
              <p className="cookie-consent__category-copy">{copy.analyticsDescription}</p>
            </div>
            <span className="cookie-consent__badge cookie-consent__badge--optional">Optional</span>
          </div>
        </div>
      ) : null}

      <div className="cookie-consent__actions">
        <button type="button" className="cookie-consent__button cookie-consent__button--primary" onClick={onAccept}>
          {copy.acceptAll}
        </button>
        <button type="button" className="cookie-consent__button cookie-consent__button--ghost" onClick={onReject}>
          {copy.rejectNonEssential}
        </button>
        <button
          type="button"
          className="cookie-consent__button cookie-consent__button--ghost"
          onClick={() => setIsConfigOpen((prev) => !prev)}
        >
          {copy.configure}
        </button>
      </div>
    </aside>
  );
}
