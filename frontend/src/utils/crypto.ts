import { CTR } from 'aes-js';
import { sha256 } from 'js-sha256';

// Derive a deterministic 32-byte encryption key from wallet signature + password
export function deriveKeyFromSignature(signature: string, password: string): string {
  // Key = SHA256(signature + password) - both wallet AND password needed
  return sha256(signature + password);
}

// Hex string to byte array
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

// Encrypt file data with AES-256-CTR
export function encryptFile(data: ArrayBuffer, keyHex: string): ArrayBuffer {
  const keyBytes = hexToBytes(keyHex);

  // Generate random 16-byte IV
  const iv = new Uint8Array(16);
  crypto.getRandomValues(iv);

  const ctr = new CTR(keyBytes, iv);
  const encrypted = ctr.encrypt(new Uint8Array(data));

  // Prepend IV (16 bytes) to encrypted data
  const result = new Uint8Array(16 + encrypted.length);
  result.set(iv, 0);
  result.set(encrypted, 16);
  return result.buffer;
}

// Decrypt file data with AES-256-CTR
export function decryptFile(data: ArrayBuffer, keyHex: string): ArrayBuffer {
  const keyBytes = hexToBytes(keyHex);
  const dataBytes = new Uint8Array(data);

  // Extract IV (first 16 bytes)
  const iv = dataBytes.slice(0, 16);
  const encrypted = dataBytes.slice(16);

  const ctr = new CTR(keyBytes, iv);
  const decrypted = ctr.decrypt(encrypted);

  return decrypted.buffer as ArrayBuffer;
}

// Parse Web3 errors into user-friendly messages
export function friendlyError(err: any): string {
  const msg = (err?.shortMessage || err?.message || '').toLowerCase();

  if (msg.includes('user rejected') || msg.includes('user denied') || msg.includes('rejected the request')) {
    return 'Transaction cancelled.';
  }
  if (msg.includes('insufficient funds') || msg.includes('insufficient balance')) {
    return 'Not enough ETH in your wallet.';
  }
  if (msg.includes('already certified')) {
    return 'This file is already certified.';
  }
  if (msg.includes('not uploader')) {
    return 'Only the file uploader can do this.';
  }
  if (msg.includes('insufficient fee')) {
    return 'Fee amount too low.';
  }
  if (msg.includes('invalid file')) {
    return 'File not found on-chain.';
  }
  if (msg.includes('network') || msg.includes('disconnected') || msg.includes('timeout')) {
    return 'Network error. Check your connection and try again.';
  }
  if (msg.includes('nonce')) {
    return 'Transaction conflict. Wait a moment and try again.';
  }

  return 'Something went wrong. Try again.';
}

// Fallback copy for HTTP (clipboard API needs HTTPS)
export function copyText(text: string): boolean {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text);
    return true;
  }
  // Fallback for HTTP
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    return true;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}
