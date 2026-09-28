import { CompiledContract } from '@midnight-ntwrk/compact-js';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { dappConnectorProofProvider } from '@midnight-ntwrk/midnight-js-dapp-connector-proof-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { CostModel, Transaction } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import { fromHex, toHex } from '@midnight-ntwrk/midnight-js-utils';

import { Contract, pureCircuits } from '../../contract/managed/midnight_pass/contract/index.js';

export const PRIVATE_STATE_ID = 'midnightPassPrivateState';
export const CONTRACT_STORAGE_KEY = 'midnight-pass-preprod-contract';
export const PREPROD_CONTRACT_ADDRESS = 'e9fde2ce9cfcda1b94cf5985cc31ef695ba7611f48db3c9bda42adaf45a6465b';
const ASSET_PATH = '/midnight-pass';
const STORAGE_PASSWORD = 'MidnightPass-Preprod-Local-State-2026!';
const LOCAL_SECRET_KEY = 'midnight-pass-local-secret-key';

export type PrivateState = {
  secretKey: Uint8Array;
  credSecret: Uint8Array;
  credNonce: Uint8Array;
};

export type ChainResult = {
  contractAddress: string;
  txId: string;
  blockHeight: number;
};

type MidnightPassContract = InstanceType<typeof Contract<PrivateState>>;
type Providers = MidnightProviders<any, typeof PRIVATE_STATE_ID, PrivateState>;

setNetworkId('preprod');

export function encodeBytes32(value: string): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set(new TextEncoder().encode(value).slice(0, 32));
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function createPrivateState(secret: string, nonce: string): PrivateState {
  return {
    secretKey: getOrCreateLocalSecretKey(),
    credSecret: encodeBytes32(secret),
    credNonce: encodeBytes32(nonce),
  };
}

