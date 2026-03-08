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
          Certify documents with on-chain proof. No servers, 100% on-chain.
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
            <span className="stat-value">50 MB</span>
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
            <p>Files are stored directly on Base chain. No third-party, fully on-chain and permanent. Your data lives on the blockchain forever.</p>
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
            <p>Images, PDFs, documents, text files, anything up to 50 MB. All stored permanently on Base chain with no restrictions.</p>
          </div>
        </div>
      </section>

      <section className="faq-section">
        <h2 className="section-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          <details className="faq-item">
            <summary>What is BaseVault?</summary>
            <p>BaseVault is an on-chain file storage and document certification platform built on Base (Ethereum Layer 2). You can upload any file and it gets stored directly on the blockchain. No servers, no cloud storage, your files live on-chain permanently.</p>
          </details>

          <details className="faq-item">
            <summary>How is this different from Google Drive or Dropbox?</summary>
            <p>Google Drive and Dropbox store your files on their servers. They can delete your files, get hacked, or shut down. BaseVault stores your files directly on the blockchain. Nobody can delete, modify, or censor your data. It stays on-chain forever.</p>
          </details>

          <details className="faq-item">
            <summary>What does "on-chain" mean?</summary>
            <p>On-chain means your file data is stored directly inside the blockchain (Base network). Every node on the network has a copy of your data. There is no separate server or storage service involved. The blockchain itself is the storage.</p>
          </details>

          <details className="faq-item">
            <summary>How does private file encryption work?</summary>
            <p>When you upload a private file, it gets encrypted with AES-256 before going on-chain. The encryption key is created from two things: your wallet signature and a password you choose. Both are needed to decrypt. Even though the encrypted data is on-chain and visible, nobody can read it without your wallet and password.</p>
          </details>

          <details className="faq-item">
            <summary>What is document certification?</summary>
            <p>Certification creates a tamper-proof, timestamped record on the blockchain proving that your document existed at a specific time. This can be used for legal proof, intellectual property, contracts, or any document where you need to prove authenticity and timing.</p>
          </details>

          <details className="faq-item">
            <summary>How much does it cost?</summary>
            <p>You pay a small fee per chunk (24 KB each) when uploading. The total cost depends on your file size. Before uploading, the app shows you the exact fee and number of chunks. You also pay standard Base network gas fees for each transaction, which are very low on Base L2.</p>
          </details>

          <details className="faq-item">
            <summary>What file types can I upload?</summary>
            <p>Any file type. Images, PDFs, documents, spreadsheets, text files, audio, video, code. There are no restrictions on file type. Maximum file size is 50 MB.</p>
          </details>

          <details className="faq-item">
            <summary>Can I delete a file after uploading?</summary>
            <p>No. Once a file is stored on-chain, it is permanent. This is by design. Blockchain storage is immutable, meaning nobody (not even BaseVault) can modify or delete your data. Think carefully before uploading.</p>
          </details>

          <details className="faq-item">
            <summary>What wallet do I need?</summary>
            <p>You can use MetaMask, Coinbase Wallet, Rainbow, or any wallet that supports Base network. Coinbase Smart Wallet is recommended as it supports batch transactions, making large file uploads faster with a single approval.</p>
          </details>

          <details className="faq-item">
            <summary>How does file verification work?</summary>
            <p>Every file gets a unique SHA-256 hash when uploaded. This hash is stored on-chain. Anyone can verify a document by uploading it on the Verify page. If the hash matches a file on BaseVault, it confirms the document is authentic and shows when it was uploaded.</p>
          </details>
        </div>
      </section>

    </div>
  );
}
