import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useReadContract } from 'wagmi';
import { CERTIFIER_ADDRESS, CERT_TYPE_LABELS, CERT_TYPE_ICONS } from '../constants.ts';
import { certifierAbi } from '../abi/index.ts';
import CertBadge from '../components/CertBadge.tsx';
import QRCode from '../components/QRCode.tsx';
import ShareButtons from '../components/ShareButtons.tsx';
import VerificationBadge from '../components/VerificationBadge.tsx';
import toast from 'react-hot-toast';

export default function CertificateView() {
  const { certId } = useParams<{ certId: string }>();
  const id = Number(certId);
  const certRef = useRef<HTMLDivElement>(null);

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