function getOrCreateLocalSecretKey(): Uint8Array {
  const stored = localStorage.getItem(LOCAL_SECRET_KEY);
  if (stored && /^[0-9a-f]{64}$/i.test(stored)) {
    return Uint8Array.from(stored.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
  }

  const secretKey = crypto.getRandomValues(new Uint8Array(32));
  localStorage.setItem(LOCAL_SECRET_KEY, bytesToHex(secretKey).slice(2));
  return secretKey;
}

const witnesses = {
  localSecretKey: ({ privateState }: { privateState: PrivateState }): [PrivateState, Uint8Array] =>
    [privateState, privateState.secretKey],
  getCredentialSecret: ({ privateState }: { privateState: PrivateState }): [PrivateState, Uint8Array] =>
    [privateState, privateState.credSecret],
  getCredentialNonce: ({ privateState }: { privateState: PrivateState }): [PrivateState, Uint8Array] =>
    [privateState, privateState.credNonce],
};

const compiledContract = CompiledContract.make('midnight-pass', Contract).pipe(
  CompiledContract.withWitnesses(witnesses),
  CompiledContract.withCompiledFileAssets(ASSET_PATH),
);

function createPrivateStateProvider(accountId: string) {
  return levelPrivateStateProvider<typeof PRIVATE_STATE_ID, PrivateState>({
    accountId,
    midnightDbName: 'midnight-pass',
    privateStateStoreName: 'private-state',
    signingKeyStoreName: 'signing-keys',
    privateStoragePasswordProvider: () => STORAGE_PASSWORD,
  });
}

async function buildProviders(api: ConnectedAPI, contractAddress?: string): Promise<Providers> {
  const [walletAddresses, configuration] = await Promise.all([
    api.getShieldedAddresses(),
    api.getConfiguration(),
  ]);

  if (configuration.networkId !== 'preprod') {
    throw new Error(`Expected Preprod, wallet returned ${configuration.networkId}.`);
  }

  const zkConfigProvider = new FetchZkConfigProvider<string>(
    `${window.location.origin}${ASSET_PATH}`,
    window.fetch.bind(window),
  );
  const privateStateProvider = createPrivateStateProvider(walletAddresses.shieldedCoinPublicKey);
  if (contractAddress) privateStateProvider.setContractAddress(contractAddress);

  return {
    privateStateProvider,
    publicDataProvider: indexerPublicDataProvider(configuration.indexerUri, configuration.indexerWsUri),
    zkConfigProvider,
    proofProvider: await dappConnectorProofProvider(
      api,
      zkConfigProvider,
      CostModel.initialCostModel(),
    ),
    walletProvider: {
      getCoinPublicKey: () => walletAddresses.shieldedCoinPublicKey as never,
      getEncryptionPublicKey: () => walletAddresses.shieldedEncryptionPublicKey as never,
      async balanceTx(tx) {
        const balanced = await api.balanceUnsealedTransaction(toHex(tx.serialize()));
        return Transaction.deserialize('signature', 'proof', 'binding', fromHex(balanced.tx));
      },
    },
    midnightProvider: {
      async submitTx(tx) {
        await api.submitTransaction(toHex(tx.serialize()));
        const identifiers = tx.identifiers();
        if (!identifiers[0]) throw new Error('Wallet submitted the transaction without an identifier.');
        return identifiers[0];
      },
    },
  };
}

async function attach(
  api: ConnectedAPI,
  contractAddress: string,
  state: PrivateState,
) {
  const providers = await buildProviders(api, contractAddress);
  const existing = await providers.privateStateProvider.get(PRIVATE_STATE_ID);
  if (!existing) await providers.privateStateProvider.set(PRIVATE_STATE_ID, state);

  const contract = await findDeployedContract(providers, {
    compiledContract,
    contractAddress,
    privateStateId: PRIVATE_STATE_ID,
  });
  return { contract, providers };
}

export async function deployMidnightPass(
  api: ConnectedAPI,
  state: PrivateState,
): Promise<ChainResult> {
  const providers = await buildProviders(api);
  providers.privateStateProvider.setContractAddress('pending-midnight-pass-deploy');

  const deployed = await deployContract(providers, {
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: state,
  });
  const result = deployed.deployTxData.public;
  localStorage.setItem(CONTRACT_STORAGE_KEY, result.contractAddress);
  return {
    contractAddress: result.contractAddress,
    txId: result.txId,
    blockHeight: result.blockHeight,
  };
}

export async function issueCredential(
  api: ConnectedAPI,
  contractAddress: string,
  state: PrivateState,
  credentialType: string,
): Promise<ChainResult & { commitment: string }> {
  const { contract, providers } = await attach(api, contractAddress, state);
  await providers.privateStateProvider.set(PRIVATE_STATE_ID, state);
  const holder = pureCircuits.publicKey(state.secretKey);
  const commitment = pureCircuits.credentialCommitment(
    holder,
    state.credSecret,
    state.credNonce,
    encodeBytes32(credentialType),
  );
  const result = await contract.callTx.issueCredential(commitment);
  return {
    contractAddress,
    txId: result.public.txId,
    blockHeight: result.public.blockHeight,
    commitment: bytesToHex(commitment),
  };
}

export async function verifyEligibility(
  api: ConnectedAPI,
  contractAddress: string,
  state: PrivateState,
  credentialType: string,
): Promise<ChainResult & { commitment: string; nullifier: string }> {
  const { contract, providers } = await attach(api, contractAddress, state);
  await providers.privateStateProvider.set(PRIVATE_STATE_ID, state);
  const credentialTypeBytes = encodeBytes32(credentialType);
  const holder = pureCircuits.publicKey(state.secretKey);
  const commitment = pureCircuits.credentialCommitment(
    holder,
    state.credSecret,
    state.credNonce,
    credentialTypeBytes,
  );
  const nullifier = pureCircuits.nullifierHash(
    holder,
    state.credSecret,
    state.credNonce,
    credentialTypeBytes,
  );
  const result = await contract.callTx.verifyEligibility(credentialTypeBytes);
  return {
    contractAddress,
    txId: result.public.txId,
    blockHeight: result.public.blockHeight,
    commitment: bytesToHex(commitment),
    nullifier: bytesToHex(nullifier),
  };
}

export function configuredContractAddress(): string {
  return localStorage.getItem(CONTRACT_STORAGE_KEY)
    ?? import.meta.env.VITE_MIDNIGHT_CONTRACT_ADDRESS?.trim()
    ?? PREPROD_CONTRACT_ADDRESS;
}
