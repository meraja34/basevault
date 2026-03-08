import { useState, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS } from '../constants';
import abi from '../abi/BaseVault.json';
import { computeFileHash } from '../utils/ipfs';
import FileDropzone from '../components/FileDropzone';

export default function Verify() {
  const [fileHash, setFileHash] = useState<string>('');
  const [manualHash, setManualHash] = useState('');
  const [mode, setMode] = useState<'file' | 'hash'>('file');
  const [fileName, setFileName] = useState('');

  const hashToVerify = (mode === 'file' ? fileHash : manualHash) as `0x${string}`;

  const { data, isLoading, isError } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'verifyDocument',
    args: [hashToVerify],
    query: { enabled: hashToVerify.length === 66 },
  });

  const result = data as [boolean, bigint, string, bigint, boolean, string] | undefined;

  const handleFileSelect = useCallback(async (files: File[]) => {
    const file = files[0];
    setFileName(file.name);
    const hash = await computeFileHash(file);
    setFileHash(hash);
  }, []);

  return (
    <div className="page">
      <h1 className="page-title">Verify Document</h1>
      <p className="page-desc">
        Check if a document has been registered on BaseVault. Upload a file or enter its SHA-256 hash.
      </p>

      <div className="verify-tabs">
        <button
          className={`tab ${mode === 'file' ? 'tab-active' : ''}`}
          onClick={() => setMode('file')}
        >
          Upload File
        </button>
        <button
          className={`tab ${mode === 'hash' ? 'tab-active' : ''}`}
          onClick={() => setMode('hash')}
        >
          Enter Hash
        </button>
      </div>

      {mode === 'file' ? (
        <div className="verify-upload">
          <FileDropzone
            onFilesSelected={handleFileSelect}
            label="Drop a file to verify its authenticity"
          />
          {fileName && (
            <div className="verify-file-info">
              <p>File: <strong>{fileName}</strong></p>
              <p>Hash: <code>{fileHash.slice(0, 20)}...{fileHash.slice(-8)}</code></p>
            </div>
          )}
        </div>
      ) : (
        <div className="verify-manual">
          <input
            type="text"
            placeholder="Enter SHA-256 hash (0x...)"
            value={manualHash}
            onChange={(e) => setManualHash(e.target.value)}
            className="input-full"
          />
        </div>
      )}

      {isLoading && hashToVerify.length === 66 && (
        <div className="loading">
          <div className="spinner" />
          <p>Checking Base chain...</p>
        </div>
      )}

      {result && hashToVerify.length === 66 && !isLoading && (
        <div className={`verify-result ${result[0] ? 'verify-found' : 'verify-not-found'}`}>
          {result[0] ? (
            <>
              <div className="verify-status verify-status-found">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00c853" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <h3>Document Found On-Chain</h3>
              </div>
              <div className="verify-details">
                <div className="detail-row">
                  <span className="detail-label">File Name:</span>
                  <span className="detail-value">{result[5]}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Uploader:</span>
                  <code className="detail-value">{result[2]}</code>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Upload Date:</span>
                  <span className="detail-value">
                    {new Date(Number(result[3]) * 1000).toLocaleString()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Certified:</span>
                  <span className={`detail-value ${result[4] ? 'text-green' : 'text-yellow'}`}>
                    {result[4] ? 'Yes - Certified on-chain' : 'No - Not certified yet'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="verify-status verify-status-not-found">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ff5252" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
              <h3>Document Not Found</h3>
              <p>This file has not been registered on BaseVault.</p>
            </div>
          )}
        </div>
      )}

      {isError && (
        <div className="verify-result verify-not-found">
          <p>Error reading from contract. Make sure the contract is deployed.</p>
        </div>
      )}
    </div>
  );
}
