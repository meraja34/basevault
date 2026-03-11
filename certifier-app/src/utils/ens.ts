import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { normalize } from 'viem/ens';

const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com'),
});

export function isENSName(input: string): boolean {
  return input.includes('.') && !input.startsWith('0x');
}

export async function resolveENS(name: string): Promise<`0x${string}` | null> {
  try {
    const normalized = normalize(name);
    const address = await mainnetClient.getEnsAddress({ name: normalized });
    return address || null;
  } catch {
    return null;
  }
}
