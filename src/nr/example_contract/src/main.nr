use aztec::macros::aztec;
pub mod test;

#[aztec]
pub contract Example {
    // aztec library imports
    use aztec::{
        macros::{functions::{initializer, private, public}, storage::storage},
        prelude::{AztecAddress, PublicContext, PublicImmutable, PublicMutable},
    };

    // @param owner The address of the owner
    // @param value A numerical value
    #[storage]
    struct Storage<Context> {
        owner: PublicImmutable<AztecAddress, Context>,
        value: PublicMutable<u64, Context>,
    }

    /// @dev Initialize the contract
    /// @param owner The address of the owner
    #[public]
    #[initializer]
    fn constructor(owner: AztecAddress) {
        storage.owner.initialize(owner);
    }

    #[public]
    fn get_owner() -> AztecAddress {
        storage.owner.read()
    }

    #[public]
    fn set_value(new_value: u64) {
        storage.value.write(new_value);
    }

    #[public]
    fn get_value() -> u64 {
        storage.value.read()
    }
}
