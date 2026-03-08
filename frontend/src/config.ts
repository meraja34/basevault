import { connectorsForWallets } from '@rainbow-me/rainbowkit';
import {
  coinbaseWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';

// Enable Coinbase Smart Wallet (Base Smart Wallet)
coinbaseWallet.preference = 'all'; // 'all' = smart wallet + EOA, 'smartWalletOnly' = only smart wallet

const connectors = connectorsForWallets(
  [
    {
      groupName: 'Recommended',
      wallets: [
        coinbaseWallet,   // Coinbase Smart Wallet + EOA
        metaMaskWallet,
      ],
    },
    {
      groupName: 'Other Wallets',
      wallets: [
        rainbowWallet,
        walletConnectWallet,
      ],
    },
  ],
  {
    projectId: 'YOUR_WALLETCONNECT_PROJECT_ID', // get from cloud.walletconnect.com
    appName: 'BaseVault',
  }
);

export const config = createConfig({
  connectors,
  chains: [base, baseSepolia],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});
