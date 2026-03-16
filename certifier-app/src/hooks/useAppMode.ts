import { useState, useEffect } from 'react';

type AppMode = 'native' | 'miniapp' | 'web';

export function useAppMode(): AppMode {
  const [mode, setMode] = useState<AppMode>('web');

  useEffect(() => {
    const detect = async () => {
      // Check URL param first (for testing)
      const params = new URLSearchParams(window.location.search);
      if (params.has('native')) { setMode('native'); return; }
      if (params.has('miniapp')) { setMode('miniapp'); return; }

      // Check Capacitor native
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) { setMode('native'); return; }
      } catch {}

      // Check MiniApp (iframe/Farcaster)
      if (window !== window.parent) { setMode('miniapp'); return; }
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        if (sdk) { setMode('miniapp'); return; }
      } catch {}

      setMode('web');
    };
    detect();
  }, []);

  return mode;
}
