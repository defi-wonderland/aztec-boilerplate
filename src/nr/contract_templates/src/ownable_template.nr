use aztec::macros::{aztec, contract_template};

/// Reusable ownership template.
///
/// Registered under the id `"ownable"`. Compose it into any host to get a standard
/// owner field, a public getter, and an inline `_assert_is_owner` guard.
///
/// ## Exposed surface
/// - storage: `owner: PublicImmutable<AztecAddress>` (the host must re-declare this field)
/// - external: `get_owner() -> AztecAddress`
/// - library method: `_assert_is_owner(caller, owner)` - inline guard
///
/// ## Initialization
/// The host's constructor is still responsible for calling
/// `self.storage.owner.initialize(owner)` - templates can't inject initializer logic.
///
/// ## Why a library method instead of an internal
/// An `#[internal("public")]` would dispatch as a separate public call, where the
/// caller becomes the contract itself rather than the original user. A
/// `#[contract_library_method]` is migrated to the host as a free function and runs
/// inside the host's call frame, so the host can pass the real `msg_sender` into it.
#[contract_template("ownable")]
#[aztec]
pub contract OwnableTemplate {
    use aztec::{
        macros::{functions::{external, view}, storage::storage},
        protocol::address::AztecAddress,
        state_vars::PublicImmutable,
    };

    #[storage]
    struct Storage<Context> {
        owner: PublicImmutable<AztecAddress, Context>,
    }

    /// Read the contract owner.
    #[view]
    #[external("public")]
    fn get_owner() -> AztecAddress {
        self.storage.owner.read()
    }

    /// Inline ownership guard. Call as
    /// `_assert_is_owner(self.context.maybe_msg_sender().unwrap(), self.storage.owner.read())`
    /// from any composed host's `#[external("public")]` function.
    #[contract_library_method]
    fn _assert_is_owner(caller: AztecAddress, owner: AztecAddress) {
        assert(caller == owner, "Ownable: not owner");
    }
}
