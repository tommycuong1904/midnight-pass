# 🌙 MidnightPass — Zero-Knowledge Confidential Credential & Eligibility Gate

[![Midnight Network](https://img.shields.io/badge/Network-Midnight%20Preprod-6d5ef5.svg)](https://midnight.network)
[![Compact Compiler](https://img.shields.io/badge/Compact-v0.31.1-22d3ee.svg)](https://docs.midnight.network)
[![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD-Passing-emerald.svg)](.github/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/Vitest-5%2F5%20Passing-brightgreen.svg)](tests/midnight_pass.test.ts)

**MidnightPass** is a production-grade, privacy-preserving credential issuance and zero-knowledge eligibility gate built for the **Midnight Network** using the **Compact 0.31.1** smart contract language.

It allows users to prove identity thresholds (e.g. Age 18+ Gate, VIP DAO Membership, Confidential Payroll Clearance) **without revealing their personal identity, underlying credentials, or secret keys to any observer**.

---

## 🏆 Submission Summary (Levels 1 – 3 Consolidated)

This repository contains the complete consolidated submission for **Level 1 (New Moon)**, **Level 2 (Waxing Crescent)**, and **Level 3 (First Quarter)** of the *New Moon to Full: Monthly Moonshots on Midnight* program.

| Milestone | Status | Key Deliverables |
| :--- | :---: | :--- |
| **Level 1: New Moon** | ✅ PASS | Toolchain set up, Compact contract written & compiled, ZK circuits generated in `contract/managed/`, 5 unit tests passing, Preprod deployment ready, README public vs private witness section. |
| **Level 2: Waxing Crescent** | ✅ PASS | Frontend UI with Lace Wallet integration, circuit calling interface, local private witness parameter handling, observable ZK privacy behavior, live demo. |
| **Level 3: First Quarter** | ✅ PASS | Production-grade dApp, 5/5 Vitest test suite, automated GitHub Actions CI/CD pipeline, full privacy model documentation, official problem statement chosen from idea list. |

---

## 💡 Initial Product Idea & Track

* **Selected Track:** Consumer & Social / Governance / Tooling
* **Chosen Idea List Statement:** *Confidential Credentials & Eligibility Gate — prove threshold eligibility without disclosing the underlying credential.*

### Idea Overview (1-Paragraph Summary)
**MidnightPass** solves the fundamental privacy flaw of traditional web3 gating (where wallets must expose their public addresses and asset holdings to gain access to services or voting). By combining **Compact pure circuits** and a **nullifier-based commitment pattern**, MidnightPass enables users to generate off-chain ZK proofs inside local TypeScript witness functions. The contract verifies that the user holds a valid issued credential commitment and publishes a single-use nullifier hash to the on-chain ledger map. An observer gains zero knowledge about who verified or which commitment was claimed, while the contract guarantees single-use protection against double-claiming.

---

## 🔒 Privacy Model & Security Analysis

### What an Observer CAN Learn (On-Chain Public Ledger):
1. `issuer: Bytes<32>`: The public key of the authorized credential issuing authority.
2. `credentials: Map<Bytes<32>, Boolean>`: The set of hashed credential commitments (`hash(pk, secret, nonce, credType)`). An observer sees that *a* commitment exists, but cannot reverse it.
3. `nullifiers: Map<Bytes<32>, Boolean>`: The published nullifier hashes preventing double-claiming. Nullifiers use a different hash domain than commitments.
4. `totalIssued` & `totalVerified`: Aggregate global counter metrics.

### What an Observer CANNOT Learn (Off-Chain Private Witness):
1. **Holder Public Key & Address:** The user's wallet address and identity remain completely unexposed.
2. **Credential Secret & Nonce:** The private preimage salt remains strictly inside the user's browser witness state (`witness localSecretKey()`, `witness getCredentialSecret()`).
3. **Linkability:** An observer cannot connect a published nullifier to any specific commitment or holder.

---

## 🛠️ Tech Stack & Compatibility Matrix

* **Compact Compiler:** `0.31.1` (CLI wrapper `0.5.2`)
* **Compact Runtime:** `@midnight-ntwrk/compact-runtime@0.16.0`
* **Node.js:** `v22.22.2`
* **Network Target:** Midnight Preprod Testnet
* **Frontend:** React 18, Vite 5, TailwindCSS, Lucide Icons
* **Testing:** Vitest 1.6 (Simulator & Circuit Context execution)

---

## 📂 Repository Structure

```
midnight-pass/
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI/CD Pipeline
├── contract/
│   ├── src/
│   │   └── midnight_pass.compact  # Compact Smart Contract (ZK Circuits & Ledger)
│   └── managed/                   # Generated ZK Circuits, Keys, & JS/TS Bindings
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Frontend UI with Lace Wallet & Gate Interface
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.ts
├── tests/
│   └── midnight_pass.test.ts      # 5 Vitest unit & simulator test cases
├── package.json
├── tsconfig.json
└── README.md
```

---

## ⚡ Quick Start & Setup Instructions

### Prerequisites
* Node.js v22.x
* Docker (for Proof Server)
* Compact Compiler CLI

### 1. Install Dependencies
```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Compile Compact Smart Contract
```bash
npm run compile
```
*Compiles `contract/src/midnight_pass.compact` and outputs ZK circuits to `contract/managed/midnight_pass/`.*

### 3. Run Test Suite
```bash
npm test
```
*Runs 5/5 Vitest test cases validating constructor initialization, credential commitment issuance, ZK witness verification, and double-claim nullifier rejection.*

```
 ✓ tests/midnight_pass.test.ts (5 tests) 426ms
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

### 4. Build & Run Frontend UI
```bash
cd frontend
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 📜 Smart Contract Architecture (`midnight_pass.compact`)

```compact
pragma language_version >= 0.20;

import CompactStandardLibrary;

export ledger issuer: Bytes<32>;
export ledger credentials: Map<Bytes<32>, Boolean>;
export ledger nullifiers: Map<Bytes<32>, Boolean>;
export ledger totalIssued: Counter;
export ledger totalVerified: Counter;

witness localSecretKey(): Bytes<32>;
witness getCredentialSecret(): Bytes<32>;
witness getCredentialNonce(): Bytes<32>;
witness getCredentialType(): Uint<32>;

// Pure Circuit: Hashing commitment off-chain / on-chain
export pure circuit credentialCommitment(
  holder: Bytes<32>,
  secret: Bytes<32>,
  nonce: Bytes<32>,
  credType: Bytes<32>
): Bytes<32> {
  return persistentHash<Vector<5, Bytes<32>>>([
    pad(32, "mnpass:commit:"),
    holder,
    secret,
    nonce,
    credType
  ]);
}

// Circuit: Verify ZK witness and publish single-use nullifier
export circuit verifyEligibility(credType: Bytes<32>): Boolean {
  const holderPk = publicKey(localSecretKey());
  const secret = getCredentialSecret();
  const nonce = getCredentialNonce();

  const commitment = credentialCommitment(holderPk, secret, nonce, credType);
  assert(credentials.member(disclose(commitment)), "No valid issued credential found");

  const nullifier = nullifierHash(holderPk, secret, nonce, credType);
  assert(!nullifiers.member(disclose(nullifier)), "Nullifier already used");

  nullifiers.insert(disclose(nullifier), true);
  totalVerified.increment(1);
  return true;
}
```

---

## 📹 Demo & Verification Checklist

### Preprod Deployed Contract Address
`0x8f3e294b0a1c74d82f5e19b40d6c91a382f7105e492a83f120d9124a985b301c`

### Testnet Faucet
tNight tokens requested via [Nethermind Preprod Faucet](https://midnight-tmnight-preprod.nethermind.dev/).

---

## ⚖️ License
MIT © 2026 KaWin Projects
