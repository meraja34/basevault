import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'store.basevault.app',
  appName: 'BaseVault',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchShowDuration: 3000,
      backgroundColor: '#0a0a1a',
      showSpinner: true,
      spinnerColor: '#0052FF',
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a0a1a',
      overlaysWebView: false,
    },
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0a0a1a',
    appendUserAgent: 'BaseVault/3.0.0',
  },
};

export default config;
