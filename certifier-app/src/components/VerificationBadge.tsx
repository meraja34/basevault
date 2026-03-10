import { useState } from 'react';
import toast from 'react-hot-toast';

interface VerificationBadgeProps {
  certId?: number;
  fileHash: string;
  certType?: string;
  isValid?: boolean;
}

export default function VerificationBadge({ certId, fileHash, certType, isValid }: VerificationBadgeProps) {
  const [showEmbed, setShowEmbed] = useState(false);

  const badgeUrl = certId
    ? `https://app.basevault.store/cert/${certId}`
    : `https://app.basevault.store/verify?hash=${fileHash}`;

  const embedCode = `<a href="${badgeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:#0a0a1a;border:1px solid ${isValid ? '#00c853' : '#2a2a4a'};border-radius:8px;color:#e0e0f0;font-family:Inter,sans-serif;font-size:13px;font-weight:600;text-decoration:none">
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="${isValid ? '#00c853' : '#8888aa'}" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  ${isValid ? 'Verified' : 'Check'} on BaseVault${certType ? ` - ${certType}` : ''}
</a>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode).then(() => {
      toast.success('Embed code copied!');
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = embedCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast.success('Embed code copied!');
    });
  };

  return (
    <div className="verification-badge-section">
      <button className="btn btn-sm btn-outline" onClick={() => setShowEmbed(!showEmbed)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
        Embed Badge
      </button>

      {showEmbed && (
        <div className="embed-code-box">
          <p className="embed-label">Add this badge to your website:</p>
          <pre className="embed-code">{embedCode}</pre>
          <div className="embed-preview">
            <span className="embed-preview-label">Preview:</span>
            <a
              href={badgeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`embed-badge-preview ${isValid ? 'embed-badge-valid' : ''}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isValid ? '#00c853' : '#8888aa'} strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              {isValid ? 'Verified' : 'Check'} on BaseVault{certType ? ` - ${certType}` : ''}
            </a>
          </div>
          <button className="btn btn-sm btn-primary" onClick={handleCopy}>Copy Embed Code</button>
        </div>
      )}
    </div>
  );
}
