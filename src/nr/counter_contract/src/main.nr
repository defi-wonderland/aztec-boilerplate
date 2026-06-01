use aztec::macros::{aztec, AztecConfig};
pub mod test;

/// Counter contract.
///
/// The host owns the counter logic (count storage + increment + getter). Cross-cutting
/// concerns are pulled in from reusable templates:
///
/// - `compose("ownable")` injects `get_owner()` and the `_only_owner` library-method guard.
/// - `compose("pausable")` injects `pause()`, `unpause()`, `is_paused()` and `PauseToggled`.
///
/// `increment` is guarded inline by both: it refuses while paused and refuses for any
/// caller other than the owner.
#[aztec(AztecConfig::new().compose("ownable").compose("pausable"))]
pub contract Counter {
    use aztec::{
        macros::{functions::{external, initializer, view}, storage::storage},
        protocol::address::AztecAddress,
        state_vars::{PublicImmutable, PublicMutable},
    };

    // Storage fields from both composed templates must be re-declared here (Noir
    // cannot inject struct fields), plus the host's own counter field.
    #[storage]
    struct Storage<Context> {
        owner: PublicImmutable<AztecAddress, Context>,  // from ownable
        paused: PublicMutable<bool, Context>,           // from pausable
        count: PublicMutable<u128, Context>,            // host's own
    }

    /// Initialize the contract with an owner. `paused` defaults to false.
    #[external("public")]
    #[initializer]
    fn constructor(owner: AztecAddress) {
        self.storage.owner.initialize(owner);
    }

    /// Increment the counter. Owner-only and refused while paused.
    #[external("public")]
    fn increment() {
        assert(!self.storage.paused.read(), "Counter: paused");
        _assert_is_owner(
            self.context.maybe_msg_sender().unwrap(),
            self.storage.owner.read(),
        );
        let new_val = self.storage.count.read() + 1;
        self.storage.count.write(new_val);
    }

    /// Read the current counter value.
    #[view]
    #[external("public")]
    fn get_counter() -> u128 {
        self.storage.count.read()
    }
}
