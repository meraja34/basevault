# BaseVault

Fully on-chain file storage, encryption, and institutional certification on Base L2.

**Landing Page:** [basevault.store](https://basevault.store) | **App:** [app.basevault.store](https://app.basevault.store) | **MiniApp:** Available on Farcaster/Warpcast

---

## What is BaseVault?

BaseVault stores your actual file bytes directly in a smart contract on Base. Not a hash pointer, not IPFS, not a server. Real data on-chain. Files are permanent, censorship-resistant, and independently verifiable.

On top of storage, BaseVault has a full institutional certification system. Universities, hospitals, law firms, and auditors can register on-chain and issue tamper-proof certifications for any document.

### Key Differentiators

| Feature | BaseVault | IPFS/Pinata | Arweave | Cloud Storage |
|---------|-----------|-------------|---------|---------------|
| Data Location | Base L2 Smart Contract | Peer-to-peer network | Arweave blockchain | Company servers |
| File Permanence | Forever (on-chain) | Needs pinning | Permanent | Until you stop paying |
| Encryption | AES-256 (wallet + password) | None by default | None by default | Server-side |
| Verification | SHA-256 + institutional certs | CID hash only | TX hash | None |
| Institutional Certs | 13 types, batch, delegation | No | No | No |
| Censorship | Uncensorable | Gateway can block | Uncensorable | Provider can delete |
| Server Dependency | None | Pinning service | None | Full dependency |

---

## Features

### File Storage
- Upload any file type (documents, images, videos, audio, PDFs, text)
- Up to 50MB per file
- Chunked storage (24KB per transaction)
- Batch chunk upload via EIP-5792 for smart wallets (one approval for all chunks)
- Public/private toggle per file
- SHA-256 hash computed and stored on-chain
- In-app file viewer (images, PDFs, video, audio, text/JSON)
- File hash copy button on all file cards

### Encryption (Private Files)
- AES-256-CTR client-side encryption
- Key derived from wallet signature + user password (two-factor)
- Only the file owner with the correct password can decrypt
- Decrypt and view directly in the app
- Password never stored or transmitted

### Institutional Certification (V7 Certifier)
- Institutions register on-chain (name, website, cert types)
- 13 certification types: Academic Degree, Professional License, Medical Record, Legal Document, Financial Audit, Identity Verification, Insurance, Property Title, Training Certificate, Product Certification, Environmental Compliance, Government Document, Self-Certification
- Certify by File ID or SHA-256 hash
- Batch certification (up to 100 documents per transaction)
- Delegate system (team members can issue certs on behalf of institution)
- Revocation with reason
- Optional expiry dates
- Public certificate page with QR code
- PDF certificate download
- PNG certificate export
- Social share buttons (Twitter/X, LinkedIn, Farcaster, WhatsApp)

### Verification
- Drag-and-drop file verification (no wallet needed)
- Auto-computes SHA-256 hash and checks on-chain
- Shows all certifications for matched files
- Manual hash input mode
- Public certificate pages with QR codes

### Dashboard & Profile
- App dashboard with file/cert overview, recent activity, quick actions
- Institution dashboard with upload-and-certify flow
- Wallet profile page showing all files and certificates
- Network stats page (total files, certs, institutions)

### Platform
- Farcaster MiniApp integration with auto-connect wallet
- Mobile-responsive with bottom tab navigation
- Dark/light theme toggle
- Landing page (basevault.store) and app (app.basevault.store) served from same build with domain detection
- Coinbase Smart Wallet, MetaMask, Rainbow, WalletConnect support

---

## Architecture

```
basevault.store          --> Landing page (information, features, FAQ)
app.basevault.store      --> App dashboard (wallet connect, files, certs)
Farcaster MiniApp        --> Same app with miniapp mode detection
```

Both domains serve the same build. Home component detects the hostname and renders either the landing page or the app dashboard.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Blockchain | Base L2 (Ethereum) |
| File Storage Contract | Solidity 0.8.24 (BaseVault V6) |
| Certifier Contract | Solidity 0.8.24 (BaseVaultCertifier V7) |
| Frontend | React 19 + TypeScript + Vite |
| Web3 | wagmi v2 + viem + RainbowKit v2 |
| Encryption | AES-256-CTR (aes-js) |
| Hashing | SHA-256 (js-sha256) |
| PDF Export | jsPDF |
| Image Export | html2canvas |
| QR Codes | qrcode (canvas) |
| MiniApp SDK | @farcaster/miniapp-sdk |
| Build Tools | Foundry (contracts), Vite (frontend) |
| Deployment | Nginx + Let's Encrypt SSL |

---

## Smart Contracts

### BaseVault (File Storage)

**Address:** [`0x4B46B971f1fBDF6f6D45b703b2f2D042D06CFed3`](https://basescan.org/address/0x4B46B971f1fBDF6f6D45b703b2f2D042D06CFed3) (Verified)

| Function | Description |
|----------|-------------|
| `createFile()` | Create file record with metadata + pay fee |
| `createFileWithData()` | Create + upload all chunks in one tx (small files) |
| `uploadChunk()` | Upload a chunk of file data |
| `getFile()` | Get file metadata |
| `getChunk()` | Read chunk data from chain |
| `getUserFileIds()` | Get all file IDs for a wallet |
| `setFileVisibility()` | Toggle public/private |
| `fileCount()` | Total files stored |

### BaseVaultCertifier (Certification)

**Address:** [`0x2FDbfc75B8844Af376Be20b41c6C1ed70aA1c2E3`](https://basescan.org/address/0x2FDbfc75B8844Af376Be20b41c6C1ed70aA1c2E3) (Verified)

| Function | Description |
|----------|-------------|
| `registerInstitution()` | Register as certifying institution |
| `certifyFile()` | Certify a file by ID |
| `certifyByHash()` | Certify a document by SHA-256 hash |
| `batchCertify()` | Certify up to 100 files at once |
| `revokeCert()` | Revoke a certificate with reason |
| `addDelegate()` / `removeDelegate()` | Manage delegation |
| `getCert()` | Get certificate details |
| `getFileCerts()` | Get all certs for a file |
| `getRecipientCerts()` | Get all certs for a recipient |
| `selfCertify()` | Self-certify your own document |

---

## How Encryption Works

```
Upload (Private):
  1. User selects "Private" and enters a password
  2. Wallet signs a fixed message (off-chain, no gas)
  3. Key = SHA-256(wallet_signature + password)
  4. File encrypted with AES-256-CTR + random IV
  5. Encrypted bytes stored on-chain

Decrypt:
  1. Same wallet signs same message
  2. Same password entered
  3. Key = SHA-256(signature + password)
  4. IV extracted from first 16 bytes
  5. File decrypted in browser, opened in viewer
```

Two-factor protection:
- **Something you have** - your wallet (private key)
- **Something you know** - your password

Both are required. Even if a wallet is compromised, the attacker needs the password.

---

## Project Structure

```
BaseVault/
  contracts/
    src/
      BaseVault.sol              # File storage contract (V6)
      BaseVaultCertifier.sol     # Certification contract (V7)
      IBaseVault.sol             # Interface for cross-contract calls
    script/                      # Deployment scripts
    test/                        # Foundry tests
    foundry.toml

  certifier-app/                 # Main app (basevault.store + app.basevault.store)
    src/
      abi/                       # Contract ABIs (baseVault + certifier)
      components/
        Header.tsx               # Nav bar (domain-aware: landing vs app)
        BottomTabs.tsx            # Mobile bottom navigation
        FileDropzone.tsx          # Drag-drop file upload
        FileCard.tsx              # File display, decrypt, view
        ThemeToggle.tsx           # Dark/light theme switch
        FAQ.tsx                   # Accordion FAQ
        ShareButtons.tsx          # Social sharing
        SearchFilter.tsx          # Reusable search + filter chips
      pages/
        Home.tsx                  # Domain detection: landing vs AppHome
        AppHome.tsx               # App dashboard (wallet connect, stats, recent)
        Upload.tsx                # File upload with encryption
        Gallery.tsx               # Public file gallery with search/filters
        MyFiles.tsx               # User's files with search/filters
        MyCertificates.tsx        # User's received certificates
        InstitutionRegister.tsx   # Register as institution
        InstitutionDashboard.tsx  # Issue certs, upload & certify
        CertificateView.tsx       # Certificate page (PDF/PNG export, QR, share)
        Verify.tsx                # Document verification (drag-drop + hash)
        Profile.tsx               # Wallet profile page
        Stats.tsx                 # Network statistics
      hooks/
        useMiniApp.ts             # Farcaster MiniApp detection
      utils/
        crypto.ts                 # AES-256 encrypt/decrypt, key derivation
        ipfs.ts                   # SHA-256 hash, chunking, file utilities
      styles/
        globals.css               # All styles (dark/light theme, responsive, miniapp)
      config.ts                   # Wagmi + RainbowKit + Farcaster connector
      constants.ts                # Contract addresses, cert types, config
    public/
      .well-known/farcaster.json  # Farcaster MiniApp manifest
      icon.svg                    # BaseVault logo
      icon.png                    # BaseVault logo (raster)

  frontend/                      # Legacy frontend (original file storage UI)
```

---

## Local Development

### App (certifier-app)
```bash
cd certifier-app
npm install
npm run dev
```

### Contracts
```bash
cd contracts
forge build
forge test
```

### Deploy Contract
```bash
forge create src/BaseVaultCertifier.sol:BaseVaultCertifier \
  --constructor-args <basevault-address> \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

---

## Deployment

Both `basevault.store` and `app.basevault.store` serve from the same Vite build:

```bash
cd certifier-app
npm run build
# Nginx serves from certifier-app/build/
nginx -s reload
```

Nginx config uses `try_files $uri $uri/ /index.html` for SPA routing.

---

## Farcaster MiniApp

BaseVault is available as a Farcaster MiniApp. The manifest at `/.well-known/farcaster.json` configures:
- Auto-connect via Farcaster wallet provider
- Bottom tab navigation in miniapp mode
- Compact header with wallet address display

FID: 16795

---

## All Fees Set to Zero

Both contracts have all fees set to 0. Users only pay Base network gas fees.

---

## License

MIT
