import { describe, it, expect, beforeEach } from "vitest";
import { Contract, pureCircuits, ledger } from "../contract/managed/midnight_pass/contract/index.js";
import {
  createConstructorContext,
  createCircuitContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";

type PrivateState = {
  secretKey: Uint8Array;
  credSecret: Uint8Array;
  credNonce: Uint8Array;
  credType: Uint8Array;
};

const defaultSecretKey = new Uint8Array(32).fill(1);
const defaultCredSecret = new Uint8Array(32).fill(2);
const defaultCredNonce = new Uint8Array(32).fill(3);
const defaultCredType = new Uint8Array(32).fill(4);

const witnesses = {
  localSecretKey: ({ privateState }: { privateState: PrivateState }): [PrivateState, Uint8Array] => [
    privateState,
    privateState.secretKey,
  ],
  getCredentialSecret: ({ privateState }: { privateState: PrivateState }): [PrivateState, Uint8Array] => [
    privateState,
    privateState.credSecret,
  ],
  getCredentialNonce: ({ privateState }: { privateState: PrivateState }): [PrivateState, Uint8Array] => [
    privateState,
    privateState.credNonce,
  ],
  getCredentialType: ({ privateState }: { privateState: PrivateState }): [PrivateState, Uint8Array] => [
    privateState,
    privateState.credType,
  ],
};

describe("MidnightPass Contract Tests", () => {
  let initialPrivateState: PrivateState;

  beforeEach(() => {
    initialPrivateState = {
      secretKey: defaultSecretKey,
      credSecret: defaultCredSecret,
      credNonce: defaultCredNonce,
      credType: defaultCredType,
    };
  });

  it("1. Should initialize constructor and set public issuer identity", () => {
    const contract = new Contract<PrivateState>(witnesses);
    const { currentPrivateState, currentContractState } = contract.initialState(
      createConstructorContext(initialPrivateState, sampleContractAddress())
    );

    expect(currentPrivateState).toBeDefined();
    expect(currentContractState).toBeDefined();

    const initialLedger = ledger(currentContractState.data);
    expect(initialLedger.totalIssued).toBe(0n);
    expect(initialLedger.totalVerified).toBe(0n);
  });

  it("2. Should issue a credential commitment by authorized issuer", () => {
    const contract = new Contract<PrivateState>(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      contract.initialState(
        createConstructorContext(initialPrivateState, sampleContractAddress())
      );

    const testCommitment = new Uint8Array(32).fill(9);

    const ctx = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState
    );

    const issueRes = contract.impureCircuits.issueCredential(ctx, testCommitment);
    expect(issueRes.context).toBeDefined();
  });

  it("3. Should verify credential commitment and claim nullifier via ZK witness", () => {
    const contract = new Contract<PrivateState>(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      contract.initialState(
        createConstructorContext(initialPrivateState, sampleContractAddress())
      );

    const pk = pureCircuits.publicKey(defaultSecretKey);
    const commitment = pureCircuits.credentialCommitment(
      pk,
      defaultCredSecret,
      defaultCredNonce,
      defaultCredType
    );

    const ctx = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState
    );

    // 1. Issue credential
    const issueRes = contract.impureCircuits.issueCredential(ctx, commitment);

    // 2. Verify eligibility and publish nullifier using returned context continuation
    const verifyRes = contract.impureCircuits.verifyEligibility(issueRes.context, defaultCredType);

    expect(verifyRes.result).toBe(true);
  });

  it("4. Should reject double-claiming (reusing nullifier)", () => {
    const contract = new Contract<PrivateState>(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      contract.initialState(
        createConstructorContext(initialPrivateState, sampleContractAddress())
      );

    const pk = pureCircuits.publicKey(defaultSecretKey);
    const commitment = pureCircuits.credentialCommitment(
      pk,
      defaultCredSecret,
      defaultCredNonce,
      defaultCredType
    );

    const ctx = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState
    );

    // 1. Issue
    const issueRes = contract.impureCircuits.issueCredential(ctx, commitment);

    // 2. First claim: succeeds
    const claim1Res = contract.impureCircuits.verifyEligibility(issueRes.context, defaultCredType);
    expect(claim1Res.result).toBe(true);

    // 3. Second claim with same nullifier: throws assertion error
    expect(() => {
      contract.impureCircuits.verifyEligibility(claim1Res.context, defaultCredType);
    }).toThrow();
  });

  it("5. Should check if credential commitment exists and nullifier is unused", () => {
    const contract = new Contract<PrivateState>(witnesses);
    const { currentPrivateState, currentContractState, currentZswapLocalState } =
      contract.initialState(
        createConstructorContext(initialPrivateState, sampleContractAddress())
      );

    const pk = pureCircuits.publicKey(defaultSecretKey);
    const commitment = pureCircuits.credentialCommitment(
      pk,
      defaultCredSecret,
      defaultCredNonce,
      defaultCredType
    );
    const nullifierVal = pureCircuits.nullifierHash(
      pk,
      defaultCredSecret,
      defaultCredNonce,
      defaultCredType
    );

    const ctx = createCircuitContext(
      sampleContractAddress(),
      currentZswapLocalState,
      currentContractState,
      currentPrivateState
    );

    // Check before issue
    const checkBefore = contract.impureCircuits.checkCredentialIssued(ctx, commitment);
    expect(checkBefore.result).toBe(false);

    // Issue
    const issueRes = contract.impureCircuits.issueCredential(checkBefore.context, commitment);

    // Check after issue
    const checkAfter = contract.impureCircuits.checkCredentialIssued(issueRes.context, commitment);
    expect(checkAfter.result).toBe(true);

    // Nullifier before claim
    const nullBefore = contract.impureCircuits.isNullifierUsed(checkAfter.context, nullifierVal);
    expect(nullBefore.result).toBe(false);

    // Claim
    const claimRes = contract.impureCircuits.verifyEligibility(nullBefore.context, defaultCredType);

    // Nullifier after claim
    const nullAfter = contract.impureCircuits.isNullifierUsed(claimRes.context, nullifierVal);
    expect(nullAfter.result).toBe(true);
  });
});
