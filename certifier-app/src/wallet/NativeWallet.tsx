import { useState, useEffect } from 'react';
import { useConnect } from 'wagmi';
import { hasStoredWallet, createNewWallet, importWallet, removeWallet, getStoredAddress } from './localWallet.ts';
import { LOCAL_CONNECTOR_ID, unlockAndCache } from './localConnector.ts';

const BIO_ENABLED_KEY = 'basevault-bio-enabled';

// Check if biometric auth is available
async function isBiometricAvailable(): Promise<boolean> {
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch {
    return false;
  }
}

// Store password for biometric unlock
async function saveBioPassword(password: string): Promise<boolean> {
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    await NativeBiometric.setCredentials({
      username: 'basevault-wallet',
      password: password,
      server: 'basevault.local',
    });
    localStorage.setItem(BIO_ENABLED_KEY, 'true');
    return true;
  } catch {
    return false;
  }
}

// Get password via biometric auth
async function getBioPassword(): Promise<string | null> {
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    await NativeBiometric.verifyIdentity({
      reason: 'Unlock BaseVault wallet',
      title: 'BaseVault',
      subtitle: 'Use fingerprint to unlock',
    });
    const creds = await NativeBiometric.getCredentials({ server: 'basevault.local' });
    return creds.password;
  } catch {
    return null;
  }
}

function isBioEnabled(): boolean {
  return localStorage.getItem(BIO_ENABLED_KEY) === 'true';
}

async function removeBioPassword() {
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    await NativeBiometric.deleteCredentials({ server: 'basevault.local' });
  } catch {}
  localStorage.removeItem(BIO_ENABLED_KEY);
}

