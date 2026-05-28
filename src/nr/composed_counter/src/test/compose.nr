use crate::{ComposedCounter, test::utils};

/// The template's external `increment()` is injected onto the host and mutates host storage;
/// `current()` (also composed) reads it back.
#[test]
unconstrained fn composed_external_mutates_host_storage() {
    let (env, contract_address, caller) = utils::setup();
    let instance = ComposedCounter::at(contract_address);

    env.call_public(caller, instance.increment());
    env.call_public(caller, instance.increment());

    assert_eq(env.view_public(instance.current()), 2);
}

/// The host's own `reset()` entrypoint reuses the composed internal `_set`.
#[test]
unconstrained fn host_entrypoint_reuses_composed_internal() {
    let (env, contract_address, caller) = utils::setup();
    let instance = ComposedCounter::at(contract_address);

    env.call_public(caller, instance.reset(41));
    env.call_public(caller, instance.increment());

    assert_eq(env.view_public(instance.current()), 42);
}

/// The host's own state (owner) coexists with the composed surface.
#[test]
unconstrained fn host_state_coexists_with_composed_surface() {
    let (env, contract_address, owner) = utils::setup();
    let instance = ComposedCounter::at(contract_address);

    assert_eq(env.view_public(instance.get_owner()), owner);
}
