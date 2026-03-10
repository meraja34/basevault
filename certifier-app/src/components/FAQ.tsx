import { useState } from 'react';

const faqs = [
  {
    q: 'What is BaseVault?',
    a: 'BaseVault is a fully on-chain document storage and certification platform on Base (Ethereum L2). Your actual file data is stored inside a smart contract, not on IPFS or external servers. Files live permanently on the blockchain.',
  },
  {
    q: 'How do I upload a file?',
    a: 'Go to the Upload page, connect your wallet, drag and drop any file (up to 50MB). Choose Public (anyone can view) or Private (AES-256 encrypted with your wallet + password). Click Upload and approve the transaction. Your file is stored fully on-chain.',
  },
  {
    q: 'How do I register my institution?',
    a: 'Go to the Register page, connect your wallet (use a multisig like Safe for institutional control). Enter your institution name, select which certification types you want to issue (degrees, licenses, audits, etc.), and confirm. Registration is free, you only pay gas. Once registered, you can issue certifications from the Dashboard.',
  },
  {
    q: 'How do I issue a certification?',
    a: 'After registering, go to the Dashboard. Enter the File ID (from an uploaded file) or a SHA-256 hash, the recipient wallet address, recipient name, select the certification type, and click Certify. The certificate is stored on-chain permanently. You can also set an expiry date or leave it unlimited.',
  },
  {
    q: 'How does the full certification flow work?',
    a: 'Step 1: A student/employee uploads their document on the Upload page (gets a File ID). Step 2: The institution registers on the Register page (one-time). Step 3: The institution goes to Dashboard, enters the File ID + student wallet address + cert type, and clicks Certify. Step 4: The student can see their certificate on My Certs page. Step 5: Anyone can verify it on the Verify page.',
  },
  {
    q: 'Can I certify without uploading a file?',
    a: 'Yes. On the Dashboard, toggle to "Certify by Hash" mode. Enter the SHA-256 hash of any document and the recipient address. This way you can certify documents that exist off-chain too. The hash proves the document content without storing the file.',
  },
  {
    q: 'How is this different from IPFS or Arweave?',
    a: 'IPFS stores files on a peer-to-peer network that needs pinning services (files can disappear). Arweave uses its own blockchain. BaseVault stores your actual file bytes directly on Base chain. No separate network, no pinning, no external dependency. Every byte lives on the same chain as your wallet.',
  },
  {
    q: 'How does password-protected storage work?',
    a: 'Private files are encrypted client-side with AES-256-CTR before going on-chain. The encryption key comes from two factors: your wallet signature and a password you choose. Even though encrypted data sits on a public blockchain, nobody can read it without both your wallet and password.',
  },
  {
    q: 'Can files or certificates be deleted?',
    a: 'Files are permanent and immutable, nobody can delete or modify them. Certificates can be revoked by the issuing institution (with a reason), but the record stays on-chain. Revoked certificates show as "Revoked" when verified.',
  },
  {
    q: 'How much does it cost?',
    a: 'File uploads cost a small fee per 24KB chunk. Institutional registration and certification are completely free, you only pay Base network gas fees (usually less than $0.01 per transaction). All fees are shown before you confirm.',
  },
  {
    q: 'What wallets are supported?',
    a: 'Coinbase Smart Wallet is recommended (supports batch transactions for large files). MetaMask, Rainbow, and any WalletConnect wallet also work. In Farcaster/Warpcast, the embedded wallet auto-connects.',
  },
  {
    q: 'How do I verify a document?',
    a: 'Go to the Verify page. Either drop a file (it computes the SHA-256 hash automatically) or paste a hash manually. If the document is on BaseVault, you will see the uploader, upload date, and all institutional certifications. Anyone can verify, no wallet needed.',
  },
  {
    q: 'Can I add team members to my institution?',
    a: 'Yes. As the institution admin, you can add delegates from the Dashboard. Delegates can issue certifications on behalf of your institution but cannot change institution settings or add other delegates.',
  },
  {
    q: 'What certification types are supported?',
    a: 'BaseVault supports 13 types: Generic, Degree, Transcript, Course Completion, Badge, License, Contract, NDA, Audit, IP Proof, Medical Record, Lab Report, and Research Paper. You choose which types your institution can issue during registration.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="faq-section">
      <h2 className="section-title" style={{ textAlign: 'center' }}>Frequently Asked Questions</h2>
      <div className="faq-list">
        {faqs.map((faq, i) => (
          <div key={i} className={`faq-item ${openIndex === i ? 'faq-item-open' : ''}`}>
            <button className="faq-question" onClick={() => setOpenIndex(openIndex === i ? null : i)}>
              <span>{faq.q}</span>
              <svg
                className="faq-arrow"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            <div className="faq-answer">
              <p>{faq.a}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
