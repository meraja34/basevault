import { createConnector } from 'wagmi';
import { base } from 'wagmi/chains';
import { unlockWallet, getStoredAddress } from './localWallet.ts';
import { createLocalProvider } from './localProvider.ts';

export const LOCAL_CONNECTOR_ID = 'localWallet';

// Stores the unlocked private key in memory (cleared on page refresh)
let unlockedKey: `0x${string}` | null = null;
let cachedProvider: any = null;

export function setUnlockedKey(key: `0x${string}`) {
  unlockedKey = key;
  cachedProvider = createLocalProvider(key);
}

export function clearUnlockedKey() {
  unlockedKey = null;
  cachedProvider = null;
}

export function isUnlocked(): boolean {
  return !!unlockedKey;
}

// Unlock with password and cache the key
export function unlockAndCache(password: string): `0x${string}` {
  const key = unlockWallet(password);
  setUnlockedKey(key);
  return key;
}

export function localWalletConnector() {
  return createConnector((config) => ({
    id: LOCAL_CONNECTOR_ID,
    name: 'Local Wallet',
    type: 'localWallet',

    async connect(): Promise<any> {
      const addr = getStoredAddress();
      if (!addr || !unlockedKey) {
        throw new Error('Wallet not unlocked');
      }
      if (!cachedProvider) {
        cachedProvider = createLocalProvider(unlockedKey);
      }
      return {
        accounts: [addr as `0x${string}`],
        chainId: base.id,
      };
    },

    async disconnect() {
      clearUnlockedKey();
    },

    async getAccounts(): Promise<readonly `0x${string}`[]> {
      const addr = getStoredAddress();
      if (!addr || !unlockedKey) return [];
      return [addr as `0x${string}`];
    },

    async getChainId() {
      return base.id;
    },

    async getProvider(): Promise<any> {
      if (!cachedProvider && unlockedKey) {
        cachedProvider = createLocalProvider(unlockedKey);
      }
      return cachedProvider;
    },

    async isAuthorized() {
      return !!unlockedKey && !!getStoredAddress();
    },

    onAccountsChanged(accounts: string[]) {
      config.emitter.emit('change', { accounts: accounts as `0x${string}`[] });
    },

    onChainChanged(chainId: string) {
      config.emitter.emit('change', { chainId: Number(chainId) });
    },

    onDisconnect() {
      clearUnlockedKey();
      config.emitter.emit('disconnect');
    },
  }));
}
