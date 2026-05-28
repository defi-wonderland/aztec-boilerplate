use crate::PausableCounter;
use aztec::{protocol::address::AztecAddress, test::helpers::test_environment::TestEnvironment};

pub unconstrained fn setup() -> (&mut TestEnvironment, AztecAddress, AztecAddress) {
    let mut env = TestEnvironment::new();
    let owner = env.create_light_account();

    let initializer = PausableCounter::interface().constructor(owner);
    let contract_address =
        env.deploy("PausableCounter").with_public_initializer(owner, initializer);

    (&mut env, contract_address, owner)
}