export default function NativeWallet() {
  const { connect, connectors } = useConnect();
  const stored = hasStoredWallet();
  const [mode, setMode] = useState<'main' | 'create' | 'import' | 'unlock'>(stored ? 'unlock' : 'main');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(isBioEnabled());
  const [askBio, setAskBio] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  // Auto-try biometric unlock on mount
  useEffect(() => {
    if (stored && bioEnabled && bioAvailable && mode === 'unlock') {
      handleBioUnlock();
    }
  }, [bioAvailable]);

  const connectLocal = () => {
    const connector = connectors.find(c => c.id === LOCAL_CONNECTOR_ID);
    if (connector) {
      connect({ connector });
    }
  };

  const handleCreate = () => {
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { privateKey } = createNewWallet(password);
      setNewKey(privateKey);
      setShowKey(true);
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  };

  const handleImport = () => {
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!privateKeyInput.trim()) {
      setError('Enter your private key');
      return;
    }
    setLoading(true);
    try {
      importWallet(privateKeyInput.trim(), password);
      unlockAndCache(password);
      if (bioAvailable) {
        setAskBio(true);
        setLoading(false);
      } else {
        connectLocal();
        setLoading(false);
      }
    } catch (e: any) {
      setError(e.message || 'Invalid private key');
      setLoading(false);
    }
  };

  const handleUnlock = () => {
    setError('');
    if (!password) {
      setError('Enter your password');
      return;
    }
    setLoading(true);
    try {
      unlockAndCache(password);
      connectLocal();
      setLoading(false);
    } catch {
      setError('Wrong password');
      setLoading(false);
    }
  };

  const handleBioUnlock = async () => {
    setError('');
    setLoading(true);
    const pw = await getBioPassword();
    if (pw) {
      try {
        unlockAndCache(pw);
        connectLocal();
      } catch {
        setError('Biometric unlock failed. Enter password.');
      }
    }
    setLoading(false);
  };

  const handleEnableBio = async () => {
    const ok = await saveBioPassword(password);
    setBioEnabled(ok);
    setAskBio(false);
    connectLocal();
  };

  const handleSkipBio = () => {
    setAskBio(false);
    connectLocal();
  };

  const handleReset = () => {
    if (confirm('This will remove your stored wallet. Make sure you have your private key backed up!')) {
      removeWallet();
      removeBioPassword();
      setBioEnabled(false);
      setMode('main');
      setPassword('');
      setError('');
    }
  };

  // Ask to enable biometrics after create/import
  if (askBio) {
    return (
      <div className="nw-container">
        <div className="nw-card">
          <div className="nw-icon-circle nw-icon-green">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 11c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3"/><path d="M2 12a10 10 0 0020 0"/><path d="M12 2a10 10 0 00-7.07 2.93"/><path d="M22 12A10 10 0 0012 2"/><path d="M15 11a6 6 0 00-6-6"/><path d="M12 18a6 6 0 006-6"/></svg>
          </div>
          <h2>Enable Fingerprint?</h2>
          <p className="nw-sub">Unlock your wallet with fingerprint next time. Faster and more secure.</p>
          <button className="nw-btn nw-btn-primary" onClick={handleEnableBio}>
            Enable Fingerprint
          </button>
          <button className="nw-btn nw-btn-ghost" onClick={handleSkipBio}>
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // Show private key after creation
  if (showKey) {
    return (
      <div className="nw-container">
        <div className="nw-card nw-card-success">
          <div className="nw-icon-circle nw-icon-green">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h2>Wallet Created!</h2>
          <p className="nw-warning">Save your private key NOW. You will not see it again. If you lose it, your files and funds are gone forever.</p>
          <div className="nw-key-box">
            <code>{newKey}</code>
          </div>
          <p className="nw-addr">Address: <code>{getStoredAddress()}</code></p>
          <p className="nw-note">Send some ETH on Base to this address for gas fees.</p>
          <button className="nw-btn nw-btn-primary" onClick={() => { navigator.clipboard.writeText(newKey); }}>
            Copy Private Key
          </button>
          <button className="nw-btn nw-btn-primary" style={{ marginTop: 8 }} onClick={() => {
            setShowKey(false);
            unlockAndCache(password);
            if (bioAvailable) {
              setAskBio(true);
            } else {
              connectLocal();
            }
          }}>
            Continue to App
          </button>
        </div>
      </div>
    );
  }

  // Unlock existing wallet
  if (mode === 'unlock') {
    return (
      <div className="nw-container">
        <div className="nw-card">
          <div className="nw-icon-circle nw-icon-blue">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          </div>
          <h2>Unlock Wallet</h2>
          <p className="nw-sub">{bioEnabled && bioAvailable ? 'Use fingerprint or enter password' : 'Enter your password to continue'}</p>
          {getStoredAddress() && (
            <p className="nw-addr-small">{getStoredAddress()?.slice(0, 8)}...{getStoredAddress()?.slice(-6)}</p>
          )}

          {/* Fingerprint button */}
          {bioEnabled && bioAvailable && (
            <button className="nw-btn nw-btn-bio" onClick={handleBioUnlock} disabled={loading}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 11c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3"/><path d="M2 12a10 10 0 0020 0"/><path d="M12 2a10 10 0 00-7.07 2.93"/><path d="M22 12A10 10 0 0012 2"/><path d="M15 11a6 6 0 00-6-6"/><path d="M12 18a6 6 0 006-6"/></svg>
              {loading ? 'Verifying...' : 'Unlock with Fingerprint'}
            </button>
          )}

          <div className="nw-divider">
            {bioEnabled && bioAvailable && <span>or enter password</span>}
          </div>

          <input
            type="password"
            className="nw-input"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          />
          {error && <p className="nw-error">{error}</p>}
          <button className="nw-btn nw-btn-primary" onClick={handleUnlock} disabled={loading}>
            {loading ? 'Unlocking...' : 'Unlock'}
          </button>
          <button className="nw-btn nw-btn-ghost" onClick={handleReset}>
            Reset Wallet
          </button>
        </div>
      </div>
    );
  }

  // Create new wallet
  if (mode === 'create') {
    return (
      <div className="nw-container">
        <div className="nw-card">
          <button className="nw-back" onClick={() => setMode('main')}>&larr; Back</button>
          <div className="nw-icon-circle nw-icon-blue">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          </div>
          <h2>Create New Wallet</h2>
          <p className="nw-sub">Set a password to encrypt your private key</p>
          <input
            type="password"
            className="nw-input"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            className="nw-input"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          {error && <p className="nw-error">{error}</p>}
          <button className="nw-btn nw-btn-primary" onClick={handleCreate} disabled={loading}>
            {loading ? 'Creating...' : 'Create Wallet'}
          </button>
        </div>
      </div>
    );
  }

  // Import existing wallet
  if (mode === 'import') {
    return (
      <div className="nw-container">
        <div className="nw-card">
          <button className="nw-back" onClick={() => setMode('main')}>&larr; Back</button>
          <div className="nw-icon-circle nw-icon-purple">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <h2>Import Wallet</h2>
          <p className="nw-sub">Enter your private key and set a password</p>
          <input
            type="password"
            className="nw-input"
            placeholder="Private Key (0x...)"
            value={privateKeyInput}
            onChange={e => setPrivateKeyInput(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            className="nw-input"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleImport()}
          />
          {error && <p className="nw-error">{error}</p>}
          <button className="nw-btn nw-btn-primary" onClick={handleImport} disabled={loading}>
            {loading ? 'Importing...' : 'Import Wallet'}
          </button>
        </div>
      </div>
    );
  }

  // Main screen - choose create or import
  return (
    <div className="nw-container">
      <div className="nw-card">
        <img src="/icon.svg" alt="BaseVault" className="nw-logo" />
        <h2>BaseVault</h2>
        <p className="nw-tagline">On-Chain Document Storage</p>
        <p className="nw-sub">Create a new wallet or import an existing one to get started.</p>
        <button className="nw-btn nw-btn-primary" onClick={() => setMode('create')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
          Create New Wallet
        </button>
        <button className="nw-btn nw-btn-secondary" onClick={() => setMode('import')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Import Private Key
        </button>
      </div>
    </div>
  );
}
