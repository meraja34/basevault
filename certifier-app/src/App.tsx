import { useEffect } from 'react';
import '@coinbase/onchainkit/styles.css';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { WagmiProvider, useAccount, useConnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { base } from 'wagmi/chains';
import { config, farcasterConnectorId } from './config.ts';
import { useMiniApp } from './hooks/useMiniApp.ts';
import { useAppMode } from './hooks/useAppMode.ts';
import Header from './components/Header.tsx';
import BottomTabs from './components/BottomTabs.tsx';
import { MobileHeader, MobileBottomNav } from './components/MobileNav.tsx';
import Home from './pages/Home.tsx';
import Upload from './pages/Upload.tsx';
import Gallery from './pages/Gallery.tsx';
import MyFiles from './pages/MyFiles.tsx';
import InstitutionRegister from './pages/InstitutionRegister.tsx';
import InstitutionDashboard from './pages/InstitutionDashboard.tsx';
import CertificateView from './pages/CertificateView.tsx';
import MyCertificates from './pages/MyCertificates.tsx';
import Verify from './pages/Verify.tsx';
import Profile from './pages/Profile.tsx';
import Stats from './pages/Stats.tsx';
import { BASEVAULT_ADDRESS, CERTIFIER_ADDRESS } from './constants.ts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchInterval: 1000 * 60,
    },
  },
});

function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

function PageWrapper({ title, children }: { title: string; children: React.ReactNode }) {
  usePageTitle(title);
  return <>{children}</>;
}

function AppContent() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const isMiniApp = useMiniApp();
  const mode = useAppMode();
  const isNative = mode === 'native';

  // Apply saved theme
  useEffect(() => {
    const saved = localStorage.getItem('basevault-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }, []);

  // Native app: Status bar + back button
  useEffect(() => {
    if (!isNative) return;
    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#0a0a1a' });
      StatusBar.setOverlaysWebView({ overlay: false });
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

  // MiniApp: signal ready + auto-connect Farcaster wallet
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        await sdk.actions.ready();

        if (cancelled || isConnected) return;
        if (!isMiniApp) return;

        await new Promise(r => setTimeout(r, 500));
        if (cancelled || isConnected) return;

        const fc = connectors.find(c => c.id === farcasterConnectorId);
        if (fc) {
          try {
            connect({ connector: fc });
          } catch (e) {
            console.log('Farcaster auto-connect attempt failed, retrying...', e);
            await new Promise(r => setTimeout(r, 1500));
            if (!cancelled && !isConnected) {
              connect({ connector: fc });
            }
          }
        }
      } catch {}
    })();

    return () => { cancelled = true; };
  }, [isMiniApp, isConnected]);

  const appClass = isNative ? 'app native-mode'
    : isMiniApp ? 'app miniapp-mode'
    : 'app';

  return (
    <BrowserRouter>
      <div className={appClass}>
        {/* Header by mode */}
        {mode === 'web' && <Header />}
        {isMiniApp && (
          <div className="miniapp-header">
            <Link to="/" className="logo">
              <img src="/icon.svg" alt="BaseVault" className="logo-img" />
              <span className="logo-text">BaseVault</span>
            </Link>
            {address && (
              <span className="miniapp-address">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            )}
          </div>
        )}
        {isNative && <MobileHeader />}

        <main className="main-content">
          <Routes>
            <Route path="/" element={<PageWrapper title="BaseVault"><Home /></PageWrapper>} />
            <Route path="/upload" element={<PageWrapper title="Upload | BaseVault"><Upload /></PageWrapper>} />
            <Route path="/gallery" element={<PageWrapper title="Gallery | BaseVault"><Gallery /></PageWrapper>} />
            <Route path="/my-files" element={<PageWrapper title="My Files | BaseVault"><MyFiles /></PageWrapper>} />
            <Route path="/register" element={<PageWrapper title="Register Institution | BaseVault"><InstitutionRegister /></PageWrapper>} />
            <Route path="/dashboard" element={<PageWrapper title="Dashboard | BaseVault"><InstitutionDashboard /></PageWrapper>} />
            <Route path="/cert/:certId" element={<PageWrapper title="Certificate | BaseVault"><CertificateView /></PageWrapper>} />
            <Route path="/my-certs" element={<PageWrapper title="My Certificates | BaseVault"><MyCertificates /></PageWrapper>} />
            <Route path="/verify" element={<PageWrapper title="Verify | BaseVault"><Verify /></PageWrapper>} />
            <Route path="/profile/:address" element={<PageWrapper title="Profile | BaseVault"><Profile /></PageWrapper>} />
            <Route path="/stats" element={<PageWrapper title="Network Stats | BaseVault"><Stats /></PageWrapper>} />
          </Routes>
        </main>

        {/* Footer only for web */}
        {mode === 'web' && (
          <footer className="footer-enhanced">
            <div className="footer-grid">
              <div className="footer-col">
                <h4 className="footer-col-title">
                  <img src="/icon.svg" alt="BaseVault" width="20" height="20" />
                  BaseVault
                </h4>
                <p className="footer-about">Fully on-chain document storage and institutional certification on Base. No servers, no IPFS. Your files live on the blockchain.</p>
              </div>
              <div className="footer-col">
                <h4 className="footer-col-title">Quick Links</h4>
                <Link to="/upload" className="footer-link">Upload</Link>
                <Link to="/gallery" className="footer-link">Gallery</Link>
                <Link to="/verify" className="footer-link">Verify</Link>
                <Link to="/register" className="footer-link">Register</Link>
                {address && <Link to={`/profile/${address}`} className="footer-link">My Profile</Link>}
              </div>
              <div className="footer-col">
                <h4 className="footer-col-title">Resources</h4>
                <a href={`https://basescan.org/address/${BASEVAULT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="footer-link">BaseScan (Storage)</a>
                <a href={`https://basescan.org/address/${CERTIFIER_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="footer-link">BaseScan (Certifier)</a>
                <a href="https://github.com/meraja34/basevault" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
                <Link to="/stats" className="footer-link">Network Stats</Link>
                <a href="/recover.html" className="footer-link">Recovery Tool</a>
              </div>
              <div className="footer-col">
                <h4 className="footer-col-title">Connect</h4>
                <a href="https://warpcast.com/alphacaster.eth" target="_blank" rel="noopener noreferrer" className="footer-link">Farcaster</a>
                <a href="https://github.com/meraja34/basevault" target="_blank" rel="noopener noreferrer" className="footer-link">GitHub</a>
              </div>
            </div>
            <div className="footer-bottom">
              <div className="footer-built-on-base">
                <span className="footer-built-text">Built on</span>
                <video
                  src="/base-square-motion.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="footer-base-motion"
                />
                <img src="/base-wordmark-white.svg" alt="Base" className="footer-base-wordmark" />
              </div>
              <span className="footer-copy">BaseVault - Your files. Your keys. Your proof.</span>
            </div>
          </footer>
        )}

        {/* Bottom nav by mode */}
        {isMiniApp && <BottomTabs />}
        {isNative && <MobileBottomNav />}
        {mode === 'web' && <BottomTabs />}
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  const mode = useAppMode();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          chain={base}
          config={{
            appearance: {
              name: 'BaseVault',
              logo: '/icon.svg',
              mode: 'dark',
              theme: 'base',
            },
            wallet: {
              display: 'modal',
            },
          }}
        >
          <AppContent />
          <Toaster
            position={mode === 'native' ? 'top-center' : 'bottom-center'}
            toastOptions={{
              style: { background: '#1a1a2e', color: '#fff', border: '1px solid #333' }
            }}
          />
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
