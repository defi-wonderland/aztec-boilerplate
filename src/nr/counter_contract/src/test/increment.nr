use crate::{test::utils, Counter};

#[test]
unconstrained fn increment_success() {
    let (env, contract_address, owner, _) = utils::setup_contract(false);

    env.impersonate(owner);
    Counter::at(contract_address).increment().call(&mut env.private());
}
