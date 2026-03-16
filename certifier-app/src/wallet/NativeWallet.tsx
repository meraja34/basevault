import { useState } from 'react';
import { useConnect } from 'wagmi';
import { hasStoredWallet, createNewWallet, importWallet, removeWallet, getStoredAddress } from './localWallet.ts';
import { LOCAL_CONNECTOR_ID, unlockAndCache } from './localConnector.ts';

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
      // Unlock (caches key in memory) and connect wagmi
      unlockAndCache(password);
      connectLocal();
      setLoading(false);
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
      // Unlock (caches key in memory) and connect wagmi
      unlockAndCache(password);
      connectLocal();
      setLoading(false);
    } catch {
      setError('Wrong password');
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('This will remove your stored wallet. Make sure you have your private key backed up!')) {
      removeWallet();
      setMode('main');
      setPassword('');
      setError('');
    }
  };

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
          <button className="nw-btn nw-btn-primary" style={{ marginTop: 8 }} onClick={() => { setShowKey(false); unlockAndCache(password); connectLocal(); }}>
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
          <p className="nw-sub">Enter your password to continue</p>
          {getStoredAddress() && (
            <p className="nw-addr-small">{getStoredAddress()?.slice(0, 8)}...{getStoredAddress()?.slice(-6)}</p>
          )}
          <input
            type="password"
            className="nw-input"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
            autoFocus
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
