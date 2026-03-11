import { useState, useEffect } from 'react';

export function useMiniApp() {
  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    // Quick checks first
    const inIframe = window.parent !== window;
    const hasSDK = !!(window as any).FarcasterFrameSDK || !!(window as any).fc;
    const urlHint = new URLSearchParams(window.location.search).has('miniapp');

    if (inIframe || hasSDK || urlHint) {
      setIsMiniApp(true);
      return;
    }

    // Also check via SDK context
    import('@farcaster/miniapp-sdk').then(async ({ sdk }) => {
      const ctx = await sdk.context;
      if (ctx) setIsMiniApp(true);
    }).catch(() => {});
  }, []);

  return isMiniApp;
}
