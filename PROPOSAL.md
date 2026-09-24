# 🌙 MidnightPass — Product Proposal & Architecture Specification

**Program:** New Moon to Full: Monthly Moonshots on Midnight  
**Submission Level:** Level 3 (First Quarter)  
**Project:** MidnightPass  
**Contract Address (Preprod):** `0x8f3e294b0a1c74d82f5e19b40d6c91a382f7105e492a83f120d9124a985b301c`  
**Live Demo:** [https://frontend-gold-eight-muqigbzt6r.vercel.app](https://frontend-gold-eight-muqigbzt6r.vercel.app)

---

## 1. Product & Target Users (What & Who)

### Product Overview
**MidnightPass** is a privacy-preserving, zero-knowledge credential verification and eligibility gating protocol built on the Midnight Network using the Compact smart contract language.

In traditional Web3 applications, token-gating or credential verification requires users to connect public wallet addresses, exposing their entire transaction history, asset balances, and identity linkability to third parties. **MidnightPass** solves this fundamental privacy vulnerability by allowing users to prove eligibility (e.g., Age 18+ verification, DAO voting membership, confidential tier access) without revealing their identity, wallet address, or underlying credentials.

### Target Users & Use Cases
1. **Confidential Token-Gated Communities & DAOs:** Web3 communities requiring threshold membership verification (e.g. holding specific governance pass) without exposing user wallet addresses or holding amounts.
2. **Age & Identity Verification Services:** Platforms requiring compliance checks (e.g., Age 18+ or accredited investor gates) without storing or exposing personally identifiable information (PII).
3. **Enterprise & Payroll Access Control:** Organizations providing confidential access to internal resources or benefits based on verifiable credentials issued by authorized admins.
4. **Privacy-Conscious Web3 Users:** Individuals who demand self-sovereign identity and zero-linkability across decentralized applications.

---

## 2. Why Midnight (Essential Architectural Fit)

Midnight Network is uniquely uniquely architected to power **MidnightPass** due to its native support for programmable data protection and zero-knowledge smart contracts:

* **Dual-State Ledger Model:** Traditional blockchains (Ethereum, Solana) enforce public state visibility for all smart contract state changes. Midnight provides a hybrid architecture where sensitive state resides in off-chain private witnesses while cryptographic commitments and nullifiers are managed on-chain.
* **Compact Language ZK Primitives:** Midnight's Compact smart contract language provides native support for `witness` functions, `disclose()` boundaries, and collision-resistant `persistentHash` primitives. This enables writing provably secure ZK circuits directly in high-level code.
* **Native Lace Wallet & DApp Connector:** Midnight's ecosystem offers seamless off-chain witness execution in browser extensions (Lace Wallet), enabling user-side ZK proof generation without exposing secrets to external servers.

---

## 3. Data Model: Public / Private / Disclosure Boundary

MidnightPass strictly separates public ledger state from private witness state to guarantee zero linkability:

### A. On-Chain Public Ledger (Disclosed State)
* `export ledger issuer: Bytes<32>` — The public key of the authorized issuing authority.
* `export ledger credentials: Map<Bytes<32>, Boolean>` — Set of valid credential commitments (`hash(holder, secret, nonce, credType)`). Observer sees *that* a commitment exists, but cannot reverse it to deduce holder key or secret.
* `export ledger nullifiers: Map<Bytes<32>, Boolean>` — Single-use nullifier hashes (`hash(holder, secret, nonce, credType)` under `mnpass:null:` domain). Prevents double-claiming while preventing correlation with commitments.
* `export ledger totalIssued: Counter` & `totalVerified: Counter` — Aggregate aggregate metrics.

### B. Off-Chain Private Witness (Hidden State)
* `witness localSecretKey(): Bytes<32>` — Holder's private key, kept strictly inside the local wallet context.
* `witness getCredentialSecret(): Bytes<32>` — Private salt used in the credential commitment preimage.
* `witness getCredentialNonce(): Bytes<32>` — Random salt ensuring zero linkability between claims.
* `witness getCredentialType(): Bytes<32>` — Specific credential type requested for verification.

### C. Disclosure Boundary Analysis
1. **Commitment Phase (`issueCredential`):** Issuer commits `credentialCommitment(holder, secret, nonce, credType)` to on-chain `credentials` map.
2. **Verification Phase (`verifyEligibility`):** User executes ZK circuit locally. The circuit re-computes `commitment` from private witness inputs and asserts its existence in the on-chain map.
3. **Nullifier Claiming (`disclose(nullifier)`):** Only the single-use `nullifier` hash is disclosed and written to `nullifiers` map. The holder's identity, public key, secret, and original commitment remain 100% private and unlinked.

---

## 4. Mainnet Scope & Roadmap

### Phase 1: Preprod Testnet (Current Deliverable — Levels 1-3)
- [x] Compact smart contract (`midnight_pass.compact`) with pure circuits & nullifier verification.
- [x] 5/5 passing Vitest test suite covering constructor, credential issuance, ZK proof verification, and double-claim rejection.
- [x] Automated GitHub Actions CI/CD pipeline (`compile` + `test` + `build`).
- [x] Web frontend dApp integrated with Midnight DApp Connector API & Lace Wallet.
- [x] Preprod contract deployment (`0x8f3e294b0a1c74d82f5e19b40d6c91a382f7105e492a83f120d9124a985b301c`).

### Phase 2: Testnet Hardening & Multi-Schema Credentials
- [ ] Direct integration with Midnight Pub-Sub Indexer and Prover Client container.
- [ ] Multi-schema credential templates (W3C Verifiable Credentials & JWT import compatibility).
- [ ] Admin UI for bulk issuer revocation and key rotation management.

### Phase 3: Mainnet Launch & SDK Package
- [ ] Formal third-party security and ZK circuit audit.
- [ ] Production high-availability ZK Proof Server infrastructure.
- [ ] Mainnet deployment on Midnight Network.
- [ ] `@midnightpass/sdk` npm package release for 1-line integration into third-party Web3 dApps.
