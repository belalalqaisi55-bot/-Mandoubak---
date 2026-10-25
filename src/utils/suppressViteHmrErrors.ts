// Suppresses Vite HMR WebSocket errors in AI Studio iframe environment
if (typeof window !== 'undefined') {
  const isViteOrWs = (msg: unknown): boolean => {
    if (!msg) return false;
    let str = '';
    if (msg instanceof Error) {
      str = `${msg.message} ${msg.stack || ''}`;
    } else if (typeof msg === 'object') {
      try { str = JSON.stringify(msg); } catch { str = String(msg); }
    } else {
      str = String(msg);
    }
    const lower = str.toLowerCase();
    return (
      lower.includes('[vite]') ||
      lower.includes('websocket') ||
      lower.includes('closed without opened') ||
      lower.includes('@vite/client') ||
      lower.includes('failed to connect to websocket')
    );
  };

  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args: any[]) => {
    if (args.some(isViteOrWs)) return;
    origError.apply(console, args);
  };
  console.warn = (...args: any[]) => {
    if (args.some(isViteOrWs)) return;
    origWarn.apply(console, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isViteOrWs(event.reason)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('error', (event) => {
    if (isViteOrWs(event.error) || isViteOrWs(event.message)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

export {};
