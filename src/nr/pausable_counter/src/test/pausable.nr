use crate::{PausableCounter, test::utils};

/// The composed `counter` surface works while the contract is active.
#[test]
unconstrained fn increments_while_active() {
    let (env, contract_address, caller) = utils::setup();
    let instance = PausableCounter::at(contract_address);

    env.call_public(caller, instance.increment());
    env.call_public(caller, instance.increment());

    assert_eq(env.view_public(instance.current()), 2);
}

/// `is_paused()` (composed from the pausable template) reflects pause/unpause.
#[test]
unconstrained fn pause_state_tracks_toggles() {
    let (env, contract_address, caller) = utils::setup();
    let instance = PausableCounter::at(contract_address);

    assert_eq(env.view_public(instance.is_paused()), false);

    env.call_public(caller, instance.pause());
    assert_eq(env.view_public(instance.is_paused()), true);

    env.call_public(caller, instance.unpause());
    assert_eq(env.view_public(instance.is_paused()), false);
}

/// The overridden `increment` reverts once paused.
#[test(should_fail_with = "PausableCounter: paused")]
unconstrained fn increment_reverts_while_paused() {
    let (env, contract_address, caller) = utils::setup();
    let instance = PausableCounter::at(contract_address);

    env.call_public(caller, instance.pause());
    env.call_public(caller, instance.increment());
}

/// Unpausing restores the ability to increment.
#[test]
unconstrained fn unpause_restores_increment() {
    let (env, contract_address, caller) = utils::setup();
    let instance = PausableCounter::at(contract_address);

    env.call_public(caller, instance.pause());
    env.call_public(caller, instance.unpause());
    env.call_public(caller, instance.increment());

    assert_eq(env.view_public(instance.current()), 1);
}
