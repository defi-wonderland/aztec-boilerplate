use crate::{test::utils, Example};

#[test]
unconstrained fn set_value_success() {
    let (env, contract_address, owner, _) = utils::setup_contract(false);

    env.impersonate(owner);
    Example::at(contract_address).set_value(100);
}
