import { useState } from 'react';
import { useAccount, useWriteContract, usePublicClient, useSignMessage, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import toast from 'react-hot-toast';
import FileDropzone from '../components/FileDropzone';
import { computeFileHash, fileToChunks, formatFileSize } from '../utils/ipfs';
import { deriveKeyFromSignature, encryptFile, copyText } from '../utils/crypto';
import { CONTRACT_ADDRESS, CHUNK_SIZE } from '../constants';
import abi from '../abi/BaseVault.json';

const SIGN_MESSAGE = 'BaseVault: Authorize encryption key for private files';

export default function Upload() {
  const { isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [file, setFile] = useState<File | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'hashing' | 'signing' | 'encrypting' | 'creating' | 'uploading' | 'done'>('idle');
  const [progress, setProgress] = useState('');
  const [chunkProgress, setChunkProgress] = useState({ current: 0, total: 0 });
  const [fileId, setFileId] = useState<number>(0);
  const [fileHash, setFileHash] = useState('');
  const [txHash, setTxHash] = useState('');

  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();

  const { data: feePerChunk } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'feePerChunk',
  });

  const handleFilesSelected = (files: File[]) => {
    setFile(files[0]);
    setStatus('idle');
    setProgress('');
    setChunkProgress({ current: 0, total: 0 });
  };

  const handleUpload = async () => {
    if (!file || !publicClient) return;
    if (!isPublic && !password) {
      toast.error('Enter a password for encryption');
      return;
    }

    try {
      // Step 1: Hash original file
      setStatus('hashing');
      setProgress('Computing SHA-256 hash...');
      const hash = await computeFileHash(file);
      setFileHash(hash);

      let buffer = await file.arrayBuffer();

      // Step 2: Encrypt if private
      if (!isPublic) {
        setStatus('signing');
        setProgress('Sign the message in your wallet...');
        const signature = await signMessageAsync({ message: SIGN_MESSAGE });
        const key = deriveKeyFromSignature(signature, password);

        setStatus('encrypting');
        setProgress('Encrypting file (AES-256)...');
        buffer = encryptFile(buffer, key);
      }

      const chunks = fileToChunks(buffer);
      const chunkFee = feePerChunk as bigint;
      const totalFee = chunkFee * BigInt(chunks.length);

      if (chunks.length === 1) {
        // Single chunk: one transaction
        setStatus('uploading');
        setProgress('Uploading file in one transaction...');

        const uploadHash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi,
          functionName: 'createFileWithData',
          args: [hash as `0x${string}`, file.name, file.type, BigInt(file.size), isPublic, chunks],
          value: totalFee,
        });

        setProgress('Waiting for confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash: uploadHash });
        setTxHash(uploadHash);

        const fileUploadedLog = receipt.logs.find(log =>
          log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() && log.topics.length >= 2
        );
        const newFileId = fileUploadedLog ? parseInt(fileUploadedLog.topics[1] as string, 16) : 0;
        setFileId(newFileId);
      } else {
        // Multi-chunk: createFile (pays all fees) + uploadChunks (free)
        setStatus('creating');
        setProgress(`Creating file record (${chunks.length} chunks)...`);

        const createHash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi,
          functionName: 'createFile',
          args: [hash as `0x${string}`, file.name, file.type, BigInt(file.size), BigInt(chunks.length), isPublic],
          value: totalFee,
        });

        setProgress('Waiting for file record confirmation...');
        const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash });
        setTxHash(createHash);

        const fileUploadedLog = receipt.logs.find(log =>
          log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase() && log.topics.length >= 2
        );
        const newFileId = fileUploadedLog ? parseInt(fileUploadedLog.topics[1] as string, 16) : 0;
        setFileId(newFileId);

        toast.success('File record created! Uploading data chunks...');

        // Upload chunks one by one (free - fee already paid)
        setStatus('uploading');
        setChunkProgress({ current: 0, total: chunks.length });

        for (let i = 0; i < chunks.length; i++) {
          setProgress(`Uploading chunk ${i + 1} of ${chunks.length}...`);
          setChunkProgress({ current: i + 1, total: chunks.length });

          const chunkHash = await writeContractAsync({
            address: CONTRACT_ADDRESS,
            abi,
            functionName: 'uploadChunk',
            args: [BigInt(newFileId), BigInt(i), chunks[i]],
          });

          await publicClient.waitForTransactionReceipt({ hash: chunkHash });
          setTxHash(chunkHash);
        }
      }

      setStatus('done');
      setProgress('');
      toast.success(isPublic ? 'File stored on-chain!' : 'File encrypted & stored on-chain!');
    } catch (err: any) {
      console.error(err);
      toast.error(err.shortMessage || err.message || 'Upload failed');
      setStatus('idle');
      setProgress('');
      setChunkProgress({ current: 0, total: 0 });
    }
  };

  const estimateCost = (size: number) => {
    const dataSize = isPublic ? size : size + 16;
    const numChunks = Math.ceil(dataSize / CHUNK_SIZE);
    const fee = feePerChunk ? Number(feePerChunk) * numChunks : 0;
    return { chunks: numChunks, feeEth: fee / 1e18 };
  };

  const handleCopy = (text: string, label: string) => {
    if (copyText(text)) {
      toast.success(`${label} copied!`);
    } else {
      toast.error('Copy failed');
    }
  };

  const cost = file ? estimateCost(file.size) : null;

  return (
    <div className="page">
      <h1 className="page-title">Upload Files On-Chain</h1>
      <p className="page-desc">
        Files are stored directly on Base chain. No IPFS, no servers, fully on-chain and permanent.
      </p>

      {!isConnected ? (
        <div className="connect-prompt">
          <p>Connect your wallet to upload files</p>
          <ConnectButton />
        </div>
      ) : (
        <div className="upload-area">
          <FileDropzone onFilesSelected={handleFilesSelected} />

          {file && (
            <div className="upload-preview">
              <div className="preview-info">
                <h3>{file.name}</h3>
                <p>{file.type} - {formatFileSize(file.size)}</p>
                {cost && (
                  <p className="cost-estimate">
                    {cost.chunks} chunk{cost.chunks > 1 ? 's' : ''} | {cost.chunks === 1 ? '1 transaction' : `${cost.chunks + 1} transactions`} | Fee: {cost.feeEth > 0 ? `${cost.feeEth} ETH` : '...'}
                  </p>
                )}
              </div>

              {status === 'idle' && (
                <>
                  <div className="visibility-toggle">
                    <button
                      className={`toggle-btn ${isPublic ? 'toggle-active' : ''}`}
                      onClick={() => setIsPublic(true)}
                    >
                      <span className="toggle-icon">&#x1f310;</span>
                      Public
                    </button>
                    <button
                      className={`toggle-btn ${!isPublic ? 'toggle-active toggle-private' : ''}`}
                      onClick={() => setIsPublic(false)}
                    >
                      <span className="toggle-icon">&#x1f512;</span>
                      Private
                    </button>
                  </div>

                  {!isPublic && (
                    <div className="password-section">
                      <label>Encryption Password</label>
                      <input
                        type="password"
                        placeholder="Enter a strong password..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-full"
                      />
                      <p className="password-hint">
                        Your file is encrypted using Wallet Signature + Password. Both are needed to decrypt. Remember this password.
                      </p>
                    </div>
                  )}

                  <p className="toggle-desc">
                    {isPublic
                      ? 'Anyone can view this file on-chain.'
                      : 'File will be encrypted with your wallet + password. Only you can decrypt.'}
                  </p>
                  <button className="btn btn-primary btn-lg" onClick={handleUpload}>
                    {isPublic ? 'Store On-Chain (Public)' : 'Encrypt & Store On-Chain (Private)'}
                  </button>
                </>
              )}

              {(status === 'hashing' || status === 'signing' || status === 'encrypting' || status === 'creating' || status === 'uploading') && (
                <div className="upload-progress">
                  <div className="spinner" />
                  <div>
                    <p>{progress}</p>
                    {chunkProgress.total > 0 && (
                      <>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${(chunkProgress.current / chunkProgress.total) * 100}%` }}
                          />
                        </div>
                        <p className="progress-sub">
                          {chunkProgress.current}/{chunkProgress.total} chunks uploaded
                        </p>
                      </>
                    )}
                    {status === 'signing' && (
                      <p className="progress-sub">Sign the message in your wallet to create your encryption key</p>
                    )}
                    {status === 'creating' && (
                      <p className="progress-sub">Confirm transaction in your wallet...</p>
                    )}
                    {status === 'uploading' && chunkProgress.total === 0 && (
                      <p className="progress-sub">Confirm transaction in your wallet</p>
                    )}
                    {status === 'uploading' && chunkProgress.total > 0 && (
                      <p className="progress-sub">Confirm each chunk transaction in your wallet</p>
                    )}
                  </div>
                </div>
              )}

              {status === 'done' && (
                <div className="upload-success">
                  <div className="success-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00c853" strokeWidth="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <h3>{isPublic ? 'Stored On-Chain!' : 'Encrypted & Stored On-Chain!'}</h3>
                  <div className="success-details">
                    <div className="detail-row">
                      <span className="detail-label">File ID:</span>
                      <span className="detail-value">#{fileId}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">File Hash:</span>
                      <span className="detail-value hash-value">
                        <code>{fileHash}</code>
                        <button className="copy-btn" onClick={() => handleCopy(fileHash, 'Hash')}>
                          Copy
                        </button>
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Visibility:</span>
                      <span className="detail-value">{isPublic ? 'Public' : 'Private (Encrypted)'}</span>
                    </div>
                    {!isPublic && (
                      <div className="detail-row">
                        <span className="detail-label">Decrypt:</span>
                        <span className="detail-value">Connect same wallet + enter same password</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="detail-label">BaseScan:</span>
                      <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
                        View Transaction
                      </a>
                    </div>
                  </div>
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      setFile(null);
                      setStatus('idle');
                      setFileId(0);
                      setFileHash('');
                      setTxHash('');
                      setPassword('');
                      setChunkProgress({ current: 0, total: 0 });
                    }}
                  >
                    Upload Another
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
