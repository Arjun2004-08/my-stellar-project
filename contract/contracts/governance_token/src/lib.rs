#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map};

#[contracttype]
pub enum DataKey {
    Balances,
    TotalSupply,
}

#[contract]
pub struct GovernanceToken;

#[contractimpl]
impl GovernanceToken {
    pub fn mint(env: Env, to: Address, amount: i128) {
        to.require_auth();
        assert!(amount > 0, "amount must be positive");
        let mut balances: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::Balances)
            .unwrap_or_else(|| Map::new(&env));

        let bal = balances.get(to.clone()).unwrap_or(0);
        balances.set(to, bal + amount);
        env.storage().instance().set(&DataKey::Balances, &balances);

        let supply: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply + amount));
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        assert!(amount > 0, "amount must be positive");
        let mut balances: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::Balances)
            .unwrap_or_else(|| Map::new(&env));

        let from_bal = balances.get(from.clone()).unwrap_or(0);
        assert!(from_bal >= amount, "insufficient balance");

        let new_from = from_bal - amount;
        if new_from == 0 {
            balances.remove(from.clone());
        } else {
            balances.set(from.clone(), new_from);
        }

        let to_bal = balances.get(to.clone()).unwrap_or(0);
        balances.set(to, to_bal + amount);
        env.storage().instance().set(&DataKey::Balances, &balances);
    }

    pub fn balance(env: Env, owner: Address) -> i128 {
        let balances: Map<Address, i128> = env
            .storage()
            .instance()
            .get(&DataKey::Balances)
            .unwrap_or_else(|| Map::new(&env));
        balances.get(owner).unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }
}

mod test;
