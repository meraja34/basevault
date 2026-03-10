export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line skeleton-line-lg" />
      <div className="skeleton-line skeleton-line-md" />
      <div className="skeleton-line skeleton-line-sm" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="stat-card">
      <div className="skeleton-line skeleton-line-lg" style={{ width: '60%', margin: '0 auto 8px' }} />
      <div className="skeleton-line skeleton-line-sm" style={{ width: '80%', margin: '0 auto' }} />
    </div>
  );
}

export function SkeletonCertCard() {
  return (
    <div className="cert-card">
      <div className="cert-card-header">
        <div className="skeleton-line" style={{ width: '100px', height: '24px' }} />
        <div className="skeleton-line" style={{ width: '60px', height: '20px' }} />
      </div>
      <div className="cert-card-body">
        <div className="skeleton-line skeleton-line-lg" />
        <div className="skeleton-line skeleton-line-md" />
        <div className="skeleton-line skeleton-line-sm" />
      </div>
    </div>
  );
}
