use crate::{Counter, test::utils};

/// Owner can increment while not paused; composed `pause`/`unpause` and the host's
/// `get_counter` all work together.
#[test]
unconstrained fn owner_increments_while_active() {
    let (env, contract_address, owner, _stranger) = utils::setup();
    let instance = Counter::at(contract_address);

    env.call_public(owner, instance.increment());
    env.call_public(owner, instance.increment());

    assert_eq(env.view_public(instance.get_counter()), 2);
}

/// `get_owner` (composed from the ownable template) returns the deployment owner.
#[test]
unconstrained fn get_owner_returns_owner() {
    let (env, contract_address, owner, _) = utils::setup();
    let instance = Counter::at(contract_address);

    assert_eq(env.view_public(instance.get_owner()), owner);
}

/// `is_paused` (composed from the pausable template) toggles with `pause`/`unpause`.
#[test]
unconstrained fn pause_state_tracks_toggles() {
    let (env, contract_address, owner, _) = utils::setup();
    let instance = Counter::at(contract_address);

    assert_eq(env.view_public(instance.is_paused()), false);

    env.call_public(owner, instance.pause());
    assert_eq(env.view_public(instance.is_paused()), true);

    env.call_public(owner, instance.unpause());
    assert_eq(env.view_public(instance.is_paused()), false);
}

/// Increment reverts while paused.
#[test(should_fail_with = "Counter: paused")]
unconstrained fn increment_reverts_while_paused() {
    let (env, contract_address, owner, _) = utils::setup();
    let instance = Counter::at(contract_address);

    env.call_public(owner, instance.pause());
    env.call_public(owner, instance.increment());
}

/// Increment reverts for a non-owner caller (ownable guard).
#[test(should_fail_with = "Ownable: not owner")]
unconstrained fn increment_reverts_for_non_owner() {
    let (env, contract_address, _owner, stranger) = utils::setup();
    let instance = Counter::at(contract_address);

    env.call_public(stranger, instance.increment());
}

/// Unpausing restores the ability to increment.
#[test]
unconstrained fn unpause_restores_increment() {
    let (env, contract_address, owner, _) = utils::setup();
    let instance = Counter::at(contract_address);

    env.call_public(owner, instance.pause());
    env.call_public(owner, instance.unpause());
    env.call_public(owner, instance.increment());

    assert_eq(env.view_public(instance.get_counter()), 1);
}
