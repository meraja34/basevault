import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { config } from './config';
import Header from './components/Header';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Gallery from './pages/Gallery';
import Verify from './pages/Verify';
import MyFiles from './pages/MyFiles';

const queryClient = new QueryClient();

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#0052FF',
          accentColorForeground: 'white',
          borderRadius: 'medium',
        })}>
          <BrowserRouter>
            <div className="app">
              <Header />
              <main className="main-content">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/verify" element={<Verify />} />
                  <Route path="/my-files" element={<MyFiles />} />
                </Routes>
              </main>
              <footer className="footer">
                <p>BaseVault - Decentralized File Storage on Base Chain</p>
                <p className="footer-sub">Your files. Your keys. Your proof.</p>
              </footer>
            </div>
          </BrowserRouter>
          <Toaster position="bottom-right" toastOptions={{
            style: { background: '#1a1a2e', color: '#fff', border: '1px solid #333' }
          }} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
