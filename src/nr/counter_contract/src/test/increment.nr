use crate::{Counter, test::utils};

#[test]
unconstrained fn increment_success() {
    let (env, contract_address, owner, _) = utils::setup_contract(false);

    env.call_private(owner, Counter::at(contract_address).increment());

    let counter = env.view_public(Counter::at(contract_address).get_counter());
    assert(counter == 1);
}

#[test]
unconstrained fn does_it_fail_to_call_the_initializer() {
    let mut env = aztec::test::helpers::test_environment::TestEnvironment::new();

    let owner = env.create_light_account();
    let user = env.create_light_account();

    let initializer_call_interface = Counter::interface().constructor(owner);
    // let contract_address = env.deploy("Counter").with_public_initializer(owner, initializer_call_interface);

    // env.call_private(owner, Counter::at(contract_address).increment());

    // let counter = env.view_public(Counter::at(contract_address).get_counter());
    // assert(counter == 1);
}
