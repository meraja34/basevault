import { useEffect } from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider, useAccount, useConnect } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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

const queryClient = new QueryClient();

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

  // Apply saved theme
  useEffect(() => {
    const saved = localStorage.getItem('basevault-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  }, []);

  // MiniApp: signal ready + auto-connect Farcaster wallet
  useEffect(() => {
    import('@farcaster/miniapp-sdk').then(({ sdk }) => {
      sdk.actions.ready();

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
        {/* Hide header in miniapp mode - use bottom tabs instead */}
        {!isMiniApp && <Header />}

        {/* MiniApp compact header */}
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

        {/* Enhanced Footer - Desktop only, hide in miniapp */}
        {!isMiniApp && (
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
              <span className="footer-built">
                <svg width="16" height="16" viewBox="0 0 111 111" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="55.5" cy="55.5" r="55.5" fill="#0052FF"/>
                  <path d="M55.4 93.5c20.9 0 37.9-16.6 38.5-37.4H69.1c-.6 10.4-9.2 18.6-13.7 18.6-9.5 0-20.5-9.2-20.5-19.2s11-19.2 20.5-19.2c4.5 0 13.1 8.2 13.7 18.6h24.8C93.3 34.1 76.3 17.5 55.4 17.5 34 17.5 16.7 34.8 16.7 55.5S34 93.5 55.4 93.5z" fill="white"/>
                </svg>
                Built on Base
              </span>
              <span className="footer-copy">BaseVault - Your files. Your keys. Your proof.</span>
            </div>
          </footer>
        )}

        {/* Mobile Bottom Tabs - always show on mobile, or in miniapp */}
        <BottomTabs />
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
