# BaseVault

**Fully on-chain document storage, encryption, and institutional certification on Base L2.**

Store real file bytes directly in smart contracts on Base. Not hash pointers. Not IPFS. Not a server. Your actual data, on the blockchain, forever.

[Landing Page](https://basevault.store) | [App](https://app.basevault.store) | [Recovery Tool](https://app.basevault.store/recover.html) | [Farcaster MiniApp](https://farcaster.xyz/)

---

## Why BaseVault?

Every other "decentralized storage" solution still depends on something centralized. IPFS needs pinning services. Arweave has its own token economy. Cloud storage is just someone else's computer.

BaseVault writes your actual file bytes into a smart contract on Base L2. The data is part of Ethereum's security model. It cannot be taken down, censored, or lost. As long as Ethereum exists, your files exist.

| | BaseVault | IPFS / Pinata | Arweave | Cloud Storage |
|---|---|---|---|---|
| Data Location | Base L2 Smart Contract | Peer-to-peer network | Arweave blockchain | Company servers |
| File Permanence | Forever (on-chain) | Needs pinning (can disappear) | Permanent | Until you stop paying |
| Encryption | AES-256 (wallet + password) | None by default | None by default | Server-side (provider has keys) |
| Verification | SHA-256 + institutional certs | CID hash only | TX hash | None |
| Institutional Certs | 13 types, batch, delegation | No | No | No |
| Censorship Resistance | Uncensorable | Gateway can block | Uncensorable | Provider can delete |
| Server Dependency | **None** | Pinning service required | None | Full dependency |

---

## Core Features

### On-Chain File Storage
- Upload any file type up to 50MB (documents, images, video, audio, PDFs)
- Files are chunked (24KB per transaction) and stored entirely in the smart contract
- SHA-256 hash computed and stored on-chain for integrity verification
- Public or private visibility per file
- In-app file viewer for images, PDFs, video, audio, text, and JSON
- Batch chunk upload via EIP-5792 for smart wallets

### End-to-End Encryption
- AES-256-CTR client-side encryption for private files
- Two-factor key derivation: wallet signature + user-chosen password
- Password is never stored, transmitted, or recoverable by anyone
- Decrypt and view files directly in the browser
- Even if the wallet is compromised, the attacker still needs the password

### Institutional Certification
- Institutions register on-chain with name, metadata, and allowed cert types
- 13 certification types: Degree, Transcript, Course Completion, Badge, License, Contract, NDA, Audit, IP Proof, Medical Record, Lab Report, Research Paper, Generic
- Certify by File ID or by SHA-256 hash (file doesn't need to be on BaseVault)
- Batch certification (up to 100 documents per transaction)
- Delegate system for team members to issue certs on behalf of an institution
- Certificate revocation with on-chain reason
- Optional expiry dates
- Public certificate page with QR code, PDF download, PNG export, and social sharing

### Document Verification
- Drag-and-drop any file to verify (no wallet required)
- Auto-computes SHA-256 and checks all on-chain records
- Shows all certifications, issuing institutions, validity status
- Manual hash input mode for programmatic verification
- Public shareable certificate pages with QR codes

### Dashboard and Profiles
- App dashboard with file and certificate overview, recent activity, quick actions
- Institution dashboard with combined upload-and-certify workflow
- Wallet profile pages showing all files and certificates
- Network statistics page (total files, certs, institutions, on-chain data volume)

### Platform Support
- Progressive web app, works on desktop and mobile
- Farcaster MiniApp integration with auto-connect wallet
- Bottom tab navigation optimized for mobile
- Coinbase Smart Wallet, MetaMask, Rainbow, and WalletConnect support

---

## Data Recovery

BaseVault's "fully on-chain" promise means your data is always recoverable, even if this website goes down permanently.

### Recovery Tool

A standalone HTML file that reads directly from the Base blockchain. No server, no API keys, no account needed.

**[Download Recovery Tool](https://app.basevault.store/recover.html)** (right-click, Save As)

What it does:
- **Browse files** for any wallet address
- **Download public files** by reassembling chunks from the smart contract
- **Decrypt and download private files** with your wallet + password
- **View certificates** received by any wallet
- **Verify documents** by hash or file drop

The tool works from `file://` protocol (offline) and uses the free Base RPC endpoint. It has a built-in pure JavaScript AES-256-CTR implementation as fallback, so it works even without HTTPS.

### Manual Recovery

If even the recovery tool is unavailable, all data can be recovered using any Ethereum-compatible tool (ethers.js, viem, cast, etherscan):

```
Storage Contract: 0x4B46B971f1fBDF6f6D45b703b2f2D042D06CFed3
Certifier Contract: 0x2FDbfc75B8844Af376Be20b41c6C1ed70aA1c2E3
Chain: Base (Chain ID 8453)
RPC: https://mainnet.base.org
```

```
1. getUserFileIds(walletAddress) -> array of file IDs
2. getFile(fileId) -> metadata (name, type, size, chunkCount, isPublic)
3. getChunk(fileId, chunkIndex) -> raw bytes (repeat for all chunks)
4. Concatenate chunks in order -> complete file (public) or encrypted blob (private)
5. For private files: sign "BaseVault: Authorize encryption key for private files"
   Key = SHA-256(signature + password), IV = first 16 bytes, AES-256-CTR decrypt the rest
```

Both contracts are verified on BaseScan. ABIs are public.

---

## How Encryption Works

```
Encrypt (Upload):
  1. User selects "Private" and enters a password
  2. Wallet signs: "BaseVault: Authorize encryption key for private files" (off-chain, no gas)
  3. Key = SHA-256(wallet_signature + password) -> 32 bytes
  4. Random 16-byte IV generated
  5. File encrypted with AES-256-CTR
  6. Output = [16-byte IV] + [encrypted data]
  7. Chunked and stored on-chain

Decrypt (Download):
  1. Same wallet signs same message
  2. Same password entered
  3. Key = SHA-256(signature + password)
  4. IV = first 16 bytes of retrieved data
  5. Remaining bytes decrypted with AES-256-CTR
  6. Original file restored
```

Security model:
- **Something you have** - your wallet private key (for the signature)
- **Something you know** - your password
- Both required. Neither alone is sufficient.

---

## Smart Contracts

### BaseVault V6 (File Storage)

**Address:** [`0x4B46B971f1fBDF6f6D45b703b2f2D042D06CFed3`](https://basescan.org/address/0x4B46B971f1fBDF6f6D45b703b2f2D042D06CFed3)
**Status:** Verified (Sourcify exact match)

| Function | Description |
|----------|-------------|
| `createFileWithData()` | Create file + upload all chunks in one tx |
| `createFile()` | Create file record, upload chunks separately |
| `uploadChunk()` | Upload a single chunk |
| `getFile()` | Get file metadata (name, type, size, chunks, visibility) |
| `getChunk()` | Read a chunk's raw bytes |
| `getUserFileIds()` | Get all file IDs for a wallet |
| `setFileVisibility()` | Toggle public/private |
| `verifyDocument()` | Check if a file hash exists on-chain |

### BaseVaultCertifier V7 (Certification)

**Address:** [`0x2FDbfc75B8844Af376Be20b41c6C1ed70aA1c2E3`](https://basescan.org/address/0x2FDbfc75B8844Af376Be20b41c6C1ed70aA1c2E3)
**Status:** Verified (Sourcify exact match)

| Function | Description |
|----------|-------------|
| `registerInstitution()` | Register as a certifying institution |
| `certify()` | Issue a certificate for a file |
| `certifyByHash()` | Issue a certificate by document hash |
| `batchCertify()` | Certify up to 100 documents at once |
| `revokeCert()` | Revoke a certificate with reason |
| `setDelegate()` | Add/remove team members for cert issuance |
| `getCert()` | Get certificate details |
| `getRecipientCerts()` | Get all certs received by a wallet |
| `getInstitution()` | Get institution details |
| `isCertValid()` | Check if a cert is valid (not expired, not revoked) |
| `verifyCertifications()` | Get all certs for a file hash |

All fees are currently set to zero. Users only pay Base network gas.

---

## Architecture

```
basevault.store           -> Landing page (features, comparison, FAQ, recovery info)
app.basevault.store       -> App (upload, files, certs, verify, dashboard, profiles)
app.basevault.store/recover.html -> Standalone recovery tool (no React, pure HTML)
Farcaster MiniApp         -> Same app with miniapp mode detection
```

Both `basevault.store` and `app.basevault.store` serve the same Vite build. The Home component detects the hostname and renders either the landing page or the app dashboard.

The recovery tool is a separate standalone HTML file in `certifier-app/public/`. It uses ethers.js from CDN and has zero server dependencies.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Base L2 (Ethereum) |
| Storage Contract | Solidity 0.8.24 (BaseVault V6) |
| Certifier Contract | Solidity 0.8.24 (BaseVaultCertifier V7) |
| Frontend | React 19 + TypeScript + Vite |
| Web3 | wagmi v2 + viem + RainbowKit v2 |
| Encryption | AES-256-CTR (aes-js) |
| Hashing | SHA-256 (js-sha256) |
| PDF Export | jsPDF |
| Image Export | html2canvas |
| QR Codes | qrcode (canvas) |
| MiniApp SDK | @farcaster/miniapp-sdk |
| Recovery Tool | Vanilla HTML/JS + ethers.js CDN |
| Contracts Tooling | Foundry |
| Deployment | Nginx + Let's Encrypt SSL |

---

## Project Structure

```
BaseVault/
  contracts/
    src/
      BaseVault.sol                 # File storage contract (V6)
      BaseVaultCertifier.sol        # Certification contract (V7)
      IBaseVault.sol                # Interface for cross-contract calls
    script/                         # Deployment scripts (Foundry)
    test/                           # 60 security tests (Foundry)

  certifier-app/                    # Main app (landing + app + recovery)
    src/
      abi/                          # Contract ABIs
      components/
        Header.tsx                  # Navigation (domain-aware)
        BottomTabs.tsx              # Mobile bottom tabs
        FileDropzone.tsx            # Drag-drop upload
        FileCard.tsx                # File display, decrypt, view
        FAQ.tsx                     # Landing page FAQ
        ShareButtons.tsx            # Social sharing for certs
        SearchFilter.tsx            # Search + filter chips
      pages/
        Home.tsx                    # Landing page (basevault.store)
        AppHome.tsx                 # App dashboard (app.basevault.store)
        Upload.tsx                  # File upload with encryption
        Gallery.tsx                 # Public file gallery
        MyFiles.tsx                 # User's files
        MyCertificates.tsx          # User's received certificates
        InstitutionRegister.tsx     # Institution registration
        InstitutionDashboard.tsx    # Cert issuance dashboard
        CertificateView.tsx         # Certificate page (PDF/PNG/QR/share)
        Verify.tsx                  # Document verification
        Profile.tsx                 # Wallet profile
        Stats.tsx                   # Network statistics
      utils/
        crypto.ts                   # AES-256 encrypt/decrypt
        ipfs.ts                     # SHA-256 hash, chunking
      hooks/
        useMiniApp.ts               # Farcaster detection
      styles/
        globals.css                 # All styles (dark/light, responsive)
      config.ts                     # Wagmi + RainbowKit config
      constants.ts                  # Contract addresses, cert types
    public/
      recover.html                  # Standalone recovery tool
      .well-known/farcaster.json    # MiniApp manifest
      icon.svg, icon.png            # Logo

  frontend/                         # Legacy frontend (V6 storage-only UI)
```

---

## Development

### Prerequisites
- Node.js 18+
- Foundry (for contracts)

### Run the App
```bash
cd certifier-app
npm install
npm run dev
```

### Build for Production
```bash
cd certifier-app
npm run build
# Output in certifier-app/build/
# Nginx serves this directory
```

### Run Contract Tests
```bash
cd contracts
forge test -vvv
```

### Deploy Contracts
```bash
cd contracts
forge create src/BaseVaultCertifier.sol:BaseVaultCertifier \
  --constructor-args <basevault-address> <registration-fee> <per-cert-fee> <batch-discount-bps> \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --broadcast
```

---

## Deployment

Both `basevault.store` and `app.basevault.store` are served by Nginx from the same build directory:

```bash
cd certifier-app && npm run build
sudo nginx -s reload
```

Nginx uses `try_files $uri $uri/ /index.html` for SPA routing. Static assets (JS, CSS, images) are cached with immutable headers. `index.html` is never cached to ensure instant deploys.

SSL certificates are managed by Let's Encrypt (Certbot).

---

## Farcaster MiniApp

BaseVault is available as a Farcaster MiniApp. The manifest at `/.well-known/farcaster.json` configures auto-connect via Farcaster wallet provider and compact mobile UI.

FID: 16795

---

## Security

- All encryption happens client-side. No keys, passwords, or plaintext ever leave the browser.
- Contract source is verified on BaseScan and Sourcify.
- 60 comprehensive security tests covering both contracts.
- No admin backdoors for file access. Only the uploader can modify visibility.
- Contract owner can only adjust fees and withdraw collected fees.

---

## License

MIT
