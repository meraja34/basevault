export default function ComparisonTable() {
  const rows = [
    { feature: 'Storage Location', basevault: 'On-chain (Base L2)', ipfs: 'P2P Network + Pinning', arweave: 'Arweave Blockchain', cloud: 'Company Servers' },
    { feature: 'Encryption', basevault: 'AES-256 (wallet + password)', ipfs: 'None by default', arweave: 'None by default', cloud: 'Provider controlled' },
    { feature: 'Permanence', basevault: 'Permanent (on-chain)', ipfs: 'Requires pinning', arweave: 'Permanent (200 years)', cloud: 'Until you stop paying' },
    { feature: 'Censorship Resistant', basevault: 'Yes (Ethereum L2)', ipfs: 'Partial (can unpin)', arweave: 'Yes', cloud: 'No' },
    { feature: 'Verification', basevault: 'On-chain SHA-256', ipfs: 'CID hash', arweave: 'Transaction ID', cloud: 'Trust provider' },
    { feature: 'Certification', basevault: '13 types + institutions', ipfs: 'No', arweave: 'No', cloud: 'No' },
    { feature: 'Cost Model', basevault: 'One-time (per chunk)', ipfs: 'Monthly pinning fees', arweave: 'One-time', cloud: 'Monthly subscription' },
    { feature: 'Server Dependency', basevault: 'None', ipfs: 'Pinning service', arweave: 'Gateway nodes', cloud: 'Full dependency' },
  ];

  return (
    <div className="comparison-section">
      <h2 className="section-title" style={{ textAlign: 'center' }}>How BaseVault Compares</h2>
      <div className="comparison-table-wrapper">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th className="comparison-highlight">BaseVault</th>
              <th>IPFS (Pinata)</th>
              <th>Arweave</th>
              <th>Cloud Storage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature}>
                <td className="comparison-feature">{row.feature}</td>
                <td className="comparison-highlight">{row.basevault}</td>
                <td>{row.ipfs}</td>
                <td>{row.arweave}</td>
                <td>{row.cloud}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
