import { useState, useEffect } from 'react';

export function useMiniApp() {
  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    // Detect if running inside Farcaster/Base MiniApp host
    const inIframe = window.parent !== window;
    const hasSDK = !!(window as any).FarcasterFrameSDK || !!(window as any).fc;
    const urlHint = new URLSearchParams(window.location.search).has('miniapp');

    if (inIframe || hasSDK || urlHint) {
      setIsMiniApp(true);
    }
  }, []);

  return isMiniApp;
}
