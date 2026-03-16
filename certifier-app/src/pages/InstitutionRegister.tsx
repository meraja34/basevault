import { useState } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';

import { WalletCompact } from '../components/WalletButton.tsx';
import toast from 'react-hot-toast';
import { CERTIFIER_ADDRESS, CERT_TYPE_LABELS, CERT_TYPE_ICONS } from '../constants.ts';
import { certifierAbi } from '../abi/index.ts';

const BENEFITS = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: 'On-Chain Trust',
    desc: 'Every certification is permanently recorded on Base blockchain. Tamper-proof and verifiable by anyone.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
    title: 'Batch Certification',
    desc: 'Certify up to 100 documents in one transaction. Save on gas fees. Perfect for graduation season.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Delegate Access',
    desc: 'Add team members as delegates who can issue certifications on behalf of your institution.',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    title: 'Expiry & Revocation',
    desc: 'Set certificate validity periods and revoke if needed. Full lifecycle management.',
  },
];

const STEPS = [
  { num: '1', title: 'Connect Wallet', desc: 'Use a multisig or institutional wallet for admin control' },
  { num: '2', title: 'Fill Details', desc: 'Enter your institution name and select cert types' },
  { num: '3', title: 'Register', desc: 'Free registration, only gas fees. Your on-chain identity is secured.' },
  { num: '4', title: 'Start Certifying', desc: 'Issue verifiable certifications from your dashboard' },
];

