import { Link } from 'react-router-dom';
import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS } from '../constants';
import abi from '../abi/BaseVault.json';

export default function Home() {
  const { data: fileCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'fileCount',
  });

  const { data: certCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'certificationCount',
  });

  return (
    <div className="home">
      <section className="hero">
        <div className="hero-badge">Built on Base</div>
        <h1 className="hero-title">
          On-Chain File Storage
          <br />& Document Certification
        </h1>
        <p className="hero-desc">
          Upload any file directly on Base chain. Encrypt private files with wallet + password.
          Certify documents with on-chain proof. No IPFS, no servers, 100% on-chain.
        </p>
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-value">{fileCount?.toString() || '0'}</span>
            <span className="stat-label">Files On-Chain</span>
          </div>
          <div className="stat">
            <span className="stat-value">{certCount?.toString() || '0'}</span>
            <span className="stat-label">Certifications</span>
          </div>
          <div className="stat">
            <span className="stat-value">500 MB</span>
            <span className="stat-label">Max File Size</span>
          </div>
        </div>
        <div className="hero-actions">
          <Link to="/upload" className="btn btn-primary btn-lg">Upload Files</Link>
          <Link to="/verify" className="btn btn-outline btn-lg">Verify Document</Link>
        </div>
      </section>

      <section className="features">
        <h2 className="section-title">How It Works</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h3>Upload On-Chain</h3>
            <p>Files are stored directly on Base chain in one transaction. No IPFS, no third-party, fully on-chain and permanent.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h3>Private or Public</h3>
            <p>Public files are visible to everyone. Private files are encrypted with AES-256 using your wallet signature + password. Two-factor protection.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3>Verify & Certify</h3>
            <p>Every file gets a SHA-256 hash stored on-chain. Anyone can verify a document. Certify for tamper-proof, timestamped proof.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                <polyline points="13 2 13 9 20 9" />
              </svg>
            </div>
            <h3>Any File Type</h3>
            <p>Images, PDFs, documents, text files, anything up to 500 MB. All stored permanently on Base chain with no restrictions.</p>
          </div>
        </div>
      </section>

    </div>
  );
}
