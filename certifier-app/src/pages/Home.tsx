import { useEffect, useRef, useState } from 'react';
import { useReadContract } from 'wagmi';
import { CERTIFIER_ADDRESS, CONTRACT_ADDRESS, CERTIFIER_LIVE } from '../constants.ts';
import { certifierAbi, baseVaultAbi } from '../abi/index.ts';
import FAQ from '../components/FAQ.tsx';
import AppHome from './AppHome.tsx';

/* Scroll reveal */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect(); } }, { threshold: 0.12 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return { ref, cls: vis ? 'rv rv-in' : 'rv' };
}

/* Animated grid background */
function GridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;
    let w = 0, h = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const dots: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
    for (let i = 0; i < 60; i++) {
      dots.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, r: Math.random() * 2 + 1 });
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      // draw connections
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(0, 82, 255, ${0.08 * (1 - dist / 150)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      // draw dots
      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > w) d.vx *= -1;
        if (d.y < 0 || d.y > h) d.vy *= -1;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 82, 255, 0.25)';
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} className="lp-grid-bg" />;
}

/* Counter */
function Counter({ target, label }: { target: number; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);
  useEffect(() => {
    if (!ref.current || done.current || target === 0) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true;
        const dur = 1500, t0 = performance.now();
        const tick = (t: number) => { const p = Math.min((t - t0) / dur, 1); setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target)); if (p < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.3 });
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [target]);
  return (
    <div className="lp-stat" ref={ref}>
      <span className="lp-stat-val">{count.toLocaleString()}</span>
      <span className="lp-stat-lbl">{label}</span>
    </div>
  );
}

export default function Home() {
  // Show dashboard on app.basevault.store, landing page on basevault.store
  const isApp = window.location.hostname.startsWith('app.');
  if (isApp) return <AppHome />;
  return <LandingPage />;
}

