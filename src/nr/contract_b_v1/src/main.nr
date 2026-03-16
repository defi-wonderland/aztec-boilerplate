use aztec::macros::aztec;

#[aztec]
pub contract ContractB {
    use aztec::macros::functions::external;

    /// Returns x + 1 (implementation v1)
    #[external("public")]
    fn compute(x: u64) -> u64 {
        x + 1
    }
}
