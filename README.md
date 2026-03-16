<p align="center">
  <img src="https://basevault.store/og-image.png" alt="BaseVault" width="600" />
</p>

<h1 align="center">BaseVault</h1>

<p align="center">
  <strong>Fully on-chain document storage, encryption, and institutional certification on Base L2</strong>
</p>

<p align="center">
  <a href="https://basevault.store"><img src="https://img.shields.io/badge/Website-basevault.store-0052FF?style=for-the-badge" alt="Website" /></a>
  <a href="https://app.basevault.store"><img src="https://img.shields.io/badge/Launch_App-app.basevault.store-00c853?style=for-the-badge" alt="App" /></a>
  <a href="https://app.basevault.store/recover.html"><img src="https://img.shields.io/badge/Recovery_Tool-Standalone-ff6d00?style=for-the-badge" alt="Recovery" /></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Base-L2-0052FF?style=flat-square&logo=coinbase&logoColor=white" alt="Base" />
  <img src="https://img.shields.io/badge/Foundry-Tests-red?style=flat-square" alt="Foundry" />
  <img src="https://img.shields.io/badge/Encryption-AES--256--CTR-purple?style=flat-square&logo=letsencrypt&logoColor=white" alt="AES-256" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="MIT" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Storage-0x4B46...Fed3-0052FF?style=flat-square&logo=ethereum&logoColor=white" alt="Storage Contract" />
  <img src="https://img.shields.io/badge/Certifier-0x2FDb...0E3-0052FF?style=flat-square&logo=ethereum&logoColor=white" alt="Certifier Contract" />
  <img src="https://img.shields.io/badge/Verified-BaseScan_%2B_Sourcify-00c853?style=flat-square" alt="Verified" />
</p>

---

## What is BaseVault?

BaseVault stores your **actual file bytes** directly in a smart contract on Base. Not a hash pointer. Not IPFS. Not a server. Real data, on the blockchain, permanently.

On top of storage, BaseVault has a complete **institutional certification system**. Universities, hospitals, law firms, and auditors can register on-chain and issue tamper-proof certifications for any document.

> Your files. Your keys. Your proof. No servers, no IPFS, no middlemen.

---

## Why BaseVault?

Every "decentralized storage" solution still depends on something centralized. IPFS needs pinning services that can stop. Arweave has its own token economy. Cloud storage is just someone else's computer.

BaseVault writes your file bytes into Ethereum's security model via Base L2. As long as Ethereum exists, your files exist.

<p align="center">
  <img src="https://basevault.store/comparison-table.svg" alt="BaseVault vs Others" width="900" />
</p>

---

## Features

### On-Chain File Storage
- Upload any file type up to **50MB** (documents, images, video, audio, PDFs)
- Chunked storage (**24KB per transaction**) stored entirely in the smart contract
- SHA-256 hash computed and stored on-chain for integrity verification
- Public or private visibility toggle per file
- In-app file viewer (images, PDFs, video, audio, text, JSON)
- Batch chunk upload via **EIP-5792** for smart wallets (one approval for all chunks)

### End-to-End Encryption
- **AES-256-CTR** client-side encryption
- Two-factor key derivation: **wallet signature + user password**
- Password is never stored, transmitted, or recoverable by anyone
- Decrypt and view files directly in the browser
- Even if wallet is compromised, attacker still needs the password

