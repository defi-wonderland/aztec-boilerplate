use aztec::macros::{aztec, contract_template};

/// Reusable pausable template.
///
/// Registered under the id `"pausable"`. Compose it into any host to get a boolean
/// pause switch; the host then guards its own entrypoints with `self.storage.paused`.
///
/// ## Exposed surface
/// - storage: `paused: PublicMutable<bool>` (the host must re-declare this field)
/// - event: `PauseToggled { paused }` (auto-replayed into composing hosts)
/// - external: `pause()`, `unpause()`, `is_paused() -> bool`
#[contract_template("pausable")]
#[aztec]
pub contract PausableTemplate {
    use aztec::{
        macros::{events::event, functions::{external, view}, storage::storage},
        state_vars::PublicMutable,
    };

    #[event]
    struct PauseToggled {
        paused: bool,
    }

    #[storage]
    struct Storage<Context> {
        paused: PublicMutable<bool, Context>,
    }

    /// Set the paused flag and emit `PauseToggled { paused: true }`.
    #[external("public")]
    fn pause() {
        self.storage.paused.write(true);
        self.emit(PauseToggled { paused: true });
    }

    /// Clear the paused flag and emit `PauseToggled { paused: false }`.
    #[external("public")]
    fn unpause() {
        self.storage.paused.write(false);
        self.emit(PauseToggled { paused: false });
    }

    /// Read the current paused flag.
    #[view]
    #[external("public")]
    fn is_paused() -> bool {
        self.storage.paused.read()
    }
}
