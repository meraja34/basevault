import { Link } from 'react-router-dom';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useMiniApp } from '../hooks/useMiniApp.ts';
import { CONTRACT_ADDRESS, CERTIFIER_ADDRESS, CERTIFIER_LIVE, CERT_TYPE_LABELS, CERT_TYPE_ICONS } from '../constants.ts';
import { baseVaultAbi, certifierAbi } from '../abi/index.ts';
import { formatFileSize } from '../utils/ipfs.ts';

export default function AppHome() {
  const { address, isConnected } = useAccount();
  const isMiniApp = useMiniApp();

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

  const getFileIcon = (type: string) => {
    if (type?.startsWith('image/')) return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0052FF" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
    );
    if (type === 'application/pdf') return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5252" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    );
    if (type?.startsWith('video/')) return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7c4dff" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
    );
    if (type?.startsWith('audio/')) return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
    );
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    );
  };

  if (!isConnected) {
    return (
      <div className="page app-home">
        <div className="app-connect-card">
          <img src="/icon.svg" alt="BaseVault" className="app-connect-logo" />
          <h1>BaseVault</h1>
          <p className="app-connect-tagline">On-Chain Document Storage & Certification</p>
          <p className="app-connect-desc">Store, encrypt, certify and verify documents directly on Base blockchain. No servers. No IPFS.</p>
          {isMiniApp ? (
            <div className="app-connecting">
              <div className="spinner" />
              <p>Connecting wallet...</p>
            </div>
          ) : (
            <ConnectButton />
          )}
        </div>

        {/* Network stats */}
        <div className="app-network-bar">
          <div className="app-net-item">
            <span className="app-net-num">{fileCount ? Number(fileCount) : 0}</span>
            <span className="app-net-txt">Files</span>
          </div>
          <div className="app-net-sep" />
          <div className="app-net-item">
            <span className="app-net-num">{certCount ? Number(certCount) : 0}</span>
            <span className="app-net-txt">Certs</span>
          </div>
          <div className="app-net-sep" />
          <div className="app-net-item">
            <span className="app-net-num">{instCount ? Number(instCount) : 0}</span>
            <span className="app-net-txt">Institutions</span>
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
        {address && <Link to={`/profile/${address}`} className="app-profile-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          Profile
        </Link>}
      </div>

      {/* Overview Cards */}
      <div className="app-overview">
        <Link to="/my-files" className="app-ov-card">
          <div className="app-ov-icon-wrap app-ov-blue">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          </div>
          <span className="app-ov-val">{userFiles.length}</span>
          <span className="app-ov-lbl">My Files</span>
        </Link>
        <Link to="/my-certs" className="app-ov-card">
          <div className="app-ov-icon-wrap app-ov-green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>
          </div>
          <span className="app-ov-val">{userCerts.length}</span>
          <span className="app-ov-lbl">Certificates</span>
        </Link>
        <Link to="/gallery" className="app-ov-card">
          <div className="app-ov-icon-wrap app-ov-purple">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
          </div>
          <span className="app-ov-val">{fileCount ? Number(fileCount) : 0}</span>
          <span className="app-ov-lbl">Network</span>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="app-actions-row">
        <Link to="/upload" className="app-act app-act-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Upload
        </Link>
        <Link to="/verify" className="app-act">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Verify
        </Link>
        {myInstId > 0 ? (
          <Link to="/dashboard" className="app-act app-act-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Dashboard
          </Link>
        ) : (
          <Link to="/register" className="app-act">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Register
          </Link>
        )}
      </div>

      {/* Institution Banner */}
      {myInstId > 0 && (
        <Link to="/dashboard" className="app-inst-banner">
          <div className="app-inst-left">
            <div className="app-inst-avatar">{myInstName.charAt(0).toUpperCase()}</div>
            <div>
              <span className="app-inst-tag">Your Institution</span>
              <strong>{myInstName}</strong>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </Link>
      )}

      {/* Recent Files */}
      <div className="app-panel">
        <div className="app-panel-header">
          <h2>Recent Files</h2>
          {userFiles.length > 0 && <Link to="/my-files" className="app-panel-link">View All ({userFiles.length})</Link>}
        </div>
        {userFiles.length === 0 ? (
          <div className="app-panel-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
            <p>No files uploaded yet</p>
            <Link to="/upload" className="btn btn-sm btn-primary">Upload First File</Link>
          </div>
        ) : (
          <div className="app-file-list">
            {recentFileIds.map((id, i) => {
              const f = fileResults?.[i]?.status === 'success' ? fileResults[i].result as any : null;
              if (!f) return (
                <div key={Number(id)} className="app-file-item app-file-skeleton">
                  <div className="skeleton-icon" />
                  <div className="skeleton-lines">
                    <div className="skeleton-line skeleton-line-w60" />
                    <div className="skeleton-line skeleton-line-w40" />
                  </div>
                </div>
              );
              return (
                <Link to="/my-files" key={Number(id)} className="app-file-item">
                  <div className="app-file-icon">{getFileIcon(f.fileType)}</div>
                  <div className="app-file-info">
                    <span className="app-file-name" title={f.fileName}>{f.fileName}</span>
                    <span className="app-file-meta">
                      {formatFileSize(Number(f.fileSize))}
                      <span className="app-file-dot" />
                      {f.isPublic ? 'Public' : 'Private'}
                      <span className="app-file-dot" />
                      #{Number(f.id)}
                    </span>
                  </div>
                  <div className={`app-file-vis ${f.isPublic ? '' : 'app-file-private'}`}>
                    {f.isPublic ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Certificates */}
      <div className="app-panel">
        <div className="app-panel-header">
          <h2>Recent Certificates</h2>
          {userCerts.length > 0 && <Link to="/my-certs" className="app-panel-link">View All ({userCerts.length})</Link>}
        </div>
        {userCerts.length === 0 ? (
          <div className="app-panel-empty">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>
            <p>No certificates received yet</p>
          </div>
        ) : (
          <div className="app-file-list">
            {recentCertIds.map((id, i) => {
              const c = certResults?.[i]?.status === 'success' ? certResults[i].result as any : null;
              if (!c) return (
                <div key={Number(id)} className="app-file-item app-file-skeleton">
                  <div className="skeleton-icon" />
                  <div className="skeleton-lines">
                    <div className="skeleton-line skeleton-line-w60" />
                    <div className="skeleton-line skeleton-line-w40" />
                  </div>
                </div>
              );
              return (
                <Link to={`/cert/${Number(id)}`} key={Number(id)} className="app-file-item">
                  <div className="app-cert-icon">{CERT_TYPE_ICONS[c.certType] || '📄'}</div>
                  <div className="app-file-info">
                    <span className="app-file-name">{CERT_TYPE_LABELS[c.certType] || 'Certificate'} #{Number(id)}</span>
                    <span className="app-file-meta">
                      {c.recipientName || 'Anonymous'}
                      <span className="app-file-dot" />
                      {new Date(Number(c.issuedAt) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={`app-cert-pill ${c.revoked ? 'app-cert-pill-revoked' : 'app-cert-pill-valid'}`}>
                    {c.revoked ? 'Revoked' : 'Valid'}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
