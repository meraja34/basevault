import { useState } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS } from '../constants';
import abi from '../abi/BaseVault.json';
import FileCard from '../components/FileCard';

const PAGE_SIZE = 12;

export default function Gallery() {
  const [page, setPage] = useState(0);

  const { data: fileCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'fileCount',
  });

  const count = Number(fileCount || 0);

  const { data: files, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi,
    functionName: 'getFiles',
    args: [BigInt(page * PAGE_SIZE), BigInt(PAGE_SIZE)],
    query: { enabled: count > 0 },
  });

  const totalPages = Math.ceil(count / PAGE_SIZE);
  const allFiles = (files as any[]) || [];
  // Show all files but private ones will show as encrypted
  const fileList = allFiles;

  return (
    <div className="page">
      <h1 className="page-title">Public Gallery</h1>
      <p className="page-desc">
        Browse files stored on BaseVault. {count} files on-chain.
      </p>

      {isLoading ? (
        <div className="loading">
          <div className="spinner" />
          <p>Loading files from Base chain...</p>
        </div>
      ) : fileList.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <p>No files uploaded yet. Be the first!</p>
        </div>
      ) : (
        <>
          <div className="file-grid">
            {fileList.map((file: any) => (
              <FileCard
                key={Number(file.id)}
                id={Number(file.id)}
                fileName={file.fileName}
                fileType={file.fileType}
                fileSize={Number(file.fileSize)}
                uploader={file.uploader}
                uploadedAt={Number(file.uploadedAt)}
                certified={file.certified}
                chunkCount={Number(file.chunkCount)}
                isPublic={file.isPublic}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </button>
              <span className="page-info">
                Page {page + 1} of {totalPages}
              </span>
              <button
                className="btn btn-sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
