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
  alwaysOnLabel: string;
  alwaysOnDescription: string;
  analyticsLabel: string;
  analyticsDescription: string;
  reject: string;
  accept: string;
  close: string;
}> = {
  en: {
    title: 'Cookie preferences',
    summary: 'We only use optional analytics cookies to understand landing performance and improve experience.',
    alwaysOnLabel: 'Necessary cookies',
    alwaysOnDescription: 'Always active. Required for core site functionality and security.',
    analyticsLabel: 'Analytics cookies',
    analyticsDescription: 'Optional. Enable Google Analytics 4 for page views, scroll depth, and CTA interactions.',
    reject: 'Reject analytics',
    accept: 'Accept analytics',
    close: 'Close preferences',
  },
  es: {
    title: 'Preferencias de cookies',
    summary: 'Solo usamos cookies analíticas opcionales para entender el rendimiento de la landing y mejorar la experiencia.',
    alwaysOnLabel: 'Cookies necesarias',
    alwaysOnDescription: 'Siempre activas. Son requeridas para funcionalidades base y seguridad del sitio.',
    analyticsLabel: 'Cookies analíticas',
    analyticsDescription: 'Opcionales. Habilitan Google Analytics 4 para page views, scroll depth y clicks en CTAs.',
    reject: 'Rechazar analíticas',
    accept: 'Aceptar analíticas',
    close: 'Cerrar preferencias',
  },
};

export function CookieConsentBanner({ language, isOpen, hasDecision, onAccept, onReject, onClose }: CookieConsentBannerProps) {
  if (!isOpen) {
    return null;
  }

  const copy = COPY[language];

  return (
    <aside className="cookie-consent" role="dialog" aria-live="polite" aria-label={copy.title}>
      <div className="cookie-consent__header">
        <h2>{copy.title}</h2>
        {hasDecision ? (
          <button
            type="button"
            className="cookie-consent__close"
            onClick={onClose}
            aria-label={copy.close}
          >
            ✕
          </button>
        ) : null}
      </div>

      <p className="cookie-consent__summary">{copy.summary}</p>

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

      <div className="cookie-consent__actions">
        <button type="button" className="cookie-consent__button cookie-consent__button--ghost" onClick={onReject}>
          {copy.reject}
        </button>
        <button type="button" className="cookie-consent__button cookie-consent__button--primary" onClick={onAccept}>
          {copy.accept}
        </button>
      </div>
    </aside>
  );
}
