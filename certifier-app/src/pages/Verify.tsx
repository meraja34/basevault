import { useState, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { CERTIFIER_ADDRESS, BASEVAULT_ADDRESS, CERT_TYPE_LABELS, CERT_TYPE_ICONS } from '../constants.ts';
import { certifierAbi, baseVaultAbi } from '../abi/index.ts';
import { computeFileHash } from '../utils/ipfs.ts';
import CertBadge from '../components/CertBadge.tsx';
import FileDropzone from '../components/FileDropzone.tsx';
import VerificationBadge from '../components/VerificationBadge.tsx';

export default function Verify() {
  const [hash, setHash] = useState('');
  const [mode, setMode] = useState<'file' | 'hash'>('file');
  const [fileName, setFileName] = useState('');
  const [hashing, setHashing] = useState(false);

  const hashToVerify = hash as `0x${string}`;
  const isValidHash = hash.startsWith('0x') && hash.length === 66;

  // Check BaseVault V6
  const { data: vaultResult, isLoading: vaultLoading } = useReadContract({
    address: BASEVAULT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'verifyDocument',
    args: [hashToVerify],
    query: { enabled: isValidHash },
  });

  const vaultData = vaultResult as [boolean, bigint, string, bigint, boolean, string] | undefined;

  // Check Certifier
  const { data: instCerts, isLoading: certsLoading } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'verifyCertifications',
    args: [hashToVerify],
    query: { enabled: isValidHash },
  });

  const certList = (instCerts as Array<{
    fileId: bigint; institutionId: bigint; fileHash: string; recipient: string;
    certType: number; issuedAt: number; expiresAt: number; revoked: boolean;
    recipientName: string; metadata: string;
  }>) || [];

  const isLoading = vaultLoading || certsLoading;

  const handleFileSelect = useCallback(async (files: File[]) => {
    const file = files[0];
    setFileName(file.name);
    setHashing(true);
    try {
      const h = await computeFileHash(file);
      setHash(h);
    } catch {
      setHash('');
    }
    setHashing(false);
  }, []);

  return (
    <div className="page">
      <h1 className="page-title">Verify Document</h1>
      <p className="page-desc">
        Check if a document is registered on BaseVault and/or has institutional certifications.
        Drop a file or enter its SHA-256 hash.
      </p>

      {/* Mode Tabs */}
      <div className="verify-tabs">
        <button className={`tab ${mode === 'file' ? 'tab-active' : ''}`} onClick={() => setMode('file')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Drop File
        </button>
        <button className={`tab ${mode === 'hash' ? 'tab-active' : ''}`} onClick={() => setMode('hash')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
            <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
          </svg>
          Enter Hash
        </button>
      </div>

      {mode === 'file' ? (
        <div className="verify-upload">
          <FileDropzone onFilesSelected={handleFileSelect} label="Drop a file to verify its on-chain status" />
          {hashing && (
            <div className="verify-hashing">
              <div className="spinner" style={{ width: 20, height: 20 }} />
              <span>Computing SHA-256 hash...</span>
            </div>
          )}
          {fileName && !hashing && (
            <div className="verify-file-info">
              <p>File: <strong>{fileName}</strong></p>
              <p>Hash: <code>{hash.slice(0, 20)}...{hash.slice(-8)}</code></p>
            </div>
          )}
        </div>
      ) : (
        <div className="form-card">
          <input
            type="text"
            className="input-full"
            placeholder="Enter SHA-256 hash (0x...)"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
          />
        </div>
      )}

      {isLoading && isValidHash && (
        <div className="loading">
          <div className="spinner" />
          <p>Checking Base chain...</p>
        </div>
      )}

      {/* BaseVault V6 Result */}
      {vaultData && isValidHash && !isLoading && (
        <div className={`verify-result ${vaultData[0] ? 'verify-found' : 'verify-not-found'}`}>
          {vaultData[0] ? (
            <>
              <div className="verify-status verify-status-found">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00c853" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3>Document Found On-Chain</h3>
              </div>
              <div className="verify-details">
                <div className="detail-row">
                  <span className="detail-label">File Name:</span>
                  <span className="detail-value">{vaultData[5]}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Uploader:</span>
                  <code className="detail-value">{vaultData[2]}</code>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Upload Date:</span>
                  <span className="detail-value">
                    {new Date(Number(vaultData[3]) * 1000).toLocaleString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
                    })}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">File ID:</span>
                  <span className="detail-value">#{Number(vaultData[1])}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Self-Certified:</span>
                  <span className={`detail-value ${vaultData[4] ? 'text-green' : 'text-yellow'}`}>
                    {vaultData[4] ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">BaseScan:</span>
                  <a
                    href={`https://basescan.org/address/${BASEVAULT_ADDRESS}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View Contract
                  </a>
                </div>
              </div>

              {/* Embed Badge */}
              <div style={{ marginTop: '16px' }}>
                <VerificationBadge fileHash={hash} isValid={true} />
              </div>
            </>
          ) : (
            <div className="verify-status verify-status-not-found">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff5252" strokeWidth="2">
                <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <h3>Document Not Found on BaseVault</h3>
            </div>
          )}
        </div>
      )}

      {/* Institutional Certifications */}
      {isValidHash && !isLoading && certList.length > 0 && (
        <div className="verify-inst-section">
          <h3 className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0052FF" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Institutional Certifications ({certList.length})
          </h3>
          <div className="inst-cert-list">
            {certList.map((cert, i) => {
              const expired = cert.expiresAt > 0 && Date.now() / 1000 > cert.expiresAt;
              const valid = !cert.revoked && !expired;
              return (
                <div key={i} className="inst-cert-item">
                  <div className="inst-cert-header">
                    <span className="cert-type-badge-sm">
                      {CERT_TYPE_ICONS[cert.certType]} {CERT_TYPE_LABELS[cert.certType]}
                    </span>
                    <CertBadge valid={valid} revoked={cert.revoked} expired={!!expired} size="sm" />
                  </div>
                  <div className="inst-cert-details">
                    <span>Institution #{Number(cert.institutionId)}</span>
                    {cert.recipientName && <span>Recipient: {cert.recipientName}</span>}
                    <span>
                      Issued: {new Date(Number(cert.issuedAt) * 1000).toLocaleDateString('en-US', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isValidHash && !isLoading && certList.length === 0 && vaultData && (
        <div className="verify-inst-empty">
          <p className="text-dim">No institutional certifications found for this hash.</p>
        </div>
      )}
    </div>
  );
}
