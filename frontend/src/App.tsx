import { useState } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  Lock, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  Cpu, 
  Layers, 
  ExternalLink,
  Sparkles,
  RefreshCw
} from 'lucide-react';

import type { ConnectedAPI, InitialAPI } from '@midnight-ntwrk/dapp-connector-api';
import {
  configuredContractAddress,
  createPrivateState,
  deployMidnightPass,
  issueCredential,
  verifyEligibility,
} from './midnight';

const PREPROD_FAUCET_URL = "https://midnight-tmnight-preprod.nethermind.dev/";
function formatDust(amount: bigint): string {
  const whole = amount / 1_000_000_000_000_000n;
  const fraction = (amount % 1_000_000_000_000_000n).toString().padStart(15, "0");
  return `${whole.toLocaleString()}.${fraction}`;
}

function randomCredentialValue(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${suffix}`;
}

function findMidnightWallet(): InitialAPI | undefined {
  const wallets = Object.values(window.midnight ?? {});
  const matches = (wallet: InitialAPI, value: string) => {
    const identity = `${wallet.name} ${wallet.rdns}`.toLowerCase();
    return identity.includes(value);
  };

  return wallets.find((wallet) => matches(wallet, "1am"))
    ?? wallets.find((wallet) => matches(wallet, "lace"))
    ?? wallets[0];
}

export default function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletName, setWalletName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [connectedApi, setConnectedApi] = useState<ConnectedAPI | null>(null);
  const [contractAddress, setContractAddress] = useState(configuredContractAddress);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<string | null>(null);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [dustBalance, setDustBalance] = useState<bigint | null>(null);
  const [dustCap, setDustCap] = useState<bigint | null>(null);
  const [dustAddress, setDustAddress] = useState("");
  const [unshieldedBalances, setUnshieldedBalances] = useState<Array<[string, bigint]>>([]);
  const [activeTab, setActiveTab] = useState<'holder' | 'issuer' | 'privacy'>('holder');
  
  // Holder Form State
  const [selectedGate, setSelectedGate] = useState("age18");
  const [userSecret, setUserSecret] = useState("holder_private_secret_9942");
  const [userNonce, setUserNonce] = useState("credential_salt_nonce_1883");
  const [isProving, setIsProving] = useState(false);
  const [proofResult, setProofResult] = useState<{
    success: boolean;
    nullifier?: string;
    commitment?: string;
    gasCost?: string;
    txId?: string;
    blockHeight?: number;
    message?: string;
    timestamp?: string;
  } | null>(null);

  // Issuer Form State
  const [issueStatus, setIssueStatus] = useState<string | null>(null);

  const hasConfiguredContract = /^[0-9a-fA-F]{64}$/.test(contractAddress.replace(/^0x/, ''));

  // Connect a browser wallet via the Midnight DApp Connector API.
  const handleConnectWallet = async () => {
    setWalletError(null);

    const wallet = findMidnightWallet();
    if (!wallet) {
      const availableWallets = Object.values(window.midnight ?? {})
        .map((wallet) => wallet.name)
        .filter(Boolean);
      const detail = availableWallets.length > 0
        ? ` Detected wallet providers: ${availableWallets.join(", ")}.`
        : "";
      setWalletError(`No Midnight-compatible wallet was detected in this browser.${detail}`);
      return;
    }

    try {
      const api = await wallet.connect("preprod");
      if (typeof api.hintUsage === "function") {
        await api.hintUsage(["getConnectionStatus", "getShieldedAddresses"]);
      }
      const [connection, address, dust, dustAddressResult, balances] = await Promise.all([
        api.getConnectionStatus(),
        api.getShieldedAddresses(),
        api.getDustBalance(),
        api.getDustAddress(),
        api.getUnshieldedBalances(),
      ]);

      if (connection.status !== "connected" || connection.networkId !== "preprod") {
        throw new Error("The wallet is not connected to Midnight Preprod.");
      }

      setConnectedApi(api);
      setWalletName(wallet.name);
      setWalletAddress(address.shieldedAddress);
      setDustBalance(dust.balance);
      setDustCap(dust.cap);
      setDustAddress(dustAddressResult.dustAddress);
      setUnshieldedBalances(Object.entries(balances));
      setWalletConnected(true);
    } catch (error) {
      setConnectedApi(null);
      setWalletName("");
      setWalletAddress("");
      setDustBalance(null);
      setDustCap(null);
      setDustAddress("");
      setUnshieldedBalances([]);
      setWalletConnected(false);
      setWalletError(error instanceof Error ? error.message : "Midnight wallet connection failed.");
    }
  };

  const handleDisconnectWallet = () => {
    setWalletConnected(false);
    setWalletAddress("");
    setConnectedApi(null);
    setWalletName("");
    setDustBalance(null);
    setDustCap(null);
    setDustAddress("");
    setUnshieldedBalances([]);
    setWalletError(null);
  };

  const generateCredentialData = () => {
    setUserSecret(randomCredentialValue("holder"));
    setUserNonce(randomCredentialValue("nonce"));
    setProofResult(null);
    setIssueStatus(null);
  };

  const refreshDustBalance = async () => {
    if (!connectedApi) return;

    try {
      const [dust, balances] = await Promise.all([
        connectedApi.getDustBalance(),
        connectedApi.getUnshieldedBalances(),
      ]);
      setDustBalance(dust.balance);
      setDustCap(dust.cap);
      setUnshieldedBalances(Object.entries(balances));
      setWalletError(null);
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Could not refresh DUST balance.");
    }
  };

  const handleDeployContract = async () => {
    if (!connectedApi) {
      setDeployStatus('Connect a Midnight wallet on Preprod first.');
      return;
    }
    if (!dustBalance || dustBalance <= 0n) {
      setDeployStatus('A positive Preprod DUST balance is required to deploy.');
      return;
    }

    setIsDeploying(true);
    setDeployStatus('Generating the deployment proof, balancing, and submitting to Preprod...');
    try {
      const result = await deployMidnightPass(connectedApi, createPrivateState(userSecret, userNonce));
      setContractAddress(result.contractAddress);
      setDeployStatus(`Deployed in block ${result.blockHeight}. Transaction: ${result.txId}`);
    } catch (error) {
      setDeployStatus(`Deployment failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleRunZkProof = async () => {
    setIsProving(true);
    setProofResult(null);

    try {
      if (!connectedApi) throw new Error('Connect a Midnight wallet on Preprod first.');
      if (!hasConfiguredContract) throw new Error('Deploy or configure a verified Preprod contract first.');
      if (!dustBalance || dustBalance <= 0n) throw new Error('A positive DUST balance is required.');

      const result = await verifyEligibility(
        connectedApi,
        contractAddress.replace(/^0x/, ''),
        createPrivateState(userSecret, userNonce),
        selectedGate,
      );
      setProofResult({
        success: true,
        nullifier: result.nullifier,
        commitment: result.commitment,
        txId: result.txId,
        blockHeight: result.blockHeight,
        message: 'Eligibility proof finalized on Midnight Preprod.',
        timestamp: new Date().toLocaleTimeString()
      });

    } catch (err: any) {
      console.error("ZK Proof Execution Error:", err);
      setProofResult({
        success: false,
        message: `ZK Proof Execution Failed: ${err?.message || "Assertion error in Compact circuit"}`
      });
    } finally {
      setIsProving(false);
    }
  };

  const handleIssueCredential = async () => {
    if (!connectedApi) {
      setIssueStatus("Connect a Midnight wallet on Preprod before preparing an issuer transaction.");
      return;
    }

    if (!hasConfiguredContract) {
      setIssueStatus("No verified Preprod contract address is configured. Deploy first, then set VITE_MIDNIGHT_CONTRACT_ADDRESS.");
      return;
    }

    if (!dustBalance || dustBalance <= 0n) {
      setIssueStatus('A positive Preprod DUST balance is required.');
      return;
    }

    setIssueStatus('Generating proof and submitting issueCredential to Preprod...');
    try {
      const result = await issueCredential(
        connectedApi,
        contractAddress.replace(/^0x/, ''),
        createPrivateState(userSecret, userNonce),
        selectedGate,
      );
      setIssueStatus(`Credential issued in block ${result.blockHeight}. Transaction: ${result.txId}`);
    } catch (error) {
      setIssueStatus(`Credential issue failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a14] text-slate-100 font-sans flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight flex items-center gap-2">
              MidnightPass <span className="text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono">v1.0 Midnight.js</span>
            </h1>
            <p className="text-xs text-slate-400">Zero-Knowledge Confidential Credential Gate</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2 text-xs text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
            <span className={`w-2 h-2 rounded-full ${walletConnected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
            <span>Network: <strong className="text-slate-200 font-mono">Preprod</strong></span>
          </div>

          {walletConnected ? (
            <div className="flex items-center space-x-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-mono text-emerald-400">{walletName || 'Midnight Wallet'} Connected</p>
                <p className="text-xs text-slate-400 font-mono">{walletAddress.slice(0, 10)}...{walletAddress.slice(-4)}</p>
              </div>
              <button 
                onClick={handleDisconnectWallet}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={handleConnectWallet}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-indigo-600/30 transition"
            >
              <Wallet className="w-4 h-4" />
              <span>Connect Midnight Wallet</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">
        {walletError && (
          <div className="border border-red-500/40 bg-red-950/30 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{walletError}</span>
          </div>
        )}
        
        {/* Banner */}
        <section className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-cyan-950/40 border border-indigo-800/40 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
          <div className="max-w-2xl space-y-3 z-10 relative">
            <div className="inline-flex items-center space-x-2 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-xs px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Midnight Network Privacy-First Architecture</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Prove your eligibility without disclosing your identity.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              MidnightPass leverages Compact zero-knowledge circuits and nullifiers. Your personal credentials remain completely private in off-chain witnesses; only a single-use ZK nullifier is published to the public ledger.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-cyan-400" /> Private Input: Witness
              </span>
              <span className="flex items-center gap-1.5">
                <EyeOff className="w-3.5 h-3.5 text-indigo-400" /> Zero Linkability
              </span>
              <span className="flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Compact 0.31.1 ZK Circuit
              </span>
            </div>
          </div>
        </section>

        {/* Contract Info bar */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between text-xs font-mono gap-3">
          <div className="flex items-center space-x-2 text-slate-300">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Preprod Contract Address:</span>
            {hasConfiguredContract ? (
              <span className="text-cyan-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                {contractAddress.slice(0, 16)}...{contractAddress.slice(-12)}
              </span>
            ) : (
              <span className="text-amber-300 bg-amber-950/30 px-2 py-1 rounded border border-amber-800/60">
                Not deployed or not configured
              </span>
            )}
          </div>
          <a 
            href={PREPROD_FAUCET_URL} 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 underline"
          >
            <span>tNight Preprod Faucet</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {!hasConfiguredContract && (
          <div className="border border-amber-800/60 bg-amber-950/20 px-4 py-3 space-y-3 text-xs font-mono">
            <p className="text-amber-200">No verified MidnightPass contract is attached to this Preprod session.</p>
            <button
              type="button"
              onClick={handleDeployContract}
              disabled={isDeploying || !walletConnected}
              className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white"
            >
              <Layers className="w-4 h-4" />
              <span>{isDeploying ? 'Deploying on Preprod...' : 'Deploy MidnightPass Contract'}</span>
            </button>
            {deployStatus && <p className="text-slate-300 break-all">{deployStatus}</p>}
          </div>
        )}

        {walletConnected && (
          <div className="border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-center justify-between gap-3 text-xs font-mono">
            <div className="text-slate-300 space-y-1">
              <div>
                Preprod DUST: <strong className={dustBalance && dustBalance > 0n ? "text-emerald-400" : "text-amber-300"}>
                  {dustBalance === null ? "Checking..." : formatDust(dustBalance)}
                </strong>
              </div>
              <div className="text-slate-500">
                DUST cap: {dustCap === null ? "Checking..." : formatDust(dustCap)}
              </div>
              {dustAddress && (
                <div className="text-slate-500 break-all">
                  DUST address: <span className="text-slate-300">{dustAddress}</span>
                </div>
              )}
              <div className="text-slate-500">
                Unshielded token entries: {unshieldedBalances.length}
              </div>
              {unshieldedBalances.length > 0 && (
                <div className="text-slate-500 break-all">
                  Reported balances: {unshieldedBalances.map(([token, balance]) => `${token.slice(0, 12)}...=${balance}`).join(", ")}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={refreshDustBalance}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700"
              title="Refresh DUST balance"
              aria-label="Refresh DUST balance"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-800 flex space-x-4">
          <button
            onClick={() => setActiveTab('holder')}
            className={`pb-3 text-sm font-medium flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'holder' 
                ? 'border-cyan-400 text-cyan-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>1. Gate Verification (User)</span>
          </button>

          <button
            onClick={() => setActiveTab('issuer')}
            className={`pb-3 text-sm font-medium flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'issuer' 
                ? 'border-indigo-400 text-indigo-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>2. Issue Credential (Admin)</span>
          </button>

          <button
            onClick={() => setActiveTab('privacy')}
            className={`pb-3 text-sm font-medium flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'privacy' 
                ? 'border-indigo-400 text-indigo-400' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <EyeOff className="w-4 h-4" />
            <span>3. Privacy Model Audit</span>
          </button>
        </div>

        {/* TAB 1: HOLDER VERIFICATION */}
        {activeTab === 'holder' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  Select Gate & Execute ZK Witness Circuit
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Your private secret and nonce remain in local private state. Your wallet generates the proof and submits the resulting transaction.
                </p>
              </div>

              {/* Gate Select */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider">Credential Gate Target</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'age18', title: 'Age 18+ Gate', desc: 'Prove age >= 18 without date of birth' },
                    { id: 'daoVoter', title: 'DAO Member Gate', desc: 'Prove voting right without address' },
                    { id: 'payrollPass', title: 'Confidential Pass', desc: 'Prove tier authorization' },
                  ].map((gate) => (
                    <button
                      key={gate.id}
                      onClick={() => setSelectedGate(gate.id)}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                        selectedGate === gate.id 
                          ? 'bg-cyan-950/40 border-cyan-500/50 text-white' 
                          : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-medium text-sm text-slate-200">{gate.title}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{gate.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Witness Inputs */}
              <div className="space-y-4 bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" /> Off-Chain Witness Parameters (Private Inputs)
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono">
                      Local Only — Never Sent to Chain
                    </span>
                    <button
                      type="button"
                      onClick={generateCredentialData}
                      className="inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-mono text-cyan-300 border border-cyan-700/60 bg-cyan-950/30 hover:bg-cyan-900/40 rounded transition"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Generate New Data</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <label className="text-slate-400 block mb-1">Holder Secret Key (Witness)</label>
                    <input 
                      type="password" 
                      value={userSecret} 
                      onChange={(e) => setUserSecret(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500" 
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Credential Nonce (Salt)</label>
                    <input 
                      type="text" 
                      value={userNonce} 
                      onChange={(e) => setUserNonce(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-500" 
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleRunZkProof}
                disabled={isProving}
                className={`w-full py-3.5 px-4 rounded-xl font-medium text-sm flex items-center justify-center space-x-2 shadow-lg transition ${
                  isProving 
                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/20'
                }`}
              >
                {isProving ? (
                  <>
                    <Cpu className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>Executing Contract.circuits.verifyEligibility() ZK Proof...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Generate Proof & Submit to Preprod</span>
                  </>
                )}
              </button>

              {/* Proof Result Output */}
              {proofResult && (
                <div className={`p-4 rounded-xl border space-y-3 font-mono text-xs ${
                  proofResult.success 
                    ? 'bg-emerald-950/30 border-emerald-500/40' 
                    : 'bg-red-950/30 border-red-500/40'
                }`}>
                  <div className={`flex items-center font-semibold space-x-2 ${
                    proofResult.success ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {proofResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{proofResult.message}</span>
                  </div>
                  {proofResult.success && (
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 text-slate-300">
                      <div><strong className="text-slate-400">Status:</strong> <span className="text-emerald-400">PREPROD TRANSACTION FINALIZED</span></div>
                      <div><strong className="text-slate-400">Transaction:</strong> <span className="text-cyan-300 break-all">{proofResult.txId}</span></div>
                      <div><strong className="text-slate-400">Block:</strong> {proofResult.blockHeight}</div>
                      <div><strong className="text-slate-400">Computed Commitment:</strong> <span className="text-indigo-300 break-all">{proofResult.commitment}</span></div>
                      <div><strong className="text-slate-400">Computed Nullifier:</strong> <span className="text-cyan-300 break-all">{proofResult.nullifier}</span></div>
                      <div><strong className="text-slate-400">Timestamp:</strong> {proofResult.timestamp}</div>
                      <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                        The nullifier was written to the deployed contract. Reusing the same private credential will be rejected on-chain.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar Inspector */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
              <h4 className="font-semibold text-white text-sm flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-400" />
                ZK Circuit Execution Inspector
              </h4>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 font-mono">
                  <span className="text-indigo-400 block text-[11px]">Compact Pure Circuit</span>
                  <p className="text-slate-300">credentialCommitment(holder, secret, nonce, credType)</p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 font-mono">
                  <span className="text-cyan-400 block text-[11px]">Compact Witness Function</span>
                  <p className="text-slate-300">witness localSecretKey(): Bytes&lt;32&gt;</p>
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 font-mono">
                  <span className="text-emerald-400 block text-[11px]">Disclose Boundary</span>
                  <p className="text-slate-300">disclose(nullifierHash)</p>
                  <p className="text-[10px] text-slate-400 mt-1">Holder identity & secret remain unrevealed.</p>
                </div>
              </div>

              <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-xs text-indigo-300 leading-relaxed">
                💡 <strong>How it works:</strong> The ZK proof confirms you possess a secret matching an issued commitment without revealing which commitment is yours.
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ISSUER ADMIN */}
        {activeTab === 'issuer' && (
          <div className="max-w-2xl bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                Issue Credential On-Chain
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Only the authorized issuer matching public key <code className="text-indigo-300">issuer</code> on a deployed contract can commit credentials.
              </p>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <p className="text-slate-400 leading-relaxed">
                The commitment is derived locally from the private credential and submitted to the deployed Preprod contract.
              </p>
              <button
                onClick={handleIssueCredential}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-indigo-600/20"
              >
                Generate Proof & Issue Credential
              </button>

              {issueStatus && (
                <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-lg text-indigo-300 font-mono text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span>{issueStatus}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PRIVACY AUDIT */}
        {activeTab === 'privacy' && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <EyeOff className="w-5 h-5 text-indigo-400" />
                Public Ledger vs Private Witness Boundary Analysis
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Formal analysis of observable state on Midnight ledger vs hidden witness variables.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Public Ledger */}
              <div className="bg-slate-950 border border-indigo-900/40 rounded-xl p-5 space-y-3">
                <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
                  <Layers className="w-4 h-4" />
                  <span>On-Chain Public Ledger (Disclosed State)</span>
                </div>
                <ul className="space-y-2 text-xs font-mono text-slate-300">
                  <li className="flex items-start gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-emerald-400">✓</span>
                    <div>
                      <strong className="text-indigo-300">export ledger issuer: Bytes&lt;32&gt;</strong>
                      <p className="text-[11px] text-slate-400">Public key of the issuing authority.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-emerald-400">✓</span>
                    <div>
                      <strong className="text-indigo-300">credentials: Map&lt;Bytes&lt;32&gt;, Boolean&gt;</strong>
                      <p className="text-[11px] text-slate-400">Set of valid credential commitments.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-emerald-400">✓</span>
                    <div>
                      <strong className="text-indigo-300">nullifiers: Map&lt;Bytes&lt;32&gt;, Boolean&gt;</strong>
                      <p className="text-[11px] text-slate-400">Nullifier hashes preventing double-use.</p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Private Witness */}
              <div className="bg-slate-950 border border-cyan-900/40 rounded-xl p-5 space-y-3">
                <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Off-Chain Private Witness (Hidden State)</span>
                </div>
                <ul className="space-y-2 text-xs font-mono text-slate-300">
                  <li className="flex items-start gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-cyan-400">🔒</span>
                    <div>
                      <strong className="text-cyan-300">witness localSecretKey()</strong>
                      <p className="text-[11px] text-slate-400">Holder private key. Never disclosed.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-cyan-400">🔒</span>
                    <div>
                      <strong className="text-cyan-300">witness getCredentialSecret()</strong>
                      <p className="text-[11px] text-slate-400">Preimage secret used in commitment.</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2 bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-cyan-400">🔒</span>
                    <div>
                      <strong className="text-cyan-300">witness getCredentialNonce()</strong>
                      <p className="text-[11px] text-slate-400">Random salt ensuring zero linkability.</p>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#070a14] py-6 px-6 text-center text-xs text-slate-500 font-mono">
        MidnightPass • Built for New Moon to Full: Monthly Moonshots on Midnight • Levels 1-3 Submission
      </footer>
    </div>
  );
}
