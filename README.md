# BaseVault

Fully on-chain file storage and document certification on Base L2.

**Live:** [basevault.store](https://basevault.store)

## What is BaseVault?

BaseVault lets you upload any file directly on Base chain. No IPFS, no servers, no third-party storage. Everything is stored 100% on-chain.

- **Public files** - visible to everyone, downloadable from chain
- **Private files** - encrypted with AES-256 using wallet signature + password (2FA)
- **Document certification** - on-chain timestamped proof of file existence
- **Document verification** - verify any file against on-chain records

## Features

- Single transaction upload (file create + data in one tx)
- AES-256-CTR encryption with wallet-derived key + password
- SHA-256 file hashing for verification
- Public/Private toggle per file
- On-chain document certification
- Any file type (images, PDFs, documents, up to 500KB)
- Coinbase Smart Wallet + MetaMask + WalletConnect support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Base L2 (Ethereum) |
| Smart Contract | Solidity 0.8.24 |
| Frontend | React + TypeScript + Vite |
| Web3 | wagmi + viem + RainbowKit |
| Encryption | AES-256-CTR (aes-js) |
| Hashing | SHA-256 (js-sha256) |
| Build Tools | Foundry (contracts), Vite (frontend) |

## Smart Contract

**Contract Address (Base Mainnet):** `0xC18B36CFfBf0274D9EAdafD2f78BFeC4b27c6222`

[View on BaseScan](https://basescan.org/address/0xC18B36CFfBf0274D9EAdafD2f78BFeC4b27c6222)

### Key Functions

| Function | Description | Cost |
|----------|-------------|------|
| `createFileWithData()` | Create file + upload all data in single tx | Gas only |
| `getChunk()` | Read file data from chain | Free (view) |
| `setFileVisibility()` | Toggle public/private | Gas only |
| `certifyDocument()` | Certify a document on-chain | 0.001 ETH + gas |
| `verifyDocument()` | Verify file hash against records | Free (view) |

## How Encryption Works

```
Upload (Private):
  1. User selects "Private" and enters a password
  2. Wallet signs a fixed message (off-chain, no transaction)
  3. Key = SHA-256(wallet signature + password)
  4. File encrypted with AES-256-CTR
  5. Encrypted data stored on-chain

Decrypt:
  1. Same wallet signs same message
  2. Same password entered
  3. Key = SHA-256(signature + password)
  4. File decrypted in browser
```

Two-factor protection:
- **Something you have** - your wallet (private key)
- **Something you know** - your password

Even if wallet is compromised, attacker needs the password to decrypt files.

## Project Structure

```
BaseVault/
  contracts/
    src/BaseVault.sol        # Solidity smart contract
    foundry.toml             # Foundry config
  frontend/
    src/
      abi/BaseVault.json     # Contract ABI
      components/
        Header.tsx           # Nav + wallet connect
        FileDropzone.tsx     # Drag-drop file upload
        FileCard.tsx         # File display with decrypt
      pages/
        Home.tsx             # Landing page
        Upload.tsx           # Upload with encrypt option
        Gallery.tsx          # Public file gallery
        Verify.tsx           # Document verification
        MyFiles.tsx          # User dashboard
      utils/
        crypto.ts            # AES-256 encrypt/decrypt
        ipfs.ts              # SHA-256 hash, chunking
      styles/globals.css     # Dark theme CSS
      config.ts              # Wallet config
      constants.ts           # Contract address
```

## Local Development

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Contracts
```bash
cd contracts
forge build
forge create src/BaseVault.sol:BaseVault \
  --constructor-args 1000000000000000 \
  --rpc-url https://mainnet.base.org \
  --private-key YOUR_KEY \
  --broadcast
```

## License

MIT
