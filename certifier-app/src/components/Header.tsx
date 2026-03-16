import { ConnectButton } from '@rainbow-me/rainbowkit';
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
        <div className="header-actions">
          <ThemeToggle />
          {!isLanding && <ConnectButton showBalance={false} chainStatus="none" accountStatus="address" />}
        </div>
      </div>
    </header>
  );
}
