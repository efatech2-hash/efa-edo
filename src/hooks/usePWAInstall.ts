import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __efaDeferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export function initPWAGlobalListener() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    window.__efaDeferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event('efa-pwa-prompt-ready'));
  });
  window.addEventListener('appinstalled', () => {
    window.__efaDeferredPrompt = null;
    window.dispatchEvent(new Event('efa-pwa-installed'));
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    if (typeof window !== 'undefined' && window.__efaDeferredPrompt) {
      return window.__efaDeferredPrompt;
    }
    return null;
  });

  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });

  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };

    checkStandalone();

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    if (window.__efaDeferredPrompt) {
      setDeferredPrompt(window.__efaDeferredPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      window.__efaDeferredPrompt = promptEvent;
      setDeferredPrompt(promptEvent);
    };

    const handlePromptReady = () => {
      if (window.__efaDeferredPrompt) {
        setDeferredPrompt(window.__efaDeferredPrompt);
      }
    };

    const handleAppInstalled = () => {
      window.__efaDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('efa-pwa-prompt-ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('efa-pwa-installed', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('efa-pwa-prompt-ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('efa-pwa-installed', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    const promptEvent = deferredPrompt || window.__efaDeferredPrompt;
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      window.__efaDeferredPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
