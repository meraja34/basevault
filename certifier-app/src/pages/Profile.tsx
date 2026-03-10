import { useParams } from 'react-router-dom';
import { useReadContract, useReadContracts } from 'wagmi';
import { CONTRACT_ADDRESS, CERTIFIER_ADDRESS, CERTIFIER_LIVE } from '../constants.ts';
import { baseVaultAbi, certifierAbi } from '../abi/index.ts';
import FileCard from '../components/FileCard.tsx';
import CertCard from '../components/CertCard.tsx';
import toast from 'react-hot-toast';

export default function Profile() {
  const { address } = useParams<{ address: string }>();

  if (!address || !address.startsWith('0x') || address.length !== 42) {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>Invalid Address</h2>
          <p>Please provide a valid Ethereum address.</p>
        </div>
      </div>
    );
  }

  return <ProfileContent address={address as `0x${string}`} />;
}

function ProfileContent({ address }: { address: `0x${string}` }) {
  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

  // Get user's files
  const { data: fileIds } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'getUserFileIds',
    args: [address],
  });

  const ids = (fileIds as bigint[]) || [];

  // Get user's certificates received
  const { data: certIds } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'getRecipientCerts',
    args: [address],
    query: { enabled: CERTIFIER_LIVE },
  });

  const cIds = (certIds as bigint[] || []).slice().reverse();

  const certQueries = cIds.map(id => ({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'getCert' as const,
    args: [id],
  }));

  const validQueries = cIds.map(id => ({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'isCertValid' as const,
    args: [id],
  }));

  const { data: certResults } = useReadContracts({ contracts: certQueries, query: { enabled: cIds.length > 0 } });
  const { data: validResults } = useReadContracts({ contracts: validQueries, query: { enabled: cIds.length > 0 } });

  // Get institution names
  const instIds = certResults
    ? [...new Set(certResults.filter(r => r.status === 'success').map(r => Number((r.result as { institutionId: bigint }).institutionId)))]
    : [];

  const instQueries = instIds.map(id => ({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'getInstitution' as const,
    args: [BigInt(id)],
  }));

  const { data: instResults } = useReadContracts({ contracts: instQueries, query: { enabled: instIds.length > 0 } });

  const instNames: Record<number, string> = {};
  instIds.forEach((id, i) => {
    if (instResults?.[i]?.status === 'success') {
      instNames[id] = (instResults[i].result as { name: string }).name;
    }
  });

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Profile link copied!');
    }).catch(() => {});
  };

  return (
    <div className="page">
      <div className="profile-header">
        <div className="profile-avatar">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="profile-info">
          <h1 className="profile-address">{short}</h1>
          <code className="profile-full-address">{address}</code>
        </div>
        <div className="profile-actions">
          <button className="btn btn-sm btn-outline" onClick={handleShare}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
          </button>
          <a
            href={`https://basescan.org/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-sm btn-outline"
          >
            BaseScan
          </a>
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat-card">
          <span className="stat-value">{ids.length}</span>
          <span className="stat-label">Files Stored</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{cIds.length}</span>
          <span className="stat-label">Certificates</span>
        </div>
      </div>

      {/* Files Section */}
      <div className="section">
        <h2 className="section-title">Files Stored ({ids.length})</h2>
        {ids.length === 0 ? (
          <p className="text-dim">No files uploaded by this address.</p>
        ) : (
          <div className="file-grid">
            {ids.slice(-20).reverse().map((id) => (
              <ProfileFileCard key={Number(id)} fileId={Number(id)} />
            ))}
          </div>
        )}
      </div>

      {/* Certificates Section */}
      <div className="section">
        <h2 className="section-title">Certificates Received ({cIds.length})</h2>
        {cIds.length === 0 ? (
          <p className="text-dim">No certificates issued to this address.</p>
        ) : (
          <div className="cert-grid">
            {cIds.map((id, i) => {
              const cert = certResults?.[i]?.status === 'success' ? certResults[i].result as {
                fileId: bigint; institutionId: bigint; fileHash: string; recipient: string;
                certType: number; issuedAt: number; expiresAt: number; revoked: boolean;
                recipientName: string; metadata: string;
              } : null;
              const valid = validResults?.[i]?.status === 'success' ? validResults[i].result as boolean : false;

              if (!cert) return null;
              return (
                <CertCard
                  key={Number(id)}
                  certId={Number(id)}
                  certType={cert.certType}
                  recipientName={cert.recipientName}
                  institutionName={instNames[Number(cert.institutionId)] || `Institution #${Number(cert.institutionId)}`}
                  issuedAt={Number(cert.issuedAt)}
                  expiresAt={Number(cert.expiresAt)}
                  revoked={cert.revoked}
                  isValid={valid}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileFileCard({ fileId }: { fileId: number }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'getFile',
    args: [BigInt(fileId)],
  });

  const file = data as any;
  if (!file) return <div className="file-card file-card-loading"><div className="spinner" /></div>;

  return (
    <FileCard
      id={Number(file.id)}
      fileName={file.fileName}
      fileType={file.fileType}
      fileSize={Number(file.fileSize)}
      fileHash={file.fileHash}
      uploader={file.uploader}
      uploadedAt={Number(file.uploadedAt)}
      certified={file.certified}
      chunkCount={Number(file.chunkCount)}
      isPublic={file.isPublic}
    />
  );
}
