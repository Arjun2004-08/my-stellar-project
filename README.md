# 🏛️ Governance Token Platform

> A fully on-chain, decentralized governance system built on **Stellar** using **Soroban** smart contracts. Token holders vote on proposals, delegate their power, and drive protocol decisions — all enforced trustlessly by the contract.

---

## 📋 Table of Contents

- [Project Description](#-project-description)
- [What It Does](#-what-it-does)
- [Features](#-features)
- [Contract Architecture](#-contract-architecture)
- [Getting Started](#-getting-started)
- [Deployment](#-deployment)
- [Deployed Smart Contract](#-deployed-smart-contract)
- [Usage Examples](#-usage-examples)
- [Testing](#-testing)
- [Governance Parameters](#-governance-parameters)
- [Events](#-events)
- [Security Considerations](#-security-considerations)
- [License](#-license)

---

## 📖 Project Description

The **Governance Token Platform** is a production-ready smart contract written in Rust for the [Soroban](https://soroban.stellar.org/) smart contract environment on Stellar. It combines an **ERC-20-style governance token** with a complete **on-chain proposal and voting system**, giving communities the tools to collectively manage protocols, treasuries, and parameter changes in a transparent, censorship-resistant way.

Every governance action — minting, burning, delegating, proposing, voting, and executing — is recorded on the Stellar ledger and emitted as a contract event, providing a full, auditable history of community decisions.

---

## ⚙️ What It Does

```
Token Holder
    │
    ├─► Transfer / Mint / Burn tokens
    │
    ├─► Delegate voting power to another address
    │
    └─► Governance Lifecycle
            │
            ├─[1]─► create_proposal()  ──► Proposal stored on-chain
            │
            ├─[2]─► vote()             ──► For / Against / Abstain
            │         (within voting window after delay)
            │
            ├─[3]─► finalize_proposal() ─► Passed / Rejected (quorum check)
            │
            └─[4]─► execute_proposal()  ─► Executed (admin marks done)
```

1. **Token management** — deploy with an initial supply; the admin can mint or burn tokens; anyone can transfer freely (locked tokens excluded).
2. **Delegation** — lock tokens and lend your voting weight to a trusted delegate without giving up token ownership.
3. **Proposal creation** — any token holder can author a text proposal (title + description). A configurable delay prevents flash-loan style attacks before voting begins.
4. **Voting** — every holder (or their delegate) casts a weighted vote during the open period. Votes are final once cast.
5. **Finalization** — anyone can trigger finalization after the period ends; the contract computes quorum and majority automatically.
6. **Execution** — admin marks passed proposals as executed, signalling off-chain systems to act (e.g., treasury release, parameter change).

---

## ✨ Features

### 🪙 Governance Token
| Feature | Detail |
|---|---|
| **Transferable** | Standard peer-to-peer transfers with balance validation |
| **Mintable** | Admin-controlled minting for rewards, grants, or genesis distributions |
| **Burnable** | Token holders can burn their own tokens to reduce supply |
| **Supply tracking** | Accurate `total_supply` updated on every mint/burn |

### 🗳️ Voting & Delegation
| Feature | Detail |
|---|---|
| **Weighted votes** | Voting power = own available balance + delegated power |
| **Delegation** | Delegate any amount to a third party; tokens are locked during delegation |
| **Undelegation** | Remove delegation at any time to reclaim voting power |
| **Double-vote guard** | On-chain mapping prevents the same address from voting twice on a proposal |
| **Vote transparency** | All vote choices queryable on-chain |

### 📜 Proposal System
| Feature | Detail |
|---|---|
| **Rich proposals** | Each proposal stores title, description, proposer, and full vote tallies |
| **Configurable delay** | `vote_delay_ledgers` enforces a waiting period before voting starts |
| **Configurable period** | `vote_period_ledgers` sets how long voting stays open |
| **Quorum enforcement** | Configurable `quorum_percentage` (1–100) — rejects proposals with too low participation |
| **Multi-status lifecycle** | `Active → Passed/Rejected → Executed` or `Active → Cancelled` |
| **Cancellation** | Proposer or admin can cancel active proposals |

### 🔐 Access Control
| Feature | Detail |
|---|---|
| **Admin role** | Single privileged address for minting, executing, and parameter changes |
| **Admin transfer** | Ownership can be handed off to a multisig or DAO contract |
| **`require_auth()`** | All state-changing calls require the appropriate Soroban auth check |

### 🔧 Governance Parameters
| Parameter | Default | Description |
|---|---|---|
| `quorum_percentage` | 10% | Minimum participation required for a vote to be valid |
| `vote_delay_ledgers` | 50 | Ledgers between proposal creation and voting start |
| `vote_period_ledgers` | 200 | Ledgers the voting window stays open |

---

## 🏗️ Contract Architecture

```
governance-token-platform/
├── Cargo.toml                  # Soroban workspace config
├── src/
│   └── lib.rs                  # Main contract (token + governance)
└── tests/
    └── test.rs                 # Integration tests (17 test cases)
```

### Storage Layout

```
Instance Storage  (shared contract state)
├── ADMIN          → Address
├── TSUPPLY        → i128
├── PCOUNT         → u64
├── QUORUM         → u32
├── VDELAY         → u32
└── VPERIOD        → u32

Persistent Storage  (per-key, survives instance TTL)
├── Balance(Address)            → i128
├── Proposal(u64)               → Proposal { id, proposer, title, … }
├── Vote(u64, Address)          → VoteChoice
├── Delegate(Address)           → Address  (delegatee)
├── DelegatedPower(Address)     → i128
└── Locked(Address)             → i128
```

---

## 🚀 Getting Started

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add the WASM target
rustup target add wasm32-unknown-unknown

# Install Stellar CLI
cargo install --locked stellar-cli --features opt
```

### Clone & Build

```bash
git clone https://github.com/your-org/governance-token-platform.git
cd governance-token-platform

# Build optimised WASM
stellar contract build
```

The compiled contract will be at:
```
target/wasm32-unknown-unknown/release/governance_token_platform.wasm
```

---

## 🌐 Deployment

### 1 — Set up your network identity

```bash
# Generate a new keypair (or import existing)
stellar keys generate --global deployer --network testnet

# Fund via Friendbot (testnet only)
stellar keys fund deployer --network testnet
```

### 2 — Deploy the contract

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/governance_token_platform.wasm \
  --source deployer \
  --network testnet
```

Copy the returned `CONTRACT_ID`.

### 3 — Initialize

```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin <YOUR_ADDRESS> \
  --initial_supply 10000000 \
  --quorum_percentage 10 \
  --vote_delay_ledgers 50 \
  --vote_period_ledgers 200
```

---

## 🔗 Deployed Smart Contract

| Network | Contract ID |
|---|---|
| **Stellar Testnet** | `CDDXARJ6RXV7MLE3SVLXWEGB56CWLZPZB5PGQ4GBWBVCVRMVZ6QTTB` |
| **Stellar Mainnet** | *Coming soon — pending security audit* |

> 🔍 **Explore on Stellar Explorer:**  
> [https://testnet.steexp.com/contract/CDDXARJ6RXV7MLE3SVLXWEGB56CWLZPZB5PGQ4GBWBVCVRMVZ6QTTB](https://testnet.steexp.com/contract/CDDXARJ6RXV7MLE3SVLXWEGB56CWLZPZB5PGQ4GBWBVCVRMVZ6QTTB)

---

## 💡 Usage Examples

### Transfer tokens

```bash
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet \
  -- transfer \
  --from <ALICE_ADDRESS> \
  --to <BOB_ADDRESS> \
  --amount 50000
```

### Delegate voting power

```bash
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet \
  -- delegate \
  --delegator <ALICE_ADDRESS> \
  --delegatee <BOB_ADDRESS> \
  --amount 25000
```

### Create a proposal

```bash
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet \
  -- create_proposal \
  --proposer <ALICE_ADDRESS> \
  --title "Increase treasury allocation" \
  --description "Allocate 5% of monthly fees to the grants program"
```

### Cast a vote

```bash
# VoteChoice: 0 = For, 1 = Against, 2 = Abstain
stellar contract invoke --id <CONTRACT_ID> --source bob --network testnet \
  -- vote \
  --voter <BOB_ADDRESS> \
  --proposal_id 0 \
  --choice '{"For": {}}'
```

### Finalize & execute

```bash
# Finalize (anyone can call after voting period ends)
stellar contract invoke --id <CONTRACT_ID> --source alice --network testnet \
  -- finalize_proposal --proposal_id 0

# Execute (admin only, after proposal passes)
stellar contract invoke --id <CONTRACT_ID> --source deployer --network testnet \
  -- execute_proposal --proposal_id 0
```

### Query state

```bash
# Check balance
stellar contract invoke --id <CONTRACT_ID> --network testnet \
  -- balance_of --account <ADDRESS>

# Check voting power
stellar contract invoke --id <CONTRACT_ID> --network testnet \
  -- voting_power --account <ADDRESS>

# Fetch a proposal
stellar contract invoke --id <CONTRACT_ID> --network testnet \
  -- get_proposal --proposal_id 0
```

---

## 🧪 Testing

The test suite covers 17 scenarios across token operations, delegation, and the full governance lifecycle.

```bash
# Run all tests
cargo test

# Run with output
cargo test -- --nocapture

# Run a specific test
cargo test test_finalize_passed_proposal
```

| Test | What It Validates |
|---|---|
| `test_initialize` | Correct admin, supply, and balance after init |
| `test_transfer` | Token moves correctly between accounts |
| `test_transfer_insufficient` | Panics on overdraft |
| `test_mint` | Supply and balance increase |
| `test_burn` | Supply and balance decrease |
| `test_delegate_and_voting_power` | Locked tokens + delegated power calculation |
| `test_undelegate` | Full power restoration after removal |
| `test_create_and_vote_proposal` | Proposal creation + weighted votes |
| `test_double_vote_rejected` | Prevents second vote from same address |
| `test_finalize_passed_proposal` | Majority + quorum → Passed |
| `test_finalize_rejected_below_quorum` | Low turnout → Rejected |
| `test_execute_proposal` | Passed → Executed transition |
| `test_cancel_proposal` | Proposer cancels active proposal |
| `test_update_params` | Admin updates governance settings |
| `test_transfer_admin` | Admin ownership hand-off |

---

## 📡 Events

All state changes emit Soroban events for off-chain indexers and frontends:

| Event Topic | Data | When |
|---|---|---|
| `(init, admin)` | `(Address, i128)` | Contract initialised |
| `(transfer,)` | `(from, to, amount)` | Tokens transferred |
| `(mint,)` | `(Address, i128)` | Tokens minted |
| `(burn,)` | `(Address, i128)` | Tokens burned |
| `(delegate,)` | `(delegator, delegatee, amount)` | Delegation created |
| `(undelegat,)` | `(delegator, delegatee)` | Delegation removed |
| `(proposal,)` | `(proposer, id, start, end)` | Proposal created |
| `(vote,)` | `(voter, proposal_id, power)` | Vote cast |
| `(finalize,)` | `(id, total_votes, status)` | Proposal finalized |
| `(execute,)` | `proposal_id` | Proposal executed |
| `(cancel,)` | `proposal_id` | Proposal cancelled |
| `(newadmin,)` | `Address` | Admin transferred |

---

## 🔒 Security Considerations

- **All mutating functions** call `require_auth()` on the relevant signer — Soroban enforces this at the VM level.
- **Locked tokens** during delegation cannot be transferred or burned, preventing double-spend voting exploits.
- **Vote-delay period** gives token holders time to acquire or delegate before voting begins, mitigating flash-loan governance attacks.
- **Quorum requirement** prevents a small, coordinated minority from passing proposals during low participation.
- **Double-vote guard** is stored in persistent storage, surviving across ledger boundaries.
- **No cross-contract calls** in this version — eliminates re-entrancy vectors.

> ⚠️ This contract has **not yet been audited**. Use on mainnet only after a professional security review.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for full terms.

---

<div align="center">

Built with ❤️ on [Stellar](https://stellar.org) · Powered by [Soroban](https://soroban.stellar.org)

</div>
