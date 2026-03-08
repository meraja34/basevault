import { useState, useEffect } from 'react';
import { usePublicClient, useSignMessage } from 'wagmi';
import toast from 'react-hot-toast';
import { formatFileSize, chunksToBlob } from '../utils/ipfs';
import { decryptFile, deriveKeyFromSignature } from '../utils/crypto';
import { CONTRACT_ADDRESS } from '../constants';
import abi from '../abi/BaseVault.json';

const SIGN_MESSAGE = 'BaseVault: Authorize encryption key for private files';

interface FileCardProps {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploader: string;
  uploadedAt: number;
  certified: boolean;
  chunkCount: number;
  isPublic: boolean;
  isOwner?: boolean;
  onCertify?: (id: number) => void;
  showCertify?: boolean;
  onToggleVisibility?: (id: number, isPublic: boolean) => void;
}

export default function FileCard({
  id,
  fileName,
  fileType,
  fileSize,
  uploader,
  uploadedAt,
  certified,
  chunkCount,
  isPublic,
  isOwner = false,
  onCertify,
  showCertify = false,
  onToggleVisibility,
}: FileCardProps) {
  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';
  const date = new Date(uploadedAt * 1000);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showDecrypt, setShowDecrypt] = useState(false);
  const [decryptPassword, setDecryptPassword] = useState('');
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();

  const loadChunks = async (): Promise<string[]> => {
    if (!publicClient) return [];
    const chunks: string[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi,
        functionName: 'getChunk',
        args: [BigInt(id), BigInt(i)],
      });
      chunks.push(data as string);
    }
    return chunks;
  };

  const reassembleChunks = (chunks: string[]): Uint8Array => {
    const hexStr = chunks.map(c => c.startsWith('0x') ? c.slice(2) : c).join('');
    const bytes = new Uint8Array(hexStr.length / 2);
    for (let i = 0; i < hexStr.length; i += 2) {
      bytes[i / 2] = parseInt(hexStr.substring(i, i + 2), 16);
    }
    return bytes;
  };

  const loadPreview = async () => {
    if (!publicClient || !isImage || chunkCount === 0 || previewUrl || !isPublic) return;
    setLoading(true);
    try {
      const chunks = await loadChunks();
      const url = chunksToBlob(chunks, fileType);
      setPreviewUrl(url);
    } catch (err) {
      console.error('Preview load failed:', err);
    }
    setLoading(false);
  };

  const handleDecrypt = async () => {
    if (!publicClient || chunkCount === 0 || !decryptPassword) {
      toast.error('Enter your password');
      return;
    }
    setLoading(true);
    try {
      const signature = await signMessageAsync({ message: SIGN_MESSAGE });
      const key = deriveKeyFromSignature(signature, decryptPassword);

      const chunks = await loadChunks();
      const bytes = reassembleChunks(chunks);
      const decrypted = decryptFile(bytes.buffer as ArrayBuffer, key);

      if (isImage) {
        const blob = new Blob([new Uint8Array(decrypted)], { type: fileType });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setShowDecrypt(false);
        toast.success('Decrypted!');
      } else {
        const blob = new Blob([new Uint8Array(decrypted)], { type: fileType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Decrypted & downloaded!');
      }
    } catch (err: any) {
      console.error('Decrypt failed:', err);
      toast.error('Decryption failed. Wrong wallet or password?');
    }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!publicClient || chunkCount === 0) return;
    setLoading(true);
    try {
      const chunks = await loadChunks();
      const bytes = reassembleChunks(chunks);
      const blob = new Blob([new Uint8Array(bytes)], { type: fileType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isImage && isPublic && chunkCount <= 4) {
      loadPreview();
    }
  }, [id]);

  return (
    <div className="file-card">
      <div className="file-card-preview">
        {!isPublic && !previewUrl ? (
          <div className="private-overlay">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Encrypted</span>
          </div>
        ) : isImage && previewUrl ? (
          <img src={previewUrl} alt={fileName} />
        ) : isImage && !previewUrl ? (
          <div className="file-icon file-icon-img" onClick={loadPreview} style={{ cursor: 'pointer' }}>
            {loading ? '...' : 'IMG'}
          </div>
        ) : isPdf ? (
          <div className="file-icon file-icon-pdf">PDF</div>
        ) : (
          <div className="file-icon file-icon-doc">FILE</div>
        )}
        {certified && <div className="certified-badge">Certified</div>}
        {!isPublic && <div className="private-badge">Private</div>}
      </div>
      <div className="file-card-info">
        <h3 className="file-card-name" title={fileName}>{fileName}</h3>
        <div className="file-card-meta">
          <span>{formatFileSize(fileSize)}</span>
          <span>{date.toLocaleDateString()}</span>
        </div>
        <div className="file-card-meta">
          <span>{chunkCount} chunk{chunkCount > 1 ? 's' : ''}</span>
          <span>{isPublic ? 'Public' : 'Private'}</span>
        </div>
        <div className="file-card-address" title={uploader}>
          {uploader.slice(0, 6)}...{uploader.slice(-4)}
        </div>

        {!isPublic && isOwner && showDecrypt && (
          <div className="decrypt-section">
            <label>Enter your password:</label>
            <div className="decrypt-input-row">
              <input
                type="password"
                placeholder="Password..."
                value={decryptPassword}
                onChange={(e) => setDecryptPassword(e.target.value)}
              />
              <button className="btn btn-sm btn-primary" onClick={handleDecrypt} disabled={loading || !decryptPassword}>
                {loading ? '...' : 'Decrypt'}
              </button>
            </div>
          </div>
        )}

        <div className="file-card-actions">
          {isPublic && isImage && !previewUrl && (
            <button className="btn btn-sm" onClick={loadPreview} disabled={loading}>
              {loading ? '...' : 'Preview'}
            </button>
          )}
          {isPublic && (
            <button className="btn btn-sm" onClick={handleDownload} disabled={loading}>
              {loading ? '...' : 'Download'}
            </button>
          )}
          {!isPublic && isOwner && (
            <button className="btn btn-sm btn-primary" onClick={() => setShowDecrypt(!showDecrypt)}>
              {showDecrypt ? 'Cancel' : 'Decrypt'}
            </button>
          )}
          {isOwner && onToggleVisibility && (
            <button className="btn btn-sm" onClick={() => onToggleVisibility(id, !isPublic)}>
              {isPublic ? 'Make Private' : 'Make Public'}
            </button>
          )}
          {showCertify && !certified && onCertify && (
            <button className="btn btn-sm btn-accent" onClick={() => onCertify(id)}>
              Certify
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
