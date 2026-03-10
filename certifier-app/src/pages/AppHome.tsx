import { Link } from 'react-router-dom';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACT_ADDRESS, CERTIFIER_ADDRESS, CERTIFIER_LIVE, CERT_TYPE_LABELS, CERT_TYPE_ICONS } from '../constants.ts';
import { baseVaultAbi, certifierAbi } from '../abi/index.ts';
import { formatFileSize } from '../utils/ipfs.ts';

export default function AppHome() {
  const { address, isConnected } = useAccount();

  // File data
  const { data: fileIds } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'getUserFileIds',
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: fileCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'fileCount',
  });

  // Cert data
  const { data: recipientCerts } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'getRecipientCerts',
    args: [address!],
    query: { enabled: !!address && CERTIFIER_LIVE },
  });

  const { data: certCount } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'certCount',
    query: { enabled: CERTIFIER_LIVE },
  });

  // Institution check
  const { data: instCount } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'institutionCount',
    query: { enabled: CERTIFIER_LIVE },
  });

  const count = instCount ? Number(instCount) : 0;
  const instQueries = Array.from({ length: Math.min(count, 50) }, (_, i) => ({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'getInstitution' as const,
    args: [BigInt(i + 1)],
  }));
  const { data: instResults } = useReadContracts({
    contracts: instQueries,
    query: { enabled: count > 0 && !!address },
  });

  let myInstName = '';
  let myInstId = 0;
  if (instResults && address) {
    for (let i = 0; i < instResults.length; i++) {
      const r = instResults[i];
      if (r.status === 'success' && r.result) {
        const inst = r.result as { admin: string; name: string };
        if (inst.admin.toLowerCase() === address.toLowerCase()) {
          myInstName = inst.name;
          myInstId = i + 1;
          break;
        }
      }
    }
  }

  const userFiles = (fileIds as bigint[]) || [];
  const userCerts = (recipientCerts as bigint[]) || [];

  // Load recent files (last 4)
  const recentFileIds = userFiles.slice(-4).reverse();
  const fileQueries = recentFileIds.map(id => ({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'getFile' as const,
    args: [id],
  }));
  const { data: fileResults } = useReadContracts({
    contracts: fileQueries,
    query: { enabled: recentFileIds.length > 0 },
  });

  // Load recent certs (last 4)
  const recentCertIds = userCerts.slice(-4).reverse();
  const certQueries = recentCertIds.map(id => ({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'getCert' as const,
    args: [id],
  }));
  const { data: certResults } = useReadContracts({
    contracts: certQueries,
    query: { enabled: recentCertIds.length > 0 && CERTIFIER_LIVE },
  });

  if (!isConnected) {
    return (
      <div className="page app-home">
        <div className="app-connect-card">
          <img src="/icon.svg" alt="BaseVault" className="app-connect-logo" />
          <h1>BaseVault</h1>
          <p className="app-connect-tagline">On-Chain Document Storage & Certification</p>
          <p className="app-connect-desc">Store, encrypt, certify and verify documents directly on Base blockchain. No servers. No IPFS.</p>
          <ConnectButton />
        </div>

        {/* Network stats even without wallet */}
        <div className="app-network-stats">
          <div className="app-net-stat">
            <span className="app-net-val">{fileCount ? Number(fileCount) : 0}</span>
            <span className="app-net-lbl">Files On-Chain</span>
          </div>
          <div className="app-net-stat">
            <span className="app-net-val">{certCount ? Number(certCount) : 0}</span>
            <span className="app-net-lbl">Certificates</span>
          </div>
          <div className="app-net-stat">
            <span className="app-net-val">{instCount ? Number(instCount) : 0}</span>
            <span className="app-net-lbl">Institutions</span>
          </div>
        </div>

        <div className="app-quick-links">
          <Link to="/gallery" className="app-quick-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Public Gallery
          </Link>
          <Link to="/verify" className="app-quick-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Verify Document
          </Link>
          <Link to="/stats" className="app-quick-link">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            Network Stats
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page app-home">

      {/* Greeting */}
      <div className="app-greeting">
        <div>
          <h1>Dashboard</h1>
          <p className="app-greeting-addr">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
        </div>
        {address && <Link to={`/profile/${address}`} className="app-profile-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </Link>}
      </div>

      {/* Overview Cards */}
      <div className="app-overview">
        <Link to="/my-files" className="app-ov-card app-ov-clickable">
          <div className="app-ov-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          </div>
          <span className="app-ov-val">{userFiles.length}</span>
          <span className="app-ov-lbl">My Files</span>
        </Link>
        <Link to="/my-certs" className="app-ov-card app-ov-clickable app-ov-card-green">
          <div className="app-ov-icon app-ov-icon-green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>
          </div>
          <span className="app-ov-val">{userCerts.length}</span>
          <span className="app-ov-lbl">Certificates</span>
        </Link>
        <Link to="/gallery" className="app-ov-card app-ov-clickable app-ov-card-purple">
          <div className="app-ov-icon app-ov-icon-purple">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
          </div>
          <span className="app-ov-val">{fileCount ? Number(fileCount) : 0}</span>
          <span className="app-ov-lbl">Network</span>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="app-actions-row">
        <Link to="/upload" className="app-action-btn app-action-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload
        </Link>
        <Link to="/verify" className="app-action-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Verify
        </Link>
        {myInstId > 0 ? (
          <Link to="/dashboard" className="app-action-btn app-action-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </Link>
        ) : (
          <Link to="/register" className="app-action-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Register
          </Link>
        )}
      </div>

      {/* Institution Banner */}
      {myInstId > 0 && (
        <Link to="/dashboard" className="app-inst-banner">
          <div className="app-inst-left">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"/></svg>
            <div>
              <span className="app-inst-tag">Institution</span>
              <strong>{myInstName}</strong>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </Link>
      )}

      {/* Recent Files */}
      <div className="app-section">
        <div className="app-section-header">
          <h2>Recent Files</h2>
          {userFiles.length > 0 && <Link to="/my-files" className="app-section-link">All ({userFiles.length})</Link>}
        </div>
        {userFiles.length === 0 ? (
          <div className="app-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            <p>No files uploaded yet</p>
            <Link to="/upload" className="btn btn-sm btn-primary">Upload First File</Link>
          </div>
        ) : (
          <div className="app-recent-list">
            {recentFileIds.map((id, i) => {
              const f = fileResults?.[i]?.status === 'success' ? fileResults[i].result as any : null;
              if (!f) return <div key={Number(id)} className="app-recent-item app-recent-loading"><div className="spinner spinner-sm" /></div>;
              const icon = f.fileType?.startsWith('image/') ? '🖼️' : f.fileType === 'application/pdf' ? '📄' : f.fileType?.startsWith('video/') ? '🎬' : f.fileType?.startsWith('audio/') ? '🎵' : '📁';
              return (
                <Link to="/my-files" key={Number(id)} className="app-recent-item app-recent-clickable">
                  <div className="app-recent-icon">{icon}</div>
                  <div className="app-recent-info">
                    <strong title={f.fileName}>{f.fileName}</strong>
                    <span>{formatFileSize(Number(f.fileSize))} &middot; {f.isPublic ? 'Public' : 'Private'}</span>
                  </div>
                  <span className="app-recent-id">#{Number(f.id)}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Certificates */}
      <div className="app-section">
        <div className="app-section-header">
          <h2>Recent Certificates</h2>
          {userCerts.length > 0 && <Link to="/my-certs" className="app-section-link">All ({userCerts.length})</Link>}
        </div>
        {userCerts.length === 0 ? (
          <div className="app-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>
            <p>No certificates received yet</p>
          </div>
        ) : (
          <div className="app-recent-list">
            {recentCertIds.map((id, i) => {
              const c = certResults?.[i]?.status === 'success' ? certResults[i].result as any : null;
              if (!c) return <div key={Number(id)} className="app-recent-item app-recent-loading"><div className="spinner spinner-sm" /></div>;
              return (
                <Link to={`/cert/${Number(id)}`} key={Number(id)} className="app-recent-item app-recent-clickable">
                  <div className="app-recent-icon">{CERT_TYPE_ICONS[c.certType] || '📄'}</div>
                  <div className="app-recent-info">
                    <strong>{CERT_TYPE_LABELS[c.certType] || 'Certificate'} #{Number(id)}</strong>
                    <span>{c.revoked ? 'Revoked' : 'Valid'} &middot; {new Date(Number(c.issuedAt) * 1000).toLocaleDateString()}</span>
                  </div>
                  <span className={`app-cert-status ${c.revoked ? 'app-cert-revoked' : 'app-cert-valid'}`}>
                    {c.revoked ? 'Revoked' : 'Valid'}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
