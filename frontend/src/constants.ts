// Deployed contract address (Base Mainnet) - V6 feePerChunk
export const CONTRACT_ADDRESS = '0x4B46B971f1fBDF6f6D45b703b2f2D042D06CFed3' as `0x${string}`;

// Chunk size options for on-chain upload
export const CHUNK_SIZES = {
  fast: 24 * 1024,      // 24 KB - safest, cheapest
  balanced: 48 * 1024,  // 48 KB - 2x faster, reliable
  max: 64 * 1024,       // 64 KB - fastest, some tx may fail
} as const;

export type ChunkMode = keyof typeof CHUNK_SIZES;

// Default chunk size
export const CHUNK_SIZE = CHUNK_SIZES.fast;

// Max file size: 50MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024;
