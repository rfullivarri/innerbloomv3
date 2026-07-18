import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNativeCapacitorPlatform } from './capacitor';

const TRUSTED_INTERNAL_HOSTS = new Set([
  'innerbloomjourney.org',
  'www.innerbloomjourney.org',
  'localhost',
]);

function isPlainPrimaryClick(event: MouseEvent): boolean {
  return event.button === 0
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey;
}

function isTrustedInternalUrl(url: URL): boolean {
  if (url.origin === window.location.origin) {
    return true;
  }

  return (url.protocol === 'http:' || url.protocol === 'https:')
    && TRUSTED_INTERNAL_HOSTS.has(url.hostname.toLowerCase());
}

/**
 * Capacitor serves the native shell from its own local WebView origin, while
 * React Router links can resolve against the production site origin. Those
 * links still belong to the app and must stay inside the Capacitor WebView.
 */
export function NativeInternalNavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeCapacitorPlatform()) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (!isPlainPrimaryClick(event)) {
        return;
      }

      const element = event.target instanceof Element
        ? event.target.closest('a[href]')
        : null;
      if (!(element instanceof HTMLAnchorElement)) {
        return;
      }

      if (element.hasAttribute('download') || element.target === '_blank') {
        return;
      }

      let url: URL;
      try {
        url = new URL(element.href, window.location.href);
      } catch {
        return;
      }

      if (!isTrustedInternalUrl(url)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      navigate(`${url.pathname}${url.search}${url.hash}` || '/');
    };

    // Window capture runs before the document-level external-link bridge.
    window.addEventListener('click', handleClick, true);
    return () => window.removeEventListener('click', handleClick, true);
  }, [navigate]);

  return null;
}
