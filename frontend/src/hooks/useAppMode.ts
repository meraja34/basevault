import { useState, useEffect } from 'react';

export type AppMode = 'web' | 'miniapp' | 'native';

export function useAppMode(): AppMode {
  const [mode, setMode] = useState<AppMode>('web');

  useEffect(() => {
    // Check for Capacitor native platform first (Android APK)
    try {
      const { Capacitor } = require('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        setMode('native');
        return;
      }
    } catch {}

    // Check URL param for testing native mode in browser
    if (new URLSearchParams(window.location.search).has('native')) {
      setMode('native');
      return;
    }

    // Check for Farcaster MiniApp
    const inIframe = window.parent !== window;
    const hasSDK = !!(window as any).FarcasterFrameSDK || !!(window as any).fc;
    const urlHint = new URLSearchParams(window.location.search).has('miniapp');

    if (inIframe || hasSDK || urlHint) {
      setMode('miniapp');
      return;
    }

    setMode('web');
  }, []);

  return mode;
}
