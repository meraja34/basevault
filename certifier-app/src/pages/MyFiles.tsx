import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { WalletCompact } from '../components/WalletButton.tsx';
import toast from 'react-hot-toast';
import { CONTRACT_ADDRESS } from '../constants.ts';
import { baseVaultAbi } from '../abi/index.ts';
import FileCard from '../components/FileCard.tsx';
import SearchFilter from '../components/SearchFilter.tsx';
import { friendlyError } from '../utils/crypto.ts';

const filters = [
  { label: 'All', value: 'all' },
  { label: 'Public', value: 'public' },
  { label: 'Private', value: 'private' },
  { label: 'Certified', value: 'certified' },
];

export default function MyFiles() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [certifyingId, setCertifyingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const { data: fileIds, refetch: refetchFiles } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'getUserFileIds',
    args: [address!],
    query: { enabled: !!address },
  });

  const { data: certFee } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'certificationFee',
  });

  const { writeContractAsync } = useWriteContract();

  const ids = (fileIds as bigint[]) || [];

  const handleCertify = async (fileId: number) => {
    try {
      setCertifyingId(fileId);
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: baseVaultAbi,
        functionName: 'certifyDocument',
        args: [BigInt(fileId)],
        value: certFee as bigint,
      });
      toast.success('Certification transaction submitted!');
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        toast.success('Document certified on-chain!');
        refetchFiles();
      }
    } catch (err: any) {
      toast.error(friendlyError(err));
    }
    setCertifyingId(null);
  };

  const handleToggleVisibility = async (fileId: number, makePublic: boolean) => {
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: baseVaultAbi,
        functionName: 'setFileVisibility',
        args: [BigInt(fileId), makePublic],
      });
      toast.success(`Changing visibility...`);
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        toast.success(`File is now ${makePublic ? 'public' : 'private'}!`);
        refetchFiles();
      }
    } catch (err: any) {
      toast.error(friendlyError(err));
    }
  };

  if (!isConnected) {
    return (
      <div className="page">
        <h1 className="page-title">My Files</h1>
        <div className="connect-prompt">
          <p>Connect your wallet to see your uploaded files</p>
          <WalletCompact />
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">My Files</h1>
      <p className="page-desc">
        Files uploaded by {address?.slice(0, 6)}...{address?.slice(-4)}. Total: {ids.length} files.
      </p>

      {ids.length > 0 && (
        <SearchFilter
          searchValue={search}
          onSearchChange={setSearch}
          placeholder="Search by filename..."
          filters={filters}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      )}

      {ids.length === 0 ? (
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <p>No files uploaded yet.</p>
        </div>
      ) : (
        <div className="file-grid">
          {ids.map((id) => (
            <FileCardFromId
              key={Number(id)}
              fileId={Number(id)}
              ownerAddress={address!}
              onCertify={handleCertify}
              onToggleVisibility={handleToggleVisibility}
              isCertifying={certifyingId === Number(id)}
              search={search}
              activeFilter={activeFilter}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileCardFromId({
  fileId,
  ownerAddress,
  onCertify,
  onToggleVisibility,
  search,
  activeFilter,
}: {
  fileId: number;
  ownerAddress: string;
  onCertify: (id: number) => void;
  onToggleVisibility: (id: number, isPublic: boolean) => void;
  isCertifying?: boolean;
  search: string;
  activeFilter: string;
}) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'getFile',
    args: [BigInt(fileId)],
  });

  const file = data as any;
  if (!file) return <div className="file-card file-card-loading"><div className="spinner" /></div>;

  // Client-side filtering
  if (search && !file.fileName.toLowerCase().includes(search.toLowerCase())) return null;
  if (activeFilter === 'public' && !file.isPublic) return null;
  if (activeFilter === 'private' && file.isPublic) return null;
  if (activeFilter === 'certified' && !file.certified) return null;

  return (
    <FileCard
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
      isOwner={file.uploader.toLowerCase() === ownerAddress.toLowerCase()}
      onCertify={onCertify}
      showCertify={true}
      onToggleVisibility={onToggleVisibility}
    />
  );
}
