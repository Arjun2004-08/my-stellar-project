#![cfg(test)]
use super::*;
use soroban_sdk::testutils::Address as _;

#[test]
fn test_mint_and_balance() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(GovernanceToken, ());
    let client = GovernanceTokenClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    client.mint(&user, &1000i128);
    assert_eq!(client.balance(&user), 1000i128);
    assert_eq!(client.total_supply(), 1000i128);
}

#[test]
fn test_transfer() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(GovernanceToken, ());
    let client = GovernanceTokenClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    client.mint(&alice, &500i128);
    client.transfer(&alice, &bob, &200i128);
    assert_eq!(client.balance(&alice), 300i128);
    assert_eq!(client.balance(&bob), 200i128);
}

#[test]
fn test_multiple_mints() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(GovernanceToken, ());
    let client = GovernanceTokenClient::new(&env, &contract_id);

    let user = Address::generate(&env);
    client.mint(&user, &1000i128);
    client.mint(&user, &500i128);
    assert_eq!(client.balance(&user), 1500i128);
    assert_eq!(client.total_supply(), 1500i128);
}

#[test]
#[should_panic(expected = "insufficient balance")]
fn test_transfer_insufficient() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(GovernanceToken, ());
    let client = GovernanceTokenClient::new(&env, &contract_id);

    let alice = Address::generate(&env);
    let bob = Address::generate(&env);
    client.mint(&alice, &100i128);
    client.transfer(&alice, &bob, &200i128);
}
