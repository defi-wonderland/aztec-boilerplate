use aztec::macros::{aztec, contract_template};

/// Reusable counter template.
///
/// Registered under the id `"counter"`. Any host contract can pull this whole surface
/// in with `#[aztec(AztecConfig::new().compose("counter"))]` instead of re-implementing it.
///
/// ## Exposed surface
/// - storage: `count: PublicMutable<u128>` (the host must re-declare this field; Noir
///   cannot inject struct fields, so the template's storage is the contract here)
/// - event: `Counted { value }` (auto-replayed into composing hosts)
/// - external: `increment()` (`#[template_virtual]` - a host may override it),
///   `current() -> u128`
/// - internal: `_increment()` (does the work + emits; reusable by an overriding host),
///   `_set(value)` (callable by the host via `self.internal._set(...)`)
#[contract_template("counter")]
#[aztec]
pub contract CounterTemplate {
    use aztec::{
        macros::{
            events::event,
            functions::{external, internal, template_virtual, view},
            storage::storage,
        },
        state_vars::PublicMutable,
    };

    #[event]
    struct Counted {
        value: u128,
    }

    #[storage]
    struct Storage<Context> {
        count: PublicMutable<u128, Context>,
    }

    /// Increment the counter. Marked virtual so a host can override it (e.g. to add a
    /// pause guard) while still reusing the `_increment` internal below for the work.
    #[external("public")]
    #[template_virtual]
    fn increment() {
        self.internal._increment();
    }

    /// Read the current counter value.
    #[view]
    #[external("public")]
    fn current() -> u128 {
        self.storage.count.read()
    }

    /// The actual increment + emit, as an internal so overriding hosts can call it.
    #[internal("public")]
    fn _increment() {
        let new_val = self.storage.count.read() + 1;
        self.storage.count.write(new_val);
        self.emit(Counted { value: new_val });
    }

    /// Set the counter directly. Callable by the host via `self.internal._set(...)`.
    #[internal("public")]
    fn _set(value: u128) {
        self.storage.count.write(value);
    }
}
