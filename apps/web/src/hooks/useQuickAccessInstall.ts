import { useCallback, useEffect, useMemo, useState } from 'react';

export type QuickAccessToastTone = 'success' | 'error' | 'info';

interface QuickAccessToast {
  tone: QuickAccessToastTone;
  message: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface UseQuickAccessInstallResult {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isStandalone: boolean;
  canPromptInstall: boolean;
  iosInstructionsOpen: boolean;
  toast: QuickAccessToast | null;
  setToast: (toast: QuickAccessToast | null) => void;
  onQuickAccessClick: () => Promise<void>;
  closeIosInstructions: () => void;
}

const MOBILE_USER_AGENT_REGEX = /Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i;

function detectStandalone() {
  if (typeof window === 'undefined') {
    return false;
  }
  return (
    window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function useQuickAccessInstall(): UseQuickAccessInstallResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosInstructionsOpen, setIosInstructionsOpen] = useState(false);
  const [toast, setToast] = useState<QuickAccessToast | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => detectStandalone());

  const hasNavigator = typeof navigator !== 'undefined';
  const userAgent = hasNavigator ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    || (hasNavigator && navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(userAgent);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return MOBILE_USER_AGENT_REGEX.test(userAgent) || window.matchMedia('(max-width: 768px)').matches;
  }, [userAgent]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const media = window.matchMedia('(display-mode: standalone)');
    const syncStandalone = () => setIsStandalone(detectStandalone());
    syncStandalone();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      syncStandalone();
      setToast({ tone: 'success', message: 'Acceso rápido activo' });
    };

    media.addEventListener('change', syncStandalone);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      media.removeEventListener('change', syncStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const onQuickAccessClick = useCallback(async () => {
    if (isStandalone) {
      setToast({ tone: 'success', message: 'Acceso rápido activo' });
      return;
    }

    if (isIOS) {
      setIosInstructionsOpen(true);
      return;
    }

    if (isAndroid && deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (choice.outcome === 'accepted') {
        setToast({ tone: 'success', message: 'Acceso rápido añadido' });
      } else {
        setToast({ tone: 'info', message: 'Instalación cancelada' });
      }
      return;
    }

    setToast({ tone: 'info', message: 'No disponible ahora' });
  }, [deferredPrompt, isAndroid, isIOS, isStandalone]);

  return {
    isMobile,
    isIOS,
    isAndroid,
    isStandalone,
    canPromptInstall: Boolean(deferredPrompt),
    iosInstructionsOpen,
    toast,
    setToast,
    onQuickAccessClick,
    closeIosInstructions: () => setIosInstructionsOpen(false),
  };
}
