use aztec::macros::aztec;

// ContractA stores B's address at construction time and calls it via self.enqueue.
// The dependency `contract_b` is aliased in Nargo.toml and points to either
// contract_b_v1 or contract_b_v2 - the Noir source here is identical in both cases.
#[aztec]
pub contract ContractA {
    use ::contract_b::ContractB;
    use aztec::{
        macros::{functions::{external, initializer}, storage::storage},
        protocol::address::AztecAddress,
        state_vars::PublicImmutable,
    };

    #[storage]
    struct Storage<Context> {
        b_address: PublicImmutable<AztecAddress, Context>,
    }

    #[external("public")]
    #[initializer]
    fn constructor(b_address: AztecAddress) {
        self.storage.b_address.initialize(b_address);
    }

    #[external("private")]
    fn call_b(x: u64) {
        let b_address = self.storage.b_address.read();
        self.enqueue(ContractB::at(b_address).compute(x));
    }
}
