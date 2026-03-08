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
            <p>BaseVault is a fully on-chain file storage and document certification platform built on Base (Ethereum Layer 2). You upload any file and the actual file data gets stored directly inside the smart contract on Base blockchain. No external storage, no servers, no middlemen. Your files live permanently on-chain.</p>
          </details>

          <details className="faq-item">
            <summary>How is BaseVault different from IPFS, Arweave, or Filecoin?</summary>
            <p>IPFS stores your file on a peer-to-peer network and gives you a hash. But if nobody pins your file, it disappears. Services like Pinata keep it pinned, but that means trusting a company with your data. Arweave and Filecoin use their own separate blockchains. BaseVault is different because your actual file data goes directly into a smart contract on Base. There is no separate network, no pinning, no external dependency. Every byte of your file lives on the same chain where your wallet exists. Truly on-chain, not just a hash on-chain pointing somewhere else.</p>
          </details>

          <details className="faq-item">
            <summary>Why is password-protected storage important?</summary>
            <p>On IPFS or Arweave, everything you upload is public. Anyone with the hash can see your file. BaseVault lets you upload private files that are encrypted with AES-256 before going on-chain. The encryption uses two factors: your wallet signature and a password you choose. Even though the encrypted data sits on a public blockchain, nobody can read it without both your wallet and your password. This makes BaseVault the first on-chain storage where you can keep files truly private.</p>
          </details>

          <details className="faq-item">
            <summary>What does "fully on-chain" actually mean?</summary>
            <p>Most projects that say "on-chain storage" only store a hash or a link on-chain. The actual file lives on IPFS, a server, or some other network. BaseVault stores the actual file bytes inside the smart contract using calldata on Base. Every node on the Base network has your data. No external service can take it down or lose it.</p>
          </details>

          <details className="faq-item">
            <summary>What is document certification?</summary>
            <p>Certification creates a tamper-proof, timestamped record on the blockchain proving that a specific document existed at a specific time. This is useful for legal proof, intellectual property claims, contracts, academic records, or any document where you need to prove when it was created and that it has not been changed.</p>
          </details>

          <details className="faq-item">
            <summary>How does private file encryption work?</summary>
            <p>When you choose "Private" upload, your file is encrypted client-side using AES-256-CTR before any data goes on-chain. The encryption key is derived from two things: a signature from your wallet and a password you set. To decrypt later, you need to connect the same wallet and enter the same password. Nobody else can decrypt, not even BaseVault.</p>
          </details>

          <details className="faq-item">
            <summary>How much does it cost?</summary>
            <p>You pay a small fee per chunk (24 KB each) when uploading. The app shows you the exact cost before you confirm. Gas fees on Base L2 are very low compared to Ethereum mainnet. For small to medium files, BaseVault is significantly cheaper than Arweave or Filecoin, and unlike IPFS pinning, you pay once and your file stays forever.</p>
          </details>

          <details className="faq-item">
            <summary>What file types and sizes are supported?</summary>
            <p>Any file type works. Images, PDFs, documents, code, audio, video, anything. Maximum file size is 50 MB. Files are split into 24 KB chunks and stored across multiple transactions.</p>
          </details>

          <details className="faq-item">
            <summary>Can files be deleted or modified?</summary>
            <p>No. Once a file is stored on-chain, it is permanent and immutable. Nobody can modify or delete it, not even BaseVault. This is a feature, not a limitation. Your data is censorship-resistant and permanent by design.</p>
          </details>

          <details className="faq-item">
            <summary>How does file verification work?</summary>
            <p>Every file uploaded gets a SHA-256 hash stored on-chain. Anyone can verify a document by uploading it on the Verify page. If the hash matches, it proves the file is authentic, shows who uploaded it, and when. No account needed to verify.</p>
          </details>

          <details className="faq-item">
            <summary>What wallet do I need?</summary>
            <p>Coinbase Smart Wallet is recommended because it supports batch transactions, so large files upload with fewer approvals. MetaMask, Rainbow, and any WalletConnect-compatible wallet also work. Inside Farcaster or Base App, your wallet connects automatically.</p>
          </details>
        </div>
      </section>

    </div>
  );
}
