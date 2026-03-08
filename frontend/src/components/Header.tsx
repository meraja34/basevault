import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useLocation } from 'react-router-dom';

export default function Header() {
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/upload', label: 'Upload' },
    { path: '/gallery', label: 'Gallery' },
    { path: '/verify', label: 'Verify' },
    { path: '/my-files', label: 'My Files' },
  ];

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          <img src="/icon.svg" alt="BaseVault" className="logo-img" />
          <span className="logo-text">BaseVault</span>
        </Link>
        <nav className="nav">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="header-wallet">
          <ConnectButton showBalance={false} chainStatus="icon" accountStatus="address" />
        </div>
      </div>
    </header>
  );
}
