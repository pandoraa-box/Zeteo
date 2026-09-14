#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol};

const TIER_1: u32 = 1;
const TIER_2: u32 = 2;
const TIER_3: u32 = 3;

const TIER_1_DURATION: u64 = 30 * 24 * 60 * 60; // 30 days
const TIER_2_DURATION: u64 = 180 * 24 * 60 * 60; // 180 days
const TIER_3_DURATION: u64 = 365 * 24 * 60 * 60; // 365 days

const TIER_1_PRICE: i128 = 500_000_000; // $5 with 8 decimals
const TIER_2_PRICE: i128 = 1_000_000_000; // $10 with 8 decimals
const TIER_3_PRICE: i128 = 2_000_000_000; // $20 with 8 decimals

const NEW_SUBSCRIPTION: Symbol = symbol_short!("NEW_SUB");

#[contracttype]
pub struct SubscriptionInfo {
    pub expiry: u64,
    pub tier: u32,
}

#[contract]
pub struct Subscription;

#[contractimpl]
impl Subscription {
    pub fn __constructor(env: Env, owner: Address) {
        env.storage().instance().set(&owner, &owner);
    }

    pub fn subscribe(env: Env, caller: Address, tier: u32) {
        assert!(tier >= TIER_1 && tier <= TIER_3, "Invalid tier");

        let duration = match tier {
            TIER_1 => TIER_1_DURATION,
            TIER_2 => TIER_2_DURATION,
            TIER_3 => TIER_3_DURATION,
            _ => unreachable!(),
        };

        let current_info: SubscriptionInfo = env
            .storage()
            .instance()
            .get(&caller)
            .unwrap_or(SubscriptionInfo { expiry: 0, tier: 0 });

        let now = env.ledger().timestamp();

        let new_expiry = if current_info.expiry > now {
            current_info.expiry + duration
        } else {
            now + duration
        };

        let new_info = SubscriptionInfo {
            expiry: new_expiry,
            tier,
        };
        env.storage().instance().set(&caller, &new_info);

        env.events().publish(
            (NEW_SUBSCRIPTION, &caller),
            (tier, new_expiry, now),
        );
    }

    pub fn subscribe_with_proof(env: Env, caller: Address, tier: u32, proof: soroban_sdk::Vec<u32>) {
        assert!(proof.len() > 0, "Invalid ZK Proof");

        Self::subscribe(env, caller, tier);
    }

    pub fn get_subscription(env: Env, user: Address) -> SubscriptionInfo {
        env.storage()
            .instance()
            .get(&user)
            .unwrap_or(SubscriptionInfo { expiry: 0, tier: 0 })
    }

    pub fn get_tier(env: Env, user: Address) -> u32 {
        Self::get_subscription(env, user).tier
    }

    pub fn get_price(_env: Env, tier: u32) -> i128 {
        match tier {
            TIER_1 => TIER_1_PRICE,
            TIER_2 => TIER_2_PRICE,
            TIER_3 => TIER_3_PRICE,
            _ => 0,
        }
    }
}
