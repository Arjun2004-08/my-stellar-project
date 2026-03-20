"use client";

import {
  Contract,
  Networks,
  TransactionBuilder,
  Keypair,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
  isAllowed,
  requestAccess,
} from "@stellar/freighter-api";

// ============================================================
// CONSTANTS — Update these with your deployed contract IDs
// ============================================================

/** Deployed GovernanceToken contract ID (G...) */
export const GOVERNANCE_TOKEN_ADDRESS =
  "GOV_TOKEN_CONTRACT_ID_HERE";

/** Deployed DAO contract ID (G...) */
export const DAO_ADDRESS =
  "DAO_CONTRACT_ID_HERE";

/** Network passphrase (testnet by default) */
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** Soroban RPC URL */
export const RPC_URL = "https://soroban-testnet.stellar.org";

/** Horizon URL */
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/** Network name for Freighter */
export const NETWORK = "TESTNET";

// ============================================================
// RPC Server Instance
// ============================================================

const server = new rpc.Server(RPC_URL);

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connResult = await isConnected();
  if (!connResult.isConnected) {
    throw new Error("Freighter extension is not installed or not available.");
  }

  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    await setAllowed();
    await requestAccess();
  }

  const { address } = await getAddress();
  if (!address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }
  return address;
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) return null;

    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) return null;

    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ============================================================
// Generic Contract Call Helpers
// ============================================================

async function buildAndSignTx(
  contractAddr: string,
  method: string,
  params: xdr.ScVal[] = [],
  caller: string,
  sign: boolean = true
) {
  const contract = new Contract(contractAddr);
  const account = await server.getAccount(caller);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  if (!sign) {
    return simulated;
  }

  const prepared = rpc.assembleTransaction(tx, simulated).build();
  const { signedTxXdr } = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const txToSubmit = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${result.status}`);
  }

  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain.");
  }

  return getResult;
}

export async function callContract(
  contractAddr: string,
  method: string,
  params: xdr.ScVal[] = [],
  caller: string,
  sign: boolean = true
) {
  return buildAndSignTx(contractAddr, method, params, caller, sign);
}

export async function readContract(
  contractAddr: string,
  method: string,
  params: xdr.ScVal[] = [],
  caller?: string
) {
  const account =
    caller || Keypair.random().publicKey();
  const sim = await callContract(contractAddr, method, params, account, false);
  if (
    rpc.Api.isSimulationSuccess(sim as rpc.Api.SimulateTransactionResponse) &&
    (sim as rpc.Api.SimulateTransactionSuccessResponse).result
  ) {
    return scValToNative(
      (sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
    );
  }
  return null;
}

// ============================================================
// ScVal Conversion Helpers
// ============================================================

export function toScValString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function toScValU32(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

export function toScValI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function toScValAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

export function toScValBool(value: boolean): xdr.ScVal {
  return nativeToScVal(value, { type: "bool" });
}

export function toScValSymbol(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "symbol" });
}

export function toScValU64(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

export function toScValI64(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i64" });
}

// ============================================================
// GovernanceToken Contract Methods
// ============================================================

/**
 * Mint governance tokens to an address. Anyone can mint to anyone.
 * Calls: mint(to: Address, amount: i128)
 */
export async function tokenMint(
  caller: string,
  to: string,
  amount: bigint
) {
  return callContract(
    GOVERNANCE_TOKEN_ADDRESS,
    "mint",
    [toScValAddress(to), toScValI128(amount)],
    caller,
    true
  );
}

/**
 * Transfer governance tokens between addresses.
 * Calls: transfer(from: Address, to: Address, amount: i128)
 */
export async function tokenTransfer(
  caller: string,
  from: string,
  to: string,
  amount: bigint
) {
  return callContract(
    GOVERNANCE_TOKEN_ADDRESS,
    "transfer",
    [toScValAddress(from), toScValAddress(to), toScValI128(amount)],
    caller,
    true
  );
}

/**
 * Get token balance for an address (read-only).
 * Calls: balance(owner: Address) -> i128
 */
export async function tokenBalance(owner: string, caller?: string) {
  return readContract(
    GOVERNANCE_TOKEN_ADDRESS,
    "balance",
    [toScValAddress(owner)],
    caller
  );
}

/**
 * Get total token supply (read-only).
 * Calls: total_supply() -> i128
 */
export async function tokenTotalSupply(caller?: string) {
  return readContract(GOVERNANCE_TOKEN_ADDRESS, "total_supply", [], caller);
}

// ============================================================
// DAO Contract Methods
// ============================================================

/**
 * Create a new governance proposal. Anyone can create.
 * Calls: create_proposal(creator: Address, title: String, description: String, execution_data: String) -> u32
 */
export async function daoCreateProposal(
  caller: string,
  title: string,
  description: string,
  executionData: string
) {
  return callContract(
    DAO_ADDRESS,
    "create_proposal",
    [
      toScValAddress(caller),
      toScValString(title),
      toScValString(description),
      toScValString(executionData),
    ],
    caller,
    true
  );
}

/**
 * Cast a vote on a proposal (yes or no). Anyone can vote once per proposal.
 * Calls: vote(voter: Address, proposal_id: u32, support: bool)
 */
export async function daoVote(
  caller: string,
  proposalId: number,
  support: boolean
) {
  return callContract(
    DAO_ADDRESS,
    "vote",
    [
      toScValAddress(caller),
      toScValU32(proposalId),
      toScValBool(support),
    ],
    caller,
    true
  );
}

/**
 * Execute a proposal after the voting period ends. Anyone can execute.
 * Calls: execute(proposal_id: u32)
 */
export async function daoExecute(caller: string, proposalId: number) {
  return callContract(
    DAO_ADDRESS,
    "execute",
    [toScValU32(proposalId)],
    caller,
    true
  );
}

/**
 * Get a single proposal by ID (read-only).
 * Returns: { id, title, description, execution_data, creator, yes_votes, no_votes, voters, created_at, deadline, executed }
 */
export async function daoGetProposal(proposalId: number, caller?: string) {
  return readContract(
    DAO_ADDRESS,
    "get_proposal",
    [toScValU32(proposalId)],
    caller
  );
}

/**
 * Get the total number of proposals (read-only).
 * Returns: u32
 */
export async function daoGetProposalCount(caller?: string) {
  return readContract(DAO_ADDRESS, "get_proposal_count", [], caller);
}

/**
 * Check if an address has voted on a proposal (read-only).
 * Returns: bool
 */
export async function daoHasVoted(voter: string, proposalId: number, caller?: string) {
  return readContract(
    DAO_ADDRESS,
    "has_voted",
    [toScValAddress(voter), toScValU32(proposalId)],
    caller
  );
}

/**
 * Get all active proposals (not yet executed and within voting window) (read-only).
 * Returns: Vec<Proposal>
 */
export async function daoGetActiveProposals(caller?: string) {
  return readContract(DAO_ADDRESS, "get_active_proposals", [], caller);
}

/**
 * Get all proposals (read-only).
 * Returns: Vec<Proposal>
 */
export async function daoGetAllProposals(caller?: string) {
  return readContract(DAO_ADDRESS, "get_all_proposals", [], caller);
}

export { nativeToScVal, scValToNative, Address, xdr };