export default function InstitutionRegister() {
  const { isConnected } = useAccount();
  const [name, setName] = useState('');
  const [metadataURI, setMetadataURI] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<number[]>([0]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: regFee } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'institutionRegistrationFee',
  });

  const { writeContract, data: txHash, isPending } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const buildMask = () => {
    let mask = 0;
    for (const t of selectedTypes) {
      mask |= (1 << t);
    }
    return mask;
  };

  const toggleType = (typeId: number) => {
    setSelectedTypes(prev =>
      prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
    );
  };

  const selectAll = () => {
    setSelectedTypes(Object.keys(CERT_TYPE_LABELS).map(Number));
  };

  const clearAll = () => {
    setSelectedTypes([]);
  };

  const handleRegister = () => {
    if (!name.trim()) {
      toast.error('Institution name is required');
      return;
    }
    if (selectedTypes.length === 0) {
      toast.error('Select at least one certification type');
      return;
    }

    const mask = buildMask();
    const fee = regFee as bigint || 0n;

    writeContract({
      address: CERTIFIER_ADDRESS,
      abi: certifierAbi,
      functionName: 'registerInstitution',
      args: [name, metadataURI, mask],
      value: fee,
    }, {
      onError: (err) => toast.error(err.message.slice(0, 100)),
    });
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="page">
        <div className="register-success">
          <div className="register-success-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00c853" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h2>Registration Complete!</h2>
          <p>Your institution <strong>"{name}"</strong> has been registered on Base.</p>
          <p className="register-success-sub">You can now issue verifiable certifications from your dashboard.</p>
          <div className="register-success-actions">
            <a href="/dashboard" className="btn btn-primary btn-lg">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Open Dashboard
            </a>
            {txHash && (
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline btn-lg"
              >
                View on BaseScan
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page register-page">
      {/* Hero Banner */}
      <div className="register-hero">
        <div className="register-hero-badge">Institutional Certification</div>
        <h1 className="register-hero-title">
          Become a Verified Issuer on <span className="text-primary">Base</span>
        </h1>
        <p className="register-hero-desc">
          Register your institution to issue tamper-proof, verifiable certifications stored permanently on-chain.
          Degrees, licenses, audits, medical records and more.
        </p>
      </div>

      {/* Benefits Grid */}
      <div className="register-benefits">
        {BENEFITS.map((b, i) => (
          <div key={i} className="register-benefit-card">
            <div className="register-benefit-icon">{b.icon}</div>
            <h3>{b.title}</h3>
            <p>{b.desc}</p>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div className="register-steps">
        <h2 className="register-section-title">How It Works</h2>
        <div className="register-steps-row">
          {STEPS.map((s, i) => (
            <div key={i} className="register-step">
              <div className="register-step-num">{s.num}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
              {i < STEPS.length - 1 && <div className="register-step-arrow">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3"><polyline points="9 18 15 12 9 6"/></svg>
              </div>}
            </div>
          ))}
        </div>
      </div>

      {/* Registration Form */}
      <div className="register-form-section" id="register-form">
        <h2 className="register-section-title">Register Your Institution</h2>

        {!isConnected ? (
          <div className="register-connect">
            <div className="register-connect-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
                <rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/>
              </svg>
            </div>
            <p>Connect your wallet to register</p>
            <span className="register-connect-hint">Use a Safe multisig wallet for institutional admin control</span>
            <WalletCompact />
          </div>
        ) : (
          <div className="register-form-card">
            {/* Institution Name */}
            <div className="register-field">
              <label className="register-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                Institution Name
                <span className="register-required">*</span>
              </label>
              <input
                type="text"
                className="register-input"
                placeholder="e.g. MIT, Stanford University, Deloitte..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Certification Types */}
            <div className="register-field">
              <div className="register-label-row">
                <label className="register-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  Certification Types
                  <span className="register-required">*</span>
                </label>
                <div className="register-type-actions">
                  <button className="register-type-action" onClick={selectAll}>Select All</button>
                  <button className="register-type-action" onClick={clearAll}>Clear</button>
                </div>
              </div>
              <p className="register-hint">Choose which types of certifications your institution will issue</p>
              <div className="register-type-grid">
                {Object.entries(CERT_TYPE_LABELS).map(([key, label]) => {
                  const id = Number(key);
                  const isActive = selectedTypes.includes(id);
                  return (
                    <button
                      key={id}
                      className={`register-type-chip ${isActive ? 'active' : ''}`}
                      onClick={() => toggleType(id)}
                    >
                      <span className="register-type-emoji">{CERT_TYPE_ICONS[id]}</span>
                      <span className="register-type-label">{label}</span>
                      {isActive && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="register-selected-count">{selectedTypes.length} of {Object.keys(CERT_TYPE_LABELS).length} types selected</p>
            </div>

            {/* Advanced - Metadata URI */}
            <div className="register-field">
              <button className="register-advanced-toggle" onClick={() => setShowAdvanced(!showAdvanced)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                Advanced Settings
              </button>
              {showAdvanced && (
                <div className="register-advanced-content">
                  <label className="register-label register-label-sm">Metadata URI (optional)</label>
                  <input
                    type="text"
                    className="register-input"
                    placeholder="https://yoursite.com/institution-metadata.json"
                    value={metadataURI}
                    onChange={(e) => setMetadataURI(e.target.value)}
                  />
                  <p className="register-hint">JSON file with your logo URL, website, and description for your public profile.</p>
                </div>
              )}
            </div>

            {/* Fee & Submit */}
            <div className="register-submit-section">
              <div className="register-fee-box">
                <div className="register-fee-row">
                  <span>Registration Fee</span>
                  <strong className="register-fee-amount">Free</strong>
                </div>
                <p className="register-fee-note">No registration fee. Only gas fees apply.</p>
              </div>

              <button
                className="btn btn-primary btn-lg btn-full register-submit-btn"
                onClick={handleRegister}
                disabled={isPending || isConfirming || !name.trim() || selectedTypes.length === 0}
              >
                {isPending ? (
                  <><div className="spinner spinner-sm" /> Confirm in Wallet...</>
                ) : isConfirming ? (
                  <><div className="spinner spinner-sm" /> Confirming on Base...</>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                    Register Institution
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CTA / FAQ */}
      <div className="register-cta">
        <h3>Already Registered?</h3>
        <p>Go to your dashboard to start issuing certifications.</p>
        <a href="/dashboard" className="btn btn-outline btn-lg">Open Dashboard</a>
      </div>
    </div>
  );
}
