import { useEffect, useState, useCallback } from "react";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Detect iframe environment
    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    setIsInIframe(inIframe);

    // Detect standalone mode (already installed as PWA or running in webview)
    const checkStandalone = () => {
      const standaloneQuery = window.matchMedia("(display-mode: standalone)").matches;
      const navigatorStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const isRunningStandalone = standaloneQuery || navigatorStandalone;
      setIsStandalone(isRunningStandalone);
      setIsInstalled(isRunningStandalone);
    };

    checkStandalone();

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar and save prompt
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const triggerInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "iframe" | "unsupported"> => {
    if (typeof window !== "undefined" && window.self !== window.top) {
      return "iframe";
    }

    if (!deferredPrompt) {
      return "unsupported";
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setIsInstalled(true);
        setIsStandalone(true);
        setDeferredPrompt(null);
        return "accepted";
      }
      return "dismissed";
    } catch (err) {
      console.error("PWA install prompt error:", err);
      return "unsupported";
    }
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isStandalone,
    isIOS,
    isInIframe,
    triggerInstall,
    deferredPrompt,
  };
}
