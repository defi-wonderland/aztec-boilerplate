pub mod test;

use aztec::macros::{aztec, AztecConfig};

/// A counter that can be paused, built by composing two reusable templates.
///
/// - `compose("counter")` injects `increment()`, `current()`, `_increment()`, `_set()` + `Counted`.
/// - `compose("pausable")` injects `pause()`, `unpause()`, `is_paused()` + `PauseToggled`.
/// - `override_template("counter", "increment")` replaces the template's `increment` with the
///   guarded version below, which reuses the composed `_increment` internal once it has checked
///   that the contract is not paused.
#[aztec(AztecConfig::new()
    .compose("counter")
    .compose("pausable")
    .override_template("counter", "increment"))]
pub contract PausableCounter {
    use aztec::{
        macros::{functions::{external, initializer, view}, storage::storage},
        protocol::address::AztecAddress,
        state_vars::{PublicImmutable, PublicMutable},
    };

    // Fields for both composed templates must be re-declared here (Noir cannot inject
    // struct fields), alongside the host's own `owner`.
    #[storage]
    struct Storage<Context> {
        owner: PublicImmutable<AztecAddress, Context>,
        count: PublicMutable<u128, Context>,
        paused: PublicMutable<bool, Context>,
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

    /// Overrides the counter template's `increment`: refuse while paused, otherwise
    /// delegate to the composed `_increment` internal (which writes and emits `Counted`).
    #[external("public")]
    fn increment() {
        assert(!self.storage.paused.read(), "PausableCounter: paused");
        self.internal._increment();
    }
}
