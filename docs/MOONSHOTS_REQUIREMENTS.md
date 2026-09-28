# Midnight Moonshots: Requirements and Review Notes

This document records the submission requirements and review feedback for
Midnight's New Moon to Full program.

## Builder Notes

### Privacy in Compact

Circuit inputs are private by default. Calling `disclose()` indicates that a
developer considers a value safe to expose; it does not by itself make the
value public. A value becomes public only when it crosses into a public domain,
such as a ledger write, a return value from an exported contract, or a
contract-to-contract call.

For MidnightPass, holder secrets, nonces, and private keys must remain in
private witness state. Only the credential commitment and single-use nullifier
hash should be disclosed for the on-chain ledger.

### Networks

Levels 1-5 are built and validated on Midnight Preview or Preprod. Level 6
(Supermoon) is the Mainnet deployment milestone.

## Level 1: New Moon

**Status:** Passed (Approved)

### Mission

Set up the toolchain, write a first Compact contract, deploy it to
Preview/Preprod, and define an initial product idea. At this stage, the work
does not need to be public.

### Who Can Join

Open to everyone. It is suited to builders interested in privacy-first
applications on Midnight who have basic frontend or full-stack experience.

### What You Will Learn

- Install the Midnight toolchain: Compact compiler, proof server, Node 22, and Docker.
- Write a Compact contract with public ledger state and a private witness.
- Use `disclose()` deliberately to control public data.
- Compile ZK circuits and deploy to Preprod.

### Requirements to Pass

- Toolchain installed and contract compiles with `compact compile`.
- Passing test suite.
- Generated `managed/` directory containing circuits and keys.
- Contract deployed to Preview or Preprod with a visible address.
- Initial product idea drafted in one short README paragraph.
- At least 5 meaningful commits.

### Submission Checklist

- [x] Public GitHub repository with `README.md`.
- [x] Local setup instructions.
- [x] Screenshot of successful compiler output with listed circuits.
- [x] Screenshot of deployed contract address.
- [x] README explanation of public state versus private witness.
- [x] Initial product idea paragraph.
- [x] At least 5 meaningful commits.

## Level 2: Waxing Crescent

**Status:** Technical remediation verified on Preprod - demo and resubmission pending
**Reviewed:** September 25, 2026, 18:38:40 UTC

### Mission

Connect the contract to a real frontend and integrate Lace on Preprod. The
frontend should make the contract and a deliberate piece of the privacy model
observable.

### Who Can Join

Developers who completed Level 1, or have equivalent experience with a deployed
Compact contract and are ready to use Midnight.js and the DApp Connector.

### What You Will Learn

- Midnight.js and the DApp Connector API.
- Connecting and disconnecting Lace Wallet.
- Calling a circuit from the frontend and handling its result.
- Managing local private state and deploying to Preprod.

### Requirements to Pass

- Lace Wallet connect and disconnect implemented.
- Circuit invoked successfully from the frontend.
- An observable privacy behavior: something is proven without being revealed.
- Contract deployed to Preprod with a verifiable address.
- At least 8 meaningful commits.

### Submission Checklist

- [x] Public GitHub repository with README.
- [x] Live demo URL, such as Vercel or Netlify.
- [x] Verifiable deployed Preprod contract address: `eee200f6454dee797661e8197934ac8ac461a45737ca6979bdab38169f8e4731`.
- [x] Demo video showing the 1AM Preprod connection and finalized circuit transaction evidence.
- [x] README documentation of the privacy claim.
- [x] At least 8 meaningful commits.

### Verified Preprod Evidence

- Deployment: block `2747330`, Indexer transaction hash `1be6c15834c56563d21cdb26d3cd036b5ccf66baef97797a7f4f410604f5e913`.
- `issueCredential`: block `2747350`, Indexer transaction hash `44edc35172690efeae04510f7bf9d286ecf02b1df3fa37c3fb827e2c9dff5d70`.
- `verifyEligibility`: block `2747405`, Indexer transaction hash `d0fa45d6f794fba7781b7d666f036b4952bd7695a3b8500b8964cb73388d4bee`.
- Independent Indexer queries confirm the deployment, issue, and verification actions target the same contract address.

### Pending User Actions

- [x] Record a browser-wallet demo showing the verified contract address, wallet connection, and finalized `issueCredential` and `verifyEligibility` evidence.
- [x] Store the submission recording at `assets/demo_video.mp4`.
- [ ] Resubmit Level 2 to the review team after the video is replaced.

### Remediation Requirements

- Do not display a contract address, transaction ID, or on-chain success state
  unless it is produced by a confirmed Preprod transaction.
- Connect through Lace's DApp Connector and verify that the accepted connection
  is on Preprod before treating the wallet as connected.
- Deploy the compiled contract using a funded Preprod wallet, retain the real
  transaction ID and contract address, and make both available for review.
- Replace the local circuit simulation with a proven, balanced, and submitted
  contract transaction before claiming that a credential was issued or a
  nullifier was written to the ledger.

## Level 3: First Quarter

**Status:** Technical remediation and demo complete - resubmission pending
**Reviewed:** September 25, 2026, 18:38:47 UTC

### Review Feedback

> Invalid contract address: `0x8f3e294b0a1c74d82f5e19b40d6c91a382f7105e492a83f120d9124a985b301c`
>
> The contract address is not available on the Preprod environment.

**Resolved September 28, 2026:** deployed and queried successfully through the
Preprod Indexer at `eee200f6454dee797661e8197934ac8ac461a45737ca6979bdab38169f8e4731`.

### Mission

Deliver a polished, production-grade dApp with tests and CI/CD, built around a
chosen problem from the provided list.

### Who Can Join

Developers who completed Level 2 and have a frontend dApp wired to a deployed
contract, with an understanding of circuits, wallet connection, and private
state.

### What You Will Learn

- Design a dApp around selective disclosure.
- Write contract and application tests.
- Set up CI/CD to compile and test on each push.
- Scope a realistic product proposal.

### Provided Idea List

- Private Voting: anonymous ballots with publicly verifiable tallies.
- Age or Eligibility Gate: prove a threshold without exposing the value.
- Private Allowlist Access: prove membership without revealing identity.
- Confidential Credentials: prove a credential is valid without disclosure.
- Sealed-Bid Auction: private bids with a verifiable winner.
- Private Payroll or Splits: distribute funds without exposing amounts.
- Anonymous Feedback or Survey: verifiable participation with private responses.

### Requirements to Pass

- Fully functional dApp that meaningfully uses Midnight's privacy model.
- At least 3 passing tests.
- CI/CD pipeline configured with passing runs.
- Approved idea selected from the provided list.
- At least 10 meaningful commits.

### Submission Checklist

- [x] Public GitHub repository with complete README.
- [x] Live demo URL.
- [x] Screenshot of test output showing 5 passing tests.
- [x] CI/CD badge and workflow file with passing runs.
- [x] One-minute browser demo showing the live Preprod wallet connection, privacy model, contract address, and finalized transaction evidence.
- [x] README privacy-model section explaining what observers can and cannot learn.
- [x] Root `PROPOSAL.md` answers product/users, why Midnight, public/private/disclosure, and Mainnet scope.
- [x] At least 10 meaningful commits (22 verified before this remediation update).

### Level 3 Pending User Actions

- [x] Record the one-minute demo video showing the verified Preprod address and finalized circuit interaction evidence rather than the historical rejected address.
- [ ] Resubmit Level 3 to the review team after replacing the video.
