import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useReadContract, usePublicClient, useSignMessage, useAccount } from 'wagmi';
import { CERTIFIER_ADDRESS, CONTRACT_ADDRESS, CERT_TYPE_LABELS, CERT_TYPE_ICONS } from '../constants.ts';
import { certifierAbi, baseVaultAbi } from '../abi/index.ts';
import { formatFileSize, chunksToBlob } from '../utils/ipfs.ts';
import { deriveKeyFromSignature, decryptFile } from '../utils/crypto.ts';
import CertBadge from '../components/CertBadge.tsx';
import QRCode from '../components/QRCode.tsx';
import ShareButtons from '../components/ShareButtons.tsx';
import VerificationBadge from '../components/VerificationBadge.tsx';
import toast from 'react-hot-toast';

const SIGN_MESSAGE = 'BaseVault: Authorize encryption key for private files';

export default function CertificateView() {
  const { certId } = useParams<{ certId: string }>();
  const id = Number(certId);
  const certRef = useRef<HTMLDivElement>(null);
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const { data: cert, isLoading } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'getCert',
    args: [BigInt(id || 0)],
    query: { enabled: id > 0 },
  });

  const { data: isValid } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'isCertValid',
    args: [BigInt(id || 0)],
    query: { enabled: id > 0 },
  });

  const certData = cert as {
    fileId: bigint; institutionId: bigint; fileHash: string; recipient: string;
    certType: number; issuedAt: number; expiresAt: number; revoked: boolean;
    recipientName: string; metadata: string;
  } | undefined;

  const instId = certData ? Number(certData.institutionId) : 0;

  const { data: institution } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'getInstitution',
    args: [BigInt(instId)],
    query: { enabled: instId > 0 },
  });

  const inst = institution as { admin: string; status: number; name: string; metadataURI: string; certTypesMask: number; certCount: bigint } | undefined;

  // Fetch file details if fileId exists
  const fileId = certData ? Number(certData.fileId) : 0;
  const { data: fileData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'getFile',
    args: [BigInt(fileId)],
    query: { enabled: fileId > 0 },
  });

  const fileInfo = fileData as { id: bigint; uploader: string; fileName: string; fileType: string; fileSize: bigint; chunkCount: bigint; isPublic: boolean; uploadedAt: bigint; fileHash: string } | undefined;

  // Load file preview for public images
  const publicClient = usePublicClient();
  const [filePreviewUrl, setFilePreviewUrl] = useState('');
  const isImage = fileInfo?.fileType?.startsWith('image/');
  const isPdf = fileInfo?.fileType === 'application/pdf';

  useEffect(() => {
    if (!fileInfo || !publicClient || !isImage || !fileInfo.isPublic || filePreviewUrl) return;
    const chunkCount = Number(fileInfo.chunkCount);
    if (chunkCount > 8) return; // skip very large images
    (async () => {
      try {
        const chunks: string[] = [];
        for (let i = 0; i < chunkCount; i++) {
          const data = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: baseVaultAbi,
            functionName: 'getChunk',
            args: [BigInt(fileId), BigInt(i)],
          });
          chunks.push(data as string);
        }
        const url = chunksToBlob(chunks, fileInfo.fileType);
        setFilePreviewUrl(url);
      } catch { /* ignore */ }
    })();
  }, [fileInfo, fileId]);

  const [fileViewUrl, setFileViewUrl] = useState('');
  const [fileLoading, setFileLoading] = useState(false);
  const [decryptPassword, setDecryptPassword] = useState('');
  const [decryptError, setDecryptError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const reassembleChunks = (chunks: string[]): Uint8Array => {
    const hexStr = chunks.map(c => c.startsWith('0x') ? c.slice(2) : c).join('');
    const bytes = new Uint8Array(hexStr.length / 2);
    for (let i = 0; i < hexStr.length; i += 2) {
      bytes[i / 2] = parseInt(hexStr.substring(i, i + 2), 16);
    }
    return bytes;
  };

  const handleDecryptFile = async () => {
    if (!publicClient || !fileInfo || !decryptPassword) return;

    // Check if connected wallet matches the uploader
    if (address && fileInfo.uploader && address.toLowerCase() !== fileInfo.uploader.toLowerCase()) {
      setDecryptError(`Wrong wallet connected. This file was uploaded by ${fileInfo.uploader.slice(0, 6)}...${fileInfo.uploader.slice(-4)}. You are connected with ${address.slice(0, 6)}...${address.slice(-4)}. Switch to the uploader's wallet.`);
      toast.error('Wrong wallet - switch to the uploader wallet');
      return;
    }

    setFileLoading(true);
    setDecryptError('');
    try {
      const signature = await signMessageAsync({ message: SIGN_MESSAGE });
      const key = deriveKeyFromSignature(signature, decryptPassword);

      const count = Number(fileInfo.chunkCount);
      const chunks: string[] = [];
      for (let i = 0; i < count; i++) {
        const data = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: baseVaultAbi,
          functionName: 'getChunk',
          args: [BigInt(fileId), BigInt(i)],
        });
        chunks.push(data as string);
      }

      const bytes = reassembleChunks(chunks);
      const decrypted = decryptFile(bytes.buffer as ArrayBuffer, key);
      const decryptedArr = new Uint8Array(decrypted);

      // Validate: check if decrypted size matches original file size
      const expectedSize = Number(fileInfo.fileSize);
      if (expectedSize > 0 && Math.abs(decryptedArr.length - expectedSize) > 16) {
        setDecryptError('Decrypted data size mismatch. Make sure you are using the correct wallet and password.');
        toast.error('Decryption failed - wrong wallet or password');
        setFileLoading(false);
        return;
      }

      const blob = new Blob([decryptedArr], { type: fileInfo.fileType });
      const url = URL.createObjectURL(blob);

      // For images: validate the decrypted data is actually a valid image
      if (isImage) {
        const valid = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = url;
        });
        if (!valid) {
          URL.revokeObjectURL(url);
          setDecryptError('Decryption produced invalid data. Wrong wallet or password. Make sure you connect the wallet that uploaded this file.');
          toast.error('Wrong wallet or password');
          setFileLoading(false);
          return;
        }
      }

      setFileViewUrl(url);
      toast.success('Document decrypted!');
    } catch (err: any) {
      console.error('Decrypt failed:', err);
      toast.error('Decryption failed. Wrong wallet or password?');
      setDecryptError('Decryption failed. Check your wallet and password.');
    }
    setFileLoading(false);
  };

  const loadFileForView = async () => {
    if (!publicClient || !fileInfo || fileViewUrl) return;
    if (!fileInfo.isPublic) return;
    setFileLoading(true);
    try {
      const count = Number(fileInfo.chunkCount);
      const chunks: string[] = [];
      for (let i = 0; i < count; i++) {
        const data = await publicClient.readContract({
          address: CONTRACT_ADDRESS,
          abi: baseVaultAbi,
          functionName: 'getChunk',
          args: [BigInt(fileId), BigInt(i)],
        });
        chunks.push(data as string);
      }
      const url = chunksToBlob(chunks, fileInfo.fileType);
      setFileViewUrl(url);
    } catch {
      toast.error('Failed to load file');
    }
    setFileLoading(false);
  };

  const handleFileDownload = () => {
    const url = fileViewUrl || filePreviewUrl;
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileInfo?.fileName || 'file';
    a.click();
  };

  const expired = certData && certData.expiresAt > 0 && Date.now() / 1000 > certData.expiresAt;
  const valid = isValid as boolean;
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const certTypeName = certData ? (CERT_TYPE_LABELS[certData.certType] || 'Certificate') : 'Certificate';

  const formatDate = (ts: number) => new Date(ts * 1000).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: `BaseVault Certificate #${id}`, url: pageUrl });
    } else {
      await navigator.clipboard.writeText(pageUrl);
      toast.success('Link copied!');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const w = 210;

      // Header
      doc.setFillColor(10, 10, 26);
      doc.rect(0, 0, w, 40, 'F');
      doc.setTextColor(224, 224, 240);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('BaseVault', w / 2, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('On-Chain Document Certification on Base', w / 2, 28, { align: 'center' });

      // Status
      doc.setTextColor(valid ? 0 : 255, valid ? 200 : 82, valid ? 83 : 82);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(valid ? 'VALID CERTIFICATE' : (certData?.revoked ? 'REVOKED' : 'INVALID'), w / 2, 55, { align: 'center' });

      // Cert Type
      doc.setTextColor(0, 82, 255);
      doc.setFontSize(14);
      doc.text(`${certTypeName}`, w / 2, 65, { align: 'center' });

      // Certificate ID
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(`Certificate #${id}`, w / 2, 80, { align: 'center' });

      // Details
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      let y = 100;

      const addField = (label: string, value: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 100, 100);
        doc.text(label, 30, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);
        doc.text(value, 80, y, { maxWidth: 100 });
        y += 10;
      };

      addField('Issued By:', inst?.name || `Institution #${instId}`);
      addField('Recipient:', certData?.recipientName || 'Anonymous');
      addField('Wallet:', certData?.recipient || '');
      addField('Issued:', certData ? formatDate(Number(certData.issuedAt)) : '');
      if (certData && Number(certData.expiresAt) > 0) {
        addField('Expires:', formatDate(Number(certData.expiresAt)));
      }
      addField('File Hash:', certData?.fileHash || '');
      if (certData && Number(certData.fileId) > 0) {
        addField('File ID:', `#${Number(certData.fileId)}`);
      }

      // Footer
      y = 260;
      doc.setDrawColor(200, 200, 200);
      doc.line(30, y, w - 30, y);
      y += 8;
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Verify: ${pageUrl}`, w / 2, y, { align: 'center' });
      y += 5;
      doc.text(`Contract: ${CERTIFIER_ADDRESS}`, w / 2, y, { align: 'center' });
      y += 5;
      doc.text('app.basevault.store | Powered by Base (Ethereum L2)', w / 2, y, { align: 'center' });

      doc.save(`basevault-cert-${id}.pdf`);
      toast.success('PDF downloaded!');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('PDF generation failed');
    }
  };

  const handleDownloadPNG = async () => {
    if (!certRef.current) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(certRef.current, {
        backgroundColor: '#0a0a1a',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `basevault-cert-${id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Image downloaded!');
    } catch (err) {
      console.error('PNG export failed:', err);
      toast.error('Image export failed');
    }
  };

  if (isLoading) {
    return (
      <div className="page">
        <div className="loading">
          <div className="spinner" />
          <p>Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (!certData || !certData.fileHash || certData.fileHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    return (
      <div className="page">
        <div className="empty-state">
          <h2>Certificate Not Found</h2>
          <p>Certificate #{certId} does not exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className={`certificate ${valid ? 'certificate-valid' : 'certificate-invalid'}`} ref={certRef}>
        {/* Header */}
        <div className="certificate-header">
          <div className="certificate-badge-lg">
            <CertBadge valid={valid} revoked={certData.revoked} expired={!!expired} size="lg" />
          </div>
          <span className="certificate-type">
            {CERT_TYPE_ICONS[certData.certType]} {certTypeName}
          </span>
          <h1 className="certificate-id">Certificate #{id}</h1>
        </div>

        {/* Institution */}
        <div className="certificate-section">
          <label className="certificate-label">Issued By</label>
          <p className="certificate-value-lg">{inst?.name || `Institution #${instId}`}</p>
        </div>

        {/* Recipient */}
        <div className="certificate-section">
          <label className="certificate-label">Recipient</label>
          <p className="certificate-value-lg">{certData.recipientName || 'Anonymous'}</p>
          <code className="certificate-address">{certData.recipient}</code>
        </div>

        {/* Details Grid */}
        <div className="certificate-details">
          <div className="certificate-detail">
            <label>File Hash</label>
            <code>{certData.fileHash.slice(0, 18)}...{certData.fileHash.slice(-8)}</code>
          </div>
          {Number(certData.fileId) > 0 && (
            <div className="certificate-detail">
              <label>BaseVault File</label>
              <span>#{Number(certData.fileId)}</span>
            </div>
          )}
          <div className="certificate-detail">
            <label>Issued</label>
            <span>{formatDate(Number(certData.issuedAt))}</span>
          </div>
          {Number(certData.expiresAt) > 0 && (
            <div className="certificate-detail">
              <label>Expires</label>
              <span>{formatDate(Number(certData.expiresAt))}</span>
            </div>
          )}
          <div className="certificate-detail">
            <label>Contract</label>
            <a
              href={`https://basescan.org/address/${CERTIFIER_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="basescan-link"
            >
              BaseScan
            </a>
          </div>
          <div className="certificate-detail">
            <label>Status</label>
            <span className={valid ? 'text-green' : 'text-red'}>
              {certData.revoked ? 'Revoked' : expired ? 'Expired' : valid ? 'Valid' : 'Invalid'}
            </span>
          </div>
        </div>

        {/* Certified File Details */}
        {fileInfo && (
          <div className="cert-file-section">
            <label className="certificate-label">Certified Document</label>
            <div className="cert-file-card">
              {filePreviewUrl && isImage ? (
                <div className="cert-file-preview">
                  <img src={filePreviewUrl} alt={fileInfo.fileName} />
                </div>
              ) : (
                <div className="cert-file-icon">
                  {isPdf ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff5252" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  ) : fileInfo.fileType?.startsWith('video/') ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c4dff" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                  ) : fileInfo.fileType?.startsWith('audio/') ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00bcd4" strokeWidth="1.5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  )}
                </div>
              )}
              <div className="cert-file-info">
                <h4>{fileInfo.fileName}</h4>
                <div className="cert-file-meta">
                  <span>{fileInfo.fileType}</span>
                  <span>{formatFileSize(Number(fileInfo.fileSize))}</span>
                  <span>{Number(fileInfo.chunkCount)} chunk{Number(fileInfo.chunkCount) > 1 ? 's' : ''}</span>
                </div>
                <div className="cert-file-meta">
                  <span>{fileInfo.isPublic ? 'Public' : 'Private (Encrypted)'}</span>
                  <span>File #{fileId}</span>
                </div>
                <div className="cert-file-uploader">
                  Uploaded by {(fileInfo.uploader || '').slice(0, 6)}...{(fileInfo.uploader || '').slice(-4)}
                  {' '}&middot;{' '}
                  {new Date(Number(fileInfo.uploadedAt) * 1000).toLocaleDateString()}
                </div>

                {/* View/Download for public files */}
                {fileInfo.isPublic && (
                  <div className="cert-file-actions">
                    {fileViewUrl ? (
                      <>
                        {isImage && <img src={fileViewUrl} alt={fileInfo.fileName} className="cert-file-full-preview" />}
                        {isPdf && (
                          <object data={fileViewUrl} type="application/pdf" className="cert-file-pdf-viewer">
                            <p>PDF preview not supported. <a href={fileViewUrl} target="_blank" rel="noopener noreferrer">Open PDF</a></p>
                          </object>
                        )}
                        {fileInfo.fileType?.startsWith('video/') && (
                          <video src={fileViewUrl} controls className="cert-file-video" />
                        )}
                        {fileInfo.fileType?.startsWith('audio/') && (
                          <audio src={fileViewUrl} controls style={{ width: '100%' }} />
                        )}
                        {fileInfo.fileType?.startsWith('text/') && (
                          <iframe src={fileViewUrl} className="cert-file-text" title="Document" />
                        )}
                        <button className="btn btn-sm" onClick={handleFileDownload}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                          Download
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-sm btn-primary" onClick={loadFileForView} disabled={fileLoading}>
                        {fileLoading ? (
                          <><div className="spinner spinner-sm" style={{ marginRight: 6 }} /> Loading...</>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            View Document
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Encrypted file - decrypt option */}
                {!fileInfo.isPublic && !fileViewUrl && (
                  <div className="cert-file-decrypt-section">
                    <div className="cert-file-encrypted-notice">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffab00" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      <span>This document is encrypted. You must connect the <strong>uploader's wallet</strong> ({fileInfo.uploader.slice(0, 6)}...{fileInfo.uploader.slice(-4)}) and enter the correct password to decrypt.</span>
                    </div>
                    {isConnected && (
                      <div className="cert-decrypt-form">
                        <div className="cert-decrypt-input-wrap">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter password..."
                            value={decryptPassword}
                            onChange={(e) => setDecryptPassword(e.target.value)}
                            className="cert-decrypt-input"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck={false}
                          />
                          <button
                            type="button"
                            className="cert-decrypt-eye"
                            onClick={() => setShowPassword(!showPassword)}
                            title={showPassword ? 'Hide' : 'Show'}
                          >
                            {showPassword ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                          </button>
                        </div>
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={fileLoading || !decryptPassword}
                          onClick={handleDecryptFile}
                        >
                          {fileLoading ? (
                            <><div className="spinner spinner-sm" style={{ marginRight: 6 }} /> Decrypting...</>
                          ) : 'Decrypt & View'}
                        </button>
                      </div>
                    )}
                    {!isConnected && (
                      <p className="cert-decrypt-hint">Connect your wallet to try decrypting this document.</p>
                    )}
                    {decryptError && (
                      <div className="cert-decrypt-error">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                        <span>{decryptError}</span>
                      </div>
                    )}
                  </div>
                )}
                {/* Show decrypted file */}
                {!fileInfo.isPublic && fileViewUrl && (
                  <div className="cert-file-actions">
                    {isImage && <img src={fileViewUrl} alt={fileInfo.fileName} className="cert-file-full-preview" />}
                    {isPdf && (
                      <object data={fileViewUrl} type="application/pdf" className="cert-file-pdf-viewer">
                        <p>PDF preview not supported. <a href={fileViewUrl} target="_blank" rel="noopener noreferrer">Open PDF</a></p>
                      </object>
                    )}
                    {fileInfo.fileType?.startsWith('video/') && <video src={fileViewUrl} controls className="cert-file-video" />}
                    {fileInfo.fileType?.startsWith('audio/') && <audio src={fileViewUrl} controls style={{ width: '100%' }} />}
                    <button className="btn btn-sm" onClick={handleFileDownload}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        {certData.metadata && (
          <div className="certificate-section">
            <label className="certificate-label">Metadata</label>
            <pre className="certificate-metadata">{certData.metadata}</pre>
          </div>
        )}

        {/* QR Code */}
        <QRCode url={pageUrl} />
      </div>

      {/* Actions (outside ref for clean PNG export) */}
      <div className="certificate-actions-bar">
        <button className="btn btn-primary" onClick={handleShare}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          Share
        </button>
        <button className="btn btn-outline" onClick={handleDownloadPDF}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" />
            <polyline points="9 15 12 18 15 15" />
          </svg>
          PDF
        </button>
        <button className="btn btn-outline" onClick={handleDownloadPNG}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
          </svg>
          Image
        </button>
        <button className="btn btn-outline" onClick={() => window.print()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print
        </button>
        <a
          href={`https://basescan.org/address/${CERTIFIER_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-outline"
        >
          BaseScan
        </a>
      </div>

      {/* Social Share */}
      <div className="certificate-share-section">
        <h3>Share This Certificate</h3>
        <ShareButtons
          url={pageUrl}
          title={`${certTypeName} Certificate #${id} - Verified on BaseVault`}
          text={`My ${certTypeName} has been verified on-chain via @BaseVault on @base`}
        />
      </div>

      {/* Embed Badge */}
      <VerificationBadge
        certId={id}
        fileHash={certData.fileHash}
        certType={certTypeName}
        isValid={valid}
      />
    </div>
  );
}
