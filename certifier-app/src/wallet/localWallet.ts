import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { sha256 } from 'js-sha256';
import { ModeOfOperation, Counter } from 'aes-js';

const STORAGE_KEY = 'basevault-local-wallet';
const STORAGE_ADDR = 'basevault-local-address';

// --- Encryption helpers (same pattern as file encryption) ---

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function encryptKey(privateKey: string, password: string): string {
  const keyHex = sha256(password + 'basevault-wallet-salt');
  const keyBytes = hexToBytes(keyHex);
  const iv = new Uint8Array(16);
  crypto.getRandomValues(iv);
  const ctr = new ModeOfOperation.ctr(keyBytes, new Counter(iv));
  const pkBytes = hexToBytes(privateKey);
  const encrypted = ctr.encrypt(pkBytes);
  const result = new Uint8Array(16 + encrypted.length);
  result.set(iv, 0);
  result.set(encrypted, 16);
  return bytesToHex(result);
}

function decryptKey(encryptedHex: string, password: string): string {
  const keyHex = sha256(password + 'basevault-wallet-salt');
  const keyBytes = hexToBytes(keyHex);
  const data = hexToBytes(encryptedHex);
  const iv = data.slice(0, 16);
  const ciphertext = data.slice(16);
  const ctr = new ModeOfOperation.ctr(keyBytes, new Counter(iv));
  const decrypted = ctr.decrypt(ciphertext);
  return '0x' + bytesToHex(decrypted);
}

// --- Public API ---

export function hasStoredWallet(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

export function getStoredAddress(): string | null {
  return localStorage.getItem(STORAGE_ADDR);
}

export function createNewWallet(password: string): { address: string; privateKey: string } {
  const pk = generatePrivateKey();
  const account = privateKeyToAccount(pk);
  const encrypted = encryptKey(pk, password);
  localStorage.setItem(STORAGE_KEY, encrypted);
  localStorage.setItem(STORAGE_ADDR, account.address);
  return { address: account.address, privateKey: pk };
}

export function importWallet(privateKey: string, password: string): { address: string } {
  // Normalize key
  const pk = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
  if (pk.length !== 66) throw new Error('Invalid private key length');
  const account = privateKeyToAccount(pk as `0x${string}`);
  const encrypted = encryptKey(pk, password);
  localStorage.setItem(STORAGE_KEY, encrypted);
  localStorage.setItem(STORAGE_ADDR, account.address);
  return { address: account.address };
}

export function unlockWallet(password: string): `0x${string}` {
  const encrypted = localStorage.getItem(STORAGE_KEY);
  if (!encrypted) throw new Error('No wallet stored');
  try {
    const pk = decryptKey(encrypted, password);
    // Verify it's valid by creating account (throws if invalid)
    privateKeyToAccount(pk as `0x${string}`);
    return pk as `0x${string}`;
  } catch {
    throw new Error('Wrong password');
  }
}

export function removeWallet(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_ADDR);
}

export function getAccount(privateKey: `0x${string}`) {
  return privateKeyToAccount(privateKey);
}
