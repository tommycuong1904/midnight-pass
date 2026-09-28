# 🌙 MidnightPass — Product Proposal & Architecture Specification

**Program:** New Moon to Full: Monthly Moonshots on Midnight  
**Submission Level:** Level 3 (First Quarter)  
**Project:** MidnightPass  
**Contract Address (Preprod):** `eee200f6454dee797661e8197934ac8ac461a45737ca6979bdab38169f8e4731`
**Verified Circuit Transaction (Preprod):** Indexer hash `d0fa45d6f794fba7781b7d666f036b4952bd7695a3b8500b8964cb73388d4bee` (block `2747405`)
**Live Demo:** [https://frontend-gold-eight-muqigbzt6r.vercel.app](https://frontend-gold-eight-muqigbzt6r.vercel.app)

---

## 1. What Is the Product and Who Is It For?

### Product Overview
**MidnightPass** is a privacy-preserving, zero-knowledge credential verification and eligibility gating protocol built on the Midnight Network using the Compact smart contract language.

In traditional Web3 applications, token-gating or credential verification requires users to connect public wallet addresses, exposing their entire transaction history, asset balances, and identity linkability to third parties. **MidnightPass** solves this fundamental privacy vulnerability by allowing users to prove eligibility (e.g., Age 18+ verification, DAO voting membership, confidential tier access) without revealing their identity, wallet address, or underlying credentials.

### Target Users & Use Cases
1. **Confidential Token-Gated Communities & DAOs:** Web3 communities requiring threshold membership verification (e.g. holding specific governance pass) without exposing user wallet addresses or holding amounts.
2. **Age & Identity Verification Services:** Platforms requiring compliance checks (e.g., Age 18+ or accredited investor gates) without storing or exposing personally identifiable information (PII).
3. **Enterprise & Payroll Access Control:** Organizations providing confidential access to internal resources or benefits based on verifiable credentials issued by authorized admins.
4. **Privacy-Conscious Web3 Users:** Individuals who demand self-sovereign identity and zero-linkability across decentralized applications.

---

## 2. Why Does This Product Need Midnight?

Midnight Network is architected to power **MidnightPass** through native programmable data protection and zero-knowledge smart contracts:

* **Dual-State Ledger Model:** Traditional blockchains (Ethereum, Solana) enforce public state visibility for all smart contract state changes. Midnight provides a hybrid architecture where sensitive state resides in off-chain private witnesses while cryptographic commitments and nullifiers are managed on-chain.
* **Compact Language ZK Primitives:** Midnight's Compact smart contract language provides native support for `witness` functions, `disclose()` boundaries, and collision-resistant `persistentHash` primitives. This enables writing provably secure ZK circuits directly in high-level code.
* **Midnight DApp Connector:** Compatible browser wallets such as 1AM and Lace authorize wallet-backed proving, transaction balancing, and submission without exposing wallet keys to the DApp.

---

## 3. What Is Public, Private, and Disclosed?

MidnightPass strictly separates public ledger state from private witness state to guarantee zero linkability:

### A. On-Chain Public Ledger (Disclosed State)
* `export ledger issuer: Bytes<32>` — The public key of the authorized issuing authority.
* `export ledger credentials: Map<Bytes<32>, Boolean>` — Set of valid credential commitments (`hash(holder, secret, nonce, credType)`). Observer sees *that* a commitment exists, but cannot reverse it to deduce holder key or secret.
* `export ledger nullifiers: Map<Bytes<32>, Boolean>` — Single-use nullifier hashes (`hash(holder, secret, nonce, credType)` under `mnpass:null:` domain). Prevents double-claiming while preventing correlation with commitments.
* `export ledger totalIssued: Counter` and `totalVerified: Counter` — Aggregate metrics.

### B. Off-Chain Private Witness (Hidden State)
* `witness localSecretKey(): Bytes<32>` — Application-level credential secret key stored in encrypted browser private state. It is separate from the connected wallet's signing keys.
* `witness getCredentialSecret(): Bytes<32>` — Private salt used in the credential commitment preimage.
* `witness getCredentialNonce(): Bytes<32>` — Random salt ensuring zero linkability between claims.
* `verifyEligibility(credType: Bytes<32>)` — The credential type is a private circuit parameter by default. It is not written to the public ledger.

### C. Disclosure Boundary Analysis
1. **Commitment Phase (`issueCredential`):** Issuer commits `credentialCommitment(holder, secret, nonce, credType)` to on-chain `credentials` map.
2. **Verification Phase (`verifyEligibility`):** User executes ZK circuit locally. The circuit re-computes `commitment` from private witness inputs and asserts its existence in the on-chain map.
3. **Nullifier Claiming (`disclose(nullifier)`):** Only the single-use `nullifier` hash is disclosed and written to the `nullifiers` map. The holder identity, credential secret, nonce, credential type, and link between the nullifier and stored commitment are not disclosed.

---

## 4. What Is the Mainnet Scope?

### Phase 1: Preprod Testnet (Current Deliverable — Levels 1-3)
- [x] Compact smart contract (`midnight_pass.compact`) with pure circuits & nullifier verification.
- [x] 5/5 passing Vitest test suite covering constructor, credential issuance, ZK proof verification, and double-claim rejection.
- [x] Automated GitHub Actions CI/CD pipeline (`compile` + `test` + `build`).
- [x] Web frontend dApp integrated with the Midnight DApp Connector API and compatible Preprod wallets.
- [x] Midnight.js provider pipeline for Indexer queries, wallet-backed proof generation, transaction balancing, and submission.
- [x] Verified Preprod deployment at `eee200f6454dee797661e8197934ac8ac461a45737ca6979bdab38169f8e4731`.
- [x] Finalized `issueCredential` and `verifyEligibility` transactions, with the resulting nullifier verified through the Preprod Indexer.

### Phase 2: Testnet Hardening & Multi-Schema Credentials
- [x] Direct integration with the Midnight Pub-Sub Indexer and Lace proving provider.
- [ ] Multi-schema credential templates (W3C Verifiable Credentials & JWT import compatibility).
- [ ] Admin UI for bulk issuer revocation and key rotation management.

### Phase 3: Mainnet Launch & SDK Package
- [ ] Formal third-party security and ZK circuit audit.
- [ ] Production high-availability ZK Proof Server infrastructure.
- [ ] Mainnet deployment on Midnight Network.
- [ ] `@midnightpass/sdk` npm package release for 1-line integration into third-party Web3 dApps.
