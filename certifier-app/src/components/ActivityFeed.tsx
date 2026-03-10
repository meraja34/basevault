import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem } from 'viem';
import { CONTRACT_ADDRESS, CERTIFIER_ADDRESS, CERTIFIER_LIVE } from '../constants.ts';

interface Activity {
  type: 'upload' | 'certify';
  tx: string;
  blockNumber: bigint;
  fileName?: string;
  fileId?: number;
  timestamp?: number;
}

export default function ActivityFeed() {
  const publicClient = usePublicClient();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;

    const fetchLogs = async () => {
      try {
        const currentBlock = await publicClient.getBlockNumber();
        const fromBlock = currentBlock > 5000n ? currentBlock - 5000n : 0n;

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
        const uploadLogs = results[0] || [];
        const certLogs = results[1] || [];

        if (cancelled) return;

        const items: Activity[] = [];

        for (const log of uploadLogs.slice(-10)) {
          items.push({
            type: 'upload',
            tx: log.transactionHash,
            blockNumber: log.blockNumber,
            fileName: (log as any).args?.fileName || '',
            fileId: Number((log as any).args?.fileId || 0),
          });
        }

        for (const log of certLogs.slice(-10)) {
          items.push({
            type: 'certify',
            tx: log.transactionHash,
            blockNumber: log.blockNumber,
          });
        }

        items.sort((a, b) => Number(b.blockNumber - a.blockNumber));
        setActivities(items.slice(0, 5));
      } catch (err) {
        console.error('Activity feed error:', err);
      }
      setLoading(false);
    };

    fetchLogs();
    return () => { cancelled = true; };
  }, [publicClient]);

  if (loading) {
    return (
      <div className="activity-feed">
        <h3 className="activity-feed-title">Recent On-Chain Activity</h3>
        <div className="activity-loading">
          <div className="spinner" style={{ width: 20, height: 20 }} />
        </div>
      </div>
    );
  }

  if (activities.length === 0) return null;

  return (
    <div className="activity-feed">
      <h3 className="activity-feed-title">
        <span className="activity-dot" />
        Recent On-Chain Activity
      </h3>
      <div className="activity-list">
        {activities.map((a, i) => (
          <a
            key={i}
            href={`https://basescan.org/tx/${a.tx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="activity-item"
          >
            <span className={`activity-icon ${a.type === 'upload' ? 'activity-icon-upload' : 'activity-icon-cert'}`}>
              {a.type === 'upload' ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              )}
            </span>
            <span className="activity-text">
              {a.type === 'upload'
                ? `File uploaded${a.fileName ? `: ${a.fileName.slice(0, 30)}` : ''}`
                : 'Certificate issued'}
            </span>
            <span className="activity-block">Block #{a.blockNumber.toString()}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
