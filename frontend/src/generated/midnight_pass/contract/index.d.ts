import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  localSecretKey(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  getCredentialSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  getCredentialNonce(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
}

export type ImpureCircuits<PS> = {
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyEligibility(context: __compactRuntime.CircuitContext<PS>,
                    credType_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  checkCredentialIssued(context: __compactRuntime.CircuitContext<PS>,
                        commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  isNullifierUsed(context: __compactRuntime.CircuitContext<PS>,
                  nullifierVal_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
}

export type ProvableCircuits<PS> = {
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyEligibility(context: __compactRuntime.CircuitContext<PS>,
                    credType_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  checkCredentialIssued(context: __compactRuntime.CircuitContext<PS>,
                        commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  isNullifierUsed(context: __compactRuntime.CircuitContext<PS>,
                  nullifierVal_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
}

export type PureCircuits = {
  publicKey(sk_0: Uint8Array): Uint8Array;
  credentialCommitment(holder_0: Uint8Array,
                       secret_0: Uint8Array,
                       nonce_0: Uint8Array,
                       credType_0: Uint8Array): Uint8Array;
  nullifierHash(holder_0: Uint8Array,
                secret_0: Uint8Array,
                nonce_0: Uint8Array,
                credType_0: Uint8Array): Uint8Array;
}

export type Circuits<PS> = {
  publicKey(context: __compactRuntime.CircuitContext<PS>, sk_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  credentialCommitment(context: __compactRuntime.CircuitContext<PS>,
                       holder_0: Uint8Array,
                       secret_0: Uint8Array,
                       nonce_0: Uint8Array,
                       credType_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  nullifierHash(context: __compactRuntime.CircuitContext<PS>,
                holder_0: Uint8Array,
                secret_0: Uint8Array,
                nonce_0: Uint8Array,
                credType_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  issueCredential(context: __compactRuntime.CircuitContext<PS>,
                  commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  verifyEligibility(context: __compactRuntime.CircuitContext<PS>,
                    credType_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  checkCredentialIssued(context: __compactRuntime.CircuitContext<PS>,
                        commitment_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
  isNullifierUsed(context: __compactRuntime.CircuitContext<PS>,
                  nullifierVal_0: Uint8Array): __compactRuntime.CircuitResults<PS, boolean>;
}

export type Ledger = {
  readonly issuer: Uint8Array;
  credentials: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  nullifiers: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): boolean;
    [Symbol.iterator](): Iterator<[Uint8Array, boolean]>
  };
  readonly totalIssued: bigint;
  readonly totalVerified: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
