import { useState } from 'react';

const faqs = [
  {
    q: 'What is BaseVault?',
    a: 'BaseVault is a fully on-chain document storage and certification platform on Base (Ethereum L2). Your actual file data is stored inside a smart contract, not on IPFS or external servers. Files live permanently on the blockchain.',
  },
  {
    q: 'How do I upload a file?',
    a: `1. Go to the Upload page and connect your wallet\n2. Drag and drop any file (up to 50MB)\n3. Choose Public (anyone can view) or Private (AES-256 encrypted)\n4. Click Upload and approve the transaction\n5. Your file is stored fully on-chain`,
  },
  {
    q: 'How do I register my institution?',
    a: `1. Go to the Register page\n2. Connect your wallet (use a multisig like Safe for institutional control)\n3. Enter your institution name\n4. Select which certification types you want to issue (degrees, licenses, audits, etc.)\n5. Confirm the transaction\n\nRegistration is free, you only pay gas. Once registered, you can issue certifications from the Dashboard.`,
  },
  {
    q: 'How do I issue a certification?',
    a: `1. Register your institution (one-time)\n2. Go to the Dashboard\n3. Enter the File ID or SHA-256 hash\n4. Enter the recipient wallet address and name\n5. Select the certification type\n6. Click Certify\n\nThe certificate is stored on-chain permanently. You can also set an expiry date or leave it unlimited.`,
  },
  {
    q: 'How does the full certification flow work?',
    a: `1. A student/employee uploads their document on the Upload page (gets a File ID)\n2. The institution registers on the Register page (one-time)\n3. The institution goes to Dashboard, enters the File ID + student wallet + cert type, clicks Certify\n4. The student can see their certificate on My Certs page\n5. Anyone can verify it on the Verify page`,
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
    a: `Private files are encrypted client-side with AES-256-CTR before going on-chain. The encryption key comes from two factors:\n\n1. Your wallet signature (proves identity)\n2. A password you choose (extra protection)\n\nEven though encrypted data sits on a public blockchain, nobody can read it without both your wallet and password.`,
  },
  {
    q: 'Can files or certificates be deleted?',
    a: 'Files are permanent and immutable, nobody can delete or modify them. Certificates can be revoked by the issuing institution (with a reason), but the record stays on-chain. Revoked certificates show as "Revoked" when verified.',
  },
  {
    q: 'How much does it cost?',
    a: 'All fees are currently set to zero. You only pay Base network gas fees, which are usually less than $0.01 per transaction. All costs are shown before you confirm.',
  },
  {
    q: 'What happens if basevault.store goes down?',
    a: `Nothing is lost. BaseVault has zero server dependency. Your files and certificates live on the Base blockchain, not on our servers.\n\nYou have three ways to access your data without basevault.store:\n\n1. Android App: Runs 100% standalone with its own built-in wallet and direct blockchain access\n2. Recovery Tool: A single HTML file that works offline in any browser\n3. Direct RPC: Use BaseScan, ethers.js, or any Ethereum tool to read the smart contracts\n\nBaseVault is a protocol, not a service. As long as Ethereum exists, your data exists.`,
  },
  {
    q: 'How does the Android app work without a server?',
    a: `The Android app is fully standalone. It creates a wallet locally on your device, encrypts the private key with your password, and stores it securely. All blockchain operations (upload, download, certify, verify) go directly to Base RPC endpoints.\n\nThe app connects to 5 public Base RPCs with automatic failover. If one goes down, it switches to the next. No BaseVault server is involved at any point.\n\nFeatures: Fingerprint unlock, local wallet, file viewer, all 11 pages functional.`,
  },
  {
    q: 'What wallets are supported?',
    a: 'On the web app: Coinbase Smart Wallet (supports batch transactions for large files), MetaMask, Rainbow, and any WalletConnect wallet. In Farcaster/Warpcast, the embedded wallet auto-connects.\n\nOn the Android app: Built-in local wallet with fingerprint unlock. Private key is generated on your device and never leaves it.',
  },
  {
    q: 'How do I verify a document?',
    a: `1. Go to the Verify page\n2. Drop a file (it computes the SHA-256 hash automatically) or paste a hash manually\n3. If the document is on BaseVault, you will see the uploader, upload date, and all institutional certifications\n\nAnyone can verify, no wallet needed.`,
  },
  {
    q: 'What certification types are supported?',
    a: `BaseVault supports 13 types:\n\n1. Generic Certificate\n2. Academic Degree\n3. Transcript\n4. Course Completion\n5. Badge\n6. Professional License\n7. Legal Contract\n8. NDA\n9. Financial Audit\n10. IP Proof\n11. Medical Record\n12. Lab Report\n13. Research Paper`,
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="faq-section">
      <h2 className="lp-sec-h2">Frequently Asked Questions</h2>
      <p className="faq-subtitle">Everything you need to know about BaseVault</p>
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
              <div className="faq-answer-content">
                {faq.a.split('\n').map((line, j) => (
                  line === '' ? <br key={j} /> : <p key={j}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
