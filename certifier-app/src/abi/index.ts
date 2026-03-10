import _certifierAbi from './BaseVaultCertifier.json' with { type: 'json' };
import _baseVaultAbi from './BaseVault.json' with { type: 'json' };
import type { Abi } from 'viem';

export const certifierAbi = _certifierAbi as unknown as Abi;
export const baseVaultAbi = _baseVaultAbi as unknown as Abi;
