import { useState, useEffect, useRef } from 'react';
import { usePublicClient, useSignMessage, useWriteContract, useWalletClient } from 'wagmi';
import { encodeFunctionData } from 'viem';
import toast from 'react-hot-toast';
import { formatFileSize, chunksToBlob, fileToChunks } from '../utils/ipfs.ts';
import { decryptFile, deriveKeyFromSignature, encryptFile, friendlyError } from '../utils/crypto.ts';
import { CONTRACT_ADDRESS } from '../constants.ts';
import { baseVaultAbi } from '../abi/index.ts';

const SIGN_MESSAGE = 'BaseVault: Authorize encryption key for private files';

function FileViewer({ url, fileName, fileType, onClose }: { url: string; fileName: string; fileType: string; onClose: () => void }) {
  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';
  const isText = fileType.startsWith('text/') || fileType === 'application/json' || fileType === 'application/xml';
  const isVideo = fileType.startsWith('video/');
  const isAudio = fileType.startsWith('audio/');

  const [textContent, setTextContent] = useState<string>('');

  useEffect(() => {
    if (isText) {
      fetch(url).then(r => r.text()).then(setTextContent).catch(() => setTextContent('Failed to load file content.'));
    }
  }, [url, isText]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const openInNewTab = () => {
    window.open(url, '_blank');
  };

  const renderContent = () => {
    if (isImage) {
      return <img src={url} alt={fileName} />;
    }
    if (isPdf) {
      return (
        <object data={url} type="application/pdf" className="file-viewer-pdf">
          <div className="file-viewer-fallback">
            <p>PDF preview not supported on this device.</p>
            <div className="file-viewer-fallback-actions">
              <button className="btn btn-sm btn-primary" onClick={openInNewTab}>Open in New Tab</button>
              <a href={url} download={fileName} className="btn btn-sm">Download</a>
            </div>
          </div>
        </object>
      );
    }
    if (isVideo) {
      return <video src={url} controls autoPlay className="file-viewer-video" />;
    }
    if (isAudio) {
      return (
        <div className="file-viewer-audio">
          <div className="file-viewer-audio-icon">&#9835;</div>
          <p>{fileName}</p>
          <audio src={url} controls autoPlay />
        </div>
      );
    }
    if (isText) {
      return <pre>{textContent}</pre>;
    }
    return (
      <div className="file-viewer-fallback">
        <p>Preview not available for this file type.</p>
        <div className="file-viewer-fallback-actions">
          <button className="btn btn-sm btn-primary" onClick={openInNewTab}>Open in New Tab</button>
          <a href={url} download={fileName} className="btn btn-sm">Download</a>
        </div>
      </div>
    );
  };

  return (
    <div className="file-viewer-overlay" onClick={onClose}>
      <div className="file-viewer-content" onClick={e => e.stopPropagation()}>
        <button className="file-viewer-close" onClick={onClose}>&times;</button>
        <div className="file-viewer-filename" title={fileName}>{fileName}</div>
        <div className="file-viewer-body">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

interface FileCardProps {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileHash?: string;
  uploader: string;
  uploadedAt: number;
  certified: boolean;
  chunkCount: number;
  isPublic: boolean;
  isOwner?: boolean;
  onCertify?: (id: number) => void;
  showCertify?: boolean;
  onToggleVisibility?: (id: number, isPublic: boolean) => void;
}

export default function FileCard({
  id,
  fileName,
  fileType,
  fileSize,
  fileHash,
  uploader,
  uploadedAt,
  certified,
  chunkCount,
  isPublic,
  isOwner = false,
  onCertify,
  showCertify = false,
  onToggleVisibility,
}: FileCardProps) {
  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';
  const date = new Date(uploadedAt * 1000);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showDecrypt, setShowDecrypt] = useState(false);
  const [decryptPassword, setDecryptPassword] = useState('');
  const [showViewer, setShowViewer] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string>('');
  const [isIncomplete, setIsIncomplete] = useState(false);
  const [resumeProgress, setResumeProgress] = useState('');
  const [resumeChunkStatus, setResumeChunkStatus] = useState({ current: 0, total: 0 });
  const [resumePassword, setResumePassword] = useState('');
  const [showResumePassword, setShowResumePassword] = useState(false);
  const [pendingResumeFile, setPendingResumeFile] = useState<File | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();
  const { writeContractAsync } = useWriteContract();
  const { data: walletClient } = useWalletClient();

  // Check if file is incomplete (chunk 0 is empty)
  useEffect(() => {
    if (!publicClient || chunkCount === 0 || !isOwner) return;
    (async () => {
      try {
        const chunk0 = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: baseVaultAbi,
          functionName: 'getChunk',
          args: [BigInt(id), BigInt(0)],
        }) as string;
        // Empty chunk = 0x or very short
        if (!chunk0 || chunk0 === '0x' || chunk0.length < 10) {
          setIsIncomplete(true);
        }
      } catch { /* ignore */ }
    })();
  }, [id, chunkCount, isOwner]);

  const waitForReceipt = async (hash: `0x${string}`, timeoutMs = 120_000) => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const receipt = await publicClient!.getTransactionReceipt({ hash });
        if (receipt) return receipt;
      } catch { /* not mined yet */ }
      await new Promise(r => setTimeout(r, 2000));
    }
    throw new Error('Transaction confirmation timed out.');
  };

  const handleResumeUpload = async (selectedFile: File, pwd?: string) => {
    if (!publicClient) return;
    setLoading(true);
    setResumeProgress('Preparing file...');

    try {
      let buffer = await selectedFile.arrayBuffer();

      // If private, need to encrypt first
      if (!isPublic) {
        if (!pwd) {
          toast.error('Password required for private file');
          setLoading(false);
          setResumeProgress('');
          return;
        }
        setResumeProgress('Sign to encrypt...');
        const signature = await signMessageAsync({ message: SIGN_MESSAGE });
        const key = deriveKeyFromSignature(signature, pwd);
        setResumeProgress('Encrypting...');
        buffer = encryptFile(buffer, key);
      }

      const chunks = fileToChunks(buffer);
      if (chunks.length !== chunkCount) {
        toast.error(`Chunk count mismatch. Expected ${chunkCount}, got ${chunks.length}. Select the same file.`);
        setLoading(false);
        setResumeProgress('');
        return;
      }

      // Find which chunks are missing
      setResumeProgress('Checking uploaded chunks...');
      const missing: number[] = [];
      for (let i = 0; i < chunkCount; i++) {
        const existing = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: baseVaultAbi,
          functionName: 'getChunk',
          args: [BigInt(id), BigInt(i)],
        }) as string;
        if (!existing || existing === '0x' || existing.length < 10) {
          missing.push(i);
        }
      }

      if (missing.length === 0) {
        toast.success('All chunks already uploaded!');
        setIsIncomplete(false);
        setLoading(false);
        setResumeProgress('');
        setPendingResumeFile(null);
        setShowResumePassword(false);
        return;
      }

      toast(`Uploading ${missing.length} missing chunk${missing.length > 1 ? 's' : ''}...`);
      setResumeChunkStatus({ current: 0, total: missing.length });

      // Try batch first
      let batchOk = false;
      if (walletClient && missing.length > 1) {
        try {
          const calls = missing.map(idx => ({
            to: CONTRACT_ADDRESS as `0x${string}`,
            data: encodeFunctionData({
              abi: baseVaultAbi,
              functionName: 'uploadChunk',
              args: [BigInt(id), BigInt(idx), chunks[idx]],
            }),
            value: '0x0' as const,
          }));
          const batchId = await (walletClient as any).request({
            method: 'wallet_sendCalls',
            params: [{ version: '1.0', from: walletClient.account.address, calls, chainId: `0x${(8453).toString(16)}` }],
          });
          setResumeProgress('Waiting for batch confirmation...');
          let confirmed = false;
          for (let p = 0; p < 120 && !confirmed; p++) {
            await new Promise(r => setTimeout(r, 2000));
            try {
              const result = await (walletClient as any).request({ method: 'wallet_getCallsStatus', params: [batchId] });
              const st = (result.status || '').toString().toUpperCase();
              if (st === 'CONFIRMED' || st === 'COMPLETE' || st === 'COMPLETED' || result.status === 200) confirmed = true;
              else if (st === 'FAILED' || st === 'REJECTED') throw new Error('Batch failed');
            } catch (e: any) { if (e?.message?.includes('failed')) throw e; }
          }
          batchOk = confirmed;
        } catch { /* fallback to sequential */ }
      }

      if (!batchOk) {
        for (let m = 0; m < missing.length; m++) {
          const idx = missing[m];
          setResumeProgress(`Uploading chunk ${m + 1} of ${missing.length}...`);
          setResumeChunkStatus({ current: m, total: missing.length });

          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const tx = await writeContractAsync({
                address: CONTRACT_ADDRESS,
                abi: baseVaultAbi,
                functionName: 'uploadChunk',
                args: [BigInt(id), BigInt(idx), chunks[idx]],
              });
              setResumeProgress(`Waiting for confirmation (${m + 1}/${missing.length})...`);
              await waitForReceipt(tx);
              break;
            } catch (err: any) {
              if (attempt === 3) throw err;
              await new Promise(r => setTimeout(r, 3000 * attempt));
            }
          }
          setResumeChunkStatus({ current: m + 1, total: missing.length });
        }
      }

      toast.success('Upload complete!');
      setIsIncomplete(false);
      setResumeProgress('');
      setResumeChunkStatus({ current: 0, total: 0 });
      setPendingResumeFile(null);
      setShowResumePassword(false);
    } catch (err: any) {
      console.error('Resume failed:', err);
      toast.error(friendlyError(err));
      setResumeProgress('');
    }
    setLoading(false);
  };

  const handleView = async () => {
    if (viewerUrl) {
      setShowViewer(true);
      return;
    }
    if (previewUrl) {
      setViewerUrl(previewUrl);
      setShowViewer(true);
      return;
    }
    if (!publicClient || chunkCount === 0) return;

    // Private file: show password prompt
    if (!isPublic && isOwner && !viewerUrl) {
      setShowDecrypt(true);
      return;
    }

    if (!isPublic) return;
    setLoading(true);
    try {
      const chunks = await loadChunks();
      const url = chunksToBlob(chunks, fileType);
      setViewerUrl(url);
      setShowViewer(true);
    } catch (err) {
      console.error('View failed:', err);
      toast.error('Failed to load file');
    }
    setLoading(false);
  };

  const loadChunks = async (): Promise<string[]> => {
    if (!publicClient) return [];
    const chunks: string[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: baseVaultAbi,
        functionName: 'getChunk',
        args: [BigInt(id), BigInt(i)],
      });
      chunks.push(data as string);
    }
    return chunks;
  };

  const reassembleChunks = (chunks: string[]): Uint8Array => {
    const hexStr = chunks.map(c => c.startsWith('0x') ? c.slice(2) : c).join('');
    const bytes = new Uint8Array(hexStr.length / 2);
    for (let i = 0; i < hexStr.length; i += 2) {
      bytes[i / 2] = parseInt(hexStr.substring(i, i + 2), 16);
    }
    return bytes;
  };

  const loadPreview = async () => {
    if (!publicClient || !isImage || chunkCount === 0 || previewUrl || !isPublic) return;
    setLoading(true);
    try {
      const chunks = await loadChunks();
      const url = chunksToBlob(chunks, fileType);
      setPreviewUrl(url);
    } catch (err) {
      console.error('Preview load failed:', err);
    }
    setLoading(false);
  };

  const handleDecrypt = async () => {
    if (!publicClient || chunkCount === 0 || !decryptPassword) {
      toast.error('Enter your password');
      return;
    }
    setLoading(true);
    try {
      const signature = await signMessageAsync({ message: SIGN_MESSAGE });
      const key = deriveKeyFromSignature(signature, decryptPassword);

      const chunks = await loadChunks();
      const bytes = reassembleChunks(chunks);
      const decrypted = decryptFile(bytes.buffer as ArrayBuffer, key);

      const blob = new Blob([new Uint8Array(decrypted)], { type: fileType });
      const url = URL.createObjectURL(blob);
      setViewerUrl(url);
      setShowDecrypt(false);
      setDecryptPassword('');

      if (isImage) {
        setPreviewUrl(url);
      }
      toast.success('Decrypted!');
      setShowViewer(true);
    } catch (err: any) {
      console.error('Decrypt failed:', err);
      toast.error('Decryption failed. Wrong wallet or password?');
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!publicClient || chunkCount === 0) return;
    setLoading(true);
    try {
      const chunks = await loadChunks();
      const bytes = reassembleChunks(chunks);
      const blob = new Blob([new Uint8Array(bytes)], { type: fileType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isImage && isPublic && chunkCount <= 4) {
      loadPreview();
    }
  }, [id]);

  const handleLock = () => {
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setViewerUrl('');
    setPreviewUrl('');
    setShowViewer(false);
    setShowDecrypt(false);
    setDecryptPassword('');
    toast.success('File locked');
  };

  return (
    <div className="file-card">
      <div className="file-card-preview">
        {!isPublic && !previewUrl ? (
          <div className="private-overlay">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Encrypted</span>
          </div>
        ) : isImage && previewUrl ? (
          <img src={previewUrl} alt={fileName} />
        ) : isImage && !previewUrl ? (
          <div className="file-icon file-icon-img" onClick={loadPreview} style={{ cursor: 'pointer' }}>
            {loading ? '...' : 'IMG'}
          </div>
        ) : isPdf ? (
          <div className="file-icon file-icon-pdf">PDF</div>
        ) : (
          <div className="file-icon file-icon-doc">FILE</div>
        )}
        {certified && <div className="certified-badge">Certified</div>}
        {!isPublic && <div className="private-badge">Private</div>}
        {isIncomplete && <div className="incomplete-badge">Incomplete</div>}
      </div>
      <div className="file-card-info">
        <h3 className="file-card-name" title={fileName}>{fileName}</h3>

        <div className="file-card-details">
          <div className="file-card-detail">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span>{formatFileSize(fileSize)}</span>
          </div>
          <div className="file-card-detail">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>{date.toLocaleDateString()}</span>
          </div>
          <div className="file-card-detail">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M7 10h10M7 14h6"/></svg>
            <span>{chunkCount} chunk{chunkCount > 1 ? 's' : ''}</span>
          </div>
          <div className="file-card-detail">
            {isPublic ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
            )}
            <span>{isPublic ? 'Public' : 'Private'}</span>
          </div>
        </div>

        <div className="file-card-footer">
          <div className="file-card-address" title={uploader}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {uploader.slice(0, 6)}...{uploader.slice(-4)}
          </div>
          {fileHash && (
            <div className="file-card-hash">
              <code title={fileHash}>{fileHash.slice(0, 10)}...{fileHash.slice(-8)}</code>
              <button
                className="file-card-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(fileHash).then(() => toast.success('Hash copied!')).catch(() => toast.error('Copy failed'));
                }}
                title="Copy hash"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
          )}
        </div>

        {!isPublic && isOwner && showDecrypt && (
          <div className="decrypt-section">
            <label>Enter your password:</label>
            <div className="decrypt-input-row">
              <input
                type="text"
                placeholder="Password..."
                value={decryptPassword}
                onChange={(e) => setDecryptPassword(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button className="btn btn-sm btn-primary" onClick={handleDecrypt} disabled={loading || !decryptPassword}>
                {loading ? '...' : 'Decrypt'}
              </button>
            </div>
          </div>
        )}

        {/* Resume upload for incomplete files */}
        {isIncomplete && isOwner && (
          <div className="file-card-resume">
            {resumeProgress ? (
              <div className="resume-progress">
                <div className="spinner spinner-sm" />
                <span>{resumeProgress}</span>
                {resumeChunkStatus.total > 0 && (
                  <div className="progress-bar" style={{ marginTop: '6px' }}>
                    <div className="progress-fill" style={{ width: `${(resumeChunkStatus.current / resumeChunkStatus.total) * 100}%` }} />
                  </div>
                )}
              </div>
            ) : showResumePassword && pendingResumeFile ? (
              <div className="resume-password-section">
                <label>Enter encryption password:</label>
                <div className="decrypt-input-row">
                  <input
                    type="text"
                    placeholder="Password..."
                    value={resumePassword}
                    onChange={(e) => setResumePassword(e.target.value)}
                    autoComplete="off"
                  />
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleResumeUpload(pendingResumeFile, resumePassword)}
                    disabled={loading || !resumePassword}
                  >
                    Go
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="resume-hint">Chunks missing. Select the same file to resume upload.</p>
                <input
                  ref={resumeInputRef}
                  type="file"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      if (!isPublic) {
                        setPendingResumeFile(f);
                        setShowResumePassword(true);
                      } else {
                        handleResumeUpload(f);
                      }
                    }
                  }}
                />
                <button className="btn btn-sm btn-warning" onClick={() => resumeInputRef.current?.click()} disabled={loading}>
                  Resume Upload
                </button>
              </>
            )}
          </div>
        )}

        <div className="file-card-actions">
          {!isIncomplete && (isPublic || isOwner) && (
            <button className="btn btn-sm btn-primary" onClick={handleView} disabled={loading}>
              {loading ? '...' : 'View'}
            </button>
          )}
          {!isPublic && isOwner && viewerUrl && (
            <button className="btn btn-sm btn-lock" onClick={handleLock}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              Lock
            </button>
          )}
          {isPublic && !isIncomplete && (
            <button className="btn btn-sm" onClick={handleDownload} disabled={loading}>
              {loading ? '...' : 'Download'}
            </button>
          )}
          {isOwner && onToggleVisibility && (
            <button className="btn btn-sm" onClick={() => onToggleVisibility(id, !isPublic)}>
              {isPublic ? 'Make Private' : 'Make Public'}
            </button>
          )}
          {showCertify && !certified && onCertify && (
            <button className="btn btn-sm btn-accent" onClick={() => onCertify(id)}>
              Certify
            </button>
          )}
        </div>
      </div>

      {showViewer && viewerUrl && (
        <FileViewer url={viewerUrl} fileName={fileName} fileType={fileType} onClose={() => setShowViewer(false)} />
      )}
    </div>
  );
}
