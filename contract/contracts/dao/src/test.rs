#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, String};

#[test]
fn test_create_proposal() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Dao, ());
    let client = DaoClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let id = client.create_proposal(
        &creator,
        &String::from_str(&env, "Fund Protocol Dev"),
        &String::from_str(&env, "Allocate 5000 tokens to dev fund"),
        &String::from_str(&env, "transfer 5000 to dev_wallet"),
    );

    assert_eq!(id, 0u32);
    let prop = client.get_proposal(&0u32);
    assert_eq!(prop.yes_votes, 0i128);
    assert_eq!(prop.no_votes, 0i128);
    assert!(!prop.executed);
}

#[test]
fn test_vote() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Dao, ());
    let client = DaoClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    let id = client.create_proposal(
        &creator,
        &String::from_str(&env, "Test Proposal"),
        &String::from_str(&env, "Description"),
        &String::from_str(&env, "data"),
    );

    client.vote(&alice, &id, &true);
    client.vote(&bob, &id, &false);

    let prop = client.get_proposal(&id);
    assert_eq!(prop.yes_votes, 1i128);
    assert_eq!(prop.no_votes, 1i128);
    assert!(!client.has_voted(&creator, &id));
    assert!(client.has_voted(&alice, &id));
    assert!(client.has_voted(&bob, &id));
}

#[test]
#[should_panic(expected = "already voted")]
fn test_double_vote_panics() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Dao, ());
    let client = DaoClient::new(&env, &contract_id);

    let creator = Address::generate(&env);
    let alice = Address::generate(&env);

    let id = client.create_proposal(
        &creator,
        &String::from_str(&env, "Test"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "data"),
    );

    client.vote(&alice, &id, &true);
    client.vote(&alice, &id, &false);
}

#[test]
fn test_multiple_proposals() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Dao, ());
    let client = DaoClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    client.create_proposal(
        &user,
        &String::from_str(&env, "Proposal 1"),
        &String::from_str(&env, "Desc 1"),
        &String::from_str(&env, "data1"),
    );
    client.create_proposal(
        &user,
        &String::from_str(&env, "Proposal 2"),
        &String::from_str(&env, "Desc 2"),
        &String::from_str(&env, "data2"),
    );

    assert_eq!(client.get_proposal_count(), 2u32);
    let all = client.get_all_proposals();
    assert_eq!(all.len(), 2u32);
}
