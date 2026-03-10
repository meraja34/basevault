import { useState, useEffect } from 'react';
import { usePublicClient, useSignMessage } from 'wagmi';
import toast from 'react-hot-toast';
import { formatFileSize, chunksToBlob } from '../utils/ipfs.ts';
import { decryptFile, deriveKeyFromSignature } from '../utils/crypto.ts';
import { CONTRACT_ADDRESS } from '../constants.ts';
import { baseVaultAbi } from '../abi/index.ts';

const SIGN_MESSAGE = 'BaseVault: Authorize encryption key for private files';

function FileViewer({ url, fileName, fileType, onClose }: { url: string; fileName: string; fileType: string; onClose: () => void }) {
  const isImage = fileType.startsWith('image/');
  const isPdf = fileType === 'application/pdf';
  const isText = fileType.startsWith('text/') || fileType === 'application/json' || fileType === 'application/xml';
  const isVideo = fileType.startsWith('video/');
  const isAudio = fileType.startsWith('audio/');

  const [textContent, setTextContent] = useState<string>('');

  useEffect(() => {
    if (isText) {
      fetch(url).then(r => r.text()).then(setTextContent).catch(() => setTextContent('Failed to load file content.'));
    }
  }, [url, isText]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const openInNewTab = () => {
    window.open(url, '_blank');
  };

  const renderContent = () => {
    if (isImage) {
      return <img src={url} alt={fileName} />;
    }
    if (isPdf) {
      return (
        <object data={url} type="application/pdf" className="file-viewer-pdf">
          <div className="file-viewer-fallback">
            <p>PDF preview not supported on this device.</p>
            <div className="file-viewer-fallback-actions">
              <button className="btn btn-sm btn-primary" onClick={openInNewTab}>Open in New Tab</button>
              <a href={url} download={fileName} className="btn btn-sm">Download</a>
            </div>
          </div>
        </object>
      );
    }
    if (isVideo) {
      return <video src={url} controls autoPlay className="file-viewer-video" />;
    }
    if (isAudio) {
      return (
        <div className="file-viewer-audio">
          <div className="file-viewer-audio-icon">&#9835;</div>
          <p>{fileName}</p>
          <audio src={url} controls autoPlay />
        </div>
      );
    }
    if (isText) {
      return <pre>{textContent}</pre>;
    }
    return (
      <div className="file-viewer-fallback">
        <p>Preview not available for this file type.</p>
        <div className="file-viewer-fallback-actions">
          <button className="btn btn-sm btn-primary" onClick={openInNewTab}>Open in New Tab</button>
          <a href={url} download={fileName} className="btn btn-sm">Download</a>
        </div>
      </div>
    );
  };

  return (
    <div className="file-viewer-overlay" onClick={onClose}>
      <div className="file-viewer-content" onClick={e => e.stopPropagation()}>
        <button className="file-viewer-close" onClick={onClose}>&times;</button>
        <div className="file-viewer-filename" title={fileName}>{fileName}</div>
        <div className="file-viewer-body">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

interface FileCardProps {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileHash?: string;
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
  fileHash,
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
  const [showViewer, setShowViewer] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string>('');
  const publicClient = usePublicClient();
  const { signMessageAsync } = useSignMessage();

  const handleView = async () => {
    if (viewerUrl) {
      setShowViewer(true);
      return;
    }
    if (previewUrl) {
      setViewerUrl(previewUrl);
      setShowViewer(true);
      return;
    }
    if (!publicClient || chunkCount === 0) return;

    // Private file: show password prompt
    if (!isPublic && isOwner && !viewerUrl) {
      setShowDecrypt(true);
      return;
    }

    if (!isPublic) return;
    setLoading(true);
    try {
      const chunks = await loadChunks();
      const url = chunksToBlob(chunks, fileType);
      setViewerUrl(url);
      setShowViewer(true);
    } catch (err) {
      console.error('View failed:', err);
      toast.error('Failed to load file');
    }
    setLoading(false);
  };

  const loadChunks = async (): Promise<string[]> => {
    if (!publicClient) return [];
    const chunks: string[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const data = await publicClient.readContract({
        address: CONTRACT_ADDRESS,
        abi: baseVaultAbi,
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

      const blob = new Blob([new Uint8Array(decrypted)], { type: fileType });
      const url = URL.createObjectURL(blob);
      setViewerUrl(url);
      setShowDecrypt(false);
      setDecryptPassword('');

      if (isImage) {
        setPreviewUrl(url);
      }
      toast.success('Decrypted!');
      setShowViewer(true);
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

        {fileHash && (
          <div className="file-card-hash">
            <code title={fileHash}>{fileHash.slice(0, 10)}...{fileHash.slice(-8)}</code>
            <button
              className="file-card-copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(fileHash).then(() => toast.success('Hash copied!')).catch(() => toast.error('Copy failed'));
              }}
              title="Copy hash"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
        )}

        {!isPublic && isOwner && showDecrypt && (
          <div className="decrypt-section">
            <label>Enter your password:</label>
            <div className="decrypt-input-row">
              <input
                type="text"
                placeholder="Password..."
                value={decryptPassword}
                onChange={(e) => setDecryptPassword(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button className="btn btn-sm btn-primary" onClick={handleDecrypt} disabled={loading || !decryptPassword}>
                {loading ? '...' : 'Decrypt'}
              </button>
            </div>
          </div>
        )}

        <div className="file-card-actions">
          {(isPublic || isOwner) && (
            <button className="btn btn-sm btn-primary" onClick={handleView} disabled={loading}>
              {loading ? '...' : 'View'}
            </button>
          )}
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

      {showViewer && viewerUrl && (
        <FileViewer url={viewerUrl} fileName={fileName} fileType={fileType} onClose={() => setShowViewer(false)} />
      )}
    </div>
  );
}
