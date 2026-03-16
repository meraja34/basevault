import { Link, useLocation } from 'react-router-dom';
import { WalletCompact } from './WalletButton.tsx';

const tabs = [
  {
    path: '/',
    label: 'Home',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    path: '/upload',
    label: 'Upload',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    path: '/my-files',
    label: 'Files',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    path: '/verify',
    label: 'Verify',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

export function MobileHeader() {
  return (
    <header className="mobile-header">
      <div className="mobile-header-inner">
        <img src="/icon.svg" alt="" className="mobile-logo" />
        <span className="mobile-title">BaseVault</span>
        <div className="mobile-wallet">
          <WalletCompact />
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav() {
  const location = useLocation();

  return (
    <nav className="mobile-bottom-nav">
      {tabs.map((tab) => (
        <Link
          key={tab.path}
          to={tab.path}
          className={`mobile-nav-tab ${location.pathname === tab.path ? 'active' : ''}`}
        >
          <div className="mobile-nav-icon">{tab.icon}</div>
          <span className="mobile-nav-label">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
