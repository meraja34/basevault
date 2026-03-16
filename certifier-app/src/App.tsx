import { useEffect } from 'react';
import '@coinbase/onchainkit/styles.css';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { WagmiProvider, useAccount, useConnect, useBalance, useDisconnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { base } from 'wagmi/chains';
import { Capacitor } from '@capacitor/core';
import { formatEther } from 'viem';
import { clearUnlockedKey } from './wallet/localConnector.ts';
import { config, farcasterConnectorId } from './config.ts';
import { useMiniApp } from './hooks/useMiniApp.ts';
import Header from './components/Header.tsx';
import BottomTabs from './components/BottomTabs.tsx';
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
  const { disconnect } = useDisconnect();
  const isMiniApp = useMiniApp();
  const isNative = Capacitor.isNativePlatform();
  const { data: balanceData } = useBalance({ address, query: { enabled: !!address && isNative } });
  const ethBal = balanceData ? parseFloat(formatEther(balanceData.value)).toFixed(4) : '0.00';

  // Apply saved theme
  useEffect(() => {
    const saved = localStorage.getItem('basevault-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }, []);

  // Native: StatusBar + hardware back button
  useEffect(() => {
    if (!isNative) return;

    (async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Dark });
        await StatusBar.setBackgroundColor({ color: '#0a0a1a' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      } catch {}

      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        await SplashScreen.hide();
      } catch {}
    })();

    // Hardware back button
    let backHandler: any;
    (async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        backHandler = await CapApp.addListener('backButton', () => {
          if (window.history.length > 1) {
            window.history.back();
          } else {
            CapApp.exitApp();
          }
        });
      } catch {}
    })();

    return () => { backHandler?.remove?.(); };
  }, [isNative]);

  // MiniApp: signal ready + auto-connect Farcaster wallet
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');

        // Signal to Warpcast that the miniapp is loaded
        await sdk.actions.ready();

        if (cancelled || isConnected) return;

        // Only auto-connect inside miniapp context
        if (!isMiniApp) return;

        // Small delay to let the SDK provider initialize
        await new Promise(r => setTimeout(r, 500));
        if (cancelled || isConnected) return;

        const fc = connectors.find(c => c.id === farcasterConnectorId);
        if (fc) {
          try {
            connect({ connector: fc });
          } catch (e) {
            console.log('Farcaster auto-connect attempt failed, retrying...', e);
            // Retry once after a longer delay
            await new Promise(r => setTimeout(r, 1500));
            if (!cancelled && !isConnected) {
              connect({ connector: fc });
            }
          }
        }
      } catch {
        // Not in Farcaster context or SDK not available
      }
    })();

    return () => { cancelled = true; };
  }, [isMiniApp, isConnected]);

  const appClass = `app ${isMiniApp ? 'miniapp-mode' : ''} ${isNative ? 'native-mode' : ''}`;

  return (
    <>
      <div className={appClass}>
        {/* Hide header in miniapp/native mode - use bottom tabs instead */}
        {!isMiniApp && !isNative && <Header />}

        {/* MiniApp compact header */}
        {isMiniApp && !isNative && (
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

        {/* Native Android compact header */}
        {isNative && (
          <div className="native-header">
            <Link to="/" className="native-header-logo">
              <img src="/icon.svg" alt="BaseVault" className="logo-img" />
              <span className="logo-text">BaseVault</span>
            </Link>
            {address && (
              <div className="native-header-right">
                <span className="native-header-bal">{ethBal} ETH</span>
                <span className="native-header-address">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
                <button className="native-header-logout" onClick={() => { clearUnlockedKey(); disconnect(); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                </button>
              </div>
            )}
          </div>
        )}

        <main className="main-content">
          <Routes>
            <Route path="/" element={<PageWrapper title="BaseVault - On-Chain Document Storage & Certification"><Home /></PageWrapper>} />
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

        {/* Enhanced Footer - Desktop only, hide in miniapp/native */}
        {!isMiniApp && !isNative && (
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
                <a href="https://warpcast.com/alphacaster.eth" target="_blank" rel="noopener noreferrer" className="footer-link">
                  Farcaster
                </a>
                <a href="https://github.com/meraja34/basevault" target="_blank" rel="noopener noreferrer" className="footer-link">
                  GitHub
                </a>
              </div>
            </div>

            <div className="footer-bottom">
              <div className="footer-built-on-base">
                <span className="footer-built-text">Built on</span>
                <video src="/base-square-motion.mp4" autoPlay loop muted playsInline className="footer-base-motion" />
                <img src="/base-wordmark-white.svg" alt="Base" className="footer-base-wordmark" />
              </div>
              <span className="footer-copy">BaseVault - Your files. Your keys. Your proof.</span>
            </div>
          </footer>
        )}

        {/* Mobile Bottom Tabs - always show on mobile, or in miniapp/native */}
        <BottomTabs isNative={isNative} />
      </div>
    </>
  );
}

export default function App() {
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
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
          <Toaster position="bottom-center" toastOptions={{
            style: { background: '#1a1a2e', color: '#fff', border: '1px solid #333' }
          }} />
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
