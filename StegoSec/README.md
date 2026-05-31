# StegoSec 🔐

A browser-based secure messaging platform that hides encrypted messages inside ordinary image files, built with React, Vite, and an Express micro-backend, as an Information Security Lab final project. Users communicate through steganographic carrier images — to any outside observer it looks like a normal photo is being shared; in reality, a cryptographically locked secret message is hidden inside every pixel layer.

## Overview

StegoSec bridges theory and practice in applied cryptography and steganography. Every message travels through three independent layers of protection: AES-256-GCM encryption, LSB pixel embedding inside carrier images, and optional deniable encryption that returns a convincing fake message if the wrong key is used. All cryptographic operations run exclusively in the browser via the Web Crypto API — no keys or plaintext ever touch the server. The backend is a lightweight Express server that persists only metadata (encrypted blobs and salts) to a flat `database.json` file. An admin-only panel exposes forensic tooling: a steganalysis suite, a forensic leak detector, and a cryptanalysis simulator that proves why brute-force attacks on AES-256 are computationally infeasible.

## Features

- **User authentication** — username + password sign-up; PBKDF2-derived 256-bit Master Key shown once at registration
- **Role-based access control** — `user` and `admin` roles with separate page routing
- **Per-contact encrypted channels** — each friendship generates a unique 256-bit shared secret via HKDF-SHA256; a compromised channel never exposes others
- **AES-256-GCM encryption** — all message payloads encrypted with a fresh random IV per message
- **LSB steganography** — encrypted payload embedded into carrier image pixel data (least-significant bits of RGB channels); output is a visually indistinguishable PNG
- **Deniable encryption** — optional decoy message layer; wrong key reveals an innocuous cover message, right key reveals the real one
- **Self-destruct messages** — toggle auto-delete on send; image is permanently destroyed after the receiver opens it once
- **Stealth Mode** — triple-click the logo or press `Ctrl+Shift+S` to disguise the app as a plain photo gallery for plausible deniability
- **Attack Simulator** — three interactive tabs demonstrating covert watermarking, AES-256 brute-force futility, and network packet interception
- **Steganalysis Panel** — forensic image analysis: chi-square test, bit-plane visualisation, and per-channel RGB histogram (admin)
- **Forensic Leak Detector** — injects invisible watermarks (username + ISO timestamp) into webcam-captured frames via LSB encoding; proves authorship if a photo leaks (admin)
- **Cryptanalysis Page** — live simulation of a brute-force attack against an AES-256 ciphertext with real-time key-trial counter and time-to-crack estimates (admin)
- **Audit Log** — immutable, timestamped event trail for every action (LOGIN, SIGNUP, SEND, DECRYPT, CRYPTO, STEGO, FRIEND, SELF-DESTRUCT, STEGANALYSIS); colour-coded green/red for success/failure (admin)
- **Contact network** — search users, send/accept friend requests, view an animated network visualiser of your contact graph
- **Statistics** — messages sent, received, and contact count tracked per user on the profile page
- **No external crypto libraries** — all cryptographic primitives use the browser's built-in `window.crypto.subtle`

## Security Architecture

| Layer | Mechanism | Details |
|---|---|---|
| Key Derivation | PBKDF2-SHA256 | 390,000 iterations; password + userId as input material |
| Channel Keys | HKDF-SHA256 | Unique key per contact pair derived from a shared secret |
| Encryption | AES-256-GCM | Fresh 12-byte IV per message; 128-bit authentication tag |
| Steganography | LSB Encoding | 3 bits per pixel (R, G, B channels); 32-bit payload length header |
| Deniable Layer | Dual payload | `DECY` header blob + `STEG` header blob packed in a single payload |
| Key Storage | AES-GCM Wrap | Shared secrets wrapped with the user's master key before storage |
| Transport | Local only | Server stores only encrypted blobs; keys never leave the browser |

## Pages & Routes

| Route | Role | Page |
|---|---|---|
| `/` | Public | Home — feature overview, login / get started CTAs |
| `/auth` | Public | Sign Up & Login — key generation and authentication |
| `/chat` | User | Chat — send & receive steganographic image messages |
| `/profile` | User + Admin | Profile — identity card, contact network, statistics |
| `/simulator` | User | Attack Simulator — watermarking, brute-force, packet interception demos |
| `/steganalysis` | User | Steganalysis — chi-square, bit-plane, histogram forensic analysis |
| `/audit` | Admin | Audit Log — full system event history |
| `/forensics` | Admin | Forensic Leak Detector — webcam capture + watermark injection |
| `/cryptanalysis` | Admin | Cryptanalysis — live AES brute-force simulation |

## Architecture

The project follows a minimal client-server split — all security-critical logic lives in the browser:

- **Frontend (React + Vite)** — SPA with React Router v7, context-driven state (`AuthContext`, `FriendContext`, `AuditContext`), and Lucide React icons; zero UI framework dependency
- **Backend (Node.js + Express)** — a thin generic CRUD REST API at port `3001`; reads and writes a flat `database.json` file; no business logic, no crypto
- **Crypto Layer (`src/utils/crypto.js`)** — pure Web Crypto API: `deriveMasterKey`, `deriveSharedSessionKey`, `encryptWithKey`, `decryptWithKey`, `createDeniablePayload`, `decryptAuto`, `wrapRawKey`, `unwrapRawKey`, `keyToHex`
- **Steganography Layer (`src/utils/steganography.js`)** — Canvas API: `embedPayload`, `extractPayload`, `injectWatermark`, `extractWatermark`, `chiSquareTest`, `generateBitPlane`, `computeHistogram`
- **Database (`database.json`)** — four flat stores: `users`, `friends`, `messages`, `auditLogs`; persisted across server restarts

## Data Model

| Store | Key Fields |
|---|---|
| `users` | `id` (username), `passwordHash`, `masterKeySalt[]`, `imagesSent`, `imagesReceived`, `createdAt` |
| `friends` | `userId`, `friendId`, `status` (`pending` / `accepted`), `sharedSecret[]`, `acceptedAt` |
| `messages` | `id`, `senderId`, `receiverId`, `imageDataUrl` (stego PNG), `timestamp`, `burned`, `hasDecoy` |
| `auditLogs` | `id`, `timestamp`, `action`, `details`, `success`, `userId` |

## How to Run

### 1. Install Prerequisites

| Software | Download | Required For |
|---|---|---|
| **Node.js** (v18+) | https://nodejs.org | Running both frontend and backend |

No external database engines required — the backend persists data to `database.json`.

### 2. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/StegoSec.git
cd StegoSec
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Backend Server

```bash
node server.js
```

Wait for: `StegoSec Shared Backend running at http://localhost:3001`

### 5. Start the Frontend (new terminal)

```bash
npm run dev
```

Wait for: `Local: http://localhost:5173/`

### 6. Open in Browser

```
http://localhost:5173
```

Register two accounts in separate browser tabs to test messaging between contacts.

## Quick Demo Flow

```
1. Register as "alice"  →  Save the displayed Security Key
2. Register as "bob"    →  Save the displayed Security Key
3. As "bob": Profile → Search "alice" → Send Request
4. As "alice": Profile → Pending Requests → Accept
5. As "alice": Chat → Select "bob" → Type message → Upload any photo → SEND
6. As "bob": Chat → Select "alice" → Click the image → VIEW MESSAGE → Enter Security Key
7. Secret message appears ✓
```

## Admin Access

Log in with username `admin` and password `admin_123` (pre-seeded in `database.json`) to access the restricted admin panel: Audit Log, Forensic Leak Detector, and Cryptanalysis pages.

> ⚠️ Change the default admin credentials before any shared deployment.

## Troubleshooting

| Problem | Fix |
|---|---|
| `ECONNREFUSED 3001` | Run `node server.js` first in a separate terminal |
| Image fails to send | Carrier image is too small — use a photo of at least 300×300 pixels |
| "Invalid magic header" on decrypt | The image was not produced by StegoSec or was re-compressed (use PNG only) |
| "Decryption failed – wrong key" | You are using the wrong account's Security Key |
| Webcam not appearing in Forensics | Allow camera permission in the browser prompt |
| `Cannot find module` | Run `npm install` in the project root |
| Port 5173 in use | Vite will auto-select the next available port — check the terminal output |

## Tech Stack

![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Web Crypto API](https://img.shields.io/badge/Web%20Crypto%20API-AES--256--GCM-blue?style=flat)
![Canvas API](https://img.shields.io/badge/Canvas%20API-LSB%20Steganography-green?style=flat)
![React Router](https://img.shields.io/badge/React%20Router-CA4245?style=flat&logo=react-router&logoColor=white)
![Lucide](https://img.shields.io/badge/Lucide-React%20Icons-f97316?style=flat)

## About

Built as a final project for **Information Security Lab** at the **University of Engineering and Technology, Lahore**. The goal was to demonstrate that steganography and strong cryptography together make eavesdropping not just difficult but mathematically futile. Every design decision — from the PBKDF2 + HKDF key hierarchy to the deniable dual-payload format — was chosen to reflect real-world applied cryptography rather than toy implementations. The admin forensic panel adds an investigator's perspective: the same image analysis tools used to detect hidden data are also used to prove why StegoSec's encrypted payloads are indistinguishable from random noise.

---

> Requires Node.js v18+. All cryptography runs in-browser — no third-party crypto library required.
