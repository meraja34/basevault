// BaseVault V6 (Base Mainnet)
export const BASEVAULT_ADDRESS = '0x4B46B971f1fBDF6f6D45b703b2f2D042D06CFed3' as `0x${string}`;

// Alias for file storage operations
export const CONTRACT_ADDRESS = BASEVAULT_ADDRESS;

// BaseVaultCertifier (Base Mainnet)
export const CERTIFIER_ADDRESS = '0x2FDbfc75B8844Af376Be20b41c6C1ed70aA1c2E3' as `0x${string}`;

// Chunk size for on-chain upload (24KB per tx - safe limit)
export const CHUNK_SIZE = 24 * 1024;

// Max file size: 50MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const CERT_TYPE_LABELS: Record<number, string> = {
  0: 'Generic',
  1: 'Degree',
  2: 'Transcript',
  3: 'Course Completion',
  4: 'Badge',
  5: 'License',
  6: 'Contract',
  7: 'NDA',
  8: 'Audit',
  9: 'IP Proof',
  10: 'Medical Record',
  11: 'Lab Report',
  12: 'Research Paper',
};

export const CERT_TYPE_ICONS: Record<number, string> = {
  0: '📄',
  1: '🎓',
  2: '📋',
  3: '✅',
  4: '🏅',
  5: '📜',
  6: '📝',
  7: '🔒',
  8: '🔍',
  9: '💡',
  10: '🏥',
  11: '🧪',
  12: '📰',
};

export const INSTITUTION_STATUS: Record<number, string> = {
  0: 'Pending',
  1: 'Active',
  2: 'Suspended',
};

// Returns true when certifier contract is actually deployed (not zero address)
export const CERTIFIER_LIVE = CERTIFIER_ADDRESS !== '0x0000000000000000000000000000000000000000';