function LandingPage() {
  const { data: fileCount } = useReadContract({ address: CONTRACT_ADDRESS, abi: baseVaultAbi, functionName: 'fileCount' });
  const { data: instCount } = useReadContract({ address: CERTIFIER_ADDRESS, abi: certifierAbi, functionName: 'institutionCount', query: { enabled: CERTIFIER_LIVE } });
  const { data: certCount } = useReadContract({ address: CERTIFIER_ADDRESS, abi: certifierAbi, functionName: 'certCount', query: { enabled: CERTIFIER_LIVE } });

  const s1 = useReveal(), s2 = useReveal(), s3 = useReveal(), s4 = useReveal(), s5 = useReveal(), s6 = useReveal(), s7 = useReveal(), s8 = useReveal();

  return (
    <div className="lp">

      <GridBackground />

      {/* ===== HERO ===== */}
      <section className="lp-hero">
        <div className="lp-hero-content">
          <p className="lp-hero-tag">Fully On-Chain Document Platform on Base</p>
          <h1 className="lp-hero-h1">
            Store, Encrypt, Certify<br/>& Verify Documents On-Chain
          </h1>
          <p className="lp-hero-sub">
            BaseVault stores your actual file data on Base blockchain. Not a hash pointer, not IPFS, not a server.
            Real bytes on-chain. Password-encrypted. Institutionally certified. Permanently verifiable.
          </p>
          <div className="lp-hero-btns">
            <a href="https://app.basevault.store" className="lp-btn-main">
              Web App
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
            <a href="https://github.com/meraja34/basevault/releases/download/v2.0.0/basevault-v2.0.0-final.apk" className="lp-btn-main lp-btn-android">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/><path d="M12 18h.01"/></svg>
              Android App
            </a>
            <a href="https://app.basevault.store/verify" className="lp-btn-sec">Verify a Document</a>
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="lp-stats-bar" ref={s1.ref}>
        <div className={s1.cls}>
          <div className="lp-stats-row">
            <Counter target={fileCount ? Number(fileCount) : 0} label="Files Stored On-Chain" />
            <Counter target={instCount ? Number(instCount) : 0} label="Registered Institutions" />
            <Counter target={certCount ? Number(certCount) : 0} label="Certificates Issued" />
          </div>
        </div>
      </section>

      {/* ===== WHAT IS BASEVAULT ===== */}
      <section className="lp-sec" ref={s2.ref}>
        <div className={s2.cls}>
          <h2 className="lp-sec-h2">What is BaseVault?</h2>
          <p className="lp-sec-sub">A fully on-chain document storage and certification platform built on Base (Ethereum L2). Unlike IPFS or cloud storage, your actual file bytes are stored directly in a smart contract.</p>
          <div className="lp-cards-3">
            <div className="lp-card">
              <div className="lp-card-icon lp-card-icon-blue">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <h3>Upload Any File</h3>
              <p>Documents, images, videos, PDFs, audio. Up to 50MB. File is split into 24KB chunks and stored on Base blockchain permanently.</p>
            </div>
            <div className="lp-card">
              <div className="lp-card-icon lp-card-icon-green">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1"/></svg>
              </div>
              <h3>Password Encryption</h3>
              <p>Private files are encrypted client-side with AES-256. Key is derived from your wallet signature + your password. Two-factor encryption on a public chain.</p>
            </div>
            <div className="lp-card">
              <div className="lp-card-icon lp-card-icon-purple">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="9 15 11 17 15 13"/></svg>
              </div>
              <h3>Institutional Certification</h3>
              <p>Universities, hospitals, law firms, and auditors register once and issue tamper-proof certifications. 13 types supported. Batch up to 100.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="lp-sec lp-sec-dark" ref={s3.ref}>
        <div className={s3.cls}>
          <h2 className="lp-sec-h2">How It Works</h2>
          <div className="lp-timeline">
            <div className="lp-tl-item">
              <div className="lp-tl-num">1</div>
              <div className="lp-tl-body">
                <h3>Connect Wallet & Upload</h3>
                <p>Connect MetaMask, Coinbase Smart Wallet, or any WalletConnect wallet. Drop a file. Choose public or private (encrypted).</p>
              </div>
            </div>
            <div className="lp-tl-item">
              <div className="lp-tl-num">2</div>
              <div className="lp-tl-body">
                <h3>File Goes On-Chain</h3>
                <p>File splits into 24KB chunks. Each chunk is a smart contract transaction. Smart wallets batch all chunks into one approval. File gets a unique ID and SHA-256 hash.</p>
              </div>
            </div>
            <div className="lp-tl-item">
              <div className="lp-tl-num">3</div>
              <div className="lp-tl-body">
                <h3>Get It Certified</h3>
                <p>Self-certify your documents, or share the file ID with an institution. They issue an on-chain certificate with type, recipient, and optional expiry date.</p>
              </div>
            </div>
            <div className="lp-tl-item">
              <div className="lp-tl-num">4</div>
              <div className="lp-tl-body">
                <h3>Anyone Can Verify</h3>
                <p>Drop any file on the Verify page. SHA-256 auto-computes. If the file exists on BaseVault, all certifications are shown. No wallet needed to verify.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES DEEP DIVE ===== */}
      <section className="lp-sec" ref={s4.ref}>
        <div className={s4.cls}>
          <h2 className="lp-sec-h2">Features</h2>
          <div className="lp-features-list">
            <div className="lp-fl-item">
              <div className="lp-fl-left">
                <span className="lp-fl-tag">Storage</span>
                <h3>Fully On-Chain File Storage</h3>
                <p>Every byte of your file is stored in a Base smart contract. No IPFS gateway, no pinning service, no S3 bucket. When you upload a 1MB PDF, all 1MB goes on-chain. It stays there forever. No one can delete it, censor it, or take it offline.</p>
              </div>
              <div className="lp-fl-right">
                <div className="lp-fl-detail">
                  <span>Max File Size</span><strong>50 MB</strong>
                </div>
                <div className="lp-fl-detail">
                  <span>Chunk Size</span><strong>24 KB per tx</strong>
                </div>
                <div className="lp-fl-detail">
                  <span>Storage</span><strong>Base L2 Chain</strong>
                </div>
                <div className="lp-fl-detail">
                  <span>Permanence</span><strong>Forever</strong>
                </div>
              </div>
            </div>

            <div className="lp-fl-item">
              <div className="lp-fl-left">
                <span className="lp-fl-tag lp-fl-tag-green">Security</span>
                <h3>AES-256-CTR Encryption</h3>
                <p>Private files are encrypted before any data hits the blockchain. The encryption key comes from two things: a signature from your wallet (proving identity) and a password you choose (extra protection). Both are required to decrypt. Not even the contract owner can read your private files.</p>
              </div>
              <div className="lp-fl-right">
                <div className="lp-fl-detail">
                  <span>Algorithm</span><strong>AES-256-CTR</strong>
                </div>
                <div className="lp-fl-detail">
                  <span>Key Source</span><strong>Wallet + Password</strong>
                </div>
                <div className="lp-fl-detail">
                  <span>Encryption</span><strong>Client-Side</strong>
                </div>
                <div className="lp-fl-detail">
                  <span>Recovery</span><strong>Same Wallet + Password</strong>
                </div>
              </div>
            </div>

            <div className="lp-fl-item">
              <div className="lp-fl-left">
                <span className="lp-fl-tag lp-fl-tag-purple">Certification</span>
                <h3>Institutional Verification</h3>
                <p>Institutions (universities, hospitals, law firms, auditors) register on-chain and issue verifiable certifications. Each cert has a type, recipient, expiry, and metadata. Supports delegation so team members can issue certs on behalf of the institution. Batch certify up to 100 documents in one transaction.</p>
              </div>
              <div className="lp-fl-right">
                <div className="lp-fl-detail">
                  <span>Cert Types</span><strong>13 Categories</strong>
                </div>
                <div className="lp-fl-detail">
                  <span>Batch Size</span><strong>Up to 100</strong>
                </div>
                <div className="lp-fl-detail">
                  <span>Registration</span><strong>Free (gas only)</strong>
                </div>
                <div className="lp-fl-detail">
                  <span>Revocation</span><strong>With Reason</strong>
                </div>
              </div>
            </div>

            <div className="lp-fl-item">
              <div className="lp-fl-left">
                <span className="lp-fl-tag lp-fl-tag-orange">Verification</span>
                <h3>Drag-and-Drop Verify</h3>
                <p>Anyone can verify a document without connecting a wallet. Drop a file on the Verify page and it auto-computes the SHA-256 hash. If the document exists on BaseVault, you instantly see the uploader, upload date, and all institutional certifications issued for that file.</p>
              </div>
              <div className="lp-fl-right">
                <div className="lp-fl-detail">
                  <span>Hash</span><strong>SHA-256</strong>
                </div>
                <div className="lp-fl-detail">
                  <span>Wallet Required</span><strong>No</strong>
                </div>
                <div className="lp-fl-detail">
                  <span>Method</span><strong>File Drop or Hash</strong>
                </div>
                <div className="lp-fl-detail">
                  <span>Certificate Page</span><strong>Public URL + QR</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== COMPARISON ===== */}
      <section className="lp-sec lp-sec-dark" ref={s5.ref}>
        <div className={s5.cls}>
          <h2 className="lp-sec-h2">BaseVault vs Others</h2>
          <div className="lp-compare">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th className="lp-compare-highlight">BaseVault</th>
                  <th>IPFS / Pinata</th>
                  <th>Arweave</th>
                  <th>Cloud Storage</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Data Location</td><td className="lp-compare-highlight">Base L2 Smart Contract</td><td>Peer-to-peer network</td><td>Arweave blockchain</td><td>Company servers</td></tr>
                <tr><td>File Permanence</td><td className="lp-compare-highlight">Forever (on-chain)</td><td>Needs pinning (can disappear)</td><td>Permanent</td><td>Until you stop paying</td></tr>
                <tr><td>Encryption</td><td className="lp-compare-highlight">AES-256 (wallet + password)</td><td>None by default</td><td>None by default</td><td>Server-side (provider has keys)</td></tr>
                <tr><td>Verification</td><td className="lp-compare-highlight">On-chain SHA-256 + certs</td><td>CID hash only</td><td>TX hash</td><td>None</td></tr>
                <tr><td>Institutional Certs</td><td className="lp-compare-highlight">13 types, batch, delegation</td><td>No</td><td>No</td><td>No</td></tr>
                <tr><td>Censorship</td><td className="lp-compare-highlight">Uncensorable</td><td>Gateway can block</td><td>Uncensorable</td><td>Provider can delete</td></tr>
                <tr><td>Server Dependency</td><td className="lp-compare-highlight">None</td><td>Pinning service needed</td><td>None</td><td>Full dependency</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ===== DATA RECOVERY ===== */}
      <section className="lp-sec" ref={s8.ref}>
        <div className={s8.cls}>
          <h2 className="lp-sec-h2">Your Data is Always Recoverable</h2>
          <p className="lp-sec-sub">Even if this website disappears, your files live on the blockchain forever. Here's how to get them back.</p>
          <div className="lp-cards-3">
            <div className="lp-card">
              <h3>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign:'middle',marginRight:8}}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Save Recovery Tool Now
              </h3>
              <p>Download our standalone recovery page and keep it on your computer. It's a single HTML file that works offline, just open it in any browser.</p>
              <a href="/recover.html" download="basevault-recover.html" className="lp-recovery-btn">Download Recovery Tool</a>
            </div>
            <div className="lp-card">
              <h3>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign:'middle',marginRight:8}}>
                  <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                How It Works
              </h3>
              <p>The recovery tool reads directly from the Base blockchain using public RPC. Enter any wallet address to see files, download public files, or connect your wallet to decrypt private files.</p>
            </div>
            <div className="lp-card">
              <h3>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{verticalAlign:'middle',marginRight:8}}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                What You Need
              </h3>
              <p><strong>Public files:</strong> Just the wallet address. <strong>Private files:</strong> Your wallet (MetaMask) + the encryption password you used during upload. No server, no API key, no account needed.</p>
            </div>
          </div>
          <div className="lp-recovery-contracts">
            <p>Smart contracts are public and verified on BaseScan:</p>
            <div className="lp-recovery-addrs">
              <a href="https://basescan.org/address/0x4B46B971f1fBDF6f6D45b703b2f2D042D06CFed3" target="_blank" rel="noopener noreferrer">
                Storage: 0x4B46...Fed3
              </a>
              <a href="https://basescan.org/address/0x2FDbfc75B8844Af376Be20b41c6C1ed70aA1c2E3" target="_blank" rel="noopener noreferrer">
                Certifier: 0x2FDb...0E3
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===== USE CASES ===== */}
      <section className="lp-sec" ref={s6.ref}>
        <div className={s6.cls}>
          <h2 className="lp-sec-h2">Who Is This For?</h2>
          <div className="lp-cards-3">
            <div className="lp-card">
              <h3>Universities & Schools</h3>
              <p>Issue degree certificates, transcripts, and course completions that anyone can verify instantly. No more fake credentials. No paper certificates that get lost.</p>
            </div>
            <div className="lp-card">
              <h3>Law Firms & Notaries</h3>
              <p>Store contracts, NDAs, court documents, and legal agreements with tamper-proof timestamps. Prove document existence and authenticity.</p>
            </div>
            <div className="lp-card">
              <h3>Hospitals & Labs</h3>
              <p>Medical records, lab reports, prescriptions, and research papers. Private encryption ensures patient-controlled access. Institutional certification adds trust.</p>
            </div>
            <div className="lp-card">
              <h3>Auditors & Compliance</h3>
              <p>Audit reports, compliance documents, and board resolutions with permanent, verifiable proof. Certificate includes auditor institution name and date.</p>
            </div>
            <div className="lp-card">
              <h3>Creators & Inventors</h3>
              <p>Prove creation date and ownership of inventions, designs, source code, art, and music. On-chain timestamp is your proof of prior art.</p>
            </div>
            <div className="lp-card">
              <h3>Anyone</h3>
              <p>Personal documents, identity records, tax receipts, insurance papers. Upload once, access forever. Encrypted for privacy, verifiable for trust.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="lp-sec lp-sec-dark" ref={s7.ref}>
        <div className={s7.cls}>
          <FAQ />
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="lp-cta">
        <h2>Start Using BaseVault</h2>
        <p>Upload your first file, register your institution, or verify a document.</p>
        <div className="lp-hero-btns">
          <a href="https://app.basevault.store" className="lp-btn-main">
            Open App
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </a>
          <a href="https://github.com/meraja34/basevault/releases/download/v2.0.0/basevault-v2.0.0-final.apk" className="lp-btn-main lp-btn-android">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/><path d="M12 18h.01"/></svg>
            Android App
          </a>
          <a href="https://app.basevault.store/register" className="lp-btn-sec">Register Institution</a>
        </div>
        <p className="lp-cta-note">Free to use. You only pay Base network gas fees.</p>
      </section>
    </div>
  );
}
