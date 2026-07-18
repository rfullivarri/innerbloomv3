import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNativeCapacitorPlatform } from './capacitor';

function isPlainPrimaryClick(event: MouseEvent): boolean {
  return event.button === 0
    && !event.altKey
    && !event.ctrlKey
    && !event.metaKey
    && !event.shiftKey;
}

/**
 * Capacitor can serve the app from the production HTTPS origin. In that setup,
 * React Router links resolve to absolute https://innerbloomjourney.org URLs.
 * The generic external-link bridge used to classify every HTTP(S) URL as
 * external and opened those routes in a Chrome Custom Tab.
 *
 * This bridge claims same-origin links first and routes them through React
 * Router, while leaving true external links to the existing browser bridge.
 */
export function NativeInternalNavigationBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeCapacitorPlatform()) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || !isPlainPrimaryClick(event)) {
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

      if (url.origin !== window.location.origin) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      navigate(`${url.pathname}${url.search}${url.hash}` || '/');
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [navigate]);

  return null;
}
