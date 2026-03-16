import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useWalletClient } from 'wagmi';
import { useQueryClient } from '@tanstack/react-query';
import { encodeFunctionData, isAddress } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import toast from 'react-hot-toast';
import { CERTIFIER_ADDRESS, CONTRACT_ADDRESS, INSTITUTION_STATUS, CERT_TYPE_LABELS } from '../constants.ts';
import { certifierAbi, baseVaultAbi } from '../abi/index.ts';
import CertTypeSelect from '../components/CertTypeSelect.tsx';
import CertCard from '../components/CertCard.tsx';
import SearchFilter from '../components/SearchFilter.tsx';
import FileDropzone from '../components/FileDropzone.tsx';
import { computeFileHash, fileToChunks, formatFileSize } from '../utils/ipfs.ts';
import { friendlyError } from '../utils/crypto.ts';
import { isENSName, resolveENS } from '../utils/ens.ts';

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Valid', value: 'valid' },
  { label: 'Revoked', value: 'revoked' },
];

const BATCH_SIZE = 50;

export default function InstitutionDashboard() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const qc = useQueryClient();

  const [instId, setInstId] = useState<number | null>(null);
  const [fileIdOrHash, setFileIdOrHash] = useState('');
  const [useHash, setUseHash] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [certType, setCertType] = useState(0);
  const [expiresAt, setExpiresAt] = useState('');
  const [metadata, setMetadata] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  // ENS resolution
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [isResolvingENS, setIsResolvingENS] = useState(false);
  const [ensError, setEnsError] = useState('');

  // Upload & Certify state
  const [certMode, setCertMode] = useState<'existing' | 'upload'>('existing');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'hashing' | 'creating' | 'uploading' | 'done'>('idle');
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadChunkProgress, setUploadChunkProgress] = useState({ current: 0, total: 0 });
  const [uploadedFileId, setUploadedFileId] = useState<number>(0);
  const [uploadedFileHash, setUploadedFileHash] = useState('');

  // Auto-resolve ENS/Base names with debounce
  useEffect(() => {
    setResolvedAddress(null);
    setEnsError('');

    if (!recipient || !isENSName(recipient)) return;

    const timeout = setTimeout(async () => {
      setIsResolvingENS(true);
      setEnsError('');
      try {
        const addr = await resolveENS(recipient);
        if (addr) {
          setResolvedAddress(addr);
        } else {
          setEnsError(`Could not resolve "${recipient}"`);
        }
      } catch {
        setEnsError(`Failed to resolve "${recipient}"`);
      }
      setIsResolvingENS(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [recipient]);

  const { data: instCount } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'institutionCount',
  });

  const { data: perCertFee } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'perCertFee',
  });

  const { data: feePerChunk } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'feePerChunk',
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

  useEffect(() => {
    if (!instResults || !address) return;
    for (let i = 0; i < instResults.length; i++) {
      const r = instResults[i];
      if (r.status === 'success' && r.result) {
        const inst = r.result as { admin: string; status: number; name: string; metadataURI: string; certTypesMask: number; certCount: bigint };
        if (inst.admin.toLowerCase() === address.toLowerCase()) {
          setInstId(i + 1);
          return;
        }
      }
    }
  }, [instResults, address]);

  const myInst = instId && instResults?.[instId - 1]?.status === 'success'
    ? instResults[instId - 1].result as { admin: string; status: number; name: string; metadataURI: string; certTypesMask: number; certCount: bigint }
    : null;

  const { data: certIds } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'getInstitutionCerts',
    args: [BigInt(instId || 0)],
    query: { enabled: !!instId },
  });

  const allCertIds = (certIds as bigint[] || []).slice().reverse();

  const certQueries = allCertIds.map(id => ({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'getCert' as const,
    args: [id],
  }));

  const validQueries = allCertIds.map(id => ({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'isCertValid' as const,
    args: [id],
  }));

  const { data: certResults } = useReadContracts({ contracts: certQueries, query: { enabled: allCertIds.length > 0 } });
  const { data: validResults } = useReadContracts({ contracts: validQueries, query: { enabled: allCertIds.length > 0 } });

  // Stats
  const stats = useMemo(() => {
    let valid = 0, revoked = 0, expired = 0;
    if (!certResults || !validResults) return { valid, revoked, expired };
    allCertIds.forEach((_, i) => {
      const cert = certResults?.[i]?.status === 'success' ? certResults[i].result as any : null;
      const v = validResults?.[i]?.status === 'success' ? validResults[i].result as boolean : false;
      if (!cert) return;
      if (cert.revoked) revoked++;
      else if (cert.expiresAt > 0 && Date.now() / 1000 > cert.expiresAt) expired++;
      else if (v) valid++;
    });
    return { valid, revoked, expired };
  }, [certResults, validResults, allCertIds]);

  // Filtered certs
  const filteredCerts = useMemo(() => {
    const items: Array<{ id: bigint; index: number }> = [];
    allCertIds.forEach((id, i) => {
      const cert = certResults?.[i]?.status === 'success' ? certResults[i].result as any : null;
      const v = validResults?.[i]?.status === 'success' ? validResults[i].result as boolean : false;
      if (!cert) return;

      if (search) {
        const q = search.toLowerCase();
        if (!cert.recipientName.toLowerCase().includes(q) && !cert.recipient.toLowerCase().includes(q)) return;
      }

      if (activeFilter === 'valid' && !v) return;
      if (activeFilter === 'revoked' && !cert.revoked) return;

      items.push({ id, index: i });
    });
    return items;
  }, [allCertIds, certResults, validResults, search, activeFilter]);

  // Certify
  const { writeContract: writeCertify, data: certifyTx, isPending: isCertifying } = useWriteContract();
  const { isLoading: isCertifyConfirming, isSuccess: certifySuccess } = useWaitForTransactionReceipt({ hash: certifyTx });

  // Revoke
  const { writeContract: writeRevoke, data: revokeTx, isPending: isRevoking } = useWriteContract();
  useWaitForTransactionReceipt({ hash: revokeTx });

  // Upload & Certify handlers
  const handleUploadFile = async () => {
    if (!uploadFile || !publicClient) return;

    try {
      setUploadStatus('hashing');
      setUploadProgress('Computing SHA-256 hash...');
      const hash = await computeFileHash(uploadFile);
      setUploadedFileHash(hash);

      const buffer = await uploadFile.arrayBuffer();
      const chunks = fileToChunks(buffer);
      const chunkFee = feePerChunk as bigint || 0n;
      const totalFee = chunkFee * BigInt(chunks.length);

      if (chunks.length === 1) {
        setUploadStatus('uploading');
        setUploadProgress('Uploading file in one transaction...');

        const uploadHash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: baseVaultAbi,
          functionName: 'createFileWithData',
          args: [hash as `0x${string}`, uploadFile.name, uploadFile.type, BigInt(uploadFile.size), true, chunks],
          value: totalFee,
        });

        setUploadProgress('Waiting for confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash: uploadHash });

        const fileLog = receipt.logs.find(log =>
          log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() && log.topics.length >= 2
        );
        const newFileId = fileLog ? parseInt(fileLog.topics[1] as string, 16) : 0;
        setUploadedFileId(newFileId);
      } else {
        setUploadStatus('creating');
        setUploadProgress(`Creating file record (${chunks.length} chunks)...`);

        const createHash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: baseVaultAbi,
          functionName: 'createFile',
          args: [hash as `0x${string}`, uploadFile.name, uploadFile.type, BigInt(uploadFile.size), BigInt(chunks.length), true],
          value: totalFee,
        });

        setUploadProgress('Waiting for file record confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash });

        const fileLog = receipt.logs.find(log =>
          log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() && log.topics.length >= 2
        );
        const newFileId = fileLog ? parseInt(fileLog.topics[1] as string, 16) : 0;
        setUploadedFileId(newFileId);

        setUploadStatus('uploading');
        setUploadChunkProgress({ current: 0, total: chunks.length });

        // Try batch upload (EIP-5792)
        let batchSuccess = false;
        if (walletClient && address) {
          try {
            const calls = chunks.map((chunk, i) => ({
              to: CONTRACT_ADDRESS as `0x${string}`,
              data: encodeFunctionData({
                abi: baseVaultAbi,
                functionName: 'uploadChunk',
                args: [BigInt(newFileId), BigInt(i), chunk],
              }),
              value: '0x0' as const,
            }));
            const totalBatches = Math.ceil(calls.length / BATCH_SIZE);
            for (let b = 0; b < totalBatches; b++) {
              const batchCalls = calls.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
              const batchLabel = totalBatches > 1 ? ` (batch ${b + 1}/${totalBatches})` : '';
              setUploadProgress(`Uploading ${batchCalls.length} chunks${batchLabel}...`);
              const batchId = await (walletClient as any).request({
                method: 'wallet_sendCalls',
                params: [{ version: '1.0', from: address, calls: batchCalls, chainId: `0x${(8453).toString(16)}` }],
              });
              setUploadProgress(`Confirming${batchLabel}...`);
              let confirmed = false;
              let polls = 0;
              while (!confirmed && polls < 120) {
                await new Promise(r => setTimeout(r, 2000));
                polls++;
                try {
                  const result = await (walletClient as any).request({ method: 'wallet_getCallsStatus', params: [batchId] });
                  const st = (result.status || '').toString().toUpperCase();
                  if (st === 'CONFIRMED' || st === 'COMPLETE' || st === 'COMPLETED' || result.status === 200) {
                    confirmed = true;
                    setUploadChunkProgress({ current: Math.min((b + 1) * BATCH_SIZE, chunks.length), total: chunks.length });
                  } else if (st === 'FAILED' || st === 'REJECTED') {
                    throw new Error('Batch failed');
                  }
                } catch (e: any) { if (e?.message?.includes('failed')) throw e; }
              }
            }
            batchSuccess = true;
          } catch { batchSuccess = false; }
        }

        // Sequential fallback
        if (!batchSuccess) {
          const txHashes: `0x${string}`[] = [];
          for (let i = 0; i < chunks.length; i++) {
            setUploadProgress(`Approve chunk ${i + 1}/${chunks.length}...`);
            setUploadChunkProgress({ current: i, total: chunks.length });
            const chunkHash = await writeContractAsync({
              address: CONTRACT_ADDRESS,
              abi: baseVaultAbi,
              functionName: 'uploadChunk',
              args: [BigInt(newFileId), BigInt(i), chunks[i]],
            });
            txHashes.push(chunkHash);
          }
          setUploadProgress('Waiting for confirmations...');
          await Promise.all(txHashes.map(async (h) => {
            await publicClient.waitForTransactionReceipt({ hash: h });
            setUploadChunkProgress(prev => ({ ...prev, current: prev.current + 1 }));
          }));
        }
      }

      setUploadStatus('done');
      setUploadProgress('');
      setFileIdOrHash(String(uploadedFileId || 0));
      toast.success('File uploaded on-chain! Now fill recipient details and certify.');
    } catch (err: any) {
      console.error(err);
      toast.error(friendlyError(err));
      setUploadStatus('idle');
      setUploadProgress('');
      setUploadChunkProgress({ current: 0, total: 0 });
    }
  };

  // After upload completes, auto-fill file ID
  useEffect(() => {
    if (uploadStatus === 'done' && uploadedFileId > 0) {
      setFileIdOrHash(String(uploadedFileId));
      setUseHash(false);
    }
  }, [uploadStatus, uploadedFileId]);

  useEffect(() => {
    if (certifySuccess) {
      toast.success('Certificate issued on-chain!');
      setFileIdOrHash('');
      setRecipient('');
      setRecipientName('');
      setMetadata('');
      setExpiresAt('');
      setUploadFile(null);
      setUploadStatus('idle');
      setUploadedFileId(0);
      setUploadedFileHash('');
      setUploadChunkProgress({ current: 0, total: 0 });
      setResolvedAddress(null);
      // Invalidate all cert-related queries so they refetch everywhere
      qc.invalidateQueries();
    }
  }, [certifySuccess]);

  const handleCertify = () => {
    if (!instId) return;
    if (!recipient) { toast.error('Recipient address required'); return; }

    // Resolve final address: use ENS-resolved address if it's an ENS name
    let finalAddress: `0x${string}`;
    if (isENSName(recipient)) {
      if (isResolvingENS) { toast.error('Still resolving ENS name, please wait...'); return; }
      if (!resolvedAddress) { toast.error(`Could not resolve "${recipient}". Enter a valid ENS/Base name or 0x address.`); return; }
      finalAddress = resolvedAddress as `0x${string}`;
    } else {
      if (!isAddress(recipient)) { toast.error('Invalid address. Enter a valid 0x address or ENS name (e.g. name.eth, name.base.eth)'); return; }
      finalAddress = recipient as `0x${string}`;
    }

    const fee = perCertFee as bigint || 0n;
    const expiry = expiresAt ? BigInt(Math.floor(new Date(expiresAt).getTime() / 1000)) : BigInt(0);

    if (certMode === 'upload') {
      if (!uploadedFileId || uploadStatus !== 'done') {
        toast.error('Upload the file first'); return;
      }
      writeCertify({
        address: CERTIFIER_ADDRESS,
        abi: certifierAbi,
        functionName: 'certify',
        args: [BigInt(instId), BigInt(uploadedFileId), finalAddress, certType, expiry, recipientName, metadata],
        value: fee,
      }, { onError: (err) => toast.error(err.message.slice(0, 100)) });
      return;
    }

    if (useHash) {
      if (!fileIdOrHash.startsWith('0x') || fileIdOrHash.length !== 66) {
        toast.error('Enter a valid 0x-prefixed SHA-256 hash'); return;
      }
      writeCertify({
        address: CERTIFIER_ADDRESS,
        abi: certifierAbi,
        functionName: 'certifyByHash',
        args: [BigInt(instId), fileIdOrHash as `0x${string}`, finalAddress, certType, expiry, recipientName, metadata],
        value: fee,
      }, { onError: (err) => toast.error(err.message.slice(0, 100)) });
    } else {
      const fid = Number(fileIdOrHash);
      if (!fid || fid <= 0) { toast.error('Enter a valid file ID'); return; }
      writeCertify({
        address: CERTIFIER_ADDRESS,
        abi: certifierAbi,
        functionName: 'certify',
        args: [BigInt(instId), BigInt(fid), finalAddress, certType, expiry, recipientName, metadata],
        value: fee,
      }, { onError: (err) => toast.error(err.message.slice(0, 100)) });
    }
  };

  const handleRevoke = (certId: number) => {
    setRevokingId(certId);
  };

  const confirmRevoke = () => {
    if (!revokingId) return;
    writeRevoke({
      address: CERTIFIER_ADDRESS,
      abi: certifierAbi,
      functionName: 'revokeCert',
      args: [BigInt(revokingId), revokeReason],
    }, {
      onSuccess: () => { toast.success('Certificate revoked'); setRevokingId(null); setRevokeReason(''); qc.invalidateQueries(); },
      onError: (err) => toast.error(err.message.slice(0, 100)),
    });
  };

  const handleCSVExport = () => {
    if (!certResults || !validResults) return;

    const rows = [['Cert ID', 'Type', 'Recipient Name', 'Recipient Address', 'Issued', 'Expires', 'Status', 'File Hash']];

    allCertIds.forEach((id, i) => {
      const cert = certResults?.[i]?.status === 'success' ? certResults[i].result as any : null;
      const v = validResults?.[i]?.status === 'success' ? validResults[i].result as boolean : false;
      if (!cert) return;

      const expired = cert.expiresAt > 0 && Date.now() / 1000 > cert.expiresAt;
      const status = cert.revoked ? 'Revoked' : expired ? 'Expired' : v ? 'Valid' : 'Invalid';

      rows.push([
        Number(id).toString(),
        CERT_TYPE_LABELS[cert.certType] || 'Unknown',
        cert.recipientName || 'Anonymous',
        cert.recipient,
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
    a.download = `basevault-institution-certs.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  if (!isConnected) {
    return (
      <div className="page">
        <div className="dash-connect-card">
          <div className="dash-connect-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/><circle cx="12" cy="14" r="1.5"/>
            </svg>
          </div>
          <h2>Institution Dashboard</h2>
          <p>Connect your institution wallet to manage certifications, issue new certificates, and view your activity.</p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  if (!instId) {
    return (
      <div className="page">
        <div className="dash-connect-card">
          <div className="dash-connect-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="1.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h2>No Institution Found</h2>
          <p>No registered institution is linked to this wallet address.</p>
          <a href="/register" className="btn btn-primary">Register Your Institution</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page dash-page">
      {/* Institution Header */}
      {myInst && (
        <div className="dash-hero">
          <div className="dash-hero-left">
            <div className="dash-hero-avatar">
              {myInst.name.charAt(0).toUpperCase()}
            </div>
            <div className="dash-hero-info">
              <h1>{myInst.name}</h1>
              <div className="dash-hero-meta">
                <span className={`dash-status-pill dash-status-${myInst.status}`}>
                  {INSTITUTION_STATUS[myInst.status]}
                </span>
                <span className="dash-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0022 16z"/></svg>
                  ID #{instId}
                </span>
                <a
                  href={`https://basescan.org/address/${myInst.admin || address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="dash-meta-link"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  BaseScan
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="dash-stats-row">
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon-total">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-number">{allCertIds.length}</span>
            <span className="dash-stat-label">Total Issued</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon-valid">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-number">{stats.valid}</span>
            <span className="dash-stat-label">Valid</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon-expired">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-number">{stats.expired}</span>
            <span className="dash-stat-label">Expired</span>
          </div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-icon dash-stat-icon-revoked">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <div className="dash-stat-info">
            <span className="dash-stat-number">{stats.revoked}</span>
            <span className="dash-stat-label">Revoked</span>
          </div>
        </div>
      </div>

      {/* Issue Certificate Section */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M8 21l4-7 4 7"/><path d="M12 11v3"/></svg>
            Issue Certificate
          </h2>
        </div>

        {/* Mode Tabs */}
        <div className="dash-mode-tabs">
          <button
            className={`dash-mode-tab ${certMode === 'existing' ? 'active' : ''}`}
            onClick={() => setCertMode('existing')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            Existing File
          </button>
          <button
            className={`dash-mode-tab ${certMode === 'upload' ? 'active' : ''}`}
            onClick={() => setCertMode('upload')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload & Certify
          </button>
        </div>

        <div className="dash-form-body">
          {/* Mode: Certify Existing */}
          {certMode === 'existing' && (
            <div className="dash-form-field">
              <label className="dash-label">
                {useHash ? 'File Hash (SHA-256)' : 'BaseVault File ID'}
                <button className="dash-toggle-btn" onClick={() => setUseHash(!useHash)}>
                  Switch to {useHash ? 'File ID' : 'Hash'}
                </button>
              </label>
              <input
                type="text"
                className="dash-input"
                placeholder={useHash ? '0x...' : 'e.g. 42'}
                value={fileIdOrHash}
                onChange={(e) => {
                  const val = e.target.value;
                  setFileIdOrHash(val);
                  if (val.startsWith('0x') && !useHash) setUseHash(true);
                  if (!val.startsWith('0x') && val.length > 0 && useHash && /^\d+$/.test(val)) setUseHash(false);
                }}
              />
            </div>
          )}

          {/* Mode: Upload & Certify */}
          {certMode === 'upload' && (
            <div className="dash-upload-area">
              {uploadStatus === 'idle' && !uploadFile && (
                <FileDropzone
                  onFilesSelected={(files) => { setUploadFile(files[0]); setUploadStatus('idle'); }}
                  label="Drop document here to upload & certify"
                />
              )}

              {uploadFile && uploadStatus === 'idle' && (
                <div className="dash-file-preview">
                  <div className="dash-file-preview-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div className="dash-file-preview-info">
                    <strong>{uploadFile.name}</strong>
                    <span className="text-dim">{uploadFile.type || 'unknown'} - {formatFileSize(uploadFile.size)}</span>
                  </div>
                  <button className="dash-file-remove" onClick={() => setUploadFile(null)} title="Remove">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              )}

              {uploadFile && uploadStatus === 'idle' && (
                <button className="btn btn-primary btn-full" onClick={handleUploadFile}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload On-Chain (Public)
                </button>
              )}

              {(uploadStatus === 'hashing' || uploadStatus === 'creating' || uploadStatus === 'uploading') && (
                <div className="dash-upload-progress">
                  <div className="spinner" />
                  <p>{uploadProgress}</p>
                  {uploadChunkProgress.total > 0 && (
                    <>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${(uploadChunkProgress.current / uploadChunkProgress.total) * 100}%` }} />
                      </div>
                      <p className="text-dim" style={{ fontSize: 13 }}>{uploadChunkProgress.current}/{uploadChunkProgress.total} chunks</p>
                    </>
                  )}
                </div>
              )}

              {uploadStatus === 'done' && (
                <div className="dash-upload-done">
                  <div className="dash-upload-done-check">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00c853" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div>
                    <strong>Uploaded! File ID: #{uploadedFileId}</strong>
                    <span className="text-dim" style={{ fontSize: 12, wordBreak: 'break-all', display: 'block', marginTop: 2 }}>{uploadedFileHash}</span>
                  </div>
                  <button className="btn btn-sm btn-outline" onClick={() => { setUploadFile(null); setUploadStatus('idle'); setUploadedFileId(0); setUploadedFileHash(''); }}>
                    Change
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Recipient Fields */}
          <div className="dash-form-row">
            <div className="dash-form-field">
              <label className="dash-label">Recipient Address *</label>
              <input type="text" className="dash-input" placeholder="0x... or name.eth / name.base.eth" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
              {isResolvingENS && (
                <div className="dash-ens-status dash-ens-resolving">
                  <div className="spinner spinner-xs" /> Resolving {recipient}...
                </div>
              )}
              {resolvedAddress && !isResolvingENS && (
                <div className="dash-ens-status dash-ens-resolved">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00c853" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  {resolvedAddress.slice(0, 6)}...{resolvedAddress.slice(-4)}
                </div>
              )}
              {ensError && !isResolvingENS && (
                <div className="dash-ens-status dash-ens-error">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  {ensError}
                </div>
              )}
            </div>
            <div className="dash-form-field">
              <label className="dash-label">Recipient Name</label>
              <input type="text" className="dash-input" placeholder="John Doe" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
            </div>
          </div>

          <div className="dash-form-row">
            <div className="dash-form-field">
              <label className="dash-label">Certification Type</label>
              <CertTypeSelect value={certType} onChange={setCertType} allowedMask={myInst?.certTypesMask} />
            </div>
            <div className="dash-form-field">
              <label className="dash-label">Expires At (optional)</label>
              <input type="date" className="dash-input" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
          </div>

          <div className="dash-form-field">
            <label className="dash-label">Metadata JSON (optional)</label>
            <textarea
              className="dash-input dash-textarea"
              placeholder='{"program": "Computer Science", "grade": "A"}'
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              rows={3}
            />
          </div>

          <div className="dash-form-fee">
            <span>Certification Fee</span>
            <span className="dash-fee-value">Free (gas only)</span>
          </div>

          <button
            className="btn btn-primary btn-full dash-submit-btn"
            onClick={handleCertify}
            disabled={isCertifying || isCertifyConfirming || (certMode === 'upload' && uploadStatus !== 'done')}
          >
            {isCertifying ? (
              <><div className="spinner spinner-sm" style={{ marginRight: 8 }} /> Confirm in Wallet...</>
            ) : isCertifyConfirming ? (
              <><div className="spinner spinner-sm" style={{ marginRight: 8 }} /> Confirming on-chain...</>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
                Issue Certificate
              </>
            )}
          </button>

          {certMode === 'upload' && uploadStatus !== 'done' && (
            <p className="dash-form-hint">Upload the file first, then fill recipient details and certify.</p>
          )}
        </div>
      </div>

      {/* Issued Certificates Section */}
      <div className="dash-section">
        <div className="dash-section-header">
          <h2>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            Issued Certificates
            <span className="dash-section-count">{allCertIds.length}</span>
          </h2>
          {allCertIds.length > 0 && (
            <button className="btn btn-sm btn-outline" onClick={handleCSVExport}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export CSV
            </button>
          )}
        </div>

        {allCertIds.length > 0 && (
          <SearchFilter
            searchValue={search}
            onSearchChange={setSearch}
            placeholder="Search by recipient name or address..."
            filters={filters}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            resultCount={filteredCerts.length}
          />
        )}

        {filteredCerts.length === 0 ? (
          <div className="dash-empty-certs">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <p>{allCertIds.length === 0 ? 'No certificates issued yet. Use the form above to issue your first certificate.' : 'No certificates match your search or filters.'}</p>
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
                  institutionName={myInst?.name || ''}
                  issuedAt={Number(cert.issuedAt)}
                  expiresAt={Number(cert.expiresAt)}
                  revoked={cert.revoked}
                  isValid={valid}
                  showRevoke
                  onRevoke={() => handleRevoke(Number(id))}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Revoke Modal */}
      {revokingId && (
        <div className="modal-overlay" onClick={() => setRevokingId(null)}>
          <div className="modal dash-revoke-modal" onClick={(e) => e.stopPropagation()}>
            <div className="dash-revoke-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <h3>Revoke Certificate #{revokingId}</h3>
            </div>
            <p className="dash-revoke-warning">This action is permanent and cannot be undone. The certificate will be marked as revoked on-chain forever.</p>
            <div className="dash-form-field">
              <label className="dash-label">Reason for Revocation</label>
              <input type="text" className="dash-input" placeholder="e.g. Document was forged, graduation revoked..." value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} />
            </div>
            <div className="dash-revoke-actions">
              <button className="btn btn-outline" onClick={() => setRevokingId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={confirmRevoke} disabled={isRevoking}>
                {isRevoking ? (
                  <><div className="spinner spinner-sm" style={{ marginRight: 6 }} /> Revoking...</>
                ) : 'Revoke Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
