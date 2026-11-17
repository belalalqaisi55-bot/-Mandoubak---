import { useEffect, useRef } from "react";

/**
 * Intercepts browser/PWA/Android hardware back button while a modal is open
 * so pressing Back closes the modal instead of navigating away or exiting the app.
 */
export function useModalBackHandler(
  isOpen: boolean,
  onClose: () => void,
  modalId: string
): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const pushedHistoryRef = useRef(false);
  const closedByBackRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!isOpen) {
      if (pushedHistoryRef.current && !closedByBackRef.current) {
        pushedHistoryRef.current = false;
        try {
          if (window.history.state && window.history.state.__mbkModal === modalId) {
            window.history.back();
          }
        } catch {
          // Ignore restricted history environments
        }
      }
      closedByBackRef.current = false;
      return;
    }

    closedByBackRef.current = false;

    if (!pushedHistoryRef.current) {
      try {
        const currentState =
          window.history.state && typeof window.history.state === "object"
            ? window.history.state
            : {};
        if (currentState.__mbkModal !== modalId) {
          window.history.pushState(
            { ...currentState, __mbkModal: modalId },
            "",
            window.location.href
          );
        }
        pushedHistoryRef.current = true;
      } catch {
        pushedHistoryRef.current = false;
      }
    }

    const closeFromBack = () => {
      pushedHistoryRef.current = false;
      closedByBackRef.current = true;
      onCloseRef.current();
    };

    const handlePopState = () => {
      if (!isOpen) return;
      const currentModal = window.history.state?.__mbkModal;
      if (currentModal !== modalId) {
        closeFromBack();
      }
    };

    const handleHardwareBackButton = (event: Event) => {
      if (!isOpen) return;
      if (typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      if (
        pushedHistoryRef.current &&
        window.history.state?.__mbkModal === modalId
      ) {
        try {
          window.history.back();
          return;
        } catch {
          // Fallback to direct close below
        }
      }
      closeFromBack();
    };

    window.addEventListener("popstate", handlePopState);
    document.addEventListener("backbutton", handleHardwareBackButton, false);

    let capacitorListenerHandle: { remove?: () => Promise<void> | void } | null = null;
    try {
      const capApp = (window as any)?.Capacitor?.Plugins?.App;
      if (capApp && typeof capApp.addListener === "function") {
        const maybePromise = capApp.addListener("backButton", () => {
          handleHardwareBackButton(new Event("backbutton"));
        });
        if (maybePromise && typeof maybePromise.then === "function") {
          maybePromise
            .then((handle: any) => {
              capacitorListenerHandle = handle;
            })
            .catch(() => {});
        } else {
          capacitorListenerHandle = maybePromise;
        }
      }
    } catch {
      // Capacitor App plugin not registered
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
      document.removeEventListener("backbutton", handleHardwareBackButton, false);
      if (capacitorListenerHandle && typeof capacitorListenerHandle.remove === "function") {
        try {
          capacitorListenerHandle.remove();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [isOpen, modalId]);
}
