import { sha256 } from 'js-sha256';
import { CHUNK_SIZE } from '../constants.ts';

export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = sha256(buffer);
  return '0x' + hash;
}

export function fileToChunks(buffer: ArrayBuffer): `0x${string}`[] {
  const bytes = new Uint8Array(buffer);
  const chunks: `0x${string}`[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.slice(i, i + CHUNK_SIZE);
    const hex = '0x' + Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join('');
    chunks.push(hex as `0x${string}`);
  }
  return chunks;
}

export function chunksToBlob(chunks: string[], fileType: string): string {
  const allBytes: number[] = [];
  for (const chunk of chunks) {
    const hex = chunk.startsWith('0x') ? chunk.slice(2) : chunk;
    for (let i = 0; i < hex.length; i += 2) {
      allBytes.push(parseInt(hex.substring(i, i + 2), 16));
    }
  }
  const uint8 = new Uint8Array(allBytes);
  const blob = new Blob([uint8], { type: fileType });
  return URL.createObjectURL(blob);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
