use aztec::macros::aztec;
pub mod test;

#[aztec]
pub contract Counter {
    // aztec library imports
    use aztec::{
        macros::{functions::{external, initializer, only_self, view}, storage::storage},
        protocol_types::address::AztecAddress,
        state_vars::{PublicImmutable, PublicMutable},
    };

    // @param owner The address of the owner
    // @param counter A numerical value
    #[storage]
    struct Storage<Context> {
        owner: PublicImmutable<AztecAddress, Context>,
        counter: PublicMutable<u128, Context>,
    }

    /// @dev Initialize the contract
    /// @param owner The address of the owner
    #[external("public")]
    #[initializer]
    fn constructor(owner: AztecAddress) {
        self.storage.owner.initialize(owner);
    }

    /// @dev Retrieves the owner of the contract
    /// @return The owner of the contract
    #[external("public")]
    fn get_owner() -> AztecAddress {
        self.storage.owner.read()
    }

    /// @dev Increments the counter
    #[external("private")]
    fn increment() {
        self.enqueue_self.increment_internal();
    }

    /// @dev Retrieves the counter value
    /// @return The current counter value
    #[external("public")]
    #[view]
    fn get_counter() -> u128 {
        self.storage.counter.read()
    }

    /// @dev Increments the counter
    #[external("public")]
    #[only_self]
    fn increment_internal() {
        let current_value = self.storage.counter.read();
        self.storage.counter.write(current_value + 1);
    }
}
