#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, symbol_short, Symbol};

const ADMIN: Symbol = symbol_short!("ADMIN");

#[contracttype]
pub enum DataKey {
    Balance(Address),
    Proposal(u32),
    Vote(u32, Address),
    Count,
}

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub id: u32,
    pub title: String,
    pub votes: u32,
}

#[contract]
pub struct GovernanceContract;

#[contractimpl]
impl GovernanceContract {

    // Set up the contract with an admin and give them tokens
    pub fn init(env: Env, admin: Address, supply: i128) {
        admin.require_auth();
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().persistent().set(&DataKey::Balance(admin), &supply);
    }

    // Send tokens to another address
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        let from_bal: i128 = env.storage().persistent()
            .get(&DataKey::Balance(from.clone())).unwrap_or(0);

        if from_bal < amount {
            panic!("not enough tokens");
        }

        let to_bal: i128 = env.storage().persistent()
            .get(&DataKey::Balance(to.clone())).unwrap_or(0);

        env.storage().persistent().set(&DataKey::Balance(from), &(from_bal - amount));
        env.storage().persistent().set(&DataKey::Balance(to), &(to_bal + amount));
    }

    // Create a new proposal
    pub fn propose(env: Env, proposer: Address, title: String) -> u32 {
        proposer.require_auth();

        let id: u32 = env.storage().instance().get(&DataKey::Count).unwrap_or(0);

        let proposal = Proposal { id, title, votes: 0 };

        env.storage().persistent().set(&DataKey::Proposal(id), &proposal);
        env.storage().instance().set(&DataKey::Count, &(id + 1));

        id
    }

    // Vote on a proposal (one vote per address)
    pub fn vote(env: Env, voter: Address, proposal_id: u32) {
        voter.require_auth();

        if env.storage().persistent().has(&DataKey::Vote(proposal_id, voter.clone())) {
            panic!("already voted");
        }

        let mut proposal: Proposal = env.storage().persistent()
            .get(&DataKey::Proposal(proposal_id)).expect("proposal not found");

        proposal.votes += 1;

        env.storage().persistent().set(&DataKey::Proposal(proposal_id), &proposal);
        env.storage().persistent().set(&DataKey::Vote(proposal_id, voter), &true);
    }

    // Read balance
    pub fn balance(env: Env, account: Address) -> i128 {
        env.storage().persistent().get(&DataKey::Balance(account)).unwrap_or(0)
    }

    // Read a proposal
    pub fn get_proposal(env: Env, proposal_id: u32) -> Proposal {
        env.storage().persistent()
            .get(&DataKey::Proposal(proposal_id)).expect("not found")
    }
}