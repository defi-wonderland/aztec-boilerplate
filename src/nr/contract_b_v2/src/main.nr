use aztec::macros::aztec;

#[aztec]
pub contract ContractB {
    use aztec::macros::{functions::external, storage::storage};
    use aztec::state_vars::PublicMutable;

    /// Extra storage not present in B_v1 - changes the storage layout
    /// baked into every importer's outputs.globals
    #[storage]
    struct Storage<Context> {
        counter: PublicMutable<u64, Context>,
    }

    /// Returns x * 2 (implementation v2 - same signature, different body)
    #[external("public")]
    fn compute(x: u64) -> u64 {
        x * 2
    }

    /// Extra public function not present in v1 and never called by A
    #[external("public")]
    fn extra_public(x: u64, y: u64) -> u64 {
        x + y
    }

    /// Extra private function not present in v1 and never called by A
    #[external("private")]
    fn extra_private(secret: Field) {
        let _ = secret + 1;
    }
}
