import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const RPC_URL = 'https://mainnet.base.org';

// Create an EIP-1193 provider backed by a local private key
export function createLocalProvider(privateKey: `0x${string}`): any {
  const account = privateKeyToAccount(privateKey);

  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(RPC_URL),
  });

  const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_URL),
  });

  const listeners: Record<string, Set<(...args: any[]) => void>> = {};

  const provider = {
    async request({ method, params }: { method: string; params?: any }) {
      const p = Array.isArray(params) ? params : [];

      switch (method) {
        case 'eth_requestAccounts':
        case 'eth_accounts':
          return [account.address];

        case 'eth_chainId':
          return `0x${base.id.toString(16)}`;

        case 'net_version':
          return base.id.toString();

        case 'personal_sign': {
          const message = p[0];
          return await account.signMessage({
            message: typeof message === 'string' && message.startsWith('0x')
              ? { raw: message as `0x${string}` }
              : message
          });
        }

        case 'eth_sign': {
          const message = p[1];
          return await account.signMessage({ message: { raw: message as `0x${string}` } });
        }

        case 'eth_signTypedData':
        case 'eth_signTypedData_v4': {
          const typedDataStr = p[1];
          const typedData = typeof typedDataStr === 'string' ? JSON.parse(typedDataStr) : typedDataStr;
          return await account.signTypedData({
            domain: typedData.domain,
            types: typedData.types,
            primaryType: typedData.primaryType,
            message: typedData.message,
          });
        }

        case 'eth_sendTransaction': {
          const tx = p[0];
          const hash = await walletClient.sendTransaction({
            to: tx.to,
            data: tx.data,
            value: tx.value ? BigInt(tx.value) : undefined,
            gas: tx.gas ? BigInt(tx.gas) : undefined,
            nonce: tx.nonce ? Number(tx.nonce) : undefined,
          } as any);
          return hash;
        }

        case 'wallet_sendCalls': {
          // EIP-5792 batch calls - send one by one for local wallet
          const { calls } = p[0] || {};
          if (calls && Array.isArray(calls)) {
            const hashes: string[] = [];
            for (const call of calls) {
              const hash = await walletClient.sendTransaction({
                to: call.to,
                data: call.data,
                value: call.value ? BigInt(call.value) : undefined,
              } as any);
              hashes.push(hash);
            }
            return hashes[hashes.length - 1];
          }
          throw new Error('Invalid wallet_sendCalls params');
        }

        // Delegate all read calls to public RPC
        default: {
          const result = await publicClient.request({ method: method as any, params: p as any });
          return result;
        }
      }
    },

    on(event: string, listener: (...args: any[]) => void) {
      if (!listeners[event]) listeners[event] = new Set();
      listeners[event].add(listener);
    },

    removeListener(event: string, listener: (...args: any[]) => void) {
      listeners[event]?.delete(listener);
    },
  };

  return provider;
}
