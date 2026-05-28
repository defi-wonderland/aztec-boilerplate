pub mod test;

use aztec::macros::{aztec, AztecConfig};

/// Host contract that composes the reusable `counter` template and extends it.
///
/// `compose("counter")` injects the template's external/internal/event surface
/// (`increment()`, `current()`, `_set()`, `Counted`) directly onto this contract, as if
/// they were written here. The host then layers on its own owner state and entrypoints.
#[aztec(AztecConfig::new().compose("counter"))]
pub contract ComposedCounter {
    use aztec::{
        macros::{functions::{external, initializer, view}, storage::storage},
        protocol::address::AztecAddress,
        state_vars::{PublicImmutable, PublicMutable},
    };

    // `count` is re-declared to match the composed template's storage (Noir cannot
    // inject struct fields). `owner` is this host's own addition.
    #[storage]
    struct Storage<Context> {
        owner: PublicImmutable<AztecAddress, Context>,
        count: PublicMutable<u128, Context>,
    }

    #[external("public")]
    #[initializer]
    fn constructor(owner: AztecAddress) {
        self.storage.owner.initialize(owner);
    }

    #[external("public")]
    #[view]
    fn get_owner() -> AztecAddress {
        self.storage.owner.read()
    }

    /// Host-specific entrypoint that reuses the composed internal `_set`.
    #[external("public")]
    fn reset(value: u128) {
        self.internal._set(value);
    }
}
