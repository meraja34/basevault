import { useState, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CERTIFIER_ADDRESS, CERT_TYPE_LABELS } from '../constants.ts';
import { certifierAbi } from '../abi/index.ts';
import CertCard from '../components/CertCard.tsx';
import SearchFilter from '../components/SearchFilter.tsx';
import toast from 'react-hot-toast';

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Valid', value: 'valid' },
  { label: 'Expired', value: 'expired' },
  { label: 'Revoked', value: 'revoked' },
];

export default function MyCertificates() {
  const { address, isConnected } = useAccount();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const { data: certIds } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'getRecipientCerts',
    args: [address!],
    query: { enabled: !!address },
  });

  const idList = (certIds as bigint[] || []).slice().reverse();

  const certQueries = idList.map(id => ({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'getCert' as const,
    args: [id],
  }));

  const validQueries = idList.map(id => ({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'isCertValid' as const,
    args: [id],
  }));

  const { data: certResults } = useReadContracts({ contracts: certQueries, query: { enabled: idList.length > 0 } });
  const { data: validResults } = useReadContracts({ contracts: validQueries, query: { enabled: idList.length > 0 } });

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

  // Build filtered list
  const filteredCerts = useMemo(() => {
    const items: Array<{ id: bigint; index: number }> = [];
    idList.forEach((id, i) => {
      const cert = certResults?.[i]?.status === 'success' ? certResults[i].result as {
        fileId: bigint; institutionId: bigint; fileHash: string; recipient: string;
        certType: number; issuedAt: number; expiresAt: number; revoked: boolean;
        recipientName: string; metadata: string;
      } : null;
      const valid = validResults?.[i]?.status === 'success' ? validResults[i].result as boolean : false;

      if (!cert) return;

      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const instName = instNames[Number(cert.institutionId)] || '';
        if (!cert.recipientName.toLowerCase().includes(q) && !instName.toLowerCase().includes(q)) return;
      }

      // Status filter
      if (activeFilter === 'valid' && !valid) return;
      if (activeFilter === 'revoked' && !cert.revoked) return;
      if (activeFilter === 'expired') {
        const expired = cert.expiresAt > 0 && Date.now() / 1000 > cert.expiresAt;
        if (!expired) return;
      }

      items.push({ id, index: i });
    });
    return items;
  }, [idList, certResults, validResults, search, activeFilter, instNames]);

  const handleCSVExport = () => {
    if (!certResults || !validResults) return;

    const rows = [['Cert ID', 'Institution', 'Type', 'Recipient', 'Issued', 'Expires', 'Status', 'File Hash']];

    idList.forEach((id, i) => {
      const cert = certResults?.[i]?.status === 'success' ? certResults[i].result as any : null;
      const valid = validResults?.[i]?.status === 'success' ? validResults[i].result as boolean : false;

      if (!cert) return;

      const expired = cert.expiresAt > 0 && Date.now() / 1000 > cert.expiresAt;
      const status = cert.revoked ? 'Revoked' : expired ? 'Expired' : valid ? 'Valid' : 'Invalid';

      rows.push([
        Number(id).toString(),
        instNames[Number(cert.institutionId)] || `#${Number(cert.institutionId)}`,
        CERT_TYPE_LABELS[cert.certType] || 'Unknown',
        cert.recipientName || 'Anonymous',
        new Date(Number(cert.issuedAt) * 1000).toISOString(),
        cert.expiresAt > 0 ? new Date(Number(cert.expiresAt) * 1000).toISOString() : 'Never',
        status,
        cert.fileHash,
      ]);
    });

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'basevault-my-certificates.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  if (!isConnected) {
    return (
      <div className="page">
        <h1 className="page-title">My Certificates</h1>
        <div className="connect-prompt">
          <p>Connect your wallet to view certificates issued to you.</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header-row">
        <div>
          <h1 className="page-title">My Certificates</h1>
          <p className="page-desc">Certificates issued to your wallet address.</p>
        </div>
        {idList.length > 0 && (
          <button className="btn btn-sm btn-outline" onClick={handleCSVExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {idList.length > 0 && (
        <SearchFilter
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Search by institution or recipient..."
          filters={filters}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          resultCount={filteredCerts.length}
        />
      )}

      {idList.length === 0 ? (
        <div className="empty-state">
          <p>No certificates received yet.</p>
        </div>
      ) : filteredCerts.length === 0 ? (
        <div className="empty-state">
          <p>No certificates match your filters.</p>
        </div>
      ) : (
        <div className="cert-grid">
          {filteredCerts.map(({ id, index }) => {
            const cert = certResults?.[index]?.status === 'success' ? certResults[index].result as {
              fileId: bigint; institutionId: bigint; fileHash: string; recipient: string;
              certType: number; issuedAt: number; expiresAt: number; revoked: boolean;
              recipientName: string; metadata: string;
            } : null;
            const valid = validResults?.[index]?.status === 'success' ? validResults[index].result as boolean : false;

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
  );
}
