use aztec::macros::aztec;
pub mod test;

#[aztec]
pub contract Counter {
    // aztec library imports
    use aztec::{
        macros::{functions::{external, initializer, only_self, view}, storage::storage},
        protocol_types::{address::AztecAddress, traits::ToField},
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

    /// @dev Increments the counter with expensive computation
    #[external("private")]
    fn increment() {
        // Use runtime value to prevent compile-time optimization
        let sender_field = self.context.msg_sender().unwrap().to_field();
        let seed: u64 = (sender_field as u64) % 1000;

        // Perform expensive loop computation to increase gate count
        let mut sum: u64 = seed;
        for i in 0..1000 {
            sum = sum + (i * i);
            if sum > 100000 {
                sum = sum / 2;
            }
        }
        assert(sum > seed); // Compiler can't optimize since seed is runtime value
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
