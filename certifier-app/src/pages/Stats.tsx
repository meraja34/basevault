import { useEffect, useState } from 'react';
import { useReadContract, usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { CONTRACT_ADDRESS, CERTIFIER_ADDRESS, BASEVAULT_ADDRESS, CERTIFIER_LIVE } from '../constants.ts';
import { baseVaultAbi, certifierAbi } from '../abi/index.ts';

interface RecentEvent {
  type: string;
  tx: string;
  block: string;
  detail: string;
}

export default function Stats() {
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  const { data: fileCount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'fileCount',
  });

  const { data: instCount } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'institutionCount',
    query: { enabled: CERTIFIER_LIVE },
  });

  const { data: certCount } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'certCount',
    query: { enabled: CERTIFIER_LIVE },
  });

  const { data: feePerChunk } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: baseVaultAbi,
    functionName: 'feePerChunk',
  });

  const { data: certFee } = useReadContract({
    address: CERTIFIER_ADDRESS,
    abi: certifierAbi,
    functionName: 'perCertFee',
    query: { enabled: CERTIFIER_LIVE },
  });

  // Fetch recent events
  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    const fetchEvents = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > 10000n ? currentBlock - 10000n : 0n;

        const promises: Promise<any[]>[] = [
          publicClient.getLogs({
            address: CONTRACT_ADDRESS,
            event: parseAbiItem('event FileUploaded(uint256 indexed fileId, address indexed uploader, string fileName)'),
            fromBlock,
            toBlock: 'latest',
          }).catch(() => []),
        ];

        if (CERTIFIER_LIVE) {
          promises.push(
            publicClient.getLogs({
              address: CERTIFIER_ADDRESS,
              event: parseAbiItem('event CertIssued(uint256 indexed certId, uint256 indexed institutionId, address indexed recipient)'),
              fromBlock,
              toBlock: 'latest',
            }).catch(() => [])
          );
        }

        const results = await Promise.all(promises);
        if (cancelled) return;

        const uploadLogs = results[0] || [];
        const certLogs = results[1] || [];
        const items: RecentEvent[] = [];

        for (const log of uploadLogs.slice(-15)) {
          const args = (log as any).args;
          items.push({
            type: 'File Upload',
            tx: log.transactionHash,
            block: log.blockNumber.toString(),
            detail: args?.fileName ? `${args.fileName.slice(0, 40)}` : `File #${Number(args?.fileId || 0)}`,
          });
        }

        for (const log of certLogs.slice(-15)) {
          const args = (log as any).args;
          items.push({
            type: 'Certification',
            tx: log.transactionHash,
            block: log.blockNumber.toString(),
            detail: `Cert #${Number(args?.certId || 0)}`,
          });
        }

        items.sort((a, b) => Number(BigInt(b.block) - BigInt(a.block)));
        setEvents(items.slice(0, 20));
      } catch (err) {
        console.error('Stats events error:', err);
      }
      setEventsLoading(false);
    };

    fetchEvents();
    return () => { cancelled = true; };
  }, [publicClient]);

  return (
    <div className="page">
      <h1 className="page-title">Network Statistics</h1>
      <p className="page-desc">Live on-chain data from BaseVault contracts on Base.</p>

      <div className={`stats-grid ${CERTIFIER_LIVE ? 'stats-grid-4' : 'stats-grid-3'}`}>
        <div className="stat-card">
          <span className="stat-value">{fileCount ? Number(fileCount).toLocaleString() : '...'}</span>
          <span className="stat-label">Files Stored</span>
        </div>
        {CERTIFIER_LIVE && (
          <div className="stat-card">
            <span className="stat-value">{certCount ? Number(certCount).toLocaleString() : '...'}</span>
            <span className="stat-label">Certifications</span>
          </div>
        )}
        {CERTIFIER_LIVE && (
          <div className="stat-card">
            <span className="stat-value">{instCount ? Number(instCount).toLocaleString() : '...'}</span>
            <span className="stat-label">Institutions</span>
          </div>
        )}
        <div className="stat-card">
          <span className="stat-value">50 MB</span>
          <span className="stat-label">Max File Size</span>
        </div>
      </div>

      {/* Contract Info */}
      <div className="stats-contracts">
        <h2 className="section-title">Smart Contracts</h2>
        <div className="contract-cards">
          <div className="contract-card">
            <h3>BaseVault (File Storage)</h3>
            <code>{BASEVAULT_ADDRESS}</code>
            <div className="contract-meta">
              <span>Fee per chunk: {feePerChunk ? `${Number(feePerChunk) / 1e18} ETH` : '...'}</span>
              <a href={`https://basescan.org/address/${BASEVAULT_ADDRESS}`} target="_blank" rel="noopener noreferrer">
                View on BaseScan
              </a>
            </div>
          </div>
          <div className="contract-card">
            <h3>BaseVault Certifier</h3>
            <code>{CERTIFIER_LIVE ? CERTIFIER_ADDRESS : 'Pending Deployment'}</code>
            <div className="contract-meta">
              <span>Fee per cert: {certFee ? `${Number(certFee) / 1e18} ETH` : 'Free (gas only)'}</span>
              {CERTIFIER_LIVE && (
                <a href={`https://basescan.org/address/${CERTIFIER_ADDRESS}`} target="_blank" rel="noopener noreferrer">
                  View on BaseScan
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* On-chain explainer */}
      <div className="stats-explainer">
        <h2 className="section-title">100% On-Chain</h2>
        <p>
          All data shown on this page comes directly from smart contracts on Base (Ethereum L2).
          No database, no API, no server. Every file and certification is stored permanently on the blockchain.
          BaseVault does not use IPFS, Arweave, or any external storage. Your files live fully on-chain.
        </p>
      </div>

      {/* Recent Activity */}
      <div className="section">
        <h2 className="section-title">Recent Activity</h2>
        {eventsLoading ? (
          <div className="loading">
            <div className="spinner" />
            <p>Fetching on-chain events...</p>
          </div>
        ) : events.length === 0 ? (
          <p className="text-dim">No recent events found.</p>
        ) : (
          <div className="stats-event-list">
            {events.map((e, i) => (
              <a
                key={i}
                href={`https://basescan.org/tx/${e.tx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="stats-event"
              >
                <span className={`stats-event-type ${e.type === 'File Upload' ? 'stats-event-upload' : 'stats-event-cert'}`}>
                  {e.type}
                </span>
                <span className="stats-event-detail">{e.detail}</span>
                <span className="stats-event-block">Block #{e.block}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
