#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, String, Symbol, Vec};

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub id: u32,
    pub title: String,
    pub description: String,
    pub execution_data: String,
    pub creator: Address,
    pub yes_votes: i128,
    pub no_votes: i128,
    pub voters: Vec<Address>,
    pub created_at: u64,
    pub deadline: u64,
    pub executed: bool,
}

#[contracttype]
pub enum DataKey {
    Proposals,
    NextId,
    VoteTracker,
}

const VOTING_WINDOW_SECONDS: u64 = 86400; // 24 hours

#[contract]
pub struct Dao;

#[contractimpl]
impl Dao {
    pub fn create_proposal(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        execution_data: String,
    ) -> u32 {
        creator.require_auth();
        let next_id: u32 = env.storage().instance().get(&DataKey::NextId).unwrap_or(0);

        let deadline = env.ledger().timestamp() + VOTING_WINDOW_SECONDS;

        let proposal = Proposal {
            id: next_id,
            title,
            description,
            execution_data,
            creator,
            yes_votes: 0,
            no_votes: 0,
            voters: Vec::new(&env),
            created_at: env.ledger().timestamp(),
            deadline,
            executed: false,
        };

        let mut proposals: Map<u32, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .unwrap_or_else(|| Map::new(&env));
        proposals.set(next_id, proposal);
        env.storage()
            .instance()
            .set(&DataKey::Proposals, &proposals);
        env.storage()
            .instance()
            .set(&DataKey::NextId, &(next_id + 1));

        next_id
    }

    pub fn vote(env: Env, voter: Address, proposal_id: u32, support: bool) {
        voter.require_auth();

        let mut proposals: Map<u32, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .unwrap_or_else(|| Map::new(&env));

        let mut proposal = proposals.get(proposal_id).expect("proposal not found");

        assert!(
            env.ledger().timestamp() <= proposal.deadline,
            "voting period has ended"
        );
        assert!(
            env.ledger().timestamp() >= proposal.created_at,
            "proposal not yet active"
        );
        assert!(!proposal.executed, "proposal already executed");

        // Check if voter already voted
        let mut already_voted = false;
        for v in proposal.voters.iter() {
            if v == voter {
                already_voted = true;
                break;
            }
        }
        assert!(!already_voted, "already voted");

        proposal.voters.push_back(voter.clone());

        if support {
            proposal.yes_votes += 1;
        } else {
            proposal.no_votes += 1;
        }

        proposals.set(proposal_id, proposal);
        env.storage()
            .instance()
            .set(&DataKey::Proposals, &proposals);
    }

    pub fn execute(env: Env, proposal_id: u32) {
        let mut proposals: Map<u32, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .unwrap_or_else(|| Map::new(&env));

        let mut proposal = proposals.get(proposal_id).expect("proposal not found");

        assert!(
            env.ledger().timestamp() > proposal.deadline,
            "voting period not yet ended"
        );
        assert!(!proposal.executed, "already executed");
        assert!(
            proposal.yes_votes > proposal.no_votes,
            "proposal did not pass"
        );

        proposal.executed = true;
        let yes_votes = proposal.yes_votes;
        let no_votes = proposal.no_votes;
        proposals.set(proposal_id, proposal);
        env.storage()
            .instance()
            .set(&DataKey::Proposals, &proposals);

        env.events().publish(
            (Symbol::new(&env, "executed"),),
            (proposal_id, yes_votes, no_votes),
        );
    }

    pub fn get_proposal(env: Env, proposal_id: u32) -> Proposal {
        let proposals: Map<u32, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .unwrap_or_else(|| Map::new(&env));
        proposals.get(proposal_id).expect("proposal not found")
    }

    pub fn get_proposal_count(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::NextId).unwrap_or(0)
    }

    pub fn has_voted(env: Env, voter: Address, proposal_id: u32) -> bool {
        let proposals: Map<u32, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .unwrap_or_else(|| Map::new(&env));
        let proposal = match proposals.get(proposal_id) {
            Some(p) => p,
            None => return false,
        };
        for v in proposal.voters.iter() {
            if v == voter {
                return true;
            }
        }
        false
    }

    pub fn get_active_proposals(env: Env) -> Vec<Proposal> {
        let proposals: Map<u32, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .unwrap_or_else(|| Map::new(&env));
        let now = env.ledger().timestamp();
        let mut active: Vec<Proposal> = Vec::new(&env);
        for (_, p) in proposals.iter() {
            if !p.executed && now <= p.deadline {
                active.push_back(p);
            }
        }
        active
    }

    pub fn get_all_proposals(env: Env) -> Vec<Proposal> {
        let proposals: Map<u32, Proposal> = env
            .storage()
            .instance()
            .get(&DataKey::Proposals)
            .unwrap_or_else(|| Map::new(&env));
        let mut all: Vec<Proposal> = Vec::new(&env);
        for (_, p) in proposals.iter() {
            all.push_back(p);
        }
        all
    }
}

mod test;