### Institutional Certification
- Institutions register on-chain (name, metadata, allowed cert types)
- **13 certification types:** Degree, Transcript, Course Completion, Badge, License, Contract, NDA, Audit, IP Proof, Medical Record, Lab Report, Research Paper, Generic
- Certify by **File ID** or by **SHA-256 hash** (file doesn't need to be on BaseVault)
- **Batch certification** (up to 100 documents per transaction)
- **Delegate system** for team members to issue certs on behalf of institution
- Revocation with on-chain reason + optional expiry dates
- Public certificate page with **QR code, PDF download, PNG export, social sharing**

### Document Verification
- **Drag-and-drop** any file to verify (no wallet required)
- Auto-computes SHA-256 and checks all on-chain records
- Shows all certifications, issuing institutions, validity status
- Manual hash input for programmatic verification
- Public shareable certificate pages with QR codes

### Dashboard & Profiles
- App dashboard with file/cert overview, recent activity, quick actions
- Institution dashboard with upload-and-certify workflow
- Wallet profile pages (all files + certificates for any address)
- Network statistics (total files, certs, institutions, on-chain data volume)

### Multi-Platform
- Responsive web app (desktop + mobile)
- **Farcaster MiniApp** with auto-connect wallet
- Mobile bottom tab navigation
- Coinbase Smart Wallet, MetaMask, Rainbow, WalletConnect support
- Dark/light theme toggle

---

## Data Recovery

> **The core promise:** Even if basevault.store goes down permanently, you lose nothing.

### Recovery Tool

A **single standalone HTML file** that reads directly from the Base blockchain. No server, no API keys, no account needed.

**[Download recover.html](https://app.basevault.store/recover.html)** (right-click > Save As > keep on your computer)

| Feature | Requires Wallet? |
|---------|:---:|
| Browse files for any address | No |
| Download public files | No |
| Decrypt & download private files | Yes + password |
| View certificates | No |
| Verify documents by hash or file drop | No |

Works from `file://` protocol (fully offline). Built-in pure JavaScript **AES-256-CTR** implementation as fallback when Web Crypto API is unavailable. Only dependency is ethers.js from CDN for blockchain reads.

### Manual Recovery (CLI / Script)

If even the recovery tool is unavailable, all data is recoverable with any Ethereum tool:

```
Chain:    Base (8453)
RPC:      https://mainnet.base.org
Storage:  0x4B46B971f1fBDF6f6D45b703b2f2D042D06CFed3
Certifier: 0x2FDbfc75B8844Af376Be20b41c6C1ed70aA1c2E3
```

```
Step 1:  getUserFileIds(walletAddress)              -> [fileId, fileId, ...]
Step 2:  getFile(fileId)                            -> { fileName, fileType, fileSize, chunkCount, isPublic }
Step 3:  getChunk(fileId, 0), getChunk(fileId, 1)...-> raw bytes per chunk
Step 4:  Concatenate all chunks in order            -> complete file (if public)
Step 5:  For private files:
           Sign message: "BaseVault: Authorize encryption key for private files"
           Key = SHA-256(signature + password)
           IV = first 16 bytes of concatenated data
           Decrypt remaining bytes with AES-256-CTR
```

Both contracts are **verified on BaseScan**. ABIs are publicly available.

---

## How Encryption Works

```
 ENCRYPT (Upload)                              DECRYPT (Download)
 ----------------                              ------------------
 1. User picks "Private" + enters password     1. Same wallet signs same message
 2. Wallet signs fixed message (no gas)        2. Same password entered
 3. Key = SHA-256(signature + password)        3. Key = SHA-256(signature + password)
 4. Random 16-byte IV generated               4. IV = first 16 bytes of data
 5. AES-256-CTR encrypt                       5. AES-256-CTR decrypt remaining bytes
 6. Output = [IV (16B)] + [ciphertext]        6. Original file restored in browser
 7. Chunked and stored on-chain
```

**Two-factor security model:**
| Factor | What It Is | What Happens If Compromised Alone |
|--------|-----------|----------------------------------|
| Wallet (private key) | Signs the message to derive key | Attacker still can't decrypt without password |
| Password | Combined with signature for key | Useless without the specific wallet signature |

---

## Architecture

```
                    +-------------------+
                    |   Base Blockchain  |
                    |  (Ethereum L2)     |
                    +--------+----------+
                             |
              +--------------+--------------+
              |                             |
   +----------+----------+     +-----------+-----------+
   |  BaseVault V6       |     |  BaseVaultCertifier V7 |
   |  File Storage       |     |  Institutional Certs   |
   |  0x4B46...Fed3      |     |  0x2FDb...0E3          |
   +----------+----------+     +-----------+-----------+
              |                             |
              +--------------+--------------+
                             |
              +--------------+--------------+
              |                             |
   +----------+----------+     +-----------+-----------+
   |  basevault.store    |     |  app.basevault.store   |
   |  Landing Page       |     |  Web Application       |
   |  (same build)       |     |  (same build)          |
   +---------------------+     +-----------+-----------+
                                            |
                                +-----------+-----------+
                                |  recover.html         |
                                |  Standalone Recovery   |
                                |  (no React, pure HTML) |
                                +-----------------------+
```

Both domains serve the same Vite build. `Home.tsx` detects the hostname and renders either the marketing landing page or the app dashboard.

The recovery tool is a separate static HTML file with inline CSS/JS. Zero build dependencies.

---

## Smart Contracts

### BaseVault V6 (File Storage)

<a href="https://basescan.org/address/0x4B46B971f1fBDF6f6D45b703b2f2D042D06CFed3"><img src="https://img.shields.io/badge/BaseScan-0x4B46...Fed3-0052FF?style=flat-square&logo=ethereum" alt="BaseScan" /></a> <img src="https://img.shields.io/badge/Verified-BaseScan-00c853?style=flat-square" alt="Verified" />

| Function | Description |
|:---------|:------------|
| `createFileWithData()` | Create file + upload all chunks in one tx |
| `createFile()` | Create file record, upload chunks separately |
| `uploadChunk()` | Upload a single chunk of file data |
| `getFile()` | Get file metadata (name, type, size, chunks, visibility) |
| `getChunk()` | Read a chunk's raw bytes from chain |
| `getUserFileIds()` | Get all file IDs for a wallet |
| `setFileVisibility()` | Toggle public/private visibility |
| `verifyDocument()` | Check if a file hash exists on-chain |
| `hashToFileId()` | Map SHA-256 hash to file ID |

### BaseVaultCertifier V7 (Institutional Certification)

<a href="https://basescan.org/address/0x2FDbfc75B8844Af376Be20b41c6C1ed70aA1c2E3"><img src="https://img.shields.io/badge/BaseScan-0x2FDb...0E3-0052FF?style=flat-square&logo=ethereum" alt="BaseScan" /></a> <img src="https://img.shields.io/badge/Verified-BaseScan-00c853?style=flat-square" alt="Verified" />

| Function | Description |
|:---------|:------------|
| `registerInstitution()` | Register as certifying institution |
| `certify()` | Issue a certificate for a file by ID |
| `certifyByHash()` | Issue a certificate by SHA-256 hash |
| `batchCertify()` | Certify up to 100 documents at once |
| `revokeCert()` | Revoke a certificate with reason |
| `setDelegate()` | Add/remove team members for cert issuance |
| `getCert()` | Get certificate details (struct) |
| `getRecipientCerts()` | Get all certs received by a wallet |
| `getInstitution()` | Get institution name, status, metadata |
| `isCertValid()` | Check validity (not expired, not revoked) |
| `verifyCertifications()` | Get all certs for a file hash |
| `getHashCertIds()` | Get cert IDs for a file hash |

> Minimal protocol fees apply. Users also pay Base network gas (~$0.001 per tx).

---

## Tech Stack

<table>
<tr><td><strong>Layer</strong></td><td><strong>Technology</strong></td></tr>
<tr><td>Blockchain</td><td><img src="https://img.shields.io/badge/Base-L2_(Ethereum)-0052FF?style=flat-square&logo=coinbase&logoColor=white" /></td></tr>
<tr><td>Smart Contracts</td><td><img src="https://img.shields.io/badge/Solidity-0.8.24-363636?style=flat-square&logo=solidity" /> <img src="https://img.shields.io/badge/Foundry-Build_%26_Test-red?style=flat-square" /></td></tr>
<tr><td>Frontend</td><td><img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" /> <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript&logoColor=white" /> <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite&logoColor=white" /></td></tr>
<tr><td>Web3</td><td><img src="https://img.shields.io/badge/wagmi-v2-black?style=flat-square" /> <img src="https://img.shields.io/badge/viem-latest-black?style=flat-square" /> <img src="https://img.shields.io/badge/RainbowKit-v2-7B3FE4?style=flat-square" /></td></tr>
<tr><td>Encryption</td><td><img src="https://img.shields.io/badge/AES--256--CTR-aes--js-purple?style=flat-square" /> <img src="https://img.shields.io/badge/SHA--256-js--sha256-blue?style=flat-square" /></td></tr>
<tr><td>Exports</td><td><img src="https://img.shields.io/badge/jsPDF-PDF_Export-d32f2f?style=flat-square" /> <img src="https://img.shields.io/badge/html2canvas-PNG_Export-ff9800?style=flat-square" /> <img src="https://img.shields.io/badge/qrcode-QR_Codes-000?style=flat-square" /></td></tr>
<tr><td>MiniApp</td><td><img src="https://img.shields.io/badge/Farcaster-MiniApp_SDK-7C65C1?style=flat-square" /></td></tr>
<tr><td>Recovery Tool</td><td><img src="https://img.shields.io/badge/Vanilla_JS-No_Framework-f7df1e?style=flat-square&logo=javascript&logoColor=black" /> <img src="https://img.shields.io/badge/ethers.js-v6_CDN-2535a0?style=flat-square" /></td></tr>
<tr><td>Hosting</td><td><img src="https://img.shields.io/badge/Nginx-Reverse_Proxy-009639?style=flat-square&logo=nginx&logoColor=white" /> <img src="https://img.shields.io/badge/Let's_Encrypt-SSL-003A70?style=flat-square&logo=letsencrypt&logoColor=white" /></td></tr>
</table>

---

## Project Structure

```
BaseVault/
  contracts/
    src/
      BaseVault.sol                 # File storage contract (V6)
      BaseVaultCertifier.sol        # Certification contract (V7)
      IBaseVault.sol                # Interface for cross-contract calls
    script/                         # Foundry deployment scripts
    test/                           # 60 security tests (Foundry)

  certifier-app/                    # Main app (landing + app + recovery)
    src/
      abi/                          # Contract ABIs (auto-generated)
      components/
        Header.tsx                  # Navigation (domain-aware routing)
        BottomTabs.tsx              # Mobile bottom tab navigation
        FileDropzone.tsx            # Drag-drop file upload zone
        FileCard.tsx                # File display, decrypt, view, download
        FAQ.tsx                     # Accordion FAQ component
        ShareButtons.tsx            # Social sharing (X, LinkedIn, Farcaster, WhatsApp)
        SearchFilter.tsx            # Reusable search + filter chips
      pages/
        Home.tsx                    # Landing page (basevault.store)
        AppHome.tsx                 # App dashboard (app.basevault.store)
        Upload.tsx                  # File upload with encryption options
        Gallery.tsx                 # Public file gallery with search/filter
        MyFiles.tsx                 # User's uploaded files
        MyCertificates.tsx          # User's received certificates
        InstitutionRegister.tsx     # Institution registration form
        InstitutionDashboard.tsx    # Cert issuance + upload-and-certify
        CertificateView.tsx         # Certificate page (PDF/PNG/QR/share)
        Verify.tsx                  # Document verification (drop + hash)
        Profile.tsx                 # Wallet profile page
        Stats.tsx                   # Network-wide statistics
      utils/
        crypto.ts                   # AES-256-CTR encrypt/decrypt, key derivation
        ipfs.ts                     # SHA-256 hashing, file chunking
      hooks/
        useMiniApp.ts               # Farcaster MiniApp detection
      styles/
        globals.css                 # All styles (dark/light, responsive, miniapp)
      config.ts                     # Wagmi + RainbowKit + Farcaster config
      constants.ts                  # Contract addresses, cert types, limits
    public/
      recover.html                  # Standalone on-chain recovery tool
      .well-known/farcaster.json    # Farcaster MiniApp manifest
      icon.svg, icon.png            # BaseVault logo

  frontend/                         # Legacy frontend (V6 file storage only)
```

---

## Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **Foundry** (for smart contract development)
- **MetaMask** or any WalletConnect-compatible wallet

### Run Locally

```bash
# Clone the repository
git clone https://github.com/meraja34/basevault.git
cd basevault

# Install dependencies and start dev server
cd certifier-app
npm install
npm run dev
```

App will be available at `http://localhost:5173`

### Build for Production

```bash
cd certifier-app
npm run build
# Output: certifier-app/build/
```

### Smart Contract Development

```bash
cd contracts

# Build contracts
forge build

# Run all tests (60 tests)
forge test -vvv

# Deploy (example)
forge create src/BaseVaultCertifier.sol:BaseVaultCertifier \
  --constructor-args <basevault-address> <reg-fee> <cert-fee> <batch-discount-bps> \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --broadcast
```

---

## Deployment

Both `basevault.store` and `app.basevault.store` are served by Nginx from the same build:

```bash
cd certifier-app && npm run build
sudo nginx -s reload
```

- Nginx: `try_files $uri $uri/ /index.html` for SPA routing
- Static assets: `Cache-Control: public, immutable` (Vite content-hashed filenames)
- `index.html`: `Cache-Control: no-cache` (instant deploys)
- SSL: Let's Encrypt via Certbot (auto-renewal)

---

## Farcaster MiniApp

BaseVault is available as a **Farcaster MiniApp** with auto-connect wallet, compact header, and bottom tab navigation for mobile.

Manifest: `/.well-known/farcaster.json` | FID: **16795**

---

## Security

| Area | Detail |
|:-----|:-------|
| **Client-side encryption** | All AES-256-CTR encryption/decryption happens in the browser. Keys, passwords, and plaintext never leave the device. |
| **Contract verification** | Both contracts verified on BaseScan. Source code publicly auditable. |
| **Test coverage** | 60 comprehensive security tests covering access control, edge cases, and attack vectors. |
| **No admin file access** | Contract owner can adjust fees and withdraw collected fees. No backdoor to read, modify, or delete user files. |
| **Two-factor decryption** | Wallet signature + password both required. Single-factor compromise is insufficient. |
| **On-chain permanence** | Once stored, data cannot be deleted, modified, or censored by anyone, including the contract owner. |

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

```bash
# Fork the repo
# Create your feature branch
git checkout -b feat/your-feature

# Make your changes, then
forge test        # Make sure contract tests pass
npm run build     # Make sure frontend builds

# Open a pull request
```

---

## License

[MIT](LICENSE)

---

<p align="center">
  <strong>Built on</strong>
  <br/><br/>
  <a href="https://base.org">
    <img src="https://raw.githubusercontent.com/base/brand-kit/main/logo/Basemark/Digital/Base_basemark_blue.svg" alt="Base" height="40" />
  </a>
</p>

<p align="center">
  <sub>Your files. Your keys. Your proof.</sub>
</p>
