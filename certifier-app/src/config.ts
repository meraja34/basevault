import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, createConnector, http } from 'wagmi';
import { base } from 'wagmi/chains';

coinbaseWallet.preference = 'smartWalletOnly';

// Farcaster MiniApp connector - uses SDK's ethereum provider
function farcasterFrameConnector() {
  return createConnector((config) => ({
    id: 'farcasterFrame',
    name: 'Farcaster',
    type: 'farcasterFrame',
    async connect(): Promise<any> {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const provider = await sdk.wallet.getEthereumProvider();
      if (!provider) throw new Error('No provider');
      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
      const chainId = await provider.request({ method: 'eth_chainId' }) as string;
      return { accounts: accounts as `0x${string}`[], chainId: Number(chainId) };
    },
    async disconnect() {},
    async getAccounts(): Promise<readonly `0x${string}`[]> {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const provider = await sdk.wallet.getEthereumProvider();
      if (!provider) return [];
      const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
      return accounts as `0x${string}`[];
    },
    async getChainId() {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      const provider = await sdk.wallet.getEthereumProvider();
      if (!provider) return base.id;
      const chainId = await provider.request({ method: 'eth_chainId' }) as string;
      return Number(chainId);
    },
    async getProvider(): Promise<any> {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      return await sdk.wallet.getEthereumProvider();
    },
    async isAuthorized() {
      try {
        const accounts = await this.getAccounts();
        return accounts.length > 0;
      } catch {
        return false;
      }
    },
    onAccountsChanged(accounts: string[]) {
      config.emitter.emit('change', { accounts: accounts as `0x${string}`[] });
    },
    onChainChanged(chainId: string) {
      config.emitter.emit('change', { chainId: Number(chainId) });
    },
    onDisconnect() {
      config.emitter.emit('disconnect');
    },
  }));
}

const walletConnectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [coinbaseWallet, metaMaskWallet],
    },
    {
      groupName: 'Other Wallets',
      wallets: [rainbowWallet, walletConnectWallet],
    },
  ],
  {
    projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
    appName: 'BaseVault',
  }
);

export const farcasterConnectorId = 'farcasterFrame';

export const config = createConfig({
  connectors: [farcasterFrameConnector(), ...walletConnectors],
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});
