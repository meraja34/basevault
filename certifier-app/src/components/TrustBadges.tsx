export default function TrustBadges() {
  const badges = [
    {
      icon: (
        <img src="/base-square-blue.svg" alt="Base" width="24" height="24" style={{ borderRadius: 4 }} />
      ),
      label: 'Built on Base',
      color: '#0052FF',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
      label: 'AES-256 Encrypted',
      color: '#00c853',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      label: 'Fully On-Chain',
      color: '#7c3aed',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      label: 'Verifiable Certs',
      color: '#f59e0b',
    },
  ];

  return (
    <div className="trust-badges">
      {badges.map((b) => (
        <div key={b.label} className="trust-badge" style={{ borderColor: `${b.color}33` }}>
          <span className="trust-badge-icon" style={{ color: b.color }}>{b.icon}</span>
          <span className="trust-badge-label">{b.label}</span>
        </div>
      ))}
    </div>
  );
}
