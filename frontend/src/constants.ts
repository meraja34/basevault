// Deployed contract address (Base Mainnet) - V2 pure on-chain
export const CONTRACT_ADDRESS = '0xC18B36CFfBf0274D9EAdafD2f78BFeC4b27c6222' as `0x${string}`;

// Chunk size for on-chain upload (24KB per tx - safe limit)
export const CHUNK_SIZE = 24 * 1024;

// Max file size: 500KB (on-chain storage is expensive for larger files)
export const MAX_FILE_SIZE = 500 * 1024;
