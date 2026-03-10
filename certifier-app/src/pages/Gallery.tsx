import { useState, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS } from '../constants.ts';
import { baseVaultAbi } from '../abi/index.ts';
import FileCard from '../components/FileCard.tsx';
import SearchFilter from '../components/SearchFilter.tsx';

const PAGE_SIZE = 12;

const fileTypeFilters = [
  { label: 'All', value: 'all' },
  { label: 'Documents', value: 'doc' },
  { label: 'Images', value: 'image' },
  { label: 'Videos', value: 'video' },
  { label: 'Audio', value: 'audio' },
];

const sortOptions = [
  { label: 'Newest First', value: 'newest' },
  { label: 'Oldest First', value: 'oldest' },
];

function matchesTypeFilter(fileType: string, filter: string): boolean {
  if (filter === 'all') return true;
  if (filter === 'doc') return fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text') || fileType.includes('json') || fileType.includes('xml');
  if (filter === 'image') return fileType.startsWith('image/');
  if (filter === 'video') return fileType.startsWith('video/');
  if (filter === 'audio') return fileType.startsWith('audio/');
  return true;
}

export default function Gallery() {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data: fileCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'fileCount',
  });

  const count = Number(fileCount || 0);

  const { data: files, isLoading } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'getFiles',
    args: [BigInt(page * PAGE_SIZE), BigInt(PAGE_SIZE)],
    query: { enabled: count > 0 },
  });

  const totalPages = Math.ceil(count / PAGE_SIZE);
  const allFiles = (files as any[]) || [];

  const filteredFiles = useMemo(() => {
    let result = allFiles.filter((f: any) => {
      if (search && !f.fileName.toLowerCase().includes(search.toLowerCase())) return false;
      if (!matchesTypeFilter(f.fileType, typeFilter)) return false;
      return true;
    });

    if (sort === 'oldest') {
      result = [...result].reverse();
    }

    return result;
  }, [allFiles, search, typeFilter, sort]);

  return (
    <div className="page">
      <h1 className="page-title">Public Gallery</h1>
      <p className="page-desc">Browse files stored on BaseVault. {count} files on-chain.</p>

      <SearchFilter
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Search by filename..."
        filters={fileTypeFilters}
        activeFilter={typeFilter}
        onFilterChange={setTypeFilter}
        sortOptions={sortOptions}
        activeSort={sort}
        onSortChange={setSort}
        resultCount={filteredFiles.length}
      />

      {/* View Mode Toggle */}
      <div className="view-toggle">
        <button className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
          </svg>
        </button>
        <button className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="loading">
          <div className="spinner" />
          <p>Loading files from Base chain...</p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="empty-state">
          <p>{search || typeFilter !== 'all' ? 'No files match your filters.' : 'No files uploaded yet. Be the first!'}</p>
        </div>
      ) : (
        <>
          <div className={viewMode === 'grid' ? 'file-grid' : 'file-list'}>
            {filteredFiles.map((file: any) => (
              <FileCard
                key={Number(file.id)}
                id={Number(file.id)}
                fileName={file.fileName}
                fileType={file.fileType}
                fileSize={Number(file.fileSize)}
                fileHash={file.fileHash}
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
              <button className="btn btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="page-info">Page {page + 1} of {totalPages}</span>
              <button className="btn btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
