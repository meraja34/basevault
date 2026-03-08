import { useEffect } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme, ConnectButton } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useConnect, useAccount } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { config, farcasterConnectorId } from './config';
import { useMiniApp } from './hooks/useMiniApp';
import Header from './components/Header';
import BottomTabs from './components/BottomTabs';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Gallery from './pages/Gallery';
import Verify from './pages/Verify';
import MyFiles from './pages/MyFiles';

const queryClient = new QueryClient();

function AppContent() {
  const isMiniApp = useMiniApp();
  const { connect, connectors } = useConnect();
  const { isConnected } = useAccount();

  // Signal to MiniApp host and auto-connect wallet
  useEffect(() => {
    import('@farcaster/miniapp-sdk').then(({ sdk }) => {
      sdk.actions.ready();

      // Auto-connect if inside MiniApp and not already connected
      if (isMiniApp && !isConnected) {
        const fc = connectors.find(c => c.id === farcasterConnectorId);
        if (fc) {
          connect({ connector: fc });
        }
      }
    }).catch(() => {});
  }, [isMiniApp, isConnected]);

  return (
    <BrowserRouter>
      <div className={`app ${isMiniApp ? 'miniapp-mode' : ''}`}>
        {!isMiniApp && <Header />}
        {isMiniApp && (
          <header className="miniapp-header">
            <div className="miniapp-header-inner">
              <img src="/icon.svg" alt="BaseVault" className="logo-img" style={{ width: 28, height: 28 }} />
              <span className="miniapp-title">BaseVault</span>
              <div style={{ marginLeft: 'auto' }}>
                <ConnectButton showBalance={false} chainStatus="none" accountStatus="avatar" label="Connect" />
              </div>
            </div>
          </header>
        )}
        <main className="main-content">
          <Routes>
            {isMiniApp ? (
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
        {!isMiniApp && (
          <footer className="footer">
            <p>BaseVault - Decentralized File Storage on Base Chain</p>
            <p className="footer-sub">Your files. Your keys. Your proof.</p>
          </footer>
        )}
        {isMiniApp && <BottomTabs />}
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#0052FF',
          accentColorForeground: 'white',
          borderRadius: 'medium',
        })}>
          <AppContent />
          <Toaster position="bottom-center" toastOptions={{
            style: { background: '#1a1a2e', color: '#fff', border: '1px solid #333' }
          }} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
