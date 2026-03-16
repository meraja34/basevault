import { useEffect } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme, ConnectButton } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useConnect, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { config, farcasterConnectorId } from './config';
import { useAppMode } from './hooks/useAppMode';
import Header from './components/Header';
import BottomTabs from './components/BottomTabs';
import { MobileHeader, MobileBottomNav } from './components/MobileNav';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Gallery from './pages/Gallery';
import Verify from './pages/Verify';
import MyFiles from './pages/MyFiles';

const queryClient = new QueryClient();

function AppContent() {
  const mode = useAppMode();
  const isMiniApp = mode === 'miniapp';
  const isNative = mode === 'native';
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  // Signal to MiniApp host and auto-connect wallet (miniapp only)
  useEffect(() => {
    if (!isMiniApp) return;
    import('@farcaster/miniapp-sdk').then(({ sdk }) => {
      sdk.actions.ready();
      if (!isConnected) {
        const fc = connectors.find(c => c.id === farcasterConnectorId);
        if (fc) connect({ connector: fc });
      }
    }).catch(() => {});
  }, [isMiniApp, isConnected]);

  // Native app: Status bar + back button
  useEffect(() => {
    if (!isNative) return;
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#0a0a1a' });
    }).catch(() => {});

    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });
    }).catch(() => {});
  }, [isNative]);

  const appClass = isNative ? 'app native-mode'
    : isMiniApp ? 'app miniapp-mode'
    : 'app';

  return (
    <BrowserRouter>
      <div className={appClass}>
        {/* Header by mode */}
        {mode === 'web' && <Header />}
        {isMiniApp && (
          <header className="miniapp-header">
            <div className="miniapp-header-inner">
              <img src="./icon.svg" alt="BaseVault" className="logo-img" style={{ width: 28, height: 28 }} />
              <span className="miniapp-title">BaseVault</span>
              <div style={{ marginLeft: 'auto' }}>
                <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" label="Connect" />
              </div>
            </div>
          </header>
        )}
        {isNative && <MobileHeader />}

        <main className="main-content">
          <Routes>
            {/* Native + MiniApp: skip landing, go to upload */}
            {(isNative || isMiniApp) ? (
              <Route path="/" element={<Navigate to="/upload" replace />} />
            ) : (
              <Route path="/" element={<Home />} />
            )}
            <Route path="/upload" element={<Upload />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/my-files" element={<MyFiles />} />
          </Routes>
        </main>

        {/* Footer only for web */}
        {mode === 'web' && (
          <footer className="footer">
            <p>BaseVault - Decentralized File Storage on Base Chain</p>
            <p className="footer-sub">Your files. Your keys. Your proof.</p>
            <div className="footer-links">
              <a href="https://farcaster.xyz/alphacaster.eth" target="_blank" rel="noopener noreferrer" className="footer-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.24 2.4H5.76C3.936 2.4 2.4 3.936 2.4 5.76v12.48c0 1.824 1.536 3.36 3.36 3.36h12.48c1.824 0 3.36-1.536 3.36-3.36V5.76c0-1.824-1.536-3.36-3.36-3.36zm.96 15.84c0 .528-.432.96-.96.96H5.76a.962.962 0 01-.96-.96V5.76c0-.528.432-.96.96-.96h12.48c.528 0 .96.432.96.96v12.48z"/><path d="M17.28 7.2h-1.92l-1.44 4.8h-.48L12 7.2h-1.92l2.4 7.2h1.44l1.44-4.8 1.44 4.8h1.44l2.4-7.2h-1.92l-1.44 4.8h-.48L13.92 7.2"/><path d="M6.72 7.2v7.2h1.92V7.2z"/></svg>
                Farcaster
              </a>
              <a href="https://basescan.org/address/0x4B46B971f1fBDF6f6D45b703b2f2D042D06CFed3" target="_blank" rel="noopener noreferrer" className="footer-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                Contract
              </a>
              <a href="https://github.com/meraja34/basevault" target="_blank" rel="noopener noreferrer" className="footer-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
                GitHub
              </a>
              <a href="https://app.basevault.store/recover.html" target="_blank" rel="noopener noreferrer" className="footer-link">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Recovery Tool
              </a>
            </div>
          </footer>
        )}

        {/* Bottom nav by mode */}
        {isMiniApp && <BottomTabs />}
        {isNative && <MobileBottomNav />}
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  const mode = useAppMode();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#0052FF',
          accentColorForeground: 'white',
          borderRadius: 'medium',
        })}>
          <AppContent />
          <Toaster
            position={mode === 'native' ? 'top-center' : 'bottom-center'}
            toastOptions={{
              style: { background: '#1a1a2e', color: '#fff', border: '1px solid #333' }
            }}
          />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
