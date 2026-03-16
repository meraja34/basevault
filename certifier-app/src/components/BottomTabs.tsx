import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';

const mainTabs = [
  {
    path: '/',
    label: 'Home',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    path: '/upload',
    label: 'Upload',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    path: '/my-files',
    label: 'Files',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    path: '/my-certs',
    label: 'Certs',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

const moreLinks = [
  { path: '/gallery', label: 'Public Gallery' },
  { path: '/register', label: 'Register Institution' },
  { path: '/dashboard', label: 'Institution Dashboard' },
  { path: '/verify', label: 'Verify Document' },
  { path: '/stats', label: 'Network Stats' },
];

export default function BottomTabs({ isNative = false }: { isNative?: boolean }) {
  const location = useLocation();
  const [showMore, setShowMore] = useState(false);

  // Hide bottom tabs on landing page (but always show in native mode)
  if (location.pathname === '/' && !isNative) return null;

  return (
    <>
      {showMore && (
        <div className="more-sheet-overlay" onClick={() => setShowMore(false)}>
          <div className="more-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="more-sheet-header">
              <span>More</span>
              <button className="more-sheet-close" onClick={() => setShowMore(false)}>&times;</button>
            </div>
            {moreLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`more-sheet-link ${location.pathname === link.path ? 'active' : ''}`}
                onClick={() => setShowMore(false)}
              >
                {link.label}
              </Link>
            ))}
            <a href="/recover.html" className="more-sheet-link" onClick={() => setShowMore(false)}>
              Recovery Tool
            </a>
          </div>
        </div>
      )}
      <nav className="bottom-tabs">
        {mainTabs.map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            className={`bottom-tab ${location.pathname === tab.path ? 'bottom-tab-active' : ''}`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </Link>
        ))}
        <button
          className={`bottom-tab ${showMore ? 'bottom-tab-active' : ''}`}
          onClick={() => setShowMore(!showMore)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
          </svg>
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
