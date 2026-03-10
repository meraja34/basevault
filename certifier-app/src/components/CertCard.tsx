import { Link } from 'react-router-dom';
import { CERT_TYPE_LABELS, CERT_TYPE_ICONS } from '../constants.ts';
import CertBadge from './CertBadge.tsx';

interface CertCardProps {
  certId: number;
  certType: number;
  recipientName: string;
  institutionName: string;
  issuedAt: number;
  expiresAt: number;
  revoked: boolean;
  isValid: boolean;
  onRevoke?: () => void;
  showRevoke?: boolean;
}

export default function CertCard({
  certId,
  certType,
  recipientName,
  institutionName,
  issuedAt,
  expiresAt,
  revoked,
  isValid,
  onRevoke,
  showRevoke,
}: CertCardProps) {
  const expired = expiresAt > 0 && Date.now() / 1000 > expiresAt;

  return (
    <div className="cert-card">
      <div className="cert-card-header">
        <span className="cert-type-badge">
          {CERT_TYPE_ICONS[certType]} {CERT_TYPE_LABELS[certType] || 'Unknown'}
        </span>
        <CertBadge valid={isValid} revoked={revoked} expired={expired} size="sm" />
      </div>

      <div className="cert-card-body">
        <h3 className="cert-card-recipient">{recipientName || 'Anonymous'}</h3>
        <p className="cert-card-institution">{institutionName}</p>
        <div className="cert-card-dates">
          <span>Issued: {new Date(issuedAt * 1000).toLocaleDateString()}</span>
          {expiresAt > 0 && (
            <span>Expires: {new Date(expiresAt * 1000).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      <div className="cert-card-actions">
        <Link to={`/cert/${certId}`} className="btn btn-sm btn-primary">View</Link>
        {showRevoke && !revoked && onRevoke && (
          <button className="btn btn-sm btn-danger" onClick={onRevoke}>Revoke</button>
        )}
      </div>
    </div>
  );
}
