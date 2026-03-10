interface CertBadgeProps {
  valid: boolean;
  revoked?: boolean;
  expired?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function CertBadge({ valid, revoked, expired, size = 'md' }: CertBadgeProps) {
  const sizeClass = `cert-badge-${size}`;

  if (revoked) {
    return (
      <span className={`cert-badge cert-badge-revoked ${sizeClass}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
        </svg>
        Revoked
      </span>
    );
  }

  if (expired) {
    return (
      <span className={`cert-badge cert-badge-expired ${sizeClass}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
        </svg>
        Expired
      </span>
    );
  }

  if (valid) {
    return (
      <span className={`cert-badge cert-badge-valid ${sizeClass}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        Valid
      </span>
    );
  }

  return (
    <span className={`cert-badge cert-badge-invalid ${sizeClass}`}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      Invalid
    </span>
  );
}
