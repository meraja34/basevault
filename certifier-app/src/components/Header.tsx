import { WalletButton } from './WalletButton.tsx';
import { Link, useLocation } from 'react-router-dom';
import { useAccount } from 'wagmi';
import ThemeToggle from './ThemeToggle.tsx';

export default function Header() {
  const location = useLocation();
  const { address } = useAccount();
  const isLanding = !window.location.hostname.startsWith('app.');

  const fileLinks = [
    { path: '/', label: 'Home' },
    { path: '/upload', label: 'Upload' },
    { path: '/gallery', label: 'Gallery' },
    { path: '/my-files', label: 'My Files' },
  ];

  const certLinks = [
    { path: '/register', label: 'Register' },
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/my-certs', label: 'My Certs' },
    { path: '/verify', label: 'Verify' },
  ];

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          <img src="/icon.svg" alt="BaseVault" className="logo-img" />
          <span className="logo-text">BaseVault</span>
        </Link>
        {!isLanding && (
          <nav className="nav">
            {fileLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
            <span className="nav-divider" />
            {certLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
            {address && (
              <>
                <span className="nav-divider" />
                <Link
                  to={`/profile/${address}`}
                  className={`nav-link ${location.pathname.startsWith('/profile') ? 'active' : ''}`}
                >
                  Profile
                </Link>
              </>
            )}
          </nav>
        )}
        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a
            href="https://t.me/EraS3R"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: '8px',
              background: 'rgba(0, 136, 204, 0.1)', border: '1px solid rgba(0, 136, 204, 0.3)',
              color: '#0088cc', fontSize: '12px', fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            Connect Dev
          </a>
          <ThemeToggle />
          {!isLanding && <WalletButton />}
        </div>
      </div>
    </header>
  );
}
